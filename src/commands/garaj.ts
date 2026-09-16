import { SlashCommandBuilder } from "discord.js";
import type { Command } from "@/types";
import { buildGarageView, garageEmptyEmbed } from "@/components/shared/garageView";

const command: Command = {
  data: new SlashCommandBuilder().setName("garaj").setDescription("View your owned vehicles / Araçlarını görüntüle"),

  async execute(interaction, ctx) {
    const lang = ctx.language;
    const view = await buildGarageView(ctx.dbUser.id, interaction.user.id, interaction.user.username, lang);

    if (!view) {
      await interaction.reply({ embeds: [garageEmptyEmbed(lang)], ephemeral: true });
      return;
    }

    await interaction.reply({ embeds: [view.embed], components: view.components });
  },
};

export default command;
