# Legal RAG Backup Management System - Production Architecture

## Executive Summary

This document presents a comprehensive, enterprise-grade backup management system designed for the Legal RAG application. The system addresses the critical need for automated, reliable data protection while maintaining system performance and scalability.

**Key Metrics:**
- Target RPO (Recovery Point Objective): 15 minutes
- Target RTO (Recovery Time Objective): 2 hours
- Backup Retention: 7/30/90/365 days (configurable)
- Zero-downtime backups
- 99.99% backup success rate

---

## 1. System Architecture

### 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BACKUP MANAGEMENT SYSTEM                     │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   Next.js Admin  │────────>│   Fastify API    │────────>│  PostgreSQL DB   │
│   Dashboard      │  HTTPS  │   Backup Routes  │  Query  │  (Render Cloud)  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
                                      │                             │
                                      │                             │
                                      v                             v
                             ┌──────────────────┐         ┌──────────────────┐
                             │   BullMQ Queue   │         │  pg_dump Process │
                             │  (Redis-backed)  │         │  (Background)    │
                             └──────────────────┘         └──────────────────┘
                                      │                             │
                                      │                             │
                                      v                             v
                             ┌──────────────────────────────────────────────┐
                             │         Backup Orchestration Service         │
                             │  - Schedule Management                       │
                             │  - Job Coordination                          │
                             │  - Progress Tracking                         │
                             │  - Error Handling & Retries                  │
                             └──────────────────────────────────────────────┘
                                      │
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    v                 v                 v
          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
          │  Compression │  │  Encryption  │  │   Metadata   │
          │   Service    │  │   Service    │  │   Service    │
          │  (gzip/lz4)  │  │  (AES-256)   │  │  (Tracking)  │
          └──────────────┘  └──────────────┘  └──────────────┘
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      │
                                      v
                             ┌──────────────────┐
                             │    AWS S3 CDN    │
                             │  Bucket: backups │
                             │  - Versioning    │
                             │  - Lifecycle     │
                             │  - Encryption    │
                             └──────────────────┘
                                      │
                                      v
                             ┌──────────────────┐
                             │  CloudWatch /    │
                             │  Datadog Metrics │
                             │  - Success Rate  │
                             │  - Duration      │
                             │  - Size Tracking │
                             └──────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        MONITORING & ALERTING                          │
│  - Slack/Email notifications                                         │
│  - PagerDuty integration                                             │
│  - Real-time dashboard                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow Architecture

```
USER ACTION → API REQUEST → QUEUE JOB → BACKUP EXECUTION → STORAGE → NOTIFICATION

1. User/Cron Schedule
   │
   └──> API: POST /api/v1/backups/schedule
        │
        └──> Validation & Authorization
             │
             └──> BullMQ: Add Job to Queue
                  │
                  ├──> Priority: 1-10 (configurable)
                  ├──> Retry: 3 attempts with exponential backoff
                  └──> Timeout: 2 hours
                       │
                       └──> Job Processor
                            │
                            ├──> Pre-flight checks
                            │    - Database connectivity
                            │    - S3 availability
                            │    - Disk space
                            │
                            ├──> Backup Execution
                            │    - pg_dump (streaming)
                            │    - Compression (gzip level 6)
                            │    - Encryption (AES-256-GCM)
                            │
                            ├──> Upload to S3
                            │    - Multipart upload
                            │    - Progress tracking
                            │    - Checksum verification
                            │
                            ├──> Metadata Recording
                            │    - Backup size
                            │    - Duration
                            │    - Table list
                            │    - Row counts
                            │
                            └──> Notification
                                 - Success: Slack + Email
                                 - Failure: PagerDuty + Email
```

---

## 2. Database Schema Design

### 2.1 Backup Metadata Tables

