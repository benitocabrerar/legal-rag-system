@echo off
REM ==============================================================================
REM Script de Setup Automatizado de Supabase para Windows
REM ==============================================================================

echo 🚀 Legal RAG System - Setup de Supabase
echo ========================================
echo.

REM ==============================================================================
REM 1. Solicitar credenciales de Supabase
REM ==============================================================================

echo 🔑 Necesito tus credenciales de Supabase
echo Obten estas credenciales de: https://app.supabase.com/project/_/settings/api
echo.

set /p SUPABASE_URL="Project URL (ej: https://xxxxx.supabase.co): "
set /p SUPABASE_ANON_KEY="Anon Key (empieza con eyJ...): "
set /p SUPABASE_SERVICE_ROLE_KEY="Service Role Key (secreta): "

if "%SUPABASE_URL%"=="" goto error
if "%SUPABASE_ANON_KEY%"=="" goto error
if "%SUPABASE_SERVICE_ROLE_KEY%"=="" goto error

echo ✅ Credenciales recibidas
echo.

REM ==============================================================================
REM 2. Solicitar Database URL
REM ==============================================================================

echo 🗄️  Database Connection String
echo Obten esto de: Settings ^> Database ^> Connection String ^> URI
echo.

set /p DATABASE_URL="Database URL (postgresql://...): "

if "%DATABASE_URL%"=="" goto error

echo ✅ Database URL recibida
echo.

REM ==============================================================================
REM 3. Solicitar OpenAI API Key
REM ==============================================================================

echo 🤖 OpenAI API Key (para funcionalidad RAG)
echo Obten esto de: https://platform.openai.com/api-keys
echo.

set /p OPENAI_API_KEY="OpenAI API Key (sk-...): "
echo.

REM ==============================================================================
REM 4. Crear archivo .env
REM ==============================================================================

echo 📝 Creando archivo .env...

(
echo # ==============================================================================
echo # SUPABASE CONFIGURATION
echo # ==============================================================================
echo.
echo SUPABASE_URL="%SUPABASE_URL%"
echo SUPABASE_ANON_KEY="%SUPABASE_ANON_KEY%"
echo SUPABASE_SERVICE_ROLE_KEY="%SUPABASE_SERVICE_ROLE_KEY%"
echo.
echo # ==============================================================================
echo # DATABASE
echo # ==============================================================================
echo.
echo DATABASE_URL="%DATABASE_URL%"
echo.
echo # ==============================================================================
echo # REDIS ^(Optional^)
echo # ==============================================================================
echo.
echo REDIS_URL=""
echo.
echo # ==============================================================================
echo # OPENAI API
echo # ==============================================================================
echo.
echo OPENAI_API_KEY="%OPENAI_API_KEY%"
echo EMBEDDING_MODEL="text-embedding-3-large"
echo EMBEDDING_DIMENSIONS=3072
echo.
echo # ==============================================================================
echo # SERVER CONFIGURATION
echo # ==============================================================================
echo.
echo NODE_ENV="development"
echo PORT=8000
echo CORS_ORIGIN="http://localhost:3000"
echo.
echo # ==============================================================================
echo # PLAN LIMITS
echo # ==============================================================================
echo.
echo MAX_CASES_FREE=5
echo MAX_CASES_BASIC=50
echo MAX_CASES_PROFESSIONAL=200
echo MAX_CASES_TEAM=1000
echo.
echo # ==============================================================================
echo # FILE UPLOAD
echo # ==============================================================================
echo.
echo MAX_FILE_SIZE_MB=10
echo ALLOWED_FILE_TYPES="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
) > .env

echo ✅ Archivo .env creado
echo.

REM ==============================================================================
REM 5. Crear archivo frontend/.env.local
REM ==============================================================================

echo 📝 Creando frontend\.env.local...

if not exist "frontend" mkdir frontend

(
echo # ==============================================================================
echo # SUPABASE CONFIGURATION
echo # ==============================================================================
echo.
echo NEXT_PUBLIC_SUPABASE_URL=%SUPABASE_URL%
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY%
echo.
echo # ==============================================================================
echo # BACKEND API URL
echo # ==============================================================================
echo.
echo NEXT_PUBLIC_API_URL=http://localhost:8000
) > frontend\.env.local

echo ✅ Archivo frontend\.env.local creado
echo.

REM ==============================================================================
REM 6. Instalar dependencias
REM ==============================================================================

echo 📦 Instalando dependencias...
echo.

call bun install

cd frontend
call bun install
cd ..

echo ✅ Dependencias instaladas
echo.

REM ==============================================================================
REM 7. Generar cliente de Prisma
REM ==============================================================================

echo 🔄 Generando cliente de Prisma...

call bun run prisma:generate

echo ✅ Cliente de Prisma generado
echo.

REM ==============================================================================
REM 8. Instrucciones finales
REM ==============================================================================

echo.
echo ✅ ¡Setup completado!
echo ====================
echo.
echo Archivos creados:
echo   ✅ .env
echo   ✅ frontend\.env.local
echo.
echo IMPORTANTE: Ejecuta las funciones SQL manualmente:
echo   1. Ve a: %SUPABASE_URL% ^(Dashboard^)
echo   2. Click en 'SQL Editor'
echo   3. Copia y pega: database\supabase-functions.sql
echo   4. Click 'Run'
echo.
echo Proximos pasos:
echo.
echo 1. Ejecutar migraciones:
echo    bun run prisma migrate dev --name init
echo.
echo 2. Iniciar backend:
echo    bun run dev
echo.
echo 3. Iniciar frontend ^(en otra terminal^):
echo    cd frontend ^&^& bun run dev
echo.
echo 4. Verificar:
echo    - Backend: http://localhost:8000/health
echo    - Frontend: http://localhost:3000
echo.
echo 🎉 ¡Listo para desarrollar!
echo.

pause
goto end

:error
echo ❌ Error: Todas las credenciales son requeridas
pause
exit /b 1

:end
