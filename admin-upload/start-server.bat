@echo off
echo ========================================
echo   POWERIA Legal - Servidor de Carga
echo   Puerto: 3333
echo ========================================
echo.
echo Iniciando servidor...
echo.

cd /d "%~dp0"

REM Verificar si Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js no esta instalado
    echo Por favor instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)

REM Verificar si existe node_modules
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
    echo.
)

REM Iniciar servidor
echo.
echo ========================================
echo   Servidor iniciado en:
echo   http://localhost:3333
echo ========================================
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

node server.js

pause
