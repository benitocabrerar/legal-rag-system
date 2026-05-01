/**
 * Business Logic Errors
 * Week 3-4: Medium Priority - Error Handling Enhancement
 *
 * Custom error classes for business-specific error scenarios
 * that are operational and expected during normal operation.
 */

import { BaseError } from './base-error.js';

/**
 * Thrown when a user doesn't have sufficient credits for an operation
 */
export class InsufficientCreditsError extends BaseError {
  public readonly required: number;
  public readonly available: number;

  constructor(required: number, available: number, context?: Record<string, unknown>) {
    super(
      `Insufficient credits. Required: ${required}, Available: ${available}`,
      402, // Payment Required
      true,
      { required, available, ...context }
    );
    this.required = required;
    this.available = available;
  }

  public getClientMessage(): string {
    return `You need ${this.required} credits but only have ${this.available} available. Please upgrade your plan or purchase more credits.`;
  }
}

/**
 * Thrown when document processing fails
 */
export class DocumentProcessingError extends BaseError {
  public readonly documentId?: string;
  public readonly stage: string;

  constructor(
    message: string,
    stage: string,
    documentId?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      422, // Unprocessable Entity
      true,
      { documentId, stage, ...context }
    );
    this.documentId = documentId;
    this.stage = stage;
  }

  public getClientMessage(): string {
    return `Document processing failed during ${this.stage}. Please try again or contact support.`;
  }
}

/**
 * Thrown when embedding generation fails
 */
export class EmbeddingGenerationError extends BaseError {
  public readonly chunkIndex?: number;
  public readonly totalChunks?: number;

  constructor(
    message: string,
    chunkIndex?: number,
    totalChunks?: number,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      502, // Bad Gateway (external service failure)
      true,
      { chunkIndex, totalChunks, ...context }
    );
    this.chunkIndex = chunkIndex;
    this.totalChunks = totalChunks;
  }

  public getClientMessage(): string {
    if (this.chunkIndex !== undefined && this.totalChunks !== undefined) {
      return `Embedding generation failed at chunk ${this.chunkIndex + 1} of ${this.totalChunks}. Please retry.`;
    }
    return 'Embedding generation failed. Please retry the operation.';
  }
}

/**
 * Thrown when a search query is invalid or cannot be processed
 */
export class InvalidQueryError extends BaseError {
  public readonly query: string;
  public readonly reason: string;

  constructor(query: string, reason: string, context?: Record<string, unknown>) {
    super(
      `Invalid query: ${reason}`,
      400,
      true,
      { query, reason, ...context }
    );
    this.query = query;
    this.reason = reason;
  }

  public getClientMessage(): string {
    return `Your search query could not be processed: ${this.reason}. Please modify your query and try again.`;
  }
}

/**
 * Thrown when a document is not found
 */
export class DocumentNotFoundError extends BaseError {
  public readonly documentId: string;

  constructor(documentId: string, context?: Record<string, unknown>) {
    super(
      `Document not found: ${documentId}`,
      404,
      true,
      { documentId, ...context }
    );
    this.documentId = documentId;
  }

  public getClientMessage(): string {
    return 'The requested document could not be found. It may have been deleted or you may not have access.';
  }
}

/**
 * Thrown when user quota is exceeded
 */
export class QuotaExceededError extends BaseError {
  public readonly quotaType: string;
  public readonly limit: number;
  public readonly current: number;
  public readonly resetAt?: Date;

  constructor(
    quotaType: string,
    limit: number,
    current: number,
    resetAt?: Date,
    context?: Record<string, unknown>
  ) {
    super(
      `${quotaType} quota exceeded. Limit: ${limit}, Current: ${current}`,
      429,
      true,
      { quotaType, limit, current, resetAt: resetAt?.toISOString(), ...context }
    );
    this.quotaType = quotaType;
    this.limit = limit;
    this.current = current;
    this.resetAt = resetAt;
  }

  public getClientMessage(): string {
    const resetMessage = this.resetAt
      ? ` Your quota will reset at ${this.resetAt.toISOString()}.`
      : '';
    return `You have exceeded your ${this.quotaType} quota (${this.current}/${this.limit}).${resetMessage}`;
  }
}

/**
 * Thrown when a subscription operation fails
 */
export class SubscriptionError extends BaseError {
  public readonly subscriptionId?: string;
  public readonly operation: string;

  constructor(
    message: string,
    operation: string,
    subscriptionId?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      402,
      true,
      { subscriptionId, operation, ...context }
    );
    this.subscriptionId = subscriptionId;
    this.operation = operation;
  }

  public getClientMessage(): string {
    return `Subscription ${this.operation} failed. Please check your payment method or contact support.`;
  }
}

/**
 * Thrown when NLP processing fails
 */
export class NLPProcessingError extends BaseError {
  public readonly stage: string;
  public readonly inputLength?: number;

  constructor(
    message: string,
    stage: string,
    inputLength?: number,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      422,
      true,
      { stage, inputLength, ...context }
    );
    this.stage = stage;
    this.inputLength = inputLength;
  }

  public getClientMessage(): string {
    return `Natural language processing failed during ${this.stage}. Please simplify your query and try again.`;
  }
}

/**
 * Type guard for business errors
 */
export function isBusinessError(error: unknown): error is BaseError {
  return (
    error instanceof InsufficientCreditsError ||
    error instanceof DocumentProcessingError ||
    error instanceof EmbeddingGenerationError ||
    error instanceof InvalidQueryError ||
    error instanceof DocumentNotFoundError ||
    error instanceof QuotaExceededError ||
    error instanceof SubscriptionError ||
    error instanceof NLPProcessingError
  );
}
