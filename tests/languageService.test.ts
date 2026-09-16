import { describe, it, expect, vi, beforeEach } from "vitest";

interface FakeSetup {
  user: { language: string | null } | null;
  guildSettings: { language: string | null } | null;
}

function createFakePrisma(setup: FakeSetup) {
  return {
    user: {
      findUnique: async () => setup.user,
    },
    guildSettings: {
      findUnique: async () => setup.guildSettings,
    },
  };
}

let fakePrismaHolder: ReturnType<typeof createFakePrisma>;
vi.mock("@/database/prisma", () => ({ prisma: fakePrismaHolder }));

describe("LanguageService.resolve", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("prefers the user's own language override when set", async () => {
    fakePrismaHolder = createFakePrisma({ user: { language: "en" }, guildSettings: { language: "de" } });
    const { languageService } = await import("@/services/LanguageService");
    expect(await languageService.resolve("discord-1", "guild-1")).toBe("en");
  });

  it("falls back to the guild's default language when the user has no override", async () => {
    fakePrismaHolder = createFakePrisma({ user: { language: null }, guildSettings: { language: "es" } });
    const { languageService } = await import("@/services/LanguageService");
    expect(await languageService.resolve("discord-1", "guild-1")).toBe("es");
  });

  it("falls back to Turkish when neither the user nor the guild has a language set", async () => {
    fakePrismaHolder = createFakePrisma({ user: null, guildSettings: null });
    const { languageService } = await import("@/services/LanguageService");
    expect(await languageService.resolve("discord-1", "guild-1")).toBe("tr");
  });

  it("ignores an unsupported/corrupt language value and falls through the chain", async () => {
    fakePrismaHolder = createFakePrisma({ user: { language: "klingon" }, guildSettings: { language: "de" } });
    const { languageService } = await import("@/services/LanguageService");
    expect(await languageService.resolve("discord-1", "guild-1")).toBe("de");
  });
});
