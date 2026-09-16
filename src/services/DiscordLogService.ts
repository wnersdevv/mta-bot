import type { Client, TextBasedChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { ayarlar } from "@/config/ayarlar";
import { prisma } from "@/database/prisma";

let clientRef: Client | null = null;

/** Called once from src/wnersdev.ts after the client is constructed, so this module
 * can send messages without every caller having to thread the client through. */
export function setLogClient(client: Client): void {
  clientRef = client;
}

async function resolveLogChannelId(guildId: string | null): Promise<string | null> {
  if (guildId) {
    const settings = await prisma.guildSettings.findUnique({ where: { guildId } });
    if (settings?.logChannelId) return settings.logChannelId;
  }
  return ayarlar.logChannelId || null;
}

/** Best-effort: never throws. If no client is registered yet, no log channel is
 * configured, or Discord rejects the send (missing permissions, deleted channel),
 * this silently no-ops rather than crashing whatever action triggered the log. */
export async function sendLogMessage(guildId: string | null, title: string, description: string, color: number): Promise<void> {
  if (!clientRef) return;

  const channelId = await resolveLogChannelId(guildId).catch(() => null);
  if (!channelId) return;

  try {
    const channel = await clientRef.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
    await (channel as TextBasedChannel).send({ embeds: [embed] });
  } catch {
    // Channel deleted, missing permissions, etc. — logged via Pino elsewhere, not fatal here.
  }
}
