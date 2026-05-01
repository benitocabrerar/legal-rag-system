/**
 * Response Formatter Utility
 *
 * Provides standardized response formats for all API endpoints.
 * Ensures consistent data structure across the entire application.
 *
 * Response Envelope Structure:
 * {
 *   success: boolean,
 *   data?: T,
 *   meta?: object,
 *   errors?: array
 * }
 *
 * Benefits:
 * - Consistent client-side parsing
 * - Easy error detection
 * - Standardized pagination
 * - Metadata support for additional context
 */

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Response metadata (can include pagination, timing, etc.)
 */
export interface ResponseMeta extends Partial<PaginationMeta> {
  timestamp?: string;
  requestId?: string;
  version?: number;
  [key: string]: unknown;
}

/**
 * Success response structure
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

/**
 * Error detail structure
 */
export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
  value?: unknown;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    errors?: ErrorDetail[];
  };
  meta?: ResponseMeta;
}

/**
 * Generic API response (success or error)
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Creates a successful response
 *
 * @param data - Response data
 * @param meta - Optional metadata
 * @returns Formatted success response
 *
 * @example
 * return reply.send(success({ id: 1, name: 'Document' }));
 * return reply.send(success(documents, { page: 1, total: 100 }));
 */
export function success<T>(data: T, meta?: ResponseMeta): SuccessResponse<T> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = {
      timestamp: new Date().toISOString(),
      ...meta,
    };
  }

  return response;
}

/**
 * Creates an error response
 *
 * @param message - Error message
 * @param errors - Optional array of detailed errors
 * @param code - Optional error code
 * @param meta - Optional metadata
 * @returns Formatted error response
 *
 * @example
 * return reply.status(400).send(error('Invalid input'));
 * return reply.status(422).send(error('Validation failed', [
 *   { field: 'email', message: 'Invalid email format' }
 * ]));
 */
export function error(
  message: string,
  errors?: ErrorDetail[],
  code?: string,
  meta?: ResponseMeta
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: {
      message,
      ...(code && { code }),
      ...(errors && { errors }),
    },
  };

  if (meta) {
    response.meta = {
      timestamp: new Date().toISOString(),
      ...meta,
    };
  }

  return response;
}

/**
 * Creates a paginated response
 *
 * @param data - Array of items
 * @param pagination - Pagination metadata
 * @param additionalMeta - Additional metadata
 * @returns Formatted paginated response
 *
 * @example
 * return reply.send(paginated(documents, {
 *   page: 1,
 *   limit: 10,
 *   total: 100,
 *   totalPages: 10,
 *   hasNextPage: true,
 *   hasPrevPage: false
 * }));
 */
export function paginated<T>(
  data: T[],
  pagination: PaginationMeta,
  additionalMeta?: Omit<ResponseMeta, keyof PaginationMeta>
): SuccessResponse<T[]> {
  return success(data, {
    ...pagination,
    ...additionalMeta,
  });
}

/**
 * Calculates pagination metadata
 *
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata
 *
 * @example
 * const paginationMeta = calculatePagination(1, 10, 95);
 * // Returns: { page: 1, limit: 10, total: 95, totalPages: 10, hasNextPage: true, hasPrevPage: false }
 */
