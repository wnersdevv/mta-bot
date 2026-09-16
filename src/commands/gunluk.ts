import { SlashCommandBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { errorEmbed, baseEmbed } from "@/utils/embeds";
import { cooldownService } from "@/services/CooldownService";
import { economyService } from "@/services/EconomyService";
import { TransactionType } from "@prisma/client";
import { getDailyReward, COOLDOWNS_SEC } from "@/config/game";
import { renderDailyRewardCard } from "@/canvas/dailyRewardCard";
import { checkAndNotifyAchievements } from "@/components/shared/notifyAchievements";

const COOLDOWN_KEY = "gunluk";

const command: Command = {
  data: new SlashCommandBuilder().setName("gunluk").setDescription("Claim your daily reward / Günlük ödülünü al"),

  async execute(interaction, ctx) {
    const lang = ctx.language;

    const status = await cooldownService.check(ctx.dbUser.id, COOLDOWN_KEY);
    if (status.onCooldown) {
      await interaction.reply({
        embeds: [errorEmbed(t("economy.daily_cooldown", lang, { remaining: cooldownService.formatRemaining(status.remainingMs) }))],
        ephemeral: true,
      });
      return;
    }

    const streak = await cooldownService.trigger(ctx.dbUser.id, COOLDOWN_KEY, COOLDOWNS_SEC.gunluk, {
      trackStreak: true,
      streakWindowSec: COOLDOWNS_SEC.gunluk * 2,
    });

    const reward = getDailyReward(streak - 1);
    await economyService.addCash(ctx.dbUser.id, reward, TransactionType.DAILY, { streak });

    const attachment = await renderDailyRewardCard({ username: interaction.user.username, amount: reward, streak }, lang);

    const embed = baseEmbed().setTitle(t("economy.daily_title", lang)).setDescription(
      t("economy.daily_success", lang, { amount: `$${reward.toLocaleString("en-US")}`, streak }),
    );

    const isBigBonusDay = streak % 7 === 0;
    if (isBigBonusDay) {
      embed.addFields({ name: "🔥", value: t("economy.daily_streak_bonus", lang) });
    }

    await interaction.reply({ embeds: [embed], files: [attachment] });
    await checkAndNotifyAchievements(interaction, ctx.dbUser.id, interaction.user.username, lang, ctx.dbUser.notifications);
  },
};

export default command;
