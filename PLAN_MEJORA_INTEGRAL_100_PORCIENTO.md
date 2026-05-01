# Plan de Mejora Integral - Legal RAG System
## De 79% a 100% de Cumplimiento

---

## Resumen Ejecutivo

### Estado Actual vs Objetivo

| Area | Puntuacion Actual | Objetivo | Gap | Esfuerzo Estimado |
|------|-------------------|----------|-----|-------------------|
| **Seguridad** | 72.0% | 100% | 28% | 168 horas |
| **AI/NLP** | 68.0% | 100% | 32% | 12-16 semanas |
| **Frontend** | 76.9% | 100% | 23.1% | 58-78 horas |
| **Backend** | 85.0% | 100% | 15% | 80-100 horas |
| **Base de Datos** | 94.5% | 100% | 5.5% | 9 horas |
| **TOTAL** | **79.0%** | **100%** | **21%** | **~450-500 horas** |

### Prioridad de Implementacion

```
CRITICO [Semanas 1-3]     -> Seguridad (72% -> 100%)
ALTO    [Semanas 4-16]    -> AI/NLP (68% -> 100%)
MEDIO   [Semanas 17-20]   -> Frontend (76.9% -> 100%)
NORMAL  [Semanas 21-24]   -> Backend (85% -> 100%)
BAJO    [Semana 25]       -> Base de Datos (94.5% -> 100%)
```

---

# FASE 1: SEGURIDAD (CRITICO)
## Puntuacion: 72% -> 100% | Esfuerzo: 168 horas | Duracion: 3 semanas

### 1.1 Vulnerabilidades Identificadas

#### SEC-001: JWT Secret Hardcodeado (CVSS 9.1 - CRITICO)

**Ubicacion:** `src/server.ts:72`
```typescript
// PROBLEMA ACTUAL:
await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'supersecret',  // VULNERABLE
});
```

**Solucion:**
```typescript
// src/config/security.config.ts
import crypto from 'crypto';

export function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }

  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  return secret;
}

export function generateSecureSecret(): string {
  return crypto.randomBytes(64).toString('hex');
}
```

**Actualizacion en server.ts:**
```typescript
import { getJWTSecret } from './config/security.config.js';

await app.register(jwt, {
  secret: getJWTSecret(),
  sign: {
    algorithm: 'HS512',
    expiresIn: '15m'  // Tokens de corta duracion
  },
  verify: {
    algorithms: ['HS512']
  }
});
```

**Esfuerzo:** 4 horas

---

#### SEC-002: CORS Wildcard por Defecto (CVSS 6.5 - MEDIO)

**Ubicacion:** `src/server.ts:66-69`
```typescript
// PROBLEMA ACTUAL:
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',  // VULNERABLE
  credentials: true,
});
```

**Solucion:**
```typescript
// src/config/cors.config.ts
export function getCorsConfig() {
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

  if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN must be configured in production');
  }

  return {
    origin: (origin: string | undefined, callback: Function) => {
      // Permitir requests sin origin (mobile apps, Postman)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
    maxAge: 86400  // 24 horas
  };
}
```

**Esfuerzo:** 4 horas

---

#### SEC-003: Falta HTTPS/HSTS Headers (CVSS 7.4 - ALTO)

**Solucion:**
```typescript
// src/middleware/security-headers.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';

export async function securityHeadersMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // HSTS - Force HTTPS
  reply.header(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Prevent clickjacking
  reply.header('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  reply.header('X-Content-Type-Options', 'nosniff');

  // XSS Protection
  reply.header('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  reply.header(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self' https://api.openai.com; " +
    "frame-ancestors 'none'"
  );

  // Referrer Policy
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  reply.header(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );
}
```

**Esfuerzo:** 8 horas

---

#### SEC-004: Mensajes de Error Verbosos (CVSS 4.3 - MEDIO)

**Solucion:**
```typescript
// src/middleware/error-handler.middleware.ts
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

interface SafeErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  requestId?: string;
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.headers['x-request-id'] as string;

  // Log completo para debugging interno
  request.log.error({
    err: error,
    requestId,
    url: request.url,
    method: request.method,
    userId: (request as any).user?.id
  });

  // Respuesta segura para el cliente
  const statusCode = error.statusCode || 500;
  const safeResponse: SafeErrorResponse = {
    error: getPublicErrorType(statusCode),
    message: getPublicMessage(error, statusCode),
    statusCode,
    requestId
  };

  reply.status(statusCode).send(safeResponse);
}

function getPublicErrorType(statusCode: number): string {
  const types: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Validation Error',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable'
  };
  return types[statusCode] || 'Error';
}

function getPublicMessage(error: FastifyError, statusCode: number): string {
  // Solo mostrar mensajes seguros en produccion
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    return 'An unexpected error occurred. Please try again later.';
  }

  // Sanitizar mensaje para evitar leak de info sensible
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /api[_-]?key/i,
    /database/i,
    /sql/i
  ];

  let message = error.message;
  for (const pattern of sensitivePatterns) {
    if (pattern.test(message)) {
      return 'An error occurred processing your request.';
    }
  }

  return message;
}
```

**Esfuerzo:** 6 horas

---

#### SEC-005: Falta Encriptacion de PII (CVSS 8.1 - ALTO)

**Solucion:**
```typescript
// src/services/encryption.service.ts
import crypto from 'crypto';

export class FieldEncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;
  private authTagLength = 16;
  private key: Buffer;

  constructor() {
    const encryptionKey = process.env.FIELD_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('FIELD_ENCRYPTION_KEY environment variable is required');
    }

    // Derivar clave de 256 bits
    this.key = crypto.scryptSync(encryptionKey, 'legal-rag-salt', this.keyLength);
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Formato: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Campos PII que requieren encriptacion
  static readonly PII_FIELDS = [
    'email',
    'phone',
    'address',
    'nationalId',
    'bankAccount',
    'creditCard'
  ];
}

// Middleware Prisma para encriptacion automatica
export function createPrismaEncryptionMiddleware(encryptionService: FieldEncryptionService) {
  return async (params: any, next: any) => {
    // Encriptar antes de escribir
    if (['create', 'update', 'upsert'].includes(params.action)) {
      params.args.data = encryptPIIFields(params.args.data, encryptionService);
    }

    const result = await next(params);

    // Desencriptar despues de leer
    if (result && ['findUnique', 'findFirst', 'findMany'].includes(params.action)) {
      return decryptPIIFields(result, encryptionService);
    }

    return result;
  };
}

function encryptPIIFields(data: any, service: FieldEncryptionService): any {
  if (!data || typeof data !== 'object') return data;

  const encrypted = { ...data };
  for (const field of FieldEncryptionService.PII_FIELDS) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = service.encrypt(encrypted[field]);
    }
  }
  return encrypted;
}

function decryptPIIFields(data: any, service: FieldEncryptionService): any {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(item => decryptPIIFields(item, service));
  }
  if (typeof data !== 'object') return data;

  const decrypted = { ...data };
  for (const field of FieldEncryptionService.PII_FIELDS) {
    if (decrypted[field] && typeof decrypted[field] === 'string' && decrypted[field].includes(':')) {
      try {
        decrypted[field] = service.decrypt(decrypted[field]);
      } catch {
        // Campo no encriptado o corrupto
      }
    }
  }
  return decrypted;
}
```

