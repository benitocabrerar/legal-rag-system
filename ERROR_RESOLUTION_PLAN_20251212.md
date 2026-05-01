# Plan Detallado de Resolución de Errores TypeScript
## Legal RAG System - 12 de Diciembre 2025

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Total de Errores** | 182 |
| **Errores de Producción** | 10 (5.5%) |
| **Errores de Tests** | 170 (93.4%) |
| **Errores de Configuración** | 2 (1.1%) |
| **Backend** | 0 errores (limpio) |

---

## Clasificación de Errores por Prioridad

### PRIORIDAD CRÍTICA - Código de Producción (10 errores)

#### Categoría A: Dependencias NPM Faltantes (4 errores)

| # | Archivo | Error | Dependencia Faltante |
|---|---------|-------|---------------------|
| 1 | `src/components/ui/command.tsx:3` | TS2307 | `@radix-ui/react-icons` |
| 2 | `src/components/ui/command.tsx:4` | TS2307 | `cmdk` |
| 3 | `src/components/ui/popover.tsx:2` | TS2307 | `@radix-ui/react-popover` |
| 4 | `src/components/ui/scroll-area.tsx:2` | TS2307 | `@radix-ui/react-scroll-area` |

**Solución:**
```bash
cd frontend && npm install @radix-ui/react-icons cmdk @radix-ui/react-popover @radix-ui/react-scroll-area
```

---

#### Categoría B: Errores de Tipo en Código (5 errores)

| # | Archivo | Línea | Error | Descripción |
|---|---------|-------|-------|-------------|
| 5 | `src/app/summarization/page.tsx` | 295 | TS2322 | SummaryLevel 'comprehensive' no está en tipos permitidos |
| 6 | `src/app/summarization/page.tsx` | 389 | TS2322 | Mismo error de SummaryLevel |
| 7 | `src/components/summarization/DocumentSelector.tsx` | 376 | TS18048 | `maxSelections` posiblemente undefined |
| 8 | `src/components/summarization/SummaryCard.tsx` | 160 | TS2322 | Variante de Badge no válida |
| 9 | `src/components/summarization/SummaryOptions.example.tsx` | 4 | TS2724 | Export `SummaryOptionsType` no existe |

---

#### Categoría C: Configuración (1 error)

| # | Archivo | Error | Descripción |
|---|---------|-------|-------------|
| 10 | `vitest.config.ts` | TS2307 | `@vitejs/plugin-react` no encontrado |

---

### PRIORIDAD MEDIA - Infraestructura de Tests (170 errores)

#### Categoría D: Dependencias de Testing Faltantes

| Dependencia | Archivos Afectados | Errores |
|-------------|-------------------|---------|
| `@testing-library/react` | 8 archivos | 8 |
| `@testing-library/user-event` | 2 archivos | 2 |
| `@testing-library/jest-dom` | N/A (matchers) | ~160 |

**Archivos de Test Afectados:**
- `DocumentSelector.test.tsx` - 28 errores
- `SummaryCard.test.tsx` - 26 errores
- `SummaryOptions.test.tsx` - 22 errores
- `ThemeToggle.test.tsx` - 22 errores
- `Button.test.tsx` - 22 errores
- `Card.test.tsx` - 24 errores
- `LegalTypeBadge.test.tsx` - 18 errores

---

## Plan de Resolución Paso a Paso

### FASE 1: Instalar Dependencias Faltantes (Estimado: 5 min)

```bash
# 1.1 Dependencias de UI (Producción)
cd frontend
npm install @radix-ui/react-icons cmdk @radix-ui/react-popover @radix-ui/react-scroll-area

# 1.2 Dependencias de Testing (Desarrollo)
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom @vitejs/plugin-react vitest jsdom
```

**Verificación:**
```bash
npx tsc --noEmit 2>&1 | grep "Cannot find module" | wc -l
# Esperado: 0
```

---

### FASE 2: Corregir Errores de Tipo en Producción (Estimado: 15 min)

#### Error 5-6: SummaryLevel Type Mismatch

**Archivo:** `src/app/summarization/page.tsx`

**Problema:** El tipo `SummaryLevel` incluye 'comprehensive' pero la API solo acepta 'brief' | 'standard' | 'detailed'

**Solución A - Actualizar el tipo local:**
```typescript
// Línea ~10-15: Cambiar definición de SummaryLevel
type SummaryLevel = 'brief' | 'standard' | 'detailed';
// Eliminar 'comprehensive' del tipo
```

**Solución B - Mapear el valor antes de enviar:**
```typescript
// Línea 295 y 389: Agregar validación
const validLevel = selectedLevel === 'comprehensive' ? 'detailed' : selectedLevel;
// Usar validLevel en la llamada API
```

