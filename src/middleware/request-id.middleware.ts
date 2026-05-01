/**
 * Request ID Middleware
 *
 * Generates and tracks unique request identifiers for distributed tracing.
 * Essential for correlating logs, errors, and monitoring data across services.
 *
 * Features:
 * - Auto-generates UUIDs if not provided
 * - Honors X-Request-ID header from clients/load balancers
 * - Adds request ID to request object and response headers
 * - Makes ID available in request context for logging
 *
 * Header Support:
 * - X-Request-ID (primary)
 * - X-Correlation-ID (fallback)
 * - Request-ID (fallback)
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

/**
 * Headers to check for existing request ID (in order of preference)
 */
const REQUEST_ID_HEADERS = ['x-request-id', 'x-correlation-id', 'request-id'] as const;

/**
 * Response header name for request ID
 */
const RESPONSE_HEADER = 'X-Request-ID';

/**
 * Augment Fastify request type to include id
 */
declare module 'fastify' {
  interface FastifyRequest {
    id: string;
  }
}

/**
 * Extracts request ID from headers
 *
 * @param request - Fastify request object
 * @returns Existing request ID or undefined
 */
function extractRequestIdFromHeaders(request: FastifyRequest): string | undefined {
  for (const header of REQUEST_ID_HEADERS) {
    const value = request.headers[header];
    if (value && typeof value === 'string') {
      // Validate that it looks like a UUID or valid ID
      if (value.match(/^[a-f0-9-]{8,}$/i)) {
        return value;
      }
    }
  }
  return undefined;
}

/**
 * Generates a new UUID v4 request ID
 *
 * @returns UUID string
 */
function generateRequestId(): string {
  return randomUUID();
}

/**
 * Request ID middleware
 *
 * Extracts or generates a request ID and adds it to:
 * - request.id
 * - Response headers (X-Request-ID)
 *
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 */
export async function requestIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Extract existing ID from headers or generate new one
  const requestId = extractRequestIdFromHeaders(request) || generateRequestId();

  // Add to request object
  request.id = requestId;

  // Add to response headers
  reply.header(RESPONSE_HEADER, requestId);

  // Add to any decorators that might exist
  if ('requestContext' in request) {
    (request as any).requestContext = {
      ...(request as any).requestContext,
      requestId,
    };
  }
}

/**
 * Fastify plugin for request ID middleware
 *
 * Registers the middleware as an onRequest hook
 *
 * @param fastify - Fastify instance
 */
export async function requestIdPlugin(fastify: any): Promise<void> {
  // Add onRequest hook
  fastify.addHook('onRequest', requestIdMiddleware);

  // Decorate request with id if not already present
  if (!fastify.hasRequestDecorator('id')) {
    fastify.decorateRequest('id', '');
  }
}

/**
 * Helper to get request ID from request object
 *
 * @param request - Fastify request object
 * @returns Request ID string
 */
export function getRequestId(request: FastifyRequest): string {
  return request.id || 'unknown';
}

/**
 * Validates if a string is a valid request ID format
 *
 * @param id - String to validate
 * @returns true if valid format
 */
export function isValidRequestId(id: string): boolean {
  // Check if it's a UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // Check if it's any valid alphanumeric ID (8+ chars)
  const generalIdRegex = /^[a-f0-9-]{8,}$/i;

  return uuidRegex.test(id) || generalIdRegex.test(id);
}

/**
 * Creates a child request ID for sub-operations
 * Useful for tracking nested operations within a single request
 *
 * @param parentId - Parent request ID
 * @param suffix - Suffix to identify the sub-operation
 * @returns Child request ID
 *
 * @example
 * const childId = createChildRequestId(request.id, 'openai-call');
 * // Returns: "550e8400-e29b-41d4-a716-446655440000-openai-call"
 */
export function createChildRequestId(parentId: string, suffix: string): string {
  return `${parentId}-${suffix}`;
}

/**
 * Extracts parent request ID from a child request ID
 *
 * @param childId - Child request ID
 * @returns Parent request ID
 */
export function extractParentRequestId(childId: string): string {
  const lastDashIndex = childId.lastIndexOf('-');
  if (lastDashIndex === -1) {
    return childId;
  }

  const beforeLastDash = childId.substring(0, lastDashIndex);

  // Check if what's before the last dash is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(beforeLastDash)) {
    return beforeLastDash;
  }

  return childId;
}

/**
 * Type for request context with ID
 */
export interface RequestContext {
  requestId: string;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

/**
 * Creates a request context object with the request ID
 *
 * @param request - Fastify request object
 * @param additionalContext - Additional context data
 * @returns Request context object
 */
export function createRequestContext(
  request: FastifyRequest,
  additionalContext?: Record<string, unknown>
): RequestContext {
  return {
    requestId: getRequestId(request),
    timestamp: new Date(),
    ...additionalContext,
  };
}
