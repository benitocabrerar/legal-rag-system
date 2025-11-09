# Panel de Administración Avanzado - Diseño Arquitectónico

## Visión General

Sistema de administración empresarial de nivel completo para el Sistema Legal RAG con:

- **Gestión Completa de Bases de Datos**: PostgreSQL, Prisma, integración con Render/Supabase
- **Control Total de Usuarios**: Analytics, quotas, permisos granulares
- **Especialidades Legales Dinámicas**: Sistema completo de categorización jurídica
- **Métricas y Monitoreo en Tiempo Real**: Dashboard ejecutivo con KPIs
- **Auditoría Completa**: Trazabilidad de todas las acciones

---

## 1. Arquitectura de Base de Datos

### 1.1 Nuevos Modelos Prisma

#### Especialidades Legales

```prisma
model LegalSpecialty {
  id          String   @id @default(uuid())
  code        String   @unique // "PENAL", "CIVIL", "CONSTITUCIONAL"
  name        String   // "Derecho Penal"
  description String?  @db.Text
  icon        String?  // Icon class or emoji
  color       String?  // Hex color for UI
  parentId    String?  @map("parent_id") // For hierarchical specialties
  isActive    Boolean  @default(true) @map("is_active")
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  parent      LegalSpecialty? @relation("SpecialtyHierarchy", fields: [parentId], references: [id])
  children    LegalSpecialty[] @relation("SpecialtyHierarchy")
  documents   DocumentSpecialty[]

  @@map("legal_specialties")
}

model DocumentSpecialty {
  id               String   @id @default(uuid())
  legalDocumentId  String   @map("legal_document_id")
  specialtyId      String   @map("specialty_id")
  isPrimary        Boolean  @default(false) @map("is_primary")
  createdAt        DateTime @default(now()) @map("created_at")

  legalDocument    LegalDocument @relation(fields: [legalDocumentId], references: [id], onDelete: Cascade)
  specialty        LegalSpecialty @relation(fields: [specialtyId], references: [id], onDelete: Cascade)

  @@unique([legalDocumentId, specialtyId])
  @@map("document_specialties")
}
```

