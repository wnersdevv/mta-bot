import { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } from "discord.js";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";

export interface GarageView {
  embed: EmbedBuilder;
  components: ActionRowBuilder<StringSelectMenuBuilder>[];
}

/** Builds the garage select-menu view for a user, reused by /garaj and the
 * "Garaja Git" button shown on a vehicle's detail card. Returns `null` when the
 * user owns no vehicles — caller should show `vehicles.garage_empty` instead. */
export async function buildGarageView(userId: string, ownerId: string, username: string, lang: string): Promise<GarageView | null> {
  const owned = await prisma.userVehicle.findMany({
    where: { userId },
    include: { vehicle: true },
    take: 25,
    orderBy: { purchasedAt: "desc" },
  });

  if (owned.length === 0) return null;

  const select = new StringSelectMenuBuilder()
    .setCustomId(`garaj:secim:${ownerId}`)
    .setPlaceholder(t("vehicles.garage_select_prompt", lang))
    .addOptions(
      owned.map((uv) => ({
        label: `${uv.vehicle.brand} ${uv.vehicle.name}${uv.favorite ? " ⭐" : ""}`,
        value: uv.id,
      })),
    );

  return {
    embed: baseEmbed().setTitle(t("vehicles.garage_title", lang, { username })),
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
  };
}

export function garageEmptyEmbed(lang: string) {
  return errorEmbed(t("vehicles.garage_empty", lang));
}
