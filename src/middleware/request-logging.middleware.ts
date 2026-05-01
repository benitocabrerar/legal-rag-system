/**
 * Request/Response Logging Middleware
 * Week 3-4: Medium Priority - API Security & Reliability
 *
 * Comprehensive logging for HTTP requests and responses
 * with structured logging, correlation IDs, and performance tracking.
 *
 * Features:
 * - Structured JSON logging
 * - Request/Response body logging (configurable)
 * - Performance timing
 * - Correlation ID tracking
 * - Sensitive data redaction
 * - Log level filtering
 */

import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { logger } from '../utils/logger.js';

/**
 * Logging configuration options
 */
export interface RequestLoggingConfig {
  /**
   * Whether to log request bodies (default: false for security)
   */
  logRequestBody?: boolean;

  /**
   * Whether to log response bodies (default: false for security)
   */
  logResponseBody?: boolean;

  /**
   * Maximum body size to log (in bytes, default: 10KB)
   */
  maxBodyLogSize?: number;

  /**
   * Paths to exclude from logging (e.g., health checks)
   */
  excludePaths?: string[];

  /**
   * Headers to redact from logs
   */
  redactHeaders?: string[];

  /**
   * Fields to redact from body logs
   */
  redactBodyFields?: string[];

  /**
   * Minimum response time (ms) to trigger slow request warning
   */
  slowRequestThreshold?: number;

  /**
   * Whether to log in development mode only
   */
  developmentOnly?: boolean;

