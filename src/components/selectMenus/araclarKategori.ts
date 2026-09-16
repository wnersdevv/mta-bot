import { ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import type { SelectMenuHandler } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import type { VehicleCategory } from "@prisma/client";
import { paginate, buildPaginationRow } from "@/components/pagination/Paginator";

const PAGE_SIZE = 20;

const handler: SelectMenuHandler = {
  customIdPrefix: "araclar:kategori:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const category = interaction.values[0] as VehicleCategory;
    const vehicles = await prisma.vehicle.findMany({ where: { category }, orderBy: { price: "asc" } });

    if (vehicles.length === 0) {
      await interaction.update({ embeds: [errorEmbed(t("errors.vehicle_not_found", lang))], components: [] });
      return;
    }

    const { pageItems, totalPages } = paginate(vehicles, PAGE_SIZE, 0);

    const select = new StringSelectMenuBuilder()
      .setCustomId(`araclar:secim:${interaction.user.id}`)
      .setPlaceholder(t("vehicles.catalog_title", lang))
      .addOptions(pageItems.map((v) => ({ label: `${v.brand} ${v.name}`, value: v.id, description: `$${v.price.toString()}` })));

    const components = [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)];
    if (totalPages > 1) {
      components.push(buildPaginationRow(`araclarsayfa:${category}:${interaction.user.id}`, 0, totalPages, lang));
    }

    await interaction.update({ embeds: [baseEmbed().setTitle(t("vehicles.catalog_title", lang))], components });
  },
};

export default handler;
