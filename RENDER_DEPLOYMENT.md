# Guía de Deployment en Render

## Contenido

1. [Prerequisitos](#prerequisitos)
2. [PostgreSQL Setup](#postgresql-setup)  
3. [Redis Setup](#redis-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Troubleshooting](#troubleshooting)

## Prerequisitos

- Cuenta de Render
- Repositorio en GitHub
- API Keys (OpenAI, Stripe)

## PostgreSQL Setup

### Crear Database

1. Dashboard → New → PostgreSQL
2. Configuración:
   - Name: legal-rag-postgres
   - Version: 14+
   - Plan: Starter o Standard
   - Region: Oregon

### Configurar pgvector

```sql
CREATE EXTENSION vector;
CREATE EXTENSION "uuid-ossp";
CREATE EXTENSION pg_trgm;
```

## Redis Setup

1. Dashboard → New → Redis
2. Configuración:
   - Name: legal-rag-redis
   - Region: Oregon (same as DB)
   - Plan: Starter (256MB)

## Backend Deployment

### Crear Web Service

1. Dashboard → New → Web Service
2. Connect GitHub repo
3. Configuración:
   - Name: legal-rag-api
   - Build: bun install && bun run build
   - Start: bun run start
   - Plan: Starter/Standard

### Environment Variables

```bash
DATABASE_URL=<postgres_internal_url>
REDIS_URL=<redis_internal_url>
JWT_SECRET=<random_secret>
OPENAI_API_KEY=<your_key>
STRIPE_SECRET_KEY=<your_key>
NODE_ENV=production
PORT=8000
```

## Frontend Deployment

### Next.js Web Service

1. Dashboard → New → Web Service
2. Configuración:
   - Root: frontend
   - Build: npm install && npm run build
   - Start: npm start

### Environment Variables

```bash
NEXT_PUBLIC_API_URL=<backend_url>
NEXTAUTH_URL=<frontend_url>
NEXTAUTH_SECRET=<random_secret>
```

## Troubleshooting

### Connection Timeout
- Use INTERNAL connection string
- Same region for all services
- Check security rules

### pgvector Not Found
```sql
CREATE EXTENSION vector;
```

### CORS Errors
- Verify CORS_ORIGIN in backend
- Enable credentials in requests

Ver documentación completa en Render Docs.
