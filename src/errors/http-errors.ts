/**
 * HTTP Error Classes
 *
 * Concrete implementations of common HTTP errors extending BaseError.
 * Each class maps to a specific HTTP status code and use case.
 *
 * Status Code Reference:
 * - 4xx: Client errors (bad input, auth, not found)
 * - 5xx: Server errors (bugs, external service failures)
 */

import { BaseError } from './base-error';

/**
 * 400 Bad Request
 * Client sent a malformed or invalid request
 */
export class BadRequestError extends BaseError {
  constructor(message: string = 'Bad request', context?: Record<string, unknown>) {
    super(message, 400, true, context);
  }
}

/**
 * 401 Unauthorized
 * Authentication is required or failed
 */
export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(message, 401, true, context);
  }
}

/**
 * 403 Forbidden
 * User is authenticated but lacks permission
 */
export class ForbiddenError extends BaseError {
  constructor(message: string = 'Access denied', context?: Record<string, unknown>) {
    super(message, 403, true, context);
  }
}

/**
 * 404 Not Found
 * Requested resource does not exist
 */
export class NotFoundError extends BaseError {
  public readonly resourceName?: string;
  public readonly resourceId?: string | number;

  /**
   * @param resource - Name of the resource that wasn't found
   * @param id - ID of the specific resource
   * @param message - Custom error message
   */
  constructor(
    resource?: string,
    id?: string | number,
    message?: string,
    context?: Record<string, unknown>
  ) {
    const defaultMessage = resource
      ? `${resource}${id ? ` with ID ${id}` : ''} not found`
      : 'Resource not found';

    super(message || defaultMessage, 404, true, {
      ...context,
      ...(resource && { resourceName: resource }),
      ...(id && { resourceId: id }),
    });

    this.resourceName = resource;
    this.resourceId = id;
  }
}

/**
 * 409 Conflict
 * Request conflicts with current server state (e.g., duplicate resource)
 */
export class ConflictError extends BaseError {
  constructor(message: string = 'Resource conflict', context?: Record<string, unknown>) {
    super(message, 409, true, context);
  }
}

/**
 * 422 Unprocessable Entity
 * Request is well-formed but contains semantic errors
 */
export interface FieldError {
  field: string;
  message: string;
  code?: string;
  value?: unknown;
}

export class ValidationError extends BaseError {
  public readonly errors: FieldError[];

  /**
   * @param errors - Array of field-specific validation errors
   * @param message - General validation error message
   */
  constructor(errors: FieldError[], message: string = 'Validation failed', context?: Record<string, unknown>) {
    super(message, 422, true, {
      ...context,
      validationErrors: errors,
    });
    this.errors = errors;
  }

  /**
   * Creates a ValidationError from a single field error
   */
  public static fromField(field: string, message: string, code?: string): ValidationError {
    return new ValidationError([{ field, message, code }]);
  }

  /**
   * Serializes validation errors to JSON
   */
  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

/**
 * 429 Too Many Requests
 * Rate limit exceeded
 */
export class TooManyRequestsError extends BaseError {
  public readonly retryAfter?: number;

  /**
   * @param retryAfter - Seconds until the client can retry
   * @param message - Custom error message
   */
  constructor(retryAfter?: number, message: string = 'Too many requests', context?: Record<string, unknown>) {
    super(message, 429, true, {
      ...context,
      ...(retryAfter && { retryAfter }),
    });
    this.retryAfter = retryAfter;
  }
}

/**
 * 500 Internal Server Error
 * Unexpected server error (programming bug)
 */
export class InternalServerError extends BaseError {
  constructor(
    message: string = 'Internal server error',
    isOperational: boolean = false,
    context?: Record<string, unknown>
  ) {
    super(message, 500, isOperational, context);
  }

  /**
   * Creates an InternalServerError from an unknown error
   */
  public static fromError(error: unknown, context?: Record<string, unknown>): InternalServerError {
    if (error instanceof Error) {
      return new InternalServerError(error.message, false, {
        ...context,
        originalError: error.name,
        stack: error.stack,
      });
    }
    return new InternalServerError(String(error), false, context);
  }
}

/**
 * 502 Bad Gateway
 * External service returned an invalid response
 */
export class ExternalServiceError extends BaseError {
  public readonly serviceName: string;
  public readonly originalError?: Error;

  /**
   * @param serviceName - Name of the external service (e.g., 'OpenAI', 'Redis')
   * @param message - Error description
   * @param originalError - The original error from the external service
   */
  constructor(
    serviceName: string,
    message?: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    const defaultMessage = message || `${serviceName} service unavailable`;

    super(defaultMessage, 502, true, {
      ...context,
      serviceName,
      ...(originalError && {
        originalError: originalError.message,
        originalErrorType: originalError.name,
      }),
    });

    this.serviceName = serviceName;
    this.originalError = originalError;
  }

  /**
   * Factory methods for common external services
   */
  public static openAI(message?: string, originalError?: Error): ExternalServiceError {
    return new ExternalServiceError('OpenAI', message, originalError);
  }

  public static redis(message?: string, originalError?: Error): ExternalServiceError {
    return new ExternalServiceError('Redis', message, originalError);
  }

  public static database(message?: string, originalError?: Error): ExternalServiceError {
    return new ExternalServiceError('Database', message, originalError);
  }

  public static firecrawl(message?: string, originalError?: Error): ExternalServiceError {
    return new ExternalServiceError('Firecrawl', message, originalError);
  }
}

/**
 * 503 Service Unavailable
 * Server temporarily cannot handle the request
 */
export class ServiceUnavailableError extends BaseError {
  public readonly retryAfter?: number;

  /**
   * @param message - Error description
   * @param retryAfter - Seconds until service may be available
   */
  constructor(
    message: string = 'Service temporarily unavailable',
    retryAfter?: number,
    context?: Record<string, unknown>
  ) {
    super(message, 503, true, {
      ...context,
      ...(retryAfter && { retryAfter }),
    });
    this.retryAfter = retryAfter;
  }
}

/**
 * Type guard to check if error is an HTTP error with status code
 */
export function isHttpError(error: unknown): error is BaseError {
  return error instanceof BaseError && typeof error.statusCode === 'number';
}

/**
 * Export all error types for convenience
 */
export {
  BadRequestError as BadRequest,
  UnauthorizedError as Unauthorized,
  ForbiddenError as Forbidden,
  NotFoundError as NotFound,
  ConflictError as Conflict,
  ValidationError as Validation,
  TooManyRequestsError as TooManyRequests,
  InternalServerError as InternalServer,
  ExternalServiceError as ExternalService,
  ServiceUnavailableError as ServiceUnavailable,
};
