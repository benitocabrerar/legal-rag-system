# Plan de Completación M3: Document Summarization Service

**Fecha:** 2025-12-12
**Estado Actual:** 75% (Parcial)
**Objetivo:** 100% (Completo)
**Prioridad:** Alta

---

## Resumen Ejecutivo

El servicio de Document Summarization tiene el backend completamente implementado (`DocumentSummarizationService`) pero carece de:
1. **Rutas API** para exponer el servicio
2. **Interfaz de usuario** frontend dedicada

Este plan detalla las tareas necesarias para alcanzar el 100% de implementación.

---

## Estado Actual (75%)

### ✅ Completado (Backend)

| Componente | Ubicación | Estado |
|------------|-----------|--------|
| DocumentSummarizationService | `src/services/ai/document-summarization.service.ts` | ✅ 100% |
| Multi-level summaries | brief, standard, detailed | ✅ Implementado |
| Key point extraction | `extractKeyPoints()` | ✅ Implementado |
| Executive summaries | `generateExecutiveSummary()` | ✅ Implementado |
| Batch processing | `batchSummarize()` | ✅ Implementado |
| Comparative analysis | `compareDocuments()` | ✅ Implementado |
| Database persistence | LegalDocumentSummary model | ✅ Implementado |
| Service export | `src/services/ai/index.ts` | ✅ Exportado |

### ❌ Faltante

| Componente | Prioridad | Esfuerzo |
|------------|-----------|----------|
| API Routes para Summarization | ALTA | 2-3 horas |
| Frontend: Página de Summarization | ALTA | 4-6 horas |
| Frontend: Componente SummaryCard | MEDIA | 1-2 horas |
| Frontend: Hook useSummarization | MEDIA | 1 hora |
| Integración con Legal Library | MEDIA | 2 horas |
| Tests E2E | BAJA | 2 horas |

---

## Plan de Implementación Detallado

### Fase 1: API Routes (2-3 horas)

#### 1.1 Crear archivo de rutas: `src/routes/summarization.ts`

```typescript
// Estructura del archivo a crear
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDocumentSummarizationService } from '../services/ai/document-summarization.service.js';

export async function summarizationRoutes(fastify: FastifyInstance) {
  const summarizationService = getDocumentSummarizationService();

  // POST /api/v1/summarization/document/:id
  // - level: 'brief' | 'standard' | 'detailed'
  // - language: 'es' | 'en'
  // - includeKeyPoints: boolean

  // POST /api/v1/summarization/document/:id/key-points

  // POST /api/v1/summarization/case/:id/executive

  // POST /api/v1/summarization/batch

  // POST /api/v1/summarization/compare

  // GET /api/v1/summarization/:summaryId
}
```

#### 1.2 Endpoints a implementar

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/summarization/document/:id` | Generar resumen de documento |
| POST | `/api/v1/summarization/document/:id/key-points` | Extraer puntos clave |
| POST | `/api/v1/summarization/case/:id/executive` | Generar resumen ejecutivo de caso |
| POST | `/api/v1/summarization/batch` | Resumir múltiples documentos |
| POST | `/api/v1/summarization/compare` | Comparar documentos |
| GET | `/api/v1/summarization/:summaryId` | Obtener resumen existente |
| GET | `/api/v1/summarization/document/:id/summaries` | Listar resúmenes de documento |

#### 1.3 Schemas Zod para validación

```typescript
// src/schemas/summarization-schemas.ts
import { z } from 'zod';

export const SummarizeDocumentSchema = z.object({
  level: z.enum(['brief', 'standard', 'detailed']).default('standard'),
  language: z.enum(['es', 'en']).default('es'),
  includeKeyPoints: z.boolean().default(true),
  includeReferences: z.boolean().default(true),
  maxLength: z.number().min(100).max(2000).optional()
});

export const BatchSummarizeSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1).max(10),
  level: z.enum(['brief', 'standard', 'detailed']).default('brief')
});

export const CompareDocumentsSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(2).max(10)
});
```

#### 1.4 Registrar rutas en server.ts

```typescript
// Agregar en src/server.ts
import { summarizationRoutes } from './routes/summarization.js';

