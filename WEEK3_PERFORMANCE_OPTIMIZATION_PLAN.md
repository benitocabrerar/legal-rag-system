# Week 3 Performance Optimization Plan
## Legal RAG System - Critical Performance Fix Implementation

**Date:** November 13, 2025
**Priority:** CRITICAL
**Impact:** 73-84% performance improvement required across all metrics

---

## Executive Summary

Current system performance shows critical bottlenecks:
- **API Response P95:** 1500ms → Target: 400ms (73% improvement needed)
- **Database Queries:** 500ms → Target: 80ms (84% improvement needed)
- **Embedding Generation:** 300ms → Target: 50ms (83% improvement needed)
- **Memory Usage:** 1.2GB → Target: 450MB (63% reduction needed)
- **Concurrent Users:** 100 → Target: 1500 (15x increase needed)

This plan provides concrete, immediately actionable optimizations with expected ROI.

---

## 1. QUICK WINS IMPLEMENTATION (Day 1-2)
### Immediate optimizations with highest ROI

### 1.1 Database Composite Indexes
**Expected Improvement:** 60-70% query time reduction

```sql
-- Priority 1: Search & Query Performance
CREATE INDEX CONCURRENTLY idx_legal_docs_search ON legal_documents
  (norm_type, legal_hierarchy, jurisdiction, document_state)
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_legal_docs_date_search ON legal_documents
  (publication_date DESC, norm_type)
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_chunks_doc_embedding ON legal_document_chunks
  (legal_document_id, chunk_index)
  INCLUDE (embedding);

-- Priority 2: User & Session Performance
CREATE INDEX CONCURRENTLY idx_users_auth ON users
  (email, provider)
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_search_interactions_user ON search_interactions
  (user_id, timestamp DESC)
  INCLUDE (query, results_count);

-- Priority 3: Analytics & Feedback
CREATE INDEX CONCURRENTLY idx_click_events_search ON click_events
  (search_interaction_id, position)
  INCLUDE (document_id, relevance_score);

CREATE INDEX CONCURRENTLY idx_relevance_feedback_docs ON relevance_feedback
  (document_id, rating)
  WHERE is_relevant = true;

-- Priority 4: Document Authority & Citations
CREATE INDEX CONCURRENTLY idx_doc_authority_score ON document_authority_scores
  (pagerank_score DESC, combined_authority DESC)
  INCLUDE (document_id);

CREATE INDEX CONCURRENTLY idx_citations_source_target ON document_citations
  (source_document_id, target_document_id)
  WHERE is_validated = true;

-- Priority 5: AI & Analytics
CREATE INDEX CONCURRENTLY idx_ai_messages_conv ON ai_messages
  (conversation_id, timestamp DESC)
  WHERE role = 'assistant';

CREATE INDEX CONCURRENTLY idx_analytics_events_type ON analytics_events
  (event_type, timestamp DESC)
  INCLUDE (user_id, duration_ms);
```

### 1.2 Redis Caching Implementation
**Expected Improvement:** 80% reduction in repeated computations

```typescript
// redis-cache.config.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableReadyCheck: true,
  lazyConnect: true,
});

export const CACHE_TTL = {
  // Static data - long TTL
  LEGAL_DOCUMENT: 86400,        // 24 hours
  USER_PROFILE: 3600,           // 1 hour
  DOCUMENT_CHUNKS: 86400,       // 24 hours

  // Computed data - medium TTL
  EMBEDDINGS: 43200,            // 12 hours
  NLP_TRANSFORMATIONS: 21600,   // 6 hours
  SEARCH_RESULTS: 1800,         // 30 minutes

  // Dynamic data - short TTL
  AUTHORITY_SCORES: 3600,       // 1 hour
  ANALYTICS_METRICS: 300,       // 5 minutes
  AI_RESPONSES: 900,            // 15 minutes
};

export const cacheKeys = {
  document: (id: string) => `doc:${id}`,
  chunks: (docId: string) => `chunks:${docId}`,
  embedding: (chunkId: string) => `emb:${chunkId}`,
  nlp: (text: string) => `nlp:${Buffer.from(text).toString('base64').slice(0, 32)}`,
  search: (query: string, filters?: any) => `search:${Buffer.from(JSON.stringify({ query, filters })).toString('base64').slice(0, 32)}`,
  authority: (docId: string) => `auth:${docId}`,
  user: (userId: string) => `user:${userId}`,
};
```

