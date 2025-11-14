/**
 * Optimized NLP Query Service
 * Implements caching, batch processing, and optimized database queries
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

interface NLPResult {
  intent: string;
  confidence: number;
  entities: any[];
  transformedQuery: string;
  processingTime: number;
  cached: boolean;
}

interface QueryContext {
  userId?: string;
  sessionId?: string;
  contextType?: string;
  contextData?: any;
}

export class OptimizedNLPQueryService {
  private static instance: OptimizedNLPQueryService;
  private cacheExpiryMs = 3600000; // 1 hour
  private maxBatchSize = 50;

  private constructor() {}

  static getInstance(): OptimizedNLPQueryService {
    if (!this.instance) {
      this.instance = new OptimizedNLPQueryService();
    }
    return this.instance;
  }

  /**
   * Process NLP query with caching and optimization
   */
  async processQuery(
    query: string,
    context: QueryContext = {}
  ): Promise<NLPResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query, context);

    // Step 1: Check cache
    const cached = await this.checkCache(cacheKey);
    if (cached) {
      // Update cache hit asynchronously
      this.updateCacheHit(cached.id).catch(console.error);

      return {
        ...cached.cachedOutput as any,
        cached: true,
        processingTime: Date.now() - startTime
      };
    }

    // Step 2: Process NLP transformation
    const result = await this.performNLPProcessing(query);

    // Step 3: Cache result
    await this.cacheResult(cacheKey, query, result);

    // Step 4: Record query history
    if (context.userId || context.sessionId) {
      this.recordQueryHistory(query, result, context).catch(console.error);
    }

    return {
      ...result,
      cached: false,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Batch process multiple queries efficiently
   */
  async batchProcessQueries(
    queries: string[],
    context: QueryContext = {}
  ): Promise<NLPResult[]> {
    const results: NLPResult[] = [];

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < queries.length; i += this.maxBatchSize) {
      const batch = queries.slice(i, i + this.maxBatchSize);
      const batchResults = await Promise.all(
        batch.map(query => this.processQuery(query, context))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get autocomplete suggestions with optimized query
   */
  async getAutocompleteSuggestions(
    prefix: string,
    limit = 10,
    category?: string
  ): Promise<string[]> {
    // Use raw query for optimal performance with text pattern matching
    const suggestions = await prisma.$queryRaw<Array<{ suggestion_text: string }>>`
      SELECT suggestion_text
      FROM query_suggestions
      WHERE
        suggestion_text ILIKE ${prefix + '%'}
        ${category ? `AND category = ${category}` : ''}
        AND is_active = true
      ORDER BY
        is_pinned DESC,
        popularity_score DESC,
        usage_count DESC
      LIMIT ${limit}
    `;

    return suggestions.map(s => s.suggestion_text);
  }

  /**
   * Resolve entities with batch loading
   */
  async resolveEntities(entities: string[]): Promise<Map<string, any>> {
    if (entities.length === 0) return new Map();

    // Single query for all entities
    const resolved = await prisma.entityLookupCache.findMany({
      where: {
        normalizedName: { in: entities },
        isValid: true,
        expiresAt: { gt: new Date() }
      },
      select: {
        normalizedName: true,
        entityType: true,
        entityValue: true,
        entityId: true,
        confidence: true
      }
    });

    // Create map for O(1) lookup
    return new Map(resolved.map(e => [e.normalizedName, e]));
  }

  /**
   * Get or create user session
   */
  async getOrCreateSession(
    userId: string | undefined,
    token: string
  ): Promise<any> {
    return await prisma.userSession.upsert({
      where: { sessionToken: token },
      update: {
        lastActivity: new Date(),
        totalQueries: { increment: 1 }
      },
      create: {
        userId,
        sessionToken: token,
        contextType: 'general',
        startedAt: new Date()
      },
      include: {
        queries: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            originalQuery: true,
            intent: true,
            confidence: true
          }
        }
      }
    });
  }

  /**
   * Search documents with optimized includes
   */
  async searchDocuments(
    query: string,
    limit = 20,
    filters: any = {}
  ): Promise<any[]> {
    return await prisma.legalDocument.findMany({
      where: {
        AND: [
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { summary: { contains: query, mode: 'insensitive' } }
            ]
          },
          { isActive: true },
          ...this.buildFilterConditions(filters)
        ]
      },
      select: {
        id: true,
        title: true,
        normType: true,
        hierarchy: true,
        publicationDate: true,
        summary: true,
        // Only load analytics if recent
        analytics: {
          select: {
            viewCount: true,
            relevanceScore: true,
            trendingScore: true
          },
          where: {
            periodEnd: { gte: new Date() }
          },
          orderBy: { periodStart: 'desc' },
          take: 1
        },
        // Load recent citations
        citedBy: {
          select: {
            citingDocumentId: true,
            confidence: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: [
        { publicationDate: 'desc' },
        { hierarchy: 'asc' }
      ],
      take: limit
    });
  }

  /**
   * Get conversation context with optimized loading
   */
  async getConversationContext(
    conversationId: string,
    messageLimit = 10
  ): Promise<any> {
    return await prisma.aIConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: messageLimit,
          select: {
            id: true,
            role: true,
            content: true,
            intent: true,
            confidence: true,
            timestamp: true,
            citations: {
              select: {
                documentId: true,
                relevance: true
              },
              take: 3
            }
          }
        }
      }
    });
  }

  /**
   * Update query suggestions based on usage
   */
  async updateQuerySuggestion(
    query: string,
    wasClicked: boolean = false
  ): Promise<void> {
    await prisma.querySuggestion.upsert({
      where: { suggestionText: query },
      update: {
        usageCount: { increment: 1 },
        clickCount: wasClicked ? { increment: 1 } : undefined,
        lastUsed: new Date(),
        popularityScore: { increment: wasClicked ? 0.1 : 0.01 }
      },
      create: {
        suggestionText: query,
        suggestionType: 'autocomplete',
        usageCount: 1,
        clickCount: wasClicked ? 1 : 0,
        popularityScore: wasClicked ? 0.1 : 0.01
      }
    });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateCacheKey(query: string, context: QueryContext): string {
    const hash = crypto.createHash('sha256');
    hash.update(query);
    hash.update(JSON.stringify(context));
    return hash.digest('hex');
  }

  private async checkCache(cacheKey: string): Promise<any> {
    return await prisma.queryCache.findFirst({
      where: {
        cacheKey,
        expiresAt: { gt: new Date() },
        isValid: true
      }
    });
  }

  private async updateCacheHit(cacheId: string): Promise<void> {
    await prisma.queryCache.update({
      where: { id: cacheId },
      data: {
        hitCount: { increment: 1 },
        lastHit: new Date()
      }
    });
  }

  private async cacheResult(
    cacheKey: string,
    originalQuery: string,
    result: any
  ): Promise<void> {
    await prisma.queryCache.create({
      data: {
        cacheKey,
        cacheType: 'nlp_transformation',
        originalInput: originalQuery,
        cachedOutput: result,
        intent: result.intent,
        confidence: result.confidence,
        entities: result.entities,
        expiresAt: new Date(Date.now() + this.cacheExpiryMs),
        computeTimeMs: result.processingTime
      }
    });
  }

  private async recordQueryHistory(
    query: string,
    result: any,
    context: QueryContext
  ): Promise<void> {
    await prisma.queryHistory.create({
      data: {
        userId: context.userId,
        sessionId: context.sessionId,
        originalQuery: query,
        transformedQuery: result.transformedQuery || query,
        queryType: result.queryType || 'general',
        intent: result.intent,
        confidence: result.confidence,
        entities: result.entities,
        processingTimeMs: result.processingTime,
        resultCount: result.resultCount || 0,
        resultIds: result.resultIds || []
      }
    });
  }

  private async performNLPProcessing(query: string): Promise<any> {
    // Simulate NLP processing (replace with actual NLP logic)
    const processingStart = Date.now();

    // Extract intent
    const intent = this.extractIntent(query);

    // Extract entities
    const entities = this.extractEntities(query);

    // Transform query
    const transformedQuery = this.transformQuery(query, intent, entities);

    return {
      intent,
      confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
      entities,
      transformedQuery,
      processingTime: Date.now() - processingStart
    };
  }

  private extractIntent(query: string): string {
    const intents = {
      search: /buscar|encontrar|search|find/i,
      explain: /explicar|explain|qué es|what is/i,
      compare: /comparar|compare|diferencia|difference/i,
      summarize: /resumir|summarize|resumen|summary/i,
      cite: /citar|cite|referencia|reference/i
    };

    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(query)) {
        return intent;
      }
    }

    return 'search'; // Default intent
  }

  private extractEntities(query: string): any[] {
    const entities = [];

    // Extract law references
    const lawPattern = /(?:ley|código|reglamento|constitución)\s+(?:de\s+)?[\w\s]+/gi;
    const laws = query.match(lawPattern);
    if (laws) {
      entities.push(...laws.map(law => ({
        type: 'law',
        value: law.trim(),
        confidence: 0.9
      })));
    }

    // Extract article numbers
    const articlePattern = /art(?:ículo)?\.?\s*(\d+)/gi;
    const articles = Array.from(query.matchAll(articlePattern));
    if (articles.length > 0) {
      entities.push(...articles.map(match => ({
        type: 'article',
        value: match[1],
        confidence: 0.95
      })));
    }

    // Extract dates
    const datePattern = /\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}/g;
    const dates = query.match(datePattern);
    if (dates) {
      entities.push(...dates.map(date => ({
        type: 'date',
        value: date,
        confidence: 0.85
      })));
    }

    return entities;
  }

  private transformQuery(query: string, intent: string, entities: any[]): string {
    let transformed = query.toLowerCase();

    // Remove stop words
    const stopWords = ['el', 'la', 'de', 'en', 'y', 'a', 'que', 'es', 'por', 'para', 'con'];
    stopWords.forEach(word => {
      transformed = transformed.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
    });

    // Normalize spaces
    transformed = transformed.replace(/\s+/g, ' ').trim();

    // Add intent prefix
    if (intent !== 'search') {
      transformed = `${intent}:${transformed}`;
    }

    return transformed;
  }

  private buildFilterConditions(filters: any): any[] {
    const conditions = [];

    if (filters.normType) {
      conditions.push({ normType: filters.normType });
    }

    if (filters.hierarchy) {
      conditions.push({ hierarchy: filters.hierarchy });
    }

    if (filters.dateFrom || filters.dateTo) {
      const dateCondition: any = {};
      if (filters.dateFrom) {
        dateCondition.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        dateCondition.lte = new Date(filters.dateTo);
      }
      conditions.push({ publicationDate: dateCondition });
    }

    if (filters.jurisdiction) {
      conditions.push({ jurisdiction: filters.jurisdiction });
    }

    return conditions;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<any> {
    const metrics = await prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*) FROM query_history WHERE created_at > NOW() - INTERVAL '1 minute') AS queries_per_minute,
        (SELECT AVG(processing_time_ms) FROM query_history WHERE created_at > NOW() - INTERVAL '5 minutes') AS avg_query_time_5m,
        (SELECT COUNT(*) FROM user_sessions WHERE is_active = true AND last_activity > NOW() - INTERVAL '5 minutes') AS active_sessions,
        (SELECT SUM(hit_count)::float / COUNT(*) FROM query_cache WHERE last_hit > NOW() - INTERVAL '1 hour') AS cache_efficiency
    `;

    return metrics[0];
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupCache(): Promise<void> {
    const deleted = await prisma.queryCache.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isValid: false }
        ]
      }
    });

    console.log(`Cleaned up ${deleted.count} expired cache entries`);
  }

  /**
   * Warm up cache with popular queries
   */
  async warmUpCache(): Promise<void> {
    // Get popular queries from suggestions
    const popularQueries = await prisma.querySuggestion.findMany({
      where: {
        isActive: true,
        popularityScore: { gt: 0.5 }
      },
      orderBy: { popularityScore: 'desc' },
      take: 20,
      select: { suggestionText: true }
    });

    // Process each query to warm up cache
    for (const { suggestionText } of popularQueries) {
      await this.processQuery(suggestionText).catch(console.error);
    }

    console.log(`Warmed up cache with ${popularQueries.length} popular queries`);
  }
}

// Export singleton instance
export const nlpQueryService = OptimizedNLPQueryService.getInstance();