# 📤 Sistema Completo de Carga y Procesamiento de Documentos Legales
## Poweria Legal - Documentación Técnica de Upload & Vectorización

**Fecha**: 11 de Noviembre de 2025
**Versión**: 2.0.0
**Última Actualización**: 11-11-2025
**Estado**: Producción Activa

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Flujo Completo de Carga](#flujo-completo-de-carga)
4. [Backend - APIs de Carga](#backend-apis-de-carga)
5. [Procesamiento Asíncrono](#procesamiento-asíncrono)
6. [Análisis con IA](#análisis-con-ia)
7. [Vectorización y Embeddings](#vectorización-y-embeddings)
8. [Base de Datos](#base-de-datos)
9. [Redis y Colas](#redis-y-colas)
10. [Sistema de Eventos](#sistema-de-eventos)
11. [Frontend (Implementación)](#frontend-implementación)
12. [Seguridad y Permisos](#seguridad-y-permisos)
13. [Monitoreo y Logs](#monitoreo-y-logs)
14. [Ejemplos de Uso](#ejemplos-de-uso)
15. [Troubleshooting](#troubleshooting)
16. [Roadmap](#roadmap)

---

## 🎯 Resumen Ejecutivo

El sistema de carga de documentos legales es una solución integral que permite a los administradores subir, procesar y vectorizar documentos legales de forma automática. El sistema está diseñado con arquitectura event-driven y procesamiento asíncrono mediante colas Redis/BullMQ.

### Características Principales

✅ **Carga de Documentos Legales Globales**: Sistema exclusivo para administradores
✅ **Procesamiento Automático con IA**: Análisis completo usando GPT-4 y OpenAI
✅ **Vectorización con OpenAI**: Embeddings de 1536 dimensiones usando text-embedding-ada-002
✅ **Extracción Inteligente**: Artículos, secciones, capítulos, títulos automáticos
✅ **Generación de Resúmenes**: Múltiples niveles (ejecutivo, capítulos, secciones)
✅ **Sistema de Colas Redis**: Procesamiento asíncrono con BullMQ
✅ **Event-Driven Architecture**: Event Bus para desacoplamiento de servicios
✅ **Búsqueda Semántica**: pgvector para similaridad coseno
✅ **Seguimiento de Estado**: Tracking en tiempo real del procesamiento
✅ **Registro de Auditoría**: Logs completos de todas las operaciones

### Stack Tecnológico

**Backend**:
- Node.js 20.x + TypeScript 5.3.3
- Fastify 4.26.0 (API REST)
- Prisma 5.10.0 (ORM)
- BullMQ 5.63.0 (Job Queues)
- OpenAI SDK 4.28.0 (GPT-4, Embeddings)

**Base de Datos**:
- PostgreSQL 16 + pgvector 0.5.1
- Redis Cloud (Upstash) para colas y caché

**IA y ML**:
- OpenAI GPT-4 (análisis y resúmenes)
- text-embedding-ada-002 (vectorización 1536D)
- Búsqueda semántica con cosine similarity

**Hosting**:
- Render.com (Backend + PostgreSQL)
- Redis Cloud (Upstash) - Colas y caché

---

## 🏗️ Arquitectura del Sistema

### Arquitectura Multi-Capa

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │   Admin Panel - Upload Legal Documents Interface       │  │
│  │   (A implementar - Ver sección Frontend)               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/HTTPS
                           │ POST /api/legal-documents/upload
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API (Fastify)                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Authentication Middleware (JWT + Role Check)          │  │
│  │  ├─ Verify JWT Token                                   │  │
│  │  ├─ Check user.role === 'admin'                        │  │
│  │  └─ Return 403 if not admin                            │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Legal Document Routes                                 │  │
│  │  ├─ /api/legal-documents/upload (POST)                 │  │
│  │  ├─ /api/legal-documents/:id/processing-status (GET)   │  │
│  │  ├─ /api/legal-documents/:id/reprocess (POST)          │  │
│  │  ├─ /api/legal-documents (GET)                         │  │
│  │  └─ /api/legal-documents/:id (GET/DELETE)              │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   EVENT BUS (EventEmitter)                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Document Events                                       │  │
│  │  ├─ LEGAL_DOCUMENT_UPLOADED                            │  │
│  │  ├─ ANALYSIS_STARTED                                   │  │
│  │  ├─ ANALYSIS_PROGRESS                                  │  │
│  │  ├─ ANALYSIS_COMPLETED                                 │  │
│  │  └─ ANALYSIS_FAILED                                    │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              REDIS QUEUE (BullMQ + Redis Cloud)              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Queue: document-processing                            │  │
│  │  ├─ Job Type: ANALYZE_DOCUMENT                         │  │
│  │  ├─ Priority: 0-5                                      │  │
│  │  ├─ Retry: 3 attempts with exponential backoff         │  │
│  │  └─ Concurrency: 3 workers                             │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│            DOCUMENT PROCESSOR WORKER (BullMQ)                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Document Analyzer Service                             │  │
│  │  ├─ Extract Structure (titles, chapters, sections)     │  │
│  │  ├─ Extract Articles (with references)                 │  │
│  │  ├─ Generate Table of Contents                         │  │
│  │  ├─ Generate Summaries (GPT-4)                         │  │
│  │  ├─ Extract Entities & Cross-References                │  │
│  │  ├─ Calculate Statistics                               │  │
│  │  └─ Generate Embeddings (OpenAI)                       │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                OPENAI API (GPT-4 + Embeddings)               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  GPT-4 Chat Completions                                │  │
│  │  ├─ Executive Summaries (max 500 tokens)               │  │
│  │  ├─ Chapter Summaries (max 150 tokens each)            │  │
│  │  └─ Section Summaries                                  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  text-embedding-ada-002                                │  │
│  │  ├─ Input: texto (max 8000 chars)                      │  │
│  │  ├─ Output: vector[1536] (float32)                     │  │
│  │  └─ Used for: chunks, articles, sections, summaries    │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│          POSTGRESQL 16 + PGVECTOR (Render Database)          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Tables:                                               │  │
│  │  ├─ legal_documents (main document data)               │  │
│  │  ├─ legal_document_chunks (text chunks + embeddings)   │  │
│  │  ├─ legal_document_articles (extracted articles)       │  │
│  │  ├─ legal_document_sections (chapters, sections)       │  │
│  │  ├─ legal_document_summaries (AI summaries)            │  │
│  │  ├─ document_registry (hierarchical index)             │  │
│  │  └─ audit_logs (operation tracking)                    │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  pgvector Extension                                    │  │
│  │  ├─ Cosine Similarity (<=>)                            │  │
│  │  ├─ L2 Distance (<->)                                  │  │
│  │  └─ Inner Product (<#>)                                │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Diagrama de Flujo del Sistema

```
┌──────────┐
│  Admin   │
│  User    │
└────┬─────┘
     │
     │ 1. Upload Document (POST)
     ↓
┌─────────────────────┐
│  Fastify Backend    │
│  ┌───────────────┐  │
│  │ Authenticate  │  │──→ Verify JWT + Admin Role
│  └───────┬───────┘  │
│          │          │
│  ┌───────↓────────┐ │
│  │ Validate Data  │ │──→ Zod Schema Validation
│  └───────┬────────┘ │
│          │          │
│  ┌───────↓────────┐ │
│  │ Create Record  │ │──→ INSERT INTO legal_documents
│  └───────┬────────┘ │
│          │          │
│  ┌───────↓────────┐ │
│  │ Emit Event     │ │──→ LEGAL_DOCUMENT_UPLOADED
│  └───────┬────────┘ │
│          │          │
│  ┌───────↓────────┐ │
│  │ Queue Job      │ │──→ BullMQ: Add to queue
│  └───────┬────────┘ │
│          │          │
│  ┌───────↓────────┐ │
│  │ Audit Log      │ │──→ INSERT INTO audit_logs
│  └───────┬────────┘ │
└──────────┼──────────┘
           │
           │ 2. Return Response
           ↓
┌────────────────────┐
│  Response to UI    │
│  {                 │
│    document: {...},│
│    jobId: "uuid",  │
│    message: "..."  │
│  }                 │
└────────────────────┘
           │
           │ 3. Async Processing Begins
           ↓
┌─────────────────────────┐
│  Redis Queue (BullMQ)   │
│  ┌───────────────────┐  │
│  │  Job Queued       │  │
│  │  - documentId     │  │
│  │  - documentType   │  │
│  │  - priority       │  │
│  │  - retry config   │  │
│  └─────────┬─────────┘  │
└────────────┼────────────┘
             │
             │ 4. Worker Picks Up Job
             ↓
┌──────────────────────────────┐
│  Document Processor Worker   │
│                              │
│  ┌────────────────────────┐  │
│  │ Step 1: Load Document  │  │──→ SELECT * FROM legal_documents
│  └──────────┬─────────────┘  │
│             │                │
│  ┌──────────↓─────────────┐  │
│  │ Step 2: Extract        │  │──→ Regex patterns for structure
│  │         Structure      │  │    - Titles, Chapters, Sections
│  └──────────┬─────────────┘  │
│             │                │
│  ┌──────────↓─────────────┐  │
│  │ Step 3: Extract        │  │──→ Pattern matching for articles
│  │         Articles       │  │    - Article numbers, content
│  └──────────┬─────────────┘  │    - Referenced articles
│             │                │    - Keywords extraction
│  ┌──────────↓─────────────┐  │
│  │ Step 4: Generate TOC   │  │──→ Build hierarchical structure
│  └──────────┬─────────────┘  │
│             │                │
│  ┌──────────↓─────────────┐  │
│  │ Step 5: Generate       │  │──→ OpenAI GPT-4 API Calls
│  │         Summaries      │  │    - Executive summary
│  └──────────┬─────────────┘  │    - Chapter summaries
│             │                │
│  ┌──────────↓─────────────┐  │
│  │ Step 6: Extract        │  │──→ Entity recognition
│  │         Entities       │  │    - Institutions
│  └──────────┬─────────────┘  │    - Legal references
│             │                │
│  ┌──────────↓─────────────┐  │
│  │ Step 7: Calculate      │  │──→ Document statistics
│  │         Stats          │  │    - Word count, pages
│  └──────────┬─────────────┘  │    - Reading time
│             │                │
│  ┌──────────↓─────────────┐  │
│  │ Step 8: Update Main    │  │──→ UPDATE legal_documents
│  │         Document       │  │    SET metadata = {...}
│  └──────────┬─────────────┘  │
│             │                │
│  ┌──────────↓─────────────┐  │
│  │ Step 9: Save Articles  │  │──→ INSERT INTO legal_document_articles
│  │         with           │  │    (with embeddings)
│  │         Embeddings     │  │
│  └──────────┬─────────────┘  │
│             │                │
│  ┌──────────↓─────────────┐  │
│  │ Step 10: Save Sections │  │──→ INSERT INTO legal_document_sections
│  │          with          │  │    (with embeddings)
│  │          Embeddings    │  │
│  └──────────┬─────────────┘  │
│             │                │
│  ┌──────────↓─────────────┐  │
│  │ Step 11: Save          │  │──→ INSERT INTO legal_document_summaries
│  │          Summaries     │  │    (with embeddings)
│  └──────────┬─────────────┘  │
│             │                │
│  ┌──────────↓─────────────┐  │
│  │ Step 12: Generate      │  │──→ Potential search queries
│  │          Query         │  │    INSERT INTO query_templates
│  │          Templates     │  │
│  └──────────┬─────────────┘  │
└─────────────┼────────────────┘
              │
              │ 5. Emit Completion Event
              ↓
┌───────────────────────────┐
│  Event Bus                │
│  - ANALYSIS_COMPLETED     │──→ Notifications
│  - metadata with results  │──→ Registry update
└───────────────────────────┘
```

---

## 🔄 Flujo Completo de Carga

### 1. Carga Inicial (Frontend → Backend)

**Request HTTP**:
```http
POST /api/legal-documents/upload HTTP/1.1
Host: poweria-legal-backend.onrender.com
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "normTitle": "Constitución de la República del Ecuador",
  "normType": "CONSTITUTIONAL_NORM",
  "legalHierarchy": "CONSTITUCION",
  "content": "<contenido completo del documento>",
  "publicationType": "EDICION_CONSTITUCIONAL",
  "publicationNumber": "RO-449",
  "publicationDate": "2008-10-20",
  "jurisdiction": "NACIONAL",
  "specialties": ["derecho_constitucional"],
  "metadata": {
    "year": 2008,
    "number": "449",
    "tags": ["constitución", "derechos", "estado"],
    "description": "Constitución de la República del Ecuador 2008"
  }
}
```

**Response HTTP**:
```json
{
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "normTitle": "Constitución de la República del Ecuador",
    "normType": "CONSTITUTIONAL_NORM",
    "legalHierarchy": "CONSTITUCION",
    "createdAt": "2025-11-11T10:30:00.000Z",
    "processingStatus": "queued"
  },
  "jobId": "document-processing:123456",
  "message": "Document uploaded successfully and queued for processing"
}
```

### 2. Validación y Almacenamiento (Backend)

**Pasos Internos**:

1. **Autenticación JWT**: Verificar token válido
2. **Verificación de Rol**: Confirmar que `user.role === 'admin'`
3. **Validación Zod**: Validar schema del request body
4. **Creación en BD**: INSERT en tabla `legal_documents`
5. **Event Bus**: Emitir evento `LEGAL_DOCUMENT_UPLOADED`
6. **Queue Job**: Agregar job a BullMQ queue
7. **Audit Log**: Registrar acción en `audit_logs`
8. **Response**: Retornar información del documento + jobId

**Código Backend (src/routes/legal-documents-enhanced.ts)**:
```typescript
fastify.post('/api/legal-documents/upload', {
  onRequest: [fastify.authenticate],
}, async (request, reply) => {
  const user = request.user as any;

  // Check admin permission
  if (user.role !== 'admin') {
    return reply.code(403).send({
      error: 'Only administrators can upload legal documents'
    });
  }

  // Validate request
  const body = uploadLegalDocumentSchema.parse(request.body);

  // Create document
  const document = await prisma.legalDocument.create({
    data: {
      normTitle: body.normTitle,
      normType: body.normType,
      legalHierarchy: body.legalHierarchy,
      publicationType: body.publicationType || 'ORDINARIO',
      publicationNumber: body.publicationNumber || `AUTO-${Date.now()}`,
      content: body.content,
      uploadedBy: user.id,
      metadata: {
        ...body.metadata,
        processingStatus: 'queued'
      }
    }
  });

  // Emit event
  eventBus.emitEvent(DocumentEventType.LEGAL_DOCUMENT_UPLOADED, {
    documentId: document.id,
    userId: user.id,
    title: document.normTitle
  });

  // Queue processing job
  const jobId = await documentProcessor.addDocument(
    document.id,
    'LegalDocument',
    { userId: user.id, priority: 1 }
  );

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'LEGAL_DOCUMENT_UPLOAD',
      entity: 'LegalDocument',
      entityId: document.id
    }
  });

  return reply.send({ document, jobId, message: '...' });
});
```

### 3. Procesamiento Asíncrono (Worker)

**BullMQ Job Processing**:

```typescript
// Worker picks up job from queue
worker = new Worker('document-processing', async (job) => {
  const { documentId, documentType } = job.data;

  // Load document
  const document = await prisma.legalDocument.findUnique({
    where: { id: documentId }
  });

  // Run analysis
  const result = await documentAnalyzer.analyzeDocument(documentId);

  // Emit completion event
  eventBus.emitEvent(DocumentEventType.ANALYSIS_COMPLETED, {
    documentId,
    results: result.metadata
  });

  return { success: true, data: result.metadata };
}, {
  concurrency: 3,
  limiter: { max: 10, duration: 1000 }
});
```

### 4. Análisis con IA (Document Analyzer)

**Pasos del Análisis** (src/services/documentAnalyzer.ts):

```typescript
async analyzeDocument(documentId: string) {
  // 1. Extract hierarchical structure
  const structure = await this.extractStructure(content);

  // 2. Extract articles with metadata
  const articles = await this.extractArticles(content, structure);

  // 3. Generate table of contents
  const toc = this.generateTableOfContents(structure);

  // 4. Generate multi-level summaries using GPT-4
  const summaries = await this.generateSummaries(document, structure);

  // 5. Extract entities and cross-references
  const entities = await this.extractEntities(content);
  const crossReferences = await this.extractCrossReferences(content);

  // 6. Calculate statistics
  const stats = this.calculateStatistics(content, structure);

  // 7. Update main document with metadata
  await prisma.legalDocument.update({
    where: { id: documentId },
    data: {
      metadata: {
        totalArticles: articles.length,
        documentStructure: structure,
        tableOfContents: toc,
        summaryText: summaries.executive,
        analysisVersion: '2.0'
      }
    }
  });

  // 8. Save articles with embeddings
  await this.saveArticles(documentId, articles);

  // 9. Save sections with embeddings
  await this.saveSections(documentId, structure);

  // 10. Save summaries with embeddings
  await this.saveSummaries(documentId, summaries);

  // 11. Generate query templates
  await this.generateSpecializedEmbeddings(documentId, data);

  return { success: true, metadata: {...} };
}
```

### 5. Vectorización (OpenAI Embeddings)

**Generación de Embeddings**:

```typescript
async generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text.substring(0, 8000) // Limit to max tokens
  });

  return response.data[0].embedding; // Returns: float32[1536]
}
```

**Almacenamiento en PostgreSQL con pgvector**:

```sql
-- Insert article with embedding
INSERT INTO legal_document_articles (
  id, legal_document_id, article_number,
  article_content, embedding
) VALUES (
  gen_random_uuid(),
  $1::uuid,
  $2,
  $3,
  $4::jsonb  -- Embedding stored as JSONB
);
```

### 6. Búsqueda Semántica (pgvector)

**Query con Similaridad Coseno**:

```sql
-- Find similar articles using cosine similarity
SELECT
  article_number,
  article_content,
  1 - (embedding <=> $1::vector) AS similarity
FROM legal_document_articles
WHERE legal_document_id = $2
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

---

## 🔌 Backend - APIs de Carga

### API Reference Completo

#### 1. Upload Legal Document (Admin Only)

**Endpoint**: `POST /api/legal-documents/upload`

**Descripción**: Carga un nuevo documento legal global. Solo administradores.

**Headers**:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```typescript
{
  normTitle: string;           // Required: Título de la norma
  normType: NormType;          // Required: Tipo de norma (enum)
  legalHierarchy: LegalHierarchy;  // Required: Jerarquía legal (enum)
  content: string;             // Required: Contenido completo del documento
  publicationType?: PublicationType;  // Optional: Tipo de publicación
  publicationNumber?: string;  // Optional: Número de publicación
  publicationDate?: string;    // Optional: Fecha de publicación (ISO)
  jurisdiction?: Jurisdiction; // Optional: Jurisdicción (default: NACIONAL)
  specialties?: string[];      // Optional: Especialidades legales
  metadata?: {                 // Optional: Metadata adicional
    year?: number;
    number?: string;
    tags?: string[];
    description?: string;
  };
}
```

**Enums**:
```typescript
enum NormType {
  CONSTITUTIONAL_NORM = 'CONSTITUTIONAL_NORM',
  ORGANIC_LAW = 'ORGANIC_LAW',
  ORDINARY_LAW = 'ORDINARY_LAW',
  ORGANIC_CODE = 'ORGANIC_CODE',
  ORDINARY_CODE = 'ORDINARY_CODE',
  REGULATION_GENERAL = 'REGULATION_GENERAL',
  REGULATION_EXECUTIVE = 'REGULATION_EXECUTIVE',
  ORDINANCE_MUNICIPAL = 'ORDINANCE_MUNICIPAL',
  ORDINANCE_METROPOLITAN = 'ORDINANCE_METROPOLITAN',
  RESOLUTION_ADMINISTRATIVE = 'RESOLUTION_ADMINISTRATIVE',
  RESOLUTION_JUDICIAL = 'RESOLUTION_JUDICIAL',
  ADMINISTRATIVE_AGREEMENT = 'ADMINISTRATIVE_AGREEMENT',
  INTERNATIONAL_TREATY = 'INTERNATIONAL_TREATY',
  JUDICIAL_PRECEDENT = 'JUDICIAL_PRECEDENT'
}

enum LegalHierarchy {
  CONSTITUCION = 'CONSTITUCION',
  TRATADOS_INTERNACIONALES_DDHH = 'TRATADOS_INTERNACIONALES_DDHH',
  LEYES_ORGANICAS = 'LEYES_ORGANICAS',
  LEYES_ORDINARIAS = 'LEYES_ORDINARIAS',
  CODIGOS_ORGANICOS = 'CODIGOS_ORGANICOS',
  CODIGOS_ORDINARIOS = 'CODIGOS_ORDINARIOS',
  REGLAMENTOS = 'REGLAMENTOS',
  ORDENANZAS = 'ORDENANZAS',
  RESOLUCIONES = 'RESOLUCIONES',
  ACUERDOS_ADMINISTRATIVOS = 'ACUERDOS_ADMINISTRATIVOS'
}

enum PublicationType {
  ORDINARIO = 'ORDINARIO',
  SUPLEMENTO = 'SUPLEMENTO',
  SEGUNDO_SUPLEMENTO = 'SEGUNDO_SUPLEMENTO',
  SUPLEMENTO_ESPECIAL = 'SUPLEMENTO_ESPECIAL',
  EDICION_CONSTITUCIONAL = 'EDICION_CONSTITUCIONAL'
}

enum Jurisdiction {
  NACIONAL = 'NACIONAL',
  PROVINCIAL = 'PROVINCIAL',
  MUNICIPAL = 'MUNICIPAL',
  INTERNACIONAL = 'INTERNACIONAL'
}
```

**Response Success (200)**:
```json
{
  "document": {
    "id": "uuid",
    "normTitle": "string",
    "normType": "CONSTITUTIONAL_NORM",
    "legalHierarchy": "CONSTITUCION",
    "createdAt": "2025-11-11T10:30:00.000Z",
    "processingStatus": "queued"
  },
  "jobId": "document-processing:123456",
  "message": "Document uploaded successfully and queued for processing"
}
```

**Response Error (400)**:
```json
{
  "error": [
    {
      "field": "normTitle",
      "message": "Required field missing"
    }
  ]
}
```

**Response Error (403)**:
```json
{
  "error": "Only administrators can upload legal documents"
}
```

**Response Error (500)**:
```json
{
  "error": "Internal server error"
}
```

**cURL Example**:
```bash
curl -X POST https://poweria-legal-backend.onrender.com/api/legal-documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "normTitle": "Código Civil",
    "normType": "ORDINARY_CODE",
    "legalHierarchy": "CODIGOS_ORDINARIOS",
    "content": "TÍTULO PRELIMINAR...",
    "publicationType": "ORDINARIO",
    "publicationNumber": "RO-46",
    "jurisdiction": "NACIONAL"
  }'
```

#### 2. Get Processing Status

**Endpoint**: `GET /api/legal-documents/:id/processing-status`

**Descripción**: Obtiene el estado de procesamiento de un documento.

**Response Success (200)**:
```json
{
  "documentId": "uuid",
  "status": "completed", // queued | processing | completed | failed
  "progress": 100,       // 0-100
  "results": {
    "articlesExtracted": 444,
    "sectionsExtracted": 45,
    "chaptersExtracted": 12,
    "summariesGenerated": 13,
    "wordCount": 125000,
    "estimatedPages": 500
  },
  "error": null
}
```

#### 3. List Legal Documents

**Endpoint**: `GET /api/legal-documents`

**Query Parameters**:
- `category`: Filter by category (optional)

**Response Success (200)**:
```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "string",
      "category": "string",
      "metadata": {},
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  ]
}
```

#### 4. Get Legal Document by ID

**Endpoint**: `GET /api/legal-documents/:id`

**Response Success (200)**:
```json
{
  "document": {
    "id": "uuid",
    "normTitle": "string",
    "normType": "CONSTITUTIONAL_NORM",
    "content": "Full content...",
    "metadata": {
      "totalArticles": 444,
      "documentStructure": {...},
      "tableOfContents": {...}
    }
  }
}
```

#### 5. Delete Legal Document (Admin Only)

**Endpoint**: `DELETE /api/legal-documents/:id`

**Response Success (200)**:
```json
{
  "message": "Legal document deleted successfully"
}
```

#### 6. Reprocess Document (Admin Only)

**Endpoint**: `POST /api/legal-documents/:id/reprocess`

**Descripción**: Re-procesa un documento que ya fue cargado.

**Response Success (200)**:
```json
{
  "jobId": "document-processing:123456",
  "message": "Document queued for reprocessing"
}
```

---

## ⚙️ Procesamiento Asíncrono

### BullMQ Queue Configuration

**Queue Setup** (src/workers/documentProcessor.ts):

```typescript
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null
});

// Create queue
const queue = new Queue<DocumentJob>('document-processing', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },  // Keep last 100 completed jobs
    removeOnFail: { count: 50 },       // Keep last 50 failed jobs
    attempts: 3,                        // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000                       // Start with 2s, then 4s, 8s
    }
  }
});

// Create worker
const worker = new Worker<DocumentJob, JobResult>(
  'document-processing',
  async (job) => {
    return await processJob(job);
  },
  {
    connection: redis.duplicate(),
    concurrency: 3,                    // Process 3 jobs concurrently
    limiter: {
      max: 10,                         // Max 10 jobs per second
      duration: 1000
    }
  }
);
```

### Job Types

```typescript
enum JobType {
  ANALYZE_DOCUMENT = 'analyze_document',
  EXTRACT_EMBEDDINGS = 'extract_embeddings',
  UPDATE_HIERARCHY = 'update_hierarchy',
  GENERATE_SUMMARIES = 'generate_summaries',
  INDEX_DOCUMENT = 'index_document',
  VALIDATE_REFERENCES = 'validate_references'
}
```

### Worker Event Handlers

```typescript
worker.on('completed', (job, result) => {
  logger.info({
    msg: 'Job completed',
    jobId: job.id,
    documentId: job.data.documentId,
    processingTime: result.processingTimeMs
  });
});

worker.on('failed', (job, error) => {
  logger.error({
    msg: 'Job failed',
    jobId: job?.id,
    documentId: job?.data.documentId,
    error: error.message
  });
});

worker.on('progress', (job, progress) => {
  logger.info({
    msg: 'Job progress',
    jobId: job.id,
    progress: progress
  });
});
```

### Job Priority

```typescript
// Add document with high priority
await queue.add(
  JobType.ANALYZE_DOCUMENT,
  { documentId, documentType },
  { priority: 2 }  // 0 = lowest, 5 = highest
);
```

### Job Status Tracking

```typescript
async getJobStatus(jobId: string) {
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  return {
    id: job.id,
    state: await job.getState(),
    progress: job.progress,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn
  };
}
```

---

## 🤖 Análisis con IA

### Document Analyzer Service

**Clase Principal** (src/services/documentAnalyzer.ts):

```typescript
export class DocumentAnalyzer {
  constructor(
    private prisma: PrismaClient,
    private openai: OpenAI
  ) {}

  /**
   * Main entry point for document analysis
   */
  async analyzeDocument(documentId: string): Promise<AnalysisResult> {
    // Load document
    const document = await this.prisma.legalDocument.findUnique({
      where: { id: documentId }
    });

    // 1. Extract hierarchical structure
    const structure = await this.extractStructure(document.content);

    // 2. Extract articles
    const articles = await this.extractArticles(document.content, structure);

    // 3. Generate table of contents
    const toc = this.generateTableOfContents(structure);

    // 4. Generate summaries using GPT-4
    const summaries = await this.generateSummaries(document, structure);

    // 5. Extract entities
    const entities = await this.extractEntities(document.content);
    const crossReferences = await this.extractCrossReferences(document.content);

    // 6. Calculate statistics
    const stats = this.calculateStatistics(document.content, structure);

    // 7. Save all data
    await this.saveAllData(documentId, {
      structure,
      articles,
      toc,
      summaries,
      entities,
      crossReferences,
      stats
    });

    return {
      success: true,
      metadata: { /* analysis results */ }
    };
  }
}
```

### 1. Extract Hierarchical Structure

```typescript
private async extractStructure(content: string): Promise<DocumentStructure> {
  const structure = {
    titles: [],
    chapters: [],
    sections: [],
    articles: []
  };

  // Patterns for structural elements
  const patterns = {
    title: /^TÍTULO\s+([IVXLCDM]+|\d+)[:\s.-]*(.*?)$/gmi,
    chapter: /^CAPÍTULO\s+([IVXLCDM]+|\d+)[:\s.-]*(.*?)$/gmi,
    section: /^SECCIÓN\s+([IVXLCDM]+|\d+)[:\s.-]*(.*?)$/gmi,
    article: /^Art(?:ículo|\.)\s*(\d+(?:-\w+)?)[:\s.-]*(.*?)$/gmi
  };

  // Extract each element type
  for (const [type, pattern] of Object.entries(patterns)) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      structure[type + 's'].push({
        type,
        number: match[1],
        title: match[2]?.trim() || '',
        position: match.index,
        content: this.extractElementContent(content, match.index),
        level: this.getHierarchyLevel(type)
      });
    }
  }

  return this.buildHierarchy(structure);
}
```

### 2. Extract Articles

```typescript
private async extractArticles(
  content: string,
  structure: DocumentStructure
): Promise<ArticleElement[]> {
  const articles = [];

  // Multiple patterns for different article formats
  const patterns = [
    /Art(?:ículo|\.)\s*(\d+(?:-\w+)?)[:\s.-]*(.*?)(?=Art|CAPÍTULO|SECCIÓN|$)/gis,
    /ARTÍCULO\s+(\d+(?:-\w+)?)[:\s.-]*(.*?)(?=ARTÍCULO|CAPÍTULO|$)/gis
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const articleNumber = parseInt(match[1].replace(/\D/g, ''));
      const articleContent = match[0];

      // Extract referenced articles
      const referencedArticles = this.extractArticleReferences(articleContent);

      // Extract keywords
      const keywords = await this.extractKeywords(articleContent);

      articles.push({
        articleNumber,
        articleNumberText: match[1],
        title: match[2]?.trim() || '',
        content: articleContent,
        referencedArticles,
        keywords
      });
    }
  }

  return articles.sort((a, b) => a.articleNumber - b.articleNumber);
}
```

### 3. Generate Summaries with GPT-4

```typescript
private async generateSummaries(
  document: LegalDocument,
  structure: DocumentStructure
): Promise<DocumentSummaries> {
  const summaries = {
    executive: '',
    chapters: {},
    sections: {}
  };

  // Executive summary
  const executivePrompt = `Genera un resumen ejecutivo del siguiente documento legal:

Título: ${document.normTitle}
Tipo: ${document.normType}

Contenido (primeros 3000 caracteres):
${document.content.substring(0, 3000)}

El resumen debe:
1. Explicar el propósito principal del documento
2. Destacar los puntos clave
3. Mencionar el número total de artículos (${structure.articles.length})
4. Ser conciso (máximo 300 palabras)

Resumen:`;

  const response = await this.openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: executivePrompt }],
    temperature: 0.3,
    max_tokens: 500
  });

  summaries.executive = response.choices[0].message.content || '';

  // Chapter summaries (limit to first 5 for efficiency)
  for (const chapter of structure.chapters.slice(0, 5)) {
    const chapterPrompt = `Resume el siguiente capítulo legal en 2-3 oraciones:

Capítulo ${chapter.number}: ${chapter.title}

Contenido:
${chapter.content.substring(0, 1500)}

Resumen:`;

    const chapterResponse = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: chapterPrompt }],
      temperature: 0.3,
      max_tokens: 150
    });

    summaries.chapters[chapter.number] = chapterResponse.choices[0].message.content || '';
  }

  return summaries;
}
```

### 4. Extract Entities

```typescript
private async extractEntities(content: string): Promise<string[]> {
  const entities = new Set<string>();

  // Patterns for legal entities
  const patterns = [
    /(?:Ministerio|Secretaría|Consejo|Comisión|Instituto|Agencia)\s+(?:de\s+)?[A-Z][a-záéíóúñ]+(?:\s+[A-Z][a-záéíóúñ]+)*/g,
    /(?:Corte|Tribunal|Juzgado)\s+[A-Z][a-záéíóúñ]+(?:\s+[A-Z][a-záéíóúñ]+)*/g,
    /(?:Ley|Código|Reglamento|Decreto)\s+(?:Orgánic[oa]|N[°º]\s*\d+)/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      entities.add(match[0].trim());
    }
  }

  return Array.from(entities).slice(0, 50);
}
```

---

## 🧮 Vectorización y Embeddings

### OpenAI Embeddings API

**Modelo**: `text-embedding-ada-002`
**Dimensiones**: 1536
**Costo**: $0.0001 por 1K tokens
**Max Input**: ~8000 tokens (~32,000 caracteres)

### Generación de Embeddings

```typescript
async generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000) // Limit to max tokens
    });

    return response.data[0].embedding; // Returns: float32[1536]
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
}
```

### Chunking Strategy

**Estrategia de División**:

1. **Documento completo**: Se divide en chunks de 1000 caracteres con overlap de 200 caracteres
2. **Artículos individuales**: Cada artículo completo se vectoriza como una unidad
3. **Secciones/Capítulos**: Cada sección/capítulo se vectoriza independientemente
4. **Resúmenes**: Los resúmenes generados también se vectorizan

```typescript
// Split content into chunks
const chunkSize = 1000;
const overlap = 200;
const chunks = [];

