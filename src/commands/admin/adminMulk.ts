import { SlashCommandBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { errorEmbed, successEmbed } from "@/utils/embeds";
import { requireAdmin } from "@/middleware/permissions";
import { prisma } from "@/database/prisma";
import { PropertyType, Rarity } from "@prisma/client";
import { logEvent } from "@/utils/logger";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("admin-mulk")
    .setDescription("Add a property to the catalog (admin) / Kataloğa mülk ekle")
    .setDefaultMemberPermissions(0)
    .addStringOption((o) => o.setName("isim").setDescription("Property name / Mülk adı").setRequired(true))
    .addStringOption((o) =>
      o
        .setName("tur")
        .setDescription("Type / Tür")
        .setRequired(true)
        .addChoices(...Object.values(PropertyType).map((t2) => ({ name: t2, value: t2 }))),
    )
    .addIntegerOption((o) => o.setName("fiyat").setDescription("Price / Fiyat").setRequired(true).setMinValue(1))
    .addIntegerOption((o) => o.setName("kapasite").setDescription("Capacity / Kapasite").setRequired(true).setMinValue(1))
    .addIntegerOption((o) => o.setName("gelir").setDescription("Income per collection / Gelir").setRequired(true).setMinValue(0))
    .addIntegerOption((o) => o.setName("seviye").setDescription("Level required / Gerekli seviye").setRequired(false).setMinValue(1))
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
    const type = interaction.options.getString("tur", true) as PropertyType;
    const price = interaction.options.getInteger("fiyat", true);
    const capacity = interaction.options.getInteger("kapasite", true);
    const income = interaction.options.getInteger("gelir", true);
    const levelRequirement = interaction.options.getInteger("seviye", false) ?? 1;
    const rarity = (interaction.options.getString("nadirlik", false) as Rarity | null) ?? Rarity.COMMON;

    const property = await prisma.property.create({
      data: { name, type, price, capacity, income, levelRequirement, rarity },
    });

    logEvent("ADMIN_ACTION", "Admin added a property", { admin: interaction.user.id, guildId: interaction.guildId!, propertyId: property.id });
    await interaction.reply({ embeds: [successEmbed(t("admin.property_added", lang, { property: name }))], ephemeral: true });
  },
};

export default command;
