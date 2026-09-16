import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed } from "@/utils/embeds";

const command: Command = {
  data: new SlashCommandBuilder().setName("siralama").setDescription("View leaderboards / Sıralamaları görüntüle"),

  async execute(interaction, ctx) {
    const lang = ctx.language;

    const select = new StringSelectMenuBuilder()
      .setCustomId(`siralama:kategori:${interaction.user.id}`)
      .setPlaceholder(t("leaderboard.category_select_prompt", lang))
      .addOptions(
        { label: t("leaderboard.category_richest", lang), value: "richest" },
        { label: t("leaderboard.category_level", lang), value: "level" },
        { label: t("leaderboard.category_reputation", lang), value: "reputation" },
        { label: t("leaderboard.category_vehicles", lang), value: "vehicles" },
        { label: t("leaderboard.category_properties", lang), value: "properties" },
        { label: t("leaderboard.category_missions", lang), value: "missions" },
        { label: t("leaderboard.category_crew", lang), value: "crew" },
      );

    await interaction.reply({
      embeds: [baseEmbed().setTitle(t("leaderboard.title", lang))],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
    });
  },
};

export default command;
