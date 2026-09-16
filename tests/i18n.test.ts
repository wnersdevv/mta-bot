import { describe, it, expect } from "vitest";
import { t, isSupportedLanguage } from "@/localization/i18n";

describe("i18n", () => {
  it("resolves a known key in the requested language", () => {
    expect(t("economy.cash", "en")).toBe("Cash");
    expect(t("economy.cash", "tr")).toBe("Nakit");
    expect(t("economy.cash", "de")).toBe("Bargeld");
    expect(t("economy.cash", "es")).toBe("Efectivo");
  });

  it("falls back to Turkish when an unsupported language is passed", () => {
    expect(t("economy.cash", "fr")).toBe(t("economy.cash", "tr"));
  });

  it("interpolates variables into the template", () => {
    const result = t("economy.transfer_success", "en", { amount: "$500", user: "Alex" });
    expect(result).toBe("You sent $500 to Alex.");
  });

  it("returns the raw key when no translation exists in any language", () => {
    expect(t("economy.this_key_does_not_exist", "en")).toBe("economy.this_key_does_not_exist");
  });

  it("validates supported language codes", () => {
    expect(isSupportedLanguage("tr")).toBe(true);
    expect(isSupportedLanguage("en")).toBe(true);
    expect(isSupportedLanguage("fr")).toBe(false);
  });
});
