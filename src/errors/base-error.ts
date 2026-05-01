/**
 * Base Error Class Hierarchy
 *
 * Abstract base class for all application errors. Provides a consistent
 * interface for error handling with proper typing and serialization support.
 *
 * Features:
 * - HTTP status code mapping
 * - Operational vs programming error distinction
 * - Request ID tracking for distributed tracing
 * - Timestamp for logging and debugging
 * - JSON serialization for API responses
 *
 * @example
 * class CustomError extends BaseError {
 *   constructor(message: string) {
 *     super(message, 400, true);
 *   }
 * }
 */

export abstract class BaseError extends Error {
  /**
   * HTTP status code for this error type
   */
  public readonly statusCode: number;

  /**
   * Indicates if this is an operational error (expected) vs programming error (bug)
   * Operational errors: user input, network issues, external services
   * Programming errors: null reference, type errors, logic bugs
   */
  public readonly isOperational: boolean;

  /**
   * When the error occurred
   */
  public readonly timestamp: Date;

  /**
   * Request ID for distributed tracing
   */
  public requestId?: string;

  /**
   * Additional error context/metadata
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Creates a new BaseError instance
   *
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code (defaults to 500)
   * @param isOperational - Whether this is an expected operational error (defaults to true)
   * @param context - Additional error context for debugging
   */
  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;

    // Set prototype explicitly to ensure instanceof checks work correctly
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Serializes the error to a JSON-friendly format
   *
   * @returns Object suitable for JSON.stringify and API responses
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      ...(this.context && { context: this.context }),
      // Include stack trace only in development
      ...(process.env.NODE_ENV !== 'production' && { stack: this.stack }),
    };
  }

  /**
   * Determines if an error is operational
   *
   * @param error - Error to check
   * @returns true if the error is operational
   */
  public static isOperational(error: Error): boolean {
    if (error instanceof BaseError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Extracts a safe error message for client responses
   * Removes sensitive information in production
   *
   * @param sanitize - Whether to sanitize the message (recommended in production)
   * @returns Safe error message
   */
  public getClientMessage(sanitize: boolean = false): string {
    if (sanitize && !this.isOperational) {
      return 'An unexpected error occurred. Please try again later.';
    }
    return this.message;
  }
}