### 1.3 Connection Pooling Configuration
**Expected Improvement:** 40% reduction in connection overhead

```typescript
// prisma-pool.config.ts
export const prismaConfig = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  pool: {
    min: 5,
    max: 20,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 10000,
    createRetryIntervalMillis: 500,
  },
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
};

// Singleton pattern for Prisma client
let prisma: PrismaClient;

export function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient(prismaConfig);
    prisma.$use(async (params, next) => {
      const before = Date.now();
      const result = await next(params);
      const after = Date.now();

      if (after - before > 100) {
        console.warn(`Slow query (${after - before}ms): ${params.model}.${params.action}`);
      }

      return result;
    });
  }
  return prisma;
}
```

### 1.4 Fastify Compression Setup
**Expected Improvement:** 60-70% bandwidth reduction

```typescript
// compression.config.ts
import compress from '@fastify/compress';

export const compressionConfig = {
  global: true,
  threshold: 1024, // Only compress responses > 1KB
  encodings: ['gzip', 'deflate', 'br'],
  brotliOptions: {
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
      [zlib.constants.BROTLI_PARAM_QUALITY]: 4, // Balance speed/compression
    },
  },
  customTypes: /^(application\/json|text\/.*)$/,
};

// In server.ts
await app.register(compress, compressionConfig);
```

---

## 2. OPENAI API OPTIMIZATION (Day 2-3)
### Non-blocking async pattern implementation

### 2.1 Queue-Based Processing
**Expected Improvement:** Event loop never blocked, 5x throughput increase

```typescript
// openai-queue.service.ts
import Bull from 'bull';
import { OpenAI } from 'openai';

export class OpenAIQueueService {
  private queue: Bull.Queue;
  private openai: OpenAI;

  constructor() {
    this.queue = new Bull('openai-processing', {
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 2,
    });

    this.setupWorkers();
  }

  private setupWorkers() {
    // Process embeddings in parallel
    this.queue.process('embedding', 5, async (job) => {
      const { text, model = 'text-embedding-3-small' } = job.data;

      // Check cache first
      const cached = await redis.get(cacheKeys.embedding(text));
      if (cached) return JSON.parse(cached);

      // Batch small texts together
      if (text.length < 500 && job.opts.priority < 5) {
        await this.batchWithOthers(job);
      }

      const response = await this.openai.embeddings.create({
        input: text,
        model,
      });

      const embedding = response.data[0].embedding;

      // Cache result
      await redis.setex(
        cacheKeys.embedding(text),
        CACHE_TTL.EMBEDDINGS,
        JSON.stringify(embedding)
      );

      return embedding;
    });

    // Process completions with priority
    this.queue.process('completion', 3, async (job) => {
      const { prompt, model = 'gpt-4-turbo-preview', temperature = 0.3 } = job.data;

      // Implement streaming for long responses
      const stream = await this.openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        stream: true,
      });

      let result = '';
      for await (const chunk of stream) {
        result += chunk.choices[0]?.delta?.content || '';

        // Emit progress events
        await job.progress(Math.min(result.length / 1000, 90));
      }

      return result;
    });
  }

  async addEmbeddingJob(text: string, priority = 0) {
    return await this.queue.add('embedding', { text }, {
      priority,
      delay: priority > 5 ? 0 : 100, // Delay low-priority jobs
    });
  }

  async addCompletionJob(prompt: string, options = {}) {
    return await this.queue.add('completion', { prompt, ...options }, {
      priority: options.priority || 0,
    });
  }

  // Batch multiple small embedding requests
  private async batchWithOthers(job: Bull.Job) {
    const batchKey = 'embedding:batch:current';
    const batch = await redis.get(batchKey);

    if (!batch) {
      await redis.setex(batchKey, 1, JSON.stringify([job.data]));
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalBatch = JSON.parse(await redis.get(batchKey) || '[]');
      if (finalBatch.length > 1) {
        // Process as batch
        const response = await this.openai.embeddings.create({
          input: finalBatch.map(d => d.text),
          model: 'text-embedding-3-small',
        });

        // Distribute results
        finalBatch.forEach((data, idx) => {
          redis.setex(
            cacheKeys.embedding(data.text),
            CACHE_TTL.EMBEDDINGS,
            JSON.stringify(response.data[idx].embedding)
          );
        });
      }
    }
  }
}
```

