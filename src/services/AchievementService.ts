import { prisma } from "@/database/prisma";
import { CrewRank } from "@prisma/client";

export interface UnlockedAchievement {
  key: string;
}

type AchievementCondition = (userId: string) => Promise<boolean>;

/**
 * Each key must match a seeded Achievement.key (see prisma/seed.ts) and a
 * `achievements.<key>_title` / `achievements.<key>_description` localization entry.
 */
const ACHIEVEMENT_CONDITIONS: Record<string, AchievementCondition> = {
  ilk_kazanc: async (userId) => {
    const count = await prisma.transaction.count({ where: { userId, amount: { gt: 0 } } });
    return count >= 1;
  },
  milyoner: async (userId) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return user.cash + user.bank >= 1_000_000;
  },
  arac_koleksiyoncusu: async (userId) => {
    const count = await prisma.userVehicle.count({ where: { userId } });
    return count >= 10;
  },
  mulk_krali: async (userId) => {
    const count = await prisma.userProperty.count({ where: { userId } });
    return count >= 5;
  },
  gorev_ustasi: async (userId) => {
    const count = await prisma.userMission.count({ where: { userId } });
    return count >= 50;
  },
  ekip_lideri: async (userId) => {
    const membership = await prisma.crewMember.findUnique({ where: { userId } });
    return membership?.rank === CrewRank.KURUCU;
  },
};

export class AchievementService {
  /**
   * Re-evaluates every not-yet-unlocked achievement for this user and persists any
   * newly-met ones. Cheap to call after any state change (income, purchase, mission,
   * crew creation) — each condition is a small indexed count/lookup query.
   * Returns the achievements unlocked *by this call* so the caller can notify the user.
   */
  async checkAndUnlock(userId: string): Promise<UnlockedAchievement[]> {
    const alreadyUnlocked = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });
    const unlockedKeys = new Set(alreadyUnlocked.map((ua) => ua.achievement.key));

    const newlyUnlocked: UnlockedAchievement[] = [];

    for (const [key, condition] of Object.entries(ACHIEVEMENT_CONDITIONS)) {
      if (unlockedKeys.has(key)) continue;

      const met = await condition(userId).catch(() => false);
      if (!met) continue;

      const achievement = await prisma.achievement.findUnique({ where: { key } });
      if (!achievement) continue; // not seeded yet — skip silently

      try {
        await prisma.userAchievement.create({ data: { userId, achievementId: achievement.id } });
        newlyUnlocked.push({ key });
      } catch {
        // Unique constraint race (two triggers at once) — already unlocked by the other call.
      }
    }

    return newlyUnlocked;
  }
}

export const achievementService = new AchievementService();
