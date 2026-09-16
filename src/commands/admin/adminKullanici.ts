import { SlashCommandBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { errorEmbed, baseEmbed, formatCurrency } from "@/utils/embeds";
import { requireAdmin } from "@/middleware/permissions";
import { prisma } from "@/database/prisma";
import { userRepository } from "@/repositories/UserRepository";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("admin-kullanici")
    .setDescription("Inspect a user's stats (admin) / Kullanıcı bilgilerini görüntüle")
    .setDefaultMemberPermissions(0)
    .addUserOption((o) => o.setName("kullanici").setDescription("Target user / Hedef kullanıcı").setRequired(true)),

  async execute(interaction, ctx) {
    const lang = ctx.language;
    if (!interaction.inCachedGuild() || !(await requireAdmin(interaction.member))) {
      await interaction.reply({ embeds: [errorEmbed(t("admin.no_permission", lang))], ephemeral: true });
      return;
    }

    const targetDiscordUser = interaction.options.getUser("kullanici", true);
    const targetDbUser = await userRepository.findOrCreate(targetDiscordUser.id, interaction.guildId!);

    const [vehicleCount, propertyCount, missionCount, achievementCount, crewMembership] = await Promise.all([
      prisma.userVehicle.count({ where: { userId: targetDbUser.id } }),
      prisma.userProperty.count({ where: { userId: targetDbUser.id } }),
      prisma.userMission.count({ where: { userId: targetDbUser.id } }),
      prisma.userAchievement.count({ where: { userId: targetDbUser.id } }),
      prisma.crewMember.findUnique({ where: { userId: targetDbUser.id }, include: { crew: true } }),
    ]);

    const embed = baseEmbed()
      .setTitle(`🔍 ${targetDiscordUser.username}`)
      .addFields(
        { name: "ID", value: targetDbUser.id, inline: true },
        { name: t("economy.cash", lang), value: formatCurrency(targetDbUser.cash), inline: true },
        { name: t("economy.bank", lang), value: formatCurrency(targetDbUser.bank), inline: true },
        { name: t("profile.level", lang), value: `${targetDbUser.level}`, inline: true },
        { name: t("profile.xp", lang), value: `${targetDbUser.xp}`, inline: true },
        { name: t("profile.reputation", lang), value: `${targetDbUser.reputation}`, inline: true },
        { name: "🚗", value: `${vehicleCount}`, inline: true },
        { name: "🏠", value: `${propertyCount}`, inline: true },
        { name: "🎯", value: `${missionCount}`, inline: true },
        { name: "🏅", value: `${achievementCount}`, inline: true },
        { name: t("profile.crew", lang), value: crewMembership?.crew.name ?? t("profile.no_crew", lang), inline: true },
        { name: lang === "tr" ? "Dil" : "Language", value: targetDbUser.language ?? "—", inline: true },
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
