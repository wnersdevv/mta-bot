import { SlashCommandBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { errorEmbed, successEmbed } from "@/utils/embeds";
import { requireAdmin } from "@/middleware/permissions";
import { userRepository } from "@/repositories/UserRepository";
import { economyService } from "@/services/EconomyService";
import { TransactionType } from "@prisma/client";
import { logEvent } from "@/utils/logger";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("admin-ekonomi")
    .setDescription("Adjust a user's balance (admin) / Kullanıcı bakiyesini düzenle")
    .addUserOption((o) => o.setName("kullanici").setDescription("Target user / Hedef kullanıcı").setRequired(true))
    .addIntegerOption((o) => o.setName("miktar").setDescription("Amount (can be negative) / Miktar (negatif olabilir)").setRequired(true))
    .setDefaultMemberPermissions(0),

  async execute(interaction, ctx) {
    const lang = ctx.language;
    if (!interaction.inCachedGuild() || !(await requireAdmin(interaction.member))) {
      await interaction.reply({ embeds: [errorEmbed(t("admin.no_permission", lang))], ephemeral: true });
      return;
    }

    const targetDiscordUser = interaction.options.getUser("kullanici", true);
    const amount = interaction.options.getInteger("miktar", true);
    const targetDbUser = await userRepository.findOrCreate(targetDiscordUser.id, interaction.guildId!);

    if (amount >= 0) {
      await economyService.addCash(targetDbUser.id, amount, TransactionType.ADMIN_ADJUSTMENT, { admin: interaction.user.id });
    } else {
      await economyService.removeCash(targetDbUser.id, Math.abs(amount), TransactionType.ADMIN_ADJUSTMENT, { admin: interaction.user.id });
    }

    logEvent("ADMIN_ACTION", "Admin adjusted user balance", { admin: interaction.user.id, guildId: interaction.guildId!, target: targetDbUser.id, amount });
    await interaction.reply({ embeds: [successEmbed(t("admin.user_balance_updated", lang, { user: targetDiscordUser.username }))], ephemeral: true });
  },
};

export default command;
