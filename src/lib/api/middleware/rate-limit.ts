import { FastifyRequest, FastifyReply } from 'fastify';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

interface RateLimitOptions {
  max: number;           // Maximum requests
  timeWindow: string;    // e.g., '1 minute', '1 hour'
  keyGenerator?: (request: FastifyRequest) => string;
}

const TIME_WINDOWS = {
  '1 second': 1,
  '1 minute': 60,
  '1 hour': 3600,
  '1 day': 86400,
};

export function rateLimiter(options: RateLimitOptions) {
  const { max, timeWindow, keyGenerator } = options;
  const windowSeconds = parseTimeWindow(timeWindow);

  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Generate key based on user ID or IP
      const key = keyGenerator
        ? keyGenerator(request)
        : `rate-limit:${request.user?.id || request.ip}:${request.routerPath}`;

      // Increment counter
      const current = await redis.incr(key);

      // Set expiry on first request
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      // Get TTL
      const ttl = await redis.ttl(key);

      // Set rate limit headers
      reply.header('X-RateLimit-Limit', max);
      reply.header('X-RateLimit-Remaining', Math.max(0, max - current));
      reply.header('X-RateLimit-Reset', Date.now() + ttl * 1000);

      // Check if limit exceeded
      if (current > max) {
        return reply.code(429).send({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            retryAfter: ttl,
          },
        });
      }
    } catch (error) {
      // If Redis fails, log error but don't block request
      request.log.error({ error }, 'Rate limiter error');
    }
  };
}

function parseTimeWindow(timeWindow: string): number {
  const match = timeWindow.match(/^(\d+)\s+(second|minute|hour|day)s?$/);

  if (!match) {
    throw new Error(`Invalid time window format: ${timeWindow}`);
  }

  const [, count, unit] = match;
  const baseSeconds = TIME_WINDOWS[`1 ${unit}` as keyof typeof TIME_WINDOWS];

  return parseInt(count) * baseSeconds;
}

// Preset rate limiters
export const rateLimiters = {
  auth: rateLimiter({ max: 10, timeWindow: '1 minute' }),
  read: rateLimiter({ max: 300, timeWindow: '1 minute' }),
  write: rateLimiter({ max: 100, timeWindow: '1 minute' }),
  delete: rateLimiter({ max: 50, timeWindow: '1 minute' }),
  strict: rateLimiter({ max: 20, timeWindow: '1 minute' }),
};
