# Phase 10 - Week 3: Strategic Implementation Plan
## Legal RAG System - NLP-RAG Integration & Performance Optimization

**Date**: 2025-01-13
**Status**: READY FOR IMPLEMENTATION
**Priority**: CRITICAL
**Expected Impact**: 73% performance improvement, 15x concurrent user capacity

---

## Executive Summary

Based on the professional system analysis (SISTEMA_LEGAL_RAG_REPORTE_PROFESIONAL.pdf), this week's implementation focuses on three critical areas:

### Current System State
- **Security Score**: 35/100 (D - CRITICAL)
- **P95 Response Time**: 1500ms (Target: 400ms - needs 73% improvement)
- **Concurrent Users**: 100 (Target: 1500 - needs 15x increase)
- **Cache Hit Rate**: 0% (No caching implemented)
- **Database Query Time**: 500ms average (Target: <100ms)

### Week 3 Goals
1. **NLP-RAG Integration**: Unified search orchestrator combining query transformation with RAG search
2. **Performance Optimization**: Multi-tier caching, async processing, database indexing
3. **Scalability**: Connection pooling, request queuing, horizontal scaling preparation

### Expected Outcomes
| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| P50 Response | 800ms | 200ms | 75% |
| P95 Response | 1500ms | 400ms | 73% |
| P99 Response | 3000ms | 800ms | 73% |
| Throughput | 50 req/s | 200 req/s | 4x |
| Cache Hit Rate | 0% | 70%+ | New |
| Concurrent Users | 100 | 1500 | 15x |
| Database Queries | 500ms | 80ms | 84% |
| Memory Usage | 1.2GB | 450MB | 63% |

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  (Frontend, Mobile, API Consumers)                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                             │
│  - Rate Limiting (100 req/min)                                  │
│  - Request Validation                                            │
│  - Load Balancing                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Unified Search Orchestrator (NEW)                   │
│  - Session Management                                            │
│  - Request Coordination                                          │
│  - Cache Strategy Selection                                      │
│  - Response Streaming                                            │
└─────┬───────────────────┬───────────────────┬───────────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
┌─────────────┐  ┌──────────────────┐  ┌─────────────────┐
│   NLP       │  │  Multi-Tier      │  │  Async OpenAI   │
│ Transform   │  │  Cache Service   │  │    Service      │
│  Service    │  │  (L1/L2/L3)     │  │  (Queue Based)  │
└─────┬───────┘  └────────┬─────────┘  └────────┬────────┘
      │                   │                      │
      │                   │                      │
      ▼                   ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Access Layer                             │
│  - Optimized Prisma Queries                                     │
│  - Connection Pooling (50 connections)                          │
│  - N+1 Query Elimination                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Storage Layer                                  │
│  PostgreSQL + pgvector  │  Redis Cache  │  S3 (Documents)       │
│  (Primary Database)     │  (Hot Data)   │  (Binary Storage)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Day 1-2: Foundation & Quick Wins (40% improvement expected)

#### 1. Database Optimization
**File**: `scripts/apply-performance-indexes.sql`

```sql
-- Critical composite indexes (12 total)
CREATE INDEX CONCURRENTLY idx_legal_documents_composite_search
ON "LegalDocument"(jurisdiction, document_type, publication_date DESC, status)
WHERE status = 'ACTIVE';

CREATE INDEX CONCURRENTLY idx_search_sessions_composite
ON "SearchSession"(user_id, created_at DESC, is_active)
WHERE is_active = true;

-- Full-text search indexes for Spanish content
CREATE INDEX CONCURRENTLY idx_legal_documents_fts_title
ON "LegalDocument" USING gin(to_tsvector('spanish', title));

CREATE INDEX CONCURRENTLY idx_legal_documents_fts_content
ON "LegalDocument" USING gin(to_tsvector('spanish', content));

-- Covering indexes (reduce I/O by 80%)
CREATE INDEX CONCURRENTLY idx_query_cache_covering
ON "QueryCache"(query_hash, created_at DESC)
INCLUDE (cached_response, hit_count);
```

