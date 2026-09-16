import { PrismaClient } from "@prisma/client";
import { ayarlar } from "@/config/ayarlar";

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

// ayarlar.ts import edilir edilmez process.env.DATABASE_URL'i config/ayarlar.json'dan
// doldurur (.env dosyası kullanılmıyor) — PrismaClient bu satırdan sonra güvenle oluşturulabilir.
export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: ayarlar.nodeEnv === "development" ? ["warn", "error"] : ["error"],
  });

if (ayarlar.nodeEnv !== "production") {
  global.__prisma__ = prisma;
}
