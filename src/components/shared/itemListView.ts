import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, EmbedBuilder } from "discord.js";
import type { InventoryItem } from "@prisma/client";
import { t } from "@/localization/i18n";
import { baseEmbed } from "@/utils/embeds";
import { paginate, buildPaginationRow } from "@/components/pagination/Paginator";

const PAGE_SIZE = 20;

export interface ItemListView {
  embed: EmbedBuilder;
  components: (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[];
}

export function buildItemListView(items: InventoryItem[], page: number, ownerId: string, lang: string): ItemListView {
  const { pageItems, totalPages } = paginate(items, PAGE_SIZE, page);
  const safePage = Math.min(Math.max(0, page), totalPages - 1);

  const select = new StringSelectMenuBuilder()
    .setCustomId(`market:esya:${ownerId}`)
    .setPlaceholder(t("market.category_items", lang))
    .addOptions(pageItems.map((i) => ({ label: i.key, value: i.id, description: `$${i.value.toString()}` })));

  const components: ItemListView["components"] = [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)];
  if (totalPages > 1) {
    components.push(buildPaginationRow(`esyasayfa:${ownerId}`, safePage, totalPages, lang));
  }

  return { embed: baseEmbed().setTitle(t("market.category_items", lang)), components };
}
