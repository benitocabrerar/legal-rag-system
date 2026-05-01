# Plan de Mejoras a Corto Plazo (5.2)
## Legal RAG System - Short-term Improvements Implementation Plan

**Fecha:** 2024-12-12
**Versión:** 1.0
**Prioridad:** Medium
**Estimación Total:** 5 tareas principales

---

## Resumen Ejecutivo

Este documento detalla el plan de implementación para las 5 mejoras a corto plazo identificadas durante el análisis de cumplimiento del sistema Legal RAG. Cada tarea incluye objetivos, pasos de implementación, archivos afectados, y criterios de aceptación.

---

## Tarea 1: Replace In-Memory Rate Limiter with Redis

### 1.1 Objetivo
Reemplazar el rate limiter basado en memoria por una implementación con Redis para soportar escalado horizontal y persistencia de estado entre instancias.

### 1.2 Estado Actual
```typescript
// src/server.ts - Configuración actual
await app.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
});
```
El rate limiter actual usa almacenamiento en memoria, lo que significa:
- Los contadores se pierden al reiniciar el servidor
- No se comparten entre múltiples instancias
- No es apto para despliegues en cluster/kubernetes

### 1.3 Archivos a Modificar
| Archivo | Acción |
|---------|--------|
| `src/server.ts` | Modificar configuración de rate limit |
| `src/config/redis.config.ts` | Crear configuración Redis |
| `src/middleware/rate-limiter.ts` | Actualizar middleware existente |
| `package.json` | Agregar dependencia `@fastify/rate-limit` con store Redis |

### 1.4 Pasos de Implementación

#### Paso 1.4.1: Instalar dependencias
```bash
npm install @fastify/redis ioredis
```

#### Paso 1.4.2: Crear configuración Redis
```typescript
// src/config/redis.config.ts
import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
};

export const createRedisClient = () => new Redis(redisConfig);

export const redisClient = createRedisClient();

export default redisConfig;
```

#### Paso 1.4.3: Actualizar rate limiter en server.ts
```typescript
// src/server.ts
import { redisClient } from './config/redis.config.js';

// Rate limiting con Redis store
await app.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
  redis: redisClient,
  nameSpace: 'legal-rag-rate-limit:',
  skipOnError: true, // Continuar si Redis falla
  keyGenerator: (request) => {
    return request.user?.id || request.ip;
  },
});
```

#### Paso 1.4.4: Agregar variables de entorno
```env
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
```

### 1.5 Criterios de Aceptación
- [ ] Rate limiter persiste contadores entre reinicios del servidor
- [ ] Múltiples instancias comparten el mismo estado de rate limiting
- [ ] El sistema continúa funcionando si Redis no está disponible (graceful degradation)
- [ ] Tests de integración pasan con Redis

### 1.6 Rollback Plan
Si hay problemas, revertir a la configuración en memoria eliminando la opción `redis` del rate limiter.

---

## Tarea 2: Standardize Singleton Patterns Across Services

### 2.1 Objetivo
Estandarizar el patrón singleton en todos los servicios para evitar múltiples instancias y garantizar consistencia en el manejo de recursos.

### 2.2 Estado Actual - Problema Identificado
Se detectaron **56 instancias de PrismaClient** en el código base. Aunque se implementó el singleton en `src/lib/prisma.ts`, muchos servicios aún crean sus propias instancias.

### 2.3 Archivos a Modificar
| Archivo | Instancias Actuales | Acción |
|---------|---------------------|--------|
| `src/services/ai/legal-assistant.ts` | 1 | Usar singleton |
| `src/services/ai/async-openai-service.ts` | 1 | Usar singleton |
| `src/services/cache/multi-tier-cache-service.ts` | 1 | Usar singleton |
| `src/services/documentAnalyzer.ts` | 1 | Usar singleton |
| `src/services/documentRegistry.ts` | 1 | Usar singleton |
| `src/services/legal-document-service.ts` | 1 | Usar singleton |
| `src/services/notificationService.ts` | 1 | Usar singleton |
| `src/services/queryRouter.ts` | 1 | Usar singleton |
| `src/services/search/*.ts` | ~10 | Usar singleton |
| `src/routes/*.ts` | ~35 | Usar singleton |

