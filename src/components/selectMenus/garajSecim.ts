import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { SelectMenuHandler } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed, formatCurrency } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";

const handler: SelectMenuHandler = {
  customIdPrefix: "garaj:secim:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const userVehicleId = interaction.values[0];
    const owned = await prisma.userVehicle.findUnique({ where: { id: userVehicleId }, include: { vehicle: true } });
    if (!owned) {
      await interaction.update({ embeds: [errorEmbed(t("errors.vehicle_not_found", lang))], components: [] });
      return;
    }

    const sellPrice = owned.purchasePrice / 2;

    const embed = baseEmbed()
      .setTitle(t("vehicles.detail_title", lang, { name: `${owned.vehicle.brand} ${owned.vehicle.name}` }))
      .addFields(
        { name: t("vehicles.purchased_at", lang), value: `<t:${Math.floor(owned.purchasedAt.getTime() / 1000)}:D>`, inline: true },
        { name: t("vehicles.value", lang), value: formatCurrency(sellPrice), inline: true },
        { name: t("vehicles.owner", lang), value: interaction.user.username, inline: true },
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`garaj:sat:${owned.id}:${interaction.user.id}`).setLabel(t("vehicles.buttons.sell", lang)).setStyle(ButtonStyle.Danger),
    );

    await interaction.update({ embeds: [embed], components: [row] });
  },
};

export default handler;
