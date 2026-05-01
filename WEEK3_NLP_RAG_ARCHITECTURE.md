# Week 3 NLP-RAG Integration Architecture

## Executive Summary
This document outlines the Week 3 architecture for integrating the NLP Query Transformation system with the existing Legal RAG System, focusing on performance optimization, caching strategy, and new service implementations.

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Web App → Unified Search API → Response Streaming               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  /api/v2/search/unified  ──┬──→  Rate Limiter                   │
│  /api/v2/search/suggest  ──┤     Auth Middleware                │
│  /api/v2/search/session  ──┤     Request Queue                  │
│  /api/v2/search/feedback ──┘     Response Cache                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ORCHESTRATION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Unified Search Orchestrator Service              │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  1. Query Reception & Session Management                 │  │
│  │  2. Cache Lookup (Redis L1 + L2)                        │  │
│  │  3. NLP Transformation Pipeline                          │  │
│  │  4. RAG Search Execution                                │  │
│  │  5. Result Aggregation & Re-ranking                     │  │
│  │  6. Response Streaming                                   │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│     NLP SERVICES         │    │     RAG SERVICES         │
├──────────────────────────┤    ├──────────────────────────┤
│                          │    │                          │
│ • Query Processor        │    │ • Vector Search          │
│ • Entity Dictionary      │    │ • Semantic Matching      │
│ • Filter Builder         │    │ • Document Retrieval     │
│ • Intent Analyzer        │◄──►│ • Relevance Scoring      │
│ • Context Manager        │    │ • Citation Extraction    │
│                          │    │                          │
└──────────────────────────┘    └──────────────────────────┘
                │                               │
                └───────────────┬───────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CACHING LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │   Redis L1      │  │   Redis L2      │  │  CDN Cache     │  │
│  ├─────────────────┤  ├─────────────────┤  ├────────────────┤  │
│  │ • Query Trans   │  │ • Search Results│  │ • Static Data  │  │
│  │ • Entity Dict   │  │ • Doc Chunks    │  │ • Suggestions  │  │
│  │ • User Session  │  │ • Embeddings    │  │ • Popular Q's  │  │
│  │ TTL: 5-60 min   │  │ TTL: 1-24 hrs   │  │ TTL: 24-168h   │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PostgreSQL          Pinecone           OpenAI API              │
│  • 99 Tables         • Vector DB         • GPT-4 Turbo          │
│  • Query History     • 1536 dims         • Embeddings           │
│  • User Sessions     • Metadata          • Async Calls          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Service Specifications

### 2.1 Unified Search Orchestrator Service

**Purpose:** Central coordinator for NLP-enhanced search operations

**Responsibilities:**
- Query reception and validation
- Session context management
- Cache coordination (multi-tier)
- NLP transformation orchestration
- RAG search execution
- Result aggregation and re-ranking
- Response streaming

**Key Methods:**
```typescript
class UnifiedSearchOrchestrator {
  async executeSearch(query: string, options: SearchOptions): Promise<SearchResult>
  async streamSearch(query: string, options: SearchOptions): AsyncIterator<SearchChunk>
  async getSuggestions(partial: string, context: SessionContext): Promise<Suggestion[]>
  async provideFeedback(resultId: string, feedback: UserFeedback): Promise<void>
}
```

### 2.2 Query History Service

**Purpose:** Track and analyze query patterns for optimization

**Responsibilities:**
- Store all queries with metadata
- Analyze query patterns
- Generate query suggestions
- Track performance metrics
- Support session continuity

**Database Schema:**
```sql
CREATE TABLE query_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  session_id UUID REFERENCES user_sessions(id),
  raw_query TEXT NOT NULL,
  normalized_query TEXT,
  transformed_filters JSONB,
  search_results JSONB,
  relevance_scores FLOAT[],
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_query_history_user_session ON query_history(user_id, session_id);
CREATE INDEX idx_query_history_created_at ON query_history(created_at DESC);
CREATE INDEX idx_query_history_normalized ON query_history USING GIN(normalized_query gin_trgm_ops);
```

### 2.3 Session Management Service

**Purpose:** Maintain conversation context across multiple queries