**Esfuerzo:** 16 horas

---

### 1.2 Cumplimiento GDPR

| Requisito | Articulo | Estado | Implementacion |
|-----------|----------|--------|----------------|
| Derecho al Olvido | Art. 17 | Pendiente | API de eliminacion de datos |
| Portabilidad | Art. 20 | Pendiente | Export JSON/CSV |
| Consentimiento | Art. 7 | Pendiente | Sistema de preferencias |
| Registro Actividades | Art. 30 | Parcial | Audit log mejorado |
| Notificacion Brechas | Art. 33 | Pendiente | Sistema de alertas |

**Implementacion Derecho al Olvido (Art. 17):**
```typescript
// src/routes/gdpr.ts
import { FastifyPluginAsync } from 'fastify';

export const gdprRoutes: FastifyPluginAsync = async (fastify) => {
  // DELETE /api/v1/gdpr/me - Derecho al olvido
  fastify.delete('/gdpr/me', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const userId = (request as any).user.id;

      // 1. Anonimizar datos personales
      await fastify.prisma.$transaction([
        // Anonimizar usuario
        fastify.prisma.user.update({
          where: { id: userId },
          data: {
            email: `deleted_${userId}@anonymized.local`,
            name: 'Usuario Eliminado',
            phone: null,
            address: null,
            deletedAt: new Date(),
            isActive: false
          }
        }),
        // Anonimizar casos
        fastify.prisma.case.updateMany({
          where: { userId },
          data: {
            clientName: 'Cliente Anonimizado',
            clientEmail: null,
            clientPhone: null
          }
        }),
        // Registrar en audit log
        fastify.prisma.auditLog.create({
          data: {
            action: 'GDPR_DATA_DELETION',
            entityType: 'User',
            entityId: userId,
            userId,
            details: { reason: 'User requested data deletion under GDPR Article 17' }
          }
        })
      ]);

      // 2. Invalidar todas las sesiones
      await fastify.prisma.refreshToken.deleteMany({
        where: { userId }
      });

      reply.send({
        success: true,
        message: 'Your data has been anonymized per GDPR Article 17'
      });
    }
  });

  // GET /api/v1/gdpr/export - Portabilidad de datos (Art. 20)
  fastify.get('/gdpr/export', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const userId = (request as any).user.id;

      const userData = await fastify.prisma.user.findUnique({
        where: { id: userId },
        include: {
          cases: true,
          documents: true,
          queryHistory: true,
          feedback: true
        }
      });

      reply.header('Content-Disposition', 'attachment; filename=my-data.json');
      reply.header('Content-Type', 'application/json');
      reply.send(userData);
    }
  });
};
```

**Esfuerzo Total Seguridad:** 168 horas

---

# FASE 2: AI/NLP (ALTO)
## Puntuacion: 68% -> 100% | Esfuerzo: 12-16 semanas

### 2.1 Modulos Faltantes

| Modulo | Estado Actual | Gap | Semanas |
|--------|---------------|-----|---------|
| Predictive Intelligence | 40% | 60% | 4 |
| Trend Analysis | 0% | 100% | 3 |
| Document Comparison | 0% | 100% | 3 |
| Legal Pattern Detection | 30% | 70% | 3 |
| Graph Visualization | 50% | 50% | 2 |
| Document Summarization | 60% | 40% | 2 |

### 2.2 Esquema de Base de Datos para AI/NLP

```prisma
// prisma/schema.prisma - Adiciones para AI/NLP

model MLModel {
  id            String   @id @default(cuid())
  name          String
  version       String
  type          MLModelType
  status        MLModelStatus @default(TRAINING)
  accuracy      Float?
  metrics       Json?
  config        Json
  trainedAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  predictions   Prediction[]

  @@index([type, status])
}

enum MLModelType {
  CASE_OUTCOME
  DOCUMENT_CLASSIFICATION
  TIMELINE_PREDICTION
  RISK_ASSESSMENT
  TREND_FORECASTING
}

enum MLModelStatus {
  TRAINING
  VALIDATING
  ACTIVE
  DEPRECATED
  FAILED
}

model Prediction {
  id              String   @id @default(cuid())
  modelId         String
  model           MLModel  @relation(fields: [modelId], references: [id])
  entityType      String
  entityId        String
  prediction      Json
  confidence      Float
  explanation     String?
  actualOutcome   Json?
  isCorrect       Boolean?
  createdAt       DateTime @default(now())
  feedback        PredictionFeedback[]

  @@index([modelId, entityType])
  @@index([entityId])
}

model PredictionFeedback {
  id            String     @id @default(cuid())
  predictionId  String
  prediction    Prediction @relation(fields: [predictionId], references: [id])
  userId        String
  rating        Int        // 1-5
  comment       String?
  wasHelpful    Boolean
  createdAt     DateTime   @default(now())

  @@index([predictionId])
}

model TrendForecast {
  id            String   @id @default(cuid())
  category      String
  metric        String
  timeframe     String
  currentValue  Float
  predictedValue Float
  confidence    Float
  trend         TrendDirection
  factors       Json
  dataPoints    TrendDataPoint[]
  alerts        TrendAlert[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([category, metric])
}

enum TrendDirection {
  INCREASING
  DECREASING
  STABLE
  VOLATILE
}

model TrendDataPoint {
  id          String       @id @default(cuid())
  forecastId  String
  forecast    TrendForecast @relation(fields: [forecastId], references: [id])
  timestamp   DateTime
  value       Float
  isActual    Boolean      @default(true)

  @@index([forecastId, timestamp])
}

model TrendAlert {
  id          String       @id @default(cuid())
  forecastId  String
  forecast    TrendForecast @relation(fields: [forecastId], references: [id])
  type        AlertType
  severity    AlertSeverity
  message     String
  threshold   Float?
  actualValue Float?
  acknowledged Boolean     @default(false)
  createdAt   DateTime     @default(now())

  @@index([forecastId, acknowledged])
}

enum AlertType {
  THRESHOLD_BREACH
  TREND_REVERSAL
  ANOMALY_DETECTED
  FORECAST_DEVIATION
}

enum AlertSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model DocumentComparison {
  id              String   @id @default(cuid())
  documentAId     String
  documentBId     String
  similarityScore Float
  semanticScore   Float
  structuralScore Float
  changes         ComparisonChange[]
  summary         String?
  createdAt       DateTime @default(now())

  @@index([documentAId])
  @@index([documentBId])
  @@unique([documentAId, documentBId])
}

model ComparisonChange {
  id            String             @id @default(cuid())
  comparisonId  String
  comparison    DocumentComparison @relation(fields: [comparisonId], references: [id])
  changeType    ChangeType
  section       String?
  originalText  String?
  modifiedText  String?
  significance  Float

  @@index([comparisonId])
}

enum ChangeType {
  ADDITION
  DELETION
  MODIFICATION
  REORDER
  FORMATTING
}

model LegalPattern {
  id          String   @id @default(cuid())
  name        String
  description String
  category    String
  pattern     Json     // Regex o estructura
  frequency   Int      @default(0)
  confidence  Float
  examples    String[]
  documents   PatternDocument[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([category])
}

model PatternDocument {
  id          String       @id @default(cuid())
  patternId   String
  pattern     LegalPattern @relation(fields: [patternId], references: [id])
  documentId  String
  matchCount  Int
  locations   Json         // Array de posiciones

  @@index([patternId])
  @@index([documentId])
}

model GraphSnapshot {
  id          String   @id @default(cuid())
  name        String
  description String?
  nodes       Json     // Array de nodos
  edges       Json     // Array de conexiones
  metadata    Json?
  userId      String?
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([userId])
}
```

