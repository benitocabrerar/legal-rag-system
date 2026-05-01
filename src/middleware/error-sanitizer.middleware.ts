/**
 * Error Sanitizer Middleware
 * Addresses SEC-004 (CVSS 4.3) - Information Disclosure via Error Messages
 *
 * Security measures implemented:
 * - Hides stack traces in production
 * - Sanitizes sensitive field names from error messages
 * - Returns safe, user-friendly error messages
 * - Logs full error details internally for debugging
 *
 * @module middleware/error-sanitizer
 */

import { FastifyError, FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';

/**
 * List of sensitive field names that should be sanitized from error messages
 */
const SENSITIVE_FIELDS: string[] = [
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'secret',
  'apiKey',
  'api_key',
  'apiSecret',
  'api_secret',
  'privateKey',
  'private_key',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'ssn',
  'socialSecurityNumber',
  'social_security_number',
  'nationalId',
  'national_id',
  'bankAccount',
  'bank_account',
  'routingNumber',
  'routing_number',
  'pin',
  'otp',
  'twoFactorSecret',
  'two_factor_secret',
  'encryptionKey',
  'encryption_key',
  'sessionId',
  'session_id',
  'cookie',
  'authorization',
  'x-api-key',
  'bearer'
];

/**
 * Patterns that indicate sensitive data in error messages
 */
const SENSITIVE_PATTERNS: RegExp[] = [
  /password[=:]\s*['"]?[^'"}\s]+['"]?/gi,
  /token[=:]\s*['"]?[^'"}\s]+['"]?/gi,
  /api[_-]?key[=:]\s*['"]?[^'"}\s]+['"]?/gi,
  /secret[=:]\s*['"]?[^'"}\s]+['"]?/gi,
  /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/gi, // JWT tokens
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, // Email addresses in errors
  /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, // SSN pattern
  /\b\d{13,19}\b/g, // Credit card numbers
  /sk_live_[A-Za-z0-9]+/gi, // Stripe secret keys
  /sk_test_[A-Za-z0-9]+/gi, // Stripe test keys
  /AKIA[0-9A-Z]{16}/gi, // AWS access keys
  /(?:^|[^A-Za-z0-9])([A-Za-z0-9+/]{40,}={0,2})(?:[^A-Za-z0-9]|$)/g // Base64 encoded secrets
];

/**
 * Error codes and their safe messages
 */
const SAFE_ERROR_MESSAGES: Record<string, string> = {
  'P2002': 'A record with this value already exists.',
  'P2003': 'The referenced record does not exist.',
  'P2025': 'The requested record was not found.',
  'P2014': 'The change you are trying to make would violate a required relation.',
  'P2016': 'Query interpretation error.',
  'P2021': 'The table does not exist in the current database.',
  'P2022': 'The column does not exist in the current database.',
  'FST_ERR_VALIDATION': 'The provided data is invalid.',
  'FST_ERR_NOT_FOUND': 'The requested resource was not found.',
  'FST_ERR_CTP_INVALID_MEDIA_TYPE': 'Invalid content type provided.',
  'FST_ERR_CTP_INVALID_CONTENT_LENGTH': 'Invalid content length.',
  'FST_ERR_CTP_BODY_TOO_LARGE': 'Request body is too large.',
  'UNAUTHORIZED': 'Authentication is required to access this resource.',
  'FORBIDDEN': 'You do not have permission to access this resource.',
  'TOO_MANY_REQUESTS': 'Too many requests. Please try again later.',
  'INTERNAL_ERROR': 'An unexpected error occurred. Please try again later.',
  'DATABASE_ERROR': 'A database error occurred. Please try again later.',
  'VALIDATION_ERROR': 'The provided data is invalid.'
};

/**
 * Configuration options for error sanitizer
 */
export interface ErrorSanitizerConfig {
  /** Enable detailed logging of original errors (default: true) */
  enableLogging?: boolean;
  /** Custom sensitive fields to add to default list */
  additionalSensitiveFields?: string[];
  /** Custom error code mappings */
  customErrorMessages?: Record<string, string>;
  /** Include error code in response (default: true) */
  includeErrorCode?: boolean;
  /** Include request ID in response (default: true) */
  includeRequestId?: boolean;
  /** Custom logger function */
  logger?: (error: unknown, request: FastifyRequest) => void;
}

/**
 * Sanitized error response structure
 */
export interface SanitizedErrorResponse {
  /** Whether the request was successful */
  success: false;
  /** Error object with safe details */
  error: {
    /** Safe error message */
    message: string;
    /** Error code (if enabled) */
    code?: string;
    /** Request ID for tracking (if enabled) */
    requestId?: string;
    /** HTTP status code */
    statusCode: number;
    /** Validation errors (if applicable) */
    validation?: Array<{
      field: string;
      message: string;
    }>;
  };
}

/**
 * Sanitizes a string by removing sensitive patterns
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
function sanitizeString(text: string): string {
  let sanitized = text;

  // Replace sensitive patterns with [REDACTED]
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  // Replace sensitive field names and their values
  for (const field of SENSITIVE_FIELDS) {
    const fieldPattern = new RegExp(
      `["']?${field}["']?\\s*[=:]\\s*["']?[^"'\\s,}]+["']?`,
      'gi'
    );
    sanitized = sanitized.replace(fieldPattern, `${field}: [REDACTED]`);
  }

  return sanitized;
}

/**
 * Extracts a safe error code from an error
 * @param error - The error object
 * @returns Safe error code string
 */
function extractErrorCode(error: FastifyError | Error | unknown): string {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;

    // Prisma error codes
    if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
      return err.code;
    }

    // Fastify error codes
    if (err.code && typeof err.code === 'string' && err.code.startsWith('FST_')) {
      return err.code;
    }

    // Custom error codes
    if (err.code && typeof err.code === 'string') {
      return err.code;
    }

    // Error name as fallback
    if (err.name && typeof err.name === 'string') {
      return err.name.toUpperCase().replace(/\s+/g, '_');
    }
  }

  return 'INTERNAL_ERROR';
}

