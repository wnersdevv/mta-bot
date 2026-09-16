import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed, successEmbed, formatCurrency } from "@/utils/embeds";
import { economyService, InsufficientFundsError, InvalidAmountError, AmountMustBePositiveError } from "@/services/EconomyService";
import { userRepository } from "@/repositories/UserRepository";
import { notifyTransferReceiver } from "@/components/shared/notifyTransferReceiver";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("bakiye")
    .setDescription("Check your balance / Bakiyeni görüntüle")
    .addSubcommand((sub) => sub.setName("goster").setDescription("Show balance / Bakiyeyi göster"))
    .addSubcommand((sub) =>
      sub
        .setName("yatir")
        .setDescription("Deposit cash into bank / Bankaya para yatır")
        .addIntegerOption((opt) => opt.setName("miktar").setDescription("Amount / Miktar").setRequired(true).setMinValue(1)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("cek")
        .setDescription("Withdraw cash from bank / Bankadan para çek")
        .addIntegerOption((opt) => opt.setName("miktar").setDescription("Amount / Miktar").setRequired(true).setMinValue(1)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("transfer")
        .setDescription("Send cash to another player / Başka bir oyuncuya para gönder")
        .addUserOption((opt) => opt.setName("kullanici").setDescription("Recipient / Alıcı").setRequired(true))
        .addIntegerOption((opt) => opt.setName("miktar").setDescription("Amount / Miktar").setRequired(true).setMinValue(1)),
    ),

  async execute(interaction, ctx) {
    const lang = ctx.language;
    const sub = interaction.options.getSubcommand(false) ?? "goster";

    if (sub === "goster") {
      const { cash, bank } = await economyService.getBalance(ctx.dbUser.id);
      const embed = baseEmbed()
        .setTitle(t("economy.balance_title", lang))
        .addFields(
          { name: t("economy.cash", lang), value: formatCurrency(cash), inline: true },
          { name: t("economy.bank", lang), value: formatCurrency(bank), inline: true },
          { name: t("economy.total", lang), value: formatCurrency(cash + bank), inline: true },
        );
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`bakiye:transferac:${interaction.user.id}`).setLabel("💸 Transfer").setStyle(ButtonStyle.Secondary),
      );
      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }

    if (sub === "yatir") {
      const amount = interaction.options.getInteger("miktar", true);
      try {
        const { cash, bank } = await economyService.deposit(ctx.dbUser.id, amount);
        await interaction.reply({
          embeds: [successEmbed(t("economy.deposit_success", lang, { amount: formatCurrency(amount) }))],
        });
        void cash;
        void bank;
      } catch (err) {
        await handleEconomyError(interaction, err, lang);
      }
      return;
    }

    if (sub === "cek") {
      const amount = interaction.options.getInteger("miktar", true);
      try {
        await economyService.withdraw(ctx.dbUser.id, amount);
        await interaction.reply({ embeds: [successEmbed(t("economy.withdraw_success", lang, { amount: formatCurrency(amount) }))] });
      } catch (err) {
        await handleEconomyError(interaction, err, lang);
      }
      return;
    }

    if (sub === "transfer") {
      const targetDiscordUser = interaction.options.getUser("kullanici", true);
      const amount = interaction.options.getInteger("miktar", true);

      if (targetDiscordUser.id === interaction.user.id) {
        await interaction.reply({ embeds: [errorEmbed(t("economy.cannot_transfer_self", lang))], ephemeral: true });
        return;
      }

      try {
        const targetDbUser = await userRepository.findOrCreate(targetDiscordUser.id, interaction.guildId!);
        await economyService.transfer(ctx.dbUser.id, targetDbUser.id, amount);
        await interaction.reply({
          embeds: [successEmbed(t("economy.transfer_success", lang, { amount: formatCurrency(amount), user: targetDiscordUser.username }))],
        });
        await notifyTransferReceiver(
          interaction.client,
          interaction.guildId!,
          targetDiscordUser.id,
          targetDbUser.notifications,
          interaction.user.username,
          amount,
        );
      } catch (err) {
        await handleEconomyError(interaction, err, lang);
      }
    }
  },
};

async function handleEconomyError(interaction: Parameters<Command["execute"]>[0], err: unknown, lang: string): Promise<void> {
  if (err instanceof InsufficientFundsError) {
    await interaction.reply({ embeds: [errorEmbed(t("economy.insufficient_balance", lang))], ephemeral: true });
    return;
  }
  if (err instanceof AmountMustBePositiveError) {
    await interaction.reply({ embeds: [errorEmbed(t("economy.amount_must_be_positive", lang))], ephemeral: true });
    return;
  }
  if (err instanceof InvalidAmountError) {
    await interaction.reply({ embeds: [errorEmbed(t("economy.invalid_amount", lang))], ephemeral: true });
    return;
  }
  await interaction.reply({ embeds: [errorEmbed(t("errors.generic", lang))], ephemeral: true });
}

export default command;
