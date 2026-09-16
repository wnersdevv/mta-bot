import fs from "node:fs";
import path from "node:path";
import { SUPPORTED_LANGUAGES, SupportedLanguage } from "@/config/game";
import { logger } from "@/utils/logger";

const NAMESPACES = [
  "common",
  "economy",
  "profile",
  "vehicles",
  "missions",
  "properties",
  "crew",
  "market",
  "inventory",
  "leaderboard",
  "achievements",
  "admin",
  "errors",
] as const;

type Namespace = (typeof NAMESPACES)[number];
type LocaleTree = Record<string, unknown>;

const FALLBACK_LANGUAGE: SupportedLanguage = "tr";
const LOCALES_DIR = path.join(__dirname, "locales");

// locales[lang][namespace] = parsed json tree
const locales: Record<string, Partial<Record<Namespace, LocaleTree>>> = {};

function loadLocales(): void {
  for (const lang of SUPPORTED_LANGUAGES) {
    locales[lang] = {};
    for (const ns of NAMESPACES) {
      const filePath = path.join(LOCALES_DIR, lang, `${ns}.json`);
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        locales[lang]![ns] = JSON.parse(raw) as LocaleTree;
      } catch {
        // Missing namespace file for this language — fallback logic in t() covers it.
        locales[lang]![ns] = {};
      }
    }
  }
  logger.info({ languages: SUPPORTED_LANGUAGES }, "Localization loaded");
}

loadLocales();

function resolveKeyPath(tree: LocaleTree | undefined, keyPath: string[]): unknown {
  let node: unknown = tree;
  for (const segment of keyPath) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return node;
}

function interpolate(template: string, vars?: Record<string, unknown>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return key in vars ? String(vars[key]) : match;
  });
}

/**
 * Translate a dotted key, e.g. "economy.insufficient_balance".
 * The first path segment is treated as the namespace (locales/<lang>/<namespace>.json).
 * Falls back: requested language -> FALLBACK_LANGUAGE ("tr") -> the raw key itself.
 */
export function t(key: string, lang: SupportedLanguage | string | null | undefined, vars?: Record<string, unknown>): string {
  const resolvedLang: SupportedLanguage = SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
    ? (lang as SupportedLanguage)
    : FALLBACK_LANGUAGE;

  const [namespace, ...rest] = key.split(".");
  const value =
    resolveKeyPath(locales[resolvedLang]?.[namespace as Namespace], rest) ??
    resolveKeyPath(locales[FALLBACK_LANGUAGE]?.[namespace as Namespace], rest);

  if (typeof value !== "string") {
    logger.warn({ key, lang: resolvedLang }, "Missing localization key");
    return key;
  }

  return interpolate(value, vars);
}

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

export { NAMESPACES, FALLBACK_LANGUAGE };
export type { Namespace };