**Responsibilities:**
- Create and manage user sessions
- Maintain conversation context
- Track query sequence
- Support multi-turn conversations
- Session-based personalization

**Database Schema:**
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  session_token VARCHAR(255) UNIQUE,
  context_data JSONB,
  query_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
```

### 2.4 Context Service

**Purpose:** Manage contextual information for improved search relevance

**Responsibilities:**
- Build query context from history
- Extract entities from conversation
- Maintain topic continuity
- Provide context to NLP/RAG
- Learn user preferences

**Key Methods:**
```typescript
class ContextService {
  async buildContext(sessionId: string): Promise<QueryContext>
  async updateContext(sessionId: string, query: QueryData): Promise<void>
  async extractTopics(sessionId: string): Promise<Topic[]>
  async getUserPreferences(userId: string): Promise<UserPreferences>
}
```

### 2.5 Relevance Feedback Service

**Purpose:** Collect and process user feedback for continuous improvement

**Responsibilities:**
- Collect explicit feedback (thumbs up/down)
- Track implicit feedback (clicks, dwell time)
- Adjust relevance scoring
- Train re-ranking models
- Generate quality metrics

**Database Schema:**
```sql
CREATE TABLE relevance_feedback (
  id UUID PRIMARY KEY,
  query_id UUID REFERENCES query_history(id),
  result_id VARCHAR(255),
  feedback_type VARCHAR(50), -- 'explicit', 'implicit'
  feedback_value FLOAT, -- -1 to 1 scale
  interaction_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_relevance_feedback_query ON relevance_feedback(query_id);
CREATE INDEX idx_relevance_feedback_type ON relevance_feedback(feedback_type);
```

## 3. Caching Strategy

### 3.1 Multi-Tier Cache Architecture

**Level 1 (Hot Cache) - Redis:**
- **TTL:** 5-60 minutes
- **Content:**
  - NLP transformations
  - Entity dictionary lookups
  - Active user sessions
  - Recent query results
- **Size:** ~2GB
- **Hit Ratio Target:** >80%

**Level 2 (Warm Cache) - Redis:**
- **TTL:** 1-24 hours
- **Content:**
  - Search results
  - Document chunks
  - Computed embeddings
  - Filter combinations
- **Size:** ~10GB
- **Hit Ratio Target:** >60%

**Level 3 (CDN Cache):**
- **TTL:** 24-168 hours
- **Content:**
  - Popular queries
  - Static suggestions
  - Entity dictionary
  - Document metadata
- **Size:** Unlimited
- **Hit Ratio Target:** >40%

### 3.2 Cache Key Strategy

```typescript
// Cache key patterns
const cacheKeys = {
  nlpTransform: `nlp:transform:${hash(query)}:v1`,
  searchResult: `search:result:${hash(filters)}:${page}:v1`,
  userSession: `session:${sessionId}:context`,
  entityLookup: `entity:${entityType}:${entityId}:v1`,
  suggestion: `suggest:${prefix}:${context}:v1`
};
```

### 3.3 Cache Invalidation Strategy

**Automatic Invalidation:**
- TTL-based expiration
- LRU eviction when memory limit reached
- Version-based invalidation on schema changes

**Manual Invalidation:**
- Document updates → Clear related search caches
- Entity dictionary updates → Clear entity caches
- User feedback → Clear result caches

## 4. Performance Optimizations

### 4.1 Async OpenAI API Calls

```typescript
class AsyncOpenAIService {
  private readonly queue: PQueue;
  private readonly pool: OpenAIClient[];

  constructor() {
    // Request queue with concurrency limit
    this.queue = new PQueue({
      concurrency: 5,
      interval: 1000,
      intervalCap: 10
    });

    // Connection pool for parallel requests
    this.pool = this.createConnectionPool(3);
  }

  async processAsync(prompt: string): Promise<string> {
    return this.queue.add(async () => {
      const client = this.getAvailableClient();
      return client.complete(prompt);
    });
  }

  // Stream responses for long operations
  async *streamResponse(prompt: string): AsyncIterator<string> {
    const stream = await this.openai.completions.create({
      model: 'gpt-4-turbo',
      prompt,
      stream: true
    });

    for await (const chunk of stream) {
      yield chunk.choices[0]?.text || '';
    }
  }
}
```

### 4.2 Request Queuing and Batching

```typescript
class RequestBatcher {
  private batch: QueryRequest[] = [];
  private batchTimer: NodeJS.Timeout;

  async addRequest(request: QueryRequest): Promise<BatchResult> {
    this.batch.push(request);

    if (this.batch.length >= this.batchSize) {
      return this.processBatch();
    }

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.processBatch(), this.batchDelay);
    }

    return this.waitForBatch(request.id);
  }

  private async processBatch(): Promise<BatchResult[]> {
    const requests = [...this.batch];
    this.batch = [];

    // Process all requests in parallel
    const results = await Promise.all(
      requests.map(req => this.processRequest(req))
    );

    return results;
  }
}
```

### 4.3 Connection Pooling

```typescript
// PostgreSQL connection pooling
const prismaPool = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['error', 'warn'],
  // Connection pool settings
  connectionLimit: 20,
  connectionTimeout: 5000,
  maxLifetime: 30000,
  idleTimeout: 10000
});

