import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

import { config, validateConfig, isDevelopment } from './utils/config';
import { logger } from './utils/logger';
import { checkDatabaseConnection } from './utils/prisma';

// Routes (to be created)
// import authRoutes from './routes/auth';
// import casesRoutes from './routes/cases';
// import chatRoutes from './routes/chat';
// import searchRoutes from './routes/search';

// ============================================================================
// Server Setup
// ============================================================================

async function buildServer() {
  const server = Fastify({
    logger: isDevelopment
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        }
      : true,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true,
      },
    },
  });

  // ============================================================================
  // Plugins
  // ============================================================================

  // CORS
  await server.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  // JWT Authentication
  await server.register(jwt, {
    secret: config.jwt.secret,
    sign: {
      expiresIn: config.jwt.expiresIn,
    },
  });

  // File Upload
  await server.register(multipart, {
    limits: {
      fileSize: config.upload.maxFileSizeMB * 1024 * 1024, // Convert MB to bytes
      files: 1,
    },
  });

  // Rate Limiting
  await server.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
  });

  // Swagger Documentation
  await server.register(swagger, {
    swagger: {
      info: {
        title: 'Legal RAG System API',
        description: 'API documentation for Legal RAG System',
        version: '0.1.0',
      },
      host: `localhost:${config.port}`,
      schemes: ['http', 'https'],
      consumes: ['application/json', 'multipart/form-data'],
      produces: ['application/json'],
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'cases', description: 'Case management endpoints' },
        { name: 'documents', description: 'Document management endpoints' },
        { name: 'chat', description: 'Chat and RAG endpoints' },
        { name: 'search', description: 'Search endpoints' },
        { name: 'subscriptions', description: 'Subscription management endpoints' },
        { name: 'health', description: 'Health check endpoints' },
      ],
      securityDefinitions: {
        Bearer: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
        },
      },
    },
  });

  await server.register(swaggerUI, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // ============================================================================
  // Hooks
  // ============================================================================

  // Request logging
  server.addHook('onRequest', async (request, reply) => {
    request.startTime = Date.now();
  });

  server.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - (request.startTime || Date.now());
    logger.http(request.method, request.url, reply.statusCode, duration);
  });

  // Error handler
  server.setErrorHandler((error, request, reply) => {
    logger.error('Request error:', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    });

    // Handle validation errors
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: error.validation,
      });
    }

    // Handle JWT errors
    if (error.message.includes('jwt') || error.message.includes('token')) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: error.message,
      });
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      success: false,
      error: isDevelopment ? error.message : 'Internal server error',
      ...(isDevelopment && { stack: error.stack }),
    });
  });

  // ============================================================================
  // Routes
  // ============================================================================

  // Health check
  server.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            database: { type: 'boolean' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const dbConnected = await checkDatabaseConnection();

      return reply.send({
        status: dbConnected ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        database: dbConnected,
        version: '0.1.0',
      });
    },
  });

  // Root endpoint
  server.get('/', async (request, reply) => {
    return reply.send({
      name: 'Legal RAG System API',
      version: '0.1.0',
      environment: config.env,
      documentation: '/documentation',
      health: '/health',
    });
  });

  // Register route modules (uncomment as routes are created)
  // await server.register(authRoutes, { prefix: '/api/auth' });
  // await server.register(casesRoutes, { prefix: '/api/cases' });
  // await server.register(chatRoutes, { prefix: '/api/chat' });
  // await server.register(searchRoutes, { prefix: '/api/search' });

  return server;
}

// ============================================================================
// Start Server
// ============================================================================

async function start() {
  try {
    // Validate configuration
    logger.info('Validating configuration...');
    validateConfig();

    // Check database connection
    logger.info('Checking database connection...');
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }
    logger.info('✅ Database connected');

    // Build and start server
    const server = await buildServer();

    await server.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    logger.info(`🚀 Server running on port ${config.port}`);
    logger.info(`📚 API Documentation: http://localhost:${config.port}/documentation`);
    logger.info(`🏥 Health check: http://localhost:${config.port}/health`);
    logger.info(`🌍 Environment: ${config.env}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    process.exit(0);
  });
});

// Augment FastifyRequest type
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

// Start the server
start();
