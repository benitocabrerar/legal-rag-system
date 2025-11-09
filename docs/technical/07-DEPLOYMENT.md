# Deployment Documentation - Legal RAG System

## Deployment Platform

**Provider**: Render.com
**Region**: Oregon, USA
**Environment**: Production

## Infrastructure Architecture

The system is deployed using **4 interconnected services** on Render:

```
┌─────────────────────────────────────────────────────┐
│                   Render Platform                    │
│                                                      │
│  ┌──────────────┐  ┌───────────────┐               │
│  │  PostgreSQL  │  │     Redis     │               │
│  │   Database   │  │     Cache     │               │
│  │              │  │               │               │
│  │ Starter Plan │  │ Starter Plan  │               │
│  └──────┬───────┘  └───────┬───────┘               │
│         │                  │                        │
│         └──────┬───────────┘                        │
│                │                                    │
│         ┌──────▼──────┐                            │
│         │  Backend    │                            │
│         │     API     │                            │
│         │  (Fastify)  │                            │
│         │             │                            │
│         │Starter Plan │                            │
│         └──────┬──────┘                            │
│                │                                    │
│         ┌──────▼──────┐                            │
│         │  Frontend   │                            │
│         │  (Next.js)  │                            │
│         │             │                            │
│         │Starter Plan │                            │
│         └─────────────┘                            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Service Configuration

### 1. PostgreSQL Database

**File**: `render.yaml` (lines 3-10)

```yaml
- type: pserv
  name: legal-rag-postgres
  env: docker
  plan: starter
  region: oregon
  databaseName: legal_rag
  databaseUser: legal_user
  ipAllowList: []
```

**Specifications**:
- **Plan**: Starter
- **Storage**: 10 GB SSD
- **RAM**: 512 MB
- **vCPUs**: 0.1
- **Connections**: 22 max
- **Backups**: Daily automatic backups (7-day retention)
- **SSL**: Required

**Connection String Format**:
```
postgresql://legal_user:PASSWORD@HOST:5432/legal_rag?sslmode=require
```

**Access**:
- Internal: Render service network
- External: SSL connections only
- No IP whitelist restrictions

### 2. Redis Cache

**File**: `render.yaml` (lines 12-18)

```yaml
- type: redis
  name: legal-rag-redis
  plan: starter
  region: oregon
  maxmemoryPolicy: allkeys-lru
  ipAllowList: []
```

**Specifications**:
- **Plan**: Starter
- **Memory**: 256 MB
- **Eviction**: allkeys-lru (Least Recently Used)
- **Persistence**: Disabled (cache only)
- **SSL/TLS**: Supported

**Connection String Format**:
```
redis://HOST:6379
```

**Usage**:
- Session storage
- Rate limit counters
- Temporary data caching

### 3. Backend API Service

**File**: `render.yaml` (lines 20-47)

```yaml
- type: web
  name: legal-rag-api
  env: node
  region: oregon
  plan: starter
  buildCommand: npm install && npx prisma generate
  startCommand: npx tsx src/server.ts
  envVars:
    - key: NODE_ENV
      value: production
    - key: PORT
      value: 8000
    - key: DATABASE_URL
      fromDatabase:
        name: legal-rag-postgres
        property: connectionString
    - key: REDIS_URL
      fromService:
        name: legal-rag-redis
        type: redis
        property: connectionString
    - key: JWT_SECRET
      generateValue: true
    - key: OPENAI_API_KEY
      sync: false
    - key: CORS_ORIGIN
      value: https://legal-rag-frontend.onrender.com
```

**Specifications**:
- **Plan**: Starter
- **RAM**: 512 MB
- **vCPUs**: 0.1 shared
- **Disk**: Ephemeral (files cleared on restart)
- **Port**: 8000
- **Protocol**: HTTP/HTTPS

**Build Process**:
1. `npm install` - Install dependencies
2. `npx prisma generate` - Generate Prisma Client
3. Start server with `npx tsx src/server.ts`

**Environment Variables**:
- `NODE_ENV`: production
- `PORT`: 8000
- `DATABASE_URL`: Auto-injected from PostgreSQL service
- `REDIS_URL`: Auto-injected from Redis service
- `JWT_SECRET`: Auto-generated secure random string
- `OPENAI_API_KEY`: Manually configured
- `CORS_ORIGIN`: Frontend URL for CORS

**Health Check**:
- Endpoint: `GET /health`
- Interval: 30 seconds
- Timeout: 10 seconds

**URL**: `https://legal-rag-api-qnew.onrender.com`

