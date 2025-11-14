/**
 * NLP API Routes (Fastify)
 * Natural Language Processing endpoints for query transformation and integrated search
 *
 * @module nlp-routes
 * @author Legal RAG System - Week 2 Query Transformation
 * @version 1.0.0
 *
 * Architecture:
 * - Transform natural language queries into structured search filters
 * - Integrate with Phase 9 Advanced Search for seamless NLP-powered search
 * - Validate filters and provide refinement suggestions
 * - Entity dictionary management for legal terms
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { QueryTransformationService } from '../services/nlp/query-transformation-service.js';
import { LegalEntityDictionary } from '../services/nlp/legal-entity-dictionary.js';
import { nlpSearchIntegrationService } from '../services/nlp/nlp-search-integration.js';
import {
  EntityType
} from '../types/query-transformation.types.js';
import type {
  SearchFilters,
  TransformationConfig
} from '../types/query-transformation.types.js';

/**
 * Request body types for route handlers
 */
interface TransformQueryBody {
  query: string;
  config?: Partial<TransformationConfig>;
}

interface NLPSearchBody {
  query: string;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'popularity' | 'authority';
  enableSpellCheck?: boolean;
  enableQueryExpansion?: boolean;
  enableReranking?: boolean;
  transformationConfig?: Partial<TransformationConfig>;
}

interface ValidateFiltersBody {
  filters: SearchFilters;
}

interface EntitySearchQuery {
  q: string;
  type?: string;
  fuzzy?: string;
  limit?: string;
}

interface EntityIdParams {
  id: string;
}

/**
 * Standard API response wrapper
 */
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

/**
 * Initialize Query Transformation Service singleton
 * Configuration is optimized for production use
 */
const transformationService = new QueryTransformationService({
  debug: process.env.NODE_ENV === 'development',
  enableCaching: true,
  cacheTTL: 3600, // 1 hour
  maxProcessingTime: 2000, // 2 seconds
  llmModel: 'gpt-4-turbo-preview',
  llmTemperature: 0.3, // More deterministic for legal queries
  maxLlmTokens: 1000,
  minConfidenceThreshold: 0.5,
  enablePerformanceMonitoring: true
});

/**
 * Initialize Legal Entity Dictionary for entity lookups
 */
const entityDictionary = new LegalEntityDictionary();

/**
 * Register NLP API routes
 *
 * @param app - Fastify instance
 *
 * Routes:
 * - POST /transform - Transform NL query to filters
 * - POST /search - Transform query AND execute search
 * - GET /entities/search - Search entity dictionary
 * - GET /entities/:id - Get specific entity
 * - POST /validate - Validate transformation filters
 */
