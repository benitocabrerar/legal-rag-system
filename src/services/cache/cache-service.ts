/**
 * In-Memory Cache Service
 *
 * Provides a simple in-memory cache with TTL support.
 * Redis-compatible interface for easy migration to Redis in production.
 *
 * @module services/cache/cache-service
 */

import { createLogger } from '../../utils/logger';

const logger = createLogger('CacheService');

/**
 * Cache entry with value and expiration timer
 */
interface CacheEntry<T = any> {
  value: T;
  timer?: NodeJS.Timeout;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

/**
 * Simple in-memory cache service with TTL support
 *
 * @example
 * ```typescript
 * const cache = new CacheService();
 * await cache.set('key', { data: 'value' }, 3600); // 1 hour TTL
 * const value = await cache.get('key');
 * ```
 */
export class CacheService {
  private cache: Map<string, CacheEntry>;
  private hits: number = 0;
  private misses: number = 0;

  constructor() {
    this.cache = new Map();
    logger.info('CacheService initialized');
  }

  /**
   * Get value from cache
   *
   * @param key - Cache key
   * @returns Cached value or null if not found or expired
   *
   * @example
   * ```typescript
   * const user = await cache.get('user:123');
   * if (user) {
   *   console.log('Cache hit:', user);
   * }
   * ```
   */
  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      logger.debug('Cache miss', { key });
      return null;
    }

    this.hits++;
    logger.debug('Cache hit', { key });
    return entry.value as T;
  }

  /**
   * Set value in cache with optional TTL
   *
   * @param key - Cache key
   * @param value - Value to cache (will be JSON serialized)
   * @param ttl - Time to live in seconds (optional)
   *
   * @example
   * ```typescript
   * // Cache for 1 hour
   * await cache.set('user:123', userData, 3600);
   *
   * // Cache without expiration
   * await cache.set('config', appConfig);
   * ```
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    // Clear existing timer if key already exists
    const existing = this.cache.get(key);
    if (existing?.timer) {
      clearTimeout(existing.timer);
    }

    const entry: CacheEntry = { value };

    // Set TTL timer if specified
    if (ttl && ttl > 0) {
      entry.timer = setTimeout(() => {
        this.cache.delete(key);
        logger.debug('Cache entry expired', { key });
      }, ttl * 1000);
    }

    this.cache.set(key, entry);
    logger.debug('Cache set', { key, hasTTL: !!ttl, ttl });
  }

  /**
   * Delete value from cache
   *
   * @param key - Cache key
   *
   * @example
   * ```typescript
   * await cache.del('user:123');
   * ```
   */
  async del(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (entry?.timer) {
      clearTimeout(entry.timer);
    }
    this.cache.delete(key);
    logger.debug('Cache entry deleted', { key });
  }

  /**
   * Check if key exists in cache
   *
   * @param key - Cache key
   * @returns True if key exists and not expired
   */
  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  /**
   * Clear all cache entries
   *
   * @example
   * ```typescript
   * await cache.clear();
   * ```
   */
  async clear(): Promise<void> {
    // Clear all timers
    const entries = Array.from(this.cache.values());
    for (const entry of entries) {
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
    }

    const previousSize = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;

    logger.info('Cache cleared', { previousSize });
  }

  /**
   * Get all keys in cache
   *
   * @returns Array of cache keys
   */
  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size (number of entries)
   *
   * @returns Number of entries in cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics including hits, misses, and hit rate
   *
   * @example
   * ```typescript
   * const stats = cache.getStats();
   * console.log(`Hit rate: ${stats.hitRate}%`);
   * ```
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Get or set cache value (convenience method)
   *
   * If key exists, return cached value.
   * If key doesn't exist, execute factory function, cache result, and return it.
   *
   * @param key - Cache key
   * @param factory - Function to generate value if not cached
   * @param ttl - Time to live in seconds (optional)
   * @returns Cached or newly generated value
   *
   * @example
   * ```typescript
   * const user = await cache.getOrSet(
   *   'user:123',
   *   async () => await fetchUserFromDB(123),
   *   3600
   * );
   * ```
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Delete multiple keys matching a pattern
   *
   * @param pattern - Pattern to match (supports * wildcard)
   * @returns Number of keys deleted
   *
   * @example
   * ```typescript
   * // Delete all user cache entries
   * const deleted = await cache.deletePattern('user:*');
   * ```
   */
  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );

    let deleted = 0;
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        await this.del(key);
        deleted++;
      }
    }

    logger.debug('Cache pattern deleted', { pattern, deleted });
    return deleted;
  }
}

/**
 * Default cache service instance
 */
export const cacheService = new CacheService();
