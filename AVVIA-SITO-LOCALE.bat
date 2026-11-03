@echo off
title Marcati Teloni - Avvio server locali

taskkill /f /im node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

start "Admin Marcati" /min cmd /c "node admin\server.js & pause"
start "Sito Marcati" /min cmd /c "npx --yes serve -l 3000 & pause"

timeout /t 4 /nobreak >nul
start "" http://localhost:3000/store.html
start "" http://localhost:3000/admin/

echo.
echo Server avviati: sito su http://localhost:3000 e admin su http://localhost:3000/admin/
echo Puoi chiudere questa finestra (i server restano attivi nelle due finestre ridotte a icona).
pause
