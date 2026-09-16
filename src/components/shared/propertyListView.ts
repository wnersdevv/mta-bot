import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, EmbedBuilder } from "discord.js";
import type { Property } from "@prisma/client";
import { t } from "@/localization/i18n";
import { baseEmbed } from "@/utils/embeds";
import { paginate, buildPaginationRow } from "@/components/pagination/Paginator";

const PAGE_SIZE = 20;

export interface PropertyListView {
  embed: EmbedBuilder;
  components: (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[];
}

/** Builds the select-menu + pagination-row pair for a property list, reused by
 * /mulk listele, the market's "properties" category, and the page-turn button handler. */
export function buildPropertyListView(properties: Property[], page: number, ownerId: string, lang: string): PropertyListView {
  const { pageItems, totalPages } = paginate(properties, PAGE_SIZE, page);
  const safePage = Math.min(Math.max(0, page), totalPages - 1);

  const select = new StringSelectMenuBuilder()
    .setCustomId(`mulk:secim:${ownerId}`)
    .setPlaceholder(t("properties.list_title", lang))
    .addOptions(
      pageItems.map((p) => ({
        label: p.name,
        value: p.id,
        description: `${t(`properties.type_${p.type.toLowerCase()}`, lang)} • $${p.price.toString()}`,
      })),
    );

  const components: PropertyListView["components"] = [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)];
  if (totalPages > 1) {
    components.push(buildPaginationRow(`mulksayfa:${ownerId}`, safePage, totalPages, lang));
  }

  return { embed: baseEmbed().setTitle(t("properties.list_title", lang)), components };
}
