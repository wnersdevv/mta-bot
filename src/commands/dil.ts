import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed } from "@/utils/embeds";
import { SUPPORTED_LANGUAGES } from "@/config/game";

const command: Command = {
  data: new SlashCommandBuilder().setName("dil").setDescription("Change your language / Dilini değiştir"),

  async execute(interaction, ctx) {
    const lang = ctx.language;

    const select = new StringSelectMenuBuilder()
      .setCustomId(`dil:secim:${interaction.user.id}`)
      .setPlaceholder(t("common.language.select_prompt", lang))
      .addOptions(SUPPORTED_LANGUAGES.map((code) => ({ label: t(`common.language.${code}`, lang), value: code })));

    await interaction.reply({
      embeds: [baseEmbed().setDescription(t("common.language.select_prompt", lang))],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      ephemeral: true,
    });
  },
};

export default command;
