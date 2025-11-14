/**
 * Embedding Service - Semantic embeddings for legal documents
 * Phase 6: Semantic Embeddings Enhancement
 *
 * Replaces Jaccard similarity with real embeddings using OpenAI
 * Supports Spanish legal text with optimized model selection
 */

import { OpenAIEmbeddings } from '@langchain/openai';

export interface EmbeddingConfig {
  modelName: string;
  dimensions?: number;
  batchSize?: number;
  maxRetries?: number;
  timeout?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
  tokenCount: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  dimensions: number;
  model: string;
  totalTokens: number;
  processedCount: number;
  failedIndices: number[];
}

export interface CachedEmbedding {
  text: string;
  embedding: number[];
  model: string;
  createdAt: Date;
  tokenCount: number;
}

/**
 * Default configuration for Spanish legal text
 * Using text-embedding-3-small for cost-effectiveness
 * Upgrading to text-embedding-3-large for better semantic understanding
 */
export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  modelName: 'text-embedding-3-small', // Cost-effective, good for Spanish
  dimensions: 1536, // Standard dimensions
  batchSize: 100, // Process in batches to avoid rate limits
  maxRetries: 3,
  timeout: 30000 // 30 seconds
};

/**
 * Large model configuration for complex legal reasoning
 */
export const LARGE_EMBEDDING_CONFIG: EmbeddingConfig = {
  modelName: 'text-embedding-3-large',
  dimensions: 3072, // Larger dimensions for better semantics
  batchSize: 50,
  maxRetries: 3,
  timeout: 45000
};

/**
 * EmbeddingService - Generate and cache embeddings for legal documents
 */
export class EmbeddingService {
  private embeddings: OpenAIEmbeddings;
  private config: EmbeddingConfig;
  private cache: Map<string, CachedEmbedding>;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor(config: EmbeddingConfig = DEFAULT_EMBEDDING_CONFIG) {
    this.config = config;
    this.cache = new Map();

    // Initialize OpenAI Embeddings
    this.embeddings = new OpenAIEmbeddings({
      modelName: config.modelName,
      dimensions: config.dimensions,
      maxRetries: config.maxRetries,
      timeout: config.timeout
    });
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<EmbeddingResult> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(text);
      const cached = this.cache.get(cacheKey);

      if (cached && cached.model === this.config.modelName) {
        this.cacheHits++;
        console.log(`[EmbeddingService] Cache hit for text (${text.substring(0, 50)}...)`);

        return {
          embedding: cached.embedding,
          dimensions: cached.embedding.length,
          model: cached.model,
          tokenCount: cached.tokenCount
        };
      }

      this.cacheMisses++;
      console.log(`[EmbeddingService] Generating embedding for text: ${text.substring(0, 100)}...`);

      // Generate new embedding
      const embedding = await this.embeddings.embedQuery(text);

      // Estimate token count (rough approximation for Spanish)
      const tokenCount = this.estimateTokenCount(text);

      // Cache the result
      this.cache.set(cacheKey, {
        text,
        embedding,
        model: this.config.modelName,
        createdAt: new Date(),
        tokenCount
      });

      console.log(`[EmbeddingService] Generated embedding with ${embedding.length} dimensions, ~${tokenCount} tokens`);

      return {
        embedding,
        dimensions: embedding.length,
        model: this.config.modelName,
        tokenCount
      };
    } catch (error) {
      console.error('[EmbeddingService] Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    const embeddings: number[][] = [];
    const failedIndices: number[] = [];
    let totalTokens = 0;

    console.log(`[EmbeddingService] Processing ${texts.length} texts in batches of ${this.config.batchSize}`);

    // Process in batches
    for (let i = 0; i < texts.length; i += this.config.batchSize!) {
      const batch = texts.slice(i, i + this.config.batchSize!);
      const batchStart = i;

      try {
        // Check cache for each text
        const batchResults: number[][] = [];
        const uncachedTexts: string[] = [];
        const uncachedIndices: number[] = [];

        for (let j = 0; j < batch.length; j++) {
          const text = batch[j];
          const cacheKey = this.getCacheKey(text);
          const cached = this.cache.get(cacheKey);

          if (cached && cached.model === this.config.modelName) {
            batchResults[j] = cached.embedding;
            totalTokens += cached.tokenCount;
            this.cacheHits++;
          } else {
            uncachedTexts.push(text);
            uncachedIndices.push(j);
            this.cacheMisses++;
          }
        }

        // Generate embeddings for uncached texts
        if (uncachedTexts.length > 0) {
          console.log(`[EmbeddingService] Generating ${uncachedTexts.length} new embeddings in batch ${Math.floor(i / this.config.batchSize!) + 1}`);

          const newEmbeddings = await this.embeddings.embedDocuments(uncachedTexts);

          // Store in cache and add to results
          for (let k = 0; k < uncachedTexts.length; k++) {
            const text = uncachedTexts[k];
            const embedding = newEmbeddings[k];
            const tokenCount = this.estimateTokenCount(text);

            // Cache result
            this.cache.set(this.getCacheKey(text), {
              text,
              embedding,
              model: this.config.modelName,
              createdAt: new Date(),
              tokenCount
            });

            // Add to results at correct index
            batchResults[uncachedIndices[k]] = embedding;
            totalTokens += tokenCount;
          }
        }

        // Add batch results to final array
        embeddings.push(...batchResults);

      } catch (error) {
        console.error(`[EmbeddingService] Error processing batch ${Math.floor(i / this.config.batchSize!) + 1}:`, error);

        // Mark all texts in failed batch
        for (let j = 0; j < batch.length; j++) {
          failedIndices.push(batchStart + j);
        }
      }

      // Add small delay between batches to avoid rate limits
      if (i + this.config.batchSize! < texts.length) {
        await this.delay(100);
      }
    }

    console.log(`[EmbeddingService] Batch processing complete: ${embeddings.length} successful, ${failedIndices.length} failed`);
    console.log(`[EmbeddingService] Cache stats: ${this.cacheHits} hits, ${this.cacheMisses} misses (${this.getCacheHitRate()}% hit rate)`);

    return {
      embeddings,
      dimensions: embeddings[0]?.length || 0,
      model: this.config.modelName,
      totalTokens,
      processedCount: embeddings.length,
      failedIndices
    };
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);

    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  }

