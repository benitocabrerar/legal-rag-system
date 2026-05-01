import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import {
  BackupService,
  RestoreService,
  BackupSchedulerService,
  BackupStorageService,
  BackupCompressionService,
  BackupEncryptionService,
  BackupNotificationService,
  DatabaseExportService,
  DatabaseImportService
} from '../../services/backup';
import {
  BackupConfig,
  BackupFilters,
  RestoreOptions,
  ScheduleCreateInput
} from '../../types/backup.types';
import { requireAdmin } from '../../middleware/auth';
import { createRateLimiter } from '../../middleware/rate-limiter';

// Request/Response schemas for validation
const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' }
  }
};

const createBackupSchema = {
  body: {
    type: 'object',
    required: ['type'],
    properties: {
      type: {
        type: 'string',
        enum: ['FULL', 'INCREMENTAL', 'DIFFERENTIAL', 'SCHEMA_ONLY', 'DATA_ONLY']
      },
      includeTables: { type: 'array', items: { type: 'string' } },
      excludeTables: { type: 'array', items: { type: 'string' } },
      compression: {
        type: 'string',
        enum: ['GZIP', 'BROTLI', 'LZ4', 'NONE']
      },
      encryption: { type: 'boolean' },
      encryptionKey: { type: 'string' },
      metadata: { type: 'object' },
      webhookUrl: { type: 'string', format: 'uri' },
      notificationEmails: { type: 'array', items: { type: 'string', format: 'email' } }
    }
  }
};

const createScheduleSchema = {
  body: {
    type: 'object',
    required: ['name', 'cronExpression', 'backupConfig'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      cronExpression: { type: 'string' },
      timezone: { type: 'string' },
      backupConfig: {
        type: 'object',
        required: ['type'],
        properties: {
          type: {
            type: 'string',
            enum: ['FULL', 'INCREMENTAL', 'DIFFERENTIAL', 'SCHEMA_ONLY', 'DATA_ONLY']
          },
          compression: { type: 'string' },
          encryption: { type: 'boolean' }
        }
      },
      retentionDays: { type: 'integer', minimum: 1, maximum: 365 },
      maxRetainedBackups: { type: 'integer', minimum: 1, maximum: 100 }
    }
  }
};

const restoreBackupSchema = {
  body: {
    type: 'object',
    required: ['overwrite', 'validateIntegrity', 'dryRun'],
    properties: {
      targetDatabase: { type: 'string' },
      overwrite: { type: 'boolean' },
      tablesToRestore: { type: 'array', items: { type: 'string' } },
      tablesToExclude: { type: 'array', items: { type: 'string' } },
      restorePoint: { type: 'string', format: 'date-time' },
      validateIntegrity: { type: 'boolean' },
      dryRun: { type: 'boolean' },
      webhookUrl: { type: 'string', format: 'uri' }
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
      minSize: { type: 'integer', minimum: 0 },
      maxSize: { type: 'integer', minimum: 0 },
      search: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
      offset: { type: 'integer', minimum: 0, default: 0 },
      sortBy: {
        type: 'string',
        enum: ['createdAt', 'size', 'name'],
        default: 'createdAt'
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        default: 'desc'
      }
    }
  }
};