for (let i = 0; i < content.length; i += (chunkSize - overlap)) {
  chunks.push(content.slice(i, i + chunkSize));
}

// Generate embeddings for each chunk
for (let i = 0; i < chunks.length; i++) {
  const embedding = await generateEmbedding(chunks[i]);

  await prisma.legalDocumentChunk.create({
    data: {
      legalDocumentId: documentId,
      content: chunks[i],
      chunkIndex: i,
      embedding: embedding
    }
  });
}
```

### Almacenamiento de Vectores

**Tabla: legal_document_chunks**:
```sql
CREATE TABLE legal_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding JSONB,  -- Stored as JSONB array [1536 floats]
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_legal_document_chunks_document_id (legal_document_id)
);
```

**Tabla: legal_document_articles**:
```sql
CREATE TABLE legal_document_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  article_number INTEGER NOT NULL,
  article_number_text VARCHAR(50) NOT NULL,
  article_title TEXT,
  article_content TEXT NOT NULL,
  word_count INTEGER,
  referenced_articles JSONB,
  keywords JSONB,
  embedding JSONB,  -- Vector embedding for the article
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_legal_document_articles_document_id (legal_document_id),
  INDEX idx_legal_document_articles_number (article_number)
);
```

### Búsqueda Semántica con pgvector

**Operadores de Similaridad**:

- `<=>` : Cosine distance (0 = identical, 2 = opposite)
- `<->` : L2 distance (Euclidean)
- `<#>` : Inner product (dot product)

