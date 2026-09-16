import type { ModalHandler } from "@/types";
import { t } from "@/localization/i18n";
import { successEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { languageService } from "@/services/LanguageService";
import { userRepository } from "@/repositories/UserRepository";
import { crewNameSchema } from "@/utils/validation";
import { CrewRank } from "@prisma/client";
import { checkAndNotifyAchievements } from "@/components/shared/notifyAchievements";

const handler: ModalHandler = {
  customIdPrefix: "ekip:olusturmodal:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);

    if (interaction.user.id !== ownerId) {
      await interaction.reply({ embeds: [errorEmbed(t("errors.not_owner", lang))], ephemeral: true });
      return;
    }

    const rawName = interaction.fields.getTextInputValue("ekip_adi");
    const parsed = crewNameSchema.safeParse(rawName);
    if (!parsed.success) {
      await interaction.reply({ embeds: [errorEmbed(t("errors.generic", lang))], ephemeral: true });
      return;
    }
    const name = parsed.data;

    const dbUser = await userRepository.findOrCreate(interaction.user.id, interaction.guildId!);
    const existingMembership = await prisma.crewMember.findUnique({ where: { userId: dbUser.id } });
    if (existingMembership) {
      await interaction.reply({ embeds: [errorEmbed(t("crew.create_already_in_crew", lang))], ephemeral: true });
      return;
    }

    const nameTaken = await prisma.crew.findUnique({ where: { guildId_name: { guildId: interaction.guildId!, name } } });
    if (nameTaken) {
      await interaction.reply({ embeds: [errorEmbed(t("crew.create_name_taken", lang))], ephemeral: true });
      return;
    }

    await prisma.crew.create({
      data: { guildId: interaction.guildId!, name, members: { create: { userId: dbUser.id, rank: CrewRank.KURUCU } } },
    });

    await interaction.reply({ embeds: [successEmbed(t("crew.create_success", lang, { name }))] });
    await checkAndNotifyAchievements(interaction, dbUser.id, interaction.user.username, lang, dbUser.notifications);
  },
};

export default handler;
