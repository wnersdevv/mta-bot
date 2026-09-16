import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { errorEmbed, baseEmbed } from "@/utils/embeds";
import { requireAdmin } from "@/middleware/permissions";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("admin-sistem")
    .setDescription("Toggle maintenance mode (admin) / Bakım modunu değiştir")
    .addBooleanOption((o) => o.setName("bakim").setDescription("Enable maintenance mode / Bakım modunu etkinleştir").setRequired(true))
    .setDefaultMemberPermissions(0),

  async execute(interaction, ctx) {
    const lang = ctx.language;
    if (!interaction.inCachedGuild() || !(await requireAdmin(interaction.member))) {
      await interaction.reply({ embeds: [errorEmbed(t("admin.no_permission", lang))], ephemeral: true });
      return;
    }

    const enable = interaction.options.getBoolean("bakim", true);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`admin:bakim:${enable ? "on" : "off"}:${interaction.user.id}`).setLabel(t("common.buttons.confirm", lang)).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`admin:bakim:cancel:${interaction.user.id}`).setLabel(t("common.buttons.cancel", lang)).setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [baseEmbed().setDescription(t("admin.confirm_action", lang))], components: [row], ephemeral: true });
  },
};

export default command;
