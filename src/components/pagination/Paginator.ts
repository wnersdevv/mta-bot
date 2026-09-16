import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { t } from "@/localization/i18n";

export const PAGINATION_TTL_MS = 5 * 60 * 1000;

export function buildPaginationRow(namespace: string, page: number, totalPages: number, lang: string): ActionRowBuilder<ButtonBuilder> {
  const prev = new ButtonBuilder()
    .setCustomId(`${namespace}:page:${page - 1}`)
    .setLabel(t("common.buttons.previous", lang))
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page <= 0);

  const indicator = new ButtonBuilder()
    .setCustomId(`${namespace}:noop`)
    .setLabel(t("common.pagination.page_indicator", lang, { current: page + 1, total: totalPages }))
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const next = new ButtonBuilder()
    .setCustomId(`${namespace}:page:${page + 1}`)
    .setLabel(t("common.buttons.next", lang))
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page >= totalPages - 1);

  const close = new ButtonBuilder()
    .setCustomId(`${namespace}:close`)
    .setLabel(t("common.buttons.close", lang))
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(prev, indicator, next, close);
}

export function paginate<T>(items: T[], pageSize: number, page: number): { pageItems: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const pageItems = items.slice(safePage * pageSize, safePage * pageSize + pageSize);
  return { pageItems, totalPages };
}
