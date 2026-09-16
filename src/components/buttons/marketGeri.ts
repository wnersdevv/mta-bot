import type { ButtonHandler } from "@/types";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { buildMarketTopLevelView } from "@/components/shared/marketView";

const handler: ButtonHandler = {
  customIdPrefix: "market:geri:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const { embed, components } = buildMarketTopLevelView(interaction.user.id, lang);
    await interaction.update({ embeds: [embed], components, files: [] });
  },
};

export default handler;
