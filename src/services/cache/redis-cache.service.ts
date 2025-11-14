import Redis from 'ioredis';

/**
 * Redis Cache Service
 *
 * Wrapper service for Redis operations with error handling,
 * connection management, and utility methods for caching.
 */
export class RedisCacheService {
  private redis: Redis;
  private isConnected: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set');
    }

    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
      enableReadyCheck: false,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      console.log('✅ Redis connected');
    });

    this.redis.on('error', (error: Error) => {
      console.error('❌ Redis error:', error.message);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      this.isConnected = false;
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      return false;
    }
  }

  async getTTL(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      return -2;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;
      await this.redis.del(...keys);
      return keys.length;
    } catch (error) {
      return 0;
    }
  }

  async increment(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      return 0;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch (error) {
      return false;
    }
  }

  async getInfo(): Promise<{
    version: string;
    memory: string;
    connectedClients: number;
    isConnected: boolean;
  }> {
    try {
      const info = await this.redis.info();
      const version = info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown';
      const memory = info.match(/used_memory_human:([^\r\n]+)/)?.[1] || 'unknown';
      const clients = parseInt(info.match(/connected_clients:(\d+)/)?.[1] || '0');

      return {
        version,
        memory,
        connectedClients: clients,
        isConnected: this.isConnected,
      };
    } catch (error) {
      return {
        version: 'unknown',
        memory: 'unknown',
        connectedClients: 0,
        isConnected: false,
      };
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
    this.isConnected = false;
  }
}

let redisCacheInstance: RedisCacheService | null = null;

export function getRedisCacheService(): RedisCacheService {
  if (!redisCacheInstance) {
    redisCacheInstance = new RedisCacheService();
  }
  return redisCacheInstance;
}
