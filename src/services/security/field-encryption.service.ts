/**
 * Field Encryption Service
 * Addresses SEC-005 (CVSS 8.1) - PII Data Encryption
 *
 * Security measures implemented:
 * - AES-256-GCM encryption for PII fields
 * - Secure key derivation from environment variable
 * - Automatic encryption/decryption via Prisma middleware
 * - Deterministic encryption option for searchable fields
 *
 * @module services/security/field-encryption
 */

import * as crypto from 'crypto';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Encryption algorithm configuration
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const KEY_LENGTH = 32; // 256 bits for AES-256
const PBKDF2_ITERATIONS = 100000;

/**
 * Prefix for encrypted values to identify them
 */
const ENCRYPTED_PREFIX = '$ENC$';

/**
 * Configuration for field encryption
 */
export interface FieldEncryptionConfig {
  /** Encryption key from environment (required) */
  encryptionKey?: string;
  /** Fields to encrypt by model */
  fieldsToEncrypt?: ModelFieldsConfig;
  /** Enable deterministic encryption for specific fields (allows searching) */
  deterministicFields?: string[];
  /** Custom salt for deterministic encryption */
  deterministicSalt?: string;
}

/**
 * Model fields configuration for encryption
 */
export interface ModelFieldsConfig {
  [modelName: string]: string[];
}

/**
 * Default PII fields to encrypt per model
 */
const DEFAULT_PII_FIELDS: ModelFieldsConfig = {
  User: [
    'email',
    'phoneNumber',
    'address',
    'nationalId',
    'bankAccount',
    'twoFactorSecret'
  ],
  Case: [
    'clientName'
  ],
  Payment: [
    'cardLast4',
    'billingAddress'
  ],
  PaymentProof: [
    'bankAccount',
    'accountHolder'
  ]
};

/**
 * Fields that should use deterministic encryption (searchable)
 */
const DEFAULT_DETERMINISTIC_FIELDS: string[] = [
  'email' // Allows looking up users by email
];

/**
 * Field Encryption Service
 * Provides AES-256-GCM encryption for PII fields
 */
export class FieldEncryptionService {
  private encryptionKey: Buffer;
  private deterministicKey: Buffer;
  private fieldsToEncrypt: ModelFieldsConfig;
  private deterministicFields: Set<string>;
  private isEnabled: boolean;

  constructor(config: FieldEncryptionConfig = {}) {
    const keyFromEnv = config.encryptionKey || process.env.FIELD_ENCRYPTION_KEY;

    if (!keyFromEnv) {
      console.warn(
        '[Field Encryption] FIELD_ENCRYPTION_KEY not set. ' +
        'PII encryption is DISABLED. Set this environment variable in production.'
      );
      this.isEnabled = false;
      this.encryptionKey = Buffer.alloc(KEY_LENGTH);
      this.deterministicKey = Buffer.alloc(KEY_LENGTH);
      this.fieldsToEncrypt = {};
      this.deterministicFields = new Set();
      return;
    }

    this.isEnabled = true;
    this.fieldsToEncrypt = config.fieldsToEncrypt || DEFAULT_PII_FIELDS;
    this.deterministicFields = new Set(config.deterministicFields || DEFAULT_DETERMINISTIC_FIELDS);

    // Derive encryption key using PBKDF2
    const salt = config.deterministicSalt || 'legal-rag-field-encryption';
    this.encryptionKey = crypto.pbkdf2Sync(
      keyFromEnv,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha512'
    );

    // Derive a separate key for deterministic encryption
    this.deterministicKey = crypto.pbkdf2Sync(
      keyFromEnv,
      salt + '-deterministic',
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha512'
    );

    if (process.env.NODE_ENV !== 'test') {
      console.info('[Field Encryption] Service initialized');
      console.info(`[Field Encryption] Models configured: ${Object.keys(this.fieldsToEncrypt).join(', ')}`);
    }
  }