**Query Example**:
```sql
-- Find similar articles using cosine similarity
WITH query_embedding AS (
  SELECT $1::jsonb AS embedding
)
SELECT
  a.article_number,
  a.article_number_text,
  a.article_title,
  a.article_content,
  1 - (a.embedding::vector <=> query_embedding.embedding::vector) AS similarity
FROM legal_document_articles a, query_embedding
WHERE a.legal_document_id = $2
ORDER BY a.embedding::vector <=> query_embedding.embedding::vector
LIMIT 10;
```

**TypeScript Implementation**:
```typescript
async searchSimilarArticles(
  queryEmbedding: number[],
  documentId: string,
  limit: number = 10
): Promise<ArticleResult[]> {
  const results = await prisma.$queryRaw`
    SELECT
      article_number,
      article_number_text,
      article_title,
      article_content,
      1 - (embedding::jsonb::vector <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
    FROM legal_document_articles
    WHERE legal_document_id = ${documentId}::uuid
    ORDER BY embedding::jsonb::vector <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${limit}
  `;

  return results;
}
```

---

## 💾 Base de Datos

### Esquema de Tablas Principales

#### 1. legal_documents

```prisma
model LegalDocument {
  id                   String            @id @default(uuid())

  // Identifiers
  normTitle            String            @map("norm_title")
  normType             NormType          @map("norm_type")
  legalHierarchy       LegalHierarchy    @map("legal_hierarchy")

  // Publication Info
  publicationType      PublicationType   @map("publication_type")
  publicationNumber    String            @map("publication_number")
  publicationDate      DateTime?         @map("publication_date")
  lastReformDate       DateTime?         @map("last_reform_date")
  documentState        DocumentState     @default(ORIGINAL) @map("document_state")
  jurisdiction         Jurisdiction      @default(NACIONAL)

  // Content
  content              String            @db.Text
  metadata             Json?

  // Admin
  uploadedBy           String            @map("uploaded_by")
  isActive             Boolean           @default(true) @map("is_active")
  viewCount            Int               @default(0) @map("view_count")
  downloadCount        Int               @default(0) @map("download_count")
  createdAt            DateTime          @default(now()) @map("created_at")
  updatedAt            DateTime          @updatedAt @map("updated_at")

  // Relations
  uploader             User              @relation(fields: [uploadedBy], references: [id])
  chunks               LegalDocumentChunk[]
  articles             LegalDocumentArticle[]
  sections             LegalDocumentSection[]
  summaries            LegalDocumentSummary[]
  specialties          DocumentSpecialty[]

  @@index([normType])
  @@index([legalHierarchy])
  @@index([jurisdiction])
  @@map("legal_documents")
}
```

#### 2. legal_document_chunks

```prisma
model LegalDocumentChunk {
  id              String   @id @default(uuid())
  legalDocumentId String   @map("legal_document_id")
  content         String   @db.Text
  chunkIndex      Int      @map("chunk_index")
  embedding       Json?    // Vector[1536] as JSONB
  createdAt       DateTime @default(now()) @map("created_at")

  legalDocument LegalDocument @relation(fields: [legalDocumentId], references: [id], onDelete: Cascade)

  @@index([legalDocumentId])
  @@map("legal_document_chunks")
}
```

#### 3. legal_document_articles

```sql
CREATE TABLE legal_document_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,

  -- Article Identifiers
  article_number INTEGER NOT NULL,
  article_number_text VARCHAR(50) NOT NULL,
  article_title TEXT,

  -- Content
  article_content TEXT NOT NULL,
  word_count INTEGER,

  -- Metadata
  referenced_articles JSONB,  -- ["25", "26", "100"]
  keywords JSONB,             -- ["derechos", "obligaciones"]

  -- Vector Embedding
  embedding JSONB,            -- Vector[1536]

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_legal_document_articles_document_id (legal_document_id),
  INDEX idx_legal_document_articles_number (article_number)
);
```

#### 4. legal_document_sections

```sql
CREATE TABLE legal_document_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,

  -- Section Identifiers
  section_type VARCHAR(50) NOT NULL,  -- 'title', 'chapter', 'section'
  section_number VARCHAR(50) NOT NULL,
  section_title TEXT,

  -- Content
  content TEXT NOT NULL,
  word_count INTEGER,

  -- Hierarchy
  level INTEGER NOT NULL,
  parent_section_id UUID REFERENCES legal_document_sections(id),
  display_order INTEGER,

  -- Vector Embedding
  embedding JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_legal_document_sections_document_id (legal_document_id),
  INDEX idx_legal_document_sections_type (section_type),
  INDEX idx_legal_document_sections_parent (parent_section_id)
);
```

#### 5. legal_document_summaries

```sql
CREATE TABLE legal_document_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,

  -- Summary Identifiers
  summary_type VARCHAR(50) NOT NULL,  -- 'executive', 'chapter', 'section'
  summary_level VARCHAR(50) NOT NULL, -- 'document', 'chapter', 'section'

  -- Content
  summary_text TEXT NOT NULL,
  key_points JSONB,

  -- Metadata
  generated_by VARCHAR(50),  -- 'gpt-4', 'gpt-3.5-turbo'
  generated_at TIMESTAMP,

  -- Vector Embedding
  embedding JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_legal_document_summaries_document_id (legal_document_id),
  INDEX idx_legal_document_summaries_type (summary_type)
);
```

#### 6. audit_logs

```prisma
model AuditLog {
  id           String   @id @default(uuid())
  userId       String?  @map("user_id")
  action       String   // 'LEGAL_DOCUMENT_UPLOAD', 'LEGAL_DOCUMENT_DELETE', etc.
  entity       String   // 'LegalDocument'
  entityId     String?  @map("entity_id")
  changes      Json?    // What changed
  ipAddress    String?  @map("ip_address")
  userAgent    String?  @map("user_agent")
  success      Boolean  @default(true)
  errorMessage String?  @map("error_message")
  createdAt    DateTime @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([action])
  @@index([entity])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### Enums

```prisma
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

enum PublicationType {
  ORDINARIO
  SUPLEMENTO
  SEGUNDO_SUPLEMENTO
  SUPLEMENTO_ESPECIAL
  EDICION_CONSTITUCIONAL
}

enum Jurisdiction {
  NACIONAL
  PROVINCIAL
  MUNICIPAL
  INTERNACIONAL
}

enum DocumentState {
  ORIGINAL
  REFORMADO
  DEROGADO
  SUSPENDIDO
}
```

### Índices para Rendimiento

```sql
-- Index on embeddings for faster similarity search
-- (pgvector handles these automatically when using vector operations)

-- Full-text search indexes
CREATE INDEX idx_legal_documents_content_fts
ON legal_documents USING gin(to_tsvector('spanish', content));

CREATE INDEX idx_legal_document_articles_content_fts
ON legal_document_articles USING gin(to_tsvector('spanish', article_content));

-- Composite indexes for common queries
CREATE INDEX idx_legal_documents_type_hierarchy
ON legal_documents(norm_type, legal_hierarchy);

CREATE INDEX idx_legal_documents_jurisdiction_active
ON legal_documents(jurisdiction, is_active);
```

---

## 🔴 Redis y Colas

### Redis Configuration

**Environment Variables**:
```env
REDIS_HOST=redis-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_TLS=true
```

**Redis Client Setup**:
```typescript
import { Redis } from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});
```

### BullMQ Queue

**Queue Structure**:

```
document-processing (Queue)
├── Jobs
│   ├── analyze_document:1
│   │   ├── data: { documentId, documentType, userId }
│   │   ├── priority: 1
│   │   ├── attempts: 0/3
│   │   └── status: waiting
│   ├── analyze_document:2
│   │   ├── data: { documentId, documentType, userId }
│   │   ├── priority: 2
│   │   ├── attempts: 1/3
│   │   └── status: active
│   └── ...
├── Workers (3 concurrent)
│   ├── Worker 1: Processing job 2
│   ├── Worker 2: Idle
│   └── Worker 3: Idle
└── Completed/Failed Jobs
    ├── Completed: 1,234 (last 100 kept)
    └── Failed: 45 (last 50 kept)
