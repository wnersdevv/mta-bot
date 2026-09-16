import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { SelectMenuHandler } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { renderPropertyCard } from "@/canvas/propertyCard";

const handler: SelectMenuHandler = {
  customIdPrefix: "mulk:secim:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const propertyId = interaction.values[0];
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      await interaction.update({ embeds: [errorEmbed(t("errors.property_not_found", lang))], components: [] });
      return;
    }

    const attachment = await renderPropertyCard(
      {
        name: property.name,
        price: `$${property.price.toString()}`,
        capacity: property.capacity,
        income: `$${property.income.toString()}`,
        levelRequirement: property.levelRequirement,
        rarity: property.rarity,
      },
      lang,
    );

    const embed = baseEmbed()
      .setTitle(t("properties.detail_title", lang, { name: property.name }))
      .setDescription(t(`properties.type_${property.type.toLowerCase()}`, lang))
      .setImage("attachment://property-card.png");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`mulk:satinal:${property.id}:${interaction.user.id}`).setLabel(t("market.buy_button", lang)).setStyle(ButtonStyle.Success),
    );

    await interaction.update({ embeds: [embed], files: [attachment], components: [row] });
  },
};

export default handler;
