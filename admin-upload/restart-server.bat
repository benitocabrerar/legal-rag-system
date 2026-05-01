@echo off
echo ========================================
echo   POWERIA Legal - Reiniciar Servidor
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Deteniendo servidor actual...
call stop-server.bat

echo.
echo [2/2] Iniciando servidor nuevamente...
timeout /t 2 >nul
call start-server.bat
