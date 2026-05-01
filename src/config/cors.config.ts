/**
 * CORS Configuration
 * Addresses SEC-002 (CVSS 6.5) - Cross-Origin Resource Sharing Security
 *
 * Security measures implemented:
 * - Removes wildcard default in production
 * - Validates CORS_ORIGIN environment variable
 * - Supports multiple origins from comma-separated env var
 * - Configures proper methods, headers, and credentials
 *
 * @module config/cors
 */

import type { FastifyCorsOptions } from '@fastify/cors';

/**
 * List of allowed HTTP methods for CORS requests
 */
const ALLOWED_METHODS: string[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD'
];

/**
 * List of allowed headers for CORS requests
 */
const ALLOWED_HEADERS: string[] = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Accept-Language',
  'Origin',
  'X-Request-ID',
  'X-Correlation-ID',
  'X-CSRF-Token'
];

/**
 * List of headers exposed to the client
 */
const EXPOSED_HEADERS: string[] = [
  'X-Request-ID',
  'X-Correlation-ID',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
  'Content-Disposition'
];

/**
 * Default allowed origins for development
 */
const DEFAULT_DEV_ORIGINS: string[] = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:8000'
];

/**
 * Validates if a given origin URL is properly formatted
 * @param origin - The origin URL to validate
 * @returns True if origin is valid, false otherwise
 */
function isValidOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    // Must be http or https protocol
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    // Must not contain path (except root)
    if (url.pathname !== '/') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Parses comma-separated origins from environment variable
 * @param corsOrigin - The CORS_ORIGIN environment variable value
 * @returns Array of validated origin strings
 */
function parseOrigins(corsOrigin: string | undefined): string[] {
  if (!corsOrigin) {
    return [];
  }

  // Handle single origin
  if (!corsOrigin.includes(',')) {
    const trimmed = corsOrigin.trim();
    if (trimmed === '*') {
      return ['*'];
    }
    return isValidOrigin(trimmed) ? [trimmed] : [];
  }

  // Handle multiple origins (comma-separated)
  return corsOrigin
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0)
    .filter(origin => {
      if (!isValidOrigin(origin)) {
        console.warn(`[CORS] Invalid origin skipped: ${origin}`);
        return false;
      }
      return true;
    });
}

/**
 * Origin validation function for dynamic CORS checking
 * @param allowedOrigins - Set of allowed origins for O(1) lookup
 * @returns Origin validation callback function
 */
function createOriginValidator(allowedOrigins: Set<string>): (origin: string | undefined, callback: (err: Error | null, origin?: string) => void) => void {
  return (
    origin: string | undefined,
    callback: (err: Error | null, origin?: string) => void
  ): void => {
    // Allow requests with no origin (same-origin, curl, mobile apps)
    if (!origin) {
      callback(null, '');
      return;
    }

    // Check if origin is in the allowed list
    if (allowedOrigins.has(origin)) {
      callback(null, origin);
      return;
    }

    // Log rejected origin attempts for security monitoring
    console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  };
}

/**
 * Retrieves the current environment
 * @returns Current NODE_ENV value or 'development'
 */
function getEnvironment(): string {
  return process.env.NODE_ENV || 'development';
}

/**
 * Validates CORS configuration for production environment
 * Throws error if configuration is insecure
 */
function validateProductionConfig(): void {
  const corsOrigin = process.env.CORS_ORIGIN;
  const env = getEnvironment();

  if (env === 'production') {
    // Wildcard is not allowed in production
    if (!corsOrigin || corsOrigin === '*') {
      throw new Error(
        '[SEC-002] CORS_ORIGIN must be explicitly configured in production. ' +
        'Wildcard (*) origins are not allowed for security reasons. ' +
        'Set CORS_ORIGIN to your frontend domain(s), e.g., "https://app.example.com"'
      );
    }

    // Validate that all origins use HTTPS in production
    const origins = parseOrigins(corsOrigin);
    const insecureOrigins = origins.filter(o => o.startsWith('http://'));

    if (insecureOrigins.length > 0) {
      console.warn(
        `[SEC-002] Warning: Insecure HTTP origins configured in production: ${insecureOrigins.join(', ')}. ` +
        'Consider using HTTPS for all production origins.'
      );
    }

    if (origins.length === 0) {
      throw new Error(
        '[SEC-002] No valid origins found in CORS_ORIGIN. ' +
        'Please provide valid origin URLs.'
      );
    }
  }
}

