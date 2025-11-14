/**
 * Filter Builder
 * Converts entities and intent into optimized search filters
 *
 * @module filter-builder
 * @author Legal RAG System
 * @version 2.0.0
 */

import { Logger } from '../../utils/logger';

import type {
  SearchFilters,
  Entity,
  Intent,
  EntityType,
  QueryIntent,
  DateRange,
  FilterSuggestion
} from '../../types/query-transformation.types';

/**
 * Builds and optimizes search filters from entities and intent
 *
 * @example
 * ```typescript
 * const builder = new FilterBuilder();
 * const filters = builder.buildFromEntities(entities);
 * const optimized = builder.optimizeFilters(filters);
 * ```
 */
export class FilterBuilder {
  private readonly logger = new Logger('FilterBuilder');

  /**
   * Mapping of entity types to filter fields
   */
  private readonly ENTITY_TYPE_MAP: Record<EntityType, keyof SearchFilters> = {
    CONSTITUTION: 'normType',
    LAW: 'normType',
    ORGANIC_LAW: 'normType',
    REGULATION: 'normType',
    DECREE: 'normType',
    RESOLUTION: 'normType',
    ORDINANCE: 'normType',
    AGREEMENT: 'normType',
    NATIONAL: 'jurisdiction',
    PROVINCIAL: 'jurisdiction',
    MUNICIPAL: 'jurisdiction',
    INSTITUTIONAL: 'jurisdiction',
    GOVERNMENT_ENTITY: 'issuingEntities',
    MINISTRY: 'issuingEntities',
    SECRETARY: 'issuingEntities',
    AGENCY: 'issuingEntities',
    LEGAL_PRINCIPLE: 'topics',
    LEGAL_PROCEDURE: 'topics',
    LEGAL_RIGHT: 'topics',
    DATE: 'dateRange',
    DATE_RANGE: 'dateRange',
    PROVINCE: 'geographicScope',
    CANTON: 'geographicScope',
    MUNICIPALITY: 'geographicScope',
    LEGAL_TOPIC: 'topics',
    LEGAL_DOMAIN: 'topics'
  };

  /**
   * Build filters from extracted entities
   */
  buildFromEntities(entities: Entity[]): Partial<SearchFilters> {
    try {
      this.logger.debug('Building filters from entities', {
        entityCount: entities.length
      });

      const filters: Partial<SearchFilters> = {};
      const entitiesByType = this.groupEntitiesByType(entities);

      for (const [type, entityList] of Array.from(entitiesByType.entries())) {
        const filterField = this.ENTITY_TYPE_MAP[type];

        if (!filterField) {
          this.logger.warn('Unknown entity type', { type });
          continue;
        }

        switch (filterField) {
          case 'normType':
            filters.normType = this.buildNormTypeFilter(entityList);
            break;

          case 'jurisdiction':
            filters.jurisdiction = this.buildJurisdictionFilter(entityList);
            break;

          case 'issuingEntities':
            filters.issuingEntities = this.buildIssuingEntitiesFilter(entityList);
            break;

          case 'topics':
            filters.topics = this.buildTopicsFilter(entityList);
            break;

          case 'dateRange':
            filters.dateRange = this.buildDateRangeFilter(entityList);
            break;

          case 'geographicScope':
            filters.geographicScope = this.buildGeographicScopeFilter(entityList);
            break;

          default:
            this.logger.warn('Unhandled filter field', { filterField });
        }
      }

      filters.keywords = this.extractKeywords(entities);

      this.logger.debug('Filters built from entities', { filters });

      return filters;

    } catch (error) {
      this.logger.error('Failed to build filters from entities', { error });
      return {};
    }
  }

  /**
   * Build filters from query intent
   */
  buildFromIntent(intent: Intent): Partial<SearchFilters> {
    try {
      this.logger.debug('Building filters from intent', {
        intent: intent.primary
      });

      const filters: Partial<SearchFilters> = {};

      switch (intent.primary) {
        case 'FIND_DOCUMENT' as QueryIntent:
          filters.limit = 20;
          filters.minRelevance = 0.7;
          break;

        case 'FIND_PROVISION' as QueryIntent:
          filters.limit = 50;
          filters.minRelevance = 0.8;
          break;

        case 'COMPARE_NORMS' as QueryIntent:
          filters.limit = 10;
          filters.minRelevance = 0.6;
          break;

        case 'CHECK_VALIDITY' as QueryIntent:
          filters.documentState = 'vigente';
          filters.minRelevance = 0.9;
          break;

        case 'FIND_PRECEDENT' as QueryIntent:
          filters.limit = 30;
          filters.minRelevance = 0.5;
          break;

        case 'UNDERSTAND_PROCEDURE' as QueryIntent:
          filters.topics = ['procedimiento', 'trámite'];
          filters.limit = 15;
          break;

        case 'FIND_AUTHORITY' as QueryIntent:
          filters.limit = 20;
          break;

        case 'GENERAL_SEARCH' as QueryIntent:
        default:
          filters.limit = 25;
          filters.minRelevance = 0.6;
      }

      this.logger.debug('Filters built from intent', { filters });

      return filters;

    } catch (error) {
      this.logger.error('Failed to build filters from intent', { error });
      return {};
    }
  }

