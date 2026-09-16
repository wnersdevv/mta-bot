import { SlashCommandBuilder } from "discord.js";
import type { Command } from "@/types";
import { buildMarketTopLevelView } from "@/components/shared/marketView";

const command: Command = {
  data: new SlashCommandBuilder().setName("market").setDescription("Browse the market / Markete göz at"),

  async execute(interaction, ctx) {
    const { embed, components } = buildMarketTopLevelView(interaction.user.id, ctx.language);
    await interaction.reply({ embeds: [embed], components });
  },
};

export default command;
