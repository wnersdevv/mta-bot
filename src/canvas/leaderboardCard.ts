import { createCanvas } from "canvas";
import { AttachmentBuilder } from "discord.js";

export interface LeaderboardRow {
  rank: number;
  username: string;
  value: string;
}

export async function renderLeaderboardCard(title: string, rows: LeaderboardRow[]): Promise<AttachmentBuilder> {
  const width = 720;
  const rowHeight = 46;
  const headerHeight = 70;
  const height = headerHeight + rowHeight * Math.max(rows.length, 1) + 20;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#0f2027");
  bg.addColorStop(1, "#203a43");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#f5c518";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(title, 24, 46);

  rows.forEach((row, idx) => {
    const y = headerHeight + idx * rowHeight;
    ctx.fillStyle = idx % 2 === 0 ? "#132531" : "#0f2027";
    ctx.fillRect(0, y, width, rowHeight);

    const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : `#${row.rank}`;
    ctx.fillStyle = "#ffffff";
    ctx.font = "22px sans-serif";
    ctx.fillText(`${medal}`, 24, y + 30);
    ctx.fillText(row.username, 100, y + 30);

    ctx.fillStyle = "#1abc9c";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(row.value, width - 24, y + 30);
    ctx.textAlign = "left";
  });

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "leaderboard.png" });
}
