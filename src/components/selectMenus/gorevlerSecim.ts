import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { SelectMenuHandler } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";

const handler: SelectMenuHandler = {
  customIdPrefix: "gorevler:secim:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const missionId = interaction.values[0];
    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) {
      await interaction.update({ embeds: [errorEmbed(t("errors.mission_not_found", lang))], components: [] });
      return;
    }

    const embed = baseEmbed()
      .setTitle(t("missions.detail_title", lang, { title: t(`missions.${mission.key}_title`, lang) }))
      .addFields(
        { name: t("missions.difficulty", lang), value: t(`missions.difficulty_${mission.difficulty.toLowerCase()}`, lang), inline: true },
        { name: t("missions.reward", lang), value: `$${mission.reward.toString()}`, inline: true },
        { name: t("missions.xp", lang), value: `${mission.xp}`, inline: true },
        { name: t("missions.cooldown", lang), value: `${Math.round(mission.cooldownSec / 60)}m`, inline: true },
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`gorev:tamamla:${mission.id}:${interaction.user.id}`)
        .setLabel(t("missions.complete_button", lang))
        .setStyle(ButtonStyle.Success),
    );

    await interaction.update({ embeds: [embed], components: [row] });
  },
};

export default handler;
