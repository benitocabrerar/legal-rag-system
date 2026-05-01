/**
 * Global Error Handler Middleware
 *
 * Centralized error handling for the Fastify application.
 * Handles all error types and provides consistent error responses.
 *
 * Features:
 * - BaseError instance handling with proper status codes
 * - Zod validation error formatting
 * - Fastify error handling
 * - Production error sanitization
 * - Comprehensive error logging with context
 * - Request ID tracking in responses
 *
 * @see https://www.fastify.io/docs/latest/Reference/Errors/
 */

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { BaseError } from '../errors/base-error';
import {
  ValidationError,
  InternalServerError,
  BadRequestError,
  type FieldError,
} from '../errors/http-errors';
import { logger } from '../utils/logger';

/**
 * Error response structure sent to clients
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    requestId?: string;
    timestamp: string;
    errors?: FieldError[];
    path?: string;
    stack?: string;
  };
}

/**
 * Converts ZodError to our ValidationError format
 *
 * @param error - Zod validation error
 * @returns ValidationError with formatted field errors
 */
function handleZodError(error: ZodError): ValidationError {
  const fieldErrors: FieldError[] = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    value: err.path.length > 0 ? undefined : err.message,
  }));

  return new ValidationError(fieldErrors, 'Request validation failed');
}

/**
 * Converts Fastify errors to BaseError instances
 *
 * @param error - Fastify error
 * @returns Appropriate BaseError instance
 */
function handleFastifyError(error: FastifyError): BaseError {
  // Validation errors from Fastify's built-in validator
  if (error.validation) {
    const fieldErrors: FieldError[] = error.validation.map((err) => ({
      field: err.instancePath?.replace(/^\//, '') || (typeof err.params?.missingProperty === 'string' ? err.params.missingProperty : 'unknown'),
      message: err.message || 'Validation failed',
      code: err.keyword,
    }));
    return new ValidationError(fieldErrors, 'Request validation failed');
  }

  // Map common Fastify error codes to our error types
  const statusCode = error.statusCode || 500;

  if (statusCode === 400) {
    return new BadRequestError(error.message);
  }

  // For other errors, create an InternalServerError
  return new InternalServerError(
    error.message,
    false,
    {
      code: error.code,
      statusCode,
    }
  );
}

/**
 * Determines if an error should expose details to the client
 *
 * @param error - Error to check
 * @returns true if safe to expose
 */
function isSafeToExpose(error: BaseError): boolean {
  // In development, expose all errors
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  // In production, only expose operational errors
  return error.isOperational;
}

/**
 * Sanitizes error message for production
 *
 * @param error - Error to sanitize
 * @returns Safe message for client
 */
function sanitizeErrorMessage(error: BaseError): string {
  if (isSafeToExpose(error)) {
    return error.message;
  }

  // Generic message for non-operational errors in production
  return 'An unexpected error occurred. Please try again later.';
}

/**
 * Logs error with full context
 *
 * @param error - Error to log
 * @param request - Fastify request object
 */
function logError(error: Error, request: FastifyRequest): void {
  const logContext = {
    requestId: request.id,
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    ...(error instanceof BaseError && error.context),
  };

  // Determine log level based on error type
  if (error instanceof BaseError) {
    if (error.statusCode >= 500) {
      logger.error(`Server error: ${error.message}`, {
        err: error,
        ...logContext,
        stack: error.stack,
      });
    } else if (error.statusCode === 429) {
      logger.warn(`Rate limit exceeded: ${error.message}`, logContext);
    } else {
      logger.info(`Client error: ${error.message}`, logContext);
    }
  } else {
    // Unknown errors are always logged as errors
    logger.error(`Unhandled error: ${error.message}`, {
      err: error,
      ...logContext,
      stack: error.stack,
    });
  }
}

/**
 * Builds error response object
 *
 * @param error - Error to format
 * @param request - Fastify request object
 * @returns Formatted error response
 */
function buildErrorResponse(error: BaseError, request: FastifyRequest): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: {
      message: sanitizeErrorMessage(error),
      code: error.name,
      statusCode: error.statusCode,
      requestId: request.id,
      timestamp: error.timestamp.toISOString(),
      path: request.url,
    },
  };

  // Add validation errors if present
  if (error instanceof ValidationError) {
    response.error.errors = error.errors;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    response.error.stack = error.stack;
  }

  return response;
}

/**
 * Global error handler for Fastify
 *
 * @param error - Error thrown during request processing
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 */
export async function globalErrorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Log the error first
  logError(error, request);

  let handledError: BaseError;

  // Convert error to BaseError if needed
  if (error instanceof BaseError) {
    handledError = error;
  } else if (error instanceof ZodError) {
    handledError = handleZodError(error);
  } else if ('statusCode' in error && 'code' in error) {
    // Fastify error
    handledError = handleFastifyError(error as FastifyError);
  } else {
    // Unknown error - wrap as InternalServerError
    handledError = InternalServerError.fromError(error);
  }

  // Attach request ID to error for tracking
  handledError.requestId = request.id;

  // Build and send error response
  const errorResponse = buildErrorResponse(handledError, request);

  // Set additional headers for specific error types
  if (handledError.statusCode === 429 && 'retryAfter' in handledError) {
    reply.header('Retry-After', String(handledError.retryAfter));
  }

  if (handledError.statusCode === 503 && 'retryAfter' in handledError) {
    reply.header('Retry-After', String(handledError.retryAfter));
  }

  // Send the error response
  reply.status(handledError.statusCode).send(errorResponse);
}

/**
 * Sets the global error handler on a Fastify instance
 *
 * @param app - Fastify instance
 */
export function setupGlobalErrorHandler(app: any): void {
  app.setErrorHandler(globalErrorHandler);

  logger.info('Global error handler registered');
}

/**
 * Creates a safe error for logging that removes sensitive data
 *
 * @param error - Error to sanitize
 * @returns Sanitized error object
 */
export function sanitizeErrorForLogging(error: Error): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  };

  if (error instanceof BaseError) {
    sanitized.statusCode = error.statusCode;
    sanitized.isOperational = error.isOperational;
    sanitized.timestamp = error.timestamp;

    // Remove sensitive context fields
    if (error.context) {
      const { password, token, apiKey, secret, ...safeContext } = error.context as any;
      sanitized.context = safeContext;
    }
  }

  // Include stack trace only in development
  if (process.env.NODE_ENV !== 'production') {
    sanitized.stack = error.stack;
  }

  return sanitized;
}
