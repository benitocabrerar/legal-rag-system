/**
 * Advanced Search API Routes (Fastify)
 * RESTful endpoints for the advanced search system
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { advancedSearchEngine } from '../services/search/advanced-search-engine.js';
import { autocompleteService } from '../services/search/autocomplete-service.js';
import { spellCheckerService } from '../services/search/spell-checker.js';
import { queryExpansionService } from '../services/search/query-expansion.js';

interface AdvancedSearchBody {
  query: string;
  filters?: any;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'popularity' | 'authority';
  enableSpellCheck?: boolean;
  enableQueryExpansion?: boolean;
  enableReranking?: boolean;
}

interface AutocompleteQuery {
  q: string;
  limit?: string;
}

interface SpellCheckBody {
  query: string;
}

interface SaveSearchBody {
  query: string;
  filters?: any;
}

interface QueryExpansionBody {
  query: string;
}

export async function advancedSearchRoutes(app: FastifyInstance) {
  /**
   * POST /api/search/advanced
   * Execute advanced search with all features
   */
  app.post<{ Body: AdvancedSearchBody }>(
    '/advanced',
    async (request: FastifyRequest<{ Body: AdvancedSearchBody }>, reply: FastifyReply) => {
      try {
        const {
          query,
          filters,
          limit,
          offset,
          sortBy,
          enableSpellCheck,
          enableQueryExpansion,
          enableReranking
        } = request.body;

        // Validate required fields
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          return reply.code(400).send({
            error: 'Query parameter is required and must be a non-empty string'
          });
        }

        // Validate limit
        const validatedLimit = Math.min(Math.max(1, limit || 20), 100);

        // Get user ID from auth (if authenticated)
        const userId = (request as any).user?.id;

        // Execute search
        const result = await advancedSearchEngine.search({
          query,
          filters,
          limit: validatedLimit,
          offset: offset || 0,
          sortBy: sortBy || 'relevance',
          userId,
          enableSpellCheck: enableSpellCheck !== false,
          enableQueryExpansion: enableQueryExpansion !== false,
          enableReranking: enableReranking !== false
        });

        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('Advanced search error:', error);
        return reply.code(500).send({
          error: 'Internal server error during search',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/search/autocomplete
   * Get autocomplete suggestions for a query
   */
  app.get<{ Querystring: AutocompleteQuery }>(
    '/autocomplete',
    async (request: FastifyRequest<{ Querystring: AutocompleteQuery }>, reply: FastifyReply) => {
      try {
        const query = request.query.q;
        const limit = Math.min(Math.max(1, parseInt(request.query.limit || '10')), 20);

        if (!query || query.length < 2) {
          return {
            success: true,
            data: {
              suggestions: []
            }
          };
        }

        const suggestions = await autocompleteService.getSuggestions(query);

        return {
          success: true,
          data: {
            query,
            suggestions: suggestions.slice(0, limit)
          }
        };
      } catch (error) {
        console.error('Autocomplete error:', error);
        return reply.code(500).send({
          error: 'Internal server error during autocomplete',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/search/popular
   * Get popular search terms
   */
  app.get(
    '/popular',
    async (request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) => {
      try {
        const limit = Math.min(Math.max(1, parseInt(request.query.limit || '10')), 50);
        const popularSearches = await queryExpansionService.getPopularExpansions(limit);

        return {
          success: true,
          data: {
            popularSearches
          }
        };
      } catch (error) {
        console.error('Popular searches error:', error);
        return reply.code(500).send({
          error: 'Internal server error fetching popular searches',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * POST /api/search/spell-check
   * Check spelling and get corrections
   */
  app.post<{ Body: SpellCheckBody }>(
    '/spell-check',
    async (request: FastifyRequest<{ Body: SpellCheckBody }>, reply: FastifyReply) => {
      try {
        const { query } = request.body;

        if (!query || typeof query !== 'string') {
          return reply.code(400).send({
            error: 'Query parameter is required and must be a string'
          });
        }

        const result = spellCheckerService.checkSpelling(query);
        const suggestion = spellCheckerService.generateSuggestion(result);

        return {
          success: true,
          data: {
            ...result,
            suggestion
          }
        };
      } catch (error) {
        console.error('Spell check error:', error);
        return reply.code(500).send({
          error: 'Internal server error during spell check',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/search/saved
   * Get user's saved searches (requires authentication)
   */
  app.get(
    '/saved',
    {
      onRequest: [(app as any).authenticate]
    },
    async (request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;

        if (!userId) {
          return reply.code(401).send({
            error: 'Authentication required'
          });
        }

        const limit = Math.min(Math.max(1, parseInt(request.query.limit || '10')), 50);
        const savedSearches = await advancedSearchEngine.getSavedSearches(userId, limit);

        return {
          success: true,
          data: {
            savedSearches
          }
        };
      } catch (error) {
        console.error('Saved searches error:', error);
        return reply.code(500).send({
          error: 'Internal server error fetching saved searches',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * POST /api/search/save
   * Save a search for later (requires authentication)
   */
  app.post<{ Body: SaveSearchBody }>(
    '/save',
    {
      onRequest: [(app as any).authenticate]
    },
    async (request: FastifyRequest<{ Body: SaveSearchBody }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;

        if (!userId) {
          return reply.code(401).send({
            error: 'Authentication required'
          });
        }

        const { query, filters } = request.body;

        if (!query || typeof query !== 'string') {
          return reply.code(400).send({
            error: 'Query parameter is required and must be a string'
          });
        }

        await advancedSearchEngine.saveSearch(userId, query, filters);

        return {
          success: true,
          message: 'Search saved successfully'
        };
      } catch (error) {
        console.error('Save search error:', error);
        return reply.code(500).send({
          error: 'Internal server error saving search',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * PUT /api/search/saved/:id/favorite
   * Toggle favorite status for a saved search (requires authentication)
   */
  app.put<{ Params: { id: string } }>(
    '/saved/:id/favorite',
    {
      onRequest: [(app as any).authenticate]
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;

        if (!userId) {
          return reply.code(401).send({
            error: 'Authentication required'
          });
        }

        const { id } = request.params;

        await advancedSearchEngine.toggleFavorite(id, userId);

        return {
          success: true,
          message: 'Favorite status toggled successfully'
        };
      } catch (error) {
        console.error('Toggle favorite error:', error);
        return reply.code(500).send({
          error: 'Internal server error toggling favorite',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * POST /api/search/expand
   * Expand a query with synonyms and related terms
   */
  app.post<{ Body: QueryExpansionBody }>(
    '/expand',
    async (request: FastifyRequest<{ Body: QueryExpansionBody }>, reply: FastifyReply) => {
      try {
        const { query } = request.body;

        if (!query || typeof query !== 'string') {
          return reply.code(400).send({
            error: 'Query parameter is required and must be a string'
          });
        }

        const result = await queryExpansionService.expandQuery(query);

        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('Query expansion error:', error);
        return reply.code(500).send({
          error: 'Internal server error expanding query',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );
}