### 2.2 Request Batching Strategy
**Expected Improvement:** 70% reduction in API calls

```typescript
// batch-processor.service.ts
export class BatchProcessor {
  private pendingBatches = new Map<string, any[]>();
  private timers = new Map<string, NodeJS.Timeout>();

  async addToBatch(type: string, item: any, processor: Function) {
    if (!this.pendingBatches.has(type)) {
      this.pendingBatches.set(type, []);
    }

    this.pendingBatches.get(type)!.push(item);

    // Clear existing timer
    if (this.timers.has(type)) {
      clearTimeout(this.timers.get(type)!);
    }

    // Set new timer for batch processing
    this.timers.set(type, setTimeout(() => {
      this.processBatch(type, processor);
    }, 100)); // 100ms window for batching

    // Process immediately if batch is full
    if (this.pendingBatches.get(type)!.length >= 10) {
      this.processBatch(type, processor);
    }
  }

  private async processBatch(type: string, processor: Function) {
    const batch = this.pendingBatches.get(type) || [];
    if (batch.length === 0) return;

    this.pendingBatches.set(type, []);
    if (this.timers.has(type)) {
      clearTimeout(this.timers.get(type)!);
      this.timers.delete(type);
    }

    try {
      await processor(batch);
    } catch (error) {
      console.error(`Batch processing failed for ${type}:`, error);
      // Retry individual items
      for (const item of batch) {
        await processor([item]).catch(console.error);
      }
    }
  }
}
```

---

## 3. COMPREHENSIVE CACHING STRATEGY (Day 3-4)
### Multi-layer caching architecture

### 3.1 NLP Transformation Cache
**Expected Improvement:** 90% reduction in NLP processing time

```typescript
// nlp-cache.service.ts
export class NLPCacheService {
  private memoryCache = new Map<string, any>();
  private readonly MAX_MEMORY_ITEMS = 1000;

  async getCachedTransformation(text: string, transformationType: string) {
    const key = `${transformationType}:${cacheKeys.nlp(text)}`;

    // L1: Memory cache (instant)
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // L2: Redis cache (fast)
    const cached = await redis.get(key);
    if (cached) {
      const result = JSON.parse(cached);
      this.updateMemoryCache(key, result);
      return result;
    }

    return null;
  }

  async cacheTransformation(
    text: string,
    transformationType: string,
    result: any,
    ttl = CACHE_TTL.NLP_TRANSFORMATIONS
  ) {
    const key = `${transformationType}:${cacheKeys.nlp(text)}`;

    // Store in both caches
    this.updateMemoryCache(key, result);
    await redis.setex(key, ttl, JSON.stringify(result));
  }

  private updateMemoryCache(key: string, value: any) {
    // LRU eviction
    if (this.memoryCache.size >= this.MAX_MEMORY_ITEMS) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    this.memoryCache.set(key, value);
  }

  // Cache warming for common queries
  async warmCache() {
    const commonQueries = await this.getCommonQueries();

    for (const query of commonQueries) {
      // Pre-compute and cache transformations
      const transformations = await this.computeTransformations(query);
      await this.cacheTransformation(query, 'all', transformations);
    }
  }

  private async getCommonQueries() {
    // Get top 100 queries from last 7 days
    return await prisma.$queryRaw`
      SELECT query, COUNT(*) as count
      FROM search_interactions
      WHERE timestamp > NOW() - INTERVAL '7 days'
      GROUP BY query
      ORDER BY count DESC
      LIMIT 100
    `;
  }
}
```

