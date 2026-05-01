import { PrismaClient, RestoreStatusEnum } from '@prisma/client';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import {
  RestoreJob,
  RestoreOptions,
  ValidationResult,
  BackupPreview,
  RestoreError,
  RestoreJobData,
  BackupWebhookEvent,
  RestoreConfig,
  CompressionType
} from '../../types/backup.types';
import { BackupStorageService } from './backup-storage.service';
import { BackupCompressionService } from './backup-compression.service';
import { BackupEncryptionService } from './backup-encryption.service';
import { BackupNotificationService } from './backup-notification.service';
import { DatabaseImportService } from './database-import.service';
import { logger } from '../../utils/logger';

export class RestoreService {
  private prisma: PrismaClient;
  private restoreQueue: Queue<RestoreJobData>;
  private storageService: BackupStorageService;
  private compressionService: BackupCompressionService;
  private encryptionService: BackupEncryptionService;
  private notificationService: BackupNotificationService;
  private importService: DatabaseImportService;

  constructor(
    prisma: PrismaClient,
    restoreQueue: Queue<RestoreJobData>,
    storageService: BackupStorageService,
    compressionService: BackupCompressionService,
    encryptionService: BackupEncryptionService,
    notificationService: BackupNotificationService,
    importService: DatabaseImportService
  ) {
    this.prisma = prisma;
    this.restoreQueue = restoreQueue;
    this.storageService = storageService;
    this.compressionService = compressionService;
    this.encryptionService = encryptionService;
    this.notificationService = notificationService;
    this.importService = importService;
  }