// Redis connection pooling
const redisPool = new IORedis.Cluster([
  { host: 'redis-1', port: 6379 },
  { host: 'redis-2', port: 6379 }
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
    db: 0,
    connectionPoolSize: 10,
    retryStrategy: (times) => Math.min(times * 50, 2000)
  }
});
```

## 5. API Endpoint Specifications

### 5.1 Unified Search Endpoint

**POST /api/v2/search/unified**

Combines NLP transformation with RAG search in a single request.

**Request:**
```json
{
  "query": "decretos sobre educación del último año",
  "options": {
    "limit": 20,
    "offset": 0,
    "session_id": "uuid",
    "enable_nlp": true,
    "enable_streaming": false,
    "include_suggestions": true,
    "filters_override": {}
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "doc_123",
        "title": "Decreto Ejecutivo No. 123",
        "snippet": "...",
        "relevance_score": 0.92,
        "metadata": {
          "norm_type": "DECRETO",
          "publication_date": "2024-01-15",
          "topics": ["educación", "reforma"]
        }
      }
    ],
    "nlp_transformation": {
      "detected_entities": ["decreto", "educación"],
      "applied_filters": {
        "normType": ["DECRETO"],
        "dateRange": { "start": "2024-01-01" },
        "topics": ["educación"]
      },
      "confidence": 0.85
    },
    "suggestions": [
      "decretos ministeriales educación",
      "reformas educativas 2024"
    ],
    "metadata": {
      "total_results": 45,
      "processing_time_ms": 230,
      "cache_hit": true,
      "session_id": "uuid"
    }
  }
}
```

### 5.2 Query Suggestions Endpoint

**GET /api/v2/search/suggest**

Provides autocomplete and query suggestions.

**Request:**
```
GET /api/v2/search/suggest?q=ley+de&session_id=uuid&limit=5
```

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "text": "ley de educación superior",
      "type": "popular",
      "score": 0.95
    },
    {
      "text": "ley de contratación pública",
      "type": "recent",
      "score": 0.88
    },
    {
      "text": "ley de tránsito",
      "type": "contextual",
      "score": 0.82
    }
  ],
  "metadata": {
    "response_time_ms": 15,
    "source": "cache"
  }
}
```

### 5.3 Session Management Endpoint

**POST /api/v2/search/session**

Creates or updates search sessions.

**Request:**
```json
{
  "action": "create",
  "user_id": "user_uuid",
  "context": {
    "previous_queries": [],
    "preferences": {}
  }
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "session_uuid",
    "token": "jwt_token",
    "expires_at": "2024-01-16T10:00:00Z",
    "context": {
      "query_count": 0,
      "topics": [],
      "entities": []
    }
  }
}
```

### 5.4 Relevance Feedback Endpoint

**POST /api/v2/search/feedback**

Collects user feedback on search results.

