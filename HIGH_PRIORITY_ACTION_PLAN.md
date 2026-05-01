# High Priority Action Plan - Legal RAG System

**Fecha:** 2024-12-12
**Prioridad:** INMEDIATA
**Tiempo Estimado Total:** 4-6 horas de desarrollo

---

## Resumen Ejecutivo

Este plan detalla las 4 acciones de alta prioridad identificadas en el análisis de cumplimiento del sistema Legal RAG. Estas acciones deben completarse **antes del deployment a producción**.

| # | Acción | Complejidad | Tiempo Est. | Impacto |
|---|--------|-------------|-------------|---------|
| 1 | Instalar dependencias Radix UI | Baja | 5 min | Frontend funcional |
| 2 | Implementar PrismaClient Singleton | Media | 1-2 horas | Estabilidad DB |
| 3 | Corregir 167 errores TypeScript | Alta | 2-3 horas | Build exitoso |
| 4 | Error handling en SSE endpoint | Media | 30-45 min | Robustez API |

---

## 1. Instalar Dependencias Radix UI

### 1.1 Descripción del Problema

Las siguientes dependencias de Radix UI fueron añadidas a `package.json` pero no se han instalado:
- `@radix-ui/react-avatar`
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-switch`
- `@radix-ui/react-tabs`
- `@radix-ui/react-tooltip`

### 1.2 Pasos de Ejecución

```bash
# Paso 1: Navegar al directorio frontend
cd frontend

# Paso 2: Limpiar node_modules y cache (opcional pero recomendado)
rm -rf node_modules
rm -rf .next
npm cache clean --force

# Paso 3: Instalar todas las dependencias
npm install

# Paso 4: Verificar instalación
npm ls @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-tooltip

# Paso 5: Ejecutar build de verificación
npm run build
```

### 1.3 Verificación

```bash
# Verificar que los componentes UI se importan correctamente
npm run dev
# Abrir http://localhost:3000 y verificar que no hay errores en consola
```

### 1.4 Criterios de Aceptación

- [ ] `npm install` completa sin errores
- [ ] `npm run build` completa exitosamente
- [ ] Los componentes Dialog, Tabs, Tooltip funcionan en la UI
- [ ] No hay errores de módulos faltantes en la consola del navegador

---

## 2. Implementar PrismaClient Singleton

### 2.1 Descripción del Problema

Se identificaron **56 instancias separadas de PrismaClient** en el código. Esto causa:
- Agotamiento del pool de conexiones a la base de datos
- Memory leaks en desarrollo con hot-reload
- Errores de "Too many connections" en producción

### 2.2 Arquitectura Propuesta

```
src/
├── lib/
│   └── prisma.ts          # Singleton de PrismaClient (CREAR)
├── services/
│   ├── ai/
│   │   ├── legal-assistant.ts      # Actualizar: usar singleton
│   │   └── document-summarization.service.ts  # Actualizar
│   ├── legal-document-service.ts   # Actualizar
│   └── ...                         # Actualizar todos los servicios
```

### 2.3 Implementación

#### Paso 1: Crear el módulo Singleton

**Archivo:** `src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

// Declaración global para evitar múltiples instancias en desarrollo
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Configuración del cliente con logging en desarrollo
const prismaClientOptions = {
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn'] as const
    : ['error'] as const,
};

// Singleton pattern con soporte para hot-reload
export const prisma = globalThis.prisma ?? new PrismaClient(prismaClientOptions);

// En desarrollo, guardar en global para evitar múltiples instancias
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Función helper para obtener el cliente
export function getPrismaClient(): PrismaClient {
  return prisma;
}

// Función para cerrar conexiones (útil para testing y graceful shutdown)
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

// Hook de shutdown para cleanup
process.on('beforeExit', async () => {
  await disconnectPrisma();
});

