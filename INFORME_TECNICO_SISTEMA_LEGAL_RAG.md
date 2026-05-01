# Informe Técnico Completo: Sistema Legal RAG

## Análisis Profundo de Arquitectura, Estado y Recomendaciones

**Versión del Documento:** 1.0
**Fecha de Generación:** 8 de Diciembre, 2025
**Clasificación:** Documentación Técnica Interna
**Estado del Sistema:** 80% Producción-Ready

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Backend - Análisis Detallado](#4-backend---análisis-detallado)
5. [Base de Datos y Schema](#5-base-de-datos-y-schema)
6. [Frontend - Estructura y Componentes](#6-frontend---estructura-y-componentes)
7. [Sistema RAG y Vectores](#7-sistema-rag-y-vectores)
8. [Servicios de IA y NLP](#8-servicios-de-ia-y-nlp)
9. [Sistema de Caché Multi-Nivel](#9-sistema-de-caché-multi-nivel)
10. [Observabilidad y Monitoreo](#10-observabilidad-y-monitoreo)
11. [Sistema de Backup](#11-sistema-de-backup)
12. [Seguridad y Autenticación](#12-seguridad-y-autenticación)
13. [Problemas Críticos Identificados](#13-problemas-críticos-identificados)
14. [Métricas de Calidad](#14-métricas-de-calidad)
15. [Recomendaciones](#15-recomendaciones)
16. [Roadmap de Mejoras](#16-roadmap-de-mejoras)

---

## 1. Resumen Ejecutivo

### 1.1 Descripción General

El **Sistema Legal RAG** es una plataforma empresarial de gestión legal inteligente diseñada específicamente para el **sistema jurídico ecuatoriano**. Implementa técnicas avanzadas de Retrieval-Augmented Generation (RAG) para proporcionar asistencia legal automatizada basada en documentos normativos, códigos y jurisprudencia.

### 1.2 Estado Actual del Sistema

| Métrica | Valor | Estado |
|---------|-------|--------|
| Preparación para Producción | 80% | 🟡 Casi Listo |
| Cobertura de Tests | 228 casos | 🟢 Buena |
| Servicios Backend | 62 | 🟢 Completo |
| Rutas API | 39 | 🟢 Completo |
| Modelos de Base de Datos | 50+ | 🟢 Completo |
| Páginas Frontend | 31 | 🟢 Completo |
| Componentes React | 28+ | 🟢 Completo |
| Issues Críticos | 3 | 🔴 Requiere Atención |

### 1.3 Capacidades Principales

- **Búsqueda Semántica Legal**: Embeddings vectoriales con pgvector/Pinecone
- **Asistente Legal IA**: GPT-4 contextualizado para derecho ecuatoriano
- **Gestión de Casos**: CRUD completo con documentos y análisis
- **Biblioteca Legal Digital**: Normativa ecuatoriana clasificada jerárquicamente
- **Calendario y Tareas**: Gestión de plazos procesales
- **Sistema Financiero**: Facturación, cobros y control de honorarios
- **Multi-tenancy**: Soporte para múltiples usuarios/organizaciones
- **Backup Automatizado**: Sistema completo de respaldos con encriptación

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE (Browser)                               │
│                     Next.js 14 + React + TypeScript                         │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOAD BALANCER / CDN                                │
│                              (Render.com)                                    │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY (Fastify)                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐    │
│  │ Rate Limit  │ │    CORS     │ │    JWT      │ │ Request Metrics     │    │
│  │  100/15min  │ │  Configurable│ │   Auth     │ │ (OpenTelemetry)     │    │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘    │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────────────┐
│   AUTH LAYER  │       │  BUSINESS     │       │   AI/RAG PIPELINE     │
│               │       │  LOGIC        │       │                       │
│ • JWT Tokens  │       │               │       │ • Query Processor     │
│ • OAuth2.0    │       │ • Cases       │       │ • Embedding Generator │
│ • 2FA (TOTP)  │       │ • Documents   │       │ • Vector Search       │
│ • Sessions    │       │ • Calendar    │       │ • Reranking           │
│               │       │ • Tasks       │       │ • Citation Extraction │
│               │       │ • Finance     │       │ • Legal Assistant     │
└───────────────┘       └───────────────┘       └───────────────────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CAPA DE CACHÉ (Multi-Tier)                          │
│  ┌─────────────┐ ┌─────────────────────┐ ┌─────────────────────────────┐    │
│  │  L1: Memory │ │    L2: Redis        │ │    L3: Pinecone             │    │
│  │  (node-cache)│ │   (ioredis)        │ │   (Vector Store)            │    │
│  │  TTL: 5min  │ │   TTL: 15min       │ │   TTL: Persistent           │    │
│  └─────────────┘ └─────────────────────┘ └─────────────────────────────┘    │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CAPA DE PERSISTENCIA                                │
│  ┌─────────────────────────┐      ┌─────────────────────────────────────┐   │
│  │   PostgreSQL + pgvector │      │          AWS S3                      │   │
│  │                         │      │                                     │   │
│  │  • 50+ Tablas/Modelos   │      │  • Document Storage                 │   │
│  │  • Embeddings 1536-dim  │      │  • Backup Storage                   │   │
│  │  • Full-text Search     │      │  • Media Files                      │   │
│  │  • JSONB Metadata       │      │                                     │   │
│  └─────────────────────────┘      └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVICIOS EXTERNOS                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐    │
│  │   OpenAI    │ │  Pinecone   │ │  SendGrid   │ │     Datadog         │    │
│  │   GPT-4     │ │  Vectors    │ │   Email     │ │   Monitoring        │    │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Patrón de Comunicación

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌─────────────┐
│  Client  │────▶│  Fastify │────▶│   Service    │────▶│   Prisma    │
│          │◀────│  Router  │◀────│    Layer     │◀────│    ORM      │
└──────────┘     └──────────┘     └──────────────┘     └─────────────┘
                      │                  │
                      │                  ▼
                      │           ┌──────────────┐
                      │           │    Cache     │
                      │           │   Service    │
                      │           └──────────────┘
                      │
                      ▼
                ┌──────────────┐
                │ Observability│
                │  Middleware  │
                └──────────────┘
```

---

## 3. Stack Tecnológico

### 3.1 Dependencias de Producción

#### Framework y Runtime

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `fastify` | ^4.26.0 | Framework HTTP de alto rendimiento |
| `tsx` | ^4.7.1 | TypeScript runtime (desarrollo y producción) |
| `typescript` | ^5.3.3 | Tipado estático |

#### Base de Datos y ORM

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `@prisma/client` | ^5.10.0 | ORM con type-safety |
| `prisma` | ^5.10.0 | Migrations y schema management |
| `pg` | ^8.16.3 | Driver PostgreSQL nativo |

#### Inteligencia Artificial

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `openai` | ^4.28.0 | API oficial de OpenAI |
| `@langchain/openai` | ^0.0.19 | LangChain integration |
| `@langchain/anthropic` | ^0.1.3 | Soporte Claude (futuro) |
| `langchain` | ^0.1.25 | Chains y prompts |
| `@pinecone-database/pinecone` | ^2.0.0 | Vector database cloud |

#### Caché y Colas

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `ioredis` | ^5.8.2 | Cliente Redis de alto rendimiento |
| `redis` | ^4.6.13 | Cliente Redis oficial |
| `bullmq` | ^5.63.0 | Job queues distribuidas |
| `bull` | ^4.16.5 | Legacy job queue support |
| `node-cache` | ^5.1.2 | Caché en memoria L1 |

#### Autenticación y Seguridad

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `@fastify/jwt` | ^8.0.0 | JSON Web Tokens |
| `bcrypt` | ^5.1.1 | Password hashing |
| `speakeasy` | ^2.0.0 | 2FA TOTP generation |
| `qrcode` | ^1.5.4 | QR codes para 2FA |
| `passport` | ^0.7.0 | OAuth strategies |
| `passport-google-oauth20` | ^2.0.0 | Google OAuth |

#### Storage y Archivos

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `@aws-sdk/client-s3` | ^3.931.0 | AWS S3 operations |
| `@aws-sdk/lib-storage` | ^3.931.0 | Multipart uploads |
| `@aws-sdk/s3-request-presigner` | ^3.929.0 | Presigned URLs |
| `@fastify/multipart` | ^8.1.0 | File uploads |
| `pdf.js-extract` | ^0.2.1 | PDF text extraction |

#### Observabilidad

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `@opentelemetry/sdk-node` | ^0.208.0 | Telemetry SDK |
| `@opentelemetry/exporter-trace-otlp-http` | ^0.208.0 | Trace export |
| `@opentelemetry/exporter-metrics-otlp-http` | ^0.208.0 | Metrics export |
| `@opentelemetry/instrumentation-fastify` | ^0.53.0 | Auto-instrumentation |
| `prom-client` | ^15.1.3 | Prometheus metrics |
| `dd-trace` | ^5.77.0 | Datadog APM |

#### Utilidades

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `zod` | ^3.22.4 | Schema validation |
| `dotenv` | ^16.4.5 | Environment variables |
| `fuse.js` | ^7.1.0 | Fuzzy search |
| `node-cron` | ^4.2.1 | Scheduled tasks |
| `cron` | ^4.3.4 | Cron expressions |
| `nodemailer` | ^6.9.16 | Email sending |
| `@sendgrid/mail` | ^8.1.6 | SendGrid integration |

### 3.2 Dependencias de Desarrollo

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `vitest` | ^4.0.8 | Test runner moderno |
| `@vitest/ui` | ^4.0.8 | UI para tests |
| `ts-jest` | ^29.4.5 | Jest TypeScript support |
| `@types/node` | ^20.11.19 | Node.js types |
| `bun-types` | ^1.0.0 | Bun runtime types |

---

## 4. Backend - Análisis Detallado

### 4.1 Estructura de Directorios

```
src/
├── config/                    # Configuraciones centralizadas
│   ├── telemetry.ts          # OpenTelemetry setup
│   └── ...
├── middleware/               # Middleware de Fastify
│   ├── observability.middleware.ts
│   ├── prisma.middleware.ts
│   └── ...
├── routes/                   # Definición de endpoints (39 archivos)
│   ├── admin/               # Rutas administrativas
│   │   ├── audit.ts
│   │   ├── backup.routes.ts
│   │   ├── migration-embedded.ts
│   │   ├── plans.ts
│   │   ├── quotas.ts
│   │   ├── specialties.ts
│   │   └── users.ts
│   ├── observability/       # Métricas y health
│   │   ├── health.routes.ts
│   │   └── metrics.routes.ts
│   ├── advanced-search.ts   # Búsqueda avanzada
│   ├── ai-assistant.ts      # Asistente IA
│   ├── analytics.ts         # Analytics
│   ├── auth.ts              # Autenticación
│   ├── backup-sse.ts        # Server-Sent Events backup
│   ├── backup.ts            # Backup API
│   ├── billing.ts           # Facturación
│   ├── calendar.ts          # Calendario
│   ├── cases.ts             # Gestión de casos
│   ├── diagnostics.ts       # Diagnósticos
│   ├── documents.ts         # Documentos
│   ├── feedback.ts          # Feedback usuarios
│   ├── finance.ts           # Finanzas
│   ├── legal-documents-v2.ts
│   ├── legal-documents.ts
│   ├── nlp.ts               # NLP endpoints
│   ├── notifications-enhanced.ts
│   ├── oauth.ts             # OAuth
│   ├── payments.ts          # Pagos
│   ├── query.ts             # Queries RAG
│   ├── settings.ts          # Configuraciones
│   ├── subscription.ts      # Suscripciones
│   ├── tasks.ts             # Tareas
│   ├── two-factor.ts        # 2FA
│   ├── unified-search.ts    # Búsqueda unificada
│   ├── usage.ts             # Uso/consumo
│   └── user.ts              # Usuarios
├── services/                # Lógica de negocio (62 archivos)
│   ├── ai/                  # Servicios IA
│   │   ├── async-openai-service.ts
│   │   ├── legal-assistant.ts
│   │   └── openai-service.ts
│   ├── backup/              # Sistema de backup
│   │   ├── backup-compression.service.ts
│   │   ├── backup-database-export.service.ts
│   │   ├── backup-encryption.service.ts
│   │   ├── backup-notification.service.ts
│   │   ├── backup-restore.service.ts
│   │   ├── backup-scheduler.service.ts
│   │   ├── backup-storage.service.ts
│   │   ├── backup-worker.service.ts
│   │   └── backup.service.ts
│   ├── cache/               # Sistema de caché
│   │   ├── multi-tier-cache-service.ts
│   │   ├── query-cache.service.ts
│   │   └── redis-cache.service.ts
│   ├── citations/           # Citaciones legales
│   │   ├── citation-extractor.service.ts
│   │   ├── citation-parser.service.ts
│   │   ├── citation-validator.service.ts
│   │   └── pagerank.service.ts
│   ├── nlp/                 # Procesamiento lenguaje natural
│   │   ├── context-prompt-builder.ts
│   │   ├── filter-builder.ts
│   │   ├── legal-entity-dictionary.ts
│   │   ├── query-processor.ts
│   │   ├── query-transformation-service.ts
│   │   └── spell-checker.ts
│   ├── observability/       # Monitoreo
│   │   ├── alerting.service.ts
│   │   ├── health.service.ts
│   │   ├── metrics.service.ts
│   │   └── tracing.service.ts
│   ├── orchestration/       # Orquestación
│   │   └── unified-search-orchestrator.ts
│   ├── queue/               # Colas de trabajo
│   │   ├── ai-queue.service.ts
│   │   └── queue-manager.service.ts
│   ├── search/              # Motor de búsqueda
│   │   ├── advanced-search-engine.ts
│   │   ├── query-expansion.service.ts
│   │   ├── reranking-service.ts
│   │   └── spell-checker.ts
│   ├── embedding-service.ts
│   ├── legal-document-service.ts
│   ├── notification.service.ts
│   ├── pdf-service.ts
│   ├── search-service.ts
│   └── session.service.ts
├── types/                   # Definiciones TypeScript
│   ├── backup.types.ts
│   ├── citations.ts
│   ├── query-transformation.ts
│   └── ...
├── scripts/                 # Scripts de utilidad
│   └── generate-embeddings.ts
└── server.ts               # Entry point
```

### 4.2 Servidor Principal (server.ts)

#### Configuración de Plugins

```typescript
// Plugins registrados en orden
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'supersecret',
});

await app.register(multipart);

await app.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
});
```

#### Middleware de Observabilidad

```typescript
// Metrics automáticas en cada request
app.addHook('onRequest', requestMetricsMiddleware);
```

#### Rutas Registradas

| Prefijo | Módulo | Descripción |
|---------|--------|-------------|
| `/` | Root | Info del API |
| `/observability` | metrics, health | Prometheus, health checks |
| `/api/v1` | auth | Autenticación |
| `/api/v1` | two-factor | 2FA |
| `/api/v1` | oauth | OAuth Google |
| `/api/v1` | cases | Gestión de casos |
| `/api/v1` | documents | Documentos |
| `/api/v1` | query | Queries RAG |
| `/api/v1` | legal-documents | Biblioteca legal v1 |
| `/api/v1` | legal-documents-v2 | Biblioteca legal v2 |
| `/api/v1` | payments | Pagos |
| `/api/v1` | user | Usuarios |
| `/api/v1` | subscription | Suscripciones |
| `/api/v1` | usage | Consumo |
| `/api/v1` | billing | Facturación |
| `/api/v1` | settings | Configuraciones |
| `/api/v1` | calendar | Calendario |
| `/api/v1` | tasks | Tareas |
| `/api/v1` | notifications-enhanced | Notificaciones |
| `/api/v1` | finance | Finanzas |
| `/api/v1` | diagnostics | Diagnósticos |
| `/api/v1/admin` | users, specialties, audit, quotas, plans | Admin |
| `/api/admin` | backup, backup-sse | Sistema de backup |
| `/api/v1/feedback` | feedback | Retroalimentación |
| `/api/v1/search` | advanced-search | Búsqueda avanzada |
| `/api/v1/nlp` | nlp | NLP endpoints |
| `/api/v1` | ai-assistant | Asistente IA |
| `/api/v1` | analytics | Analytics |
| `/api/v1/unified-search` | unified-search | Búsqueda unificada |

### 4.3 Scripts NPM

```json
{
  "dev": "tsx watch src/server.ts",           // Desarrollo con hot-reload
  "build": "prisma generate && tsc",          // Build producción
  "start": "tsx src/server.ts",               // Start normal
  "start:prod": "node --loader ts-node/esm src/server.ts",
  "postinstall": "node scripts/resolve-failed-migrations.cjs",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:migrate:deploy": "prisma migrate deploy",
  "prisma:studio": "prisma studio",
  "seed:laws": "bun run scripts/seed-laws.ts",
  "add:admin": "node scripts/add-admin.cjs",
  "cleanup:duplicates": "tsx scripts/cleanup-duplicate-documents.ts",
  "generate:embeddings": "tsx src/scripts/generate-embeddings.ts",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui"
}
```

---

## 5. Base de Datos y Schema

### 5.1 Información General

| Característica | Valor |
|---------------|-------|
| **Motor** | PostgreSQL 14+ |
| **ORM** | Prisma 5.10.0 |
| **Extensiones** | pgvector (embeddings), uuid-ossp |
| **Líneas de Schema** | ~2,743 |
| **Modelos** | 50+ |
| **Enums** | 15+ |

### 5.2 Enumeraciones del Sistema Legal Ecuatoriano

#### NormType (Tipo de Norma)

```prisma
enum NormType {
  CONSTITUTIONAL_NORM          // Norma constitucional
  ORGANIC_LAW                  // Ley orgánica
  ORDINARY_LAW                 // Ley ordinaria
  ORGANIC_CODE                 // Código orgánico
  ORDINARY_CODE                // Código ordinario
  REGULATION_GENERAL           // Reglamento general
  REGULATION_EXECUTIVE         // Reglamento ejecutivo
  ORDINANCE_MUNICIPAL          // Ordenanza municipal
  ORDINANCE_METROPOLITAN       // Ordenanza metropolitana
  RESOLUTION_ADMINISTRATIVE    // Resolución administrativa
  RESOLUTION_JUDICIAL          // Resolución judicial
  ADMINISTRATIVE_AGREEMENT     // Acuerdo administrativo
  INTERNATIONAL_TREATY         // Tratado internacional
  JUDICIAL_PRECEDENT           // Precedente judicial
}
```

#### LegalHierarchy (Jerarquía Legal - Art. 425 Constitución Ecuador)

```prisma
enum LegalHierarchy {
  CONSTITUCION                    // Constitución de la República
  TRATADOS_INTERNACIONALES_DDHH   // Tratados DDHH
  LEYES_ORGANICAS                 // Leyes orgánicas
  LEYES_ORDINARIAS                // Leyes ordinarias
  CODIGOS_ORGANICOS               // Códigos orgánicos
  CODIGOS_ORDINARIOS              // Códigos ordinarios
  REGLAMENTOS                     // Reglamentos
  ORDENANZAS                      // Ordenanzas
  RESOLUCIONES                    // Resoluciones
  ACUERDOS_ADMINISTRATIVOS        // Acuerdos administrativos
}
```

#### PublicationType (Tipo de Publicación)

```prisma
enum PublicationType {
  REGISTRO_OFICIAL           // Registro Oficial
  SUPLEMENTO_RO              // Suplemento del Registro Oficial
  EDICION_ESPECIAL_RO        // Edición Especial
  GACETA_JUDICIAL            // Gaceta Judicial
  OTROS                      // Otros medios
}
```

### 5.3 Modelos Principales

#### User (Usuario)

```prisma
model User {
  id                    String    @id @default(cuid())
  email                 String    @unique
  password              String?
  name                  String?
  role                  String    @default("user")

  // OAuth
  googleId              String?   @unique
  googleAccessToken     String?
  googleRefreshToken    String?

  // 2FA
  twoFactorEnabled      Boolean   @default(false)
  twoFactorSecret       String?
  backupCodes           String[]

  // Perfil profesional
  profesionalProfile    String?
  specialtyId           String?
  licenseNumber         String?
  licenseState          String?
  licenseExpiration     DateTime?
  practiceAreas         String[]
  barAdmissions         String[]
  languages             String[]
  phone                 String?
  profileImage          String?
  timezone              String?
  theme                 String?

  // Preferencias
  emailNotifications    Boolean   @default(true)
  marketingEmails       Boolean   @default(false)

  // Relaciones (25+)
  cases                 Case[]
  documents             Document[]
  events                Event[]
  tasks                 Task[]
  payments              Payment[]
  invoices              Invoice[]
  subscription          Subscription?
  notifications         NotificationLog[]
  // ... más relaciones
}
```

#### LegalDocument (Documento Legal)

```prisma
model LegalDocument {
  id                    String          @id @default(cuid())

  // Identificación
  title                 String
  officialTitle         String?
  normType              NormType?
  hierarchy             LegalHierarchy?

  // Publicación
  publicationType       PublicationType?
  publicationNumber     String?
  publicationDate       DateTime?
  effectiveDate         DateTime?

  // Contenido
  content               String          @db.Text
  summary               String?
  keywords              String[]
  categories            String[]

  // Metadatos Ecuador
  issuingEntity         String?         // Entidad emisora
  jurisdiction          Jurisdiction?
  articleReferences     String[]
  legalReferences       String[]

  // Estado
  state                 DocumentState   @default(VIGENTE)
  isActive              Boolean         @default(true)

  // Embeddings (pgvector)
  embedding             Unsupported("vector(1536)")?

  // Relaciones
  chunks                LegalDocumentChunk[]
  citations             Citation[]
  summaries             DocumentSummary[]

  // Índices
  @@index([normType])
  @@index([hierarchy])
  @@index([state])
  @@index([publicationDate])
}
```

#### LegalDocumentChunk (Fragmento para RAG)

```prisma
model LegalDocumentChunk {
  id              String        @id @default(cuid())
  documentId      String
  document        LegalDocument @relation(fields: [documentId], references: [id])

  // Contenido
  content         String        @db.Text
  chunkIndex      Int

  // Metadata estructural
  articleNumber   String?
  sectionTitle    String?
  chapterTitle    String?
  bookTitle       String?

  // Embedding (1536 dimensiones - OpenAI ada-002)
  embedding       Unsupported("vector(1536)")?

  // Timestamps
  createdAt       DateTime      @default(now())

  @@index([documentId])
  @@index([articleNumber])
}
```

#### Case (Caso Legal)

```prisma
model Case {
  id              String      @id @default(cuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id])

  // Información del caso
  title           String
  description     String?
  caseNumber      String?
  status          String      @default("active")
  type            String?
  priority        String?     @default("medium")

  // Partes
  clientName      String?
  opposingParty   String?
  court           String?
  judge           String?

  // Fechas
  filingDate      DateTime?
  trialDate       DateTime?
  closedDate      DateTime?

  // Relaciones
  documents       Document[]
  events          Event[]
  tasks           Task[]
  queries         Query[]

  // Timestamps
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([userId])
  @@index([status])
}
```

### 5.4 Modelos de Búsqueda y Feedback

#### QueryHistory (Historial de Consultas)

```prisma
model QueryHistory {
  id              String    @id @default(cuid())
  userId          String
  query           String
  transformedQuery String?
  filters         Json?
  resultCount     Int?
  avgScore        Float?
  responseTime    Int?      // ms
  sessionId       String?
  successful      Boolean   @default(true)
  createdAt       DateTime  @default(now())

  @@index([userId])
  @@index([createdAt])
}
```

#### RelevanceFeedback (Retroalimentación de Relevancia)

```prisma
model RelevanceFeedback {
  id              String    @id @default(cuid())
  userId          String?
  queryId         String?
  documentId      String
  rating          Int       // 1-5
  isRelevant      Boolean?
  feedbackType    String?   // click, bookmark, explicit
  comment         String?
  createdAt       DateTime  @default(now())

  @@index([documentId])
  @@index([queryId])
}
```

### 5.5 Modelos Financieros

#### SubscriptionPlan

```prisma
model SubscriptionPlan {
  id                  String         @id @default(cuid())
  name                String
  description         String?
  price               Float
  interval            String         // monthly, yearly

  // Límites
  maxCases            Int?
  maxDocuments        Int?
  maxQueries          Int?
  maxStorage          Int?           // MB

  // Features
  features            String[]
  aiAssistantEnabled  Boolean        @default(false)
  advancedSearch      Boolean        @default(false)

  // Relaciones
  subscriptions       Subscription[]

  isActive            Boolean        @default(true)
}
```

#### Payment

```prisma
model Payment {
  id              String      @id @default(cuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id])

  amount          Float
  currency        String      @default("USD")
  status          String      // pending, completed, failed, refunded
  method          String?     // card, transfer, paypal

  // Referencias
  transactionId   String?
  subscriptionId  String?
  invoiceId       String?

  // Metadata
  metadata        Json?

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([userId])
  @@index([status])
}
```

### 5.6 Modelos de Calendario y Tareas

#### Event (Evento)

```prisma
model Event {
  id              String              @id @default(cuid())
  userId          String
  user            User                @relation(fields: [userId], references: [id])
  caseId          String?
  case            Case?               @relation(fields: [caseId], references: [id])

  title           String
  description     String?
  location        String?

  // Tiempo
  startTime       DateTime
  endTime         DateTime?
  allDay          Boolean             @default(false)

  // Tipo y estado
  eventType       String?             // hearing, meeting, deadline, reminder
  status          String              @default("scheduled")
  priority        String?

  // Recurrencia
  isRecurring     Boolean             @default(false)
  recurrenceRule  String?

  // Relaciones
  participants    EventParticipant[]
  reminders       EventReminder[]

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}
```

#### Task (Tarea)

```prisma
model Task {
  id              String              @id @default(cuid())
  userId          String
  user            User                @relation(fields: [userId], references: [id])
  caseId          String?
  case            Case?               @relation(fields: [caseId], references: [id])

  title           String
  description     String?

  // Estado
  status          String              @default("pending")
  priority        String?             @default("medium")

  // Fechas
  dueDate         DateTime?
  completedAt     DateTime?

  // Asignación
  assignedTo      String?

  // Subtareas
  checklist       TaskChecklistItem[]

  // Tracking
  estimatedTime   Int?                // minutos
  actualTime      Int?

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}
```

### 5.7 Modelos de Backup

```prisma
model Backup {
  id              String    @id @default(cuid())
  name            String
  type            String    // full, incremental, differential
  status          String    // pending, running, completed, failed

  // Storage
  storageProvider String    // local, s3
  storagePath     String?

  // Métricas
  sizeBytes       BigInt?
  tablesIncluded  String[]
  recordsCount    Json?

  // Compresión y encriptación
  compressed      Boolean   @default(false)
  encrypted       Boolean   @default(false)
  encryptionKey   String?

  // Tiempos
  startedAt       DateTime?
  completedAt     DateTime?

  // Scheduling
  scheduleId      String?
  schedule        BackupSchedule? @relation(fields: [scheduleId], references: [id])

  // Error handling
  errorMessage    String?
  retryCount      Int       @default(0)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model BackupSchedule {
  id              String    @id @default(cuid())
  name            String
  cronExpression  String
  backupType      String    // full, incremental
  enabled         Boolean   @default(true)

  // Retención
  retentionDays   Int       @default(30)
  maxBackups      Int?

  // Storage
  storageProvider String    @default("local")

  // Notificaciones
  notifyOnSuccess Boolean   @default(false)
  notifyOnFailure Boolean   @default(true)
  notifyEmails    String[]

  // Tracking
  lastRunAt       DateTime?
  nextRunAt       DateTime?

  backups         Backup[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

---

## 6. Frontend - Estructura y Componentes

### 6.1 Stack Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Next.js | 14.x | Framework React con App Router |
| React | 18.x | UI Library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling utility-first |
| shadcn/ui | Latest | Component library |
| React Query | - | Server state management |
| Zustand | - | Client state management |

### 6.2 Estructura de Páginas (31 páginas)

```
frontend/src/app/
├── (auth)/                          # Grupo de autenticación
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── forgot-password/page.tsx
├── account/                         # Gestión de cuenta
│   ├── billing/page.tsx
│   ├── profile/page.tsx
│   ├── security/page.tsx
│   ├── settings/page.tsx
│   └── subscription/page.tsx
├── admin/                           # Panel administrativo
│   ├── analytics/page.tsx
│   ├── backups/page.tsx
│   ├── legal-library/page.tsx
│   ├── plans/page.tsx
│   ├── quotas/page.tsx
│   ├── specialties/page.tsx
│   └── users/page.tsx
├── dashboard/                       # Dashboard principal
│   ├── page.tsx                     # Vista principal
│   ├── calendar/page.tsx            # Calendario
│   ├── cases/
│   │   ├── page.tsx                 # Lista de casos
│   │   ├── [id]/page.tsx            # Detalle de caso
│   │   └── new/page.tsx             # Nuevo caso
│   ├── documents/page.tsx           # Documentos
│   ├── finance/page.tsx             # Finanzas
│   ├── legal-search/page.tsx        # Búsqueda legal
│   ├── library/page.tsx             # Biblioteca
│   ├── notifications/page.tsx       # Notificaciones
│   ├── query/page.tsx               # Queries RAG
│   ├── settings/page.tsx            # Configuraciones
│   └── tasks/page.tsx               # Tareas
├── globals.css                      # Estilos globales
├── layout.tsx                       # Layout raíz
└── page.tsx                         # Landing page
```

### 6.3 Componentes Principales (28+ componentes)

```
frontend/src/components/
├── admin/                           # Componentes admin
│   ├── CreateBackupDialog.tsx
│   ├── CreateScheduleDialog.tsx
│   └── LegalDocumentUploadForm.tsx
├── calendar/                        # Calendario
│   ├── CalendarView.tsx
│   ├── EventDialog.tsx
│   └── MiniCalendar.tsx
├── case-detail/                     # Detalle de caso
│   ├── CaseDocuments.tsx
│   ├── CaseHeader.tsx
│   ├── CaseNotes.tsx
│   ├── CaseTimeline.tsx
│   └── RelatedCases.tsx
├── dashboard/                       # Dashboard
│   ├── AIInsightsPanel.tsx
│   ├── DashboardNav.tsx
│   ├── EnhancedCaseCard.tsx
│   ├── QuickActionsPanel.tsx
│   ├── QuickStatsCards.tsx
│   ├── RecentActivityFeed.tsx
│   └── UpcomingDeadlines.tsx
├── finance/                         # Finanzas
│   ├── AgreementForm.tsx
│   ├── InvoiceGenerator.tsx
│   └── PaymentTracker.tsx
├── tasks/                           # Tareas
│   ├── TaskBoard.tsx
│   ├── TaskCard.tsx
│   └── TaskFilters.tsx
├── ui/                              # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   ├── select.tsx
│   └── ...
└── PDFViewer.tsx                    # Visor de PDF
```

### 6.4 Hooks Personalizados

```
frontend/src/hooks/
├── use-auth.ts                      # Autenticación
├── use-cases.ts                     # Gestión de casos
├── use-documents.ts                 # Documentos
├── use-backup.ts                    # Sistema de backup
├── use-notifications.ts             # Notificaciones
├── use-realtime.ts                  # WebSocket/SSE
└── use-search.ts                    # Búsqueda
```

---

## 7. Sistema RAG y Vectores

### 7.1 Arquitectura del Pipeline RAG

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PIPELINE RAG COMPLETO                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 1: INGESTA DE DOCUMENTOS                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐   │
│  │   PDF/DOCX   │───▶│  Extracción  │───▶│   Chunking Jerárquico    │   │
│  │   Upload     │    │   de Texto   │    │   (Libro>Cap>Art>Sec)    │   │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘   │
│                                                       │                  │
│                                                       ▼                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    EXTRACCIÓN DE METADATOS                        │   │
│  │  • Número de artículo    • Referencias cruzadas                   │   │
│  │  • Título de sección     • Entidad emisora                        │   │
│  │  • Fecha publicación     • Tipo de norma                          │   │
│  │  • Jerarquía legal       • Estado (vigente/derogado)              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 2: GENERACIÓN DE EMBEDDINGS                                         │
│  ┌──────────────┐    ┌──────────────────┐    ┌─────────────────────┐    │
│  │    Chunk     │───▶│  OpenAI API      │───▶│    Vector 1536D     │    │
│  │   Content    │    │  ada-002         │    │   (Float32 Array)   │    │
│  └──────────────┘    └──────────────────┘    └─────────────────────┘    │
│                                                       │                  │
│                                              ┌────────┴────────┐         │
│                                              ▼                 ▼         │
│                                    ┌──────────────┐   ┌──────────────┐  │
│                                    │   pgvector   │   │   Pinecone   │  │
│                                    │  (Primary)   │   │   (Cloud)    │  │
│                                    └──────────────┘   └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 3: PROCESAMIENTO DE QUERY                                           │
│  ┌──────────────┐    ┌──────────────────┐    ┌─────────────────────┐    │
│  │ Query Usuario│───▶│ NLP Processing   │───▶│ Query Transformado  │    │
│  │  (Español)   │    │                  │    │                     │    │
│  └──────────────┘    └──────────────────┘    └─────────────────────┘    │
│                              │                                           │
│         ┌────────────────────┼────────────────────┐                     │
│         ▼                    ▼                    ▼                     │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐           │
│  │ Spell Check │    │ Entity       │    │ Query Expansion  │           │
│  │ (Fuse.js)   │    │ Recognition  │    │ (Sinónimos)      │           │
│  └─────────────┘    └──────────────┘    └──────────────────┘           │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                   EXTRACCIÓN DE FILTROS                           │   │
│  │  • Tipo de norma        • Rango de fechas                         │   │
│  │  • Jerarquía            • Entidad emisora                         │   │
│  │  • Jurisdicción         • Estado del documento                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 4: BÚSQUEDA HÍBRIDA                                                 │
│                                                                          │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐     │
│  │     BÚSQUEDA VECTORIAL      │    │      BÚSQUEDA TEXTUAL       │     │
│  │                             │    │                             │     │
│  │  • Similitud coseno        │    │  • Full-text PostgreSQL     │     │
│  │  • Top-K neighbors         │    │  • Fuzzy matching           │     │
│  │  • pgvector <=> operator   │    │  • Trigram similarity       │     │
│  └─────────────────────────────┘    └─────────────────────────────┘     │
│              │                                     │                     │
│              └─────────────┬───────────────────────┘                     │
│                            ▼                                             │
│              ┌─────────────────────────────┐                            │
│              │     RECIPROCAL RANK          │                            │
│              │     FUSION (RRF)             │                            │
│              │     Score = 1/(k + rank)     │                            │
│              └─────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 5: RE-RANKING Y SCORING                                             │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    FACTORES DE SCORING                            │   │
│  │                                                                   │   │
│  │  Relevancia Semántica     (40%)  │  Autoridad Legal    (25%)     │   │
│  │  ──────────────────────────────  │  ─────────────────────────    │   │
│  │  • Similitud de embedding        │  • Jerarquía normativa        │   │
│  │  • Match de keywords             │  • PageRank citations         │   │
│  │                                  │  • Entidad emisora            │   │
│  │                                  │                               │   │
│  │  Freshness               (20%)   │  Context Match     (15%)      │   │
│  │  ─────────────────────────────   │  ─────────────────────────    │   │
│  │  • Fecha de publicación          │  • Jurisdicción               │   │
│  │  • Última modificación           │  • Área de práctica           │   │
│  │  • Estado vigente                │  • Tipo de caso               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 6: GENERACIÓN DE RESPUESTA                                          │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    CONTEXT BUILDING                               │   │
│  │                                                                   │   │
│  │  Top-K Chunks ──▶ Dedup ──▶ Sort by Score ──▶ Token Limit Check  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                            │                                             │
│                            ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    GPT-4 PROMPT                                   │   │
│  │                                                                   │   │
│  │  System: Eres un asistente legal especializado en derecho        │   │
│  │          ecuatoriano...                                          │   │
│  │                                                                   │   │
│  │  Context: [Chunks relevantes con metadatos]                      │   │
│  │                                                                   │   │
│  │  Query: [Pregunta original del usuario]                          │   │
│  │                                                                   │   │
│  │  Instructions: Cita las fuentes, usa formato legal...            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                            │                                             │
│                            ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    RESPONSE + CITATIONS                           │   │
│  │                                                                   │   │
│  │  {                                                                │   │
│  │    "answer": "...",                                               │   │
│  │    "citations": [                                                 │   │
│  │      { "document": "COIP", "article": "Art. 140", ... }          │   │
│  │    ],                                                             │   │
│  │    "confidence": 0.92,                                            │   │
│  │    "sources": [...]                                               │   │
│  │  }                                                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Configuración de Vectores

#### pgvector (Primario)

```sql
-- Extensión
CREATE EXTENSION IF NOT EXISTS vector;

-- Índice HNSW para búsqueda eficiente
CREATE INDEX ON "LegalDocumentChunk"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Query de similitud
SELECT *, embedding <=> $1 AS distance
FROM "LegalDocumentChunk"
ORDER BY embedding <=> $1
LIMIT 10;
```

#### Pinecone (Cloud Backup)

```typescript
// Configuración
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.index('legal-documents');

// Upsert
await index.upsert([{
  id: chunkId,
  values: embedding,
  metadata: {
    documentId,
    articleNumber,
    normType,
    hierarchy,
  }
}]);

// Query
const results = await index.query({
  vector: queryEmbedding,
  topK: 10,
  includeMetadata: true,
  filter: {
    normType: { $eq: 'ORGANIC_LAW' }
  }
});
```

### 7.3 Chunking Jerárquico

```typescript
interface HierarchicalChunk {
  id: string;
  content: string;
  level: 'book' | 'title' | 'chapter' | 'section' | 'article';

  // Jerarquía
  bookTitle?: string;
  titleName?: string;
  chapterTitle?: string;
  sectionTitle?: string;
  articleNumber?: string;

  // Metadata
  startOffset: number;
  endOffset: number;
  tokenCount: number;

  // Referencias
  parentId?: string;
  childIds: string[];
}
```

---

## 8. Servicios de IA y NLP

### 8.1 Arquitectura de Servicios IA

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICIOS DE IA                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              openai-service.ts                            │   │
│  │  ────────────────────────────────────────────────────────│   │
│  │  • generateEmbedding(text)                               │   │
│  │  • generateCompletion(prompt, context)                   │   │
│  │  • streamCompletion(prompt, context)                     │   │
│  │  • analyzeDocument(content)                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           async-openai-service.ts                         │   │
│  │  ────────────────────────────────────────────────────────│   │
│  │  • Queue-based processing (BullMQ)                       │   │
│  │  • Retry logic with exponential backoff                  │   │
│  │  • Rate limiting (TPM/RPM)                               │   │
│  │  • Batch processing                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              legal-assistant.ts                           │   │
│  │  ────────────────────────────────────────────────────────│   │
│  │  • Specialized legal prompts                             │   │
│  │  • Ecuador law context                                   │   │
│  │  • Citation formatting                                   │   │
│  │  • Multi-turn conversation                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Servicios NLP

#### Query Processor (query-processor.ts)

```typescript
interface ProcessedQuery {
  original: string;
  normalized: string;
  corrected: string;
  expanded: string[];

  // Entidades extraídas
  entities: {
    type: 'ARTICLE' | 'LAW' | 'CODE' | 'DATE' | 'ENTITY' | 'PERSON';
    value: string;
    confidence: number;
  }[];

  // Filtros inferidos
  filters: {
    normType?: NormType[];
    hierarchy?: LegalHierarchy[];
    dateRange?: { from: Date; to: Date };
    issuingEntity?: string[];
    jurisdiction?: Jurisdiction;
  };

  // Intent
  intent: 'search' | 'explain' | 'compare' | 'cite' | 'summarize';
  confidence: number;
}
```

#### Legal Entity Dictionary (legal-entity-dictionary.ts)

```typescript
const LEGAL_ENTITIES = {
  // Códigos principales
  'COIP': { fullName: 'Código Orgánico Integral Penal', type: 'ORGANIC_CODE' },
  'COGEP': { fullName: 'Código Orgánico General de Procesos', type: 'ORGANIC_CODE' },
  'COOTAD': { fullName: 'Código Orgánico de Organización Territorial', type: 'ORGANIC_CODE' },

  // Entidades gubernamentales
  'Corte Constitucional': { type: 'JUDICIAL_ENTITY', jurisdiction: 'NACIONAL' },
  'Corte Nacional de Justicia': { type: 'JUDICIAL_ENTITY', jurisdiction: 'NACIONAL' },
  'Asamblea Nacional': { type: 'LEGISLATIVE_ENTITY' },

  // Abreviaturas comunes
  'Art.': { expanded: 'Artículo', type: 'REFERENCE' },
  'Inc.': { expanded: 'Inciso', type: 'REFERENCE' },
  'Num.': { expanded: 'Numeral', type: 'REFERENCE' },
};
```

#### Spell Checker (spell-checker.ts)

```typescript
import Fuse from 'fuse.js';

class LegalSpellChecker {
  private fuse: Fuse<string>;
  private legalTerms: string[] = [
    'jurisprudencia', 'prescripción', 'caducidad', 'litisconsorcio',
    'reconvención', 'allanamiento', 'desistimiento', 'contestación',
    // ... 500+ términos legales ecuatorianos
  ];

  correct(query: string): string {
    const words = query.split(/\s+/);
    return words.map(word => {
      const results = this.fuse.search(word);
      if (results.length > 0 && results[0].score! < 0.3) {
        return results[0].item;
      }
      return word;
    }).join(' ');
  }
}
```

### 8.3 Context Prompt Builder

```typescript
// context-prompt-builder.ts

interface PromptContext {
  systemPrompt: string;
  userQuery: string;
  relevantChunks: ChunkWithMetadata[];
  conversationHistory?: Message[];
}

const SYSTEM_PROMPT = `
Eres un asistente legal experto especializado en el sistema jurídico ecuatoriano.

INSTRUCCIONES:
1. Responde SOLO basándote en los documentos proporcionados
2. Cita las fuentes usando el formato: [Nombre del documento, Art. X]
3. Si no encuentras información relevante, indícalo claramente
4. Usa lenguaje técnico-jurídico apropiado
5. Considera la jerarquía normativa (Art. 425 Constitución)

JERARQUÍA NORMATIVA ECUADOR:
1. Constitución de la República
2. Tratados internacionales de DDHH
3. Leyes orgánicas
4. Leyes ordinarias
5. Normas regionales y ordenanzas distritales
6. Decretos y reglamentos
7. Ordenanzas
8. Acuerdos y resoluciones
9. Demás actos de poderes públicos

FORMATO DE RESPUESTA:
- Respuesta directa y concisa
- Fundamento legal con citas
- Advertencias o consideraciones adicionales si aplica
`;
```

---

## 9. Sistema de Caché Multi-Nivel

### 9.1 Arquitectura de Caché

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE CACHÉ MULTI-NIVEL                          │
└─────────────────────────────────────────────────────────────────────────┘

          Request
             │
             ▼
    ┌────────────────┐     HIT     ┌────────────────────────────────────┐
    │   L1: Memory   │────────────▶│  Return cached response (< 1ms)    │
    │   (node-cache) │             └────────────────────────────────────┘
    │   TTL: 5 min   │
    │   Size: 100MB  │
    └────────┬───────┘
             │ MISS
             ▼
    ┌────────────────┐     HIT     ┌────────────────────────────────────┐
    │   L2: Redis    │────────────▶│  Return + Populate L1 (< 10ms)     │
    │   (ioredis)    │             └────────────────────────────────────┘
    │   TTL: 15 min  │
    │   Size: 1GB    │
    └────────┬───────┘
             │ MISS
             ▼
    ┌────────────────┐     HIT     ┌────────────────────────────────────┐
    │  L3: Pinecone  │────────────▶│  Return + Populate L1, L2          │
    │  (Vectors)     │             └────────────────────────────────────┘
    │   Persistent   │
    └────────┬───────┘
             │ MISS
             ▼
    ┌────────────────┐
    │   Database     │─────────────▶ Generate + Store in all levels
    │  (PostgreSQL)  │
    └────────────────┘
```

### 9.2 Implementación Multi-Tier

```typescript
// multi-tier-cache-service.ts

interface CacheConfig {
  l1: {
    maxKeys: number;      // 10000
    stdTTL: number;       // 300 (5 min)
    checkperiod: number;  // 60
  };
  l2: {
    ttl: number;          // 900 (15 min)
    prefix: string;       // 'legal-rag:'
  };
  l3: {
    enabled: boolean;
    namespace: string;
  };
}

class MultiTierCache {
  private l1: NodeCache;
  private l2: Redis;
  private l3?: PineconeIndex;

  async get<T>(key: string): Promise<T | null> {
    // L1 check
    const l1Result = this.l1.get<T>(key);
    if (l1Result) {
      metrics.cacheHit('l1');
      return l1Result;
    }

    // L2 check
    const l2Result = await this.l2.get(this.prefixKey(key));
    if (l2Result) {
      const parsed = JSON.parse(l2Result) as T;
      this.l1.set(key, parsed); // Populate L1
      metrics.cacheHit('l2');
      return parsed;
    }

    metrics.cacheMiss();
    return null;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    // Set in all levels
    this.l1.set(key, value, options?.ttl);
    await this.l2.setex(
      this.prefixKey(key),
      options?.ttl || this.config.l2.ttl,
      JSON.stringify(value)
    );
  }
}
```

### 9.3 Query Cache Service

```typescript
// query-cache.service.ts

interface CachedQuery {
  query: string;
  queryHash: string;
  results: SearchResult[];
  metadata: {
    filters: QueryFilters;
    timestamp: Date;
    hitCount: number;
    avgResponseTime: number;
  };
}

class QueryCacheService {
  // Cache queries normalizados para mejor hit rate
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }

  async getCachedResults(query: string, filters: QueryFilters): Promise<SearchResult[] | null> {
    const cacheKey = this.buildCacheKey(query, filters);
    return this.cache.get(cacheKey);
  }

  async cacheResults(query: string, filters: QueryFilters, results: SearchResult[]): Promise<void> {
    const cacheKey = this.buildCacheKey(query, filters);
    await this.cache.set(cacheKey, results, { ttl: 300 }); // 5 min
  }
}
```

---

## 10. Observabilidad y Monitoreo

### 10.1 Stack de Observabilidad

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   METRICS       │    │    TRACING      │    │    LOGGING      │
│                 │    │                 │    │                 │
│  prom-client    │    │  OpenTelemetry  │    │  Fastify Logger │
│  └── Prometheus │    │  └── Jaeger     │    │  └── Pino       │
│      └── Grafana│    │      └── Datadog│    │      └── Datadog│
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │      ALERTING         │
                    │                       │
                    │  • Slack              │
                    │  • Email (SendGrid)   │
                    │  • PagerDuty          │
                    └───────────────────────┘
```

### 10.2 Métricas Implementadas

```typescript
// metrics.service.ts

const metrics = {
  // Request metrics
  httpRequestsTotal: new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
  }),

  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'route'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  }),

  // RAG Pipeline metrics
  ragQueryDuration: new Histogram({
    name: 'rag_query_duration_seconds',
    help: 'RAG query processing time',
    labelNames: ['stage'], // embedding, search, rerank, generation
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  }),

  ragResultsReturned: new Histogram({
    name: 'rag_results_returned',
    help: 'Number of results returned',
    buckets: [0, 1, 5, 10, 20, 50],
  }),

  // Cache metrics
  cacheHitsTotal: new Counter({
    name: 'cache_hits_total',
    help: 'Cache hit count',
    labelNames: ['level'], // l1, l2, l3
  }),

  cacheMissesTotal: new Counter({
    name: 'cache_misses_total',
    help: 'Cache miss count',
  }),

  // Database metrics
  dbQueryDuration: new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.01, 0.1, 0.5, 1, 5],
  }),

  // AI metrics
  openaiTokensUsed: new Counter({
    name: 'openai_tokens_total',
    help: 'OpenAI tokens consumed',
    labelNames: ['model', 'type'], // prompt, completion
  }),

  openaiRequestDuration: new Histogram({
    name: 'openai_request_duration_seconds',
    help: 'OpenAI API request duration',
    labelNames: ['model', 'operation'],
  }),
};
```

### 10.3 Health Checks

```typescript
// health.service.ts

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  version: string;
  uptime: number;

  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    openai: ComponentHealth;
    s3: ComponentHealth;
    pinecone: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latency: number;
  lastCheck: Date;
  message?: string;
}

class HealthService {
  async checkAll(): Promise<HealthStatus> {
    const [db, redis, openai, s3, pinecone] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkOpenAI(),
      this.checkS3(),
      this.checkPinecone(),
    ]);

    const allHealthy = [db, redis, openai, s3, pinecone]
      .every(r => r.status === 'fulfilled' && r.value.status === 'up');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: this.extractResult(db),
        redis: this.extractResult(redis),
        openai: this.extractResult(openai),
        s3: this.extractResult(s3),
        pinecone: this.extractResult(pinecone),
      },
    };
  }
}
```

### 10.4 Endpoints de Observabilidad

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/observability/metrics` | GET | Prometheus metrics |
| `/observability/health` | GET | Health check completo |
| `/observability/health/live` | GET | Liveness probe (K8s) |
| `/observability/health/ready` | GET | Readiness probe (K8s) |

---

## 11. Sistema de Backup

### 11.1 Arquitectura del Sistema de Backup

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BACKUP MANAGEMENT SYSTEM                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTROL PLANE                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │ backup.service   │  │ backup-scheduler │  │ backup-worker    │       │
│  │                  │  │                  │  │                  │       │
│  │ • Create backup  │  │ • Cron jobs      │  │ • BullMQ jobs    │       │
│  │ • List backups   │  │ • Retention      │  │ • Parallel exec  │       │
│  │ • Delete backup  │  │ • Auto-cleanup   │  │ • Progress track │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       DATA PROCESSING                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │ database-export  │  │ compression      │  │ encryption       │       │
│  │                  │  │                  │  │                  │       │
│  │ • pg_dump        │  │ • gzip           │  │ • AES-256-GCM    │       │
│  │ • Streaming      │  │ • Stream-based   │  │ • Key rotation   │       │
│  │ • Progress %     │  │ • Level config   │  │ • IV per backup  │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         STORAGE LAYER                                    │
│  ┌────────────────────────────┐  ┌────────────────────────────┐         │
│  │     LOCAL STORAGE          │  │        AWS S3              │         │
│  │                            │  │                            │         │
│  │  /backups/                 │  │  s3://bucket/backups/      │         │
│  │   ├── full/                │  │   ├── full/                │         │
│  │   ├── incremental/         │  │   ├── incremental/         │         │
│  │   └── differential/        │  │   └── differential/        │         │
│  └────────────────────────────┘  └────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       NOTIFICATION LAYER                                 │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │              backup-notification.service                      │       │
│  │                                                               │       │
│  │  • Email (SendGrid/Nodemailer)   • Slack webhooks            │       │
│  │  • Success/Failure alerts        • Progress updates (SSE)    │       │
│  └──────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Tipos de Backup

| Tipo | Descripción | Frecuencia Recomendada |
|------|-------------|------------------------|
| **Full** | Backup completo de todas las tablas | Semanal |
| **Incremental** | Solo cambios desde el último backup | Diario |
| **Differential** | Cambios desde el último full backup | Cada 3 días |

### 11.3 API de Backup

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/admin/backups` | GET | Listar todos los backups |
| `/api/admin/backups` | POST | Crear nuevo backup |
| `/api/admin/backups/:id` | GET | Obtener detalles de backup |
| `/api/admin/backups/:id` | DELETE | Eliminar backup |
| `/api/admin/backups/:id/restore` | POST | Restaurar backup |
| `/api/admin/backups/:id/download` | GET | Descargar backup |
| `/api/admin/backup-schedules` | GET | Listar schedules |
| `/api/admin/backup-schedules` | POST | Crear schedule |
| `/api/admin/backups/stream` | GET (SSE) | Progress en tiempo real |

### 11.4 Configuración de Retención

```typescript
interface RetentionPolicy {
  daily: number;    // Mantener últimos N backups diarios
  weekly: number;   // Mantener últimos N backups semanales
  monthly: number;  // Mantener últimos N backups mensuales
  maxAge: number;   // Eliminar backups más antiguos de N días
}

const DEFAULT_RETENTION: RetentionPolicy = {
  daily: 7,
  weekly: 4,
  monthly: 12,
  maxAge: 365,
};
```

---

## 12. Seguridad y Autenticación

### 12.1 Capas de Seguridad

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       SECURITY LAYERS                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: NETWORK                                                        │
│  ─────────────────────────────────────────────────────────────────────  │
│  • HTTPS/TLS 1.3 (via Render)                                           │
│  • CORS configuration                                                    │
│  • Rate limiting (100 req/15min)                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: AUTHENTICATION                                                 │
│  ─────────────────────────────────────────────────────────────────────  │
│  • JWT (HS256, 24h expiry)                                              │
│  • OAuth 2.0 (Google)                                                   │
│  • 2FA TOTP (speakeasy)                                                 │
│  • Backup codes (10 codes, one-time use)                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 3: AUTHORIZATION                                                  │
│  ─────────────────────────────────────────────────────────────────────  │
│  • Role-based access (user, admin, superadmin)                          │
│  • Resource ownership validation                                         │
│  • Subscription tier restrictions                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 4: DATA PROTECTION                                                │
│  ─────────────────────────────────────────────────────────────────────  │
│  • Password hashing (bcrypt, cost=10)                                   │
│  • Backup encryption (AES-256-GCM)                                      │
│  • PII field encryption (at-rest)                                       │
│  • Audit logging                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Flujo de Autenticación

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │────▶│ Validate │────▶│  Check   │────▶│  Issue   │
│ Request  │     │ Password │     │   2FA    │     │   JWT    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                      │                │                │
                      │                │                │
              ┌───────▼───────┐  ┌────▼─────┐    ┌─────▼─────┐
              │   bcrypt      │  │  TOTP    │    │  Sign     │
              │   compare     │  │  verify  │    │  payload  │
              │   (cost=10)   │  │  (30s)   │    │  (HS256)  │
              └───────────────┘  └──────────┘    └───────────┘
```

### 12.3 Configuración JWT

```typescript
// JWT Configuration
const jwtConfig = {
  secret: process.env.JWT_SECRET,
  sign: {
    algorithm: 'HS256',
    expiresIn: '24h',
  },
  verify: {
    algorithms: ['HS256'],
  },
};

// Token payload
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  subscriptionTier?: string;
  iat: number;
  exp: number;
}
```

### 12.4 Configuración 2FA

```typescript
// speakeasy configuration
const totpConfig = {
  name: 'Legal RAG System',
  issuer: 'Legal RAG',
  encoding: 'base32',
  digits: 6,
  step: 30, // 30 segundos
  window: 1, // Permite 1 código anterior/posterior
};

// Backup codes (generados al activar 2FA)
const generateBackupCodes = (): string[] => {
  return Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );
};
```

---

## 13. Problemas Críticos Identificados

### 13.1 Issues Bloqueantes (Prioridad: CRÍTICA)

#### Issue #1: OpenTelemetry Deshabilitado en Producción

**Archivo:** `src/server.ts:1-5`

```typescript
// TEMPORARILY DISABLED: Path resolution issue in Render deployment
// import { initializeTelemetry } from './config/telemetry.js';
// initializeTelemetry();
```

**Impacto:**
- Sin distributed tracing en producción
- Métricas OpenTelemetry no disponibles
- Dificulta debugging de issues de performance

**Causa Raíz:**
- Error de resolución de path en el entorno de Render
- Posible incompatibilidad con ESM modules

**Solución Propuesta:**
```typescript
// telemetry.ts - Fix path resolution
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use absolute paths
const configPath = resolve(__dirname, './config');
```

---

#### Issue #2: Rutas Deshabilitadas por Dependencias

**Archivo:** `src/server.ts:22-25, 140-141, 145-146`

```typescript
// TEMPORARILY DISABLED: nodemailer import issue causing deployment failure
// import { legalDocumentRoutesEnhanced } from './routes/legal-documents-enhanced.js';

// TEMPORARILY DISABLED: Missing fastify-multer dependency
// import { documentRoutesEnhanced } from './routes/documents-enhanced.js';
```

**Impacto:**
- Funcionalidades enhanced de documentos no disponibles
- Upload mejorado de documentos inactivo
- Notificaciones por email de documentos legales deshabilitadas

**Solución Propuesta:**
```bash
# Instalar dependencia faltante
npm install fastify-multer

# Verificar imports de nodemailer
npm ls nodemailer
```

---

#### Issue #3: Schema Mismatch en Unified Search Orchestrator

**Archivo:** `src/services/orchestration/unified-search-orchestrator.ts`

**Problema:**
El campo `summaries` se trata como un campo de texto pero es una relación en el schema Prisma.

**Schema Actual:**
```prisma
model LegalDocument {
  summaries DocumentSummary[]  // Relación, no texto
}
```

**Código Problemático:**
```typescript
// Intento de acceder a summaries como string
const summary = document.summaries; // ERROR: Es un array de relaciones
```

**Solución Propuesta:**
```typescript
// Obtener el resumen más reciente
const latestSummary = document.summaries
  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
const summaryText = latestSummary?.content || '';
```

---

### 13.2 Issues de Alta Prioridad

#### Issue #4: Rate Limiting Global Insuficiente

**Configuración Actual:**
```typescript
await app.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
});
```

**Problema:**
- Mismo límite para todos los endpoints
- No diferencia entre operaciones costosas (AI) y ligeras (health)
- Vulnerable a abuse de endpoints costosos

**Solución Propuesta:**
```typescript
// Rate limiting por ruta
const rateLimitConfigs = {
  '/api/v1/query': { max: 20, timeWindow: '15 minutes' },
  '/api/v1/ai-assistant': { max: 10, timeWindow: '15 minutes' },
  '/api/v1/auth': { max: 5, timeWindow: '1 minute' },
  default: { max: 100, timeWindow: '15 minutes' },
};
```

---

#### Issue #5: JWT Secret Hardcodeado como Fallback

**Archivo:** `src/server.ts:74`

```typescript
await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'supersecret', // ⚠️ Fallback inseguro
});
```

**Riesgo:**
- Si `JWT_SECRET` no está configurado, usa valor predecible
- Potencial vulnerabilidad de seguridad en producción

**Solución Propuesta:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

await app.register(jwt, { secret: JWT_SECRET });
```

---

### 13.3 Issues de Media Prioridad

| Issue | Archivo | Descripción | Impacto |
|-------|---------|-------------|---------|
| CORS wildcard | server.ts:69 | `origin: '*'` en producción | Seguridad media |
| Missing indexes | schema.prisma | Falta índice en `QueryHistory.userId` | Performance |
| No connection pooling | prisma config | Single connection por query | Escalabilidad |
| Unused dependencies | package.json | `bun-types` instalado pero no usado | Bundle size |

---

## 14. Métricas de Calidad

### 14.1 Cobertura de Código

| Módulo | Tests | Cobertura Est. | Estado |
|--------|-------|----------------|--------|
| Auth | 45 | 85% | 🟢 |
| RAG Pipeline | 62 | 75% | 🟢 |
| Cases | 38 | 70% | 🟡 |
| Documents | 25 | 65% | 🟡 |
| Backup | 30 | 80% | 🟢 |
| NLP | 28 | 70% | 🟡 |
| **Total** | **228** | **~74%** | 🟡 |

### 14.2 Complejidad del Código

| Métrica | Valor | Benchmark | Estado |
|---------|-------|-----------|--------|
| Líneas de código (Backend) | ~25,000 | - | - |
| Líneas de código (Frontend) | ~15,000 | - | - |
| Archivos TypeScript | 130+ | - | - |
| Complejidad ciclomática promedio | ~8 | <10 | 🟢 |
| Profundidad de anidamiento max | 5 | <6 | 🟢 |
| Duplicación de código | ~3% | <5% | 🟢 |

### 14.3 Rendimiento Estimado

| Operación | P50 | P95 | P99 | Target |
|-----------|-----|-----|-----|--------|
| Health check | 5ms | 15ms | 30ms | <50ms |
| Auth login | 150ms | 300ms | 500ms | <500ms |
| RAG query (cached) | 50ms | 150ms | 300ms | <200ms |
| RAG query (cold) | 2s | 4s | 6s | <5s |
| Document upload | 500ms | 1.5s | 3s | <3s |
| Embedding generation | 200ms | 400ms | 600ms | <500ms |

---

## 15. Recomendaciones

### 15.1 Inmediatas (0-2 semanas)

1. **Habilitar OpenTelemetry**
   - Prioridad: CRÍTICA
   - Esfuerzo: 2-4 horas
   - Fix: Resolver path resolution en `telemetry.ts`

2. **Instalar dependencias faltantes**
   - Prioridad: ALTA
   - Esfuerzo: 1 hora
   - Action: `npm install fastify-multer`

3. **Eliminar JWT fallback inseguro**
   - Prioridad: ALTA
   - Esfuerzo: 30 minutos
   - Action: Throw error si `JWT_SECRET` no está definido

4. **Fix schema mismatch en unified-search**
   - Prioridad: ALTA
   - Esfuerzo: 2 horas
   - Action: Corregir acceso a relación `summaries`

### 15.2 Corto Plazo (2-4 semanas)

1. **Implementar rate limiting granular**
   - Diferentes límites por endpoint
   - Proteger endpoints costosos (AI, embeddings)

2. **Agregar connection pooling**
   - Configurar PgBouncer o usar Prisma connection pool
   - Optimizar para 100+ conexiones concurrentes

3. **Mejorar logging estructurado**
   - Agregar correlation IDs
   - Implementar log levels por ambiente

4. **Implementar circuit breaker**
   - Para llamadas a OpenAI
   - Para conexiones a Redis/Pinecone

### 15.3 Mediano Plazo (1-2 meses)

1. **Migrar a arquitectura serverless**
   - Evaluar AWS Lambda + API Gateway
   - Reducir costos de idle time

2. **Implementar CDC (Change Data Capture)**
   - Para sincronización en tiempo real
   - Integrar con sistema de eventos

3. **Agregar A/B testing para RAG**
   - Probar diferentes estrategias de reranking
   - Optimizar prompts de GPT-4

4. **Implementar feature flags**
   - Control de releases granular
   - Rollback rápido de features

---

## 16. Roadmap de Mejoras

### Q1 2025

| Semana | Iniciativa | Objetivo |
|--------|-----------|----------|
| 1-2 | Fix Critical Issues | Resolver 3 issues bloqueantes |
| 3-4 | Performance Optimization | Reducir P95 de RAG query a <3s |
| 5-6 | Security Hardening | Implementar todas las recomendaciones de seguridad |
| 7-8 | Monitoring Enhancement | Dashboard completo de observabilidad |
| 9-10 | Test Coverage | Aumentar cobertura a 85% |
| 11-12 | Documentation | API docs con OpenAPI 3.0 |

### Q2 2025

| Mes | Iniciativa | Objetivo |
|-----|-----------|----------|
| Abril | Multi-tenancy | Soporte para múltiples organizaciones |
| Mayo | Advanced Analytics | Dashboard de métricas de uso |
| Junio | Mobile App | React Native companion app |

---

## Apéndices

### A. Variables de Entorno Requeridas

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Authentication
JWT_SECRET=<random-256-bit-key>
GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-client-secret>

# AI Services
OPENAI_API_KEY=<openai-key>
PINECONE_API_KEY=<pinecone-key>
PINECONE_ENVIRONMENT=<pinecone-env>

# Storage
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
AWS_S3_BUCKET=<bucket-name>
AWS_REGION=us-east-1

# Cache
REDIS_URL=redis://localhost:6379

# Email
SENDGRID_API_KEY=<sendgrid-key>

# Observability
DATADOG_API_KEY=<dd-key>
OTEL_EXPORTER_OTLP_ENDPOINT=<otlp-endpoint>

# App Config
PORT=8000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.com
```

### B. Comandos de Operación

```bash
# Desarrollo
npm run dev                    # Start con hot-reload
npm run prisma:studio          # GUI de base de datos

# Build y deploy
npm run build                  # Compilar TypeScript
npm run prisma:migrate:deploy  # Aplicar migraciones

# Testing
npm run test                   # Ejecutar tests
npm run test:ui                # UI de Vitest

# Mantenimiento
npm run cleanup:duplicates     # Limpiar documentos duplicados
npm run generate:embeddings    # Regenerar embeddings
npm run add:admin              # Crear usuario admin
```

### C. Estructura de Respuesta API Estándar

```typescript
// Success Response
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Error Response
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

---

**Documento generado automáticamente**
**Última actualización:** 8 de Diciembre, 2025
**Versión del sistema analizado:** 1.0.0
