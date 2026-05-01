/**
 * Database Import Service
 * Handles importing data from backup files into the database
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { BackupCompressionService } from './backup-compression.service';
import { BackupEncryptionService } from './backup-encryption.service';
import { CompressionType } from '../../types/backup.types';

export interface ImportOptions {
  backupPath: string;
  targetTables?: string[];
  skipExisting?: boolean;
  validateIntegrity?: boolean;
  dryRun?: boolean;
}

export interface ImportResult {
  success: boolean;
  tablesImported: string[];
  recordsImported: number;
  errors: string[];
  duration: number;
}

export class DatabaseImportService {
  private compressionService: BackupCompressionService;
  private encryptionService: BackupEncryptionService;

  constructor(prismaClient?: PrismaClient) {
    this.compressionService = new BackupCompressionService();
    this.encryptionService = new BackupEncryptionService(prismaClient || prisma);
  }

  /**
   * Import data from a backup file
   */
  async importFromBackup(options: ImportOptions): Promise<ImportResult> {
    const startTime = Date.now();
    const result: ImportResult = {
      success: false,
      tablesImported: [],
      recordsImported: 0,
      errors: [],
      duration: 0
    };

    try {
      // Validate backup file exists
      if (!fs.existsSync(options.backupPath)) {
        throw new Error(`Backup file not found: ${options.backupPath}`);
      }

      // Read and decompress backup data
      let backupData = await this.readBackupFile(options.backupPath);

      // Parse backup JSON
      const backup = JSON.parse(backupData);

      if (options.dryRun) {
        console.log('Dry run mode - no changes will be made');
        result.success = true;
        result.tablesImported = Object.keys(backup.data || {});
        result.duration = Date.now() - startTime;
        return result;
      }

      // Import tables
      const tables = options.targetTables || Object.keys(backup.data || {});

      for (const table of tables) {
        try {
          const records = backup.data[table];
          if (!records || !Array.isArray(records)) continue;

          const imported = await this.importTable(table, records, options.skipExisting);
          result.tablesImported.push(table);
          result.recordsImported += imported;
        } catch (error: any) {
          result.errors.push(`Error importing ${table}: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      return result;
    } catch (error: any) {
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Read and decompress backup file
   */
  private async readBackupFile(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();
    const buffer = fs.readFileSync(filePath);

    // Check if encrypted (has .enc extension or encrypted header)
    if (filePath.includes('.enc')) {
      // Read the encryption metadata file alongside the backup
      const metaPath = filePath.replace('.enc', '.meta.json');
      if (!fs.existsSync(metaPath)) {
        throw new Error('Encrypted backup requires metadata file with encryption parameters');
      }

      const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const decrypted = await this.encryptionService.decrypt({
        data: buffer,
        keyId: metaData.keyId,
        iv: metaData.iv,
        authTag: metaData.authTag,
        salt: metaData.salt
      });
      return this.decompressIfNeeded(decrypted, filePath);
    }

    // Check if compressed
    if (['.gz', '.gzip', '.br', '.lz4'].includes(ext)) {
      return this.decompressIfNeeded(buffer, filePath);
    }

    return buffer.toString('utf8');
  }

  /**
   * Decompress buffer based on file extension
   */
  private async decompressIfNeeded(buffer: Buffer, filePath: string): Promise<string> {
    const ext = path.extname(filePath.replace('.enc', '')).toLowerCase();

    if (ext === '.gz' || ext === '.gzip') {
      const decompressed = await this.compressionService.decompress(buffer, CompressionType.GZIP);
      return decompressed.toString('utf8');
    }

    if (ext === '.br') {
      const decompressed = await this.compressionService.decompress(buffer, CompressionType.BROTLI);
      return decompressed.toString('utf8');
    }

    if (ext === '.lz4') {
      const decompressed = await this.compressionService.decompress(buffer, CompressionType.LZ4);
      return decompressed.toString('utf8');
    }

    return buffer.toString('utf8');
  }

  /**
   * Import records into a specific table
   */
  private async importTable(
    table: string,
    records: any[],
    skipExisting: boolean = false
  ): Promise<number> {
    let imported = 0;

    // Map table names to Prisma model names
    const modelMap: Record<string, string> = {
      'users': 'user',
      'legal_documents': 'legalDocument',
      'legal_document_chunks': 'legalDocumentChunk',
      'backups': 'backup',
      'backup_schedules': 'backupSchedule'
    };

    const modelName = modelMap[table] || table;
    const model = (prisma as any)[modelName];

    if (!model) {
      throw new Error(`Unknown table/model: ${table}`);
    }

    for (const record of records) {
      try {
        if (skipExisting && record.id) {
          // Use upsert to skip existing records
          await model.upsert({
            where: { id: record.id },
            create: record,
            update: {}
          });
        } else {
          await model.create({ data: record });
        }
        imported++;
      } catch (error: any) {
        // Skip duplicate key errors if skipExisting is true
        if (skipExisting && error.code === 'P2002') {
          continue;
        }
        throw error;
      }
    }

    return imported;
  }

  /**
   * Validates a file's checksum against an expected value
   * @param filePath - Path to the file to validate
   * @param expectedChecksum - Expected SHA-256 checksum
   * @returns true if valid, throws error if mismatch
   */
  private async validateChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
    const fileBuffer = fs.readFileSync(filePath);
    const actualChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    if (actualChecksum.toLowerCase() !== expectedChecksum.toLowerCase()) {
      throw new Error(
        `Checksum validation failed: expected ${expectedChecksum}, got ${actualChecksum}`
      );
    }

    return true;
  }

  /**
   * Generates a SHA-256 checksum for a file
   * @param filePath - Path to the file
   * @returns Hex-encoded checksum string
   */
  private async generateChecksum(filePath: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Validate backup integrity before import
   */
  async validateBackup(backupPath: string): Promise<{
    valid: boolean;
    errors: string[];
    tables: string[];
    totalRecords: number;
  }> {
    const result = {
      valid: false,
      errors: [] as string[],
      tables: [] as string[],
      totalRecords: 0
    };

    try {
      const backupData = await this.readBackupFile(backupPath);
      const backup = JSON.parse(backupData);

      // Validate backup structure
      if (!backup.metadata) {
        result.errors.push('Missing backup metadata');
      }

      if (!backup.data) {
        result.errors.push('Missing backup data');
      }

      // Count tables and records
      result.tables = Object.keys(backup.data || {});
      for (const table of result.tables) {
        const records = backup.data[table];
        if (Array.isArray(records)) {
          result.totalRecords += records.length;
        }
      }

      // Validate checksum if present
      if (backup.metadata?.checksum) {
        try {
          await this.validateChecksum(backupPath, backup.metadata.checksum);
        } catch (error: any) {
          result.errors.push(`Checksum validation failed: ${error.message}`);
        }
      }

      result.valid = result.errors.length === 0;
      return result;
    } catch (error: any) {
      result.errors.push(`Failed to parse backup: ${error.message}`);
      return result;
    }
  }
}

export default DatabaseImportService;
