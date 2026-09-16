import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { SelectMenuHandler } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { VehicleCategory } from "@prisma/client";
import { buildPropertyListView } from "@/components/shared/propertyListView";
import { buildItemListView } from "@/components/shared/itemListView";

const handler: SelectMenuHandler = {
  customIdPrefix: "market:kategori:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const category = interaction.values[0];

    if (category === "vehicles") {
      const select = new StringSelectMenuBuilder()
        .setCustomId(`araclar:kategori:${interaction.user.id}`)
        .setPlaceholder(t("vehicles.category_select_prompt", lang))
        .addOptions(Object.values(VehicleCategory).map((cat) => ({ label: t(`vehicles.category_${cat.toLowerCase()}`, lang), value: cat })));
      const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`market:geri:${interaction.user.id}`).setLabel(t("common.buttons.back", lang)).setStyle(ButtonStyle.Secondary),
      );
      await interaction.update({
        embeds: [baseEmbed().setTitle(t("vehicles.catalog_title", lang))],
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select), backRow],
      });
      return;
    }

    if (category === "properties") {
      const properties = await prisma.property.findMany({ orderBy: { price: "asc" } });
      if (properties.length === 0) {
        await interaction.update({ embeds: [errorEmbed(t("errors.property_not_found", lang))], components: [] });
        return;
      }
      const { embed, components } = buildPropertyListView(properties, 0, interaction.user.id, lang);
      await interaction.update({ embeds: [embed], components });
      return;
    }

    // items
    const items = await prisma.inventoryItem.findMany();
    if (items.length === 0) {
      await interaction.update({ embeds: [errorEmbed(t("inventory.empty", lang))], components: [] });
      return;
    }
    const { embed, components } = buildItemListView(items, 0, interaction.user.id, lang);
    await interaction.update({ embeds: [embed], components });
  },
};

export default handler;
