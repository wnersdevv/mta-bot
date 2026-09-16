import type { ButtonHandler } from "@/types";
import { t } from "@/localization/i18n";
import { successEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { userRepository } from "@/repositories/UserRepository";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";

const handler: ButtonHandler = {
  customIdPrefix: "arac:favori:",

  async execute(interaction) {
    const [, , vehicleId, ownerId] = interaction.customId.split(":");
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const dbUser = await userRepository.findOrCreate(interaction.user.id, interaction.guildId!);
    const owned = await prisma.userVehicle.findFirst({ where: { userId: dbUser.id, vehicleId } });

    if (!owned) {
      await interaction.reply({ embeds: [errorEmbed(t("errors.vehicle_not_found", lang))], ephemeral: true });
      return;
    }

    const updated = await prisma.userVehicle.update({ where: { id: owned.id }, data: { favorite: !owned.favorite } });
    await interaction.reply({ embeds: [successEmbed(updated.favorite ? "⭐" : "☑️")], ephemeral: true });
  },
};

export default handler;
