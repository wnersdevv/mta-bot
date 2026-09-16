import { SlashCommandBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { errorEmbed, successEmbed } from "@/utils/embeds";
import { requireAdmin } from "@/middleware/permissions";
import { prisma } from "@/database/prisma";
import { VehicleCategory, Rarity } from "@prisma/client";
import { logEvent } from "@/utils/logger";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("admin-arac")
    .setDescription("Add a vehicle to the catalog (admin) / Kataloğa araç ekle")
    .setDefaultMemberPermissions(0)
    .addStringOption((o) => o.setName("isim").setDescription("Vehicle name / Araç adı").setRequired(true))
    .addStringOption((o) => o.setName("marka").setDescription("Brand / Marka").setRequired(true))
    .addStringOption((o) =>
      o
        .setName("kategori")
        .setDescription("Category / Kategori")
        .setRequired(true)
        .addChoices(...Object.values(VehicleCategory).map((c) => ({ name: c, value: c }))),
    )
    .addIntegerOption((o) => o.setName("fiyat").setDescription("Price / Fiyat").setRequired(true).setMinValue(1))
    .addIntegerOption((o) => o.setName("hiz").setDescription("Speed (0-100) / Hız").setRequired(true).setMinValue(0).setMaxValue(100))
    .addIntegerOption((o) => o.setName("hizlanma").setDescription("Acceleration (0-100) / Hızlanma").setRequired(true).setMinValue(0).setMaxValue(100))
    .addIntegerOption((o) => o.setName("yoltutus").setDescription("Handling (0-100) / Yol tutuş").setRequired(true).setMinValue(0).setMaxValue(100))
    .addStringOption((o) =>
      o
        .setName("nadirlik")
        .setDescription("Rarity / Nadirlik")
        .setRequired(false)
        .addChoices(...Object.values(Rarity).map((r) => ({ name: r, value: r }))),
    ),

  async execute(interaction, ctx) {
    const lang = ctx.language;
    if (!interaction.inCachedGuild() || !(await requireAdmin(interaction.member))) {
      await interaction.reply({ embeds: [errorEmbed(t("admin.no_permission", lang))], ephemeral: true });
      return;
    }

    const name = interaction.options.getString("isim", true);
    const brand = interaction.options.getString("marka", true);
    const category = interaction.options.getString("kategori", true) as VehicleCategory;
    const price = interaction.options.getInteger("fiyat", true);
    const speed = interaction.options.getInteger("hiz", true);
    const acceleration = interaction.options.getInteger("hizlanma", true);
    const handling = interaction.options.getInteger("yoltutus", true);
    const rarity = (interaction.options.getString("nadirlik", false) as Rarity | null) ?? Rarity.COMMON;

    const vehicle = await prisma.vehicle.create({
      data: { name, brand, category, price, performance: { speed, acceleration, handling }, rarity },
    });

    logEvent("ADMIN_ACTION", "Admin added a vehicle", { admin: interaction.user.id, guildId: interaction.guildId!, vehicleId: vehicle.id });
    await interaction.reply({ embeds: [successEmbed(t("admin.vehicle_added", lang, { vehicle: `${brand} ${name}` }))], ephemeral: true });
  },
};

export default command;
