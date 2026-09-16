import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { SelectMenuHandler } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed, formatCurrency } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { INVENTORY_SELL_RATE } from "@/config/game";

const handler: SelectMenuHandler = {
  customIdPrefix: "envanter:secim:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const userInventoryId = interaction.values[0];
    const owned = await prisma.userInventory.findUnique({ where: { id: userInventoryId }, include: { item: true } });
    if (!owned) {
      await interaction.update({ embeds: [errorEmbed(t("errors.generic", lang))], components: [] });
      return;
    }

    const sellPrice = Math.round(owned.item.value * INVENTORY_SELL_RATE);

    const embed = baseEmbed()
      .setTitle(owned.item.key)
      .addFields(
        { name: t("inventory.quantity", lang), value: `${owned.quantity}`, inline: true },
        { name: t("inventory.rarity", lang), value: owned.item.rarity, inline: true },
        { name: t("inventory.value", lang), value: formatCurrency(owned.item.value), inline: true },
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`envanter:sat:${owned.id}:${interaction.user.id}`)
        .setLabel(`${t("market.sell_button", lang)} (${formatCurrency(sellPrice)})`)
        .setStyle(ButtonStyle.Danger),
    );

    await interaction.update({ embeds: [embed], components: [row] });
  },
};

export default handler;
