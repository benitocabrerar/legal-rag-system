# Plan de Mejora Integral: Legal RAG System - 100% Compliance

## Resumen Ejecutivo

| Métrica | Estado Actual | Objetivo |
|---------|---------------|----------|
| **Backend** | 78% | 100% |
| **Frontend** | 68% | 100% |
| **Seguridad** | 58% | 100% |
| **Rendimiento** | 65% | 100% |

**Tiempo estimado total:** 95-115 horas
**Duración:** 8 semanas
**Prioridad:** Crítico → Alto → Medio → Optimización

---

## Fase 1: Problemas Críticos (Semanas 1-2)

### 1.1 Vulnerabilidades de Seguridad Críticas

#### SEC-001: JWT Secret Hardcodeado (CVSS 9.1)
**Archivo:** `src/server.ts:75-77`
**Problema:** Secreto JWT fallback 'supersecret' en código
**Impacto:** Compromiso total de autenticación

```typescript
// ANTES (INSEGURO):
await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'supersecret',
});

// DESPUÉS (SEGURO):
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}
await app.register(jwt, {
  secret: jwtSecret,
  sign: {
    expiresIn: '24h'
  }
});
```

#### SEC-002: Múltiples Secretos Fallback
**Archivos afectados:**
- `src/routes/auth.ts`
- `src/routes/oauth.ts`
- `src/middleware/auth.ts`

**Acción:** Buscar y eliminar todos los fallback secrets:
```bash
grep -r "supersecret\|fallback.*secret\||| 'secret" src/
```

#### SEC-003: Tokens JWT Sin Expiración (CVSS 7.5)
**Archivo:** `src/routes/auth.ts:47-51`

```typescript
// ANTES:
const token = app.jwt.sign({ userId: user.id, role: user.role });

// DESPUÉS:
const token = app.jwt.sign(
  { userId: user.id, role: user.role },
  { expiresIn: '24h' }
);
const refreshToken = app.jwt.sign(
  { userId: user.id, type: 'refresh' },
  { expiresIn: '7d' }
);
```

#### SEC-011: Headers de Seguridad NO Registrados (CVSS 7.4)
**Archivo:** `src/server.ts`
**Problema:** El middleware existe pero NO está registrado

```typescript
// AGREGAR después de los plugins existentes:
import { securityHeadersMiddleware } from './middleware/security-headers.middleware.js';

// Registrar middleware de seguridad
app.addHook('onRequest', securityHeadersMiddleware);
```

#### SEC-009: CORS Wildcard Inseguro (CVSS 6.5)
**Archivo:** `src/server.ts:70-73`

```typescript
// ANTES:
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
});

// DESPUÉS:
import { getCorsConfig } from './config/cors.config.js';
await app.register(cors, getCorsConfig());
```

#### SEC-004/005: Rate Limiting en Endpoints de Auth
**Archivo:** `src/routes/auth.ts`

```typescript
// Agregar rate limiting específico para auth:
app.register(async (authApp) => {
  await authApp.register(rateLimit, {
    max: 5,
    timeWindow: '15 minutes',
    keyGenerator: (request) => request.ip
  });

  authApp.post('/auth/login', loginHandler);
  authApp.post('/auth/register', registerHandler);
  authApp.post('/auth/forgot-password', forgotPasswordHandler);
});
```

---

### 1.2 Regenerar Cliente Prisma (Crítico)

**Causa raíz identificada:** El esquema Prisma ES correcto, pero el cliente no se ha regenerado.

**Modelos existentes en schema.prisma:**
- `Prediction` ✓
- `TrendForecast` ✓
- `LegalPattern` ✓
- `DocumentComparison` ✓

**Comandos de ejecución:**
```bash
# 1. Regenerar cliente Prisma
npx prisma generate

# 2. Aplicar migraciones pendientes
npx prisma migrate deploy

# 3. Verificar modelos
npx prisma studio
```

---

### 1.3 Re-habilitar Rutas Deshabilitadas

#### Orden de prioridad para re-habilitación:

