import { SlashCommandBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed } from "@/utils/embeds";

const ALL_COMMANDS = [
  "/baslat",
  "/profil",
  "/bakiye",
  "/gunluk",
  "/calis",
  "/gorevler",
  "/araclar",
  "/garaj",
  "/mulk",
  "/market",
  "/envanter",
  "/ekip",
  "/siralama",
  "/istatistik",
  "/ayarlar",
  "/dil",
  "/yardim",
];

const command: Command = {
  data: new SlashCommandBuilder().setName("yardim").setDescription("Show the help center / Yardım merkezini göster"),

  async execute(interaction, ctx) {
    const lang = ctx.language;

    const embed = baseEmbed()
      .setTitle(t("common.help.title", lang))
      .setDescription(`${t("common.help.description", lang)}\n\n${ALL_COMMANDS.join("  ")}`);

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
