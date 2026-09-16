@echo off
setlocal

cd /d "%~dp0"

echo ============================================
echo   Slash komutlarini Discord'a yeniden kaydet
echo ============================================
echo.
echo Bunu su durumlarda calistir:
echo   - Yeni bir komut ekledikten sonra
echo   - Var olan bir komutun aciklama/secenegini degistirdikten sonra
echo.

if not exist "config\ayarlar.json" (
    echo HATA: config\ayarlar.json bulunamadi. Once run.bat'i calistir.
    pause
    exit /b 1
)

call npm run deploy:commands
if errorlevel 1 (
    echo.
    echo HATA: Komutlar kaydedilemedi. config\ayarlar.json icindeki
    echo clientId / devGuildId dogru mu kontrol et.
    pause
    exit /b 1
)

echo. > "config\.komutlar-kayitli"

echo.
echo Komutlar basariyla kaydedildi.
echo ^(Sadece devGuildId'deki sunucuda aninda gorunur. Tum sunucularda
echo  gormek icin: npm run deploy:commands:global ^- bu 1 saate kadar surebilir.^)
pause
