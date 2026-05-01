# 📋 Arquitectura Completa del Sistema Legal RAG
## Poweria Legal - Sistema de Gestión Jurídica con IA

**Fecha de Documento**: 11 de Noviembre de 2025
**Versión**: 1.0.0
**Última Actualización**: 11-11-2025

---

## 🎯 Resumen Ejecutivo

**Poweria Legal** es un sistema integral de gestión jurídica que combina inteligencia artificial con gestión de casos legales, análisis documental avanzado, RAG (Retrieval-Augmented Generation), y herramientas colaborativas para abogados y firmas legales.

### Características Principales

- ✅ **Sistema RAG Completo**: Búsqueda semántica con vectorización de documentos legales
- ✅ **Gestión de Casos**: Sistema completo de administración de casos jurídicos
- ✅ **Análisis Documental con IA**: Extracción automática de artículos, secciones y resúmenes
- ✅ **Calendario y Tareas**: Sistema de eventos, recordatorios y gestión de tareas
- ✅ **Sistema Financiero**: Facturación, pagos, acuerdos y control financiero
- ✅ **Panel de Administración**: Gestión global de documentos legales
- ✅ **Autenticación Multi-Factor**: OAuth2, Google Sign-In, 2FA con TOTP
- ✅ **Notificaciones**: Sistema de notificaciones push y email
- ✅ **Planes de Suscripción**: Free, Basic, Professional, Team

---

## 📁 Estructura del Proyecto

```
C:\Users\benito\poweria\legal\
│
├── 📂 frontend/                      # Frontend Next.js
│   ├── src/
│   │   ├── app/                      # App Router (Next.js 14+)
│   │   ├── components/               # Componentes React
│   │   └── lib/                      # Utilidades y configuraciones
│   ├── public/                       # Archivos estáticos
│   ├── next.config.mjs               # Configuración Next.js
│   ├── tailwind.config.ts            # Configuración Tailwind CSS
│   └── package.json
│
├── 📂 src/                           # Backend Node.js/TypeScript
│   ├── routes/                       # Rutas API REST
│   │   ├── admin/                    # Rutas de administración
│   │   ├── auth.ts                   # Autenticación
│   │   ├── oauth.ts                  # OAuth2/Google
│   │   ├── two-factor.ts             # 2FA
│   │   ├── cases.ts                  # Gestión de casos
│   │   ├── documents.ts              # Documentos de casos
│   │   ├── documents-enhanced.ts     # Documentos con análisis IA
│   │   ├── legal-documents.ts        # Documentos legales globales
│   │   ├── legal-documents-v2.ts     # API v2 mejorada
│   │   ├── legal-documents-enhanced.ts # Documentos con RAG
│   │   ├── calendar.ts               # Eventos y calendario
│   │   ├── tasks.ts                  # Gestión de tareas
│   │   ├── finance.ts                # Sistema financiero
│   │   ├── payments.ts               # Pagos
│   │   ├── billing.ts                # Facturación
│   │   ├── notifications-enhanced.ts # Notificaciones
│   │   ├── query.ts                  # Consultas RAG
│   │   ├── settings.ts               # Configuraciones usuario
│   │   ├── subscription.ts           # Gestión de suscripciones
│   │   ├── usage.ts                  # Métricas de uso
│   │   ├── user.ts                   # Perfil de usuario
│   │   └── diagnostics.ts            # Diagnósticos del sistema
│   │
│   ├── services/                     # Lógica de negocio
│   │   ├── documentAnalyzer.ts       # Análisis de documentos con IA
│   │   ├── documentRegistry.ts       # Registro de documentos
│   │   ├── legal-document-service.ts # Servicios documentos legales
│   │   ├── emailService.ts           # Envío de emails
│   │   ├── notificationService.ts    # Sistema de notificaciones
│   │   └── queryRouter.ts            # Enrutamiento de consultas RAG
│   │
│   ├── middleware/                   # Middlewares
│   │   ├── auth.ts                   # Validación JWT
│   │   ├── rateLimit.ts              # Rate limiting
│   │   └── validation.ts             # Validación de datos
│   │
│   ├── utils/                        # Utilidades
│   │   ├── vectorization.ts          # Embeddings OpenAI
│   │   ├── pdfExtractor.ts           # Extracción de texto PDF
│   │   └── logger.ts                 # Sistema de logs
│   │
│   ├── types/                        # Definiciones TypeScript
│   └── server.ts                     # Punto de entrada del backend
│
├── 📂 prisma/                        # Prisma ORM
│   ├── migrations/                   # Migraciones de base de datos
│   │   ├── 20250111_calendar_tasks_notifications_finance/
│   │   ├── 20250111_fix_notes_columns/
│   │   └── ... (11 migraciones totales)
│   └── schema.prisma                 # Schema de base de datos
│
├── 📂 scripts/                       # Scripts de utilidad
│   ├── add-admin.cjs                 # Crear usuarios admin
│   ├── resolve-failed-migrations.cjs # Resolver migraciones fallidas
│   ├── resolve-notes-migration.cjs   # Script auxiliar migraciones
│   ├── seed-laws.ts                  # Seed documentos legales
│   └── cleanup-duplicate-documents.ts # Limpieza de duplicados
│
├── 📂 docs/                          # Documentación técnica
│
├── 📄 .env.example                   # Variables de entorno ejemplo
├── 📄 package.json                   # Dependencias backend
├── 📄 tsconfig.json                  # Configuración TypeScript
├── 📄 .gitignore                     # Archivos ignorados por Git
└── 📄 README.md                      # Documentación principal

```

---

## 🏗️ Arquitectura del Sistema

