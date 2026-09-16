import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed } from "@/utils/embeds";
import { VehicleCategory } from "@prisma/client";

const command: Command = {
  data: new SlashCommandBuilder().setName("araclar").setDescription("Browse the vehicle catalog / Araç kataloğuna göz at"),

  async execute(interaction, ctx) {
    const lang = ctx.language;

    const select = new StringSelectMenuBuilder()
      .setCustomId(`araclar:kategori:${interaction.user.id}`)
      .setPlaceholder(t("vehicles.category_select_prompt", lang))
      .addOptions(
        Object.values(VehicleCategory).map((cat) => ({
          label: t(`vehicles.category_${cat.toLowerCase()}`, lang),
          value: cat,
        })),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    const embed = baseEmbed().setTitle(t("vehicles.catalog_title", lang));

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

export default command;
