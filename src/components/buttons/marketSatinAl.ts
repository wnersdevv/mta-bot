import type { ButtonHandler } from "@/types";
import { t } from "@/localization/i18n";
import { successEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { userRepository } from "@/repositories/UserRepository";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { InsufficientFundsError } from "@/services/EconomyService";
import { TransactionType } from "@prisma/client";

const handler: ButtonHandler = {
  customIdPrefix: "market:satinal:",

  async execute(interaction) {
    const [, , itemId, ownerId] = interaction.customId.split(":");
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const dbUser = await userRepository.findOrCreate(interaction.user.id, interaction.guildId!);

    try {
      const item = await prisma.$transaction(async (tx) => {
        const it = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
        const user = await tx.user.findUniqueOrThrow({ where: { id: dbUser.id } });
        if (user.cash < it.value) throw new InsufficientFundsError();

        const balanceAfter = user.cash - it.value;
        await tx.user.update({ where: { id: dbUser.id }, data: { cash: balanceAfter } });
        await tx.transaction.create({
          data: {
            guildId: user.guildId,
            userId: dbUser.id,
            type: TransactionType.MARKET_PURCHASE,
            amount: -it.value,
            balanceBefore: user.cash,
            balanceAfter,
            metadata: { itemId: it.id },
          },
        });
        await tx.userInventory.upsert({
          where: { userId_itemId: { userId: dbUser.id, itemId: it.id } },
          create: { userId: dbUser.id, itemId: it.id, quantity: 1 },
          update: { quantity: { increment: 1 } },
        });
        return it;
      });

      await interaction.update({ embeds: [successEmbed(t("market.buy_success", lang, { item: item.key }))], components: [] });
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        await interaction.update({ embeds: [errorEmbed(t("market.buy_insufficient_funds", lang))], components: [] });
        return;
      }
      await interaction.update({ embeds: [errorEmbed(t("errors.generic", lang))], components: [] });
    }
  },
};

export default handler;