/**
 * Creates CORS configuration options for Fastify
 * @returns FastifyCorsOptions configured for the current environment
 */
export function getCorsConfig(): FastifyCorsOptions {
  const env = getEnvironment();
  const corsOrigin = process.env.CORS_ORIGIN;

  // Validate production configuration
  validateProductionConfig();

  // Parse configured origins
  let origins = parseOrigins(corsOrigin);

  // In development, use default origins if none specified
  if (env === 'development' && origins.length === 0) {
    origins = DEFAULT_DEV_ORIGINS;
    console.info('[CORS] Development mode: Using default localhost origins');
  }

  // Create origin set for fast lookup
  const allowedOriginsSet = new Set(origins);

  // Build configuration
  const config: FastifyCorsOptions = {
    // Origin validation
    origin: origins.includes('*') && env !== 'production'
      ? true // Allow all origins in non-production with wildcard
      : createOriginValidator(allowedOriginsSet) as unknown as FastifyCorsOptions['origin'],

    // Allowed HTTP methods
    methods: ALLOWED_METHODS,

    // Allowed request headers
    allowedHeaders: ALLOWED_HEADERS,

    // Headers exposed to client
    exposedHeaders: EXPOSED_HEADERS,

    // Allow credentials (cookies, authorization headers)
    credentials: true,

    // Preflight cache duration (24 hours)
    maxAge: 86400,

    // Allow preflight requests
    preflightContinue: false,

    // Return 204 for OPTIONS requests
    optionsSuccessStatus: 204,

    // Enable strict preflight response
    strictPreflight: true
  };

  // Log configuration summary
  if (env !== 'test') {
    console.info(`[CORS] Configuration loaded for ${env} environment`);
    console.info(`[CORS] Allowed origins: ${origins.length > 0 ? origins.join(', ') : 'none (using validator)'}`);
    console.info(`[CORS] Credentials enabled: ${config.credentials}`);
  }

  return config;
}

/**
 * Type definitions for CORS configuration
 */
export interface CorsConfiguration {
  /** Array of allowed origin URLs */
  origins: string[];
  /** Array of allowed HTTP methods */
  methods: string[];
  /** Array of allowed request headers */
  allowedHeaders: string[];
  /** Array of headers exposed to client */
  exposedHeaders: string[];
  /** Whether credentials are allowed */
  credentials: boolean;
  /** Preflight cache duration in seconds */
  maxAge: number;
}

/**
 * Gets a summary of the current CORS configuration
 * Useful for debugging and audit logging
 * @returns CorsConfiguration summary object
 */
export function getCorsConfigSummary(): CorsConfiguration {
  const corsOrigin = process.env.CORS_ORIGIN;
  const origins = parseOrigins(corsOrigin);
  const env = getEnvironment();

  return {
    origins: origins.length > 0 ? origins : (env === 'development' ? DEFAULT_DEV_ORIGINS : []),
    methods: ALLOWED_METHODS,
    allowedHeaders: ALLOWED_HEADERS,
    exposedHeaders: EXPOSED_HEADERS,
    credentials: true,
    maxAge: 86400
  };
}

/**
 * Validates if a specific origin is allowed
 * Useful for programmatic checking
 * @param origin - Origin URL to check
 * @returns True if origin is allowed
 */
export function isOriginAllowed(origin: string): boolean {
  const corsOrigin = process.env.CORS_ORIGIN;
  const origins = parseOrigins(corsOrigin);
  const env = getEnvironment();

  // In development with no config, allow default origins
  if (env === 'development' && origins.length === 0) {
    return DEFAULT_DEV_ORIGINS.includes(origin);
  }

  // Wildcard allows all (non-production only)
  if (origins.includes('*') && env !== 'production') {
    return true;
  }

  return origins.includes(origin);
}

export default getCorsConfig;
