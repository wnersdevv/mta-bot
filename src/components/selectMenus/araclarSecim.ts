import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { SelectMenuHandler } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { renderVehicleCard } from "@/canvas/vehicleCard";

const handler: SelectMenuHandler = {
  customIdPrefix: "araclar:secim:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const vehicleId = interaction.values[0];
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      await interaction.update({ embeds: [errorEmbed(t("errors.vehicle_not_found", lang))], components: [] });
      return;
    }

    const perf = vehicle.performance as { speed?: number; acceleration?: number; handling?: number };

    const attachment = await renderVehicleCard(
      {
        name: vehicle.name,
        brand: vehicle.brand,
        price: `$${vehicle.price.toString()}`,
        speed: perf.speed,
        acceleration: perf.acceleration,
        handling: perf.handling,
        rarity: vehicle.rarity,
      },
      lang,
    );

    const embed = baseEmbed()
      .setTitle(t("vehicles.detail_title", lang, { name: `${vehicle.brand} ${vehicle.name}` }))
      .setImage("attachment://vehicle-card.png");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`arac:satinal:${vehicle.id}:${interaction.user.id}`).setLabel(t("vehicles.buttons.buy", lang)).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`arac:favori:${vehicle.id}:${interaction.user.id}`).setLabel(t("vehicles.buttons.favorite", lang)).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`arac:garaj:${interaction.user.id}`).setLabel(t("vehicles.buttons.go_to_garage", lang)).setStyle(ButtonStyle.Secondary),
    );

    await interaction.update({ embeds: [embed], files: [attachment], components: [row] });
  },
};

export default handler;