#### Sistema de Auditoría

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String?  @map("user_id")
  action      String   // CREATE, UPDATE, DELETE, LOGIN, etc.
  entity      String   // User, Case, Document, etc.
  entityId    String?  @map("entity_id")
  changes     Json?    // Before/after values
  ipAddress   String?  @map("ip_address")
  userAgent   String?  @map("user_agent")
  metadata    Json?    // Additional context
  createdAt   DateTime @default(now()) @map("created_at")

  user        User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([entity, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

#### Logs de Queries y Costos

```prisma
model QueryLog {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  caseId          String?  @map("case_id")
  query           String   @db.Text
  response        String?  @db.Text
  tokensUsed      Int      @default(0) @map("tokens_used")
  costUsd         Decimal  @default(0) @map("cost_usd") @db.Decimal(10, 6)
  responseTimeMs  Int      @map("response_time_ms")
  status          String   @default("success") // success, error, timeout
  errorMessage    String?  @map("error_message") @db.Text
  model           String   // gpt-4, gpt-3.5-turbo, etc.
  createdAt       DateTime @default(now()) @map("created_at")

  user            User @relation(fields: [userId], references: [id], onDelete: Cascade)
  case            Case? @relation(fields: [caseId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([createdAt])
  @@map("query_logs")
}
```

#### Sistema de Quotas

```prisma
model UserQuota {
  id              String   @id @default(uuid())
  userId          String   @unique @map("user_id")

  // Storage limits
  storageGB       Float    @default(5.0) @map("storage_gb")
  storageUsedGB   Float    @default(0.0) @map("storage_used_gb")

  // Document limits
  documentsLimit  Int      @default(100) @map("documents_limit")
  documentsCount  Int      @default(0) @map("documents_count")

  // Query limits (monthly)
  monthlyQueries  Int      @default(1000) @map("monthly_queries")
  queriesUsed     Int      @default(0) @map("queries_used")

  // Cost tracking
  monthlyCostLimit Decimal @default(50.0) @map("monthly_cost_limit") @db.Decimal(10, 2)
  monthlyCostUsed  Decimal @default(0.0) @map("monthly_cost_used") @db.Decimal(10, 2)

  // Reset tracking
  lastResetDate   DateTime @default(now()) @map("last_reset_date")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user            User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_quotas")
}

model StorageUsage {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  documentId  String?  @map("document_id")
  fileType    String   @map("file_type") // pdf, docx, etc.
  sizeBytes   BigInt   @map("size_bytes")
  createdAt   DateTime @default(now()) @map("created_at")

  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("storage_usage")
}
```

#### Métricas del Sistema

```prisma
model SystemMetric {
  id          String   @id @default(uuid())
  metricType  String   @map("metric_type") // cpu_usage, memory_usage, db_size, etc.
  value       Float
  unit        String   // percent, MB, GB, ms, etc.
  metadata    Json?    // Additional context
  timestamp   DateTime @default(now())

  @@index([metricType, timestamp])
  @@map("system_metrics")
}

model DatabaseStats {
  id              String   @id @default(uuid())
  tableName       String   @map("table_name")
  rowCount        BigInt   @map("row_count")
  sizeBytes       BigInt   @map("size_bytes")
  indexSizeBytes  BigInt   @map("index_size_bytes")
  createdAt       DateTime @default(now()) @map("created_at")

  @@index([tableName, createdAt])
  @@map("database_stats")
}
```

#### API Keys y Webhooks

```prisma
model ApiKey {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  name        String   // User-defined name
  keyHash     String   @unique @map("key_hash") // Hashed API key
  prefix      String   // First 8 chars for display (sk_live_abc12345)
  scopes      String[] // Permissions: read:cases, write:documents, etc.
  lastUsedAt  DateTime? @map("last_used_at")
  expiresAt   DateTime? @map("expires_at")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")

  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("api_keys")
}
```

#### Notificaciones

```prisma
model Notification {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  type        String   // info, warning, error, success
  title       String
  message     String   @db.Text
  actionUrl   String?  @map("action_url")
  isRead      Boolean  @default(false) @map("is_read")
  metadata    Json?
  createdAt   DateTime @default(now()) @map("created_at")
  readAt      DateTime? @map("read_at")

  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([createdAt])
  @@map("notifications")
}
```

### 1.2 Actualizaciones a Modelos Existentes

#### User Model - Campos Adicionales

```prisma
model User {
  // ... campos existentes ...

  // New fields
  status          String   @default("active") // active, suspended, deleted
  emailVerified   Boolean  @default(false) @map("email_verified")
  emailVerifiedAt DateTime? @map("email_verified_at")
  lastLoginAt     DateTime? @map("last_login_at")
  lastLoginIp     String?   @map("last_login_ip")
  twoFactorEnabled Boolean  @default(false) @map("two_factor_enabled")
  twoFactorSecret  String?  @map("two_factor_secret")
  preferences     Json?    // UI preferences, notifications, etc.
  metadata        Json?    // Additional flexible data

  // Relations
  quota           UserQuota?
  storageUsage    StorageUsage[]
  apiKeys         ApiKey[]
  notifications   Notification[]
  auditLogs       AuditLog[]
  queryLogs       QueryLog[]
}
```

#### LegalDocument Model - Campos Adicionales

```prisma
model LegalDocument {
  // ... campos existentes ...

  // New fields
  source          String?  // Official source/publication
  url             String?  // Official URL
  language        String   @default("es") // es, en, etc.
  status          String   @default("published") // draft, published, archived
  viewCount       Int      @default(0) @map("view_count")
  downloadCount   Int      @default(0) @map("download_count")
  tags            String[] // Searchable tags

  // Relations
  specialties     DocumentSpecialty[]
}
```

---

## 2. Especialidades Legales - Sistema Completo

### 2.1 Jerarquía de Especialidades

```
DERECHO PÚBLICO
├── Derecho Constitucional
├── Derecho Administrativo
├── Derecho Penal
│   ├── Penal General
│   ├── Penal Económico
│   └── Penal Internacional
├── Derecho Procesal
│   ├── Procesal Civil
│   ├── Procesal Penal
│   └── Procesal Administrativo
├── Derecho Tributario
└── Derecho Internacional Público

DERECHO PRIVADO
├── Derecho Civil
│   ├── Civil General
│   ├── Contratos
│   ├── Familia
│   ├── Sucesiones
│   └── Responsabilidad Civil
├── Derecho Comercial
│   ├── Sociedades
│   ├── Títulos Valores
│   └── Seguros
├── Derecho Laboral
│   ├── Individual
│   └── Colectivo
└── Derecho Internacional Privado

DERECHO SOCIAL
├── Derecho del Trabajo
├── Derecho de la Seguridad Social
└── Derecho del Consumidor

OTROS
├── Derecho Ambiental
├── Derecho de la Competencia
├── Derecho de Propiedad Intelectual
├── Derecho Digital/Informático
└── Derecho Notarial y Registral
```

### 2.2 Script de Inicialización

Crear archivo: `prisma/seeds/specialties.ts`

```typescript
const specialties = [
  {
    code: 'DERECHO_PUBLICO',
    name: 'Derecho Público',
    icon: 'building',
    color: '#3B82F6',
    children: [
      {
        code: 'CONSTITUCIONAL',
        name: 'Derecho Constitucional',
        description: 'Normas fundamentales del Estado',
        icon: 'scales',
        color: '#1E40AF'
      },
      {
        code: 'ADMINISTRATIVO',
        name: 'Derecho Administrativo',
        description: 'Organización y funcionamiento de la administración pública',
        icon: 'briefcase',
        color: '#2563EB'
      },
      {
        code: 'PENAL',
        name: 'Derecho Penal',
        description: 'Delitos y penas',
        icon: 'gavel',
        color: '#DC2626',
        children: [
          {
            code: 'PENAL_GENERAL',
            name: 'Penal General',
            description: 'Parte general del derecho penal'
          },
          {
            code: 'PENAL_ECONOMICO',
            name: 'Penal Económico',
            description: 'Delitos económicos y financieros'
          }
        ]
      },
      {
        code: 'TRIBUTARIO',
        name: 'Derecho Tributario',
        description: 'Tributos e impuestos',
        icon: 'dollar',
        color: '#059669'
      }
    ]
  },
  {
    code: 'DERECHO_PRIVADO',
    name: 'Derecho Privado',
    icon: 'users',
    color: '#8B5CF6',
    children: [
      {
        code: 'CIVIL',
        name: 'Derecho Civil',
        description: 'Relaciones entre particulares',
        icon: 'home',
        color: '#7C3AED',
        children: [
          {
            code: 'CIVIL_GENERAL',
            name: 'Civil General'
          },
          {
            code: 'CONTRATOS',
            name: 'Contratos'
          },
          {
            code: 'FAMILIA',
            name: 'Familia'
          },
          {
            code: 'SUCESIONES',
            name: 'Sucesiones'
          }
        ]
      },
      {
        code: 'COMERCIAL',
        name: 'Derecho Comercial',
        description: 'Actividad comercial y empresarial',
        icon: 'shopping-cart',
        color: '#6366F1'
      },
      {
        code: 'LABORAL',
        name: 'Derecho Laboral',
        description: 'Relaciones laborales',
        icon: 'briefcase',
        color: '#EC4899'
      }
    ]
  }
];
```

---

## 3. API Endpoints - Backend Completo

### 3.1 Admin - Gestión de Usuarios

```typescript
// src/routes/admin/users.ts

GET    /api/v1/admin/users
  - Lista todos los usuarios con paginación
  - Filtros: role, planTier, status, search
  - Sorting: createdAt, lastLoginAt, storageUsed
  - Response: { users, total, page, pageSize, filters }

GET    /api/v1/admin/users/:id
  - Detalles completos del usuario
  - Incluye: quota, storage, recent activity, audit logs

PATCH  /api/v1/admin/users/:id
  - Actualizar usuario
  - Campos: role, planTier, status, quota overrides
  - Audit log automático

POST   /api/v1/admin/users/:id/reset-password
  - Generar token de reset de contraseña
  - Enviar email con link

POST   /api/v1/admin/users/:id/suspend
  - Suspender cuenta de usuario
  - Reason required

POST   /api/v1/admin/users/:id/activate
  - Reactivar cuenta suspendida

DELETE /api/v1/admin/users/:id
  - Soft delete (marcar como deleted)
  - Hard delete option (permanente)

POST   /api/v1/admin/users/bulk
  - Operaciones en lote
  - Actions: suspend, activate, change-plan, delete
```

### 3.2 Admin - Analytics y Métricas

```typescript
// src/routes/admin/analytics.ts

GET    /api/v1/admin/analytics/dashboard
  - KPIs principales del sistema
  - Response: {
      users: { total, active, new_this_month },
      queries: { total, this_month, avg_per_day },
      documents: { total, by_category, by_specialty },
      costs: { total, this_month, by_model },
      storage: { total_gb, by_user_tier },
      performance: { avg_response_time, success_rate }
    }

GET    /api/v1/admin/analytics/users
  - Analytics detallado de usuarios
  - Segmentación por: plan, specialty, activity
  - Time series data

GET    /api/v1/admin/analytics/queries
  - Analytics de queries
  - Most common queries, errors, response times
  - Cost breakdown por modelo

GET    /api/v1/admin/analytics/costs
  - Análisis de costos detallado
  - Por usuario, por modelo, por endpoint
  - Proyecciones y trends

GET    /api/v1/admin/analytics/performance
  - Métricas de rendimiento
  - Response times, error rates, throughput
  - Database performance

GET    /api/v1/admin/analytics/export
  - Exportar datos analytics
  - Formatos: CSV, Excel, JSON
  - Date range filtering
```

### 3.3 Admin - Base de Datos

```typescript
// src/routes/admin/database.ts

GET    /api/v1/admin/database/stats
  - Estadísticas de todas las tablas
  - Row counts, sizes, indexes

GET    /api/v1/admin/database/health
  - Health check de la base de datos
  - Connection pool status
  - Slow queries
  - Lock analysis

POST   /api/v1/admin/database/backup
  - Trigger database backup
  - Response: backup job ID

GET    /api/v1/admin/database/backups
  - Lista de backups disponibles
  - Sizes, dates, status

POST   /api/v1/admin/database/restore/:backupId
  - Restaurar desde backup
  - Requiere confirmación especial

GET    /api/v1/admin/database/queries/slow
  - Lista de queries lentas
  - Performance analysis

POST   /api/v1/admin/database/optimize
  - Run optimization tasks
  - VACUUM, ANALYZE, REINDEX
```

### 3.4 Admin - Especialidades Legales

```typescript
// src/routes/admin/specialties.ts

GET    /api/v1/admin/specialties
  - Lista todas las especialidades
  - Hierarchical tree structure

GET    /api/v1/admin/specialties/:id
  - Detalles de especialidad
  - Incluye document count

POST   /api/v1/admin/specialties
  - Crear nueva especialidad
  - Body: { code, name, description, parentId, icon, color }

PATCH  /api/v1/admin/specialties/:id
  - Actualizar especialidad

DELETE /api/v1/admin/specialties/:id
  - Eliminar especialidad
  - Validación: no puede tener documentos asociados

GET    /api/v1/admin/specialties/:id/documents
  - Documentos de una especialidad
  - Paginación

POST   /api/v1/admin/specialties/:id/reorder
  - Reordenar especialidades
  - Body: { sortOrders: [{ id, order }] }
```

### 3.5 Admin - Storage y Quotas

```typescript
// src/routes/admin/storage.ts

GET    /api/v1/admin/storage/overview
  - Vista general del almacenamiento
  - Total usado, disponible, por tier

GET    /api/v1/admin/storage/users
  - Desglose por usuario
  - Top users by storage
  - Users near quota limit

GET    /api/v1/admin/storage/documents
  - Análisis de documentos
  - Largest documents, by type, by age

PATCH  /api/v1/admin/users/:id/quota
  - Actualizar quota de usuario
  - Body: { storageGB, documentsLimit, monthlyQueries }

POST   /api/v1/admin/storage/cleanup
  - Trigger cleanup job
  - Remove old tmp files, orphaned chunks

GET    /api/v1/admin/storage/forecast
  - Proyección de crecimiento
  - Based on trends
```

### 3.6 Admin - Embeddings

```typescript
// src/routes/admin/embeddings.ts

GET    /api/v1/admin/embeddings/stats
  - Estadísticas de embeddings
  - Total vectors, by document type
  - Index health

GET    /api/v1/admin/embeddings/jobs
  - Lista de jobs de embedding
  - Status, progress, errors

POST   /api/v1/admin/embeddings/reindex/:documentId
  - Reindexar documento específico

POST   /api/v1/admin/embeddings/reindex-all
  - Reindexar todos los documentos
  - Background job

POST   /api/v1/admin/embeddings/test
  - Probar semantic search
  - Body: { query, topK }
  - Response: { results, scores, responseTime }

DELETE /api/v1/admin/embeddings/orphaned
  - Limpiar embeddings huérfanos
```

### 3.7 Admin - Audit Logs

```typescript
// src/routes/admin/audit.ts

GET    /api/v1/admin/audit-logs
  - Lista de audit logs
  - Filtros: user, action, entity, dateRange
  - Paginación

GET    /api/v1/admin/audit-logs/:id
  - Detalles de audit log específico

GET    /api/v1/admin/audit-logs/user/:userId
  - Audit logs de usuario específico

GET    /api/v1/admin/audit-logs/entity/:entity/:entityId
  - Audit logs de entidad específica
  - Ej: Case con ID xyz

POST   /api/v1/admin/audit-logs/export
  - Exportar audit logs
  - Formato: CSV, JSON
  - Date range required
```

### 3.8 Admin - System Health

```typescript
// src/routes/admin/system.ts

GET    /api/v1/admin/system/health
  - Overall system health
  - Response: {
      status: 'healthy' | 'degraded' | 'down',
      checks: {
        database: { status, latency },
        redis: { status, latency },
        openai: { status, latency },
        storage: { status, usage }
      }
    }

GET    /api/v1/admin/system/metrics
  - Métricas del sistema
  - CPU, memory, disk, network

GET    /api/v1/admin/system/logs
  - Application logs
  - Filtros: level, service, dateRange

GET    /api/v1/admin/system/config
  - Configuración del sistema
  - Environment variables (sanitized)

PATCH  /api/v1/admin/system/config
  - Actualizar configuración
  - Requiere reinicio en algunos casos
```

---

## 4. Frontend - Páginas del Panel de Admin

### 4.1 Dashboard Principal

**Ruta**: `/admin/dashboard`

**Componentes**:
- KPI Cards (usuarios, queries, costos, storage)
- Chart de queries por día (últimos 30 días)
- Chart de costos por modelo
- Lista de usuarios activos recientes
- Alertas del sistema (quotas excedidas, errores)

### 4.2 Gestión de Usuarios

**Ruta**: `/admin/users`

**Funcionalidades**:
- Tabla con todos los usuarios
- Filtros: role, plan, status, búsqueda
- Acciones en lote: suspender, cambiar plan
- Modal de edición de usuario
- Vista de detalles con tabs:
  - Información general
  - Quotas y uso
  - Actividad reciente
  - Audit logs

### 4.3 Especialidades Legales

**Ruta**: `/admin/specialties`

**Funcionalidades**:
- Tree view de especialidades jerárquicas
- Drag & drop para reordenar
- CRUD de especialidades
- Asignación de documentos a especialidades
- Estadísticas por especialidad

### 4.4 Analytics Avanzado

**Ruta**: `/admin/analytics`

**Tabs**:
1. **Overview**: Dashboard general
2. **Users**: Análisis de usuarios
3. **Queries**: Análisis de queries y costos
4. **Performance**: Métricas de rendimiento
5. **Costs**: Desglose detallado de costos

**Charts**:
- Time series (queries, costs, users)
- Pie charts (users by plan, queries by model)
- Bar charts (top users, top queries)
- Heatmaps (activity patterns)

### 4.5 Base de Datos

**Ruta**: `/admin/database`

**Funcionalidades**:
- Tabla de estadísticas de todas las tablas
- Health checks
- Backup management (create, list, restore)
- Slow query analysis
- Connection pool monitoring
- Query executor (con precauciones)

### 4.6 Storage Management

**Ruta**: `/admin/storage`

**Funcionalidades**:
- Overview de almacenamiento total
- Breakdown por usuario
- Documentos más grandes
- Proyecciones de crecimiento
- Cleanup tools

### 4.7 Embeddings Management

**Ruta**: `/admin/embeddings`

**Funcionalidades**:
- Estadísticas de vectores
- Jobs de reindexación (status, progress)
- Test de búsqueda semántica
- Limpieza de vectores huérfanos

### 4.8 Audit Logs

**Ruta**: `/admin/audit`

**Funcionalidades**:
- Tabla de audit logs con filtros avanzados
- Timeline view de acciones
- Exportar logs
- Búsqueda por usuario/entidad

### 4.9 System Health

**Ruta**: `/admin/system`

**Funcionalidades**:
- Health status de todos los servicios
- Métricas en tiempo real (CPU, memoria, etc.)
- Logs del sistema
- Configuración del sistema

---

## 5. Seguridad y Permisos

### 5.1 Niveles de Acceso Admin

```typescript
enum AdminPermission {
  // Users
  USERS_VIEW = 'users:view',
  USERS_EDIT = 'users:edit',
  USERS_DELETE = 'users:delete',

  // Legal Documents
  LEGAL_DOCS_VIEW = 'legal_docs:view',
  LEGAL_DOCS_EDIT = 'legal_docs:edit',
  LEGAL_DOCS_DELETE = 'legal_docs:delete',

  // Specialties
  SPECIALTIES_MANAGE = 'specialties:manage',

  // Analytics
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',

  // Database
  DATABASE_VIEW = 'database:view',
  DATABASE_BACKUP = 'database:backup',
  DATABASE_RESTORE = 'database:restore',
  DATABASE_EXECUTE = 'database:execute',

  // System
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',
  AUDIT_LOGS_VIEW = 'audit:view',

  // Super admin
  SUPER_ADMIN = 'super:admin'
}
```

### 5.2 Middleware de Autorización

```typescript
function requirePermission(permission: AdminPermission) {
  return async (request, reply) => {
    const user = request.user;

    if (user.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin access required' });
    }

    // Check specific permission
    const hasPermission = await checkUserPermission(user.id, permission);

    if (!hasPermission) {
      return reply.code(403).send({
        error: `Permission required: ${permission}`
      });
    }
  };
}
```

---

## 6. Integración con Plataformas Externas

### 6.1 PostgreSQL Directo

```typescript
// Raw queries para analytics avanzado
async function getAdvancedStats() {
  return prisma.$queryRaw`
    SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
      pg_stat_get_tuples_inserted(c.oid) as inserts,
      pg_stat_get_tuples_updated(c.oid) as updates,
      pg_stat_get_tuples_deleted(c.oid) as deletes
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  `;
}
```

### 6.2 Render API Integration

```typescript
// Integración con Render para métricas de infraestructura
import { RenderClient } from 'render-api-client';

async function getRenderMetrics() {
  const render = new RenderClient(process.env.RENDER_API_KEY);

  const services = await render.getServices();
  const databases = await render.getDatabases();

  return {
    services: services.map(s => ({
      name: s.name,
      status: s.status,
      region: s.region,
      plan: s.plan
    })),
    databases: databases.map(d => ({
      name: d.name,
      plan: d.plan,
      region: d.region,
      connections: d.activeConnections
    }))
  };
}
```

### 6.3 Supabase Integration (Opcional)

```typescript
// Si se usa Supabase como almacenamiento alternativo
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function getSupabaseStats() {
  const { data, error } = await supabase
    .from('_supabase_admin')
    .select('*');

  return {
    storage: await supabase.storage.getBuckets(),
    auth: await supabase.auth.admin.listUsers()
  };
}
```

---

## 7. Plan de Implementación

### Fase 1: Base de Datos (2-3 días)
1. Crear nuevos modelos Prisma
2. Generar migraciones
3. Crear seeds para especialidades legales
4. Actualizar modelos existentes

### Fase 2: Backend Admin APIs (5-7 días)
1. Rutas de gestión de usuarios
2. Rutas de analytics
3. Rutas de base de datos
4. Rutas de especialidades
5. Rutas de storage/quotas
6. Rutas de embeddings
7. Rutas de audit logs
8. Rutas de system health

### Fase 3: Frontend Admin Panel (5-7 días)
1. Dashboard principal con KPIs
2. Gestión de usuarios
3. Especialidades legales
4. Analytics avanzado
5. Database management
6. Storage management
7. Embeddings management
8. Audit logs viewer
9. System health monitor

### Fase 4: Integración y Testing (2-3 días)
1. Testing de endpoints
2. Testing de UI
3. Performance testing
4. Security audit
5. Documentation

### Fase 5: Deployment (1 día)
1. Deploy a staging
2. QA testing
3. Deploy a production
4. Monitoring setup

---

## 8. Tecnologías y Librerías Adicionales

### Backend
```json
{
  "pg-stat-statements": "PostgreSQL stats extension",
  "bull": "Job queue for background tasks",
  "node-cron": "Scheduled tasks (daily metrics, cleanup)",
  "winston": "Advanced logging",
  "prom-client": "Prometheus metrics"
}
```

### Frontend
```json
{
  "recharts": "Charts y gráficos",
  "react-table": "Tablas avanzadas",
  "react-beautiful-dnd": "Drag & drop",
  "date-fns": "Manipulación de fechas",
  "react-query": "Data fetching ya instalado"
}
```

---

## 9. Métricas de Éxito

### KPIs del Sistema
- Uptime > 99.9%
- Response time < 200ms (p95)
- Error rate < 0.1%
- User satisfaction > 4.5/5

### KPIs Operacionales
- Time to resolve user issues < 2 hours
- Admin tasks completion rate > 95%
- Cost optimization > 20% reduction
- Storage efficiency > 80%

---

**Documento Version**: 1.0
**Fecha**: 2025-01-08
**Autor**: Claude Code + Usuario
**Estado**: Diseño Completo - Listo para Implementación
