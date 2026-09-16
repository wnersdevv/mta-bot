import { prisma } from "@/database/prisma";
import { FALLBACK_LANGUAGE } from "@/localization/i18n";
import { isSupportedLanguage } from "@/localization/i18n";

/**
 * Resolves the effective language for an interaction:
 * user.language override -> guild.settings.language -> FALLBACK_LANGUAGE ("tr")
 */
export class LanguageService {
  async resolve(discordUserId: string, guildId: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { discordId_guildId: { discordId: discordUserId, guildId } } });
    if (user?.language && isSupportedLanguage(user.language)) return user.language;

    const settings = await prisma.guildSettings.findUnique({ where: { guildId } });
    if (settings?.language && isSupportedLanguage(settings.language)) return settings.language;

    return FALLBACK_LANGUAGE;
  }
}

export const languageService = new LanguageService();
