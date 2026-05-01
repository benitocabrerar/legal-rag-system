/**
 * Centralized Error Handler Middleware
 * Implements hierarchical error handling with secure error responses
 *
 * @module middleware/error-handler
 * @version 1.0.0
 */

import { FastifyInstance, FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import crypto from 'crypto';

/**
 * Application Error Hierarchy
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly errorId: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();
    this.errorId = crypto.randomBytes(8).toString('hex');
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error - 400
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

/**
 * Authentication Error - 401
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
  }
}

/**
 * Authorization Error - 403
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR', true);
  }
}

/**
 * Not Found Error - 404
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND', true);
  }
}

/**
 * Conflict Error - 409
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

/**
 * Rate Limit Error - 429
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60) {
    super('Too many requests', 429, 'RATE_LIMIT_EXCEEDED', true);
    this.retryAfter = retryAfter;
  }
}

/**
 * External Service Error - 502/503
 */
export class ExternalServiceError extends AppError {
  public readonly serviceName: string;

  constructor(serviceName: string, message?: string) {
    super(
      message || `External service error: ${serviceName}`,
      503,
      'EXTERNAL_SERVICE_ERROR',
      true
    );
    this.serviceName = serviceName;
  }
}

/**
 * Database Error - 500
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR', true);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    errorId: string;
    timestamp: string;
    details?: Record<string, unknown>;
    stack?: string;
  };
}

/**
 * Formats error for response based on environment
 */
function formatErrorResponse(
  error: AppError | Error,
  includeStack: boolean = false
): ErrorResponse {
  const isAppError = error instanceof AppError;
  const errorId = isAppError ? error.errorId : crypto.randomBytes(8).toString('hex');

  const response: ErrorResponse = {
    success: false,
    error: {
      code: isAppError ? error.code : 'INTERNAL_ERROR',
      message: isAppError ? error.message : 'An unexpected error occurred',
      errorId,
      timestamp: isAppError ? error.timestamp.toISOString() : new Date().toISOString()
    }
  };

  if (isAppError && error.details) {
    response.error.details = error.details;
  }

  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
}

/**
 * Determines HTTP status code from error
 */
function getStatusCode(error: Error | FastifyError): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  // Fastify validation errors
  if ('validation' in error) {
    return 400;
  }

  // Fastify errors with statusCode
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  return 500;
}

/**
 * Checks if error should be reported to monitoring
 */
function shouldReportError(error: Error): boolean {
  if (error instanceof AppError) {
    // Don't report operational errors with 4xx status
    return !error.isOperational || error.statusCode >= 500;
  }
  return true;
}

/**
 * Error Handler Plugin
 */
async function errorHandlerPlugin(
  fastify: FastifyInstance,
  options: { includeStackInDev?: boolean } = {}
): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const includeStack = !isProduction && (options.includeStackInDev ?? true);

  // Global error handler
  fastify.setErrorHandler(async (
    error: FastifyError | Error,
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const statusCode = getStatusCode(error);
    const isAppError = error instanceof AppError;
    const errorId = isAppError ? error.errorId : crypto.randomBytes(8).toString('hex');

    // Log error with context
    const logContext = {
      errorId,
      statusCode,
      code: isAppError ? error.code : 'UNKNOWN',
      path: request.url,
      method: request.method,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: (request as any).user?.id
    };

    if (shouldReportError(error)) {
      fastify.log.error({ ...logContext, err: error }, `[ErrorHandler] ${error.message}`);
    } else {
      fastify.log.warn(logContext, `[ErrorHandler] ${error.message}`);
    }

    // Handle Fastify validation errors
    if ('validation' in error && Array.isArray((error as any).validation)) {
      const validationError = new ValidationError('Validation failed', {
        errors: (error as any).validation
      });
      const response = formatErrorResponse(validationError, includeStack);
      return reply.status(400).send(response);
    }

    // Handle rate limit errors
    if (error instanceof RateLimitError) {
      reply.header('Retry-After', error.retryAfter.toString());
    }

    // Build response
    let responseError: AppError | Error = error;

    // In production, hide internal error details
    if (isProduction && !isAppError) {
      responseError = new AppError(
        'An unexpected error occurred',
        500,
        'INTERNAL_ERROR',
        false
      );
    }

    const response = formatErrorResponse(responseError, includeStack);

    // Send response
    return reply.status(statusCode).send(response);
  });

  // Not found handler
  fastify.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const error = new NotFoundError('Endpoint');
    const response = formatErrorResponse(error, includeStack);

    fastify.log.warn({
      errorId: error.errorId,
      path: request.url,
      method: request.method
    }, '[ErrorHandler] Route not found');

    return reply.status(404).send(response);
  });

  fastify.log.info('[Error Handler] Middleware initialized');
}

/**
 * Export as Fastify plugin
 */
export const errorHandler = fp(errorHandlerPlugin, {
  name: 'error-handler',
  fastify: '4.x'
});

/**
 * Utility to wrap async handlers for consistent error handling
 */
export function asyncHandler<T>(
  fn: (request: FastifyRequest, reply: FastifyReply) => Promise<T>
): (request: FastifyRequest, reply: FastifyReply) => Promise<T> {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await fn(request, reply);
    } catch (error) {
      throw error; // Let the error handler deal with it
    }
  };
}

/**
 * Creates an error from a Prisma error
 */
export function fromPrismaError(error: any): AppError {
  const code = error.code;

  switch (code) {
    case 'P2002':
      return new ConflictError('A record with this value already exists', {
        fields: error.meta?.target
      });
    case 'P2025':
      return new NotFoundError('Record');
    case 'P2003':
      return new ValidationError('Foreign key constraint failed', {
        field: error.meta?.field_name
      });
    case 'P2014':
      return new ValidationError('Required relation violation');
    default:
      return new DatabaseError(error.message);
  }
}

export default errorHandler;
