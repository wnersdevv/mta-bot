import { SlashCommandBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { errorEmbed, successEmbed } from "@/utils/embeds";
import { requireAdmin } from "@/middleware/permissions";
import { prisma } from "@/database/prisma";
import { MissionDifficulty } from "@prisma/client";
import { logEvent } from "@/utils/logger";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("admin-gorev")
    .setDescription("Add a mission to the catalog (admin) / Kataloğa görev ekle")
    .setDefaultMemberPermissions(0)
    .addStringOption((o) =>
      o
        .setName("anahtar")
        .setDescription("Localization key, e.g. 'gece_teslimati' / Lokalizasyon anahtarı")
        .setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName("zorluk")
        .setDescription("Difficulty / Zorluk")
        .setRequired(true)
        .addChoices(...Object.values(MissionDifficulty).map((d) => ({ name: d, value: d }))),
    )
    .addIntegerOption((o) => o.setName("odul").setDescription("Reward / Ödül").setRequired(true).setMinValue(1))
    .addIntegerOption((o) => o.setName("xp").setDescription("XP reward / XP ödülü").setRequired(true).setMinValue(0))
    .addIntegerOption((o) => o.setName("bekleme").setDescription("Cooldown in seconds / Bekleme süresi (saniye)").setRequired(false).setMinValue(0)),

  async execute(interaction, ctx) {
    const lang = ctx.language;
    if (!interaction.inCachedGuild() || !(await requireAdmin(interaction.member))) {
      await interaction.reply({ embeds: [errorEmbed(t("admin.no_permission", lang))], ephemeral: true });
      return;
    }

    const key = interaction.options.getString("anahtar", true).trim();
    const difficulty = interaction.options.getString("zorluk", true) as MissionDifficulty;
    const reward = interaction.options.getInteger("odul", true);
    const xp = interaction.options.getInteger("xp", true);
    const cooldownSec = interaction.options.getInteger("bekleme", false) ?? 1800;

    const existing = await prisma.mission.findUnique({ where: { key } });
    if (existing) {
      await interaction.reply({ embeds: [errorEmbed(t("errors.generic", lang))], ephemeral: true });
      return;
    }

    await prisma.mission.create({ data: { key, difficulty, reward, xp, cooldownSec } });

    logEvent("ADMIN_ACTION", "Admin added a mission", { admin: interaction.user.id, guildId: interaction.guildId!, key });
    await interaction.reply({
      embeds: [successEmbed(t("admin.mission_added", lang, { mission: key }))],
      ephemeral: true,
    });
  },
};

export default command;
