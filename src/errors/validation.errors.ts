/**
 * Validation Errors
 * Week 3-4: Medium Priority - Error Handling Enhancement
 *
 * Custom error classes for input validation failures
 * using Zod and custom validation rules.
 */

import { ZodError, ZodIssue } from 'zod';
import { BaseError } from './base-error.js';

/**
 * Represents a single validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  received?: unknown;
  expected?: string;
}

/**
 * Thrown when Zod schema validation fails
 */
export class ZodValidationError extends BaseError {
  public readonly errors: ValidationErrorDetail[];
  public readonly originalError: ZodError;

  constructor(zodError: ZodError, context?: Record<string, unknown>) {
    const errors = ZodValidationError.parseZodError(zodError);
    const message = `Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`;

    super(
      message,
      422, // Unprocessable Entity
      true,
      { validationErrors: errors, ...context }
    );

    this.errors = errors;
    this.originalError = zodError;
  }

  /**
   * Parse ZodError into structured validation error details
   */
  private static parseZodError(zodError: ZodError): ValidationErrorDetail[] {
    return zodError.errors.map((issue: ZodIssue) => ({
      field: issue.path.join('.') || 'root',
      message: issue.message,
      code: issue.code,
      received: 'received' in issue ? issue.received : undefined,
      expected: 'expected' in issue ? String(issue.expected) : undefined,
    }));
  }

  public getClientMessage(): string {
    if (this.errors.length === 1) {
      return `Invalid input: ${this.errors[0].message} (field: ${this.errors[0].field})`;
    }
    return `Invalid input: ${this.errors.length} validation errors. Please check your request.`;
  }

  /**
   * Get errors for a specific field
   */
  public getFieldErrors(field: string): ValidationErrorDetail[] {
    return this.errors.filter(e => e.field === field || e.field.startsWith(`${field}.`));
  }

  /**
   * Check if a specific field has errors
   */
  public hasFieldError(field: string): boolean {
    return this.getFieldErrors(field).length > 0;
  }

  /**
   * Get all error fields
   */
  public getErrorFields(): string[] {
    return [...new Set(this.errors.map(e => e.field))];
  }
}

/**
 * Thrown when custom validation rules fail (non-Zod)
 */
export class CustomValidationError extends BaseError {
  public readonly errors: ValidationErrorDetail[];

  constructor(errors: ValidationErrorDetail[], context?: Record<string, unknown>) {
    const message = `Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`;

    super(
      message,
      422,
      true,
      { validationErrors: errors, ...context }
    );

    this.errors = errors;
  }

  public getClientMessage(): string {
    if (this.errors.length === 1) {
      return `Validation error: ${this.errors[0].message}`;
    }
    return `Multiple validation errors: ${this.errors.map(e => e.message).join('; ')}`;
  }

  /**
   * Create from a single validation error
   */
  static single(field: string, message: string, code: string = 'custom'): CustomValidationError {
    return new CustomValidationError([{ field, message, code }]);
  }

  /**
   * Create from field-message pairs
   */
  static fromObject(errors: Record<string, string>): CustomValidationError {
    const details = Object.entries(errors).map(([field, message]) => ({
      field,
      message,
      code: 'custom',
    }));
    return new CustomValidationError(details);
  }
}

/**
 * Thrown when request body is missing or malformed
 */
export class MalformedRequestError extends BaseError {
  public readonly expectedFormat: string;

  constructor(
    message: string,
    expectedFormat: string = 'JSON',
    context?: Record<string, unknown>
  ) {
    super(
      message,
      400,
      true,
      { expectedFormat, ...context }
    );
    this.expectedFormat = expectedFormat;
  }

  public getClientMessage(): string {
    return `Invalid request format. Expected ${this.expectedFormat} body.`;
  }
}

/**
 * Thrown when required fields are missing
 */
export class MissingFieldsError extends BaseError {
  public readonly missingFields: string[];

  constructor(missingFields: string[], context?: Record<string, unknown>) {
    super(
      `Missing required fields: ${missingFields.join(', ')}`,
      400,
      true,
      { missingFields, ...context }
    );
    this.missingFields = missingFields;
  }

  public getClientMessage(): string {
    if (this.missingFields.length === 1) {
      return `Missing required field: ${this.missingFields[0]}`;
    }
    return `Missing required fields: ${this.missingFields.join(', ')}`;
  }
}

/**
 * Thrown when a field value is out of allowed range
 */
export class RangeValidationError extends BaseError {
  public readonly field: string;
  public readonly value: number;
  public readonly min?: number;
  public readonly max?: number;

  constructor(
    field: string,
    value: number,
    min?: number,
    max?: number,
    context?: Record<string, unknown>
  ) {
    let message = `Field '${field}' value ${value} is out of range`;
    if (min !== undefined && max !== undefined) {
      message = `Field '${field}' must be between ${min} and ${max}, got ${value}`;
    } else if (min !== undefined) {
      message = `Field '${field}' must be at least ${min}, got ${value}`;
    } else if (max !== undefined) {
      message = `Field '${field}' must be at most ${max}, got ${value}`;
    }

    super(message, 400, true, { field, value, min, max, ...context });
    this.field = field;
    this.value = value;
    this.min = min;
    this.max = max;
  }

  public getClientMessage(): string {
    return this.message;
  }
}

/**
 * Type guard for validation errors
 */
export function isValidationError(error: unknown): boolean {
  return (
    error instanceof ZodValidationError ||
    error instanceof CustomValidationError ||
    error instanceof MalformedRequestError ||
    error instanceof MissingFieldsError ||
    error instanceof RangeValidationError
  );
}

/**
 * Helper function to create ZodValidationError from ZodError
 */
export function fromZodError(error: ZodError, context?: Record<string, unknown>): ZodValidationError {
  return new ZodValidationError(error, context);
}
