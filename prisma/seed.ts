import fs from "node:fs";
import path from "node:path";
import { PrismaClient, VehicleCategory, Rarity, PropertyType, MissionDifficulty } from "@prisma/client";

// prisma/seed.ts, src/config/ayarlar.ts'nin path-alias yükleme zincirinin dışında
// çalıştığı için (Prisma CLI'nin "prisma db seed" akışı) config/ayarlar.json'u burada
// bağımsız olarak okuyup DATABASE_URL'i process.env'e enjekte ediyoruz. .env kullanılmıyor.
const configPath = path.join(__dirname, "..", "config", "ayarlar.json");
if (!fs.existsSync(configPath)) {
  console.error(`❌ config/ayarlar.json bulunamadı. config/ayarlar.example.json dosyasını kopyalayıp doldurun.`);
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as { databaseUrl: string };
process.env.DATABASE_URL = config.databaseUrl;

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // MongoDB connector'da createMany + skipDuplicates desteklenmiyor (bu Postgres/MySQL'e
  // özgü bir özellik), bu yüzden her koleksiyon için "zaten doluysa atla" kontrolü
  // kullanıyoruz — seed script'i birden fazla kez güvenle çalıştırılabilsin diye.

  if ((await prisma.vehicle.count()) === 0) {
    console.log("Seeding vehicles...");
    await prisma.vehicle.createMany({
      data: [
        { name: "Elegy", brand: "Annis", category: VehicleCategory.SPOR, price: 45_000, performance: { speed: 82, acceleration: 78, handling: 74 }, rarity: Rarity.COMMON },
        { name: "Jester", brand: "Dinka", category: VehicleCategory.SPOR, price: 60_000, performance: { speed: 85, acceleration: 80, handling: 77 }, rarity: Rarity.UNCOMMON },
        { name: "Adder", brand: "Truffade", category: VehicleCategory.SUPER, price: 1_000_000, performance: { speed: 98, acceleration: 95, handling: 88 }, rarity: Rarity.LEGENDARY },
        { name: "Zentorno", brand: "Benefactor", category: VehicleCategory.SUPER, price: 750_000, performance: { speed: 96, acceleration: 93, handling: 85 }, rarity: Rarity.EPIC },
        { name: "Baller", brand: "Gallivanter", category: VehicleCategory.SUV, price: 90_000, performance: { speed: 70, acceleration: 65, handling: 68 }, rarity: Rarity.COMMON },
        { name: "Cavalcade", brand: "Albany", category: VehicleCategory.SUV, price: 65_000, performance: { speed: 68, acceleration: 60, handling: 65 }, rarity: Rarity.COMMON },
        { name: "Tailgater", brand: "Obey", category: VehicleCategory.SEDAN, price: 42_000, performance: { speed: 75, acceleration: 70, handling: 72 }, rarity: Rarity.COMMON },
        { name: "Primo", brand: "Albany", category: VehicleCategory.SEDAN, price: 20_000, performance: { speed: 60, acceleration: 55, handling: 58 }, rarity: Rarity.COMMON },
        { name: "Dominator", brand: "Vapid", category: VehicleCategory.MUSCLE, price: 90_000, performance: { speed: 80, acceleration: 84, handling: 66 }, rarity: Rarity.UNCOMMON },
        { name: "Gauntlet", brand: "Bravado", category: VehicleCategory.MUSCLE, price: 85_000, performance: { speed: 78, acceleration: 82, handling: 64 }, rarity: Rarity.UNCOMMON },
        { name: "Bifta", brand: "BF", category: VehicleCategory.OFFROAD, price: 15_000, performance: { speed: 55, acceleration: 60, handling: 70 }, rarity: Rarity.COMMON },
        { name: "Sandking", brand: "Vapid", category: VehicleCategory.OFFROAD, price: 100_000, performance: { speed: 65, acceleration: 62, handling: 75 }, rarity: Rarity.RARE },
        { name: "Akuma", brand: "Dinka", category: VehicleCategory.MOTOSIKLET, price: 8_000, performance: { speed: 72, acceleration: 88, handling: 80 }, rarity: Rarity.COMMON },
        { name: "Bati 801", brand: "Pegassi", category: VehicleCategory.MOTOSIKLET, price: 12_000, performance: { speed: 76, acceleration: 90, handling: 82 }, rarity: Rarity.UNCOMMON },
      ],
    });
  } else {
    console.log("Vehicles already seeded, skipping.");
  }

  if ((await prisma.property.count()) === 0) {
    console.log("Seeding properties...");
    await prisma.property.createMany({
      data: [
        { name: "Downtown Apartment", type: PropertyType.DAIRE, price: 200_000, capacity: 2, income: 500, levelRequirement: 1, rarity: Rarity.COMMON },
        { name: "Suburban House", type: PropertyType.EV, price: 450_000, capacity: 4, income: 1_200, levelRequirement: 3, rarity: Rarity.UNCOMMON },
        { name: "Skyline Penthouse", type: PropertyType.PENTHOUSE, price: 2_500_000, capacity: 6, income: 4_000, levelRequirement: 10, rarity: Rarity.LEGENDARY },
        { name: "10-Car Garage", type: PropertyType.GARAJ, price: 300_000, capacity: 10, income: 0, levelRequirement: 2, rarity: Rarity.COMMON },
        { name: "Industrial Warehouse", type: PropertyType.DEPO, price: 600_000, capacity: 1, income: 1_800, levelRequirement: 5, rarity: Rarity.RARE },
        { name: "Corporate Office", type: PropertyType.OFIS, price: 800_000, capacity: 1, income: 2_200, levelRequirement: 6, rarity: Rarity.RARE },
        { name: "Nightclub", type: PropertyType.GECE_KULUBU, price: 1_700_000, capacity: 1, income: 3_500, levelRequirement: 8, rarity: Rarity.EPIC },
        { name: "Underground Bunker", type: PropertyType.BUNKER, price: 1_200_000, capacity: 1, income: 2_800, levelRequirement: 7, rarity: Rarity.EPIC },
      ],
    });
  } else {
    console.log("Properties already seeded, skipping.");
  }

  if ((await prisma.mission.count()) === 0) {
    console.log("Seeding missions...");
    await prisma.mission.createMany({
      data: [
        { key: "gece_teslimati", difficulty: MissionDifficulty.EASY, reward: 3_500, xp: 40, cooldownSec: 1800 },
        { key: "hizli_kurye", difficulty: MissionDifficulty.EASY, reward: 2_800, xp: 30, cooldownSec: 1200 },
        { key: "vip_tasima", difficulty: MissionDifficulty.MEDIUM, reward: 6_000, xp: 70, cooldownSec: 2400 },
        { key: "ozel_arac_gorevi", difficulty: MissionDifficulty.HARD, reward: 12_000, xp: 120, cooldownSec: 3600 },
      ],
    });
  } else {
    console.log("Missions already seeded, skipping.");
  }

  if ((await prisma.achievement.count()) === 0) {
    console.log("Seeding achievements...");
    await prisma.achievement.createMany({
      data: [
        { key: "ilk_kazanc" },
        { key: "milyoner" },
        { key: "arac_koleksiyoncusu" },
        { key: "mulk_krali" },
        { key: "gorev_ustasi" },
        { key: "ekip_lideri" },
      ],
    });
  } else {
    console.log("Achievements already seeded, skipping.");
  }

  if ((await prisma.inventoryItem.count()) === 0) {
    console.log("Seeding inventory items...");
    await prisma.inventoryItem.createMany({
      data: [
        { key: "bulletproof_vest", rarity: Rarity.COMMON, value: 500 },
        { key: "lockpick_kit", rarity: Rarity.UNCOMMON, value: 1_200 },
        { key: "gold_watch", rarity: Rarity.RARE, value: 5_000 },
        { key: "diamond_chain", rarity: Rarity.EPIC, value: 15_000 },
      ],
    });
  } else {
    console.log("Inventory items already seeded, skipping.");
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
