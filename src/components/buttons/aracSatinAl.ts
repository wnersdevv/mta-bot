import type { ButtonHandler } from "@/types";
import { t } from "@/localization/i18n";
import { successEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { userRepository } from "@/repositories/UserRepository";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { InsufficientFundsError } from "@/services/EconomyService";
import { TransactionType, NotificationType } from "@prisma/client";
import { logEvent } from "@/utils/logger";
import { checkAndNotifyAchievements } from "@/components/shared/notifyAchievements";

const handler: ButtonHandler = {
  customIdPrefix: "arac:satinal:",

  async execute(interaction) {
    const [, , vehicleId, ownerId] = interaction.customId.split(":");
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const dbUser = await userRepository.findOrCreate(interaction.user.id, interaction.guildId!);

    try {
      const vehicle = await prisma.$transaction(async (tx) => {
        const v = await tx.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });

        const alreadyOwned = await tx.userVehicle.findFirst({ where: { userId: dbUser.id, vehicleId } });
        if (alreadyOwned) throw new Error("ALREADY_OWNED");

        const user = await tx.user.findUniqueOrThrow({ where: { id: dbUser.id } });
        if (user.cash < v.price) throw new InsufficientFundsError();

        const balanceAfter = user.cash - v.price;
        await tx.user.update({ where: { id: dbUser.id }, data: { cash: balanceAfter } });
        await tx.transaction.create({
          data: {
            guildId: user.guildId,
            userId: dbUser.id,
            type: TransactionType.VEHICLE_PURCHASE,
            amount: -v.price,
            balanceBefore: user.cash,
            balanceAfter,
            metadata: { vehicleId: v.id },
          },
        });
        await tx.userVehicle.create({ data: { userId: dbUser.id, vehicleId: v.id, purchasePrice: v.price } });

        return v;
      });

      if (dbUser.notifications) {
        await prisma.notification.create({
          data: { userId: dbUser.id, type: NotificationType.VEHICLE_PURCHASED, payload: { vehicleId: vehicle.id } },
        });
      }

      logEvent("PURCHASE", "Vehicle purchased", { userId: dbUser.id, vehicleId: vehicle.id });

      await interaction.update({
        embeds: [successEmbed(t("vehicles.purchase_success", lang, { vehicle: `${vehicle.brand} ${vehicle.name}`, price: `$${vehicle.price.toString()}` }))],
        components: [],
      });
      await checkAndNotifyAchievements(interaction, dbUser.id, interaction.user.username, lang, dbUser.notifications);
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        await interaction.update({ embeds: [errorEmbed(t("economy.insufficient_balance", lang))], components: [] });
        return;
      }
      if (err instanceof Error && err.message === "ALREADY_OWNED") {
        await interaction.update({ embeds: [errorEmbed(t("vehicles.already_owned", lang))], components: [] });
        return;
      }
      await interaction.update({ embeds: [errorEmbed(t("errors.generic", lang))], components: [] });
    }
  },
};

export default handler;