**Request:**
```json
{
  "query_id": "query_uuid",
  "result_id": "doc_123",
  "feedback": {
    "type": "explicit",
    "value": 1,
    "comment": "Very relevant result"
  },
  "interaction": {
    "click": true,
    "dwell_time_seconds": 45,
    "action": "download"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feedback recorded successfully",
  "impact": {
    "relevance_adjustment": 0.05,
    "future_ranking_boost": true
  }
}
```

## 6. Database Schema Updates

### 6.1 New Prisma Models

```prisma
// Query History for tracking all searches
model QueryHistory {
  id                String   @id @default(uuid())
  userId           String   @map("user_id")
  sessionId        String?  @map("session_id")
  rawQuery         String   @map("raw_query")
  normalizedQuery  String?  @map("normalized_query")
  transformedFilters Json?  @map("transformed_filters")
  searchResults    Json?    @map("search_results")
  relevanceScores  Float[]  @map("relevance_scores")
  responseTimeMs   Int?     @map("response_time_ms")
  cacheHit         Boolean  @default(false) @map("cache_hit")
  createdAt        DateTime @default(now()) @map("created_at")

  user    User         @relation(fields: [userId], references: [id])
  session UserSession? @relation(fields: [sessionId], references: [id])
  feedback RelevanceFeedback[]

  @@index([userId, sessionId])
  @@index([createdAt(sort: Desc)])
  @@index([normalizedQuery])
  @@map("query_history")
}

// User Sessions for conversation context
model UserSession {
  id             String    @id @default(uuid())
  userId         String    @map("user_id")
  sessionToken   String    @unique @map("session_token")
  contextData    Json?     @map("context_data")
  queryCount     Int       @default(0) @map("query_count")
  lastActivityAt DateTime? @map("last_activity_at")
  expiresAt      DateTime  @map("expires_at")
  createdAt      DateTime  @default(now()) @map("created_at")

  user    User           @relation(fields: [userId], references: [id])
  queries QueryHistory[]

  @@index([sessionToken])
  @@index([userId])
  @@index([expiresAt])
  @@map("user_sessions")
}

// Cached Transformations for NLP results
model CachedTransformation {
  id              String   @id @default(uuid())
  queryHash       String   @unique @map("query_hash")
  originalQuery   String   @map("original_query")
  transformation  Json     @map("transformation")
  confidence      Float    @map("confidence")
  hitCount        Int      @default(1) @map("hit_count")
  lastAccessedAt  DateTime @map("last_accessed_at")
  expiresAt       DateTime @map("expires_at")
  createdAt       DateTime @default(now()) @map("created_at")

  @@index([queryHash])
  @@index([expiresAt])
  @@index([hitCount(sort: Desc)])
  @@map("cached_transformations")
}

// Query Suggestions for autocomplete
model QuerySuggestion {
  id          String   @id @default(uuid())
  suggestion  String   @unique
  frequency   Int      @default(1)
  lastUsedAt  DateTime @map("last_used_at")
  score       Float    @default(0.5)
  type        String   // 'popular', 'recent', 'contextual'
  metadata    Json?
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([suggestion])
  @@index([frequency(sort: Desc)])
  @@index([score(sort: Desc)])
  @@map("query_suggestions")
}

// Relevance Feedback for improving results
model RelevanceFeedback {
  id              String   @id @default(uuid())
  queryId         String   @map("query_id")
  resultId        String   @map("result_id")
  userId          String?  @map("user_id")
  feedbackType    String   @map("feedback_type") // 'explicit', 'implicit'
  feedbackValue   Float    @map("feedback_value") // -1 to 1
  interactionData Json?    @map("interaction_data")
  createdAt       DateTime @default(now()) @map("created_at")

  query QueryHistory @relation(fields: [queryId], references: [id])
  user  User?        @relation(fields: [userId], references: [id])

  @@index([queryId])
  @@index([feedbackType])
  @@index([createdAt(sort: Desc)])
  @@map("relevance_feedback")
}
```

### 6.2 Database Indexes for Performance

