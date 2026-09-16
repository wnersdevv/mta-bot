import { prisma } from "@/database/prisma";

export interface CooldownCheck {
  onCooldown: boolean;
  remainingMs: number;
  streak: number;
}

/**
 * Centralized cooldown handling for /gunluk (daily), /calis (work), and per-mission
 * cooldowns. Streaks reset if the gap since the last claim exceeds ~2x the cooldown
 * window, so missing a day breaks a daily streak but reasonable jitter doesn't.
 */
export class CooldownService {
  async check(userId: string, key: string): Promise<CooldownCheck> {
    const record = await prisma.cooldown.findUnique({ where: { userId_key: { userId, key } } });
    if (!record) return { onCooldown: false, remainingMs: 0, streak: 0 };

    const remainingMs = record.expiresAt.getTime() - Date.now();
    return { onCooldown: remainingMs > 0, remainingMs: Math.max(0, remainingMs), streak: record.streak };
  }

  /** Set a new cooldown window. If `trackStreak` is true, increments streak when claimed
   * within `streakWindowSec` of the previous expiry, otherwise resets streak to 1. */
  async trigger(userId: string, key: string, durationSec: number, options?: { trackStreak?: boolean; streakWindowSec?: number }): Promise<number> {
    const existing = await prisma.cooldown.findUnique({ where: { userId_key: { userId, key } } });
    const now = Date.now();
    const expiresAt = new Date(now + durationSec * 1000);

    let streak = 1;
    if (options?.trackStreak && existing) {
      const windowMs = (options.streakWindowSec ?? durationSec * 2) * 1000;
      const withinWindow = now - existing.expiresAt.getTime() <= windowMs;
      streak = withinWindow ? existing.streak + 1 : 1;
    }

    await prisma.cooldown.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, expiresAt, streak },
      update: { expiresAt, streak },
    });

    return streak;
  }

  formatRemaining(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }
}

export const cooldownService = new CooldownService();
