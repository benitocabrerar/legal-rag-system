# System Architecture - Legal RAG System

## Architecture Overview

The Legal RAG System follows a modern **three-tier architecture** with a clear separation of concerns:

1. **Presentation Layer** - Next.js React frontend
2. **Application Layer** - Fastify REST API backend
3. **Data Layer** - PostgreSQL database with Redis caching

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                          │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │              Next.js 15 Frontend (SSR/CSR)                      │ │
│  │                                                                 │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐              │ │
│  │  │   Pages    │  │ Components │  │  Contexts  │              │ │
│  │  │ (App Dir)  │  │  (shadcn)  │  │   (Auth)   │              │ │
│  │  └────────────┘  └────────────┘  └────────────┘              │ │
│  │         │              │                 │                    │ │
│  │         └──────────────┴─────────────────┘                    │ │
│  │                       │                                       │ │
│  │              ┌────────▼────────┐                             │ │
│  │              │  API Client     │                             │ │
│  │              │  (Axios)        │                             │ │
│  │              └────────┬────────┘                             │ │
│  └───────────────────────┼───────────────────────────────────────┘ │
└────────────────────────┼─┼────────────────────────────────────────┘
                         │ │ HTTPS/REST
                         │ │ JSON Payloads
┌────────────────────────▼─▼────────────────────────────────────────┐
│                        APPLICATION LAYER                          │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              Fastify API Server (Node.js)                    │ │
│  │                                                              │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐ │ │
│  │  │   Auth   │ │  Cases   │ │Documents │ │ Legal Docs    │ │ │
│  │  │  Routes  │ │  Routes  │ │  Routes  │ │    Routes     │ │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘ │ │
│  │       │            │            │                │         │ │
│  │  ┌────▼────────────▼────────────▼────────────────▼─────┐  │ │
│  │  │              Middleware Layer                      │  │ │
│  │  │  • JWT Auth   • CORS   • Rate Limit   • Multipart │  │ │
│  │  └────┬───────────────────────────────────────────────┘  │ │
│  │       │                                                  │ │
│  │  ┌────▼──────────────────────────────────────────────┐  │ │
│  │  │         Business Logic & Services                 │  │ │
│  │  │  • RAG Engine  • Embedding Service  • Auth Logic │  │ │
│  │  └────┬──────────────────────────────────────────────┘  │ │
│  │       │                                                  │ │
│  └───────┼──────────────────────────────────────────────────┘ │
└──────────┼───────────────────────────────────────────────────┘
           │
           │ Prisma ORM
           │
┌──────────▼───────────────────────────────────────────────────────┐
│                           DATA LAYER                              │
│                                                                   │
│  ┌──────────────────────┐      ┌──────────────────────┐         │
│  │   PostgreSQL 14+     │      │    Redis Cache       │         │
│  │                      │      │                      │         │
│  │  • users             │      │  • Sessions          │         │
│  │  • cases             │      │  • Rate limits       │         │
│  │  • documents         │      │  • Temp data         │         │
│  │  • document_chunks   │      └──────────────────────┘         │
│  │  • legal_documents   │                                       │
│  │  • legal_doc_chunks  │      ┌──────────────────────┐         │
│  └──────────────────────┘      │   OpenAI API         │         │
│                                │                      │         │
│                                │  • GPT-4             │         │
│                                │  • text-embedding    │         │
│                                │    -ada-002          │         │
│                                └──────────────────────┘         │
└───────────────────────────────────────────────────────────────────┘
```

## Design Patterns

### 1. **Repository Pattern**
The system uses Prisma ORM as a data access layer, abstracting database operations:

```typescript
// Example: Case Repository Pattern
class CaseRepository {
  async findByUserId(userId: string) {
    return prisma.case.findMany({
      where: { userId },
      include: { documents: true }
    });
  }
}
```

### 2. **Middleware Chain**
Fastify plugins implement the middleware pattern for cross-cutting concerns:

```
Request → CORS → Rate Limit → JWT Auth → Route Handler → Response
```

### 3. **Service Layer**
Business logic is separated from route handlers:

```typescript
// Route Handler
app.post('/documents/upload', async (req, reply) => {
  const document = await DocumentService.upload(req.file);
  return reply.send(document);
});

