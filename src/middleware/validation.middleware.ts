/**
 * Validation Middleware
 *
 * Provides Zod-based validation middleware for Fastify routes.
 * Validates request body, params, and query parameters.
 *
 * Features:
 * - Type-safe validation with Zod
 * - Detailed field-level error messages
 * - Common reusable schemas
 * - Automatic 422 responses for validation failures
 *
 * @example
 * fastify.post('/users', {
 *   preHandler: validate({ body: createUserSchema })
 * }, async (request, reply) => {
 *   // request.body is now typed and validated
 * });
 */

import type { FastifyRequest, FastifyReply, preHandlerAsyncHookHandler } from 'fastify';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError, type FieldError } from '../errors/http-errors';

/**
 * Validation configuration for different parts of the request
 */
interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
  headers?: ZodSchema;
}

/**
 * Options for validation behavior
 */
interface ValidationOptions {
  /**
   * Whether to strip unknown keys from validated data
   * @default true
   */
  stripUnknown?: boolean;

  /**
   * Whether to abort on first error or collect all errors
   * @default false
   */
  abortEarly?: boolean;
}

/**
 * Converts Zod errors to our FieldError format
 *
 * @param error - Zod validation error
 * @param source - Which part of request failed validation
 * @returns Array of field errors
 */
function formatZodErrors(error: ZodError, source: string): FieldError[] {
  return error.errors.map((err) => ({
    field: err.path.length > 0 ? `${source}.${err.path.join('.')}` : source,
    message: err.message,
    code: err.code,
    ...(err.path.length > 0 && { value: undefined }),
  }));
}

/**
 * Creates a validation middleware for Fastify routes
 *
 * @param schemas - Zod schemas for body, params, query, headers
 * @param options - Validation options
 * @returns Fastify preHandler hook
 *
 * @example
 * const createUserSchema = z.object({
 *   email: z.string().email(),
 *   name: z.string().min(2),
 * });
 *
 * fastify.post('/users', {
 *   preHandler: validate({ body: createUserSchema })
 * }, handler);
 */
export function validate(
  schemas: ValidationSchemas,
  options: ValidationOptions = {}
): preHandlerAsyncHookHandler {
  const { stripUnknown = true, abortEarly = false } = options;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const errors: FieldError[] = [];

    // Validate body
    if (schemas.body) {
      try {
        request.body = schemas.body.parse(request.body);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...formatZodErrors(error, 'body'));
          if (abortEarly) {
            throw new ValidationError(errors, 'Request validation failed');
          }
        } else {
          throw error;
        }
      }
    }

    // Validate params
    if (schemas.params) {
      try {
        request.params = schemas.params.parse(request.params);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...formatZodErrors(error, 'params'));
          if (abortEarly) {
            throw new ValidationError(errors, 'Request validation failed');
          }
        } else {
          throw error;
        }
      }
    }

    // Validate query
    if (schemas.query) {
      try {
        request.query = schemas.query.parse(request.query);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...formatZodErrors(error, 'query'));
          if (abortEarly) {
            throw new ValidationError(errors, 'Request validation failed');
          }
        } else {
          throw error;
        }
      }
    }

    // Validate headers
    if (schemas.headers) {
      try {
        request.headers = schemas.headers.parse(request.headers);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...formatZodErrors(error, 'headers'));
          if (abortEarly) {
            throw new ValidationError(errors, 'Request validation failed');
          }
        } else {
          throw error;
        }
      }
    }

    // If we collected any errors, throw them
    if (errors.length > 0) {
      throw new ValidationError(errors, 'Request validation failed');
    }
  };
}

/**
 * Common reusable validation schemas
 */

/**
 * Standard pagination schema
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, { message: 'Page must be greater than 0' }),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 100, { message: 'Limit must be between 1 and 100' }),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * ID parameter schema (UUID)
 */
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format' }),
});

/**
 * ID parameter schema (numeric)
 */
export const numericIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, { message: 'ID must be a number' })
    .transform((val) => parseInt(val, 10)),
});

/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1, { message: 'Search query is required' }),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10)),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => parseInt(val, 10)),
  filters: z.string().optional(),
});

/**
 * Date range schema
 */
export const dateRangeSchema = z.object({
  startDate: z
    .string()
    .datetime({ message: 'Invalid start date format' })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  endDate: z
    .string()
    .datetime({ message: 'Invalid end date format' })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
});

/**
 * File upload schema
 */
export const fileUploadSchema = z.object({
  filename: z.string().min(1),
  mimetype: z.string().regex(/^[a-z]+\/[a-z0-9\-\+\.]+$/i),
  size: z.number().positive().max(10 * 1024 * 1024, { message: 'File size must not exceed 10MB' }),
});

/**
 * Email schema
 */
export const emailSchema = z.string().email({ message: 'Invalid email format' }).toLowerCase();

/**
 * Password schema with strength requirements
 */
export const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' })
  .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character' });

/**
 * URL schema
 */
export const urlSchema = z.string().url({ message: 'Invalid URL format' });

/**
 * Phone number schema (international format)
 */
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' });

/**
 * Legal document type schema
 */
export const legalDocumentTypeSchema = z.enum([
  'LEY',
  'REGLAMENTO',
  'DECRETO',
  'RESOLUCION',
  'ACUERDO',
  'ORDENANZA',
  'SENTENCIA',
  'OTRO',
]);

/**
 * Document metadata schema
 */
export const documentMetadataSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  documentType: legalDocumentTypeSchema,
  publicationDate: z.string().datetime().optional(),
  sourceUrl: z.string().url().optional(),
  jurisdiction: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Search filters schema for legal documents
 */
export const legalSearchFiltersSchema = z.object({
  documentType: z.array(legalDocumentTypeSchema).optional(),
  jurisdiction: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Helper to validate a single value against a schema
 *
 * @param schema - Zod schema
 * @param value - Value to validate
 * @returns Validated and typed value
 * @throws ValidationError if validation fails
 */
export function validateValue<T>(schema: ZodSchema<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: FieldError[] = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      throw new ValidationError(fieldErrors);
    }
    throw error;
  }
}

/**
 * Safe parse helper that returns a result object instead of throwing
 *
 * @param schema - Zod schema
 * @param value - Value to validate
 * @returns Result object with success flag and data or errors
 */
export function safeValidate<T>(
  schema: ZodSchema<T>,
  value: unknown
): { success: true; data: T } | { success: false; errors: FieldError[] } {
  const result = schema.safeParse(value);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: FieldError[] = result.error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return { success: false, errors: fieldErrors };
}