| Prioridad | Ruta | Archivo | Acción |
|-----------|------|---------|--------|
| 1 | Legal Documents V2 | `legal-documents-v2.ts` | Re-habilitar (usa esquema nuevo) |
| 2 | Unified Search | `unified-search.ts` | Re-habilitar tras Prisma generate |
| 3 | AI Predictions | `ai-predictions.ts` | Migrar a modelo Prediction |
| 4 | Trends | `trends.ts` | Migrar a modelo TrendForecast |
| 5 | Legal Documents V1 | `legal-documents.ts` | Deprecar (usa esquema antiguo) |

#### Paso 1: Re-habilitar en server.ts

```typescript
// Descomentar líneas 19-20:
import { legalDocumentRoutesV2 } from './routes/legal-documents-v2.js';

// Descomentar línea 47:
import { unifiedSearchRoutes } from './routes/unified-search.js';

// Descomentar líneas 51-52:
import { aiPredictionsRoutes } from './routes/ai-predictions.js';
import { trendsRoutes } from './routes/trends.js';

// Descomentar registros (líneas 155, 204, 208-209):
await app.register(legalDocumentRoutesV2, { prefix: '/api/v1' });
await app.register(unifiedSearchRoutes, { prefix: '/api/v1/unified-search' });
await app.register(aiPredictionsRoutes, { prefix: '/api/v1' });
await app.register(trendsRoutes, { prefix: '/api/v1/trends' });
```

#### Paso 2: Actualizar tsconfig.json

```json
{
  "exclude": [
    // REMOVER estas líneas:
    // "src/routes/ai-predictions.ts",
    // "src/routes/trends.ts",
    // "src/routes/unified-search.ts",
    // "src/routes/legal-documents-v2.ts"
  ]
}
```

---

## Fase 2: Migración de Servicios AI/ML (Semanas 3-4)

### 2.1 Predictive Intelligence Service

**Problema:** Usa `SystemMetric` en lugar de `Prediction`
**Archivo:** `src/services/ai/predictive-intelligence.service.ts`

```typescript
// ANTES:
await this.prisma.systemMetric.create({
  data: {
    name: 'prediction',
    value: JSON.stringify(prediction),
    category: 'ai',
    timestamp: new Date()
  }
});

// DESPUÉS:
await this.prisma.prediction.create({
  data: {
    type: 'CASE_OUTCOME',
    targetId: caseId,
    targetType: 'case',
    prediction: predictedOutcome,
    confidence: confidenceScore,
    factors: JSON.stringify(factors),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    createdBy: userId,
    metadata: JSON.stringify({
      modelVersion: '1.0',
      inputFeatures: features
    })
  }
});
```

### 2.2 Trend Analysis Service

**Problema:** Usa `SystemMetric` en lugar de `TrendForecast`
**Archivo:** `src/services/ai/trend-analysis.service.ts`

```typescript
// DESPUÉS:
await this.prisma.trendForecast.create({
  data: {
    type: 'DOCUMENT_VOLUME',
    entityType: 'legal_document',
    entityId: null,
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    forecastData: JSON.stringify(trendData),
    confidence: confidenceInterval,
    factors: JSON.stringify(contributingFactors),
    createdBy: userId
  }
});
```

### 2.3 Pattern Detection Service

**Problema:** Usa `SystemMetric` en lugar de `LegalPattern`
**Archivo:** `src/services/ai/pattern-detection.service.ts`

```typescript
// DESPUÉS:
await this.prisma.legalPattern.create({
  data: {
    type: 'CITATION_CLUSTER',
    name: patternName,
    description: patternDescription,
    pattern: JSON.stringify(patternDefinition),
    frequency: occurrenceCount,
    confidence: confidenceScore,
    examples: JSON.stringify(exampleDocuments),
    documentIds: relatedDocumentIds,
    isActive: true,
    discoveredAt: new Date(),
    metadata: JSON.stringify({
      algorithm: 'clustering',
      parameters: algorithmParams
    })
  }
});
```

### 2.4 Document Comparison Service

**Problema:** No persiste comparaciones
**Archivo:** `src/services/ai/document-comparison.service.ts`

```typescript
// AGREGAR persistencia:
async saveComparison(comparison: ComparisonResult): Promise<DocumentComparison> {
  return this.prisma.documentComparison.create({
    data: {
      sourceDocId: comparison.sourceId,
      targetDocId: comparison.targetId,
      similarityScore: comparison.overallSimilarity,
      comparisonType: 'FULL',
      differences: JSON.stringify(comparison.differences),
      similarities: JSON.stringify(comparison.similarities),
      metadata: JSON.stringify({
        algorithm: 'semantic-diff',
        executionTime: comparison.processingTime
      }),
      createdBy: comparison.userId
    }
  });
}
```

