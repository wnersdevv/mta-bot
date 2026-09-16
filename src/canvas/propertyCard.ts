import { createCanvas } from "canvas";
import { AttachmentBuilder } from "discord.js";
import { t } from "@/localization/i18n";

export interface PropertyCardData {
  name: string;
  price: string;
  capacity: number;
  income: string;
  levelRequirement: number;
  rarity: string;
}

export async function renderPropertyCard(data: PropertyCardData, lang: string): Promise<AttachmentBuilder> {
  const width = 640;
  const height = 280;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#2c3e50");
  bg.addColorStop(1, "#4ca1af");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#f5c518";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(`🏠 ${data.name}`, 28, 56);

  ctx.fillStyle = "#57f287";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(`${t("properties.price", lang)}: ${data.price}`, 28, 100);

  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${t("properties.capacity", lang)}: ${data.capacity}`, 28, 140);
  ctx.fillText(`${t("properties.income", lang)}: ${data.income}`, 28, 170);
  ctx.fillText(`${t("properties.level_requirement", lang)}: ${data.levelRequirement}`, 28, 200);
  ctx.fillText(`${t("properties.rarity", lang)}: ${data.rarity}`, 28, 230);

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "property-card.png" });
}