```prisma
// ============================================================================
// BACKUP MANAGEMENT SYSTEM - DATABASE SCHEMA
// ============================================================================

enum BackupType {
  FULL_DATABASE      // Complete database backup
  SELECTIVE_TABLES   // Specific tables only
  INCREMENTAL        // Changes since last backup (future)
  DIFFERENTIAL       // Changes since last full backup (future)
}

enum BackupStatus {
  SCHEDULED
  QUEUED
  IN_PROGRESS
  COMPRESSING
  ENCRYPTING
  UPLOADING
  COMPLETED
  FAILED
  CANCELLED
  EXPIRED
}

enum BackupFrequency {
  HOURLY
  DAILY
  WEEKLY
  MONTHLY
  CUSTOM
}

enum RestoreStatus {
  INITIATED
  DOWNLOADING
  VALIDATING
  RESTORING
  COMPLETED
  FAILED
  CANCELLED
}

// ============================================================================
// 1. BACKUP SCHEDULES
// ============================================================================

model BackupSchedule {
  id                  String            @id @default(uuid())
  name                String            // "Daily Full Backup", "Hourly Legal Docs"
  description         String?           @db.Text

  // Schedule Configuration
  frequency           BackupFrequency
  cronExpression      String?           @map("cron_expression")  // "0 2 * * *" (2 AM daily)
  hour                Int?              // 0-23
  minute              Int?              // 0-59
  dayOfWeek           Int?              @map("day_of_week")      // 0-6 (Sunday-Saturday)
  dayOfMonth          Int?              @map("day_of_month")     // 1-31
  timezone            String            @default("America/Guayaquil")

  // Backup Type
  backupType          BackupType        @default(FULL_DATABASE) @map("backup_type")
  selectedTables      String[]          @map("selected_tables")  // Array of table names
  excludedTables      String[]          @map("excluded_tables")

  // Retention Policy
  retentionDays       Int               @default(30) @map("retention_days")
  maxBackups          Int?              @map("max_backups")      // Keep last N backups

  // Compression & Encryption
  compressionEnabled  Boolean           @default(true) @map("compression_enabled")
  compressionLevel    Int               @default(6) @map("compression_level")  // 1-9
  encryptionEnabled   Boolean           @default(true) @map("encryption_enabled")
  encryptionAlgorithm String            @default("AES-256-GCM") @map("encryption_algorithm")

  // S3 Configuration
  s3Bucket            String            @default("legal-rag-backups") @map("s3_bucket")
  s3Prefix            String?           @map("s3_prefix")        // "backups/production/"

  // Status & Control
  isActive            Boolean           @default(true) @map("is_active")
  isPaused            Boolean           @default(false) @map("is_paused")
  lastRunAt           DateTime?         @map("last_run_at")
  nextRunAt           DateTime?         @map("next_run_at")

  // Metadata
  createdBy           String            @map("created_by")
  createdAt           DateTime          @default(now()) @map("created_at")
  updatedAt           DateTime          @updatedAt @map("updated_at")

  // Relations
  creator             User              @relation("ScheduleCreator", fields: [createdBy], references: [id])
  backups             BackupExecution[]

  @@index([isActive, nextRunAt])
  @@index([frequency])
  @@index([createdBy])
  @@map("backup_schedules")
}

// ============================================================================
// 2. BACKUP EXECUTIONS
// ============================================================================

model BackupExecution {
  id                  String            @id @default(uuid())
  scheduleId          String?           @map("schedule_id")      // NULL for manual backups

  // Backup Details
  backupType          BackupType        @map("backup_type")
  backupName          String            @map("backup_name")      // "backup_2025-01-15_02-00-00"
  status              BackupStatus      @default(SCHEDULED)

  // Table Selection
  includedTables      String[]          @map("included_tables")
  excludedTables      String[]          @map("excluded_tables")
  totalTables         Int               @default(0) @map("total_tables")

  // Size & Performance
  originalSizeBytes   BigInt?           @map("original_size_bytes")
  compressedSizeBytes BigInt?           @map("compressed_size_bytes")
  compressionRatio    Float?            @map("compression_ratio")

  // Timing
  startedAt           DateTime?         @map("started_at")
  completedAt         DateTime?         @map("completed_at")
  durationSeconds     Int?              @map("duration_seconds")

  // Storage
  s3Bucket            String?           @map("s3_bucket")
  s3Key               String?           @map("s3_key")           // "backups/2025/01/backup_123.sql.gz.enc"
  s3Url               String?           @map("s3_url")
  s3ETag              String?           @map("s3_etag")          // For integrity verification

  // Checksums (for integrity)
  md5Checksum         String?           @map("md5_checksum")
  sha256Checksum      String?           @map("sha256_checksum")

  // Encryption
  encryptionEnabled   Boolean           @default(false) @map("encryption_enabled")
  encryptionKeyId     String?           @map("encryption_key_id") // KMS key ID or reference

  // Error Handling
  errorMessage        String?           @map("error_message") @db.Text
  errorStack          String?           @map("error_stack") @db.Text
  retryCount          Int               @default(0) @map("retry_count")
  maxRetries          Int               @default(3) @map("max_retries")

  // Job Management
  queueJobId          String?           @unique @map("queue_job_id") // BullMQ job ID
  priority            Int               @default(5)

  // Health Score (0-100)
  healthScore         Int?              @map("health_score")
  healthIssues        Json?             @map("health_issues")    // Array of detected issues

  // Metadata
  tableRowCounts      Json?             @map("table_row_counts") // {"users": 1500, "documents": 5000}
  databaseVersion     String?           @map("database_version") // PostgreSQL version
  backupMetadata      Json?             @map("backup_metadata")

  createdBy           String?           @map("created_by")
  createdAt           DateTime          @default(now()) @map("created_at")
  updatedAt           DateTime          @updatedAt @map("updated_at")
  expiresAt           DateTime?         @map("expires_at")       // Auto-delete after this date

  // Relations
  schedule            BackupSchedule?   @relation(fields: [scheduleId], references: [id], onDelete: SetNull)
  creator             User?             @relation("BackupCreator", fields: [createdBy], references: [id])
  restores            RestoreExecution[]
  validations         BackupValidation[]

  @@index([status])
  @@index([scheduleId])
  @@index([startedAt])
  @@index([expiresAt])
  @@index([createdBy])
  @@map("backup_executions")
}

// ============================================================================
// 3. BACKUP VALIDATION
// ============================================================================

model BackupValidation {
  id                  String            @id @default(uuid())
  backupId            String            @map("backup_id")

  // Validation Type
  validationType      String            @map("validation_type")  // "checksum", "restore_test", "integrity"
  status              String            @default("pending")      // pending, running, passed, failed

  // Results
  isValid             Boolean?          @map("is_valid")
  validationScore     Int?              @map("validation_score") // 0-100
  checksumMatch       Boolean?          @map("checksum_match")
  filesIntact         Boolean?          @map("files_intact")

  // Timing
  startedAt           DateTime          @default(now()) @map("started_at")
  completedAt         DateTime?         @map("completed_at")
  durationSeconds     Int?              @map("duration_seconds")

  // Error Handling
  errorMessage        String?           @map("error_message") @db.Text
  warnings            Json?             // Array of non-critical issues

  // Metadata
  validatedBy         String?           @map("validated_by")
  metadata            Json?

  // Relations
  backup              BackupExecution   @relation(fields: [backupId], references: [id], onDelete: Cascade)
  validator           User?             @relation("ValidationUser", fields: [validatedBy], references: [id])

  @@index([backupId])
  @@index([status])
  @@map("backup_validations")
}

// ============================================================================
// 4. RESTORE OPERATIONS
// ============================================================================

model RestoreExecution {
  id                  String            @id @default(uuid())
  backupId            String            @map("backup_id")

  // Restore Configuration
  restoreType         String            @map("restore_type")     // "full", "selective", "point_in_time"
  targetDatabase      String?           @map("target_database")  // NULL = same DB
  selectedTables      String[]          @map("selected_tables")

  // Status
  status              RestoreStatus     @default(INITIATED)
  progress            Int               @default(0)              // 0-100

  // Timing
  startedAt           DateTime          @default(now()) @map("started_at")
  completedAt         DateTime?         @map("completed_at")
  durationSeconds     Int?              @map("duration_seconds")

  // Validation Before Restore
  preRestoreValidated Boolean           @default(false) @map("pre_restore_validated")
  backupChecksumValid Boolean?          @map("backup_checksum_valid")

  // Results
  rowsRestored        BigInt?           @map("rows_restored")
  tablesRestored      Int?              @map("tables_restored")

  // Error Handling
  errorMessage        String?           @map("error_message") @db.Text
  errorStack          String?           @map("error_stack") @db.Text
  rollbackRequired    Boolean           @default(false) @map("rollback_required")
  rollbackCompleted   Boolean?          @map("rollback_completed")

  // Approval Workflow (for production)
  requiresApproval    Boolean           @default(true) @map("requires_approval")
  approvedBy          String?           @map("approved_by")
  approvedAt          DateTime?         @map("approved_at")

  // Metadata
  metadata            Json?
  initiatedBy         String            @map("initiated_by")

  // Relations
  backup              BackupExecution   @relation(fields: [backupId], references: [id])
  initiator           User              @relation("RestoreInitiator", fields: [initiatedBy], references: [id])
  approver            User?             @relation("RestoreApprover", fields: [approvedBy], references: [id])

  @@index([backupId])
  @@index([status])
  @@index([startedAt])
  @@index([initiatedBy])
  @@map("restore_executions")
}

// ============================================================================
// 5. BACKUP HEALTH MONITORING
// ============================================================================

model BackupHealthCheck {
  id                  String            @id @default(uuid())

  // Health Metrics
  overallHealth       Int               @map("overall_health")   // 0-100
  backupCoverage      Float             @map("backup_coverage")  // % of critical tables backed up
  successRate24h      Float             @map("success_rate_24h")
  successRate7d       Float             @map("success_rate_7d")

  // Timing Metrics
  avgBackupDuration   Int?              @map("avg_backup_duration")
  maxBackupDuration   Int?              @map("max_backup_duration")
  lastSuccessfulBackup DateTime?        @map("last_successful_backup")
  timeSinceLastBackup Int?              @map("time_since_last_backup") // minutes

  // Storage Metrics
  totalBackupSizeGB   Float?            @map("total_backup_size_gb")
  oldestBackupDate    DateTime?         @map("oldest_backup_date")
  newestBackupDate    DateTime?         @map("newest_backup_date")
  totalBackupCount    Int               @default(0) @map("total_backup_count")

  // Issues & Alerts
  criticalIssues      Json?             @map("critical_issues")  // Array of critical problems
  warnings            Json?             // Array of warnings
  recommendations     Json?             // Array of recommended actions

  // Compliance
  retentionCompliant  Boolean?          @map("retention_compliant")
  encryptionCompliant Boolean?          @map("encryption_compliant")

  // Metadata
  checkedAt           DateTime          @default(now()) @map("checked_at")
  checkDurationMs     Int?              @map("check_duration_ms")

  @@index([checkedAt])
  @@map("backup_health_checks")
}

// ============================================================================
// 6. BACKUP AUDIT TRAIL
// ============================================================================

model BackupAuditLog {
  id                  String            @id @default(uuid())

  // Action Details
  action              String            // "schedule_created", "backup_started", "restore_completed"
  entityType          String            @map("entity_type")     // "schedule", "backup", "restore"
  entityId            String            @map("entity_id")

  // Actor
  userId              String?           @map("user_id")
  userEmail           String?           @map("user_email")
  ipAddress           String?           @map("ip_address")
  userAgent           String?           @map("user_agent")

  // Changes
  changesBefore       Json?             @map("changes_before")
  changesAfter        Json?             @map("changes_after")

  // Result
  success             Boolean           @default(true)
  errorMessage        String?           @map("error_message")

  // Metadata
  metadata            Json?
  timestamp           DateTime          @default(now())

  // Relations
  user                User?             @relation("BackupAuditUser", fields: [userId], references: [id])

  @@index([action])
  @@index([entityType, entityId])
  @@index([userId])
  @@index([timestamp])
  @@map("backup_audit_logs")
}

// ============================================================================
// USER MODEL EXTENSIONS (Add these relations to existing User model)
// ============================================================================

// Add to existing User model:
/*
  backupSchedulesCreated  BackupSchedule[]     @relation("ScheduleCreator")
  backupsCreated          BackupExecution[]    @relation("BackupCreator")
  validationsPerformed    BackupValidation[]   @relation("ValidationUser")
  restoresInitiated       RestoreExecution[]   @relation("RestoreInitiator")
  restoresApproved        RestoreExecution[]   @relation("RestoreApprover")
  backupAuditLogs         BackupAuditLog[]     @relation("BackupAuditUser")
*/
```

### 2.2 Database Indexes for Performance

```sql
-- High-performance composite indexes for backup operations

-- Fast lookup of active schedules due for execution
CREATE INDEX idx_backup_schedules_active_next_run
ON backup_schedules(is_active, next_run_at)
WHERE is_active = true AND is_paused = false;

-- Recent backup execution queries
CREATE INDEX idx_backup_executions_recent
ON backup_executions(status, started_at DESC);

-- Backup size analytics
CREATE INDEX idx_backup_executions_size_date
ON backup_executions(started_at, compressed_size_bytes);

-- Failed backup investigation
CREATE INDEX idx_backup_executions_failures
ON backup_executions(status, started_at DESC)
WHERE status = 'FAILED';

-- Restore operations by backup
CREATE INDEX idx_restore_executions_backup_status
ON restore_executions(backup_id, status, started_at DESC);

-- Health check time series
CREATE INDEX idx_backup_health_checks_timeline
ON backup_health_checks(checked_at DESC);

-- Audit trail investigations
CREATE INDEX idx_backup_audit_logs_entity
ON backup_audit_logs(entity_type, entity_id, timestamp DESC);

-- Expiration cleanup
CREATE INDEX idx_backup_executions_expiration
ON backup_executions(expires_at)
WHERE expires_at IS NOT NULL;
```