### 1. **Arquitectura General**

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTE / USUARIO                          │
│                         (Navegador Web)                             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND - Next.js 14                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │  App Router  │  │  Components  │  │  Client Components      │  │
│  │   (SSR/SSG)  │  │    (React)   │  │  (Interactive UI)       │  │
│  └──────────────┘  └──────────────┘  └─────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  TailwindCSS + Shadcn/ui + Lucide Icons                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ REST API
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   BACKEND API - Node.js + Fastify                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     Authentication Layer                     │  │
│  │  JWT + OAuth2 + Google Sign-In + 2FA (TOTP)                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     API Routes (REST)                        │  │
│  │  /api/v1/auth | /cases | /documents | /legal-documents      │  │
│  │  /calendar | /tasks | /finance | /query | /notifications    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Business Logic Layer                      │  │
│  │  Services: Document Analyzer | Query Router | Email         │  │
│  │  Legal Document Service | Notification Service              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────┬────────────────┬─────────────────┬────────────────┬───────────┘
     │                │                 │                │
     ▼                ▼                 ▼                ▼
┌─────────┐  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐
│PostgreSQL│  │   OpenAI API  │  │  Redis Cloud  │  │  SendGrid    │
│ (Render) │  │  (Embeddings) │  │   (Caching)   │  │   (Email)    │
│ pgvector │  │   (GPT-4)     │  │   (Queue)     │  │              │
└─────────┘  └──────────────┘  └───────────────┘  └──────────────┘
```

---

## 🗄️ Base de Datos - PostgreSQL + pgvector

### Tecnologías
- **PostgreSQL 16** (Render Cloud)
- **Prisma ORM 5.10.0**
- **pgvector Extension** para búsqueda semántica

### Modelos Principales

#### 1. **User** - Gestión de Usuarios
```typescript
model User {
  id            String    // UUID
  email         String    @unique
  name          String?
  passwordHash  String?   // bcrypt
  role          String    @default("user") // user | admin
  planTier      String    @default("free") // free | basic | professional | team
  isActive      Boolean   @default(true)

  // OAuth
  provider      String    @default("local") // local | google
  googleId      String?   @unique

  // 2FA
  twoFactorEnabled     Boolean   @default(false)
  twoFactorSecret      String?   // TOTP secret
  twoFactorBackupCodes String[]

  // Professional Details
  barNumber      String?  // Número de colegiado
  lawFirm        String?  // Firma legal
  specialization String?  // Especialización

  // Relations
  cases                 Case[]
  documents             Document[]
  legalDocuments        LegalDocument[]
  events                Event[]
  tasks                 Task[]
  notifications         Notification[]
  invoices              InvoiceFinance[]
  payments              PaymentFinance[]
}
```

#### 2. **Case** - Gestión de Casos
```typescript
model Case {
  id          String
  userId      String
  title       String
  description String?
  clientName  String?
  caseNumber  String?
  status      String    @default("active")

  // Relations
  documents    Document[]
  events       Event[]
  tasks        Task[]
  agreements   Agreement[]
  invoices     InvoiceFinance[]
  payments     PaymentFinance[]
  finance      CaseFinance?
}
```

#### 3. **LegalDocument** - Documentos Legales Globales
```typescript
model LegalDocument {
  id                   String

  // Campos requeridos según especificación legal ecuatoriana
  normType             NormType           // CONSTITUTIONAL_NORM | ORGANIC_LAW | ...
  normTitle            String             // Título de la norma
  legalHierarchy       LegalHierarchy     // CONSTITUCION | TRATADOS | LEYES_ORGANICAS | ...
  publicationType      PublicationType    // ORDINARIO | SUPLEMENTO | ...
  publicationNumber    String             // Número del Registro Oficial
  publicationDate      DateTime?
  lastReformDate       DateTime?
  documentState        DocumentState      // ORIGINAL | REFORMADO
  jurisdiction         Jurisdiction       // NACIONAL | PROVINCIAL | MUNICIPAL

  // Contenido
  content              String   @db.Text  // Texto completo del documento
  metadata             Json?               // Metadatos adicionales

  // Administración
  uploadedBy           String              // User ID del admin
  isActive             Boolean
  viewCount            Int      @default(0)
  downloadCount        Int      @default(0)

  // Relations
  chunks               LegalDocumentChunk[]  // Para RAG
  specialties          DocumentSpecialty[]   // Especialidades legales
  articles             LegalDocumentArticle[] // Artículos extraídos por IA
  sections             LegalDocumentSection[] // Secciones estructuradas
  summaries            LegalDocumentSummary[] // Resúmenes generados
}
```

#### 4. **LegalDocumentChunk** - Vectorización para RAG
```typescript
model LegalDocumentChunk {
  id              String
  legalDocumentId String
  content         String   @db.Text     // Fragmento del documento
  chunkIndex      Int                   // Índice del fragmento
  embedding       Json?                 // Vector de embeddings (OpenAI ada-002)

  legalDocument LegalDocument @relation(...)
}
```

#### 5. **Event** - Sistema de Calendario
```typescript
model Event {
  id               String
  title            String
  description      String?
  eventType        EventType      // HEARING | DEADLINE | MEETING | ...
  startTime        DateTime
  endTime          DateTime
  location         String?
  isAllDay         Boolean
  recurrenceRule   String?        // iCal RRULE format
  status           EventStatus    // CONFIRMED | TENTATIVE | CANCELLED

  // Relations
  case             Case?
  participants     EventParticipant[]
  reminders        EventReminder[]
}
```

#### 6. **Task** - Gestión de Tareas
```typescript
model Task {
  id               String
  title            String
  description      String?
  priority         TaskPriority    // LOW | MEDIUM | HIGH | URGENT
  status           TaskStatus      // PENDING | IN_PROGRESS | COMPLETED | ...
  dueDate          DateTime?
  estimatedTime    Int?            // minutos
  actualTime       Int?

  // Relations
  case             Case?
  assignedTo       User[]
  checklistItems   TaskChecklistItem[]
  history          TaskHistory[]
}
```

#### 7. **InvoiceFinance** - Facturas
```typescript
model InvoiceFinance {
  id              String
  invoiceNumber   String   @unique
  caseId          String

  // Financiero
  issueDate       DateTime
  dueDate         DateTime
  status          InvoiceStatus    // DRAFT | SENT | PAID | ...
  subtotal        Decimal
  taxRate         Decimal
  taxAmount       Decimal
  total           Decimal
  paidAmount      Decimal
  balanceDue      Decimal

  // Contenido
  items           Json              // Array de items de factura
  notes           String?
  internal_notes  String?
  metadata        Json?

  // Relations
  case            Case
  payments        PaymentFinance[]
  services        ServiceItem[]
}
```

#### 8. **AnalysisQueue** - Cola de Análisis con IA
```typescript
model AnalysisQueue {
  id                String
  legalDocumentId   String
  status            AnalysisStatus    // PENDING | PROCESSING | COMPLETED | FAILED
  analysisType      AnalysisType      // ARTICLE_EXTRACTION | SECTION_EXTRACTION | ...
  priority          Int

  // Progreso
  totalItems        Int?
  processedItems    Int?
  progress          Float?

  // Resultados
  result            Json?
  error             String?

  startedAt         DateTime?
  completedAt       DateTime?
}
```

### Enums Importantes

```typescript
enum NormType {
  CONSTITUTIONAL_NORM
  ORGANIC_LAW
  ORDINARY_LAW
  ORGANIC_CODE
  ORDINARY_CODE
  REGULATION_GENERAL
  REGULATION_EXECUTIVE
  ORDINANCE_MUNICIPAL
  ORDINANCE_METROPOLITAN
  RESOLUTION_ADMINISTRATIVE
  RESOLUTION_JUDICIAL
  ADMINISTRATIVE_AGREEMENT
  INTERNATIONAL_TREATY
  JUDICIAL_PRECEDENT
}

