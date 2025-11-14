/**
 * Async OpenAI Service
 * Non-blocking OpenAI API integration with queuing, batching, and streaming
 *
 * @module async-openai-service
 * @author Legal RAG System - Week 3 Architecture
 * @version 1.0.0
 */

import OpenAI from 'openai';
import pQueue from 'p-queue';
import { EventEmitter } from 'events';
import { Logger } from '../../utils/logger';

/**
 * Configuration for Async OpenAI Service
 */
interface AsyncOpenAIConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  maxConcurrency?: number;
  requestsPerMinute?: number;
  batchSize?: number;
  batchDelay?: number;
  retryAttempts?: number;
  retryDelay?: number;
  streamingEnabled?: boolean;
  connectionPoolSize?: number;
}

/**
 * Request types for different OpenAI operations
 */
interface CompletionRequest {
  id: string;
  prompt: string;
  options?: Partial<OpenAI.Chat.ChatCompletionCreateParams>;
  callback?: (result: string) => void;
  error?: (error: Error) => void;
}

/**
 * Batch processing result
 */
interface BatchResult {
  requestId: string;
  result?: string;
  error?: Error;
}

/**
 * Connection pool for parallel requests
 */
class OpenAIConnectionPool {
  private readonly clients: OpenAI[];
  private currentIndex: number = 0;

  constructor(apiKey: string, poolSize: number = 3) {
    this.clients = Array.from({ length: poolSize }, () =>
      new OpenAI({
        apiKey,
        maxRetries: 2,
        timeout: 30000
      })
    );
  }

  getClient(): OpenAI {
    const client = this.clients[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.clients.length;
    return client;
  }
}

/**
 * Async OpenAI Service
 * Handles non-blocking API calls with advanced features
 */
export class AsyncOpenAIService extends EventEmitter {
  private readonly logger = new Logger('AsyncOpenAIService');
  private readonly config: Required<AsyncOpenAIConfig>;
  private readonly queue: pQueue;
  private readonly pool: OpenAIConnectionPool;
  private readonly batch: Map<string, CompletionRequest> = new Map();
  private batchTimer?: NodeJS.Timeout;

  // Performance metrics
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    cacheHits: 0
  };

  constructor(config: AsyncOpenAIConfig = {}) {
    super();

    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
      model: config.model || 'gpt-4-turbo-preview',
      temperature: config.temperature ?? 0.3,
      maxTokens: config.maxTokens ?? 1000,
      maxConcurrency: config.maxConcurrency ?? 5,
      requestsPerMinute: config.requestsPerMinute ?? 60,
      batchSize: config.batchSize ?? 5,
      batchDelay: config.batchDelay ?? 100,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      streamingEnabled: config.streamingEnabled ?? true,
      connectionPoolSize: config.connectionPoolSize ?? 3
    };

    // Initialize connection pool
    this.pool = new OpenAIConnectionPool(
      this.config.apiKey,
      this.config.connectionPoolSize
    );

    // Initialize request queue with rate limiting
    this.queue = new pQueue({
      concurrency: this.config.maxConcurrency,
      interval: 60000, // 1 minute
      intervalCap: this.config.requestsPerMinute
    });

    // Queue event handlers
    this.queue.on('active', () => {
      this.logger.debug(`Queue active. Size: ${this.queue.size}, Pending: ${this.queue.pending}`);
    });

    this.queue.on('idle', () => {
      this.logger.debug('Queue idle');
      this.emit('idle');
    });