### 2.3 Servicio de Inteligencia Predictiva

```typescript
// src/services/ai/predictive-intelligence.service.ts
import OpenAI from 'openai';
import { PrismaClient, MLModelType, MLModelStatus } from '@prisma/client';

interface PredictionInput {
  entityType: 'case' | 'document' | 'query';
  entityId: string;
  context: Record<string, any>;
}

interface PredictionResult {
  prediction: any;
  confidence: number;
  explanation: string;
  factors: string[];
}

export class PredictiveIntelligenceService {
  private openai: OpenAI;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.prisma = prisma;
  }

  async predictCaseOutcome(caseId: string): Promise<PredictionResult> {
    // Obtener datos del caso
    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        documents: true,
        activities: true
      }
    });

    if (!caseData) {
      throw new Error('Case not found');
    }

    // Buscar casos similares historicos
    const similarCases = await this.findSimilarCases(caseData);

    // Analizar con GPT-4
    const analysis = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a legal AI analyst specializing in case outcome prediction.
            Analyze the case and similar historical cases to predict the likely outcome.
            Consider: jurisdiction, case type, evidence strength, precedents, and timeline.
            Provide confidence score (0-1) and detailed explanation.`
        },
        {
          role: 'user',
          content: JSON.stringify({
            currentCase: {
              type: caseData.type,
              status: caseData.status,
              description: caseData.description,
              documentsCount: caseData.documents.length,
              daysOpen: this.daysBetween(caseData.createdAt, new Date())
            },
            similarCases: similarCases.map(c => ({
              type: c.type,
              outcome: c.outcome,
              duration: c.duration
            }))
          })
        }
      ],
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(analysis.choices[0].message.content || '{}');

    // Guardar prediccion
    const activeModel = await this.getActiveModel(MLModelType.CASE_OUTCOME);

    await this.prisma.prediction.create({
      data: {
        modelId: activeModel.id,
        entityType: 'case',
        entityId: caseId,
        prediction: result.prediction,
        confidence: result.confidence,
        explanation: result.explanation
      }
    });

    return result;
  }

  async predictDocumentRelevance(
    documentId: string,
    queryContext: string
  ): Promise<PredictionResult> {
    const document = await this.prisma.legalDocument.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Usar embeddings para calcular relevancia semantica
    const [docEmbedding, queryEmbedding] = await Promise.all([
      this.getOrCreateEmbedding(document.content || ''),
      this.getOrCreateEmbedding(queryContext)
    ]);

    const semanticScore = this.cosineSimilarity(docEmbedding, queryEmbedding);

    // Analisis adicional con GPT
    const analysis = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Analyze document relevance to query. Consider: topic match, legal applicability, recency, jurisdiction match.'
        },
        {
          role: 'user',
          content: JSON.stringify({
            documentTitle: document.title,
            documentType: document.documentType,
            queryContext,
            semanticScore
          })
        }
      ],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(analysis.choices[0].message.content || '{}');
  }

  async generateTimelinePrediction(caseId: string): Promise<{
    milestones: Array<{ event: string; predictedDate: Date; confidence: number }>;
    estimatedCompletion: Date;
    riskFactors: string[];
  }> {
    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: { activities: { orderBy: { createdAt: 'asc' } } }
    });

    if (!caseData) {
      throw new Error('Case not found');
    }

    // Analizar patrones historicos
    const historicalPatterns = await this.analyzeTimelinePatterns(caseData.type);

    const prediction = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Predict case timeline based on historical patterns and current progress.
            Consider: case complexity, jurisdiction timelines, pending actions, typical delays.`
        },
        {
          role: 'user',
          content: JSON.stringify({
            caseType: caseData.type,
            currentStatus: caseData.status,
            activitiesCount: caseData.activities.length,
            daysSinceCreation: this.daysBetween(caseData.createdAt, new Date()),
            historicalPatterns
          })
        }
      ],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(prediction.choices[0].message.content || '{}');
  }

  private async findSimilarCases(caseData: any): Promise<any[]> {
    return this.prisma.case.findMany({
      where: {
        type: caseData.type,
        status: 'CLOSED',
        id: { not: caseData.id }
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
  }

  private async getActiveModel(type: MLModelType) {
    let model = await this.prisma.mLModel.findFirst({
      where: { type, status: MLModelStatus.ACTIVE }
    });

    if (!model) {
      model = await this.prisma.mLModel.create({
        data: {
          name: `${type}_default`,
          version: '1.0.0',
          type,
          status: MLModelStatus.ACTIVE,
          config: { provider: 'openai', model: 'gpt-4-turbo-preview' }
        }
      });
    }

    return model;
  }

  private async getOrCreateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000)
    });
    return response.data[0].embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private daysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private async analyzeTimelinePatterns(caseType: string): Promise<any> {
    const closedCases = await this.prisma.case.findMany({
      where: { type: caseType, status: 'CLOSED' },
      select: { createdAt: true, updatedAt: true },
      take: 100
    });

    if (closedCases.length === 0) return { avgDuration: 90, stdDev: 30 };

    const durations = closedCases.map(c =>
      this.daysBetween(c.createdAt, c.updatedAt)
    );

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / durations.length;

    return {
      avgDuration: Math.round(avg),
      stdDev: Math.round(Math.sqrt(variance)),
      min: Math.min(...durations),
      max: Math.max(...durations)
    };
  }
}
```