---

## Fase 3: Mejoras de Frontend (Semanas 5-6)

### 3.1 Sistema de Notificaciones en Tiempo Real

**Crear:** `frontend/src/components/notifications/RealTimeNotifications.tsx`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Check, AlertTriangle, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

export function RealTimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Conexión SSE para notificaciones en tiempo real
    const eventSource = new EventSource('/api/v1/notifications/stream');

    eventSource.onmessage = (event) => {
      const notification: Notification = JSON.parse(event.data);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Mostrar toast para notificaciones importantes
      if (notification.type === 'error' || notification.type === 'warning') {
        toast({
          title: notification.title,
          description: notification.message,
          variant: notification.type === 'error' ? 'destructive' : 'default'
        });
      }
    };

    eventSource.onerror = () => {
      console.error('SSE connection error, reconnecting...');
      eventSource.close();
      // Reconexión automática después de 5 segundos
      setTimeout(() => {
        // Reiniciar conexión
      }, 5000);
    };

    return () => eventSource.close();
  }, [toast]);

  const markAsRead = useCallback(async (id: string) => {
    await fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await fetch('/api/v1/notifications/read-all', { method: 'PATCH' });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <Check className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <X className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b flex justify-between items-center">
            <h3 className="font-semibold">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-500 hover:underline"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No hay notificaciones
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {getIcon(notification.type)}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-gray-500">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 3.2 Visor de Comparación de Documentos

**Crear:** `frontend/src/components/documents/DocumentComparisonViewer.tsx`

```typescript
'use client';

import { useState, useEffect, useMemo } from 'react';
import { diffLines, Change } from 'diff';

interface DocumentComparisonViewerProps {
  sourceDocument: { id: string; title: string; content: string };
  targetDocument: { id: string; title: string; content: string };
  highlightDifferences?: boolean;
}

export function DocumentComparisonViewer({
  sourceDocument,
  targetDocument,
  highlightDifferences = true
}: DocumentComparisonViewerProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [similarityScore, setSimilarityScore] = useState<number>(0);

  const differences = useMemo(() => {
    return diffLines(sourceDocument.content, targetDocument.content);
  }, [sourceDocument.content, targetDocument.content]);

  useEffect(() => {
    // Calcular score de similitud
    const totalChars = sourceDocument.content.length + targetDocument.content.length;
    const unchangedChars = differences
      .filter(d => !d.added && !d.removed)
      .reduce((sum, d) => sum + (d.value?.length || 0), 0) * 2;
    setSimilarityScore(Math.round((unchangedChars / totalChars) * 100));
  }, [differences, sourceDocument.content.length, targetDocument.content.length]);

  const renderDiff = (change: Change, index: number) => {
    const baseClass = "px-2 py-1 font-mono text-sm whitespace-pre-wrap";

    if (change.added) {
      return (
        <div key={index} className={`${baseClass} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200`}>
          + {change.value}
        </div>
      );
    }
    if (change.removed) {
      return (
        <div key={index} className={`${baseClass} bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200`}>
          - {change.value}
        </div>
      );
    }
    return (
      <div key={index} className={`${baseClass} text-gray-700 dark:text-gray-300`}>
        {change.value}
      </div>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header con controles */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 flex justify-between items-center">
        <div className="flex gap-4">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1 rounded ${viewMode === 'side-by-side' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            Lado a lado
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={`px-3 py-1 rounded ${viewMode === 'unified' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            Unificado
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Similitud:</span>
          <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${similarityScore > 70 ? 'bg-green-500' : similarityScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${similarityScore}%` }}
            />
          </div>
          <span className="font-semibold">{similarityScore}%</span>
        </div>
      </div>

      {/* Contenido */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-2 divide-x">
          <div className="p-4">
            <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">
              {sourceDocument.title}
            </h4>
            <div className="space-y-1">
              {differences.filter(d => !d.added).map((change, i) => renderDiff(change, i))}
            </div>
          </div>
          <div className="p-4">
            <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">
              {targetDocument.title}
            </h4>
            <div className="space-y-1">
              {differences.filter(d => !d.removed).map((change, i) => renderDiff(change, i))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="space-y-1">
            {differences.map((change, i) => renderDiff(change, i))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3.3 Gráfico de Tendencias

**Crear:** `frontend/src/components/charts/TrendChart.tsx`

```typescript
'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';

interface TrendDataPoint {
  date: string;
  value: number;
  forecast?: number;
  upperBound?: number;
  lowerBound?: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  title: string;
  yAxisLabel?: string;
  showForecast?: boolean;
  showConfidenceInterval?: boolean;
}

export function TrendChart({
  data,
  title,
  yAxisLabel = 'Valor',
  showForecast = true,
  showConfidenceInterval = true
}: TrendChartProps) {
  const formattedData = useMemo(() => {
    return data.map(point => ({
      ...point,
      date: new Date(point.date).toLocaleDateString('es-EC', {
        month: 'short',
        day: 'numeric'
      })
    }));
  }, [data]);

  return (
    <div className="w-full h-80 bg-white dark:bg-gray-900 rounded-lg p-4 shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height="85%">
        <ComposedChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            label={{
              value: yAxisLabel,
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12 }
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend />

          {/* Intervalo de confianza */}
          {showConfidenceInterval && (
            <Area
              type="monotone"
              dataKey="upperBound"
              stroke="none"
              fill="#3b82f6"
              fillOpacity={0.1}
              name="Límite superior"
            />
          )}
          {showConfidenceInterval && (
            <Area
              type="monotone"
              dataKey="lowerBound"
              stroke="none"
              fill="#3b82f6"
              fillOpacity={0.1}
              name="Límite inferior"
            />
          )}

          {/* Datos históricos */}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ fill: '#2563eb', strokeWidth: 2 }}
            name="Valor actual"
          />

          {/* Pronóstico */}
          {showForecast && (
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#10b981', strokeWidth: 2 }}
              name="Pronóstico"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### 3.4 Grafo de Referencias Cruzadas

**Crear:** `frontend/src/components/graphs/CrossReferenceGraph.tsx`

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  label: string;
  type: 'document' | 'case' | 'citation';
  weight: number;
}

interface Link {
  source: string;
  target: string;
  type: 'cites' | 'references' | 'related';
  weight: number;
}

interface CrossReferenceGraphProps {
  nodes: Node[];
  links: Link[];
  onNodeClick?: (node: Node) => void;
  width?: number;
  height?: number;
}

export function CrossReferenceGraph({
  nodes,
  links,
  onNodeClick,
  width = 800,
  height = 600
}: CrossReferenceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    // Limpiar SVG anterior
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height].join(' '));

    // Crear simulación de fuerzas
    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links as any)
        .id((d: any) => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Definir marcadores para flechas
    svg.append('defs').selectAll('marker')
      .data(['cites', 'references', 'related'])
      .join('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', d => d === 'cites' ? '#2563eb' : d === 'references' ? '#10b981' : '#8b5cf6')
      .attr('d', 'M0,-5L10,0L0,5');

    // Crear enlaces
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => d.type === 'cites' ? '#2563eb' : d.type === 'references' ? '#10b981' : '#8b5cf6')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.weight))
      .attr('marker-end', d => `url(#arrow-${d.type})`);

    // Crear nodos
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Círculos para nodos
    node.append('circle')
      .attr('r', d => 10 + d.weight * 2)
      .attr('fill', d => d.type === 'document' ? '#2563eb' : d.type === 'case' ? '#10b981' : '#f59e0b')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d.id);
        onNodeClick?.(d);
      });

    // Etiquetas para nodos
    node.append('text')
      .text(d => d.label.length > 15 ? d.label.substring(0, 15) + '...' : d.label)
      .attr('x', 15)
      .attr('y', 4)
      .attr('font-size', '10px')
      .attr('fill', '#374151');

    // Tooltip
    node.append('title')
      .text(d => `${d.label}\nTipo: ${d.type}\nPeso: ${d.weight}`);

    // Actualizar posiciones en cada tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height, onNodeClick]);

  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow p-4">
      <div className="absolute top-4 right-4 flex gap-4 text-sm">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Documentos</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Casos</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Citaciones</span>
        </div>
      </div>
      <svg ref={svgRef} width={width} height={height} className="mx-auto" />
    </div>
  );
}
```

### 3.5 Error Boundaries Globales

**Crear:** `frontend/src/components/ui/GlobalErrorBoundary.tsx`

```typescript
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // Enviar error a servicio de monitoreo
    this.reportError(error, errorInfo);

    this.setState({ errorInfo });
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      await fetch('/api/v1/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error('Failed to report error:', e);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Algo salió mal
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                <summary className="cursor-pointer font-medium">Detalles del error</summary>
                <pre className="mt-2 overflow-auto text-red-600 dark:text-red-400">
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                <Home className="h-4 w-4" />
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Fase 4: Optimización y Testing (Semanas 7-8)

### 4.1 Circuit Breaker para OpenAI

**Archivo:** `src/services/ai/circuit-breaker.ts`

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests: number;
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenSuccesses: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenSuccesses = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.halfOpenRequests) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
```

### 4.2 Multi-Tier Cache

**Archivo:** `src/services/cache/multi-tier-cache.service.ts`

```typescript
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { LRUCache } from 'lru-cache';

