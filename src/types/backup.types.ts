/**
 * Backup System Type Definitions
 */

// Core Backup Types
export interface BackupConfig {
  type: BackupType;
  includeTables?: string[];
  excludeTables?: string[];
  compression?: CompressionType;
  encryption?: boolean;
  encryptionKey?: string;
  metadata?: Record<string, any>;
  webhookUrl?: string;
  notificationEmails?: string[];
}

export enum BackupType {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  DIFFERENTIAL = 'DIFFERENTIAL',
  SCHEMA_ONLY = 'SCHEMA_ONLY',
  DATA_ONLY = 'DATA_ONLY'
}

export enum CompressionType {
  GZIP = 'GZIP',
  BROTLI = 'BROTLI',
  LZ4 = 'LZ4',
  NONE = 'NONE'
}

export enum BackupStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export interface Backup {
  id: string;
  name: string;
  description?: string;
  type: BackupType;
  status: BackupStatus;
  size: bigint;
  compressedSize: bigint;
  compressionType: CompressionType;
  encrypted: boolean;
  s3Location: S3Location;
  checksum: string;
  tableCount: number;
  recordCount: bigint;
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  createdBy: string;
  metadata: Record<string, any>;
  error?: string;
}

export interface BackupFilters {
  status?: BackupStatus[];
  type?: BackupType[];
  createdAfter?: Date;
  createdBefore?: Date;
  minSize?: bigint;
  maxSize?: bigint;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'size' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface BackupStats {
  totalBackups: number;
  totalSize: bigint;
  totalCompressedSize: bigint;
  averageCompressionRatio: number;
  backupsByType: Record<BackupType, number>;
  backupsByStatus: Record<BackupStatus, number>;
  lastBackupAt?: Date;
  nextScheduledBackup?: Date;
  storageUsage: StorageStats;
}

// Schedule Types
export interface BackupSchedule {
  id: string;
  name: string;
  description?: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  backupConfig: BackupConfig;
  retentionDays: number;
  maxRetainedBackups: number;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ScheduleCreateInput {
  name: string;
  description?: string;
  cronExpression: string;
  timezone?: string;
  backupConfig: BackupConfig;
  retentionDays?: number;
  maxRetainedBackups?: number;
}

// Restore Types
export enum RestoreType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  SCHEMA_ONLY = 'SCHEMA_ONLY',
  DATA_ONLY = 'DATA_ONLY'
}

export interface RestoreConfig {
  backupId: string;
  restoreType: RestoreType | string;
  targetDatabase?: string;
  includeTables?: string[];
  excludeTables?: string[];
  dryRun?: boolean;
  validateFirst?: boolean;
  overwrite?: boolean;
  createSafetyBackup?: boolean;
}

export interface RestoreOptions {
  targetDatabase?: string;
  overwrite: boolean;
  tablesToRestore?: string[];
  tablesToExclude?: string[];
  restorePoint?: Date;
  validateIntegrity: boolean;
  dryRun: boolean;
  webhookUrl?: string;
}

export interface RestoreJob {
  id: string;
  backupId: string;
  status: RestoreStatus;
  options: RestoreOptions;
  startedAt: Date;
  completedAt?: Date;
  progress: number;
  currentStep: string;
  steps: RestoreStep[];
  error?: string;
  warnings: string[];
  restoredTables: number;
  restoredRecords: bigint;
}

export enum RestoreStatus {
  QUEUED = 'QUEUED',
  VALIDATING = 'VALIDATING',
  DOWNLOADING = 'DOWNLOADING',
  DECOMPRESSING = 'DECOMPRESSING',
  RESTORING = 'RESTORING',
  VERIFYING = 'VERIFYING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface RestoreStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  progress?: number;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  checksum: boolean;
  integrity: boolean;
  compatibility: boolean;
  issues: ValidationIssue[];
  metadata: {
    backupVersion: string;
    databaseVersion: string;
    schema: string;
    tablesCount: number;
    recordsCount: bigint;
  };
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  details?: any;
}

export interface BackupPreview {
  backup: Backup;
  tables: TableInfo[];
  estimatedRestoreTime: number;
  spaceRequired: bigint;
  warnings: string[];
}

export interface TableInfo {
  name: string;
  recordCount: bigint;
  size: bigint;
  hasIndexes: boolean;
  hasForeignKeys: boolean;
}

// Storage Types
export interface S3Location {
  bucket: string;
  key: string;
  region: string;
  url?: string;
  versionId?: string;
}

export interface BackupMetadata {
  backupId: string;
  timestamp: Date;
  type: BackupType;
  databaseName: string;
  databaseVersion: string;
  schemaVersion: string;
  compression: CompressionType;
  encrypted: boolean;
  checksum: string;
  tags?: Record<string, string>;
}

export interface StorageStats {
  totalSize: bigint;
  usedSize: bigint;
  availableSize: bigint;
  backupCount: number;
  oldestBackup?: Date;
  newestBackup?: Date;
  s3Bucket: string;
  estimatedMonthlyCost: number;
}

// Queue Types
export interface BackupJobData {
  backupId: string;
  config: BackupConfig;
  userId: string;
  scheduleId?: string;
}

export interface RestoreJobData {
  restoreJobId: string;
  backupId: string;
  options: RestoreOptions;
  userId: string;
}

export interface CleanupJobData {
  backupId?: string;
  olderThan?: Date;
  scheduleId?: string;
}

export interface JobProgress {
  jobId: string;
  type: 'backup' | 'restore' | 'cleanup';
  progress: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
  bytesProcessed?: bigint;
  totalBytes?: bigint;
}

// Audit Types
export interface BackupAuditLog {
  id: string;
  action: BackupAction;
  backupId?: string;
  scheduleId?: string;
  userId: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export enum BackupAction {
  BACKUP_CREATED = 'BACKUP_CREATED',
  BACKUP_DELETED = 'BACKUP_DELETED',
  BACKUP_RESTORED = 'BACKUP_RESTORED',
  BACKUP_DOWNLOADED = 'BACKUP_DOWNLOADED',
  SCHEDULE_CREATED = 'SCHEDULE_CREATED',
  SCHEDULE_UPDATED = 'SCHEDULE_UPDATED',
  SCHEDULE_DELETED = 'SCHEDULE_DELETED',
  SCHEDULE_EXECUTED = 'SCHEDULE_EXECUTED'
}

// Error Types
export class BackupError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'BackupError';
  }
}

