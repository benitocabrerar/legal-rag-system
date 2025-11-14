import NodeCache from 'node-cache';
import { getRedisCacheService } from './redis-cache.service';

/**
 * Multi-Tier Cache Service
 *
 * 3-tier caching strategy:
 * - L1: In-memory cache (NodeCache) - Ultra-fast, 5 min TTL
 * - L2: Redis hot cache - Fast, 1 hour TTL
 * - L3: Redis warm cache (persistent QueryCache model) - 24 hours TTL
 */
export class MultiTierCacheService {
  private l1Cache: NodeCache;
  private redisCache = getRedisCacheService();
  
  private l1TTL: number;
  private l2TTL: number;
  private l3TTL: number;

  constructor() {
    // L1 TTL in seconds (converted from ms in .env)
    this.l1TTL = parseInt(process.env.CACHE_L1_TTL_MS || '300000') / 1000;
    this.l2TTL = parseInt(process.env.CACHE_L2_TTL_MS || '3600000') / 1000;
    this.l3TTL = parseInt(process.env.CACHE_L3_TTL_MS || '86400000') / 1000;

    // Initialize in-memory cache
    this.l1Cache = new NodeCache({
      stdTTL: this.l1TTL,
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false, // Better performance, no cloning
    });

    console.log(`✅ Multi-Tier Cache initialized: L1=${this.l1TTL}s, L2=${this.l2TTL}s, L3=${this.l3TTL}s`);
  }

  /**
   * Get value from cache (checks L1 → L2 → L3)
   */
  async get<T>(key: string): Promise<{ value: T | null; tier: 'L1' | 'L2' | 'L3' | 'MISS' }> {
    // Try L1 (in-memory)
    const l1Value = this.l1Cache.get<T>(key);
    if (l1Value !== undefined) {
      return { value: l1Value, tier: 'L1' };
    }

    // Try L2 (Redis hot cache)
    const l2Key = `hot:${key}`;
    const l2Value = await this.redisCache.get<T>(l2Key);
    if (l2Value) {
      // Promote to L1
      this.l1Cache.set(key, l2Value, this.l1TTL);
      return { value: l2Value, tier: 'L2' };
    }

    // Try L3 (Redis warm cache)
    const l3Key = `warm:${key}`;
    const l3Value = await this.redisCache.get<T>(l3Key);
    if (l3Value) {
      // Promote to L1 and L2
      this.l1Cache.set(key, l3Value, this.l1TTL);
      await this.redisCache.set(l2Key, l3Value, this.l2TTL);
      return { value: l3Value, tier: 'L3' };
    }

    return { value: null, tier: 'MISS' };
  }

  /**
   * Set value in all cache tiers
   */
  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      // Set in L1 (in-memory)
      this.l1Cache.set(key, value, this.l1TTL);

      // Set in L2 (Redis hot)
      const l2Key = `hot:${key}`;
      await this.redisCache.set(l2Key, value, this.l2TTL);

      // Set in L3 (Redis warm)
      const l3Key = `warm:${key}`;
      await this.redisCache.set(l3Key, value, this.l3TTL);

      return true;
    } catch (error) {
      console.error(`Error setting cache for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set value only in L1 (hot path)
   */
  setL1Only<T>(key: string, value: T): boolean {
    try {
      this.l1Cache.set(key, value, this.l1TTL);
      return true;
    } catch (error) {
      console.error(`Error setting L1 cache for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set value in L2 and L3 (skip L1)
   */
  async setL2L3<T>(key: string, value: T): Promise<boolean> {
    try {
      const l2Key = `hot:${key}`;
      const l3Key = `warm:${key}`;

      await Promise.all([
        this.redisCache.set(l2Key, value, this.l2TTL),
        this.redisCache.set(l3Key, value, this.l3TTL),
      ]);

      return true;
    } catch (error) {
      console.error(`Error setting L2/L3 cache for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Invalidate key from all cache tiers
   */
  async invalidate(key: string): Promise<void> {
    // Remove from L1
    this.l1Cache.del(key);

    // Remove from L2 and L3
    const l2Key = `hot:${key}`;
    const l3Key = `warm:${key}`;
    
    await Promise.all([
      this.redisCache.delete(l2Key),
      this.redisCache.delete(l3Key),
    ]);
  }

  /**
   * Invalidate pattern from all cache tiers
   */
  async invalidatePattern(pattern: string): Promise<number> {
    // L1: Get all keys and filter by pattern
    const l1Keys = this.l1Cache.keys();
    const l1Matches = l1Keys.filter(key => key.includes(pattern));
    this.l1Cache.del(l1Matches);

    // L2 and L3: Use Redis pattern matching
    const l2Pattern = `hot:*${pattern}*`;
    const l3Pattern = `warm:*${pattern}*`;

    const [l2Count, l3Count] = await Promise.all([
      this.redisCache.deletePattern(l2Pattern),
      this.redisCache.deletePattern(l3Pattern),
    ]);

    return l1Matches.length + l2Count + l3Count;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    l1: { keys: number; hits: number; misses: number };
    l2: { isConnected: boolean };
    l3: { isConnected: boolean };
  }> {
    const l1Stats = this.l1Cache.getStats();
    const redisHealth = await this.redisCache.healthCheck();

    return {
      l1: {
        keys: this.l1Cache.keys().length,
        hits: l1Stats.hits,
        misses: l1Stats.misses,
      },
      l2: { isConnected: redisHealth },
      l3: { isConnected: redisHealth },
    };
  }

  /**
   * Clear all cache tiers
   */
  async clear(): Promise<void> {
    // Clear L1
    this.l1Cache.flushAll();

    // Clear L2 and L3 (all hot: and warm: keys)
    await Promise.all([
      this.redisCache.deletePattern('hot:*'),
      this.redisCache.deletePattern('warm:*'),
    ]);

    console.log('✅ All cache tiers cleared');
  }

  /**
   * Get cache hit rate (L1 only, for monitoring)
   */
  getCacheHitRate(): number {
    const stats = this.l1Cache.getStats();
    const total = stats.hits + stats.misses;
    if (total === 0) return 0;
    return (stats.hits / total) * 100;
  }
}

// Singleton instance
let multiTierCacheInstance: MultiTierCacheService | null = null;

export function getMultiTierCacheService(): MultiTierCacheService {
  if (!multiTierCacheInstance) {
    multiTierCacheInstance = new MultiTierCacheService();
  }
  return multiTierCacheInstance;
}
