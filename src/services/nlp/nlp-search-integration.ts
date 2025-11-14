/**
 * NLP-Search Integration Service
 * Bridges natural language query transformation with Phase 9 Advanced Search
 *
 * @module nlp-search-integration
 * @author Legal RAG System - Week 2 Integration
 * @version 1.0.0
 *
 * Architecture:
 * - Transforms natural language queries using QueryTransformationService
 * - Maps transformed filters to AdvancedSearchEngine format
 * - Executes search with transformed filters
 * - Combines results with transformation metadata for comprehensive response
 *
 * This service is the critical bridge between Week 2 NLP capabilities
 * and Phase 9 search functionality, enabling seamless NLP-powered search.
 */

import { QueryTransformationService } from './query-transformation-service.js';
import { advancedSearchEngine } from '../search/advanced-search-engine.js';
import { Logger } from '../../utils/logger.js';

import type {
  TransformationResult,
  SearchFilters as NLPSearchFilters,
  TransformationConfig
} from '../../types/query-transformation.types.js';

import type {
  SearchFilters as AdvancedSearchFilters,
  SearchOptions as AdvancedSearchOptions,
  SearchResult as AdvancedSearchResult
} from '../search/advanced-search-engine.js';

/**
 * Options for NLP-powered search
 */
export interface NLPSearchOptions {
  /** Natural language query */
  query: string;

  /** User ID for personalization (optional) */
  userId?: string;

  /** Search execution options */
  searchOptions?: {
    limit?: number;
    offset?: number;
    sortBy?: 'relevance' | 'date' | 'popularity' | 'authority';
    enableSpellCheck?: boolean;
    enableQueryExpansion?: boolean;
    enableReranking?: boolean;
  };

  /** Transformation configuration (optional) */
  transformationConfig?: Partial<TransformationConfig>;
}

/**
 * Combined result from NLP transformation + search execution
 */
export interface NLPSearchResult {
  /** Query transformation results */
  transformation: TransformationResult;

  /** Search execution results */
  searchResults: {
    documents: any[];
    totalCount: number;
    query: {
      original: string;
      corrected?: string;
      expanded?: string[];
      suggestions?: string;
    };
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    processingTimeMs: number;
  };

  /** Combined processing time */
  combinedProcessingTimeMs: number;

  /** User recommendations based on results */
  recommendations?: string[];
}

/**
 * NLP-Search Integration Service
 *
 * This service orchestrates the complete NLP-powered search flow:
 * 1. Transform natural language query into structured filters
 * 2. Map NLP filters to Advanced Search format
 * 3. Execute search with transformed filters
 * 4. Return unified results with transformation metadata
 *
 * The service handles filter format conversion and ensures compatibility
 * between the NLP transformation layer and the search execution layer.
 */
export class NLPSearchIntegrationService {
  private readonly logger = new Logger('NLPSearchIntegrationService');
  private readonly transformationService: QueryTransformationService;

  /**
   * Initialize the integration service
   *
   * @param config - Optional transformation configuration
   */
  constructor(config?: Partial<TransformationConfig>) {
    this.transformationService = new QueryTransformationService(config);
    this.logger.info('NLPSearchIntegrationService initialized');
  }