---

## 3. API Endpoint Structure

### 3.1 Backup Management Endpoints

```typescript
// ============================================================================
// BACKUP API ROUTES SPECIFICATION
// Base Path: /api/v1/backups
// ============================================================================

/**
 * AUTHENTICATION: All endpoints require JWT authentication
 * AUTHORIZATION: Admin role required for most operations
 */

// ──────────────────────────────────────────────────────────────────────────
// 1. BACKUP SCHEDULES
// ──────────────────────────────────────────────────────────────────────────

// GET /api/v1/backups/schedules
// List all backup schedules
interface ListSchedulesRequest {
  page?: number;
  limit?: number;
  isActive?: boolean;
  frequency?: BackupFrequency;
}

interface ListSchedulesResponse {
  schedules: BackupSchedule[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// POST /api/v1/backups/schedules
// Create a new backup schedule
interface CreateScheduleRequest {
  name: string;
  description?: string;
  frequency: BackupFrequency;
  hour?: number;              // 0-23
  minute?: number;            // 0-59
  dayOfWeek?: number;         // 0-6
  dayOfMonth?: number;        // 1-31
  cronExpression?: string;    // Custom cron (for CUSTOM frequency)
  timezone?: string;
  backupType: BackupType;
  selectedTables?: string[];
  excludedTables?: string[];
  retentionDays: number;
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
}

interface CreateScheduleResponse {
  schedule: BackupSchedule;
  nextRun: string;            // ISO 8601 timestamp
}

// GET /api/v1/backups/schedules/:scheduleId
// Get schedule details
interface GetScheduleResponse {
  schedule: BackupSchedule;
  recentBackups: BackupExecution[];  // Last 10 backups
  statistics: {
    totalBackups: number;
    successRate: number;
    avgDuration: number;
    avgSize: number;
  };
}

// PUT /api/v1/backups/schedules/:scheduleId
// Update schedule
interface UpdateScheduleRequest extends Partial<CreateScheduleRequest> {
  isActive?: boolean;
  isPaused?: boolean;
}

// DELETE /api/v1/backups/schedules/:scheduleId
// Delete schedule (soft delete, keeps historical backups)

// POST /api/v1/backups/schedules/:scheduleId/trigger
// Manually trigger scheduled backup immediately
interface TriggerScheduleResponse {
  backup: BackupExecution;
  queuePosition: number;
  estimatedStartTime: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 2. BACKUP EXECUTION
// ──────────────────────────────────────────────────────────────────────────

// GET /api/v1/backups/executions
// List backup executions with filtering
interface ListExecutionsRequest {
  page?: number;
  limit?: number;
  status?: BackupStatus;
  scheduleId?: string;
  startDate?: string;         // ISO 8601
  endDate?: string;
  minSize?: number;           // bytes
  maxSize?: number;
}

interface ListExecutionsResponse {
  backups: BackupExecution[];
  pagination: PaginationInfo;
  summary: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    totalSize: number;
  };
}

// GET /api/v1/backups/executions/:backupId
// Get detailed backup execution information
interface GetExecutionResponse {
  backup: BackupExecution;
  schedule?: BackupSchedule;
  validation?: BackupValidation;
  restoreHistory: RestoreExecution[];
  downloadUrl?: string;       // Presigned S3 URL (5 min expiry)
}

// POST /api/v1/backups/executions
// Create manual backup (ad-hoc)
interface CreateManualBackupRequest {
  name: string;
  backupType: BackupType;
  selectedTables?: string[];
  excludedTables?: string[];
  priority?: number;          // 1-10 (10 = highest)
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
  retentionDays?: number;
}

interface CreateManualBackupResponse {
  backup: BackupExecution;
  queueJobId: string;
  position: number;
  estimatedStartTime: string;
}

// GET /api/v1/backups/executions/:backupId/status
// Real-time backup progress
interface BackupStatusResponse {
  backupId: string;
  status: BackupStatus;
  progress: number;           // 0-100
  phase: string;              // "dumping", "compressing", "encrypting", "uploading"
  currentTable?: string;
  tablesProcessed: number;
  totalTables: number;
  bytesProcessed: number;
  estimatedTimeRemaining?: number; // seconds
  startedAt: string;
  elapsedSeconds: number;
}

// DELETE /api/v1/backups/executions/:backupId
// Delete backup (removes from S3 and database)
interface DeleteBackupRequest {
  reason?: string;
  permanent?: boolean;        // Default: false (soft delete)
}

// POST /api/v1/backups/executions/:backupId/download
// Generate presigned download URL
interface GenerateDownloadResponse {
  downloadUrl: string;
  expiresAt: string;
  fileSizeBytes: number;
  fileName: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 3. RESTORE OPERATIONS
// ──────────────────────────────────────────────────────────────────────────

// POST /api/v1/backups/restore
// Initiate restore operation
interface RestoreRequest {
  backupId: string;
  restoreType: 'full' | 'selective' | 'point_in_time';
  selectedTables?: string[];
  targetDatabase?: string;    // For restore to different DB
  requiresApproval?: boolean;
  dryRun?: boolean;           // Preview only, don't execute
}

interface RestoreResponse {
  restore: RestoreExecution;
  preview?: {
    affectedTables: string[];
    estimatedRows: number;
    estimatedDuration: number;
    warnings: string[];
  };
  requiresApproval: boolean;
  approvalUrl?: string;
}

// GET /api/v1/backups/restore/:restoreId
// Get restore operation status
interface RestoreStatusResponse {
  restore: RestoreExecution;
  status: RestoreStatus;
  progress: number;
  currentPhase: string;
  tablesRestored: number;
  rowsRestored: number;
  estimatedTimeRemaining?: number;
}

// POST /api/v1/backups/restore/:restoreId/approve
// Approve restore operation (for production safety)
interface ApproveRestoreRequest {
  approved: boolean;
  comments?: string;
}

// POST /api/v1/backups/restore/:restoreId/cancel
// Cancel in-progress restore

// ──────────────────────────────────────────────────────────────────────────
// 4. VALIDATION & HEALTH
// ──────────────────────────────────────────────────────────────────────────

// POST /api/v1/backups/executions/:backupId/validate
// Validate backup integrity
interface ValidateBackupRequest {
  validationType: 'checksum' | 'restore_test' | 'integrity';
  performRestoreTest?: boolean;  // Actually restore to temp DB
}

interface ValidateBackupResponse {
  validation: BackupValidation;
  isValid: boolean;
  score: number;
  issues: string[];
  warnings: string[];
}

// GET /api/v1/backups/health
// Overall backup system health
interface BackupHealthResponse {
  overallHealth: number;      // 0-100
  lastBackup: {
    timestamp: string;
    status: string;
    hoursAgo: number;
  };
  statistics: {
    successRate24h: number;
    successRate7d: number;
    successRate30d: number;
    avgBackupDuration: number;
    avgBackupSize: number;
  };
  issues: {
    critical: Array<{
      type: string;
      message: string;
      detectedAt: string;
    }>;
    warnings: Array<{
      type: string;
      message: string;
    }>;
  };
  recommendations: string[];
  compliance: {
    retentionPolicy: boolean;
    encryption: boolean;
    frequency: boolean;
  };
}

// GET /api/v1/backups/health/history
// Health check time series
interface HealthHistoryRequest {
  startDate: string;
  endDate: string;
  interval?: 'hour' | 'day' | 'week';
}

// ──────────────────────────────────────────────────────────────────────────
// 5. ANALYTICS & REPORTING
// ──────────────────────────────────────────────────────────────────────────

// GET /api/v1/backups/analytics/dashboard
// Dashboard statistics
interface DashboardAnalyticsResponse {
  summary: {
    totalBackups: number;
    totalSizeGB: number;
    successRate: number;
    activeSchedules: number;
  };
  recentActivity: BackupExecution[];
  sizeOverTime: Array<{
    date: string;
    sizeGB: number;
  }>;
  successRateOverTime: Array<{
    date: string;
    rate: number;
  }>;
  tableBackupFrequency: Array<{
    tableName: string;
    lastBackup: string;
    frequency: string;
  }>;
  upcomingSchedules: Array<{
    schedule: BackupSchedule;
    nextRun: string;
    hoursUntilRun: number;
  }>;
}

// GET /api/v1/backups/analytics/storage
// Storage analytics
interface StorageAnalyticsResponse {
  totalSizeGB: number;
  byType: Array<{
    type: BackupType;
    count: number;
    sizeGB: number;
  }>;
  byMonth: Array<{
    month: string;
    count: number;
    sizeGB: number;
  }>;
  largestBackups: BackupExecution[];
  retentionProjection: Array<{
    date: string;
    projectedSizeGB: number;
    projectedCost: number;
  }>;
}

// GET /api/v1/backups/analytics/performance
// Performance metrics
interface PerformanceAnalyticsResponse {
  avgBackupDuration: number;
  avgCompressionRatio: number;
  avgUploadSpeed: number;      // MB/s
  durationByTableCount: Array<{
    tableCount: number;
    avgDuration: number;
  }>;
  compressionEfficiency: Array<{
    date: string;
    ratio: number;
  }>;
}

// ──────────────────────────────────────────────────────────────────────────
// 6. CONFIGURATION & UTILITIES
// ──────────────────────────────────────────────────────────────────────────

// GET /api/v1/backups/config/tables
// List all database tables for selection
interface TablesListResponse {
  tables: Array<{
    name: string;
    schema: string;
    rowCount: number;
    sizeBytes: number;
    lastBackup?: string;
    isCritical: boolean;
  }>;
  totalTables: number;
  totalSizeGB: number;
}

// GET /api/v1/backups/config/cron-preview
// Preview cron schedule
interface CronPreviewRequest {
  cronExpression: string;
  timezone?: string;
  count?: number;              // Number of future occurrences
}

interface CronPreviewResponse {
  isValid: boolean;
  description: string;
  nextOccurrences: string[];   // ISO 8601 timestamps
  error?: string;
}

// POST /api/v1/backups/config/test-connection
// Test database and S3 connectivity
interface TestConnectionResponse {
  database: {
    connected: boolean;
    version: string;
    responseTime: number;
  };
  s3: {
    accessible: boolean;
    bucket: string;
    region: string;
    canWrite: boolean;
  };
}

// ──────────────────────────────────────────────────────────────────────────
// 7. AUDIT & COMPLIANCE
// ──────────────────────────────────────────────────────────────────────────

// GET /api/v1/backups/audit
// Audit trail query
interface AuditQueryRequest {
  startDate?: string;
  endDate?: string;
  action?: string;
  userId?: string;
  entityType?: string;
  page?: number;
  limit?: number;
}

interface AuditQueryResponse {
  logs: BackupAuditLog[];
  pagination: PaginationInfo;
}

// GET /api/v1/backups/compliance/report
// Generate compliance report
interface ComplianceReportResponse {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalBackups: number;
    successfulBackups: number;
    failedBackups: number;
    averageRPO: number;         // minutes
    maxRTO: number;             // minutes
  };
  compliance: {
    retentionPolicy: {
      compliant: boolean;
      violations: number;
      details: string[];
    };
    encryptionPolicy: {
      compliant: boolean;
      unencryptedBackups: number;
    };
    frequencyPolicy: {
      compliant: boolean;
      missedSchedules: number;
    };
  };
  recommendations: string[];
  exportUrl?: string;          // PDF report download
}
```

