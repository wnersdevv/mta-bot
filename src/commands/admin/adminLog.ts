import { SlashCommandBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { errorEmbed, baseEmbed } from "@/utils/embeds";
import { requireAdmin } from "@/middleware/permissions";
import { prisma } from "@/database/prisma";

const command: Command = {
  data: new SlashCommandBuilder().setName("admin-log").setDescription("View recent system log (admin) / Sistem logunu görüntüle").setDefaultMemberPermissions(0),

  async execute(interaction, ctx) {
    const lang = ctx.language;
    if (!interaction.inCachedGuild() || !(await requireAdmin(interaction.member))) {
      await interaction.reply({ embeds: [errorEmbed(t("admin.no_permission", lang))], ephemeral: true });
      return;
    }

    const recent = await prisma.transaction.findMany({
      where: { guildId: interaction.guildId! },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: true },
    });

    const embed = baseEmbed().setTitle(t("admin.log_title", lang));
    for (const tx of recent) {
      embed.addFields({
        name: `${tx.type} • <@${tx.user.discordId}>`,
        value: `${tx.amount.toString()} (${tx.balanceBefore.toString()} → ${tx.balanceAfter.toString()}) • <t:${Math.floor(tx.createdAt.getTime() / 1000)}:R>`,
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