### 2.4 Servicio de Analisis de Tendencias

```typescript
// src/services/ai/trend-analysis.service.ts
import { PrismaClient, TrendDirection, AlertSeverity, AlertType } from '@prisma/client';

interface TrendAnalysisResult {
  category: string;
  metric: string;
  trend: TrendDirection;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  changePercent: number;
  factors: string[];
}

export class TrendAnalysisService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async analyzeQueryTrends(timeframeDays: number = 30): Promise<TrendAnalysisResult[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    // Obtener historico de queries
    const queries = await this.prisma.queryHistory.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: 'asc' }
    });

    // Agrupar por categoria legal
    const categoryTrends = this.groupByCategory(queries);
    const results: TrendAnalysisResult[] = [];

    for (const [category, data] of Object.entries(categoryTrends)) {
      const trend = this.calculateTrend(data);

      // Guardar forecast
      const forecast = await this.prisma.trendForecast.create({
        data: {
          category,
          metric: 'query_volume',
          timeframe: `${timeframeDays}d`,
          currentValue: trend.currentValue,
          predictedValue: trend.predictedValue,
          confidence: trend.confidence,
          trend: trend.direction,
          factors: trend.factors
        }
      });

      // Crear alertas si hay cambios significativos
      if (Math.abs(trend.changePercent) > 20) {
        await this.prisma.trendAlert.create({
          data: {
            forecastId: forecast.id,
            type: AlertType.TREND_REVERSAL,
            severity: this.getSeverity(trend.changePercent),
            message: `${category} queries ${trend.direction === 'INCREASING' ? 'increased' : 'decreased'} by ${trend.changePercent}%`,
            threshold: 20,
            actualValue: trend.changePercent
          }
        });
      }

      results.push({
        category,
        metric: 'query_volume',
        ...trend
      });
    }

    return results;
  }

  async analyzeDocumentTrends(): Promise<TrendAnalysisResult[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const documents = await this.prisma.legalDocument.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: {
        documentType: true,
        jurisdiction: true,
        createdAt: true
      }
    });

    // Analizar tendencias por tipo de documento
    const byType = this.groupBy(documents, 'documentType');
    const results: TrendAnalysisResult[] = [];

    for (const [type, docs] of Object.entries(byType)) {
      const weeklyData = this.groupByWeek(docs);
      const trend = this.calculateLinearTrend(weeklyData);

      results.push({
        category: type,
        metric: 'document_uploads',
        trend: trend.slope > 0.1 ? TrendDirection.INCREASING :
               trend.slope < -0.1 ? TrendDirection.DECREASING :
               TrendDirection.STABLE,
        currentValue: weeklyData[weeklyData.length - 1] || 0,
        predictedValue: Math.round(trend.predict(weeklyData.length + 1)),
        confidence: trend.rSquared,
        changePercent: trend.changePercent,
        factors: this.identifyFactors(type, docs)
      });
    }

    return results;
  }

  async detectAnomalies(metric: string, threshold: number = 2): Promise<{
    anomalies: Array<{ timestamp: Date; value: number; zscore: number }>;
    baseline: { mean: number; stdDev: number };
  }> {
    // Obtener datos historicos
    const dataPoints = await this.prisma.trendDataPoint.findMany({
      where: {
        forecast: { metric },
        isActual: true
      },
      orderBy: { timestamp: 'asc' }
    });

    const values = dataPoints.map(dp => dp.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    const anomalies = dataPoints
      .map(dp => ({
        timestamp: dp.timestamp,
        value: dp.value,
        zscore: (dp.value - mean) / stdDev
      }))
      .filter(dp => Math.abs(dp.zscore) > threshold);

    return {
      anomalies,
      baseline: { mean, stdDev }
    };
  }

  private groupByCategory(queries: any[]): Record<string, any[]> {
    return queries.reduce((acc, q) => {
      const category = q.category || 'uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(q);
      return acc;
    }, {});
  }

  private groupBy(items: any[], key: string): Record<string, any[]> {
    return items.reduce((acc, item) => {
      const value = item[key] || 'unknown';
      if (!acc[value]) acc[value] = [];
      acc[value].push(item);
      return acc;
    }, {});
  }

  private groupByWeek(items: any[]): number[] {
    const weeks: Record<string, number> = {};

    items.forEach(item => {
      const weekStart = this.getWeekStart(item.createdAt);
      const key = weekStart.toISOString();
      weeks[key] = (weeks[key] || 0) + 1;
    });

    return Object.values(weeks);
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  private calculateTrend(data: any[]): {
    direction: TrendDirection;
    currentValue: number;
    predictedValue: number;
    confidence: number;
    changePercent: number;
    factors: any;
  } {
    const recentCount = data.filter(d => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(d.createdAt) >= weekAgo;
    }).length;

    const previousCount = data.filter(d => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(d.createdAt) >= twoWeeksAgo && new Date(d.createdAt) < weekAgo;
    }).length;

    const changePercent = previousCount === 0 ? 0 :
      ((recentCount - previousCount) / previousCount) * 100;

    return {
      direction: changePercent > 5 ? TrendDirection.INCREASING :
                 changePercent < -5 ? TrendDirection.DECREASING :
                 TrendDirection.STABLE,
      currentValue: recentCount,
      predictedValue: Math.round(recentCount * (1 + changePercent / 100)),
      confidence: 0.7 + Math.min(data.length / 100, 0.25),
      changePercent: Math.round(changePercent * 10) / 10,
      factors: { dataPoints: data.length, period: '7d' }
    };
  }

  private calculateLinearTrend(values: number[]): {
    slope: number;
    intercept: number;
    rSquared: number;
    changePercent: number;
    predict: (x: number) => number;
  } {
    const n = values.length;
    if (n < 2) {
      return {
        slope: 0,
        intercept: values[0] || 0,
        rSquared: 0,
        changePercent: 0,
        predict: () => values[0] || 0
      };
    }

    const xSum = (n * (n - 1)) / 2;
    const ySum = values.reduce((a, b) => a + b, 0);
    const xySum = values.reduce((sum, y, i) => sum + i * y, 0);
    const xxSum = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
    const intercept = (ySum - slope * xSum) / n;

    // R-squared
    const yMean = ySum / n;
    const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = values.reduce((sum, y, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

    const firstValue = values[0] || 1;
    const lastValue = values[values.length - 1] || firstValue;
    const changePercent = ((lastValue - firstValue) / firstValue) * 100;

    return {
      slope,
      intercept,
      rSquared: Math.max(0, Math.min(1, rSquared)),
      changePercent: Math.round(changePercent * 10) / 10,
      predict: (x: number) => slope * x + intercept
    };
  }

  private identifyFactors(type: string, docs: any[]): string[] {
    const factors: string[] = [];

    if (docs.length > 10) {
      factors.push('High volume category');
    }

    // Analizar jurisdicciones
    const jurisdictions = new Set(docs.map(d => d.jurisdiction));
    if (jurisdictions.size > 3) {
      factors.push('Multi-jurisdiction interest');
    }

    return factors;
  }

  private getSeverity(changePercent: number): AlertSeverity {
    const abs = Math.abs(changePercent);
    if (abs > 50) return AlertSeverity.CRITICAL;
    if (abs > 30) return AlertSeverity.HIGH;
    if (abs > 20) return AlertSeverity.MEDIUM;
    return AlertSeverity.LOW;
  }
}
```