```

**Queue Operations**:

```typescript
// Add job to queue
await queue.add(
  JobType.ANALYZE_DOCUMENT,
  {
    type: JobType.ANALYZE_DOCUMENT,
    documentId: 'uuid',
    documentType: 'LegalDocument',
    userId: 'user-uuid',
    metadata: { priority: 'high' }
  },
  {
    priority: 2,           // Higher number = higher priority
    delay: 0,              // Delay in milliseconds
    attempts: 3,           // Number of retry attempts
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true, // Clean up after completion
    removeOnFail: false     // Keep failed jobs for debugging
  }
);

// Get job status
const job = await queue.getJob('job-id');
const state = await job.getState(); // 'waiting', 'active', 'completed', 'failed'

// Get queue statistics
const counts = await queue.getJobCounts();
// Returns: { waiting: 5, active: 2, completed: 100, failed: 3 }

// Pause/Resume queue
await queue.pause();
await queue.resume();

// Clear queue
await queue.drain();        // Remove all waiting jobs
await queue.clean(0, 100);  // Remove first 100 completed jobs
```

### Caching Strategy

```typescript
// Cache document processing status
await redis.set(
  `document:${documentId}:status`,
  JSON.stringify({ status: 'processing', progress: 50 }),
  'EX',
  3600  // Expire after 1 hour
);

