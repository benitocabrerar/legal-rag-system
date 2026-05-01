import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import * as cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import {
  BackupSchedule,
  ScheduleCreateInput,
  BackupConfig,
  BackupJobData,
  BackupWebhookEvent,
  BackupType,
  CompressionType
} from '../../types/backup.types.js';
import { BackupService } from './backup.service.js';
import { BackupNotificationService } from './backup-notification.service.js';
import { logger } from '../../utils/logger.js';

export class BackupSchedulerService {
  private prisma: PrismaClient;
  private backupQueue: Queue<BackupJobData>;
  private backupService: BackupService;
  private notificationService: BackupNotificationService;
  private schedules: Map<string, cron.ScheduledTask>;

  constructor(
    prisma: PrismaClient,
    backupQueue: Queue<BackupJobData>,
    backupService: BackupService,
    notificationService: BackupNotificationService
  ) {
    this.prisma = prisma;
    this.backupQueue = backupQueue;
    this.backupService = backupService;
    this.notificationService = notificationService;
    this.schedules = new Map();
  }

  /**
   * Initialize scheduler - load all active schedules
   */
  async initialize(): Promise<void> {
    logger.info('Initializing backup scheduler');

    const activeSchedules = await this.prisma.backupSchedule.findMany({
      where: { enabled: true }
    });

    for (const schedule of activeSchedules) {
      await this.activateSchedule(schedule.id);
    }

    logger.info(`Activated ${activeSchedules.length} backup schedules`);

    // Start cleanup job for expired backups
    this.scheduleCleanupJob();
  }

  /**
   * Create a new backup schedule
   */
  async createSchedule(
    input: ScheduleCreateInput,
    userId: string
  ): Promise<BackupSchedule> {
    try {
      // Validate cron expression
      if (!cron.validate(input.cronExpression)) {
        throw new Error('Invalid cron expression');
      }

      // Calculate next run time
      const nextRunAt = this.calculateNextRun(
        input.cronExpression,
        input.timezone || 'UTC'
      );

      // Map BackupConfig to individual fields
      const backupConfig = input.backupConfig;

      // Create schedule in database
      const schedule = await this.prisma.backupSchedule.create({
        data: {
          id: uuidv4(),
          name: input.name,
          description: input.description,
          cronExpression: input.cronExpression,
          timezone: input.timezone || 'UTC',
          // Map backupConfig to individual schema fields
          backupType: (backupConfig.type as any) || 'FULL',
          compression: (backupConfig.compression as any) || 'GZIP',
          encryption: backupConfig.encryption ?? true,
          includeTables: backupConfig.includeTables || [],
          excludeTables: backupConfig.excludeTables || [],
          webhookUrl: backupConfig.webhookUrl,
          metadata: backupConfig.metadata,
          retentionDays: input.retentionDays || 30,
          retentionCount: input.maxRetainedBackups,
          nextRunAt,
          createdBy: userId,
          enabled: true
        }
      });

      // Activate the schedule
      await this.activateSchedule(schedule.id);

      // Log audit
      await this.createAuditLog('SCHEDULE_CREATED', 'schedule', schedule.id, userId, {
        schedule: input
      });

      logger.info('Backup schedule created', { scheduleId: schedule.id, userId });

      return this.formatSchedule(schedule);
    } catch (error) {
      logger.error('Failed to create backup schedule', { error, input, userId });
      throw error;
    }
  }