### 2.5 Servicio de Comparacion de Documentos

```typescript
// src/services/ai/document-comparison.service.ts
import OpenAI from 'openai';
import { PrismaClient, ChangeType } from '@prisma/client';
import * as diff from 'diff';

interface ComparisonResult {
  similarityScore: number;
  semanticScore: number;
  structuralScore: number;
  changes: Array<{
    type: ChangeType;
    section?: string;
    original?: string;
    modified?: string;
    significance: number;
  }>;
  summary: string;
}

export class DocumentComparisonService {
  private openai: OpenAI;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.prisma = prisma;
  }

  async compareDocuments(
    documentAId: string,
    documentBId: string
  ): Promise<ComparisonResult> {
    // Verificar si ya existe comparacion
    const existing = await this.prisma.documentComparison.findUnique({
      where: {
        documentAId_documentBId: { documentAId, documentBId }
      },
      include: { changes: true }
    });

    if (existing) {
      return this.formatExistingComparison(existing);
    }

    // Obtener documentos
    const [docA, docB] = await Promise.all([
      this.prisma.legalDocument.findUnique({ where: { id: documentAId } }),
      this.prisma.legalDocument.findUnique({ where: { id: documentBId } })
    ]);

    if (!docA || !docB) {
      throw new Error('One or both documents not found');
    }

    // Calcular scores
    const structuralScore = this.calculateStructuralSimilarity(
      docA.content || '',
      docB.content || ''
    );

    const semanticScore = await this.calculateSemanticSimilarity(
      docA.content || '',
      docB.content || ''
    );

    const changes = this.detectChanges(docA.content || '', docB.content || '');

    const similarityScore = (structuralScore + semanticScore) / 2;

    // Generar resumen con AI
    const summary = await this.generateComparisonSummary(docA, docB, changes);

    // Guardar comparacion
    const comparison = await this.prisma.documentComparison.create({
      data: {
        documentAId,
        documentBId,
        similarityScore,
        semanticScore,
        structuralScore,
        summary,
        changes: {
          create: changes.map(c => ({
            changeType: c.type,
            section: c.section,
            originalText: c.original,
            modifiedText: c.modified,
            significance: c.significance
          }))
        }
      },
      include: { changes: true }
    });

    return {
      similarityScore,
      semanticScore,
      structuralScore,
      changes,
      summary
    };
  }

  async findSimilarDocuments(
    documentId: string,
    threshold: number = 0.7,
    limit: number = 10
  ): Promise<Array<{ documentId: string; similarity: number }>> {
    const document = await this.prisma.legalDocument.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Usar vector similarity si hay embeddings
    if (document.embedding) {
      const similarDocs = await this.prisma.$queryRaw<Array<{
        id: string;
        similarity: number;
      }>>`
        SELECT id, 1 - (embedding <=> ${document.embedding}::vector) as similarity
        FROM "LegalDocument"
        WHERE id != ${documentId}
        AND embedding IS NOT NULL
        ORDER BY embedding <=> ${document.embedding}::vector
        LIMIT ${limit}
      `;

      return similarDocs
        .filter(d => d.similarity >= threshold)
        .map(d => ({ documentId: d.id, similarity: d.similarity }));
    }

    // Fallback: comparacion textual
    const allDocs = await this.prisma.legalDocument.findMany({
      where: { id: { not: documentId } },
      take: 100 // Limitar para performance
    });

    const similarities = await Promise.all(
      allDocs.map(async doc => ({
        documentId: doc.id,
        similarity: await this.calculateSemanticSimilarity(
          document.content || '',
          doc.content || ''
        )
      }))
    );

    return similarities
      .filter(s => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private calculateStructuralSimilarity(textA: string, textB: string): number {
    const sectionsA = this.extractSections(textA);
    const sectionsB = this.extractSections(textB);

    const allSections = new Set([...sectionsA, ...sectionsB]);
    const commonSections = sectionsA.filter(s => sectionsB.includes(s));

    if (allSections.size === 0) return 0;

    return commonSections.length / allSections.size;
  }

  private async calculateSemanticSimilarity(
    textA: string,
    textB: string
  ): Promise<number> {
    const [embeddingA, embeddingB] = await Promise.all([
      this.getEmbedding(textA.substring(0, 8000)),
      this.getEmbedding(textB.substring(0, 8000))
    ]);

    return this.cosineSimilarity(embeddingA, embeddingB);
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    return response.data[0].embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private detectChanges(textA: string, textB: string): Array<{
    type: ChangeType;
    section?: string;
    original?: string;
    modified?: string;
    significance: number;
  }> {
    const differences = diff.diffLines(textA, textB);
    const changes: Array<{
      type: ChangeType;
      section?: string;
      original?: string;
      modified?: string;
      significance: number;
    }> = [];

    for (let i = 0; i < differences.length; i++) {
      const part = differences[i];

      if (part.added) {
        changes.push({
          type: ChangeType.ADDITION,
          modified: part.value.substring(0, 500),
          significance: this.calculateSignificance(part.value)
        });
      } else if (part.removed) {
        // Check if next part is addition (modification)
        const nextPart = differences[i + 1];
        if (nextPart?.added) {
          changes.push({
            type: ChangeType.MODIFICATION,
            original: part.value.substring(0, 500),
            modified: nextPart.value.substring(0, 500),
            significance: this.calculateSignificance(part.value + nextPart.value)
          });
          i++; // Skip next part
        } else {
          changes.push({
            type: ChangeType.DELETION,
            original: part.value.substring(0, 500),
            significance: this.calculateSignificance(part.value)
          });
        }
      }
    }

    return changes;
  }

  private calculateSignificance(text: string): number {
    const legalKeywords = [
      'articulo', 'ley', 'decreto', 'resolucion', 'sentencia',
      'obligacion', 'derecho', 'sancion', 'multa', 'plazo',
      'contrato', 'clausula', 'parte', 'tribunal', 'juez'
    ];

    const lowercaseText = text.toLowerCase();
    const keywordCount = legalKeywords.filter(kw =>
      lowercaseText.includes(kw)
    ).length;

    const lengthFactor = Math.min(text.length / 1000, 1);
    const keywordFactor = Math.min(keywordCount / 5, 1);

    return (lengthFactor * 0.4 + keywordFactor * 0.6);
  }

  private extractSections(text: string): string[] {
    const sectionPatterns = [
      /^(ARTICULO|Art\.|CAPITULO|TITULO|SECCION)\s+\d+/gmi,
      /^#{1,6}\s+.+$/gm,
      /^\d+\.\s+.+$/gm
    ];

    const sections: string[] = [];
    for (const pattern of sectionPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        sections.push(...matches.map(m => m.toLowerCase().trim()));
      }
    }

    return [...new Set(sections)];
  }

  private async generateComparisonSummary(
    docA: any,
    docB: any,
    changes: any[]
  ): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Generate a concise summary (2-3 paragraphs) comparing two legal documents. Focus on: key differences, legal implications, and which document might be more current/comprehensive.'
        },
        {
          role: 'user',
          content: JSON.stringify({
            documentA: {
              title: docA.title,
              type: docA.documentType,
              date: docA.createdAt
            },
            documentB: {
              title: docB.title,
              type: docB.documentType,
              date: docB.createdAt
            },
            changesCount: changes.length,
            significantChanges: changes.filter(c => c.significance > 0.5).length
          })
        }
      ],
      max_tokens: 500
    });

    return response.choices[0].message.content || 'Comparison summary not available.';
  }

  private formatExistingComparison(comparison: any): ComparisonResult {
    return {
      similarityScore: comparison.similarityScore,
      semanticScore: comparison.semanticScore,
      structuralScore: comparison.structuralScore,
      changes: comparison.changes.map((c: any) => ({
        type: c.changeType,
        section: c.section,
        original: c.originalText,
        modified: c.modifiedText,
        significance: c.significance
      })),
      summary: comparison.summary || ''
    };
  }
}
```