---

## 4. Background Job Architecture (BullMQ Integration)

### 4.1 Queue Structure

```typescript
// ============================================================================
// BACKUP QUEUE SERVICE IMPLEMENTATION
// File: src/services/queue/backup-queue.service.ts
// ============================================================================

import Bull, { Queue, Job, JobOptions } from 'bull';
import { PrismaClient } from '@prisma/client';
import { S3Client } from '@aws-sdk/client-s3';
import { BackupStatus, BackupType } from '@prisma/client';

// ──────────────────────────────────────────────────────────────────────────
// JOB TYPES & INTERFACES
// ──────────────────────────────────────────────────────────────────────────

interface BackupJob {
  type: 'full_backup' | 'selective_backup' | 'scheduled_backup';
  backupId: string;
  scheduleId?: string;
  config: {
    backupType: BackupType;
    includedTables?: string[];
    excludedTables?: string[];
    compressionEnabled: boolean;
    compressionLevel: number;
    encryptionEnabled: boolean;
    s3Bucket: string;
    s3Prefix: string;
  };
  priority: number;
}

interface RestoreJob {
  type: 'full_restore' | 'selective_restore';
  restoreId: string;
  backupId: string;
  config: {
    selectedTables?: string[];
    targetDatabase?: string;
    validateBeforeRestore: boolean;
  };
}

interface ValidationJob {
  type: 'checksum_validation' | 'restore_test' | 'integrity_check';
  backupId: string;
  validationId: string;
}

interface MaintenanceJob {
  type: 'cleanup_expired' | 'health_check' | 'retention_enforcement';
  config?: any;
}

type BackupQueueJob = BackupJob | RestoreJob | ValidationJob | MaintenanceJob;

// ──────────────────────────────────────────────────────────────────────────
// BACKUP QUEUE SERVICE
// ──────────────────────────────────────────────────────────────────────────

export class BackupQueueService {
  private backupQueue: Queue<BackupJob>;
  private restoreQueue: Queue<RestoreJob>;
  private validationQueue: Queue<ValidationJob>;
  private maintenanceQueue: Queue<MaintenanceJob>;
  private prisma: PrismaClient;
  private s3Client: S3Client;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL is required for Backup Queue');
    }

    this.prisma = new PrismaClient();
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // ────────────────────────────────────────────────────────────────────
    // BACKUP QUEUE CONFIGURATION
    // ────────────────────────────────────────────────────────────────────
    this.backupQueue = new Bull<BackupJob>('backup-executions', redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000,           // Start with 1 minute
        },
        timeout: 7200000,         // 2 hours
        removeOnComplete: false,  // Keep for audit trail
        removeOnFail: false,
      },
      limiter: {
        max: 2,                   // Max 2 concurrent backups
        duration: 60000,
      },
      settings: {
        stalledInterval: 300000,  // Check for stalled jobs every 5 min
        maxStalledCount: 2,
      },
    });

    // ────────────────────────────────────────────────────────────────────
    // RESTORE QUEUE CONFIGURATION
    // ────────────────────────────────────────────────────────────────────
    this.restoreQueue = new Bull<RestoreJob>('restore-executions', redisUrl, {
      defaultJobOptions: {
        attempts: 2,
        timeout: 7200000,
        removeOnComplete: false,
      },
      limiter: {
        max: 1,                   // Only 1 restore at a time
        duration: 60000,
      },
    });

    // ────────────────────────────────────────────────────────────────────
    // VALIDATION QUEUE CONFIGURATION
    // ────────────────────────────────────────────────────────────────────
    this.validationQueue = new Bull<ValidationJob>('backup-validations', redisUrl, {
      defaultJobOptions: {
        attempts: 2,
        timeout: 1800000,         // 30 minutes
      },
      limiter: {
        max: 3,
        duration: 60000,
      },
    });

    // ────────────────────────────────────────────────────────────────────
    // MAINTENANCE QUEUE CONFIGURATION
    // ────────────────────────────────────────────────────────────────────
    this.maintenanceQueue = new Bull<MaintenanceJob>('backup-maintenance', redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        timeout: 600000,          // 10 minutes
      },
    });

    this.setupProcessors();
    this.setupEventListeners();

    console.log('✅ Backup Queue Service initialized');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // JOB PROCESSORS
  // ──────────────────────────────────────────────────────────────────────────

  private setupProcessors(): void {
    // Backup processors
    this.backupQueue.process('full_backup', 1, this.processFullBackup.bind(this));
    this.backupQueue.process('selective_backup', 1, this.processSelectiveBackup.bind(this));
    this.backupQueue.process('scheduled_backup', 1, this.processScheduledBackup.bind(this));

    // Restore processors
    this.restoreQueue.process('full_restore', 1, this.processFullRestore.bind(this));
    this.restoreQueue.process('selective_restore', 1, this.processSelectiveRestore.bind(this));

    // Validation processors
    this.validationQueue.process('checksum_validation', 2, this.processChecksumValidation.bind(this));
    this.validationQueue.process('restore_test', 1, this.processRestoreTest.bind(this));
    this.validationQueue.process('integrity_check', 2, this.processIntegrityCheck.bind(this));

    // Maintenance processors
    this.maintenanceQueue.process('cleanup_expired', this.processCleanupExpired.bind(this));
    this.maintenanceQueue.process('health_check', this.processHealthCheck.bind(this));
    this.maintenanceQueue.process('retention_enforcement', this.processRetentionEnforcement.bind(this));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EVENT LISTENERS
  // ──────────────────────────────────────────────────────────────────────────

  private setupEventListeners(): void {
    // Backup queue events
    this.backupQueue.on('active', (job) => {
      this.updateBackupStatus(job.data.backupId, BackupStatus.IN_PROGRESS);
      console.log(`🚀 Backup job ${job.id} started`);
    });

    this.backupQueue.on('completed', (job, result) => {
      this.updateBackupStatus(job.data.backupId, BackupStatus.COMPLETED);
      this.sendNotification('backup_completed', job.data.backupId);
      console.log(`✅ Backup job ${job.id} completed`);
    });

    this.backupQueue.on('failed', (job, error) => {
      this.updateBackupStatus(job.data.backupId, BackupStatus.FAILED, error.message);
      this.sendAlertNotification('backup_failed', job.data.backupId, error);
      console.error(`❌ Backup job ${job.id} failed:`, error);
    });

    this.backupQueue.on('stalled', (job) => {
      console.warn(`⚠️ Backup job ${job.id} stalled`);
    });

    // Similar event listeners for restore, validation, and maintenance queues
    this.restoreQueue.on('completed', (job) => {
      this.sendNotification('restore_completed', job.data.restoreId);
    });

    this.restoreQueue.on('failed', (job, error) => {
      this.sendAlertNotification('restore_failed', job.data.restoreId, error);
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC API METHODS
  // ──────────────────────────────────────────────────────────────────────────

  async scheduleBackup(backupJob: BackupJob): Promise<Job<BackupJob>> {
    const job = await this.backupQueue.add(backupJob.type, backupJob, {
      priority: backupJob.priority || 5,
      jobId: backupJob.backupId,
    });

    await this.prisma.backupExecution.update({
      where: { id: backupJob.backupId },
      data: {
        queueJobId: job.id.toString(),
        status: BackupStatus.QUEUED,
      },
    });

    return job;
  }

  async scheduleRestore(restoreJob: RestoreJob): Promise<Job<RestoreJob>> {
    const job = await this.restoreQueue.add(restoreJob.type, restoreJob, {
      priority: 1,              // Restores are always high priority
      jobId: restoreJob.restoreId,
    });

    return job;
  }

  async scheduleValidation(validationJob: ValidationJob): Promise<Job<ValidationJob>> {
    const job = await this.validationQueue.add(validationJob.type, validationJob);
    return job;
  }

  async getJobStatus(jobId: string): Promise<any> {
    const backupJob = await this.backupQueue.getJob(jobId);
    if (backupJob) {
      return {
        id: backupJob.id,
        state: await backupJob.getState(),
        progress: backupJob.progress(),
        attempts: backupJob.attemptsMade,
        data: backupJob.data,
      };
    }
    return null;
  }

  async getQueueMetrics(): Promise<any> {
    const [
      backupWaiting,
      backupActive,
      backupCompleted,
      backupFailed,
      restoreWaiting,
      restoreActive,
    ] = await Promise.all([
      this.backupQueue.getWaitingCount(),
      this.backupQueue.getActiveCount(),
      this.backupQueue.getCompletedCount(),
      this.backupQueue.getFailedCount(),
      this.restoreQueue.getWaitingCount(),
      this.restoreQueue.getActiveCount(),
    ]);

    return {
      backup: {
        waiting: backupWaiting,
        active: backupActive,
        completed: backupCompleted,
        failed: backupFailed,
      },
      restore: {
        waiting: restoreWaiting,
        active: restoreActive,
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PROCESSOR IMPLEMENTATIONS (Simplified - actual implementations are complex)
  // ──────────────────────────────────────────────────────────────────────────

  private async processFullBackup(job: Job<BackupJob>): Promise<void> {
    const { backupId, config } = job.data;

    try {
      // Update status
      await this.updateBackupStatus(backupId, BackupStatus.IN_PROGRESS);

      // Phase 1: Database dump
      job.progress(10);
      const dumpFilePath = await this.executePgDump(backupId, config);

      // Phase 2: Compression
      job.progress(40);
      const compressedFilePath = config.compressionEnabled
        ? await this.compressFile(dumpFilePath, config.compressionLevel)
        : dumpFilePath;

      // Phase 3: Encryption
      job.progress(60);
      const finalFilePath = config.encryptionEnabled
        ? await this.encryptFile(compressedFilePath)
        : compressedFilePath;

      // Phase 4: Upload to S3
      job.progress(80);
      const s3Result = await this.uploadToS3(finalFilePath, backupId, config);

      // Phase 5: Record metadata
      job.progress(95);
      await this.recordBackupMetadata(backupId, s3Result, finalFilePath);

      // Phase 6: Cleanup local files
      await this.cleanupLocalFiles([dumpFilePath, compressedFilePath, finalFilePath]);

      job.progress(100);
      await this.updateBackupStatus(backupId, BackupStatus.COMPLETED);

    } catch (error) {
      await this.updateBackupStatus(backupId, BackupStatus.FAILED, error.message);
      throw error;
    }
  }

  private async processSelectiveBackup(job: Job<BackupJob>): Promise<void> {
    // Similar to processFullBackup but with table filtering
    // Implementation details...
  }

  private async processScheduledBackup(job: Job<BackupJob>): Promise<void> {
    // Delegates to processFullBackup or processSelectiveBackup
    // Implementation details...
  }

  private async processFullRestore(job: Job<RestoreJob>): Promise<void> {
    // Restore implementation
    // Implementation details...
  }

  private async processSelectiveRestore(job: Job<RestoreJob>): Promise<void> {
    // Selective restore implementation
    // Implementation details...
  }

  private async processChecksumValidation(job: Job<ValidationJob>): Promise<void> {
    // Checksum validation implementation
    // Implementation details...
  }

  private async processRestoreTest(job: Job<ValidationJob>): Promise<void> {
    // Restore test implementation
    // Implementation details...
  }

  private async processIntegrityCheck(job: Job<ValidationJob>): Promise<void> {
    // Integrity check implementation
    // Implementation details...
  }

  private async processCleanupExpired(job: Job<MaintenanceJob>): Promise<void> {
    // Cleanup expired backups
    // Implementation details...
  }

  private async processHealthCheck(job: Job<MaintenanceJob>): Promise<void> {
    // Health check implementation
    // Implementation details...
  }

  private async processRetentionEnforcement(job: Job<MaintenanceJob>): Promise<void> {
    // Retention policy enforcement
    // Implementation details...
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER METHODS (Stubs - actual implementations are extensive)
  // ──────────────────────────────────────────────────────────────────────────

  private async executePgDump(backupId: string, config: any): Promise<string> {
    // Execute pg_dump command
    // Return local file path
    return '/tmp/backup.sql';
  }

  private async compressFile(filePath: string, level: number): Promise<string> {
    // Compress using gzip or lz4
    return filePath + '.gz';
  }

  private async encryptFile(filePath: string): Promise<string> {
    // Encrypt using AES-256-GCM
    return filePath + '.enc';
  }

  private async uploadToS3(filePath: string, backupId: string, config: any): Promise<any> {
    // Upload to S3 with multipart upload
    return { bucket: config.s3Bucket, key: `backups/${backupId}.sql.gz.enc` };
  }

  private async recordBackupMetadata(backupId: string, s3Result: any, filePath: string): Promise<void> {
    // Record metadata in database
  }

  private async cleanupLocalFiles(filePaths: string[]): Promise<void> {
    // Delete local temporary files
  }

  private async updateBackupStatus(
    backupId: string,
    status: BackupStatus,
    errorMessage?: string
  ): Promise<void> {
    await this.prisma.backupExecution.update({
      where: { id: backupId },
      data: {
        status,
        errorMessage,
        ...(status === BackupStatus.IN_PROGRESS && { startedAt: new Date() }),
        ...(status === BackupStatus.COMPLETED && { completedAt: new Date() }),
      },
    });
  }

  private async sendNotification(type: string, entityId: string): Promise<void> {
    // Send Slack/Email notification
  }

  private async sendAlertNotification(type: string, entityId: string, error: Error): Promise<void> {
    // Send PagerDuty/Email alert
  }

  async close(): Promise<void> {
    await Promise.all([
      this.backupQueue.close(),
      this.restoreQueue.close(),
      this.validationQueue.close(),
      this.maintenanceQueue.close(),
    ]);
    await this.prisma.$disconnect();
  }
}

// ──────────────────────────────────────────────────────────────────────────
// SINGLETON INSTANCE
// ──────────────────────────────────────────────────────────────────────────

let backupQueueInstance: BackupQueueService | null = null;

export function getBackupQueueService(): BackupQueueService {
  if (!backupQueueInstance) {
    backupQueueInstance = new BackupQueueService();
  }
  return backupQueueInstance;
}
```

