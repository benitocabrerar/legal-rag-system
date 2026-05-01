# Plan Maestro de Migración a Supabase

**Proyecto:** Legal RAG Ecuador
**Fecha:** 2026-04-28
**Veredicto base:** COGNITEX recomienda migrar (informe `informe-rag-analisis.html`).
**Estado:** Plan aprobable + scaffolding seguro entregado. **Ningún cambio destructivo aplicado todavía.**

---

## 0. Por qué migrar (síntesis ejecutiva)

| Defecto actual | Consecuencia | Resuelto por Supabase |
|---|---|---|
| `embedding jsonb` en lugar de `vector(1536)` | retrieval p95 ≈ 3.2 s; índices HNSW/IVFFlat imposibles | `vector(1536)` + HNSW gestionado |
| 3 pipelines de retrieval inconsistentes (`query.ts`, `unified-search`, `queryRouter`) | uno está roto en runtime (`jsonb <=> vector` falla) | 1 RPC `search_legal()` con RRF |
| Cero RLS en 29 tablas con `userId` | IDOR latente: un `findMany` sin `where userId` = brecha | RLS forzado por motor |
| `JWT_SECRET` con default `'default-secret-change-in-production'` | si la env falta, el sistema arranca con secreto público | Supabase Auth gestiona la firma |
| 6.500 LOC de auth/cache/queue/storage hechos a mano | mantenimiento + superficie de bugs | SDK + Vault + Storage + Realtime gestionados |

**Esfuerzo:** 120-180 h · **Calendario:** 6-9 semanas · **Cutover:** ≤30 min con dual-write 48 h.

---

## 1. Decisiones de arquitectura (tomadas en este plan)

### 1.1 Reconciliación de identidad: **id-match**
`public.users.id = auth.users.id` (mismo UUID). Justificación:
- Los 29 modelos con FK `userId` siguen funcionando sin JOIN extra en RLS.
- Prisma sigue gobernando el schema `public`; nunca toca `auth.*`.
- Trigger `auth.users → public.users` mantiene consistencia en signups nuevos.
- Hashes bcrypt existentes son compatibles con `auth.users.encrypted_password`.

Alternativa rechazada: tabla `profiles` separada → cada policy RLS sumaría un JOIN extra a 80 tablas → muerte de performance.

### 1.2 Modelo de embeddings: unificar a `text-embedding-3-small`
Hoy conviven `ada-002` (deprecado) y `3-small` — mismas 1536 dim pero **vectores incomparables**. Re-embedding total del corpus en Fase 1.

### 1.3 Storage: Supabase Storage reemplaza S3
S3 solo se usa en `backup-storage.service.ts` y `utils/cloudinary.ts` (avatares). Migración trivial. Backup diario seguirá vía `pg_dump` programado en Edge Function.

### 1.4 Pinecone: eliminar
Está en `package.json` pero **no hay un solo `import` real** (verificado por agente). Bloat de dependencia.

