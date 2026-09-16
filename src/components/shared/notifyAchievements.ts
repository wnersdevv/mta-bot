import type { ChatInputCommandInteraction, ButtonInteraction, StringSelectMenuInteraction, ModalSubmitInteraction } from "discord.js";
import { t } from "@/localization/i18n";
import { prisma } from "@/database/prisma";
import { renderAchievementCard } from "@/canvas/achievementCard";
import { achievementService } from "@/services/AchievementService";
import { NotificationType } from "@prisma/client";
import { logger } from "@/utils/logger";

type NotifiableInteraction = ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction;

/**
 * Call after any state change that could unlock an achievement (income, purchase,
 * mission completion, crew creation). Re-checks conditions, and for anything newly
 * unlocked, sends a follow-up message with the achievement card (only if the reply/
 * update this turn has already been sent — followUp requires that) and logs a
 * Notification row when the user hasn't disabled notifications.
 */
export async function checkAndNotifyAchievements(
  interaction: NotifiableInteraction,
  userId: string,
  username: string,
  lang: string,
  notificationsEnabled: boolean,
): Promise<void> {
  const unlocked = await achievementService.checkAndUnlock(userId);
  if (unlocked.length === 0) return;

  for (const { key } of unlocked) {
    const title = t(`achievements.${key}_title`, lang);
    const description = t(`achievements.${key}_description`, lang);

    if (notificationsEnabled) {
      await prisma.notification.create({
        data: { userId, type: NotificationType.ACHIEVEMENT_UNLOCKED, payload: { key } },
      });
    }

    try {
      const attachment = await renderAchievementCard({ username, title, description }, lang);
      const content = t("common.notifications.achievement_unlocked", lang, { achievement: title });
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content, files: [attachment] });
      }
    } catch (err) {
      logger.warn({ err, key }, "Failed to send achievement notification");
    }
  }
}