export default prisma;
```

#### Paso 2: Crear script de migración automática

**Archivo:** `scripts/migrate-prisma-singleton.ts`

```typescript
/**
 * Script para identificar y documentar archivos que necesitan actualización
 * Ejecutar: npx ts-node scripts/migrate-prisma-singleton.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const SRC_DIR = path.join(__dirname, '..', 'src');

async function findPrismaInstantiations(): Promise<void> {
  const files = await glob('**/*.ts', { cwd: SRC_DIR });

  const patterns = [
    /new\s+PrismaClient\s*\(/g,
    /private\s+prisma\s*:\s*PrismaClient/g,
    /this\.prisma\s*=\s*new\s+PrismaClient/g
  ];

  const filesToUpdate: string[] = [];

  for (const file of files) {
    const filePath = path.join(SRC_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    for (const pattern of patterns) {
      if (pattern.test(content)) {
        filesToUpdate.push(file);
        break;
      }
    }
  }

  console.log('\n=== Archivos que requieren actualización ===\n');
  filesToUpdate.forEach((f, i) => console.log(`${i + 1}. src/${f}`));
  console.log(`\nTotal: ${filesToUpdate.length} archivos\n`);

  // Generar reporte
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: filesToUpdate.length,
    files: filesToUpdate.map(f => `src/${f}`)
  };

  fs.writeFileSync(
    'prisma-migration-report.json',
    JSON.stringify(report, null, 2)
  );

  console.log('Reporte guardado en: prisma-migration-report.json');
}

findPrismaInstantiations().catch(console.error);
```

#### Paso 3: Actualizar servicios existentes

**Ejemplo de migración para `legal-assistant.ts`:**

```typescript
// ANTES (líneas 49-62 de legal-assistant.ts)
export class LegalAssistant {
  private openai: OpenAI;
  private prisma: PrismaClient;  // ❌ Instancia propia

  constructor() {
    this.prisma = new PrismaClient();  // ❌ Nueva instancia
  }
}

// DESPUÉS
import { prisma } from '../lib/prisma';  // ✅ Singleton

export class LegalAssistant {
  private openai: OpenAI;

