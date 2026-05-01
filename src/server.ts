// Week 5-6: Initialize OpenTelemetry BEFORE any other imports
import { initializeTelemetry } from './config/telemetry.js';
initializeTelemetry();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { prisma } from './lib/prisma.js';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.js';
import { twoFactorRoutes } from './routes/two-factor.js';
import { oauthRoutes } from './routes/oauth.js';
import { caseRoutes } from './routes/cases.js';
import { documentRoutes } from './routes/documents.js';
import { queryRoutes } from './routes/query.js';
// RE-ENABLED: Routes verified and ready for production
import { legalDocumentRoutes } from './routes/legal-documents.js';
import { legalDocumentRoutesV2 } from './routes/legal-documents-v2.js';
// TEMPORARILY DISABLED: Requires fastify-multer dependency installation
// import { documentRoutesEnhanced } from './routes/documents-enhanced.js';
import { adminUserRoutes } from './routes/admin/users.js';
import { adminSpecialtyRoutes } from './routes/admin/specialties.js';
import { adminAuditRoutes } from './routes/admin/audit.js';
import { adminQuotaRoutes } from './routes/admin/quotas.js';
import { adminPlanRoutes } from './routes/admin/plans.js';
import { adminEmbeddingsRoutes } from './routes/admin/embeddings.js';
import { adminAiSettingsRoutes } from './routes/admin/ai-settings.js';
import { clientLawyerRoutes } from './routes/client-lawyer.js';
import { caseFinanceRoutes } from './routes/case-finance.js';
import { paymentRoutes } from './routes/payments.js';
import { userRoutes } from './routes/user.js';
import { subscriptionRoutes } from './routes/subscription.js';
import { usageRoutes } from './routes/usage.js';
import { billingRoutes } from './routes/billing.js';
import { contactSalesRoutes } from './routes/contact-sales.js';
import { jurisdictionsRoutes } from './routes/jurisdictions.js';
import { payhubRoutes } from './routes/payhub.js';
import { adminPayhubRoutes } from './routes/admin/payhub.js';
import { payhubPaypalRoutes } from './routes/payhub-paypal.js';
import { settingsRoutes } from './routes/settings.js';
import { calendarRoutes } from './routes/calendar.js';
import { taskRoutes } from './routes/tasks.js';
import { taskAiRoutes } from './routes/tasks-ai.js';
import { notificationsEnhancedRoutes } from './routes/notifications-enhanced.js';
import { financeRoutes } from './routes/finance.js';
import { financeAugmentRoutes } from './routes/finance-augment.js';
import { litigationRoutes } from './routes/litigation.js';
import { eventsExtractRoutes } from './routes/events-extract.js';
import { legalDocGenRoutes } from './routes/legal-doc-gen.js';
import { caseChatRoutes } from './routes/case-chat.js';
import { diagnosticsRoutes } from './routes/diagnostics.js';
import { migrationRoutesEmbedded } from './routes/admin/migration-embedded.js';
import { feedbackRoutes } from './routes/feedback.js';
import { advancedSearchRoutes } from './routes/advanced-search.js';
import { nlpRoutes } from './routes/nlp.js';
import { aiAssistantRoutes } from './routes/ai-assistant.js';
import { analyticsRoutes } from './routes/analytics.js';
// RE-ENABLED: Type fixes applied to unified-search.ts
import { unifiedSearchRoutes } from './routes/unified-search.js';
import backupRoutes from './routes/backup.js';
import { backupSSERoutes } from './routes/backup-sse.js';
// AI/NLP Enhancement Routes - RE-ENABLED: Verified and ready
import { aiPredictionsRoutes } from './routes/ai-predictions.js';
import { trendsRoutes } from './routes/trends.js';
// M3: Document Summarization Routes
import { summarizationRoutes } from './routes/summarization.js';
import { summarizationStreamingRoutes } from './routes/summarization-streaming.js';
// Week 5-6: Observability routes and middleware
import metricsRoutes from './routes/observability/metrics.routes.js';
import healthRoutes from './routes/observability/health.routes.js';
import { requestMetricsMiddleware, errorTrackingMiddleware } from './middleware/observability.middleware.js';
import { applyPrismaMiddleware } from './middleware/prisma.middleware.js';
import { getAlertingService } from './services/observability/alerting.service.js';
// Task 1: Redis Rate Limiter - Import Redis configuration
import { getRateLimitRedisClient, closeRateLimitRedis } from './config/redis.config.js';

// Migración Supabase: rutas feature-flagged (no rompen si las env vars faltan)
import { supabaseAuthRoutes } from './routes/auth-supabase.js';
import { searchRpcRoutes } from './routes/search-rpc.js';

dotenv.config();

// Week 5-6: Apply Prisma tracing middleware
applyPrismaMiddleware(prisma);

const app = Fastify({ logger: true });

// Plugins
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
});

// SECURITY FIX: Require JWT_SECRET in production, fail fast if not set
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret === 'supersecret') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: JWT_SECRET must be set in production environment');
  }
  console.warn('⚠️ WARNING: Using default JWT secret. Set JWT_SECRET in production!');
}

