import { describe, it, expect, vi, beforeEach } from "vitest";

interface FakeUserProperty {
  id: string;
  userId: string;
  propertyId: string;
  lastIncomeAt: Date;
  property: { name: string; income: number };
}

interface FakeUser {
  id: string;
  guildId: string;
  cash: number;
}

function createFakePrisma(userProperties: FakeUserProperty[], user: FakeUser) {
  const upStore = new Map(userProperties.map((up) => [up.id, { ...up }]));
  const userStore = { ...user };
  const transactions: unknown[] = [];

  const txClient = {
    userProperty: {
      findMany: async ({ where }: { where: { userId: string; lastIncomeAt: { lte: Date } } }) => {
        return [...upStore.values()].filter((up) => up.userId === where.userId && up.lastIncomeAt.getTime() <= where.lastIncomeAt.lte.getTime());
      },
      update: async ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeUserProperty> }) => {
        const up = upStore.get(id);
        if (!up) throw new Error("NOT_FOUND");
        Object.assign(up, data);
        return { ...up };
      },
    },
    user: {
      findUniqueOrThrow: async () => ({ ...userStore }),
      update: async ({ data }: { data: Partial<FakeUser> }) => {
        Object.assign(userStore, data);
        return { ...userStore };
      },
    },
    transaction: {
      create: async ({ data }: { data: unknown }) => {
        transactions.push(data);
        return data;
      },
    },
  };

  return {
    $transaction: async (fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient),
    _upStore: upStore,
    _userStore: userStore,
    _transactions: transactions,
  };
}

let fakePrismaHolder: ReturnType<typeof createFakePrisma>;
vi.mock("@/database/prisma", () => ({ prisma: fakePrismaHolder }));

const HOUR = 60 * 60 * 1000;

describe("PropertyIncomeService", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("collects nothing when no property has reached the interval yet", async () => {
    const now = Date.now();
    fakePrismaHolder = createFakePrisma(
      [{ id: "up1", userId: "u1", propertyId: "p1", lastIncomeAt: new Date(now - 1 * HOUR), property: { name: "House", income: 1000 } }],
      { id: "u1", guildId: "g1", cash: 0 },
    );
    const { propertyIncomeService } = await import("@/services/PropertyIncomeService");
    const result = await propertyIncomeService.collect("u1");
    expect(result.total).toBe(0);
    expect(result.properties).toEqual([]);
  });

  it("collects income from a single eligible property and credits the user's cash", async () => {
    const now = Date.now();
    fakePrismaHolder = createFakePrisma(
      [{ id: "up1", userId: "u1", propertyId: "p1", lastIncomeAt: new Date(now - 5 * HOUR), property: { name: "House", income: 1500 } }],
      { id: "u1", guildId: "g1", cash: 200 },
    );
    const { propertyIncomeService } = await import("@/services/PropertyIncomeService");
    const result = await propertyIncomeService.collect("u1");

    expect(result.total).toBe(1500);
    expect(result.properties).toEqual([{ name: "House", amount: 1500 }]);
    expect(fakePrismaHolder._userStore.cash).toBe(1700);
  });

  it("sums income across multiple eligible properties in one collection", async () => {
    const now = Date.now();
    fakePrismaHolder = createFakePrisma(
      [
        { id: "up1", userId: "u1", propertyId: "p1", lastIncomeAt: new Date(now - 5 * HOUR), property: { name: "House", income: 1000 } },
        { id: "up2", userId: "u1", propertyId: "p2", lastIncomeAt: new Date(now - 10 * HOUR), property: { name: "Nightclub", income: 3500 } },
      ],
      { id: "u1", guildId: "g1", cash: 0 },
    );
    const { propertyIncomeService } = await import("@/services/PropertyIncomeService");
    const result = await propertyIncomeService.collect("u1");

    expect(result.total).toBe(4500);
    expect(result.properties.length).toBe(2);
    expect(fakePrismaHolder._userStore.cash).toBe(4500);
  });

  it("skips a property that isn't due yet while still collecting an eligible one", async () => {
    const now = Date.now();
    fakePrismaHolder = createFakePrisma(
      [
        { id: "up1", userId: "u1", propertyId: "p1", lastIncomeAt: new Date(now - 5 * HOUR), property: { name: "Due", income: 1000 } },
        { id: "up2", userId: "u1", propertyId: "p2", lastIncomeAt: new Date(now - 1 * HOUR), property: { name: "NotDue", income: 2000 } },
      ],
      { id: "u1", guildId: "g1", cash: 0 },
    );
    const { propertyIncomeService } = await import("@/services/PropertyIncomeService");
    const result = await propertyIncomeService.collect("u1");

    expect(result.properties.map((p) => p.name)).toEqual(["Due"]);
    expect(result.total).toBe(1000);
  });

  it("resets lastIncomeAt on collected properties so they can't be double-collected immediately", async () => {
    const now = Date.now();
    fakePrismaHolder = createFakePrisma(
      [{ id: "up1", userId: "u1", propertyId: "p1", lastIncomeAt: new Date(now - 5 * HOUR), property: { name: "House", income: 1000 } }],
      { id: "u1", guildId: "g1", cash: 0 },
    );
    const { propertyIncomeService } = await import("@/services/PropertyIncomeService");
    await propertyIncomeService.collect("u1");

    const second = await propertyIncomeService.collect("u1");
    expect(second.total).toBe(0);
  });
});