### 1.5 Workers (BullMQ): mantener provisionalmente, migrar a `pgmq` en Fase 4
BullMQ ya funciona; reescribirlo es trabajo extra. Estrategia: que use `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS) y se migre a `pgmq` después del cutover si hay margen.

### 1.6 Index: HNSW > IVFFlat
Corpus jurídico estable y read-heavy → HNSW gana en recall y latencia con `m=16, ef_construction=64`.

---

## 2. Mapeo de superficie de migración (inventario real)

| Capa | Archivos a tocar | Acción |
|---|---|---|
| Prisma client | 73 (35 routes + 34 services + 2 middleware + 1 worker + lib) | Coexisten Prisma + Supabase JS hasta cutover. Prisma sigue válido con la nueva `DATABASE_URL` apuntando a Supabase. |
| Auth (backend) | `routes/auth.ts`, `routes/oauth.ts`, `routes/two-factor.ts`, `middleware/auth.ts` | Reemplazar por verificación de JWT de Supabase con `getUser()`. 2FA: mantener tabla custom o migrar a `auth.mfa_factors`. |
| Auth (frontend) | `frontend/src/lib/auth.tsx`, `components/providers.tsx`, `hooks/index.ts` | Reemplazar AuthProvider custom por `@supabase/ssr`. |
| AWS S3 | `services/backup/backup-storage.service.ts`, `utils/cloudinary.ts` | Adaptador `StorageAdapter` con impl Supabase. |
| Pinecone | `package.json` | Eliminar. Cero código real. |
| Embeddings | `services/embeddings/`, `routes/query.ts`, `routes/legal-documents.ts`, `services/orchestration/queryRouter.ts` | Re-embed completo + 1 sola RPC `search_legal()`. Borrar `unified-search-orchestrator.ts` y la cosine-en-JS de `query.ts`. |
| Cron / queues | `bull`, `bullmq`, `node-cron`, `cron` | Mantener BullMQ con service_role; evaluar `pg_cron` para tareas simples post-cutover. |

---

## 3. RLS — plantillas oficiales (van en `supabase/migrations/0003_rls.sql`)

5 patrones cubren todo el sistema. Detalle SQL en la migration.

| Patrón | Cobertura | Ejemplo |
|---|---|---|
| **A · Ownership directo** | `cases`, `notifications`, `payments`, `subscriptions`, `api_keys`, `user_quotas`, `events`, `tasks`, `audit_logs`, `ai_conversations`, `query_history`, `user_sessions`, `analytics_events`, etc. | `auth.uid() = user_id` |
| **B · Ownership transitivo** | `document_chunks`, `legal_document_chunks`, `task_history`, `task_checklist_items`, `event_participants`, `event_reminders` | `EXISTS (SELECT 1 FROM parent WHERE parent.id = child.parent_id AND parent.user_id = auth.uid())` |
| **C · Lectura pública autenticada** | `legal_documents` cuando `is_active = true`, `legal_specialties` | `is_active = true` |
| **D · Admin override** | Todas | `(auth.jwt() ->> 'user_role') = 'admin'` |
| **E · Service role bypass** | Workers (BullMQ, embeddings, OCR) | `to service_role` |

### Riesgos específicos identificados
1. **`LegalDocument.uploadedBy`** (no `userId`) → escritura usa `uploaded_by = auth.uid()`; lectura sigue Pattern C (público).
2. **Cascade deletes**: `AuditLog`, `Payment`, `PaymentProof` deben usar `ON DELETE SET NULL` en el FK a `users` (compliance/contabilidad obliga retención post-deleción).
3. **Workers SIN auth.uid()**: requieren `SUPABASE_SERVICE_ROLE_KEY`. **Nunca** exponer al frontend.

---

## 4. Roadmap (alineado con COGNITEX, refinado)

### Fase 0 · Preparación (1 sem · 8 h)
- [ ] Crear org Supabase + proyecto Pro, región `us-east-1` o `sa-east-1`.
- [ ] Habilitar branching en proyecto.
- [ ] `pg_dump --no-owner --no-acl` de Render como baseline.
- [ ] Definir golden set de 200 queries para evaluación de recall.
- [ ] Setup local: `supabase init`, `supabase start` para dev.
- **Entregables del scaffolding ya generado:** `.env.supabase.example`, clientes JS, migrations SQL.

### Fase 1 · Datos y schema (1.5 sem · 30 h)
- [ ] Aplicar `0001_extensions.sql` (vector, pg_trgm, pgcrypto, pg_cron).
- [ ] Restaurar dump en branch `migracion`. Ajustar `gen_random_uuid()` si hay `uuid_generate_v4()`.
- [ ] Aplicar `0002_vector_columns.sql` (añade `embedding vector(1536)` paralelo al `embedding jsonb` actual).
- [ ] Job de re-embedding por lotes (10k chunks/h) con `text-embedding-3-small`. Idempotente: solo re-embed si `embedding_v IS NULL`.
- [ ] Validar con `EXPLAIN ANALYZE` que HNSW está siendo usado.
- [ ] Drop columnas `embedding jsonb` legacy. Renombrar `embedding_v` → `embedding`.

### Fase 2 · RLS + Auth (1.5 sem · 30 h)
- [ ] Aplicar `0003_rls_policies.sql` con `policy_disabled` flag inicialmente (todas las policies en modo permissive con `true`).
- [ ] Aplicar `0004_auth_sync_and_jwt_hook.sql`. Activar hook en Dashboard.
- [ ] Importar `auth.users` desde `public.users` (SQL one-shot incluido en `0004`).
- [ ] Endpoint de bootstrap que envía magic-link masivo a usuarios existentes (forzando re-login).
- [ ] Activar policies progresivamente con un feature flag `RLS_ENFORCEMENT_MODE = 'shadow' | 'enforce'`.
- [ ] Vitest suite que verifica que user A no puede leer entidades de user B (incluye Pattern B transitivo).

### Fase 3 · Aplicación (3 sem · 60 h)
- [ ] Reemplazar `routes/query.ts`, `unified-search-orchestrator.ts`, `queryRouter.ts` por **una sola** llamada a la RPC `search_legal()` (definida en `0005_hybrid_search_rpc.sql`).
- [ ] Migrar `backup-storage.service.ts` y `cloudinary.ts` a `StorageAdapter` (ya scaffoldeado en `src/lib/storage/`).
- [ ] Edge Functions Deno: `ingest-document` (chunking + embed), `summarize-stream` (reemplaza el SSE custom de `summarization-streaming.ts`).
- [ ] Frontend: `@supabase/ssr` en server components, sustituir `AuthProvider` custom.
- [ ] Eliminar `@pinecone-database/pinecone` del `package.json`.

### Fase 4 · Cutover (1 sem · 25 h)
- [ ] Dual-write 48 h: backend escribe a Render Y Supabase; lectura sigue en Render. Comparar diff con job de auditoría.
- [ ] Canary 5 % → 25 % → 100 % de tráfico de lectura a Supabase.
- [ ] Switch `DATABASE_URL` final → Supabase. Render queda como hot standby 14 días.
- [ ] Decommission Pinecone, S3 (avatares migrados), Redis Render Starter.

---

## 5. SLOs post-migración (criterios de éxito)

- p95 retrieval < 250 ms a 100 k chunks
- p99 retrieval < 600 ms a 1 M chunks
- Recall@10 ≥ 0.90 sobre golden set
- 0 endpoints con `findMany` sin filtro `userId` (lint custom + tests RLS en CI)
- 1 solo modelo de embeddings (`text-embedding-3-small`)
- 0 rutas con cosine-en-JS
- Costo mensual ≤ 70 % del baseline a igual volumen
- RTO < 1 h, RPO < 5 min con backups Supabase

---

## 6. Plan de rollback

Hasta el final de Fase 3 (semana 6), rollback es trivial: `DATABASE_URL` apunta a Render, se desactivan migrations Supabase. **A partir del cutover (semana 7) el dual-write se desactiva** — rollback requiere restaurar pg_dump de Supabase a Render (RTO ~30 min, RPO ≤ 48 h por el dual-write previo).

Punto de no retorno: **fin de semana 8** (decommission de Render).

---

## 7. Lo que está entregado (31 archivos)

```
supabase/
├── config.toml                        ← supabase CLI: arranca docker local sin cuenta cloud
├── seed.sql                           ← admin@local.test / user@local.test para tests
├── migrations/
│   ├── 0001_extensions.sql            ← vector, pg_trgm, pgcrypto, pg_stat_statements
│   ├── 0002_vector_columns.sql        ← embedding_v vector(1536) + HNSW + GIN FTS spanish + trigram
│   ├── 0003_rls_policies.sql          ← 5 patrones RLS aplicados a 30+ tablas con DO LOOP idempotente
│   ├── 0004_auth_sync_and_hook.sql    ← import users (bcrypt-compat), trigger, JWT custom hook
│   ├── 0005_hybrid_search_rpc.sql     ← RPC search_legal_chunks + search_user_documents (RRF)
│   ├── 0006_storage_policies.sql      ← buckets legal-documents/user-avatars/backups + RLS objects
│   └── 0007_retention_fks.sql         ← AuditLog/Payment ON DELETE SET NULL (compliance)
└── functions/
    └── ingest-document/index.ts       ← Edge Function Deno (chunking + embed + insert)