  /**
   * Execute NLP-powered search
   *
   * This is the main entry point for integrated NLP search:
   * - Transforms natural language query
   * - Executes advanced search with filters
   * - Returns comprehensive results
   *
   * @param options - Search options including query and preferences
   * @returns Combined transformation and search results
   * @throws Error if transformation or search fails
   *
   * @example
   * ```typescript
   * const result = await service.searchWithNLP({
   *   query: "leyes laborales vigentes de 2023",
   *   searchOptions: {
   *     limit: 20,
   *     sortBy: 'relevance'
   *   }
   * });
   *
   * console.log(result.transformation.confidence); // 0.85
   * console.log(result.searchResults.totalCount);  // 42
   * ```
   */
  async searchWithNLP(options: NLPSearchOptions): Promise<NLPSearchResult> {
    const overallStartTime = Date.now();

    try {
      this.logger.info('Starting NLP-powered search', {
        query: options.query,
        userId: options.userId
      });

      // Step 1: Transform natural language query
      const transformStartTime = Date.now();

      const transformation = await this.transformQuery(
        options.query,
        options.transformationConfig
      );

      const transformationTime = Date.now() - transformStartTime;

      this.logger.debug('Query transformation completed', {
        confidence: transformation.confidence,
        entityCount: transformation.entities.length,
        transformationTimeMs: transformationTime
      });

      // Step 2: Convert NLP filters to Advanced Search format
      const advancedSearchFilters = this.mapNLPFiltersToAdvancedSearch(
        transformation.filters
      );

      // Step 3: Build search options
      const searchOptions: AdvancedSearchOptions = {
        query: options.query,
        filters: advancedSearchFilters,
        limit: options.searchOptions?.limit ?? 20,
        offset: options.searchOptions?.offset ?? 0,
        sortBy: options.searchOptions?.sortBy ?? 'relevance',
        userId: options.userId,
        enableSpellCheck: options.searchOptions?.enableSpellCheck ?? true,
        enableQueryExpansion: options.searchOptions?.enableQueryExpansion ?? true,
        enableReranking: options.searchOptions?.enableReranking ?? true
      };

      // Step 4: Execute search
      const searchStartTime = Date.now();

      const advancedSearchResult = await advancedSearchEngine.search(searchOptions);

      const searchTime = Date.now() - searchStartTime;

      this.logger.debug('Search execution completed', {
        documentCount: advancedSearchResult.documents.length,
        totalCount: advancedSearchResult.totalCount,
        searchTimeMs: searchTime
      });

      // Step 5: Build combined result
      const combinedProcessingTimeMs = Date.now() - overallStartTime;

      const result: NLPSearchResult = {
        transformation,
        searchResults: {
          documents: advancedSearchResult.documents,
          totalCount: advancedSearchResult.totalCount,
          query: advancedSearchResult.query,
          pagination: advancedSearchResult.pagination,
          processingTimeMs: advancedSearchResult.performance.totalTimeMs
        },
        combinedProcessingTimeMs,
        recommendations: this.generateRecommendations(
          transformation,
          advancedSearchResult
        )
      };

      this.logger.info('NLP-powered search completed', {
        query: options.query,
        totalTimeMs: combinedProcessingTimeMs,
        resultsCount: result.searchResults.totalCount,
        confidence: transformation.confidence
      });

      return result;

    } catch (error) {
      this.logger.error('NLP-powered search failed', {
        query: options.query,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new Error(
        `NLP search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Transform query using QueryTransformationService
   *
   * @param query - Natural language query
   * @param config - Optional transformation configuration
   * @returns Transformation result with filters and metadata
   * @private
   */
  private async transformQuery(
    query: string,
    config?: Partial<TransformationConfig>
  ): Promise<TransformationResult> {
    try {
      // Use custom config if provided, otherwise use default service
      if (config) {
        const customService = new QueryTransformationService(config);
        return await customService.transformQuery(query);
      }

      return await this.transformationService.transformQuery(query);

    } catch (error) {
      this.logger.error('Query transformation failed', {
        query,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new Error(
        `Query transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Map NLP filters to Advanced Search Engine format
   *
   * The NLP transformation produces filters in a slightly different format
   * than what the Advanced Search Engine expects. This method handles
   * the conversion and ensures full compatibility.
   *
   * Key mappings:
   * - normType → normType (direct mapping)
   * - jurisdiction → jurisdiction (direct mapping)
   * - legalHierarchy → legalHierarchy (direct mapping)
   * - publicationType → publicationType (direct mapping)
   * - dateRange → publicationDateFrom/publicationDateTo (date range expansion)
   * - keywords → added to main search query (handled by Advanced Search)
   *
   * @param nlpFilters - Filters from NLP transformation
   * @returns Filters in Advanced Search format
   * @private
   */
  private mapNLPFiltersToAdvancedSearch(
    nlpFilters: NLPSearchFilters
  ): AdvancedSearchFilters {
    const advancedFilters: AdvancedSearchFilters = {};

    // Direct mappings - these fields have identical structure
    if (nlpFilters.normType && nlpFilters.normType.length > 0) {
      advancedFilters.normType = nlpFilters.normType;
    }

    if (nlpFilters.jurisdiction && nlpFilters.jurisdiction.length > 0) {
      advancedFilters.jurisdiction = nlpFilters.jurisdiction;
    }

    if (nlpFilters.legalHierarchy && nlpFilters.legalHierarchy.length > 0) {
      advancedFilters.legalHierarchy = nlpFilters.legalHierarchy;
    }

    if (nlpFilters.publicationType && nlpFilters.publicationType.length > 0) {
      advancedFilters.publicationType = nlpFilters.publicationType;
    }

    // Date range mapping - expand to from/to fields
    if (nlpFilters.dateRange) {
      advancedFilters.publicationDateFrom = nlpFilters.dateRange.from;
      advancedFilters.publicationDateTo = nlpFilters.dateRange.to;
    }

    // Note: keywords are typically incorporated into the main query string
    // by the Advanced Search Engine, so we don't need to map them separately
    // The search engine will handle keyword extraction from the original query

    this.logger.debug('Filter mapping completed', {
      nlpFilterKeys: Object.keys(nlpFilters),
      advancedFilterKeys: Object.keys(advancedFilters)
    });

    return advancedFilters;
  }

  /**
   * Generate user recommendations based on search results
   *
   * Analyzes the transformation confidence, search results, and validation
   * to provide actionable recommendations for improving search results.
   *
   * @param transformation - Transformation result
   * @param searchResult - Advanced search result
   * @returns Array of recommendation strings
   * @private
   */
  private generateRecommendations(
    transformation: TransformationResult,
    searchResult: AdvancedSearchResult
  ): string[] {
    const recommendations: string[] = [];

    // Low confidence transformation
    if (transformation.confidence < 0.5) {
      recommendations.push(
        'La consulta es ambigua. Intenta ser más específico con el tipo de norma y el tema legal.'
      );
    }

    // No results found
    if (searchResult.totalCount === 0) {
      recommendations.push(
        'No se encontraron resultados. Intenta usar términos más generales o verifica la ortografía.'
      );

      // Suggest spell correction if available
      if (searchResult.query.corrected && searchResult.query.corrected !== searchResult.query.original) {
        recommendations.push(
          `¿Quisiste decir "${searchResult.query.corrected}"?`
        );
      }
    }

    // Few results found
    if (searchResult.totalCount > 0 && searchResult.totalCount < 5) {
      recommendations.push(
        'Pocos resultados encontrados. Considera ampliar tu búsqueda usando términos más generales.'
      );
    }

    // Many results - suggest filtering
    if (searchResult.totalCount > 100) {
      recommendations.push(
        'Muchos resultados encontrados. Añade filtros más específicos para reducir los resultados.'
      );

      // Suggest specific filters if not used
      if (!transformation.filters.dateRange) {
        recommendations.push('Considera agregar un rango de fechas para filtrar resultados.');
      }

      if (!transformation.filters.jurisdiction || transformation.filters.jurisdiction.length === 0) {
        recommendations.push('Especifica la jurisdicción (nacional, provincial, municipal) para mejorar la precisión.');
      }
    }

    // Validation warnings
    if (transformation.validation.warnings.length > 0) {
      const highSeverityWarnings = transformation.validation.warnings.filter(
        w => w.severity === 'high' || w.severity === 'medium'
      );

      if (highSeverityWarnings.length > 0) {
        recommendations.push(
          'Se detectaron algunas advertencias en tu consulta. Revisa los filtros para mejores resultados.'
        );
      }
    }

    // Refinement suggestions from transformation
    if (transformation.refinementSuggestions.length > 0) {
      recommendations.push(...transformation.refinementSuggestions);
    }

    // Query expansion available
    if (searchResult.expansion && searchResult.expansion.expandedTerms.length > 0) {
      recommendations.push(
        `Términos relacionados incluidos: ${searchResult.expansion.expandedTerms.slice(0, 3).join(', ')}`
      );
    }

    return recommendations;
  }

  /**
   * Get transformation service metrics
   *
   * Useful for monitoring and performance analysis
   *
   * @returns Performance metrics array
   */
  getMetrics() {
    return this.transformationService.getMetrics();
  }

  /**
   * Clear transformation service metrics
   *
   * Should be called periodically to prevent memory buildup
   */
  clearMetrics() {
    this.transformationService.clearMetrics();
  }
}

/**
 * Export singleton instance for use across the application
 *
 * The singleton pattern ensures consistent configuration and
 * shared metric collection across all NLP searches.
 */
export const nlpSearchIntegrationService = new NLPSearchIntegrationService({
  debug: process.env.NODE_ENV === 'development',
  enableCaching: true,
  cacheTTL: 3600,
  maxProcessingTime: 2000,
  llmModel: 'gpt-4-turbo-preview',
  llmTemperature: 0.3,
  maxLlmTokens: 1000,
  minConfidenceThreshold: 0.5,
  enablePerformanceMonitoring: true
});
