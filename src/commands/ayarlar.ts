import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed } from "@/utils/embeds";

const command: Command = {
  data: new SlashCommandBuilder().setName("ayarlar").setDescription("Manage your settings / Ayarlarını yönet"),

  async execute(interaction, ctx) {
    const lang = ctx.language;
    const user = ctx.dbUser;

    const embed = baseEmbed()
      .setTitle(t("profile.settings_title", lang))
      .addFields({
        name: t("profile.settings_notifications", lang),
        value: user.notifications ? t("profile.settings_notifications_on", lang) : t("profile.settings_notifications_off", lang),
      });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ayarlar:bildirim:${interaction.user.id}`)
        .setLabel(user.notifications ? t("profile.settings_notifications_off", lang) : t("profile.settings_notifications_on", lang))
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

export default command;
