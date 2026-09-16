import { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } from "discord.js";
import { t } from "@/localization/i18n";
import { baseEmbed } from "@/utils/embeds";

export function buildMarketTopLevelView(ownerId: string, lang: string): { embed: EmbedBuilder; components: ActionRowBuilder<StringSelectMenuBuilder>[] } {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`market:kategori:${ownerId}`)
    .setPlaceholder(t("market.category_select_prompt", lang))
    .addOptions(
      { label: t("market.category_vehicles", lang), value: "vehicles" },
      { label: t("market.category_properties", lang), value: "properties" },
      { label: t("market.category_items", lang), value: "items" },
    );

  return {
    embed: baseEmbed().setTitle(t("market.title", lang)),
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
  };
}