    this.logger.info('AsyncOpenAIService initialized', {
      model: this.config.model,
      concurrency: this.config.maxConcurrency,
      rateLimit: this.config.requestsPerMinute
    });
  }

  /**
   * Process a completion request asynchronously
   */
  async processAsync(
    prompt: string,
    options: Partial<OpenAI.Chat.ChatCompletionCreateParams> = {}
  ): Promise<string> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    this.metrics.totalRequests++;

    return this.queue.add(async () => {
      try {
        this.logger.debug('Processing async request', { requestId });

        const client = this.pool.getClient();
        const completion = await this.retryWithBackoff(async () => {
          return client.chat.completions.create({
            model: options.model || this.config.model,
            messages: [
              {
                role: 'system',
                content: 'You are a legal assistant specializing in Ecuadorian law.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: options.temperature ?? this.config.temperature,
            max_tokens: options.max_tokens ?? this.config.maxTokens,
            ...options
          });
        });

        const result = completion.choices[0]?.message?.content || '';

        // Update metrics
        this.metrics.successfulRequests++;
        this.updateAvgResponseTime(Date.now() - startTime);

        this.emit('completion', { requestId, result, responseTime: Date.now() - startTime });

        return result;

      } catch (error) {
        this.metrics.failedRequests++;
        this.logger.error('Async processing failed', { requestId, error });
        this.emit('error', { requestId, error });
        throw error;
      }
    });
  }

  /**
   * Stream a completion response
   */
  async *streamResponse(
    prompt: string,
    options: Partial<OpenAI.Chat.ChatCompletionCreateParams> = {}
  ): AsyncIterator<string> {
    if (!this.config.streamingEnabled) {
      const result = await this.processAsync(prompt, options);
      yield result;
      return;
    }

    const requestId = this.generateRequestId();
    const client = this.pool.getClient();

    try {
      const stream = await client.chat.completions.create({
        model: options.model || this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a legal assistant specializing in Ecuadorian law.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature ?? this.config.temperature,
        max_tokens: options.max_tokens ?? this.config.maxTokens,
        stream: true,
        ...options
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
          this.emit('stream-chunk', { requestId, chunk: content });
        }
      }

    } catch (error) {
      this.logger.error('Streaming failed', { requestId, error });
      this.emit('stream-error', { requestId, error });
      throw error;
    }
  }

  /**
   * Add request to batch for processing
   */
  async addToBatch(request: CompletionRequest): Promise<void> {
    this.batch.set(request.id, request);

    // Process batch if it reaches the size limit
    if (this.batch.size >= this.config.batchSize) {
      await this.processBatch();
      return;
    }

    // Set timer for batch processing if not already set
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.config.batchDelay);
    }
  }

  /**
   * Process batched requests
   */
  private async processBatch(): Promise<BatchResult[]> {
    if (this.batch.size === 0) return [];

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Extract batch
    const requests = Array.from(this.batch.values());
    this.batch.clear();

    this.logger.debug(`Processing batch of ${requests.length} requests`);

    // Process all requests in parallel
    const results = await Promise.allSettled(
      requests.map(async (request) => {
        try {
          const result = await this.processAsync(
            request.prompt,
            request.options
          );

          // Call callback if provided
          if (request.callback) {
            request.callback(result);
          }

          return {
            requestId: request.id,
            result
          } as BatchResult;

        } catch (error) {
          // Call error callback if provided
          if (request.error) {
            request.error(error as Error);
          }

          return {
            requestId: request.id,
            error: error as Error
          } as BatchResult;
        }
      })
    );

    // Extract results
    return results.map(r =>
      r.status === 'fulfilled' ? r.value : { requestId: '', error: new Error('Processing failed') }
    );
  }

  /**
   * Generate suggestions for autocomplete
   */
  async generateSuggestions(
    partial: string,
    topics: string[] = [],
    entities: string[] = []
  ): Promise<string[]> {
    const prompt = `
      Given the partial legal query: "${partial}"
      Related topics: ${topics.join(', ')}
      Related entities: ${entities.join(', ')}

      Generate 5 query suggestions in Spanish that complete or extend this query.
      Focus on Ecuadorian legal context.
      Return only the suggestions as a JSON array.
    `;

    try {
      const result = await this.processAsync(prompt, {
        temperature: 0.5,
        max_tokens: 200
      });

      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : [];

    } catch (error) {
      this.logger.error('Failed to generate suggestions', { error });
      return [];
    }
  }

  /**
   * Generate follow-up queries
   */
  async generateFollowUpQueries(
    originalQuery: string,
    entities: string[],
    topResults: any[]
  ): Promise<string[]> {
    const prompt = `
      Original query: "${originalQuery}"
      Entities found: ${entities.join(', ')}
      Top results: ${topResults.map(r => r.title).join(', ')}

      Generate 3 follow-up queries that would help the user explore related legal topics.
      Focus on Ecuadorian law and make queries specific and actionable.
      Return only the queries as a JSON array in Spanish.
    `;

    try {
      const result = await this.processAsync(prompt, {
        temperature: 0.6,
        max_tokens: 200
      });

      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : [];

    } catch (error) {
      this.logger.error('Failed to generate follow-up queries', { error });
      return [];
    }
  }

  /**
   * Analyze query intent using LLM
   */
  async analyzeIntent(query: string): Promise<any> {
    const prompt = `
      Analyze the intent of this legal query: "${query}"

      Determine:
      1. Primary intent (search, definition, comparison, analysis)
      2. Legal domain (civil, criminal, constitutional, etc.)
      3. Urgency level (immediate, standard, research)
      4. Complexity (simple, moderate, complex)

      Return as JSON with these fields.
    `;

    try {
      const result = await this.processAsync(prompt, {
        temperature: 0.2,
        max_tokens: 200
      });

      return JSON.parse(result);

    } catch (error) {
      this.logger.error('Failed to analyze intent', { error });
      return {
        intent: 'search',
        domain: 'general',
        urgency: 'standard',
        complexity: 'moderate'
      };
    }
  }

  /**
   * Extract entities from text using LLM
   */
  async extractEntities(text: string): Promise<any[]> {
    const prompt = `
      Extract legal entities from this text: "${text}"

      Identify:
      - Law names and numbers
      - Article references
      - Legal institutions
      - Dates and deadlines
      - Legal concepts

      Return as JSON array with type and value for each entity.
    `;

    try {
      const result = await this.processAsync(prompt, {
        temperature: 0.1,
        max_tokens: 300
      });

      return JSON.parse(result);

    } catch (error) {
      this.logger.error('Failed to extract entities', { error });
      return [];
    }
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt >= this.config.retryAttempts) {
        throw error;
      }

      const delay = this.config.retryDelay * Math.pow(2, attempt - 1);

      this.logger.warn(`Retrying after ${delay}ms (attempt ${attempt}/${this.config.retryAttempts})`, {
        error: error.message
      });

      await this.sleep(delay);

      return this.retryWithBackoff(fn, attempt + 1);
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Update average response time metric
   */
  private updateAvgResponseTime(responseTime: number): void {
    const total = this.metrics.avgResponseTime * (this.metrics.successfulRequests - 1);
    this.metrics.avgResponseTime = (total + responseTime) / this.metrics.successfulRequests;
  }

  /**
   * Get service metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Clear the request queue
   */
  clearQueue(): void {
    this.queue.clear();
    this.batch.clear();

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
  }

  /**
   * Wait for all queued requests to complete
   */
  async waitForCompletion(): Promise<void> {
    await this.queue.onIdle();
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return {
      size: this.queue.size,
      pending: this.queue.pending,
      isPaused: this.queue.isPaused
    };
  }
}