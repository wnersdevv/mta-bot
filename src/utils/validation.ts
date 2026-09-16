import { z } from "zod";

export const discordIdSchema = z
  .string()
  .trim()
  .regex(/^\d{17,20}$/, "INVALID_DISCORD_ID");

export const positiveAmountSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "INVALID_AMOUNT")
  .transform((val) => Number(val))
  .refine((val) => val > 0 && val <= 1_000_000_000, "AMOUNT_OUT_OF_RANGE");

export const transferModalSchema = z.object({
  kullaniciId: discordIdSchema,
  miktar: positiveAmountSchema,
});

export const crewNameSchema = z
  .string()
  .trim()
  .min(3, "TOO_SHORT")
  .max(32, "TOO_LONG")
  .regex(/^[\p{L}\p{N} _-]+$/u, "INVALID_CHARACTERS");
