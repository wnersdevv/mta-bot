import { createCanvas } from "canvas";
import { AttachmentBuilder } from "discord.js";
import { t } from "@/localization/i18n";

export interface MissionCompleteCardData {
  username: string;
  missionTitle: string;
  reward: number;
  xp: number;
}

export async function renderMissionCompleteCard(data: MissionCompleteCardData, lang: string): Promise<AttachmentBuilder> {
  const width = 720;
  const height = 260;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#0f2027");
  bg.addColorStop(0.5, "#134e5e");
  bg.addColorStop(1, "#71b280");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#f5c518";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(t("missions.completed_title", lang), 32, 56);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(data.missionTitle, 32, 100);

  ctx.font = "22px sans-serif";
  ctx.fillStyle = "#57f287";
  ctx.fillText(`💰 +$${data.reward.toLocaleString("en-US")}`, 32, 150);
  ctx.fillStyle = "#5dade2";
  ctx.fillText(`⭐ +${data.xp} XP`, 32, 185);

  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#e5e7eb";
  ctx.fillText(data.username, 32, 225);

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "mission-complete.png" });
}