### 4.2 Cron Job Scheduler

```typescript
// ============================================================================
// BACKUP SCHEDULER SERVICE
// File: src/services/backup/backup-scheduler.service.ts
// ============================================================================

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { getBackupQueueService } from '../queue/backup-queue.service';

export class BackupSchedulerService {
  private prisma: PrismaClient;
  private scheduledTasks: Map<string, cron.ScheduledTask>;
  private queueService: ReturnType<typeof getBackupQueueService>;

  constructor() {
    this.prisma = new PrismaClient();
    this.scheduledTasks = new Map();
    this.queueService = getBackupQueueService();
    this.initializeSchedules();
  }

  async initializeSchedules(): Promise<void> {
    // Load all active schedules from database
    const activeSchedules = await this.prisma.backupSchedule.findMany({
      where: {
        isActive: true,
        isPaused: false,
      },
    });

    for (const schedule of activeSchedules) {
      await this.registerSchedule(schedule);
    }

    console.log(`✅ Initialized ${activeSchedules.length} backup schedules`);
  }

  async registerSchedule(schedule: any): Promise<void> {
    const cronExpression = schedule.cronExpression || this.generateCronExpression(schedule);

    const task = cron.schedule(cronExpression, async () => {
      await this.executeSchedule(schedule.id);
    }, {
      scheduled: true,
      timezone: schedule.timezone || 'America/Guayaquil',
    });

    this.scheduledTasks.set(schedule.id, task);
    console.log(`📅 Registered schedule: ${schedule.name} (${cronExpression})`);
  }

  async executeSchedule(scheduleId: string): Promise<void> {
    try {
      // Create backup execution record
      const backup = await this.prisma.backupExecution.create({
        data: {
          scheduleId,
          // ... other fields
        },
      });

      // Add to queue
      await this.queueService.scheduleBackup({
        type: 'scheduled_backup',
        backupId: backup.id,
        scheduleId,
        // ... config
      });

      // Update schedule's lastRunAt and nextRunAt
      await this.prisma.backupSchedule.update({
        where: { id: scheduleId },
        data: {
          lastRunAt: new Date(),
          nextRunAt: this.calculateNextRun(scheduleId),
        },
      });

    } catch (error) {
      console.error(`Failed to execute schedule ${scheduleId}:`, error);
    }
  }

  private generateCronExpression(schedule: any): string {
    // Convert schedule configuration to cron expression
    // Implementation...
    return '0 2 * * *'; // 2 AM daily
  }

  private calculateNextRun(scheduleId: string): Date {
    // Calculate next run time
    // Implementation...
    return new Date();
  }
}
```

