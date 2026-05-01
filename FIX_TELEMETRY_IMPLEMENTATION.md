# Quick Implementation Guide: Fix OpenTelemetry

**Priority**: HIGH - Production observability gap
**Time Required**: 15 minutes
**Risk Level**: LOW (easily reversible)

---

## Quick Fix Steps

### Step 1: Update package.json (2 minutes)

Add this line to `dependencies` section:

```json
"@opentelemetry/sdk-metrics": "^2.2.0"
```

Then run:
```bash
npm install
```

### Step 2: Fix src/config/telemetry.ts (5 minutes)

**Line 12-13**: Change imports
```typescript
// OLD (BROKEN):
import { Resource as OTELResource } from '@opentelemetry/resources';

// NEW (FIXED):
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
```

**Line 34-39**: Change resource creation
```typescript
// OLD (BROKEN):
const resource = OTELResource.default({
  [SEMRESATTRS_SERVICE_NAME]: serviceName,
  [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
  'deployment.environment': environment,
  'service.namespace': 'legal-rag',
});

// NEW (FIXED):
const resource = defaultResource().merge(
  resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    'deployment.environment': environment,
    'service.namespace': 'legal-rag',
  })
);
```

### Step 3: Re-enable in src/server.ts (1 minute)

**Line 1-5**: Uncomment telemetry initialization
```typescript
// OLD (DISABLED):
// import { initializeTelemetry } from './config/telemetry.js';
// initializeTelemetry();

// NEW (ENABLED):
import { initializeTelemetry } from './config/telemetry.js';
initializeTelemetry();
```

### Step 4: Test Locally (5 minutes)

```bash
# Test 1: Verify import works
npx tsx -e "import('./src/config/telemetry.js').then(() => console.log('✅ OK')).catch(e => console.error('❌ FAILED:', e.message))"

# Test 2: Start server
npm run dev

# Expected output:
# ✅ OpenTelemetry initialized successfully
# 🚀 Server running on port 8000
```

### Step 5: Commit & Deploy (2 minutes)

```bash
git add .
git commit -m "fix: Enable OpenTelemetry with correct Resource API usage"
git push origin main
```

---

## One-Liner Verification

```bash
npx tsx -e "import('./src/config/telemetry.js').then(() => console.log('✅ Telemetry OK')).catch(e => console.error('❌ Error:', e.message))"
```

---

## Rollback (if needed)

```bash
# Option 1: Git revert
git revert HEAD
git push origin main

# Option 2: Disable via code (src/server.ts)
# Comment out:
# import { initializeTelemetry } from './config/telemetry.js';
# initializeTelemetry();
```

---

## What This Fixes

✅ Eliminates module import error
✅ Re-enables distributed tracing
✅ Restores request/response metrics
✅ Enables database query monitoring
✅ Restores AI API call tracing

---

**Root Cause**: `Resource` is a TypeScript type, not a runtime class. Must use `defaultResource()` and `resourceFromAttributes()` functions instead.

**See Full Analysis**: `CRITICAL_ISSUE_OPENTELEMETRY_ANALYSIS.md`
