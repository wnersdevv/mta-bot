import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import { ayarlar } from "@/config/ayarlar";
import { logger } from "@/utils/logger";
import { loadCommands, loadButtonHandlers, loadSelectMenuHandlers, loadModalHandlers } from "@/loaders/componentLoader";
import { registerReady } from "@/events/ready";
import { registerInteractionCreate } from "@/events/interactionCreate";
import { prisma } from "@/database/prisma";
import { setLogClient } from "@/services/DiscordLogService";

async function verifyDatabaseConnection(): Promise<void> {
  try {
    // A cheap, harmless round-trip that also proves the replica-set requirement
    // ($transaction) is met, since we run it inside one — fails fast and loud
    // instead of the first /gunluk click surfacing a cryptic Prisma error.
    await prisma.$transaction(async (tx) => {
      await tx.guild.findFirst();
    });
    logger.info("MongoDB bağlantısı ve replica set doğrulandı.");
  } catch (err) {
    logger.error(
      { err },
      "MongoDB'ye bağlanılamadı veya replica set olarak çalışmıyor. " +
        "config/ayarlar.json içindeki databaseUrl'i kontrol et ve gerekirse " +
        "'mongosh --eval \"rs.initiate()\"' çalıştır (README - Troubleshooting).",
    );
    throw err;
  }
}

async function main(): Promise<void> {
  await verifyDatabaseConnection();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    partials: [Partials.GuildMember],
  });

  const registries = {
    commands: loadCommands(),
    buttons: loadButtonHandlers(),
    selectMenus: loadSelectMenuHandlers(),
    modals: loadModalHandlers(),
  };

  registerReady(client, registries.commands.size);
  registerInteractionCreate(client, registries);
  setLogClient(client);

  // Discord.js kendi iç hatalarını (WebSocket, shard, rate limit) bu event'lerle
  // bildirir — loglanmazsa sessizce yutulup teşhis etmek çok zorlaşır.
  client.on(Events.Error, (err) => logger.error({ err }, "Discord client error"));
  client.on(Events.Warn, (message) => logger.warn({ message }, "Discord client warning"));
  client.on(Events.ShardError, (err, shardId) => logger.error({ err, shardId }, "Discord shard error"));
  client.on(Events.ShardDisconnect, (event, shardId) => logger.warn({ code: event.code, shardId }, "Discord shard disconnected"));
  client.on(Events.ShardReconnecting, (shardId) => logger.warn({ shardId }, "Discord shard reconnecting"));

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Kapanıyor (${signal})...`);
    try {
      await prisma.$disconnect();
    } finally {
      client.destroy();
      process.exit(0);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  process.on("unhandledRejection", (err) => {
    logger.error({ err }, "Unhandled promise rejection");
  });
  process.on("uncaughtException", (err) => {
    // Bir komutun içindeki senkron bir hata botu tamamen çökertmesin — logla ve devam et.
    logger.error({ err }, "Uncaught exception");
  });

  await client.login(ayarlar.discordToken);
}

main().catch((err) => {
  logger.error({ err }, "Fatal error during startup");
  process.exit(1);
});
