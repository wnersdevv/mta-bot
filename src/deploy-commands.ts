import { REST, Routes } from "discord.js";
import { ayarlar } from "@/config/ayarlar";
import { loadCommands } from "@/loaders/componentLoader";
import { logger } from "@/utils/logger";

async function main(): Promise<void> {
  const isGlobal = process.argv.includes("--global");
  const commands = loadCommands();
  const body = [...commands.values()].map((c) => c.data.toJSON());

  const rest = new REST().setToken(ayarlar.discordToken);

  if (isGlobal) {
    await rest.put(Routes.applicationCommands(ayarlar.clientId), { body });
    logger.info({ count: body.length }, "Deployed commands globally");
  } else {
    if (!ayarlar.devGuildId) {
      logger.error("devGuildId config/ayarlar.json içinde boş — dev sunucuya deploy edilemez. Global deploy için --global kullanın.");
      process.exit(1);
    }
    await rest.put(Routes.applicationGuildCommands(ayarlar.clientId, ayarlar.devGuildId), { body });
    logger.info({ count: body.length, guild: ayarlar.devGuildId }, "Deployed commands to dev guild");
  }
}

main().catch((err) => {
  logger.error({ err }, "Command deployment failed");
  process.exit(1);
});
