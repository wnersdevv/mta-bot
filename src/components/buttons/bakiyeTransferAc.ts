import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import type { ButtonHandler } from "@/types";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";

const handler: ButtonHandler = {
  customIdPrefix: "bakiye:transferac:",

  async execute(interaction) {
    const ownerId = interaction.customId.split(":")[2];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;

    const modal = new ModalBuilder().setCustomId(`bakiye:transfermodal:${interaction.user.id}`).setTitle("💸 Para Transferi");

    const kullaniciInput = new TextInputBuilder()
      .setCustomId("kullanici_id")
      .setLabel("Alıcının Discord ID'si / Recipient's Discord ID")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("örn. 123456789012345678")
      .setRequired(true);

    const miktarInput = new TextInputBuilder()
      .setCustomId("miktar")
      .setLabel("Miktar / Amount")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("örn. 5000")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(kullaniciInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(miktarInput),
    );

    await interaction.showModal(modal);
  },
};

export default handler;
