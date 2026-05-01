/**
 * Database Export Service
 *
 * Handles PostgreSQL database exports for backups
 * Supports: Full, Incremental, Differential, Schema-Only, Data-Only backups
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import { createWriteStream } from 'fs';
import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  BackupType,
  ExportConfig,
  ExportResult,
  BackupError
} from '../../types/backup.types';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

export class DatabaseExportService {
  private prisma: PrismaClient;
  private databaseUrl: string;
  private tempDir: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.databaseUrl = process.env.DATABASE_URL!;
    this.tempDir = process.env.BACKUP_TEMP_DIR || '/tmp/backups';

    if (!this.databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
  }

  /**
   * Export database based on backup type
   */
  async exportDatabase(config: ExportConfig): Promise<ExportResult> {
    try {
      logger.info('Starting database export', { config });

      let exportData: Buffer;
      let tableCount = 0;
      let recordCount = BigInt(0);

      switch (config.type) {
        case BackupType.FULL:
          ({ data: exportData, tableCount, recordCount } = await this.exportFull(config));
          break;

        case BackupType.SCHEMA_ONLY:
          ({ data: exportData, tableCount, recordCount } = await this.exportSchemaOnly(config));
          break;

        case BackupType.DATA_ONLY:
          ({ data: exportData, tableCount, recordCount } = await this.exportDataOnly(config));
          break;

        case BackupType.INCREMENTAL:
          ({ data: exportData, tableCount, recordCount } = await this.exportIncremental(config));
          break;

        case BackupType.DIFFERENTIAL:
          ({ data: exportData, tableCount, recordCount } = await this.exportDifferential(config));
          break;

        default:
          throw new Error(`Unsupported backup type: ${config.type}`);
      }

      // Get database metadata
      const metadata = await this.getDatabaseMetadata();

      // Get table names for the result
      const tableNames = await this.getTableList(config.includeTables, config.excludeTables);

      const result: ExportResult = {
        data: exportData,
        size: BigInt(exportData.length),
        tableCount,
        tableNames,
        recordCount,
        databaseName: metadata.databaseName,
        databaseVersion: metadata.databaseVersion,
        schemaVersion: metadata.schemaVersion
      };

      logger.info('Database export completed', {
        type: config.type,
        size: result.size.toString(),
        tableCount,
        recordCount: recordCount.toString()
      });

      return result;
    } catch (error) {
      logger.error('Database export failed', { error, config });
      throw new BackupError(
        `Database export failed: ${(error as Error).message}`,
        'EXPORT_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Full database export (schema + data)
   */
  private async exportFull(config: ExportConfig): Promise<{
    data: Buffer;
    tableCount: number;
    recordCount: bigint;
  }> {
    const tempFile = this.getTempFilePath();

    try {
      // Build pg_dump command
      const command = this.buildPgDumpCommand({
        format: 'custom',
        schemaOnly: false,
        dataOnly: false,
        includeTables: config.includeTables,
        excludeTables: config.excludeTables,
        outputFile: tempFile
      });

      // Execute pg_dump
      await execAsync(command);

      // Read the dump file
      const data = await readFile(tempFile);

      // Get table and record counts
      const { tableCount, recordCount } = await this.getExportStats(config);

      return { data, tableCount, recordCount };
    } finally {
      // Clean up temp file
      try {
        await unlink(tempFile);
      } catch (error) {
        logger.warn('Failed to delete temp file', { tempFile, error });
      }
    }
  }

  /**
   * Schema-only export (no data)
   */
  private async exportSchemaOnly(config: ExportConfig): Promise<{
    data: Buffer;
    tableCount: number;
    recordCount: bigint;
  }> {
    const tempFile = this.getTempFilePath();

    try {
      const command = this.buildPgDumpCommand({
        format: 'custom',
        schemaOnly: true,
        dataOnly: false,
        includeTables: config.includeTables,
        excludeTables: config.excludeTables,
        outputFile: tempFile
      });

      await execAsync(command);
      const data = await readFile(tempFile);

      // Get table count (no records for schema-only)
      const { tableCount } = await this.getExportStats(config);

      return { data, tableCount, recordCount: BigInt(0) };
    } finally {
      try {
        await unlink(tempFile);
      } catch (error) {
        logger.warn('Failed to delete temp file', { tempFile, error });
      }
    }
  }

  /**
   * Data-only export (no schema)
   */
  private async exportDataOnly(config: ExportConfig): Promise<{
    data: Buffer;
    tableCount: number;
    recordCount: bigint;
  }> {
    const tempFile = this.getTempFilePath();

    try {
      const command = this.buildPgDumpCommand({
        format: 'custom',
        schemaOnly: false,
        dataOnly: true,
        includeTables: config.includeTables,
        excludeTables: config.excludeTables,
        outputFile: tempFile
      });

      await execAsync(command);
      const data = await readFile(tempFile);

      const { tableCount, recordCount } = await this.getExportStats(config);

      return { data, tableCount, recordCount };
    } finally {
      try {
        await unlink(tempFile);
      } catch (error) {
        logger.warn('Failed to delete temp file', { tempFile, error });
      }
    }
  }

  /**
   * Incremental export (changes since last backup)
   */
  private async exportIncremental(config: ExportConfig): Promise<{
    data: Buffer;
    tableCount: number;
    recordCount: bigint;
  }> {
    // For incremental backups, we need to track changes since the last backup
    // This is a simplified implementation - in production, you'd use WAL archiving
    // or track changes with timestamps

    const lastBackup = await this.getLastSuccessfulBackup();
    const lastBackupTime = lastBackup?.completedAt || new Date(0);

    logger.info('Performing incremental backup', {
      lastBackupTime,
      lastBackupId: lastBackup?.id
    });

    // Get tables with updated_at or similar timestamp columns
    const changedData = await this.getChangedRecordsSince(
      lastBackupTime,
      config.includeTables,
      config.excludeTables
    );

    // Export changed data as JSON
    const data = Buffer.from(JSON.stringify({
      type: 'incremental',
      baseBackupId: lastBackup?.id,
      baseBackupTime: lastBackupTime,
      changes: changedData,
      exportedAt: new Date()
    }, null, 2));

    const tableCount = Object.keys(changedData).length;
    const recordCount = Object.values(changedData).reduce(
      (sum, records: any) => sum + BigInt(records.length),
      BigInt(0)
    );

    return { data, tableCount, recordCount };
  }

  /**
   * Differential export (changes since last full backup)
   */
  private async exportDifferential(config: ExportConfig): Promise<{
    data: Buffer;
    tableCount: number;
    recordCount: bigint;
  }> {
    // Similar to incremental, but compares against last FULL backup
    const lastFullBackup = await this.getLastFullBackup();
    const lastBackupTime = lastFullBackup?.completedAt || new Date(0);

    logger.info('Performing differential backup', {
      lastBackupTime,
      lastFullBackupId: lastFullBackup?.id
    });

    const changedData = await this.getChangedRecordsSince(
      lastBackupTime,
      config.includeTables,
      config.excludeTables
    );

    const data = Buffer.from(JSON.stringify({
      type: 'differential',
      baseBackupId: lastFullBackup?.id,
      baseBackupTime: lastBackupTime,
      changes: changedData,
      exportedAt: new Date()
    }, null, 2));

    const tableCount = Object.keys(changedData).length;
    const recordCount = Object.values(changedData).reduce(
      (sum, records: any) => sum + BigInt(records.length),
      BigInt(0)
    );

    return { data, tableCount, recordCount };
  }

  /**
   * Build pg_dump command
   */
  private buildPgDumpCommand(options: {
    format: 'custom' | 'plain' | 'directory';
    schemaOnly: boolean;
    dataOnly: boolean;
    includeTables?: string[];
    excludeTables?: string[];
    outputFile: string;
  }): string {
    const parts = ['pg_dump'];

    // Database connection
    parts.push(`"${this.databaseUrl}"`);

    // Format
    parts.push(`--format=${options.format}`);

    // Schema/data options
    if (options.schemaOnly) {
      parts.push('--schema-only');
    }
    if (options.dataOnly) {
      parts.push('--data-only');
    }

    // Table filters
    if (options.includeTables && options.includeTables.length > 0) {
      for (const table of options.includeTables) {
        parts.push(`--table="${table}"`);
      }
    }

    if (options.excludeTables && options.excludeTables.length > 0) {
      for (const table of options.excludeTables) {
        parts.push(`--exclude-table="${table}"`);
      }
    }

    // Additional options
    parts.push('--no-owner');
    parts.push('--no-acl');
    parts.push('--verbose');

    // Output file
    parts.push(`--file="${options.outputFile}"`);

    return parts.join(' ');
  }

  /**
   * Get export statistics
   */
  private async getExportStats(config: ExportConfig): Promise<{
    tableCount: number;
    recordCount: bigint;
  }> {
    try {
      // Get list of tables to include
      const tables = await this.getTableList(
        config.includeTables,
        config.excludeTables
      );

      let totalRecords = BigInt(0);

      // Count records in each table
      for (const table of tables) {
        try {
          const result = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
            `SELECT COUNT(*) as count FROM "${table}"`
          );
          if (result[0]) {
            totalRecords += result[0].count;
          }
        } catch (error) {
          logger.warn(`Failed to count records in table ${table}`, { error });
        }
      }

      return {
        tableCount: tables.length,
        recordCount: totalRecords
      };
    } catch (error) {
      logger.error('Failed to get export stats', { error });
      return {
        tableCount: 0,
        recordCount: BigInt(0)
      };
    }
  }

  /**
   * Get list of tables in database
   */
  private async getTableList(
    includeTables?: string[],
    excludeTables?: string[]
  ): Promise<string[]> {
    // Get all tables from information_schema
    const result = await this.prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    let tables = result.map(r => r.tablename);

    // Apply filters
    if (includeTables && includeTables.length > 0) {
      tables = tables.filter(t => includeTables.includes(t));
    }

    if (excludeTables && excludeTables.length > 0) {
      tables = tables.filter(t => !excludeTables.includes(t));
    }

    return tables;
  }

  /**
   * Get changed records since a specific time
   */
  private async getChangedRecordsSince(
    since: Date,
    includeTables?: string[],
    excludeTables?: string[]
  ): Promise<Record<string, any[]>> {
    const tables = await this.getTableList(includeTables, excludeTables);
    const changes: Record<string, any[]> = {};

    for (const table of tables) {
      try {
        // Try to find a timestamp column (updated_at, created_at, etc.)
        const hasUpdatedAt = await this.tableHasColumn(table, 'updated_at');
        const hasCreatedAt = await this.tableHasColumn(table, 'created_at');

        let timestampColumn: string | null = null;
        if (hasUpdatedAt) {
          timestampColumn = 'updated_at';
        } else if (hasCreatedAt) {
          timestampColumn = 'created_at';
        }

        if (timestampColumn) {
          // Query records changed since the specified time
          const records = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM "${table}" WHERE "${timestampColumn}" > $1`,
            since
          );

          if (Array.isArray(records) && records.length > 0) {
            changes[table] = records;
            logger.info(`Found ${records.length} changed records in ${table}`);
          }
        } else {
          logger.warn(`Table ${table} has no timestamp column, skipping for incremental backup`);
        }
      } catch (error) {
        logger.error(`Failed to get changed records from ${table}`, { error });
      }
    }

    return changes;
  }

  /**
   * Check if table has a specific column
   */
  private async tableHasColumn(table: string, column: string): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = ${table}
            AND column_name = ${column}
        ) as exists
      `;
      return result[0]?.exists || false;
    } catch (error) {
      logger.error('Failed to check column existence', { table, column, error });
      return false;
    }
  }

  /**
   * Get database metadata
   */
  private async getDatabaseMetadata(): Promise<{
    databaseName: string;
    databaseVersion: string;
    schemaVersion: string;
  }> {
    try {
      // Get database name from connection URL
      const urlMatch = this.databaseUrl.match(/\/([^/?]+)(\?|$)/);
      const databaseName = urlMatch ? urlMatch[1] : 'unknown';

      // Get PostgreSQL version
      const versionResult = await this.prisma.$queryRaw<{ version: string }[]>`
        SELECT version()
      `;
      const databaseVersion = versionResult[0]?.version || 'unknown';

      // Get schema version (from migrations)
      const migrationResult = await this.prisma.$queryRaw<{ migration_name: string }[]>`
        SELECT migration_name
        FROM "_prisma_migrations"
        ORDER BY finished_at DESC
        LIMIT 1
      `;
      const schemaVersion = migrationResult[0]?.migration_name || 'unknown';

      return {
        databaseName,
        databaseVersion,
        schemaVersion
      };
    } catch (error) {
      logger.error('Failed to get database metadata', { error });
      return {
        databaseName: 'unknown',
        databaseVersion: 'unknown',
        schemaVersion: 'unknown'
      };
    }
  }

  /**
   * Get last successful backup
   */
  private async getLastSuccessfulBackup(): Promise<any> {
    return await this.prisma.backup.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' }
    });
  }

  /**
   * Get last successful full backup
   */
  private async getLastFullBackup(): Promise<any> {
    return await this.prisma.backup.findFirst({
      where: {
        status: 'COMPLETED',
        type: 'FULL'
      },
      orderBy: { completedAt: 'desc' }
    });
  }

  /**
   * Generate temporary file path
   */
  private getTempFilePath(): string {
    const randomId = randomBytes(16).toString('hex');
    return `${this.tempDir}/backup-${randomId}.dump`;
  }

  /**
   * Validate pg_dump is available
   */
  async validatePgDumpAvailable(): Promise<boolean> {
    try {
      await execAsync('pg_dump --version');
      return true;
    } catch (error) {
      logger.error('pg_dump is not available', { error });
      return false;
    }
  }

  /**
   * Get database size
   */
  async getDatabaseSize(): Promise<bigint> {
    try {
      const result = await this.prisma.$queryRaw<{ size: bigint }[]>`
        SELECT pg_database_size(current_database()) as size
      `;
      return result[0]?.size || BigInt(0);
    } catch (error) {
      logger.error('Failed to get database size', { error });
      return BigInt(0);
    }
  }
}
