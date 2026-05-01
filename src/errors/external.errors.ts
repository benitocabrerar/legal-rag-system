/**
 * External Service Errors
 * Week 3-4: Medium Priority - Error Handling Enhancement
 *
 * Custom error classes for external service failures
 * (OpenAI, Database, Redis, Firecrawl, etc.)
 */

import { BaseError } from './base-error.js';

/**
 * Base class for all external service errors
 */
export abstract class ExternalServiceError extends BaseError {
  public readonly serviceName: string;
  public readonly retryable: boolean;
  public readonly retryAfterMs?: number;

  constructor(
    serviceName: string,
    message: string,
    statusCode: number = 502,
    retryable: boolean = true,
    retryAfterMs?: number,
    context?: Record<string, unknown>
  ) {
    super(message, statusCode, true, { serviceName, retryable, retryAfterMs, ...context });
    this.serviceName = serviceName;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }

  public getClientMessage(): string {
    if (this.retryable) {
      return `External service (${this.serviceName}) temporarily unavailable. Please try again.`;
    }
    return `External service (${this.serviceName}) error. Please contact support if the issue persists.`;
  }
}

/**
 * OpenAI API Errors
 */
export class OpenAIError extends ExternalServiceError {
  public readonly apiErrorType?: string;
  public readonly apiErrorCode?: string;

  constructor(
    message: string,
    apiErrorType?: string,
    apiErrorCode?: string,
    retryable: boolean = true,
    context?: Record<string, unknown>
  ) {
    // Determine status code based on error type
    let statusCode = 502;
    if (apiErrorType === 'rate_limit_exceeded') statusCode = 429;
    if (apiErrorType === 'invalid_request_error') statusCode = 400;
    if (apiErrorType === 'authentication_error') statusCode = 401;

    super('OpenAI', message, statusCode, retryable, undefined, {
      apiErrorType,
      apiErrorCode,
      ...context,
    });
    this.apiErrorType = apiErrorType;
    this.apiErrorCode = apiErrorCode;
  }

  public getClientMessage(): string {
    if (this.apiErrorType === 'rate_limit_exceeded') {
      return 'AI service is currently busy. Please try again in a few moments.';
    }
    if (this.apiErrorType === 'context_length_exceeded') {
      return 'Your query is too long. Please shorten it and try again.';
    }
    return 'AI processing temporarily unavailable. Please try again.';
  }

  /**
   * Create from OpenAI API error response
   */
  static fromAPIError(error: any): OpenAIError {
    const errorType = error?.error?.type || error?.type;
    const errorCode = error?.error?.code || error?.code;
    const message = error?.error?.message || error?.message || 'Unknown OpenAI error';

    const retryable = !['invalid_request_error', 'authentication_error'].includes(errorType);

    return new OpenAIError(message, errorType, errorCode, retryable, {
      originalError: error,
    });
  }
}

/**
 * Database (PostgreSQL/Prisma) Errors
 */
export class DatabaseError extends ExternalServiceError {
  public readonly errorCode?: string;
  public readonly table?: string;
  public readonly constraint?: string;

  constructor(
    message: string,
    errorCode?: string,
    table?: string,
    constraint?: string,
    retryable: boolean = false,
    context?: Record<string, unknown>
  ) {
    // Determine status code based on error type
    let statusCode = 500;
    if (errorCode === 'P2002') statusCode = 409; // Unique constraint violation
    if (errorCode === 'P2025') statusCode = 404; // Record not found

    super('Database', message, statusCode, retryable, undefined, {
      errorCode,
      table,
      constraint,
      ...context,
    });
    this.errorCode = errorCode;
    this.table = table;
    this.constraint = constraint;
  }

  public getClientMessage(): string {
    if (this.errorCode === 'P2002') {
      return 'A record with this information already exists.';
    }
    if (this.errorCode === 'P2025') {
      return 'The requested record could not be found.';
    }
    if (this.errorCode === 'P2003') {
      return 'This operation would violate data integrity. Please check related records.';
    }
    return 'Database operation failed. Please try again.';
  }

