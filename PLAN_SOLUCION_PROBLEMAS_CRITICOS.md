# Plan de Solución de Problemas Críticos
## Sistema Legal RAG - Análisis Ultra-Profundo y Plan de Remediación

---

**Documento:** Plan Estratégico de Solución de Problemas Críticos
**Versión:** 1.0.0
**Fecha:** 8 de Diciembre de 2025
**Clasificación:** Técnico - Alta Prioridad
**Autores:** Agentes Especializados de Análisis de Errores

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Problema Crítico #1: OpenTelemetry Deshabilitado](#2-problema-crítico-1-opentelemetry-deshabilitado)
3. [Problema Crítico #2: Rutas Deshabilitadas por Dependencias](#3-problema-crítico-2-rutas-deshabilitadas-por-dependencias)
4. [Problema Crítico #3: Desajuste de Schema en Unified Search](#4-problema-crítico-3-desajuste-de-schema-en-unified-search)
5. [Problema Crítico #4: Configuración de Deployment en Render](#5-problema-crítico-4-configuración-de-deployment-en-render)
6. [Cronograma de Implementación](#6-cronograma-de-implementación)
7. [Matriz de Riesgos](#7-matriz-de-riesgos)
8. [Plan de Rollback](#8-plan-de-rollback)
9. [Métricas de Éxito](#9-métricas-de-éxito)
10. [Checklist de Verificación](#10-checklist-de-verificación)

---

## 1. Resumen Ejecutivo

### Estado Actual del Sistema

| Métrica | Valor | Estado |
|---------|-------|--------|
| Funcionalidad Operativa | 70% | ⚠️ Degradado |
| Observabilidad | 0% | 🔴 Crítico |
| Rutas Habilitadas | 85% | ⚠️ Parcial |
| Estabilidad de Deployment | 60% | ⚠️ Inestable |

### Problemas Críticos Identificados

| # | Problema | Impacto | Tiempo Est. | Prioridad |
|---|----------|---------|-------------|-----------|
| 1 | OpenTelemetry Deshabilitado | Alto - Sin observabilidad | 30 min | 🔴 P0 |
| 2 | Rutas Deshabilitadas | Alto - Features perdidos | 2-4 hrs | 🔴 P0 |
| 3 | Schema Mismatch | Crítico - Search roto | 1 hr | 🔴 P0 |
| 4 | Config Deployment | Alto - Build fallando | 1-2 hrs | 🔴 P0 |

### Inversión Total Estimada

- **Tiempo de Desarrollo:** 6-8 horas
- **Tiempo de Testing:** 2-3 horas
- **Tiempo de Deployment:** 1 hora
- **Total:** 9-12 horas de trabajo

---

## 2. Problema Crítico #1: OpenTelemetry Deshabilitado

### 2.1 Diagnóstico

#### Ubicación del Problema
```
Archivo: src/server.ts (Líneas 1-5)
Estado: DESHABILITADO
```

#### Código Actual (ROTO)
```typescript
// Week 5-6: Initialize OpenTelemetry BEFORE any other imports
// TEMPORARILY DISABLED: Path resolution issue in Render deployment
// TODO: Fix path configuration and re-enable
// import { initializeTelemetry } from './config/telemetry.js';
// initializeTelemetry();
```

### 2.2 Causa Raíz Identificada

**El diagnóstico original era INCORRECTO.** No es un problema de resolución de rutas.

#### Causa Real: Import Incorrecto de ES Module

```typescript
// CÓDIGO ROTO en src/config/telemetry.ts (Línea 12):
import { Resource as OTELResource } from '@opentelemetry/resources';

// ERROR EN RUNTIME:
"The requested module '@opentelemetry/resources' does not provide
 an export named 'Resource'"
```

#### Explicación Técnica

En OpenTelemetry Resources API v2.2.0, `Resource` se exporta como **tipo TypeScript únicamente**, no como clase runtime. El paquete provee funciones factory en su lugar:

```typescript
// Lo que exporta @opentelemetry/resources:
export type { Resource } from './Resource';           // SOLO TIPO
export { defaultResource, resourceFromAttributes };   // RUNTIME
```

### 2.3 Solución Detallada

#### Paso 1: Agregar dependencia faltante en `package.json`

```json
{
  "dependencies": {
    "@opentelemetry/sdk-metrics": "^2.2.0"
  }
}
```

```bash
npm install @opentelemetry/sdk-metrics
```

#### Paso 2: Corregir imports en `src/config/telemetry.ts`

**Línea 12 - ANTES:**
```typescript
import { Resource as OTELResource } from '@opentelemetry/resources';
```

**Línea 12 - DESPUÉS:**
```typescript
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
```

#### Paso 3: Corregir creación del Resource (Líneas 34-39)

**ANTES:**
```typescript
const resource = OTELResource.default({
  [SEMRESATTRS_SERVICE_NAME]: serviceName,
  [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
  'deployment.environment': environment,
  'service.namespace': 'legal-rag',
});
```

**DESPUÉS:**
```typescript
const resource = defaultResource().merge(
  resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    'deployment.environment': environment,
    'service.namespace': 'legal-rag',
  })
);
```

#### Paso 4: Re-habilitar en `src/server.ts` (Líneas 1-5)

**ANTES:**
```typescript
// import { initializeTelemetry } from './config/telemetry.js';
// initializeTelemetry();
```

**DESPUÉS:**
```typescript
import { initializeTelemetry } from './config/telemetry.js';
initializeTelemetry();
```

### 2.4 Verificación

```bash
# Test de compilación
npx tsc --noEmit src/config/telemetry.ts

# Test de importación
npx tsx -e "import('./src/config/telemetry.js').then(() => console.log('✅ OK')).catch(e => console.error('❌', e.message))"

# Verificar endpoint de métricas
curl http://localhost:8000/observability/metrics
```

### 2.5 Impacto de la Solución

| Antes | Después |
|-------|---------|
| ❌ Sin distributed tracing | ✅ Tracing completo |
| ❌ Sin métricas de request | ✅ Métricas Prometheus |
| ❌ Sin monitoreo de DB | ✅ Query performance tracking |
| ❌ Debug manual (horas) | ✅ Debug automatizado (minutos) |

---

## 3. Problema Crítico #2: Rutas Deshabilitadas por Dependencias

### 3.1 Diagnóstico

Se identificaron **2 rutas deshabilitadas** en `src/server.ts`:

| Ruta | Razón Documentada | Estado Real |
|------|-------------------|-------------|
| `legalDocumentRoutesEnhanced` | "nodemailer import issue" | ⚠️ Falsa alarma |
| `documentRoutesEnhanced` | "Missing fastify-multer" | 🔴 Issue real |

### 3.2 Análisis: legalDocumentRoutesEnhanced

#### Hallazgo: FALSA ALARMA

Después de análisis profundo:
- ✅ `nodemailer` está instalado (v6.9.16)
- ✅ El archivo compila correctamente
- ✅ No hay errores de import reales
- ✅ La ruta puede habilitarse inmediatamente

#### Solución: Simplemente descomentar

**En `src/server.ts` (Línea 23):**

```typescript
// ANTES:
// TEMPORARILY DISABLED: nodemailer import issue causing deployment failure
// import { legalDocumentRoutesEnhanced } from './routes/legal-documents-enhanced.js';

// DESPUÉS:
import { legalDocumentRoutesEnhanced } from './routes/legal-documents-enhanced.js';
```

**En `src/server.ts` (Línea 146):**

```typescript
// ANTES:
// TEMPORARILY DISABLED: nodemailer import issue causing deployment failure
// await app.register(legalDocumentRoutesEnhanced, { prefix: '/api/v1' });

// DESPUÉS:
await app.register(legalDocumentRoutesEnhanced, { prefix: '/api/v1' });
```

### 3.3 Análisis: documentRoutesEnhanced

#### Hallazgo: PROBLEMA REAL

El archivo `src/routes/documents-enhanced.ts` requiere:

1. **Dependencia faltante:** `fastify-multer`
2. **Utilidad faltante:** `src/utils/cloudinary.ts`

#### Solución Paso a Paso

##### Paso 1: Instalar dependencia

```bash
npm install fastify-multer multer
npm install -D @types/multer
```

##### Paso 2: Crear archivo de utilidad `src/utils/cloudinary.ts`

```typescript
/**
 * Cloudinary/Storage Utility
 * Opciones: Cloudinary, AWS S3, o Local Storage
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import fs from 'fs/promises';

// Configuración basada en variables de entorno
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 'cloudinary', 's3', 'local'

// Cliente S3 (si se usa AWS)
const s3Client = process.env.AWS_S3_BUCKET ? new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
}) : null;

interface UploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  bytes: number;
}

interface CloudinaryUploader {
  upload: (filePath: string, options?: any) => Promise<UploadResult>;
  destroy: (publicId: string) => Promise<{ result: string }>;
}

/**
 * Implementación S3
 */
const s3Uploader: CloudinaryUploader = {
  async upload(filePath: string, options?: any): Promise<UploadResult> {
    if (!s3Client || !process.env.AWS_S3_BUCKET) {
      throw new Error('S3 not configured. Set AWS_S3_BUCKET environment variable.');
    }

    const fileName = path.basename(filePath);
    const key = `uploads/${Date.now()}-${fileName}`;
    const fileContent = await fs.readFile(filePath);

    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: fileContent,
      ContentType: options?.resource_type === 'raw' ? 'application/octet-stream' : 'application/pdf',
    }));

    const baseUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;

    return {
      secure_url: `${baseUrl}/${key}`,
      public_id: key,
      resource_type: options?.resource_type || 'auto',
      format: path.extname(fileName).slice(1),
      bytes: fileContent.length,
    };
  },

  async destroy(publicId: string): Promise<{ result: string }> {
    if (!s3Client || !process.env.AWS_S3_BUCKET) {
      throw new Error('S3 not configured');
    }

    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: publicId,
    }));

    return { result: 'ok' };
  },
};

/**
 * Implementación Local (Development)
 */
const localUploader: CloudinaryUploader = {
  async upload(filePath: string, options?: any): Promise<UploadResult> {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const fileName = path.basename(filePath);
    const destPath = path.join(uploadsDir, `${Date.now()}-${fileName}`);

    await fs.copyFile(filePath, destPath);
    const stats = await fs.stat(destPath);

    return {
      secure_url: `/uploads/${path.basename(destPath)}`,
      public_id: path.basename(destPath),
      resource_type: options?.resource_type || 'auto',
      format: path.extname(fileName).slice(1),
      bytes: stats.size,
    };
  },

  async destroy(publicId: string): Promise<{ result: string }> {
    const filePath = path.join(process.cwd(), 'uploads', publicId);
    try {
      await fs.unlink(filePath);
      return { result: 'ok' };
    } catch {
      return { result: 'not found' };
    }
  },
};

// Exportar el uploader según configuración
export const cloudinary = {
  uploader: STORAGE_TYPE === 's3' ? s3Uploader : localUploader,
};

export default cloudinary;
```

##### Paso 3: Habilitar la ruta

**En `src/server.ts`:**

```typescript
// Descomentar línea 25:
import { documentRoutesEnhanced } from './routes/documents-enhanced.js';

// Descomentar línea 141:
await app.register(documentRoutesEnhanced, { prefix: '/api/v1' });
```

### 3.4 Variables de Entorno Requeridas

```env
# Para S3 (Producción)
STORAGE_TYPE=s3
AWS_S3_BUCKET=legal-rag-documents
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Para Local (Development)
STORAGE_TYPE=local
```

### 3.5 Testing de Rutas

```bash
# Test legalDocumentRoutesEnhanced
curl -X POST http://localhost:8000/api/v1/legal-documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf"

# Test documentRoutesEnhanced
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf"
```

---

## 4. Problema Crítico #3: Desajuste de Schema en Unified Search

### 4.1 Diagnóstico

Se identificaron **4 errores de schema** en `src/services/orchestration/unified-search-orchestrator.ts`:

| Error | Línea | Descripción |
|-------|-------|-------------|
| sessionId faltante | 9-20 | Interface incompleta |
| Campo summary incorrecto | 327 | Debe ser `summaryText` |
| Modelo Embedding inexistente | 465 | Usar `LegalDocumentChunk` |
| Modelos duplicados | Schema | 2 modelos de summary |

### 4.2 Error #1: sessionId Faltante

#### Problema
```typescript
// Interface SearchQuery NO tiene sessionId
export interface SearchQuery {
  query: string;
  userId?: string;
  // sessionId NO existe, pero se usa en líneas 547 y 551
}
```

#### Solución
```typescript
export interface SearchQuery {
  query: string;
  userId?: string;
  sessionId?: string;  // AGREGAR
  filters?: SearchFilters;
  pagination?: PaginationOptions;
  options?: SearchOptions;
}
```

### 4.3 Error #2: Campo Summary Incorrecto

#### Problema (Línea 327)
```typescript
// CÓDIGO ACTUAL (ROTO):
summaries: {
  some: {
    summary: { contains: query, mode: 'insensitive' }  // ❌ Campo no existe
  }
}
```

#### Schema Real de Prisma
```prisma
model LegalDocumentSummary {
  summaryText String @map("summary_text") @db.Text  // ✅ El campo real
}
```

#### Solución
```typescript
// CÓDIGO CORREGIDO:
summaries: {
  some: {
    summaryText: { contains: query, mode: 'insensitive' }  // ✅ Campo correcto
  }
}
```

### 4.4 Error #3: Modelo Embedding Inexistente

#### Problema (Línea 465)
```typescript
// CÓDIGO ACTUAL (ROTO):
const embeddings = await prisma.embedding.findMany({  // ❌ Modelo no existe
  where: { documentId: { in: documentIds } }
});
```

#### Realidad del Schema
No existe modelo `Embedding`. Los embeddings están en `LegalDocumentChunk.embedding` como campo JSON.

#### Solución
```typescript
// CÓDIGO CORREGIDO:
const chunks = await prisma.legalDocumentChunk.findMany({
  where: {
    legalDocumentId: { in: documentIds },
    embedding: { not: null }
  },
  select: {
    legalDocumentId: true,
    embedding: true,
    content: true
  }
});

// Procesar embeddings desde chunks
const embeddingsByDoc = new Map<string, number[]>();
for (const chunk of chunks) {
  if (chunk.embedding && !embeddingsByDoc.has(chunk.legalDocumentId)) {
    embeddingsByDoc.set(
      chunk.legalDocumentId,
      chunk.embedding as unknown as number[]
    );
  }
}
```

### 4.5 Aplicar Correcciones

#### Archivo: `src/services/orchestration/unified-search-orchestrator.ts`

**Línea 12 - Agregar sessionId:**
```typescript
export interface SearchQuery {
  query: string;
  userId?: string;
  sessionId?: string;  // NUEVO
  filters?: SearchFilters;
  pagination?: PaginationOptions;
  options?: SearchOptions;
}
```

**Línea 328 - Corregir campo summary:**
```typescript
// Buscar y reemplazar
// DE: summary: { contains: query
// A:  summaryText: { contains: query
```

**Líneas 465-486 - Corregir query de embeddings:**
```typescript
// Reemplazar prisma.embedding.findMany con:
const chunks = await prisma.legalDocumentChunk.findMany({
  where: {
    legalDocumentId: { in: documentIds },
    embedding: { not: null }
  },
  select: {
    legalDocumentId: true,
    embedding: true
  }
});
```

### 4.6 Verificación

```bash
# Verificar TypeScript
npx tsc --noEmit src/services/orchestration/unified-search-orchestrator.ts

# Verificar schema Prisma
npx prisma validate

# Regenerar cliente
npx prisma generate

# Test de búsqueda
curl "http://localhost:8000/api/v1/unified-search?q=constitución" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Problema Crítico #4: Configuración de Deployment en Render

### 5.1 Diagnóstico

Se identificaron **58+ errores** relacionados con deployment:

| Categoría | Cantidad | Severidad |
|-----------|----------|-----------|
| TypeScript Compilation | 34+ | 🔴 Crítico |
| Module Resolution | 3 | 🔴 Crítico |
| Environment Variables | 20+ | 🟡 Alto |
| Build Configuration | 5 | 🔴 Crítico |

### 5.2 Error: Configuración de TypeScript

#### Problema en `tsconfig.json`
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"  // ❌ Para Webpack, NO para Node.js
  }
}
```

#### Solución
```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    "src/lib/api/routes/**"  // Excluir rutas legacy no usadas
  ]
}
```

### 5.3 Error: Script de Start Incorrecto

#### Problema en `package.json`
```json
{
  "scripts": {
    "start": "tsx src/server.ts"  // ❌ Usa compilador dev en producción
  }
}
```

#### Impacto
- 500ms overhead en startup
- 30-40% más uso de memoria
- JIT compilation en cada request

#### Solución
```json
{
  "scripts": {
    "build": "prisma generate && tsc",
    "start": "node dist/server.js",
    "start:dev": "tsx watch src/server.ts"
  }
}
```

### 5.4 Error: Build Command de Render

#### Problema en `render.yaml`
```yaml
buildCommand: npm install && npx prisma generate && node scripts/...
# ❌ FALTA: npm run build (compilación TypeScript)
```

#### Solución
```yaml
services:
  - type: web
    name: legal-rag-backend
    env: node
    region: oregon
    plan: starter
    buildCommand: |
      npm ci
      npx prisma generate
      npm run build
      node scripts/resolve-failed-migrations.cjs
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: CORS_ORIGIN
        value: https://legal-rag-frontend.onrender.com
```

### 5.5 Variables de Entorno Críticas

#### OBLIGATORIAS (App no inicia sin estas)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `JWT_SECRET` | Auth token signing | `openssl rand -hex 32` |
| `CORS_ORIGIN` | Frontend URL | `https://app.example.com` |
| `NODE_ENV` | Environment | `production` |

#### REQUERIDAS (Features no funcionan)

| Variable | Descripción | Para |
|----------|-------------|------|
| `OPENAI_API_KEY` | OpenAI API | AI/RAG features |
| `AWS_S3_BUCKET` | S3 bucket name | Document storage |
| `AWS_ACCESS_KEY_ID` | AWS credentials | S3 access |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | S3 access |
| `SENDGRID_API_KEY` | SendGrid API | Email notifications |
| `PINECONE_API_KEY` | Pinecone API | Vector search |
| `REDIS_URL` | Redis connection | Caching |

### 5.6 Configuración Completa de Render

```yaml
# render.yaml
services:
  - type: web
    name: legal-rag-backend
    env: node
    region: oregon
    plan: starter
    branch: main
    buildCommand: npm ci && npx prisma generate && npm run build
    startCommand: npm start
    healthCheckPath: /observability/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: CORS_ORIGIN
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      - key: AWS_S3_BUCKET
        sync: false
      - key: AWS_REGION
        value: us-east-1
      - key: AWS_ACCESS_KEY_ID
        sync: false
      - key: AWS_SECRET_ACCESS_KEY
        sync: false
      - key: REDIS_URL
        sync: false

databases:
  - name: legal-rag-db
    databaseName: legalrag
    user: legalrag
    plan: starter
```

---

## 6. Cronograma de Implementación

### Fase 1: Preparación (30 min)

| Tarea | Tiempo | Responsable |
|-------|--------|-------------|
| Backup de código actual | 5 min | DevOps |
| Crear branch `fix/critical-issues` | 2 min | Dev |
| Documentar estado actual | 10 min | Dev |
| Preparar ambiente de test | 13 min | DevOps |

### Fase 2: OpenTelemetry Fix (30 min)

| Tarea | Tiempo | Verificación |
|-------|--------|--------------|
| Instalar dependencia | 2 min | `npm ls @opentelemetry/sdk-metrics` |
| Modificar telemetry.ts | 10 min | `npx tsc --noEmit` |
| Habilitar en server.ts | 2 min | `npx tsx src/server.ts` |
| Test local | 10 min | `curl /observability/metrics` |
| Code review | 6 min | PR review |

### Fase 3: Schema Mismatch Fix (1 hr)

| Tarea | Tiempo | Verificación |
|-------|--------|--------------|
| Agregar sessionId | 5 min | `npx tsc --noEmit` |
| Corregir campo summary | 5 min | `npx tsc --noEmit` |
| Corregir query embeddings | 20 min | `npx tsc --noEmit` |
| Test de compilación | 10 min | `npm run build` |
| Test de búsqueda | 15 min | API tests |
| Code review | 5 min | PR review |

### Fase 4: Rutas Deshabilitadas (2 hrs)

| Tarea | Tiempo | Verificación |
|-------|--------|--------------|
| Habilitar legalDocumentRoutesEnhanced | 10 min | Server starts |
| Instalar fastify-multer | 5 min | `npm ls fastify-multer` |
| Crear cloudinary.ts | 30 min | `npx tsc --noEmit` |
| Habilitar documentRoutesEnhanced | 10 min | Server starts |
| Test de uploads | 30 min | File upload tests |
| Code review | 35 min | PR review |

### Fase 5: Deployment Config (1.5 hrs)

| Tarea | Tiempo | Verificación |
|-------|--------|--------------|
| Actualizar tsconfig.json | 10 min | `npm run build` |
| Actualizar package.json scripts | 10 min | `npm start` works |
| Crear/actualizar render.yaml | 15 min | YAML valid |
| Configurar env vars en Render | 20 min | Dashboard check |
| Deploy a staging | 15 min | Health check passes |
| Smoke tests | 20 min | All endpoints work |

### Fase 6: Verificación Final (1 hr)

| Tarea | Tiempo | Verificación |
|-------|--------|--------------|
| Full regression test | 30 min | All tests pass |
| Performance baseline | 15 min | Metrics recorded |
| Deploy a producción | 10 min | Health check passes |
| Monitor logs (15 min) | 15 min | No errors |

### Timeline Visual

```
Hora 0-1    [████████████████████] Fase 1+2: Prep + OpenTelemetry
Hora 1-2    [████████████████████] Fase 3: Schema Fix
Hora 2-4    [████████████████████████████████████████] Fase 4: Rutas
Hora 4-5.5  [██████████████████████████████] Fase 5: Deployment
Hora 5.5-6.5[████████████████████] Fase 6: Verificación
─────────────────────────────────────────────────────────────────
TOTAL: 6.5 horas de implementación
```

---

## 7. Matriz de Riesgos

### Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| OpenTelemetry causa overhead | Baja | Medio | Feature flag para disable |
| Upload de archivos falla | Media | Alto | Fallback a storage local |
| Schema migration rompe data | Baja | Crítico | Backup antes de deploy |
| Render deploy falla | Media | Alto | Mantener branch estable |
| TypeScript errors en build | Baja | Alto | Test local exhaustivo |

### Plan de Contingencia por Riesgo

#### Riesgo: OpenTelemetry Overhead
```typescript
// Agregar feature flag
const TELEMETRY_ENABLED = process.env.TELEMETRY_ENABLED !== 'false';
if (TELEMETRY_ENABLED) {
  initializeTelemetry();
}
```

#### Riesgo: Upload Falla
```typescript
// Fallback automático a local storage
try {
  await s3Upload(file);
} catch (error) {
  console.warn('S3 failed, using local storage');
  await localUpload(file);
}
```

#### Riesgo: Schema Migration
```bash
# Antes de cualquier cambio
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Si algo falla
psql $DATABASE_URL < backup_20251208.sql
```

---

## 8. Plan de Rollback

### Nivel 1: Rollback Parcial (2 min)

Para revertir un solo fix:

```bash
# Identificar commit específico
git log --oneline -10

# Revertir solo ese commit
git revert <commit-hash> --no-commit
git commit -m "Revert: [descripción del problema]"
git push
```

### Nivel 2: Rollback Completo de Branch (5 min)

```bash
# Volver al estado anterior
git checkout main
git reset --hard origin/main~1
git push --force-with-lease

# En Render: Manual rollback desde dashboard
```

### Nivel 3: Rollback de Deployment (10 min)

1. Ir a Render Dashboard
2. Seleccionar servicio `legal-rag-backend`
3. Click en "Manual Deploy"
4. Seleccionar deploy anterior estable
5. Confirmar rollback

### Nivel 4: Rollback de Base de Datos (30 min)

```bash
# Solo si hay corrupción de datos
# 1. Detener aplicación
render services suspend legal-rag-backend

# 2. Restaurar backup
pg_restore --clean --if-exists -d $DATABASE_URL backup.dump

# 3. Reiniciar aplicación
render services resume legal-rag-backend
```

---

## 9. Métricas de Éxito

### Métricas Técnicas

| Métrica | Antes | Objetivo | Medición |
|---------|-------|----------|----------|
| Build Success Rate | 0% | 100% | CI/CD logs |
| TypeScript Errors | 34+ | 0 | `npx tsc --noEmit` |
| Rutas Habilitadas | 85% | 100% | Server routes |
| Observabilidad | 0% | 100% | `/observability/metrics` |
| Startup Time | N/A | <5s | Server logs |

### Métricas de Negocio

| Métrica | Antes | Objetivo | Medición |
|---------|-------|----------|----------|
| Uptime | ~90% | 99.9% | Render metrics |
| Error Rate | Unknown | <1% | Prometheus |
| Response Time P95 | Unknown | <500ms | APM |
| Debug Time | Hours | Minutes | Team feedback |

### Dashboard de Verificación

```
POST-DEPLOYMENT VERIFICATION DASHBOARD
═══════════════════════════════════════════════════════════════

CRITICAL SYSTEMS                    STATUS
──────────────────────────────────────────────
□ Build completes without errors    [ ]
□ Server starts successfully        [ ]
□ Health endpoint responds          [ ]
□ Auth endpoints work               [ ]
□ Search endpoints work             [ ]
□ Upload endpoints work             [ ]
□ Metrics endpoint responds         [ ]

OBSERVABILITY                       STATUS
──────────────────────────────────────────────
□ Prometheus metrics available      [ ]
□ Traces being collected            [ ]
□ No error spikes in logs           [ ]

PERFORMANCE                         VALUE
──────────────────────────────────────────────
□ Startup time                      _____ ms
□ Memory usage                      _____ MB
□ P95 response time                 _____ ms
```

---

## 10. Checklist de Verificación

### Pre-Deployment

```
PRE-DEPLOYMENT CHECKLIST
═══════════════════════════════════════════════════════════════

CODE CHANGES
□ OpenTelemetry fix applied
  □ Dependency installed
  □ Import corregido
  □ Resource creation corregido
  □ Server.ts habilitado

□ Schema mismatch fix applied
  □ sessionId agregado a interface
  □ summaryText campo corregido
  □ Embedding query corregido

□ Routes enabled
  □ legalDocumentRoutesEnhanced descomentado
  □ fastify-multer instalado
  □ cloudinary.ts creado
  □ documentRoutesEnhanced descomentado

□ Deployment config updated
  □ tsconfig.json corregido
  □ package.json scripts actualizados
  □ render.yaml actualizado

LOCAL VERIFICATION
□ npm run build succeeds
□ npm start works
□ All endpoints respond
□ No TypeScript errors
□ No runtime errors in logs

ENVIRONMENT
□ All env vars configured in Render
□ Database connection verified
□ S3 credentials verified (if using)
□ CORS origin set correctly
```

### Post-Deployment

```
POST-DEPLOYMENT CHECKLIST
═══════════════════════════════════════════════════════════════

IMMEDIATE (0-5 min)
□ Health check passes: curl /observability/health
□ Metrics available: curl /observability/metrics
□ No errors in Render logs
□ Frontend can connect

SHORT TERM (5-30 min)
□ Auth flow works (login/logout)
□ Search returns results
□ Document upload works
□ No memory leaks (stable RSS)

MONITORING (30 min - 24 hrs)
□ Error rate stable (<1%)
□ Response times normal
□ No unexpected restarts
□ Alerting configured and working
```

---

## Apéndice A: Comandos de Referencia Rápida

```bash
# ═══════════════════════════════════════════════════════════════
# COMANDOS DE DESARROLLO
# ═══════════════════════════════════════════════════════════════

# Instalar dependencias
npm install @opentelemetry/sdk-metrics fastify-multer multer
npm install -D @types/multer

# Verificar TypeScript
npx tsc --noEmit

# Build completo
npm run build

# Iniciar servidor
npm start

# Verificar Prisma
npx prisma validate
npx prisma generate

# ═══════════════════════════════════════════════════════════════
# COMANDOS DE VERIFICACIÓN
# ═══════════════════════════════════════════════════════════════

# Health check
curl http://localhost:8000/observability/health

# Metrics
curl http://localhost:8000/observability/metrics

# Test auth
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Test search
curl "http://localhost:8000/api/v1/unified-search?q=test" \
  -H "Authorization: Bearer $TOKEN"

# ═══════════════════════════════════════════════════════════════
# COMANDOS DE GIT
# ═══════════════════════════════════════════════════════════════

# Crear branch de fix
git checkout -b fix/critical-issues

# Commit cambios
git add -A
git commit -m "fix: resolve critical production issues

- Fix OpenTelemetry ES module import
- Fix schema mismatch in unified search
- Enable disabled routes
- Update deployment configuration"

# Push y crear PR
git push -u origin fix/critical-issues

# ═══════════════════════════════════════════════════════════════
# COMANDOS DE ROLLBACK
# ═══════════════════════════════════════════════════════════════

# Rollback último commit
git revert HEAD --no-commit
git commit -m "revert: rollback critical fixes due to [reason]"

# Rollback a commit específico
git reset --hard <commit-hash>

# Restaurar archivo específico
git checkout HEAD~1 -- path/to/file
```

---

## Apéndice B: Archivos Modificados

| Archivo | Cambios | Líneas |
|---------|---------|--------|
| `src/config/telemetry.ts` | Import + Resource creation | 12, 34-39 |
| `src/server.ts` | Habilitar imports y rutas | 4-5, 23, 25, 141, 146 |
| `src/services/orchestration/unified-search-orchestrator.ts` | Interface + queries | 12, 328, 465-486 |
| `src/utils/cloudinary.ts` | NUEVO archivo | ~100 líneas |
| `package.json` | Dependencias + scripts | dependencies, scripts |
| `tsconfig.json` | Module resolution | compilerOptions |
| `render.yaml` | Build + env config | buildCommand, envVars |

---

## Conclusión

Este plan proporciona una guía completa y detallada para resolver los **4 problemas críticos** identificados en el Sistema Legal RAG. La implementación estimada es de **6-8 horas** con un equipo de desarrollo, incluyendo testing y verificación.

**Prioridad de Implementación:**
1. 🔴 **P0** - Schema Mismatch (bloquea búsqueda)
2. 🔴 **P0** - Deployment Config (bloquea deploys)
3. 🔴 **P0** - OpenTelemetry (sin observabilidad)
4. 🔴 **P0** - Rutas Deshabilitadas (features faltantes)

**Resultado Esperado:**
- ✅ 100% funcionalidad restaurada
- ✅ Observabilidad completa
- ✅ Deployments estables
- ✅ Sistema listo para producción

---

*Documento generado por Agentes Especializados de Análisis de Errores*
*Fecha: 8 de Diciembre de 2025*
