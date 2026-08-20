@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".env" (
  echo [ERROR] Not configured. Run ONE-CLICK-DEPLOY.cmd first.
  pause
  exit /b 1
)
docker compose --env-file .env -f docker-compose.yml ps
echo.
echo Creator:       http://127.0.0.1:3002/
echo Play:          http://127.0.0.1:3000/
echo Player Admin:  http://127.0.0.1:3213/players
echo Login Portal:  http://127.0.0.1:3214/
pause
