import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionType } from "@prisma/client";

// In-memory fake Prisma client covering only what EconomyService touches.
// Money fields are plain `number` here, matching the MongoDB schema (Float,
// since the Mongo connector doesn't support BigInt).
interface FakeUser {
  id: string;
  guildId: string;
  cash: number;
  bank: number;
}

function createFakePrisma(users: FakeUser[]) {
  const store = new Map(users.map((u) => [u.id, { ...u }]));
  const transactions: unknown[] = [];

  const txClient = {
    user: {
      findUniqueOrThrow: async ({ where: { id } }: { where: { id: string } }) => {
        const u = store.get(id);
        if (!u) throw new Error("NOT_FOUND");
        return { ...u };
      },
      update: async ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeUser> }) => {
        const u = store.get(id);
        if (!u) throw new Error("NOT_FOUND");
        Object.assign(u, data);
        return { ...u };
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
    user: txClient.user,
    _store: store,
    _transactions: transactions,
  };
}

vi.mock("@/database/prisma", () => ({ prisma: fakePrismaHolder }));

// Mutable holder so each test can swap in a fresh fake prisma before importing the service.
let fakePrismaHolder: ReturnType<typeof createFakePrisma>;

describe("EconomyService", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rejects negative amounts", async () => {
    fakePrismaHolder = createFakePrisma([{ id: "u1", guildId: "g1", cash: 100, bank: 0 }]);
    const { economyService, AmountMustBePositiveError } = await import("@/services/EconomyService");
    await expect(economyService.addCash("u1", -50, TransactionType.DAILY)).rejects.toBeInstanceOf(AmountMustBePositiveError);
  });

  it("rejects zero amounts", async () => {
    fakePrismaHolder = createFakePrisma([{ id: "u1", guildId: "g1", cash: 100, bank: 0 }]);
    const { economyService, AmountMustBePositiveError } = await import("@/services/EconomyService");
    await expect(economyService.addCash("u1", 0, TransactionType.DAILY)).rejects.toBeInstanceOf(AmountMustBePositiveError);
  });

  it("rejects absurdly large amounts (overflow guard)", async () => {
    fakePrismaHolder = createFakePrisma([{ id: "u1", guildId: "g1", cash: 100, bank: 0 }]);
    const { economyService, InvalidAmountError } = await import("@/services/EconomyService");
    await expect(economyService.addCash("u1", 10_000_000_000, TransactionType.DAILY)).rejects.toBeInstanceOf(InvalidAmountError);
  });

  it("throws InsufficientFundsError when removing more cash than available", async () => {
    fakePrismaHolder = createFakePrisma([{ id: "u1", guildId: "g1", cash: 50, bank: 0 }]);
    const { economyService, InsufficientFundsError } = await import("@/services/EconomyService");
    await expect(economyService.removeCash("u1", 100, TransactionType.MARKET_PURCHASE)).rejects.toBeInstanceOf(InsufficientFundsError);
  });

  it("throws InsufficientFundsError on withdraw exceeding bank balance", async () => {
    fakePrismaHolder = createFakePrisma([{ id: "u1", guildId: "g1", cash: 0, bank: 20 }]);
    const { economyService, InsufficientFundsError } = await import("@/services/EconomyService");
    await expect(economyService.withdraw("u1", 100)).rejects.toBeInstanceOf(InsufficientFundsError);
  });

  it("correctly moves cash to bank on deposit", async () => {
    fakePrismaHolder = createFakePrisma([{ id: "u1", guildId: "g1", cash: 100, bank: 0 }]);
    const { economyService } = await import("@/services/EconomyService");
    const result = await economyService.deposit("u1", 40);
    expect(result.cash).toBe(60);
    expect(result.bank).toBe(40);
  });

  it("rejects transferring to yourself", async () => {
    fakePrismaHolder = createFakePrisma([{ id: "u1", guildId: "g1", cash: 100, bank: 0 }]);
    const { economyService, InvalidAmountError } = await import("@/services/EconomyService");
    await expect(economyService.transfer("u1", "u1", 10)).rejects.toBeInstanceOf(InvalidAmountError);
  });

  it("rejects a transfer that exceeds the sender's balance", async () => {
    fakePrismaHolder = createFakePrisma([
      { id: "sender", guildId: "g1", cash: 10, bank: 0 },
      { id: "receiver", guildId: "g1", cash: 0, bank: 0 },
    ]);
    const { economyService, InsufficientFundsError } = await import("@/services/EconomyService");
    await expect(economyService.transfer("sender", "receiver", 50)).rejects.toBeInstanceOf(InsufficientFundsError);
  });

  it("moves the exact amount between sender and receiver on a valid transfer", async () => {
    fakePrismaHolder = createFakePrisma([
      { id: "sender", guildId: "g1", cash: 100, bank: 0 },
      { id: "receiver", guildId: "g1", cash: 20, bank: 0 },
    ]);
    const { economyService } = await import("@/services/EconomyService");
    await economyService.transfer("sender", "receiver", 30);
    expect(fakePrismaHolder._store.get("sender")?.cash).toBe(70);
    expect(fakePrismaHolder._store.get("receiver")?.cash).toBe(50);
  });
});
