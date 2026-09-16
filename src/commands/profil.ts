import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { renderProfileCard } from "@/canvas/profileCard";
import { prisma } from "@/database/prisma";
import { xpToNextLevel } from "@/config/game";

const command: Command = {
  data: new SlashCommandBuilder().setName("profil").setDescription("View your profile / Profilini görüntüle"),

  async execute(interaction, ctx) {
    const lang = ctx.language;
    const user = ctx.dbUser;

    const [crewMember, achievementCount] = await Promise.all([
      prisma.crewMember.findUnique({ where: { userId: user.id }, include: { crew: true } }),
      prisma.userAchievement.count({ where: { userId: user.id } }),
    ]);

    const attachment = await renderProfileCard(
      {
        username: interaction.user.username,
        avatarUrl: interaction.user.displayAvatarURL({ extension: "png", size: 256 }),
        level: user.level,
        xp: user.xp,
        xpNeeded: xpToNextLevel(user.level),
        cash: user.cash,
        bank: user.bank,
        reputation: user.reputation,
        crewName: crewMember?.crew.name ?? null,
        achievementCount,
      },
      lang,
    );

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`profil:ekonomi:${interaction.user.id}`).setLabel(t("profile.buttons.economy", lang)).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`profil:garaj:${interaction.user.id}`).setLabel(t("profile.buttons.garage", lang)).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`profil:mulk:${interaction.user.id}`).setLabel(t("profile.buttons.properties", lang)).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`profil:gorev:${interaction.user.id}`).setLabel(t("profile.buttons.missions", lang)).setStyle(ButtonStyle.Secondary),
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`profil:istatistik:${interaction.user.id}`).setLabel(t("profile.buttons.stats", lang)).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`profil:siralama:${interaction.user.id}`).setLabel(t("profile.buttons.leaderboard", lang)).setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ files: [attachment], components: [row1, row2] });
  },
};

export default command;
