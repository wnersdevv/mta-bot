import type { ButtonHandler } from "@/types";
import { t } from "@/localization/i18n";
import { successEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { userRepository } from "@/repositories/UserRepository";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { CrewRank } from "@prisma/client";

const handler: ButtonHandler = {
  customIdPrefix: "ekip:kabul:",

  async execute(interaction) {
    const [, , crewId, invitedDiscordId] = interaction.customId.split(":");
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, invitedDiscordId, lang))) return;

    const dbUser = await userRepository.findOrCreate(interaction.user.id, interaction.guildId!);
    const existing = await prisma.crewMember.findUnique({ where: { userId: dbUser.id } });
    if (existing) {
      await interaction.update({ embeds: [errorEmbed(t("crew.create_already_in_crew", lang))], components: [] });
      return;
    }

    const crew = await prisma.crew.findUnique({ where: { id: crewId } });
    if (!crew) {
      await interaction.update({ embeds: [errorEmbed(t("errors.crew_not_found", lang))], components: [] });
      return;
    }

    await prisma.crewMember.create({ data: { userId: dbUser.id, crewId, rank: CrewRank.UYE } });
    await interaction.update({ embeds: [successEmbed(t("crew.create_success", lang, { name: crew.name }))], components: [] });
  },
};

export default handler;
