import { prisma } from "@/database/prisma";
import { TransactionType } from "@prisma/client";
import { PROPERTY_INCOME_INTERVAL_SEC } from "@/config/game";

export interface CollectedProperty {
  name: string;
  amount: number;
}

export interface IncomeCollectionResult {
  total: number;
  properties: CollectedProperty[];
}

export class PropertyIncomeService {
  /**
   * Collects income from every property the user owns whose PROPERTY_INCOME_INTERVAL_SEC
   * window has elapsed since its last collection. Runs as a single Prisma transaction so
   * the cash credit, the ledger entry, and each property's lastIncomeAt reset all succeed
   * or fail together — a user can't double-collect by retrying a failed request.
   */
  async collect(userId: string): Promise<IncomeCollectionResult> {
    const cutoff = new Date(Date.now() - PROPERTY_INCOME_INTERVAL_SEC * 1000);

    return prisma.$transaction(async (tx) => {
      const eligible = await tx.userProperty.findMany({
        where: { userId, lastIncomeAt: { lte: cutoff } },
        include: { property: true },
      });

      if (eligible.length === 0) {
        return { total: 0, properties: [] };
      }

      const total = eligible.reduce((sum, up) => sum + up.property.income, 0);
      const now = new Date();

      await Promise.all(eligible.map((up) => tx.userProperty.update({ where: { id: up.id }, data: { lastIncomeAt: now } })));

      if (total > 0) {
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        const balanceAfter = user.cash + total;
        await tx.user.update({ where: { id: userId }, data: { cash: balanceAfter } });
        await tx.transaction.create({
          data: {
            guildId: user.guildId,
            userId,
            type: TransactionType.PROPERTY_INCOME,
            amount: total,
            balanceBefore: user.cash,
            balanceAfter,
            metadata: { propertyIds: eligible.map((up) => up.propertyId) },
          },
        });
      }

      return {
        total,
        properties: eligible.map((up) => ({ name: up.property.name, amount: up.property.income })),
      };
    });
  }
}

export const propertyIncomeService = new PropertyIncomeService();
