@echo off
cd /d "%~dp0..\.."
node scripts/cloudflare.mjs login
pause