### 4. Frontend Service

**File**: `render.yaml` (lines 49-70)

```yaml
- type: web
  name: legal-rag-frontend
  env: node
  region: oregon
  plan: starter
  rootDir: frontend
  buildCommand: npm install && npm run build
  startCommand: npm start
  envVars:
    - key: NODE_ENV
      value: production
    - key: NEXT_PUBLIC_API_URL
      fromService:
        name: legal-rag-api
        type: web
        property: host
    - key: NEXTAUTH_URL
      value: https://legal-rag-frontend.onrender.com
    - key: NEXTAUTH_SECRET
      generateValue: true
```

**Specifications**:
- **Plan**: Starter
- **RAM**: 512 MB
- **vCPUs**: 0.1 shared
- **Disk**: Ephemeral
- **Port**: 3000 (auto-detected)
- **Protocol**: HTTP/HTTPS

**Build Process**:
1. `cd frontend`
2. `npm install` - Install dependencies
3. `npm run build` - Build Next.js production bundle
4. `npm start` - Start production server

**Environment Variables**:
- `NODE_ENV`: production
- `NEXT_PUBLIC_API_URL`: Auto-injected backend URL
- `NEXTAUTH_URL`: Frontend base URL
- `NEXTAUTH_SECRET`: Auto-generated

**URL**: `https://legal-rag-frontend.onrender.com`

## Deployment Process

### Initial Deployment

```bash
# 1. Push code to GitHub
git push origin main

# 2. Connect Render to GitHub repository
# (Done via Render dashboard)

# 3. Render reads render.yaml and creates all services
# (Automatic on first deploy)

# 4. Set OPENAI_API_KEY environment variable
# (Manual step in Render dashboard)

# 5. Run database migrations
# (Automatic via Prisma in build command)

# 6. Create admin user (manual script)
npm run add:admin
```

### Continuous Deployment

**Trigger**: Push to `main` branch on GitHub

**Auto-Deploy Process**:
```
1. Code pushed to GitHub
   │
   ▼
2. Render webhook triggered
   │
   ▼
3. Pull latest code
   │
   ▼
4. Run build command
   │
   ├─► Backend: npm install && npx prisma generate
   └─► Frontend: npm install && npm run build
   │
   ▼
5. Run database migrations (if any)
   │
   ▼
6. Start services
   │
   ▼
7. Health check passes
   │
   ▼
8. Traffic routed to new instance
   │
   ▼
9. Old instance shut down
```

**Deployment Time**: 3-5 minutes

### Manual Deployment

```bash
# Trigger deploy from Render dashboard
# Services → Select Service → Manual Deploy

# Or via Render CLI (if installed)
render deploy
```

## Environment Variables

### Backend Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `NODE_ENV` | Static | Production environment |
| `PORT` | Static | Server port (8000) |
| `DATABASE_URL` | PostgreSQL Service | Database connection string |
| `REDIS_URL` | Redis Service | Redis connection string |
| `JWT_SECRET` | Auto-generated | JWT signing secret |
| `OPENAI_API_KEY` | Manual | OpenAI API key |
| `CORS_ORIGIN` | Static | Allowed CORS origin |

### Frontend Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `NODE_ENV` | Static | Production environment |
| `NEXT_PUBLIC_API_URL` | Backend Service | API base URL |
| `NEXTAUTH_URL` | Static | Frontend base URL |
| `NEXTAUTH_SECRET` | Auto-generated | NextAuth secret |

## Database Migrations

### Migration Strategy

**Development**:
```bash
npx prisma migrate dev --name migration_name
```

**Production**:
```bash
npx prisma migrate deploy
```

**Automated in Build**:
```yaml
buildCommand: npm install && npx prisma generate && npx prisma migrate deploy
```

### Migration Files

```
prisma/migrations/
├── 20250101_init/
│   └── migration.sql
├── 20250105_add_legal_documents/
│   └── migration.sql
└── migration_lock.toml
```

## Monitoring & Logging

### Render Dashboard

**Available Metrics**:
- CPU usage
- Memory usage
- Request count
- Response times
- Error rates
- Bandwidth

**Logs**:
- Real-time log streaming
- 7-day log retention
- Searchable logs
- Download logs

### Application Logging

**Fastify Logger** (Pino):
```typescript
const app = Fastify({
  logger: {
    level: 'info',
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          headers: request.headers,
        };
      },
    },
  },
});
```