  /**
   * Checks if encryption is enabled
   */
  public isEncryptionEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Encrypts a value using AES-256-GCM
   * @param plaintext - Value to encrypt
   * @param fieldName - Name of the field (for deterministic encryption check)
   * @returns Encrypted value with prefix
   */
  public encrypt(plaintext: string | null | undefined, fieldName?: string): string | null {
    if (plaintext === null || plaintext === undefined || plaintext === '') {
      return plaintext as null;
    }

    if (!this.isEnabled) {
      return plaintext;
    }

    // Check if already encrypted
    if (plaintext.startsWith(ENCRYPTED_PREFIX)) {
      return plaintext;
    }

    try {
      // Use deterministic encryption for searchable fields
      if (fieldName && this.deterministicFields.has(fieldName)) {
        return this.encryptDeterministic(plaintext);
      }

      // Generate random IV for non-deterministic encryption
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv, {
        authTagLength: AUTH_TAG_LENGTH
      });

      // Encrypt
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Combine: IV + AuthTag + Encrypted
      const combined = Buffer.concat([iv, authTag, encrypted]);

      // Return base64 encoded with prefix
      return ENCRYPTED_PREFIX + combined.toString('base64');
    } catch (error) {
      console.error('[Field Encryption] Encryption error:', error);
      throw new Error('Failed to encrypt field value');
    }
  }

  /**
   * Encrypts a value deterministically (same input = same output)
   * Allows searching on encrypted fields
   * @param plaintext - Value to encrypt
   * @returns Deterministically encrypted value
   */
  private encryptDeterministic(plaintext: string): string {
    try {
      // Use HMAC of plaintext as IV for deterministic encryption
      const hmac = crypto.createHmac('sha256', this.deterministicKey);
      hmac.update(plaintext);
      const iv = hmac.digest().subarray(0, IV_LENGTH);

      // Create cipher with deterministic IV
      const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv, {
        authTagLength: AUTH_TAG_LENGTH
      });

      // Encrypt
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Combine: IV + AuthTag + Encrypted
      const combined = Buffer.concat([iv, authTag, encrypted]);

      // Return base64 encoded with prefix
      return ENCRYPTED_PREFIX + 'D' + combined.toString('base64');
    } catch (error) {
      console.error('[Field Encryption] Deterministic encryption error:', error);
      throw new Error('Failed to encrypt field value deterministically');
    }
  }

  /**
   * Decrypts a value encrypted with AES-256-GCM
   * @param ciphertext - Encrypted value with prefix
   * @returns Decrypted plaintext
   */
  public decrypt(ciphertext: string | null | undefined): string | null {
    if (ciphertext === null || ciphertext === undefined || ciphertext === '') {
      return ciphertext as null;
    }

    if (!this.isEnabled) {
      return ciphertext;
    }

    // Check if value is encrypted
    if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
      return ciphertext;
    }

    try {
      // Remove prefix and check for deterministic marker
      let encoded = ciphertext.substring(ENCRYPTED_PREFIX.length);
      const isDeterministic = encoded.startsWith('D');
      if (isDeterministic) {
        encoded = encoded.substring(1);
      }

      // Decode from base64
      const combined = Buffer.from(encoded, 'base64');

      // Extract components
      const iv = combined.subarray(0, IV_LENGTH);
      const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv, {
        authTagLength: AUTH_TAG_LENGTH
      });
      decipher.setAuthTag(authTag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('[Field Encryption] Decryption error:', error);
      // Return original value if decryption fails (may be unencrypted legacy data)
      return ciphertext;
    }
  }

  /**
   * Encrypts multiple fields in an object
   * @param data - Object containing fields to encrypt
   * @param modelName - Name of the Prisma model
   * @returns Object with encrypted fields
   */
  public encryptFields<T extends Record<string, unknown>>(data: T, modelName: string): T {
    if (!this.isEnabled) {
      return data;
    }

    const fieldsForModel = this.fieldsToEncrypt[modelName] || [];
    const result = { ...data };

    for (const field of fieldsForModel) {
      if (field in result && typeof result[field] === 'string') {
        result[field] = this.encrypt(result[field] as string, field) as T[Extract<keyof T, string>];
      }
    }

    return result;
  }

  /**
   * Decrypts multiple fields in an object
   * @param data - Object containing encrypted fields
   * @param modelName - Name of the Prisma model
   * @returns Object with decrypted fields
   */
  public decryptFields<T extends Record<string, unknown>>(data: T, modelName: string): T {
    if (!this.isEnabled) {
      return data;
    }

    const fieldsForModel = this.fieldsToEncrypt[modelName] || [];
    const result = { ...data };

    for (const field of fieldsForModel) {
      if (field in result && typeof result[field] === 'string') {
        result[field] = this.decrypt(result[field] as string) as T[Extract<keyof T, string>];
      }
    }

    return result;
  }

  /**
   * Gets the list of PII fields for a model
   * @param modelName - Name of the Prisma model
   * @returns Array of field names
   */
  public getEncryptedFields(modelName: string): string[] {
    return this.fieldsToEncrypt[modelName] || [];
  }

  /**
   * Adds a field to the encryption list for a model
   * @param modelName - Name of the Prisma model
   * @param fieldName - Name of the field to encrypt
   */
  public addEncryptedField(modelName: string, fieldName: string): void {
    if (!this.fieldsToEncrypt[modelName]) {
      this.fieldsToEncrypt[modelName] = [];
    }
    if (!this.fieldsToEncrypt[modelName].includes(fieldName)) {
      this.fieldsToEncrypt[modelName].push(fieldName);
    }
  }

  /**
   * Encrypts a value for searching (deterministic encryption)
   * Use this when building queries for encrypted searchable fields
   * @param plaintext - Value to search for
   * @returns Encrypted search value
   */
  public encryptForSearch(plaintext: string): string {
    if (!this.isEnabled) {
      return plaintext;
    }
    return this.encryptDeterministic(plaintext);
  }

  /**
   * Generates a new secure encryption key
   * Use this to generate keys for FIELD_ENCRYPTION_KEY environment variable
   * @returns Base64 encoded 256-bit key
   */
  public static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Validates that the encryption key is strong enough
   * @param key - Key to validate
   * @returns True if key is valid
   */
  public static validateEncryptionKey(key: string): boolean {
    try {
      const decoded = Buffer.from(key, 'base64');
      return decoded.length >= 32;
    } catch {
      return key.length >= 32;
    }
  }
}