/**
 * Gets a safe error message for an error code
 * @param code - Error code
 * @param customMessages - Custom error messages
 * @returns Safe error message
 */
function getSafeMessage(
  code: string,
  customMessages: Record<string, string> = {}
): string {
  // Check custom messages first
  if (customMessages[code]) {
    return customMessages[code];
  }

  // Check default messages
  if (SAFE_ERROR_MESSAGES[code]) {
    return SAFE_ERROR_MESSAGES[code];
  }

  // Default message for unknown errors
  return 'An unexpected error occurred. Please try again later.';
}

/**
 * Extracts HTTP status code from error
 * @param error - The error object
 * @returns HTTP status code
 */
function extractStatusCode(error: FastifyError | Error | unknown): number {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;

    if (typeof err.statusCode === 'number') {
      return err.statusCode;
    }

    if (typeof err.status === 'number') {
      return err.status;
    }

    // Prisma error code mapping
    if (err.code === 'P2002') return 409; // Conflict
    if (err.code === 'P2025') return 404; // Not Found
    if (err.code === 'P2003') return 400; // Bad Request
  }

  return 500;
}

/**
 * Extracts validation errors from a Fastify validation error
 * @param error - The error object
 * @returns Array of validation errors or undefined
 */
function extractValidationErrors(
  error: FastifyError | Error | unknown
): Array<{ field: string; message: string }> | undefined {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;

    // Fastify validation errors
    if (err.validation && Array.isArray(err.validation)) {
      return err.validation.map((v: Record<string, unknown>) => ({
        field: sanitizeString(String(v.dataPath || v.instancePath || 'unknown')),
        message: sanitizeString(String(v.message || 'Invalid value'))
      }));
    }

    // Zod validation errors
    if (err.issues && Array.isArray(err.issues)) {
      return err.issues.map((issue: Record<string, unknown>) => ({
        field: Array.isArray(issue.path) ? issue.path.join('.') : 'unknown',
        message: sanitizeString(String(issue.message || 'Invalid value'))
      }));
    }
  }

  return undefined;
}

/**
 * Logs the full error internally for debugging
 * @param error - The error object
 * @param request - Fastify request
 * @param config - Sanitizer configuration
 */
function logError(
  error: unknown,
  request: FastifyRequest,
  config: ErrorSanitizerConfig
): void {
  if (!config.enableLogging) return;

  const logData = {
    timestamp: new Date().toISOString(),
    requestId: request.id,
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    ip: request.ip,
    userId: (request as unknown as Record<string, unknown>).user
      ? ((request as unknown as Record<string, unknown>).user as Record<string, unknown>).id
      : undefined,
    error: {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      code: extractErrorCode(error),
      ...(error && typeof error === 'object' ? error : {})
    }
  };

  // Use custom logger if provided, otherwise use console
  if (config.logger) {
    config.logger(logData, request);
  } else {
    // Log to stderr for production logging systems to capture
    console.error('[ERROR]', JSON.stringify(logData, null, 2));
  }
}