**Esfuerzo Total AI/NLP:** 12-16 semanas

---

# FASE 3: FRONTEND (MEDIO)
## Puntuacion: 76.9% -> 100% | Esfuerzo: 58-78 horas

### 3.1 Componentes shadcn/ui Faltantes

**Instalacion Base:**
```bash
npx shadcn@latest init
npx shadcn@latest add button card dialog dropdown-menu form input label select tabs toast table badge avatar checkbox radio-group switch textarea tooltip popover command calendar date-picker progress skeleton slider scroll-area separator sheet accordion alert alert-dialog aspect-ratio collapsible context-menu hover-card menubar navigation-menu
```

### 3.2 Paginas Faltantes

| Pagina | Ruta | Prioridad | Horas |
|--------|------|-----------|-------|
| Analytics Dashboard | /analytics | Alta | 8 |
| AI Assistant | /ai-assistant | Alta | 8 |
| Diagnostics | /diagnostics | Media | 4 |
| Feedback | /feedback | Media | 4 |
| Notifications | /notifications | Media | 4 |
| Unified Search | /search | Alta | 6 |
| Usage Stats | /usage | Media | 4 |

### 3.3 React Query Hooks

```typescript
// frontend/src/hooks/useApiQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Cases
export function useCases(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ['cases', params],
    queryFn: () => apiClient.get('/api/v1/cases', { params }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCase(id: string) {
  return useQuery({
    queryKey: ['case', id],
    queryFn: () => apiClient.get(`/api/v1/cases/${id}`),
    enabled: !!id,
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/api/v1/cases', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

// Documents
export function useDocuments(caseId?: string) {
  return useQuery({
    queryKey: ['documents', caseId],
    queryFn: () => apiClient.get('/api/v1/documents', { params: { caseId } }),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.post('/api/v1/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

// Legal Documents
export function useLegalDocuments(params?: {
  type?: string;
  jurisdiction?: string;
  search?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ['legal-documents', params],
    queryFn: () => apiClient.get('/api/v1/legal-documents', { params }),
  });
}

// Query/Search
export function useSemanticSearch() {
  return useMutation({
    mutationFn: (query: string) =>
      apiClient.post('/api/v1/query/semantic', { query }),
  });
}

export function useUnifiedSearch() {
  return useMutation({
    mutationFn: (params: { query: string; filters?: any }) =>
      apiClient.post('/api/v1/unified-search', params),
  });
}

// Analytics
export function useAnalytics(timeframe: string = '30d') {
  return useQuery({
    queryKey: ['analytics', timeframe],
    queryFn: () => apiClient.get('/api/v1/analytics', { params: { timeframe } }),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// AI Assistant
export function useAIAssistant() {
  return useMutation({
    mutationFn: (params: { message: string; context?: any }) =>
      apiClient.post('/api/v1/ai-assistant/chat', params),
  });
}

// Feedback
export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (data: {
      type: string;
      rating?: number;
      comment?: string;
      metadata?: any;
    }) => apiClient.post('/api/v1/feedback', data),
  });
}

// User Settings
export function useUserSettings() {
  return useQuery({
    queryKey: ['user-settings'],
    queryFn: () => apiClient.get('/api/v1/settings'),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: any) => apiClient.put('/api/v1/settings', settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    },
  });
}

// Notifications
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get('/api/v1/notifications'),
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/api/v1/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
```

### 3.4 Pagina de Analytics Dashboard