/**
 * Creates Prisma middleware for automatic field encryption/decryption
 * @param encryptionService - Field encryption service instance
 * @returns Prisma middleware function
 */
export function createPrismaEncryptionMiddleware(
  encryptionService: FieldEncryptionService
): Prisma.Middleware {
  return async (
    params: Prisma.MiddlewareParams,
    next: (params: Prisma.MiddlewareParams) => Promise<unknown>
  ): Promise<unknown> => {
    const modelName = params.model || '';

    // Encrypt data on write operations
    if (['create', 'update', 'upsert', 'createMany', 'updateMany'].includes(params.action)) {
      if (params.args.data) {
        if (Array.isArray(params.args.data)) {
          params.args.data = params.args.data.map((item: Record<string, unknown>) =>
            encryptionService.encryptFields(item, modelName)
          );
        } else {
          params.args.data = encryptionService.encryptFields(params.args.data, modelName);
        }
      }

      // Handle upsert create/update data
      if (params.action === 'upsert') {
        if (params.args.create) {
          params.args.create = encryptionService.encryptFields(params.args.create, modelName);
        }
        if (params.args.update) {
          params.args.update = encryptionService.encryptFields(params.args.update, modelName);
        }
      }
    }

    // Encrypt search values for where clauses on searchable fields
    if (params.args?.where) {
      const encryptedFields = encryptionService.getEncryptedFields(modelName);
      for (const field of encryptedFields) {
        if (params.args.where[field] && typeof params.args.where[field] === 'string') {
          params.args.where[field] = encryptionService.encryptForSearch(params.args.where[field]);
        }
      }
    }

    // Execute the query
    const result = await next(params);

    // Decrypt data on read operations
    if (['findUnique', 'findFirst', 'findMany', 'create', 'update', 'upsert'].includes(params.action)) {
      if (result) {
        if (Array.isArray(result)) {
          return result.map((item) =>
            encryptionService.decryptFields(item as Record<string, unknown>, modelName)
          );
        } else if (typeof result === 'object') {
          return encryptionService.decryptFields(result as Record<string, unknown>, modelName);
        }
      }
    }

    return result;
  };
}

/**
 * Applies encryption middleware to a Prisma client
 * @param prisma - Prisma client instance
 * @param config - Optional encryption configuration
 * @returns Configured Prisma client
 */
export function applyEncryptionMiddleware(
  prisma: PrismaClient,
  config?: FieldEncryptionConfig
): PrismaClient {
  const encryptionService = new FieldEncryptionService(config);

  if (encryptionService.isEncryptionEnabled()) {
    prisma.$use(createPrismaEncryptionMiddleware(encryptionService));
    console.info('[Field Encryption] Prisma middleware applied');
  }

  return prisma;
}

/**
 * Singleton instance of the encryption service
 */
let encryptionServiceInstance: FieldEncryptionService | null = null;

/**
 * Gets or creates the singleton encryption service instance
 * @param config - Optional configuration for first initialization
 * @returns Field encryption service instance
 */
export function getEncryptionService(config?: FieldEncryptionConfig): FieldEncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new FieldEncryptionService(config);
  }
  return encryptionServiceInstance;
}

/**
 * Utility function to hash sensitive data for logging
 * Use this instead of logging actual PII values
 * @param value - Value to hash
 * @returns SHA-256 hash of the value (first 8 characters)
 */
export function hashForLogging(value: string): string {
  const hash = crypto.createHash('sha256').update(value).digest('hex');
  return hash.substring(0, 8) + '...';
}

export default FieldEncryptionService;