/**
 * Sanitizes an error and returns a safe response
 * @param error - The error object
 * @param request - Fastify request
 * @param config - Sanitizer configuration
 * @returns Sanitized error response
 */
export function sanitizeError(
  error: FastifyError | Error | unknown,
  request: FastifyRequest,
  config: ErrorSanitizerConfig = {}
): SanitizedErrorResponse {
  const isProduction = process.env.NODE_ENV === 'production';
  const mergedConfig: ErrorSanitizerConfig = {
    enableLogging: config.enableLogging ?? true,
    additionalSensitiveFields: config.additionalSensitiveFields ?? [],
    customErrorMessages: config.customErrorMessages ?? {},
    includeErrorCode: config.includeErrorCode ?? true,
    includeRequestId: config.includeRequestId ?? true,
    logger: config.logger
  };

  // Add additional sensitive fields to the list
  if (mergedConfig.additionalSensitiveFields) {
    SENSITIVE_FIELDS.push(...mergedConfig.additionalSensitiveFields);
  }

  // Log the full error internally
  logError(error, request, mergedConfig);

  const errorCode = extractErrorCode(error);
  const statusCode = extractStatusCode(error);
  const validationErrors = extractValidationErrors(error);

  // Build safe response
  const response: SanitizedErrorResponse = {
    success: false,
    error: {
      message: getSafeMessage(errorCode, mergedConfig.customErrorMessages),
      statusCode
    }
  };

  // Add error code if enabled
  if (mergedConfig.includeErrorCode) {
    response.error.code = errorCode;
  }

  // Add request ID if enabled
  if (mergedConfig.includeRequestId) {
    response.error.requestId = request.id;
  }

  // Add validation errors if present
  if (validationErrors && validationErrors.length > 0) {
    response.error.validation = validationErrors;
    response.error.message = 'Validation failed. Please check your input.';
  }

  // In development, include more details (but still sanitized)
  if (!isProduction && error instanceof Error) {
    response.error.message = sanitizeString(error.message);
  }

  return response;
}

/**
 * Creates a Fastify error handler plugin
 * @param config - Error sanitizer configuration
 * @returns Fastify plugin function
 */
export function createErrorSanitizerPlugin(config: ErrorSanitizerConfig = {}) {
  return async function errorSanitizerPlugin(
    fastify: FastifyInstance
  ): Promise<void> {
    // Set custom error handler
    fastify.setErrorHandler((
      error: FastifyError,
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const sanitizedResponse = sanitizeError(error, request, config);

      reply
        .status(sanitizedResponse.error.statusCode)
        .send(sanitizedResponse);
    });

    // Log plugin registration
    if (process.env.NODE_ENV !== 'test') {
      console.info('[Error Sanitizer] Plugin registered');
      console.info(`[Error Sanitizer] Production mode: ${process.env.NODE_ENV === 'production'}`);
    }
  };
}

/**
 * Standalone error handler function
 * @param error - The error object
 * @param request - Fastify request
 * @param reply - Fastify reply
 * @param config - Optional configuration
 */
export function errorSanitizerHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
  config: ErrorSanitizerConfig = {}
): void {
  const sanitizedResponse = sanitizeError(error, request, config);

  reply
    .status(sanitizedResponse.error.statusCode)
    .send(sanitizedResponse);
}

/**
 * Utility function to create a safe error for throwing
 * @param message - Error message
 * @param code - Error code
 * @param statusCode - HTTP status code
 * @returns Safe error object
 */
export function createSafeError(
  message: string,
  code: string = 'INTERNAL_ERROR',
  statusCode: number = 500
): Error & { code: string; statusCode: number } {
  const error = new Error(message) as Error & { code: string; statusCode: number };
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

/**
 * Checks if a string contains sensitive data
 * @param text - Text to check
 * @returns True if sensitive data is detected
 */
export function containsSensitiveData(text: string): boolean {
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  const lowerText = text.toLowerCase();
  for (const field of SENSITIVE_FIELDS) {
    if (lowerText.includes(field.toLowerCase())) {
      return true;
    }
  }

  return false;
}

export default createErrorSanitizerPlugin;