  /**
   * Find most similar embeddings from a set
   */
  findMostSimilar(
    queryEmbedding: number[],
    candidateEmbeddings: number[][],
    topK: number = 5
  ): Array<{ index: number; similarity: number }> {
    const similarities = candidateEmbeddings.map((embedding, index) => ({
      index,
      similarity: this.cosineSimilarity(queryEmbedding, embedding)
    }));

    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Return top K
    return similarities.slice(0, topK);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: this.getCacheHitRate(),
      totalRequests: this.cacheHits + this.cacheMisses
    };
  }

  /**
   * Clear embedding cache
   */
  clearCache() {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log(`[EmbeddingService] Cache cleared (${previousSize} entries removed)`);
  }

  /**
   * Get cache hit rate percentage
   */
  private getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    if (total === 0) return 0;
    return Math.round((this.cacheHits / total) * 100);
  }

  /**
   * Generate cache key from text
   */
  private getCacheKey(text: string): string {
    // Use first 100 chars + length for cache key
    // This balances uniqueness with memory efficiency
    return `${text.substring(0, 100)}_${text.length}_${this.config.modelName}`;
  }

  /**
   * Estimate token count for Spanish text
   * Spanish averages ~1.3 tokens per word
   */
  private estimateTokenCount(text: string): number {
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }

  /**
   * Helper method to add delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convert embedding array to JSON for storage
   */
  static embeddingToJSON(embedding: number[]): string {
    return JSON.stringify(embedding);
  }

  /**
   * Parse embedding from JSON storage
   */
  static JSONToEmbedding(json: string | null | undefined): number[] | null {
    if (!json) return null;

    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed) && parsed.every(n => typeof n === 'number')) {
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('[EmbeddingService] Error parsing embedding JSON:', error);
      return null;
    }
  }

  /**
   * Validate embedding dimensions
   */
  static validateEmbedding(embedding: number[], expectedDimensions: number): boolean {
    return (
      Array.isArray(embedding) &&
      embedding.length === expectedDimensions &&
      embedding.every(n => typeof n === 'number' && !isNaN(n))
    );
  }
}

export default EmbeddingService;
