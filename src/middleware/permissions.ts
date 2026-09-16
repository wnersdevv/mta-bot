import { GuildMember, PermissionFlagsBits } from "discord.js";
import { prisma } from "@/database/prisma";
import { logEvent } from "@/utils/logger";

export async function isAdmin(member: GuildMember): Promise<boolean> {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  const settings = await prisma.guildSettings.findUnique({ where: { guildId: member.guild.id } });
  if (settings?.adminRoleId && member.roles.cache.has(settings.adminRoleId)) return true;

  return false;
}

export async function requireAdmin(member: GuildMember): Promise<boolean> {
  const ok = await isAdmin(member);
  if (!ok) {
    logEvent("PERMISSION_DENIED", "Non-admin attempted admin command", { userId: member.id, guildId: member.guild.id });
  }
  return ok;
}