### 2.4 Patrón Estándar a Implementar

#### Paso 2.4.1: Patrón base para servicios
```typescript
// Patrón singleton estándar para servicios
// src/services/base/singleton.ts
export abstract class SingletonService {
  private static instances: Map<string, any> = new Map();

  protected static getInstance<T extends SingletonService>(
    this: new () => T,
    key?: string
  ): T {
    const instanceKey = key || this.name;
    if (!SingletonService.instances.has(instanceKey)) {
      SingletonService.instances.set(instanceKey, new this());
    }
    return SingletonService.instances.get(instanceKey) as T;
  }
}
```

#### Paso 2.4.2: Ejemplo de migración de servicio
```typescript
// ANTES (incorrecto)
// src/services/documentAnalyzer.ts
import { PrismaClient } from '@prisma/client';

export class DocumentAnalyzer {
  private prisma = new PrismaClient(); // ❌ Nueva instancia

  async analyze(docId: string) {
    return this.prisma.document.findUnique({ where: { id: docId } });
  }
}

// DESPUÉS (correcto)
// src/services/documentAnalyzer.ts
import { prisma } from '../lib/prisma.js'; // ✅ Singleton

export class DocumentAnalyzer {
  private static instance: DocumentAnalyzer;

  private constructor() {} // Constructor privado

  public static getInstance(): DocumentAnalyzer {
    if (!DocumentAnalyzer.instance) {
      DocumentAnalyzer.instance = new DocumentAnalyzer();
    }
    return DocumentAnalyzer.instance;
  }

  async analyze(docId: string) {
    return prisma.document.findUnique({ where: { id: docId } }); // ✅ Usa singleton
  }
}

// Exportar instancia única
export const documentAnalyzer = DocumentAnalyzer.getInstance();
```

### 2.5 Script de Búsqueda de Instancias
```bash
# Encontrar todas las instancias de new PrismaClient()
grep -rn "new PrismaClient" src/ --include="*.ts"

# Encontrar imports incorrectos
grep -rn "from '@prisma/client'" src/ --include="*.ts" | grep -v "import type"
```

### 2.6 Orden de Migración (por dependencias)
1. **Fase 1:** Servicios base sin dependencias
   - `documentAnalyzer.ts`
   - `documentRegistry.ts`
   - `notificationService.ts`

2. **Fase 2:** Servicios con dependencias simples
   - `legal-document-service.ts`
   - `queryRouter.ts`

3. **Fase 3:** Servicios de búsqueda
   - `search/advanced-search-engine.ts`
   - `search/autocomplete-service.ts`
   - `search/reranking-service.ts`

4. **Fase 4:** Servicios AI/Cache
   - `ai/legal-assistant.ts`
   - `cache/multi-tier-cache-service.ts`

5. **Fase 5:** Rutas (usar servicios singleton)
   - Todas las rutas en `src/routes/`

### 2.7 Criterios de Aceptación
- [ ] Cero instancias de `new PrismaClient()` fuera de `src/lib/prisma.ts`
- [ ] Todos los servicios exportan instancia singleton
- [ ] Tests unitarios pasan con servicios singleton
- [ ] No hay memory leaks por conexiones de base de datos

---

## Tarea 3: Add Unit Tests for All New UI Components

### 3.1 Objetivo
Implementar tests unitarios completos para los componentes UI de shadcn/ui y el sistema de temas.

### 3.2 Componentes a Testear
| Componente | Archivo | Prioridad |
|------------|---------|-----------|
| Button | `components/ui/button.tsx` | Alta |
| Card | `components/ui/card.tsx` | Alta |
| Input | `components/ui/input.tsx` | Alta |
| Select | `components/ui/select.tsx` | Alta |
| Dialog | `components/ui/dialog.tsx` | Media |
| DropdownMenu | `components/ui/dropdown-menu.tsx` | Media |
| Tabs | `components/ui/tabs.tsx` | Media |
| Toast/Toaster | `components/ui/toast.tsx` | Media |
| ThemeProvider | `components/theme/ThemeProvider.tsx` | Alta |
| ThemeToggle | `components/theme/ThemeToggle.tsx` | Alta |