// Service Layer
class DocumentService {
  static async upload(file) {
    const chunks = this.chunkDocument(file);
    const embeddings = await EmbeddingService.generate(chunks);
    return this.save(chunks, embeddings);
  }
}
```

### 4. **Context Provider Pattern**
React Context API for global state:

```typescript
<AuthProvider>
  <QueryClientProvider>
    <App />
  </QueryClientProvider>
</AuthProvider>
```

### 5. **API Client Pattern**
Centralized Axios instance with interceptors:

```typescript
// Request Interceptor
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

## Component Architecture

### Frontend Component Hierarchy

```
App Layout
├── Providers (Auth, Query Client)
└── Routes
    ├── Public Routes
    │   ├── Landing Page
    │   ├── Login Page
    │   └── Register Page
    └── Protected Routes
        ├── Dashboard
        │   ├── Cases List
        │   └── Case Detail
        │       ├── Documents List
        │       ├── Document Upload
        │       └── Query Interface
        └── Admin Panel
            ├── Legal Library
            ├── User Management
            └── Analytics
```

### Backend Module Structure

```
Server (Fastify)
├── Plugins
│   ├── CORS Plugin
│   ├── JWT Plugin
│   ├── Multipart Plugin
│   └── Rate Limit Plugin
├── Routes
│   ├── Auth Routes (/auth/*)
│   ├── Case Routes (/cases/*)
│   ├── Document Routes (/documents/*)
│   ├── Query Routes (/query)
│   └── Legal Document Routes (/legal-documents/*)
└── Services
    ├── Authentication Service
    ├── Document Processing Service
    ├── Embedding Service
    └── RAG Query Service
```

## Data Flow Architecture

### 1. User Authentication Flow

```
┌──────┐  1. POST /auth/login   ┌──────────┐
│Client├────────────────────────►│  API     │
└──────┘  (email, password)     └────┬─────┘
                                     │
   ▲                                 ▼
   │                          ┌──────────────┐
   │                          │ Verify Hash  │
   │                          │  (bcrypt)    │
   │                          └──────┬───────┘
   │                                 │
   │  4. Return JWT                  ▼
   │                          ┌──────────────┐
   └──────────────────────────┤Generate JWT  │
                              │ (Fastify JWT)│
                              └──────────────┘
```

### 2. Document Upload & Processing Flow

```
┌──────┐  1. Upload File       ┌──────────┐
│Client├──────────────────────►│  API     │
└──────┘                        └────┬─────┘
                                     │
   ▲                                 ▼
   │                          ┌──────────────┐
   │                          │Extract Text  │
   │                          │              │
   │                          └──────┬───────┘
   │                                 │
   │                                 ▼
   │                          ┌──────────────┐
   │                          │  Chunk Text  │
   │                          │ (1000 chars) │
   │                          └──────┬───────┘
   │                                 │
   │                                 ▼
   │                          ┌──────────────┐
   │                          │   OpenAI     │
   │                          │ Embeddings   │
   │                          └──────┬───────┘
   │                                 │
   │                                 ▼
   │                          ┌──────────────┐
   │  6. Return Success       │ Save to DB   │
   └──────────────────────────┤  (Prisma)    │
                              └──────────────┘
```

### 3. RAG Query Flow

```
┌──────┐  1. Query Request     ┌──────────┐
│Client├──────────────────────►│  API     │
└──────┘  (question, caseId)   └────┬─────┘
                                     │
   ▲                                 ▼
   │                          ┌──────────────┐
   │                          │  Generate    │
   │                          │  Embedding   │
   │                          └──────┬───────┘
   │                                 │
   │                                 ▼
   │                          ┌──────────────┐
   │                          │Vector Search │
   │                          │(Cosine Sim)  │
   │                          └──────┬───────┘
   │                                 │
   │                                 ▼
   │                          ┌──────────────┐
   │                          │ Top 5 Chunks │
   │                          │              │
   │                          └──────┬───────┘
   │                                 │
   │                                 ▼
   │                          ┌──────────────┐
   │                          │Build Context │
   │                          │              │
   │                          └──────┬───────┘
   │                                 │
   │                                 ▼
   │                          ┌──────────────┐
   │                          │   GPT-4      │
   │                          │  Generate    │
   │                          └──────┬───────┘
   │                                 │
   │  8. Return Answer               ▼
   └──────────────────────────┐Return Answer│
                              │  + Sources  │
                              └─────────────┘
```

