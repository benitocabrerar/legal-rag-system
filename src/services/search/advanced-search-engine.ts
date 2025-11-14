/**
 * Advanced Search Engine
 * Integrates multiple search components into a unified search experience:
 * - Query expansion and spell checking
 * - Vector search (semantic embeddings)
 * - Full-text search (PostgreSQL)
 * - Citation graph search
 * - Re-ranking with multiple signals
 */

import { PrismaClient } from '@prisma/client';
import { queryExpansionService, type QueryExpansionResult } from './query-expansion';
import { spellCheckerService, type SpellCheckResult } from './spell-checker';
import { rerankingService, type DocumentWithScores } from './reranking-service';
import { autocompleteService } from './autocomplete-service';

const prisma = new PrismaClient();

export interface SearchFilters {
  legalHierarchy?: string[];
  jurisdiction?: string[];
  normType?: string[];
  publicationType?: string[];
  publicationDateFrom?: Date;
  publicationDateTo?: Date;
  minCitationCount?: number;
  minPageRank?: number;
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'popularity' | 'authority';
  userId?: string;
  enableSpellCheck?: boolean;
  enableQueryExpansion?: boolean;
  enableReranking?: boolean;
}

export interface SearchResult {
  documents: DocumentWithScores[];
  totalCount: number;
  query: {
    original: string;
    corrected?: string;
    expanded?: string[];
    suggestions?: string;
  };
  filters: SearchFilters;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  performance: {
    totalTimeMs: number;
    spellCheckMs?: number;
    expansionMs?: number;
    searchMs: number;
    rerankingMs?: number;
  };
  spellCheck?: SpellCheckResult;
  expansion?: QueryExpansionResult;
}

export class AdvancedSearchEngine {
  /**
   * Execute advanced search with all enhancements
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    const startTime = Date.now();
    const {
      query,
      filters = {},
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      userId,
      enableSpellCheck = true,
      enableQueryExpansion = true,
      enableReranking = true
    } = options;

    // Step 1: Spell checking
    let processedQuery = query;
    let spellCheckResult: SpellCheckResult | undefined;
    let spellCheckTime = 0;

    if (enableSpellCheck) {
      const spellStart = Date.now();
      spellCheckResult = spellCheckerService.checkSpelling(query);
      spellCheckTime = Date.now() - spellStart;

      if (spellCheckResult.hasCorrections) {
        processedQuery = spellCheckResult.correctedQuery;
      }
    }

    // Step 2: Query expansion
    let expansionResult: QueryExpansionResult | undefined;
    let expansionTime = 0;
    let searchTerms = [processedQuery];

    if (enableQueryExpansion) {
      const expansionStart = Date.now();
      expansionResult = await queryExpansionService.expandQuery(processedQuery);
      expansionTime = Date.now() - expansionStart;

      // Add expanded terms to search
      searchTerms = [processedQuery, ...expansionResult.expandedTerms];
    }

    // Step 3: Parallel search execution
    const searchStart = Date.now();
    const searchResults = await this.executeParallelSearch(searchTerms, filters);
    const searchTime = Date.now() - searchStart;

    // Step 4: Re-ranking (if enabled and using relevance sort)
    let finalDocuments: any[] = searchResults;
    let rerankingTime = 0;

    if (enableReranking && sortBy === 'relevance') {
      const rerankStart = Date.now();
      const rerankResult = await rerankingService.rerankDocuments(searchResults);
      rerankingTime = rerankResult.processingTimeMs;
      finalDocuments = rerankResult.documents;
    } else {
      // Apply alternative sorting
      finalDocuments = this.applySorting(searchResults, sortBy);
    }

    // Step 5: Apply pagination
    const paginatedDocs = finalDocuments.slice(offset, offset + limit);
    const totalCount = finalDocuments.length;

    // Step 6: Record search for learning
    if (userId) {
      await autocompleteService.recordSearch(processedQuery);
    }

    const totalTime = Date.now() - startTime;

    return {
      documents: paginatedDocs,
      totalCount,
      query: {
        original: query,
        corrected: spellCheckResult?.hasCorrections ? processedQuery : undefined,
        expanded: expansionResult?.expandedTerms,
        suggestions: spellCheckResult ? spellCheckerService.generateSuggestion(spellCheckResult) : undefined
      },
      filters,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      performance: {
        totalTimeMs: totalTime,
        spellCheckMs: spellCheckTime > 0 ? spellCheckTime : undefined,
        expansionMs: expansionTime > 0 ? expansionTime : undefined,
        searchMs: searchTime,
        rerankingMs: rerankingTime > 0 ? rerankingTime : undefined
      },
      spellCheck: spellCheckResult,
      expansion: expansionResult
    };
  }

  /**
   * Execute search across multiple sources in parallel
   */
  private async executeParallelSearch(
    searchTerms: string[],
    filters: SearchFilters
  ): Promise<Array<{ id: string; semanticSimilarity: number; [key: string]: any }>> {
    // Build WHERE clause for filters
    const whereClause = this.buildWhereClause(searchTerms, filters);

    // Execute searches in parallel
    const [fullTextResults, semanticResults] = await Promise.all([
      this.fullTextSearch(whereClause),
      this.semanticSearch(searchTerms[0]) // Use main query for semantic search
    ]);

    // Merge results
    const merged = this.mergeSearchResults(fullTextResults, semanticResults);

    return merged;
  }

