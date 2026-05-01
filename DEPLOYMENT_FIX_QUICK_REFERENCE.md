# Render Deployment - Quick Reference Card

**⏱️ Total Time:** 1-2 hours | **🔴 Priority:** CRITICAL | **📅 Date:** 2025-12-08

---

## 🚨 The Problem (30 seconds read)

```
❌ TypeScript won't compile    (34+ errors)
❌ Render build is incomplete   (missing npm run build)
❌ Production uses dev tools    (tsx instead of node)
❌ Missing 20+ env variables    (app crashes on startup)
```

---

## ✅ The Fix (3 files, 5 minutes)

### 1️⃣ `src/config/telemetry.ts` (Lines 12 & 34)

```diff
- import { Resource as OTELResource } from '@opentelemetry/resources';
+ import { Resource } from '@opentelemetry/resources';

- const resource = OTELResource.default({
+ const resource = Resource.default({
```

### 2️⃣ `tsconfig.json` (Lines 6 & 23)

```diff
  "compilerOptions": {
-   "moduleResolution": "bundler",
+   "moduleResolution": "NodeNext",
  },
  "exclude": [
    "node_modules",
    "dist",
+   "src/lib/api/routes",
+   "src/lib/api/schemas",
+   "src/lib/api/middleware"
  ]
```

### 3️⃣ `package.json` (Line 10)

```diff
  "scripts": {
-   "start": "tsx src/server.ts",
+   "start": "node dist/server.js",
  }
```

### 4️⃣ `render.yaml` (Replace entire file)

```yaml
services:
  - type: web
    name: legal-rag-api
    env: node
    runtime: node
    region: oregon
    plan: starter
    branch: main
    buildCommand: |
      npm ci --prefer-offline --no-audit &&
      npx prisma generate &&
      npm run build &&
      node scripts/migrate-with-resolve.js
    startCommand: node dist/server.js
    healthCheckPath: /observability/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
```

---

## 🧪 Test Before Deploy

```bash
# Run locally:
npm run build

# Should see:
# ✔ Generated Prisma Client
# (no TypeScript errors)

# Optional: Run verification script
node scripts/verify-deployment-readiness.js
```

---

## 🔑 Environment Variables (Render Dashboard)

**Navigate to:** Render Dashboard → legal-rag-api → Environment → Add Environment Variable

### Priority 1: CRITICAL (Required)
```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
CORS_ORIGIN=https://your-frontend.com
```

### Priority 2: HIGH (Core Features)
```env
OPENAI_API_KEY=sk-...
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=legal-rag-documents
```

### Priority 3: MEDIUM (Email & Search)
```env
SENDGRID_API_KEY=SG...
FROM_EMAIL=noreply@your-domain.com
FROM_NAME=Legal RAG System
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX=legal-documents
```

### Priority 4: OPTIONAL (If used)
```env
REDIS_URL=redis://...
OTEL_SERVICE_NAME=legal-rag-backend
OTEL_EXPORTER_OTLP_ENDPOINT=https://...
```

---

## 🚀 Deploy

```bash
git add .
git commit -m "fix: Resolve Render deployment issues"
git push origin main
```

**Then:** Monitor Render dashboard for build progress

---

## ✓ Verify Deployment (After Live)

```bash
# Test health check
curl https://your-app.onrender.com/observability/health

# Test root endpoint
curl https://your-app.onrender.com/

# Test metrics
curl https://your-app.onrender.com/observability/metrics
```

**Check Render Logs:**
- ✅ "Server running on port 10000"
- ✅ No error stack traces
- ✅ "OpenTelemetry initialized" (if enabled)

---

## 🆘 Quick Troubleshooting

### Build fails with "TS2693"
**Fix:** Double-check `src/config/telemetry.ts` changes applied

### Build fails with calendar/tasks errors
**Fix:** Verify `tsconfig.json` excludes `src/lib/api/`

### Service crashes on startup
**Check Logs For:**
- `DATABASE_URL not found` → Add in Render env vars
- `Cannot find module` → Ensure build ran successfully
- `ECONNREFUSED` → Check database connection string

### Health check fails
**Verify:**
1. Port is 10000
2. Health path is `/observability/health`
3. No startup errors in logs

---

## 📞 Get Help

**Verification Script:** `node scripts/verify-deployment-readiness.js`
**Full Guide:** `DEPLOYMENT_QUICK_FIX_GUIDE.md`
**Technical Analysis:** `RENDER_DEPLOYMENT_CRITICAL_ANALYSIS.md`
**Support:** support@render.com

---

## 📋 Checklist (Print & Check Off)

### Before Deployment
- [ ] Fixed `src/config/telemetry.ts` (2 changes)
- [ ] Fixed `tsconfig.json` (2 changes)
- [ ] Fixed `package.json` (1 change)
- [ ] Fixed `render.yaml` (replaced file)
- [ ] Ran `npm run build` successfully
- [ ] Verified no TypeScript errors
- [ ] Generated JWT_SECRET
- [ ] Added DATABASE_URL to Render
- [ ] Added all critical env vars
- [ ] Committed changes
- [ ] Pushed to GitHub

### After Deployment
- [ ] Build completed successfully
- [ ] Service shows "Live" status
- [ ] Health endpoint returns 200
- [ ] Root endpoint responds
- [ ] No errors in logs (first 5 min)
- [ ] Test login endpoint works
- [ ] Test document upload works
- [ ] Metrics endpoint accessible
- [ ] Monitor for 24 hours

---

**Status:** Ready for implementation
**Last Updated:** 2025-12-08