  /**
   * Create from Prisma error
   */
  static fromPrismaError(error: any): DatabaseError {
    const code = error?.code;
    const meta = error?.meta || {};
    const table = meta.modelName || meta.target?.[0];
    const constraint = meta.target?.join(', ');

    let message = error?.message || 'Database error';
    let retryable = false;

    // Handle specific Prisma error codes
    switch (code) {
      case 'P2002':
        message = `Unique constraint violation on ${constraint || 'field'}`;
        break;
      case 'P2025':
        message = 'Record not found';
        break;
      case 'P2003':
        message = `Foreign key constraint failed on ${constraint || 'field'}`;
        break;
      case 'P2024':
        message = 'Connection pool timeout';
        retryable = true;
        break;
      case 'P2028':
        message = 'Transaction error';
        retryable = true;
        break;
    }

    return new DatabaseError(message, code, table, constraint, retryable, {
      originalError: error,
    });
  }
}

/**
 * Redis Errors
 */
export class RedisError extends ExternalServiceError {
  public readonly operation?: string;

  constructor(
    message: string,
    operation?: string,
    retryable: boolean = true,
    context?: Record<string, unknown>
  ) {
    super('Redis', message, 503, retryable, 1000, { operation, ...context });
    this.operation = operation;
  }

  public getClientMessage(): string {
    return 'Cache service temporarily unavailable. Requests may be slower than usual.';
  }

  /**
   * Create connection error
   */
  static connectionError(message: string = 'Failed to connect to Redis'): RedisError {
    return new RedisError(message, 'connect', true);
  }

  /**
   * Create timeout error
   */
  static timeoutError(operation: string): RedisError {
    return new RedisError(`Redis operation timed out: ${operation}`, operation, true);
  }
}

/**
 * Firecrawl API Errors
 */
export class FirecrawlError extends ExternalServiceError {
  public readonly url?: string;
  public readonly crawlId?: string;

  constructor(
    message: string,
    url?: string,
    crawlId?: string,
    retryable: boolean = true,
    context?: Record<string, unknown>
  ) {
    super('Firecrawl', message, 502, retryable, undefined, { url, crawlId, ...context });
    this.url = url;
    this.crawlId = crawlId;
  }

  public getClientMessage(): string {
    return 'Web scraping service temporarily unavailable. Please try again later.';
  }

  /**
   * Create from API response
   */
  static fromResponse(response: any, url?: string): FirecrawlError {
    const message = response?.error || response?.message || 'Firecrawl operation failed';
    const crawlId = response?.crawlId;
    return new FirecrawlError(message, url, crawlId);
  }
}

/**
 * S3/Storage Errors
 */
export class StorageError extends ExternalServiceError {
  public readonly bucket?: string;
  public readonly key?: string;
  public readonly operation: string;

  constructor(
    message: string,
    operation: string,
    bucket?: string,
    key?: string,
    retryable: boolean = true,
    context?: Record<string, unknown>
  ) {
    super('S3/Storage', message, 502, retryable, undefined, {
      bucket,
      key,
      operation,
      ...context,
    });
    this.bucket = bucket;
    this.key = key;
    this.operation = operation;
  }

  public getClientMessage(): string {
    if (this.operation === 'upload') {
      return 'File upload failed. Please try again.';
    }
    if (this.operation === 'download') {
      return 'File download failed. Please try again.';
    }
    return 'Storage operation failed. Please try again.';
  }
}

/**
 * Email Service Errors
 */
export class EmailServiceError extends ExternalServiceError {
  public readonly recipient?: string;
  public readonly templateId?: string;

  constructor(
    message: string,
    recipient?: string,
    templateId?: string,
    retryable: boolean = true,
    context?: Record<string, unknown>
  ) {
    super('Email', message, 502, retryable, 5000, { recipient, templateId, ...context });
    this.recipient = recipient;
    this.templateId = templateId;
  }

  public getClientMessage(): string {
    return 'Email delivery is temporarily delayed. The email will be sent shortly.';
  }
}

/**
 * Type guard for external service errors
 */
export function isExternalServiceError(error: unknown): error is ExternalServiceError {
  return (
    error instanceof OpenAIError ||
    error instanceof DatabaseError ||
    error instanceof RedisError ||
    error instanceof FirecrawlError ||
    error instanceof StorageError ||
    error instanceof EmailServiceError
  );
}

/**
 * Check if an external error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ExternalServiceError) {
    return error.retryable;
  }
  return false;
}

/**
 * Get retry delay for an error (in milliseconds)
 */
export function getRetryDelay(error: unknown, attempt: number = 1): number {
  const baseDelay = 1000;
  const maxDelay = 30000;

  if (error instanceof ExternalServiceError && error.retryAfterMs) {
    return Math.min(error.retryAfterMs * attempt, maxDelay);
  }

  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, maxDelay);
}
