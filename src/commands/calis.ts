import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed } from "@/utils/embeds";
import { cooldownService } from "@/services/CooldownService";
import { JOBS } from "@/config/game";

const COOLDOWN_KEY = "calis";

const command: Command = {
  data: new SlashCommandBuilder().setName("calis").setDescription("Work a job / Bir işte çalış"),

  async execute(interaction, ctx) {
    const lang = ctx.language;

    const status = await cooldownService.check(ctx.dbUser.id, COOLDOWN_KEY);
    if (status.onCooldown) {
      await interaction.reply({
        embeds: [errorEmbed(t("economy.work_cooldown", lang, { remaining: cooldownService.formatRemaining(status.remainingMs) }))],
        ephemeral: true,
      });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`calis:job:${interaction.user.id}`)
      .setPlaceholder(t("economy.work_select_prompt", lang))
      .addOptions(
        Object.values(JOBS).map((job) => ({
          label: t(`economy.job_${job.key}`, lang),
          value: job.key,
          emoji: job.emoji,
        })),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    const embed = baseEmbed().setTitle(t("economy.work_title", lang)).setDescription(t("economy.work_select_prompt", lang));

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

export default command;
