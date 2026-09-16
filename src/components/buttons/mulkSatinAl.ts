import type { ButtonHandler } from "@/types";
import { t } from "@/localization/i18n";
import { successEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { userRepository } from "@/repositories/UserRepository";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { InsufficientFundsError } from "@/services/EconomyService";
import { TransactionType } from "@prisma/client";
import { checkAndNotifyAchievements } from "@/components/shared/notifyAchievements";

const handler: ButtonHandler = {
  customIdPrefix: "mulk:satinal:",

  async execute(interaction) {
    const [, , propertyId, ownerId] = interaction.customId.split(":");
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const dbUser = await userRepository.findOrCreate(interaction.user.id, interaction.guildId!);

    try {
      const property = await prisma.$transaction(async (tx) => {
        const p = await tx.property.findUniqueOrThrow({ where: { id: propertyId } });
        const user = await tx.user.findUniqueOrThrow({ where: { id: dbUser.id } });

        if (user.level < p.levelRequirement) throw new Error(`LEVEL_TOO_LOW:${p.levelRequirement}`);

        const alreadyOwned = await tx.userProperty.findFirst({ where: { userId: dbUser.id, propertyId } });
        if (alreadyOwned) throw new Error("ALREADY_OWNED");

        if (user.cash < p.price) throw new InsufficientFundsError();

        const balanceAfter = user.cash - p.price;
        await tx.user.update({ where: { id: dbUser.id }, data: { cash: balanceAfter } });
        await tx.transaction.create({
          data: {
            guildId: user.guildId,
            userId: dbUser.id,
            type: TransactionType.PROPERTY_PURCHASE,
            amount: -p.price,
            balanceBefore: user.cash,
            balanceAfter,
            metadata: { propertyId: p.id },
          },
        });
        await tx.userProperty.create({ data: { userId: dbUser.id, propertyId: p.id, purchasePrice: p.price } });

        return p;
      });

      await interaction.update({ embeds: [successEmbed(t("properties.purchase_success", lang, { property: property.name }))], components: [] });
      await checkAndNotifyAchievements(interaction, dbUser.id, interaction.user.username, lang, dbUser.notifications);
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        await interaction.update({ embeds: [errorEmbed(t("economy.insufficient_balance", lang))], components: [] });
        return;
      }
      if (err instanceof Error && err.message === "ALREADY_OWNED") {
        await interaction.update({ embeds: [errorEmbed(t("properties.already_owned", lang))], components: [] });
        return;
      }
      if (err instanceof Error && err.message.startsWith("LEVEL_TOO_LOW")) {
        const level = err.message.split(":")[1];
        await interaction.update({ embeds: [errorEmbed(t("properties.level_too_low", lang, { level }))], components: [] });
        return;
      }
      await interaction.update({ embeds: [errorEmbed(t("errors.generic", lang))], components: [] });
    }
  },
};

export default handler;
