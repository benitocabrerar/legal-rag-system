/**
 * Field-Level Encryption Service
 * Implements AES-256-GCM encryption for PII and sensitive data
 *
 * @module services/security/encryption
 * @version 1.0.0
 */

import crypto from 'crypto';

/**
 * Encryption configuration
 */
interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  keyLength: number;
  ivLength: number;
  tagLength: number;
  saltLength: number;
}

/**
 * Encrypted data structure
 */
interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  version: number;
}

/**
 * Field encryption metadata
 */
interface FieldEncryptionMeta {
  fieldName: string;
  encryptedAt: Date;
  keyVersion: number;
}

const CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16,  // 128 bits
  tagLength: 16, // 128 bits
  saltLength: 32 // 256 bits
};

// Current key version - increment when rotating keys
const CURRENT_KEY_VERSION = 1;

/**
 * Gets the encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.FIELD_ENCRYPTION_KEY;

  if (!keyEnv) {
    throw new Error('FIELD_ENCRYPTION_KEY is not configured');
  }

  // If key is hex-encoded (64 chars for 32 bytes)
  if (/^[a-fA-F0-9]{64}$/.test(keyEnv)) {
    return Buffer.from(keyEnv, 'hex');
  }

  // If key is base64-encoded
  if (/^[A-Za-z0-9+/]+=*$/.test(keyEnv) && keyEnv.length >= 43) {
    const decoded = Buffer.from(keyEnv, 'base64');
    if (decoded.length >= CONFIG.keyLength) {
      return decoded.slice(0, CONFIG.keyLength);
    }
  }

  // Use key as-is with hashing if needed
  if (keyEnv.length < CONFIG.keyLength) {
    // Derive key using PBKDF2
    return crypto.pbkdf2Sync(
      keyEnv,
      'legal-rag-encryption-salt',
      100000,
      CONFIG.keyLength,
      'sha256'
    );
  }

  return Buffer.from(keyEnv.slice(0, CONFIG.keyLength), 'utf-8');
}

/**
 * Encrypts a value using AES-256-GCM
 */
