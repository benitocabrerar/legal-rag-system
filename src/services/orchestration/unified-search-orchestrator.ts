import { getMultiTierCacheService } from '../cache/multi-tier-cache.service.js';
import { getAsyncOpenAIService } from '../ai/async-openai.service.js';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Interfaces
export interface SearchQuery {
  query: string;
  userId?: string;
  filters?: {
    category?: string[];
    dateRange?: { start: Date; end: Date };
    tags?: string[];
    jurisdiction?: string[];
  };
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  category?: string;
  relevanceScore: number;
  metadata?: Record<string, any>;
  highlights?: string[];
}

export interface NLPProcessingResult {
  intent: string;
  entities: Array<{ type: string; value: string }>;
  filters: {
    category?: string[];
    dateRange?: { start: Date; end: Date };
    tags?: string[];
    jurisdiction?: string[];
  };
  refinedQuery: string;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  nlpProcessing?: NLPProcessingResult;
  cacheHit: boolean;
  cacheTier?: 'L1' | 'L2' | 'L3';
  responseTime: number;
}

export interface SearchAnalytics {
  totalQueries: number;
  cacheHitRate: number;
  avgResponseTime: number;
  topQueries: Array<{ query: string; count: number }>;
  topIntents: Array<{ intent: string; count: number }>;
}

/**
 * Unified Search Orchestrator
 *
 * Coordinates the complete search pipeline:
 * 1. Multi-tier caching (L1 → L2 → L3)
 * 2. NLP query processing with AI
 * 3. Database search with filters
 * 4. RAG enhancement with embeddings
 * 5. Query tracking and analytics
 */
export class UnifiedSearchOrchestrator {
  private cacheService = getMultiTierCacheService();
  private aiService = getAsyncOpenAIService();

  /**
   * Main search method with complete orchestration
   */
  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    const cacheKey = this.generateQueryCacheKey(query);
    const queryHash = this.generateQueryHash(query.query);

