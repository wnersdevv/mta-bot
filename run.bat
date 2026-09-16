@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ============================================
echo   GTA Online Discord Bot - wnersdev.ts
echo ============================================
echo.

if not exist "node_modules\" (
    echo [1/6] node_modules bulunamadi, paketler kuruluyor...
    call npm install
    if errorlevel 1 (
        echo.
        echo HATA: npm install basarisiz oldu. Node.js 20+ kurulu mu kontrol et.
        pause
        exit /b 1
    )
) else (
    echo [1/6] node_modules zaten mevcut, atlaniyor.
)

echo.

if not exist "config\ayarlar.json" (
    echo [2/6] config\ayarlar.json bulunamadi, ornekten olusturuluyor...
    copy "config\ayarlar.example.json" "config\ayarlar.json" >nul
    echo.
    echo ============================================
    echo   config\ayarlar.json olusturuldu ama BOS.
    echo   Su alanlari doldurmadan bot calismaz:
    echo     - discordToken
    echo     - clientId
    echo     - devGuildId
    echo     - databaseUrl  ^(MongoDB, replica set gerekli^)
    echo   Dosyayi bir metin editorunde ac, doldur,
    echo   sonra run.bat'i tekrar calistir.
    echo ============================================
    pause
    exit /b 0
) else (
    echo [2/6] config\ayarlar.json mevcut, atlaniyor.
)

echo.
echo [3/6] Prisma istemcisi olusturuluyor...
call npm run prisma:generate
if errorlevel 1 (
    echo.
    echo HATA: prisma generate basarisiz oldu. config\ayarlar.json icindeki
    echo databaseUrl dogru mu kontrol et.
    pause
    exit /b 1
)

echo.
echo [4/6] Veritabani semasi senkronize ediliyor ^(prisma db push^)...
call npm run prisma:push
if errorlevel 1 (
    echo.
    echo HATA: prisma db push basarisiz oldu. MongoDB calisiyor mu ve
    echo replica set olarak baslatildi mi ^(rs.initiate^(^)^) kontrol et.
    echo Detaylar icin README.md - Troubleshooting bolumune bak.
    pause
    exit /b 1
)

echo.
echo [5/6] Baslangic verileri kontrol ediliyor ^(araclar, mulkler, gorevler...^)...
call npm run prisma:seed
if errorlevel 1 (
    echo.
    echo UYARI: prisma:seed basarisiz oldu, devam ediliyor ama bazi
    echo komutlar ^(/araclar, /mulk, /gorevler...^) bos gorunebilir.
)

echo.

if not exist "config\.komutlar-kayitli" (
    echo [6/6] Slash komutlari Discord'a ilk kez kaydediliyor...
    call npm run deploy:commands
    if errorlevel 1 (
        echo.
        echo UYARI: Komutlar kaydedilemedi. config\ayarlar.json icindeki
        echo clientId / devGuildId dogru mu kontrol et. Bot yine de baslatilacak,
        echo ama Discord'da / yazinca komutlari gormeyebilirsin.
    ) else (
        echo. > "config\.komutlar-kayitli"
    )
) else (
    echo [6/6] Slash komutlari zaten kayitli, atlaniyor.
    echo        ^(Yeni komut eklediysen deploy-komutlar.bat'i calistir.^)
)

echo.
echo ============================================
echo   Bot baslatiliyor... Durdurmak icin CTRL+C
echo ============================================
echo.

call npm run dev

echo.
echo Bot durdu. Yukaridaki hata mesajlarini kontrol et.
pause
