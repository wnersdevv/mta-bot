import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { economyService } from "@/services/EconomyService";
import { TransactionType } from "@prisma/client";

const STARTER_CASH = 25_000;

const command: Command = {
  data: new SlashCommandBuilder().setName("baslat").setDescription("Start your GTA Online career / Kariyerine başla"),

  async execute(interaction, ctx) {
    const lang = ctx.language;

    const existingTransactions = await prisma.transaction.count({ where: { userId: ctx.dbUser.id } });
    if (existingTransactions === 0) {
      await economyService.addCash(ctx.dbUser.id, STARTER_CASH, TransactionType.ADMIN_ADJUSTMENT, { reason: "starter_reward" });
    }

    const embed = baseEmbed()
      .setTitle(t("common.onboarding.welcome_title", lang))
      .setDescription(
        `${t("common.onboarding.welcome_description", lang)}\n\n${t("common.onboarding.profile_created", lang, {
          amount: `$${STARTER_CASH.toLocaleString("en-US")}`,
        })}`,
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`baslat:profil:${interaction.user.id}`).setLabel(t("common.onboarding.create_profile", lang)).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`baslat:gorev:${interaction.user.id}`).setLabel(t("common.onboarding.first_mission", lang)).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`baslat:yardim:${interaction.user.id}`).setLabel(t("common.onboarding.how_to_play", lang)).setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

export default command;
