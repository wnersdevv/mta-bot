import { SlashCommandBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed, successEmbed, formatCurrency } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { buildPropertyListView } from "@/components/shared/propertyListView";
import { propertyIncomeService } from "@/services/PropertyIncomeService";
import { checkAndNotifyAchievements } from "@/components/shared/notifyAchievements";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("mulk")
    .setDescription("Browse or manage properties / Mülkleri görüntüle")
    .addSubcommand((sub) => sub.setName("listele").setDescription("Browse properties for sale / Satılık mülkleri listele"))
    .addSubcommand((sub) => sub.setName("mulklerim").setDescription("View your properties / Mülklerimi görüntüle"))
    .addSubcommand((sub) => sub.setName("gelir-topla").setDescription("Collect income from your properties / Mülklerinden gelir topla")),

  async execute(interaction, ctx) {
    const lang = ctx.language;
    const sub = interaction.options.getSubcommand(false) ?? "listele";

    if (sub === "mulklerim") {
      const owned = await prisma.userProperty.findMany({ where: { userId: ctx.dbUser.id }, include: { property: true } });
      if (owned.length === 0) {
        await interaction.reply({ embeds: [errorEmbed(t("properties.no_properties", lang))], ephemeral: true });
        return;
      }
      const embed = baseEmbed().setTitle(t("properties.my_properties_title", lang, { username: interaction.user.username }));
      for (const up of owned.slice(0, 25)) {
        embed.addFields({ name: up.property.name, value: `${t("properties.income", lang)}: $${up.property.income.toString()}`, inline: true });
      }
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "gelir-topla") {
      const result = await propertyIncomeService.collect(ctx.dbUser.id);

      if (result.properties.length === 0) {
        await interaction.reply({ embeds: [errorEmbed(t("properties.income_none_ready", lang))], ephemeral: true });
        return;
      }

      const embed = successEmbed(t("properties.income_collected", lang, { amount: formatCurrency(result.total) }));
      for (const p of result.properties) {
        embed.addFields({ name: p.name, value: formatCurrency(p.amount), inline: true });
      }
      await interaction.reply({ embeds: [embed] });
      await checkAndNotifyAchievements(interaction, ctx.dbUser.id, interaction.user.username, lang, ctx.dbUser.notifications);
      return;
    }

    const properties = await prisma.property.findMany({ orderBy: { price: "asc" } });
    if (properties.length === 0) {
      await interaction.reply({ embeds: [errorEmbed(t("errors.property_not_found", lang))], ephemeral: true });
      return;
    }

    const { embed, components } = buildPropertyListView(properties, 0, interaction.user.id, lang);
    await interaction.reply({ embeds: [embed], components });
  },
};

export default command;