  /**
   * Update an existing schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<ScheduleCreateInput>,
    userId: string
  ): Promise<BackupSchedule> {
    try {
      const existing = await this.prisma.backupSchedule.findUnique({
        where: { id: scheduleId }
      });

      if (!existing) {
        throw new Error('Schedule not found');
      }

      // Validate cron expression if provided
      if (updates.cronExpression && !cron.validate(updates.cronExpression)) {
        throw new Error('Invalid cron expression');
      }

      // Calculate next run time if cron expression changed
      let nextRunAt = existing.nextRunAt;
      if (updates.cronExpression || updates.timezone) {
        nextRunAt = this.calculateNextRun(
          updates.cronExpression || existing.cronExpression,
          updates.timezone || existing.timezone
        );
      }

      // Prepare update data
      const updateData: any = {
        name: updates.name,
        description: updates.description,
        cronExpression: updates.cronExpression,
        timezone: updates.timezone,
        retentionDays: updates.retentionDays,
        retentionCount: updates.maxRetainedBackups,
        nextRunAt,
        updatedAt: new Date()
      };

      // Map backupConfig to individual fields if provided
      if (updates.backupConfig) {
        updateData.backupType = updates.backupConfig.type;
        updateData.compression = updates.backupConfig.compression;
        updateData.encryption = updates.backupConfig.encryption;
        updateData.includeTables = updates.backupConfig.includeTables;
        updateData.excludeTables = updates.backupConfig.excludeTables;
        updateData.webhookUrl = updates.backupConfig.webhookUrl;
        updateData.metadata = updates.backupConfig.metadata;
      }

      // Update in database
      const schedule = await this.prisma.backupSchedule.update({
        where: { id: scheduleId },
        data: updateData
      });

      // Re-activate the schedule if it's enabled
      if (schedule.enabled) {
        await this.deactivateSchedule(scheduleId);
        await this.activateSchedule(scheduleId);
      }

      // Log audit
      await this.createAuditLog('SCHEDULE_UPDATED', 'schedule', scheduleId, userId, {
        updates
      });

      logger.info('Backup schedule updated', { scheduleId, userId });

      return this.formatSchedule(schedule);
    } catch (error) {
      logger.error('Failed to update backup schedule', { error, scheduleId, userId });
      throw error;
    }
  }

  /**
   * Enable or disable a schedule
   */
  async toggleSchedule(
    scheduleId: string,
    enabled: boolean,
    userId: string
  ): Promise<BackupSchedule> {
    try {
      const schedule = await this.prisma.backupSchedule.update({
        where: { id: scheduleId },
        data: {
          enabled,
          updatedAt: new Date()
        }
      });

      if (enabled) {
        await this.activateSchedule(scheduleId);
      } else {
        await this.deactivateSchedule(scheduleId);
      }

      logger.info(`Backup schedule ${enabled ? 'enabled' : 'disabled'}`, {
        scheduleId,
        userId
      });

      return this.formatSchedule(schedule);
    } catch (error) {
      logger.error('Failed to toggle backup schedule', { error, scheduleId, userId });
      throw error;
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string, userId: string): Promise<void> {
    try {
      // Deactivate first
      await this.deactivateSchedule(scheduleId);

      // Delete from database
      await this.prisma.backupSchedule.delete({
        where: { id: scheduleId }
      });

      // Log audit
      await this.createAuditLog('SCHEDULE_DELETED', 'schedule', scheduleId, userId);

      logger.info('Backup schedule deleted', { scheduleId, userId });
    } catch (error) {
      logger.error('Failed to delete backup schedule', { error, scheduleId, userId });
      throw error;
    }
  }

  /**
   * Get all schedules
   */
  async listSchedules(filters?: {
    enabled?: boolean;
    userId?: string;
  }): Promise<BackupSchedule[]> {
    const where: any = {};

    if (filters?.enabled !== undefined) {
      where.enabled = filters.enabled;
    }

    if (filters?.userId) {
      where.createdBy = filters.userId;
    }

    const schedules = await this.prisma.backupSchedule.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return schedules.map(s => this.formatSchedule(s));
  }

  /**
   * Get schedule by ID
   */
  async getSchedule(scheduleId: string): Promise<BackupSchedule> {
    const schedule = await this.prisma.backupSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        backups: {
          select: { id: true, status: true, createdAt: true }
        }
      }
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    return this.formatSchedule(schedule);
  }

  /**
   * Execute a schedule immediately (manual trigger)
   */
  async executeSchedule(scheduleId: string, userId: string): Promise<void> {
    try {
      const schedule = await this.prisma.backupSchedule.findUnique({
        where: { id: scheduleId }
      });

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      logger.info('Manually executing backup schedule', { scheduleId, userId });

      // Execute the backup
      await this.executeBackup(schedule);

      logger.info('Backup schedule manually executed', { scheduleId, userId });
    } catch (error) {
      logger.error('Failed to manually execute schedule', { error, scheduleId, userId });
      throw error;
    }
  }

