# Database Backup System - Complete Architecture

## Executive Summary

A production-ready, enterprise-grade database backup and restore system built with TypeScript, Fastify, PostgreSQL (Prisma), BullMQ, Redis, and AWS S3. The system provides automated scheduled backups, point-in-time recovery, compression, encryption, and comprehensive audit logging.

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Admin[Admin Dashboard]
        API[REST API Client]
        Webhook[Webhook Receivers]
    end

    subgraph "API Gateway"
        Fastify[Fastify Server]
        Auth[Auth Middleware]
        RateLimit[Rate Limiter]
    end

    subgraph "Service Layer"
        BS[Backup Service]
        RS[Restore Service]
        SS[Scheduler Service]
        NS[Notification Service]
    end

    subgraph "Queue Layer"
        BullMQ[BullMQ Queues]
        Redis[(Redis)]
        Workers[Queue Workers]
    end

    subgraph "Storage Layer"
        S3[AWS S3]
        PostgreSQL[(PostgreSQL)]
        Encryption[Encryption Keys]
    end

    Admin --> Fastify
    API --> Fastify
    Fastify --> Auth
    Auth --> RateLimit
    RateLimit --> BS
    RateLimit --> RS
    RateLimit --> SS

    BS --> BullMQ
    RS --> BullMQ
    SS --> BullMQ
    BullMQ --> Redis
    Workers --> Redis

    BS --> S3
    RS --> S3
    BS --> PostgreSQL
    RS --> PostgreSQL
    SS --> PostgreSQL

    NS --> Webhook
    Workers --> NS

    BS --> Encryption
    RS --> Encryption
```

## Core Components

### 1. **BackupService** (`src/services/backup/backup.service.ts`)
```typescript
class BackupService {
  // Core backup operations
  async createBackup(config: BackupConfig): Promise<Backup>
  async processBackupJob(jobData: BackupJobData): Promise<void>
  async getBackupById(id: string): Promise<Backup>
  async listBackups(filters: BackupFilters): Promise<Backup[]>
  async deleteBackup(id: string): Promise<void>
  async getBackupStats(): Promise<BackupStats>
}
```

**Key Features:**
- Supports multiple backup types (FULL, INCREMENTAL, DIFFERENTIAL, SCHEMA_ONLY, DATA_ONLY)
- Automatic compression with multiple algorithms (GZIP, BROTLI, LZ4)
- AES-256-GCM encryption with key rotation
- Progress tracking and webhooks
- Streaming for large databases

### 2. **RestoreService** (`src/services/backup/restore.service.ts`)
```typescript
class RestoreService {
  // Core restore operations
  async restoreBackup(backupId: string, options: RestoreOptions): Promise<RestoreJob>
  async validateBackup(backupId: string): Promise<ValidationResult>
  async previewBackup(backupId: string): Promise<BackupPreview>
  async getRestoreStatus(jobId: string): Promise<RestoreJob>
}
```

**Key Features:**
- Point-in-time recovery
- Selective table restoration
- Dry-run mode for validation
- Integrity verification
- Progress tracking with step-by-step status

### 3. **BackupSchedulerService** (`src/services/backup/backup-scheduler.service.ts`)
```typescript
class BackupSchedulerService {
  // Scheduling operations
  async createSchedule(input: ScheduleCreateInput): Promise<BackupSchedule>
  async updateSchedule(id: string, updates: Partial<ScheduleCreateInput>): Promise<BackupSchedule>
  async toggleSchedule(id: string, enabled: boolean): Promise<BackupSchedule>
  async executeSchedule(id: string): Promise<void>
  async deleteSchedule(id: string): Promise<void>
}
```

**Key Features:**
- Cron-based scheduling with timezone support
- Retention policies (days and count based)
- Automatic cleanup of old backups
- Manual execution option
- Failure tracking and notifications

### 4. **BackupStorageService** (`src/services/backup/backup-storage.service.ts`)
```typescript
class BackupStorageService {
  // S3 operations
  async uploadToS3(backup: Buffer, metadata: BackupMetadata): Promise<S3Location>
  async downloadFromS3(location: S3Location): Promise<Buffer>
  async deleteFromS3(location: S3Location): Promise<void>
  async getStorageUsage(): Promise<StorageStats>
  async streamDownload(location: S3Location, onChunk: Function): Promise<void>
}
```

**Key Features:**
- Multipart upload for large files (>100MB)
- Server-side encryption (AES-256)
- Storage class optimization (STANDARD vs STANDARD_IA)
- Streaming download with progress
- Cost estimation

### 5. **BackupCompressionService** (`src/services/backup/backup-compression.service.ts`)
```typescript
class BackupCompressionService {
  async compress(data: Buffer, type: CompressionType): Promise<CompressedData>
  async decompress(data: Buffer, type: CompressionType): Promise<Buffer>
  estimateCompressionRatio(size: number, type: CompressionType): number
}
```

**Compression Algorithms:**
- **GZIP**: Best compatibility, good compression ratio
- **BROTLI**: Best compression ratio, slower
- **LZ4**: Fastest, lower compression ratio

### 6. **Queue System (BullMQ)**

**Queues:**
```typescript
// Backup Creation Queue
Queue<BackupJobData> {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 100 }
}

