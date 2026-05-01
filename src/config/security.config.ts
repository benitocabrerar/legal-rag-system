/**
 * Security Configuration Module
 * Handles JWT secrets, encryption keys, and security settings
 *
 * @module config/security
 * @version 1.0.0
 */

import crypto from 'crypto';

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  jwt: {
    secret: string;
    algorithm: 'HS256' | 'HS384' | 'HS512';
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
  };
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    maxAge: number;
  };
  rateLimit: {
    max: number;
    timeWindow: string;
  };
}

/**
 * Validates and returns the JWT secret
 * Throws error if not configured or too short
 */
export function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    // In development, warn but allow startup with a generated secret
    if (process.env.NODE_ENV === 'development') {
      const devSecret = crypto.randomBytes(64).toString('hex');
      console.warn(
        '\n[SECURITY WARNING] JWT_SECRET not set. Using temporary development secret.\n' +
        'Generate a production secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n'
      );
      return devSecret;
    }

    throw new Error(
      'FATAL: JWT_SECRET environment variable is not set.\n' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n' +
      'Then set it in your .env file or environment variables.'
    );
  }

  if (secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security.\n' +
      'Current length: ' + secret.length
    );
  }

  // Warn if using weak secret in production
  if (process.env.NODE_ENV === 'production') {
    const weakSecrets = ['supersecret', 'secret', 'password', 'jwt_secret', '12345'];
    if (weakSecrets.some(weak => secret.toLowerCase().includes(weak))) {
      console.warn('[SECURITY WARNING] JWT_SECRET appears to be weak. Please use a strong random secret.');
    }
  }

  return secret;
}

/**
 * Generates a cryptographically secure secret
 */
export function generateSecureSecret(bytes: number = 64): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Validates and returns the field encryption key
 */
export function getFieldEncryptionKey(): string {
  const key = process.env.FIELD_ENCRYPTION_KEY;

  if (!key) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SECURITY WARNING] FIELD_ENCRYPTION_KEY not set. PII encryption disabled in development.');
      return '';
    }
    throw new Error('FIELD_ENCRYPTION_KEY environment variable is required for PII encryption');
  }

  if (key.length < 32) {
    throw new Error('FIELD_ENCRYPTION_KEY must be at least 32 characters');
  }

  return key;
}

/**
 * Gets the complete security configuration
 */
export function getSecurityConfig(): SecurityConfig {
  return {
    jwt: {
      secret: getJWTSecret(),
      algorithm: 'HS512',
      accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
      refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
    },
    encryption: {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16
    },
    cors: {
      allowedOrigins: getCorsOrigins(),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Version'],
      maxAge: 86400 // 24 hours
    },
    rateLimit: {
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      timeWindow: process.env.RATE_LIMIT_WINDOW || '15 minutes'
    }
  };
}

/**
 * Parses and validates CORS origins
 */
function getCorsOrigins(): string[] {
  const originsEnv = process.env.CORS_ORIGIN;

  if (!originsEnv) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CORS_ORIGIN must be configured in production.\n' +
        'Set it to your frontend domain(s), e.g.: CORS_ORIGIN=https://app.example.com'
      );
    }
    // Allow all in development
    return ['*'];
  }

  // Support comma-separated origins
  const origins = originsEnv.split(',').map(o => o.trim()).filter(Boolean);

  // Warn about wildcard in production
  if (process.env.NODE_ENV === 'production' && origins.includes('*')) {
    console.warn('[SECURITY WARNING] CORS wildcard (*) is not recommended in production');
  }

  return origins;
}

/**
 * Validates security configuration at startup
 */
export function validateSecurityConfig(): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check JWT Secret
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        errors.push('JWT_SECRET is not set');
      } else {
        warnings.push('JWT_SECRET not set - using temporary development secret');
      }
    } else if (secret.length < 32) {
      errors.push('JWT_SECRET is too short (minimum 32 characters)');
    } else if (secret === 'supersecret') {
      if (process.env.NODE_ENV === 'production') {
        errors.push('JWT_SECRET is using default value');
      } else {
        warnings.push('JWT_SECRET is using default value');
      }
    }
  } catch (e) {
    errors.push((e as Error).message);
  }

  // Check CORS
  const corsOrigin = process.env.CORS_ORIGIN;
  if (!corsOrigin) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('CORS_ORIGIN is not set');
    } else {
      warnings.push('CORS_ORIGIN not set - allowing all origins in development');
    }
  } else if (corsOrigin === '*' && process.env.NODE_ENV === 'production') {
    warnings.push('CORS wildcard (*) is not recommended in production');
  }

  // Check Field Encryption
  const encryptionKey = process.env.FIELD_ENCRYPTION_KEY;
  if (!encryptionKey) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('FIELD_ENCRYPTION_KEY is not set - PII encryption will fail');
    } else {
      warnings.push('FIELD_ENCRYPTION_KEY not set - PII encryption disabled');
    }
  }

  // Check HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.HTTPS_ENABLED && !process.env.RENDER) {
      warnings.push('HTTPS not explicitly enabled - ensure your proxy/load balancer handles SSL');
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}

export default {
  getJWTSecret,
  getFieldEncryptionKey,
  getSecurityConfig,
  generateSecureSecret,
  validateSecurityConfig
};
