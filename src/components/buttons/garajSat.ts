import type { ButtonHandler } from "@/types";
import { t } from "@/localization/i18n";
import { successEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { TransactionType } from "@prisma/client";
import { logEvent } from "@/utils/logger";

const handler: ButtonHandler = {
  customIdPrefix: "garaj:sat:",

  async execute(interaction) {
    const [, , userVehicleId, ownerId] = interaction.customId.split(":");
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    try {
      const { vehicleName, sellPrice } = await prisma.$transaction(async (tx) => {
        const owned = await tx.userVehicle.findUnique({ where: { id: userVehicleId }, include: { vehicle: true } });
        if (!owned) throw new Error("NOT_FOUND");

        const user = await tx.user.findUniqueOrThrow({ where: { id: owned.userId } });
        if (user.discordId !== interaction.user.id) throw new Error("NOT_FOUND");

        const sellPrice = owned.purchasePrice / 2;
        const balanceAfter = user.cash + sellPrice;

        await tx.user.update({ where: { id: user.id }, data: { cash: balanceAfter } });
        await tx.transaction.create({
          data: {
            guildId: user.guildId,
            userId: user.id,
            type: TransactionType.VEHICLE_SALE,
            amount: sellPrice,
            balanceBefore: user.cash,
            balanceAfter,
            metadata: { vehicleId: owned.vehicleId },
          },
        });
        await tx.userVehicle.delete({ where: { id: owned.id } });

        return { vehicleName: `${owned.vehicle.brand} ${owned.vehicle.name}`, sellPrice };
      });

      logEvent("SALE", "Vehicle sold", { userId: ownerId, vehicleName });

      await interaction.update({
        embeds: [successEmbed(t("vehicles.sell_success", lang, { vehicle: vehicleName, price: `$${sellPrice.toString()}` }))],
        components: [],
      });
    } catch {
      await interaction.update({ embeds: [errorEmbed(t("errors.vehicle_not_found", lang))], components: [] });
    }
  },
};

export default handler;