## Network Architecture

### Production Environment

```
Internet
   │
   ▼
┌──────────────────┐
│ Render Load      │
│ Balancer         │
└────────┬─────────┘
         │
         ├────────────────────┐
         │                    │
         ▼                    ▼
┌─────────────┐      ┌──────────────┐
│ Frontend    │      │  Backend API │
│ (Next.js)   │◄─────┤  (Fastify)   │
│             │ CORS │              │
└─────────────┘      └───────┬──────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
                    ▼                  ▼
              ┌──────────┐      ┌──────────┐
              │PostgreSQL│      │  Redis   │
              └──────────┘      └──────────┘
```

### Internal Communication

- **Frontend → Backend**: HTTPS (443) with CORS
- **Backend → Database**: PostgreSQL protocol (SSL required)
- **Backend → Redis**: Redis protocol (6379)
- **Backend → OpenAI**: HTTPS REST API

## Security Architecture

### Authentication Flow

```
1. User credentials → Bcrypt hash verification
2. Valid credentials → JWT token generation
3. JWT token → Stored in localStorage
4. Subsequent requests → Bearer token in header
5. API validates → JWT signature verification
6. Valid token → Request proceeds
7. Invalid/expired → 401 Unauthorized
```

### Authorization Layers

1. **Network Level**: HTTPS only, CORS restrictions
2. **Application Level**: JWT verification on protected routes
3. **Route Level**: Role-based access control (RBAC)
4. **Data Level**: Row-level security (userId filtering)

## Scalability Considerations

### Horizontal Scaling
- Frontend: Multiple Next.js instances behind load balancer
- Backend: Multiple Fastify instances with sticky sessions
- Database: Read replicas for query distribution
- Redis: Cluster mode for distributed caching

### Vertical Scaling
- Increase Render service plan (Starter → Standard → Pro)
- Database connection pooling (Prisma)
- Redis memory allocation

### Caching Strategy

```
Level 1: Browser Cache (Static Assets)
   │
   ▼
Level 2: CDN Cache (Render Edge)
   │
   ▼
Level 3: Application Cache (Redis)
   │
   ▼
Level 4: Database Cache (PostgreSQL Buffer)
```

## Performance Optimization

### Frontend Optimizations
1. **Code Splitting**: Next.js automatic code splitting
2. **Image Optimization**: Next.js Image component
3. **Server-Side Rendering**: Initial page load optimization
4. **Client-Side Caching**: React Query with stale-while-revalidate

### Backend Optimizations
1. **Database Indexing**: Prisma auto-indexes on foreign keys
2. **Connection Pooling**: Prisma Client connection pool
3. **Rate Limiting**: 100 requests per 15 minutes per IP
4. **Response Compression**: Fastify compression plugin

### Database Optimizations
1. **Indexes**: Primary keys, foreign keys, compound indexes
2. **Query Optimization**: Select only necessary fields
3. **Pagination**: Limit queries with offset/limit
4. **Cascade Deletes**: Automatic cleanup of related records

## Monitoring & Observability

### Logging
- **Frontend**: Browser console + error boundaries
- **Backend**: Fastify logger (Pino) with JSON formatting
- **Database**: PostgreSQL query logs

### Metrics
- **API Performance**: Response times per endpoint
- **Database**: Query execution times
- **Cache**: Hit/miss rates
- **External APIs**: OpenAI API latency

### Error Tracking
- Request/response logging
- Error stack traces
- User action tracking

## Disaster Recovery

### Backup Strategy
1. **Database**: Automated daily backups (Render)
2. **Code**: Git version control
3. **Configuration**: Environment variables in Render dashboard

### Recovery Procedures
1. **Database Restore**: Render backup restoration
2. **Service Restart**: Render service redeployment
3. **Rollback**: Git revert + redeploy

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Classification**: Technical Documentation