### 3.3 Configuración de Testing

#### Paso 3.3.1: Instalar dependencias de testing
```bash
cd frontend
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest jsdom @vitejs/plugin-react
```

#### Paso 3.3.2: Configurar Vitest
```typescript
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### Paso 3.3.3: Setup file
```typescript
// frontend/src/test/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock matchMedia para theme tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### 3.4 Ejemplos de Tests

#### Test: Button Component
```typescript
// frontend/src/components/ui/__tests__/button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../button';

describe('Button Component', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('applies variant classes correctly', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders as child component with asChild', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    expect(screen.getByRole('link')).toBeInTheDocument();
  });
});
```

#### Test: ThemeProvider
```typescript
// frontend/src/components/theme/__tests__/ThemeProvider.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, useTheme } from '../ThemeProvider';

const TestComponent = () => {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
    </div>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('provides default theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
  });

  it('allows theme to be changed', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('Set Dark'));

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });
  });

  it('persists theme to localStorage', async () => {
    render(
      <ThemeProvider storageKey="test-theme">
        <TestComponent />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('Set Dark'));

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('test-theme', 'dark');
    });
  });
});
```

#### Test: ThemeToggle
```typescript
// frontend/src/components/theme/__tests__/ThemeToggle.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeToggle } from '../ThemeToggle';
import { ThemeProvider } from '../ThemeProvider';

describe('ThemeToggle', () => {
  it('renders toggle button', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows sun icon in light mode', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );
    // Verificar que el icono de sol está visible
    expect(screen.getByRole('button').querySelector('.lucide-sun')).toBeInTheDocument();
  });

  it('toggles theme on click', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Verificar que cambió a dark
    expect(document.documentElement).toHaveClass('dark');
  });
});
```

### 3.5 Scripts de NPM
```json
// frontend/package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch"
  }
}
```

### 3.6 Criterios de Aceptación
- [ ] Cobertura de tests > 80% para componentes UI
- [ ] Todos los componentes tienen al menos 3 test cases
- [ ] ThemeProvider tiene tests de persistencia
- [ ] Tests pasan en CI/CD pipeline
- [ ] No hay tests flaky (intermitentes)

---

## Tarea 4: Implement Client-side SSE Consumption in AI Assistant UI

### 4.1 Objetivo
Implementar el consumidor de Server-Sent Events (SSE) en el frontend para mostrar respuestas de IA en tiempo real con efecto de "typing".

### 4.2 Archivos a Crear/Modificar
| Archivo | Acción |
|---------|--------|
| `frontend/src/hooks/useSSEStream.ts` | Crear hook de SSE |
| `frontend/src/lib/api-client.ts` | Agregar método SSE |
| `frontend/src/app/ai-assistant/page.tsx` | Integrar streaming |
| `frontend/src/components/ai/StreamingMessage.tsx` | Crear componente |

### 4.3 Implementación