enum LegalHierarchy {
  CONSTITUCION
  TRATADOS_INTERNACIONALES_DDHH
  LEYES_ORGANICAS
  LEYES_ORDINARIAS
  CODIGOS_ORGANICOS
  CODIGOS_ORDINARIOS
  REGLAMENTOS
  ORDENANZAS
  RESOLUCIONES
  ACUERDOS_ADMINISTRATIVOS
}

enum EventType {
  HEARING
  DEADLINE
  MEETING
  CONSULTATION
  FILING
  TRIAL
  MEDIATION
  OTHER
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PAID
  PARTIALLY_PAID
  OVERDUE
  CANCELLED
  REFUNDED
}
```

### Migraciones Recientes

```
✅ 20250111_calendar_tasks_notifications_finance   (10/11) - Sistema completo
✅ 20250111_fix_notes_columns                      (11/11) - Fix columnas duplicadas
```

**Última Migración Exitosa**: `f156e10` (11-11-2025)

---

## 🔌 Backend API - Node.js + Fastify

### Stack Tecnológico

```json
{
  "runtime": "Node.js 20.x",
  "framework": "Fastify 4.26.0",
  "language": "TypeScript 5.3.3",
  "orm": "Prisma 5.10.0",
  "authentication": "JWT + OAuth2",
  "ai": "OpenAI GPT-4 + Embeddings",
  "email": "SendGrid",
  "queue": "BullMQ + Redis",
  "validation": "Zod 3.22.4"
}
```

### Dependencias Principales

```json
{
  "dependencies": {
    "@fastify/cors": "^9.0.1",
    "@fastify/jwt": "^8.0.0",
    "@fastify/multipart": "^8.1.0",
    "@fastify/rate-limit": "^9.1.0",
    "@langchain/anthropic": "^0.1.3",
    "@langchain/openai": "^0.0.19",
    "@prisma/client": "^5.10.0",
    "@sendgrid/mail": "^8.1.6",
    "bcrypt": "^5.1.1",
    "bullmq": "^5.63.0",
    "dotenv": "^16.4.5",
    "fastify": "^4.26.0",
    "ioredis": "^5.8.2",
    "jsonwebtoken": "^9.0.2",
    "langchain": "^0.1.25",
    "node-cron": "^4.2.1",
    "nodemailer": "^6.9.16",
    "openai": "^4.28.0",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "pdf.js-extract": "^0.2.1",
    "pg": "^8.16.3",
    "qrcode": "^1.5.4",
    "redis": "^4.6.13",
    "speakeasy": "^2.0.0",
    "tsx": "^4.7.1",
    "zod": "^3.22.4"
  }
}
```

### Rutas API

#### Autenticación
```
POST   /api/v1/auth/register          - Registro de usuario
POST   /api/v1/auth/login             - Login con email/password
POST   /api/v1/auth/refresh           - Refresh JWT token
POST   /api/v1/auth/logout            - Logout
GET    /api/v1/auth/me                - Obtener usuario actual

POST   /api/v1/oauth/google           - Google Sign-In
GET    /api/v1/oauth/google/callback  - OAuth callback