### 3.2 Embedding Cache Strategy
**Expected Improvement:** 95% cache hit rate for common embeddings

```typescript
// embedding-cache.service.ts
export class EmbeddingCacheService {
  private bloomFilter: BloomFilter;

  constructor() {
    // Bloom filter for quick negative lookups
    this.bloomFilter = new BloomFilter(100000, 4);
  }

  async getEmbedding(text: string): Promise<number[] | null> {
    const key = cacheKeys.embedding(text);

    // Quick check if definitely not cached
    if (!this.bloomFilter.has(key)) {
      return null;
    }

    // Check Redis
    const cached = await redis.get(key);
    if (cached) {
      await redis.expire(key, CACHE_TTL.EMBEDDINGS); // Refresh TTL
      return JSON.parse(cached);
    }

    return null;
  }

  async setEmbedding(text: string, embedding: number[]) {
    const key = cacheKeys.embedding(text);

    // Compress embedding for storage (reduce by 50%)
    const compressed = this.compressEmbedding(embedding);

    await redis.setex(key, CACHE_TTL.EMBEDDINGS, JSON.stringify(compressed));
    this.bloomFilter.add(key);
  }

  private compressEmbedding(embedding: number[]): any {
    // Quantization: reduce precision from float32 to int8
    const scale = Math.max(...embedding.map(Math.abs));
    const quantized = embedding.map(v => Math.round(v / scale * 127));

    return {
      scale,
      values: Buffer.from(new Int8Array(quantized)).toString('base64'),
      length: embedding.length,
    };
  }

  private decompressEmbedding(compressed: any): number[] {
    const values = new Int8Array(Buffer.from(compressed.values, 'base64'));
    return Array.from(values).map(v => v * compressed.scale / 127);
  }
}
```

### 3.3 Cache Invalidation Strategy
```typescript
// cache-invalidation.service.ts
export class CacheInvalidationService {
  async invalidateDocument(documentId: string) {
    const patterns = [
      cacheKeys.document(documentId),
      cacheKeys.chunks(documentId),
      cacheKeys.authority(documentId),
      `search:*${documentId}*`,
    ];

    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  }

  async invalidateUser(userId: string) {
    await redis.del(cacheKeys.user(userId));
  }

  // Scheduled cache cleanup
  async cleanupExpiredCache() {
    // Redis handles TTL automatically, but we clean memory cache
    const stats = await redis.info('memory');
    const usedMemory = parseInt(stats.match(/used_memory:(\d+)/)?.[1] || '0');

    if (usedMemory > 500_000_000) { // 500MB threshold
      // Evict least recently used keys
      const keys = await redis.keys('*');
      const ttls = await Promise.all(keys.map(k => redis.ttl(k)));

      const shortLived = keys
        .map((k, i) => ({ key: k, ttl: ttls[i] }))
        .filter(item => item.ttl < 300 && item.ttl > 0)
        .sort((a, b) => a.ttl - b.ttl)
        .slice(0, 1000);

      if (shortLived.length > 0) {
        await redis.del(...shortLived.map(s => s.key));
      }
    }
  }
}
```

---

## 4. DATABASE QUERY OPTIMIZATION (Day 4-5)
### Eliminating N+1 queries and optimizing includes

### 4.1 Query Optimization Patterns
**Expected Improvement:** 75% reduction in query time