```tsx
// frontend/src/app/analytics/page.tsx
'use client';

import { useAnalytics } from '@/hooks/useApiQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState('30d');
  const { data, isLoading, error } = useAnalytics(timeframe);

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Error loading analytics: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Insights and metrics for your legal operations
          </p>
        </div>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Queries"
          value={data?.totalQueries || 0}
          change={data?.queryChange || 0}
          icon="search"
        />
        <KPICard
          title="Documents Processed"
          value={data?.documentsProcessed || 0}
          change={data?.documentChange || 0}
          icon="file"
        />
        <KPICard
          title="Active Cases"
          value={data?.activeCases || 0}
          change={data?.caseChange || 0}
          icon="briefcase"
        />
        <KPICard
          title="AI Accuracy"
          value={`${data?.aiAccuracy || 0}%`}
          change={data?.accuracyChange || 0}
          icon="brain"
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="queries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queries">Query Trends</TabsTrigger>
          <TabsTrigger value="documents">Document Types</TabsTrigger>
          <TabsTrigger value="performance">AI Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="queries">
          <Card>
            <CardHeader>
              <CardTitle>Query Volume Over Time</CardTitle>
              <CardDescription>
                Number of searches performed daily
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data?.queryTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="queries"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="uniqueUsers"
                    stroke="#82ca9d"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Document Distribution by Type</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={data?.documentTypes || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(data?.documentTypes || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>AI Response Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data?.performanceMetrics || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="score" fill="#8884d8" />
                  <Bar dataKey="target" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function KPICard({ title, value, change, icon }: {
  title: string;
  value: string | number;
  change: number;
  icon: string;
}) {
  const isPositive = change >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{change}% from previous period
        </p>
      </CardContent>
    </Card>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
```

**Esfuerzo Total Frontend:** 58-78 horas

---

# FASE 4: BACKEND (NORMAL)
## Puntuacion: 85% -> 100% | Esfuerzo: 80-100 horas

### 4.1 Sistema de Errores Personalizado

```typescript
// src/errors/base-error.ts
export abstract class BaseError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;
  readonly timestamp: Date;
  readonly requestId?: string;

  constructor(message: string, requestId?: string) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.requestId = requestId;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId
    };
  }
}

// src/errors/http-errors.ts
export class BadRequestError extends BaseError {
  readonly statusCode = 400;
  readonly isOperational = true;
  readonly field?: string;

  constructor(message: string, field?: string, requestId?: string) {
    super(message, requestId);
    this.field = field;
  }
}

export class UnauthorizedError extends BaseError {
  readonly statusCode = 401;
  readonly isOperational = true;
}

export class ForbiddenError extends BaseError {
  readonly statusCode = 403;
  readonly isOperational = true;
}

export class NotFoundError extends BaseError {
  readonly statusCode = 404;
  readonly isOperational = true;
  readonly resource?: string;

  constructor(resource: string, id?: string, requestId?: string) {
    super(`${resource}${id ? ` with id '${id}'` : ''} not found`, requestId);
    this.resource = resource;
  }
}

export class ConflictError extends BaseError {
  readonly statusCode = 409;
  readonly isOperational = true;
}

export class ValidationError extends BaseError {
  readonly statusCode = 422;
  readonly isOperational = true;
  readonly errors: Array<{ field: string; message: string }>;

  constructor(errors: Array<{ field: string; message: string }>, requestId?: string) {
    super('Validation failed', requestId);
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors
    };
  }
}

export class TooManyRequestsError extends BaseError {
  readonly statusCode = 429;
  readonly isOperational = true;
  readonly retryAfter?: number;

  constructor(retryAfter?: number, requestId?: string) {
    super('Too many requests', requestId);
    this.retryAfter = retryAfter;
  }
}

export class InternalServerError extends BaseError {
  readonly statusCode = 500;
  readonly isOperational = false;
}

export class ServiceUnavailableError extends BaseError {
  readonly statusCode = 503;
  readonly isOperational = true;
  readonly service?: string;

  constructor(service: string, requestId?: string) {
    super(`Service '${service}' is currently unavailable`, requestId);
    this.service = service;
  }
}

export class ExternalServiceError extends BaseError {
  readonly statusCode = 502;
  readonly isOperational = true;
  readonly service: string;
  readonly originalError?: Error;

  constructor(service: string, originalError?: Error, requestId?: string) {
    super(`External service '${service}' error: ${originalError?.message || 'Unknown error'}`, requestId);
    this.service = service;
    this.originalError = originalError;
  }
}
```

### 4.2 Middleware Global de Errores

```typescript
// src/middleware/global-error-handler.ts
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { BaseError, InternalServerError } from '../errors/http-errors.js';
import { ZodError } from 'zod';

export function globalErrorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.headers['x-request-id'] as string || request.id;

  // Log error with context
  request.log.error({
    err: error,
    requestId,
    method: request.method,
    url: request.url,
    userId: (request as any).user?.id,
    body: sanitizeBody(request.body)
  });

  // Handle known error types
  if (error instanceof BaseError) {
    const response = error.toJSON();

    if (error.statusCode === 429 && 'retryAfter' in error) {
      reply.header('Retry-After', error.retryAfter);
    }

    return reply.status(error.statusCode).send(response);
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(422).send({
      error: 'ValidationError',
      message: 'Validation failed',
      statusCode: 422,
      errors: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      })),
      requestId
    });
  }

  // Handle Fastify errors
  if ('statusCode' in error) {
    return reply.status(error.statusCode || 500).send({
      error: error.name,
      message: error.message,
      statusCode: error.statusCode || 500,
      requestId
    });
  }

  // Handle unknown errors (don't leak internal details in production)
  const isProduction = process.env.NODE_ENV === 'production';
  const internalError = new InternalServerError(
    isProduction ? 'An unexpected error occurred' : error.message,
    requestId
  );

  return reply.status(500).send(internalError.toJSON());
}

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
```

### 4.3 Circuit Breaker para Servicios Externos

```typescript
// src/services/circuit-breaker.service.ts
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailure?: Date;
  private readonly config: CircuitBreakerConfig;

  constructor(
    private readonly name: string,
    config?: Partial<CircuitBreakerConfig>
  ) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000,
      resetTimeout: 60000,
      ...config
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error(`Circuit breaker '${this.name}' is OPEN`);
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        this.createTimeout()
      ]) as T;

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.successes = 0;
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = new Date();
    this.successes = 0;

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailure) return true;

    const timeSinceLastFailure = Date.now() - this.lastFailure.getTime();
    return timeSinceLastFailure >= this.config.resetTimeout;
  }

  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Circuit breaker '${this.name}' timeout`));
      }, this.config.timeout);
    });
  }

  getState(): { state: CircuitState; failures: number; lastFailure?: Date } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure
    };
  }
}

// Instancias para servicios externos
export const openAICircuitBreaker = new CircuitBreaker('openai', {
  failureThreshold: 3,
  timeout: 60000,
  resetTimeout: 120000
});

