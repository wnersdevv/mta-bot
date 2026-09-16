FROM node:20-bookworm-slim AS base
WORKDIR /app

# node-canvas needs native build deps
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

FROM deps AS build
COPY . .
# 'prisma generate' istemci kodunu üretir, gerçek bağlantı kurmaz — bu yüzden
# build aşamasında config/ayarlar.json (gerçek sır) mevcut olmasa da çalışması
# için geçici bir DATABASE_URL (mongodb şemasına uygun) yeterlidir.
ENV DATABASE_URL="mongodb://placeholder:27017/placeholder"
RUN npx prisma generate
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/config/ayarlar.example.json ./config/ayarlar.example.json
COPY package.json ./

# Gerçek config/ayarlar.json, imaja gömülmez — docker-compose.yml içinde
# salt-okunur bir volume olarak /app/config/ayarlar.json'a bağlanır.
CMD ["node", "dist/wnersdev.js"]