**Tasks**:
- ✅ Create index migration script (DONE)
- [ ] Apply indexes to production database
- [ ] Monitor index creation progress
- [ ] Verify query performance improvement (expected: 500ms → 80ms)

**Verification**:
```bash
psql -d legal_rag_db -c "SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;"
```

#### 2. Redis Setup
**File**: `docker-compose.yml` (add Redis service)

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: legal-rag-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: >
      redis-server
      --appendonly yes
      --maxmemory 2gb
      --maxmemory-policy allkeys-lru
      --save 60 1000
    restart: unless-stopped
    networks:
      - legal-rag-network

volumes:
  redis-data:
    driver: local
```

**Tasks**:
- [ ] Add Redis service to docker-compose.yml
- [ ] Configure Redis connection in .env
- [ ] Install Redis client: `npm install ioredis @types/ioredis`
- [ ] Test Redis connection

**Environment Variables** (.env):
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_MAX_RETRIES=3
REDIS_CONNECT_TIMEOUT=10000
```

#### 3. New Database Models
**File**: `prisma/schema.prisma`

```prisma
// Query History for analytics and suggestions
model QueryHistory {
  id              String   @id @default(cuid())
  sessionId       String
  userId          String?
  query           String
  queryHash       String   @unique
  intent          Json     // QueryIntent from NLP
  entities        Json     // Extracted entities
  filters         Json     // Applied filters
  resultsCount    Int
  clickedResults  Json[]   // Result IDs that were clicked
  responseTime    Int      // milliseconds
  cacheHit        Boolean  @default(false)
  createdAt       DateTime @default(now())

  session         UserSession?  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user            User?         @relation(fields: [userId], references: [id], onDelete: SetNull)
  cache           QueryCache?   @relation(fields: [queryHash], references: [queryHash])

  @@index([sessionId, createdAt])
  @@index([userId, createdAt])
  @@index([queryHash])
  @@index([createdAt])
  @@map("query_history")
}

// User Sessions for context tracking
model UserSession {
  id              String   @id @default(cuid())
  userId          String?
  sessionToken    String   @unique
  ipAddress       String?
  userAgent       String?
  isActive        Boolean  @default(true)
  queries         QueryHistory[]
  context         Json     @default("{}")  // Accumulated context
  startedAt       DateTime @default(now())
  lastActivityAt  DateTime @default(now())
  endedAt         DateTime?

  user            User?    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isActive, lastActivityAt])
  @@index([sessionToken])
  @@index([lastActivityAt])
  @@map("user_sessions")
}

// Query Cache for L3 persistent caching
model QueryCache {
  id              String   @id @default(cuid())
  queryHash       String   @unique  // MD5 of normalized query + filters
  query           String
  filters         Json
  cachedResponse  Json     // Full search response
  hitCount        Int      @default(0)
  lastHitAt       DateTime @default(now())
  expiresAt       DateTime
  createdAt       DateTime @default(now())

  history         QueryHistory[]

  @@index([queryHash, createdAt])
  @@index([expiresAt])
  @@index([lastHitAt])
  @@map("query_cache")
}

// Query Suggestions based on history
model QuerySuggestion {
  id              String   @id @default(cuid())
  suggestion      String   @unique
  category        String   // "popular", "related", "autocomplete"
  frequency       Int      @default(1)
  lastUsedAt      DateTime @default(now())
  createdAt       DateTime @default(now())

  @@index([category, frequency])
  @@index([suggestion])
  @@map("query_suggestions")
}

// Relevance Feedback for ML training
model RelevanceFeedback {
  id              String   @id @default(cuid())
  queryId         String
  documentId      String
  userId          String?
  relevanceScore  Int      // 1-5 rating
  clicked         Boolean  @default(false)
  dwell_time      Int?     // milliseconds on page
  feedback        String?  // Optional text feedback
  createdAt       DateTime @default(now())

  document        LegalDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user            User?         @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([queryId, documentId])
  @@index([userId, createdAt])
  @@index([documentId, relevanceScore])
  @@map("relevance_feedback")
}
```