#### Paso 4.3.1: Hook de SSE
```typescript
// frontend/src/hooks/useSSEStream.ts
import { useState, useCallback, useRef, useEffect } from 'react';

interface StreamChunk {
  type: 'content' | 'citation' | 'metadata' | 'done' | 'error';
  content?: string;
  citation?: {
    documentId: string;
    title: string;
    relevance: number;
    articleRef?: string;
  };
  metadata?: {
    confidence: number;
    processingTimeMs: number;
    messageId: string;
  };
  error?: string;
}

interface UseSSEStreamOptions {
  onContent?: (content: string) => void;
  onCitation?: (citation: StreamChunk['citation']) => void;
  onMetadata?: (metadata: StreamChunk['metadata']) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

export function useSSEStream(options: UseSSEStreamOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [citations, setCitations] = useState<StreamChunk['citation'][]>([]);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const startStream = useCallback(async (conversationId: string, query: string) => {
    // Limpiar estado previo
    setContent('');
    setCitations([]);
    setError(null);
    setIsStreaming(true);

    // Cerrar conexión previa si existe
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('token');

    // Construir URL con parámetros
    const url = new URL(`${baseUrl}/api/v1/ai/stream`);
    url.searchParams.set('conversationId', conversationId);
    url.searchParams.set('query', query);

    // Nota: EventSource no soporta headers directamente
    // Usar token en query param o cookie
    url.searchParams.set('token', token || '');

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const chunk: StreamChunk = JSON.parse(event.data);

        switch (chunk.type) {
          case 'content':
            if (chunk.content) {
              setContent(prev => prev + chunk.content);
              options.onContent?.(chunk.content);
            }
            break;

          case 'citation':
            if (chunk.citation) {
              setCitations(prev => [...prev, chunk.citation!]);
              options.onCitation?.(chunk.citation);
            }
            break;

          case 'metadata':
            options.onMetadata?.(chunk.metadata);
            break;

          case 'done':
            setIsStreaming(false);
            eventSource.close();
            options.onComplete?.();
            break;

          case 'error':
            setError(chunk.error || 'Unknown error');
            setIsStreaming(false);
            eventSource.close();
            options.onError?.(chunk.error || 'Unknown error');
            break;
        }
      } catch (e) {
        console.error('Error parsing SSE message:', e);
      }
    };

    eventSource.onerror = (event) => {
      console.error('SSE connection error:', event);
      setError('Connection lost. Please try again.');
      setIsStreaming(false);
      eventSource.close();
      options.onError?.('Connection lost');
    };
  }, [options]);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    isStreaming,
    content,
    citations,
    error,
    startStream,
    stopStream,
  };
}
```

