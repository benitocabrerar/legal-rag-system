# Supabase · Runbook operacional

Esta carpeta contiene **toda la migración a Supabase** (config local, migrations SQL, Edge Functions, seed). Este README es la guía de operación día a día.

> Para el plan estratégico completo, ver [`SUPABASE_MIGRATION_PLAN.md`](../SUPABASE_MIGRATION_PLAN.md) en la raíz.

---

## Estructura

```
supabase/
├── config.toml              # Config CLI: docker compose local
├── seed.sql                 # Datos mínimos para tests (admin/user demo)
├── migrations/
│   ├── 0001_extensions.sql          # vector, pg_trgm, pgcrypto, ...
│   ├── 0002_vector_columns.sql      # embedding_v vector(1536) + HNSW + GIN FTS spanish
│   ├── 0003_rls_policies.sql        # 5 patrones RLS sobre 30+ tablas
│   ├── 0004_auth_sync_and_hook.sql  # auth.users ↔ public.users + JWT hook
│   ├── 0005_hybrid_search_rpc.sql   # RPC con RRF (semantic + keyword)
│   ├── 0006_storage_policies.sql    # buckets + políticas
│   ├── 0007_retention_fks.sql       # FKs ON DELETE SET NULL para compliance
│   └── 0008_verification.sql        # health check function
└── functions/
    ├── ingest-document/             # chunking + embedding (reemplaza routes/legal-documents.ts)
    └── summarize-stream/            # streaming summarization (reemplaza summarization-streaming.ts)
```

---

## Comandos día a día (cloud-only · sin docker, sin local)

```bash
# Bootstrap completo en un comando (link + db push + functions deploy + verify)
npm run migrate:supabase:bootstrap

# Sólo aplicar nuevas migrations al proyecto cloud
npm run migrate:supabase:push

# Deployar Edge Functions
npm run migrate:supabase:functions

# Verificar el estado de la migración (consulta migration_health_check)
npm run migrate:supabase:verify

# Re-embedding masivo del corpus (Fase 1)
npm run migrate:supabase:reembed

# Suite de tests RLS
npm run migrate:supabase:rls-test
```

> **Importante**: el proyecto NO usa Supabase local ni docker. Todas las operaciones impactan el proyecto cloud directamente. Para una nueva instalación, primero `supabase login` y luego `npm run migrate:supabase:bootstrap`.

---

## Checklist por fase

### Fase 0 · Preparación
- [ ] CLI instalado y `supabase --version`
- [ ] `supabase link` apunta al proyecto correcto
- [ ] `pg_dump` baseline de Render: `npm run migrate:supabase:baseline`
- [ ] Inventario en `migration-baseline/inventory-*.json` revisado
- [ ] Golden set de 200 queries definido para evaluación

### Fase 1 · Datos y schema
- [ ] `supabase db push` (aplica 0001-0002)
- [ ] `npm run migrate:supabase:reembed` corrió hasta el final (verificar `pending=0`)
- [ ] `EXPLAIN ANALYZE` con cosine query confirma uso del índice HNSW
- [ ] FTS spanish funciona: `select * from legal_document_chunks where to_tsvector('spanish', content) @@ websearch_to_tsquery('spanish', 'asamblea constituyente')`

### Fase 2 · RLS + Auth
- [ ] `supabase db push` (aplica 0003-0004)
- [ ] Hook activado en Dashboard → Auth → Hooks → "Custom Access Token" → `public.custom_access_token_hook`
- [ ] `npm run migrate:supabase:rls-test` pasa los 5 patrones
- [ ] `select migration_health_check();` retorna `ready_for_phase_2: true`

### Fase 3 · Aplicación
- [ ] Backend: `AUTH_BACKEND=supabase` y `SEARCH_BACKEND=rpc` en staging
- [ ] Frontend: `NEXT_PUBLIC_AUTH_BACKEND=supabase` en staging
- [ ] `STORAGE_BACKEND=supabase` y migración de archivos S3 → Supabase Storage
- [ ] `frontend/middleware.supabase.ts.example` renombrado a `frontend/middleware.ts`
- [ ] OAuth Google: redirect URLs configurados en Dashboard

### Fase 4 · Cutover
- [ ] Dual-write 48 h activo (escribe a Render y Supabase)
- [ ] Canary 5% → 25% → 100%
- [ ] `select migration_health_check();` retorna `ready_for_phase_4: true`
- [ ] Render como hot standby 14 días
- [ ] Decommission: Pinecone, Redis Render Starter, S3-avatares

---

## Troubleshooting

### "extension vector does not exist"
Aplicar primero `0001_extensions.sql`. En cloud, requiere plan Pro+.

### "operator does not exist: jsonb <=> vector"
Estás corriendo SQL nuevo contra la columna vieja `embedding jsonb`. Usar `embedding_v` (vector(1536)).

### "JWT expired" en frontend
El middleware no está refrescando la sesión. Renombrar `frontend/middleware.supabase.ts.example` → `frontend/middleware.ts`.

### "permission denied for table X" tras activar RLS
Falta una policy. El usuario está autenticado pero ninguna policy aplica. Revisar en Dashboard → Auth → Policies.

### Re-embedding muy lento
Subir `REEMBED_BATCH_SIZE` (max 2048 inputs por call OpenAI) y `REEMBED_RATE_LIMIT_RPM` según tier OpenAI.

### Worker BullMQ falla con "row violates row-level security policy"
El worker está usando `SUPABASE_ANON_KEY`. Cambiar a `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS). NUNCA exponer la service_role al frontend.

---

## Criterios go / no-go

### Go a Fase 2
- ✓ `extensions_ok = true`
- ✓ `vector_columns >= 2`
- ✓ `hnsw_indexes >= 2`
- ✓ `rpc_search_exists = true`
- ✓ Re-embedding 100% (pending = 0)

### Go a Fase 4 (cutover)
Todos los anteriores +
- ✓ `rls_enabled_tables >= 20`
- ✓ `jwt_hook_exists = true`
- ✓ `auth_sync_trigger = true`
- ✓ Suite RLS test pasa los 5 patrones
- ✓ Recall@10 ≥ 0.90 sobre golden set
- ✓ p95 retrieval < 250 ms

### Rollback
- Antes de Fase 4: trivial. Apagar feature flags, `DATABASE_URL` apunta a Render.
- Durante Fase 4: switch DNS de vuelta + restaurar pg_dump del dual-write.
- Post-Fase 4: requiere `pg_dump` de Supabase a Render (RTO ~30 min, RPO ≤ 48 h).

---

## Contacto Supabase

- Docs: https://supabase.com/docs
- Status: https://status.supabase.com
- Discord: https://discord.supabase.com
- Issues del proyecto Pro: support@supabase.io
