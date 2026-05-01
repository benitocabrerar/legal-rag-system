/**
 * Redis Configuration
 *
 * Centralized Redis configuration for rate limiting, caching, and other Redis-based services.
 * Supports both REDIS_URL (connection string) and individual configuration options.
 */
import Redis from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls?: Record<string, unknown>;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  lazyConnect: boolean;
  connectTimeout: number;
  enableReadyCheck: boolean;
}

/**
 * Parse Redis URL or use individual environment variables
 */
function getRedisConfig(): RedisConfig {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    // Parse URL to extract components
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        tls: url.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        lazyConnect: true,
        connectTimeout: 10000,
        enableReadyCheck: false,
      };
    } catch {
      console.warn('Failed to parse REDIS_URL, using defaults');
    }
  }

  // Fallback to individual environment variables
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true,
    connectTimeout: 10000,
    enableReadyCheck: false,
  };
}

export const redisConfig = getRedisConfig();

// Singleton Redis client for rate limiting
let rateLimitRedisClient: Redis | null = null;

/**
 * Get or create Redis client for rate limiting
 * Returns null if Redis is not configured (graceful fallback to in-memory)
 */
export function getRateLimitRedisClient(): Redis | null {
  // Skip Redis in test environment or if explicitly disabled
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_REDIS === 'true') {
    return null;
  }

  // Check if Redis is configured
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    console.log('Redis not configured, rate limiter will use in-memory store');
    return null;
  }

  if (!rateLimitRedisClient) {
    try {
      const redisUrl = process.env.REDIS_URL;

      if (redisUrl) {
        rateLimitRedisClient = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          connectTimeout: 10000,
          enableReadyCheck: false,
          lazyConnect: true,
          retryStrategy: (times: number) => {
            if (times > 3) return null; // Stop retrying after 3 attempts
            return Math.min(times * 100, 2000);
          },
        });
      } else {
        rateLimitRedisClient = new Redis(redisConfig);
      }

      rateLimitRedisClient.on('connect', () => {
        console.log('✅ Rate limit Redis connected');
      });

      rateLimitRedisClient.on('error', (err: Error) => {
        console.error('❌ Rate limit Redis error:', err.message);
      });

    } catch (error) {
      console.error('Failed to create Redis client for rate limiting:', error);
      return null;
    }
  }

  return rateLimitRedisClient;
}

/**
 * Close Rate Limit Redis connection
 */
export async function closeRateLimitRedis(): Promise<void> {
  if (rateLimitRedisClient) {
    await rateLimitRedisClient.quit();
    rateLimitRedisClient = null;
  }
}

export default redisConfig;
