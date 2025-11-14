/**
 * Autocomplete Service
 * Provides real-time search suggestions based on:
 * - Popular searches
 * - Document titles
 * - Legal terms
 * - User history
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AutocompleteSuggestion {
  text: string;
  type: 'popular' | 'document' | 'term' | 'history';
  category?: string;
  score: number;
  metadata?: {
    documentCount?: number;
    searchCount?: number;
    lastUsed?: Date;
  };
}

export interface AutocompleteConfig {
  maxSuggestions?: number;
  minQueryLength?: number;
  includePopular?: boolean;
  includeDocuments?: boolean;
  includeLegalTerms?: boolean;
  includeUserHistory?: boolean;
  userId?: string;
}

/**
 * In-memory cache for autocomplete suggestions
 * In production, this should be Redis
 */
class AutocompleteCache {
  private cache: Map<string, {data: AutocompleteSuggestion[], timestamp: number}>;
  private ttl: number; // Time to live in milliseconds

  constructor(ttlMinutes: number = 30) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
  }

  get(key: string): AutocompleteSuggestion[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: AutocompleteSuggestion[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const autocompleteCache = new AutocompleteCache(30);

export class AutocompleteService {
  private config: Required<Omit<AutocompleteConfig, 'userId'>> & Pick<AutocompleteConfig, 'userId'>;

  constructor(config: AutocompleteConfig = {}) {
    this.config = {
      maxSuggestions: config.maxSuggestions || 10,
      minQueryLength: config.minQueryLength || 2,
      includePopular: config.includePopular !== undefined ? config.includePopular : true,
      includeDocuments: config.includeDocuments !== undefined ? config.includeDocuments : true,
      includeLegalTerms: config.includeLegalTerms !== undefined ? config.includeLegalTerms : true,
      includeUserHistory: config.includeUserHistory !== undefined ? config.includeUserHistory : true,
      userId: config.userId
    };
  }

  /**
   * Get autocomplete suggestions for a query
   */
  async getSuggestions(query: string): Promise<AutocompleteSuggestion[]> {
    const normalizedQuery = query.trim().toLowerCase();

    // Validate query length
    if (normalizedQuery.length < this.config.minQueryLength) {
      return [];
    }

    // Check cache first
    const cacheKey = `autocomplete:${normalizedQuery}:${this.config.userId || 'anon'}`;
    const cached = autocompleteCache.get(cacheKey);
    if (cached) {
      return cached.slice(0, this.config.maxSuggestions);
    }

    // Gather suggestions from different sources in parallel
    const suggestionPromises: Promise<AutocompleteSuggestion[]>[] = [];

    if (this.config.includePopular) {
      suggestionPromises.push(this.getPopularSearchSuggestions(normalizedQuery));
    }

    if (this.config.includeDocuments) {
      suggestionPromises.push(this.getDocumentTitleSuggestions(normalizedQuery));
    }

    if (this.config.includeLegalTerms) {
      suggestionPromises.push(this.getLegalTermSuggestions(normalizedQuery));
    }

    if (this.config.includeUserHistory && this.config.userId) {
      suggestionPromises.push(this.getUserHistorySuggestions(normalizedQuery, this.config.userId));
    }

    // Wait for all suggestions
    const allSuggestions = await Promise.all(suggestionPromises);

    // Merge and deduplicate
    const merged = this.mergeSuggestions(allSuggestions.flat());

    // Sort by relevance score
    const sorted = merged.sort((a, b) => b.score - a.score);

    // Limit results
    const limited = sorted.slice(0, this.config.maxSuggestions);

    // Cache results
    autocompleteCache.set(cacheKey, limited);

    return limited;
  }

  /**
   * Get suggestions from popular searches
   */
  private async getPopularSearchSuggestions(query: string): Promise<AutocompleteSuggestion[]> {
    try {
      const popular = await prisma.searchSuggestion.findMany({
        where: {
          suggestionText: {
            contains: query,
            mode: 'insensitive'
          }
        },
        orderBy: {
          searchCount: 'desc'
        },
        take: 5
      });

      return popular.map(p => ({
        text: p.suggestionText,
        type: 'popular' as const,
        category: p.category,
        score: this.calculatePopularityScore(p.searchCount, p.lastUsed),
        metadata: {
          searchCount: p.searchCount,
          lastUsed: p.lastUsed
        }
      }));
    } catch (error) {
      console.error('Error fetching popular suggestions:', error);
      return [];
    }
  }

  /**
   * Get suggestions from document titles
   */
  private async getDocumentTitleSuggestions(query: string): Promise<AutocompleteSuggestion[]> {
    try {
      // Search in both normTitle and old title field
      const documents = await prisma.legalDocument.findMany({
        where: {
          AND: [
            {
              OR: [
                { normTitle: { contains: query, mode: 'insensitive' } },
                { title: { contains: query, mode: 'insensitive' } }
              ]
            },
            { isActive: true }
          ]
        },
        select: {
          normTitle: true,
          title: true,
          viewCount: true,
          legalHierarchy: true
        },
        take: 5,
        orderBy: {
          viewCount: 'desc'
        }
      });

      return documents.map(doc => ({
        text: doc.normTitle || doc.title || '',
        type: 'document' as const,
        category: doc.legalHierarchy,
        score: this.calculateDocumentScore(doc.viewCount),
        metadata: {
          documentCount: 1
        }
      }));
    } catch (error) {
      console.error('Error fetching document suggestions:', error);
      return [];
    }
  }

  /**
   * Get suggestions from legal terms
   */
  private async getLegalTermSuggestions(query: string): Promise<AutocompleteSuggestion[]> {
    // Legal terms from spell checker dictionary
    const legalTerms = [
      'constitución', 'código', 'ley', 'decreto', 'resolución',
      'sentencia', 'acuerdo', 'reglamento', 'ordenanza',
      'demanda', 'recurso', 'apelación', 'casación', 'amparo',
      'contrato', 'obligación', 'responsabilidad', 'derecho',
      'garantía', 'jurisdicción', 'competencia', 'proceso',
      'juicio', 'audiencia', 'prueba', 'testigo', 'perito',
      'trabajador', 'empleador', 'salario', 'despido',
      'impuesto', 'tributo', 'renta', 'patrimonio'
    ];

    const matches = legalTerms
      .filter(term => term.includes(query))
      .slice(0, 3)
      .map(term => ({
        text: term,
        type: 'term' as const,
        category: 'legal_term',
        score: this.calculateTermScore(term, query),
        metadata: {}
      }));

    return matches;
  }

  /**
   * Get suggestions from user search history
   */
  private async getUserHistorySuggestions(query: string, userId: string): Promise<AutocompleteSuggestion[]> {
    try {
      const history = await prisma.savedSearch.findMany({
        where: {
          userId,
          query: {
            contains: query,
            mode: 'insensitive'
          }
        },
        orderBy: [
          { isFavorite: 'desc' },
          { updatedAt: 'desc' }
        ],
        take: 3
      });

      return history.map(h => ({
        text: h.query,
        type: 'history' as const,
        category: h.isFavorite ? 'favorite' : 'recent',
        score: this.calculateHistoryScore(h.createdAt, h.isFavorite),
        metadata: {
          lastUsed: h.updatedAt
        }
      }));
    } catch (error) {
      console.error('Error fetching user history suggestions:', error);
      return [];
    }
  }

  /**
   * Merge and deduplicate suggestions
   */
  private mergeSuggestions(suggestions: AutocompleteSuggestion[]): AutocompleteSuggestion[] {
    const seen = new Set<string>();
    const unique: AutocompleteSuggestion[] = [];

    for (const suggestion of suggestions) {
      const key = suggestion.text.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(suggestion);
      } else {
        // Boost score if duplicate found from different source
        const existing = unique.find(s => s.text.toLowerCase() === key);
        if (existing) {
          existing.score += suggestion.score * 0.2; // Boost by 20%
        }
      }
    }

    return unique;
  }

  /**
   * Calculate popularity score
   */
  private calculatePopularityScore(searchCount: number, lastUsed: Date): number {
    // Base score from search count (logarithmic scale)
    const countScore = Math.log10(searchCount + 1) * 0.3;

    // Recency bonus (last 7 days)
    const daysSinceUsed = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = daysSinceUsed < 7 ? 0.2 : daysSinceUsed < 30 ? 0.1 : 0;

    return Math.min(countScore + recencyScore, 1.0);
  }

  /**
   * Calculate document score
   */
  private calculateDocumentScore(viewCount: number): number {
    // Logarithmic scale for view count
    return Math.min(Math.log10(viewCount + 1) * 0.25, 0.8);
  }

  /**
   * Calculate term match score
   */
  private calculateTermScore(term: string, query: string): number {
    // Exact prefix match gets higher score
    if (term.startsWith(query)) {
      return 0.7;
    }
    // Contains match gets lower score
    return 0.5;
  }

  /**
   * Calculate history score
   */
  private calculateHistoryScore(createdAt: Date, isFavorite: boolean): number {
    // Favorite searches get high score
    if (isFavorite) return 0.9;

    // Recent searches get score based on recency
    const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceCreated < 1) return 0.8;
    if (daysSinceCreated < 7) return 0.6;
    if (daysSinceCreated < 30) return 0.4;

    return 0.2;
  }

  /**
   * Record a search to improve suggestions
   */
  async recordSearch(query: string, category?: string): Promise<void> {
    try {
      const normalizedQuery = query.trim().toLowerCase();

      // Update or create search suggestion
      const existing = await prisma.searchSuggestion.findFirst({
        where: { suggestionText: normalizedQuery }
      });

      if (existing) {
        await prisma.searchSuggestion.update({
          where: { id: existing.id },
          data: {
            searchCount: existing.searchCount + 1,
            lastUsed: new Date()
          }
        });
      } else {
        await prisma.searchSuggestion.create({
          data: {
            suggestionText: normalizedQuery,
            searchCount: 1,
            lastUsed: new Date(),
            category: category || null
          }
        });
      }

      // Invalidate cache for this query
      autocompleteCache.clear();
    } catch (error) {
      console.error('Error recording search:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; ttl: number } {
    return {
      size: autocompleteCache.size(),
      ttl: 30 // minutes
    };
  }

  /**
   * Clear autocomplete cache
   */
  clearCache(): void {
    autocompleteCache.clear();
  }
}

// Export singleton instance
export const autocompleteService = new AutocompleteService();
