import { createCanvas } from "canvas";
import { AttachmentBuilder } from "discord.js";
import { t } from "@/localization/i18n";

export interface AchievementCardData {
  username: string;
  title: string;
  description: string;
}

export async function renderAchievementCard(data: AchievementCardData, lang: string): Promise<AttachmentBuilder> {
  const width = 700;
  const height = 220;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#4b1248");
  bg.addColorStop(1, "#f0c419");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(t("achievements.unlocked_title", lang), 32, 56);

  ctx.font = "bold 30px sans-serif";
  ctx.fillStyle = "#1a1a2e";
  ctx.fillText(data.title, 32, 110);

  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#2c2c2c";
  ctx.fillText(data.description, 32, 145);

  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#1a1a2e";
  ctx.fillText(data.username, 32, 190);

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "achievement.png" });
}