POST   /api/v1/two-factor/enable      - Habilitar 2FA
POST   /api/v1/two-factor/verify      - Verificar código 2FA
POST   /api/v1/two-factor/disable     - Deshabilitar 2FA
GET    /api/v1/two-factor/backup      - Obtener códigos de respaldo
```

#### Casos
```
GET    /api/v1/cases                  - Listar casos del usuario
POST   /api/v1/cases                  - Crear nuevo caso
GET    /api/v1/cases/:id              - Obtener caso por ID
PUT    /api/v1/cases/:id              - Actualizar caso
DELETE /api/v1/cases/:id              - Eliminar caso
GET    /api/v1/cases/:id/documents    - Documentos del caso
GET    /api/v1/cases/:id/events       - Eventos del caso
GET    /api/v1/cases/:id/tasks        - Tareas del caso
GET    /api/v1/cases/:id/finance      - Finanzas del caso
```

#### Documentos Legales (Globales)
```
GET    /api/v1/legal-documents        - Listar documentos globales
POST   /api/v1/legal-documents        - Crear documento (admin)
GET    /api/v1/legal-documents/:id    - Obtener documento por ID
PUT    /api/v1/legal-documents/:id    - Actualizar documento (admin)
DELETE /api/v1/legal-documents/:id    - Eliminar documento (admin)
POST   /api/v1/legal-documents/:id/analyze - Analizar con IA
GET    /api/v1/legal-documents/:id/articles - Artículos extraídos
GET    /api/v1/legal-documents/:id/summary  - Resumen generado
```

#### Consultas RAG
```
POST   /api/v1/query                  - Realizar consulta semántica
POST   /api/v1/query/chat             - Chat con contexto RAG
GET    /api/v1/query/history          - Historial de consultas
GET    /api/v1/query/suggestions      - Sugerencias de consultas
```

#### Calendario
```
GET    /api/v1/calendar/events        - Listar eventos
POST   /api/v1/calendar/events        - Crear evento
GET    /api/v1/calendar/events/:id    - Obtener evento
PUT    /api/v1/calendar/events/:id    - Actualizar evento
DELETE /api/v1/calendar/events/:id    - Eliminar evento
POST   /api/v1/calendar/events/:id/reminders - Agregar recordatorio
```

#### Tareas
```
GET    /api/v1/tasks                  - Listar tareas
POST   /api/v1/tasks                  - Crear tarea
GET    /api/v1/tasks/:id              - Obtener tarea
PUT    /api/v1/tasks/:id              - Actualizar tarea
DELETE /api/v1/tasks/:id              - Eliminar tarea
POST   /api/v1/tasks/:id/complete     - Completar tarea
POST   /api/v1/tasks/:id/checklist    - Agregar item de checklist
```

#### Finanzas
```
GET    /api/v1/finance/invoices       - Listar facturas
POST   /api/v1/finance/invoices       - Crear factura
GET    /api/v1/finance/invoices/:id   - Obtener factura
PUT    /api/v1/finance/invoices/:id   - Actualizar factura
POST   /api/v1/finance/invoices/:id/send - Enviar factura por email
GET    /api/v1/finance/invoices/:id/pdf  - Generar PDF

GET    /api/v1/finance/payments       - Listar pagos
POST   /api/v1/finance/payments       - Registrar pago
GET    /api/v1/finance/payments/:id   - Obtener pago

GET    /api/v1/finance/dashboard      - Dashboard financiero
GET    /api/v1/finance/reports        - Reportes financieros
```

#### Notificaciones
```
GET    /api/v1/notifications          - Listar notificaciones
POST   /api/v1/notifications/mark-read - Marcar como leído
DELETE /api/v1/notifications/:id      - Eliminar notificación
GET    /api/v1/notifications/preferences - Preferencias de notificación
PUT    /api/v1/notifications/preferences - Actualizar preferencias
```

#### Admin
```
GET    /api/v1/admin/users            - Listar usuarios (admin)
PUT    /api/v1/admin/users/:id/role   - Cambiar rol (admin)
GET    /api/v1/admin/specialties      - Gestionar especialidades
GET    /api/v1/admin/quotas           - Gestionar cuotas
GET    /api/v1/admin/audit-logs       - Logs de auditoría
POST   /api/v1/admin/legal-documents/upload - Subir documento global
```

---

## 🎨 Frontend - Next.js 14

### Stack Tecnológico

```json
{
  "framework": "Next.js 14+",
  "react": "React 18",
  "typescript": "TypeScript 5",
  "styling": "TailwindCSS 3.4",
  "components": "Shadcn/ui",
  "icons": "Lucide React",
  "forms": "React Hook Form + Zod",
  "state": "React Context + SWR",
  "routing": "App Router (Next.js)",
  "auth": "NextAuth.js"
}
```

### Estructura del Frontend

```
frontend/
├── src/
│   ├── app/                         # App Router
│   │   ├── (auth)/                  # Grupo de autenticación
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/             # Grupo dashboard
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx             # Dashboard principal
│   │   │   ├── cases/               # Gestión de casos
│   │   │   ├── documents/           # Documentos
│   │   │   ├── legal-documents/     # Biblioteca legal
│   │   │   ├── calendar/            # Calendario
│   │   │   ├── tasks/               # Tareas
│   │   │   ├── finance/             # Finanzas
│   │   │   ├── analytics/           # Analíticas
│   │   │   ├── settings/            # Configuraciones
│   │   │   └── admin/               # Panel admin
│   │   ├── api/                     # API Routes (si necesario)
│   │   ├── layout.tsx               # Root layout
│   │   └── page.tsx                 # Landing page
│   │
│   ├── components/                  # Componentes React
│   │   ├── ui/                      # Shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── auth/                    # Componentes de autenticación
│   │   ├── cases/                   # Componentes de casos
│   │   ├── documents/               # Componentes de documentos
│   │   ├── calendar/                # Componentes de calendario
│   │   ├── tasks/                   # Componentes de tareas
│   │   ├── finance/                 # Componentes financieros
│   │   ├── layout/                  # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   └── shared/                  # Componentes compartidos
│   │
│   ├── lib/                         # Utilidades y configuraciones
│   │   ├── api.ts                   # Cliente API
│   │   ├── auth.ts                  # Utilidades de autenticación
│   │   ├── utils.ts                 # Utilidades generales
│   │   └── constants.ts             # Constantes
│   │
│   ├── hooks/                       # Custom React Hooks
│   │   ├── useAuth.ts
│   │   ├── useCases.ts
│   │   ├── useDocuments.ts
│   │   └── ...
│   │
│   ├── types/                       # Definiciones TypeScript
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── ...
│   │
│   └── styles/                      # Estilos globales
│       └── globals.css
│
├── public/                          # Archivos estáticos
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── next.config.mjs                  # Configuración Next.js
├── tailwind.config.ts               # Configuración Tailwind
├── tsconfig.json                    # Configuración TypeScript
└── package.json
```

### Características del Frontend

- **Server-Side Rendering (SSR)**: Para SEO y performance
- **Static Site Generation (SSG)**: Para páginas estáticas
- **Client-Side Rendering (CSR)**: Para interactividad
- **API Routes**: Endpoints serverless si necesario
- **Optimización de Imágenes**: next/image
- **Optimización de Fuentes**: next/font
- **Code Splitting**: Automático con Next.js
- **Responsive Design**: Mobile-first con Tailwind

---

## 🔍 Sistema RAG (Retrieval-Augmented Generation)

### Arquitectura RAG

```
┌───────────────────────────────────────────────────────────────┐
│                     USUARIO HACE CONSULTA                     │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│                    1. VECTORIZACIÓN DE QUERY                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  OpenAI text-embedding-ada-002                          │  │
│  │  Query → Vector[1536 dimensiones]                       │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│               2. BÚSQUEDA SEMÁNTICA EN POSTGRESQL             │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  pgvector extension                                      │  │
│  │  SELECT * FROM legal_document_chunks                     │  │
│  │  ORDER BY embedding <-> query_vector                     │  │
│  │  LIMIT 10                                                │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│                  3. FILTRADO Y RANKING                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  - Filtro por jerarquía legal                           │  │
│  │  - Filtro por jurisdicción                              │  │
│  │  - Filtro por tipo de norma                             │  │
│  │  - Re-ranking por relevancia                            │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│              4. CONSTRUCCIÓN DEL CONTEXTO                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Top 5-10 fragmentos más relevantes                     │  │
│  │  + Metadatos de documentos                              │  │
│  │  + Artículos específicos extraídos                      │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│             5. GENERACIÓN DE RESPUESTA CON LLM                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  OpenAI GPT-4                                           │  │
│  │  System Prompt: "Eres un asistente legal experto..."   │  │
│  │  Context: [fragmentos relevantes]                       │  │
│  │  Query: [consulta del usuario]                          │  │
│  │  → Respuesta fundamentada en documentos reales         │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│                  6. RESPUESTA AL USUARIO                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  - Respuesta generada                                   │  │
│  │  - Referencias a documentos y artículos                 │  │
│  │  - Metadatos de fuentes (jerarquía, fecha, etc.)       │  │
│  │  - Sugerencias de consultas relacionadas               │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Servicios RAG