await app.register(jwt, {
  secret: jwtSecret || 'dev-only-secret-change-in-production',
  sign: {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  }
});

await app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 1,
  },
});

// Task 1: Redis-backed Rate Limiter for horizontal scaling
const rateLimitRedis = getRateLimitRedisClient();
await app.register(rateLimit, {
  max: parseInt(process.env.RATE_LIMIT_MAX || '2000'),
  timeWindow: process.env.RATE_LIMIT_WINDOW || '5 minutes',
  ...(rateLimitRedis && {
    redis: rateLimitRedis,
    nameSpace: 'legal-rag-rate-limit:',
  }),
  skipOnError: true,
  // En desarrollo local no aplicamos rate limit (UI hace muchas requests)
  allowList: (request: any) => {
    if (process.env.NODE_ENV !== 'production') {
      const ip = request.ip || '';
      if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.startsWith('::ffff:127.')) {
        return true;
      }
    }
    return false;
  },
  keyGenerator: (request: any) => {
    return request.user?.id || request.ip;
  },
  errorResponseBuilder: (request: any, context: any) => {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Please try again in ${Math.round(context.ttl / 1000)} seconds.`,
      retryAfter: Math.round(context.ttl / 1000),
    };
  },
});

// Week 5-6: Observability middleware - automatic request metrics
app.addHook('onRequest', requestMetricsMiddleware);

// Week 5-6: Error tracking middleware - automatic error metrics
app.addHook('onError', errorTrackingMiddleware);

// Decorate Fastify instance with Prisma client for global access in routes
app.decorate('prisma', prisma);

// Authentication decorator
// Cuando AUTH_BACKEND=supabase, delega en requireSupabaseAuth para que TODAS las
// rutas (cases, documents, etc.) acepten JWTs de Supabase Auth.
const USE_SUPABASE_AUTH = process.env.AUTH_BACKEND === 'supabase';
const supabaseAuthMiddleware = USE_SUPABASE_AUTH
  ? (await import('./middleware/auth-supabase.js')).requireSupabaseAuth
  : null;

app.decorate('authenticate', async function(request: any, reply: any) {
  if (supabaseAuthMiddleware) {
    await supabaseAuthMiddleware(request, reply);
    return;
  }
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// Root route - API information
app.get('/', async () => {
  return {
    name: 'Legal RAG System API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      documentation: '/api/v1/docs (coming soon)'
    },
    features: [
      'Authentication & OAuth',
      'Case Management',
      'Document Processing',
      'AI Query System',
      'Legal Document Library',
      'User Management & Subscriptions',
      'Billing & Payments',
      'Admin Panel',
      'Calendar & Events',
      'Task Management',
      'Notifications',
      'Financial Management',
      'User Feedback & Analytics',
      'Advanced Search & Query Expansion',
      'NLP Query Transformation',
      'Natural Language Legal Search',
      'AI-Powered Legal Assistant',
      'Advanced Analytics & Insights',
      'Predictive Intelligence (Case Outcomes, Timeline)',
      'Trend Analysis & Anomaly Detection',
      'Document Comparison & Similarity',
      'Legal Pattern Detection & NER',
      'Multi-level Document Summarization',
      'Real-time Streaming Summarization (SSE)'
    ]
  };
});

// Week 5-6: Observability routes (Prometheus metrics, health checks)
await app.register(metricsRoutes, { prefix: '/observability' });
await app.register(healthRoutes, { prefix: '/observability' });

// Register API routes
await app.register(authRoutes, { prefix: '/api/v1' });
await app.register((await import('./routes/auth-events.js')).authEventsRoutes, { prefix: '/api/v1' });
await app.register(twoFactorRoutes, { prefix: '/api/v1' });
await app.register(oauthRoutes, { prefix: '/api/v1' });
await app.register(caseRoutes, { prefix: '/api/v1' });
await app.register(documentRoutes, { prefix: '/api/v1' });
// TEMPORARILY DISABLED: Missing fastify-multer dependency
// await app.register(documentRoutesEnhanced, { prefix: '/api/v1' });
await app.register(queryRoutes, { prefix: '/api/v1' });
// RE-ENABLED: Legal document routes verified and ready
await app.register(legalDocumentRoutes, { prefix: '/api/v1' });
await app.register(legalDocumentRoutesV2, { prefix: '/api/v1' });
await app.register(paymentRoutes, { prefix: '/api/v1' });

// Register user management routes
await app.register(userRoutes, { prefix: '/api/v1' });
await app.register(subscriptionRoutes, { prefix: '/api/v1' });
await app.register(usageRoutes, { prefix: '/api/v1' });
await app.register(billingRoutes, { prefix: '/api/v1' });
await app.register(contactSalesRoutes, { prefix: '/api' });
await app.register(jurisdictionsRoutes, { prefix: '/api/v1' });
await app.register(payhubRoutes, { prefix: '/api/v1' });
await app.register(adminPayhubRoutes, { prefix: '/api/v1' });
await app.register(payhubPaypalRoutes, { prefix: '/api/v1' });
await app.register(settingsRoutes, { prefix: '/api/v1/user/settings' });

// Register admin routes
await app.register(adminUserRoutes, { prefix: '/api/v1' });
await app.register(adminSpecialtyRoutes, { prefix: '/api/v1' });
await app.register(adminAuditRoutes, { prefix: '/api/v1' });
await app.register(adminQuotaRoutes, { prefix: '/api/v1' });
await app.register(adminPlanRoutes, { prefix: '/api/v1' });
await app.register(adminEmbeddingsRoutes, { prefix: '/api/v1' });
await app.register(adminAiSettingsRoutes, { prefix: '/api/v1' });
await app.register(clientLawyerRoutes, { prefix: '/api/v1' });
await app.register(caseFinanceRoutes, { prefix: '/api/v1' });

// Register backup routes (Backup Management System)
await app.register(backupRoutes, { prefix: '/api/admin' });
await app.register(backupSSERoutes, { prefix: '/api/admin' });

// Register calendar, tasks, notifications, and finance routes
await app.register(calendarRoutes, { prefix: '/api/v1' });
await app.register(taskRoutes, { prefix: '/api/v1' });
await app.register(taskAiRoutes, { prefix: '/api/v1' });
await app.register(notificationsEnhancedRoutes, { prefix: '/api/v1' });
await app.register(financeRoutes, { prefix: '/api/v1' });
await app.register(financeAugmentRoutes, { prefix: '/api/v1' });
await app.register(litigationRoutes, { prefix: '/api/v1' });
await app.register(eventsExtractRoutes, { prefix: '/api/v1' });
await app.register(legalDocGenRoutes, { prefix: '/api/v1' });
await app.register(caseChatRoutes, { prefix: '/api/v1' });

// Register diagnostics routes
await app.register(diagnosticsRoutes, { prefix: '/api/v1' });

// Register migration routes (TEMPORARY - remove after use)
await app.register(migrationRoutesEmbedded, { prefix: '/api/v1/admin' });

// Register feedback routes (Phase 7: User Feedback Loop)
await app.register(feedbackRoutes, { prefix: '/api/v1/feedback' });

// Register advanced search routes (Phase 9: Advanced Search & User Experience)
await app.register(advancedSearchRoutes, { prefix: '/api/v1/search' });

// Register NLP routes (Phase 9 Week 2: Query Transformation & NLP Integration)
await app.register(nlpRoutes, { prefix: '/api/v1/nlp' });

// Register AI & Analytics routes (Phase 10: AI-Powered Legal Assistant & Advanced Analytics)
await app.register(aiAssistantRoutes, { prefix: '/api/v1' });
await app.register(analyticsRoutes, { prefix: '/api/v1' });

// Migración Supabase: registrar rutas alternativas según feature flags.
// Default: nada se registra (sigue todo igual). Activar con env vars.
if (process.env.AUTH_BACKEND === 'supabase' && process.env.SUPABASE_URL) {
  await app.register(supabaseAuthRoutes, { prefix: '/api/v1' });
  app.log.info('[migration] AUTH_BACKEND=supabase — rutas /auth/supabase/* activas');
}
if (process.env.SEARCH_BACKEND === 'rpc' && process.env.SUPABASE_URL) {
  await app.register(searchRpcRoutes, { prefix: '/api/v1' });
  app.log.info('[migration] SEARCH_BACKEND=rpc — ruta /search/legal activa (RPC + RRF + HNSW)');
}

// Register Unified Search routes (Phase 10 Week 3: NLP-RAG Performance Optimization)
// RE-ENABLED: Type fixes applied to unified-search.ts
await app.register(unifiedSearchRoutes, { prefix: '/api/v1/unified-search' });

// Register AI Predictions and Trends routes (AI/NLP Enhancements)
// RE-ENABLED: AI prediction and trend analysis routes verified and ready
await app.register(aiPredictionsRoutes, { prefix: '/api/v1' });
await app.register(trendsRoutes, { prefix: '/api/v1/trends' });

// M3: Document Summarization API - Multi-level summaries, key points, comparisons
await app.register(summarizationRoutes, { prefix: '/api/v1/summarization' });
await app.register(summarizationStreamingRoutes, { prefix: '/api/v1/summarization' });

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8000');
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${port}`);

    // Task 1: Log rate limiter status
    if (rateLimitRedis) {
      console.log('✅ Rate limiter using Redis store (horizontal scaling enabled)');
    } else {
      console.log('⚠️ Rate limiter using in-memory store (set REDIS_URL for horizontal scaling)');
    }

    // Week 5-6: Start automated alerting (check health every 60 seconds)
    if (process.env.NODE_ENV === 'production') {
      const alertingService = getAlertingService();
      alertingService.startMonitoring(60);
      console.log('✅ Automated alerting started');
    }
  } catch (err) {
    app.log.error(err instanceof Error ? err : new Error(String(err)));
    process.exit(1);
  }
};

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  try {
    await app.close();
    console.log('✅ Fastify server closed');

    // Close Redis connection for rate limiting
    await closeRateLimitRedis();
    console.log('✅ Redis connections closed');

    // Close Prisma connection
    await prisma.$disconnect();
    console.log('✅ Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();