  constructor() {
    // ✅ No crear nueva instancia, usar singleton importado
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // En los métodos, usar 'prisma' directamente
  async initConversation(userId: string, title?: string): Promise<string> {
    const conversation = await prisma.aIConversation.create({
      data: { /* ... */ }
    });
    return conversation.id;
  }
}
```

### 2.4 Lista de Archivos a Actualizar

Basado en el análisis, estos son los archivos prioritarios:

| Archivo | Líneas Afectadas | Prioridad |
|---------|------------------|-----------|
| `src/services/ai/legal-assistant.ts` | 62 | ALTA |
| `src/services/ai/document-summarization.service.ts` | ~30 | ALTA |
| `src/services/ai/predictive-intelligence.service.ts` | ~25 | MEDIA |
| `src/services/ai/trend-analysis.service.ts` | ~25 | MEDIA |
| `src/services/ai/pattern-detection.service.ts` | ~25 | MEDIA |
| `src/services/legal-document-service.ts` | ~50 | ALTA |
| `src/services/documentRegistry.ts` | ~40 | MEDIA |
| `src/services/documentAnalyzer.ts` | ~35 | MEDIA |
| `src/services/queryRouter.ts` | ~30 | MEDIA |
| `src/routes/*.ts` | Varios | BAJA |

### 2.5 Verificación

```bash
# 1. Buscar instancias restantes de new PrismaClient
grep -r "new PrismaClient" src/ --include="*.ts"
# Debe retornar solo el archivo src/lib/prisma.ts

# 2. Ejecutar tests
npm run test

# 3. Verificar conexiones en desarrollo
npm run dev
# Monitorear logs para verificar una sola conexión
```

### 2.6 Criterios de Aceptación

- [ ] Archivo `src/lib/prisma.ts` creado con singleton
- [ ] Todos los servicios usan el singleton importado
- [ ] `grep -r "new PrismaClient" src/` solo muestra `src/lib/prisma.ts`
- [ ] No hay errores de "Too many connections" en logs
- [ ] Tests unitarios pasan

---

## 3. Corregir 167 Errores TypeScript

### 3.1 Categorización de Errores

| Categoría | Cantidad | Archivos Afectados | Estrategia |
|-----------|----------|-------------------|------------|
| Logger Method Signatures | 33 | 12 | Actualizar interfaz logger |
| Prisma Schema Mismatches | 48 | 15 | Regenerar tipos Prisma |
| FastifySchema Types | 16 | 8 | Actualizar definiciones |
| Import/Export Errors | 66 | 20 | Corregir paths y exports |
| Duplicate Implementations | 2 | 2 | Eliminar duplicados |
| OpenAI Service Types | 2 | 1 | Actualizar tipos OpenAI |

### 3.2 Plan de Corrección por Fases

#### Fase A: Regenerar Tipos Prisma (10 min)

```bash
# Regenerar cliente Prisma con tipos actualizados
npx prisma generate

# Verificar que se generaron correctamente
ls node_modules/.prisma/client/
```

#### Fase B: Corregir Logger Interface (30 min)

**Problema:** Las llamadas a logger usan firmas inconsistentes.

**Archivo a crear:** `src/utils/logger.ts`

```typescript
import pino from 'pino';

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
}

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

export const logger: Logger = {
  info: (message: string, context?: LogContext) => {
    pinoLogger.info(context || {}, message);
  },
  warn: (message: string, context?: LogContext) => {
    pinoLogger.warn(context || {}, message);
  },
  error: (message: string, context?: LogContext) => {
    pinoLogger.error(context || {}, message);
  },
  debug: (message: string, context?: LogContext) => {
    pinoLogger.debug(context || {}, message);
  }
};

export default logger;
```

#### Fase C: Corregir FastifySchema Types (20 min)

**Archivo:** `src/types/fastify-schemas.ts`

```typescript
import { FastifySchema } from 'fastify';

// Schema base reutilizable
export const baseResponseSchema = {
  200: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: { type: 'object' }
    }
  },
  400: {
    type: 'object',
    properties: {
      error: { type: 'string' },
      message: { type: 'string' }
    }
  },
  401: {
    type: 'object',
    properties: {
      error: { type: 'string' }
    }
  },
  500: {
    type: 'object',
    properties: {
      error: { type: 'string' }
    }
  }
} as const;

// Tipo helper para schemas
export type RouteSchema = FastifySchema & {
  body?: Record<string, unknown>;
  querystring?: Record<string, unknown>;
  params?: Record<string, unknown>;
  response?: typeof baseResponseSchema;
};
```

#### Fase D: Corregir Import/Export Errors (45 min)

**Script de diagnóstico:** `scripts/check-imports.ts`

```typescript
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

// Verificar imports rotos
const configPath = path.join(__dirname, '..', 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(
  config.config,
  ts.sys,
  path.dirname(configPath)
);

const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = ts.getPreEmitDiagnostics(program);

const importErrors = diagnostics.filter(d =>
  d.code === 2307 || // Cannot find module
  d.code === 2305 || // Module has no exported member
  d.code === 2339    // Property does not exist
);

console.log(`\nImport/Export errors: ${importErrors.length}\n`);

importErrors.forEach(d => {
  const file = d.file?.fileName || 'unknown';
  const line = d.file ? ts.getLineAndCharacterOfPosition(d.file, d.start!).line + 1 : 0;
  const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
  console.log(`${file}:${line} - ${message}`);
});
```

#### Fase E: Ejecución de Correcciones

```bash
# 1. Ejecutar diagnóstico inicial
npx tsc --noEmit 2>&1 | head -50

# 2. Corregir errores por archivo (orden sugerido)
# Prioridad 1: Archivos core
- src/lib/prisma.ts
- src/utils/logger.ts
- src/types/*.ts

# Prioridad 2: Servicios AI
- src/services/ai/*.ts

# Prioridad 3: Rutas
- src/routes/*.ts

# 3. Verificar progreso
npx tsc --noEmit 2>&1 | grep -c "error TS"

# 4. Build final
npm run build
```

### 3.3 Archivos con Mayor Cantidad de Errores

| Archivo | Errores | Tipo Principal |
|---------|---------|----------------|
| `src/services/ai/async-openai-service.ts` | 12 | Types |
| `src/services/cache/multi-tier-cache-service.ts` | 10 | Logger |
| `src/routes/legal-documents-v2.ts` | 9 | Schema |
| `src/services/search/advanced-search-engine.ts` | 8 | Prisma |
| `src/services/nlp/optimized-query-service.ts` | 7 | Logger |

### 3.4 Criterios de Aceptación

- [ ] `npx tsc --noEmit` completa sin errores
- [ ] `npm run build` exitoso
- [ ] Todos los tests pasan
- [ ] No hay errores de tipo en IDE

---

## 4. Error Handling Comprehensivo en SSE Endpoint

### 4.1 Descripción del Problema

El endpoint SSE actual (`GET /api/ai/stream`) tiene manejo de errores básico. Necesita:
- Validación de entrada robusta
- Timeout handling
- Heartbeat para mantener conexión
- Logging estructurado
- Cleanup de recursos

### 4.2 Implementación Mejorada

**Archivo:** `src/routes/ai-assistant.ts` (actualizar endpoint existente)

```typescript
// Reemplazar el endpoint SSE existente (líneas 131-195) con:

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { legalAssistant, StreamChunk } from '../services/ai/legal-assistant';
import { queryProcessor } from '../services/nlp/query-processor';
import { analyticsService } from '../services/analytics/analytics-service';
import { logger } from '../utils/logger';

interface StreamQueryParams {
  conversationId: string;
  query: string;
}

// Constantes de configuración
const SSE_CONFIG = {
  HEARTBEAT_INTERVAL_MS: 15000,  // 15 segundos
  REQUEST_TIMEOUT_MS: 120000,    // 2 minutos
  MAX_QUERY_LENGTH: 5000,        // Caracteres máximos
};

/**
 * SSE Streaming endpoint con error handling comprehensivo
 */
fastify.get<{ Querystring: StreamQueryParams }>(
  '/api/ai/stream',
  {
    schema: {
      querystring: {
        type: 'object',
        required: ['conversationId', 'query'],
        properties: {
          conversationId: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            pattern: '^[a-zA-Z0-9-_]+$'
          },
          query: {
            type: 'string',
            minLength: 1,
            maxLength: SSE_CONFIG.MAX_QUERY_LENGTH
          }
        }
      },
      response: {
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' }
          }
        }
      }
    }
  },
  async (request: FastifyRequest<{ Querystring: StreamQueryParams }>, reply: FastifyReply) => {
    const { conversationId, query } = request.query;
    const userId = (request.user as any)?.id;
    const requestId = request.id;

    // ===== VALIDACIÓN DE AUTENTICACIÓN =====
    if (!userId) {
      logger.warn('SSE request without authentication', { requestId });
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // ===== VALIDACIÓN DE ENTRADA =====
    if (!conversationId || !query) {
      logger.warn('SSE request with missing parameters', {
        requestId,
        hasConversationId: !!conversationId,
        hasQuery: !!query
      });
      return reply.code(400).send({
        error: 'Bad Request',
        details: 'conversationId and query are required'
      });
    }

    // ===== SANITIZACIÓN =====
    const sanitizedQuery = query.trim().slice(0, SSE_CONFIG.MAX_QUERY_LENGTH);

    logger.info('SSE stream initiated', {
      requestId,
      userId,
      conversationId,
      queryLength: sanitizedQuery.length
    });

    // ===== CONFIGURAR SSE HEADERS =====
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');  // Nginx buffering off
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    // ===== ESTADO DE LA CONEXIÓN =====
    let isConnectionClosed = false;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let timeoutTimer: NodeJS.Timeout | null = null;

    // ===== HELPER: Enviar evento SSE =====
    const sendEvent = (event: string, data: unknown): boolean => {
      if (isConnectionClosed) return false;

      try {
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        return true;
      } catch (error) {
        logger.error('Failed to write SSE event', {
          requestId,
          event,
          error: (error as Error).message
        });
        return false;
      }
    };

    // ===== CLEANUP FUNCTION =====
    const cleanup = (reason: string) => {
      if (isConnectionClosed) return;
      isConnectionClosed = true;

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }

      logger.info('SSE connection closed', { requestId, reason });
    };

    // ===== DETECTAR DESCONEXIÓN DEL CLIENTE =====
    request.raw.on('close', () => cleanup('client_disconnect'));
    request.raw.on('error', (err) => {
      logger.error('SSE request error', { requestId, error: err.message });
      cleanup('request_error');
    });

    // ===== HEARTBEAT PARA MANTENER CONEXIÓN =====
    heartbeatInterval = setInterval(() => {
      if (!isConnectionClosed) {
        sendEvent('heartbeat', { timestamp: Date.now() });
      }
    }, SSE_CONFIG.HEARTBEAT_INTERVAL_MS);

    // ===== TIMEOUT GLOBAL =====
    timeoutTimer = setTimeout(() => {
      if (!isConnectionClosed) {
        sendEvent('error', {
          type: 'timeout',
          message: 'Request timeout exceeded',
          code: 'STREAM_TIMEOUT'
        });
        cleanup('timeout');
        reply.raw.end();
      }
    }, SSE_CONFIG.REQUEST_TIMEOUT_MS);

    try {
      // ===== PROCESAR QUERY CON NLP =====
      let processedQuery;
      try {
        processedQuery = await queryProcessor.processQuery(sanitizedQuery);
        sendEvent('processing', {
          status: 'nlp_complete',
          intent: processedQuery.intent.type
        });
      } catch (nlpError) {
        logger.error('NLP processing failed', {
          requestId,
          error: (nlpError as Error).message
        });
        // Continuar sin NLP si falla
        processedQuery = { intent: { type: 'unknown' } };
      }

      // ===== STREAM DE RESPUESTA AI =====
      const startTime = Date.now();
      let chunkCount = 0;
      let totalContentLength = 0;

      for await (const chunk of legalAssistant.processQueryStreaming(
        conversationId,
        sanitizedQuery,
        []
      )) {
        if (isConnectionClosed) {
          logger.info('Stream aborted - connection closed', { requestId });
          break;
        }

        chunkCount++;

        // Mapear tipo de chunk a evento SSE
        switch (chunk.type) {
          case 'content':
            totalContentLength += chunk.content?.length || 0;
            sendEvent('content', {
              text: chunk.content,
              chunkIndex: chunkCount
            });
            break;

          case 'citation':
            sendEvent('citations', {
              documents: chunk.citations
            });
            break;

          case 'metadata':
            sendEvent('metadata', chunk.metadata);
            break;

          case 'done':
            sendEvent('complete', {
              totalChunks: chunkCount,
              contentLength: totalContentLength,
              processingTimeMs: Date.now() - startTime
            });
            break;

          case 'error':
            sendEvent('error', {
              type: 'stream_error',
              message: chunk.error,
              code: 'AI_PROCESSING_ERROR'
            });
            break;
        }
      }

      // ===== ANALYTICS =====
      try {
        await analyticsService.trackEvent({
          eventType: 'ai_streaming_completed',
          userId,
          sessionId: requestId,
          durationMs: Date.now() - startTime,
          metadata: {
            conversationId,
            intent: processedQuery.intent.type,
            chunkCount,
            contentLength: totalContentLength
          }
        });
      } catch (analyticsError) {
        logger.warn('Failed to track analytics', {
          requestId,
          error: (analyticsError as Error).message
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('SSE stream error', {
        requestId,
        conversationId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      // ===== ENVIAR ERROR AL CLIENTE =====
      if (!isConnectionClosed) {
        sendEvent('error', {
          type: 'server_error',
          message: 'An error occurred while processing your request',
          code: 'INTERNAL_ERROR',
          // No exponer detalles internos en producción
          ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
        });
      }

      // ===== TRACK ERROR =====
      try {
        await analyticsService.trackEvent({
          eventType: 'ai_streaming_error',
          userId,
          sessionId: requestId,
          success: false,
          metadata: {
            conversationId,
            error: errorMessage
          }
        });
      } catch (trackError) {
        // Ignorar errores de tracking
      }

    } finally {
      cleanup('stream_complete');

      if (!reply.raw.writableEnded) {
        reply.raw.end();
      }
    }
  }
);
```

### 4.3 Nuevas Funcionalidades Añadidas

| Funcionalidad | Descripción |
|---------------|-------------|
| **Input Validation** | Validación de longitud, formato y sanitización |
| **Heartbeat** | Ping cada 15s para mantener conexión viva |
| **Timeout** | Cierre automático después de 2 minutos |
| **Cleanup** | Limpieza de recursos en todas las rutas de salida |
| **Structured Logging** | Logs con contexto para debugging |
| **Event Types** | Eventos diferenciados (content, citations, error, etc.) |
| **Error Codes** | Códigos de error para manejo en cliente |
| **Analytics** | Tracking de éxito/error con métricas |

### 4.4 Eventos SSE Disponibles

```typescript
// Eventos que el cliente puede recibir:

interface SSEEvents {
  // Progreso del procesamiento
  processing: { status: string; intent?: string };

  // Contenido de respuesta (múltiples eventos)
  content: { text: string; chunkIndex: number };

  // Citaciones de documentos
  citations: { documents: Citation[] };

  // Metadata final
  metadata: { confidence: number; processingTimeMs: number; messageId: string };

  // Stream completado
  complete: { totalChunks: number; contentLength: number; processingTimeMs: number };

  // Heartbeat (mantener conexión)
  heartbeat: { timestamp: number };

  // Error
  error: { type: string; message: string; code: string; details?: string };
}
```

### 4.5 Ejemplo de Consumo en Cliente

```typescript
// Frontend: hooks/useAIStream.ts

export function useAIStream() {
  const [status, setStatus] = useState<'idle' | 'streaming' | 'complete' | 'error'>('idle');
  const [content, setContent] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startStream = async (conversationId: string, query: string) => {
    setStatus('streaming');
    setContent('');
    setError(null);

    const eventSource = new EventSource(
      `/api/ai/stream?conversationId=${encodeURIComponent(conversationId)}&query=${encodeURIComponent(query)}`
    );

    eventSource.addEventListener('content', (e) => {
      const data = JSON.parse(e.data);
      setContent(prev => prev + data.text);
    });

    eventSource.addEventListener('citations', (e) => {
      const data = JSON.parse(e.data);
      setCitations(data.documents);
    });

    eventSource.addEventListener('complete', () => {
      setStatus('complete');
      eventSource.close();
    });

    eventSource.addEventListener('error', (e) => {
      if (e.data) {
        const data = JSON.parse(e.data);
        setError(data.message);
      }
      setStatus('error');
      eventSource.close();
    });

    eventSource.onerror = () => {
      setStatus('error');
      setError('Connection lost');
      eventSource.close();
    };

    return () => eventSource.close();
  };

  return { status, content, citations, error, startStream };
}
```

### 4.6 Criterios de Aceptación

- [ ] Validación de entrada funciona correctamente
- [ ] Heartbeat mantiene conexión activa
- [ ] Timeout cierra conexiones inactivas
- [ ] Errores se reportan al cliente con códigos
- [ ] Analytics registra todos los eventos
- [ ] Logs estructurados para debugging
- [ ] Cliente puede consumir el stream sin errores

---

## Checklist Final de Implementación

### Pre-deployment Checklist

```markdown
## Acciones Inmediatas

### 1. Dependencias Frontend
- [ ] Ejecutar `cd frontend && npm install`
- [ ] Verificar `npm run build` exitoso
- [ ] Probar componentes UI en navegador

### 2. PrismaClient Singleton
- [ ] Crear `src/lib/prisma.ts`
- [ ] Actualizar todos los servicios (56 archivos)
- [ ] Verificar una sola conexión en logs
- [ ] Tests de integración pasan

### 3. Errores TypeScript
- [ ] Ejecutar `npx prisma generate`
- [ ] Crear/actualizar `src/utils/logger.ts`
- [ ] Corregir schemas de Fastify
- [ ] `npx tsc --noEmit` sin errores
- [ ] `npm run build` exitoso

### 4. SSE Error Handling
- [ ] Actualizar endpoint con código mejorado
- [ ] Probar heartbeat funcionando
- [ ] Probar timeout (esperar 2+ min)
- [ ] Probar desconexión de cliente
- [ ] Verificar logs estructurados

## Verificación Final
- [ ] Todos los tests pasan
- [ ] Build de producción exitoso
- [ ] No hay errores en logs de desarrollo
- [ ] API funciona correctamente
```

---

## Recursos Adicionales

- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [Fastify Validation](https://www.fastify.io/docs/latest/Reference/Validation-and-Serialization/)

---

**Documento generado:** 2024-12-12
**Versión:** 1.0
**Autor:** Legal RAG Compliance Analysis System
