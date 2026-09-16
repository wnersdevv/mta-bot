import type { ButtonHandler } from "@/types";
import { t } from "@/localization/i18n";
import { successEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { economyService } from "@/services/EconomyService";
import { cooldownService } from "@/services/CooldownService";
import { userRepository } from "@/repositories/UserRepository";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { TransactionType, NotificationType } from "@prisma/client";
import { XP_PER_LEVEL } from "@/config/game";
import { renderMissionCompleteCard } from "@/canvas/missionCompleteCard";
import { checkAndNotifyAchievements } from "@/components/shared/notifyAchievements";

const handler: ButtonHandler = {
  customIdPrefix: "gorev:tamamla:",

  async execute(interaction) {
    const [, , missionId, ownerId] = interaction.customId.split(":");
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) {
      await interaction.update({ embeds: [errorEmbed(t("errors.mission_not_found", lang))], components: [] });
      return;
    }

    const dbUser = await userRepository.findOrCreate(interaction.user.id, interaction.guildId!);
    const cooldownKey = `gorev:${mission.id}`;

    const status = await cooldownService.check(dbUser.id, cooldownKey);
    if (status.onCooldown) {
      await interaction.update({
        embeds: [errorEmbed(t("missions.on_cooldown", lang, { remaining: cooldownService.formatRemaining(status.remainingMs) }))],
        components: [],
      });
      return;
    }

    await cooldownService.trigger(dbUser.id, cooldownKey, mission.cooldownSec);

    const rewardAmount = Number(mission.reward);
    await economyService.addCash(dbUser.id, rewardAmount, TransactionType.MISSION_REWARD, { missionId: mission.id });
    await userRepository.addXpAndCheckLevelUp(dbUser.id, mission.xp, XP_PER_LEVEL);

    await prisma.userMission.create({
      data: { userId: dbUser.id, missionId: mission.id, reward: mission.reward },
    });

    if (dbUser.notifications) {
      await prisma.notification.create({
        data: {
          userId: dbUser.id,
          type: NotificationType.MISSION_COMPLETED,
          payload: { missionKey: mission.key },
        },
      });
    }

    const missionTitle = t(`missions.${mission.key}_title`, lang);
    const attachment = await renderMissionCompleteCard(
      {
        username: interaction.user.username,
        missionTitle,
        reward: rewardAmount,
        xp: mission.xp,
      },
      lang,
    );

    await interaction.update({
      embeds: [
        successEmbed(
          t("missions.completed_description", lang, {
            title: missionTitle,
            amount: `$${rewardAmount.toLocaleString("en-US")}`,
            xp: mission.xp,
          }),
        ),
      ],
      files: [attachment],
      components: [],
    });
    await checkAndNotifyAchievements(interaction, dbUser.id, interaction.user.username, lang, dbUser.notifications);
  },
};

export default handler;