  /**
   * Combine multiple filter objects
   */
  combineFilters(...filters: Partial<SearchFilters>[]): SearchFilters {
    try {
      const combined: SearchFilters = {};

      for (const filter of filters) {
        // Merge array fields
        for (const field of [
          'normType',
          'jurisdiction',
          'legalHierarchy',
          'publicationType',
          'keywords',
          'geographicScope',
          'issuingEntities',
          'topics'
        ] as const) {
          if (filter[field] && Array.isArray(filter[field])) {
            if (!combined[field]) {
              combined[field] = [];
            }
            combined[field] = Array.from(
              new Set([...combined[field]!, ...filter[field]!])
            );
          }
        }

        // Merge date range (take most restrictive)
        if (filter.dateRange) {
          if (!combined.dateRange) {
            combined.dateRange = filter.dateRange;
          } else {
            combined.dateRange = {
              from: filter.dateRange.from > combined.dateRange.from
                ? filter.dateRange.from
                : combined.dateRange.from,
              to: filter.dateRange.to < combined.dateRange.to
                ? filter.dateRange.to
                : combined.dateRange.to,
              dateType: filter.dateRange.dateType || combined.dateRange.dateType
            };
          }
        }

        // Merge scalar fields (take most specific)
        if (filter.documentState) {
          combined.documentState = filter.documentState;
        }

        if (filter.minRelevance !== undefined) {
          combined.minRelevance = Math.max(
            combined.minRelevance || 0,
            filter.minRelevance
          );
        }

        if (filter.limit !== undefined) {
          combined.limit = Math.min(
            combined.limit || Infinity,
            filter.limit
          );
        }

        if (filter.offset !== undefined) {
          combined.offset = filter.offset;
        }
      }

      this.logger.debug('Filters combined', {
        inputCount: filters.length,
        output: combined
      });

      return combined;

    } catch (error) {
      this.logger.error('Failed to combine filters', { error });
      return {};
    }
  }

  /**
   * Optimize filters for search performance
   */
  optimizeFilters(filters: SearchFilters): SearchFilters {
    try {
      const optimized = { ...filters };

      // Remove empty arrays
      for (const field of [
        'normType',
        'jurisdiction',
        'legalHierarchy',
        'publicationType',
        'keywords',
        'geographicScope',
        'issuingEntities',
        'topics'
      ] as const) {
        if (optimized[field] && Array.isArray(optimized[field])) {
          if (optimized[field]!.length === 0) {
            delete optimized[field];
          } else {
            // Remove duplicates and normalize
            optimized[field] = Array.from(new Set(
              optimized[field]!.map(v => v.toLowerCase().trim())
            ));
          }
        }
      }

      // Validate and fix date range
      if (optimized.dateRange) {
        const { from, to } = optimized.dateRange;

        if (from > to) {
          // Swap dates if reversed
          optimized.dateRange = {
            from: to,
            to: from,
            dateType: optimized.dateRange.dateType
          };
        }

        // Cap future dates to today
        if (to > new Date()) {
          optimized.dateRange.to = new Date();
        }
      }

      // Optimize keywords
      if (optimized.keywords && optimized.keywords.length > 0) {
        // Remove very short keywords
        optimized.keywords = optimized.keywords.filter(k => k.length >= 3);

        // Limit to most relevant keywords
        if (optimized.keywords.length > 10) {
          optimized.keywords = optimized.keywords.slice(0, 10);
        }
      }

      // Set reasonable defaults
      if (!optimized.limit || optimized.limit > 100) {
        optimized.limit = 25;
      }

      if (!optimized.minRelevance) {
        optimized.minRelevance = 0.5;
      }

      if (!optimized.offset) {
        optimized.offset = 0;
      }

      this.logger.debug('Filters optimized', { optimized });

      return optimized;

    } catch (error) {
      this.logger.error('Failed to optimize filters', { error });
      return filters;
    }
  }