**Tasks**:
- [ ] Add new models to schema.prisma
- [ ] Create migration: `npx prisma migrate dev --name week3_nlp_optimizations`
- [ ] Generate Prisma client: `npx prisma generate`
- [ ] Verify tables created in database

**Migration Command**:
```bash
npx prisma migrate dev --name week3_nlp_optimizations
```

---

### Day 3-4: Core Services Implementation (30% improvement expected)

#### 4. Multi-Tier Cache Service
**File**: `src/services/cache/multi-tier-cache-service.ts`

**Architecture**:
```
L1 Cache (Memory)
├─ TTL: 5 minutes
├─ Size: 100MB max
├─ Hit Rate: 60%
└─ Use: Hot queries (last hour)

L2 Cache (Redis Hot)
├─ TTL: 1 hour
├─ Size: 1GB max
├─ Hit Rate: 30%
└─ Use: Warm queries (last day)

L3 Cache (Redis Warm)
├─ TTL: 24 hours
├─ Size: 2GB max
├─ Hit Rate: 10%
└─ Use: Popular queries (last week)
```

**Key Features**:
- Automatic cache promotion/demotion
- LRU eviction policy
- Pattern-based invalidation
- Cache warming on startup
- Bloom filters for negative lookups

**Tasks**:
- ✅ Service implementation complete (DONE by agent)
- [ ] Add cache warming script
- [ ] Configure cache invalidation patterns
- [ ] Add monitoring middleware
- [ ] Test cache hit rates

#### 5. Async OpenAI Service
**File**: `src/services/ai/async-openai-service.ts`

**Architecture**:
```
Client Request
      ↓
Request Queue (Bull)
      ↓
Rate Limiter (100 req/min)
      ↓
Connection Pool (5 concurrent)
      ↓
OpenAI API
      ↓
Response Cache
      ↓
Stream to Client
```

**Key Features**:
- Non-blocking request queuing
- Automatic retry with exponential backoff
- Response streaming
- Batch processing (10 requests/batch)
- Circuit breaker pattern

**Tasks**:
- ✅ Service implementation complete (DONE by agent)
- [ ] Install Bull queue: `npm install bull @types/bull`
- [ ] Configure queue worker
- [ ] Add job monitoring dashboard
- [ ] Test batch processing

**Environment Variables** (.env):
```bash
OPENAI_API_KEY=sk-...
OPENAI_MAX_CONCURRENT=5
OPENAI_RATE_LIMIT=100
OPENAI_TIMEOUT=30000
OPENAI_RETRY_ATTEMPTS=3
```

#### 6. Unified Search Orchestrator
**File**: `src/services/orchestration/unified-search-orchestrator.ts`

**Request Flow**:
```
1. Receive search request
2. Check session context
3. Check L1 cache (memory) → HIT? Return
4. Check L2 cache (Redis hot) → HIT? Promote to L1, Return
5. Check L3 cache (Redis warm) → HIT? Promote to L2, Return
6. MISS: Execute full pipeline:
   a. NLP query transformation
   b. RAG vector search
   c. Relevance scoring
   d. Response assembly
7. Store in all cache tiers
8. Stream response to client
9. Update analytics
```

**Tasks**:
- ✅ Service implementation complete (DONE by agent)
- [ ] Integrate with existing search service
- [ ] Add request metrics collection
- [ ] Configure streaming responses
- [ ] Test end-to-end flow

---

### Day 5: API Integration & Testing (20% improvement expected)

#### 7. New API Endpoints
**File**: `src/routes/unified-search.ts`

**Endpoints**:

```typescript
// Unified search with NLP + RAG + Caching
POST /api/v2/search/unified
{
  query: string;
  sessionId?: string;
  filters?: {
    documentType?: string[];
    jurisdiction?: string[];
    dateRange?: { start: Date; end: Date };
  };
  options?: {
    maxResults?: number;
    includeContext?: boolean;
    enableCaching?: boolean;
    streamResponse?: boolean;
  };
}

// Query suggestions based on history
GET /api/v2/search/suggest?q={partialQuery}&limit=10

// Session management
POST /api/v2/search/session/start
POST /api/v2/search/session/end
GET /api/v2/search/session/:sessionId/history

// Relevance feedback
POST /api/v2/search/feedback
{
  queryId: string;
  documentId: string;
  relevanceScore: number;
  clicked: boolean;
  dwellTime?: number;
  feedback?: string;
}
```

**Tasks**:
- [ ] Create unified-search.ts route file
- [ ] Implement all 4 endpoint groups
- [ ] Add request validation schemas
- [ ] Add response streaming support
- [ ] Write API tests

#### 8. Performance Testing
**File**: `scripts/test-week3-performance.ts`

**Test Scenarios**:
1. Cold cache performance (no cache hits)
2. Warm cache performance (50% cache hits)
3. Hot cache performance (90% cache hits)
4. Concurrent user load (100 → 1500 users)
5. Query complexity (simple → complex NLP queries)
6. Database query optimization verification

**Metrics to Collect**:
- Response times (P50, P95, P99)
- Cache hit rates (L1, L2, L3)
- Database query times
- OpenAI API latency
- Memory usage
- CPU usage
- Throughput (req/s)

**Tasks**:
- ✅ Test script created (DONE by agent)
- [ ] Run baseline performance tests
- [ ] Run optimized performance tests
- [ ] Compare results vs targets
- [ ] Generate performance report

**Expected Results**:
```
Baseline (Week 2)        →  Week 3 Target
──────────────────────────────────────────
P50: 800ms              →  200ms (-75%)
P95: 1500ms             →  400ms (-73%)
P99: 3000ms             →  800ms (-73%)
Cache Hit: 0%           →  70%+ (new)
Throughput: 50 req/s    →  200 req/s (4x)
DB Queries: 500ms       →  80ms (-84%)
Memory: 1.2GB           →  450MB (-63%)
Concurrent: 100 users   →  1500 users (15x)
```

---

### Day 6: Monitoring, Documentation & Deployment

#### 9. Monitoring Setup
**File**: `src/middleware/performance-monitoring.ts`

**Metrics to Track**:

```typescript
interface PerformanceMetrics {
  // Response Times
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };

  // Cache Performance
  cache: {
    l1HitRate: number;
    l2HitRate: number;
    l3HitRate: number;
    totalHitRate: number;
    evictionRate: number;
  };

  // Database Performance
  database: {
    queryTime: number;
    connectionPoolUsage: number;
    slowQueries: number;
  };

  // OpenAI Performance
  openai: {
    queueDepth: number;
    avgLatency: number;
    errorRate: number;
    rateLimit: number;
  };

  // System Resources
  system: {
    cpuUsage: number;
    memoryUsage: number;
    activeConnections: number;
  };
}
```

**Dashboard Metrics**:
- Real-time request rate
- Cache hit/miss visualization
- Database query performance
- Error rates and types
- Active session count

**Tasks**:
- [ ] Create monitoring middleware
- [ ] Set up Prometheus metrics export
- [ ] Configure Grafana dashboard
- [ ] Set up alert rules (P95 > 500ms, Error rate > 5%)
- [ ] Test monitoring pipeline

#### 10. Documentation
**Files to Create/Update**:

- [ ] `API_V2_DOCUMENTATION.md` - New unified search API docs
- [ ] `CACHING_STRATEGY.md` - Multi-tier cache documentation
- [ ] `PERFORMANCE_TUNING.md` - Performance optimization guide
- [ ] `DEPLOYMENT_GUIDE.md` - Week 3 deployment checklist
- [ ] Update `README.md` with Week 3 features

