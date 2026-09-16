import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";

const command: Command = {
  data: new SlashCommandBuilder().setName("gorevler").setDescription("View available missions / Görevleri görüntüle"),

  async execute(interaction, ctx) {
    const lang = ctx.language;
    const missions = await prisma.mission.findMany({ take: 25 });

    if (missions.length === 0) {
      await interaction.reply({ embeds: [errorEmbed(t("errors.mission_not_found", lang))], ephemeral: true });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`gorevler:secim:${interaction.user.id}`)
      .setPlaceholder(t("missions.select_prompt", lang))
      .addOptions(
        missions.map((m) => ({
          label: t(`missions.${m.key}_title`, lang),
          value: m.id,
          description: `${t(`missions.difficulty_${m.difficulty.toLowerCase()}`, lang)} • +${m.reward.toString()}`,
        })),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    const embed = baseEmbed().setTitle(t("missions.list_title", lang));

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

export default command;
