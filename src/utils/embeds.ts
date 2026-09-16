import { EmbedBuilder, ColorResolvable } from "discord.js";

export const BRAND_COLOR: ColorResolvable = 0x1abc9c;
export const ERROR_COLOR: ColorResolvable = 0xed4245;
export const SUCCESS_COLOR: ColorResolvable = 0x57f287;
export const GOLD_COLOR: ColorResolvable = 0xf5c518;

export function baseEmbed(): EmbedBuilder {
  return new EmbedBuilder().setColor(BRAND_COLOR).setTimestamp();
}

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(ERROR_COLOR).setDescription(`❌ ${message}`).setTimestamp();
}

export function successEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(SUCCESS_COLOR).setDescription(`✅ ${message}`).setTimestamp();
}

export function formatCurrency(amount: number, currencySymbol = "$"): string {
  return `${currencySymbol}${Math.trunc(amount).toLocaleString("en-US")}`;
}