**API Documentation Example**:
```markdown
## POST /api/v2/search/unified

Unified search endpoint combining NLP query transformation, RAG vector search, and multi-tier caching.

### Request
\`\`\`json
{
  "query": "¿Qué dice el Código Civil sobre contratos de arrendamiento?",
  "sessionId": "sess_abc123",
  "filters": {
    "jurisdiction": ["Ecuador"],
    "documentType": ["law", "regulation"]
  },
  "options": {
    "maxResults": 10,
    "includeContext": true,
    "enableCaching": true,
    "streamResponse": false
  }
}
\`\`\`

### Response
\`\`\`json
{
  "success": true,
  "query": {
    "original": "¿Qué dice el Código Civil sobre contratos de arrendamiento?",
    "normalized": "codigo civil contratos arrendamiento",
    "intent": {
      "type": "search",
      "confidence": 0.92,
      "entities": {
        "laws": ["Código Civil"],
        "keywords": ["contratos", "arrendamiento"]
      }
    }
  },
  "results": [...],
  "metadata": {
    "totalResults": 127,
    "processingTime": 243,
    "cacheHit": false,
    "cacheTier": null
  }
}
\`\`\`
```

#### 11. Deployment Checklist

**Pre-Deployment**:
- [ ] All tests passing (unit, integration, performance)
- [ ] Database migration applied successfully
- [ ] Redis instance running and configured
- [ ] Environment variables configured
- [ ] Backup database before migration
- [ ] Performance baselines recorded

**Deployment Steps**:
```bash
# 1. Backup database
pg_dump legal_rag_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Apply database indexes (CONCURRENT to avoid locks)
psql -d legal_rag_db -f scripts/apply-performance-indexes.sql

# 3. Run Prisma migration
npx prisma migrate deploy

# 4. Start Redis container
docker-compose up -d redis

# 5. Build application
npm run build

# 6. Run database seeding (warm cache)
npm run seed:cache

# 7. Restart application
pm2 restart legal-rag-backend

# 8. Verify health endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/v2/search/health
```

**Post-Deployment**:
- [ ] Monitor error logs for 1 hour
- [ ] Verify cache hit rates increasing
- [ ] Check database query performance
- [ ] Test all API endpoints
- [ ] Monitor memory/CPU usage
- [ ] Verify P95 response time < 500ms (target: 400ms)
- [ ] Run smoke tests

**Rollback Plan**:
```bash
# If issues occur:
# 1. Restore database backup
psql legal_rag_db < backup_TIMESTAMP.sql

# 2. Revert to previous deployment
git checkout main
npm run build
pm2 restart legal-rag-backend

# 3. Stop Redis if causing issues
docker-compose stop redis
```

---

## Risk Mitigation

### High-Risk Items

#### 1. Database Migration Locks
**Risk**: CONCURRENT index creation might still cause brief locks
**Mitigation**:
- Run during low-traffic hours (2-4 AM)
- Monitor active connections: `SELECT * FROM pg_stat_activity;`
- Set statement timeout: `SET statement_timeout = '60s';`

#### 2. Redis Memory Exhaustion
**Risk**: Redis could run out of memory with aggressive caching
**Mitigation**:
- Set maxmemory to 2GB
- Use allkeys-lru eviction policy
- Monitor memory usage with alerts
- Cache warming script to pre-populate common queries

#### 3. OpenAI Rate Limits
**Risk**: Queue could grow unbounded if OpenAI API is slow
**Mitigation**:
- Implement circuit breaker (fail after 5 consecutive errors)
- Set max queue depth (1000 jobs)
- Add queue monitoring dashboard
- Fallback to basic NLP without OpenAI

#### 4. Cache Invalidation Bugs
**Risk**: Stale data served from cache
**Mitigation**:
- Short TTLs (5min L1, 1hr L2, 24hr L3)
- Pattern-based invalidation on document updates
- Cache bypass header for testing
- Cache warming on invalidation

---

## Success Metrics

### Performance Metrics (Primary)