```typescript
// optimized-queries.service.ts
export class OptimizedQueryService {
  // Before: N+1 query problem
  async getDocumentsWithChunksBad(limit: number) {
    const docs = await prisma.legalDocument.findMany({ take: limit });
    for (const doc of docs) {
      doc.chunks = await prisma.legalDocumentChunk.findMany({
        where: { legalDocumentId: doc.id }
      });
    }
    return docs;
  }

  // After: Single query with smart includes
  async getDocumentsWithChunksGood(limit: number) {
    return await prisma.legalDocument.findMany({
      take: limit,
      include: {
        chunks: {
          select: {
            id: true,
            chunkIndex: true,
            content: true,
            // Exclude embedding from default queries
          },
        },
        _count: {
          select: { chunks: true }
        }
      },
    });
  }

  // Optimized search with pagination
  async searchDocuments(query: string, page = 1, pageSize = 20) {
    const key = `search:${query}:${page}`;

    // Check cache
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    // Use raw query for complex searches
    const results = await prisma.$queryRaw<any[]>`
      SELECT
        ld.id,
        ld.norm_title,
        ld.norm_type,
        ld.legal_hierarchy,
        ts_rank(to_tsvector('spanish', ld.content), plainto_tsquery('spanish', ${query})) as rank,
        COUNT(DISTINCT ldc.id) as chunk_count,
        AVG(das.pagerank_score) as authority_score
      FROM legal_documents ld
      LEFT JOIN legal_document_chunks ldc ON ldc.legal_document_id = ld.id
      LEFT JOIN document_authority_scores das ON das.document_id = ld.id
      WHERE
        to_tsvector('spanish', ld.content) @@ plainto_tsquery('spanish', ${query})
        AND ld.is_active = true
      GROUP BY ld.id, das.pagerank_score
      ORDER BY rank DESC, authority_score DESC NULLS LAST
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `;

    // Cache results
    await redis.setex(key, CACHE_TTL.SEARCH_RESULTS, JSON.stringify(results));

    return results;
  }
}
```

### 4.2 Prepared Statements
```typescript
// prepared-statements.service.ts
export class PreparedStatementService {
  private statements = new Map<string, any>();

  async prepare() {
    // Prepare frequent queries
    this.statements.set('getUserById',
      await prisma.$queryRaw.prepare`
        SELECT id, email, name, role, plan_tier
        FROM users
        WHERE id = $1 AND is_active = true
      `
    );

    this.statements.set('getDocumentsByType',
      await prisma.$queryRaw.prepare`
        SELECT * FROM legal_documents
        WHERE norm_type = $1
        AND is_active = true
        ORDER BY publication_date DESC
        LIMIT $2
      `
    );
  }

  async getUserById(id: string) {
    return await this.statements.get('getUserById')(id);
  }
}
```

---

## 5. RESPONSE STREAMING (Day 5)
### Server-Sent Events for long operations

```typescript
// streaming.service.ts
export class StreamingService {
  async streamSearchResults(reply: FastifyReply, query: string) {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Stream initial results immediately
    const quickResults = await this.getQuickResults(query);
    reply.raw.write(`data: ${JSON.stringify({
      type: 'initial',
      results: quickResults,
      progress: 20
    })}\n\n`);

    // Stream semantic search results
    const semanticResults = await this.getSemanticResults(query);
    reply.raw.write(`data: ${JSON.stringify({
      type: 'semantic',
      results: semanticResults,
      progress: 60
    })}\n\n`);

    // Stream AI-enhanced results
    const aiResults = await this.getAIEnhancedResults(query);
    reply.raw.write(`data: ${JSON.stringify({
      type: 'ai_enhanced',
      results: aiResults,
      progress: 100
    })}\n\n`);

    reply.raw.write('data: [DONE]\n\n');
    reply.raw.end();
  }

  // WebSocket for real-time updates
  setupWebSocket(app: FastifyInstance) {
    app.get('/ws/updates', { websocket: true }, (connection, req) => {
      connection.socket.on('message', async (message) => {
        const data = JSON.parse(message.toString());

        if (data.type === 'subscribe') {
          // Subscribe to document updates
          await redis.subscribe(`doc:updates:${data.documentId}`);

          redis.on('message', (channel, update) => {
            connection.socket.send(JSON.stringify({
              type: 'update',
              data: JSON.parse(update)
            }));
          });
        }
      });
    });
  }
}
```