export async function backupRoutes(fastify: FastifyInstance) {
  const prisma: PrismaClient = fastify.prisma;

  // Initialize services
  const backupQueue = new Queue('backup-creation', {
    connection: fastify.redis
  });

  const restoreQueue = new Queue('backup-restore', {
    connection: fastify.redis
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

  const restoreService = new RestoreService(
    prisma,
    restoreQueue,
    storageService,
    compressionService,
    encryptionService,
    notificationService,
    importService
  );

  const schedulerService = new BackupSchedulerService(
    prisma,
    backupQueue,
    backupService,
    notificationService
  );

  // Initialize scheduler
  await schedulerService.initialize();

  // Apply middleware to all routes
  fastify.addHook('preHandler', requireAdmin);

  /**
   * POST /api/v1/admin/backups/create
   * Create a new backup
   */
  fastify.post('/create', {
    schema: createBackupSchema,
    preHandler: [createRateLimiter({ max: 10, windowMs: 3600000 })]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const config = request.body as BackupConfig;
    const userId = request.user!.id;

    const backup = await backupService.createBackup(config, userId);

    return reply.code(201).send({
      success: true,
      backup,
      message: 'Backup job created and queued for processing'
    });
  });

  /**
   * POST /api/v1/admin/backups/schedule
   * Create a new backup schedule
   */
  fastify.post('/schedule', {
    schema: createScheduleSchema,
    preHandler: [createRateLimiter({ max: 20, windowMs: 3600000 })]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const input = request.body as ScheduleCreateInput;
    const userId = request.user!.id;

    const schedule = await schedulerService.createSchedule(input, userId);

    return reply.code(201).send({
      success: true,
      schedule,
      message: 'Backup schedule created successfully'
    });
  });

  /**
   * GET /api/v1/admin/backups
   * List all backups with filters
   */
  fastify.get('/', {
    schema: listBackupsSchema
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const filters = request.query as BackupFilters;

    const backups = await backupService.listBackups(filters);

    return reply.send({
      success: true,
      backups,
      total: backups.length,
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  });

  /**
   * GET /api/v1/admin/backups/:id
   * Get backup details
   */
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = request.user!.id;

    const backup = await backupService.getBackupById(id, userId);

    return reply.send({
      success: true,
      backup
    });
  });

  /**
   * DELETE /api/v1/admin/backups/:id
   * Delete a backup
   */
  fastify.delete<{ Params: { id: string } }>('/:id', {
    schema: { params: idParamsSchema },
    preHandler: [createRateLimiter({ max: 10, windowMs: 3600000 })]
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user!.id;

    await backupService.deleteBackup(id, userId);

    return reply.send({
      success: true,
      message: 'Backup deleted successfully'
    });
  });

  /**
   * POST /api/v1/admin/backups/:id/restore
   * Restore a backup
   */
  fastify.post<{ Params: { id: string } }>('/:id/restore', {
    schema: { ...restoreBackupSchema, params: idParamsSchema },
    preHandler: [createRateLimiter({ max: 5, windowMs: 3600000 })]
  }, async (request, reply) => {
    const { id } = request.params;
    const options = request.body as RestoreOptions;
    const userId = request.user!.id;

    const restoreJob = await restoreService.restoreBackup(id, options, userId);

    return reply.code(201).send({
      success: true,
      restoreJob,
      message: 'Restore job created and queued for processing'
    });
  });

  /**
   * GET /api/v1/admin/backups/:id/preview
   * Preview backup contents
   */
  fastify.get('/:id/preview', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const preview = await restoreService.previewBackup(id);

    return reply.send({
      success: true,
      preview
    });
  });

  /**
   * GET /api/v1/admin/backups/stats
   * Get backup statistics
   */
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = await backupService.getBackupStats();

    return reply.send({
      success: true,
      stats
    });
  });

  /**
   * GET /api/v1/admin/backups/schedules
   * List all backup schedules
   */
  fastify.get('/schedules', async (request: FastifyRequest, reply: FastifyReply) => {
    const schedules = await schedulerService.listSchedules();

    return reply.send({
      success: true,
      schedules,
      total: schedules.length
    });
  });

  /**
   * GET /api/v1/admin/backups/schedules/:id
   * Get schedule details
   */
  fastify.get('/schedules/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const schedule = await schedulerService.getSchedule(id);

    return reply.send({
      success: true,
      schedule
    });
  });

  /**
   * PUT /api/v1/admin/backups/schedules/:id
   * Update a backup schedule
   */
  fastify.put<{ Params: { id: string } }>('/schedules/:id', {
    schema: { ...createScheduleSchema, params: idParamsSchema },
    preHandler: [createRateLimiter({ max: 20, windowMs: 3600000 })]
  }, async (request, reply) => {
    const { id } = request.params;
    const updates = request.body as Partial<ScheduleCreateInput>;
    const userId = request.user!.id;

    const schedule = await schedulerService.updateSchedule(id, updates, userId);

    return reply.send({
      success: true,
      schedule,
      message: 'Backup schedule updated successfully'
    });
  });

  /**
   * POST /api/v1/admin/backups/schedules/:id/toggle
   * Enable or disable a schedule
   */
  fastify.post('/schedules/:id/toggle', async (request: FastifyRequest<{
    Params: { id: string },
    Body: { enabled: boolean }
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { enabled } = request.body;
    const userId = request.user!.id;

    const schedule = await schedulerService.toggleSchedule(id, enabled, userId);

    return reply.send({
      success: true,
      schedule,
      message: `Schedule ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  });

  /**
   * POST /api/v1/admin/backups/schedules/:id/execute
   * Manually execute a schedule
   */
  fastify.post<{ Params: { id: string } }>('/schedules/:id/execute', {
    schema: { params: idParamsSchema },
    preHandler: [createRateLimiter({ max: 5, windowMs: 3600000 })]
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user!.id;

    await schedulerService.executeSchedule(id, userId);

    return reply.send({
      success: true,
      message: 'Schedule executed manually'
    });
  });

  /**
   * DELETE /api/v1/admin/backups/schedules/:id
   * Delete a backup schedule
   */
  fastify.delete<{ Params: { id: string } }>('/schedules/:id', {
    schema: { params: idParamsSchema },
    preHandler: [createRateLimiter({ max: 10, windowMs: 3600000 })]
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user!.id;

    await schedulerService.deleteSchedule(id, userId);

    return reply.send({
      success: true,
      message: 'Backup schedule deleted successfully'
    });
  });

  /**
   * GET /api/v1/admin/backups/jobs/:id/status
   * Get restore job status
   */
  fastify.get('/jobs/:id/status', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const status = await restoreService.getRestoreStatus(id);

    return reply.send({
      success: true,
      job: status
    });
  });

  /**
   * POST /api/v1/admin/backups/:id/validate
   * Validate a backup
   */
  fastify.post('/:id/validate', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const validation = await restoreService.validateBackup(id);

    return reply.send({
      success: true,
      validation
    });
  });

  // Cleanup on server shutdown
  fastify.addHook('onClose', async () => {
    await schedulerService.shutdown();
    await backupQueue.close();
    await restoreQueue.close();
  });
}

export default backupRoutes;