  /**
   * Generate suggestions for filter improvements
   */
  generateSuggestions(filters: SearchFilters): FilterSuggestion[] {
    const suggestions: FilterSuggestion[] = [];

    try {
      // Check for missing jurisdiction
      if (!filters.jurisdiction || filters.jurisdiction.length === 0) {
        suggestions.push({
          field: 'jurisdiction',
          suggestedValue: ['nacional'],
          reason: 'Especificar jurisdicción puede mejorar la precisión',
          expectedImprovement: 'Resultados más relevantes al contexto nacional'
        });
      }

      // Check for very broad search
      const hasCriteria = (filters.normType && filters.normType.length > 0) ||
                          (filters.keywords && filters.keywords.length > 0) ||
                          (filters.topics && filters.topics.length > 0);

      if (!hasCriteria) {
        suggestions.push({
          field: 'keywords',
          suggestedValue: [],
          reason: 'Búsqueda muy amplia, considere agregar términos específicos',
          expectedImprovement: 'Reducirá resultados irrelevantes'
        });
      }

      // Check for missing temporal filter
      if (!filters.dateRange && filters.documentState === 'vigente') {
        const currentYear = new Date().getFullYear();
        suggestions.push({
          field: 'dateRange',
          suggestedValue: {
            from: new Date(`${currentYear - 5}-01-01`),
            to: new Date(),
            dateType: 'publication'
          },
          reason: 'Agregar rango de fechas reciente para documentos vigentes',
          expectedImprovement: 'Priorizará normativa reciente'
        });
      }

      // Check for high keyword count
      if (filters.keywords && filters.keywords.length > 10) {
        suggestions.push({
          field: 'keywords',
          suggestedValue: filters.keywords.slice(0, 5),
          reason: 'Reducir número de palabras clave para mejorar performance',
          expectedImprovement: 'Búsqueda más rápida y enfocada'
        });
      }

      return suggestions;

    } catch (error) {
      this.logger.error('Failed to generate suggestions', { error });
      return suggestions;
    }
  }

  /**
   * Group entities by type
   */
  private groupEntitiesByType(entities: Entity[]): Map<EntityType, Entity[]> {
    const grouped = new Map<EntityType, Entity[]>();

    for (const entity of entities) {
      if (!grouped.has(entity.type)) {
        grouped.set(entity.type, []);
      }
      grouped.get(entity.type)!.push(entity);
    }

    return grouped;
  }

  /**
   * Build normative type filter
   */
  private buildNormTypeFilter(entities: Entity[]): string[] {
    const normTypes = new Set<string>();

    for (const entity of entities) {
      const normalized = entity.normalizedText.toLowerCase();

      if (normalized.includes('constitución') || normalized.includes('constitucion')) {
        normTypes.add('constitucion');
      } else if (normalized.includes('código') || normalized.includes('codigo')) {
        normTypes.add('codigo');
      } else if (normalized.includes('ley orgánica') || normalized.includes('ley organica')) {
        normTypes.add('ley_organica');
      } else if (normalized.includes('ley')) {
        normTypes.add('ley');
      } else if (normalized.includes('decreto')) {
        normTypes.add('decreto');
      } else if (normalized.includes('resolución') || normalized.includes('resolucion')) {
        normTypes.add('resolucion');
      } else if (normalized.includes('ordenanza')) {
        normTypes.add('ordenanza');
      } else if (normalized.includes('acuerdo')) {
        normTypes.add('acuerdo');
      } else if (normalized.includes('reglamento')) {
        normTypes.add('reglamento');
      }
    }

    return Array.from(normTypes);
  }

  /**
   * Build jurisdiction filter
   */
  private buildJurisdictionFilter(entities: Entity[]): string[] {
    const jurisdictions = new Set<string>();

    for (const entity of entities) {
      switch (entity.type) {
        case 'NATIONAL' as EntityType:
          jurisdictions.add('nacional');
          break;
        case 'PROVINCIAL' as EntityType:
          jurisdictions.add('provincial');
          break;
        case 'MUNICIPAL' as EntityType:
          jurisdictions.add('municipal');
          break;
        case 'INSTITUTIONAL' as EntityType:
          jurisdictions.add('institucional');
          break;
      }
    }

    return Array.from(jurisdictions);
  }

  /**
   * Build issuing entities filter
   */
  private buildIssuingEntitiesFilter(entities: Entity[]): string[] {
    return entities.map(e => e.normalizedText);
  }

  /**
   * Build topics filter
   */
  private buildTopicsFilter(entities: Entity[]): string[] {
    return entities.map(e => e.normalizedText.toLowerCase());
  }

  /**
   * Build date range filter
   */
  private buildDateRangeFilter(entities: Entity[]): DateRange | undefined {
    // Simplified date extraction
    // In a real implementation, you'd parse dates from entity text

    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    return {
      from: oneYearAgo,
      to: now,
      dateType: 'publication'
    };
  }

  /**
   * Build geographic scope filter
   */
  private buildGeographicScopeFilter(entities: Entity[]): string[] {
    return entities.map(e => e.normalizedText);
  }

  /**
   * Extract keywords from entities
   */
  private extractKeywords(entities: Entity[]): string[] {
    const keywords = new Set<string>();

    for (const entity of entities) {
      // Split entity text into words
      const words = entity.text
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length >= 3);

      for (const word of words) {
        keywords.add(word);
      }
    }

    return Array.from(keywords);
  }
}
