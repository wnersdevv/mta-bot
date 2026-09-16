import { prisma } from "@/database/prisma";
import type { User } from "@prisma/client";

export class UserRepository {
  async findOrCreate(discordId: string, guildId: string): Promise<User> {
    await prisma.guild.upsert({
      where: { id: guildId },
      create: { id: guildId, settings: { create: {} } },
      update: {},
    });

    return prisma.user.upsert({
      where: { discordId_guildId: { discordId, guildId } },
      create: { discordId, guildId },
      update: {},
    });
  }

  async findById(userId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id: userId } });
  }

  async setLanguage(userId: string, language: string): Promise<User> {
    return prisma.user.update({ where: { id: userId }, data: { language } });
  }

  async getGuildLanguage(guildId: string): Promise<string> {
    const settings = await prisma.guildSettings.findUnique({ where: { guildId } });
    return settings?.language ?? "tr";
  }

  async setGuildLanguage(guildId: string, language: string): Promise<void> {
    await prisma.guildSettings.update({ where: { guildId }, data: { language } });
  }

  async addXpAndCheckLevelUp(userId: string, xpGain: number, xpPerLevel: number): Promise<{ leveledUp: boolean; newLevel: number }> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    let newXp = user.xp + xpGain;
    let newLevel = user.level;
    let leveledUp = false;

    while (newXp >= newLevel * xpPerLevel) {
      newXp -= newLevel * xpPerLevel;
      newLevel += 1;
      leveledUp = true;
    }

    await prisma.user.update({ where: { id: userId }, data: { xp: newXp, level: newLevel } });
    return { leveledUp, newLevel };
  }

  async topByCash(guildId: string, limit = 10) {
    return prisma.user.findMany({ where: { guildId }, orderBy: { cash: "desc" }, take: limit });
  }

  async topByLevel(guildId: string, limit = 10) {
    return prisma.user.findMany({ where: { guildId }, orderBy: [{ level: "desc" }, { xp: "desc" }], take: limit });
  }

  async topByReputation(guildId: string, limit = 10) {
    return prisma.user.findMany({ where: { guildId }, orderBy: { reputation: "desc" }, take: limit });
  }

  /**
   * Shared count-leaderboard helper: fetches every ownership row for this guild's
   * users, tallies counts per user in-process, then sorts and slices. Deliberately
   * avoids Prisma's `groupBy` + relation-filter combo here — safer and simpler for
   * guild-sized data than relying on MongoDB aggregation edge cases.
   */
  private async topByOwnershipCount(
    rows: { userId: string }[],
    limit: number,
  ): Promise<{ user: User; count: number }[]> {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.userId, (counts.get(row.userId) ?? 0) + 1);

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    if (sorted.length === 0) return [];

    const users = await prisma.user.findMany({ where: { id: { in: sorted.map(([id]) => id) } } });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return sorted.map(([id, count]) => ({ user: userMap.get(id), count })).filter((x): x is { user: User; count: number } => !!x.user);
  }

  async topByVehicleCount(guildId: string, limit = 10) {
    const rows = await prisma.userVehicle.findMany({ where: { user: { guildId } }, select: { userId: true } });
    return this.topByOwnershipCount(rows, limit);
  }

  async topByPropertyCount(guildId: string, limit = 10) {
    const rows = await prisma.userProperty.findMany({ where: { user: { guildId } }, select: { userId: true } });
    return this.topByOwnershipCount(rows, limit);
  }

  async topByMissionCount(guildId: string, limit = 10) {
    const rows = await prisma.userMission.findMany({ where: { user: { guildId } }, select: { userId: true } });
    return this.topByOwnershipCount(rows, limit);
  }

  async topCrewsByMemberCount(guildId: string, limit = 10): Promise<{ name: string; count: number }[]> {
    const crews = await prisma.crew.findMany({ where: { guildId }, include: { members: true } });
    return crews
      .map((crew) => ({ name: crew.name, count: crew.members.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

export const userRepository = new UserRepository();
