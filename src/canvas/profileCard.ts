import { createCanvas, loadImage } from "canvas";
import { AttachmentBuilder } from "discord.js";
import { logger } from "@/utils/logger";
import { t } from "@/localization/i18n";

export interface ProfileCardData {
  username: string;
  avatarUrl: string;
  level: number;
  xp: number;
  xpNeeded: number;
  cash: number;
  bank: number;
  reputation: number;
  crewName: string | null;
  achievementCount: number;
}

const WIDTH = 900;
const HEIGHT = 320;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Renders a GTA-Online-style profile card. Falls back gracefully to a placeholder
 * avatar circle if the avatar image fails to load (network hiccup, etc). */
export async function renderProfileCard(data: ProfileCardData, lang: string): Promise<AttachmentBuilder> {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, "#0f2027");
  bg.addColorStop(0.5, "#203a43");
  bg.addColorStop(1, "#2c5364");
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, WIDTH, HEIGHT, 24);
  ctx.fill();

  // Accent stripe
  ctx.fillStyle = "#1abc9c";
  roundRect(ctx, 0, 0, 10, HEIGHT, 6);
  ctx.fill();

  // Avatar
  const avatarSize = 160;
  const avatarX = 60;
  const avatarY = 80;
  try {
    const avatar = await loadImage(data.avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } catch (err) {
    logger.warn({ err }, "Failed to load avatar image, using placeholder");
    ctx.fillStyle = "#1abc9c";
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ring around avatar
  ctx.strokeStyle = "#f5c518";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
  ctx.stroke();

  // Username
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(data.username, 260, 120);

  // Level badge
  ctx.fillStyle = "#f5c518";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(`${t("profile.level", lang)} ${data.level}`, 260, 160);

  // XP bar
  const barX = 260;
  const barY = 180;
  const barW = 580;
  const barH = 22;
  ctx.fillStyle = "#132531";
  roundRect(ctx, barX, barY, barW, barH, 11);
  ctx.fill();

  const pct = Math.max(0, Math.min(1, data.xp / Math.max(1, data.xpNeeded)));
  ctx.fillStyle = "#1abc9c";
  roundRect(ctx, barX, barY, Math.max(barH, barW * pct), barH, 11);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "16px sans-serif";
  ctx.fillText(`${data.xp} / ${data.xpNeeded} XP`, barX, barY + barH + 24);

  // Stats row
  const statY = 260;
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "#57f287";
  ctx.fillText(`💰 $${data.cash.toLocaleString("en-US")}`, 260, statY);
  ctx.fillStyle = "#5dade2";
  ctx.fillText(`🏦 $${data.bank.toLocaleString("en-US")}`, 460, statY);
  ctx.fillStyle = "#f5c518";
  ctx.fillText(`⭐ ${data.reputation}`, 660, statY);
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "18px sans-serif";
  ctx.fillText(`👥 ${data.crewName ?? "—"}   🏅 ${data.achievementCount}`, 260, statY + 30);

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "profile-card.png" });
}