// Get cached status
const cached = await redis.get(`document:${documentId}:status`);

// Cache hierarchy
await redis.set(
  `hierarchy:${userId || 'global'}`,
  JSON.stringify(hierarchy),
  'EX',
  3600
);

// Invalidate cache on document update
await redis.del(`hierarchy:${userId || 'global'}`);
```

### Rate Limiting

```typescript
// Limit OpenAI API calls
const rateLimitKey = `ratelimit:openai:${Date.now()}`;
const count = await redis.incr(rateLimitKey);
await redis.expire(rateLimitKey, 60); // 1 minute window

if (count > 60) {
  throw new Error('Rate limit exceeded: max 60 requests per minute');
}
```

---

## 📡 Sistema de Eventos

### Event Bus Architecture

**Event Types** (src/events/documentEventBus.ts):

```typescript
export enum DocumentEventType {
  // Upload Events
  DOCUMENT_UPLOADED = 'document:uploaded',
  LEGAL_DOCUMENT_UPLOADED = 'legal_document:uploaded',

  // Analysis Events
  ANALYSIS_STARTED = 'analysis:started',
  ANALYSIS_PROGRESS = 'analysis:progress',
  ANALYSIS_COMPLETED = 'analysis:completed',
  ANALYSIS_FAILED = 'analysis:failed',