#### 1. **Document Analyzer** (`src/services/documentAnalyzer.ts`)

Analiza documentos legales con IA para extraer:
- Artículos y números de artículos
- Secciones y estructura
- Resúmenes ejecutivos
- Palabras clave

#### 2. **Query Router** (`src/services/queryRouter.ts`)

Enruta consultas al sistema RAG apropiado:
- Búsqueda en documentos globales
- Búsqueda en documentos de casos
- Búsqueda híbrida

#### 3. **Vectorization** (`src/utils/vectorization.ts`)

Genera embeddings usando OpenAI:
```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text
  });
  return response.data[0].embedding; // 1536 dimensions
}
```

### Configuración de Embeddings

```env
OPENAI_API_KEY="sk-..."
EMBEDDING_MODEL="text-embedding-ada-002"
EMBEDDING_DIMENSIONS=1536
```

---

## 📊 Análisis Documental con IA

### Sistema de Análisis

```
┌───────────────────────────────────────────────────────────────┐
│                  DOCUMENTO LEGAL SUBIDO                       │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│              1. EXTRACCIÓN DE TEXTO (PDF)                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  pdf.js-extract                                         │  │
│  │  PDF → Texto plano                                      │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│              2. CHUNKING (FRAGMENTACIÓN)                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Fragmentos de ~1000 tokens                             │  │
│  │  Con overlap de 100 tokens                              │  │
│  │  Respetando límites de párrafos                         │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│              3. ANÁLISIS CON IA (Paralelo)                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  A) EXTRACCIÓN DE ARTÍCULOS                             │  │
│  │     GPT-4: Identificar artículos y números              │  │
│  │                                                          │  │
│  │  B) EXTRACCIÓN DE SECCIONES                             │  │
│  │     GPT-4: Identificar estructura (capítulos, títulos)  │  │
│  │                                                          │  │
│  │  C) GENERACIÓN DE RESUMEN                               │  │
│  │     GPT-4: Resumen ejecutivo del documento             │  │
│  │                                                          │  │
│  │  D) VECTORIZACIÓN                                       │  │
│  │     OpenAI Embeddings: Generar vectores                │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│              4. ALMACENAMIENTO EN BASE DE DATOS               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  - legal_documents                                      │  │
│  │  - legal_document_chunks (con embeddings)              │  │
│  │  - legal_document_articles                             │  │
│  │  - legal_document_sections                             │  │
│  │  - legal_document_summaries                            │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Tablas de Análisis

```typescript
model LegalDocumentArticle {
  id              String
  legalDocumentId String
  articleNumber   String    // "Art. 1", "Artículo 234", etc.
  content         String    @db.Text
  startPosition   Int?      // Posición en el documento original
  endPosition     Int?
  metadata        Json?     // Referencias cruzadas, notas, etc.
}

model LegalDocumentSection {
  id              String
  legalDocumentId String
  sectionType     String    // CHAPTER | TITLE | SECTION | SUBSECTION
  sectionNumber   String?   // "Capítulo I", "Título II", etc.
  title           String
  content         String    @db.Text
  level           Int       // Nivel de jerarquía (1, 2, 3...)
  parentSectionId String?
}

model LegalDocumentSummary {
  id              String
  legalDocumentId String
  summaryType     String    // EXECUTIVE | DETAILED | KEYWORDS
  content         String    @db.Text
  generatedBy     String    // AI model used
  confidence      Float?    // Score de confianza
}

model AnalysisQueue {
  id                String
  legalDocumentId   String
  status            AnalysisStatus  // PENDING | PROCESSING | COMPLETED | FAILED
  analysisType      AnalysisType    // ARTICLE_EXTRACTION | SECTION_EXTRACTION | ...
  priority          Int
  progress          Float?
  result            Json?
  error             String?
}
```

---

## 🔐 Autenticación y Seguridad

### Métodos de Autenticación

1. **Local Authentication** (Email + Password)
   - Hashing con bcrypt
   - JWT tokens (access + refresh)
   - Validación con Zod

2. **OAuth2 - Google Sign-In**
   - Passport.js + passport-google-oauth20
   - Creación automática de cuenta
   - Vincular con cuenta existente

3. **Two-Factor Authentication (2FA)**
   - TOTP (Time-based One-Time Password)
   - Speakeasy library
   - QR code generation
   - 8 códigos de respaldo

### Flujo de Autenticación

```
┌──────────────┐
│   Usuario    │
└──────┬───────┘
       │ 1. Login (email + password)
       ▼
