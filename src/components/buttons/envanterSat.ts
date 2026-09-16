import type { ButtonHandler } from "@/types";
import { t } from "@/localization/i18n";
import { successEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { TransactionType } from "@prisma/client";
import { INVENTORY_SELL_RATE } from "@/config/game";
import { checkAndNotifyAchievements } from "@/components/shared/notifyAchievements";
import { userRepository } from "@/repositories/UserRepository";

const handler: ButtonHandler = {
  customIdPrefix: "envanter:sat:",

  async execute(interaction) {
    const [, , userInventoryId, ownerId] = interaction.customId.split(":");
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    try {
      const { itemKey, sellPrice } = await prisma.$transaction(async (tx) => {
        const owned = await tx.userInventory.findUnique({ where: { id: userInventoryId }, include: { item: true } });
        if (!owned) throw new Error("NOT_FOUND");

        const user = await tx.user.findUniqueOrThrow({ where: { id: owned.userId } });
        if (user.discordId !== interaction.user.id) throw new Error("NOT_FOUND");

        const sellPrice = Math.round(owned.item.value * INVENTORY_SELL_RATE);
        const balanceAfter = user.cash + sellPrice;

        await tx.user.update({ where: { id: user.id }, data: { cash: balanceAfter } });
        await tx.transaction.create({
          data: {
            guildId: user.guildId,
            userId: user.id,
            type: TransactionType.MARKET_SALE,
            amount: sellPrice,
            balanceBefore: user.cash,
            balanceAfter,
            metadata: { itemId: owned.itemId },
          },
        });

        if (owned.quantity > 1) {
          await tx.userInventory.update({ where: { id: owned.id }, data: { quantity: owned.quantity - 1 } });
        } else {
          await tx.userInventory.delete({ where: { id: owned.id } });
        }

        return { itemKey: owned.item.key, sellPrice };
      });

      await interaction.update({
        embeds: [successEmbed(t("market.sell_success", lang, { item: itemKey, amount: `$${sellPrice.toLocaleString("en-US")}` }))],
        components: [],
      });

      const dbUser = await userRepository.findOrCreate(interaction.user.id, interaction.guildId!);
      await checkAndNotifyAchievements(interaction, dbUser.id, interaction.user.username, lang, dbUser.notifications);
    } catch {
      await interaction.update({ embeds: [errorEmbed(t("errors.generic", lang))], components: [] });
    }
  },
};

export default handler;