export function calculatePagination(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Creates a response for a single created resource
 *
 * @param data - Created resource
 * @param resourceId - ID of the created resource
 * @param meta - Optional metadata
 * @returns Success response with created resource
 *
 * @example
 * return reply.status(201).send(created(newDocument, newDocument.id));
 */
export function created<T>(data: T, resourceId?: string | number, meta?: ResponseMeta): SuccessResponse<T> {
  return success(data, {
    ...meta,
    resourceId,
  });
}

/**
 * Creates a response for successful updates
 *
 * @param data - Updated resource
 * @param meta - Optional metadata
 * @returns Success response
 *
 * @example
 * return reply.send(updated(document));
 */
export function updated<T>(data: T, meta?: ResponseMeta): SuccessResponse<T> {
  return success(data, meta);
}

/**
 * Creates a response for successful deletions
 *
 * @param resourceId - ID of deleted resource
 * @param meta - Optional metadata
 * @returns Success response
 *
 * @example
 * return reply.send(deleted(documentId));
 */
export function deleted(
  resourceId: string | number,
  meta?: ResponseMeta
): SuccessResponse<{ deleted: true; id: string | number }> {
  return success(
    {
      deleted: true,
      id: resourceId,
    },
    meta
  );
}

/**
 * Creates a response for empty/no content
 *
 * @param meta - Optional metadata
 * @returns Success response with null data
 *
 * @example
 * return reply.status(204).send(noContent());
 */
export function noContent(meta?: ResponseMeta): SuccessResponse<null> {
  return success(null, meta);
}

/**
 * Creates a list response (non-paginated)
 *
 * @param data - Array of items
 * @param meta - Optional metadata
 * @returns Success response with array
 *
 * @example
 * return reply.send(list(documents, { count: documents.length }));
 */
export function list<T>(data: T[], meta?: ResponseMeta): SuccessResponse<T[]> {
  return success(data, {
    count: data.length,
    ...meta,
  });
}

/**
 * Helper to format Prisma pagination results
 *
 * @param results - Query results from Prisma
 * @param page - Current page
 * @param limit - Items per page
 * @param total - Total count
 * @returns Paginated response
 *
 * @example
 * const documents = await prisma.document.findMany({ skip, take: limit });
 * const total = await prisma.document.count();
 * return reply.send(formatPrismaResults(documents, page, limit, total));
 */
export function formatPrismaResults<T>(
  results: T[],
  page: number,
  limit: number,
  total: number
): SuccessResponse<T[]> {
  const paginationMeta = calculatePagination(page, limit, total);
  return paginated(results, paginationMeta);
}

/**
 * Helper to extract pagination params from request query
 *
 * @param query - Request query object
 * @returns Parsed pagination parameters
 *
 * @example
 * const { page, limit, skip } = extractPaginationParams(request.query);
 * const results = await prisma.document.findMany({ skip, take: limit });
 */
export function extractPaginationParams(query: any): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Type guard to check if response is successful
 *
 * @param response - API response
 * @returns true if response is successful
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 *
 * @param response - API response
 * @returns true if response is an error
 */
export function isErrorResponse(response: ApiResponse): response is ErrorResponse {
  return response.success === false;
}

/**
 * Wraps async route handlers to automatically format responses
 *
 * @param handler - Async handler function that returns data
 * @returns Wrapped handler that returns formatted response
 *
 * @example
 * fastify.get('/documents', wrap(async (request) => {
 *   const documents = await getDocuments();
 *   return documents; // Automatically wrapped in success()
 * }));
 */
export function wrap<T>(
  handler: (request: any, reply: any) => Promise<T>
): (request: any, reply: any) => Promise<SuccessResponse<T>> {
  return async (request, reply) => {
    const data = await handler(request, reply);
    return success(data);
  };
}

/**
 * Health check response format
 *
 * @param status - Health status
 * @param checks - Individual service checks
 * @returns Formatted health check response
 *
 * @example
 * return reply.send(healthCheck('healthy', {
 *   database: { status: 'healthy', latency: 10 },
 *   redis: { status: 'healthy', latency: 5 }
 * }));
 */
export function healthCheck(
  status: 'healthy' | 'degraded' | 'unhealthy',
  checks: Record<string, { status: string; latency?: number; error?: string }>
): SuccessResponse<{
  status: string;
  checks: Record<string, { status: string; latency?: number; error?: string }>;
}> {
  return success(
    {
      status,
      checks,
    },
    {
      timestamp: new Date().toISOString(),
    }
  );
}

/**
 * Batch operation response format
 *
 * @param successful - Number of successful operations
 * @param failed - Number of failed operations
 * @param errors - Optional array of errors
 * @returns Formatted batch response
 *
 * @example
 * return reply.send(batchResult(8, 2, [
 *   { id: 'doc-5', error: 'Not found' }
 * ]));
 */
export function batchResult(
  successful: number,
  failed: number,
  errors?: Array<{ id: string | number; error: string }>
): SuccessResponse<{
  successful: number;
  failed: number;
  total: number;
  errors?: Array<{ id: string | number; error: string }>;
}> {
  return success({
    successful,
    failed,
    total: successful + failed,
    ...(errors && errors.length > 0 && { errors }),
  });
}