┌──────────────────┐
│   POST /auth/login
│   Validar credenciales
│   bcrypt.compare()
│   ├─ ❌ Invalid → 401
│   └─ ✅ Valid
│       │
│       ├─ 2FA enabled?
│       │   ├─ YES → Solicitar código 2FA
│       │   │         ↓
│       │   │    POST /two-factor/verify
│       │   │    Validar TOTP
│       │   │         ├─ ❌ Invalid → 401
│       │   │         └─ ✅ Valid → Generar tokens
│       │   │
│       │   └─ NO → Generar tokens
│       │
│       ▼
│   Generar JWT tokens
│   - Access Token (15 min)
│   - Refresh Token (7 días)
│       │
│       ▼
│   Retornar tokens + user data
└──────────────────┘
```

### JWT Tokens

```typescript
// Access Token Payload
{
  userId: string;
  email: string;
  role: string;
  planTier: string;
  iat: number;
  exp: number; // 15 minutos
}

// Refresh Token Payload
{
  userId: string;
  tokenVersion: number;
  iat: number;
  exp: number; // 7 días
}
```

### Middleware de Autenticación

```typescript
// src/middleware/auth.ts
async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Extraer token del header
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.status(401).send({ error: 'No token provided' });
    }

    // Verificar token
    const decoded = await fastify.jwt.verify(token);

    // Agregar usuario a request
    request.user = decoded;

  } catch (error) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
}
```

### Rate Limiting

```typescript
// @fastify/rate-limit
fastify.register(rateLimit, {
  max: 100,              // 100 requests
  timeWindow: '1 minute', // por minuto
  cache: 10000,          // Cache de 10k direcciones IP
  redis: redisClient,    // Usar Redis para compartir entre instancias
});
```

---

## 📧 Sistema de Notificaciones

### Tipos de Notificaciones

1. **Push Notifications** (In-App)
2. **Email Notifications** (SendGrid)
3. **Webhook Notifications** (Futuro)

### Canales de Notificación

```typescript
model Notification {
  id          String
  userId      String
  type        NotificationType
  title       String
  message     String
  link        String?
  priority    NotificationPriority  // LOW | MEDIUM | HIGH | URGENT
  isRead      Boolean
  readAt      DateTime?
  createdAt   DateTime
}

enum NotificationType {
  CASE_UPDATE
  TASK_ASSIGNED
  TASK_DUE
  EVENT_REMINDER
  INVOICE_SENT
  PAYMENT_RECEIVED
  DOCUMENT_ANALYZED
  SYSTEM_ALERT
}

model NotificationPreferences {
  userId               String   @unique
  emailEnabled         Boolean  @default(true)
  pushEnabled          Boolean  @default(true)

  // Por tipo de notificación
  caseUpdates          Boolean  @default(true)
  taskReminders        Boolean  @default(true)
  eventReminders       Boolean  @default(true)
  financialUpdates     Boolean  @default(true)
  systemAlerts         Boolean  @default(true)

  // Frecuencia
  digestFrequency      String   @default("daily") // instant | daily | weekly
}
```

### Sistema de Colas (BullMQ + Redis)

```typescript
// Email Queue
const emailQueue = new Queue('emails', {
  connection: redisConnection
});

// Agregar trabajo a la cola
await emailQueue.add('send-email', {
  to: user.email,
  subject: 'Nueva tarea asignada',
  template: 'task-assigned',
  data: { task, assignedBy }
});

// Worker procesando emails
const emailWorker = new Worker('emails', async (job) => {
  const { to, subject, template, data } = job.data;

  // Renderizar template
  const html = await renderEmailTemplate(template, data);

  // Enviar con SendGrid
  await sendgrid.send({
    to,
    from: process.env.FROM_EMAIL,
    subject,
    html
  });
}, {
  connection: redisConnection
});
```

### Templates de Email

```
src/templates/emails/
├── task-assigned.html
├── event-reminder.html
├── invoice-sent.html
├── payment-received.html
├── document-analyzed.html
└── welcome.html
```

---

## 💰 Sistema Financiero

### Entidades Financieras

```typescript
// 1. Agreements (Acuerdos)
model Agreement {
  id             String
  caseId         String
  title          String
  description    String?
  agreementType  String      // RETAINER | CONTINGENCY | FIXED_FEE | HOURLY
  amount         Decimal
  currency       String      @default("USD")
  startDate      DateTime
  endDate        DateTime?
  status         AgreementStatus
  terms          String?     @db.Text
  signedAt       DateTime?

  case           Case
  services       ServiceItem[]
  invoices       InvoiceFinance[]
}

// 2. Service Items (Items de Servicio)
model ServiceItem {
  id             String
  caseId         String
  agreementId    String?
  description    String
  quantity       Decimal
  unitPrice      Decimal
  total          Decimal
  category       String?     // CONSULTATION | RESEARCH | COURT | ...
  date           DateTime
  billable       Boolean     @default(true)
  invoiced       Boolean     @default(false)

  case           Case
  agreement      Agreement?
}

// 3. Invoices (Facturas)
model InvoiceFinance {
  id              String
  caseId          String
  agreementId     String?
  invoiceNumber   String   @unique

  issueDate       DateTime
  dueDate         DateTime
  sentDate        DateTime?
  paidDate        DateTime?

  status          InvoiceStatus

  subtotal        Decimal
  taxRate         Decimal  @default(0)
  taxAmount       Decimal  @default(0)
  discount        Decimal  @default(0)
  total           Decimal
  paidAmount      Decimal  @default(0)
  balanceDue      Decimal

  items           Json     // Array de line items
  notes           String?
  internal_notes  String?

  case            Case
  agreement       Agreement?
  payments        PaymentFinance[]
}

