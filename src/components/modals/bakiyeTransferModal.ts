import type { ModalHandler } from "@/types";
import { t } from "@/localization/i18n";
import { successEmbed, errorEmbed, formatCurrency } from "@/utils/embeds";
import { transferModalSchema } from "@/utils/validation";
import { userRepository } from "@/repositories/UserRepository";
import { languageService } from "@/services/LanguageService";
import { economyService, InsufficientFundsError, InvalidAmountError } from "@/services/EconomyService";
import { logEvent } from "@/utils/logger";
import { notifyTransferReceiver } from "@/components/shared/notifyTransferReceiver";

const handler: ModalHandler = {
  customIdPrefix: "bakiye:transfermodal:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);

    if (interaction.user.id !== ownerId) {
      await interaction.reply({ embeds: [errorEmbed(t("errors.not_owner", lang))], ephemeral: true });
      return;
    }

    const rawUserId = interaction.fields.getTextInputValue("kullanici_id");
    const rawAmount = interaction.fields.getTextInputValue("miktar");

    const parsed = transferModalSchema.safeParse({ kullaniciId: rawUserId, miktar: rawAmount });
    if (!parsed.success) {
      await interaction.reply({ embeds: [errorEmbed(t("economy.invalid_amount", lang))], ephemeral: true });
      return;
    }

    const { kullaniciId, miktar } = parsed.data;

    if (kullaniciId === interaction.user.id) {
      await interaction.reply({ embeds: [errorEmbed(t("economy.cannot_transfer_self", lang))], ephemeral: true });
      return;
    }

    try {
      const targetDiscordUser = await interaction.client.users.fetch(kullaniciId).catch(() => null);
      if (!targetDiscordUser) {
        await interaction.reply({ embeds: [errorEmbed(t("errors.user_not_found", lang))], ephemeral: true });
        return;
      }

      const senderDbUser = await userRepository.findOrCreate(interaction.user.id, interaction.guildId!);
      const targetDbUser = await userRepository.findOrCreate(kullaniciId, interaction.guildId!);

      await economyService.transfer(senderDbUser.id, targetDbUser.id, miktar);
      logEvent("TRANSFER", "Modal-based transfer completed", { from: senderDbUser.id, to: targetDbUser.id, amount: miktar });

      await interaction.reply({
        embeds: [successEmbed(t("economy.transfer_success", lang, { amount: formatCurrency(miktar), user: targetDiscordUser.username }))],
      });
      await notifyTransferReceiver(interaction.client, interaction.guildId!, kullaniciId, targetDbUser.notifications, interaction.user.username, miktar);
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        await interaction.reply({ embeds: [errorEmbed(t("economy.insufficient_balance", lang))], ephemeral: true });
        return;
      }
      if (err instanceof InvalidAmountError) {
        await interaction.reply({ embeds: [errorEmbed(t("economy.invalid_amount", lang))], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [errorEmbed(t("errors.generic", lang))], ephemeral: true });
    }
  },
};

export default handler;
