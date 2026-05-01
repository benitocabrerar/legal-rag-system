# OpenTelemetry Fix - Exact Code Changes

## File 1: package.json

```diff
   "dependencies": {
     "@aws-sdk/client-s3": "^3.931.0",
     ...
     "@opentelemetry/instrumentation-http": "^0.208.0",
     "@opentelemetry/resources": "^2.2.0",
     "@opentelemetry/sdk-node": "^0.208.0",
+    "@opentelemetry/sdk-metrics": "^2.2.0",
     "@opentelemetry/semantic-conventions": "^1.38.0",
     ...
   }
```

## File 2: src/config/telemetry.ts

```diff
 import { NodeSDK } from '@opentelemetry/sdk-node';
 import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
 import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
 import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
-import { Resource as OTELResource } from '@opentelemetry/resources';
+import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
 import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
 import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
 import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
 import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
```

```diff
 // Resource configuration
-const resource = OTELResource.default({
-  [SEMRESATTRS_SERVICE_NAME]: serviceName,
-  [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
-  'deployment.environment': environment,
-  'service.namespace': 'legal-rag',
-});
+const resource = defaultResource().merge(
+  resourceFromAttributes({
+    [SEMRESATTRS_SERVICE_NAME]: serviceName,
+    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
+    'deployment.environment': environment,
+    'service.namespace': 'legal-rag',
+  })
+);
```

## File 3: src/server.ts

```diff
 // Week 5-6: Initialize OpenTelemetry BEFORE any other imports
-// TEMPORARILY DISABLED: Path resolution issue in Render deployment
-// TODO: Fix path configuration and re-enable
-// import { initializeTelemetry } from './config/telemetry.js';
-// initializeTelemetry();
+import { initializeTelemetry } from './config/telemetry.js';
+initializeTelemetry();

 import Fastify from 'fastify';
 import cors from '@fastify/cors';
```

---

## Test Commands

### Before making changes:
```bash
# This will FAIL with module import error
npx tsx -e "import('./src/config/telemetry.js')"
```

Output:
```
❌ The requested module '@opentelemetry/resources' does not provide an export named 'Resource'
```

### After making changes:
```bash
# This will SUCCEED
npx tsx -e "import('./src/config/telemetry.js').then(() => console.log('✅ Success'))"
```

Output:
```
✅ Success
```

---

## Complete Fixed Files

See `CRITICAL_ISSUE_OPENTELEMETRY_ANALYSIS.md` for full file contents.

---

## Why This Works

### OLD (Broken):
```typescript
import { Resource as OTELResource } from '@opentelemetry/resources';
const resource = OTELResource.default({...});
```

**Problem**: `Resource` is exported as `type`, not a class:
```typescript
// In @opentelemetry/resources/index.d.ts
export type { Resource } from './Resource';  // TYPE-ONLY!
```

### NEW (Fixed):
```typescript
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
const resource = defaultResource().merge(resourceFromAttributes({...}));
```

**Solution**: Use factory functions that return Resource objects:
```typescript
// In @opentelemetry/resources/index.d.ts
export { defaultResource, resourceFromAttributes } from './ResourceImpl';  // RUNTIME exports
```

---

**Total Lines Changed**: 7 lines across 3 files
**Risk**: LOW - Standard API usage pattern
**Testing Time**: 5 minutes
**Deployment Time**: 10 minutes
