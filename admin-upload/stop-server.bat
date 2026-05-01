@echo off
echo ========================================
echo   POWERIA Legal - Detener Servidor
echo ========================================
echo.
echo Buscando procesos del servidor en puerto 3333...
echo.

REM Encontrar y matar el proceso que usa el puerto 3333
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3333 ^| findstr LISTENING') do (
    echo Encontrado proceso: %%a
    taskkill /F /PID %%a >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo ✓ Servidor detenido exitosamente
    ) else (
        echo ! No se pudo detener el proceso %%a
    )
)

REM También buscar procesos node.exe que estén corriendo server.js
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST ^| findstr "PID:"') do (
    wmic process where "ProcessId=%%a" get CommandLine 2>nul | findstr "server.js" >nul
    if %ERRORLEVEL% equ 0 (
        echo Deteniendo proceso node.exe (%%a)...
        taskkill /F /PID %%a >nul 2>nul
        if %ERRORLEVEL% equ 0 (
            echo ✓ Proceso node detenido
        )
    )
)

echo.
echo ========================================
echo   Servidor detenido
echo ========================================
echo.
timeout /t 3 >nul