```sql
-- Composite indexes for common queries
CREATE INDEX idx_query_history_user_date
  ON query_history(user_id, created_at DESC);

CREATE INDEX idx_query_history_session_seq
  ON query_history(session_id, created_at ASC);

-- Full-text search index
CREATE INDEX idx_query_history_search
  ON query_history USING GIN(
    to_tsvector('spanish', raw_query || ' ' || COALESCE(normalized_query, ''))
  );

-- JSONB indexes for filter queries
CREATE INDEX idx_query_history_filters
  ON query_history USING GIN(transformed_filters);

CREATE INDEX idx_cached_transformations_query
  ON cached_transformations USING HASH(query_hash);

-- Partial indexes for active records
CREATE INDEX idx_user_sessions_active
  ON user_sessions(user_id)
  WHERE expires_at > NOW();

CREATE INDEX idx_relevance_positive
  ON relevance_feedback(query_id)
  WHERE feedback_value > 0;
```

## 7. Performance Targets

### 7.1 Response Time Improvements

**Current State:**
- P50: 800ms
- P95: 1500ms
- P99: 3000ms

**Week 3 Targets:**
- P50: 200ms (75% improvement)
- P95: 400ms (73% improvement)
- P99: 800ms (73% improvement)

### 7.2 Cache Hit Ratios

**Target Metrics:**
- NLP Transformation Cache: 85% hit ratio
- Search Result Cache: 70% hit ratio
- Entity Dictionary Cache: 95% hit ratio
- Suggestion Cache: 90% hit ratio

### 7.3 Throughput Targets

**Current:** ~50 requests/second
**Target:** 200 requests/second (4x improvement)

**How to achieve:**
- Async processing: 2x improvement
- Caching: 1.5x improvement
- Connection pooling: 1.3x improvement
- Request batching: 1.2x improvement

### 7.4 Resource Utilization

**CPU Usage:**
- Current: 70-90% (spikes)
- Target: 40-60% (stable)

**Memory Usage:**
- Current: 4GB
- Target: 6GB (with caching)
- Redis: 12GB total

**Database Connections:**
- Current: 10 concurrent
- Target: 20 pooled

## 8. Implementation Roadmap

### Week 3 - Day 1-2: Core Services
- [ ] Implement Unified Search Orchestrator
- [ ] Set up Redis multi-tier caching
- [ ] Create AsyncOpenAIService
- [ ] Implement request queuing

### Week 3 - Day 3-4: Database & Performance
- [ ] Apply new Prisma migrations
- [ ] Create database indexes
- [ ] Implement connection pooling
- [ ] Set up performance monitoring

### Week 3 - Day 5-6: API Integration
- [ ] Develop unified search endpoint
- [ ] Implement suggestion endpoint
- [ ] Create session management
- [ ] Add feedback collection

### Week 3 - Day 7: Testing & Optimization
- [ ] Load testing
- [ ] Performance tuning
- [ ] Cache optimization
- [ ] Documentation

## 9. Monitoring & Observability

### 9.1 Key Metrics to Track

```typescript
interface PerformanceMetrics {
  // Response times
  apiResponseTime: Histogram;
  nlpTransformTime: Histogram;
  ragSearchTime: Histogram;

  // Cache performance
  cacheHitRate: Gauge;
  cacheSize: Gauge;
  cacheEvictions: Counter;

  // System health
  activeConnections: Gauge;
  queueDepth: Gauge;
  errorRate: Counter;

  // Business metrics
  queriesPerSecond: Counter;
  uniqueUsersPerHour: Gauge;
  feedbackScore: Gauge;
}
```

### 9.2 Alerting Thresholds

- API response time P95 > 500ms
- Cache hit rate < 60%
- Error rate > 1%
- Queue depth > 100
- Database connection pool > 80% utilized

## 10. Security Considerations (for reference)

While security fixes are handled separately, the architecture considers:

- JWT token validation at orchestrator level
- Rate limiting per user/session
- Query sanitization before caching
- Encrypted cache storage for sensitive data
- Session token rotation
- API key rotation for OpenAI

## Conclusion

This Week 3 architecture provides a robust, scalable foundation for integrating NLP capabilities with the existing RAG system. The multi-tier caching strategy, async processing, and new service layer will significantly improve performance while maintaining system reliability.

The unified search orchestrator acts as the central coordinator, ensuring efficient resource utilization and consistent user experience. With proper implementation, we expect to achieve the 73% performance improvement target while supporting 4x higher throughput.