export const redisCircuitBreaker = new CircuitBreaker('redis', {
  failureThreshold: 5,
  timeout: 5000,
  resetTimeout: 30000
});
```

### 4.4 Middleware de Validacion con Zod

```typescript
// src/middleware/validation.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

export function validate(schemas: ValidationSchemas) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const errors: Array<{ field: string; message: string; location: string }> = [];

    try {
      if (schemas.body) {
        request.body = schemas.body.parse(request.body);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push(...error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          location: 'body'
        })));
      }
    }

    try {
      if (schemas.params) {
        request.params = schemas.params.parse(request.params);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push(...error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          location: 'params'
        })));
      }
    }

    try {
      if (schemas.query) {
        request.query = schemas.query.parse(request.query);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push(...error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          location: 'query'
        })));
      }
    }

    if (errors.length > 0) {
      return reply.status(422).send({
        error: 'ValidationError',
        message: 'Request validation failed',
        statusCode: 422,
        errors
      });
    }
  };
}

// Schemas comunes
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const idParamSchema = z.object({
  id: z.string().cuid()
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  filters: z.string().optional().transform(val => {
    if (!val) return undefined;
    try {
      return JSON.parse(val);
    } catch {
      return undefined;
    }
  })
});
```

**Esfuerzo Total Backend:** 80-100 horas

---

# FASE 5: BASE DE DATOS (BAJO)
## Puntuacion: 94.5% -> 100% | Esfuerzo: 9 horas

### 5.1 Migraciones Pendientes

```sql
-- prisma/migrations/2025_01_ai_nlp_tables/migration.sql

-- MLModel table
CREATE TABLE "MLModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TRAINING',
    "accuracy" DOUBLE PRECISION,
    "metrics" JSONB,
    "config" JSONB NOT NULL,
    "trainedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MLModel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MLModel_type_status_idx" ON "MLModel"("type", "status");

-- Prediction table
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "prediction" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT,
    "actualOutcome" JSONB,
    "isCorrect" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Prediction_modelId_entityType_idx" ON "Prediction"("modelId", "entityType");
CREATE INDEX "Prediction_entityId_idx" ON "Prediction"("entityId");

ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_modelId_fkey"
    FOREIGN KEY ("modelId") REFERENCES "MLModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- TrendForecast table
CREATE TABLE "TrendForecast" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "predictedValue" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "trend" TEXT NOT NULL,
    "factors" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendForecast_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TrendForecast_category_metric_idx" ON "TrendForecast"("category", "metric");

-- DocumentComparison table
CREATE TABLE "DocumentComparison" (
    "id" TEXT NOT NULL,
    "documentAId" TEXT NOT NULL,
    "documentBId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "semanticScore" DOUBLE PRECISION NOT NULL,
    "structuralScore" DOUBLE PRECISION NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentComparison_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentComparison_documentAId_idx" ON "DocumentComparison"("documentAId");
CREATE INDEX "DocumentComparison_documentBId_idx" ON "DocumentComparison"("documentBId");
CREATE UNIQUE INDEX "DocumentComparison_documentAId_documentBId_key"
    ON "DocumentComparison"("documentAId", "documentBId");

-- LegalPattern table
CREATE TABLE "LegalPattern" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pattern" JSONB NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL,
    "examples" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalPattern_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LegalPattern_category_idx" ON "LegalPattern"("category");
```

**Esfuerzo Total Base de Datos:** 9 horas

---

# CRONOGRAMA DE IMPLEMENTACION

```
SEMANA 1-3: SEGURIDAD (168 horas)
├── Semana 1: SEC-001, SEC-002 (JWT + CORS)
├── Semana 2: SEC-003, SEC-004 (HSTS + Error handling)
└── Semana 3: SEC-005 + GDPR (Encriptacion + Compliance)

SEMANAS 4-16: AI/NLP (12-16 semanas)
├── Semanas 4-7: Predictive Intelligence Engine
├── Semanas 8-10: Trend Analysis Service
├── Semanas 11-13: Document Comparison Engine
└── Semanas 14-16: Pattern Detection + Graph Visualization

SEMANAS 17-20: FRONTEND (58-78 horas)
├── Semana 17: shadcn/ui setup + componentes base
├── Semana 18: React Query hooks
├── Semana 19: Paginas faltantes (Analytics, AI Assistant)
└── Semana 20: Paginas restantes + testing

SEMANAS 21-24: BACKEND (80-100 horas)
├── Semana 21: Error handling system
├── Semana 22: Validation middleware + Circuit breaker
├── Semana 23: API versioning + Route optimization
└── Semana 24: Testing + Documentation

SEMANA 25: BASE DE DATOS (9 horas)
└── Migraciones AI/NLP + Optimizacion indices
```

---

# METRICAS DE EXITO

| Area | Metrica | Valor Actual | Objetivo |
|------|---------|--------------|----------|
| Seguridad | Vulnerabilidades criticas | 2 | 0 |
| Seguridad | OWASP Top 10 compliance | 72% | 100% |
| AI/NLP | Precision predicciones | N/A | >85% |
| AI/NLP | Cobertura tendencias | 0% | 100% |
| Frontend | Componentes shadcn | 5 | 35+ |
| Frontend | Paginas funcionales | 70% | 100% |
| Backend | Test coverage | 45% | 80% |
| Backend | Error handling | 60% | 100% |
| Base de Datos | Schema completitud | 94.5% | 100% |

---

# RECURSOS REQUERIDOS

## Equipo Sugerido
- 1 Security Engineer (Semanas 1-3)
- 2 Full-stack Developers (Semanas 4-24)
- 1 ML Engineer (Semanas 4-16)
- 1 QA Engineer (Semanas 17-25)

## Variables de Entorno Nuevas
```env
# Seguridad
JWT_SECRET=<min 64 caracteres hex>
FIELD_ENCRYPTION_KEY=<32 caracteres>

# AI/NLP
OPENAI_API_KEY=sk-...
ML_MODEL_PATH=/models

# Observabilidad
SENTRY_DSN=https://...
```

---

# RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Breaking changes en API | Media | Alto | Versionado + deprecation policy |
| Performance AI/NLP | Alta | Medio | Caching + rate limiting |
| Migraciones DB fallidas | Baja | Alto | Backups + rollback scripts |
| Integracion frontend | Media | Medio | Feature flags + testing |

---

## Generado Automaticamente
**Fecha:** 2025-12-11
**Version:** 1.0.0
**Sistema:** Legal RAG System
**Analisis por:** Claude Opus 4.5 Multi-Agent System
