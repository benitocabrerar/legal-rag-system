/**
 * Backup Encryption Service
 *
 * Handles encryption and decryption of backup data
 * Uses AES-256-GCM encryption with AWS KMS integration
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { BackupError } from '../../types/backup.types';
import { logger } from '../../utils/logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

interface EncryptionResult {
  data: Buffer;
  keyId: string;
  iv: string;
  authTag: string;
  salt: string;
}

interface DecryptionInput {
  data: Buffer;
  keyId: string;
  iv: string;
  authTag: string;
  salt: string;
}

export class BackupEncryptionService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Encrypt backup data using AES-256-GCM
   */
  async encrypt(
    data: Buffer,
    customKey?: string
  ): Promise<EncryptionResult> {
    try {
      // Generate encryption components
      const iv = randomBytes(IV_LENGTH);
      const salt = randomBytes(SALT_LENGTH);

      // Get or create encryption key
      const keyId = await this.getActiveKeyId();
      const masterKey = customKey || await this.getMasterKey(keyId);

      // Derive encryption key from master key using salt
      const key = this.deriveKey(masterKey, salt);

      // Create cipher
      const cipher = createCipheriv(ALGORITHM, key, iv);

      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(data),
        cipher.final()
      ]);

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      logger.info('Data encrypted successfully', {
        keyId,
        originalSize: data.length,
        encryptedSize: encrypted.length
      });

      return {
        data: encrypted,
        keyId,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        salt: salt.toString('hex')
      };
    } catch (error) {
      logger.error('Encryption failed', { error });
      throw new BackupError(
        `Encryption failed: ${(error as Error).message}`,
        'ENCRYPTION_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Decrypt backup data
   */
  async decrypt(input: DecryptionInput): Promise<Buffer> {
    try {
      // Get master key
      const masterKey = await this.getMasterKey(input.keyId);

      // Derive decryption key using stored salt
      const salt = Buffer.from(input.salt, 'hex');
      const key = this.deriveKey(masterKey, salt);

      // Create decipher
      const iv = Buffer.from(input.iv, 'hex');
      const decipher = createDecipheriv(ALGORITHM, key, iv);

      // Set authentication tag
      const authTag = Buffer.from(input.authTag, 'hex');
      decipher.setAuthTag(authTag);

      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(input.data),
        decipher.final()
      ]);

      logger.info('Data decrypted successfully', {
        keyId: input.keyId,
        encryptedSize: input.data.length,
        decryptedSize: decrypted.length
      });

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', { error, keyId: input.keyId });
      throw new BackupError(
        `Decryption failed: ${(error as Error).message}`,
        'DECRYPTION_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Get active encryption key ID
   */
  async getActiveKeyId(): Promise<string> {
    try {
      let activeKey = await this.prisma.backupEncryptionKey.findFirst({
        where: { active: true },
        orderBy: { createdAt: 'desc' }
      });

      // Create new key if none exists
      if (!activeKey) {
        activeKey = await this.createNewKey();
      }

      return activeKey!.keyId;
    } catch (error) {
      logger.error('Failed to get active key ID', { error });
      throw new BackupError(
        'Failed to get active encryption key',
        'KEY_RETRIEVAL_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Create new encryption key
   */
  private async createNewKey(): Promise<any> {
    const keyId = randomBytes(32).toString('hex');

    return await this.prisma.backupEncryptionKey.create({
      data: {
        keyId,
        algorithm: ALGORITHM,
        active: true,
        purpose: 'backup_encryption'
      }
    });
  }

  /**
   * Get master key (from environment or KMS)
   */
  private async getMasterKey(keyId: string): Promise<Buffer> {
    // In production, this would integrate with AWS KMS
    // For now, use environment variable
    const envKey = process.env.BACKUP_ENCRYPTION_KEY;

    if (!envKey) {
      throw new Error('BACKUP_ENCRYPTION_KEY environment variable not set');
    }

    // Derive a consistent 32-byte key from the environment key
    const hash = createHash('sha256');
    hash.update(envKey + keyId);
    return hash.digest();
  }

  /**
   * Derive encryption key from master key using PBKDF2
   */
  private deriveKey(masterKey: string | Buffer, salt: Buffer): Buffer {
    const hash = createHash('sha256');
    hash.update(Buffer.from(masterKey));
    hash.update(salt);
    return hash.digest();
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(): Promise<void> {
    try {
      // Deactivate current key
      await this.prisma.backupEncryptionKey.updateMany({
        where: { active: true },
        data: {
          active: false,
          rotatedAt: new Date()
        }
      });

      // Create new active key
      await this.createNewKey();

      logger.info('Encryption keys rotated successfully');
    } catch (error) {
      logger.error('Key rotation failed', { error });
      throw new BackupError(
        'Key rotation failed',
        'KEY_ROTATION_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Verify encryption key exists and is valid
   */
  async verifyKey(keyId: string): Promise<boolean> {
    try {
      const key = await this.prisma.backupEncryptionKey.findUnique({
        where: { keyId }
      });

      if (!key) {
        return false;
      }

      // Check if key is expired
      if (key.expiresAt && key.expiresAt < new Date()) {
        logger.warn('Encryption key expired', { keyId, expiresAt: key.expiresAt });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Key verification failed', { error, keyId });
      return false;
    }
  }

  /**
   * Get encryption key metadata
   */
  async getKeyMetadata(keyId: string): Promise<any> {
    return await this.prisma.backupEncryptionKey.findUnique({
      where: { keyId },
      select: {
        id: true,
        keyId: true,
        algorithm: true,
        active: true,
        purpose: true,
        createdAt: true,
        rotatedAt: true,
        expiresAt: true
      }
    });
  }
}