// En la sección de rutas API
await app.register(summarizationRoutes, { prefix: '/api/v1/summarization' });
```

---

### Fase 2: Frontend - Hooks y API Client (1-2 horas)

#### 2.1 Crear hook: `frontend/src/hooks/useSummarization.ts`

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface SummarizeOptions {
  level: 'brief' | 'standard' | 'detailed';
  language: 'es' | 'en';
  includeKeyPoints: boolean;
}

interface DocumentSummary {
  id: string;
  documentId: string;
  level: string;
  summary: string;
  keyPoints: string[];
  references: string[];
  wordCount: number;
  confidenceScore: number;
  language: string;
  createdAt: string;
}

export function useSummarizeDocument() {
  return useMutation({
    mutationFn: async ({
      documentId,
      options
    }: {
      documentId: string;
      options: Partial<SummarizeOptions>
    }) => {
      const response = await apiClient.post(
        `/api/v1/summarization/document/${documentId}`,
        options
      );
      return response.data as DocumentSummary;
    }
  });
}

export function useExtractKeyPoints() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiClient.post(
        `/api/v1/summarization/document/${documentId}/key-points`
      );
      return response.data;
    }
  });
}

export function useCompareDocuments() {
  return useMutation({
    mutationFn: async (documentIds: string[]) => {
      const response = await apiClient.post(
        `/api/v1/summarization/compare`,
        { documentIds }
      );
      return response.data;
    }
  });
}

export function useDocumentSummaries(documentId: string) {
  return useQuery({
    queryKey: ['summaries', documentId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/v1/summarization/document/${documentId}/summaries`
      );
      return response.data;
    },
    enabled: !!documentId
  });
}
```

---

### Fase 3: Frontend - Página de Summarization (4-6 horas)

#### 3.1 Crear página: `frontend/src/app/summarization/page.tsx`

**Estructura de la página:**

```
/summarization
├── Header con título y descripción
├── Document Selector (dropdown/search)
├── Summary Options Panel
│   ├── Level selector (brief/standard/detailed)
│   ├── Language toggle (ES/EN)
│   └── Include key points checkbox
├── Generate Button
├── Results Panel
│   ├── Summary Card
│   ├── Key Points List
│   └── References (if available)
├── Compare Section
│   ├── Multi-document selector
│   └── Comparative analysis view
└── History Panel (previous summaries)
```

#### 3.2 Componentes a crear

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| SummarizationPage | `app/summarization/page.tsx` | Página principal |
| SummaryCard | `components/summarization/SummaryCard.tsx` | Card para mostrar resumen |
| KeyPointsList | `components/summarization/KeyPointsList.tsx` | Lista de puntos clave |
| SummaryOptions | `components/summarization/SummaryOptions.tsx` | Panel de opciones |
| DocumentSelector | `components/summarization/DocumentSelector.tsx` | Selector de documentos |
| ComparativeView | `components/summarization/ComparativeView.tsx` | Vista comparativa |
| SummaryHistory | `components/summarization/SummaryHistory.tsx` | Historial de resúmenes |

#### 3.3 Diseño UI (shadcn/ui components)

```tsx
// Componentes shadcn/ui a utilizar
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
```

---

### Fase 4: Integración con Legal Library (2 horas)

#### 4.1 Agregar botón "Resumir" en vista de documento

**Archivo:** `frontend/src/app/admin/legal-library/page.tsx`

```tsx
// Agregar en la lista de acciones de cada documento
<Button
  variant="outline"
  size="sm"
  onClick={() => handleSummarize(doc.id)}
>
  <FileText className="h-4 w-4 mr-1" />
  Resumir
</Button>
```

#### 4.2 Agregar panel de resumen en vista detallada

**Agregar tab "Resumen" en la vista de documento individual:**

```tsx
<Tabs defaultValue="content">
  <TabsList>
    <TabsTrigger value="content">Contenido</TabsTrigger>
    <TabsTrigger value="articles">Artículos</TabsTrigger>
    <TabsTrigger value="summary">Resumen</TabsTrigger> {/* NUEVO */}
  </TabsList>

  <TabsContent value="summary">
    <DocumentSummaryPanel documentId={document.id} />
  </TabsContent>
</Tabs>
```

---

### Fase 5: Navegación y Routing (30 min)

#### 5.1 Agregar enlace en sidebar/navigation

**Archivo:** `frontend/src/components/Sidebar.tsx` o similar

```tsx
{
  href: '/summarization',
  label: 'Resumidor',
  icon: FileText,
}
```

#### 5.2 Agregar a la página de features del dashboard

```tsx
// En frontend/src/app/dashboard/page.tsx
<FeatureCard
  title="Resumidor de Documentos"
  description="Genera resúmenes automáticos de documentos legales"
  href="/summarization"
  icon={<FileText />}