#### Paso 4.3.2: Componente de Mensaje Streaming
```typescript
// frontend/src/components/ai/StreamingMessage.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Citation {
  documentId: string;
  title: string;
  relevance: number;
  articleRef?: string;
}

interface StreamingMessageProps {
  content: string;
  citations: Citation[];
  isStreaming: boolean;
  role: 'user' | 'assistant';
}

export function StreamingMessage({
  content,
  citations,
  isStreaming,
  role
}: StreamingMessageProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll mientras streaming
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [content, isStreaming]);

  return (
    <Card className={`mb-4 ${role === 'user' ? 'ml-12 bg-primary/10' : 'mr-12'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center
            ${role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
            {role === 'user' ? 'U' : 'AI'}
          </div>

          <div className="flex-1" ref={contentRef}>
            {/* Contenido del mensaje */}
            <div className="prose dark:prose-invert max-w-none">
              {content}
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
              )}
            </div>

            {/* Indicador de carga inicial */}
            {isStreaming && !content && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}

            {/* Citations */}
            {citations.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Fuentes citadas:</p>
                <div className="flex flex-wrap gap-2">
                  {citations.map((citation, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                    >
                      {citation.title}
                      {citation.articleRef && ` - ${citation.articleRef}`}
                      <span className="ml-1 text-xs opacity-60">
                        ({Math.round(citation.relevance * 100)}%)
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Paso 4.3.3: Integración en AI Assistant Page
```typescript
// frontend/src/app/ai-assistant/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useSSEStream } from '@/hooks/useSSEStream';
import { StreamingMessage } from '@/components/ai/StreamingMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, StopCircle, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isStreaming,
    content: streamingContent,
    citations: streamingCitations,
    error,
    startStream,
    stopStream
  } = useSSEStream({
    onComplete: () => {
      // Agregar mensaje completo al historial
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: streamingContent,
          citations: streamingCitations,
        }
      ]);
    },
    onError: (error) => {
      console.error('Stream error:', error);
    }
  });

  // Auto-scroll al nuevo mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Inicializar conversación
  useEffect(() => {
    // Crear nueva conversación al montar
    const initConversation = async () => {
      try {
        const response = await fetch('/api/v1/ai/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        setConversationId(data.id);
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
    };
    initConversation();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Iniciar streaming
    startStream(conversationId, input);
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 h-screen flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            Asistente Legal IA
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          {/* Mensajes del historial */}
          {messages.map((msg) => (
            <StreamingMessage
              key={msg.id}
              content={msg.content}
              citations={msg.citations || []}
              isStreaming={false}
              role={msg.role}
            />
          ))}

          {/* Mensaje streaming actual */}
          {isStreaming && (
            <StreamingMessage
              content={streamingContent}
              citations={streamingCitations}
              isStreaming={true}
              role="assistant"
            />
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta legal..."
              disabled={isStreaming}
              className="flex-1"
            />
            {isStreaming ? (
              <Button
                type="button"
                variant="destructive"
                onClick={stopStream}
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Detener
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            )}
          </form>
        </div>
      </Card>
    </div>
  );
}
```

### 4.4 Criterios de Aceptación
- [ ] El texto aparece progresivamente (efecto typing)
- [ ] Las citas aparecen cuando se reciben
- [ ] El usuario puede detener el streaming
- [ ] Auto-scroll funciona correctamente
- [ ] Error handling muestra mensajes apropiados
- [ ] Funciona en modo dark/light
- [ ] Sin memory leaks (cleanup de EventSource)

---

## Tarea 5: Re-enable Temporarily Disabled Routes

### 5.1 Objetivo
Rehabilitar las rutas que fueron temporalmente deshabilitadas debido a desalineaciones de schema y tipos.

### 5.2 Rutas Deshabilitadas (server.ts)
```typescript
// Actualmente comentadas en src/server.ts:
// import { legalDocumentRoutes } from './routes/legal-documents.js';
// import { legalDocumentRoutesV2 } from './routes/legal-documents-v2.js';
// import { documentRoutesEnhanced } from './routes/documents-enhanced.js';
// import { aiPredictionsRoutes } from './routes/ai-predictions.js';
// import { trendsRoutes } from './routes/trends.js';
```

### 5.3 Análisis de Causas

| Ruta | Archivo | Causa del Problema |
|------|---------|-------------------|
| legalDocumentRoutes | `legal-documents.ts` | Schema Prisma no alineado con tipos |
| legalDocumentRoutesV2 | `legal-documents-v2.ts` | Campos faltantes en schema |
| documentRoutesEnhanced | `documents-enhanced.ts` | Dependencia fastify-multer faltante |
| aiPredictionsRoutes | `ai-predictions.ts` | Tipos de predicción incompatibles |
| trendsRoutes | `trends.ts` | Modelos ML no sincronizados |

### 5.4 Plan de Resolución por Ruta

#### 5.4.1 legal-documents.ts
```typescript
// Problemas identificados:
// 1. Campo 'normType' espera enum, recibe string
// 2. Campo 'legalHierarchy' no existe en algunos queries

// Solución: Actualizar schema y tipos
// prisma/schema.prisma
enum NormType {
  LAW
  DECREE
  RESOLUTION
  AGREEMENT
  REGULATION
  ORDINANCE
  OTHER
}

model LegalDocument {
  normType      NormType  // Cambiar de String a enum
  // ... resto del modelo
}
```

#### 5.4.2 documents-enhanced.ts
```bash
# Instalar dependencia faltante
npm install fastify-multer
```

```typescript
// Actualizar imports
import multer from 'fastify-multer';
```

#### 5.4.3 ai-predictions.ts y trends.ts
```typescript
// Sincronizar tipos con schema Prisma
// src/types/prediction.types.ts - Actualizar para coincidir con Prisma

export interface Prediction {
  id: string;
  modelId: string;
  predictionType: string;
  inputData: Record<string, unknown>;
  prediction: Record<string, unknown>;
  confidence: number;
  createdAt: Date;
  // Asegurar que coincida con prisma/schema.prisma
}
```

### 5.5 Pasos de Implementación

#### Paso 5.5.1: Verificar schema actual
```bash
npx prisma db pull  # Ver estado actual de DB
npx prisma generate # Regenerar cliente
```

#### Paso 5.5.2: Crear script de validación
```typescript
// scripts/validate-routes-schema.ts
import { PrismaClient } from '@prisma/client';

async function validateSchema() {
  const prisma = new PrismaClient();

  try {
    // Verificar que los modelos existen
    const tables = [
      'LegalDocument',
      'Prediction',
      'MLModel',
      'AnalyticsEvent'
    ];

    for (const table of tables) {
      console.log(`Validating ${table}...`);
      // Intentar query simple
      await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].findFirst();
      console.log(`✓ ${table} OK`);
    }
  } catch (error) {
    console.error('Schema validation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

validateSchema();
```

#### Paso 5.5.3: Re-habilitar rutas una por una
```typescript
// src/server.ts - Proceso gradual

// 1. Primero habilitar las más simples
import { legalDocumentRoutes } from './routes/legal-documents.js';
await app.register(legalDocumentRoutes, { prefix: '/api/v1' });

// 2. Probar y si funciona, continuar con la siguiente
// 3. Repetir hasta habilitar todas
```

### 5.6 Script de Test para Cada Ruta
```bash
#!/bin/bash
# scripts/test-routes.sh

echo "Testing legal-documents routes..."
curl -s http://localhost:8000/api/v1/legal-documents | jq .

echo "Testing ai-predictions routes..."
curl -s http://localhost:8000/api/v1/predictions | jq .

echo "Testing trends routes..."
curl -s http://localhost:8000/api/v1/trends/analysis | jq .
```

### 5.7 Orden de Re-habilitación
1. **Fase 1:** `legal-documents.ts` (más usado)
2. **Fase 2:** `legal-documents-v2.ts` (depende de fase 1)
3. **Fase 3:** `documents-enhanced.ts` (después de instalar multer)
4. **Fase 4:** `ai-predictions.ts` (requiere modelos ML)
5. **Fase 5:** `trends.ts` (último, depende de predicciones)

### 5.8 Criterios de Aceptación
- [ ] Todas las rutas descomentadas en server.ts
- [ ] Sin errores de compilación TypeScript
- [ ] Cada endpoint responde con 200 OK
- [ ] Tests de integración pasan
- [ ] No hay regresiones en rutas existentes

---

## Cronograma Sugerido

| Semana | Tarea | Dependencias |
|--------|-------|--------------|
| 1 | Tarea 1: Redis Rate Limiter | Ninguna |
| 1-2 | Tarea 2: Singleton Patterns | Ninguna |
| 2 | Tarea 3: Unit Tests UI | Ninguna |
| 2-3 | Tarea 4: SSE Client | Tarea 2 |
| 3 | Tarea 5: Re-enable Routes | Tarea 2 |

---

## Métricas de Éxito

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| Cobertura de Tests | > 80% | `npm run test:coverage` |
| Instancias Prisma | 1 (singleton) | `grep "new PrismaClient"` |
| Rutas Activas | 100% | Endpoints en server.ts |
| Tiempo Respuesta SSE | < 100ms primer chunk | Monitoreo |
| Rate Limiter Redis | Funcional | Tests de carga |

---

## Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Redis no disponible | Media | Alto | Fallback a memoria |
| Tests flaky | Media | Medio | Retry logic, mocks estables |
| Schema breaking changes | Alta | Alto | Migrations incrementales |
| SSE timeout en producción | Media | Medio | Keep-alive, reconexión |

---

## Apéndice: Comandos Útiles

```bash
# Buscar instancias de PrismaClient
grep -rn "new PrismaClient" src/ --include="*.ts"

# Verificar rutas habilitadas
grep -n "app.register" src/server.ts | grep -v "//"

# Ejecutar tests con cobertura
npm run test:coverage

# Verificar conexión Redis
redis-cli ping

# Regenerar cliente Prisma
npx prisma generate

# Ver errores TypeScript
npx tsc --noEmit

# Probar SSE endpoint
curl -N "http://localhost:8000/api/v1/ai/stream?conversationId=test&query=hola"
```

---

**Documento generado:** 2024-12-12
**Próxima revisión:** Al completar cada tarea