export class RestoreError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'RestoreError';
  }
}

// Webhook Types
export interface BackupWebhook {
  event: BackupWebhookEvent;
  timestamp: Date;
  data: {
    backupId?: string;
    scheduleId?: string;
    jobId?: string;
    status: string;
    message?: string;
    progress?: number;
    metadata?: Record<string, any>;
  };
}

export enum BackupWebhookEvent {
  BACKUP_STARTED = 'backup.started',
  BACKUP_PROGRESS = 'backup.progress',
  BACKUP_COMPLETED = 'backup.completed',
  BACKUP_FAILED = 'backup.failed',
  RESTORE_STARTED = 'restore.started',
  RESTORE_PROGRESS = 'restore.progress',
  RESTORE_COMPLETED = 'restore.completed',
  RESTORE_FAILED = 'restore.failed',
  SCHEDULE_EXECUTED = 'schedule.executed',
  SCHEDULE_FAILED = 'schedule.failed'
}

// Notification Types
export interface NotificationPayload {
  event: BackupWebhookEvent;
  timestamp: Date;
  data: {
    backupId?: string;
    restoreId?: string;
    scheduleId?: string;
    jobId?: string;
    status: string;
    message?: string;
    progress?: number;
    metadata?: Record<string, any>;
  };
}

// Database Export/Import Types
export interface ExportConfig {
  type: BackupType;
  includeTables?: string[];
  excludeTables?: string[];
}

export interface ExportResult {
  data: Buffer;
  size: bigint;
  databaseName: string;
  databaseVersion: string;
  schemaVersion: string;
  tableCount: number;
  tableNames: string[];
  recordCount: bigint;
}