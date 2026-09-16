import { Events, Client } from "discord.js";
import { logger } from "@/utils/logger";
import { printBanner } from "@/utils/banner";
import { ayarlar } from "@/config/ayarlar";

export function registerReady(client: Client, commandCount: number): void {
  client.once(Events.ClientReady, (readyClient) => {
    logger.info({ tag: readyClient.user.tag, guilds: readyClient.guilds.cache.size }, "Bot is online");
    try {
      printBanner({
        botTag: readyClient.user.tag,
        guildCount: readyClient.guilds.cache.size,
        commandCount,
        language: ayarlar.defaultLanguage,
        nodeEnv: ayarlar.nodeEnv,
      });
    } catch (err) {
      // Banner is cosmetic only — never let a rendering hiccup look like a startup failure.
      logger.warn({ err }, "Failed to print startup banner");
    }
  });
}