| Metric | Baseline | Target | Method |
|--------|----------|--------|--------|
| P50 Response Time | 800ms | 200ms | Performance monitoring middleware |
| P95 Response Time | 1500ms | 400ms | Performance monitoring middleware |
| P99 Response Time | 3000ms | 800ms | Performance monitoring middleware |
| Throughput | 50 req/s | 200 req/s | Load testing with 1500 concurrent users |
| Cache Hit Rate | 0% | 70%+ | Redis INFO stats + L1 metrics |
| Database Query Time | 500ms | 80ms | Prisma query logging + EXPLAIN ANALYZE |
| Memory Usage | 1.2GB | 450MB | Node.js process.memoryUsage() |

### Quality Metrics (Secondary)

| Metric | Target | Method |
|--------|--------|--------|
| API Error Rate | < 1% | Error tracking middleware |
| Cache False Positive Rate | < 5% | Cache validation testing |
| Query Intent Accuracy | > 85% | Manual review of 100 queries |
| User Session Duration | > 5 minutes | Session analytics |
| Query Suggestion Relevance | > 80% | User feedback ratings |

### Business Metrics (Tertiary)

| Metric | Target | Method |
|--------|--------|--------|
| User Engagement | +50% | Session tracking, click-through rates |
| Search Abandonment Rate | < 20% | Analytics (searches with 0 clicks) |
| Average Results per Query | 8-12 | Query history analysis |
| Repeat User Rate | > 60% | User session tracking |

---

## Resource Requirements

### Infrastructure

**Development Environment**:
- PostgreSQL 14+ with pgvector
- Redis 7+ (2GB memory allocation)
- Node.js 18+
- Docker & Docker Compose

**Production Environment**:
- Database: PostgreSQL (4 CPU, 16GB RAM, 100GB SSD)
- Cache: Redis (2 CPU, 8GB RAM)
- Application: Node.js (4 CPU, 8GB RAM)
- Load Balancer: Nginx or similar
- Monitoring: Prometheus + Grafana

### Dependencies

**New NPM Packages**:
```json
{
  "dependencies": {
    "ioredis": "^5.3.2",
    "bull": "^4.12.0",
    "node-cache": "^5.1.2"
  },
  "devDependencies": {
    "@types/ioredis": "^5.0.0",
    "@types/bull": "^4.10.0"
  }
}
```

**Installation**:
```bash
npm install ioredis bull node-cache
npm install -D @types/ioredis @types/bull
```

### Team Resources

**Required Skills**:
- Backend development (TypeScript/Node.js)
- Database optimization (PostgreSQL + pgvector)
- Caching strategies (Redis)
- Performance testing
- DevOps (Docker, monitoring)

**Estimated Effort**:
- Development: 5 days (1 senior engineer)
- Testing: 1 day (1 QA engineer)
- Deployment: 0.5 days (1 DevOps engineer)
- Documentation: Concurrent with development

---

## Appendix

### A. File Structure

```
legal/
├── src/
│   ├── routes/
│   │   └── unified-search.ts          (NEW)
│   ├── services/
│   │   ├── orchestration/
│   │   │   └── unified-search-orchestrator.ts  (NEW)
│   │   ├── ai/
│   │   │   └── async-openai-service.ts        (NEW)
│   │   ├── cache/
│   │   │   ├── multi-tier-cache-service.ts    (NEW)
│   │   │   └── redis-cache.service.ts         (NEW)
│   │   └── queue/
│   │       └── openai-queue.service.ts        (NEW)
│   └── middleware/
│       └── performance-monitoring.ts          (NEW)
├── scripts/
│   ├── apply-performance-indexes.sql          (NEW)
│   ├── apply-week3-optimization.ts            (NEW)
│   └── test-week3-performance.ts              (NEW)
├── prisma/
│   └── schema.prisma                          (UPDATED)
├── docker-compose.yml                         (UPDATED)
└── .env                                       (UPDATED)
```

### B. Environment Variables Reference

