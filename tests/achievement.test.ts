import { describe, it, expect, vi, beforeEach } from "vitest";
import { CrewRank } from "@prisma/client";

interface FakeState {
  transactionsPositiveCount: number;
  cash: number;
  bank: number;
  vehicleCount: number;
  propertyCount: number;
  missionCount: number;
  crewRank: CrewRank | null;
  unlockedKeys: string[];
  allAchievements: Record<string, string>; // key -> id
}

function createFakePrisma(state: FakeState) {
  const created: { userId: string; achievementId: string }[] = [];

  return {
    userAchievement: {
      findMany: async () => state.unlockedKeys.map((key) => ({ achievement: { key } })),
      create: async ({ data }: { data: { userId: string; achievementId: string } }) => {
        created.push(data);
        return data;
      },
    },
    achievement: {
      findUnique: async ({ where: { key } }: { where: { key: string } }) => {
        const id = state.allAchievements[key];
        return id ? { id, key } : null;
      },
    },
    transaction: {
      count: async () => state.transactionsPositiveCount,
    },
    user: {
      findUniqueOrThrow: async () => ({ cash: state.cash, bank: state.bank }),
    },
    userVehicle: {
      count: async () => state.vehicleCount,
    },
    userProperty: {
      count: async () => state.propertyCount,
    },
    userMission: {
      count: async () => state.missionCount,
    },
    crewMember: {
      findUnique: async () => (state.crewRank ? { rank: state.crewRank } : null),
    },
    _created: created,
  };
}

const ALL_ACHIEVEMENTS = {
  ilk_kazanc: "a1",
  milyoner: "a2",
  arac_koleksiyoncusu: "a3",
  mulk_krali: "a4",
  gorev_ustasi: "a5",
  ekip_lideri: "a6",
};

let fakePrismaHolder: ReturnType<typeof createFakePrisma>;
vi.mock("@/database/prisma", () => ({ prisma: fakePrismaHolder }));

describe("AchievementService", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("unlocks nothing when no condition is met", async () => {
    fakePrismaHolder = createFakePrisma({
      transactionsPositiveCount: 0,
      cash: 0,
      bank: 0,
      vehicleCount: 0,
      propertyCount: 0,
      missionCount: 0,
      crewRank: null,
      unlockedKeys: [],
      allAchievements: ALL_ACHIEVEMENTS,
    });
    const { achievementService } = await import("@/services/AchievementService");
    const result = await achievementService.checkAndUnlock("u1");
    expect(result).toEqual([]);
  });

  it("unlocks ilk_kazanc once a positive transaction exists", async () => {
    fakePrismaHolder = createFakePrisma({
      transactionsPositiveCount: 1,
      cash: 100,
      bank: 0,
      vehicleCount: 0,
      propertyCount: 0,
      missionCount: 0,
      crewRank: null,
      unlockedKeys: [],
      allAchievements: ALL_ACHIEVEMENTS,
    });
    const { achievementService } = await import("@/services/AchievementService");
    const result = await achievementService.checkAndUnlock("u1");
    expect(result.map((a) => a.key)).toContain("ilk_kazanc");
  });

  it("unlocks milyoner once combined balance reaches 1,000,000", async () => {
    fakePrismaHolder = createFakePrisma({
      transactionsPositiveCount: 5,
      cash: 600_000,
      bank: 400_000,
      vehicleCount: 0,
      propertyCount: 0,
      missionCount: 0,
      crewRank: null,
      unlockedKeys: ["ilk_kazanc"],
      allAchievements: ALL_ACHIEVEMENTS,
    });
    const { achievementService } = await import("@/services/AchievementService");
    const result = await achievementService.checkAndUnlock("u1");
    expect(result.map((a) => a.key)).toEqual(["milyoner"]);
  });

  it("does not re-unlock an achievement the user already has", async () => {
    fakePrismaHolder = createFakePrisma({
      transactionsPositiveCount: 5,
      cash: 2_000_000,
      bank: 0,
      vehicleCount: 0,
      propertyCount: 0,
      missionCount: 0,
      crewRank: null,
      unlockedKeys: ["ilk_kazanc", "milyoner"],
      allAchievements: ALL_ACHIEVEMENTS,
    });
    const { achievementService } = await import("@/services/AchievementService");
    const result = await achievementService.checkAndUnlock("u1");
    expect(result).toEqual([]);
  });

  it("unlocks ekip_lideri only when the user's crew rank is KURUCU (founder)", async () => {
    fakePrismaHolder = createFakePrisma({
      transactionsPositiveCount: 0,
      cash: 0,
      bank: 0,
      vehicleCount: 0,
      propertyCount: 0,
      missionCount: 0,
      crewRank: CrewRank.UYE,
      unlockedKeys: [],
      allAchievements: ALL_ACHIEVEMENTS,
    });
    const { achievementService } = await import("@/services/AchievementService");
    const result = await achievementService.checkAndUnlock("u1");
    expect(result.map((a) => a.key)).not.toContain("ekip_lideri");
  });

  it("unlocks several achievements at once when multiple thresholds are crossed", async () => {
    fakePrismaHolder = createFakePrisma({
      transactionsPositiveCount: 60,
      cash: 2_000_000,
      bank: 0,
      vehicleCount: 12,
      propertyCount: 6,
      missionCount: 55,
      crewRank: CrewRank.KURUCU,
      unlockedKeys: [],
      allAchievements: ALL_ACHIEVEMENTS,
    });
    const { achievementService } = await import("@/services/AchievementService");
    const result = await achievementService.checkAndUnlock("u1");
    const keys = result.map((a) => a.key).sort();
    expect(keys).toEqual(["arac_koleksiyoncusu", "ekip_lideri", "gorev_ustasi", "ilk_kazanc", "milyoner", "mulk_krali"].sort());
  });
});
