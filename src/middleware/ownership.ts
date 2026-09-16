import type { ButtonInteraction, StringSelectMenuInteraction } from "discord.js";
import { t } from "@/localization/i18n";

/**
 * Many of our component custom IDs embed the original invoker's discord id as the last
 * segment (e.g. "garaj:sat:<vehicleId>:<ownerId>"). This guards against other users
 * hijacking someone else's ephemeral-feeling menu.
 */
export async function assertOwner(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  ownerId: string,
  lang: string,
): Promise<boolean> {
  if (interaction.user.id !== ownerId) {
    await interaction.reply({ content: t("errors.not_owner", lang), ephemeral: true });
    return false;
  }
  return true;
}