export function encrypt(plaintext: string): EncryptedData {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty value');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(CONFIG.ivLength);

  const cipher = crypto.createCipheriv(CONFIG.algorithm, key, iv, {
    authTagLength: CONFIG.tagLength
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    version: CURRENT_KEY_VERSION
  };
}

/**
 * Decrypts a value using AES-256-GCM
 */
export function decrypt(data: EncryptedData): string {
  if (!data.encrypted || !data.iv || !data.tag) {
    throw new Error('Invalid encrypted data structure');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(data.iv, 'base64');
  const tag = Buffer.from(data.tag, 'base64');

  const decipher = crypto.createDecipheriv(CONFIG.algorithm, key, iv, {
    authTagLength: CONFIG.tagLength
  });

  decipher.setAuthTag(tag);

  let decrypted = decipher.update(data.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypts a string and returns a single encoded string for storage
 */
export function encryptToString(plaintext: string): string {
  const data = encrypt(plaintext);
  const combined = {
    e: data.encrypted,
    i: data.iv,
    t: data.tag,
    v: data.version
  };
  return Buffer.from(JSON.stringify(combined)).toString('base64');
}

/**
 * Decrypts a string that was encrypted with encryptToString
 */
export function decryptFromString(encryptedString: string): string {
  try {
    const json = Buffer.from(encryptedString, 'base64').toString('utf-8');
    const combined = JSON.parse(json);
    return decrypt({
      encrypted: combined.e,
      iv: combined.i,
      tag: combined.t,
      version: combined.v
    });
  } catch (error) {
    throw new Error('Failed to decrypt: invalid format or corrupted data');
  }
}

/**
 * Checks if a string appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;

  try {
    const decoded = Buffer.from(value, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    return parsed.e && parsed.i && parsed.t && typeof parsed.v === 'number';
  } catch {
    return false;
  }
}

/**
 * Encrypts specific fields in an object
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): T & { _encryptedFields?: string[] } {
  const result = { ...obj } as T & { _encryptedFields?: string[] };
  const encrypted: string[] = [];

  for (const field of fieldsToEncrypt) {
    const value = obj[field];
    if (value !== null && value !== undefined && typeof value === 'string') {
      (result as any)[field] = encryptToString(value);
      encrypted.push(field as string);
    }
  }

  if (encrypted.length > 0) {
    result._encryptedFields = encrypted;
  }

  return result;
}

/**
 * Decrypts specific fields in an object
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt?: (keyof T)[]
): T {
  const result = { ...obj };
  const fields = fieldsToDecrypt || (obj._encryptedFields as (keyof T)[]) || [];

  for (const field of fields) {
    const value = obj[field];
    if (value && typeof value === 'string' && isEncrypted(value)) {
      try {
        (result as any)[field] = decryptFromString(value);
      } catch {
        // Keep encrypted value if decryption fails
        console.warn(`Failed to decrypt field: ${String(field)}`);
      }
    }
  }

  // Remove metadata field
  delete (result as any)._encryptedFields;

  return result;
}

/**
 * Hashes a value (one-way, for searching encrypted fields)
 */
export function hashForSearch(value: string): string {
  const key = getEncryptionKey();
  return crypto
    .createHmac('sha256', key)
    .update(value.toLowerCase().trim())
    .digest('hex');
}

/**
 * Generates a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generates a time-limited token with expiry
 */
export function generateTimedToken(
  payload: Record<string, any>,
  expiresInSeconds: number = 3600
): string {
  const data = {
    ...payload,
    exp: Date.now() + expiresInSeconds * 1000,
    jti: crypto.randomBytes(16).toString('hex')
  };

  const json = JSON.stringify(data);
  return encryptToString(json);
}

/**
 * Validates and decodes a timed token
 */
export function validateTimedToken(token: string): Record<string, any> | null {
  try {
    const json = decryptFromString(token);
    const data = JSON.parse(json);

    if (data.exp < Date.now()) {
      return null; // Token expired
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * PII Field definitions for automatic encryption
 */
export const PII_FIELDS = [
  'email',
  'phone',
  'phoneNumber',
  'mobilePhone',
  'ssn',
  'socialSecurityNumber',
  'taxId',
  'nationalId',
  'passportNumber',
  'driversLicense',
  'creditCard',
  'bankAccount',
  'iban'
] as const;

/**
 * Determines if a field should be encrypted based on name
 */
export function isPIIField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().replace(/[_-]/g, '');
  return PII_FIELDS.some(pii => normalized.includes(pii.toLowerCase()));
}

/**
 * Service class for stateful encryption operations
 */
export class EncryptionService {
  private keyVersion: number;
  private encryptedFieldsCache: Map<string, Set<string>>;

  constructor() {
    this.keyVersion = CURRENT_KEY_VERSION;
    this.encryptedFieldsCache = new Map();
  }

  /**
   * Encrypts PII fields automatically
   */
  encryptPII<T extends Record<string, any>>(obj: T, entityType: string): T {
    const piiFields = this.getPIIFieldsForEntity(entityType);
    return encryptFields(obj, piiFields as (keyof T)[]);
  }

  /**
   * Decrypts PII fields automatically
   */
  decryptPII<T extends Record<string, any>>(obj: T, entityType: string): T {
    const piiFields = this.getPIIFieldsForEntity(entityType);
    return decryptFields(obj, piiFields as (keyof T)[]);
  }

  /**
   * Gets PII fields for a specific entity type
   */
  private getPIIFieldsForEntity(entityType: string): string[] {
    // Define PII fields per entity type
    const fieldsByEntity: Record<string, string[]> = {
      user: ['email', 'phone', 'ssn'],
      contact: ['email', 'phone', 'taxId'],
      document: ['authorEmail'],
      auditLog: ['userEmail', 'ipAddress']
    };

    return fieldsByEntity[entityType] || [];
  }

  /**
   * Rotates encryption key (re-encrypts data with new key)
   */
  async rotateKey<T extends Record<string, any>>(
    records: T[],
    fieldsToRotate: (keyof T)[],
    saveCallback: (record: T) => Promise<void>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const record of records) {
      try {
        // Decrypt with current key
        const decrypted = decryptFields(record, fieldsToRotate);

        // Re-encrypt (will use new key if key was rotated)
        const reEncrypted = encryptFields(decrypted, fieldsToRotate);

        // Save
        await saveCallback(reEncrypted);
        success++;
      } catch (error) {
        console.error('Key rotation failed for record:', error);
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Validates encryption configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      getEncryptionKey();
    } catch (error) {
      errors.push('FIELD_ENCRYPTION_KEY is not properly configured');
    }

    // Test encryption/decryption
    try {
      const testValue = 'test-encryption-' + Date.now();
      const encrypted = encryptToString(testValue);
      const decrypted = decryptFromString(encrypted);

      if (decrypted !== testValue) {
        errors.push('Encryption/decryption test failed');
      }
    } catch (error) {
      errors.push(`Encryption test error: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();

export default {
  encrypt,
  decrypt,
  encryptToString,
  decryptFromString,
  encryptFields,
  decryptFields,
  hashForSearch,
  generateSecureToken,
  generateTimedToken,
  validateTimedToken,
  isEncrypted,
  isPIIField,
  PII_FIELDS,
  encryptionService
};