  // Registry Events
  REGISTRY_UPDATED = 'registry:updated',
  HIERARCHY_REBUILT = 'hierarchy:rebuilt',

  // Notification Events
  NOTIFICATION_QUEUED = 'notification:queued',
  NOTIFICATION_SENT = 'notification:sent',
  NOTIFICATION_FAILED = 'notification:failed',

  // Search Index Events
  INDEX_UPDATE_REQUIRED = 'index:update_required',
  INDEX_UPDATED = 'index:updated'
}
```

### Event Payloads

```typescript
interface DocumentUploadedEvent {
  documentId: string;
  documentType: 'Document' | 'LegalDocument';
  userId?: string;
  title: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface AnalysisCompletedEvent {
  documentId: string;
  documentType: 'Document' | 'LegalDocument';
  results: {
    articlesExtracted: number;
    sectionsExtracted: number;
    chaptersExtracted: number;
    summariesGenerated: number;
    embeddingsGenerated: number;
    processingTimeMs: number;
  };
  metadata: Record<string, any>;
  timestamp: Date;
}
```

### Event Emitter

```typescript
export class DocumentEventBus extends EventEmitter {
  private static instance: DocumentEventBus;

  public static getInstance(logger: Logger): DocumentEventBus {
    if (!DocumentEventBus.instance) {
      DocumentEventBus.instance = new DocumentEventBus(logger);
    }
    return DocumentEventBus.instance;
  }

  // Emit typed event with logging
  public emitEvent<T>(eventType: DocumentEventType, payload: T): void {
    const event = {
      type: eventType,
      payload,
      timestamp: new Date(),
      id: crypto.randomUUID()
    };

    this.logger.info({
      msg: 'Event emitted',
      eventType,
      eventId: event.id
    });

    this.emit(eventType, event);
  }

  // Subscribe to events with error handling
  public subscribe<T>(
    eventType: DocumentEventType,
    handler: (event: Event<T>) => Promise<void> | void
  ): void {
    const wrappedHandler = async (event: Event<T>) => {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error({
          msg: 'Event handler error',
          eventType,
          error: error.message
        });
      }
    };

    this.on(eventType, wrappedHandler);
  }
}
```

### Event Listeners Setup

```typescript
// In DocumentProcessor constructor
this.setupEventListeners = () => {
  // Listen for document uploads
  this.eventBus.subscribe(
    DocumentEventType.LEGAL_DOCUMENT_UPLOADED,
    async (event) => {
      // Auto-queue document for processing
      await this.addDocument(
        event.payload.documentId,
        event.payload.documentType,
        { userId: event.payload.userId }
      );
    }
  );

  // Listen for analysis completion
  this.eventBus.subscribe(
    DocumentEventType.ANALYSIS_COMPLETED,
    async (event) => {
      // Update registry
      await documentRegistry.updateDocument(event.payload.documentId);

      // Send notification
      await notificationService.sendAnalysisCompleteNotification(
        event.payload.userId,
        event.payload.documentId
      );
    }
  );
};
```

---

## 🖥️ Frontend (Implementación)

### Estado Actual

**⚠️ IMPORTANTE**: El frontend para carga de documentos legales **NO está implementado aún**. Esta sección describe la arquitectura recomendada.

### Arquitectura Propuesta

```
frontend/
├── src/
│   ├── app/
│   │   └── admin/
│   │       └── legal-documents/
│   │           ├── page.tsx              # Admin panel main
│   │           ├── upload/
│   │           │   └── page.tsx          # Upload form
│   │           └── [id]/
│   │               ├── page.tsx          # Document detail
│   │               └── edit/
│   │                   └── page.tsx      # Edit document
│   ├── components/
│   │   └── admin/
│   │       ├── DocumentUploadForm.tsx    # Main upload component
│   │       ├── DocumentList.tsx          # List all documents
│   │       ├── DocumentDetail.tsx        # Show document details
│   │       ├── ProcessingStatus.tsx      # Real-time status
│   │       └── DocumentAnalytics.tsx     # Analytics dashboard
│   └── lib/
│       └── api/
│           └── legalDocumentsAPI.ts      # API client
```

### Componente: DocumentUploadForm.tsx

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { legalDocumentsAPI } from '@/lib/api/legalDocumentsAPI';

export function DocumentUploadForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    normTitle: '',
    normType: 'ORDINARY_LAW',
    legalHierarchy: 'LEYES_ORDINARIAS',
    content: '',
    publicationType: 'ORDINARIO',
    publicationNumber: '',
    publicationDate: '',
    jurisdiction: 'NACIONAL',
    metadata: {
      year: new Date().getFullYear(),
      tags: [],
      description: ''
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await legalDocumentsAPI.upload(formData);

      toast({
        title: 'Documento cargado exitosamente',
        description: `Job ID: ${result.jobId}`,
      });

      // Redirect to processing status page
      router.push(`/admin/legal-documents/${result.document.id}/status`);
    } catch (error) {
      toast({
        title: 'Error al cargar documento',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label>Título de la Norma</label>
        <Input
          value={formData.normTitle}
          onChange={(e) => setFormData({ ...formData, normTitle: e.target.value })}
          placeholder="Ej: Código Civil"
          required
        />
      </div>

      <div>
        <label>Tipo de Norma</label>
        <Select
          value={formData.normType}
          onValueChange={(value) => setFormData({ ...formData, normType: value })}
        >
          <option value="CONSTITUTIONAL_NORM">Norma Constitucional</option>
          <option value="ORGANIC_LAW">Ley Orgánica</option>
          <option value="ORDINARY_LAW">Ley Ordinaria</option>
          <option value="ORGANIC_CODE">Código Orgánico</option>
          <option value="ORDINARY_CODE">Código Ordinario</option>
          {/* ... more options */}
        </Select>
      </div>

      <div>
        <label>Jerarquía Legal</label>
        <Select
          value={formData.legalHierarchy}
          onValueChange={(value) => setFormData({ ...formData, legalHierarchy: value })}
        >
          <option value="CONSTITUCION">Constitución</option>
          <option value="LEYES_ORGANICAS">Leyes Orgánicas</option>
          <option value="LEYES_ORDINARIAS">Leyes Ordinarias</option>
          {/* ... more options */}
        </Select>
      </div>

      <div>
        <label>Contenido del Documento</label>
        <Textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Pegue aquí el contenido completo del documento legal..."
          rows={20}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Tipo de Publicación</label>
          <Select
            value={formData.publicationType}
            onValueChange={(value) => setFormData({ ...formData, publicationType: value })}
          >
            <option value="ORDINARIO">Ordinario</option>
            <option value="SUPLEMENTO">Suplemento</option>
            <option value="SEGUNDO_SUPLEMENTO">Segundo Suplemento</option>
          </Select>
        </div>

        <div>
          <label>Número de Publicación</label>
          <Input
            value={formData.publicationNumber}
            onChange={(e) => setFormData({ ...formData, publicationNumber: e.target.value })}
            placeholder="Ej: RO-449"
          />
        </div>
      </div>

      <div>
        <label>Fecha de Publicación</label>
        <Input
          type="date"
          value={formData.publicationDate}
          onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value })}
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Cargando...' : 'Cargar Documento'}
      </Button>
    </form>
  );
}
```

### Componente: ProcessingStatus.tsx

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { legalDocumentsAPI } from '@/lib/api/legalDocumentsAPI';

interface ProcessingStatus {
  documentId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  results?: {
    articlesExtracted: number;
    sectionsExtracted: number;
    chaptersExtracted: number;
  };
  error?: string;
}

