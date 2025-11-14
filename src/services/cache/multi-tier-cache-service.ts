/**
 * Multi-Tier Cache Service
 * Implements L1 (hot), L2 (warm), and L3 (CDN) caching strategy
 *
 * @module multi-tier-cache-service
 * @author Legal RAG System - Week 3 Architecture
 * @version 1.0.0
 */

import { Redis } from 'ioredis';
import { createHash } from 'crypto';
import { LRUCache } from 'lru-cache';
import { Logger } from '../../utils/logger';

/**
 * Cache tier levels
 */
export type CacheTier = 'L1' | 'L2' | 'L3';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  hits: number;
  tier: CacheTier;
  ttl: number;
}

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  size: number;
  tier: CacheTier;
}

/**
 * Cache configuration for each tier
 */
interface TierConfig {
  maxSize: number;  // Max items in cache
  ttl: number;      // Default TTL in seconds
  prefix: string;   // Key prefix for this tier
}

/**
 * Multi-Tier Cache Service
 * Manages hierarchical caching with automatic promotion/demotion
 */
export class MultiTierCacheService {
  private readonly logger = new Logger('MultiTierCacheService');
  private readonly redis: Redis;
  private readonly memoryCache: LRUCache<string, CacheEntry>;

  // Tier configurations
  private readonly tierConfigs: Record<CacheTier, TierConfig> = {
    L1: {
      maxSize: 1000,
      ttl: 300,    // 5 minutes
      prefix: 'l1:'
    },
    L2: {
      maxSize: 5000,
      ttl: 3600,   // 1 hour
      prefix: 'l2:'
    },
    L3: {
      maxSize: 10000,
      ttl: 86400,  // 24 hours
      prefix: 'l3:'
    }
  };

  // Cache statistics
  private stats: Record<CacheTier, CacheStats> = {
    L1: { hits: 0, misses: 0, evictions: 0, hitRate: 0, size: 0, tier: 'L1' },
    L2: { hits: 0, misses: 0, evictions: 0, hitRate: 0, size: 0, tier: 'L2' },
    L3: { hits: 0, misses: 0, evictions: 0, hitRate: 0, size: 0, tier: 'L3' }
  };

  constructor(redis: Redis) {
    this.redis = redis;

    // Initialize in-memory LRU cache for L1
    this.memoryCache = new LRUCache<string, CacheEntry>({
      max: this.tierConfigs.L1.maxSize,
      ttl: this.tierConfigs.L1.ttl * 1000, // Convert to milliseconds
      updateAgeOnGet: true,
      updateAgeOnHas: false,
      dispose: (value, key) => {
        this.stats.L1.evictions++;
        this.logger.debug('L1 cache eviction', { key });
      }
    });

    this.logger.info('MultiTierCacheService initialized');
  }

  /**
   * Get value from cache, checking all tiers
   */
  async get<T = any>(key: string, preferredTier?: CacheTier): Promise<T | null> {
    const normalizedKey = this.normalizeKey(key);

    // If preferred tier specified, check only that tier
    if (preferredTier) {
      return this.getFromTier<T>(normalizedKey, preferredTier);
    }

    // Check L1 (memory cache) first
    const l1Result = await this.getFromL1<T>(normalizedKey);
    if (l1Result !== null) {
      this.stats.L1.hits++;
      this.updateHitRate('L1');
      return l1Result;
    }
    this.stats.L1.misses++;

    // Check L2 (Redis hot cache)
    const l2Result = await this.getFromL2<T>(normalizedKey);
    if (l2Result !== null) {
      this.stats.L2.hits++;
      this.updateHitRate('L2');

      // Promote to L1
      await this.promoteToL1(normalizedKey, l2Result);

      return l2Result;
    }
    this.stats.L2.misses++;

    // Check L3 (Redis warm cache)
    const l3Result = await this.getFromL3<T>(normalizedKey);
    if (l3Result !== null) {
      this.stats.L3.hits++;
      this.updateHitRate('L3');

      // Promote to L2
      await this.promoteToL2(normalizedKey, l3Result);

      return l3Result;
    }
    this.stats.L3.misses++;

    return null;
  }

  /**
   * Set value in cache tier
   */
  async set<T = any>(
    key: string,
    value: T,
    tier: CacheTier = 'L1',
    ttl?: number
  ): Promise<void> {
    const normalizedKey = this.normalizeKey(key);
    const finalTtl = ttl || this.tierConfigs[tier].ttl;

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      hits: 0,
      tier,
      ttl: finalTtl
    };

