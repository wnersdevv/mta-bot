import type { SelectMenuHandler } from "@/types";
import { t, isSupportedLanguage } from "@/localization/i18n";
import { successEmbed, errorEmbed } from "@/utils/embeds";
import { userRepository } from "@/repositories/UserRepository";
import { assertOwner } from "@/middleware/ownership";

const handler: SelectMenuHandler = {
  customIdPrefix: "dil:secim:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    // Use the newly-selected language for the confirmation itself, but we don't know it
    // yet, so validate ownership against the interaction's *current* resolved language
    // is unnecessary here — the not_owner message is language-agnostic enough via fallback.
    if (!(await assertOwner(interaction, ownerId, "tr"))) return;

    const newLang = interaction.values[0];
    if (!isSupportedLanguage(newLang)) {
      await interaction.update({ embeds: [errorEmbed(t("errors.generic", "tr"))], components: [] });
      return;
    }

    const dbUser = await userRepository.findOrCreate(interaction.user.id, interaction.guildId!);
    await userRepository.setLanguage(dbUser.id, newLang);

    await interaction.update({
      embeds: [successEmbed(t("common.language.changed", newLang, { language: t(`common.language.${newLang}`, newLang) }))],
      components: [],
    });
  },
};

export default handler;
