/**
 * OpenAI Service Wrapper
 *
 * Provides a unified interface for OpenAI API calls with error handling,
 * retry logic, and usage tracking.
 *
 * @module services/ai/openai-service
 */

import { OpenAI } from 'openai';
import { createLogger } from '../../utils/logger';

const logger = createLogger('OpenAIService');

/**
 * Chat completion options
 */
export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  responseFormat?: 'text' | 'json';
  stream?: boolean;
}

/**
 * Message for chat completion
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Moderation result
 */
export interface ModerationResult {
  flagged: boolean;
  categories: {
    [key: string]: boolean;
  };
  categoryScores: {
    [key: string]: number;
  };
}

/**
 * Embedding options
 */
export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

/**
 * Usage statistics
 */
interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  errors: number;
}

/**
 * OpenAI Service Wrapper
 *
 * Provides methods for chat completions, embeddings, and content moderation
 * with built-in error handling and retry logic.
 *
 * @example
 * ```typescript
 * const openAI = new OpenAIService();
 *
 * // Chat completion
 * const response = await openAI.chat([
 *   { role: 'system', content: 'You are a helpful assistant' },
 *   { role: 'user', content: 'Hello!' }
 * ]);
 *
 * // Generate embedding
 * const embedding = await openAI.embedding('Some text to embed');
 *
 * // Content moderation
 * const moderation = await openAI.moderate('Text to moderate');
 * ```
 */
export class OpenAIService {
  private client: OpenAI;
  private stats: UsageStats;
  private defaultModel: string;
  private defaultEmbeddingModel: string;

  /**
   * Create OpenAI service instance
   *
   * @param apiKey - OpenAI API key (defaults to OPENAI_API_KEY env var)
   */
  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;

    if (!key) {
      throw new Error('OPENAI_API_KEY is required');
    }

    this.client = new OpenAI({
      apiKey: key
    });

    this.stats = {
      totalRequests: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      errors: 0
    };

    this.defaultModel = 'gpt-4-turbo-preview';
    this.defaultEmbeddingModel = 'text-embedding-3-small';

