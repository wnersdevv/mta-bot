import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { SelectMenuHandler } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";

const handler: SelectMenuHandler = {
  customIdPrefix: "market:esya:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const itemId = interaction.values[0];
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) {
      await interaction.update({ embeds: [errorEmbed(t("errors.generic", lang))], components: [] });
      return;
    }

    const embed = baseEmbed().setTitle(item.key).addFields(
      { name: t("inventory.value", lang), value: `$${item.value.toString()}`, inline: true },
      { name: t("inventory.rarity", lang), value: item.rarity, inline: true },
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`market:satinal:${item.id}:${interaction.user.id}`).setLabel(t("market.buy_button", lang)).setStyle(ButtonStyle.Success),
    );

    await interaction.update({ embeds: [embed], components: [row] });
  },
};

export default handler;