---

## 6. MONITORING & METRICS (Day 5-6)
### Comprehensive performance tracking

```typescript
// metrics.service.ts
import { StatsD } from 'node-statsd';
import prom from 'prom-client';

export class MetricsService {
  private statsd: StatsD;
  private register: prom.Registry;

  // Prometheus metrics
  private httpDuration = new prom.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
  });

  private dbQueryDuration = new prom.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
  });

  private cacheHitRate = new prom.Gauge({
    name: 'cache_hit_rate',
    help: 'Cache hit rate percentage',
    labelNames: ['cache_type']
  });

  private openaiLatency = new prom.Histogram({
    name: 'openai_api_latency_seconds',
    help: 'OpenAI API call latency',
    labelNames: ['endpoint', 'model'],
    buckets: [0.5, 1, 2, 3, 5, 10, 20, 30]
  });

  constructor() {
    this.statsd = new StatsD({
      host: process.env.STATSD_HOST || 'localhost',
      port: 8125,
      prefix: 'legal_rag.',
    });

    this.register = new prom.Registry();
    this.register.registerMetric(this.httpDuration);
    this.register.registerMetric(this.dbQueryDuration);
    this.register.registerMetric(this.cacheHitRate);
    this.register.registerMetric(this.openaiLatency);

    // Collect default metrics
    prom.collectDefaultMetrics({ register: this.register });
  }

  // Track API response times
  trackHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpDuration.observe({ method, route, status_code: statusCode.toString() }, duration / 1000);
    this.statsd.timing('http.request', duration, [`method:${method}`, `status:${statusCode}`]);
  }

  // Track database query performance
  trackDbQuery(operation: string, table: string, duration: number) {
    this.dbQueryDuration.observe({ operation, table }, duration / 1000);
    this.statsd.timing('db.query', duration, [`operation:${operation}`, `table:${table}`]);
  }

  // Track cache performance
  trackCacheHit(cacheType: string, hit: boolean) {
    this.statsd.increment(`cache.${hit ? 'hit' : 'miss'}`, 1, [`type:${cacheType}`]);
  }

  // Track OpenAI API performance
  trackOpenAICall(endpoint: string, model: string, duration: number, success: boolean) {
    if (success) {
      this.openaiLatency.observe({ endpoint, model }, duration / 1000);
    }
    this.statsd.timing('openai.latency', duration, [`endpoint:${endpoint}`, `model:${model}`]);
  }

  // Get metrics endpoint
  async getMetrics() {
    return await this.register.metrics();
  }

  // Real-time alerting
  checkThresholds() {
    setInterval(async () => {
      const metrics = await this.getSystemMetrics();

      if (metrics.avgResponseTime > 1000) {
        console.error('ALERT: Average response time exceeds 1s');
        // Send alert to Slack/PagerDuty
      }

      if (metrics.errorRate > 0.01) {
        console.error('ALERT: Error rate exceeds 1%');
      }

      if (metrics.memoryUsage > 1000) {
        console.error('ALERT: Memory usage exceeds 1GB');
      }
    }, 60000); // Check every minute
  }
}
```

---

## Performance Targets & Expected Results

### Before vs After Metrics

| Metric | Current | Target | Expected After Optimization | Improvement |
|--------|---------|--------|----------------------------|-------------|
| **API Response P95** | 1500ms | 400ms | 350-400ms | 73-77% ✅ |
| **Database Queries** | 500ms | 80ms | 60-80ms | 84-88% ✅ |
| **Embedding Generation** | 300ms | 50ms | 40-60ms | 80-87% ✅ |
| **OpenAI API (cached)** | 2000ms | 100ms | 50-150ms | 92-97% ✅ |
| **Memory Usage** | 1.2GB | 450MB | 400-500MB | 58-67% ✅ |
| **Concurrent Users** | 100 | 1500 | 1200-1800 | 12-18x ✅ |
| **Cache Hit Rate** | 0% | 80% | 75-85% | NEW ✅ |
| **Query Throughput** | 20/sec | 300/sec | 250-350/sec | 12-17x ✅ |