src/lib/
├── supabase.ts                        ← serviceRoleClient + userScopedClient (RLS-aware)
└── storage/
    ├── storage-adapter.ts             ← interface + factory por env STORAGE_BACKEND
    ├── s3-storage.ts                  ← impl AWS S3 (default actual)
    └── supabase-storage.ts            ← impl Supabase Storage

src/middleware/
└── auth-supabase.ts                   ← requireSupabaseAuth + requireSupabaseAdmin (feature-flag)

src/routes/
├── auth-supabase.ts                   ← /auth/supabase/{me,sync,admin/invite}
└── search-rpc.ts                      ← /search/legal vía RPC + embedding-3-small

frontend/src/lib/
├── auth-supabase.tsx                  ← SupabaseAuthProvider (mismo shape que legacy)
└── supabase/
    ├── client.ts                      ← cliente browser
    ├── server.ts                      ← cliente server components
    └── middleware.ts                  ← refresh de tokens en cada request

frontend/middleware.supabase.ts.example ← renombrar en Fase 3

scripts/migrate-to-supabase/
├── 01-export-baseline.ts              ← pg_dump + inventario + checksums
├── 02-reembed.ts                      ← re-embedding masivo idempotente con rate-limit
└── 03-rls-test-suite.ts               ← crea user A/B + valida los 5 patrones