interface CacheConfig {
  l1MaxSize: number;
  l1TTL: number;
  l2TTL: number;
  l3TTL: number;
}

export class MultiTierCacheService {
  private l1Cache: LRUCache<string, any>;
  private redis: Redis | null;
  private prisma: PrismaClient;

  constructor(config: CacheConfig) {
    // L1: Memory Cache (fastest)
    this.l1Cache = new LRUCache({
      max: config.l1MaxSize,
      ttl: config.l1TTL
    });

    // L2: Redis Cache (fast, shared)
    this.redis = process.env.REDIS_URL
      ? new Redis(process.env.REDIS_URL)
      : null;

    // L3: PostgreSQL (persistent)
    this.prisma = new PrismaClient();
  }

  async get<T>(key: string): Promise<T | null> {
    // L1: Check memory
    const l1Value = this.l1Cache.get(key);
    if (l1Value !== undefined) {
      return l1Value as T;
    }

    // L2: Check Redis
    if (this.redis) {
      const l2Value = await this.redis.get(key);
      if (l2Value) {
        const parsed = JSON.parse(l2Value);
        this.l1Cache.set(key, parsed);
        return parsed as T;
      }
    }

    // L3: Check PostgreSQL
    const l3Value = await this.prisma.queryCache.findUnique({
      where: { cacheKey: key }
    });

    if (l3Value && new Date() < l3Value.expiresAt) {
      const parsed = JSON.parse(l3Value.value);
      this.l1Cache.set(key, parsed);
      if (this.redis) {
        await this.redis.setex(key, 3600, l3Value.value);
      }
      return parsed as T;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    const serialized = JSON.stringify(value);

    // L1: Memory
    this.l1Cache.set(key, value);

    // L2: Redis
    if (this.redis) {
      await this.redis.setex(key, ttlSeconds, serialized);
    }

    // L3: PostgreSQL
    await this.prisma.queryCache.upsert({
      where: { cacheKey: key },
      update: {
        value: serialized,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000)
      },
      create: {
        cacheKey: key,
        queryHash: this.hashKey(key),
        value: serialized,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000)
      }
    });
  }

  async invalidate(pattern: string): Promise<void> {
    // L1: Clear matching keys
    for (const key of this.l1Cache.keys()) {
      if (key.includes(pattern)) {
        this.l1Cache.delete(key);
      }
    }

    // L2: Redis pattern delete
    if (this.redis) {
      const keys = await this.redis.keys(`*${pattern}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }

    // L3: PostgreSQL delete
    await this.prisma.queryCache.deleteMany({
      where: { cacheKey: { contains: pattern } }
    });
  }

  private hashKey(key: string): string {
    return require('crypto').createHash('md5').update(key).digest('hex');
  }
}
```

### 4.3 Tests E2E Críticos

**Crear:** `tests/e2e/security.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const API_URL = process.env.TEST_API_URL || 'http://localhost:8000';

describe('Security Tests', () => {
  describe('Authentication', () => {
    it('should reject requests without JWT token', async () => {
      const response = await request(API_URL)
        .get('/api/v1/user/profile')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZXhwIjoxNjAwMDAwMDAwfQ.xxx';

      const response = await request(API_URL)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should rate limit login attempts', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(API_URL)
          .post('/api/v1/auth/login')
          .send({ email: 'test@test.com', password: 'wrong' })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in response', async () => {
      const response = await request(API_URL)
        .get('/');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });

  describe('Input Validation', () => {
    it('should reject SQL injection attempts', async () => {
      const response = await request(API_URL)
        .post('/api/v1/query')
        .send({ query: "'; DROP TABLE users; --" })
        .expect(400);
    });

    it('should sanitize XSS in input', async () => {
      const response = await request(API_URL)
        .post('/api/v1/feedback/submit')
        .send({
          message: '<script>alert("xss")</script>',
          rating: 5
        });

      if (response.status === 200) {
        expect(response.body.message).not.toContain('<script>');
      }
    });
  });
});
```

---

## Checklist de Verificación Final

### Seguridad (12 items)
- [ ] SEC-001: JWT secret sin fallback
- [ ] SEC-002: Eliminar todos los secrets hardcodeados
- [ ] SEC-003: JWT tokens con expiración
- [ ] SEC-004: Rate limiting en /auth/login
- [ ] SEC-005: Rate limiting en /auth/register
- [ ] SEC-006: Rate limiting en /auth/forgot-password
- [ ] SEC-007: CORS configurado correctamente
- [ ] SEC-008: Security headers middleware registrado
- [ ] SEC-009: Helmet.js configurado
- [ ] SEC-010: Input validation en todos los endpoints
- [ ] SEC-011: SQL injection prevention
- [ ] SEC-012: XSS prevention

### Backend (8 items)
- [ ] Prisma client regenerado
- [ ] Legal Documents V2 habilitado
- [ ] Unified Search habilitado
- [ ] AI Predictions migrado a Prediction model
- [ ] Trends migrado a TrendForecast model
- [ ] Pattern Detection migrado a LegalPattern model
- [ ] Document Comparison con persistencia
- [ ] Circuit breaker implementado

### Frontend (6 items)
- [ ] RealTimeNotifications implementado
- [ ] DocumentComparisonViewer implementado
- [ ] TrendChart implementado
- [ ] CrossReferenceGraph implementado
- [ ] GlobalErrorBoundary en todas las páginas
- [ ] Mobile responsiveness verificado

### Performance (4 items)
- [ ] Multi-tier cache implementado
- [ ] Redis configurado
- [ ] Query optimization completado
- [ ] Load testing pasado

### Testing (4 items)
- [ ] Security tests pasando
- [ ] E2E tests pasando
- [ ] Integration tests pasando
- [ ] Coverage > 80%

---

## Cronograma Detallado

| Semana | Fase | Tareas | Horas Est. |
|--------|------|--------|------------|
| 1 | Crítico | SEC-001 a SEC-006, Prisma regenerate | 15-20h |
| 2 | Crítico | SEC-007 a SEC-012, Re-habilitar rutas | 12-15h |
| 3 | AI/ML | Migrar PredictiveIntelligence, TrendAnalysis | 12-15h |
| 4 | AI/ML | Migrar PatternDetection, DocumentComparison | 10-12h |
| 5 | Frontend | Notifications, DocumentComparison | 15-18h |
| 6 | Frontend | TrendChart, CrossReferenceGraph, ErrorBoundaries | 12-15h |
| 7 | Optimización | Circuit breaker, Multi-tier cache | 10-12h |
| 8 | Testing | E2E tests, Security tests, Documentation | 10-12h |

**Total:** 95-115 horas

---

## Comandos de Ejecución Rápida

```bash
# 1. Regenerar Prisma (CRÍTICO - hacer primero)
npx prisma generate
npx prisma migrate deploy

# 2. Verificar que los modelos existen
npx prisma studio

# 3. Buscar secrets hardcodeados
grep -r "supersecret\||| 'secret" src/

# 4. Verificar security headers
curl -I http://localhost:8000/

# 5. Ejecutar tests de seguridad
npm run test:security

# 6. Build para producción
npm run build

# 7. Verificar TypeScript errors
npx tsc --noEmit
```

---

*Documento generado automáticamente por el sistema de análisis de Claude Code*
*Fecha: 2025-12-11*
*Versión: 1.0*
