import { createCanvas } from "canvas";
import { AttachmentBuilder } from "discord.js";
import { t } from "@/localization/i18n";

export interface DailyRewardCardData {
  username: string;
  amount: number;
  streak: number;
}

export async function renderDailyRewardCard(data: DailyRewardCardData, lang: string): Promise<AttachmentBuilder> {
  const width = 700;
  const height = 260;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#3a1c71");
  bg.addColorStop(0.5, "#d76d77");
  bg.addColorStop(1, "#ffaf7b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText(t("economy.daily_title", lang), 40, 60);

  ctx.font = "bold 54px sans-serif";
  ctx.fillStyle = "#ffe066";
  ctx.fillText(`+$${data.amount.toLocaleString("en-US")}`, 40, 140);

  ctx.font = "24px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${data.username} • 🔥 ${data.streak}`, 40, 190);

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "daily-reward.png" });
}
