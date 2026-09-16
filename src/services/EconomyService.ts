import { prisma } from "@/database/prisma";
import { TransactionType } from "@prisma/client";
import { logEvent } from "@/utils/logger";

export class InsufficientFundsError extends Error {
  constructor() {
    super("INSUFFICIENT_FUNDS");
  }
}

export class InvalidAmountError extends Error {
  constructor() {
    super("INVALID_AMOUNT");
  }
}

/** Distinct from InvalidAmountError (bad/overflowing input) — this is specifically
 * "you entered zero or a negative number", which gets its own clearer user-facing
 * message (economy.amount_must_be_positive) rather than the generic invalid-amount one. */
export class AmountMustBePositiveError extends Error {
  constructor() {
    super("AMOUNT_MUST_BE_POSITIVE");
  }
}

const MAX_TRANSACTION_AMOUNT = 1_000_000_000; // guards against overflow / absurd exploit amounts

function assertValidAmount(amount: number): void {
  if (!Number.isFinite(amount) || Number.isNaN(amount)) throw new InvalidAmountError();
  if (amount <= 0) throw new AmountMustBePositiveError();
  if (amount > MAX_TRANSACTION_AMOUNT) throw new InvalidAmountError();
}

/**
 * EconomyService centralizes every balance mutation. All writes happen inside a single
 * Prisma transaction (read-modify-write) to prevent race conditions on concurrent
 * purchases/transfers, and every movement is mirrored into the Transaction ledger.
 *
 * NOTE: money fields are plain `number` (Float in the MongoDB schema), not BigInt —
 * the MongoDB connector doesn't support BigInt. Amounts are kept as whole-dollar
 * integers by convention (never fractional), and Float has exact integer precision
 * up to 2^53, far beyond MAX_TRANSACTION_AMOUNT, so this is safe for game currency.
 *
 * `prisma.$transaction` requires MongoDB to run as a replica set — see README.
 */
export class EconomyService {
  async getBalance(userId: string): Promise<{ cash: number; bank: number }> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { cash: user.cash, bank: user.bank };
  }

  async addCash(userId: string, amount: number, type: TransactionType, metadata: Record<string, unknown> = {}): Promise<number> {
    assertValidAmount(amount);
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const balanceBefore = user.cash;
      const balanceAfter = balanceBefore + amount;
      await tx.user.update({ where: { id: userId }, data: { cash: balanceAfter } });
      await tx.transaction.create({
        data: { guildId: user.guildId, userId, type, amount, balanceBefore, balanceAfter, metadata },
      });
      return balanceAfter;
    });
  }

  async removeCash(userId: string, amount: number, type: TransactionType, metadata: Record<string, unknown> = {}): Promise<number> {
    assertValidAmount(amount);
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const balanceBefore = user.cash;
      if (balanceBefore < amount) throw new InsufficientFundsError();
      const balanceAfter = balanceBefore - amount;
      await tx.user.update({ where: { id: userId }, data: { cash: balanceAfter } });
      await tx.transaction.create({
        data: { guildId: user.guildId, userId, type, amount: -amount, balanceBefore, balanceAfter, metadata },
      });
      return balanceAfter;
    });
  }

  async deposit(userId: string, amount: number): Promise<{ cash: number; bank: number }> {
    assertValidAmount(amount);
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.cash < amount) throw new InsufficientFundsError();
      const cash = user.cash - amount;
      const bank = user.bank + amount;
      await tx.user.update({ where: { id: userId }, data: { cash, bank } });
      await tx.transaction.create({
        data: { guildId: user.guildId, userId, type: TransactionType.DEPOSIT, amount, balanceBefore: user.cash, balanceAfter: cash },
      });
      return { cash, bank };
    });
  }

  async withdraw(userId: string, amount: number): Promise<{ cash: number; bank: number }> {
    assertValidAmount(amount);
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.bank < amount) throw new InsufficientFundsError();
      const cash = user.cash + amount;
      const bank = user.bank - amount;
      await tx.user.update({ where: { id: userId }, data: { cash, bank } });
      await tx.transaction.create({
        data: { guildId: user.guildId, userId, type: TransactionType.WITHDRAW, amount, balanceBefore: user.bank, balanceAfter: bank },
      });
      return { cash, bank };
    });
  }

  /** Atomic transfer between two users in the same guild. Both legs are logged. */
  async transfer(fromUserId: string, toUserId: string, amount: number): Promise<void> {
    assertValidAmount(amount);
    if (fromUserId === toUserId) throw new InvalidAmountError();

    await prisma.$transaction(async (tx) => {
      const sender = await tx.user.findUniqueOrThrow({ where: { id: fromUserId } });
      if (sender.cash < amount) throw new InsufficientFundsError();
      const receiver = await tx.user.findUniqueOrThrow({ where: { id: toUserId } });

      const senderAfter = sender.cash - amount;
      const receiverAfter = receiver.cash + amount;

      await tx.user.update({ where: { id: fromUserId }, data: { cash: senderAfter } });
      await tx.user.update({ where: { id: toUserId }, data: { cash: receiverAfter } });

      await tx.transaction.create({
        data: {
          guildId: sender.guildId,
          userId: fromUserId,
          type: TransactionType.TRANSFER_OUT,
          amount: -amount,
          balanceBefore: sender.cash,
          balanceAfter: senderAfter,
          metadata: { to: toUserId },
        },
      });
      await tx.transaction.create({
        data: {
          guildId: receiver.guildId,
          userId: toUserId,
          type: TransactionType.TRANSFER_IN,
          amount,
          balanceBefore: receiver.cash,
          balanceAfter: receiverAfter,
          metadata: { from: fromUserId },
        },
      });
    });

    logEvent("TRANSFER", "User transfer completed", { fromUserId, toUserId, amount });
  }
}

export const economyService = new EconomyService();
