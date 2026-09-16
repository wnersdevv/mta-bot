import { describe, it, expect } from "vitest";
import { discordIdSchema, positiveAmountSchema, transferModalSchema, crewNameSchema } from "@/utils/validation";

describe("discordIdSchema", () => {
  it("accepts a valid 18-digit snowflake", () => {
    expect(discordIdSchema.safeParse("123456789012345678").success).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const result = discordIdSchema.safeParse("  123456789012345678  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("123456789012345678");
  });

  it("rejects non-numeric input", () => {
    expect(discordIdSchema.safeParse("not-a-snowflake").success).toBe(false);
  });

  it("rejects a too-short id", () => {
    expect(discordIdSchema.safeParse("123").success).toBe(false);
  });
});

describe("positiveAmountSchema", () => {
  it("parses a valid numeric string to a number", () => {
    const result = positiveAmountSchema.safeParse("5000");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(5000);
  });

  it("rejects zero", () => {
    expect(positiveAmountSchema.safeParse("0").success).toBe(false);
  });

  it("rejects negative numbers (not even representable as this string pattern)", () => {
    expect(positiveAmountSchema.safeParse("-100").success).toBe(false);
  });

  it("rejects non-numeric strings", () => {
    expect(positiveAmountSchema.safeParse("abc").success).toBe(false);
  });

  it("rejects amounts over the 1 billion cap", () => {
    expect(positiveAmountSchema.safeParse("5000000000").success).toBe(false);
  });

  it("rejects decimals (whole-dollar amounts only)", () => {
    expect(positiveAmountSchema.safeParse("100.50").success).toBe(false);
  });
});

describe("transferModalSchema", () => {
  it("accepts a valid combination", () => {
    const result = transferModalSchema.safeParse({ kullaniciId: "123456789012345678", miktar: "2500" });
    expect(result.success).toBe(true);
  });

  it("rejects when the user id is invalid even if the amount is fine", () => {
    const result = transferModalSchema.safeParse({ kullaniciId: "abc", miktar: "2500" });
    expect(result.success).toBe(false);
  });
});

describe("crewNameSchema", () => {
  it("accepts a normal crew name", () => {
    expect(crewNameSchema.safeParse("Gece Kartalları").success).toBe(true);
  });

  it("rejects names shorter than 3 characters", () => {
    expect(crewNameSchema.safeParse("ab").success).toBe(false);
  });

  it("rejects names longer than 32 characters", () => {
    expect(crewNameSchema.safeParse("a".repeat(33)).success).toBe(false);
  });

  it("rejects names with disallowed symbols", () => {
    expect(crewNameSchema.safeParse("Crew@@@!!!").success).toBe(false);
  });

  it("allows letters, numbers, spaces, hyphens and underscores", () => {
    expect(crewNameSchema.safeParse("Crew_07 - Elite").success).toBe(true);
  });
});
