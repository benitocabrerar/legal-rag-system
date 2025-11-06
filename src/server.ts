import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

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

// Health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// API routes placeholder
app.get('/api/v1/cases', async (request, reply) => {
  // Placeholder - will be implemented
  return { cases: [] };
});

app.post('/api/v1/query', async (request, reply) => {
  // Placeholder - RAG query endpoint
  return { response: 'RAG endpoint - to be implemented' };
});

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
