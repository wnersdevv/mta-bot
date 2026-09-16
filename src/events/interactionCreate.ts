import { Events, Interaction, MessageFlags } from "discord.js";
import type { Command, ButtonHandler, SelectMenuHandler, ModalHandler } from "@/types";
import { userRepository } from "@/repositories/UserRepository";
import { languageService } from "@/services/LanguageService";
import { t } from "@/localization/i18n";
import { errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { logger, logEvent } from "@/utils/logger";
import { PAGINATION_TTL_MS } from "@/components/pagination/Paginator";
import { checkRateLimit } from "@/middleware/rateLimit";

interface Registries {
  commands: Map<string, Command>;
  buttons: ButtonHandler[];
  selectMenus: SelectMenuHandler[];
  modals: ModalHandler[];
}

// Simple in-memory duplicate-interaction guard (per interaction id). Discord can
// occasionally redeliver gateway events; this prevents double-processing a click.
const processedInteractionIds = new Set<string>();
function markProcessed(id: string): void {
  processedInteractionIds.add(id);
  if (processedInteractionIds.size > 5000) {
    const first = processedInteractionIds.values().next().value;
    if (first) processedInteractionIds.delete(first);
  }
}

export function registerInteractionCreate(client: import("discord.js").Client, registries: Registries): void {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.guildId) return; // guild-only bot
    if (processedInteractionIds.has(interaction.id)) return;
    markProcessed(interaction.id);

    try {
      if (!checkRateLimit(interaction.user.id, interaction.guildId)) {
        const lang = await languageService.resolve(interaction.user.id, interaction.guildId);
        if (interaction.isRepliable()) {
          await interaction.reply({ embeds: [errorEmbed(t("errors.rate_limited", lang))], flags: MessageFlags.Ephemeral });
        }
        return;
      }

      // Generic pagination close/noop/page-indicator handling, namespace-agnostic.
      if (interaction.isButton()) {
        const parts = interaction.customId.split(":");
        const suffix = parts[parts.length - 1];
        if (suffix === "noop") {
          await interaction.deferUpdate();
          return;
        }
        if (suffix === "close") {
          await interaction.message.delete().catch(() => undefined);
          return;
        }
      }

      // Components older than PAGINATION_TTL_MS are treated as expired — the message
      // they're attached to has likely scrolled out of relevance, and re-running the
      // underlying data query against a stale selection risks acting on out-of-date state.
      if ((interaction.isButton() || interaction.isStringSelectMenu()) && Date.now() - interaction.message.createdTimestamp > PAGINATION_TTL_MS) {
        const lang = await languageService.resolve(interaction.user.id, interaction.guildId);
        await interaction.update({ embeds: [errorEmbed(t("errors.expired_interaction", lang))], components: [], files: [] }).catch(() => undefined);
        return;
      }

      const settings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guildId } });
      const isMaintenanceExempt = interaction.isChatInputCommand() && interaction.commandName.startsWith("admin-");
      if (settings?.maintenanceMode && !isMaintenanceExempt) {
        const lang = await languageService.resolve(interaction.user.id, interaction.guildId);
        if (interaction.isRepliable()) {
          await interaction.reply({ embeds: [errorEmbed(t("errors.maintenance_mode", lang))], flags: MessageFlags.Ephemeral });
        }
        return;
      }

      if (interaction.isChatInputCommand()) {
        const command = registries.commands.get(interaction.commandName);
        if (!command) return;

        const dbUser = await userRepository.findOrCreate(interaction.user.id, interaction.guildId);
        const language = await languageService.resolve(interaction.user.id, interaction.guildId);

        logEvent("USER_ACTION", "Slash command executed", { userId: interaction.user.id, command: interaction.commandName });
        await command.execute(interaction, { dbUser, language });
        return;
      }

      if (interaction.isButton()) {
        const handler = registries.buttons.find((h) => interaction.customId.startsWith(h.customIdPrefix));
        if (!handler) return;
        await handler.execute(interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        const handler = registries.selectMenus.find((h) => interaction.customId.startsWith(h.customIdPrefix));
        if (!handler) return;
        await handler.execute(interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        const handler = registries.modals.find((h) => interaction.customId.startsWith(h.customIdPrefix));
        if (!handler) return;
        await handler.execute(interaction);
      }
    } catch (err) {
      logger.error({ err, interactionId: interaction.id }, "Unhandled interaction error");
      if (interaction.isRepliable()) {
        const lang = interaction.guildId ? await languageService.resolve(interaction.user.id, interaction.guildId).catch(() => "tr") : "tr";
        const payload = { embeds: [errorEmbed(t("errors.generic", lang))], flags: MessageFlags.Ephemeral };
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(payload);
          } else {
            await interaction.reply(payload);
          }
        } catch (followUpErr) {
          logger.error({ followUpErr }, "Failed to send error response to user");
        }
      }
    }
  });
}
