import type { ButtonHandler } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { userRepository } from "@/repositories/UserRepository";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const handler: ButtonHandler = {
  customIdPrefix: "ayarlar:bildirim:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const dbUser = await userRepository.findOrCreate(interaction.user.id, interaction.guildId!);
    const updated = await prisma.user.update({ where: { id: dbUser.id }, data: { notifications: !dbUser.notifications } });

    const embed = baseEmbed()
      .setTitle(t("profile.settings_title", lang))
      .addFields({
        name: t("profile.settings_notifications", lang),
        value: updated.notifications ? t("profile.settings_notifications_on", lang) : t("profile.settings_notifications_off", lang),
      });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ayarlar:bildirim:${interaction.user.id}`)
        .setLabel(updated.notifications ? t("profile.settings_notifications_off", lang) : t("profile.settings_notifications_on", lang))
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.update({ embeds: [embed], components: [row] });
  },
};

export default handler;
