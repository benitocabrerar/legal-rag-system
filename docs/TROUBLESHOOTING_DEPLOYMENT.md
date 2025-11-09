# Guía de Solución de Problemas - Deployment Legal RAG System

**Fecha:** 09 de Noviembre, 2025
**Autor:** Documentación Técnica
**Versión:** 1.0

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Problema 1: Error FST_ERR_DUPLICATED_ROUTE](#problema-1-error-fst_err_duplicated_route)
3. [Problema 2: Error 404 en Ruta Raíz](#problema-2-error-404-en-ruta-raíz)
4. [Mejores Prácticas](#mejores-prácticas)
5. [Checklist de Deployment](#checklist-de-deployment)

---

## Resumen Ejecutivo

Durante el deployment del sistema de gestión de usuarios, se encontraron dos problemas principales:

1. **Error de rutas duplicadas** (`FST_ERR_DUPLICATED_ROUTE`) que impedía el inicio de la aplicación
2. **Error 404** al acceder a la URL raíz del API, proporcionando una experiencia de usuario deficiente

Este documento detalla el diagnóstico, solución y prevención de estos problemas.

---

## Problema 1: Error FST_ERR_DUPLICATED_ROUTE

### 🔴 Síntomas

**Error Completo:**
```
FastifyError [Error]: Method 'GET' already declared for route '/api/v1'
    at usageRoutes (/opt/render/project/src/src/routes/usage.ts:13:7)
code: 'FST_ERR_DUPLICATED_ROUTE'
```

**Comportamiento Observado:**
- La aplicación se compila exitosamente
- Las migraciones de base de datos se aplican correctamente
- El servidor falla inmediatamente al iniciar
- El deployment nunca completa exitosamente

### 🔍 Diagnóstico

#### Paso 1: Revisar los Logs de Deployment

```bash
# En Render.com dashboard o usando CLI
render logs --service=legal-rag-api-qnew --lines=100
```

**Buscar en los logs:**
- Mensajes de error que contengan "FST_ERR_DUPLICATED_ROUTE"
- La ubicación exacta del archivo y línea donde ocurre el error
- El método HTTP y la ruta que está duplicada

#### Paso 2: Identificar el Archivo server.ts

**Archivo:** `src/server.ts`

Revisar cómo se registran las rutas:

```typescript
// Register user management routes
await app.register(userRoutes, { prefix: '/api/v1' });
await app.register(subscriptionRoutes, { prefix: '/api/v1' });
await app.register(usageRoutes, { prefix: '/api/v1' });
await app.register(billingRoutes, { prefix: '/api/v1' });
await app.register(settingsRoutes, { prefix: '/api/v1' });
```

**Punto Clave:** Todas las rutas se registran con el prefijo `/api/v1`

#### Paso 3: Revisar los Archivos de Rutas

**Archivos a Revisar:**
- `src/routes/user.ts`
- `src/routes/subscription.ts` ⚠️
- `src/routes/usage.ts` ⚠️
- `src/routes/billing.ts`
- `src/routes/settings.ts`

**Patrón Correcto (user.ts y billing.ts):**
```typescript
export async function userRoutes(app: FastifyInstance) {
  // GET /api/v1/user/profile
  app.get('/user/profile', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // ...
  });
}
```

**Patrón INCORRECTO (subscription.ts y usage.ts):**
```typescript
export async function subscriptionRoutes(app: FastifyInstance) {
  // GET /api/v1/user/subscription - ❌ COMENTARIO DICE UNA COSA
  app.get('/', {  // ❌ CÓDIGO HACE OTRA - CREA /api/v1/
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // ...
  });
}
```

### 🔧 Causa Raíz

**El Problema:**

Cuando Fastify registra una ruta con `prefix: '/api/v1'`:

```typescript
await app.register(subscriptionRoutes, { prefix: '/api/v1' });
```

Y dentro de la función se define una ruta como `'/'`:

```typescript
app.get('/', async (request, reply) => { ... });
```

**Resultado:** La ruta final es `/api/v1/` (prefijo + ruta = `/api/v1` + `/`)

**Conflicto:** Tanto `subscription.ts` como `usage.ts` estaban registrando rutas en `'/'`, creando:
- `GET /api/v1/` desde `subscriptionRoutes`
- `GET /api/v1/` desde `usageRoutes`

Esto genera el error `FST_ERR_DUPLICATED_ROUTE`.

### ✅ Solución

#### Archivo 1: `src/routes/subscription.ts`

**Cambios Realizados:**

```typescript
export async function subscriptionRoutes(app: FastifyInstance) {
  // GET /api/v1/user/subscription - Get current user subscription
  app.get('/user/subscription', {  // ✅ CAMBIO: '/' → '/user/subscription'
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // ... código sin cambios
  });

  // GET /api/v1/user/subscription/plans
  app.get('/user/subscription/plans', async (request, reply) => {
    // ✅ CAMBIO: '/plans' → '/user/subscription/plans'
    // ... código sin cambios
  });

  // POST /api/v1/user/subscription/upgrade
  app.post('/user/subscription/upgrade', {
    // ✅ CAMBIO: '/upgrade' → '/user/subscription/upgrade'
    onRequest: [app.authenticate]
  }, async (request, reply) => {
    // ... código sin cambios
  });

  // POST /api/v1/user/subscription/cancel
  app.post('/user/subscription/cancel', {
    // ✅ CAMBIO: '/cancel' → '/user/subscription/cancel'
    onRequest: [app.authenticate]
  }, async (request, reply) => {
    // ... código sin cambios
  });
}
```

#### Archivo 2: `src/routes/usage.ts`

**Cambios Realizados:**

```typescript
export async function usageRoutes(app: FastifyInstance) {
  // GET /api/v1/user/usage - Get current usage statistics
  app.get('/user/usage', {  // ✅ CAMBIO: '/' → '/user/usage'
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // ... código sin cambios
  });

  // GET /api/v1/user/usage/history - Get usage history
  app.get('/user/usage/history', {
    // ✅ CAMBIO: '/history' → '/user/usage/history'
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // ... código sin cambios
  });

  // POST /api/v1/user/usage/track - Track usage (internal endpoint)
  app.post('/user/usage/track', {
    // ✅ CAMBIO: '/track' → '/user/usage/track'
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // ... código sin cambios
  });
}
```

### 📝 Comandos de Git

```bash
# 1. Hacer staging de los cambios
git add src/routes/subscription.ts src/routes/usage.ts

# 2. Crear commit con mensaje descriptivo
git commit -m "fix: Correct route paths to avoid duplicate route registration

Updated route paths in subscription.ts and usage.ts to use full paths
instead of relative paths to prevent FST_ERR_DUPLICATED_ROUTE error.

Changes:
- subscription.ts: Updated 4 routes
- usage.ts: Updated 3 routes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 3. Push para activar deployment
git push origin main
```

### 🔍 Verificación

**Revisar logs de deployment:**

```bash
# Esperar ~2-3 minutos para el build
# Buscar estos mensajes de éxito:

✅ Build successful 🎉
✅ No pending migrations to apply
✅ Server listening at http://0.0.0.0:8000
🚀 Server running on port 8000
✅ Your service is live 🎉
```

**Señales de Éxito:**
- ✅ No aparece `FST_ERR_DUPLICATED_ROUTE` en los logs
- ✅ El servidor inicia exitosamente
- ✅ El mensaje "Server running on port 8000" aparece
- ✅ El deployment completa con "Your service is live 🎉"

---

## Problema 2: Error 404 en Ruta Raíz

### 🔴 Síntomas

**Comportamiento Observado:**

Al acceder a `https://legal-rag-api-qnew.onrender.com/`:

```
GET https://legal-rag-api-qnew.onrender.com/ 404 (Not Found)
```

**Logs del Servidor:**
```json
{
  "level": 30,
  "reqId": "req-1",
  "msg": "Route GET:/ not found"
}
```

### 🔍 Diagnóstico

**El Problema:**
- No existe ninguna ruta registrada para el path `/`
- Fastify devuelve automáticamente 404 para rutas no encontradas
- Los usuarios que acceden al URL base del API no reciben información útil

**Impacto en UX:**
- ❌ Mala experiencia de usuario
- ❌ No hay información sobre el API
- ❌ No hay guía sobre endpoints disponibles

### ✅ Solución

#### Agregar Ruta Raíz Informativa

**Archivo:** `src/server.ts`

**Ubicación:** Antes de la ruta `/health` y después de los decorators

```typescript
// Root route - API information
app.get('/', async () => {
  return {
    name: 'Legal RAG System API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      documentation: '/api/v1/docs (coming soon)'
    },
    features: [
      'Authentication & OAuth',
      'Case Management',
      'Document Processing',
      'AI Query System',
      'Legal Document Library',
      'User Management & Subscriptions',
      'Billing & Payments',
      'Admin Panel'
    ]
  };
});

// Health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});
```

### 📝 Comandos de Git

```bash
# 1. Hacer staging del cambio
git add src/server.ts

# 2. Crear commit
git commit -m "feat: Add informative root route to API

Added a helpful root route (/) that displays:
- API name and version
- Available endpoints
- List of features

This improves UX by providing useful information when users
access the API URL directly instead of showing a 404 error.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 3. Push para deployment
git push origin main
```

### 🔍 Verificación

**Probar con curl:**

```bash
curl https://legal-rag-api-qnew.onrender.com/
```

**Respuesta Esperada (200 OK):**

```json
{
  "name": "Legal RAG System API",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "/health",
    "api": "/api/v1",
    "documentation": "/api/v1/docs (coming soon)"
  },
  "features": [
    "Authentication & OAuth",
    "Case Management",
    "Document Processing",
    "AI Query System",
    "Legal Document Library",
    "User Management & Subscriptions",
    "Billing & Payments",
    "Admin Panel"
  ]
}
```

**Probar en navegador:**

Visitar: `https://legal-rag-api-qnew.onrender.com/`

**Resultado:** JSON formateado con información del API

---

## Mejores Prácticas

### 🎯 Prevención de Rutas Duplicadas

#### 1. Usar Rutas Completas en Archivos de Rutas

**❌ EVITAR - Rutas Relativas:**

```typescript
// ❌ MAL: Puede causar conflictos con el prefix
export async function myRoutes(app: FastifyInstance) {
  app.get('/', handler);        // Crea /api/v1/
  app.get('/list', handler);    // Crea /api/v1/list
}
```

**✅ RECOMENDADO - Rutas Completas:**

```typescript
// ✅ BIEN: Rutas explícitas y claras
export async function myRoutes(app: FastifyInstance) {
  app.get('/my-resource', handler);           // /api/v1/my-resource
  app.get('/my-resource/list', handler);      // /api/v1/my-resource/list
}
```

#### 2. Alinear Comentarios con Código

**❌ EVITAR:**

```typescript
// GET /api/v1/user/subscription  ← Comentario dice esto
app.get('/', handler);  ← Código hace esto → /api/v1/
```

**✅ RECOMENDADO:**

```typescript
// GET /api/v1/user/subscription  ← Comentario correcto
app.get('/user/subscription', handler);  ← Código correcto
```

#### 3. Revisar Todos los Archivos de Rutas con el Mismo Patrón

Si tienes múltiples archivos de rutas, mantén consistencia:

```typescript
// src/routes/user.ts
app.get('/user/profile', handler);
app.get('/user/settings', handler);

// src/routes/billing.ts
app.get('/billing/invoices', handler);
app.get('/billing/methods', handler);

// src/routes/subscription.ts
app.get('/subscription', handler);         // ❌ Inconsistente
app.get('/user/subscription', handler);    // ✅ Consistente
```

### 🎯 Mejores Prácticas para Rutas

#### 1. Estructura de Carpetas Clara

```
src/
├── routes/
│   ├── auth.ts           → /api/v1/auth/*
│   ├── user.ts           → /api/v1/user/*
│   ├── subscription.ts   → /api/v1/user/subscription/*
│   ├── billing.ts        → /api/v1/billing/*
│   └── admin/
│       ├── users.ts      → /api/v1/admin/users/*
│       └── plans.ts      → /api/v1/admin/plans/*
└── server.ts
```

#### 2. Documentar Rutas en Comentarios

```typescript
/**
 * User Subscription Routes
 * Prefix: /api/v1
 *
 * Routes:
 * - GET    /user/subscription        - Get current subscription
 * - GET    /user/subscription/plans  - List available plans
 * - POST   /user/subscription/upgrade - Upgrade subscription
 * - POST   /user/subscription/cancel  - Cancel subscription
 */
export async function subscriptionRoutes(app: FastifyInstance) {
  // Implementation...
}
```

#### 3. Usar Constantes para Rutas Complejas

```typescript
// routes/constants.ts
export const ROUTES = {
  USER: {
    BASE: '/user',
    PROFILE: '/user/profile',
    SETTINGS: '/user/settings'
  },
  SUBSCRIPTION: {
    BASE: '/user/subscription',
    PLANS: '/user/subscription/plans',
    UPGRADE: '/user/subscription/upgrade',
    CANCEL: '/user/subscription/cancel'
  }
};

// routes/subscription.ts
import { ROUTES } from './constants';

export async function subscriptionRoutes(app: FastifyInstance) {
  app.get(ROUTES.SUBSCRIPTION.BASE, handler);
  app.get(ROUTES.SUBSCRIPTION.PLANS, handler);
  // ...
}
```

### 🎯 Testing de Rutas

#### 1. Test Unitario para Rutas Duplicadas

```typescript
// tests/routes.test.ts
import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';

describe('Route Registration', () => {
  it('should not have duplicate routes', async () => {
    const app = Fastify();

    // Register all routes
    await app.register(userRoutes, { prefix: '/api/v1' });
    await app.register(subscriptionRoutes, { prefix: '/api/v1' });
    await app.register(usageRoutes, { prefix: '/api/v1' });

    // This will throw if there are duplicates
    await app.ready();

    expect(app).toBeDefined();
  });
});
```

#### 2. Verificar Rutas Disponibles

```typescript
// scripts/list-routes.ts
import Fastify from 'fastify';
import { allRoutes } from '../src/routes';

const app = Fastify();

async function listRoutes() {
  await app.register(allRoutes, { prefix: '/api/v1' });
  await app.ready();

  console.log('Available routes:');
  app.printRoutes();
}

listRoutes();
```

**Ejecutar:**
```bash
npx tsx scripts/list-routes.ts
```

---

## Checklist de Deployment

### ✅ Pre-Deployment

- [ ] Todos los tests pasan localmente
- [ ] No hay errores de TypeScript
- [ ] Build local exitoso (`npm run build`)
- [ ] Migraciones probadas localmente
- [ ] Variables de entorno verificadas en Render

### ✅ Durante Deployment

- [ ] Commit pusheado a rama principal
- [ ] Build inicia automáticamente en Render
- [ ] Revisar logs de build en tiempo real
- [ ] Verificar que migraciones se aplican correctamente
- [ ] Confirmar que no hay errores de rutas duplicadas

### ✅ Post-Deployment

- [ ] El servidor inicia exitosamente
- [ ] Mensaje "Your service is live 🎉" aparece
- [ ] Probar endpoint raíz: `curl https://api-url.com/`
- [ ] Probar health check: `curl https://api-url.com/health`
- [ ] Probar endpoints críticos del API
- [ ] Verificar métricas en Render dashboard

### 🔍 Comandos de Diagnóstico Rápido

```bash
# 1. Ver logs en tiempo real
render logs --service=legal-rag-api-qnew --tail

# 2. Ver estado del servicio
render services list

# 3. Ver detalles del último deployment
render deploys list --service=legal-rag-api-qnew --limit=1

# 4. Probar API localmente
curl http://localhost:8000/
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/user/subscription

# 5. Probar API en producción
curl https://legal-rag-api-qnew.onrender.com/
curl https://legal-rag-api-qnew.onrender.com/health
```

---

## Solución Rápida de Emergencia

Si encuentras el error `FST_ERR_DUPLICATED_ROUTE` en producción:

### Paso 1: Identificar Rutas Duplicadas (2 minutos)

```bash
# Buscar todas las definiciones de rutas
grep -r "app.get('/'," src/routes/
grep -r "app.post('/'," src/routes/
```

### Paso 2: Corregir Archivos (5 minutos)

Para cada archivo que tenga `app.get('/',`:

1. Identificar el comentario que documenta la ruta
2. Usar el path del comentario en el código
3. Asegurarse de que el path comienza con `/`

### Paso 3: Deploy de Emergencia (1 minuto)

```bash
git add src/routes/*.ts
git commit -m "fix: Resolve duplicate route error"
git push origin main
```

### Paso 4: Monitorear (3 minutos)

```bash
# Esperar 2-3 minutos y verificar logs
render logs --service=legal-rag-api-qnew --tail
```

**Tiempo total de resolución:** ~10 minutos

---

## Contacto y Soporte

**Documentación Adicional:**
- Fastify Routing: https://www.fastify.io/docs/latest/Reference/Routes/
- Render.com Logs: https://render.com/docs/logs

**Para Reportar Problemas:**
- GitHub Issues del proyecto
- Slack: #engineering-support

---

**Última actualización:** 09 de Noviembre, 2025
**Próxima revisión:** Después de cada deployment problemático
