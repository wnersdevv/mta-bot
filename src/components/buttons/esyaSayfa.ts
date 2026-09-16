import type { ButtonHandler } from "@/types";
import { errorEmbed } from "@/utils/embeds";
import { t } from "@/localization/i18n";
import { prisma } from "@/database/prisma";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { buildItemListView } from "@/components/shared/itemListView";

const handler: ButtonHandler = {
  customIdPrefix: "esyasayfa:",

  // customId shape: esyasayfa:<ownerId>:page:<pageIndex>
  async execute(interaction) {
    const [, ownerId, , pageStr] = interaction.customId.split(":");
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const items = await prisma.inventoryItem.findMany();
    if (items.length === 0) {
      await interaction.update({ embeds: [errorEmbed(t("inventory.empty", lang))], components: [] });
      return;
    }

    const page = Number.parseInt(pageStr, 10) || 0;
    const { embed, components } = buildItemListView(items, page, ownerId, lang);
    await interaction.update({ embeds: [embed], components });
  },
};

export default handler;