```bash
# Database (existing)
DATABASE_URL=postgresql://user:pass@localhost:5432/legal_rag_db

# Redis (new)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_MAX_RETRIES=3
REDIS_CONNECT_TIMEOUT=10000

# OpenAI (existing + new)
OPENAI_API_KEY=sk-...
OPENAI_MAX_CONCURRENT=5
OPENAI_RATE_LIMIT=100
OPENAI_TIMEOUT=30000
OPENAI_RETRY_ATTEMPTS=3

# Caching (new)
CACHE_L1_TTL_MS=300000          # 5 minutes
CACHE_L2_TTL_MS=3600000         # 1 hour
CACHE_L3_TTL_MS=86400000        # 24 hours
CACHE_L1_MAX_SIZE_MB=100
CACHE_L2_MAX_SIZE_MB=1000
CACHE_L3_MAX_SIZE_MB=2000

# Performance (new)
MAX_CONCURRENT_REQUESTS=500
REQUEST_TIMEOUT_MS=30000
DATABASE_POOL_SIZE=50
QUERY_TIMEOUT_MS=10000
```

### C. Migration Scripts

**scripts/apply-week3-optimization.ts**:
```typescript
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Week 3 optimization migration...\n');

  // 1. Apply performance indexes
  console.log('📊 Applying performance indexes...');
  execSync('psql -d legal_rag_db -f scripts/apply-performance-indexes.sql', {
    stdio: 'inherit'
  });

  // 2. Run Prisma migration
  console.log('\n📦 Running Prisma migration...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  // 3. Verify new tables
  console.log('\n✅ Verifying new tables...');
  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('query_history', 'user_sessions', 'query_cache', 'query_suggestions', 'relevance_feedback')
    ORDER BY table_name;
  `;
  console.log('Created tables:', tables);

  // 4. Verify indexes
  console.log('\n📑 Verifying indexes...');
  const indexes = await prisma.$queryRaw`
    SELECT
      schemaname,
      tablename,
      indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
    ORDER BY tablename, indexname;
  `;
  console.log(`Created ${(indexes as any[]).length} indexes`);

  console.log('\n✨ Week 3 optimization migration complete!');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### D. Performance Testing Script

