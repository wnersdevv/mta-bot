// Bu, botun kök dizindeki giriş noktasıdır (npm run dev / npx tsx wnersdev.ts
// ile doğrudan çalıştırılabilir). Gerçek mantık src/wnersdev.ts içinde —
// diğer tüm modüller (config, database, events, loaders...) oradan "@/..."
// path alias'larıyla birbirine bağlanıyor, o yüzden onu taşımak yerine
// buradan içe aktarıyoruz.
import "./src/wnersdev";