    try {
      // Step 1: Check cache tiers (L1 → L2 → L3)
      const cacheResult = await this.cacheService.get<SearchResponse>(cacheKey);

      if (cacheResult.value) {
        // Track cache hit
        await this.trackCacheHit(queryHash, cacheResult.tier);

        // Promote cache entry to higher tier if needed
        if (cacheResult.tier === 'L3' || cacheResult.tier === 'L2') {
          await this.cacheService.set(cacheKey, cacheResult.value, {
            ttl: 3600, // 1 hour for promoted entries
            tier: 'L1'
          });
        }

        const responseTime = Date.now() - startTime;
        return {
          ...cacheResult.value,
          cacheHit: true,
          cacheTier: cacheResult.tier as 'L1' | 'L2' | 'L3',
          responseTime
        };
      }

      // Step 2: Perform full search pipeline
      const searchResult = await this.performFullSearch(query);
      const responseTime = Date.now() - startTime;

      // Step 3: Store in cache (L1)
      const response: SearchResponse = {
        ...searchResult,
        cacheHit: false,
        responseTime
      };

      await this.cacheService.set(cacheKey, response, {
        ttl: 3600, // 1 hour
        tier: 'L1'
      });

      // Step 4: Track query
      await this.trackQuery(query, response, responseTime);

      return response;
    } catch (error) {
      console.error('Search orchestration error:', error);

      // Return fallback response
      const responseTime = Date.now() - startTime;
      return {
        results: [],
        totalCount: 0,
        cacheHit: false,
        responseTime,
        nlpProcessing: {
          intent: 'search',
          entities: [],
          filters: {},
          refinedQuery: query.query
        }
      };
    }
  }

  /**
   * Perform full search pipeline without cache
   */
  private async performFullSearch(query: SearchQuery): Promise<Omit<SearchResponse, 'cacheHit' | 'responseTime'>> {
    try {
      // Step 1: NLP Processing
      const nlpResult = await this.processQueryWithNLP(query.query);

      // Step 2: Merge filters from NLP and query
      const mergedFilters = {
        category: [
          ...(query.filters?.category || []),
          ...(nlpResult.filters.category || [])
        ],
        tags: [
          ...(query.filters?.tags || []),
          ...(nlpResult.filters.tags || [])
        ],
        jurisdiction: [
          ...(query.filters?.jurisdiction || []),
          ...(nlpResult.filters.jurisdiction || [])
        ],
        dateRange: nlpResult.filters.dateRange || query.filters?.dateRange
      };

      // Step 3: Database search
      const dbResults = await this.searchDatabase(
        nlpResult.refinedQuery,
        mergedFilters,
        query.limit || 10,
        query.offset || 0
      );

      // Step 4: RAG enhancement
      const enhancedResults = await this.enhanceWithRAG(
        nlpResult.refinedQuery,
        dbResults.results
      );

      return {
        results: enhancedResults,
        totalCount: dbResults.totalCount,
        nlpProcessing: nlpResult
      };
    } catch (error) {
      console.error('Full search error:', error);

      // Fallback to simple database search
      const simpleResults = await this.searchDatabase(
        query.query,
        query.filters || {},
        query.limit || 10,
        query.offset || 0
      );

      return {
        results: simpleResults.results,
        totalCount: simpleResults.totalCount,
        nlpProcessing: {
          intent: 'search',
          entities: [],
          filters: {},
          refinedQuery: query.query
        }
      };
    }
  }

  /**
   * Process query with NLP using AI service
   */
  private async processQueryWithNLP(query: string): Promise<NLPProcessingResult> {
    try {
      const prompt = `Analyze this legal search query and extract:
1. Search intent (e.g., "case_law_search", "statute_lookup", "legal_research", "citation_search")
2. Named entities (e.g., case names, statute numbers, legal concepts, jurisdictions)
3. Implicit filters (categories, tags, jurisdictions, date ranges)
4. A refined search query optimized for legal document retrieval

Query: "${query}"

Respond in JSON format:
{
  "intent": "intent_type",
  "entities": [{"type": "entity_type", "value": "entity_value"}],
  "filters": {
    "category": ["category1"],
    "tags": ["tag1"],
    "jurisdiction": ["jurisdiction1"],
    "dateRange": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}
  },
  "refinedQuery": "optimized query"
}`;

      const extractionResult = await this.aiService.extractStructuredData(
        prompt,
        {
          intent: { type: 'string', description: 'Search intent' },
          entities: { type: 'array', description: 'Named entities' },
          filters: { type: 'object', description: 'Search filters' },
          refinedQuery: { type: 'string', description: 'Refined query' }
        }
      );

      return this.buildNLPResult(extractionResult);
    } catch (error) {
      console.error('NLP processing error:', error);

      // Return basic NLP result
      return {
        intent: 'search',
        entities: [],
        filters: {},
        refinedQuery: query
      };
    }
  }

  /**
   * Build NLP result from extraction data
   */
  private buildNLPResult(extractionData: any): NLPProcessingResult {
    const result: NLPProcessingResult = {
      intent: extractionData.intent || 'search',
      entities: Array.isArray(extractionData.entities) ? extractionData.entities : [],
      filters: {},
      refinedQuery: extractionData.refinedQuery || ''
    };

    // Parse filters
    if (extractionData.filters) {
      const filters = extractionData.filters;

      if (Array.isArray(filters.category)) {
        result.filters.category = filters.category;
      }

      if (Array.isArray(filters.tags)) {
        result.filters.tags = filters.tags;
      }

      if (Array.isArray(filters.jurisdiction)) {
        result.filters.jurisdiction = filters.jurisdiction;
      }

      if (filters.dateRange && filters.dateRange.start && filters.dateRange.end) {
        result.filters.dateRange = {
          start: new Date(filters.dateRange.start),
          end: new Date(filters.dateRange.end)
        };
      }
    }

    return result;
  }

  /**
   * Search database with filters and full-text search
   */
  private async searchDatabase(
    query: string,
    filters: any,
    limit: number,
    offset: number
  ): Promise<{ results: SearchResult[]; totalCount: number }> {
    try {
      // Build where clause
      const whereClause: any = {
        isActive: true
      };

      // Add full-text search
      if (query && query.trim()) {
        whereClause.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          {
            summaries: {
              some: {
                summary: { contains: query, mode: 'insensitive' }
              }
            }
          }
        ];
      }

      // Add filters
      if (filters?.category && Array.isArray(filters.category) && filters.category.length > 0) {
        whereClause.category = { in: filters.category };
      }

      if (filters?.jurisdiction && Array.isArray(filters.jurisdiction) && filters.jurisdiction.length > 0) {
        whereClause.jurisdiction = { in: filters.jurisdiction };
      }

      if (filters.dateRange) {
        whereClause.createdAt = {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end
        };
      }

      // Execute search
      const [results, totalCount] = await Promise.all([
        prisma.legalDocument.findMany({
          where: whereClause,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            content: true,
            category: true,
            metadata: true,
            jurisdiction: true,
            createdAt: true
          }
        }),
        prisma.legalDocument.count({ where: whereClause })
      ]);

      // Transform to SearchResult format
      const searchResults: SearchResult[] = results.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content.substring(0, 500), // First 500 chars
        category: doc.category || undefined,
        relevanceScore: 0.5, // Base score, will be enhanced by RAG
        metadata: {
          ...(doc.metadata as Record<string, any>),
          jurisdiction: doc.jurisdiction,
          createdAt: doc.createdAt
        },
        highlights: this.extractHighlights(doc.content, query)
      }));

      return { results: searchResults, totalCount };
    } catch (error) {
      console.error('Database search error:', error);
      return { results: [], totalCount: 0 };
    }
  }

  /**
   * Extract highlights from content based on query
   */
  private extractHighlights(content: string, query: string): string[] {
    if (!query || !query.trim()) {
      return [];
    }

    const highlights: string[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/);

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();

      for (const term of queryTerms) {
        if (lowerSentence.includes(term)) {
          const trimmed = sentence.trim();
          if (trimmed && !highlights.includes(trimmed)) {
            highlights.push(trimmed);
            if (highlights.length >= 3) {
              return highlights;
            }
          }
          break;
        }
      }
    }

    return highlights;
  }

  /**
   * Enhance results with RAG (embeddings and re-ranking)
   */
  private async enhanceWithRAG(
    query: string,
    results: SearchResult[]
  ): Promise<SearchResult[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.aiService.generateEmbedding(query);

      // Re-rank results based on embedding similarity
      const rankedResults = await this.rerankWithEmbedding(
        queryEmbedding,
        results
      );

      return rankedResults;
    } catch (error) {
      console.error('RAG enhancement error:', error);

      // Return original results with default scoring
      return results.map((result, index) => ({
        ...result,
        relevanceScore: 1 - (index * 0.1) // Simple descending score
      }));
    }
  }

  /**
   * Re-rank results using embedding similarity (pgvector cosine similarity)
   */
  private async rerankWithEmbedding(
    queryEmbedding: number[],
    results: SearchResult[]
  ): Promise<SearchResult[]> {
    try {
      // For now, fetch embeddings from database and calculate similarity
      // In production, this would use pgvector's <-> operator for efficiency
      const documentIds = results.map(r => r.id);

      const embeddings = await prisma.embedding.findMany({
        where: {
          documentId: { in: documentIds }
        },
        select: {
          documentId: true,
          embedding: true
        }
      });

      // Create embedding lookup
      const embeddingMap = new Map<string, number[]>();
      for (const emb of embeddings) {
        if (emb.embedding && Array.isArray(emb.embedding)) {
          embeddingMap.set(emb.documentId, emb.embedding as number[]);
        }
      }

      // Calculate cosine similarity and re-rank
      const rankedResults = results.map(result => {
        const docEmbedding = embeddingMap.get(result.id);

        if (docEmbedding) {
          const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
          return {
            ...result,
            relevanceScore: similarity
          };
        }

        return result;
      });

      // Sort by relevance score (descending)
      rankedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      return rankedResults;
    } catch (error) {
      console.error('Re-ranking error:', error);
      return results;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);

    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Track query in QueryHistory table
   */
  private async trackQuery(
    query: SearchQuery,
    response: SearchResponse,
    responseTime: number
  ): Promise<void> {
    try {
      const queryHash = this.generateQueryHash(query.query);

      // Only create query history if we have a valid session
      if (query.sessionId) {
        await prisma.queryHistory.create({
          data: {
            queryHash,
            sessionId: query.sessionId,
            query: query.query,
            userId: query.userId || null,
            filters: query.filters || {},
            entities: response.nlpProcessing?.entities || [],
            intent: response.nlpProcessing?.intent || {},
            resultsCount: response.results.length, // Campo correcto: resultsCount
            responseTime,
            cacheHit: response.cacheHit,
            clickedResults: []
          }
        });
      }
    } catch (error) {
      console.error('Query tracking error:', error);
      // Don't throw - tracking failure shouldn't break search
    }
  }

  /**
   * Track cache hit and update QueryCache
   */
  private async trackCacheHit(queryHash: string, tier: string): Promise<void> {
    try {
      await prisma.queryCache.updateMany({
        where: { queryHash },
        data: {
          hitCount: { increment: 1 },
          lastHitAt: new Date()
        }
      });
    } catch (error) {
      console.error('Cache hit tracking error:', error);
      // Don't throw - tracking failure shouldn't break search
    }
  }

  /**
   * Generate deterministic cache key for query
   */
  private generateQueryCacheKey(query: SearchQuery): string {
    const normalized = {
      query: query.query.toLowerCase().trim(),
      filters: query.filters || {},
      limit: query.limit || 10,
      offset: query.offset || 0
    };

    const hashInput = JSON.stringify(normalized);
    return `search:${crypto.createHash('sha256').update(hashInput).digest('hex')}`;
  }

  /**
   * Generate query hash for tracking
   */
  private generateQueryHash(query: string): string {
    const normalized = query.toLowerCase().trim();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<SearchAnalytics> {
    try {
      const whereClause: any = {};

      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) whereClause.timestamp.gte = startDate;
        if (endDate) whereClause.timestamp.lte = endDate;
      }

      // Total queries
      const totalQueries = await prisma.queryHistory.count({ where: whereClause });

      // Cache hit rate
      const cacheHits = await prisma.queryHistory.count({
        where: { ...whereClause, cacheHit: true }
      });
      const cacheHitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;

      // Average response time
      const avgResult = await prisma.queryHistory.aggregate({
        where: whereClause,
        _avg: { responseTime: true }
      });
      const avgResponseTime = avgResult._avg.responseTime || 0;

      // Top queries
      const queryGroups = await prisma.queryHistory.groupBy({
        by: ['query'],
        where: whereClause,
        _count: { query: true },
        orderBy: { _count: { query: 'desc' } },
        take: 10
      });
      const topQueries = queryGroups.map(g => ({
        query: g.query,
        count: g._count.query
      }));

      // Top intents
      const intentGroups = await prisma.queryHistory.groupBy({
        by: ['intent'],
        where: whereClause,
        _count: { intent: true },
        orderBy: { _count: { intent: 'desc' } },
        take: 10
      });
      const topIntents = intentGroups.map(g => ({
        intent: g.intent || 'unknown',
        count: g._count.intent
      }));

      return {
        totalQueries,
        cacheHitRate,
        avgResponseTime,
        topQueries,
        topIntents
      };
    } catch (error) {
      console.error('Analytics error:', error);
      return {
        totalQueries: 0,
        cacheHitRate: 0,
        avgResponseTime: 0,
        topQueries: [],
        topIntents: []
      };
    }
  }

  /**
   * Get query suggestions for autocomplete
   */
  async getSuggestions(
    partialQuery: string,
    limit: number = 10
  ): Promise<Array<{ suggestion: string; frequency: number; category?: string }>> {
    try {
      if (!partialQuery || partialQuery.trim().length === 0) {
        return [];
      }

      const normalized = partialQuery.toLowerCase().trim();

      // Get suggestions from query history
      const historySuggestions = await prisma.queryHistory.groupBy({
        by: ['query'],
        where: {
          query: {
            contains: normalized,
            mode: 'insensitive'
          }
        },
        _count: { query: true },
        orderBy: { _count: { query: 'desc' } },
        take: limit
      });

      // Get suggestions from QuerySuggestion table if it exists
      let cachedSuggestions: any[] = [];
      try {
        cachedSuggestions = await prisma.querySuggestion.findMany({
          where: {
            suggestion: {
              contains: normalized,
              mode: 'insensitive'
            }
          },
          orderBy: { frequency: 'desc' },
          take: limit
        });
      } catch (error) {
        // QuerySuggestion table might not exist yet
        console.log('QuerySuggestion table not available');
      }

      // Combine and deduplicate suggestions
      const suggestions = new Map<string, { frequency: number; category?: string }>();

      // Add history suggestions
      historySuggestions.forEach(item => {
        suggestions.set(item.query, {
          frequency: item._count.query,
          category: 'history'
        });
      });

      // Add cached suggestions (higher priority)
      cachedSuggestions.forEach((item: any) => {
        const existing = suggestions.get(item.suggestion);
        if (existing) {
          existing.frequency += item.frequency;
        } else {
          suggestions.set(item.suggestion, {
            frequency: item.frequency,
            category: item.category || 'cached'
          });
        }
      });

      // Convert to array and sort by frequency
      return Array.from(suggestions.entries())
        .map(([suggestion, data]) => ({
          suggestion,
          frequency: data.frequency,
          category: data.category
        }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, limit);

    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }
  }

  /**
   * Update session context for personalization
   */
  async updateSessionContext(
    sessionId: string,
    userId?: string,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      if (!sessionId) {
        throw new Error('sessionId is required');
      }

      // Validate userId exists if provided
      let validatedUserId: string | null = null;
      if (userId) {
        try {
          const userExists = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true }
          });
          validatedUserId = userExists ? userId : null;
        } catch (error) {
          console.log('User validation failed, proceeding with null userId');
        }
      }

      const sessionData = {
        sessionToken: sessionId, // Use sessionToken as the unique identifier
        userId: validatedUserId,
        context: context || {},
        lastActivityAt: new Date() // Use lastActivityAt field from schema
      };

      // Try to update or create session
      try {
        await prisma.userSession.upsert({
          where: { sessionToken: sessionId }, // Use sessionToken as unique key
          update: {
            userId: validatedUserId,
            context: context || {},
            lastActivityAt: new Date() // Use lastActivityAt field from schema
          },
          create: sessionData
        });
      } catch (error) {
        // UserSession table might not exist yet or other DB issues
        console.log('UserSession upsert failed:', error);
      }

    } catch (error) {
      console.error('Session context update error:', error);
      throw error;
    }
  }
}

// Singleton instance
let orchestratorInstance: UnifiedSearchOrchestrator | null = null;

export function getUnifiedSearchOrchestrator(): UnifiedSearchOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new UnifiedSearchOrchestrator();
  }
  return orchestratorInstance;
}