export function ProcessingStatus() {
  const params = useParams();
  const [status, setStatus] = useState<ProcessingStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const result = await legalDocumentsAPI.getProcessingStatus(params.id as string);
        setStatus(result);

        // Poll every 2 seconds if still processing
        if (result.status === 'processing' || result.status === 'queued') {
          setTimeout(fetchStatus, 2000);
        }
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };

    fetchStatus();
  }, [params.id]);

  if (!status) {
    return <div>Cargando estado...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Estado del Procesamiento</h2>
        <Badge variant={
          status.status === 'completed' ? 'success' :
          status.status === 'failed' ? 'destructive' :
          'default'
        }>
          {status.status}
        </Badge>
      </div>

      {status.status === 'processing' && (
        <div>
          <Progress value={status.progress} />
          <p className="text-sm text-muted-foreground mt-2">
            Progreso: {status.progress}%
          </p>
        </div>
      )}

      {status.status === 'completed' && status.results && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border rounded">
            <p className="text-sm text-muted-foreground">Artículos Extraídos</p>
            <p className="text-3xl font-bold">{status.results.articlesExtracted}</p>
          </div>
          <div className="p-4 border rounded">
            <p className="text-sm text-muted-foreground">Secciones Extraídas</p>
            <p className="text-3xl font-bold">{status.results.sectionsExtracted}</p>
          </div>
          <div className="p-4 border rounded">
            <p className="text-sm text-muted-foreground">Capítulos Extraídos</p>
            <p className="text-3xl font-bold">{status.results.chaptersExtracted}</p>
          </div>
        </div>
      )}

      {status.status === 'failed' && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded">
          <p className="font-semibold">Error en el procesamiento:</p>
          <p>{status.error}</p>
        </div>
      )}
    </div>
  );
}
```

### API Client: legalDocumentsAPI.ts

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const legalDocumentsAPI = {
  async upload(data: DocumentUploadData) {
    const response = await fetch(`${API_BASE}/api/legal-documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  },

  async getProcessingStatus(documentId: string) {
    const response = await fetch(
      `${API_BASE}/api/legal-documents/${documentId}/processing-status`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  },

  async list(filters?: { category?: string }) {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(
      `${API_BASE}/api/legal-documents?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      }
    );

    return response.json();
  },

  async getById(id: string) {
    const response = await fetch(
      `${API_BASE}/api/legal-documents/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      }
    );

    return response.json();
  },

  async delete(id: string) {
    const response = await fetch(
      `${API_BASE}/api/legal-documents/${id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      }
    );

    return response.json();
  }
};

function getToken(): string {
  // Get JWT token from localStorage or cookie
  return localStorage.getItem('authToken') || '';
}
```

---

## 🔒 Seguridad y Permisos

### 1. Autenticación JWT

```typescript
// JWT Middleware (src/plugins/auth.ts)
fastify.decorate('authenticate', async (request, reply) => {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.code(401).send({ error: 'No token provided' });
    }

    const decoded = await fastify.jwt.verify(token);
    request.user = decoded;
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
});
```

### 2. Role-Based Access Control (RBAC)

```typescript
// Admin-only routes
fastify.post('/api/legal-documents/upload', {
  onRequest: [fastify.authenticate],
}, async (request, reply) => {
  const user = request.user as any;

  // Check admin role
  if (user.role !== 'admin') {
    return reply.code(403).send({
      error: 'Only administrators can upload legal documents'
    });
  }

  // Continue with upload logic...
});
```

### 3. Input Validation con Zod

```typescript
const uploadLegalDocumentSchema = z.object({
  normTitle: z.string().min(1, 'Title is required'),
  normType: z.enum([
    'CONSTITUTIONAL_NORM',
    'ORGANIC_LAW',
    // ... more types
  ]),
  legalHierarchy: z.enum([
    'CONSTITUCION',
    'LEYES_ORGANICAS',
    // ... more hierarchies
  ]),
  content: z.string().min(100, 'Content must be at least 100 characters'),
  publicationType: z.enum(['ORDINARIO', 'SUPLEMENTO', /* ... */]).optional(),
  publicationNumber: z.string().optional(),
  publicationDate: z.string().optional(),
  jurisdiction: z.enum(['NACIONAL', 'PROVINCIAL', /* ... */]).optional(),
  metadata: z.object({
    year: z.number().optional(),
    number: z.string().optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional()
  }).optional()
});

// Usage
try {
  const body = uploadLegalDocumentSchema.parse(request.body);
  // body is now type-safe and validated
} catch (error) {
  if (error instanceof z.ZodError) {
    return reply.code(400).send({ error: error.errors });
  }
}
```

### 4. Audit Logging

```typescript
// Log all admin actions
await prisma.auditLog.create({
  data: {
    userId: user.id,
    action: 'LEGAL_DOCUMENT_UPLOAD',
    entity: 'LegalDocument',
    entityId: document.id,
    changes: {
      title: document.normTitle,
      type: document.normType,
      hierarchy: document.legalHierarchy
    },
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    success: true
  }
});
```

### 5. Rate Limiting

```typescript
// Rate limit per user
fastify.register(require('@fastify/rate-limit'), {
  max: 10,              // Max 10 requests
  timeWindow: '1 minute'
});
```

### 6. Content Security

```typescript
// Sanitize HTML/dangerous content
import sanitizeHtml from 'sanitize-html';

const sanitizedContent = sanitizeHtml(body.content, {
  allowedTags: [], // No HTML tags allowed
  allowedAttributes: {}
});
```

---

## 📊 Monitoreo y Logs

### 1. Structured Logging con Pino

```typescript
// Logger setup (src/server.ts)
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

// Usage
logger.info({
  msg: 'Document uploaded',
  documentId: document.id,
  userId: user.id,
  normType: document.normType
});

logger.error({
  msg: 'Document analysis failed',
  documentId: document.id,
  error: error.message,
  stack: error.stack
});
```

### 2. Performance Monitoring

```typescript
// Track processing time
const startTime = Date.now();

try {
  const result = await documentAnalyzer.analyzeDocument(documentId);
  const processingTime = Date.now() - startTime;

  logger.info({
    msg: 'Document analysis completed',
    documentId,
    processingTimeMs: processingTime,
    articlesExtracted: result.metadata.articlesExtracted
  });
} catch (error) {
  const processingTime = Date.now() - startTime;

  logger.error({
    msg: 'Document analysis failed',
    documentId,
    processingTimeMs: processingTime,
    error: error.message
  });
}
```

### 3. Queue Monitoring

```typescript
// Get queue statistics
async getQueueStats() {
  const counts = await this.queue.getJobCounts();
  const workers = await this.queue.getWorkers();

  return {
    waiting: counts.waiting,
    active: counts.active,
    completed: counts.completed,
    failed: counts.failed,
    delayed: counts.delayed,
    workers: workers.length,
    timestamp: new Date()
  };
}

// Expose stats endpoint
fastify.get('/api/admin/processing-queue/stats', {
  onRequest: [fastify.authenticate]
}, async (request, reply) => {
  const user = request.user as any;

  if (user.role !== 'admin') {
    return reply.code(403).send({ error: 'Admin access required' });
  }

  const stats = await documentProcessor.getQueueStats();
  return reply.send(stats);
});
```

### 4. Error Tracking

```typescript
// Centralized error handler
fastify.setErrorHandler((error, request, reply) => {
  logger.error({
    msg: 'Request error',
    url: request.url,
    method: request.method,
    userId: request.user?.id,
    error: error.message,
    stack: error.stack
  });

  // Don't expose internal errors to client
  reply.code(500).send({
    error: 'Internal server error',
    requestId: request.id
  });
});
```

### 5. Health Checks

```typescript
fastify.get('/health', async (request, reply) => {
  const health = {
    status: 'ok',
    timestamp: new Date(),
    checks: {
      database: false,
      redis: false,
      openai: false
    }
  };

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = true;
  } catch (error) {
    health.status = 'error';
  }

  try {
    // Check Redis
    await redis.ping();
    health.checks.redis = true;
  } catch (error) {
    health.status = 'error';
  }

  return reply.send(health);
});
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Carga Completa de la Constitución

```bash
curl -X POST https://poweria-legal-backend.onrender.com/api/legal-documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "normTitle": "Constitución de la República del Ecuador",
    "normType": "CONSTITUTIONAL_NORM",
    "legalHierarchy": "CONSTITUCION",
    "content": "PREÁMBULO\n\nNOSOTRAS Y NOSOTROS, el pueblo soberano del Ecuador...\n\nTÍTULO I\nELEMENTOS CONSTITUTIVOS DEL ESTADO\n\nCapítulo primero\nPrincipios fundamentales\n\nArt. 1.- El Ecuador es un Estado constitucional de derechos y justicia...",
    "publicationType": "EDICION_CONSTITUCIONAL",
    "publicationNumber": "RO-449",
    "publicationDate": "2008-10-20",
    "jurisdiction": "NACIONAL",
    "metadata": {
      "year": 2008,
      "number": "449",
      "tags": ["constitución", "derechos", "estado", "gobierno"],
      "description": "Constitución de la República del Ecuador, aprobada en referéndum el 28 de septiembre de 2008"
    }
  }'
```

**Respuesta**:
```json
{
  "document": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "normTitle": "Constitución de la República del Ecuador",
    "normType": "CONSTITUTIONAL_NORM",
    "legalHierarchy": "CONSTITUCION",
    "createdAt": "2025-11-11T14:30:00.000Z",
    "processingStatus": "queued"
  },
  "jobId": "document-processing:12345",
  "message": "Document uploaded successfully and queued for processing"
}
```

### Ejemplo 2: Verificar Estado de Procesamiento

```bash
curl -X GET https://poweria-legal-backend.onrender.com/api/legal-documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/processing-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Respuesta (En Proceso)**:
```json
{
  "documentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "processing",
  "progress": 65,
  "results": null,
  "error": null
}
```

