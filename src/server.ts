import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.js';
import { caseRoutes } from './routes/cases.js';
import { documentRoutes } from './routes/documents.js';
import { queryRoutes } from './routes/query.js';
import { legalDocumentRoutes } from './routes/legal-documents.js';
import { adminUserRoutes } from './routes/admin/users.js';
import { adminSpecialtyRoutes } from './routes/admin/specialties.js';
import { adminAuditRoutes } from './routes/admin/audit.js';
import { adminQuotaRoutes } from './routes/admin/quotas.js';
import { adminPlanRoutes } from './routes/admin/plans.js';
import { paymentRoutes } from './routes/payments.js';

dotenv.config();

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

// Plugins
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'supersecret',
});

await app.register(multipart);

await app.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
});

// Authentication decorator
app.decorate('authenticate', async function(request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// Health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register API routes
await app.register(authRoutes, { prefix: '/api/v1' });
await app.register(caseRoutes, { prefix: '/api/v1' });
await app.register(documentRoutes, { prefix: '/api/v1' });
await app.register(queryRoutes, { prefix: '/api/v1' });
await app.register(legalDocumentRoutes, { prefix: '/api/v1' });
await app.register(paymentRoutes, { prefix: '/api/v1' });

// Register admin routes
await app.register(adminUserRoutes, { prefix: '/api/v1' });
await app.register(adminSpecialtyRoutes, { prefix: '/api/v1' });
await app.register(adminAuditRoutes, { prefix: '/api/v1' });
await app.register(adminQuotaRoutes, { prefix: '/api/v1' });
await app.register(adminPlanRoutes, { prefix: '/api/v1' });

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8000');
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