### Implementation Priority & Timeline

#### Day 1-2: Quick Wins (40% improvement)
- ✅ Database indexes: 2-3 hours
- ✅ Redis caching: 3-4 hours
- ✅ Connection pooling: 1-2 hours
- ✅ Compression: 1 hour

#### Day 2-3: OpenAI Optimization (25% improvement)
- ✅ Queue implementation: 4-5 hours
- ✅ Batching logic: 2-3 hours
- ✅ Retry/fallback: 2 hours

#### Day 3-4: Caching Strategy (20% improvement)
- ✅ NLP cache: 3-4 hours
- ✅ Embedding cache: 2-3 hours
- ✅ Invalidation: 2 hours

#### Day 4-5: Database Optimization (10% improvement)
- ✅ Query optimization: 3-4 hours
- ✅ Prepared statements: 2 hours

#### Day 5: Streaming (5% improvement)
- ✅ SSE implementation: 3-4 hours
- ✅ WebSocket setup: 2-3 hours

#### Day 5-6: Monitoring
- ✅ Metrics setup: 3-4 hours
- ✅ Alerting: 2 hours
- ✅ Dashboard: 2-3 hours

---

## Deployment & Rollout Strategy

### Phase 1: Development Testing
```bash
# Run performance tests
npm run test:performance

# Load testing
npm run test:load -- --users=1000 --duration=300

# Profile memory usage
npm run profile:memory
```

### Phase 2: Staging Deployment
```bash
# Deploy to staging with feature flags
npm run deploy:staging -- --feature-flags=caching,streaming

# Monitor for 24 hours
npm run monitor:staging
```

### Phase 3: Production Rollout
```bash
# Canary deployment (10% traffic)
npm run deploy:canary -- --percentage=10

# Full deployment after validation
npm run deploy:production
```

---

## Risk Mitigation

### Potential Issues & Solutions

1. **Cache Stampede**
   - Solution: Implement cache warming and staggered TTLs
   - Use probabilistic early expiration

2. **Memory Overflow**
   - Solution: Set Redis maxmemory-policy to allkeys-lru
   - Monitor memory usage with alerts

3. **Queue Backlog**
   - Solution: Auto-scaling workers based on queue depth
   - Priority lanes for critical operations

4. **Database Lock Contention**
   - Solution: Use CONCURRENTLY for index creation
   - Schedule during low-traffic periods

---

## Success Metrics & KPIs

### Week 1 Goals
- [ ] P95 latency < 500ms
- [ ] Cache hit rate > 70%
- [ ] Zero downtime during deployment
- [ ] Memory usage < 600MB

### Week 2 Goals
- [ ] P95 latency < 400ms
- [ ] Support 1000+ concurrent users
- [ ] 99.9% uptime
- [ ] Cost reduction of 30% (fewer OpenAI calls)

### Week 3 Goals
- [ ] All performance targets met
- [ ] Full monitoring dashboard live
- [ ] Automated performance regression detection
- [ ] Documentation complete

---

## Next Steps

1. **Immediate Actions (Today)**
   - Create database indexes
   - Deploy Redis instance
   - Implement basic caching

2. **Tomorrow**
   - Set up OpenAI queue
   - Implement request batching
   - Add compression

3. **End of Week**
   - Complete all optimizations
   - Deploy to staging
   - Begin performance testing

---

## Additional Resources

- [Performance Testing Scripts](./scripts/performance-tests/)
- [Monitoring Dashboard](./monitoring/dashboard/)
- [Load Testing Results](./tests/load-test-results/)
- [Optimization Benchmarks](./benchmarks/)

---

**Document Version:** 1.0
**Last Updated:** November 13, 2025
**Author:** Performance Engineering Team
**Review Status:** Ready for Implementation