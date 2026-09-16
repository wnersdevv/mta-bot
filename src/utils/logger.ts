import pino from "pino";
import { ayarlar } from "@/config/ayarlar";
import { sendLogMessage } from "@/services/DiscordLogService";

export const logger = pino({
  level: ayarlar.nodeEnv === "production" ? "info" : "debug",
  transport:
    ayarlar.nodeEnv === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
});

export type LogCategory =
  | "TRANSFER"
  | "PURCHASE"
  | "SALE"
  | "REWARD"
  | "ADMIN_ACTION"
  | "USER_ACTION"
  | "PERMISSION_DENIED"
  | "RATE_LIMIT"
  | "EXPLOIT_ATTEMPT";

// Categories worth surfacing in the configured Discord log channel, not just the
// console — admin actions (audit trail) and anything security-relevant.
const CHANNEL_LOGGED_CATEGORIES = new Set<LogCategory>(["ADMIN_ACTION", "PERMISSION_DENIED", "RATE_LIMIT", "EXPLOIT_ATTEMPT"]);
const CATEGORY_COLOR: Partial<Record<LogCategory, number>> = {
  ADMIN_ACTION: 0xf5c518,
  PERMISSION_DENIED: 0xed4245,
  RATE_LIMIT: 0xed4245,
  EXPLOIT_ATTEMPT: 0xed4245,
};

export function logEvent(category: LogCategory, message: string, meta: Record<string, unknown> = {}): void {
  const isSecurity = category === "PERMISSION_DENIED" || category === "RATE_LIMIT" || category === "EXPLOIT_ATTEMPT";
  logger[isSecurity ? "warn" : "info"]({ category, ...meta }, message);

  if (CHANNEL_LOGGED_CATEGORIES.has(category)) {
    const guildId = typeof meta.guildId === "string" ? meta.guildId : null;
    const detail = Object.entries(meta)
      .map(([key, value]) => `**${key}**: ${String(value)}`)
      .join("\n");
    void sendLogMessage(guildId, `${category} — ${message}`, detail || "—", CATEGORY_COLOR[category] ?? 0x95a5a6).catch(() => undefined);
  }
}
