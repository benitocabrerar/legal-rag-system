/**
 * Error Classes - Barrel Export
 * Week 3-4: Medium Priority - Error Handling Enhancement
 *
 * Centralized export for all custom error classes
 */

// Import for internal use
import { BaseError as BaseErrorClass } from './base-error.js';

// Base error class
export { BaseError } from './base-error.js';

// HTTP errors
export {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
  isHttpError,
} from './http-errors.js';

// Business logic errors
export {
  InsufficientCreditsError,
  DocumentProcessingError,
  EmbeddingGenerationError,
  InvalidQueryError,
  DocumentNotFoundError,
  QuotaExceededError,
  SubscriptionError,
  NLPProcessingError,
  isBusinessError,
} from './business.errors.js';

// Validation errors
export {
  ZodValidationError,
  CustomValidationError,
  MalformedRequestError,
  MissingFieldsError,
  RangeValidationError,
  isValidationError,
  fromZodError,
  type ValidationErrorDetail,
} from './validation.errors.js';

// External service errors
export {
  ExternalServiceError,
  OpenAIError,
  DatabaseError,
  RedisError,
  FirecrawlError,
  StorageError,
  EmailServiceError,
  isExternalServiceError,
  isRetryableError,
  getRetryDelay,
} from './external.errors.js';

/**
 * Master type guard - checks if error is any of our custom errors
 */
export function isKnownError(error: unknown): boolean {
  // Import the BaseError check
  const { BaseError } = require('./base-error.js');
  return error instanceof BaseError;
}

/**
 * Get error category for logging/monitoring
 */
export function getErrorCategory(error: unknown): string {
  const { isHttpError } = require('./http-errors.js');
  const { isBusinessError } = require('./business.errors.js');
  const { isValidationError } = require('./validation.errors.js');
  const { isExternalServiceError } = require('./external.errors.js');

  if (isValidationError(error)) return 'validation';
  if (isBusinessError(error)) return 'business';
  if (isExternalServiceError(error)) return 'external';
  if (isHttpError(error)) return 'http';
  return 'unknown';
}

/**
 * Safely extract error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Safely extract error stack
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * Create a standardized error response object
 */
export function toErrorResponse(error: unknown, includeStack: boolean = false): {
  error: string;
  message: string;
  statusCode: number;
  category: string;
  timestamp: string;
  stack?: string;
  details?: Record<string, unknown>;
} {
  const timestamp = new Date().toISOString();
  const category = getErrorCategory(error);

  // Check if it's a BaseError using duck typing for better type narrowing
  if (
    error !== null &&
    typeof error === 'object' &&
    'getClientMessage' in error &&
    'statusCode' in error &&
    typeof (error as any).getClientMessage === 'function'
  ) {
    const baseError = error as BaseErrorClass;
    return {
      error: baseError.name,
      message: baseError.getClientMessage(),
      statusCode: baseError.statusCode,
      category,
      timestamp,
      ...(includeStack && baseError.stack ? { stack: baseError.stack } : {}),
      ...(baseError.context ? { details: baseError.context } : {}),
    };
  }

  if (error instanceof Error) {
    return {
      error: error.name,
      message: error.message,
      statusCode: 500,
      category,
      timestamp,
      ...(includeStack && error.stack ? { stack: error.stack } : {}),
    };
  }

  return {
    error: 'UnknownError',
    message: getErrorMessage(error),
    statusCode: 500,
    category,
    timestamp,
  };
}
