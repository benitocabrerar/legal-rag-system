import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import {
  Backup,
  BackupConfig,
  BackupFilters,
  BackupStats,
  BackupStatus,
  BackupType,
  BackupError,
  BackupJobData,
  BackupWebhookEvent,
  CompressionType
} from '../../types/backup.types.js';
import { BackupStorageService } from './backup-storage.service.js';
import { BackupCompressionService } from './backup-compression.service.js';
import { BackupEncryptionService } from './backup-encryption.service.js';
import { BackupNotificationService } from './backup-notification.service.js';
import { DatabaseExportService } from './database-export.service.js';
import { logger } from '../../utils/logger.js';

export class BackupService {
  private prisma: PrismaClient;
  private backupQueue: Queue<BackupJobData>;
  private storageService: BackupStorageService;
  private compressionService: BackupCompressionService;
  private encryptionService: BackupEncryptionService;
  private notificationService: BackupNotificationService;
  private exportService: DatabaseExportService;

  constructor(
    prisma: PrismaClient,
    backupQueue: Queue<BackupJobData>,
    storageService: BackupStorageService,
    compressionService: BackupCompressionService,
    encryptionService: BackupEncryptionService,
    notificationService: BackupNotificationService,
    exportService: DatabaseExportService
  ) {
    this.prisma = prisma;
    this.backupQueue = backupQueue;
    this.storageService = storageService;
    this.compressionService = compressionService;
    this.encryptionService = encryptionService;
    this.notificationService = notificationService;
    this.exportService = exportService;
  }

  /**
   * Create a new backup
   */
  async createBackup(
    config: BackupConfig,
    userId: string,
    scheduleId?: string
  ): Promise<Backup> {
    try {
      // Generate backup ID and name
      const backupId = uuidv4();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const name = `backup-${config.type.toLowerCase()}-${timestamp}`;
      const s3Key = `backups/${backupId}/${name}.backup`;

      // Create initial backup record - using correct Prisma schema field names
      const backup = await this.prisma.backup.create({
        data: {
          id: backupId,
          name,
          type: config.type as any,
          status: 'PENDING' as any,
          size: BigInt(0),
          compressedSize: BigInt(0),
          compressionType: (config.compression || 'GZIP') as any,
          encrypted: config.encryption || false,
          encryptionKeyId: config.encryption ? await this.encryptionService.getActiveKeyId() : null,
          storageLocation: `s3://${process.env.BACKUP_S3_BUCKET}/${s3Key}`,
          s3Bucket: process.env.BACKUP_S3_BUCKET!,
          s3Key,
          checksumSha256: '',
          tablesIncluded: config.includeTables || [],
          tablesExcluded: config.excludeTables || [],
          recordCount: BigInt(0),
          metadata: config.metadata || {},
          createdBy: userId,
          scheduleId
        }
      });

      // Queue the backup job
      await this.backupQueue.add(
        'create-backup',
        {
          backupId,
          config,
          userId,
          scheduleId
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000
          },
          removeOnComplete: {
            count: 100
          },
          removeOnFail: {
            count: 50
          }
        }
      );

      // Send initial notification
      await this.notificationService.send({
        event: BackupWebhookEvent.BACKUP_STARTED,
        timestamp: new Date(),
        data: {
          backupId,
          status: BackupStatus.PENDING,
          message: 'Backup job queued for processing'
        }
      }, config.webhookUrl, config.notificationEmails);

      logger.info('Backup created and queued', { backupId, userId, config });

      return this.formatBackup(backup);
    } catch (error) {
      logger.error('Failed to create backup', { error, config, userId });
      throw new BackupError(
        'Failed to create backup',
        'BACKUP_CREATE_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Process backup job (called by queue worker)
   */
  async processBackupJob(jobData: BackupJobData): Promise<void> {
    const { backupId, config, userId } = jobData;

    try {
      // Update status to in progress
      await this.prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'IN_PROGRESS' as any,
          startedAt: new Date()
        }
      });

      // Export database
      logger.info('Starting database export', { backupId });
      const exportData = await this.exportService.exportDatabase({
        type: config.type,
        includeTables: config.includeTables,
        excludeTables: config.excludeTables
      });

      // Compress if needed
      let processedData = exportData.data;
      let compressedSize = Number(exportData.size);

      if (config.compression && config.compression !== 'NONE') {
        logger.info('Compressing backup', { backupId, compression: config.compression });
        const compressed = await this.compressionService.compress(
          exportData.data,
          config.compression
        );
        processedData = compressed.data;
        compressedSize = compressed.size;
      }

      // Encrypt if needed
      let encryptionKeyId: string | null = null;
      if (config.encryption) {
        logger.info('Encrypting backup', { backupId });
        const encrypted = await this.encryptionService.encrypt(
          processedData,
          config.encryptionKey
        );
        processedData = encrypted.data;
        encryptionKeyId = encrypted.keyId;
      }

      // Calculate checksums
      const checksumSha256 = createHash('sha256').update(processedData).digest('hex');
      const checksumMd5 = createHash('md5').update(processedData).digest('hex');

      // Upload to S3
      logger.info('Uploading backup to S3', { backupId });
      const s3Location = await this.storageService.uploadToS3(
        processedData,
        {
          backupId,
          timestamp: new Date(),
          type: config.type,
          databaseName: exportData.databaseName,
          databaseVersion: exportData.databaseVersion,
          schemaVersion: exportData.schemaVersion,
          compression: config.compression || CompressionType.NONE,
          encrypted: config.encryption || false,
          checksum: checksumSha256
        }
      );

      // Calculate compression ratio
      const compressionRatio = Number(exportData.size) > 0
        ? Number(exportData.size) / compressedSize
        : 1;

      // Update backup record with correct field names
      const completedAt = new Date();
      const startedAt = (await this.prisma.backup.findUnique({ where: { id: backupId } }))?.startedAt;
      const duration = startedAt ? Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000) : 0;