  /**
   * Full-text search using PostgreSQL
   */
  private async fullTextSearch(whereClause: any): Promise<any[]> {
    try {
      const results = await prisma.legalDocument.findMany({
        where: whereClause,
        select: {
          id: true,
          normTitle: true,
          title: true,
          legalHierarchy: true,
          publicationDate: true,
          viewCount: true,
          content: true
        },
        take: 100 // Limit to prevent overwhelming results
      });

      return results.map(doc => ({
        ...doc,
        semanticSimilarity: 0.5 // Default similarity for full-text matches
      }));
    } catch (error) {
      console.error('Full-text search error:', error);
      return [];
    }
  }

  /**
   * Semantic search using vector embeddings
   * TODO: Implement actual vector search when embeddings are ready
   */
  private async semanticSearch(query: string): Promise<any[]> {
    // Placeholder for vector search
    // In production, this would use pgvector similarity search
    // For now, return empty array
    return [];
  }

  /**
   * Build WHERE clause from filters
   */
  private buildWhereClause(searchTerms: string[], filters: SearchFilters): any {
    const conditions: any[] = [];

    // Text search across multiple fields
    if (searchTerms.length > 0) {
      const textConditions = searchTerms.map(term => ({
        OR: [
          { normTitle: { contains: term, mode: 'insensitive' as const } },
          { title: { contains: term, mode: 'insensitive' as const } },
          { content: { contains: term, mode: 'insensitive' as const } }
        ]
      }));

      conditions.push({
        OR: textConditions
      });
    }

    // Apply filters
    if (filters.legalHierarchy && filters.legalHierarchy.length > 0) {
      conditions.push({
        legalHierarchy: { in: filters.legalHierarchy }
      });
    }

    if (filters.jurisdiction && filters.jurisdiction.length > 0) {
      conditions.push({
        jurisdiction: { in: filters.jurisdiction }
      });
    }

    if (filters.normType && filters.normType.length > 0) {
      conditions.push({
        normType: { in: filters.normType }
      });
    }

    if (filters.publicationType && filters.publicationType.length > 0) {
      conditions.push({
        publicationType: { in: filters.publicationType }
      });
    }

    if (filters.publicationDateFrom || filters.publicationDateTo) {
      const dateCondition: any = {};
      if (filters.publicationDateFrom) {
        dateCondition.gte = filters.publicationDateFrom;
      }
      if (filters.publicationDateTo) {
        dateCondition.lte = filters.publicationDateTo;
      }
      conditions.push({
        publicationDate: dateCondition
      });
    }

    // Always include active documents only
    conditions.push({
      isActive: true
    });

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  /**
   * Merge results from different search sources
   */
  private mergeSearchResults(fullTextResults: any[], semanticResults: any[]): any[] {
    const resultMap = new Map<string, any>();

    // Add full-text results
    for (const doc of fullTextResults) {
      resultMap.set(doc.id, doc);
    }

    // Merge semantic results (boost similarity score if already exists)
    for (const doc of semanticResults) {
      if (resultMap.has(doc.id)) {
        const existing = resultMap.get(doc.id);
        // Boost score if found in both searches
        existing.semanticSimilarity = Math.max(
          existing.semanticSimilarity,
          doc.semanticSimilarity
        ) * 1.2; // 20% boost for multi-source match
      } else {
        resultMap.set(doc.id, doc);
      }
    }

    return Array.from(resultMap.values());
  }

  /**
   * Apply sorting based on sortBy parameter
   */
  private applySorting(documents: any[], sortBy: SearchOptions['sortBy']): any[] {
    switch (sortBy) {
      case 'date':
        return documents.sort((a, b) => {
          const dateA = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
          const dateB = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
          return dateB - dateA; // Newest first
        });

      case 'popularity':
        return documents.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));

      case 'authority':
        return documents.sort((a, b) => (b.pagerankScore || 0) - (a.pagerankScore || 0));

      case 'relevance':
      default:
        // Already sorted by relevance from re-ranking
        return documents;
    }
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async getSuggestions(query: string, userId?: string): Promise<any[]> {
    // Use existing autocomplete service instance
    return autocompleteService.getSuggestions(query);
  }

  /**
   * Save search for user
   */
  async saveSearch(userId: string, query: string, filters?: SearchFilters): Promise<void> {
    try {
      await prisma.savedSearch.create({
        data: {
          userId,
          query,
          filters: filters ? JSON.parse(JSON.stringify(filters)) : null,
          isFavorite: false
        }
      });
    } catch (error) {
      console.error('Error saving search:', error);
      throw error;
    }
  }

  /**
   * Get user's saved searches
   */
  async getSavedSearches(userId: string, limit: number = 10): Promise<any[]> {
    try {
      return await prisma.savedSearch.findMany({
        where: { userId },
        orderBy: [
          { isFavorite: 'desc' },
          { updatedAt: 'desc' }
        ],
        take: limit
      });
    } catch (error) {
      console.error('Error fetching saved searches:', error);
      return [];
    }
  }

  /**
   * Toggle favorite status for saved search
   */
  async toggleFavorite(searchId: string, userId: string): Promise<void> {
    try {
      const search = await prisma.savedSearch.findFirst({
        where: { id: searchId, userId }
      });

      if (search) {
        await prisma.savedSearch.update({
          where: { id: searchId },
          data: { isFavorite: !search.isFavorite }
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const advancedSearchEngine = new AdvancedSearchEngine();
