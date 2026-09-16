import type { Client } from "discord.js";
import { t } from "@/localization/i18n";
import { successEmbed, formatCurrency } from "@/utils/embeds";
import { languageService } from "@/services/LanguageService";
import { logger } from "@/utils/logger";

/**
 * Best-effort DM to the person who just received a transfer, in *their* language
 * (not the sender's) and only if they haven't disabled notifications. Transfers
 * already succeed without this — a closed DM or a rate limit here must never
 * affect the sender's already-completed transaction, so every failure is swallowed.
 */
export async function notifyTransferReceiver(
  client: Client,
  guildId: string,
  receiverDiscordId: string,
  receiverNotificationsEnabled: boolean,
  senderUsername: string,
  amount: number,
): Promise<void> {
  if (!receiverNotificationsEnabled) return;

  try {
    const receiverLang = await languageService.resolve(receiverDiscordId, guildId);
    const receiverUser = await client.users.fetch(receiverDiscordId);
    await receiverUser.send({
      embeds: [successEmbed(t("economy.transfer_received", receiverLang, { amount: formatCurrency(amount), user: senderUsername }))],
    });
  } catch (err) {
    logger.warn({ err, receiverDiscordId }, "Could not DM transfer receiver (DMs likely closed)");
  }
}
