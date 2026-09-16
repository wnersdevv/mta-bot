import type { ButtonHandler } from "@/types";
import { errorEmbed } from "@/utils/embeds";
import { t } from "@/localization/i18n";
import { prisma } from "@/database/prisma";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { buildPropertyListView } from "@/components/shared/propertyListView";

const handler: ButtonHandler = {
  customIdPrefix: "mulksayfa:",

  // customId shape: mulksayfa:<ownerId>:page:<pageIndex>
  async execute(interaction) {
    const [, ownerId, , pageStr] = interaction.customId.split(":");
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const properties = await prisma.property.findMany({ orderBy: { price: "asc" } });
    if (properties.length === 0) {
      await interaction.update({ embeds: [errorEmbed(t("errors.property_not_found", lang))], components: [] });
      return;
    }

    const page = Number.parseInt(pageStr, 10) || 0;
    const { embed, components } = buildPropertyListView(properties, page, ownerId, lang);
    await interaction.update({ embeds: [embed], components });
  },
};

export default handler;
