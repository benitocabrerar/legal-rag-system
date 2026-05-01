# Render Deployment - Quick Fix Implementation Guide

**Estimated Time:** 2-4 hours
**Priority:** 🔴 CRITICAL
**Status:** Ready to implement

---

## Step-by-Step Fix Procedure

### ✅ STEP 1: Fix TypeScript Compilation (15 minutes)

#### 1.1 Fix OpenTelemetry Import
```bash
# Open the file
code src/config/telemetry.ts
```

**Line 12 - Change:**
```typescript
// FROM:
import { Resource as OTELResource } from '@opentelemetry/resources';

// TO:
import { Resource } from '@opentelemetry/resources';
```

**Line 34 - Change:**
```typescript
// FROM:
const resource = OTELResource.default({

// TO:
const resource = Resource.default({
```

#### 1.2 Exclude Unused Routes
```bash
# Open the file
code tsconfig.json
```

**Add to exclude array:**
```json
{
  "compilerOptions": {
    // ... existing
  },
  "include": ["src/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    "src/lib/api/routes",    // ADD THIS
    "src/lib/api/schemas",   // ADD THIS
    "src/lib/api/middleware" // ADD THIS
  ]
}
```

#### 1.3 Fix Module Resolution
**In tsconfig.json, change line 6:**
```json
{
  "compilerOptions": {
    "moduleResolution": "NodeNext"  // CHANGE FROM "bundler"
  }
}
```

#### 1.4 Verify Build
```bash
npm run build
```

**Expected output:**
```
✔ Generated Prisma Client
✔ TypeScript compilation successful
(no errors)
```

---

### ✅ STEP 2: Update Deployment Configuration (10 minutes)

#### 2.1 Update package.json
```bash
code package.json
```

**Change line 10:**
```json
{
  "scripts": {
    "start": "node dist/server.js",  // CHANGE FROM "tsx src/server.ts"
  }
}
```

#### 2.2 Update render.yaml
```bash
code render.yaml
```

**Replace entire file:**
```yaml
services:
  - type: web
    name: legal-rag-api
    env: node
    runtime: node
    region: oregon
    plan: starter
    branch: main

    # Build: Install, generate Prisma, compile TypeScript, run migrations
    buildCommand: |
      npm ci --prefer-offline --no-audit &&
      npx prisma generate &&
      npm run build &&
      node scripts/migrate-with-resolve.js

    # Start: Use compiled JavaScript
    startCommand: node dist/server.js

    # Health check endpoint
    healthCheckPath: /observability/health

    envVars:
      - key: NODE_ENV
        value: production

      - key: PORT
        value: 10000
```

---

### ✅ STEP 3: Configure Environment Variables (30 minutes)

#### 3.1 Access Render Dashboard
1. Go to https://dashboard.render.com
2. Select your service: `legal-rag-api`
3. Click **Environment** tab
4. Click **Add Environment Variable**

#### 3.2 Add Required Variables

**Copy this checklist - add each one:**

```env
# ✅ Core Configuration
NODE_ENV=production
PORT=10000

# ✅ Database (Get from Render PostgreSQL dashboard)
DATABASE_URL=postgresql://user:password@host.oregon-postgres.render.com:5432/database?sslmode=require

# ✅ Authentication
JWT_SECRET=<GENERATE_RANDOM_32_CHARS>
CORS_ORIGIN=https://your-frontend-domain.com

# ✅ OpenAI API
OPENAI_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-ada-002
EMBEDDING_DIMENSIONS=1536

# ✅ AWS S3 Storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=legal-rag-documents

# ✅ Email Service (SendGrid)
SENDGRID_API_KEY=SG....
FROM_EMAIL=noreply@your-domain.com
FROM_NAME=Legal RAG System

# ✅ Redis Cache (if using)
REDIS_URL=redis://default:password@host:port

# ✅ Pinecone Vector Database
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX=legal-documents

# ⚠️ Optional: OpenTelemetry (leave blank to disable)
OTEL_SERVICE_NAME=legal-rag-backend
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-collector:4318
```

#### 3.3 Generate JWT Secret
```bash
# Run this locally to generate a secure random secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Copy the output and use it as JWT_SECRET**

---

### ✅ STEP 4: Re-enable OpenTelemetry (5 minutes)

```bash
code src/server.ts
```

**Lines 1-5, uncomment and update:**
```typescript
// BEFORE:
// import { initializeTelemetry } from './config/telemetry.js';
// initializeTelemetry();

// AFTER:
import { initializeTelemetry } from './config/telemetry.js';