// 4. Payments (Pagos)
model PaymentFinance {
  id              String
  caseId          String
  invoiceId       String?

  paymentDate     DateTime
  amount          Decimal
  currency        String   @default("USD")
  method          PaymentMethod
  referenceNumber String?

  status          PaymentStatus

  notes           String?
  receiptUrl      String?

  case            Case
  invoice         InvoiceFinance?
}

// 5. Case Finance Summary
model CaseFinance {
  id                   String
  caseId               String   @unique

  // Totals
  totalBilled          Decimal  @default(0)
  totalPaid            Decimal  @default(0)
  totalOutstanding     Decimal  @default(0)

  // Agreements
  totalAgreements      Int      @default(0)
  activeAgreements     Int      @default(0)

  // Invoices
  totalInvoices        Int      @default(0)
  paidInvoices         Int      @default(0)
  overdueInvoices      Int      @default(0)

  // Stats
  averagePaymentTime   Int?     // días
  lastInvoiceDate      DateTime?
  lastPaymentDate      DateTime?

  case                 Case
}
```

### Enums Financieros

```typescript
enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PAID
  PARTIALLY_PAID
  OVERDUE
  CANCELLED
  REFUNDED
}

enum PaymentMethod {
  CASH
  CHECK
  CREDIT_CARD
  DEBIT_CARD
  BANK_TRANSFER
  PAYPAL
  STRIPE
  OTHER
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}
```

### Cálculos Automáticos

```typescript
// Al crear/actualizar factura
async function calculateInvoiceTotals(invoice: Invoice) {
  // Calcular subtotal de items
  const subtotal = invoice.items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);

  // Calcular impuestos
  const taxAmount = subtotal * (invoice.taxRate / 100);

  // Calcular total
  const total = subtotal + taxAmount - invoice.discount;

  // Calcular balance pendiente
  const balanceDue = total - invoice.paidAmount;

  return {
    subtotal,
    taxAmount,
    total,
    balanceDue
  };
}
```

---

## 🚀 Despliegue y DevOps

### Plataformas

#### Backend - Render Cloud
```yaml
Service: Web Service
Plan: Starter ($7/mes)
Region: Oregon (us-west-1)
Runtime: Node.js 20
Build Command: npm run build
Start Command: npm run start
Auto-Deploy: Yes (GitHub main branch)
Health Check: /api/v1/health
```

#### Base de Datos - Render PostgreSQL
```yaml
Service: PostgreSQL 16
Plan: Free ($0 - 90 días inactividad = suspensión)
Region: Oregon (us-west-1)
Extensions: pgvector
Storage: 1GB
Connections: 97 max
Backup: No (plan free)
```

#### Redis - Redis Cloud (Upstash)
```yaml
Service: Redis Cloud
Plan: Free
Region: us-east-1
Memory: 30MB
Connections: 30
TLS: Yes
```

#### Frontend - Vercel
```yaml
Service: Vercel
Plan: Hobby (Free)
Region: Global CDN
Framework: Next.js 14
Auto-Deploy: Yes (GitHub main branch)
Environment: Production
```

### Variables de Entorno

```bash
# Backend .env
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
OPENAI_API_KEY="sk-..."
REDIS_URL="redis://default:pass@host:6379"
JWT_SECRET="..."
NEXTAUTH_SECRET="..."
SENDGRID_API_KEY="SG...."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml (conceptual)
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build
      - name: Deploy to Render
        run: |
          # Render auto-deploys on push to main

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: cd frontend && npm install
      - name: Build
        run: cd frontend && npm run build
      - name: Deploy to Vercel
        run: |
          # Vercel auto-deploys on push to main
```

### Scripts de Deployment

```json
{
  "scripts": {
    "postinstall": "node scripts/resolve-failed-migrations.cjs",
    "prisma:generate": "prisma generate",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "build": "tsc",
    "start": "tsx src/server.ts",
    "start:prod": "node --loader ts-node/esm src/server.ts"
  }
}
```

### Monitoreo y Logs

- **Render Logs**: Logs en tiempo real del backend
- **Vercel Analytics**: Métricas del frontend
- **PostgreSQL Metrics**: Conexiones, queries, storage
- **Redis Metrics**: Memory usage, hit rate

---

## 📝 Últimas Novedades y Cambios

### Noviembre 11, 2025

#### ✅ Migraciones Completadas
1. **20250111_calendar_tasks_notifications_finance** (Migración 10/11)
   - Sistema completo de calendario con eventos
   - Sistema de tareas con checklists
   - Sistema de notificaciones mejorado
   - Sistema financiero completo (facturas, pagos, acuerdos)
   - **Estado**: ✅ Aplicada exitosamente

2. **20250111_fix_notes_columns** (Migración 11/11)
   - Fix columna duplicada `finance_invoices.notes`
   - Agregado `internal_notes` column
   - Agregado `metadata` JSONB columns
   - **Estado**: ✅ Aplicada exitosamente
   - **Commit**: `f156e10`
   - **Deploy**: `dep-d49l1npr0fns73dcj8rg` (LIVE)

#### 🔧 Resolución de Problemas
- **Problema**: Error P3018 - Columna `notes` ya existía
- **Solución**: Nueva migración con `IF NOT EXISTS`
- **Scripts**: Actualizado `resolve-failed-migrations.cjs`
- **Resultado**: ✅ Sistema en producción sin errores

#### 📊 Estado Actual del Sistema
- **Backend**: ✅ Live en Render (commit f156e10)
- **Base de Datos**: ✅ PostgreSQL 16 con pgvector
- **Migraciones**: ✅ 11/11 aplicadas correctamente
- **Redis**: ✅ Conectado (Upstash)
- **Errores**: ✅ 0 errores en producción

### Octubre 2025 - Implementaciones Mayores

1. **Sistema RAG Completo**
   - Vectorización con OpenAI embeddings
   - Búsqueda semántica con pgvector
   - Query routing inteligente

2. **Panel de Administración**
   - Gestión de documentos legales globales
   - Sistema de especialidades legales
   - Auditoría completa

3. **Autenticación Multi-Factor**
   - OAuth2 con Google
   - 2FA con TOTP
   - Códigos de respaldo

4. **Análisis Documental con IA**
   - Extracción automática de artículos
   - Identificación de secciones
   - Generación de resúmenes

---

## 🔗 Integraciones Externas

### 1. OpenAI
```typescript
// Embeddings
model: "text-embedding-ada-002"
dimensions: 1536
cost: $0.0001 per 1k tokens

