import { getOpenAIQueueService } from '../queue/openai-queue.service';
import { getMultiTierCacheService } from '../cache/multi-tier-cache.service';
import { getTracingService } from '../observability/tracing.service';
import { getMetricsService } from '../observability/metrics.service';
import crypto from 'crypto';

/**
 * Async OpenAI Service
 *
 * High-level service for async OpenAI operations with caching
 * Features:
 * - Async processing via Bull queue
 * - Multi-tier caching
 * - Hash-based cache keys
 * - Result polling
 * - Week 5-6: OpenTelemetry tracing and metrics
 */
export class AsyncOpenAIService {
  private queue = getOpenAIQueueService();
  private cache = getMultiTierCacheService();
  private tracing = getTracingService();
  private metrics = getMetricsService();

  /**
   * Generate embedding async (with caching)
   */
  async generateEmbeddingAsync(text: string): Promise<{
    jobId?: string;
    embedding?: number[];
    cached: boolean;
  }> {
    return this.tracing.traceAICall('openai', 'text-embedding-3-small', 'embedding', async () => {
      const startTime = Date.now();

      // Generate cache key
      const cacheKey = this.generateCacheKey('embedding', text);

      // Check cache
      const cached = await this.cache.get<number[]>(cacheKey);
      if (cached.value) {
        this.metrics.recordAICall('openai', 'text-embedding-3-small', 'embedding', (Date.now() - startTime) / 1000);
        return { embedding: cached.value, cached: true };
      }

      // Add to queue
      const job = await this.queue.addJob({
        type: 'embedding',
        payload: { text },
        priority: 5,
      });

      this.metrics.recordAICall('openai', 'text-embedding-3-small', 'embedding', (Date.now() - startTime) / 1000);
      return { jobId: job.id as string, cached: false };
    });
  }

  /**
   * Generate chat completion async (with caching)
   */
  async generateChatCompletionAsync(
    messages: any[],
    temperature: number = 0.7
  ): Promise<{
    jobId?: string;
    response?: string;
    cached: boolean;
  }> {
    return this.tracing.traceAICall('openai', 'gpt-4', 'chat', async () => {
      const startTime = Date.now();

      // Generate cache key from messages
      const cacheKey = this.generateCacheKey('chat', JSON.stringify({ messages, temperature }));

      // Check cache
      const cached = await this.cache.get<string>(cacheKey);
      if (cached.value) {
        this.metrics.recordAICall('openai', 'gpt-4', 'chat', (Date.now() - startTime) / 1000);
        return { response: cached.value, cached: true };
      }

      // Add to queue
      const job = await this.queue.addJob({
        type: 'chat',
        payload: { messages, temperature },
        priority: 3,
      });

      this.metrics.recordAICall('openai', 'gpt-4', 'chat', (Date.now() - startTime) / 1000);
      return { jobId: job.id as string, cached: false };
    });
  }

  /**
   * Extract structured data async (with caching)
   */
  async extractDataAsync(
    content: string,
    schema: any
  ): Promise<{
    jobId?: string;
    data?: any;
    cached: boolean;
  }> {
    // Generate cache key
    const cacheKey = this.generateCacheKey('extraction', JSON.stringify({ content, schema }));

    // Check cache
    const cached = await this.cache.get<any>(cacheKey);
    if (cached.value) {
      return { data: cached.value, cached: true };
    }

    // Add to queue
    const job = await this.queue.addJob({
      type: 'extraction',
      payload: { content, schema },
      priority: 7,
    });

    return { jobId: job.id as string, cached: false };
  }

  /**
   * Poll job status and get result
   */
  async getJobResult(jobId: string, maxAttempts: number = 10): Promise<{
    status: string;
    result?: any;
    error?: string;
  }> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.queue.getJobStatus(jobId);

      if (status === 'completed' || status === 'failed') {
        return {
          status: status || 'unknown',
          result: status === 'completed' ? await this.getCompletedJobData(jobId) : undefined,
          error: status === 'failed' ? 'Job failed' : undefined,
        };
      }

      // Wait before next poll (exponential backoff)
      await this.sleep(Math.min(1000 * Math.pow(2, attempt), 5000));
    }

    return {
      status: 'timeout',
      error: 'Max polling attempts reached',
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    return this.queue.getQueueStats();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    l1: { keys: number; hits: number; misses: number };
    l2: { isConnected: boolean };
    l3: { isConnected: boolean };
    hitRate: number;
  }> {
    const stats = await this.cache.getStats();
    const hitRate = this.cache.getCacheHitRate();

    return {
      ...stats,
      hitRate,
    };
  }

  /**
   * Clear cache for OpenAI operations
   */
  async clearCache(pattern?: string): Promise<number> {
    if (pattern) {
      return this.cache.invalidatePattern(pattern);
    }
    await this.cache.clear();
    return 0;
  }

  /**
   * Extract structured data (synchronous wrapper with wait)
   * For use in search orchestrator where we need immediate results
   */
  async extractStructuredData(text: string, schema: any): Promise<any> {
    const result = await this.extractDataAsync(text, schema);

    if (result.cached && result.data) {
      return result.data;
    }

    if (result.jobId) {
      // Poll for result (max 5 seconds)
      const jobResult = await this.getJobResult(result.jobId, 5);
      if (jobResult.status === 'completed' && jobResult.result) {
        return jobResult.result;
      }
    }

    // Fallback: return null if no result
    return null;
  }

  /**
   * Generate embedding (synchronous wrapper with wait)
   * For use in RAG enhancement where we need immediate results
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    const result = await this.generateEmbeddingAsync(text);

    if (result.cached && result.embedding) {
      return result.embedding;
    }

    if (result.jobId) {
      // Poll for result (max 5 seconds)
      const jobResult = await this.getJobResult(result.jobId, 5);
      if (jobResult.status === 'completed' && jobResult.result) {
        return jobResult.result;
      }
    }

    // Fallback: return null if no result
    return null;
  }

  /**
   * Generate deterministic cache key
   */
  private generateCacheKey(type: string, input: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(input)
      .digest('hex')
      .substring(0, 16);

    return `openai:${type}:${hash}`;
  }

  /**
   * Helper: Get completed job data (implementation depends on Bull setup)
   */
  private async getCompletedJobData(jobId: string): Promise<any> {
    // This is a placeholder - actual implementation would retrieve job result
    // from Bull queue or Redis
    return { jobId, message: 'Result retrieval not implemented' };
  }

  /**
   * Helper: Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

let asyncOpenAIInstance: AsyncOpenAIService | null = null;

export function getAsyncOpenAIService(): AsyncOpenAIService {
  if (!asyncOpenAIInstance) {
    asyncOpenAIInstance = new AsyncOpenAIService();
  }
  return asyncOpenAIInstance;
}
