/**
 * Backup Management API Routes
 *
 * Admin-only routes for managing database backups, restores, and schedules
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import {
  BackupConfig,
  BackupFilters,
  BackupType,
  BackupStatus,
  CompressionType,
  RestoreConfig,
  RestoreType,
  BackupJobData,
  RestoreJobData
} from '../types/backup.types.js';
import { BackupService } from '../services/backup/backup.service.js';
import { BackupStorageService } from '../services/backup/backup-storage.service.js';
import { BackupCompressionService } from '../services/backup/backup-compression.service.js';
import { BackupEncryptionService } from '../services/backup/backup-encryption.service.js';
import { BackupNotificationService } from '../services/backup/backup-notification.service.js';
import { DatabaseExportService } from '../services/backup/database-export.service.js';
import { DatabaseImportService } from '../services/backup/database-import.service.js';
import { getBackupWorker } from '../services/backup/backup.worker.js';

// Request schemas
const createBackupSchema = {
  body: {
    type: 'object',
    required: ['type'],
    properties: {
      type: { type: 'string', enum: ['FULL', 'INCREMENTAL', 'DIFFERENTIAL', 'SCHEMA_ONLY', 'DATA_ONLY'] },
      name: { type: 'string' },
      description: { type: 'string' },
      includeTables: { type: 'array', items: { type: 'string' } },
      excludeTables: { type: 'array', items: { type: 'string' } },
      compression: { type: 'string', enum: ['NONE', 'GZIP', 'BROTLI', 'LZ4'] },
      encryption: { type: 'boolean' },
      encryptionKey: { type: 'string' },
      webhookUrl: { type: 'string' },
      notificationEmails: { type: 'array', items: { type: 'string' } },
      metadata: { type: 'object' }
    }
  }
};

const listBackupsSchema = {
  querystring: {
    type: 'object',
    properties: {
      status: { type: 'array', items: { type: 'string' } },
      type: { type: 'array', items: { type: 'string' } },
      createdAfter: { type: 'string', format: 'date-time' },
      createdBefore: { type: 'string', format: 'date-time' },
      minSize: { type: 'number' },
      maxSize: { type: 'number' },
      search: { type: 'string' },
      sortBy: { type: 'string' },
      sortOrder: { type: 'string', enum: ['asc', 'desc'] },
      limit: { type: 'number', minimum: 1, maximum: 100 },
      offset: { type: 'number', minimum: 0 }
    }
  }
};

const createRestoreSchema = {
  body: {
    type: 'object',
    required: ['backupId'],
    properties: {
      backupId: { type: 'string' },
      restoreType: { type: 'string', enum: ['FULL', 'PARTIAL', 'SCHEMA_ONLY', 'DATA_ONLY'] },
      targetDatabase: { type: 'string' },
      includeTables: { type: 'array', items: { type: 'string' } },
      excludeTables: { type: 'array', items: { type: 'string' } },
      dryRun: { type: 'boolean' },
      validateFirst: { type: 'boolean' },
      createSafetyBackup: { type: 'boolean' }
    }
  }
};

export default async function backupRoutes(
  fastify: FastifyInstance,
  _options: Record<string, any> = {}
) {
  // prisma is imported from lib/prisma.js singleton
  // Initialize services
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null
  });

  const backupQueue = new Queue<BackupJobData>('backup-jobs', {
    connection: redis
  });

  const restoreQueue = new Queue<RestoreJobData>('restore-jobs', {
    connection: redis
  });

  const storageService = new BackupStorageService();
  const compressionService = new BackupCompressionService();
  const encryptionService = new BackupEncryptionService(prisma);
  const notificationService = new BackupNotificationService();
  const exportService = new DatabaseExportService(prisma);
  const importService = new DatabaseImportService();

  const backupService = new BackupService(
    prisma,
    backupQueue,
    storageService,
    compressionService,
    encryptionService,
    notificationService,
    exportService
  );

  /**
   * Create new backup
   * POST /api/admin/backups
   */
  fastify.post<{ Body: BackupConfig }>(
    '/backups',
    { schema: createBackupSchema },
    async (request: FastifyRequest<{ Body: BackupConfig }>, reply: FastifyReply) => {
      try {
        // Verify user is admin
        const userId = (request as any).user?.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required'
          });
        }

        const config: BackupConfig = {
          type: request.body.type as BackupType,
          includeTables: request.body.includeTables,
          excludeTables: request.body.excludeTables,
          compression: request.body.compression as CompressionType || 'GZIP',
          encryption: request.body.encryption !== undefined ? request.body.encryption : true,
          encryptionKey: request.body.encryptionKey,
          webhookUrl: request.body.webhookUrl,
          notificationEmails: request.body.notificationEmails,
          metadata: request.body.metadata || {}
        };

        const backup = await backupService.createBackup(config, userId);

        return reply.code(201).send({
          success: true,
          data: backup
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to create backup');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  /**
   * List backups with filters
   * GET /api/admin/backups
   */
  fastify.get<{ Querystring: BackupFilters }>(
    '/backups',
    { schema: listBackupsSchema },
    async (request: FastifyRequest<{ Querystring: BackupFilters }>, reply: FastifyReply) => {
      try {
        // Verify user is admin
        const userId = (request as any).user?.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required'
          });
        }

        const filters: BackupFilters = {
          status: request.query.status as BackupStatus[] | undefined,
          type: request.query.type as BackupType[] | undefined,
          createdAfter: request.query.createdAfter ? new Date(request.query.createdAfter) : undefined,
          createdBefore: request.query.createdBefore ? new Date(request.query.createdBefore) : undefined,
          minSize: request.query.minSize,
          maxSize: request.query.maxSize,
          search: request.query.search,
          sortBy: request.query.sortBy || 'createdAt',
          sortOrder: request.query.sortOrder || 'desc',
          limit: request.query.limit || 50,
          offset: request.query.offset || 0
        };

        const backups = await backupService.listBackups(filters);

        return reply.send({
          success: true,
          data: backups,
          meta: {
            limit: filters.limit,
            offset: filters.offset,
            count: backups.length
          }
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to list backups');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  /**
   * Get backup by ID
   * GET /api/admin/backups/:id
   */
  fastify.get<{ Params: { id: string } }>(
    '/backups/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required'
          });
        }

        const backup = await backupService.getBackupById(request.params.id, userId);

        return reply.send({
          success: true,
          data: backup
        });
      } catch (error) {
        if ((error as any).code === 'BACKUP_NOT_FOUND') {
          return reply.code(404).send({
            success: false,
            error: 'Backup not found'
          });
        }

        fastify.log.error({ err: error }, 'Failed to get backup');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  /**
   * Delete backup
   * DELETE /api/admin/backups/:id
   */
  fastify.delete<{ Params: { id: string } }>(
    '/backups/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required'
          });
        }

        await backupService.deleteBackup(request.params.id, userId);

        return reply.send({
          success: true,
          message: 'Backup deleted successfully'
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to delete backup');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  /**
   * Get backup statistics
   * GET /api/admin/backups/stats
   */
  fastify.get(
    '/backups/stats',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required'
          });
        }

        const stats = await backupService.getBackupStats();

        return reply.send({
          success: true,
          data: stats
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to get backup stats');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  /**
   * Get worker health status
   * GET /api/admin/backups/health
   */
  fastify.get(
    '/backups/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const worker = getBackupWorker();
        const health = await worker.getHealth();
        const metrics = await worker.getMetrics();

        return reply.send({
          success: true,
          data: {
            ...health,
            metrics
          }
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to get worker health');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  /**
   * Get worker metrics
   * GET /api/admin/backups/metrics
   */
  fastify.get(
    '/backups/metrics',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const worker = getBackupWorker();
        const metrics = await worker.getMetrics();

        return reply.send({
          success: true,
          data: metrics
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to get worker metrics');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  /**
   * Create restore job
   * POST /api/admin/backups/restore
   */
  fastify.post<{ Body: RestoreConfig }>(
    '/backups/restore',
    { schema: createRestoreSchema },
    async (request: FastifyRequest<{ Body: RestoreConfig }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required'
          });
        }

        // Import RestoreService dynamically
        const { RestoreService } = await import('../services/backup/restore.service.js');

        const restoreService = new RestoreService(
          prisma,
          restoreQueue,
          storageService,
          compressionService,
          encryptionService,
          notificationService,
          importService
        );

        const config: RestoreConfig = {
          backupId: request.body.backupId,
          restoreType: request.body.restoreType as RestoreType || 'FULL',
          targetDatabase: request.body.targetDatabase,
          includeTables: request.body.includeTables,
          excludeTables: request.body.excludeTables,
          dryRun: request.body.dryRun || false,
          validateFirst: request.body.validateFirst !== undefined ? request.body.validateFirst : true,
          createSafetyBackup: request.body.createSafetyBackup !== undefined ? request.body.createSafetyBackup : true
        };

        const restoreJob = await restoreService.createRestore(config, userId);

        return reply.code(201).send({
          success: true,
          data: restoreJob
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to create restore job');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  /**
   * List restore jobs
   * GET /api/admin/backups/restores
   */
  fastify.get(
    '/backups/restores',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required'
          });
        }

        // createdBy is a string field, not a relation
        const restores = await prisma.restoreJob.findMany({
          include: {
            backup: true
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        });

        return reply.send({
          success: true,
          data: restores
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to list restore jobs');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  /**
   * Get restore job by ID
   * GET /api/admin/backups/restores/:id
   */
  fastify.get<{ Params: { id: string } }>(
    '/backups/restores/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required'
          });
        }

        // createdBy is a string field, not a relation
        const restore = await prisma.restoreJob.findUnique({
          where: { id: request.params.id },
          include: {
            backup: true
          }
        });

        if (!restore) {
          return reply.code(404).send({
            success: false,
            error: 'Restore job not found'
          });
        }

        return reply.send({
          success: true,
          data: restore
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to get restore job');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  // ========== SCHEDULE MANAGEMENT ROUTES ==========

  /**
   * List backup schedules
   * GET /api/admin/backups/schedules
   */
  fastify.get(
    '/backups/schedules',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required'
          });
        }

        // Import BackupSchedulerService dynamically
        const { BackupSchedulerService } = await import('../services/backup/backup-scheduler.service');

        const schedulerService = new BackupSchedulerService(
          prisma,
          backupQueue,
          backupService,
          notificationService
        );

        const schedules = await schedulerService.listSchedules();

        return reply.send({
          success: true,
          data: schedules
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to list schedules');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  /**
   * Get schedule by ID
   * GET /api/admin/backups/schedules/:id
   */
  fastify.get<{ Params: { id: string } }>(
    '/backups/schedules/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required'
          });
        }

        const { BackupSchedulerService } = await import('../services/backup/backup-scheduler.service');

        const schedulerService = new BackupSchedulerService(
          prisma,
          backupQueue,
          backupService,
          notificationService
        );

        const schedule = await schedulerService.getSchedule(request.params.id);

        return reply.send({
          success: true,
          data: schedule
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to get schedule');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  /**
   * Create backup schedule
   * POST /api/admin/backups/schedules
   */
  fastify.post(
    '/backups/schedules',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required'
          });
        }

        const { BackupSchedulerService } = await import('../services/backup/backup-scheduler.service');

        const schedulerService = new BackupSchedulerService(
          prisma,
          backupQueue,
          backupService,
          notificationService
        );

        const schedule = await schedulerService.createSchedule(
          request.body as any,
          userId
        );

        return reply.code(201).send({
          success: true,
          data: schedule
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to create schedule');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  /**
   * Update backup schedule
   * PUT /api/admin/backups/schedules/:id
   */
  fastify.put<{ Params: { id: string } }>(
    '/backups/schedules/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required'
          });
        }

        const { BackupSchedulerService } = await import('../services/backup/backup-scheduler.service');

        const schedulerService = new BackupSchedulerService(
          prisma,
          backupQueue,
          backupService,
          notificationService
        );

        const schedule = await schedulerService.updateSchedule(
          request.params.id,
          request.body as any,
          userId
        );

        return reply.send({
          success: true,
          data: schedule
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to update schedule');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  /**
   * Toggle schedule enabled/disabled
   * PATCH /api/admin/backups/schedules/:id/toggle
   */
  fastify.patch<{ Params: { id: string }; Body: { enabled: boolean } }>(
    '/backups/schedules/:id/toggle',
    async (request: FastifyRequest<{ Params: { id: string }; Body: { enabled: boolean } }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required'
          });
        }

        const { BackupSchedulerService } = await import('../services/backup/backup-scheduler.service');

        const schedulerService = new BackupSchedulerService(
          prisma,
          backupQueue,
          backupService,
          notificationService
        );

        const schedule = await schedulerService.toggleSchedule(
          request.params.id,
          request.body.enabled,
          userId
        );

        return reply.send({
          success: true,
          data: schedule
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to toggle schedule');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  /**
   * Execute schedule manually
   * POST /api/admin/backups/schedules/:id/execute
   */
  fastify.post<{ Params: { id: string } }>(
    '/backups/schedules/:id/execute',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required'
          });
        }

        const { BackupSchedulerService } = await import('../services/backup/backup-scheduler.service');

        const schedulerService = new BackupSchedulerService(
          prisma,
          backupQueue,
          backupService,
          notificationService
        );

        await schedulerService.executeSchedule(request.params.id, userId);

        return reply.send({
          success: true,
          message: 'Schedule executed successfully'
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to execute schedule');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );

  /**
   * Delete backup schedule
   * DELETE /api/admin/backups/schedules/:id
   */
  fastify.delete<{ Params: { id: string } }>(
    '/backups/schedules/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required'
          });
        }

        const { BackupSchedulerService } = await import('../services/backup/backup-scheduler.service');

        const schedulerService = new BackupSchedulerService(
          prisma,
          backupQueue,
          backupService,
          notificationService
        );

        await schedulerService.deleteSchedule(request.params.id, userId);

        return reply.send({
          success: true,
          message: 'Schedule deleted successfully'
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to delete schedule');
        return reply.code(500).send({
          success: false,
          error: (error as Error).message
        });
      }
    }
  );
}