// GPT-4
model: "gpt-4-turbo-preview"
context: 128k tokens
cost: $0.01 per 1k input tokens, $0.03 per 1k output tokens
```

### 2. SendGrid
```typescript
// Email Service
API: REST API v3
Features:
  - Template engine
  - Webhook events
  - Analytics
  - Bounce handling
```

### 3. Redis Cloud (Upstash)
```typescript
// Caching + Queue
Features:
  - BullMQ job queues
  - Session caching
  - Rate limiting
  - Real-time pub/sub
```

### 4. Render Cloud
```typescript
// Hosting
Services:
  - Web Service (Backend)
  - PostgreSQL (Database)
Features:
  - Auto-deploy from GitHub
  - Zero-downtime deployments
  - Health checks
  - Environment variables
```

### 5. Vercel
```typescript
// Frontend Hosting
Features:
  - Global CDN
  - Automatic HTTPS
  - Preview deployments
  - Analytics
```

---

## 📈 Planes y Límites

### Plan Free
- ✅ 5 casos
- ✅ 100 documentos
- ✅ 50 consultas RAG/mes
- ✅ 1 GB storage
- ❌ Sin análisis IA
- ❌ Sin exportación PDF

### Plan Basic ($29/mes)
- ✅ 50 casos
- ✅ 1,000 documentos
- ✅ 500 consultas RAG/mes
- ✅ 10 GB storage
- ✅ Análisis IA básico
- ✅ Exportación PDF
- ✅ Soporte email

### Plan Professional ($99/mes)
- ✅ 200 casos
- ✅ 10,000 documentos
- ✅ 2,000 consultas RAG/mes
- ✅ 100 GB storage
- ✅ Análisis IA avanzado
- ✅ API access
- ✅ Integraciones
- ✅ Soporte prioritario

### Plan Team ($299/mes)
- ✅ Casos ilimitados
- ✅ Documentos ilimitados
- ✅ 10,000 consultas RAG/mes
- ✅ 1 TB storage
- ✅ Todo lo de Professional
- ✅ Multi-usuario (hasta 10)
- ✅ SSO
- ✅ Soporte 24/7

---

## 🔒 Seguridad

### Medidas Implementadas

1. **Autenticación**
   - JWT tokens con expiración
   - Refresh tokens rotativos
   - 2FA con TOTP
   - OAuth2 seguro

2. **Autorización**
   - RBAC (Role-Based Access Control)
   - Permisos granulares
   - Validación en cada endpoint

3. **Datos**
   - Hashing de passwords (bcrypt, 10 rounds)
   - Encriptación en tránsito (HTTPS)
   - Sanitización de inputs (Zod)
   - SQL injection protection (Prisma ORM)

4. **API**
   - Rate limiting (100 req/min)
   - CORS configurado
   - Validación de schemas
   - Logs de auditoría

5. **Infrastructure**
   - PostgreSQL con SSL
   - Redis con TLS
   - Environment variables secretas
   - Backups automáticos

---

## 🧪 Testing

### Tipos de Tests
```
tests/
├── unit/              # Tests unitarios
├── integration/       # Tests de integración
├── e2e/              # Tests end-to-end
└── load/             # Tests de carga
```

### Comandos
```bash
npm test              # Run all tests
npm run test:unit     # Unit tests
npm run test:integration  # Integration tests
npm run test:e2e      # E2E tests
npm run test:coverage # Coverage report
```

---

## 📚 Recursos y Documentación

### Documentación Técnica
- `IMPLEMENTATION_REPORT.html` - Reporte de implementación
- `USER_MANUAL.html` - Manual de usuario
- `TECHNICAL_REPORT_MIGRATION_FIX.html` - Reporte técnico migraciones
- `ARQUITECTURA_COMPLETA_PROYECTO.md` - Este documento

### Links Útiles
- **Render Dashboard**: https://dashboard.render.com/
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Prisma Docs**: https://www.prisma.io/docs
- **Fastify Docs**: https://fastify.dev/docs
- **Next.js Docs**: https://nextjs.org/docs

### Repositorio
```bash
git clone https://github.com/your-org/legal-rag-system.git
cd legal-rag-system
npm install
cp .env.example .env
# Configurar variables de entorno
npm run dev
```

---

## 🤝 Equipo y Contribuciones

### Roles
- **Backend Developer**: Sistema API, migraciones, RAG
- **Frontend Developer**: UI/UX, componentes React
- **DevOps**: Deployment, CI/CD, monitoreo
- **AI Engineer**: Análisis documental, RAG optimization

### Contribuir
```bash
# 1. Fork el repositorio
# 2. Crear branch feature
git checkout -b feature/nueva-funcionalidad

# 3. Commit cambios
git commit -m "feat: Agregar nueva funcionalidad"

# 4. Push a branch
git push origin feature/nueva-funcionalidad

# 5. Crear Pull Request
```

---

## 📞 Soporte

### Contacto
- **Email**: support@poweria-legal.com
- **Documentación**: https://docs.poweria-legal.com
- **Status Page**: https://status.poweria-legal.com

### Reportar Issues
- GitHub Issues: https://github.com/your-org/legal-rag-system/issues
- Email prioritario: urgent@poweria-legal.com

---

## 📄 Licencia

Copyright © 2025 Poweria Legal. Todos los derechos reservados.

---

**Documento generado el**: 11 de Noviembre de 2025
**Versión**: 1.0.0
**Autor**: Sistema Poweria Legal
**Estado**: Producción ✅