export async function nlpRoutes(app: FastifyInstance) {
  /**
   * POST /api/nlp/transform
   *
   * Transform a natural language query into structured search filters.
   * This is the core NLP transformation endpoint that powers the legal search system.
   *
   * @example
   * POST /api/nlp/transform
   * {
   *   "query": "decretos presidenciales sobre educación del último año"
   * }
   *
   * @response
   * {
   *   "success": true,
   *   "transformation": {
   *     "filters": { normType: ['decreto'], topics: ['educación'], ... },
   *     "confidence": 0.85,
   *     "entities": [...],
   *     "intent": {...},
   *     "processingTimeMs": 450,
   *     "validation": {...},
   *     "refinementSuggestions": [...]
   *   }
   * }
   */
  app.post<{ Body: TransformQueryBody }>(
    '/transform',
    async (request: FastifyRequest<{ Body: TransformQueryBody }>, reply: FastifyReply) => {
      try {
        const { query, config } = request.body;

        // Validate input
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          return reply.code(400).send({
            success: false,
            error: 'Query parameter is required and must be a non-empty string',
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        // Check query length
        if (query.length > 1000) {
          return reply.code(400).send({
            success: false,
            error: 'Query exceeds maximum length of 1000 characters',
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        // Create service instance with custom config if provided
        const service = config
          ? new QueryTransformationService(config)
          : transformationService;

        // Transform query
        const transformation = await service.transformQuery(query);

        // Check if transformation confidence is below threshold
        if (transformation.confidence < 0.3) {
          return reply.code(200).send({
            success: true,
            data: {
              ...transformation,
              warning: 'Low confidence transformation. Consider refining your query.'
            },
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        return {
          success: true,
          data: transformation,
          timestamp: new Date().toISOString()
        } as ApiResponse;

      } catch (error) {
        console.error('Query transformation failed:', error);

        // Handle specific error types
        if (error instanceof Error) {
          if (error.message.includes('timeout') || error.message.includes('processing time')) {
            return reply.code(408).send({
              success: false,
              error: 'Query transformation timed out. Please try a simpler query.',
              message: error.message,
              timestamp: new Date().toISOString()
            } as ApiResponse);
          }

          return reply.code(422).send({
            success: false,
            error: 'Failed to transform query',
            message: error.message,
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        return reply.code(500).send({
          success: false,
          error: 'Internal server error during query transformation',
          timestamp: new Date().toISOString()
        } as ApiResponse);
      }
    }
  );

  /**
   * POST /api/nlp/search
   *
   * Integrated endpoint: Transform natural language query AND execute search.
   * This is the primary endpoint for NLP-powered legal search.
   *
   * Flow:
   * 1. Transform NL query → structured filters
   * 2. Execute advanced search with filters
   * 3. Return combined results with transformation metadata
   *
   * @example
   * POST /api/nlp/search
   * {
   *   "query": "leyes laborales vigentes de 2023",
   *   "limit": 20,
   *   "sortBy": "relevance"
   * }
   *
   * @response
   * {
   *   "success": true,
   *   "transformation": { filters: {...}, confidence: 0.85, ... },
   *   "searchResults": {
   *     "documents": [...],
   *     "totalCount": 42,
   *     "processingTimeMs": 1200
   *   },
   *   "combinedProcessingTimeMs": 1650
   * }
   */
  app.post<{ Body: NLPSearchBody }>(
    '/search',
    async (request: FastifyRequest<{ Body: NLPSearchBody }>, reply: FastifyReply) => {
      try {
        const {
          query,
          limit = 20,
          offset = 0,
          sortBy = 'relevance',
          enableSpellCheck = true,
          enableQueryExpansion = true,
          enableReranking = true,
          transformationConfig
        } = request.body;

        // Validate input
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          return reply.code(400).send({
            success: false,
            error: 'Query parameter is required and must be a non-empty string',
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        // Validate limit
        const validatedLimit = Math.min(Math.max(1, limit), 100);

        // Get user ID from auth (if authenticated)
        const userId = (request as any).user?.id;

        // Execute integrated NLP search
        const result = await nlpSearchIntegrationService.searchWithNLP({
          query,
          userId,
          searchOptions: {
            limit: validatedLimit,
            offset,
            sortBy,
            enableSpellCheck,
            enableQueryExpansion,
            enableReranking
          },
          transformationConfig
        });

        // Check if no results found
        if (result.searchResults.totalCount === 0) {
          return {
            success: true,
            data: {
              ...result,
              message: 'No documents found matching your query. Try adjusting your search terms.'
            },
            timestamp: new Date().toISOString()
          } as ApiResponse;
        }

        return {
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        } as ApiResponse;

      } catch (error) {
        console.error('NLP search failed:', error);

        if (error instanceof Error) {
          // Check for transformation failures
          if (error.message.includes('transform')) {
            return reply.code(422).send({
              success: false,
              error: 'Failed to transform query',
              message: error.message,
              timestamp: new Date().toISOString()
            } as ApiResponse);
          }

          // Check for search failures
          if (error.message.includes('search')) {
            return reply.code(500).send({
              success: false,
              error: 'Search execution failed',
              message: error.message,
              timestamp: new Date().toISOString()
            } as ApiResponse);
          }
        }

        return reply.code(500).send({
          success: false,
          error: 'Internal server error during NLP search',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        } as ApiResponse);
      }
    }
  );

  /**
   * GET /api/nlp/entities/search
   *
   * Search the legal entity dictionary for entities matching a query.
   * Useful for autocomplete, entity suggestions, and validation.
   *
   * @query q - Search query (required, min 2 characters)
   * @query type - Filter by entity type (optional)
   * @query fuzzy - Enable fuzzy matching (default: true)
   * @query limit - Max results (default: 10, max: 50)
   *
   * @example
   * GET /api/nlp/entities/search?q=constituc&type=LAW&limit=5
   *
   * @response
   * {
   *   "success": true,
   *   "entities": [
   *     {
   *       "id": "...",
   *       "name": "Constitución de la República del Ecuador",
   *       "type": "CONSTITUTION",
   *       "normalizedName": "constitucion republica ecuador",
   *       "synonyms": ["carta magna", "constitución"],
   *       "metadata": {...}
   *     }
   *   ],
   *   "totalCount": 3
   * }
   */
  app.get<{ Querystring: EntitySearchQuery }>(
    '/entities/search',
    async (request: FastifyRequest<{ Querystring: EntitySearchQuery }>, reply: FastifyReply) => {
      try {
        const {
          q,
          type,
          fuzzy = 'true',
          limit = '10'
        } = request.query;

        // Validate query
        if (!q || q.length < 2) {
          return reply.code(400).send({
            success: false,
            error: 'Query parameter "q" is required and must be at least 2 characters',
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        // Parse and validate limit
        const parsedLimit = Math.min(Math.max(1, parseInt(limit)), 50);

        // Parse entity type if provided
        let entityType: EntityType | undefined;
        if (type) {
          entityType = type as EntityType;
          // Validate entity type
          if (!Object.values(EntityType).includes(entityType)) {
            return reply.code(400).send({
              success: false,
              error: `Invalid entity type. Valid types: ${Object.values(EntityType).join(', ')}`,
              timestamp: new Date().toISOString()
            } as ApiResponse);
          }
        }

        // Search entities
        const entities = await entityDictionary.searchEntities(q, {
          fuzzy: fuzzy === 'true',
          fuzzyThreshold: 0.7,
          maxResults: parsedLimit,
          entityType,
          caseSensitive: false
        });

        return {
          success: true,
          data: {
            query: q,
            entities: entities.map(e => ({
              id: e.id,
              type: e.type,
              name: e.name,
              normalizedName: e.normalizedName,
              synonyms: e.synonyms,
              metadata: e.metadata,
              weight: e.weight
            })),
            totalCount: entities.length,
            filters: {
              type: entityType,
              fuzzy: fuzzy === 'true'
            }
          },
          timestamp: new Date().toISOString()
        } as ApiResponse;

      } catch (error) {
        console.error('Entity search failed:', error);

        return reply.code(500).send({
          success: false,
          error: 'Internal server error during entity search',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        } as ApiResponse);
      }
    }
  );

  /**
   * GET /api/nlp/entities/:id
   *
   * Get detailed information about a specific legal entity by ID.
   *
   * @param id - Entity ID
   *
   * @example
   * GET /api/nlp/entities/entity_constitution_ecuador_2008
   *
   * @response
   * {
   *   "success": true,
   *   "entity": {
   *     "id": "entity_constitution_ecuador_2008",
   *     "type": "CONSTITUTION",
   *     "name": "Constitución de la República del Ecuador 2008",
   *     "metadata": {
   *       "officialName": "...",
   *       "hierarchyLevel": 0,
   *       "status": "active",
   *       ...
   *     }
   *   }
   * }
   */
  app.get<{ Params: EntityIdParams }>(
    '/entities/:id',
    async (request: FastifyRequest<{ Params: EntityIdParams }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;

        // Validate ID
        if (!id || id.trim().length === 0) {
          return reply.code(400).send({
            success: false,
            error: 'Entity ID is required',
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        // Find entity
        const entity = await entityDictionary.getEntityById(id);

        if (!entity) {
          return reply.code(404).send({
            success: false,
            error: `Entity not found with ID: ${id}`,
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        return {
          success: true,
          data: {
            entity: {
              id: entity.id,
              type: entity.type,
              name: entity.name,
              normalizedName: entity.normalizedName,
              synonyms: entity.synonyms,
              pattern: entity.pattern.source, // Return pattern as string
              metadata: entity.metadata,
              weight: entity.weight
            }
          },
          timestamp: new Date().toISOString()
        } as ApiResponse;

      } catch (error) {
        console.error('Entity retrieval failed:', error);

        return reply.code(500).send({
          success: false,
          error: 'Internal server error during entity retrieval',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        } as ApiResponse);
      }
    }
  );

  /**
   * POST /api/nlp/validate
   *
   * Validate search filters for correctness and compatibility.
   * Useful for frontend validation before executing searches.
   *
   * @example
   * POST /api/nlp/validate
   * {
   *   "filters": {
   *     "normType": ["ley", "decreto"],
   *     "jurisdiction": ["nacional"],
   *     "dateRange": {
   *       "from": "2023-01-01T00:00:00.000Z",
   *       "to": "2023-12-31T23:59:59.999Z",
   *       "dateType": "publication"
   *     }
   *   }
   * }
   *
   * @response
   * {
   *   "success": true,
   *   "validation": {
   *     "isValid": true,
   *     "errors": [],
   *     "warnings": [],
   *     "suggestions": [...]
   *   }
   * }
   */
  app.post<{ Body: ValidateFiltersBody }>(
    '/validate',
    async (request: FastifyRequest<{ Body: ValidateFiltersBody }>, reply: FastifyReply) => {
      try {
        const { filters } = request.body;

        // Validate input
        if (!filters || typeof filters !== 'object') {
          return reply.code(400).send({
            success: false,
            error: 'Filters parameter is required and must be an object',
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        // Convert date strings to Date objects if present
        if (filters.dateRange) {
          if (typeof filters.dateRange.from === 'string') {
            filters.dateRange.from = new Date(filters.dateRange.from);
          }
          if (typeof filters.dateRange.to === 'string') {
            filters.dateRange.to = new Date(filters.dateRange.to);
          }
        }

        // Validate filters
        const validation = await transformationService.validateFilters(filters);

        // Return validation result with appropriate status code
        const statusCode = validation.isValid ? 200 : 422;

        return reply.code(statusCode).send({
          success: validation.isValid,
          data: {
            validation,
            filters // Echo back the filters for reference
          },
          timestamp: new Date().toISOString()
        } as ApiResponse);

      } catch (error) {
        console.error('Filter validation failed:', error);

        return reply.code(500).send({
          success: false,
          error: 'Internal server error during filter validation',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        } as ApiResponse);
      }
    }
  );

  /**
   * GET /api/nlp/health
   *
   * Health check endpoint for NLP services.
   * Returns service status and configuration.
   */
  app.get(
    '/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const metrics = transformationService.getMetrics();
        const avgProcessingTime = metrics.length > 0
          ? metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
          : 0;

        return {
          success: true,
          data: {
            status: 'healthy',
            service: 'NLP Query Transformation',
            version: '1.0.0',
            metrics: {
              totalTransformations: metrics.length,
              avgProcessingTimeMs: Math.round(avgProcessingTime),
              entityDictionarySize: await entityDictionary.getEntityCount()
            }
          },
          timestamp: new Date().toISOString()
        } as ApiResponse;

      } catch (error) {
        return reply.code(500).send({
          success: false,
          error: 'Service health check failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        } as ApiResponse);
      }
    }
  );
}
