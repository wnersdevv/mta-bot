import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

// .env dosyası tamamen kaldırıldı — tüm yapılandırma config/ayarlar.json üzerinden okunur.
const CONFIG_PATH = path.join(__dirname, "..", "..", "config", "ayarlar.json");
const EXAMPLE_PATH = path.join(__dirname, "..", "..", "config", "ayarlar.example.json");

const ayarlarSchema = z.object({
  discordToken: z.string().min(1, "discordToken zorunludur"),
  clientId: z.string().min(1, "clientId zorunludur"),
  devGuildId: z.string().optional().default(""),
  databaseUrl: z.string().min(1, "databaseUrl zorunludur"),
  logChannelId: z.string().optional().default(""),
  adminRoleId: z.string().optional().default(""),
  defaultLanguage: z.enum(["tr", "en", "de", "es"]).default("tr"),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
});

function loadRawConfig(): unknown {
  if (!fs.existsSync(CONFIG_PATH)) {
    // eslint-disable-next-line no-console
    console.error(
      `❌ Ayarlar dosyası bulunamadı: ${CONFIG_PATH}\n` +
        `   '${EXAMPLE_PATH}' dosyasını 'config/ayarlar.json' olarak kopyalayıp kendi değerlerinizi girin.`,
    );
    process.exit(1);
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`❌ '${CONFIG_PATH}' geçerli bir JSON dosyası değil:`, err);
    process.exit(1);
  }
}

const parsed = ayarlarSchema.safeParse(loadRawConfig());

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ config/ayarlar.json içinde eksik/hatalı alanlar var:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const ayarlar = parsed.data;
export type Ayarlar = typeof ayarlar;

// Prisma Client, şema dosyasındaki env("DATABASE_URL") üzerinden bağlantı kurar.
// .env kullanmadığımız için bu değeri burada, uygulama sürecine bir kez enjekte ediyoruz.
process.env.DATABASE_URL = ayarlar.databaseUrl;
