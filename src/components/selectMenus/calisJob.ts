import type { SelectMenuHandler } from "@/types";
import { t } from "@/localization/i18n";
import { successEmbed, errorEmbed } from "@/utils/embeds";
import { cooldownService } from "@/services/CooldownService";
import { economyService } from "@/services/EconomyService";
import { userRepository } from "@/repositories/UserRepository";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { TransactionType } from "@prisma/client";
import { JOBS, COOLDOWNS_SEC, XP_PER_LEVEL } from "@/config/game";
import { checkAndNotifyAchievements } from "@/components/shared/notifyAchievements";

const handler: SelectMenuHandler = {
  customIdPrefix: "calis:job:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const jobKey = interaction.values[0];
    const job = JOBS[jobKey];
    if (!job) {
      await interaction.update({ embeds: [errorEmbed(t("errors.generic", lang))], components: [] });
      return;
    }

    const dbUser = await userRepository.findOrCreate(interaction.user.id, interaction.guildId!);

    const status = await cooldownService.check(dbUser.id, "calis");
    if (status.onCooldown) {
      await interaction.update({
        embeds: [errorEmbed(t("economy.work_cooldown", lang, { remaining: cooldownService.formatRemaining(status.remainingMs) }))],
        components: [],
      });
      return;
    }

    await cooldownService.trigger(dbUser.id, "calis", COOLDOWNS_SEC.calis);

    const reward = Math.floor(job.minReward + Math.random() * (job.maxReward - job.minReward));
    await economyService.addCash(dbUser.id, reward, TransactionType.WORK, { job: job.key });
    await userRepository.addXpAndCheckLevelUp(dbUser.id, job.xp, XP_PER_LEVEL);

    await interaction.update({
      embeds: [
        successEmbed(
          t("economy.work_success", lang, { job: t(`economy.job_${job.key}`, lang), amount: `$${reward.toLocaleString("en-US")}`, xp: job.xp }),
        ),
      ],
      components: [],
    });
    await checkAndNotifyAchievements(interaction, dbUser.id, interaction.user.username, lang, dbUser.notifications);
  },
};

export default handler;
