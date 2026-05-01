#!/usr/bin/env bash
#
# Bootstrap one-shot contra un proyecto Supabase Pro existente.
#
# Pre-requisitos:
#   1. Proyecto Supabase Pro creado en https://supabase.com/dashboard
#   2. Supabase CLI instalado: https://supabase.com/docs/guides/cli
#   3. .env con:
#        SUPABASE_PROJECT_REF=xxxxxxxxxxxx
#        SUPABASE_URL=https://xxxx.supabase.co
#        SUPABASE_ANON_KEY=...
#        SUPABASE_SERVICE_ROLE_KEY=...
#        SUPABASE_DB_PASSWORD=<password de Postgres>
#        OPENAI_API_KEY=...
#   4. supabase login (una vez, abre browser)
#
# Uso:
#   npm run migrate:supabase:bootstrap
#
# Idempotente: cada paso se puede repetir sin daño.
#

set -euo pipefail

cd "$(dirname "$0")/../.."

if [ -f .env ]; then
  set -a; source .env; set +a
fi

REQUIRED=(SUPABASE_PROJECT_REF SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY SUPABASE_DB_PASSWORD)
for v in "${REQUIRED[@]}"; do
  if [ -z "${!v:-}" ]; then
    echo "✗ Falta env var: $v"
    exit 2
  fi
done

echo ""
echo "================================================================"
echo "  Bootstrap Supabase Cloud"
echo "  Proyecto: $SUPABASE_PROJECT_REF"
echo "  URL:      $SUPABASE_URL"
echo "================================================================"
echo ""

# 1. Link al proyecto cloud
echo "[1/6] supabase link..."
supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

# 2. Verificar conexión DB
echo ""
echo "[2/6] verificando conexión DB..."
supabase db remote commit --dry-run 2>/dev/null || true

# 3. Push migrations
echo ""
echo "[3/6] supabase db push (aplica migrations 0001-0008)..."
supabase db push --include-all --password "$SUPABASE_DB_PASSWORD"

# 4. Deploy Edge Functions
echo ""
echo "[4/6] deploy Edge Functions..."
supabase functions deploy ingest-document --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy summarize-stream --project-ref "$SUPABASE_PROJECT_REF"

# 5. Setear secrets en functions
echo ""
echo "[5/6] secrets de Edge Functions..."
supabase secrets set \
  OPENAI_API_KEY="$OPENAI_API_KEY" \
  --project-ref "$SUPABASE_PROJECT_REF"

# 6. Health check
echo ""
echo "[6/6] migration_health_check..."
npx tsx scripts/migrate-to-supabase/04-verify-migration.ts || {
  echo ""
  echo "⚠  health-check tiene fallos. Revisa el reporte arriba."
  exit 1
}

echo ""
echo "================================================================"
echo "  ✓ BOOTSTRAP COMPLETO"
echo "================================================================"
echo ""
echo "Próximos pasos manuales:"
echo "  1. Dashboard → Authentication → Hooks → 'Custom Access Token'"
echo "     → seleccionar public.custom_access_token_hook → Enable"
echo "  2. Dashboard → Authentication → Providers → Google → setup OAuth"
echo "  3. (opcional) importar usuarios existentes:"
echo "     - Editar 0004_auth_sync_and_hook.sql · descomentar el INSERT INTO auth.users"
echo "     - npm run migrate:supabase:push"
echo "  4. Re-embedding del corpus (Fase 1):"
echo "     npm run migrate:supabase:reembed"
echo "  5. Test RLS:"
echo "     npm run migrate:supabase:rls-test"
echo "  6. Activar feature flags en backend:"
echo "     AUTH_BACKEND=supabase SEARCH_BACKEND=rpc STORAGE_BACKEND=supabase"
echo ""