  /**
   * Custom log level (default: 'info')
   */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<RequestLoggingConfig> = {
  logRequestBody: false,
  logResponseBody: false,
  maxBodyLogSize: 10240, // 10KB
  excludePaths: ['/health', '/ready', '/metrics', '/favicon.ico'],
  redactHeaders: [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-session-id',
  ],
  redactBodyFields: [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'creditCard',
    'cvv',
    'ssn',
  ],
  slowRequestThreshold: 3000, // 3 seconds
  developmentOnly: false,
  logLevel: 'info',
};

/**
 * Redacts sensitive values from an object
 */
function redactSensitiveData(
  obj: Record<string, unknown>,
  fieldsToRedact: string[]
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (fieldsToRedact.some(field => lowerKey.includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value as Record<string, unknown>, fieldsToRedact);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Redacts headers
 */
function redactHeaders(
  headers: Record<string, unknown>,
  headersToRedact: string[]
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (headersToRedact.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Truncates body if too large
 */
function truncateBody(body: unknown, maxSize: number): unknown {
  const bodyStr = JSON.stringify(body);
  if (bodyStr.length > maxSize) {
    return {
      _truncated: true,
      _originalSize: bodyStr.length,
      _preview: bodyStr.substring(0, 200) + '...',
    };
  }
  return body;
}

/**
 * Checks if path should be excluded from logging
 */
function shouldExcludePath(url: string, excludePaths: string[]): boolean {
  return excludePaths.some(path => url.startsWith(path));
}

/**
 * Extracts user info from request if available
 */
function extractUserInfo(request: FastifyRequest): Record<string, unknown> | undefined {
  const user = (request as any).user;
  if (user) {
    return {
      id: user.id,
      email: user.email ? `${user.email.substring(0, 3)}***` : undefined,
      role: user.role,
    };
  }
  return undefined;
}

/**
 * Request logging middleware
 */
export async function requestLoggingMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  config: Required<RequestLoggingConfig>
): Promise<void> {
  // Skip if development only and not in development
  if (config.developmentOnly && process.env.NODE_ENV === 'production') {
    return;
  }

  // Skip excluded paths
  if (shouldExcludePath(request.url, config.excludePaths)) {
    return;
  }

  const startTime = Date.now();
  const requestId = request.id || 'unknown';

  // Build request log entry
  const requestLog: Record<string, unknown> = {
    type: 'request',
    requestId,
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    route: request.routerPath,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    contentType: request.headers['content-type'],
    contentLength: request.headers['content-length'],
    headers: redactHeaders(
      request.headers as Record<string, unknown>,
      config.redactHeaders
    ),
  };

  // Add user info if available
  const userInfo = extractUserInfo(request);
  if (userInfo) {
    requestLog.user = userInfo;
  }

  // Add request body if configured
  if (config.logRequestBody && request.body) {
    const redactedBody = redactSensitiveData(
      request.body as Record<string, unknown>,
      config.redactBodyFields
    );
    requestLog.body = truncateBody(redactedBody, config.maxBodyLogSize);
  }

  // Log incoming request
  logger.debug('Incoming request', requestLog);

  // Store start time for response logging
  (request as any)._loggingStartTime = startTime;
  (request as any)._loggingConfig = config;
}

/**
 * Response logging hook
 */
export async function responseLoggingHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const config: Required<RequestLoggingConfig> = (request as any)._loggingConfig;
  if (!config) return;

  const startTime = (request as any)._loggingStartTime;
  if (!startTime) return;

  // Skip excluded paths
  if (shouldExcludePath(request.url, config.excludePaths)) {
    return;
  }

  const duration = Date.now() - startTime;
  const requestId = request.id || 'unknown';

  // Build response log entry
  const responseLog: Record<string, unknown> = {
    type: 'response',
    requestId,
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    route: request.routerPath,
    statusCode: reply.statusCode,
    duration: `${duration}ms`,
    durationMs: duration,
  };

  // Add content type and length from response
  const responseHeaders = reply.getHeaders();
  responseLog.contentType = responseHeaders['content-type'];
  responseLog.contentLength = responseHeaders['content-length'];

  // Add user info if available
  const userInfo = extractUserInfo(request);
  if (userInfo) {
    responseLog.user = userInfo;
  }

  // Determine log level based on status code and duration
  let logLevel: 'debug' | 'info' | 'warn' | 'error' = config.logLevel;

  if (reply.statusCode >= 500) {
    logLevel = 'error';
    responseLog.severity = 'error';
  } else if (reply.statusCode >= 400) {
    logLevel = 'warn';
    responseLog.severity = 'warning';
  } else if (duration > config.slowRequestThreshold) {
    logLevel = 'warn';
    responseLog.severity = 'slow';
    responseLog.slowRequest = true;
    responseLog.threshold = config.slowRequestThreshold;
  }

  // Log the response
  switch (logLevel) {
    case 'error':
      logger.error('Request completed with error', responseLog);
      break;
    case 'warn':
      logger.warn('Request completed with warning', responseLog);
      break;
    case 'debug':
      logger.debug('Request completed', responseLog);
      break;
    default:
      logger.info('Request completed', responseLog);
  }
}

/**
 * Fastify plugin for request/response logging
 */
export async function requestLoggingPlugin(
  fastify: FastifyInstance,
  options?: RequestLoggingConfig
): Promise<void> {
  const config: Required<RequestLoggingConfig> = {
    ...DEFAULT_CONFIG,
    ...options,
  };

  // Add onRequest hook for request logging
  fastify.addHook('onRequest', async (request, reply) => {
    await requestLoggingMiddleware(request, reply, config);
  });

  // Add onResponse hook for response logging
  fastify.addHook('onResponse', responseLoggingHook);

  logger.info('Request logging middleware registered', {
    logRequestBody: config.logRequestBody,
    logResponseBody: config.logResponseBody,
    excludePaths: config.excludePaths,
    slowRequestThreshold: config.slowRequestThreshold,
  });
}

/**
 * Creates a child logger for a specific request
 */
export function createRequestLogger(request: FastifyRequest) {
  const requestId = request.id || 'unknown';
  const userInfo = extractUserInfo(request);

  return {
    debug: (message: string, data?: Record<string, unknown>) => {
      logger.debug(message, { requestId, user: userInfo, ...data });
    },
    info: (message: string, data?: Record<string, unknown>) => {
      logger.info(message, { requestId, user: userInfo, ...data });
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      logger.warn(message, { requestId, user: userInfo, ...data });
    },
    error: (message: string, error?: Error, data?: Record<string, unknown>) => {
      logger.error(message, {
        requestId,
        user: userInfo,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
        ...data,
      });
    },
  };
}

/**
 * Performance timing utility for logging operation durations
 */
export function createPerformanceTimer(operation: string, request?: FastifyRequest) {
  const startTime = Date.now();
  const requestId = request?.id || 'unknown';

  return {
    end: (additionalData?: Record<string, unknown>) => {
      const duration = Date.now() - startTime;
      logger.debug(`Operation completed: ${operation}`, {
        requestId,
        operation,
        duration: `${duration}ms`,
        durationMs: duration,
        ...additionalData,
      });
      return duration;
    },
    endWithWarning: (threshold: number, additionalData?: Record<string, unknown>) => {
      const duration = Date.now() - startTime;
      const logFn = duration > threshold ? logger.warn : logger.debug;
      logFn(`Operation completed: ${operation}`, {
        requestId,
        operation,
        duration: `${duration}ms`,
        durationMs: duration,
        slow: duration > threshold,
        threshold,
        ...additionalData,
      });
      return duration;
    },
  };
}

/**
 * Audit logging for sensitive operations
 */
export function logAuditEvent(
  request: FastifyRequest,
  action: string,
  resource: string,
  details?: Record<string, unknown>
): void {
  const requestId = request.id || 'unknown';
  const userInfo = extractUserInfo(request);

  logger.info('Audit event', {
    type: 'audit',
    requestId,
    timestamp: new Date().toISOString(),
    action,
    resource,
    user: userInfo,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    ...details,
  });
}

export default requestLoggingPlugin;
