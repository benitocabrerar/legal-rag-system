/**
 * Backup Real-Time Monitoring Routes (SSE)
 *
 * Server-Sent Events endpoint for real-time backup status updates
 * Provides: Live progress tracking, status changes, completion notifications
 *
 * Enhanced with comprehensive error handling:
 * - Redis connection resilience with auto-reconnect
 * - Graceful client disconnect handling
 * - Structured error logging
 * - Connection timeout management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { QueueEvents } from 'bullmq';
import Redis from 'ioredis';

interface BackupSSEClient {
  reply: FastifyReply;
  userId: string;
  connectedAt: Date;
  lastActivity: Date;
  filters?: {
    backupId?: string;
    status?: string[];
  };
}

interface SSEError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

// Active SSE connections
const sseClients = new Map<string, BackupSSEClient>();

// Redis connection for queue events
let redis: Redis | null = null;
let queueEvents: QueueEvents | null = null;
let isRedisConnected = false;
let redisReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 5000;

// Connection timeout (1 hour default)
const CONNECTION_TIMEOUT_MS = parseInt(process.env.SSE_TIMEOUT_MS || '3600000');

// Logger helper
function logSSEError(context: string, error: Error | unknown, metadata?: Record<string, any>) {
  const errorObj: SSEError = {
    code: (error as any)?.code || 'SSE_ERROR',
    message: error instanceof Error ? error.message : String(error),
    details: {
      ...metadata,
      stack: error instanceof Error ? error.stack : undefined
    },
    timestamp: new Date().toISOString()
  };
  console.error(`[SSE:${context}]`, JSON.stringify(errorObj));
  return errorObj;
}

function logSSEInfo(context: string, message: string, metadata?: Record<string, any>) {
  console.log(`[SSE:${context}]`, JSON.stringify({
    message,
    ...metadata,
    timestamp: new Date().toISOString()
  }));
}

async function initializeRedis(): Promise<boolean> {
  if (redis && isRedisConnected) {
    return true;
  }

  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times: number) => {
        if (times > MAX_RECONNECT_ATTEMPTS) {
          logSSEError('Redis', new Error('Max reconnection attempts reached'), { attempts: times });
          return null;
        }
        const delay = Math.min(times * 1000, 30000);
        logSSEInfo('Redis', `Reconnecting in ${delay}ms`, { attempt: times });
        return delay;
      }
    });

    // Setup Redis connection event handlers
    redis.on('connect', () => {
      isRedisConnected = true;
      redisReconnectAttempts = 0;
      logSSEInfo('Redis', 'Connected successfully');
    });

    redis.on('error', (error) => {
      logSSEError('Redis', error, { state: 'connection_error' });
    });

    redis.on('close', () => {
      isRedisConnected = false;
      logSSEInfo('Redis', 'Connection closed');
    });

    redis.on('reconnecting', () => {
      redisReconnectAttempts++;
      logSSEInfo('Redis', 'Attempting reconnection', { attempt: redisReconnectAttempts });
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout'));
      }, 10000);

      redis!.once('ready', () => {
        clearTimeout(timeout);
        isRedisConnected = true;
        resolve();
      });

      redis!.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    queueEvents = new QueueEvents('backup-jobs', { connection: redis });

    // Listen to queue events
    setupQueueListeners();

    return true;
  } catch (error) {
    logSSEError('Redis', error as Error, { context: 'initialization' });
    return false;
  }
}

function setupQueueListeners() {
  if (!queueEvents) return;

  // Job progress updates - QueueEvents uses different event signatures
  queueEvents.on('progress', async ({ jobId, data }) => {
    try {
      const progress = typeof data === 'number' ? data : (data as any)?.progress || 0;
      await broadcastToClients({
        type: 'progress',
        jobId,
        progress,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logSSEError('QueueProgress', error, { jobId });
    }
  });

  // Job completed
  queueEvents.on('completed', async ({ jobId, returnvalue }) => {
    try {
      // Parse returnvalue to get backupId if available
      let result: any = null;
      try {
        result = typeof returnvalue === 'string' ? JSON.parse(returnvalue) : returnvalue;
      } catch (parseError) {
        logSSEError('QueueCompleted', parseError, { jobId, context: 'JSON parse' });
      }

      const backupId = result?.backupId;

      if (backupId) {
        // Fetch updated backup data (createdBy is a string field, not a relation)
        const backup = await prisma.backup.findUnique({
          where: { id: backupId }
        });

        await broadcastToClients({
          type: 'completed',
          backupId,
          backup,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logSSEError('QueueCompleted', error, { jobId });
    }
  });

  // Job failed
  queueEvents.on('failed', async ({ jobId, failedReason }) => {
    try {
      await broadcastToClients({
        type: 'failed',
        jobId,
        error: failedReason,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logSSEError('QueueFailed', error, { jobId, failedReason });
    }
  });
}

async function broadcastToClients(event: any) {
  const message = `data: ${JSON.stringify(event)}\n\n`;
  const disconnectedClients: string[] = [];

  for (const [clientId, client] of sseClients.entries()) {
    try {
      // Apply filters if set
      if (client.filters?.backupId && event.backupId !== client.filters.backupId) {
        continue;
      }

      if (client.filters?.status && event.backup) {
        if (!client.filters.status.includes(event.backup.status)) {
          continue;
        }
      }

      // Send event to client
      client.reply.raw.write(message);

      // Update last activity timestamp
      client.lastActivity = new Date();
    } catch (error) {
      // Client disconnected, mark for removal
      disconnectedClients.push(clientId);
      logSSEError('Broadcast', error, {
        clientId,
        userId: client.userId,
        eventType: event.type
      });
    }
  }

  // Remove disconnected clients
  for (const clientId of disconnectedClients) {
    sseClients.delete(clientId);
    logSSEInfo('ClientCleanup', 'Removed disconnected client', { clientId });
  }
}

// Cleanup stale connections (older than CONNECTION_TIMEOUT_MS)
function cleanupStaleConnections() {
  const now = Date.now();
  const staleClients: string[] = [];

  for (const [clientId, client] of sseClients.entries()) {
    const connectionAge = now - client.connectedAt.getTime();
    const inactivityDuration = now - client.lastActivity.getTime();

    // Remove if connection is too old or inactive for too long
    if (connectionAge > CONNECTION_TIMEOUT_MS || inactivityDuration > CONNECTION_TIMEOUT_MS / 2) {
      staleClients.push(clientId);
    }
  }

  for (const clientId of staleClients) {
    const client = sseClients.get(clientId);
    if (client) {
      try {
        // Send disconnect event before closing
        client.reply.raw.write(`data: ${JSON.stringify({
          type: 'timeout',
          reason: 'connection_timeout',
          timestamp: new Date().toISOString()
        })}\n\n`);
        client.reply.raw.end();
      } catch (error) {
        // Client already disconnected
      }
      sseClients.delete(clientId);
      logSSEInfo('StaleCleanup', 'Removed stale connection', {
        clientId,
        userId: client.userId
      });
    }
  }
}

// Periodic heartbeat to keep connections alive
let heartbeatInterval: NodeJS.Timeout | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;

function startHeartbeat() {
  if (heartbeatInterval) return;

  // Heartbeat every 30 seconds
  heartbeatInterval = setInterval(() => {
    const heartbeat = `: heartbeat ${Date.now()}\n\n`;
    const disconnectedClients: string[] = [];

    for (const [clientId, client] of sseClients.entries()) {
      try {
        client.reply.raw.write(heartbeat);
        client.lastActivity = new Date();
      } catch (error) {
        disconnectedClients.push(clientId);
      }
    }

    // Cleanup disconnected clients
    for (const clientId of disconnectedClients) {
      sseClients.delete(clientId);
      logSSEInfo('HeartbeatCleanup', 'Removed disconnected client', { clientId });
    }
  }, 30000);

  // Stale connection cleanup every 5 minutes
  cleanupInterval = setInterval(() => {
    cleanupStaleConnections();
  }, 300000);

  logSSEInfo('Heartbeat', 'Started heartbeat and cleanup intervals');
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  logSSEInfo('Heartbeat', 'Stopped heartbeat and cleanup intervals');
}

export async function backupSSERoutes(app: FastifyInstance) {
  /**
   * SSE endpoint for real-time backup monitoring
   * GET /api/admin/backups/events
   *
   * Query params:
   * - backupId: Filter events for specific backup
   * - status: Filter events by backup status (comma-separated)
   */
  app.get('/backups/events', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Authenticate user
      await request.jwtVerify();
      const userId = (request.user as any).id;

      // Verify admin role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user || user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      // Initialize Redis if not already done
      initializeRedis();
      startHeartbeat();

      // Parse filters from query params
      const query = request.query as any;
      const filters: BackupSSEClient['filters'] = {};

      if (query.backupId) {
        filters.backupId = query.backupId;
      }

      if (query.status) {
        filters.status = query.status.split(',');
      }

      // Setup SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
      });

      // Generate unique client ID
      const clientId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();

      // Add client to active connections with full tracking data
      sseClients.set(clientId, {
        reply,
        userId,
        connectedAt: now,
        lastActivity: now,
        filters
      });

      logSSEInfo('ClientConnected', 'New SSE client connected', {
        clientId,
        userId,
        filters: filters ? JSON.stringify(filters) : 'none'
      });

      // Send initial connection event
      reply.raw.write(`data: ${JSON.stringify({
        type: 'connected',
        clientId,
        timeout: CONNECTION_TIMEOUT_MS,
        timestamp: now.toISOString()
      })}\n\n`);

      // Send current active backups (createdBy is a string field, not a relation)
      try {
        const activeBackups = await prisma.backup.findMany({
          where: {
            status: { in: ['PENDING', 'IN_PROGRESS'] }
          }
        });

        if (activeBackups.length > 0) {
          reply.raw.write(`data: ${JSON.stringify({
            type: 'initial',
            activeBackups,
            timestamp: new Date().toISOString()
          })}\n\n`);
        }
      } catch (dbError) {
        logSSEError('InitialBackups', dbError, { clientId });
        // Send empty initial state on error
        reply.raw.write(`data: ${JSON.stringify({
          type: 'initial',
          activeBackups: [],
          error: 'Failed to fetch active backups',
          timestamp: new Date().toISOString()
        })}\n\n`);
      }

      // Handle client disconnect
      request.raw.on('close', () => {
        sseClients.delete(clientId);
        logSSEInfo('ClientDisconnected', 'SSE client disconnected', { clientId, userId });

        // Stop heartbeat if no clients
        if (sseClients.size === 0) {
          stopHeartbeat();
        }
      });

      // Handle client error
      request.raw.on('error', (error) => {
        logSSEError('ClientError', error, { clientId, userId });
        sseClients.delete(clientId);
      });

      // Keep connection open
      await new Promise(() => {});
    } catch (error: any) {
      app.log.error('SSE connection error:', error);
      reply.code(500).send({ error: 'Failed to establish SSE connection' });
    }
  });

  /**
   * Manually trigger backup status event
   * POST /api/admin/backups/:id/notify
   *
   * For manual notifications or testing
   */
  app.post('/backups/:id/notify', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).id;

      // Verify admin role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user || user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const { id } = request.params as { id: string };

      // Fetch backup (createdBy is a string field, not a relation)
      const backup = await prisma.backup.findUnique({
        where: { id }
      });

      if (!backup) {
        return reply.code(404).send({ error: 'Backup not found' });
      }

      // Broadcast update
      await broadcastToClients({
        type: 'update',
        backupId: id,
        backup,
        timestamp: new Date().toISOString()
      });

      return { success: true, message: 'Notification sent' };
    } catch (error: any) {
      app.log.error('Manual notification error:', error);
      return reply.code(500).send({ error: 'Failed to send notification' });
    }
  });

  /**
   * Get active SSE connections
   * GET /api/admin/backups/connections
   */
  app.get('/backups/connections', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).id;

      // Verify admin role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user || user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const now = Date.now();
      const connections = Array.from(sseClients.entries()).map(([clientId, client]) => ({
        clientId,
        userId: client.userId,
        filters: client.filters,
        connectedAt: client.connectedAt.toISOString(),
        lastActivity: client.lastActivity.toISOString(),
        connectionDurationMs: now - client.connectedAt.getTime(),
        idleDurationMs: now - client.lastActivity.getTime()
      }));

      return {
        total: connections.length,
        redisConnected: isRedisConnected,
        heartbeatActive: heartbeatInterval !== null,
        connections
      };
    } catch (error: any) {
      app.log.error('Get connections error:', error);
      return reply.code(500).send({ error: 'Failed to get connections' });
    }
  });
}

// Cleanup on module unload
process.on('exit', () => {
  logSSEInfo('Shutdown', 'Process exiting, cleaning up SSE resources');
  stopHeartbeat();
  if (redis) {
    redis.disconnect();
  }
  if (queueEvents) {
    queueEvents.close().catch(() => {});
  }
});

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
  logSSEInfo('Shutdown', 'SIGTERM received, graceful shutdown');

  // Notify all connected clients
  for (const [clientId, client] of sseClients.entries()) {
    try {
      client.reply.raw.write(`data: ${JSON.stringify({
        type: 'shutdown',
        reason: 'server_shutdown',
        timestamp: new Date().toISOString()
      })}\n\n`);
      client.reply.raw.end();
    } catch (error) {
      // Client already disconnected
    }
  }

  sseClients.clear();
  stopHeartbeat();

  if (redis) {
    redis.disconnect();
  }
  if (queueEvents) {
    queueEvents.close().catch(() => {});
  }
});
