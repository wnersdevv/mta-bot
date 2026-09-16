import type { SelectMenuHandler } from "@/types";
import { t } from "@/localization/i18n";
import { errorEmbed } from "@/utils/embeds";
import { userRepository } from "@/repositories/UserRepository";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { renderLeaderboardCard } from "@/canvas/leaderboardCard";

const handler: SelectMenuHandler = {
  customIdPrefix: "siralama:kategori:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const category = interaction.values[0];
    const guildId = interaction.guildId!;

    let title = "";
    let rows: { rank: number; username: string; value: string }[] = [];

    if (category === "richest") {
      const top = await userRepository.topByCash(guildId, 10);
      title = t("leaderboard.category_richest", lang);
      rows = top.map((u, i) => ({ rank: i + 1, username: u.discordId, value: `$${u.cash.toString()}` }));
    } else if (category === "level") {
      const top = await userRepository.topByLevel(guildId, 10);
      title = t("leaderboard.category_level", lang);
      rows = top.map((u, i) => ({ rank: i + 1, username: u.discordId, value: `LVL ${u.level}` }));
    } else if (category === "reputation") {
      const top = await userRepository.topByReputation(guildId, 10);
      title = t("leaderboard.category_reputation", lang);
      rows = top.map((u, i) => ({ rank: i + 1, username: u.discordId, value: `${u.reputation}` }));
    } else if (category === "vehicles") {
      const top = await userRepository.topByVehicleCount(guildId, 10);
      title = t("leaderboard.category_vehicles", lang);
      rows = top.map((entry, i) => ({ rank: i + 1, username: entry.user.discordId, value: `🚗 ${entry.count}` }));
    } else if (category === "properties") {
      const top = await userRepository.topByPropertyCount(guildId, 10);
      title = t("leaderboard.category_properties", lang);
      rows = top.map((entry, i) => ({ rank: i + 1, username: entry.user.discordId, value: `🏠 ${entry.count}` }));
    } else if (category === "missions") {
      const top = await userRepository.topByMissionCount(guildId, 10);
      title = t("leaderboard.category_missions", lang);
      rows = top.map((entry, i) => ({ rank: i + 1, username: entry.user.discordId, value: `🎯 ${entry.count}` }));
    } else {
      // crew
      const topCrews = await userRepository.topCrewsByMemberCount(guildId, 10);
      title = t("leaderboard.category_crew", lang);
      if (topCrews.length === 0) {
        await interaction.update({ embeds: [errorEmbed(t("leaderboard.empty", lang))], components: [] });
        return;
      }
      const attachment = await renderLeaderboardCard(
        title,
        topCrews.map((c, i) => ({ rank: i + 1, username: c.name, value: `👥 ${c.count}` })),
      );
      await interaction.update({ files: [attachment], components: [], embeds: [] });
      return;
    }

    if (rows.length === 0) {
      await interaction.update({ embeds: [errorEmbed(t("leaderboard.empty", lang))], components: [] });
      return;
    }

    // Resolve display names where possible (fallback to discord id if the member left).
    for (const row of rows) {
      try {
        const member = await interaction.guild?.members.fetch(row.username);
        if (member) row.username = member.user.username;
      } catch {
        // member no longer in guild; keep raw id
      }
    }

    const attachment = await renderLeaderboardCard(title, rows);
    await interaction.update({ files: [attachment], components: [], embeds: [] });
  },
};

export default handler;