---

## 5. Security Considerations

### 5.1 Security Architecture

```typescript
// ============================================================================
// SECURITY IMPLEMENTATION
// ============================================================================

/**
 * ENCRYPTION AT REST
 * - All backups encrypted with AES-256-GCM before S3 upload
 * - Encryption keys managed via AWS KMS or HashiCorp Vault
 * - Key rotation every 90 days
 */

/**
 * ENCRYPTION IN TRANSIT
 * - TLS 1.3 for all API communications
 * - S3 transfer via HTTPS
 * - Database connections via SSL/TLS
 */

/**
 * ACCESS CONTROL
 * - Role-Based Access Control (RBAC)
 * - Only admin users can create/modify schedules
 * - Restore operations require approval workflow
 * - Audit logging for all backup operations
 */

/**
 * CREDENTIAL MANAGEMENT
 * - Database credentials stored in environment variables
 * - AWS credentials via IAM roles (preferred) or access keys
 * - No hardcoded credentials in code
 * - Separate credentials for backup vs. restore operations
 */

/**
 * BACKUP INTEGRITY
 * - SHA-256 checksums for all backups
 * - Signature verification before restore
 * - Regular validation jobs
 * - Tampering detection
 */

/**
 * COMPLIANCE
 * - GDPR: Data retention and deletion policies
 * - SOC 2: Access logging and monitoring
 * - HIPAA: Encryption and audit trails (if applicable)
 */

// ──────────────────────────────────────────────────────────────────────────
// ENCRYPTION SERVICE
// ──────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';
import { KMSClient, GenerateDataKeyCommand } from '@aws-sdk/client-kms';

export class EncryptionService {
  private kmsClient: KMSClient;
  private keyId: string;

  constructor() {
    this.kmsClient = new KMSClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.keyId = process.env.AWS_KMS_KEY_ID!;
  }

  async encryptFile(inputPath: string, outputPath: string): Promise<{
    encryptedPath: string;
    keyId: string;
    encryptedDataKey: string;
  }> {
    // Generate data encryption key
    const dataKey = await this.generateDataKey();

    // Encrypt file with AES-256-GCM
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(dataKey.plaintext),
      Buffer.alloc(16, 0) // IV
    );

    // Stream encryption (for large files)
    const inputStream = fs.createReadStream(inputPath);
    const outputStream = fs.createWriteStream(outputPath);

    await pipeline(
      inputStream,
      cipher,
      outputStream
    );

    const authTag = cipher.getAuthTag();

    return {
      encryptedPath: outputPath,
      keyId: this.keyId,
      encryptedDataKey: dataKey.encrypted.toString('base64'),
    };
  }

  async decryptFile(inputPath: string, outputPath: string, encryptedDataKey: string): Promise<string> {
    // Decrypt data key using KMS
    const plaintext = await this.decryptDataKey(encryptedDataKey);

    // Decrypt file
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(plaintext),
      Buffer.alloc(16, 0)
    );

    // Stream decryption
    const inputStream = fs.createReadStream(inputPath);
    const outputStream = fs.createWriteStream(outputPath);

    await pipeline(
      inputStream,
      decipher,
      outputStream
    );

    return outputPath;
  }

  private async generateDataKey(): Promise<{ plaintext: Uint8Array; encrypted: Uint8Array }> {
    const command = new GenerateDataKeyCommand({
      KeyId: this.keyId,
      KeySpec: 'AES_256',
    });

    const response = await this.kmsClient.send(command);

    return {
      plaintext: response.Plaintext!,
      encrypted: response.CiphertextBlob!,
    };
  }

  private async decryptDataKey(encryptedKey: string): Promise<Uint8Array> {
    // KMS decrypt implementation
    return new Uint8Array();
  }
}

// ──────────────────────────────────────────────────────────────────────────
// ACCESS CONTROL MIDDLEWARE
// ──────────────────────────────────────────────────────────────────────────

export async function checkBackupPermission(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = request.user;

  if (!user) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  // Only admin users can manage backups
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return reply.code(403).send({ error: 'Insufficient permissions' });
  }

  // Log access attempt
  await prisma.backupAuditLog.create({
    data: {
      action: 'backup_access',
      userId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: {
        endpoint: request.url,
        method: request.method,
      },
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// RESTORE APPROVAL WORKFLOW
// ──────────────────────────────────────────────────────────────────────────

export async function requireRestoreApproval(
  restoreId: string,
  approverId: string
): Promise<boolean> {
  const restore = await prisma.restoreExecution.findUnique({
    where: { id: restoreId },
  });

  if (!restore) {
    throw new Error('Restore operation not found');
  }

  if (restore.status !== 'INITIATED') {
    throw new Error('Restore operation is not pending approval');
  }

  // Check if approver is authorized
  const approver = await prisma.user.findUnique({
    where: { id: approverId },
  });

  if (!approver || approver.role !== 'super_admin') {
    throw new Error('Unauthorized approver');
  }

  // Record approval
  await prisma.restoreExecution.update({
    where: { id: restoreId },
    data: {
      approvedBy: approverId,
      approvedAt: new Date(),
      status: 'DOWNLOADING',
    },
  });

  // Send notification
  await sendNotification({
    type: 'restore_approved',
    recipients: [restore.initiatedBy, approverId],
    data: { restoreId },
  });

  return true;
}
```

