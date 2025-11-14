// Week 5-6: Initialize OpenTelemetry BEFORE any other imports
import { initializeTelemetry } from './config/telemetry.js';
initializeTelemetry();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.js';
import { twoFactorRoutes } from './routes/two-factor.js';
import { oauthRoutes } from './routes/oauth.js';
import { caseRoutes } from './routes/cases.js';
import { documentRoutes } from './routes/documents.js';
import { queryRoutes } from './routes/query.js';
import { legalDocumentRoutes } from './routes/legal-documents.js';
import { legalDocumentRoutesV2 } from './routes/legal-documents-v2.js';
// TEMPORARILY DISABLED: nodemailer import issue causing deployment failure
// import { legalDocumentRoutesEnhanced } from './routes/legal-documents-enhanced.js';
// TEMPORARILY DISABLED: Missing fastify-multer dependency
// import { documentRoutesEnhanced } from './routes/documents-enhanced.js';
import { adminUserRoutes } from './routes/admin/users.js';
import { adminSpecialtyRoutes } from './routes/admin/specialties.js';
import { adminAuditRoutes } from './routes/admin/audit.js';
import { adminQuotaRoutes } from './routes/admin/quotas.js';
import { adminPlanRoutes } from './routes/admin/plans.js';
import { paymentRoutes } from './routes/payments.js';
import { userRoutes } from './routes/user.js';
import { subscriptionRoutes } from './routes/subscription.js';
import { usageRoutes } from './routes/usage.js';
import { billingRoutes } from './routes/billing.js';
import { settingsRoutes } from './routes/settings.js';
import { calendarRoutes } from './routes/calendar.js';
import { taskRoutes } from './routes/tasks.js';
import { notificationsEnhancedRoutes } from './routes/notifications-enhanced.js';
import { financeRoutes } from './routes/finance.js';
import { diagnosticsRoutes } from './routes/diagnostics.js';
import { migrationRoutesEmbedded } from './routes/admin/migration-embedded.js';
import { feedbackRoutes } from './routes/feedback.js';
import { advancedSearchRoutes } from './routes/advanced-search.js';
import { nlpRoutes } from './routes/nlp.js';
import { aiAssistantRoutes } from './routes/ai-assistant.js';
import { analyticsRoutes } from './routes/analytics.js';
import { unifiedSearchRoutes } from './routes/unified-search.js';
// Week 5-6: Observability routes and middleware
import metricsRoutes from './routes/observability/metrics.routes.js';
import healthRoutes from './routes/observability/health.routes.js';
import { requestMetricsMiddleware } from './middleware/observability.middleware.js';
import { applyPrismaMiddleware } from './middleware/prisma.middleware.js';
import { getAlertingService } from './services/observability/alerting.service.js';

dotenv.config();

const prisma = new PrismaClient();

// Week 5-6: Apply Prisma tracing middleware
applyPrismaMiddleware(prisma);

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

// Week 5-6: Observability middleware - automatic request metrics
app.addHook('onRequest', requestMetricsMiddleware);

// Authentication decorator
app.decorate('authenticate', async function(request: any, reply: any) {
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
      'Advanced Analytics & Insights'
    ]
  };
});

// Week 5-6: Observability routes (Prometheus metrics, health checks)
await app.register(metricsRoutes, { prefix: '/observability' });
await app.register(healthRoutes, { prefix: '/observability' });

// Register API routes
await app.register(authRoutes, { prefix: '/api/v1' });
await app.register(twoFactorRoutes, { prefix: '/api/v1' });
await app.register(oauthRoutes, { prefix: '/api/v1' });
await app.register(caseRoutes, { prefix: '/api/v1' });
await app.register(documentRoutes, { prefix: '/api/v1' });
// TEMPORARILY DISABLED: Missing fastify-multer dependency
// await app.register(documentRoutesEnhanced, { prefix: '/api/v1' });
await app.register(queryRoutes, { prefix: '/api/v1' });
await app.register(legalDocumentRoutes, { prefix: '/api/v1' });
await app.register(legalDocumentRoutesV2, { prefix: '/api/v1' });
// TEMPORARILY DISABLED: nodemailer import issue causing deployment failure
// await app.register(legalDocumentRoutesEnhanced, { prefix: '/api/v1' });
await app.register(paymentRoutes, { prefix: '/api/v1' });

// Register user management routes
await app.register(userRoutes, { prefix: '/api/v1' });
await app.register(subscriptionRoutes, { prefix: '/api/v1' });
await app.register(usageRoutes, { prefix: '/api/v1' });
await app.register(billingRoutes, { prefix: '/api/v1' });
await app.register(settingsRoutes, { prefix: '/api/v1' });

// Register admin routes
await app.register(adminUserRoutes, { prefix: '/api/v1' });
await app.register(adminSpecialtyRoutes, { prefix: '/api/v1' });
await app.register(adminAuditRoutes, { prefix: '/api/v1' });
await app.register(adminQuotaRoutes, { prefix: '/api/v1' });
await app.register(adminPlanRoutes, { prefix: '/api/v1' });

// Register calendar, tasks, notifications, and finance routes
await app.register(calendarRoutes, { prefix: '/api/v1' });
await app.register(taskRoutes, { prefix: '/api/v1' });
await app.register(notificationsEnhancedRoutes, { prefix: '/api/v1' });
await app.register(financeRoutes, { prefix: '/api/v1' });

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

// Register Unified Search routes (Phase 10 Week 3: NLP-RAG Performance Optimization)
await app.register(unifiedSearchRoutes, { prefix: '/api/v1/unified-search' });

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8000');
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${port}`);

    // Week 5-6: Start automated alerting (check health every 60 seconds)
    if (process.env.NODE_ENV === 'production') {
      const alertingService = getAlertingService();
      alertingService.startMonitoring(60);
      console.log('✅ Automated alerting started');
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
