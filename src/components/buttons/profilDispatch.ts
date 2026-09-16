import type { ButtonHandler } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed, formatCurrency } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { userRepository } from "@/repositories/UserRepository";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { economyService } from "@/services/EconomyService";

const handler: ButtonHandler = {
  customIdPrefix: "profil:",

  async execute(interaction) {
    const [, action, ownerId] = interaction.customId.split(":");
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const dbUser = await userRepository.findOrCreate(interaction.user.id, interaction.guildId!);

    if (action === "ekonomi") {
      const { cash, bank } = await economyService.getBalance(dbUser.id);
      await interaction.reply({
        embeds: [
          baseEmbed()
            .setTitle(t("economy.balance_title", lang))
            .addFields(
              { name: t("economy.cash", lang), value: formatCurrency(cash), inline: true },
              { name: t("economy.bank", lang), value: formatCurrency(bank), inline: true },
            ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (action === "garaj") {
      const count = await prisma.userVehicle.count({ where: { userId: dbUser.id } });
      await interaction.reply({ embeds: [baseEmbed().setDescription(`🚗 ${count} — use /garaj for details.`)], ephemeral: true });
      return;
    }

    if (action === "mulk") {
      const count = await prisma.userProperty.count({ where: { userId: dbUser.id } });
      await interaction.reply({ embeds: [baseEmbed().setDescription(`🏠 ${count} — use /mulk mulklerim for details.`)], ephemeral: true });
      return;
    }

    if (action === "gorev") {
      const count = await prisma.userMission.count({ where: { userId: dbUser.id } });
      await interaction.reply({ embeds: [baseEmbed().setDescription(`🎯 ${count} — use /gorevler to see available missions.`)], ephemeral: true });
      return;
    }

    if (action === "istatistik") {
      await interaction.reply({ embeds: [baseEmbed().setDescription("📊 Use /istatistik for full stats.")], ephemeral: true });
      return;
    }

    if (action === "siralama") {
      await interaction.reply({ embeds: [baseEmbed().setDescription("🏆 Use /siralama to browse leaderboards.")], ephemeral: true });
      return;
    }

    await interaction.reply({ embeds: [errorEmbed(t("errors.generic", lang))], ephemeral: true });
  },
};

export default handler;