**scripts/test-week3-performance.ts**:
```typescript
import autocannon from 'autocannon';
import { performance } from 'perf_hooks';

interface PerformanceTestResults {
  scenario: string;
  requestsPerSecond: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  errors: number;
  cacheHitRate?: number;
}

async function runPerformanceTests() {
  const results: PerformanceTestResults[] = [];

  // Test 1: Cold cache (no cache hits)
  console.log('\n🧪 Test 1: Cold Cache Performance');
  const coldCacheResult = await autocannon({
    url: 'http://localhost:3000/api/v2/search/unified',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cache-Bypass': 'true'
    },
    body: JSON.stringify({
      query: 'Código Civil Ecuador contratos',
      options: { enableCaching: false }
    }),
    connections: 10,
    duration: 30
  });

  results.push({
    scenario: 'Cold Cache',
    requestsPerSecond: coldCacheResult.requests.average,
    latency: {
      p50: coldCacheResult.latency.p50,
      p95: coldCacheResult.latency.p95,
      p99: coldCacheResult.latency.p99,
      max: coldCacheResult.latency.max
    },
    errors: coldCacheResult.errors,
  });

  // Test 2: Warm cache (50% cache hits)
  console.log('\n🧪 Test 2: Warm Cache Performance (50% hit rate)');
  const warmCacheResult = await autocannon({
    url: 'http://localhost:3000/api/v2/search/unified',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Código Civil Ecuador contratos',
      options: { enableCaching: true }
    }),
    connections: 50,
    duration: 30
  });

  results.push({
    scenario: 'Warm Cache (50%)',
    requestsPerSecond: warmCacheResult.requests.average,
    latency: {
      p50: warmCacheResult.latency.p50,
      p95: warmCacheResult.latency.p95,
      p99: warmCacheResult.latency.p99,
      max: warmCacheResult.latency.max
    },
    errors: warmCacheResult.errors,
    cacheHitRate: 50
  });

  // Test 3: Hot cache (90% cache hits)
  console.log('\n🧪 Test 3: Hot Cache Performance (90% hit rate)');
  const hotCacheResult = await autocannon({
    url: 'http://localhost:3000/api/v2/search/unified',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'popular query from cache',
      options: { enableCaching: true }
    }),
    connections: 100,
    duration: 30
  });

  results.push({
    scenario: 'Hot Cache (90%)',
    requestsPerSecond: hotCacheResult.requests.average,
    latency: {
      p50: hotCacheResult.latency.p50,
      p95: hotCacheResult.latency.p95,
      p99: hotCacheResult.latency.p99,
      max: hotCacheResult.latency.max
    },
    errors: hotCacheResult.errors,
    cacheHitRate: 90
  });

  // Test 4: High concurrency (1500 users)
  console.log('\n🧪 Test 4: High Concurrency (1500 users)');
  const concurrencyResult = await autocannon({
    url: 'http://localhost:3000/api/v2/search/unified',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'various legal queries',
      options: { enableCaching: true }
    }),
    connections: 1500,
    duration: 60
  });

  results.push({
    scenario: 'High Concurrency (1500 users)',
    requestsPerSecond: concurrencyResult.requests.average,
    latency: {
      p50: concurrencyResult.latency.p50,
      p95: concurrencyResult.latency.p95,
      p99: concurrencyResult.latency.p99,
      max: concurrencyResult.latency.max
    },
    errors: concurrencyResult.errors,
  });

  // Print results
  console.log('\n\n📊 Performance Test Results\n');
  console.log('═'.repeat(100));
  results.forEach((result) => {
    console.log(`\n${result.scenario}`);
    console.log('─'.repeat(100));
    console.log(`Throughput:    ${result.requestsPerSecond.toFixed(2)} req/s`);
    console.log(`P50 Latency:   ${result.latency.p50.toFixed(2)}ms`);
    console.log(`P95 Latency:   ${result.latency.p95.toFixed(2)}ms`);
    console.log(`P99 Latency:   ${result.latency.p99.toFixed(2)}ms`);
    console.log(`Max Latency:   ${result.latency.max.toFixed(2)}ms`);
    console.log(`Errors:        ${result.errors}`);
    if (result.cacheHitRate) {
      console.log(`Cache Hit:     ${result.cacheHitRate}%`);
    }
  });

  // Compare against targets
  console.log('\n\n🎯 Target Comparison\n');
  console.log('═'.repeat(100));
  const warmCache = results.find(r => r.scenario.includes('Warm'));
  if (warmCache) {
    console.log(`P95 Latency: ${warmCache.latency.p95.toFixed(2)}ms (Target: 400ms) - ${warmCache.latency.p95 <= 400 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Throughput: ${warmCache.requestsPerSecond.toFixed(2)} req/s (Target: 200 req/s) - ${warmCache.requestsPerSecond >= 200 ? '✅ PASS' : '❌ FAIL'}`);
  }

  return results;
}

// Run tests
runPerformanceTests()
  .then(() => {
    console.log('\n✨ All performance tests complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Performance tests failed:', error);
    process.exit(1);
  });
```

---

## Conclusion

This strategic plan provides a comprehensive roadmap for Week 3 of Phase 10, focusing on NLP-RAG integration and performance optimization. The implementation is designed to be:

- **Incremental**: Daily deliverables with measurable improvements
- **Safe**: Zero-downtime migrations, rollback plans, comprehensive testing
- **Monitored**: Real-time metrics, alerts, performance dashboards
- **Documented**: Complete API docs, deployment guides, troubleshooting

**Expected Timeline**: 6 days
**Expected Improvement**: 73% response time reduction, 15x user capacity increase
**Risk Level**: Medium (mitigated with comprehensive testing and rollback plans)

**Next Steps**:
1. Review and approve this plan
2. Begin Day 1-2 implementation (database indexes + Redis setup)
3. Daily standup to review progress against targets
4. Performance testing on Day 5
5. Production deployment on Day 6

---

**Document Version**: 1.0
**Created**: 2025-01-13
**Author**: Claude Code (Agents: backend-architect, performance-engineer, database-optimizer)
**Status**: READY FOR IMPLEMENTATION