// Restore Queue
Queue<RestoreJobData> {
  attempts: 3,
  backoff: { type: 'exponential', delay: 10000 },
  removeOnComplete: { count: 50 }
}

// Cleanup Queue
Queue<CleanupJobData> {
  attempts: 2,
  backoff: { type: 'fixed', delay: 60000 }
}
```

## Database Schema (Prisma)

```prisma
model Backup {
  id               String    @id @default(cuid())
  name             String
  type             String    // BackupType enum
  status           String    // BackupStatus enum
  size             BigInt
  compressedSize   BigInt
  compressionType  String
  encrypted        Boolean
  s3Location       Json
  checksum         String
  tableCount       Int
  recordCount      BigInt
  createdAt        DateTime
  completedAt      DateTime?
  expiresAt        DateTime?

  // Relations
  createdBy        User
  schedule         BackupSchedule?
  restoreJobs      RestoreJob[]
  auditLogs        BackupAuditLog[]
}

model BackupSchedule {
  id               String    @id @default(cuid())
  name             String
  cronExpression   String
  timezone         String
  enabled          Boolean
  backupConfig     Json
  retentionDays    Int
  maxRetainedBackups Int
  lastRunAt        DateTime?
  nextRunAt        DateTime?

  // Relations
  createdBy        User
  backups          Backup[]
}

model RestoreJob {
  id               String    @id @default(cuid())
  status           String    // RestoreStatus enum
  options          Json
  progress         Float
  currentStep      String?
  restoredTables   Int
  restoredRecords  BigInt
  error            String?

  // Relations
  backup           Backup
  initiatedBy      User
}

model BackupAuditLog {
  id               String    @id @default(cuid())
  action           String    // BackupAction enum
  metadata         Json
  createdAt        DateTime

  // Relations
  backup           Backup?
  schedule         BackupSchedule?
  restoreJob       RestoreJob?
  user             User
}
```

## API Endpoints

### Backup Operations
```yaml
POST   /api/v1/admin/backups/create
  Body: { type, compression?, encryption?, includeTables?, excludeTables? }
  Response: { backup: Backup }

GET    /api/v1/admin/backups
  Query: { status?, type?, createdAfter?, createdBefore?, limit?, offset? }
  Response: { backups: Backup[] }

GET    /api/v1/admin/backups/:id
  Response: { backup: Backup }

DELETE /api/v1/admin/backups/:id
  Response: { success: true }

GET    /api/v1/admin/backups/stats
  Response: { stats: BackupStats }
```

### Restore Operations
```yaml
POST   /api/v1/admin/backups/:id/restore
  Body: { targetDatabase?, overwrite, tablesToRestore?, validateIntegrity, dryRun }
  Response: { restoreJob: RestoreJob }

GET    /api/v1/admin/backups/:id/preview
  Response: { preview: BackupPreview }

GET    /api/v1/admin/backups/jobs/:id/status
  Response: { job: RestoreJob }

POST   /api/v1/admin/backups/:id/validate
  Response: { validation: ValidationResult }
```

### Schedule Operations
```yaml
POST   /api/v1/admin/backups/schedule
  Body: { name, cronExpression, backupConfig, retentionDays? }
  Response: { schedule: BackupSchedule }

GET    /api/v1/admin/backups/schedules
  Response: { schedules: BackupSchedule[] }

PUT    /api/v1/admin/backups/schedules/:id
  Body: { ...updates }
  Response: { schedule: BackupSchedule }

DELETE /api/v1/admin/backups/schedules/:id
  Response: { success: true }

POST   /api/v1/admin/backups/schedules/:id/toggle
  Body: { enabled: boolean }
  Response: { schedule: BackupSchedule }

POST   /api/v1/admin/backups/schedules/:id/execute
  Response: { message: "Schedule executed manually" }
