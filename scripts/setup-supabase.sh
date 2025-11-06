#!/bin/bash

# ==============================================================================
# Script de Setup Automatizado de Supabase
# ==============================================================================
# Este script te guía paso a paso para configurar Supabase

set -e  # Exit on error

echo "🚀 Legal RAG System - Setup de Supabase"
echo "========================================"
echo ""

# ==============================================================================
# 1. Verificar prerrequisitos
# ==============================================================================

echo "📋 Verificando prerrequisitos..."

if ! command -v bun &> /dev/null; then
    echo "❌ Bun no está instalado. Instálalo desde: https://bun.sh"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "⚠️  psql no está instalado. Lo necesitarás para ejecutar scripts SQL."
    echo "   Puedes continuar, pero tendrás que ejecutar los scripts manualmente."
fi

echo "✅ Prerrequisitos verificados"
echo ""

# ==============================================================================
# 2. Solicitar credenciales de Supabase
# ==============================================================================

echo "🔑 Necesito tus credenciales de Supabase"
echo "Obtén estas credenciales de: https://app.supabase.com/project/_/settings/api"
echo ""

read -p "Project URL (ej: https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Anon Key (empieza con eyJ...): " SUPABASE_ANON_KEY
read -sp "Service Role Key (secreta, empieza con eyJ...): " SUPABASE_SERVICE_ROLE_KEY
echo ""

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Todas las credenciales son requeridas"
    exit 1
fi

echo "✅ Credenciales recibidas"
echo ""

# ==============================================================================
# 3. Solicitar Database URL
# ==============================================================================

echo "🗄️  Database Connection String"
echo "Obtén esto de: Settings > Database > Connection String > URI"
echo ""

read -p "Database URL (postgresql://...): " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: Database URL es requerida"
    exit 1
fi

echo "✅ Database URL recibida"
echo ""

# ==============================================================================
# 4. Solicitar OpenAI API Key
# ==============================================================================

echo "🤖 OpenAI API Key (para funcionalidad RAG)"
echo "Obtén esto de: https://platform.openai.com/api-keys"
echo ""

read -sp "OpenAI API Key (sk-...): " OPENAI_API_KEY
echo ""

if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Sin OpenAI API Key. Puedes configurarlo después."
fi

echo ""

# ==============================================================================
# 5. Crear archivo .env
# ==============================================================================

echo "📝 Creando archivo .env..."

cat > .env << EOF
# ==============================================================================
# SUPABASE CONFIGURATION
# ==============================================================================

SUPABASE_URL="$SUPABASE_URL"
SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

# ==============================================================================
# DATABASE
# ==============================================================================

DATABASE_URL="$DATABASE_URL"

# ==============================================================================
# REDIS (Optional - leave empty for now)
# ==============================================================================

REDIS_URL=""

# ==============================================================================
# OPENAI API
# ==============================================================================

OPENAI_API_KEY="$OPENAI_API_KEY"
EMBEDDING_MODEL="text-embedding-3-large"
EMBEDDING_DIMENSIONS=3072

# ==============================================================================
# ANTHROPIC API (Optional)
# ==============================================================================

ANTHROPIC_API_KEY=""

# ==============================================================================
# SERVER CONFIGURATION
# ==============================================================================

NODE_ENV="development"
PORT=8000
CORS_ORIGIN="http://localhost:3000"

# ==============================================================================
# STRIPE (Optional)
# ==============================================================================

STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# ==============================================================================
# RATE LIMITING
# ==============================================================================

RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW="1m"

# ==============================================================================
# PLAN LIMITS
# ==============================================================================

MAX_CASES_FREE=5
MAX_CASES_BASIC=50
MAX_CASES_PROFESSIONAL=200
MAX_CASES_TEAM=1000

# ==============================================================================
# FILE UPLOAD
# ==============================================================================

MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
EOF

echo "✅ Archivo .env creado"
echo ""

# ==============================================================================
# 6. Crear archivo .env.local del frontend
# ==============================================================================

