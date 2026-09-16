import { logEvent } from "@/utils/logger";

const WINDOW_MS = 3_000;
const MAX_ACTIONS_PER_WINDOW = 6;

// discordUserId -> bu pencere içindeki interaction zaman damgaları
const actionLog = new Map<string, number[]>();

// Belleğin sonsuza kadar büyümesini önlemek için periyodik temizlik.
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [userId, timestamps] of actionLog) {
    const kept = timestamps.filter((ts) => ts > cutoff);
    if (kept.length === 0) actionLog.delete(userId);
    else actionLog.set(userId, kept);
  }
}, 30_000).unref();

/**
 * Returns true if this interaction should be allowed. Tracks every interaction
 * (commands, buttons, selects, modals) per Discord user in a sliding window —
 * a user spamming clicks or resubmitting a modal gets rate-limited regardless
 * of which specific action they're hammering.
 */
export function checkRateLimit(discordUserId: string, guildId: string | null): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  const timestamps = (actionLog.get(discordUserId) ?? []).filter((ts) => ts > cutoff);
  timestamps.push(now);
  actionLog.set(discordUserId, timestamps);

  const allowed = timestamps.length <= MAX_ACTIONS_PER_WINDOW;
  if (!allowed) {
    logEvent("RATE_LIMIT", "User exceeded interaction rate limit", { userId: discordUserId, guildId: guildId ?? undefined, count: timestamps.length });
  }
  return allowed;
}