```

## Security Implementation

### 1. **Authentication & Authorization**
- Admin-only endpoints with role-based access control
- JWT token validation
- IP whitelisting for sensitive operations

### 2. **Encryption**
- AES-256-GCM for backup encryption
- Key rotation support
- Encrypted key storage with master key
- TLS for all S3 transfers

### 3. **Rate Limiting**
```typescript
// Backup creation: 10 requests per hour
// Restore operations: 5 requests per hour
// Schedule operations: 20 requests per hour
```

### 4. **Audit Logging**
- All operations logged with user, timestamp, and metadata
- Immutable audit trail
- Webhook notifications for critical events

## Performance Optimizations

### 1. **Streaming Operations**
- Large file streaming to prevent memory overflow
- Chunked processing for databases > 1GB
- Multipart uploads for files > 100MB

### 2. **Compression Strategy**
```typescript
// Automatic selection based on data type:
if (dataType === 'TEXT_HEAVY') return 'BROTLI';
if (realTimeRequired) return 'LZ4';
return 'GZIP'; // Default balanced option
```

### 3. **Queue Optimization**
- Priority queues for critical restores
- Concurrent workers (4 for backup, 2 for restore)
- Dead letter queue for failed jobs

### 4. **S3 Storage Classes**
- STANDARD for recent backups (< 7 days)
- STANDARD_IA for older backups
- Lifecycle policies for automatic transitions

## Monitoring & Observability

### 1. **Metrics**
```typescript
// Key metrics tracked:
- Backup success/failure rate
- Average backup duration
- Storage usage and growth
- Compression ratios
- Restore success rate
- Queue depth and processing time
```

### 2. **Alerts**
- Backup failure after retries
- Storage quota exceeded (80% threshold)
- Scheduled backup missed
- Restore job stuck
- Encryption key rotation due

### 3. **Webhooks**
```typescript
enum BackupWebhookEvent {
  BACKUP_STARTED = 'backup.started',
  BACKUP_PROGRESS = 'backup.progress',
  BACKUP_COMPLETED = 'backup.completed',
  BACKUP_FAILED = 'backup.failed',
  RESTORE_STARTED = 'restore.started',
  RESTORE_COMPLETED = 'restore.completed',
  RESTORE_FAILED = 'restore.failed'
}
```

## Deployment Considerations

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secret

# AWS S3
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
BACKUP_S3_BUCKET=my-backup-bucket

# Encryption
BACKUP_MASTER_KEY=32-byte-base64-encoded-key
BACKUP_ENCRYPTION_ALGORITHM=AES-256-GCM

# Notification
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Infrastructure Requirements
- **PostgreSQL**: v13+ with pg_dump and pg_restore utilities
- **Redis**: v6+ for queue management (2GB recommended)
- **S3**: Versioning enabled, lifecycle policies configured
- **Compute**: 2+ CPU cores, 4GB+ RAM for workers

### Scaling Considerations
1. **Horizontal Scaling**: Multiple worker instances for queue processing
2. **Storage Scaling**: S3 handles unlimited storage automatically
3. **Database Connections**: Connection pooling with 20 connections per worker
4. **Queue Scaling**: Redis cluster for high-throughput environments

## Technology Choices & Rationale

| Technology | Choice | Rationale |
|------------|--------|-----------|
| **Framework** | Fastify | High performance, schema validation, TypeScript support |
| **ORM** | Prisma | Type safety, migrations, excellent DX |
| **Queue** | BullMQ | Robust job processing, Redis-based, good monitoring |
| **Storage** | AWS S3 | Unlimited capacity, versioning, lifecycle management |
| **Compression** | Multiple | Flexibility for different use cases |
| **Encryption** | AES-256-GCM | Industry standard, authenticated encryption |
| **Scheduler** | node-cron | Simple, reliable, timezone support |

## Potential Bottlenecks & Mitigations

### 1. **Large Database Exports**
- **Issue**: Memory overflow on databases > 10GB
- **Mitigation**: Streaming exports, table-by-table processing

### 2. **S3 Upload Speed**
- **Issue**: Slow uploads for large files
- **Mitigation**: Multipart uploads, parallel chunk processing

### 3. **Restore Time**
- **Issue**: Long restore times for large backups
- **Mitigation**: Parallel table restoration, index creation deferral

### 4. **Queue Congestion**
- **Issue**: Too many backup jobs at once
- **Mitigation**: Priority queues, rate limiting, scheduled distribution

### 5. **Storage Costs**
- **Issue**: Growing S3 costs over time
- **Mitigation**: Lifecycle policies, compression, intelligent tiering

## Example Usage

### Creating a Full Backup
```typescript
const backup = await backupService.createBackup({
  type: BackupType.FULL,
  compression: CompressionType.GZIP,
  encryption: true,
  metadata: {
    reason: 'Pre-deployment backup',
    version: '1.2.3'
  },
  webhookUrl: 'https://example.com/webhook'
}, userId);
```

### Scheduling Daily Backups
```typescript
const schedule = await schedulerService.createSchedule({
  name: 'Daily Incremental',
  cronExpression: '0 2 * * *', // 2 AM daily
  timezone: 'America/New_York',
  backupConfig: {
    type: BackupType.INCREMENTAL,
    compression: CompressionType.GZIP,
    encryption: true
  },
  retentionDays: 30,
  maxRetainedBackups: 10
}, userId);
```

### Restoring with Validation
```typescript
const restoreJob = await restoreService.restoreBackup(
  backupId,
  {
    targetDatabase: 'staging_db',
    overwrite: false,
    tablesToRestore: ['users', 'documents', 'metadata'],
    validateIntegrity: true,
    dryRun: true // Test first
  },
  userId
);
```

## Conclusion

This backup system provides enterprise-grade reliability with:
- ✅ Automated scheduled backups
- ✅ Point-in-time recovery
- ✅ Compression and encryption
- ✅ Progress tracking and notifications
- ✅ Comprehensive audit logging
- ✅ Scalable architecture
- ✅ Cost optimization features
- ✅ Production-ready security

The modular design allows for easy extension and customization while maintaining high performance and reliability standards suitable for production environments.