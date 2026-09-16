export const SUPPORTED_LANGUAGES = ["tr", "en", "de", "es"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DAILY_REWARD_TIERS: readonly number[] = [
  5_000, 7_500, 10_000, 12_500, 15_000, 20_000, 50_000, // day 7 = big bonus, then loops
];

export function getDailyReward(streak: number): number {
  const index = Math.min(streak, DAILY_REWARD_TIERS.length - 1);
  return DAILY_REWARD_TIERS[index];
}

export interface JobDefinition {
  key: string;
  emoji: string;
  minReward: number;
  maxReward: number;
  xp: number;
  reputation: number;
  cooldownSec: number;
  difficulty: "easy" | "medium" | "hard";
}

export const JOBS: Record<string, JobDefinition> = {
  taksi: { key: "taksi", emoji: "🚕", minReward: 800, maxReward: 1600, xp: 15, reputation: 1, cooldownSec: 600, difficulty: "easy" },
  kamyon: { key: "kamyon", emoji: "🚚", minReward: 1200, maxReward: 2200, xp: 20, reputation: 1, cooldownSec: 600, difficulty: "easy" },
  kurye: { key: "kurye", emoji: "📦", minReward: 600, maxReward: 1400, xp: 10, reputation: 1, cooldownSec: 600, difficulty: "easy" },
  tamirci: { key: "tamirci", emoji: "🔧", minReward: 1500, maxReward: 2800, xp: 25, reputation: 2, cooldownSec: 600, difficulty: "medium" },
  dedektif: { key: "dedektif", emoji: "🕵️", minReward: 2000, maxReward: 3500, xp: 35, reputation: 3, cooldownSec: 600, difficulty: "hard" },
  siber: { key: "siber", emoji: "💻", minReward: 2500, maxReward: 4200, xp: 40, reputation: 3, cooldownSec: 600, difficulty: "hard" },
  isletmeci: { key: "isletmeci", emoji: "🏪", minReward: 1800, maxReward: 3000, xp: 30, reputation: 2, cooldownSec: 600, difficulty: "medium" },
};

export const COOLDOWNS_SEC = {
  gunluk: 24 * 60 * 60,
  calis: 10 * 60,
  gorev: 30 * 60,
};

// Her mülk, sahiplenildiği andan (veya son toplamadan) itibaren bu süre
// dolduğunda gelirini tahsil edilebilir hale getirir.
export const PROPERTY_INCOME_INTERVAL_SEC = 4 * 60 * 60; // 4 saat

export const XP_PER_LEVEL = 500;

// Envanter eşyaları, orijinal değerinin bu oranı karşılığında satılabilir.
export const INVENTORY_SELL_RATE = 0.6;

export function xpToNextLevel(level: number): number {
  return level * XP_PER_LEVEL;
}