tests/supabase/
├── feature-flags.spec.ts              ← default = legacy, flags activan supabase
├── storage-adapter.spec.ts            ← selección de backend correcta
└── supabase-clients.spec.ts           ← clientes lazy-fail si faltan env vars

.github/workflows/rls-tests.yml        ← CI ejecuta 03-rls-test-suite contra Supabase local

.env.supabase.example                  ← todas las vars nuevas + flags de migración
SUPABASE_MIGRATION_PLAN.md             ← este documento
```

### Ediciones aditivas a archivos existentes (sin romper nada)

| Archivo | Cambio | Comportamiento por defecto |
|---|---|---|
| `src/server.ts` | imports + 2 bloques `if (process.env.X === 'supabase')` antes de las rutas legacy | sin env vars Supabase → nada cambia |
| `package.json` | `@supabase/supabase-js` + 7 scripts npm `migrate:supabase:*`, `supabase:*` | scripts opcionales |
| `frontend/package.json` | `@supabase/ssr` + `@supabase/supabase-js` | dependencias no usadas hasta activar flag |
| `frontend/src/components/providers.tsx` | switch `NEXT_PUBLIC_AUTH_BACKEND === 'supabase' ? SupabaseAuthProvider : AuthProvider` | sin la env, sigue el AuthProvider custom |
| `prisma/schema.prisma` | comentarios indicando dónde añadir `embeddingV Unsupported("vector(1536)")?` en Fase 1 | sin cambios estructurales — Prisma sigue idéntico |

**Cero archivos eliminados. Cero rutas modificadas. Cero comportamiento default cambiado.**

### Flags que activan los nuevos paths

```bash
# Backend
AUTH_BACKEND=supabase       # registra /auth/supabase/* (requiere SUPABASE_URL)
SEARCH_BACKEND=rpc          # registra /search/legal con RPC + RRF + HNSW
STORAGE_BACKEND=supabase    # storage-adapter usa SupabaseStorage en vez de S3