**Respuesta (Completado)**:
```json
{
  "documentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "completed",
  "progress": 100,
  "results": {
    "articlesExtracted": 444,
    "sectionsExtracted": 89,
    "chaptersExtracted": 30,
    "summariesGenerated": 31,
    "entitiesFound": 127,
    "crossReferencesFound": 58,
    "wordCount": 125420,
    "estimatedPages": 502,
    "analysisVersion": "2.0",
    "processingTimeMs": 145230
  },
  "error": null
}
```

### Ejemplo 3: Listar Documentos Legales

```bash
curl -X GET https://poweria-legal-backend.onrender.com/api/legal-documents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Respuesta**:
```json
{
  "documents": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Constitución de la República del Ecuador",
      "category": "constitution",
      "metadata": {
        "totalArticles": 444,
        "year": 2008,
        "publicationNumber": "RO-449"
      },
      "createdAt": "2025-11-11T14:30:00.000Z",
      "updatedAt": "2025-11-11T14:32:25.000Z"
    },
    {
      "id": "b2c3d4e5-f6g7-8901-bcde-fg2345678901",
      "title": "Código Civil",
      "category": "code",
      "metadata": {
        "totalArticles": 2384,
        "year": 2005
      },
      "createdAt": "2025-11-10T10:15:00.000Z",
      "updatedAt": "2025-11-10T10:20:00.000Z"
    }
  ]
}
```

---

## 🔧 Troubleshooting

### Problema 1: Document Processing Stuck

**Síntoma**: El documento queda en estado "queued" o "processing" indefinidamente.

**Posibles Causas**:
1. Worker no está corriendo
2. Redis connection lost
3. OpenAI API rate limit exceeded
4. Job failed silently

**Solución**:
```bash
# 1. Check worker status
curl https://poweria-legal-backend.onrender.com/api/admin/processing-queue/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Response should show:
# { "workers": 3, "active": 2, "waiting": 5 }

# 2. Check Redis connection
# From server logs, look for:
# "Redis connected successfully"

# 3. Check job status directly
curl https://poweria-legal-backend.onrender.com/api/legal-documents/:id/processing-status

# 4. Reprocess the document
curl -X POST https://poweria-legal-backend.onrender.com/api/legal-documents/:id/reprocess \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Problema 2: OpenAI API Errors

**Síntoma**: `Error generating embedding: 429 Too Many Requests`

**Causa**: Rate limit de OpenAI excedido (60 requests/min para free tier)

**Solución**:
```typescript
// Add rate limiting in documentAnalyzer.ts
async generateEmbedding(text: string): Promise<number[]> {
  // Wait if rate limit exceeded
  const rateLimitKey = `ratelimit:openai:${Math.floor(Date.now() / 60000)}`;
  const count = await redis.incr(rateLimitKey);
  await redis.expire(rateLimitKey, 60);

  if (count > 50) {
    // Wait 1 minute
    await new Promise(resolve => setTimeout(resolve, 60000));
  }

  try {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000)
    });
    return response.data[0].embedding;
  } catch (error) {
    if (error.status === 429) {
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 5000));
      return this.generateEmbedding(text); // Retry
    }
    throw error;
  }
}
```

### Problema 3: PostgreSQL Connection Issues

**Síntoma**: `Error: P1001: Can't reach database server`

**Soluciones**:
```bash
# 1. Check DATABASE_URL is set
echo $DATABASE_URL

# 2. Test connection
psql $DATABASE_URL -c "SELECT 1"

# 3. Check Render database status
# Go to Render Dashboard > Database > Check if running

# 4. Verify pgvector extension
psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'vector'"
```

### Problema 4: Embeddings Not Searchable

**Síntoma**: Búsquedas semánticas no retornan resultados

**Causa**: Embeddings stored as JSONB instead of vector type

**Solución**:
```sql
-- Check embedding format
SELECT
  id,
  jsonb_typeof(embedding) as type,
  jsonb_array_length(embedding) as dimensions
FROM legal_document_chunks
LIMIT 5;

-- Should return:
-- type: 'array'
-- dimensions: 1536

-- If embeddings are stored correctly, create vector index
CREATE INDEX IF NOT EXISTS idx_legal_document_chunks_embedding
ON legal_document_chunks USING ivfflat (((embedding)::vector(1536)) vector_cosine_ops);
```

### Problema 5: Worker Memory Exhausted

**Síntoma**: Worker crashes with `JavaScript heap out of memory`

**Solución**:
```bash
# Increase Node.js memory limit
# In package.json:
{
  "scripts": {
    "start": "node --max-old-space-size=4096 dist/server.js"
  }
}

# Or set environment variable
export NODE_OPTIONS="--max-old-space-size=4096"

# Also reduce worker concurrency
# In documentProcessor.ts:
concurrency: 1  // Process one document at a time
```

---

## 🗺️ Roadmap

### ✅ Completado (Noviembre 2025)

- [x] API de carga de documentos legales
- [x] Sistema de autenticación y RBAC
- [x] Procesamiento asíncrono con BullMQ
- [x] Análisis con IA (GPT-4)
- [x] Vectorización con OpenAI embeddings
- [x] Búsqueda semántica con pgvector
- [x] Event-driven architecture
- [x] Audit logging
- [x] Document registry y jerarquías

### 🚧 En Desarrollo

- [ ] Frontend Admin Panel
  - [ ] Formulario de carga
  - [ ] Lista de documentos
  - [ ] Visualización de estado
  - [ ] Dashboard analytics
- [ ] Mejoras en Análisis
  - [ ] Detección de reformas
  - [ ] Comparación de versiones
  - [ ] Extracción de definiciones
- [ ] Notificaciones en Tiempo Real
  - [ ] WebSocket integration
  - [ ] Push notifications
  - [ ] Email notifications

### 📅 Planificado (Q1 2026)

- [ ] **Carga de Archivos PDF**
  - [ ] Upload directo de PDFs
  - [ ] OCR para PDFs escaneados
  - [ ] Extracción automática de texto
- [ ] **Bulk Upload**
  - [ ] Carga múltiple de documentos
  - [ ] CSV/Excel import
  - [ ] Batch processing
- [ ] **Document Versioning**
  - [ ] Git-like versioning
  - [ ] Diff visualization
  - [ ] Rollback capability
- [ ] **Advanced Search**
  - [ ] Natural language queries
  - [ ] Filters by date, jurisdiction
  - [ ] Full-text search with PostgreSQL
- [ ] **Export Functionality**
  - [ ] Export to PDF
  - [ ] Export to DOCX
  - [ ] Export to JSON/XML
- [ ] **Collaboration Features**
  - [ ] Comments on articles
  - [ ] Annotations
  - [ ] Sharing with teams
- [ ] **API Improvements**
  - [ ] GraphQL API
  - [ ] Webhook notifications
  - [ ] Rate limiting per user
  - [ ] API usage analytics

### 🔮 Futuro (Q2+ 2026)

- [ ] Multi-language support
- [ ] Advanced NLP features
- [ ] Integration with external legal databases
- [ ] Mobile apps (iOS/Android)
- [ ] Blockchain for document integrity
- [ ] AI-powered legal research assistant

---

## 📚 Referencias y Recursos

### Documentación Oficial

- **FastifyJS**: https://www.fastify.io/docs/latest/
- **Prisma**: https://www.prisma.io/docs
- **BullMQ**: https://docs.bullmq.io/
- **OpenAI API**: https://platform.openai.com/docs
- **pgvector**: https://github.com/pgvector/pgvector
- **Next.js**: https://nextjs.org/docs

### Herramientas de Desarrollo

- **Postman Collection**: [Link a colección] (Por crear)
- **Swagger/OpenAPI**: https://poweria-legal-backend.onrender.com/documentation
- **Database Schema**: Ver `prisma/schema.prisma`

### Monitoreo

- **Render Dashboard**: https://dashboard.render.com/
- **Redis Cloud**: https://console.upstash.com/
- **OpenAI Usage**: https://platform.openai.com/usage

### Contacto y Soporte

- **Email**: support@poweria-legal.com
- **GitHub Issues**: [Repository Link]
- **Slack**: #poweria-legal-dev

---

## 🎓 Glosario

**BullMQ**: Sistema de colas de trabajos basado en Redis para Node.js

**Embedding**: Vector numérico que representa el significado semántico de un texto

**Event Bus**: Sistema centralizado para comunicación entre servicios mediante eventos

**Job**: Unidad de trabajo en una cola que será procesada asincrónicamente

**JWT**: JSON Web Token, estándar para autenticación

**pgvector**: Extensión de PostgreSQL para almacenar y buscar vectores

**RAG**: Retrieval-Augmented Generation, técnica de IA que combina búsqueda y generación

**Vector**: Array numérico que representa datos en espacio multidimensional (1536D en este caso)

**Worker**: Proceso que consume y procesa trabajos de una cola

**Zod**: Librería de validación y parsing de schemas en TypeScript

---

**Generado con** ❤️ **por el equipo de Poweria Legal**
**Última actualización**: 11 de Noviembre de 2025
**Versión del documento**: 2.0.0
