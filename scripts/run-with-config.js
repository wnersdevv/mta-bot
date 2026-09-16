#!/usr/bin/env node
/**
 * Prisma CLI (db push/generate/studio) ayrı bir process olarak çalıştığı ve şema
 * dosyasındaki env("DATABASE_URL")'i okumak için gerçek bir process.env değişkenine
 * ihtiyaç duyduğu için, bu proje .env kullanmadığından bu küçük sarmalayıcı
 * config/ayarlar.json'u okuyup DATABASE_URL'i alt process'e enjekte eder.
 *
 * Kullanım: node scripts/run-with-config.js <komut> [args...]
 * Örnek:    node scripts/run-with-config.js npx prisma db push
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const configPath = path.join(__dirname, "..", "config", "ayarlar.json");
const examplePath = path.join(__dirname, "..", "config", "ayarlar.example.json");

if (!fs.existsSync(configPath)) {
  console.error(
    `❌ Ayarlar dosyası bulunamadı: ${configPath}\n` +
      `   '${examplePath}' dosyasını 'config/ayarlar.json' olarak kopyalayıp kendi değerlerinizi girin.`,
  );
  process.exit(1);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
} catch (err) {
  console.error(`❌ '${configPath}' geçerli bir JSON dosyası değil:`, err.message);
  process.exit(1);
}

if (!config.databaseUrl) {
  console.error("❌ config/ayarlar.json içinde 'databaseUrl' alanı boş.");
  process.exit(1);
}

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("Kullanım: node scripts/run-with-config.js <komut> [args...]");
  process.exit(1);
}

const childEnv = { ...process.env, DATABASE_URL: config.databaseUrl };
const result = spawnSync(cmd, args, {
  stdio: "inherit",
  env: childEnv,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