echo "📝 Creando frontend/.env.local..."

mkdir -p frontend

cat > frontend/.env.local << EOF
# ==============================================================================
# SUPABASE CONFIGURATION
# ==============================================================================

NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# ==============================================================================
# BACKEND API URL
# ==============================================================================

NEXT_PUBLIC_API_URL=http://localhost:8000

# ==============================================================================
# STRIPE (Optional)
# ==============================================================================

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EOF

echo "✅ Archivo frontend/.env.local creado"
echo ""

# ==============================================================================
# 7. Instalar dependencias
# ==============================================================================

echo "📦 Instalando dependencias del backend..."
bun install

echo ""
echo "📦 Instalando dependencias del frontend..."
cd frontend && bun install && cd ..

echo "✅ Dependencias instaladas"
echo ""

# ==============================================================================
# 8. Generar cliente de Prisma
# ==============================================================================

echo "🔄 Generando cliente de Prisma..."
bun run prisma:generate

echo "✅ Cliente de Prisma generado"
echo ""

# ==============================================================================
# 9. Ejecutar migraciones
# ==============================================================================

echo "🗄️  Ejecutando migraciones de base de datos..."

read -p "¿Quieres ejecutar las migraciones ahora? (y/n): " RUN_MIGRATIONS

if [ "$RUN_MIGRATIONS" = "y" ]; then
    bun run prisma migrate dev --name init
    echo "✅ Migraciones ejecutadas"
else
    echo "⏭️  Migraciones omitidas. Ejecuta manualmente: bun run prisma migrate dev"
fi

echo ""

# ==============================================================================
# 10. Instrucciones para funciones SQL
# ==============================================================================

echo "📊 IMPORTANTE: Funciones SQL de Supabase"
echo "========================================"
echo ""
echo "Necesitas ejecutar las funciones de búsqueda vectorial en Supabase:"
echo ""
echo "Opción 1 - Supabase Dashboard (RECOMENDADO):"
echo "  1. Ve a: $SUPABASE_URL (Dashboard)"
echo "  2. Click en 'SQL Editor'"
echo "  3. Copia y pega el contenido de: database/supabase-functions.sql"
echo "  4. Click 'Run'"
echo ""
echo "Opción 2 - psql (si tienes psql instalado):"
echo "  psql \"$DATABASE_URL\" -f database/supabase-functions.sql"
echo ""

read -p "Presiona Enter cuando hayas ejecutado las funciones SQL..."

echo ""

# ==============================================================================
# 11. Crear buckets de storage
# ==============================================================================

echo "📦 Configurando Storage Buckets..."
echo ""
echo "Ve a Supabase Dashboard y crea estos buckets:"
echo ""
echo "1. Bucket: case-documents"
echo "   - Public: NO"
echo "   - File size limit: 10 MB"
echo ""
echo "2. Bucket: avatars"
echo "   - Public: YES"
echo "   - File size limit: 2 MB"
echo ""
echo "O ejecuta este código en el backend cuando esté corriendo:"
echo "  // await storageService.createBuckets();"
echo ""

read -p "Presiona Enter cuando hayas creado los buckets..."

echo ""

# ==============================================================================
# 12. Resumen
# ==============================================================================

echo "✅ ¡Setup completado!"
echo "===================="
echo ""
echo "Archivos creados:"
echo "  ✅ .env"
echo "  ✅ frontend/.env.local"
echo ""
echo "Próximos pasos:"
echo ""
echo "1. Iniciar backend:"
echo "   bun run dev"
echo ""
echo "2. Iniciar frontend (en otra terminal):"
echo "   cd frontend && bun run dev"
echo ""
echo "3. Verificar que todo funciona:"
echo "   - Backend: http://localhost:8000/health"
echo "   - Frontend: http://localhost:3000"
echo ""
echo "4. Ver documentación completa:"
echo "   - SUPABASE_SETUP.md"
echo "   - README.md"
echo ""
echo "🎉 ¡Listo para desarrollar!"
