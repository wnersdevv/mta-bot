import { createCanvas } from "canvas";
import { AttachmentBuilder } from "discord.js";
import { t } from "@/localization/i18n";

export interface VehicleCardData {
  name: string;
  brand: string;
  price: string;
  speed?: number;
  acceleration?: number;
  handling?: number;
  rarity: string;
}

function statBar(ctx: import("canvas").CanvasRenderingContext2D, x: number, y: number, label: string, value: number): void {
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "16px sans-serif";
  ctx.fillText(label, x, y);

  const barW = 220;
  const barH = 14;
  const barY = y + 8;
  ctx.fillStyle = "#132531";
  ctx.fillRect(x, barY, barW, barH);
  ctx.fillStyle = "#1abc9c";
  ctx.fillRect(x, barY, barW * Math.max(0, Math.min(1, value / 100)), barH);
}

export async function renderVehicleCard(data: VehicleCardData, lang: string): Promise<AttachmentBuilder> {
  const width = 640;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#1a1a2e");
  bg.addColorStop(1, "#16213e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#f5c518";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(`${data.brand} ${data.name}`, 28, 50);

  ctx.fillStyle = "#57f287";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(`${t("vehicles.price", lang)}: ${data.price}`, 28, 90);

  ctx.fillStyle = "#e5e7eb";
  ctx.font = "16px sans-serif";
  ctx.fillText(`${t("vehicles.rarity", lang)}: ${data.rarity}`, 28, 120);

  statBar(ctx, 28, 160, t("vehicles.speed", lang), data.speed ?? 0);
  statBar(ctx, 28, 200, t("vehicles.acceleration", lang), data.acceleration ?? 0);
  statBar(ctx, 28, 240, t("vehicles.handling", lang), data.handling ?? 0);

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "vehicle-card.png" });
}