    switch (tier) {
      case 'L1':
        await this.setInL1(normalizedKey, entry);
        break;
      case 'L2':
        await this.setInL2(normalizedKey, entry);
        break;
      case 'L3':
        await this.setInL3(normalizedKey, entry);
        break;
    }

    this.stats[tier].size++;
  }

  /**
   * Delete value from all cache tiers
   */
  async delete(key: string): Promise<void> {
    const normalizedKey = this.normalizeKey(key);

    // Delete from all tiers
    await Promise.all([
      this.deleteFromL1(normalizedKey),
      this.deleteFromL2(normalizedKey),
      this.deleteFromL3(normalizedKey)
    ]);
  }

  /**
   * Invalidate cache entries matching pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // Clear from memory cache
    const memoryKeys = Array.from(this.memoryCache.keys());
    for (const key of memoryKeys) {
      if (this.matchesPattern(key, pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear from Redis using SCAN
    await this.invalidateRedisPattern(`${this.tierConfigs.L2.prefix}${pattern}`);
    await this.invalidateRedisPattern(`${this.tierConfigs.L3.prefix}${pattern}`);
  }

  /**
   * Get value from specific tier
   */
  private async getFromTier<T>(key: string, tier: CacheTier): Promise<T | null> {
    switch (tier) {
      case 'L1':
        return this.getFromL1<T>(key);
      case 'L2':
        return this.getFromL2<T>(key);
      case 'L3':
        return this.getFromL3<T>(key);
    }
  }

  /**
   * Get from L1 (memory cache)
   */
  private async getFromL1<T>(key: string): Promise<T | null> {
    const prefixedKey = `${this.tierConfigs.L1.prefix}${key}`;
    const entry = this.memoryCache.get(prefixedKey);

    if (entry) {
      entry.hits++;
      return entry.data as T;
    }

    return null;
  }

  /**
   * Get from L2 (Redis hot cache)
   */
  private async getFromL2<T>(key: string): Promise<T | null> {
    const prefixedKey = `${this.tierConfigs.L2.prefix}${key}`;

    try {
      const data = await this.redis.get(prefixedKey);
      if (data) {
        const entry: CacheEntry<T> = JSON.parse(data);
        entry.hits++;

        // Update hit count in Redis
        await this.redis.setex(
          prefixedKey,
          entry.ttl,
          JSON.stringify(entry)
        );

        return entry.data;
      }
    } catch (error) {
      this.logger.error('L2 cache get error', { key, error });
    }

    return null;
  }

  /**
   * Get from L3 (Redis warm cache)
   */
  private async getFromL3<T>(key: string): Promise<T | null> {
    const prefixedKey = `${this.tierConfigs.L3.prefix}${key}`;

    try {
      const data = await this.redis.get(prefixedKey);
      if (data) {
        const entry: CacheEntry<T> = JSON.parse(data);
        entry.hits++;

        // Update hit count in Redis
        await this.redis.setex(
          prefixedKey,
          entry.ttl,
          JSON.stringify(entry)
        );

        return entry.data;
      }
    } catch (error) {
      this.logger.error('L3 cache get error', { key, error });
    }

    return null;
  }

  /**
   * Set in L1 (memory cache)
   */
  private async setInL1<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    const prefixedKey = `${this.tierConfigs.L1.prefix}${key}`;
    this.memoryCache.set(prefixedKey, entry);
  }

  /**
   * Set in L2 (Redis hot cache)
   */
  private async setInL2<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    const prefixedKey = `${this.tierConfigs.L2.prefix}${key}`;

    try {
      await this.redis.setex(
        prefixedKey,
        entry.ttl,
        JSON.stringify(entry)
      );
    } catch (error) {
      this.logger.error('L2 cache set error', { key, error });
    }
  }

  /**
   * Set in L3 (Redis warm cache)
   */
  private async setInL3<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    const prefixedKey = `${this.tierConfigs.L3.prefix}${key}`;

    try {
      await this.redis.setex(
        prefixedKey,
        entry.ttl,
        JSON.stringify(entry)
      );
    } catch (error) {
      this.logger.error('L3 cache set error', { key, error });
    }
  }

  /**
   * Delete from L1
   */
  private async deleteFromL1(key: string): Promise<void> {
    const prefixedKey = `${this.tierConfigs.L1.prefix}${key}`;
    this.memoryCache.delete(prefixedKey);
    this.stats.L1.size = Math.max(0, this.stats.L1.size - 1);
  }

  /**
   * Delete from L2
   */
  private async deleteFromL2(key: string): Promise<void> {
    const prefixedKey = `${this.tierConfigs.L2.prefix}${key}`;

    try {
      const deleted = await this.redis.del(prefixedKey);
      if (deleted > 0) {
        this.stats.L2.size = Math.max(0, this.stats.L2.size - 1);
      }
    } catch (error) {
      this.logger.error('L2 cache delete error', { key, error });
    }
  }

  /**
   * Delete from L3
   */
  private async deleteFromL3(key: string): Promise<void> {
    const prefixedKey = `${this.tierConfigs.L3.prefix}${key}`;

    try {
      const deleted = await this.redis.del(prefixedKey);
      if (deleted > 0) {
        this.stats.L3.size = Math.max(0, this.stats.L3.size - 1);
      }
    } catch (error) {
      this.logger.error('L3 cache delete error', { key, error });
    }
  }

  /**
   * Promote value to L1 cache
   */
  private async promoteToL1<T>(key: string, value: T): Promise<void> {
    await this.set(key, value, 'L1', this.tierConfigs.L1.ttl);
  }

  /**
   * Promote value to L2 cache
   */
  private async promoteToL2<T>(key: string, value: T): Promise<void> {
    await this.set(key, value, 'L2', this.tierConfigs.L2.ttl);
  }

  /**
   * Invalidate Redis keys matching pattern
   */
  private async invalidateRedisPattern(pattern: string): Promise<void> {
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100
    });

    stream.on('data', async (keys: string[]) => {
      if (keys.length) {
        await this.redis.del(...keys);
        this.logger.debug(`Invalidated ${keys.length} keys matching pattern`, { pattern });
      }
    });

    stream.on('end', () => {
      this.logger.debug('Pattern invalidation complete', { pattern });
    });

    stream.on('error', (error) => {
      this.logger.error('Pattern invalidation error', { pattern, error });
    });
  }

  /**
   * Check if key matches pattern
   */
  private matchesPattern(key: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    const regex = new RegExp(
      pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
    );

    return regex.test(key);
  }

  /**
   * Normalize cache key
   */
  private normalizeKey(key: string): string {
    // Remove special characters and lowercase
    const normalized = key.toLowerCase().replace(/[^a-z0-9:_-]/g, '_');

    // Create hash if key is too long
    if (normalized.length > 200) {
      const hash = createHash('md5').update(normalized).digest('hex');
      return `${normalized.substring(0, 150)}_${hash}`;
    }

    return normalized;
  }

  /**
   * Update hit rate for tier
   */
  private updateHitRate(tier: CacheTier): void {
    const stats = this.stats[tier];
    const total = stats.hits + stats.misses;

    if (total > 0) {
      stats.hitRate = (stats.hits / total) * 100;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(tier?: CacheTier): CacheStats | Record<CacheTier, CacheStats> {
    if (tier) {
      return { ...this.stats[tier] };
    }

    return { ...this.stats };
  }

  /**
   * Clear all cache tiers
   */
  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear Redis caches
    const patterns = [
      `${this.tierConfigs.L2.prefix}*`,
      `${this.tierConfigs.L3.prefix}*`
    ];

    for (const pattern of patterns) {
      await this.invalidateRedisPattern(pattern);
    }

    // Reset statistics
    for (const tier of ['L1', 'L2', 'L3'] as CacheTier[]) {
      this.stats[tier] = {
        hits: 0,
        misses: 0,
        evictions: 0,
        hitRate: 0,
        size: 0,
        tier
      };
    }

    this.logger.info('All cache tiers cleared');
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(keys: string[], fetcher: (key: string) => Promise<any>): Promise<void> {
    this.logger.info(`Warming up cache with ${keys.length} keys`);

    const results = await Promise.allSettled(
      keys.map(async (key) => {
        const value = await fetcher(key);
        if (value) {
          await this.set(key, value, 'L2', this.tierConfigs.L2.ttl);
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    this.logger.info(`Cache warmup complete: ${successful}/${keys.length} keys loaded`);
  }

  /**
   * Get memory usage information
   */
  getMemoryUsage(): { heap: number; external: number; cacheSize: number } {
    const memUsage = process.memoryUsage();

    return {
      heap: memUsage.heapUsed,
      external: memUsage.external,
      cacheSize: this.memoryCache.size
    };
  }
}