### 5.2 IAM Policies (AWS)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BackupS3Access",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::legal-rag-backups",
        "arn:aws:s3:::legal-rag-backups/*"
      ]
    },
    {
      "Sid": "KMSEncryptionAccess",
      "Effect": "Allow",
      "Action": [
        "kms:GenerateDataKey",
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID"
    },
    {
      "Sid": "CloudWatchMetrics",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 6. Scalability Patterns

### 6.1 Scalability Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SCALABILITY STRATEGIES                      │
└─────────────────────────────────────────────────────────────────┘

1. HORIZONTAL SCALING
   ├── Multiple backup workers (BullMQ concurrency)
   ├── Load balancing across workers
   └── Dynamic worker scaling based on queue depth

2. VERTICAL SCALING
   ├── Increase worker memory for large database dumps
   ├── CPU optimization for compression/encryption
   └── Dedicated backup servers

3. DATABASE OPTIMIZATION
   ├── pg_dump streaming mode (no temp file)
   ├── Parallel dump (--jobs flag)
   ├── Selective table dumps
   └── Incremental backups (future)

4. STORAGE OPTIMIZATION
   ├── S3 Intelligent-Tiering
   ├── Lifecycle policies (Glacier for old backups)
   ├── Compression (gzip level 6)
   └── Deduplication (future)

5. NETWORK OPTIMIZATION
   ├── S3 Transfer Acceleration
   ├── Multipart uploads
   ├── Compression before transfer
   └── Regional S3 buckets

6. QUEUE MANAGEMENT
   ├── Priority queues
   ├── Job batching
   ├── Rate limiting
   └── Circuit breakers
```

### 6.2 Performance Benchmarks

```typescript
// ============================================================================
// EXPECTED PERFORMANCE METRICS
// ============================================================================

/**
 * DATABASE SIZE vs BACKUP TIME (Full Backup, Compression Enabled)
 *
 * 1 GB   → 2-3 minutes
 * 5 GB   → 8-12 minutes
 * 10 GB  → 15-25 minutes
 * 50 GB  → 60-90 minutes
 * 100 GB → 2-3 hours
 *
 * Factors affecting performance:
 * - Database activity during backup
 * - Network bandwidth to S3
 * - Compression level (1-9)
 * - Encryption overhead (~5-10%)
 * - Number of tables
 */

/**
 * COMPRESSION RATIOS (Typical for Legal Documents)
 *
 * Text-heavy tables: 70-80% reduction
 * JSON metadata: 60-70% reduction
 * Binary data: 10-20% reduction
 * Average: 60% reduction
 */

/**
 * CONCURRENT OPERATIONS
 *
 * Max concurrent backups: 2 (configurable)
 * Max concurrent restores: 1 (safety)
 * Max concurrent validations: 3
 */

/**
 * QUEUE THROUGHPUT
 *
 * Jobs/hour: 60 (1 per minute)
 * Peak capacity: 120 jobs/hour with scaling
 */
```

---

## 7. Disaster Recovery Strategy

### 7.1 Disaster Recovery Plan

```
┌─────────────────────────────────────────────────────────────────┐
│                  DISASTER RECOVERY ARCHITECTURE                  │
└─────────────────────────────────────────────────────────────────┘

SCENARIO 1: DATABASE CORRUPTION
├── Detection: Automated integrity checks
├── Response Time: <15 minutes
├── Recovery Steps:
│   1. Identify last known good backup
│   2. Validate backup integrity
│   3. Initiate restore to temporary database
│   4. Verify restored data
│   5. Switch DNS/connection string
│   6. Monitor for issues
└── Expected RTO: 2 hours

SCENARIO 2: COMPLETE DATA CENTER FAILURE
├── Detection: Health check failures
├── Response Time: <30 minutes
├── Recovery Steps:
│   1. Provision new database instance
│   2. Download latest backup from S3
│   3. Restore database
│   4. Update application configuration
│   5. Verify functionality
│   6. Update DNS records
└── Expected RTO: 4 hours

SCENARIO 3: ACCIDENTAL DATA DELETION
├── Detection: User report or audit log
├── Response Time: <5 minutes
├── Recovery Steps:
│   1. Identify deletion timestamp
│   2. Find nearest backup before deletion
│   3. Selective restore of affected tables
│   4. Merge data carefully
│   5. Verify data integrity
└── Expected RTO: 1 hour

SCENARIO 4: RANSOMWARE ATTACK
├── Detection: Anomaly detection
├── Response Time: Immediate
├── Recovery Steps:
│   1. Isolate affected systems
│   2. Identify last clean backup (before attack)
│   3. Verify backup integrity (not encrypted)
│   4. Provision clean infrastructure
│   5. Restore from clean backup
│   6. Apply security patches
│   7. Monitor for reinfection
└── Expected RTO: 8 hours

┌─────────────────────────────────────────────────────────────────┐
│                    RECOVERY POINT OBJECTIVES                     │
└─────────────────────────────────────────────────────────────────┘

CRITICAL TABLES (users, legal_documents, cases):
└── RPO: 15 minutes (frequent backups)

HIGH-PRIORITY TABLES (documents, chunks):
└── RPO: 1 hour

MEDIUM-PRIORITY TABLES (analytics, logs):
└── RPO: 4 hours

LOW-PRIORITY TABLES (cache, temporary):
└── RPO: 24 hours (or acceptable loss)

┌─────────────────────────────────────────────────────────────────┐
│                    BACKUP VERIFICATION SCHEDULE                  │
└─────────────────────────────────────────────────────────────────┘

Daily:
├── Checksum validation of last backup
└── Backup size verification

Weekly:
├── Test restore to temporary database
└── Data integrity checks

Monthly:
├── Full disaster recovery drill
├── Recovery time measurement
└── Update runbooks
```

### 7.2 Runbook: Emergency Restore

```bash
# ============================================================================
# EMERGENCY RESTORE RUNBOOK
# ============================================================================

# STEP 1: IDENTIFY BACKUP
# List recent backups
curl -X GET https://api.example.com/api/v1/backups/executions \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --data '{"limit": 10, "status": "COMPLETED"}'

# STEP 2: VALIDATE BACKUP INTEGRITY
# Run checksum validation
curl -X POST https://api.example.com/api/v1/backups/executions/$BACKUP_ID/validate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --data '{"validationType": "checksum"}'

# STEP 3: INITIATE RESTORE
# Start restore operation
curl -X POST https://api.example.com/api/v1/backups/restore \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --data '{
    "backupId": "$BACKUP_ID",
    "restoreType": "full",
    "requiresApproval": false
  }'

# STEP 4: MONITOR RESTORE PROGRESS
# Check restore status
watch -n 5 'curl -X GET https://api.example.com/api/v1/backups/restore/$RESTORE_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"'

# STEP 5: VERIFY DATA INTEGRITY
# Run database integrity checks
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM legal_documents;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM cases;"

# STEP 6: RESTART APPLICATION
# Restart backend services
pm2 restart legal-rag-backend

# STEP 7: VERIFY FUNCTIONALITY
# Health check
curl https://api.example.com/health

# Test query endpoint
curl -X POST https://api.example.com/api/v1/query \
  -H "Authorization: Bearer $USER_TOKEN" \
  --data '{"query": "test query"}'

# STEP 8: NOTIFY STAKEHOLDERS
# Send notification
./scripts/send-notification.sh "Database restore completed successfully"
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Database schema implementation
- [ ] Basic backup execution service
- [ ] S3 integration
- [ ] Manual backup API endpoint

### Phase 2: Automation (Week 2)
- [ ] BullMQ queue setup
- [ ] Schedule management
- [ ] Cron job integration
- [ ] Email notifications

### Phase 3: Security (Week 3)
- [ ] Encryption implementation
- [ ] Access control
- [ ] Audit logging
- [ ] Validation system

### Phase 4: Admin Interface (Week 4)
- [ ] Dashboard UI
- [ ] Schedule configuration
- [ ] Backup history
- [ ] Restore wizard

### Phase 5: Monitoring & Optimization (Week 5)
- [ ] Health checks
- [ ] Performance metrics
- [ ] Alerting system
- [ ] Documentation

---

## 9. Monitoring & Observability

### 9.1 Key Metrics

```typescript
// ============================================================================
// OBSERVABILITY METRICS
// ============================================================================

/**
 * BACKUP METRICS
 */
const BACKUP_METRICS = {
  // Success metrics
  'backup.executions.total': 'Counter',
  'backup.executions.success': 'Counter',
  'backup.executions.failed': 'Counter',
  'backup.success_rate': 'Gauge',           // 0-100%

  // Duration metrics
  'backup.duration_seconds': 'Histogram',
  'backup.duration.avg': 'Gauge',
  'backup.duration.max': 'Gauge',

  // Size metrics
  'backup.size_bytes': 'Histogram',
  'backup.compression_ratio': 'Gauge',
  'backup.total_size_gb': 'Gauge',

  // Queue metrics
  'backup.queue.waiting': 'Gauge',
  'backup.queue.active': 'Gauge',
  'backup.queue.completed': 'Counter',
  'backup.queue.failed': 'Counter',

  // Health metrics
  'backup.health_score': 'Gauge',            // 0-100
  'backup.time_since_last_success': 'Gauge', // minutes
  'backup.retention_compliance': 'Gauge',    // 0-1
};

/**
 * RESTORE METRICS
 */
const RESTORE_METRICS = {
  'restore.executions.total': 'Counter',
  'restore.executions.success': 'Counter',
  'restore.executions.failed': 'Counter',
  'restore.duration_seconds': 'Histogram',
  'restore.rows_restored': 'Counter',
};

/**
 * ALERT THRESHOLDS
 */
const ALERT_THRESHOLDS = {
  // Critical
  backup_failed: {
    threshold: 1,
    severity: 'critical',
    channels: ['pagerduty', 'slack', 'email'],
  },
  no_backup_24h: {
    threshold: 24 * 60,           // 24 hours in minutes
    severity: 'critical',
    channels: ['pagerduty', 'slack'],
  },
  health_score_critical: {
    threshold: 30,
    severity: 'critical',
    channels: ['pagerduty', 'slack'],
  },

  // Warning
  backup_duration_high: {
    threshold: 7200,              // 2 hours in seconds
    severity: 'warning',
    channels: ['slack', 'email'],
  },
  queue_depth_high: {
    threshold: 10,
    severity: 'warning',
    channels: ['slack'],
  },
  storage_usage_high: {
    threshold: 80,                // 80% of quota
    severity: 'warning',
    channels: ['email'],
  },
};
```

### 9.2 Dashboard Widgets

```
┌─────────────────────────────────────────────────────────────────┐
│                      BACKUP DASHBOARD LAYOUT                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  OVERVIEW ROW                                                    │
├──────────────┬──────────────┬──────────────┬──────────────────────┤
│ Total Backups│ Success Rate │ Avg Duration │ Total Storage        │
│    1,234     │    99.2%     │   18 min     │    450 GB            │
└──────────────┴──────────────┴──────────────┴──────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  HEALTH STATUS                                                   │
├──────────────────────────────────────────────────────────────────┤
│  Overall Health: ████████░░ 85/100                               │
│                                                                  │
│  ✅ Last Backup: 15 minutes ago                                  │
│  ⚠️  Backup Queue: 3 jobs waiting                                │
│  ✅ Encryption: Enabled (100%)                                   │
│  ⚠️  Storage: 450 GB / 500 GB (90%)                              │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  RECENT ACTIVITY                                                 │
├────────────┬─────────────┬──────────────┬────────────────────────┤
│ Time       │ Type        │ Status       │ Duration               │
├────────────┼─────────────┼──────────────┼────────────────────────┤
│ 2 min ago  │ Scheduled   │ ✅ Success   │ 18m 34s                │
│ 1 hr ago   │ Manual      │ ✅ Success   │ 12m 15s                │
│ 3 hr ago   │ Scheduled   │ ❌ Failed    │ 5m 02s                 │
│ 6 hr ago   │ Scheduled   │ ✅ Success   │ 19m 47s                │
└────────────┴─────────────┴──────────────┴────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  SIZE TRENDS (Last 30 Days)                                      │
│                                                                  │
│  500 GB │                                              ╱         │
│         │                                          ╱╱            │
│  400 GB │                                    ╱╱╱╱                │
│         │                            ╱╱╱╱╱╱╱                     │
│  300 GB │                    ╱╱╱╱╱╱╱                             │
│         │          ╱╱╱╱╱╱╱╱╱╱                                    │
│  200 GB │  ╱╱╱╱╱╱╱╱                                              │
│         └────────────────────────────────────────────────        │
│          Jan 1    Jan 8    Jan 15   Jan 22   Jan 29            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  UPCOMING SCHEDULES                                              │
├──────────────────┬──────────────────┬─────────────────────────────┤
│ Schedule         │ Next Run         │ Frequency                  │
├──────────────────┼──────────────────┼─────────────────────────────┤
│ Daily Full       │ In 45 minutes    │ Daily at 2:00 AM           │
│ Hourly Legal     │ In 12 minutes    │ Every hour                 │
│ Weekly Complete  │ In 2 days        │ Sunday at 3:00 AM          │
└──────────────────┴──────────────────┴─────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  QUICK ACTIONS                                                   │
│  [Create Manual Backup] [View Schedules] [Restore Wizard]       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. Cost Estimation

```
┌─────────────────────────────────────────────────────────────────┐
│                          COST BREAKDOWN                          │
└─────────────────────────────────────────────────────────────────┘

AWS S3 Storage Costs (500 GB total backups):
├── S3 Standard (hot backups, 7 days): 100 GB × $0.023/GB = $2.30/month
├── S3 Intelligent-Tiering (30 days): 200 GB × $0.015/GB = $3.00/month
├── S3 Glacier Instant Retrieval (90 days): 200 GB × $0.004/GB = $0.80/month
└── Total Storage: $6.10/month

Data Transfer Costs:
├── Upload to S3 (free)
├── Download from S3 (rare): ~1 GB/month × $0.09/GB = $0.09/month
└── Total Transfer: $0.09/month

Redis Costs (BullMQ Queue):
├── Render Redis (1 GB): $10/month
└── Total Redis: $10/month

Compute Costs (Render Cloud):
├── Existing server (no additional cost)
└── Total Compute: $0/month

Monitoring & Alerting:
├── CloudWatch Metrics: ~$5/month
├── Slack notifications: Free
├── Email notifications: Free (via existing provider)
└── Total Monitoring: $5/month

┌─────────────────────────────────────────────────────────────────┐
│  TOTAL MONTHLY COST: ~$21/month                                 │
│  Annual Cost: ~$252/year                                        │
│                                                                 │
│  Cost per backup: ~$0.70 (assuming 30 backups/month)           │
│  Cost per GB stored: ~$0.012/GB/month (blended rate)           │
└─────────────────────────────────────────────────────────────────┘

Cost Optimization Strategies:
1. Use S3 Lifecycle policies to auto-tier old backups
2. Enable compression (saves 60% storage)
3. Implement deduplication for incremental backups
4. Use spot instances for backup workers (future)
5. Regional S3 buckets to minimize transfer costs

ROI Analysis:
├── Cost of data loss incident: $10,000 - $100,000+
├── Annual backup system cost: $252
├── ROI: 3,900% - 39,000%
└── Payback period: Immediate (prevents single incident)
```

---

## 11. Testing Strategy

```typescript
// ============================================================================
// COMPREHENSIVE TESTING PLAN
// ============================================================================

/**
 * UNIT TESTS
 */
describe('BackupService', () => {
  it('should create backup schedule');
  it('should generate correct cron expression');
  it('should validate backup configuration');
  it('should calculate next run time correctly');
  it('should handle timezone conversions');
});

describe('BackupQueueService', () => {
  it('should add job to queue');
  it('should process backup job');
  it('should handle job failures with retry');
  it('should respect priority ordering');
  it('should limit concurrent jobs');
});

describe('EncryptionService', () => {
  it('should encrypt file successfully');
  it('should decrypt file successfully');
  it('should verify data integrity');
  it('should handle large files');
});

/**
 * INTEGRATION TESTS
 */
describe('Backup E2E', () => {
  it('should create full database backup', async () => {
    // 1. Seed test data
    // 2. Trigger backup
    // 3. Wait for completion
    // 4. Verify S3 upload
    // 5. Validate metadata
  });

  it('should create selective table backup');
  it('should compress backup file');
  it('should encrypt backup file');
  it('should restore from backup');
  it('should validate backup integrity');
});

/**
 * LOAD TESTS
 */
describe('Performance Tests', () => {
  it('should handle 10 concurrent backup requests');
  it('should backup 10 GB database in < 30 minutes');
  it('should process 100 backups per day');
  it('should restore 5 GB backup in < 15 minutes');
});

/**
 * DISASTER RECOVERY DRILLS
 */
describe('DR Tests', () => {
  it('should recover from database corruption');
  it('should recover from accidental deletion');
  it('should recover from complete data center failure');
  it('should detect and prevent ransomware');
});

/**
 * SECURITY TESTS
 */
describe('Security Tests', () => {
  it('should prevent unauthorized backup creation');
  it('should prevent unauthorized restore');
  it('should encrypt all backups at rest');
  it('should validate backup integrity');
  it('should log all backup operations');
});
```

---

## 12. Documentation & Training

### User Documentation Structure

```
📚 BACKUP SYSTEM DOCUMENTATION

1. ADMIN GUIDE
   ├── Getting Started
   ├── Creating Backup Schedules
   ├── Manual Backups
   ├── Monitoring Backup Health
   └── Troubleshooting

2. DEVELOPER GUIDE
   ├── Architecture Overview
   ├── API Reference
   ├── Queue System
   ├── Extending Backup Types
   └── Testing

3. OPERATOR GUIDE (RUNBOOKS)
   ├── Daily Operations Checklist
   ├── Weekly Maintenance Tasks
   ├── Emergency Restore Procedures
   ├── Performance Tuning
   └── Capacity Planning

4. SECURITY GUIDE
   ├── Access Control Setup
   ├── Encryption Configuration
   ├── Compliance Requirements
   ├── Audit Procedures
   └── Incident Response

5. DISASTER RECOVERY GUIDE
   ├── Recovery Scenarios
   ├── RTO/RPO Guidelines
   ├── Testing Procedures
   ├── Escalation Paths
   └── Post-Incident Review
```

---

## Summary

This production-ready backup management system provides:

✅ **Comprehensive Coverage**: Full and selective backup capabilities
✅ **Automation**: Scheduled backups with flexible cron expressions
✅ **Security**: AES-256 encryption, access control, audit logging
✅ **Reliability**: BullMQ job queue with retries and failure handling
✅ **Scalability**: Handles databases from 1 GB to 100+ GB
✅ **Monitoring**: Real-time health checks and alerting
✅ **Disaster Recovery**: 2-hour RTO, 15-minute RPO
✅ **Cost-Effective**: ~$21/month for complete solution
✅ **Compliance-Ready**: GDPR, SOC 2, HIPAA support

**Next Steps**:
1. Review architecture with team
2. Provision AWS resources (S3 bucket, KMS key)
3. Implement database schema
4. Build core services (backup, queue, encryption)
5. Create API endpoints
6. Develop admin dashboard
7. Deploy and test
8. Train team on operations

This system eliminates data loss risks and provides enterprise-grade backup capabilities for your Legal RAG application.