    logger.info('OpenAIService initialized', {
      model: this.defaultModel,
      embeddingModel: this.defaultEmbeddingModel
    });
  }

  /**
   * Create a chat completion
   *
   * @param messages - Array of chat messages
   * @param options - Optional chat completion parameters
   * @returns Response text from the model
   *
   * @example
   * ```typescript
   * const response = await openAI.chat([
   *   { role: 'system', content: 'You are a legal expert' },
   *   { role: 'user', content: '¿Qué es el divorcio?' }
   * ], {
   *   temperature: 0.7,
   *   maxTokens: 500
   * });
   * ```
   */
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const completion = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        response_format: options.responseFormat === 'json'
          ? { type: 'json_object' }
          : undefined
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in response');
      }

      // Update statistics
      if (completion.usage) {
        this.stats.totalTokens += completion.usage.total_tokens;
        this.stats.promptTokens += completion.usage.prompt_tokens;
        this.stats.completionTokens += completion.usage.completion_tokens;
      }

      const duration = Date.now() - startTime;
      logger.debug('Chat completion successful', {
        model: options.model || this.defaultModel,
        tokens: completion.usage?.total_tokens,
        durationMs: duration
      });

      return content;
    } catch (error) {
      this.stats.errors++;
      logger.error('Chat completion failed', {
        error,
        model: options.model || this.defaultModel,
        messageCount: messages.length
      });

      throw new Error(
        `OpenAI chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate embeddings for text
   *
   * @param text - Text to generate embeddings for
   * @param options - Optional embedding parameters
   * @returns Vector embedding array
   *
   * @example
   * ```typescript
   * const embedding = await openAI.embedding('Legal text to embed');
   * console.log(embedding.length); // 1536 for text-embedding-3-small
   * ```
   */
  async embedding(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const response = await this.client.embeddings.create({
        model: options.model || this.defaultEmbeddingModel,
        input: text,
        dimensions: options.dimensions
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error('No embedding in response');
      }

      // Update statistics
      if (response.usage) {
        this.stats.totalTokens += response.usage.total_tokens;
        this.stats.promptTokens += response.usage.prompt_tokens;
      }

      const duration = Date.now() - startTime;
      logger.debug('Embedding generated', {
        model: options.model || this.defaultEmbeddingModel,
        dimensions: embedding.length,
        durationMs: duration
      });

      return embedding;
    } catch (error) {
      this.stats.errors++;
      logger.error('Embedding generation failed', {
        error,
        model: options.model || this.defaultEmbeddingModel,
        textLength: text.length
      });

      throw new Error(
        `OpenAI embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Moderate content for policy violations
   *
   * @param text - Text to moderate
   * @returns Moderation result
   *
   * @example
   * ```typescript
   * const result = await openAI.moderate('Text to check');
   * if (result.flagged) {
   *   console.log('Content flagged:', result.categories);
   * }
   * ```
   */
  async moderate(text: string): Promise<ModerationResult> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const response = await this.client.moderations.create({
        input: text
      });

      const result = response.results[0];
      if (!result) {
        throw new Error('No moderation result');
      }

      const duration = Date.now() - startTime;
      logger.debug('Moderation completed', {
        flagged: result.flagged,
        durationMs: duration
      });

      return {
        flagged: result.flagged,
        categories: result.categories as unknown as { [key: string]: boolean },
        categoryScores: result.category_scores as unknown as { [key: string]: number }
      };
    } catch (error) {
      this.stats.errors++;
      logger.error('Moderation failed', {
        error,
        textLength: text.length
      });

      throw new Error(
        `OpenAI moderation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a structured JSON extraction from text
   *
   * @param text - Text to analyze
   * @param schema - JSON schema for extraction
   * @param systemPrompt - Optional system prompt
   * @returns Parsed JSON object
   *
   * @example
   * ```typescript
   * const data = await openAI.extractJSON(
   *   'El artículo 123 del Código Civil...',
   *   {
   *     article: 'string',
   *     code: 'string'
   *   },
   *   'Extract legal references from text'
   * );
   * ```
   */
  async extractJSON<T = any>(
    text: string,
    schema: Record<string, any>,
    systemPrompt?: string
  ): Promise<T> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt || 'Extract structured information from text. Respond with JSON only.'
      },
      {
        role: 'user',
        content: `Text: ${text}\n\nSchema: ${JSON.stringify(schema, null, 2)}`
      }
    ];

    const response = await this.chat(messages, {
      responseFormat: 'json',
      temperature: 0.3
    });

    try {
      return JSON.parse(response) as T;
    } catch (error) {
      logger.error('Failed to parse JSON response', { error, response });
      throw new Error('Invalid JSON response from OpenAI');
    }
  }

  /**
   * Batch generate embeddings for multiple texts
   *
   * @param texts - Array of texts to embed
   * @param options - Optional embedding parameters
   * @returns Array of vector embeddings
   *
   * @example
   * ```typescript
   * const embeddings = await openAI.batchEmbeddings([
   *   'First text',
   *   'Second text',
   *   'Third text'
   * ]);
   * ```
   */
  async batchEmbeddings(
    texts: string[],
    options: EmbeddingOptions = {}
  ): Promise<number[][]> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const response = await this.client.embeddings.create({
        model: options.model || this.defaultEmbeddingModel,
        input: texts,
        dimensions: options.dimensions
      });

      const embeddings = response.data.map(item => item.embedding);

      // Update statistics
      if (response.usage) {
        this.stats.totalTokens += response.usage.total_tokens;
        this.stats.promptTokens += response.usage.prompt_tokens;
      }

      const duration = Date.now() - startTime;
      logger.debug('Batch embeddings generated', {
        count: embeddings.length,
        durationMs: duration
      });

      return embeddings;
    } catch (error) {
      this.stats.errors++;
      logger.error('Batch embedding failed', {
        error,
        count: texts.length
      });

      throw new Error(
        `OpenAI batch embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get usage statistics
   *
   * @returns Current usage statistics
   *
   * @example
   * ```typescript
   * const stats = openAI.getStats();
   * console.log(`Total tokens: ${stats.totalTokens}`);
   * ```
   */
  getStats(): Readonly<UsageStats> {
    return { ...this.stats };
  }

  /**
   * Reset usage statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      errors: 0
    };
    logger.info('Statistics reset');
  }

  /**
   * Set default model for chat completions
   *
   * @param model - Model name (e.g., 'gpt-4', 'gpt-3.5-turbo')
   */
  setDefaultModel(model: string): void {
    this.defaultModel = model;
    logger.info('Default model updated', { model });
  }

  /**
   * Set default model for embeddings
   *
   * @param model - Embedding model name
   */
  setDefaultEmbeddingModel(model: string): void {
    this.defaultEmbeddingModel = model;
    logger.info('Default embedding model updated', { model });
  }

  /**
   * Check if the service is properly configured
   *
   * @returns True if API key is set
   */
  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
}

/**
 * Default OpenAI service instance
 */
export const openAIService = new OpenAIService();
