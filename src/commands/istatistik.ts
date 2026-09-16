import { SlashCommandBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, formatCurrency } from "@/utils/embeds";
import { prisma } from "@/database/prisma";

const command: Command = {
  data: new SlashCommandBuilder().setName("istatistik").setDescription("View detailed stats / Detaylı istatistiklerini görüntüle"),

  async execute(interaction, ctx) {
    const lang = ctx.language;
    const user = ctx.dbUser;

    const [vehicleCount, propertyCount, missionCount, achievementCount] = await Promise.all([
      prisma.userVehicle.count({ where: { userId: user.id } }),
      prisma.userProperty.count({ where: { userId: user.id } }),
      prisma.userMission.count({ where: { userId: user.id } }),
      prisma.userAchievement.count({ where: { userId: user.id } }),
    ]);

    const embed = baseEmbed()
      .setTitle(t("profile.stats_title", lang, { username: interaction.user.username }))
      .addFields(
        { name: t("profile.level", lang), value: `${user.level}`, inline: true },
        { name: t("profile.xp", lang), value: `${user.xp}`, inline: true },
        { name: t("profile.reputation", lang), value: `${user.reputation}`, inline: true },
        { name: t("economy.cash", lang), value: formatCurrency(user.cash), inline: true },
        { name: t("economy.bank", lang), value: formatCurrency(user.bank), inline: true },
        { name: "🚗", value: `${vehicleCount}`, inline: true },
        { name: "🏠", value: `${propertyCount}`, inline: true },
        { name: "🎯", value: `${missionCount}`, inline: true },
        { name: "🏅", value: `${achievementCount}`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