      await this.prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'COMPLETED' as any,
          size: exportData.size,
          compressedSize: BigInt(compressedSize),
          compressionRatio,
          s3Bucket: s3Location.bucket,
          s3Key: s3Location.key,
          s3VersionId: s3Location.versionId,
          checksumSha256,
          checksumMd5,
          tablesIncluded: exportData.tableNames || [],
          recordCount: exportData.recordCount,
          completedAt,
          duration,
          encryptionKeyId
        }
      });

      // Send completion notification
      await this.notificationService.send({
        event: BackupWebhookEvent.BACKUP_COMPLETED,
        timestamp: new Date(),
        data: {
          backupId,
          status: BackupStatus.COMPLETED,
          message: 'Backup completed successfully',
          metadata: {
            size: exportData.size.toString(),
            compressedSize: compressedSize.toString(),
            compressionRatio: compressionRatio.toFixed(2),
            tableCount: exportData.tableCount,
            recordCount: exportData.recordCount.toString()
          }
        }
      }, config.webhookUrl, config.notificationEmails);

      // Log audit
      await this.createAuditLog('BACKUP_CREATED', 'backup', backupId, userId, {
        config,
        s3Location
      });

      logger.info('Backup completed successfully', { backupId });
    } catch (error) {
      logger.error('Backup job failed', { backupId, error });

      // Update backup status
      await this.prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'FAILED' as any,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      // Send failure notification
      await this.notificationService.send({
        event: BackupWebhookEvent.BACKUP_FAILED,
        timestamp: new Date(),
        data: {
          backupId,
          status: BackupStatus.FAILED,
          message: error instanceof Error ? error.message : 'Backup failed'
        }
      }, config.webhookUrl, config.notificationEmails);

      throw error;
    }
  }

  /**
   * Get backup by ID
   */
  async getBackupById(id: string, userId?: string): Promise<Backup> {
    const backup = await this.prisma.backup.findUnique({
      where: { id },
      include: {
        schedule: true
      }
    });

    if (!backup) {
      throw new BackupError('Backup not found', 'BACKUP_NOT_FOUND', 404);
    }

    // Check permissions if userId provided
    if (userId && backup.createdBy !== userId) {
      // Check if user is admin
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || user.role !== 'ADMIN') {
        throw new BackupError('Unauthorized', 'UNAUTHORIZED', 403);
      }
    }

    return this.formatBackup(backup);
  }

  /**
   * List backups with filters
   */
  async listBackups(filters: BackupFilters): Promise<Backup[]> {
    const where: any = {};

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters.type && filters.type.length > 0) {
      where.type = { in: filters.type };
    }

    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) {
        where.createdAt.gte = filters.createdAfter;
      }
      if (filters.createdBefore) {
        where.createdAt.lte = filters.createdBefore;
      }
    }

    if (filters.minSize || filters.maxSize) {
      where.size = {};
      if (filters.minSize) {
        where.size.gte = filters.minSize;
      }
      if (filters.maxSize) {
        where.size.lte = filters.maxSize;
      }
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const backups = await this.prisma.backup.findMany({
      where,
      include: {
        schedule: true
      },
      orderBy: {
        [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc'
      },
      take: filters.limit || 50,
      skip: filters.offset || 0
    });

    return backups.map(b => this.formatBackup(b));
  }

  /**
   * Delete backup
   */
  async deleteBackup(id: string, userId: string): Promise<void> {
    const backup = await this.getBackupById(id, userId);

    try {
      // Delete from S3
      await this.storageService.deleteFromS3({
        bucket: backup.s3Location.bucket,
        key: backup.s3Location.key,
        region: backup.s3Location.region
      });

      // Delete from database
      await this.prisma.backup.delete({
        where: { id }
      });

      // Log audit
      await this.createAuditLog('BACKUP_DELETED', 'backup', id, userId, { backup });

      logger.info('Backup deleted', { backupId: id, userId });
    } catch (error) {
      logger.error('Failed to delete backup', { backupId: id, error });
      throw new BackupError(
        'Failed to delete backup',
        'BACKUP_DELETE_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<BackupStats> {
    const [
      totalBackups,
      backupSizes,
      backupsByType,
      backupsByStatus,
      lastBackup,
      nextScheduledBackup,
      storageUsage
    ] = await Promise.all([
      this.prisma.backup.count(),
      this.prisma.backup.aggregate({
        _sum: {
          size: true,
          compressedSize: true
        }
      }),
      this.getBackupsByType(),
      this.getBackupsByStatus(),
      this.getLastBackup(),
      this.getNextScheduledBackup(),
      this.storageService.getStorageUsage()
    ]);

    const totalSize = backupSizes._sum.size || BigInt(0);
    const totalCompressedSize = backupSizes._sum.compressedSize || BigInt(0);

    const averageCompressionRatio = totalSize > BigInt(0)
      ? Number(totalSize) / Number(totalCompressedSize)
      : 1;

    return {
      totalBackups,
      totalSize,
      totalCompressedSize,
      averageCompressionRatio,
      backupsByType,
      backupsByStatus,
      lastBackupAt: lastBackup?.createdAt ?? undefined,
      nextScheduledBackup: nextScheduledBackup?.nextRunAt ?? undefined,
      storageUsage
    };
  }

  /**
   * Helper: Format backup for response - using correct Prisma schema fields
   */
  private formatBackup(backup: any): Backup {
    return {
      id: backup.id,
      name: backup.name,
      description: backup.metadata?.description,
      type: backup.type as BackupType,
      status: backup.status as BackupStatus,
      size: backup.size,
      compressedSize: backup.compressedSize,
      compressionType: backup.compressionType,
      encrypted: backup.encrypted,
      s3Location: {
        bucket: backup.s3Bucket || '',
        key: backup.s3Key || '',
        region: process.env.AWS_REGION || 'us-east-1',
        versionId: backup.s3VersionId
      },
      checksum: backup.checksumSha256 || '',
      tableCount: backup.tablesIncluded?.length || 0,
      recordCount: backup.recordCount,
      createdAt: backup.createdAt,
      completedAt: backup.completedAt,
      expiresAt: undefined, // Field doesn't exist in schema
      createdBy: backup.createdBy,
      metadata: backup.metadata || {},
      error: backup.error
    };
  }

  /**
   * Helper: Get backups by type
   */
  private async getBackupsByType(): Promise<Record<BackupType, number>> {
    const result = await this.prisma.backup.groupBy({
      by: ['type'],
      _count: true
    });

    const backupsByType: Record<string, number> = {};
    for (const item of result) {
      backupsByType[item.type] = item._count;
    }

    return backupsByType as Record<BackupType, number>;
  }

  /**
   * Helper: Get backups by status
   */
  private async getBackupsByStatus(): Promise<Record<BackupStatus, number>> {
    const result = await this.prisma.backup.groupBy({
      by: ['status'],
      _count: true
    });

    const backupsByStatus: Record<string, number> = {};
    for (const item of result) {
      backupsByStatus[item.status] = item._count;
    }

    return backupsByStatus as Record<BackupStatus, number>;
  }

  /**
   * Helper: Get last backup
   */
  private async getLastBackup() {
    return await this.prisma.backup.findFirst({
      where: { status: 'COMPLETED' as any },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Helper: Get next scheduled backup
   */
  private async getNextScheduledBackup() {
    return await this.prisma.backupSchedule.findFirst({
      where: {
        enabled: true,
        nextRunAt: { gte: new Date() }
      },
      orderBy: { nextRunAt: 'asc' }
    });
  }

  /**
   * Helper: Create audit log with correct Prisma schema fields
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
        backupId: resourceType === 'backup' ? resourceId : undefined
      }
    });
  }
}
