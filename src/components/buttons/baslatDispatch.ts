import type { ButtonHandler } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed } from "@/utils/embeds";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";

const handler: ButtonHandler = {
  customIdPrefix: "baslat:",

  async execute(interaction) {
    const [, action, ownerId] = interaction.customId.split(":");
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    if (action === "profil") {
      await interaction.reply({ embeds: [baseEmbed().setDescription("👤 Use /profil to view your profile card.")], ephemeral: true });
      return;
    }
    if (action === "gorev") {
      await interaction.reply({ embeds: [baseEmbed().setDescription("🎯 Use /gorevler to see your first mission.")], ephemeral: true });
      return;
    }
    await interaction.reply({ embeds: [baseEmbed().setTitle(t("common.help.title", lang)).setDescription(t("common.help.description", lang))], ephemeral: true });
  },
};

export default handler;
