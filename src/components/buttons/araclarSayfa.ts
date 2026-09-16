import { ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import type { ButtonHandler } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import type { VehicleCategory } from "@prisma/client";
import { paginate, buildPaginationRow } from "@/components/pagination/Paginator";

const PAGE_SIZE = 20;

const handler: ButtonHandler = {
  customIdPrefix: "araclarsayfa:",

  // customId shape: araclarsayfa:<category>:<ownerId>:page:<pageIndex>
  async execute(interaction) {
    const [, category, ownerId, , pageStr] = interaction.customId.split(":");
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const vehicles = await prisma.vehicle.findMany({ where: { category: category as VehicleCategory }, orderBy: { price: "asc" } });
    if (vehicles.length === 0) {
      await interaction.update({ embeds: [errorEmbed(t("errors.vehicle_not_found", lang))], components: [] });
      return;
    }

    const requestedPage = Number.parseInt(pageStr, 10) || 0;
    const { pageItems, totalPages } = paginate(vehicles, PAGE_SIZE, requestedPage);

    const select = new StringSelectMenuBuilder()
      .setCustomId(`araclar:secim:${interaction.user.id}`)
      .setPlaceholder(t("vehicles.catalog_title", lang))
      .addOptions(pageItems.map((v) => ({ label: `${v.brand} ${v.name}`, value: v.id, description: `$${v.price.toString()}` })));

    const safePage = Math.min(Math.max(0, requestedPage), totalPages - 1);
    const components = [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
      buildPaginationRow(`araclarsayfa:${category}:${ownerId}`, safePage, totalPages, lang),
    ];

    await interaction.update({ embeds: [baseEmbed().setTitle(t("vehicles.catalog_title", lang))], components });
  },
};

export default handler;
