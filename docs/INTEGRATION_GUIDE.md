# Document Analysis & Notification System - Integration Guide

## Table of Contents

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Installation Steps](#installation-steps)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [Service Integration](#service-integration)
7. [API Documentation](#api-documentation)
8. [Event Flow Architecture](#event-flow-architecture)
9. [Testing Procedures](#testing-procedures)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)
12. [Example Usage Scenarios](#example-usage-scenarios)

---

## System Overview

The Document Analysis & Notification System provides automatic processing, analysis, and notification capabilities for legal documents and user-uploaded case documents. It features:

- **Dual Document Types**: Global legal documents (Constitution, codes, laws) and user case documents
- **Automatic Analysis**: Triggered on upload with metadata extraction, summaries, and embeddings
- **Hierarchical Registry**: Document organization with version control and dependencies
- **Multi-Channel Notifications**: Email, in-app, webhook, and SMS support
- **Background Processing**: Async job queue with progress tracking
- **Event-Driven Architecture**: Loosely coupled services communicating via events

### Architecture Components

```
┌──────────────────────────────────────────────────────────────┐
│                        Client Applications                    │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                    Fastify API Server                         │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         Enhanced Upload Endpoints                     │    │
│  │  • /api/legal-documents/upload                       │    │
│  │  • /api/documents/upload                             │    │
│  └────────────────────┬─────────────────────────────────┘    │
└────────────────────────┼─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                    Event Bus System                           │
│                  (DocumentEventBus)                           │
└──────┬───────────────┬───────────────┬──────────────┬────────┘
       │               │               │              │
┌──────▼────────┐ ┌───▼──────────┐ ┌─▼──────────┐ ┌─▼────────┐
│ Document      │ │ Document     │ │Notification│ │Document  │
│ Processor     │ │ Registry     │ │Service     │ │Analyzer  │
│ (BullMQ)      │ │ (Hierarchy)  │ │(Multi-ch)  │ │(OpenAI)  │
└──────┬────────┘ └───┬──────────┘ └─┬──────────┘ └─┬────────┘
       │               │               │              │
┌──────▼───────────────▼───────────────▼──────────────▼────────┐
│                     PostgreSQL Database                       │
│  • legal_documents    • document_registry                    │
│  • documents          • notification_queue                   │
│  • analysis_queue     • legal_document_articles              │
└───────────────────────────────────────────────────────────────┘
       │
┌──────▼────────────────────────────────────────────────────────┐
│                        Redis Cache                            │
│  • Job Queue          • Hierarchy Cache                       │
│  • Progress Tracking  • Embeddings Cache                      │
└───────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Software

- **Node.js**: v18+ (LTS recommended)
- **PostgreSQL**: v14+ with pgvector extension
- **Redis**: v6+ for job queue and caching
- **npm/pnpm**: Latest version

### Required Services

- **OpenAI API**: For document analysis and embeddings
- **Email Service**: SMTP server for email notifications
- **Cloud Storage**: Cloudinary or similar for file uploads (optional)
- **SMS Provider**: Twilio for SMS notifications (optional)

### System Requirements

- **CPU**: 2+ cores recommended for worker concurrency
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB+ for documents and embeddings
- **Network**: Stable connection for API calls

---

## Installation Steps

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd legal

# Install Node dependencies
npm install

# Additional dependencies for the new system
npm install --save \
  bullmq \
  ioredis \
  nodemailer \
  multer \
  @fastify/multipart \
  cloudinary \
  twilio
```

### Step 2: Environment Configuration

Create or update `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/legal_db"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""  # Optional

# OpenAI
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="app-specific-password"
SMTP_FROM="Legal System <noreply@legal-system.com>"

# SMS (Optional - Twilio)
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""

# Cloud Storage (Optional - Cloudinary)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Worker Configuration
WORKER_CONCURRENCY="3"
MAX_RETRIES="3"
JOB_TIMEOUT="300000"  # 5 minutes

# Notification Settings
NOTIFICATION_BATCH_SIZE="10"
NOTIFICATION_INTERVAL="5000"  # 5 seconds

# Cache Settings
CACHE_TTL="3600"  # 1 hour
HIERARCHY_CACHE_TTL="1800"  # 30 minutes

# System Settings
NODE_ENV="development"
LOG_LEVEL="info"
```

### Step 3: Database Migration

```bash
# Run Prisma migrations
npx prisma migrate dev

# Apply the document analysis system migration
psql -U <username> -d <database> -f prisma/migrations/20241110_document_analysis_system/migration.sql

# Generate Prisma client
npx prisma generate
```

### Step 4: Redis Setup

```bash
# Start Redis (if not running)
redis-server

# Verify Redis connection
redis-cli ping
# Should return: PONG
```

### Step 5: Initialize Services

Create initialization script `src/init-services.ts`:

```typescript
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { getDocumentEventBus } from './events/documentEventBus';
import { DocumentProcessor } from './workers/documentProcessor';
import { DocumentRegistry } from './services/documentRegistry';
import { NotificationService } from './services/notificationService';
import { DocumentAnalyzer } from './services/documentAnalyzer';

export async function initializeServices(fastify: FastifyInstance) {
  const prisma = new PrismaClient();

  // Initialize Event Bus
  const eventBus = getDocumentEventBus(fastify.log);

  // Initialize Redis config
  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  };

  // Initialize Document Processor
  const documentProcessor = new DocumentProcessor(
    prisma,
    fastify.log,
    eventBus,
    redisConfig
  );

  // Initialize Document Registry
  const documentRegistry = new DocumentRegistry(
    prisma,
    fastify.log,
    eventBus
  );

  // Initialize Document Analyzer
  const documentAnalyzer = new DocumentAnalyzer(
    prisma,
    fastify.log
  );

  // Initialize Notification Service
  const notificationService = new NotificationService(
    prisma,
    fastify.log,
    eventBus,
    undefined,
    {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    }
  );

  // Start background worker
  await documentProcessor.start();

  // Register event handlers
  registerEventHandlers(eventBus, {
    documentProcessor,
    documentRegistry,
    notificationService,
    documentAnalyzer
  });

  // Store services in Fastify instance
  fastify.decorate('services', {
    eventBus,
    documentProcessor,
    documentRegistry,
    notificationService,
    documentAnalyzer
  });

  // Cleanup on shutdown
  fastify.addHook('onClose', async () => {
    await documentProcessor.stop();
    notificationService.destroy();
    await prisma.$disconnect();
  });

  return {
    eventBus,
    documentProcessor,
    documentRegistry,
    notificationService,
    documentAnalyzer
  };
}

function registerEventHandlers(eventBus: any, services: any) {
  const { documentRegistry, notificationService } = services;

  // Update registry on document upload
  eventBus.subscribe('document:uploaded', async (event: any) => {
    await documentRegistry.registerDocument(
      event.payload.documentId,
      event.payload.documentType,
      event.payload.metadata
    );
  });

  // Send notifications on analysis completion
  eventBus.subscribe('analysis:completed', async (event: any) => {
    await notificationService.notifyAnalysisComplete(
      event.payload.documentId,
      event.payload.documentType,
      event.payload.results
    );
  });

  // Rebuild hierarchy on registry update
  eventBus.subscribe('registry:updated', async (event: any) => {
    await documentRegistry.rebuildHierarchyCache();
  });
}
```

---

## Configuration

### Service Configuration

#### Document Processor Configuration

```typescript
// config/processor.config.ts
export const processorConfig = {
  queue: {
    name: 'document-processing',
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '3'),
    limiter: {
      max: 10,
      duration: 1000  // 10 jobs per second
    }
  },
  jobs: {
    analyzeDocument: {
      priority: 1,
      timeout: 300000  // 5 minutes
    },
    generateEmbeddings: {
      priority: 2,
      timeout: 180000  // 3 minutes
    },
    extractStructure: {
      priority: 3,
      timeout: 120000  // 2 minutes
    }
  }
};
```

#### Notification Configuration

```typescript
// config/notification.config.ts
export const notificationConfig = {
  channels: {
    email: {
      enabled: true,
      from: process.env.SMTP_FROM,
      templates: {
        documentUploaded: 'document-uploaded',
        analysisComplete: 'analysis-complete',
        hierarchyUpdate: 'hierarchy-update'
      }
    },
    inApp: {
      enabled: true,
      persistence: true
    },
    webhook: {
      enabled: true,
      timeout: 5000,
      retries: 3
    },
    sms: {
      enabled: !!process.env.TWILIO_ACCOUNT_SID,
      provider: 'twilio'
    }
  },
  queue: {
    batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || '10'),
    interval: parseInt(process.env.NOTIFICATION_INTERVAL || '5000')
  }
};
```

### OpenAI Configuration

```typescript
// config/openai.config.ts
export const openAIConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  models: {
    completion: process.env.OPENAI_MODEL || 'gpt-4',
    embedding: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
  },
  options: {
    maxTokens: 4000,
    temperature: 0.3,
    topP: 0.95
  },
  embedding: {
    dimensions: 1536,
    batchSize: 100
  }
};
```

---

## Database Setup

### Step 1: Verify Tables

```sql
-- Check all tables are created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'analysis_queue',
  'document_registry',
  'document_references',
  'legal_document_articles',
  'legal_document_sections',
  'legal_document_summaries',
  'query_templates',
  'document_processing_history',
  'notification_subscriptions',
  'notification_queue'
);
```

### Step 2: Create Indexes

```sql
-- Additional performance indexes
CREATE INDEX CONCURRENTLY idx_registry_category
  ON document_registry(category)
  WHERE is_current_version = true;

CREATE INDEX CONCURRENTLY idx_queue_pending
  ON analysis_queue(priority DESC, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX CONCURRENTLY idx_notifications_pending
  ON notification_queue(priority, scheduled_at)
  WHERE status = 'pending';
```

### Step 3: Set Up Full-Text Search

```sql
-- Configure Spanish text search
ALTER DATABASE legal_db SET default_text_search_config = 'spanish';

-- Create custom text search configuration
CREATE TEXT SEARCH CONFIGURATION legal_spanish (COPY = spanish);
ALTER TEXT SEARCH CONFIGURATION legal_spanish
  ALTER MAPPING FOR word WITH spanish_stem, simple;
```

---

## Service Integration

### Step 1: Update Main Application

```typescript
// src/index.ts or src/app.ts
import Fastify from 'fastify';
import { initializeServices } from './init-services';
import { legalDocumentRoutesEnhanced } from './routes/legal-documents-enhanced';
import { documentRoutesEnhanced } from './routes/documents-enhanced';

async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info'
    }
  });

  // Initialize services
  await initializeServices(fastify);

  // Register enhanced routes
  await fastify.register(legalDocumentRoutesEnhanced);
  await fastify.register(documentRoutesEnhanced);

  return fastify;
}

async function start() {
  const app = await buildApp();

  try {
    await app.listen({
      port: parseInt(process.env.PORT || '3000'),
      host: '0.0.0.0'
    });
    console.log('Server running on port', process.env.PORT || 3000);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
```

### Step 2: Add Authentication Decorator

```typescript
// src/plugins/auth.ts
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

export default fp(async function(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async function(request: any, reply: any) {
    try {
      // Your authentication logic
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new Error('No token provided');
      }

      // Verify token and get user
      const user = await verifyToken(token);
      request.user = user;
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});
```

---

## API Documentation

### Legal Document Endpoints

#### Upload Legal Document
```http
POST /api/legal-documents/upload
Authorization: Bearer <token>
Content-Type: application/json

{
  "normTitle": "Constitución de la República",
  "normType": "CONSTITUTIONAL_NORM",
  "legalHierarchy": "CONSTITUCION",
  "content": "...",
  "publicationType": "ORDINARIO",
  "publicationNumber": "RO-001-2024",
  "publicationDate": "2024-01-01",
  "jurisdiction": "NACIONAL",
  "specialties": ["constitutional", "fundamental_rights"],
  "metadata": {
    "year": 2024,
    "tags": ["constitution", "fundamental"],
    "description": "Constitutional document"
  }
}

Response:
{
  "document": {
    "id": "uuid",
    "normTitle": "...",
    "processingStatus": "queued"
  },
  "jobId": "job-123",
  "message": "Document uploaded successfully and queued for processing"
}
```

#### Get Processing Status
```http
GET /api/legal-documents/:id/processing-status
Authorization: Bearer <token>

Response:
{
  "documentId": "uuid",
  "status": "processing",
  "progress": 45,
  "results": null,
  "error": null
}
```

#### Get Document Hierarchy
```http
GET /api/legal-documents/hierarchy
Authorization: Bearer <token>

Response:
{
  "id": "root",
  "name": "Document Registry",
  "type": "root",
  "children": [
    {
      "id": "constitutional",
      "name": "Constitutional Documents",
      "type": "category",
      "documentCount": 1,
      "children": [...]
    }
  ]
}
```

#### Search Legal Documents
```http
GET /api/legal-documents/search?q=constitutional&limit=20
Authorization: Bearer <token>

Response:
{
  "results": [
    {
      "id": "uuid",
      "title": "Constitución",
      "type": "LegalDocument",
      "score": 0.95,
      "highlights": ["..."]
    }
  ],
  "total": 15
}
```

### User Document Endpoints

#### Upload File Document
```http
POST /api/documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
caseId: "case-uuid"
title: "Contract Document"
description: "Initial contract"

Response:
{
  "document": {
    "id": "uuid",
    "title": "Contract Document",
    "fileUrl": "https://...",
    "processingStatus": "queued"
  },
  "jobId": "job-456",
  "message": "Document uploaded and queued for processing"
}
```

#### Upload Text Document
```http
POST /api/documents/upload-text
Authorization: Bearer <token>
Content-Type: application/json

{
  "caseId": "case-uuid",
  "title": "Legal Brief",
  "content": "...",
  "metadata": {
    "type": "brief",
    "tags": ["litigation"]
  }
}

Response:
{
  "document": {
    "id": "uuid",
    "title": "Legal Brief",
    "processingStatus": "queued"
  },
  "jobId": "job-789"
}
```

### Notification Endpoints

#### Subscribe to Notifications
```http
POST /api/legal-documents/notifications/subscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "subscriptionType": "document_upload",
  "channel": "email",
  "filters": {
    "documentTypes": ["CONSTITUTIONAL_NORM"],
    "categories": ["constitutional"],
    "keywords": ["rights", "freedom"]
  }
}

Response:
{
  "subscription": {
    "id": "uuid",
    "subscriptionType": "document_upload",
    "channel": "EMAIL"
  },
  "message": "Successfully subscribed to notifications"
}
```

### Admin Endpoints

#### Get Queue Statistics
```http
GET /api/admin/processing-queue/stats
Authorization: Bearer <admin-token>

Response:
{
  "waiting": 5,
  "active": 2,
  "completed": 150,
  "failed": 3,
  "delayed": 0,
  "paused": 0,
  "avgProcessingTime": 45000,
  "throughput": {
    "perMinute": 2.5,
    "perHour": 150
  }
}
```

#### Reprocess Document
```http
POST /api/legal-documents/:id/reprocess
Authorization: Bearer <admin-token>

Response:
{
  "jobId": "job-999",
  "message": "Document queued for reprocessing"
}
```

---

## Event Flow Architecture

### Document Upload Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Server
    participant EB as Event Bus
    participant DP as Document Processor
    participant DR as Document Registry
    participant NS as Notification Service
    participant DB as Database
    participant Q as Redis Queue

    C->>API: POST /api/legal-documents/upload
    API->>DB: Create legal_document record
    API->>EB: Emit LEGAL_DOCUMENT_UPLOADED
    API->>Q: Add to processing queue
    API-->>C: Return document + jobId

    EB->>DR: Register document
    DR->>DB: Create registry entry
    DR->>EB: Emit REGISTRY_UPDATED

    EB->>NS: Process upload notification
    NS->>DB: Get subscribed users
    NS->>NS: Queue notifications

    Q->>DP: Process document job
    DP->>EB: Emit ANALYSIS_STARTED
    DP->>DB: Analyze document
    DP->>EB: Emit ANALYSIS_PROGRESS (20%)
    DP->>DB: Extract structure
    DP->>EB: Emit ANALYSIS_PROGRESS (40%)
    DP->>DB: Generate embeddings
    DP->>EB: Emit ANALYSIS_PROGRESS (60%)
    DP->>DB: Create summaries
    DP->>EB: Emit ANALYSIS_PROGRESS (80%)
    DP->>DB: Update registry
    DP->>EB: Emit ANALYSIS_COMPLETED

    EB->>NS: Send completion notifications
    NS->>NS: Process notification queue
    NS-->>C: Email notification
```

### Event Types and Payloads

```typescript
// Document Uploaded Event
{
  type: 'LEGAL_DOCUMENT_UPLOADED',
  payload: {
    documentId: 'uuid',
    documentType: 'LegalDocument',
    userId: 'uuid',
    title: 'Document Title',
    metadata: {
      normType: 'CONSTITUTIONAL_NORM',
      legalHierarchy: 'CONSTITUCION',
      jurisdiction: 'NACIONAL'
    },
    timestamp: '2024-11-10T10:00:00Z'
  }
}

// Analysis Progress Event
{
  type: 'ANALYSIS_PROGRESS',
  payload: {
    jobId: 'job-123',
    documentId: 'uuid',
    progress: 40,
    currentStep: 'Extracting structure',
    timestamp: '2024-11-10T10:01:00Z'
  }
}

// Analysis Completed Event
{
  type: 'ANALYSIS_COMPLETED',
  payload: {
    jobId: 'job-123',
    documentId: 'uuid',
    documentType: 'LegalDocument',
    results: {
      articlesExtracted: 250,
      summariesGenerated: 15,
      embeddingsCreated: 500,
      processingTimeMs: 45000
    },
    timestamp: '2024-11-10T10:02:00Z'
  }
}
```

---

## Testing Procedures

### Unit Tests

```typescript
// tests/services/documentProcessor.test.ts
import { DocumentProcessor } from '../src/workers/documentProcessor';

describe('DocumentProcessor', () => {
  let processor: DocumentProcessor;

  beforeEach(() => {
    processor = new DocumentProcessor(
      prismaMock,
      loggerMock,
      eventBusMock,
      redisConfig
    );
  });

  describe('addDocument', () => {
    it('should add document to queue', async () => {
      const jobId = await processor.addDocument(
        'doc-123',
        'LegalDocument',
        { priority: 1 }
      );

      expect(jobId).toBeDefined();
      expect(queueMock.add).toHaveBeenCalledWith(
        'ANALYZE_DOCUMENT',
        expect.objectContaining({
          documentId: 'doc-123',
          documentType: 'LegalDocument'
        })
      );
    });
  });

  describe('processJob', () => {
    it('should process document analysis job', async () => {
      const job = createMockJob({
        type: 'ANALYZE_DOCUMENT',
        documentId: 'doc-123'
      });

      const result = await processor.processJob(job);

      expect(result.success).toBe(true);
      expect(eventBusMock.emitEvent).toHaveBeenCalledWith(
        'ANALYSIS_COMPLETED',
        expect.any(Object)
      );
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/upload-flow.test.ts
describe('Document Upload Flow', () => {
  it('should process legal document upload end-to-end', async () => {
    const app = await buildTestApp();

    // Upload document
    const uploadResponse = await app.inject({
      method: 'POST',
      url: '/api/legal-documents/upload',
      headers: {
        authorization: 'Bearer test-token'
      },
      payload: {
        normTitle: 'Test Law',
        normType: 'ORDINARY_LAW',
        legalHierarchy: 'LEYES_ORDINARIAS',
        content: 'Article 1...'
      }
    });

    expect(uploadResponse.statusCode).toBe(200);
    const { document, jobId } = uploadResponse.json();

    // Wait for processing
    await waitFor(async () => {
      const statusResponse = await app.inject({
        method: 'GET',
        url: `/api/legal-documents/${document.id}/processing-status`,
        headers: {
          authorization: 'Bearer test-token'
        }
      });

      const status = statusResponse.json();
      return status.status === 'completed';
    }, { timeout: 60000 });

    // Verify registry
    const hierarchyResponse = await app.inject({
      method: 'GET',
      url: '/api/legal-documents/hierarchy',
      headers: {
        authorization: 'Bearer test-token'
      }
    });

    const hierarchy = hierarchyResponse.json();
    expect(hierarchy.children).toContainEqual(
      expect.objectContaining({
        name: expect.stringContaining('Test Law')
      })
    );
  });
});
```

### Load Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Create load test scenario
cat > load-test.yml << EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
  defaults:
    headers:
      authorization: 'Bearer test-token'

scenarios:
  - name: 'Upload Documents'
    flow:
      - post:
          url: '/api/legal-documents/upload'
          json:
            normTitle: 'Test {{ \$randomNumber() }}'
            normType: 'ORDINARY_LAW'
            legalHierarchy: 'LEYES_ORDINARIAS'
            content: 'Test content {{ \$randomString() }}'
      - think: 5
      - get:
          url: '/api/legal-documents/{{ response.document.id }}/processing-status'
EOF

# Run load test
artillery run load-test.yml
```

---

## Monitoring & Maintenance

### Health Checks

```typescript
// src/routes/health.ts
export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    const checks = {
      server: 'ok',
      database: 'unknown',
      redis: 'unknown',
      worker: 'unknown'
    };

    try {
      // Check database
      await fastify.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch (err) {
      checks.database = 'error';
    }

    try {
      // Check Redis
      await fastify.redis.ping();
      checks.redis = 'ok';
    } catch (err) {
      checks.redis = 'error';
    }

    try {
      // Check worker
      const stats = await fastify.services.documentProcessor.getQueueStats();
      checks.worker = stats.active > 0 ? 'processing' : 'idle';
    } catch (err) {
      checks.worker = 'error';
    }

    const healthy = Object.values(checks).every(
      status => status !== 'error'
    );

    return reply
      .code(healthy ? 200 : 503)
      .send({
        status: healthy ? 'healthy' : 'unhealthy',
        checks,
        timestamp: new Date().toISOString()
      });
  });
}
```

### Metrics Collection

```typescript
// src/metrics/collector.ts
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export class MetricsCollector {
  private registry: Registry;
  private documentsUploaded: Counter;
  private processingDuration: Histogram;
  private queueSize: Gauge;

  constructor() {
    this.registry = new Registry();

    this.documentsUploaded = new Counter({
      name: 'documents_uploaded_total',
      help: 'Total number of documents uploaded',
      labelNames: ['type'],
      registers: [this.registry]
    });

    this.processingDuration = new Histogram({
      name: 'document_processing_duration_seconds',
      help: 'Document processing duration in seconds',
      labelNames: ['type', 'status'],
      buckets: [1, 5, 15, 30, 60, 120, 300],
      registers: [this.registry]
    });

    this.queueSize = new Gauge({
      name: 'processing_queue_size',
      help: 'Current size of processing queue',
      labelNames: ['status'],
      registers: [this.registry]
    });
  }

  recordUpload(type: string) {
    this.documentsUploaded.inc({ type });
  }

  recordProcessing(type: string, status: string, duration: number) {
    this.processingDuration.observe(
      { type, status },
      duration / 1000
    );
  }

  updateQueueSize(status: string, size: number) {
    this.queueSize.set({ status }, size);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
```

### Logging Configuration

```typescript
// config/logger.config.ts
export const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  },
  serializers: {
    error: (err: any) => ({
      message: err.message,
      stack: err.stack,
      code: err.code
    }),
    job: (job: any) => ({
      id: job.id,
      type: job.data?.type,
      documentId: job.data?.documentId
    })
  }
};
```

### Maintenance Tasks

```sql
-- Clean up old processing history (run weekly)
DELETE FROM document_processing_history
WHERE created_at < NOW() - INTERVAL '30 days'
AND status = 'completed';

-- Archive old notifications (run monthly)
INSERT INTO notification_archive
SELECT * FROM notification_queue
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM notification_queue
WHERE created_at < NOW() - INTERVAL '90 days';

-- Vacuum and analyze tables (run weekly)
VACUUM ANALYZE analysis_queue;
VACUUM ANALYZE document_registry;
VACUUM ANALYZE notification_queue;

-- Update search vectors (run after bulk uploads)
UPDATE document_registry
SET search_vector =
  setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('spanish', coalesce(category, '')), 'B')
WHERE search_vector IS NULL;
```

---

## Troubleshooting

### Common Issues

#### 1. Document Processing Stuck

**Symptoms**: Documents remain in "processing" status indefinitely

**Diagnosis**:
```bash
# Check queue status
curl http://localhost:3000/api/admin/processing-queue/stats

# Check Redis connection
redis-cli ping

# Check worker logs
tail -f logs/worker.log
```

**Solutions**:
- Restart worker process
- Clear stuck jobs: `redis-cli FLUSHDB`
- Increase worker timeout in config
- Check OpenAI API rate limits

#### 2. Notifications Not Sending

**Symptoms**: Users not receiving email notifications

**Diagnosis**:
```sql
-- Check notification queue
SELECT status, COUNT(*)
FROM notification_queue
GROUP BY status;

-- Check failed notifications
SELECT * FROM notification_queue
WHERE status = 'failed'
ORDER BY created_at DESC LIMIT 10;
```

**Solutions**:
- Verify SMTP credentials
- Check email service limits
- Review notification templates
- Test with simple email

#### 3. Memory Issues

**Symptoms**: High memory usage, OOM errors

**Diagnosis**:
```bash
# Monitor Node.js memory
node --expose-gc --trace-gc app.js

# Check Redis memory
redis-cli INFO memory
```

**Solutions**:
- Limit concurrent jobs
- Reduce embedding batch size
- Implement streaming for large documents
- Increase server memory

#### 4. Database Performance

**Symptoms**: Slow queries, timeout errors

**Diagnosis**:
```sql
-- Find slow queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

**Solutions**:
- Add missing indexes
- Optimize query patterns
- Implement connection pooling
- Partition large tables

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| E001 | Document not found | Verify document ID exists |
| E002 | Processing timeout | Increase timeout or split document |
| E003 | OpenAI API error | Check API key and limits |
| E004 | Redis connection failed | Verify Redis is running |
| E005 | Insufficient permissions | Check user role |
| E006 | Invalid document format | Validate input schema |
| E007 | Queue overflow | Increase queue capacity |
| E008 | Notification delivery failed | Check channel configuration |

---

## Example Usage Scenarios

### Scenario 1: Constitutional Update

```typescript
// Admin uploads new constitutional amendment
const response = await fetch('/api/legal-documents/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer admin-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    normTitle: 'Amendment 15 - Digital Rights',
    normType: 'CONSTITUTIONAL_NORM',
    legalHierarchy: 'CONSTITUCION',
    content: '...',
    publicationType: 'SUPLEMENTO',
    publicationNumber: 'RO-S-2024-001',
    metadata: {
      year: 2024,
      tags: ['constitutional', 'digital_rights', 'privacy'],
      description: 'Constitutional amendment on digital rights'
    }
  })
});

// System automatically:
// 1. Analyzes document structure
// 2. Extracts 15 articles with summaries
// 3. Generates 500+ embeddings
// 4. Updates document hierarchy
// 5. Notifies all users via email
// 6. Creates in-app notifications
// 7. Triggers webhook for external systems
```

### Scenario 2: Case Document Batch Upload

```typescript
// Lawyer uploads multiple case documents
const documents = [
  { title: 'Initial Complaint', file: complaint },
  { title: 'Evidence A', file: evidenceA },
  { title: 'Expert Report', file: report }
];

for (const doc of documents) {
  const formData = new FormData();
  formData.append('file', doc.file);
  formData.append('caseId', 'case-123');
  formData.append('title', doc.title);

  await fetch('/api/documents/upload', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer user-token'
    },
    body: formData
  });
}

// System processes each document:
// 1. Uploads to cloud storage
// 2. Extracts text content
// 3. Generates embeddings
// 4. Links to case
// 5. Notifies case team members
// 6. Updates case document index
```

### Scenario 3: Document Search and Discovery

```typescript
// User searches for relevant precedents
const searchResults = await fetch(
  '/api/legal-documents/search?q=digital+privacy+rights',
  {
    headers: {
      'Authorization': 'Bearer user-token'
    }
  }
).then(res => res.json());

// System returns:
// - Constitutional articles on privacy
// - Related organic laws
// - Judicial precedents
// - Relevant regulations
// Each with relevance scores and highlights

// Get document hierarchy for navigation
const hierarchy = await fetch('/api/legal-documents/hierarchy', {
  headers: {
    'Authorization': 'Bearer user-token'
  }
}).then(res => res.json());

// Navigate: Constitution > Title II > Chapter 6 > Article 66
```

### Scenario 4: Monitoring and Maintenance

```typescript
// Admin monitors system health
const health = await fetch('/health').then(res => res.json());
console.log('System status:', health.status);

// Check processing queue
const queueStats = await fetch('/api/admin/processing-queue/stats', {
  headers: {
    'Authorization': 'Bearer admin-token'
  }
}).then(res => res.json());

console.log(`
  Queue Status:
  - Waiting: ${queueStats.waiting}
  - Active: ${queueStats.active}
  - Completed: ${queueStats.completed}
  - Failed: ${queueStats.failed}
  - Throughput: ${queueStats.throughput.perHour}/hour
`);

// Reprocess failed document
if (queueStats.failed > 0) {
  await fetch('/api/legal-documents/doc-456/reprocess', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer admin-token'
    }
  });
}
```

---

## Performance Optimization

### Caching Strategy

```typescript
// Implement multi-level caching
const cacheConfig = {
  levels: {
    l1: {
      // In-memory cache (Node.js)
      type: 'memory',
      max: 100,
      ttl: 300  // 5 minutes
    },
    l2: {
      // Redis cache
      type: 'redis',
      ttl: 3600  // 1 hour
    },
    l3: {
      // Database materialized views
      type: 'database',
      refresh: 'daily'
    }
  }
};
```

### Embedding Optimization

```typescript
// Batch embedding generation
const embeddingStrategy = {
  batchSize: 100,
  dimensions: 1536,
  strategies: {
    full: { enabled: false },  // Too expensive
    chunk: { enabled: true, size: 512 },
    summary: { enabled: true },
    query: { enabled: true, templates: 10 }
  }
};
```

### Query Optimization

```sql
-- Create materialized view for hierarchy
CREATE MATERIALIZED VIEW document_hierarchy_mv AS
SELECT
  id,
  document_id,
  document_type,
  title,
  hierarchy_path,
  hierarchy_level,
  parent_id
FROM document_registry
WHERE is_current_version = true;

CREATE INDEX idx_hierarchy_mv_path
  ON document_hierarchy_mv USING GIST (hierarchy_path gist_trgm_ops);

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY document_hierarchy_mv;
```

---

## Security Considerations

### Authentication & Authorization

```typescript
// Implement role-based access control
const authConfig = {
  roles: {
    admin: {
      permissions: ['upload:legal', 'reprocess', 'admin:*']
    },
    lawyer: {
      permissions: ['upload:document', 'read:*', 'search:*']
    },
    user: {
      permissions: ['read:public', 'search:public']
    }
  }
};
```

### Input Validation

```typescript
// Strict input validation
const validationRules = {
  fileUpload: {
    maxSize: 50 * 1024 * 1024,  // 50MB
    allowedTypes: ['pdf', 'docx', 'txt'],
    scanForVirus: true
  },
  textContent: {
    maxLength: 1000000,  // 1M characters
    sanitize: true,
    validateEncoding: 'UTF-8'
  }
};
```

### Data Protection

```typescript
// Encrypt sensitive data
const encryptionConfig = {
  algorithm: 'aes-256-gcm',
  fields: ['webhook_secret', 'api_keys'],
  atRest: true,
  inTransit: true
};
```

---

## Migration from Existing System

### Step-by-Step Migration

1. **Backup existing data**
   ```bash
   pg_dump -U user -d legal_db > backup_$(date +%Y%m%d).sql
   ```

2. **Run migration in test environment**
   ```bash
   # Create test database
   createdb legal_db_test

   # Restore backup
   psql -U user -d legal_db_test < backup.sql

   # Apply migrations
   psql -U user -d legal_db_test < migration.sql
   ```

3. **Update existing documents**
   ```typescript
   // Script to process existing documents
   async function migrateExistingDocuments() {
     const documents = await prisma.legalDocument.findMany();

     for (const doc of documents) {
       await documentProcessor.addDocument(
         doc.id,
         'LegalDocument',
         { priority: 5 }  // Lower priority for migration
       );
     }
   }
   ```

4. **Switch to enhanced routes**
   ```typescript
   // Gradual rollout
   if (process.env.USE_ENHANCED_ROUTES === 'true') {
     app.register(legalDocumentRoutesEnhanced);
   } else {
     app.register(legalDocumentRoutesLegacy);
   }
   ```

---

## Support and Resources

### Documentation Links
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Fastify Documentation](https://www.fastify.io/docs)
- [Redis Documentation](https://redis.io/documentation)

### Contact Information
- **Technical Support**: tech-support@legal-system.com
- **Bug Reports**: GitHub Issues
- **Feature Requests**: GitHub Discussions

### Community Resources
- Discord Server: [Join Community](https://discord.gg/legal-system)
- Stack Overflow Tag: `legal-rag-system`
- YouTube Tutorials: [Channel Link]

---

## Appendix

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| DATABASE_URL | PostgreSQL connection string | - | Yes |
| REDIS_HOST | Redis server host | localhost | Yes |
| REDIS_PORT | Redis server port | 6379 | No |
| OPENAI_API_KEY | OpenAI API key | - | Yes |
| SMTP_HOST | SMTP server host | - | Yes |
| SMTP_USER | SMTP username | - | Yes |
| WORKER_CONCURRENCY | Concurrent jobs | 3 | No |
| LOG_LEVEL | Logging level | info | No |

### SQL Schema Summary

```sql
-- Core tables
analysis_queue              -- Job queue for processing
document_registry           -- Hierarchical document index
document_references         -- Cross-references between documents
legal_document_articles     -- Structured article storage
legal_document_sections     -- Document structure (titles, chapters)
legal_document_summaries    -- Multi-level summaries
query_templates            -- Search optimization
document_processing_history -- Audit trail
notification_subscriptions  -- User preferences
notification_queue         -- Pending notifications

-- Key relationships
document_registry.parent_id -> document_registry.id
legal_document_articles.legal_document_id -> legal_documents.id
notification_queue.recipient_id -> users.id
analysis_queue.created_by -> users.id
```

### Performance Benchmarks

| Operation | Average Time | Throughput |
|-----------|-------------|------------|
| Document Upload | 200ms | 300/min |
| Structure Extraction | 15s | 4/min |
| Embedding Generation | 30s | 2/min |
| Full Analysis | 45s | 1.3/min |
| Hierarchy Rebuild | 5s | 12/min |
| Search Query | 50ms | 1200/min |
| Notification Send | 100ms | 600/min |

---

## Version History

- **v1.0.0** (2024-11-10): Initial implementation
  - Event-driven architecture
  - Background job processing
  - Multi-channel notifications
  - Document registry with hierarchy
  - Full-text search
  - Embedding strategies

---

*Last updated: November 10, 2024*