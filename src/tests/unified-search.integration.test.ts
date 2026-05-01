/**
 * Unified Search Integration Tests
 * Phase 10 Week 3 - NLP-RAG Performance Optimization
 *
 * Tests the complete integration of:
 * - Multi-tier caching (L1/L2/L3)
 * - Async OpenAI processing
 * - NLP query processing
 * - RAG enhancement
 * - Unified Search Orchestrator
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getUnifiedSearchOrchestrator } from '../services/orchestration/unified-search-orchestrator';
import { getMultiTierCacheService } from '../services/cache/multi-tier-cache.service';
import { getRedisCacheService } from '../services/cache/redis-cache.service';
import { getAsyncOpenAIService } from '../services/ai/async-openai.service';

describe('Unified Search Integration Tests', () => {
  let orchestrator: ReturnType<typeof getUnifiedSearchOrchestrator>;
  let cacheService: ReturnType<typeof getMultiTierCacheService>;
  let redisService: ReturnType<typeof getRedisCacheService>;
  let aiService: ReturnType<typeof getAsyncOpenAIService>;

  beforeAll(async () => {
    orchestrator = getUnifiedSearchOrchestrator();
    cacheService = getMultiTierCacheService();
    redisService = getRedisCacheService();
    aiService = getAsyncOpenAIService();

    // Clear cache before tests
    await cacheService.clear();
  });

  afterAll(async () => {
    // Clean up after tests
    await cacheService.clear();
  });

  describe('Multi-Tier Cache Service', () => {
    it('should connect to Redis successfully', async () => {
      const health = await redisService.healthCheck();
      expect(health).toBe(true);
    });

    it('should set and get values from L1 cache', async () => {
      const testKey = 'test:l1:key';
      const testValue = { data: 'test value', timestamp: Date.now() };

      // Set in L1 only
      const setResult = cacheService.setL1Only(testKey, testValue);
      expect(setResult).toBe(true);

      // Get from cache (should hit L1)
      const getResult = await cacheService.get<typeof testValue>(testKey);
      expect(getResult.tier).toBe('L1');
      expect(getResult.value).toEqual(testValue);
    });

    it('should set and get values across all cache tiers', async () => {
      const testKey = 'test:all-tiers:key';
      const testValue = { data: 'multi-tier test', timestamp: Date.now() };

      // Set across all tiers
      const setResult = await cacheService.set(testKey, testValue);
      expect(setResult).toBe(true);

      // Clear L1 to test L2 retrieval
      cacheService.setL1Only(testKey, null as any); // Clear L1

      // Get from cache (should hit L2 and promote to L1)
      const getResult = await cacheService.get<typeof testValue>(testKey);
      expect(getResult.tier).toBe('L2');
      expect(getResult.value).toEqual(testValue);
    });

    it('should invalidate cache patterns correctly', async () => {
      // Set multiple test keys
      await cacheService.set('test:pattern:key1', { data: 'value1' });
      await cacheService.set('test:pattern:key2', { data: 'value2' });
      await cacheService.set('test:other:key3', { data: 'value3' });

      // Invalidate pattern
      const invalidatedCount = await cacheService.invalidatePattern('pattern');
      expect(invalidatedCount).toBeGreaterThan(0);

      // Verify pattern keys are gone
      const result1 = await cacheService.get('test:pattern:key1');
      const result2 = await cacheService.get('test:pattern:key2');
      const result3 = await cacheService.get('test:other:key3');

      expect(result1.tier).toBe('MISS');
      expect(result2.tier).toBe('MISS');
      expect(result3.tier).not.toBe('MISS');
    });

    it('should calculate cache hit rate correctly', async () => {
      // Clear cache first
      await cacheService.clear();

      // Create some cache hits and misses
      await cacheService.set('hit:key1', { data: 'value1' });

      // First access (should hit)
      await cacheService.get('hit:key1');

      // Second access (should hit)
      await cacheService.get('hit:key1');

      // Access non-existent key (should miss)
      await cacheService.get('miss:key1');

      const hitRate = cacheService.getCacheHitRate();
      expect(hitRate).toBeGreaterThan(0);
      expect(hitRate).toBeLessThanOrEqual(100);
    });

    it('should provide accurate cache statistics', async () => {
      const stats = await cacheService.getStats();

      expect(stats).toHaveProperty('l1');
      expect(stats).toHaveProperty('l2');
      expect(stats).toHaveProperty('l3');

      expect(stats.l1).toHaveProperty('keys');
      expect(stats.l1).toHaveProperty('hits');
      expect(stats.l1).toHaveProperty('misses');

      expect(stats.l2).toHaveProperty('isConnected');
      expect(stats.l3).toHaveProperty('isConnected');

      expect(typeof stats.l1.keys).toBe('number');
      expect(typeof stats.l2.isConnected).toBe('boolean');
      expect(typeof stats.l3.isConnected).toBe('boolean');
    });
  });

  describe('Async OpenAI Service', () => {
    it('should generate embedding async with caching', async () => {
      const testText = 'This is a test for embedding generation';

      // First call (should queue job)
      const result1 = await aiService.generateEmbeddingAsync(testText);

      if (result1.jobId) {
        // Poll for result
        const jobResult = await aiService.getJobResult(result1.jobId, 5);
        expect(jobResult.status).toBe('completed');
      } else {
        // Already cached
        expect(result1.cached).toBe(true);
        expect(result1.embedding).toBeDefined();
      }

      // Second call (should hit cache)
      const result2 = await aiService.generateEmbeddingAsync(testText);
      expect(result2.cached).toBe(true);
      expect(result2.embedding).toBeDefined();
    });

    it('should handle chat completion async', async () => {
      const messages = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'What is 2+2?' }
      ];

      const result = await aiService.generateChatCompletionAsync(messages);

      if (result.jobId) {
        // Poll for result
        const jobResult = await aiService.getJobResult(result.jobId, 5);
        expect(jobResult.status).toBe('completed');
      } else {
        // Already cached
        expect(result.cached).toBe(true);
        expect(result.response).toBeDefined();
      }
    });

    it('should provide queue statistics', async () => {
      const stats = await aiService.getQueueStats();

      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');

      expect(typeof stats.waiting).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
    });

    it('should provide cache statistics', async () => {
      const stats = await aiService.getCacheStats();

      expect(stats).toHaveProperty('l1');
      expect(stats).toHaveProperty('l2');
      expect(stats).toHaveProperty('l3');
      expect(stats).toHaveProperty('hitRate');

      expect(typeof stats.hitRate).toBe('number');
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Unified Search Orchestrator', () => {
    it('should execute search with caching', async () => {
      const query = 'constitución ecuatoriana derechos fundamentales';

      // First search (cache miss)
      const result1 = await orchestrator.search({
        query,
        limit: 5,
        offset: 0,
      });

      expect(result1).toHaveProperty('documents');
      expect(result1).toHaveProperty('totalCount');
      expect(result1).toHaveProperty('responseTime');
      expect(result1).toHaveProperty('metadata');
      expect(result1.metadata.cached).toBe(false);

      // Second search (cache hit)
      const result2 = await orchestrator.search({
        query,
        limit: 5,
        offset: 0,
      });

      expect(result2.metadata.cached).toBe(true);
      expect(result2.metadata.cacheTier).toBeDefined();
      expect(result2.responseTime).toBeLessThan(result1.responseTime);
    });

    it('should apply filters correctly', async () => {
      const query = 'código civil';
      const filters = {
        jurisdiction: 'ECUADOR',
        documentType: 'LEY',
      };

      const result = await orchestrator.search({
        query,
        filters,
        limit: 10,
        offset: 0,
      });

      expect(result.documents).toBeDefined();
      expect(result.metadata.filtersApplied).toEqual(expect.objectContaining(filters));
    });

    it('should provide search analytics', async () => {
      const analytics = await orchestrator.getSearchAnalytics();

      expect(analytics).toHaveProperty('totalQueries');
      expect(analytics).toHaveProperty('cacheHitRate');
      expect(analytics).toHaveProperty('avgResponseTime');
      expect(analytics).toHaveProperty('topQueries');
      expect(analytics).toHaveProperty('topIntents');

      expect(typeof analytics.totalQueries).toBe('number');
      expect(typeof analytics.cacheHitRate).toBe('number');
      expect(typeof analytics.avgResponseTime).toBe('number');
      expect(Array.isArray(analytics.topQueries)).toBe(true);
      expect(Array.isArray(analytics.topIntents)).toBe(true);
    });

    it('should provide query suggestions', async () => {
      const partialQuery = 'const';

      const suggestions = await orchestrator.getSuggestions(partialQuery, 5);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeLessThanOrEqual(5);

      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('suggestion');
        expect(suggestions[0]).toHaveProperty('frequency');
        expect(suggestions[0]).toHaveProperty('category');
      }
    });

    it('should update session context', async () => {
      const sessionId = 'test-session-123';
      const userId = 'test-user-456';
      const context = {
        recentSearches: ['constitución', 'derechos'],
        preferences: { language: 'es' },
      };

      await expect(
        orchestrator.updateSessionContext(sessionId, userId, context)
      ).resolves.not.toThrow();
    });

    it('should handle errors gracefully', async () => {
      // Test with empty query
      await expect(
        orchestrator.search({ query: '', limit: 10, offset: 0 })
      ).rejects.toThrow();

      // Test with invalid limit
      await expect(
        orchestrator.search({ query: 'test', limit: -1, offset: 0 })
      ).rejects.toThrow();
    });

    it('should track query performance', async () => {
      const query = 'test performance tracking';

      const startTime = Date.now();
      const result = await orchestrator.search({ query, limit: 5, offset: 0 });
      const endTime = Date.now();

      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.responseTime).toBeLessThan(endTime - startTime + 100); // Allow 100ms margin
    });
  });

  describe('End-to-End Integration', () => {
    it('should complete full search workflow with all services', async () => {
      // 1. Clear cache
      await cacheService.clear();

      // 2. Execute search (should trigger NLP, RAG, Database)
      const query = 'artículos sobre derechos humanos en la constitución';
      const result = await orchestrator.search({
        query,
        filters: { jurisdiction: 'ECUADOR' },
        limit: 10,
        offset: 0,
      });

      // 3. Verify result structure
      expect(result.documents).toBeDefined();
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
      expect(result.metadata.cached).toBe(false);
      expect(result.metadata.intent).toBeDefined();

      // 4. Verify caching worked
      const cacheStats = await cacheService.getStats();
      expect(cacheStats.l1.keys).toBeGreaterThan(0);

      // 5. Re-run search (should hit cache)
      const cachedResult = await orchestrator.search({
        query,
        filters: { jurisdiction: 'ECUADOR' },
        limit: 10,
        offset: 0,
      });

      expect(cachedResult.metadata.cached).toBe(true);
      expect(cachedResult.responseTime).toBeLessThan(result.responseTime);

      // 6. Verify analytics
      const analytics = await orchestrator.getSearchAnalytics();
      expect(analytics.totalQueries).toBeGreaterThan(0);
    });

    it('should handle high concurrency', async () => {
      const queries = [
        'constitución ecuador',
        'código civil',
        'derecho laboral',
        'código penal',
        'ley orgánica',
      ];

      const results = await Promise.all(
        queries.map(query =>
          orchestrator.search({ query, limit: 5, offset: 0 })
        )
      );

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.documents).toBeDefined();
        expect(result.metadata).toBeDefined();
      });
    });

    it('should maintain system health under load', async () => {
      const cacheStatsBefore = await cacheService.getStats();
      const queueStatsBefore = await aiService.getQueueStats();

      // Execute multiple searches
      for (let i = 0; i < 10; i++) {
        await orchestrator.search({
          query: `test query ${i}`,
          limit: 5,
          offset: 0,
        });
      }

      const cacheStatsAfter = await cacheService.getStats();
      const queueStatsAfter = await aiService.getQueueStats();

      // Verify cache is operational
      expect(cacheStatsAfter.l2.isConnected).toBe(true);
      expect(cacheStatsAfter.l3.isConnected).toBe(true);

      // Verify queue is processing
      expect(queueStatsAfter.failed).toBeLessThanOrEqual(queueStatsBefore.failed + 2);
    });
  });
});
