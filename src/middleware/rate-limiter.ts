/**
 * Rate Limiter Middleware
 * Provides request rate limiting for API routes
 */

import { FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitOptions {
  max?: number;        // Maximum requests per window
  windowMs?: number;   // Time window in milliseconds
  keyGenerator?: (request: FastifyRequest) => string;
  handler?: (request: FastifyRequest, reply: FastifyReply) => void;
}

const defaultOptions: Required<RateLimitOptions> = {
  max: 100,
  windowMs: 60000, // 1 minute
  keyGenerator: (request: FastifyRequest) => {
    // Use IP address as key, with fallback
    return request.ip ||
           request.headers['x-forwarded-for']?.toString() ||
           'unknown';
  },
  handler: (request: FastifyRequest, reply: FastifyReply) => {
    reply.code(429).send({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: 60
    });
  }
};

// In-memory store (for single instance)
// For production with multiple instances, use Redis
const store: RateLimitStore = {};

/**
 * Create a rate limiter with custom options
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
  const config = { ...defaultOptions, ...options };

  return async function rateLimitMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const key = config.keyGenerator(request);
    const now = Date.now();

    // Initialize or get existing entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }

    store[key].count++;

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', config.max.toString());
    reply.header('X-RateLimit-Remaining', Math.max(0, config.max - store[key].count).toString());
    reply.header('X-RateLimit-Reset', Math.ceil(store[key].resetTime / 1000).toString());

    // Check if limit exceeded
    if (store[key].count > config.max) {
      config.handler(request, reply);
      return;
    }
  };
}

/**
 * Default rate limiter (100 requests per minute)
 */
export const rateLimiter = createRateLimiter();

/**
 * Strict rate limiter for sensitive endpoints (10 requests per minute)
 */
export const strictRateLimiter = createRateLimiter({
  max: 10,
  windowMs: 60000
});

/**
 * API rate limiter (1000 requests per minute)
 */
export const apiRateLimiter = createRateLimiter({
  max: 1000,
  windowMs: 60000
});

/**
 * Auth rate limiter (5 requests per minute for login attempts)
 */
export const authRateLimiter = createRateLimiter({
  max: 5,
  windowMs: 60000,
  handler: (request: FastifyRequest, reply: FastifyReply) => {
    reply.code(429).send({
      error: 'Too Many Requests',
      message: 'Too many login attempts. Please try again in 1 minute.',
      retryAfter: 60
    });
  }
});

/**
 * Cleanup expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const key of Object.keys(store)) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 60000); // Cleanup every minute

export default {
  rateLimiter,
  strictRateLimiter,
  apiRateLimiter,
  authRateLimiter,
  createRateLimiter
};