---

#### Error 7: maxSelections Possibly Undefined

**Archivo:** `src/components/summarization/DocumentSelector.tsx:376`

**Problema:** TypeScript detecta que `maxSelections` puede ser undefined

**Solución:**
```typescript
// Línea 376: Agregar valor por defecto o verificación
{selectedDocuments.length} / {maxSelections ?? 10}
// O usar optional chaining con fallback
```

---

#### Error 8: Badge Variant Type

**Archivo:** `src/components/summarization/SummaryCard.tsx:160`

**Problema:** El valor de variante no coincide con los tipos del componente Badge

**Solución:**
```typescript
// Línea 160: Verificar variantes válidas del Badge
// Opciones válidas: "default" | "secondary" | "success" | "outline" | "destructive" | "warning"
variant={getValidVariant(importanceLevel)} // Función que mapea a variante válida
```

---

#### Error 9: Missing Export SummaryOptionsType

**Archivo:** `src/components/summarization/SummaryOptions.example.tsx:4`

**Problema:** Intenta importar `SummaryOptionsType` que no existe

**Solución A - Agregar export en SummaryOptions.tsx:**
```typescript
// En SummaryOptions.tsx
export type SummaryOptionsType = {
  level: 'brief' | 'standard' | 'detailed';
  language: 'es' | 'en';
  includeKeyPoints: boolean;
  includeReferences: boolean;
  maxLength?: number;
  focusAreas?: string[];
};
```

**Solución B - Usar el tipo correcto en el ejemplo:**
```typescript
// En SummaryOptions.example.tsx
import { SummaryOptions } from './SummaryOptions';
// Remover import de SummaryOptionsType si no se necesita
```

---

### FASE 3: Configurar Infraestructura de Testing (Estimado: 10 min)

#### 3.1 Crear archivo de setup para tests

**Archivo:** `frontend/src/test/setup.ts`
```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

#### 3.2 Actualizar vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

#### 3.3 Actualizar tsconfig.json para tests

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

---

## Comandos de Ejecución por Agente

### Agente 1: Dependency Installer
```bash
cd C:/Users/benito/poweria/legal/frontend
npm install @radix-ui/react-icons cmdk @radix-ui/react-popover @radix-ui/react-scroll-area
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom @vitejs/plugin-react vitest jsdom @types/node
```

### Agente 2: Production Code Fixer
- Fix `src/app/summarization/page.tsx` (líneas 295, 389)
- Fix `src/components/summarization/DocumentSelector.tsx` (línea 376)
- Fix `src/components/summarization/SummaryCard.tsx` (línea 160)
- Fix `src/components/summarization/SummaryOptions.example.tsx` (línea 4)

### Agente 3: Test Infrastructure Setup
- Crear `src/test/setup.ts`
- Actualizar `vitest.config.ts`
- Actualizar `tsconfig.json`

### Agente 4: Verification Agent
```bash
# Verificar compilación limpia
npx tsc --noEmit

# Ejecutar tests
npm test
```

---

## Checklist de Verificación Final

- [ ] `npm install` ejecutado sin errores
- [ ] `npx tsc --noEmit` retorna 0 errores
- [ ] `npm run build` completa exitosamente
- [ ] `npm test` pasa todos los tests
- [ ] No hay warnings de TypeScript

---

## Orden de Ejecución Recomendado

```
1. FASE 1: Instalar dependencias (npm install)
   └── Reduce errores de 182 a ~12

2. FASE 2: Corregir errores de producción
   └── Reduce errores de ~12 a ~2

3. FASE 3: Configurar testing
   └── Reduce errores de ~2 a 0

4. VERIFICACIÓN FINAL
   └── npx tsc --noEmit = 0 errores
```

---

## Resumen de Archivos a Modificar

| Archivo | Tipo de Cambio | Prioridad |
|---------|---------------|-----------|
| `package.json` | Agregar dependencias | CRÍTICA |
| `src/app/summarization/page.tsx` | Fix tipos | CRÍTICA |
| `src/components/summarization/DocumentSelector.tsx` | Fix undefined | CRÍTICA |
| `src/components/summarization/SummaryCard.tsx` | Fix variante | CRÍTICA |
| `src/components/summarization/SummaryOptions.example.tsx` | Fix import | CRÍTICA |
| `src/components/summarization/SummaryOptions.tsx` | Agregar export | MEDIA |
| `src/test/setup.ts` | Crear nuevo | MEDIA |
| `vitest.config.ts` | Actualizar config | MEDIA |
| `tsconfig.json` | Agregar types | MEDIA |

---

**Generado por:** Multi-Agent Orchestration System
**Fecha:** 2025-12-12
**Versión del Plan:** 1.0
