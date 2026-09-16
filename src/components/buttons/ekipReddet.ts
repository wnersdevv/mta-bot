import type { ButtonHandler } from "@/types";
import { t } from "@/localization/i18n";
import { successEmbed } from "@/utils/embeds";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";

const handler: ButtonHandler = {
  customIdPrefix: "ekip:reddet:",

  async execute(interaction) {
    const [, , , invitedDiscordId] = interaction.customId.split(":");
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, invitedDiscordId, lang))) return;

    await interaction.update({ embeds: [successEmbed(t("common.generic.success", lang))], components: [] });
  },
};

export default handler;
