/**
 * Backup Queue Worker
 *
 * BullMQ worker for processing backup and restore jobs asynchronously
 * Handles: Job processing, error handling, progress tracking, retries
 */

import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { prisma as prismaClient } from '../../lib/prisma.js';
import Redis from 'ioredis';
import {
  BackupJobData,
  RestoreJobData,
  BackupError
} from '../../types/backup.types';
import { BackupService } from './backup.service';
import { RestoreService } from './restore.service';
import { BackupStorageService } from './backup-storage.service';
import { BackupCompressionService } from './backup-compression.service';
import { BackupEncryptionService } from './backup-encryption.service';
import { BackupNotificationService } from './backup-notification.service';
import { DatabaseExportService } from './database-export.service';
import { logger } from '../../utils/logger';

export class BackupWorker {
  private backupWorker: Worker<BackupJobData>;
  private restoreWorker: Worker<RestoreJobData>;
  private prisma: PrismaClient;
  private redis: Redis;
  private backupService: BackupService;
  private restoreService: RestoreService | null = null;

  constructor() {
    this.prisma = prismaClient;

    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });

    // Initialize services
    const storageService = new BackupStorageService();
    const compressionService = new BackupCompressionService();
    const encryptionService = new BackupEncryptionService(this.prisma);
    const notificationService = new BackupNotificationService();
    const exportService = new DatabaseExportService(this.prisma);

    // Create backup queue
    const backupQueue = new Queue<BackupJobData>('backup-jobs', {
      connection: this.redis
    });

    // Initialize backup service
    this.backupService = new BackupService(
      this.prisma,
      backupQueue,
      storageService,
      compressionService,
      encryptionService,
      notificationService,
      exportService
    );

    // Initialize backup worker
    this.backupWorker = new Worker<BackupJobData>(
      'backup-jobs',
      async (job) => await this.processBackupJob(job),
      {
        connection: this.redis,
        concurrency: parseInt(process.env.BACKUP_CONCURRENCY || '2'),
        limiter: {
          max: 5, // Max 5 jobs
          duration: 60000 // Per minute
        }
      }
    );

    // Initialize restore worker
    this.restoreWorker = new Worker<RestoreJobData>(
      'restore-jobs',
      async (job) => await this.processRestoreJob(job),
      {
        connection: this.redis,
        concurrency: 1, // Only one restore at a time
        limiter: {
          max: 2, // Max 2 jobs
          duration: 60000 // Per minute
        }
      }
    );

    // Setup event listeners
    this.setupEventListeners();

    logger.info('Backup workers initialized', {
      backupConcurrency: this.backupWorker.opts.concurrency,
      restoreConcurrency: this.restoreWorker.opts.concurrency
    });
  }

  /**
   * Process backup job
   */
  private async processBackupJob(job: Job<BackupJobData>): Promise<void> {
    const { backupId, config, userId } = job.data;

    logger.info('Processing backup job', {
      jobId: job.id,
      backupId,
      attempt: job.attemptsMade + 1,
      maxAttempts: job.opts.attempts
    });

    try {
      // Update job progress
      await job.updateProgress(10);

      // Process the backup using BackupService
      await this.backupService.processBackupJob(job.data);

      // Update final progress
      await job.updateProgress(100);

      logger.info('Backup job completed successfully', {
        jobId: job.id,
        backupId
      });
    } catch (error) {
      logger.error('Backup job failed', {
        jobId: job.id,
        backupId,
        attempt: job.attemptsMade + 1,
        error
      });

      // Determine if we should retry
      const shouldRetry = this.shouldRetryJob(error as Error, job);

      if (!shouldRetry) {
        // Mark backup as failed permanently
        await this.prisma.backup.update({
          where: { id: backupId },
          data: {
            status: 'FAILED',
            error: `Job failed after ${job.attemptsMade + 1} attempts: ${(error as Error).message}`
          }
        });
      }

      throw error;
    }
  }

  /**
   * Process restore job
   */
  private async processRestoreJob(job: Job<RestoreJobData>): Promise<void> {
    const { restoreJobId, backupId, options, userId } = job.data;

    logger.info('Processing restore job', {
      jobId: job.id,
      restoreJobId,
      backupId,
      attempt: job.attemptsMade + 1
    });

    try {
      // Update job progress
      await job.updateProgress(10);

      // Initialize restore service if not already done
      if (!this.restoreService) {
        const { RestoreService } = await import('./restore.service');
        const { DatabaseImportService } = await import('./database-import.service');
        const storageService = new BackupStorageService();
        const compressionService = new BackupCompressionService();
        const encryptionService = new BackupEncryptionService(this.prisma);
        const notificationService = new BackupNotificationService();
        const importService = new DatabaseImportService(this.prisma);

        // Create restore queue
        const restoreQueue = new Queue<RestoreJobData>('restore-jobs', {
          connection: this.redis
        });

        this.restoreService = new RestoreService(
          this.prisma,
          restoreQueue,
          storageService,
          compressionService,
          encryptionService,
          notificationService,
          importService
        );
      }

      // Process the restore
      await this.restoreService.processRestoreJob(job.data);

      // Update final progress
      await job.updateProgress(100);

      logger.info('Restore job completed successfully', {
        jobId: job.id,
        restoreJobId
      });
    } catch (error) {
      logger.error('Restore job failed', {
        jobId: job.id,
        restoreJobId,
        attempt: job.attemptsMade + 1,
        error
      });

      // Update restore job status
      await this.prisma.restoreJob.update({
        where: { id: restoreJobId },
        data: {
          status: 'FAILED',
          error: (error as Error).message
        }
      });

      throw error;
    }
  }

  /**
   * Determine if job should be retried
   */
  private shouldRetryJob(error: Error, job: Job): boolean {
    // Don't retry validation errors
    if (error instanceof BackupError && error.code === 'VALIDATION_ERROR') {
      return false;
    }

    // Don't retry if we've exhausted attempts
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      return false;
    }

    // Retry all other errors
    return true;
  }

  /**
   * Setup event listeners for workers
   */
  private setupEventListeners(): void {
    // Backup worker events
    this.backupWorker.on('completed', (job) => {
      logger.info('Backup job completed', {
        jobId: job.id,
        duration: Date.now() - job.timestamp
      });
    });

    this.backupWorker.on('failed', (job, error) => {
      logger.error('Backup job failed', {
        jobId: job?.id,
        error: error.message,
        stack: error.stack
      });
    });

    this.backupWorker.on('progress', (job, progress) => {
      logger.debug('Backup job progress', {
        jobId: job.id,
        progress: `${progress}%`
      });
    });

    this.backupWorker.on('error', (error) => {
      logger.error('Backup worker error', { error });
    });

    this.backupWorker.on('stalled', (jobId) => {
      logger.warn('Backup job stalled', { jobId });
    });

    // Restore worker events
    this.restoreWorker.on('completed', (job) => {
      logger.info('Restore job completed', {
        jobId: job.id,
        duration: Date.now() - job.timestamp
      });
    });

    this.restoreWorker.on('failed', (job, error) => {
      logger.error('Restore job failed', {
        jobId: job?.id,
        error: error.message
      });
    });

    this.restoreWorker.on('progress', (job, progress) => {
      logger.debug('Restore job progress', {
        jobId: job.id,
        progress: `${progress}%`
      });
    });

    this.restoreWorker.on('error', (error) => {
      logger.error('Restore worker error', { error });
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down backup workers...');

    try {
      // Close workers
      await Promise.all([
        this.backupWorker.close(),
        this.restoreWorker.close()
      ]);

      // Disconnect from Redis
      await this.redis.quit();

      // Disconnect from database
      await this.prisma.$disconnect();

      logger.info('Backup workers shut down successfully');
    } catch (error) {
      logger.error('Error during worker shutdown', { error });
      throw error;
    }
  }

  /**
   * Get worker health status
   */
  async getHealth(): Promise<{
    backupWorker: {
      isRunning: boolean;
      isPaused: boolean;
    };
    restoreWorker: {
      isRunning: boolean;
      isPaused: boolean;
    };
    redis: {
      connected: boolean;
    };
  }> {
    return {
      backupWorker: {
        isRunning: this.backupWorker.isRunning(),
        isPaused: this.backupWorker.isPaused()
      },
      restoreWorker: {
        isRunning: this.restoreWorker.isRunning(),
        isPaused: this.restoreWorker.isPaused()
      },
      redis: {
        connected: this.redis.status === 'ready'
      }
    };
  }

  /**
   * Pause all workers
   */
  async pause(): Promise<void> {
    await Promise.all([
      this.backupWorker.pause(),
      this.restoreWorker.pause()
    ]);
    logger.info('Backup workers paused');
  }

  /**
   * Resume all workers
   */
  async resume(): Promise<void> {
    await Promise.all([
      this.backupWorker.resume(),
      this.restoreWorker.resume()
    ]);
    logger.info('Backup workers resumed');
  }

  /**
   * Get worker metrics
   */
  async getMetrics(): Promise<{
    backup: {
      active: number;
      waiting: number;
      completed: number;
      failed: number;
    };
    restore: {
      active: number;
      waiting: number;
      completed: number;
      failed: number;
    };
  }> {
    const backupQueue = new Queue('backup-jobs', { connection: this.redis });
    const restoreQueue = new Queue('restore-jobs', { connection: this.redis });

    const [backupCounts, restoreCounts] = await Promise.all([
      backupQueue.getJobCounts(),
      restoreQueue.getJobCounts()
    ]);

    return {
      backup: {
        active: backupCounts.active || 0,
        waiting: backupCounts.waiting || 0,
        completed: backupCounts.completed || 0,
        failed: backupCounts.failed || 0
      },
      restore: {
        active: restoreCounts.active || 0,
        waiting: restoreCounts.waiting || 0,
        completed: restoreCounts.completed || 0,
        failed: restoreCounts.failed || 0
      }
    };
  }
}

// Singleton instance
let workerInstance: BackupWorker | null = null;

/**
 * Get or create worker instance
 */
export function getBackupWorker(): BackupWorker {
  if (!workerInstance) {
    workerInstance = new BackupWorker();
  }
  return workerInstance;
}

/**
 * Shutdown worker instance
 */
export async function shutdownBackupWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.shutdown();
    workerInstance = null;
  }
}

// Handle process termination
if (process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down workers...');
    await shutdownBackupWorker();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down workers...');
    await shutdownBackupWorker();
    process.exit(0);
  });
}