// Only initialize if OTEL endpoint is configured
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  initializeTelemetry();
}
```

---

### ✅ STEP 5: Deploy to Render (5 minutes)

#### 5.1 Commit Changes
```bash
git add .
git status  # Verify changes

git commit -m "fix: Resolve Render deployment issues

- Fix OpenTelemetry Resource import (TS2693 error)
- Exclude unused lib/api routes from compilation
- Change moduleResolution from 'bundler' to 'NodeNext'
- Update build command to compile TypeScript
- Change start command from tsx to node
- Update render.yaml with proper build configuration
- Re-enable OpenTelemetry with environment check
- Add comprehensive environment variable documentation

Fixes #[issue-number]"
```

#### 5.2 Push to GitHub
```bash
git push origin main
```

#### 5.3 Monitor Deployment
1. Go to Render dashboard
2. Watch the build logs
3. Look for: `✅ Build successful`
4. Wait for: `✅ Live`

---

### ✅ STEP 6: Verify Deployment (15 minutes)

#### 6.1 Check Health Endpoint
```bash
curl https://legal-rag-api.onrender.com/observability/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-08T...",
  "uptime": 123,
  "environment": "production"
}
```

#### 6.2 Check Metrics Endpoint
```bash
curl https://legal-rag-api.onrender.com/observability/metrics
```

**Expected:** Prometheus metrics output

#### 6.3 Check Root Endpoint
```bash
curl https://legal-rag-api.onrender.com/
```

**Expected:**
```json
{
  "name": "Legal RAG System API",
  "version": "1.0.0",
  "status": "running",
  "endpoints": { ... }
}
```

#### 6.4 Check Logs
In Render dashboard:
1. Go to **Logs** tab
2. Look for:
   - ✅ `Server running on port 10000`
   - ✅ `OpenTelemetry initialized successfully` (if enabled)
   - ✅ No error stack traces

---

## Troubleshooting Common Issues

### Issue: Build Fails with TypeScript Errors

**Check:**
```bash
# Run locally first
npm run build
```

**If errors:**
1. Verify `tsconfig.json` changes applied
2. Verify `src/config/telemetry.ts` import fixed
3. Check if `src/lib/api/` excluded

### Issue: Server Crashes on Startup

**Check Render logs for:**
```
Error: Cannot find module './config/telemetry.js'
```

**Fix:** Ensure `.js` extension in import (already correct in code)

**Check for:**
```
Error: connect ECONNREFUSED (database)
```

**Fix:** Verify `DATABASE_URL` environment variable is set correctly

### Issue: Health Check Fails

**Render shows:** Service unavailable

**Check:**
1. Is port 10000 exposed? (Render default)
2. Is health endpoint path correct? (`/observability/health`)
3. Check logs for startup errors

### Issue: OpenTelemetry Errors

**Logs show:**
```
Failed to initialize OpenTelemetry: ...
```

**Fix:** Either:
1. Remove `OTEL_EXPORTER_OTLP_ENDPOINT` env var (disables OTEL)
2. Or configure proper OTLP collector endpoint

---

## Rollback Procedure

If deployment fails and you need to rollback:

### Option 1: Revert Git Commit
```bash
git revert HEAD
git push origin main
```

### Option 2: Disable Features
**Quick disable OpenTelemetry:**
```typescript
// src/server.ts
// Comment out lines 1-5 again
```

**Quick disable unused routes:**
```json
// tsconfig.json
// Add more to exclude
```

---

## Post-Deployment Checklist

- [ ] Health endpoint responds with 200 OK
- [ ] Metrics endpoint returns Prometheus format
- [ ] Root endpoint returns API info
- [ ] No errors in Render logs (first 5 minutes)
- [ ] Database connectivity confirmed
- [ ] S3 uploads work (test upload endpoint)
- [ ] Authentication works (test login)
- [ ] OpenTelemetry metrics exported (if enabled)
- [ ] Response times < 500ms
- [ ] Memory usage stable (< 80% of 512MB)

---

## Next Steps After Successful Deployment

### Week 1
- [ ] Monitor error rates
- [ ] Set up log aggregation
- [ ] Configure alerting
- [ ] Performance baseline

### Week 2
- [ ] Re-enable enhanced document routes
- [ ] Add API documentation endpoint
- [ ] Security audit
- [ ] Load testing

### Month 1
- [ ] Cost analysis
- [ ] Right-size instance
- [ ] Optimize database queries
- [ ] Implement caching strategy

---

## Emergency Contacts

**Render Support:** support@render.com
**Documentation:** https://render.com/docs

---

## Version History

- **v1.0** - 2025-12-08 - Initial quick fix guide
- **Status:** Ready for implementation