  /**
   * Private: Activate a schedule
   */
  private async activateSchedule(scheduleId: string): Promise<void> {
    const schedule = await this.prisma.backupSchedule.findUnique({
      where: { id: scheduleId }
    });

    if (!schedule || !schedule.enabled) {
      return;
    }

    // Create cron job
    const task = cron.schedule(
      schedule.cronExpression,
      async () => {
        await this.executeBackup(schedule);
      },
      {
        timezone: schedule.timezone
      }
    );

    this.schedules.set(scheduleId, task);

    logger.info('Backup schedule activated', { scheduleId });
  }

  /**
   * Private: Deactivate a schedule
   */
  private async deactivateSchedule(scheduleId: string): Promise<void> {
    const task = this.schedules.get(scheduleId);

    if (task) {
      task.stop();
      this.schedules.delete(scheduleId);
      logger.info('Backup schedule deactivated', { scheduleId });
    }
  }

  /**
   * Private: Execute a scheduled backup
   */
  private async executeBackup(schedule: any): Promise<void> {
    try {
      logger.info('Executing scheduled backup', { scheduleId: schedule.id });

      // Build BackupConfig from schedule fields
      const backupConfig: BackupConfig = {
        type: schedule.backupType as BackupType,
        compression: schedule.compression as CompressionType,
        encryption: schedule.encryption,
        includeTables: schedule.includeTables,
        excludeTables: schedule.excludeTables,
        webhookUrl: schedule.webhookUrl,
        metadata: schedule.metadata
      };

      // Create backup
      const backup = await this.backupService.createBackup(
        backupConfig,
        schedule.createdBy,
        schedule.id
      );

      // Update schedule
      await this.prisma.backupSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          lastStatus: 'COMPLETED',
          runCount: { increment: 1 },
          successCount: { increment: 1 },
          nextRunAt: this.calculateNextRun(
            schedule.cronExpression,
            schedule.timezone
          )
        }
      });

      // Clean up old backups if needed
      await this.cleanupOldBackups(schedule.id, schedule.retentionDays, schedule.retentionCount || 10);

      // Send notification
      await this.notificationService.send({
        event: BackupWebhookEvent.SCHEDULE_EXECUTED,
        timestamp: new Date(),
        data: {
          scheduleId: schedule.id,
          backupId: backup.id,
          status: 'SUCCESS',
          message: 'Scheduled backup executed successfully'
        }
      });

      // Log audit
      await this.createAuditLog('SCHEDULE_EXECUTED', 'schedule', schedule.id, schedule.createdBy, {
        backupId: backup.id
      });

      logger.info('Scheduled backup completed', { scheduleId: schedule.id, backupId: backup.id });
    } catch (error) {
      logger.error('Scheduled backup failed', { scheduleId: schedule.id, error });

      // Update schedule with failure
      await this.prisma.backupSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          lastStatus: 'FAILED',
          failureCount: { increment: 1 },
          nextRunAt: this.calculateNextRun(
            schedule.cronExpression,
            schedule.timezone
          )
        }
      });

      // Send failure notification
      await this.notificationService.send({
        event: BackupWebhookEvent.SCHEDULE_FAILED,
        timestamp: new Date(),
        data: {
          scheduleId: schedule.id,
          status: 'FAILED',
          message: error instanceof Error ? error.message : 'Scheduled backup failed'
        }
      });
    }
  }

  /**
   * Private: Clean up old backups
   */
  private async cleanupOldBackups(
    scheduleId: string,
    retentionDays: number,
    maxRetainedBackups: number
  ): Promise<void> {
    try {
      // Get all backups for this schedule
      const backups = await this.prisma.backup.findMany({
        where: {
          scheduleId,
          status: 'COMPLETED'
        },
        orderBy: { createdAt: 'desc' }
      });

      const now = new Date();
      const retentionDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

      // Find backups to delete
      const backupsToDelete = backups.filter((backup, index) => {
        // Keep the most recent backups up to maxRetainedBackups
        if (index < maxRetainedBackups) {
          return false;
        }
        // Delete if older than retention date
        return backup.createdAt < retentionDate;
      });

      // Delete old backups
      for (const backup of backupsToDelete) {
        await this.backupService.deleteBackup(backup.id, backup.createdBy);
        logger.info('Deleted old backup', { backupId: backup.id, scheduleId });
      }
    } catch (error) {
      logger.error('Failed to cleanup old backups', { scheduleId, error });
    }
  }

  /**
   * Private: Schedule cleanup job for expired backups
   * Note: Backup model doesn't have expiresAt field, so cleanup is based on
   * schedule retention settings only (handled in cleanupOldBackups method)
   */
  private scheduleCleanupJob(): void {
    // Run daily at 2 AM - check all schedules and cleanup based on their retention policies
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Running backup cleanup job');

        // Get all schedules with retention settings
        const schedules = await this.prisma.backupSchedule.findMany({
          where: { enabled: true }
        });

        let totalCleaned = 0;
        for (const schedule of schedules) {
          const backupsDeleted = await this.cleanupOldBackupsCount(
            schedule.id,
            schedule.retentionDays,
            schedule.retentionCount || 10
          );
          totalCleaned += backupsDeleted;
        }

        logger.info(`Cleaned up ${totalCleaned} old backups`);
      } catch (error) {
        logger.error('Backup cleanup job failed', { error });
      }
    });
  }

  /**
   * Private: Clean up old backups and return count
   */
  private async cleanupOldBackupsCount(
    scheduleId: string,
    retentionDays: number,
    maxRetainedBackups: number
  ): Promise<number> {
    try {
      const backups = await this.prisma.backup.findMany({
        where: {
          scheduleId,
          status: 'COMPLETED'
        },
        orderBy: { createdAt: 'desc' }
      });

      const now = new Date();
      const retentionDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

      const backupsToDelete = backups.filter((backup, index) => {
        if (index < maxRetainedBackups) {
          return false;
        }
        return backup.createdAt < retentionDate;
      });

      for (const backup of backupsToDelete) {
        await this.backupService.deleteBackup(backup.id, backup.createdBy);
        logger.info('Deleted old backup', { backupId: backup.id, scheduleId });
      }

      return backupsToDelete.length;
    } catch (error) {
      logger.error('Failed to cleanup old backups', { scheduleId, error });
      return 0;
    }
  }

  /**
   * Private: Calculate next run time for a cron expression
   */
  private calculateNextRun(cronExpression: string, _timezone: string): Date {
    // Simple implementation - return 1 hour from now
    // For production, use cron-parser library for accurate next run calculation
    const now = new Date();
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  /**
   * Private: Format schedule for response
   */
  private formatSchedule(schedule: any): BackupSchedule {
    // Reconstruct backupConfig from individual fields
    const backupConfig: BackupConfig = {
      type: schedule.backupType as BackupType,
      compression: schedule.compression as CompressionType,
      encryption: schedule.encryption,
      includeTables: schedule.includeTables,
      excludeTables: schedule.excludeTables,
      webhookUrl: schedule.webhookUrl,
      metadata: schedule.metadata
    };

    return {
      id: schedule.id,
      name: schedule.name,
      description: schedule.description,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      enabled: schedule.enabled,
      backupConfig,
      retentionDays: schedule.retentionDays,
      maxRetainedBackups: schedule.retentionCount || 10,
      lastRunAt: schedule.lastRunAt,
      nextRunAt: schedule.nextRunAt,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
      createdBy: schedule.createdBy
    };
  }

  /**
   * Private: Create audit log
   */
  private async createAuditLog(
    action: string,
    resourceType: string,
    resourceId: string,
    userId: string,
    details?: any
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    await this.prisma.backupAuditLog.create({
      data: {
        action,
        resourceType,
        resourceId,
        userId,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || 'unknown',
        details,
        scheduleId: resourceType === 'schedule' ? resourceId : undefined
      }
    });
  }

  /**
   * Shutdown the scheduler
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down backup scheduler');

    // Stop all scheduled tasks
    for (const [scheduleId, task] of this.schedules) {
      task.stop();
      logger.info('Stopped schedule', { scheduleId });
    }

    this.schedules.clear();
  }
}
