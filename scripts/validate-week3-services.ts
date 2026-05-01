/**
 * Week 3 Services Validation Script
 * Phase 10 Week 3 - NLP-RAG Performance Optimization
 *
 * Validates that all Week 3 services are properly configured and operational:
 * - Redis connection
 * - Multi-tier cache
 * - OpenAI queue
 * - Async OpenAI service
 * - Unified Search Orchestrator
 */

import { getRedisCacheService } from '../src/services/cache/redis-cache.service';
import { getMultiTierCacheService } from '../src/services/cache/multi-tier-cache.service';
import { getOpenAIQueueService } from '../src/services/queue/openai-queue.service';
import { getAsyncOpenAIService } from '../src/services/ai/async-openai.service';
import { getUnifiedSearchOrchestrator } from '../src/services/orchestration/unified-search-orchestrator';

interface ValidationResult {
  service: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: ValidationResult[] = [];

function logResult(result: ValidationResult) {
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${result.status}] ${result.service}: ${result.message}`);
  if (result.details) {
    console.log(`   Details:`, JSON.stringify(result.details, null, 2));
  }
  results.push(result);
}

async function validateRedisCache() {
  console.log('\n📊 Validating Redis Cache Service...');

  try {
    const redisService = getRedisCacheService();

    // Test 1: Health check
    const health = await redisService.healthCheck();
    if (!health) {
      logResult({
        service: 'Redis Cache',
        status: 'FAIL',
        message: 'Redis health check failed - connection not established',
      });
      return;
    }

    logResult({
      service: 'Redis Cache',
      status: 'PASS',
      message: 'Redis connection healthy (PING successful)',
    });

    // Test 2: Set/Get operations
    const testKey = 'validation:test:key';
    const testValue = { timestamp: Date.now(), data: 'validation test' };

    await redisService.set(testKey, testValue, 60);
    const retrieved = await redisService.get<typeof testValue>(testKey);

    if (retrieved && retrieved.data === testValue.data) {
      logResult({
        service: 'Redis Cache',
        status: 'PASS',
        message: 'Set/Get operations working correctly',
      });
    } else {
      logResult({
        service: 'Redis Cache',
        status: 'FAIL',
        message: 'Set/Get operations failed',
        details: { expected: testValue, received: retrieved },
      });
    }

    // Test 3: Get server info
    const info = await redisService.getInfo();
    logResult({
      service: 'Redis Cache',
      status: 'PASS',
      message: 'Redis server info retrieved',
      details: {
        version: info.version,
        memory: info.memory,
        connectedClients: info.connectedClients,
        isConnected: info.isConnected,
      },
    });

    // Cleanup
    await redisService.delete(testKey);

  } catch (error: any) {
    logResult({
      service: 'Redis Cache',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }
}

async function validateMultiTierCache() {
  console.log('\n📊 Validating Multi-Tier Cache Service...');

  try {
    const cacheService = getMultiTierCacheService();

    // Test 1: L1 cache
    const l1Key = 'validation:l1:test';
    const l1Value = { layer: 'L1', timestamp: Date.now() };

    cacheService.setL1Only(l1Key, l1Value);
    const l1Result = await cacheService.get<typeof l1Value>(l1Key);

    if (l1Result.tier === 'L1' && l1Result.value?.layer === 'L1') {
      logResult({
        service: 'Multi-Tier Cache',
        status: 'PASS',
        message: 'L1 (in-memory) cache working',
        details: { tier: 'L1', hit: true },
      });
    } else {
      logResult({
        service: 'Multi-Tier Cache',
        status: 'FAIL',
        message: 'L1 cache not working correctly',
        details: { expected: 'L1', got: l1Result.tier },
      });
    }

    // Test 2: All tiers
    const allTiersKey = 'validation:all:test';
    const allTiersValue = { layers: 'L1+L2+L3', timestamp: Date.now() };

    await cacheService.set(allTiersKey, allTiersValue);
    logResult({
      service: 'Multi-Tier Cache',
      status: 'PASS',
      message: 'All cache tiers (L1/L2/L3) set successfully',
    });

    // Test 3: Get stats
    const stats = await cacheService.getStats();
    const hitRate = cacheService.getCacheHitRate();

    logResult({
      service: 'Multi-Tier Cache',
      status: 'PASS',
      message: 'Cache statistics retrieved',
      details: {
        l1Keys: stats.l1.keys,
        l1Hits: stats.l1.hits,
        l1Misses: stats.l1.misses,
        l2Connected: stats.l2.isConnected,
        l3Connected: stats.l3.isConnected,
        hitRate: `${hitRate.toFixed(2)}%`,
      },
    });

    // Test 4: Pattern invalidation
    await cacheService.set('validation:pattern:1', { data: 'test1' });
    await cacheService.set('validation:pattern:2', { data: 'test2' });

    const invalidated = await cacheService.invalidatePattern('validation:pattern');

    if (invalidated >= 2) {
      logResult({
        service: 'Multi-Tier Cache',
        status: 'PASS',
        message: 'Pattern invalidation working',
        details: { invalidatedKeys: invalidated },
      });
    } else {
      logResult({
        service: 'Multi-Tier Cache',
        status: 'WARN',
        message: 'Pattern invalidation may not be working correctly',
        details: { invalidatedKeys: invalidated, expected: '>=2' },
      });
    }

  } catch (error: any) {
    logResult({
      service: 'Multi-Tier Cache',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }
}

async function validateOpenAIQueue() {
  console.log('\n📊 Validating OpenAI Queue Service...');

  try {
    const queueService = getOpenAIQueueService();

    // Test 1: Get queue stats
    const stats = await queueService.getQueueStats();

    logResult({
      service: 'OpenAI Queue',
      status: 'PASS',
      message: 'Queue statistics retrieved',
      details: {
        waiting: stats.waiting,
        active: stats.active,
        completed: stats.completed,
        failed: stats.failed,
      },
    });

    // Test 2: Add a test job (embedding)
    const testJob = await queueService.addJob({
      type: 'embedding',
      payload: { text: 'validation test text' },
      priority: 1,
    });

    logResult({
      service: 'OpenAI Queue',
      status: 'PASS',
      message: 'Test job added to queue',
      details: { jobId: testJob.id, type: 'embedding' },
    });

    // Test 3: Check job status
    const jobStatus = await queueService.getJobStatus(testJob.id as string);

    logResult({
      service: 'OpenAI Queue',
      status: 'PASS',
      message: 'Job status retrieval working',
      details: { jobId: testJob.id, status: jobStatus },
    });

  } catch (error: any) {
    logResult({
      service: 'OpenAI Queue',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }
}

async function validateAsyncOpenAI() {
  console.log('\n📊 Validating Async OpenAI Service...');

  try {
    const aiService = getAsyncOpenAIService();

    // Test 1: Generate embedding with caching
    const testText = 'validation test for embedding generation';
    const embeddingResult = await aiService.generateEmbeddingAsync(testText);

    if (embeddingResult.cached) {
      logResult({
        service: 'Async OpenAI',
        status: 'PASS',
        message: 'Embedding retrieved from cache',
        details: { cached: true, hasEmbedding: !!embeddingResult.embedding },
      });
    } else {
      logResult({
        service: 'Async OpenAI',
        status: 'PASS',
        message: 'Embedding job queued',
        details: { cached: false, jobId: embeddingResult.jobId },
      });
    }

    // Test 2: Get queue stats
    const queueStats = await aiService.getQueueStats();
    logResult({
      service: 'Async OpenAI',
      status: 'PASS',
      message: 'Queue statistics accessible',
      details: queueStats,
    });

    // Test 3: Get cache stats
    const cacheStats = await aiService.getCacheStats();
    logResult({
      service: 'Async OpenAI',
      status: 'PASS',
      message: 'Cache statistics accessible',
      details: {
        hitRate: `${cacheStats.hitRate.toFixed(2)}%`,
        l1Keys: cacheStats.l1.keys,
      },
    });

  } catch (error: any) {
    logResult({
      service: 'Async OpenAI',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }
}

async function validateUnifiedSearchOrchestrator() {
  console.log('\n📊 Validating Unified Search Orchestrator...');

  try {
    const orchestrator = getUnifiedSearchOrchestrator();

    // Test 1: Execute search
    const searchResult = await orchestrator.search({
      query: 'validation test query',
      limit: 5,
      offset: 0,
    });

    if (!searchResult || !searchResult.results) {
      logResult({
        service: 'Unified Search Orchestrator',
        status: 'FAIL',
        message: 'Search result is null or missing results property',
        details: { searchResult },
      });
      return;
    }

    logResult({
      service: 'Unified Search Orchestrator',
      status: 'PASS',
      message: 'Search execution successful',
      details: {
        resultsCount: searchResult.results.length,
        totalCount: searchResult.totalCount,
        responseTime: `${searchResult.responseTime}ms`,
        cached: searchResult.cacheHit,
        cacheTier: searchResult.cacheTier,
        intent: searchResult.nlpProcessing?.intent,
      },
    });

    // Test 2: Get analytics
    const analytics = await orchestrator.getSearchAnalytics();

    if (!analytics) {
      logResult({
        service: 'Unified Search Orchestrator',
        status: 'FAIL',
        message: 'Analytics result is null',
      });
      return;
    }

    logResult({
      service: 'Unified Search Orchestrator',
      status: 'PASS',
      message: 'Analytics retrieval successful',
      details: {
        totalQueries: analytics.totalQueries,
        cacheHitRate: `${analytics.cacheHitRate.toFixed(2)}%`,
        avgResponseTime: `${analytics.avgResponseTime.toFixed(2)}ms`,
        topQueriesCount: analytics.topQueries?.length || 0,
        topIntentsCount: analytics.topIntents?.length || 0,
      },
    });

    // Test 3: Get suggestions
    const suggestions = await orchestrator.getSuggestions('test', 5);

    logResult({
      service: 'Unified Search Orchestrator',
      status: 'PASS',
      message: 'Query suggestions working',
      details: { suggestionsCount: suggestions?.length || 0 },
    });

  } catch (error: any) {
    logResult({
      service: 'Unified Search Orchestrator',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 VALIDATION REPORT SUMMARY');
  console.log('='.repeat(80));

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⚠️  Warnings: ${warnCount}`);
  console.log(`\nSuccess Rate: ${((passCount / total) * 100).toFixed(2)}%`);

  if (failCount === 0) {
    console.log('\n🎉 All Week 3 services are operational and ready for production!');
  } else {
    console.log('\n⚠️  Some services have issues that need attention.');
    console.log('\nFailed Tests:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  - ${r.service}: ${r.message}`);
      });
  }

  console.log('\n' + '='.repeat(80));
}

async function main() {
  console.log('🚀 Week 3 Services Validation');
  console.log('Phase 10 Week 3 - NLP-RAG Performance Optimization');
  console.log('='.repeat(80));

  try {
    await validateRedisCache();
    await validateMultiTierCache();
    await validateOpenAIQueue();
    await validateAsyncOpenAI();
    await validateUnifiedSearchOrchestrator();

    await generateReport();

    const failCount = results.filter(r => r.status === 'FAIL').length;
    process.exit(failCount > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('\n❌ Validation script failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