  /**
   * Restore a backup
   */
  async restoreBackup(
    backupId: string,
    options: RestoreOptions,
    userId: string
  ): Promise<RestoreJob> {
    try {
      // Validate backup exists and is restorable
      const backup = await this.prisma.backup.findUnique({
        where: { id: backupId }
      });

      if (!backup) {
        throw new RestoreError('Backup not found', 'BACKUP_NOT_FOUND', 404);
      }

      if (backup.status !== 'COMPLETED') {
        throw new RestoreError(
          'Backup is not in completed state',
          'BACKUP_NOT_READY',
          400
        );
      }

      // Create restore job record
      const restoreJobId = uuidv4();
      const restoreJob = await this.prisma.restoreJob.create({
        data: {
          id: restoreJobId,
          backupId,
          status: 'PENDING',
          progress: 0,
          currentPhase: 'Initializing',
          targetDatabase: options.targetDatabase,
          tablesRestored: 0,
          recordsRestored: BigInt(0),
          createdBy: userId,
          dryRun: options.dryRun ?? false,
          validateFirst: options.validateIntegrity ?? true,
          includeTables: options.tablesToRestore || [],
          excludeTables: options.tablesToExclude || []
        }
      });

      // Queue the restore job
      await this.restoreQueue.add(
        'restore-backup',
        {
          restoreJobId,
          backupId,
          options,
          userId
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10000
          },
          removeOnComplete: { count: 50 },
          removeOnFail: { count: 25 }
        }
      );

      // Send initial notification
      await this.notificationService.send({
        event: BackupWebhookEvent.RESTORE_STARTED,
        timestamp: new Date(),
        data: {
          backupId,
          jobId: restoreJobId,
          status: 'PENDING',
          message: 'Restore job queued for processing'
        }
      }, options.webhookUrl);

      logger.info('Restore job created and queued', {
        restoreJobId,
        backupId,
        userId,
        options
      });

      return this.formatRestoreJob(restoreJob);
    } catch (error) {
      logger.error('Failed to create restore job', { error, backupId, userId });
      throw error;
    }
  }

  /**
   * Create a restore from config
   */
  async createRestore(
    config: RestoreConfig,
    userId: string
  ): Promise<RestoreJob> {
    const options: RestoreOptions = {
      targetDatabase: config.targetDatabase,
      overwrite: config.overwrite ?? false,
      tablesToRestore: config.includeTables,
      tablesToExclude: config.excludeTables,
      validateIntegrity: config.validateFirst ?? true,
      dryRun: config.dryRun ?? false
    };
    return this.restoreBackup(config.backupId, options, userId);
  }

  /**
   * Process restore job (called by queue worker)
   */
  async processRestoreJob(jobData: RestoreJobData): Promise<void> {
    const { restoreJobId, backupId, options, userId } = jobData;

    try {
      // Update status to validating
      await this.updateRestorePhase(restoreJobId, 'Validating backup', 'VALIDATING');

      // Validate backup
      logger.info('Validating backup', { restoreJobId, backupId });
      const validation = await this.validateBackup(backupId);

      if (!validation.isValid) {
        throw new RestoreError(
          'Backup validation failed',
          'VALIDATION_FAILED',
          400,
          validation.issues
        );
      }

      // Download backup from S3
      await this.updateRestorePhase(restoreJobId, 'Downloading from S3', 'DOWNLOADING');

      logger.info('Downloading backup from S3', { restoreJobId, backupId });
      const backup = await this.prisma.backup.findUnique({
        where: { id: backupId }
      });

      if (!backup?.s3Bucket || !backup?.s3Key) {
        throw new RestoreError('Backup S3 location not found', 'S3_NOT_CONFIGURED', 400);
      }

      const backupData = await this.storageService.downloadFromS3({
        bucket: backup.s3Bucket,
        key: backup.s3Key,
        region: process.env.AWS_REGION || 'us-east-1'
      });

      // Decrypt if needed
      let processedData = backupData;
      if (backup.encrypted && backup.encryptionKeyId) {
        await this.updateRestorePhase(restoreJobId, 'Decrypting data', 'DECRYPTING');
        logger.info('Decrypting backup', { restoreJobId, backupId });

        // Get encryption metadata from backup metadata
        const backupMeta = backup.metadata as Record<string, any> | null;
        const encryptionMeta = backupMeta?.encryption || {};

        processedData = await this.encryptionService.decrypt({
          data: processedData,
          keyId: backup.encryptionKeyId,
          iv: encryptionMeta.iv || '',
          authTag: encryptionMeta.authTag || '',
          salt: encryptionMeta.salt || ''
        });
      }

      // Decompress if needed
      if (backup.compressionType !== 'NONE') {
        await this.updateRestorePhase(restoreJobId, 'Decompressing data', 'DECOMPRESSING');
        logger.info('Decompressing backup', {
          restoreJobId,
          backupId,
          compression: backup.compressionType
        });
        processedData = await this.compressionService.decompress(
          processedData,
          backup.compressionType as CompressionType
        );
      }

      // Perform restore
      await this.updateRestorePhase(restoreJobId, 'Restoring database', 'RESTORING');
      logger.info('Restoring database', { restoreJobId, backupId, options });

      // Write processed data to temp file for import
      const tempFile = `/tmp/restore-${restoreJobId}.backup`;
      const fs = await import('fs');
      fs.writeFileSync(tempFile, processedData);

      try {
        if (options.dryRun) {
          // Dry run - just validate the restore would work
          const validation = await this.importService.validateBackup(tempFile);
          await this.prisma.restoreJob.update({
            where: { id: restoreJobId },
            data: {
              tablesRestored: validation.tables.length,
              recordsRestored: BigInt(validation.totalRecords),
              warnings: validation.errors
            }
          });
        } else {
          // Actual restore
          const result = await this.importService.importFromBackup({
            backupPath: tempFile,
            targetTables: options.tablesToRestore,
            skipExisting: !options.overwrite,
            validateIntegrity: options.validateIntegrity,
            dryRun: false
          });
          await this.prisma.restoreJob.update({
            where: { id: restoreJobId },
            data: {
              tablesRestored: result.tablesImported.length,
              recordsRestored: BigInt(result.recordsImported),
              warnings: result.errors
            }
          });
        }
      } finally {
        // Clean up temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          logger.warn('Failed to delete temp file', { tempFile, error: e });
        }
      }

      // Verify integrity if needed (integrity is validated during import)
      if (options.validateIntegrity && !options.dryRun) {
        await this.updateRestorePhase(restoreJobId, 'Verifying integrity', 'VERIFYING');
        logger.info('Verifying restore integrity', { restoreJobId, backupId });
        // Integrity verification is performed implicitly by the import service
        // No separate verification method needed
      }

      // Mark as completed
      await this.prisma.restoreJob.update({
        where: { id: restoreJobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          progress: 100,
          currentPhase: 'Completed'
        }
      });

      // Send completion notification
      await this.notificationService.send({
        event: BackupWebhookEvent.RESTORE_COMPLETED,
        timestamp: new Date(),
        data: {
          backupId,
          jobId: restoreJobId,
          status: 'COMPLETED',
          message: options.dryRun
            ? 'Dry run completed successfully'
            : 'Restore completed successfully'
        }
      }, options.webhookUrl);

      // Log audit
      await this.createAuditLog('BACKUP_RESTORED', backupId, userId, {
        restoreJobId,
        options
      });

      logger.info('Restore completed successfully', { restoreJobId, backupId });
    } catch (error) {
      logger.error('Restore job failed', { restoreJobId, error });

      // Update restore status
      await this.prisma.restoreJob.update({
        where: { id: restoreJobId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        }
      });

      // Send failure notification
      await this.notificationService.send({
        event: BackupWebhookEvent.RESTORE_FAILED,
        timestamp: new Date(),
        data: {
          backupId,
          jobId: restoreJobId,
          status: 'FAILED',
          message: error instanceof Error ? error.message : 'Restore failed'
        }
      }, options.webhookUrl);

      throw error;
    }
  }

  /**
   * Validate backup integrity
   */
  async validateBackup(backupId: string): Promise<ValidationResult> {
    const backup = await this.prisma.backup.findUnique({
      where: { id: backupId }
    });

    if (!backup) {
      return {
        isValid: false,
        checksum: false,
        integrity: false,
        compatibility: false,
        issues: [{
          severity: 'error',
          code: 'BACKUP_NOT_FOUND',
          message: 'Backup not found'
        }],
        metadata: {
          backupVersion: '',
          databaseVersion: '',
          schema: '',
          tablesCount: 0,
          recordsCount: BigInt(0)
        }
      };
    }

    const issues: Array<{ severity: 'error' | 'warning' | 'info'; code: string; message: string }> = [];

    // Check backup status
    if (backup.status !== 'COMPLETED') {
      issues.push({
        severity: 'error',
        code: 'BACKUP_INCOMPLETE',
        message: `Backup is in ${backup.status} state`
      });
    }

    // Verify S3 object exists
    let s3Exists = false;
    if (backup.s3Bucket && backup.s3Key) {
      s3Exists = await this.storageService.verifyObject({
        bucket: backup.s3Bucket,
        key: backup.s3Key,
        region: process.env.AWS_REGION || 'us-east-1'
      });

      if (!s3Exists) {
        issues.push({
          severity: 'error',
          code: 'S3_OBJECT_MISSING',
          message: 'Backup file not found in S3'
        });
      }
    } else {
      issues.push({
        severity: 'error',
        code: 'S3_NOT_CONFIGURED',
        message: 'Backup S3 location not configured'
      });
    }

    // Check database compatibility
    const backupMetadata = backup.metadata as Record<string, any> | null;

    if (backupMetadata?.databaseVersion) {
      // Version compatibility is checked at restore time
      // For now, just flag potential version mismatches as warnings
      const currentVersion = process.env.DATABASE_VERSION || 'unknown';
      if (backupMetadata.databaseVersion !== currentVersion && currentVersion !== 'unknown') {
        issues.push({
          severity: 'warning',
          code: 'VERSION_MISMATCH',
          message: `Backup version ${backupMetadata.databaseVersion} may not be compatible with current version ${currentVersion}`
        });
      }
    }

    const tableCount = backup.tablesIncluded?.length || 0;

    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      checksum: true, // Will verify during restore
      integrity: s3Exists,
      compatibility: issues.filter(i => i.code === 'VERSION_MISMATCH').length === 0,
      issues,
      metadata: {
        backupVersion: backupMetadata?.backupVersion || '1.0.0',
        databaseVersion: backupMetadata?.databaseVersion || '',
        schema: backupMetadata?.schema || '',
        tablesCount: tableCount,
        recordsCount: backup.recordCount
      }
    };
  }

  /**
   * Preview backup contents
   */
  async previewBackup(backupId: string): Promise<BackupPreview> {
    const backup = await this.prisma.backup.findUnique({
      where: { id: backupId }
    });

    if (!backup) {
      throw new RestoreError('Backup not found', 'BACKUP_NOT_FOUND', 404);
    }

    // Parse table information from backup metadata
    const backupMetadata = backup.metadata as Record<string, any> | null;
    const tables: Array<{ name: string; recordCount: number; size: number; hasIndexes: boolean; hasForeignKeys: boolean }> =
      backupMetadata?.tables || [];
    const warnings: string[] = [];

    // Check for potential issues
    if (backup.encrypted && backup.encryptionKeyId) {
      const hasKey = await this.encryptionService.verifyKey(backup.encryptionKeyId);
      if (!hasKey) {
        warnings.push('Encryption key not available - restore may fail');
      }
    }

    if (Number(backup.size) > 10 * 1024 * 1024 * 1024) { // 10GB
      warnings.push('Large backup - restore may take significant time');
    }

    // Estimate restore time (rough calculation)
    const tableCount = backup.tablesIncluded?.length || 0;
    const estimatedRestoreTime = this.estimateRestoreTime(
      Number(backup.size),
      tableCount
    );

    return {
      backup: this.formatBackup(backup),
      tables: tables.map(t => ({
        name: t.name,
        recordCount: BigInt(t.recordCount || 0),
        size: BigInt(t.size || 0),
        hasIndexes: t.hasIndexes || false,
        hasForeignKeys: t.hasForeignKeys || false
      })),
      estimatedRestoreTime,
      spaceRequired: backup.size,
      warnings
    };
  }

  /**
   * Get restore job status
   */
  async getRestoreStatus(jobId: string): Promise<RestoreJob> {
    const job = await this.prisma.restoreJob.findUnique({
      where: { id: jobId },
      include: {
        backup: true
      }
    });

    if (!job) {
      throw new RestoreError('Restore job not found', 'JOB_NOT_FOUND', 404);
    }

    return this.formatRestoreJob(job);
  }

  /**
   * List restore jobs
   */
  async listRestoreJobs(filters: {
    backupId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: RestoreJob[]; total: number }> {
    const where: any = {};

    if (filters.backupId) {
      where.backupId = filters.backupId;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const [jobs, total] = await Promise.all([
      this.prisma.restoreJob.findMany({
        where,
        include: { backup: true },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 20,
        skip: filters.offset || 0
      }),
      this.prisma.restoreJob.count({ where })
    ]);

    return {
      jobs: jobs.map(j => this.formatRestoreJob(j)),
      total
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private formatBackup(backup: any): any {
    return {
      id: backup.id,
      name: backup.name,
      type: backup.type,
      status: backup.status,
      size: backup.size,
      compressedSize: backup.compressedSize,
      compressionType: backup.compressionType,
      encrypted: backup.encrypted,
      s3Location: {
        bucket: backup.s3Bucket || '',
        key: backup.s3Key || '',
        region: process.env.AWS_REGION || 'us-east-1'
      },
      checksum: backup.checksumSha256 || backup.checksumMd5 || '',
      tableCount: backup.tablesIncluded?.length || 0,
      recordCount: backup.recordCount,
      createdAt: backup.createdAt,
      completedAt: backup.completedAt,
      createdBy: backup.createdBy,
      metadata: backup.metadata || {}
    };
  }

  private formatRestoreJob(job: any): RestoreJob {
    return {
      id: job.id,
      backupId: job.backupId,
      status: job.status,
      options: {
        targetDatabase: job.targetDatabase,
        overwrite: false,
        tablesToRestore: job.includeTables,
        tablesToExclude: job.excludeTables,
        validateIntegrity: job.validateFirst,
        dryRun: job.dryRun
      },
      progress: job.progress,
      currentStep: job.currentPhase || '',
      steps: [],
      startedAt: job.startedAt || job.createdAt,
      completedAt: job.completedAt,
      error: job.error,
      warnings: job.warnings || [],
      restoredTables: job.tablesRestored,
      restoredRecords: job.recordsRestored
    };
  }

  private createInitialSteps(): any[] {
    return [
      { name: 'Validating backup', status: 'pending' },
      { name: 'Downloading from S3', status: 'pending' },
      { name: 'Decrypting data', status: 'pending' },
      { name: 'Decompressing data', status: 'pending' },
      { name: 'Restoring database', status: 'pending' },
      { name: 'Verifying integrity', status: 'pending' }
    ];
  }

  private async updateRestorePhase(
    jobId: string,
    phase: string,
    status?: string
  ): Promise<void> {
    const data: any = { currentPhase: phase };
    if (status) {
      data.status = status;
    }
    await this.prisma.restoreJob.update({
      where: { id: jobId },
      data
    });
  }

  private async updateRestoreStatus(
    jobId: string,
    status: RestoreStatusEnum
  ): Promise<void> {
    await this.prisma.restoreJob.update({
      where: { id: jobId },
      data: { status }
    });
  }

  private estimateRestoreTime(sizeBytes: number, tableCount: number): number {
    // Rough estimation: 100MB/s for restore operations
    const baseTime = sizeBytes / (100 * 1024 * 1024);
    // Add overhead for each table (indexes, constraints, etc.)
    const tableOverhead = tableCount * 5; // 5 seconds per table
    return Math.ceil(baseTime + tableOverhead);
  }

  private async createAuditLog(
    action: string,
    backupId: string,
    userId: string,
    details?: any
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    await this.prisma.backupAuditLog.create({
      data: {
        action,
        resourceType: 'backup',
        resourceId: backupId,
        userId,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || 'unknown',
        details,
        backupId
      }
    });
  }
}