**Log Levels**:
- `fatal` - Application crashes
- `error` - Error responses
- `warn` - Warnings
- `info` - Request/response info
- `debug` - Debugging info
- `trace` - Detailed traces

## Scaling

### Horizontal Scaling

**Upgrade to Standard or Pro plan**:
- Multiple instances per service
- Load balancing across instances
- Auto-scaling based on traffic

**Current**: 1 instance per service (Starter plan)

### Vertical Scaling

**Plan Upgrades**:

| Plan | RAM | vCPUs | Price/Month |
|------|-----|-------|-------------|
| Starter | 512 MB | 0.1 | $7 |
| Standard | 2 GB | 0.5 | $25 |
| Pro | 4 GB | 1.0 | $85 |
| Pro Plus | 8 GB | 2.0 | $185 |

### Database Scaling

**PostgreSQL Plans**:

| Plan | Storage | RAM | Connections | Price/Month |
|------|---------|-----|-------------|-------------|
| Starter | 10 GB | 512 MB | 22 | $7 |
| Standard | 50 GB | 4 GB | 97 | $50 |
| Pro | 100 GB | 8 GB | 197 | $120 |

## Security

### SSL/TLS

- **Frontend**: HTTPS enforced
- **Backend**: HTTPS enforced
- **Database**: SSL required
- **Redis**: TLS supported

**Certificate**: Automatic Let's Encrypt certificates

### Network Security

- **CORS**: Restricted to frontend domain
- **Rate Limiting**: 100 req/15 min
- **DDoS Protection**: Render platform-level
- **Firewall**: Render managed

### Secrets Management

- **Environment Variables**: Encrypted at rest
- **Auto-generated Secrets**: Cryptographically secure
- **Manual Secrets**: Masked in dashboard
- **No Git Commits**: Secrets never in version control

## Backup & Recovery

### Database Backups

- **Frequency**: Daily automatic backups
- **Retention**: 7 days
- **Type**: Full database snapshots
- **Restore**: Via Render dashboard

**Manual Backup**:
```bash
# Export database
pg_dump DATABASE_URL > backup.sql

# Restore database
psql DATABASE_URL < backup.sql
```

### Code Backups

- **Version Control**: Git (GitHub)
- **Branches**: `main` (production), `dev` (development)
- **Tags**: Release tags for versions

### Disaster Recovery

**Recovery Time Objective (RTO)**: < 1 hour
**Recovery Point Objective (RPO)**: < 24 hours

**Recovery Steps**:
1. Identify failure point
2. Restore database from backup (if needed)
3. Rollback to previous Git commit
4. Redeploy services
5. Verify functionality

## Performance Optimization

### CDN & Edge Caching

- **Static Assets**: Cached at edge locations
- **API Responses**: No caching (dynamic)
- **Frontend Pages**: Server-side rendered

### Database Optimization

- **Connection Pooling**: Prisma Client (max 10)
- **Indexes**: Automatic on foreign keys
- **Query Optimization**: Select specific fields

### Application Optimization

- **Code Splitting**: Next.js automatic
- **Image Optimization**: Next.js Image component
- **Compression**: Gzip enabled

## Cost Analysis

### Monthly Costs (Starter Plan)

| Service | Plan | Cost |
|---------|------|------|
| PostgreSQL | Starter | $7 |
| Redis | Starter | $7 |
| Backend API | Starter | $7 |
| Frontend | Starter | $7 |
| **Total** | | **$28/month** |

### External Costs

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| OpenAI Embeddings | 1K docs/month | $1 |
| OpenAI GPT-4 | 1K queries/month | $30 |
| **Total** | | **$31/month** |

**Grand Total**: ~$59/month

## Troubleshooting

### Common Issues

**1. Build Failures**
```bash
# Check logs in Render dashboard
# Verify all dependencies in package.json
# Ensure Prisma schema is valid
```

**2. Database Connection Issues**
```bash
# Verify DATABASE_URL is set
# Check SSL mode (sslmode=require)
# Verify database is running
```

**3. CORS Errors**
```bash
# Verify CORS_ORIGIN matches frontend URL
# Check frontend is using correct API URL
```

**4. Out of Memory**
```bash
# Upgrade to Standard plan (2GB RAM)
# Optimize database queries
# Reduce chunk sizes
```

### Support

- **Render Support**: support@render.com
- **Documentation**: https://render.com/docs
- **Status Page**: https://status.render.com

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Classification**: Technical Documentation