# Frontend
NEXT_PUBLIC_AUTH_BACKEND=supabase   # SupabaseAuthProvider en vez del legacy
```

---

## 8. Estado actual (cloud aplicado · 2026-04-29)

**Proyecto Supabase activo:** `legal-rag-poweria` · ref `lmnzzcqqegqugphcnmew` · region East US (North Virginia) · plan **Free** · https://supabase.com/dashboard/project/lmnzzcqqegqugphcnmew

### Migraciones aplicadas (9/9 ✓)

```
✓ 0000_baseline_schema.sql      Schema Prisma completo (50+ tablas, enums, FKs)
✓ 0001_extensions.sql           vector, pg_trgm, pgcrypto, btree_gin, pg_stat_statements
✓ 0002_vector_columns.sql       embedding_v vector(1536) + 2 índices HNSW + 3 FTS spanish
✓ 0003_rls_policies.sql         29 tablas con RLS (Pattern A/B/C/D/E)
✓ 0004_auth_sync_and_hook.sql   trigger handle_new_auth_user + JWT custom hook
✓ 0005_hybrid_search_rpc.sql    RPC search_legal_chunks + search_user_documents (RRF)
✓ 0006_storage_policies.sql     3 buckets + RLS sobre storage.objects
✓ 0007_retention_fks.sql        AuditLog/Payment ON DELETE SET NULL
✓ 0008_verification.sql         migration_health_check()
```

### Edge Functions deployadas (2/2 ✓)

```
✓ ingest-document     https://lmnzzcqqegqugphcnmew.supabase.co/functions/v1/ingest-document
✓ summarize-stream    https://lmnzzcqqegqugphcnmew.supabase.co/functions/v1/summarize-stream
```

### Health check (al cierre)

```json
{
  "extensions_ok": true,
  "extensions_count": 3,
  "rls_enabled_tables": 29,
  "vector_columns": 2,
  "hnsw_indexes": 2,
  "rpc_search_exists": true,
  "jwt_hook_exists": true,
  "auth_sync_trigger": true,
  "storage_buckets": 3,
  "reembed_legal_pending": 0,
  "reembed_legal_done": 0,
  "ready_for_phase_2": true,
  "ready_for_phase_4": true
}
```

Credenciales en `.env` (las añadí sin machacar las existentes). Variables relevantes:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DATABASE_URL`

### Comandos cloud (un solo path)

```bash
# Bootstrap completo (idempotente)
npm run migrate:supabase:bootstrap
#   → link + db push + Edge Functions + verify

# Operaciones individuales:
npm run migrate:supabase:push         # solo migrations 0001-0008
npm run migrate:supabase:functions    # solo deploy Edge Functions
npm run migrate:supabase:verify       # health check
npm run migrate:supabase:reembed      # re-embedding (Fase 1)
npm run migrate:supabase:rls-test     # tests RLS contra cloud
```

### Activar feature flags cuando esté todo verde

```bash
# Backend (.env)
AUTH_BACKEND=supabase
SEARCH_BACKEND=rpc
STORAGE_BACKEND=supabase

# Frontend (frontend/.env.local)
NEXT_PUBLIC_AUTH_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=<copiar de .env>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copiar de .env>
```

> ⚠️ **Decisiones que requieren tu OK explícito y no he tomado:**
> 1. Subir el plan Free → Pro ($25/mes) cuando el corpus crezca a 1M+ chunks
> 2. `pg_dump` real contra Render (necesito que confirmes ventana de mantenimiento)
> 3. Re-embedding masivo (~$1 por 100k chunks de OpenAI)
> 4. Cutover de `DATABASE_URL` de prod
> 5. Borrar `@pinecone-database/pinecone`, `routes/query.ts`, `unified-search-orchestrator.ts`, `queryRouter.ts` (Fase 3)
> 6. Configurar OAuth Google en Dashboard (requiere client_id/secret tuyos)
> 7. Activar el JWT Custom Access Token Hook en Dashboard tras verificar la migration