/>
```

---

## Cronograma de Implementación

| Fase | Tarea | Tiempo Estimado | Dependencias |
|------|-------|-----------------|--------------|
| 1.1 | Crear summarization-schemas.ts | 30 min | - |
| 1.2 | Crear summarization.ts routes | 2 horas | 1.1 |
| 1.3 | Registrar en server.ts | 15 min | 1.2 |
| 1.4 | Probar endpoints con Postman/curl | 30 min | 1.3 |
| 2.1 | Crear useSummarization hook | 1 hora | 1.4 |
| 3.1 | Crear SummaryCard component | 1 hora | - |
| 3.2 | Crear KeyPointsList component | 30 min | - |
| 3.3 | Crear SummaryOptions component | 30 min | - |
| 3.4 | Crear página /summarization | 3 horas | 2.1, 3.1-3.3 |
| 4.1 | Integrar en Legal Library | 1 hora | 3.4 |
| 4.2 | Agregar tab de resumen | 1 hora | 4.1 |
| 5.1 | Agregar navegación | 30 min | 4.2 |

**Tiempo Total Estimado:** 12-14 horas de desarrollo

---

## Archivos a Crear/Modificar

### Nuevos Archivos

```
src/
├── routes/
│   └── summarization.ts                    # API routes
├── schemas/
│   └── summarization-schemas.ts            # Zod schemas

frontend/src/
├── app/
│   └── summarization/
│       └── page.tsx                        # Main page
├── components/
│   └── summarization/
│       ├── SummaryCard.tsx
│       ├── KeyPointsList.tsx
│       ├── SummaryOptions.tsx
│       ├── DocumentSelector.tsx
│       ├── ComparativeView.tsx
│       └── SummaryHistory.tsx
├── hooks/
│   └── useSummarization.ts                 # React Query hooks
```

### Archivos a Modificar

```
src/
├── server.ts                               # Agregar registro de rutas

frontend/src/
├── app/
│   └── admin/
│       └── legal-library/
│           └── page.tsx                    # Agregar botón resumir
├── components/
│   └── Sidebar.tsx                         # Agregar link navegación
```

---

## Criterios de Aceptación

### API Routes
- [ ] Endpoint POST `/api/v1/summarization/document/:id` funciona correctamente
- [ ] Soporta los 3 niveles de resumen (brief, standard, detailed)
- [ ] Retorna keyPoints cuando `includeKeyPoints=true`
- [ ] Persiste resúmenes en la base de datos
- [ ] Recupera resúmenes existentes sin regenerar

### Frontend UI
- [ ] Página `/summarization` accesible y funcional
- [ ] Selector de documentos funciona correctamente
- [ ] Opciones de nivel de resumen visibles y funcionales
- [ ] Indicador de carga durante generación
- [ ] Resumen se muestra en SummaryCard
- [ ] Puntos clave se muestran en lista
- [ ] Comparación de documentos funciona
- [ ] Historial de resúmenes visible

### Integración
- [ ] Botón "Resumir" visible en Legal Library
- [ ] Tab "Resumen" funciona en vista de documento
- [ ] Link en navegación principal

### Dark Mode
- [ ] Todos los componentes soportan dark mode
- [ ] Colores consistentes con el tema del sistema

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Timeouts en documentos largos | Media | Alto | Implementar streaming o job queue |
| Costos OpenAI elevados | Media | Medio | Implementar caché agresivo |
| UI compleja | Baja | Medio | Usar componentes shadcn/ui existentes |

---

## Métricas de Éxito

- **Tiempo de respuesta:** < 10 segundos para resumen brief
- **Disponibilidad:** 99.9% uptime del endpoint
- **Satisfacción:** Rating positivo en feedback de usuarios
- **Uso:** > 50 resúmenes generados en primera semana

---

## Notas Técnicas

### Caché de Resúmenes
El servicio ya implementa caché consultando `LegalDocumentSummary` antes de generar nuevos resúmenes. Esto evita llamadas redundantes a OpenAI.

### Streaming (Opcional/Futuro)
Para documentos muy largos, considerar implementar streaming de respuesta similar a M4 (Response Streaming) usando SSE.

### Rate Limiting
Los endpoints deben estar protegidos por el rate limiter existente de Redis para evitar abuso de la API de OpenAI.

---

**Documento preparado por:** Claude AI
**Fecha:** 2025-12-12
**Versión:** 1.0
