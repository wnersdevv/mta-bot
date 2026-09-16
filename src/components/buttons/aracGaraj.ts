import type { ButtonHandler } from "@/types";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { userRepository } from "@/repositories/UserRepository";
import { buildGarageView, garageEmptyEmbed } from "@/components/shared/garageView";

const handler: ButtonHandler = {
  customIdPrefix: "arac:garaj:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const dbUser = await userRepository.findOrCreate(interaction.user.id, interaction.guildId!);
    const view = await buildGarageView(dbUser.id, interaction.user.id, interaction.user.username, lang);

    if (!view) {
      await interaction.update({ embeds: [garageEmptyEmbed(lang)], components: [], files: [] });
      return;
    }

    await interaction.update({ embeds: [view.embed], components: view.components, files: [] });
  },
};

export default handler;
