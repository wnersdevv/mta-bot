import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";

const command: Command = {
  data: new SlashCommandBuilder().setName("envanter").setDescription("View your inventory / Envanterini görüntüle"),

  async execute(interaction, ctx) {
    const lang = ctx.language;
    const items = await prisma.userInventory.findMany({ where: { userId: ctx.dbUser.id }, include: { item: true }, take: 25 });

    if (items.length === 0) {
      await interaction.reply({ embeds: [errorEmbed(t("inventory.empty", lang))], ephemeral: true });
      return;
    }

    const embed = baseEmbed().setTitle(t("inventory.title", lang, { username: interaction.user.username }));
    for (const ui of items) {
      embed.addFields({
        name: `${ui.item.key} x${ui.quantity}`,
        value: `${t("inventory.value", lang)}: $${ui.item.value.toString()} • ${t("inventory.rarity", lang)}: ${ui.item.rarity}`,
        inline: true,
      });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`envanter:secim:${interaction.user.id}`)
      .setPlaceholder(t("market.sell_button", lang))
      .addOptions(
        items.map((ui) => ({
          label: `${ui.item.key} (x${ui.quantity})`,
          value: ui.id,
          description: `${t("inventory.value", lang)}: $${ui.item.value.toString()}`,
        })),
      );

    await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)] });
  },
};

export default command;
