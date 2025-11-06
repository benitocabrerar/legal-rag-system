# Arquitectura del Sistema Legal RAG

## Tabla de Contenidos

- [Visión General](#visión-general)
- [Diagrama de Arquitectura](#diagrama-de-arquitectura)
- [Stack Tecnológico](#stack-tecnológico)
- [Componentes Principales](#componentes-principales)
- [Flujo de Datos](#flujo-de-datos)
- [Decisiones Técnicas](#decisiones-técnicas)
- [Escalabilidad](#escalabilidad)
- [Seguridad](#seguridad)

## Visión General

Legal RAG System es una aplicación de tres capas diseñada para proporcionar asistencia legal inteligente mediante tecnologías de IA y RAG (Retrieval-Augmented Generation).

### Características Arquitectónicas Clave

- **Microservicios ligeros**: Backend modular con Fastify
- **Búsqueda semántica**: Vectores de embeddings con pgvector
- **Multi-tenancy**: Aislamiento a nivel de base de datos (RLS)
- **Real-time**: Chat en tiempo real con streaming
- **Escalabilidad horizontal**: Diseñado para escalar con Render
- **Serverless-ready**: Arquitectura compatible con serverless functions

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                   CAPA DE PRESENTACIÓN                       │
├─────────────────────────────────────────────────────────────┤
│  Next.js 15 App Router + React 19 + Tailwind + shadcn/ui   │
│  NextAuth.js | TanStack Query | Zustand                     │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS/REST API
┌───────────────────────┴─────────────────────────────────────┐
│                   CAPA DE APLICACIÓN                         │
├─────────────────────────────────────────────────────────────┤
│  Fastify API Server (Bun Runtime)                           │
│  ├── Auth | Cases | Documents | Chat | Search Routes       │
│  ├── JWT Auth | Rate Limit | CORS Middleware               │
│  └── RAG | Embedding | Search | DocGen Services            │
└───────────────────────┬─────────────────────────────────────┘
                        │ Prisma ORM
┌───────────────────────┴─────────────────────────────────────┐
│                    CAPA DE DATOS                             │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL 14+ (pgvector + uuid-ossp + pg_trgm)           │
│  Redis (Session | Cache | Queue)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │ API Calls
┌───────────────────────┴─────────────────────────────────────┐
│                 SERVICIOS EXTERNOS                           │
├─────────────────────────────────────────────────────────────┤
│  OpenAI (GPT-4 + Embeddings) | Claude 3.5 | Stripe         │
└─────────────────────────────────────────────────────────────┘
```

## Stack Tecnológico

Ver [TECH_STACK.md](./TECH_STACK.md) para detalles completos.

### Resumen

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui
- **Backend**: Bun, Fastify, Prisma, TypeScript
- **Database**: PostgreSQL 14+, pgvector, Redis
- **IA/ML**: OpenAI GPT-4, Claude 3.5, LangChain
- **DevOps**: Render, GitHub Actions

## Componentes Principales

### 1. Frontend (Next.js)

Aplicación web moderna con Server Components y Client Components optimizados.

**Rutas principales**:
- `/` - Landing page
- `/dashboard` - Dashboard principal
- `/cases` - Gestión de casos
- `/cases/:id/chat` - Chat RAG por caso
- `/documents` - Generador de documentos
- `/subscription` - Gestión de suscripción

**Componentes clave**:
- ChatInterface (streaming, history)
- DocumentUploader (drag & drop, progress)
- CaseManagement (CRUD, filters)
- SearchBar (semantic search)
- DocumentEditor (rich text, templates)

### 2. Backend API (Fastify + Bun)

API REST de alto rendimiento con arquitectura de servicios.

**Endpoints principales**:
- `POST /auth/login` - Autenticación
- `GET /cases` - Listar casos
- `POST /cases/:id/documents` - Subir documento
- `POST /chat` - Chat RAG
- `POST /search` - Búsqueda semántica
- `POST /documents/generate` - Generar documento

**Servicios**:
- RAG Service (retrieval + generation)
- Embedding Service (OpenAI embeddings)
- Search Service (hybrid search)
- Document Generation Service
- Subscription Service (Stripe)

### 3. Base de Datos (PostgreSQL + pgvector)

Base de datos relacional con soporte para vectores.

**Tablas core**:
- `users`, `organizations` - Auth & multi-tenancy
- `legal_documents`, `legal_document_chunks` - Knowledge base
- `cases`, `case_documents`, `case_document_chunks` - User data
- `conversations`, `messages` - Chat history
- `subscriptions`, `usage_metrics` - Billing

**Estrategia de vectores**:
```sql
CREATE TABLE legal_document_chunks (
  id UUID PRIMARY KEY,
  content TEXT,
  embedding vector(3072), -- text-embedding-3-large
  metadata JSONB
);

CREATE INDEX ON legal_document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### 4. Pipeline RAG

Pipeline completo de Retrieval-Augmented Generation.

**Fases**:
1. **Ingesta**: Document → Extract → Chunk → Embed → Store
2. **Retrieval**: Query → Embed → Vector Search → Hybrid Rerank
3. **Generation**: Chunks + Query → Prompt → LLM → Response

**Búsqueda híbrida**:
- 70% Vector similarity (cosine)
- 30% Full-text search (pg_trgm)
- Reciprocal Rank Fusion
- Cross-encoder reranking

## Flujo de Datos

### Flujo de Chat RAG

```
Usuario → Pregunta → POST /chat
  ↓
Generate query embedding → Hybrid search → Top 5 chunks
  ↓
Build prompt with context → Stream LLM response
  ↓
Store message → Update conversation → Return to UI
```

### Flujo de Carga de Documento

```
Usuario → Upload file → POST /cases/:id/documents
  ↓
Save file → Extract text → Chunk (512 tokens, 128 overlap)
  ↓
Generate embeddings (batch) → Store in DB
  ↓
BullMQ job → Process async → Notify user
```

## Decisiones Técnicas

### ¿Por qué Bun?
- 4x más rápido que Node.js
- TypeScript nativo
- Compatible con npm
- Menor uso de memoria

### ¿Por qué PostgreSQL + pgvector?
- Sin costos adicionales vs Pinecone ($70/mes)
- Transacciones ACID
- RLS nativo para multi-tenancy
- Suficiente para <1M vectores

### ¿Por qué Next.js App Router?
- React Server Components
- Streaming
- Layouts anidados
- Mejor rendimiento

### ¿Por qué Fastify?
- 3x más rápido que Express
- TypeScript first-class
- Schema validation built-in
- Plugin system robusto

## Escalabilidad

### Vertical (0-10K usuarios)
- **Database**: 4 GB RAM, 50 GB storage
- **Web Service**: 2 GB RAM, 2 vCPU
- **Redis**: 256 MB
- **Costo**: ~$40/mes en Render

### Horizontal (10K-100K usuarios)
- Read replicas (master + 2 replicas)
- Auto-scaling (2-10 instances)
- CDN para assets
- Caching multi-capa

### Sharding (100K+ usuarios)
- Shard por `organization_id`
- Router service para enrutamiento
- Índices particionados

## Seguridad

### Autenticación
- JWT con refresh tokens
- HTTP-only cookies
- Rate limiting (100 req/min)
- CORS restrictivo

### Datos
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Row-Level Security (RLS)
- Column encryption (pgcrypto)

### Compliance
- GDPR (right to deletion)
- HIPAA (encrypted storage)
- SOC2 (audit logs)

### Anti-Hallucination
- Similarity threshold: 0.75
- Citation required
- Temperature: 0.2
- Fact verification

## Monitoreo

### Métricas
- Latencia (p50, p95, p99)
- Errores (4xx, 5xx)
- Throughput (RPS)
- Vector search latency
- Token usage

### Alertas
- **Critical**: DB down, errors >5%
- **Warning**: Latency >1s, storage >80%
- **Info**: Deploys, migrations

---

Ver también:
- [MVP_GUIDE.md](./MVP_GUIDE.md) - Implementación del MVP
- [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) - Deployment
- [TECH_STACK.md](./TECH_STACK.md) - Stack completo
- [database/ARCHITECTURE.md](./database/ARCHITECTURE.md) - DB detallada
- [rag_architecture.md](./rag_architecture.md) - RAG pipeline

**Última actualización**: 2025-11-05
