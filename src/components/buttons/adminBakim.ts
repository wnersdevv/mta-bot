import type { ButtonHandler } from "@/types";
import { t } from "@/localization/i18n";
import { successEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { languageService } from "@/services/LanguageService";
import { assertOwner } from "@/middleware/ownership";
import { requireAdmin } from "@/middleware/permissions";
import { logEvent } from "@/utils/logger";

const handler: ButtonHandler = {
  customIdPrefix: "admin:bakim:",

  async execute(interaction) {
    const parts = interaction.customId.split(":");
    const action = parts[2]; // "on" | "off" | "cancel"
    const ownerId = parts[3];
    const lang = await languageService.resolve(interaction.user.id, interaction.guildId!);
    if (!(await assertOwner(interaction, ownerId, lang))) return;
    if (!interaction.inCachedGuild() || !(await requireAdmin(interaction.member))) return;

    if (action === "cancel") {
      await interaction.update({ embeds: [successEmbed(t("admin.action_cancelled", lang))], components: [] });
      return;
    }

    const maintenanceMode = action === "on";
    await prisma.guildSettings.update({ where: { guildId: interaction.guildId! }, data: { maintenanceMode } });
    logEvent("ADMIN_ACTION", "Maintenance mode toggled", { admin: interaction.user.id, guildId: interaction.guildId!, maintenanceMode });

    await interaction.update({
      embeds: [successEmbed(t(maintenanceMode ? "admin.maintenance_enabled" : "admin.maintenance_disabled", lang))],
      components: [],
    });
  },
};

export default handler;
