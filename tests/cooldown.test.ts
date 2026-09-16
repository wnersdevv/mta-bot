import { describe, it, expect, vi, beforeEach } from "vitest";

interface FakeCooldownRow {
  userId: string;
  key: string;
  expiresAt: Date;
  streak: number;
}

function createFakePrisma(rows: FakeCooldownRow[] = []) {
  const store = new Map(rows.map((r) => [`${r.userId}:${r.key}`, { ...r }]));

  return {
    cooldown: {
      findUnique: async ({ where: { userId_key } }: { where: { userId_key: { userId: string; key: string } } }) => {
        const row = store.get(`${userId_key.userId}:${userId_key.key}`);
        return row ? { ...row } : null;
      },
      upsert: async ({
        where: { userId_key },
        create,
        update,
      }: {
        where: { userId_key: { userId: string; key: string } };
        create: FakeCooldownRow;
        update: Partial<FakeCooldownRow>;
      }) => {
        const id = `${userId_key.userId}:${userId_key.key}`;
        const existing = store.get(id);
        const next = existing ? { ...existing, ...update } : { ...create };
        store.set(id, next);
        return { ...next };
      },
    },
    _store: store,
  };
}

let fakePrismaHolder: ReturnType<typeof createFakePrisma>;
vi.mock("@/database/prisma", () => ({ prisma: fakePrismaHolder }));

describe("CooldownService", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("reports not on cooldown for a user with no prior record", async () => {
    fakePrismaHolder = createFakePrisma([]);
    const { cooldownService } = await import("@/services/CooldownService");
    const status = await cooldownService.check("u1", "gunluk");
    expect(status.onCooldown).toBe(false);
    expect(status.streak).toBe(0);
  });

  it("reports on cooldown immediately after triggering", async () => {
    fakePrismaHolder = createFakePrisma([]);
    const { cooldownService } = await import("@/services/CooldownService");
    await cooldownService.trigger("u1", "gunluk", 3600);
    const status = await cooldownService.check("u1", "gunluk");
    expect(status.onCooldown).toBe(true);
    expect(status.remainingMs).toBeGreaterThan(0);
  });

  it("increments streak when re-triggered within the streak window", async () => {
    const now = Date.now();
    fakePrismaHolder = createFakePrisma([{ userId: "u1", key: "gunluk", expiresAt: new Date(now - 1000), streak: 3 }]);
    const { cooldownService } = await import("@/services/CooldownService");
    const streak = await cooldownService.trigger("u1", "gunluk", 3600, { trackStreak: true, streakWindowSec: 7200 });
    expect(streak).toBe(4);
  });

  it("resets streak to 1 when the streak window has been missed", async () => {
    const now = Date.now();
    // Expired far outside the streak window (e.g. missed several days).
    fakePrismaHolder = createFakePrisma([{ userId: "u1", key: "gunluk", expiresAt: new Date(now - 10 * 24 * 60 * 60 * 1000), streak: 5 }]);
    const { cooldownService } = await import("@/services/CooldownService");
    const streak = await cooldownService.trigger("u1", "gunluk", 3600, { trackStreak: true, streakWindowSec: 7200 });
    expect(streak).toBe(1);
  });

  it("formats remaining time in a human-readable way", async () => {
    fakePrismaHolder = createFakePrisma([]);
    const { cooldownService } = await import("@/services/CooldownService");
    expect(cooldownService.formatRemaining(45_000)).toBe("45s");
    expect(cooldownService.formatRemaining(65_000)).toBe("1m 5s");
    expect(cooldownService.formatRemaining(3_665_000)).toBe("1h 1m");
  });
});
