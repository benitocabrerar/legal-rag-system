/**
 * Legal Entity Dictionary
 * Manages Ecuadorian legal entities with fuzzy matching and caching
 *
 * @module legal-entity-dictionary
 * @author Legal RAG System
 * @version 2.0.0
 */

import Fuse from 'fuse.js';
import { PrismaClient } from '@prisma/client';
import { Logger } from '../../utils/logger';

import type {
  LegalEntity,
  EntityType,
  EntityMetadata,
  EntitySearchOptions
} from '../../types/query-transformation.types';

/**
 * Dictionary of Ecuadorian legal entities with fuzzy matching capabilities
 *
 * @example
 * ```typescript
 * const dictionary = new LegalEntityDictionary();
 * await dictionary.initialize();
 *
 * const entity = await dictionary.findEntity("C�digo Civil");
 * console.log(entity?.normalizedName); // "C�DIGO CIVIL"
 * ```
 */
export class LegalEntityDictionary {
  private readonly logger = new Logger('LegalEntityDictionary');
  private readonly prisma = new PrismaClient();

  /**
   * In-memory entity store for fast access
   */
  private entities: Map<string, LegalEntity> = new Map();

  /**
   * Fuse.js instance for fuzzy searching
   */
  private fuse: Fuse<LegalEntity> | null = null;

  /**
   * Initialization state
   */
  private initialized = false;

  /**
   * Pattern registry for quick pattern matching
   */
  private patterns: Array<{ pattern: RegExp; entityId: string }> = [];

  /**
   * Default Ecuadorian legal entities
   */
  private readonly DEFAULT_ENTITIES: Partial<LegalEntity>[] = [
    // Constitutions
    {
      type: 'CONSTITUTION' as EntityType,
      name: 'Constituci�n de la Rep�blica del Ecuador',
      normalizedName: 'CONSTITUCI�N DE LA REP�BLICA DEL ECUADOR',
      synonyms: ['Constituci�n', 'Carta Magna', 'Constituci�n 2008', 'CRE'],
      pattern: /constituci[o�]n(\s+de\s+la\s+rep[u�]blica)?(\s+del\s+ecuador)?/i,
      weight: 100,
      metadata: {
        officialName: 'Constituci�n de la Rep�blica del Ecuador',
        abbreviations: ['CRE', 'Constituci�n'],
        hierarchyLevel: 0,
        publicationSource: 'Registro Oficial',
        relatedEntities: [],
        status: 'active',
        customMetadata: { year: 2008 }
      }
    },

    // Major Codes
    {
      type: 'ORGANIC_LAW' as EntityType,
      name: 'C�digo Civil',
      normalizedName: 'C�DIGO CIVIL',
      synonyms: ['CC', 'C�digo Civil Ecuatoriano'],
      pattern: /c[o�]digo\s+civil/i,
      weight: 95,
      metadata: {
        officialName: 'C�digo Civil',
        abbreviations: ['CC'],
        hierarchyLevel: 1,
        publicationSource: 'Registro Oficial',
        relatedEntities: [],
        status: 'active',
        customMetadata: {}
      }
    },

    {
      type: 'ORGANIC_LAW' as EntityType,
      name: 'C�digo Org�nico Integral Penal',
      normalizedName: 'C�DIGO ORG�NICO INTEGRAL PENAL',
      synonyms: ['COIP', 'C�digo Penal'],
      pattern: /c[o�]digo\s+(org[a�]nico\s+integral\s+)?penal|COIP/i,
      weight: 95,
      metadata: {
        officialName: 'C�digo Org�nico Integral Penal',
        abbreviations: ['COIP'],
        hierarchyLevel: 1,
        publicationSource: 'Registro Oficial',
        relatedEntities: [],
        status: 'active',
        customMetadata: {}
      }
    },

    {
      type: 'ORGANIC_LAW' as EntityType,
      name: 'C�digo del Trabajo',
      normalizedName: 'C�DIGO DEL TRABAJO',
      synonyms: ['CT', 'C�digo Laboral'],
      pattern: /c[o�]digo\s+del?\s+trabajo|c[o�]digo\s+laboral/i,
      weight: 95,
      metadata: {
        officialName: 'C�digo del Trabajo',
        abbreviations: ['CT'],
        hierarchyLevel: 1,
        publicationSource: 'Registro Oficial',
        relatedEntities: [],
        status: 'active',
        customMetadata: {}
      }
    },

    {
      type: 'ORGANIC_LAW' as EntityType,
      name: 'C�digo Tributario',
      normalizedName: 'C�DIGO TRIBUTARIO',
      synonyms: ['C�digo Fiscal'],
      pattern: /c[o�]digo\s+tributario|c[o�]digo\s+fiscal/i,
      weight: 90,
      metadata: {
        officialName: 'C�digo Tributario',
        abbreviations: ['CT'],
        hierarchyLevel: 1,
        publicationSource: 'Registro Oficial',
        relatedEntities: [],
        status: 'active',
        customMetadata: {}
      }
    },

    // Organic Laws
    {
      type: 'ORGANIC_LAW' as EntityType,
      name: 'Ley Org�nica de Garant�as Jurisdiccionales y Control Constitucional',
      normalizedName: 'LEY ORG�NICA DE GARANT�AS JURISDICCIONALES Y CONTROL CONSTITUCIONAL',
      synonyms: ['LOGJCC', 'Ley de Garant�as'],
      pattern: /ley\s+(org[a�]nica\s+de\s+)?garant[i�]as\s+jurisdiccionales|LOGJCC/i,
      weight: 85,
      metadata: {
        officialName: 'Ley Org�nica de Garant�as Jurisdiccionales y Control Constitucional',
        abbreviations: ['LOGJCC'],
        hierarchyLevel: 2,
        publicationSource: 'Registro Oficial',
        relatedEntities: [],
        status: 'active',
        customMetadata: {}
      }
    },

    {
      type: 'ORGANIC_LAW' as EntityType,
      name: 'Ley Org�nica de Servicio P�blico',
      normalizedName: 'LEY ORG�NICA DE SERVICIO P�BLICO',
      synonyms: ['LOSEP', 'Ley de Servicio P�blico'],
      pattern: /ley\s+(org[a�]nica\s+de\s+)?servicio\s+p[u�]blico|LOSEP/i,
      weight: 80,
      metadata: {
        officialName: 'Ley Org�nica de Servicio P�blico',
        abbreviations: ['LOSEP'],
        hierarchyLevel: 2,
        publicationSource: 'Registro Oficial',
        relatedEntities: [],
        status: 'active',
        customMetadata: {}
      }
    },

    // Jurisdictions
    {
      type: 'NATIONAL' as EntityType,
      name: 'Nacional',
      normalizedName: 'NACIONAL',
      synonyms: ['�mbito Nacional', 'Rep�blica del Ecuador'],
      pattern: /nacional|rep[u�]blica(\s+del\s+ecuador)?/i,
      weight: 70,
      metadata: {
        officialName: 'Nacional',
        abbreviations: [],
        hierarchyLevel: 0,
        relatedEntities: [],
        status: 'active',
        customMetadata: {}
      }
    },

    {
      type: 'PROVINCIAL' as EntityType,
      name: 'Provincial',
      normalizedName: 'PROVINCIAL',
      synonyms: ['Provincias', '�mbito Provincial'],
      pattern: /provincial|provincias?/i,
      weight: 60,
      metadata: {
        officialName: 'Provincial',
        abbreviations: [],
        hierarchyLevel: 1,
        relatedEntities: [],
        status: 'active',
        customMetadata: {}
      }
    },

    {
      type: 'MUNICIPAL' as EntityType,
      name: 'Municipal',
      normalizedName: 'MUNICIPAL',
      synonyms: ['Municipios', 'Cantones', '�mbito Municipal'],
      pattern: /municipal|municipios?|cantones?/i,
      weight: 60,
      metadata: {
        officialName: 'Municipal',
        abbreviations: [],
        hierarchyLevel: 2,
        relatedEntities: [],
        status: 'active',
        customMetadata: {}
      }
    },

    // Government Entities
    {
      type: 'MINISTRY' as EntityType,
      name: 'Ministerio del Trabajo',
      normalizedName: 'MINISTERIO DEL TRABAJO',
      synonyms: ['MDT'],
      pattern: /ministerio\s+del\s+trabajo/i,
      weight: 75,
      metadata: {
        officialName: 'Ministerio del Trabajo',
        abbreviations: ['MDT'],
        hierarchyLevel: 3,
        relatedEntities: [],
        status: 'active',
        customMetadata: {}
      }
    },

    {
      type: 'AGENCY' as EntityType,
      name: 'Servicio de Rentas Internas',
      normalizedName: 'SERVICIO DE RENTAS INTERNAS',
      synonyms: ['SRI'],
      pattern: /servicio\s+de\s+rentas\s+internas|SRI/i,
      weight: 75,
      metadata: {
        officialName: 'Servicio de Rentas Internas',
        abbreviations: ['SRI'],
        hierarchyLevel: 3,
        relatedEntities: [],
        status: 'active',
        customMetadata: {}
      }
    }
  ];

  /**
   * Initialize the dictionary with default entities and database entities
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Dictionary already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Legal Entity Dictionary');

      // Load default entities
      await this.loadDefaultEntities();

      // Load custom entities from database
      await this.loadDatabaseEntities();

      // Initialize Fuse.js for fuzzy searching
      this.initializeFuse();

      // Build pattern registry
      this.buildPatternRegistry();

      this.initialized = true;
      this.logger.info('Dictionary initialized', {
        entityCount: this.entities.size,
        patternCount: this.patterns.length
      });

    } catch (error) {
      this.logger.error('Dictionary initialization failed', { error });
      throw error;
    }
  }

  /**
   * Find entity by text with optional fuzzy matching
   *
   * @param text - Text to search for
   * @param options - Search options
   * @returns Matching entity or null
   *
   * @example
   * ```typescript
   * const entity = await dictionary.findEntity("codigo civil", {
   *   fuzzy: true,
   *   fuzzyThreshold: 0.8
   * });
   * ```
   */
  async findEntity(
    text: string,
    options: EntitySearchOptions = {}
  ): Promise<LegalEntity | null> {
    await this.ensureInitialized();

    const {
      fuzzy = true,
      fuzzyThreshold = 0.6,
      caseSensitive = false,
      entityType
    } = options;

    try {
      // Normalize text
      const normalizedText = caseSensitive
        ? text.trim()
        : text.trim().toUpperCase();

      // Try exact match first
      for (const entity of Array.from(this.entities.values())) {
        const entityName = caseSensitive
          ? entity.name
          : entity.normalizedName;

        if (entityName === normalizedText) {
          return entity;
        }

        // Check synonyms
        for (const synonym of entity.synonyms) {
          const synName = caseSensitive ? synonym : synonym.toUpperCase();
          if (synName === normalizedText) {
            return entity;
          }
        }
      }

      // Try pattern matching
      const patternMatch = await this.findByPattern(new RegExp(text, 'i'));
      if (patternMatch && patternMatch.length > 0) {
        return patternMatch[0];
      }

      // Try fuzzy matching if enabled
      if (fuzzy && this.fuse) {
        const results = this.fuse.search(text, {
          limit: 1
        });

        if (results.length > 0) {
          const match = results[0].item;

          // Filter by entity type if specified
          if (entityType && match.type !== entityType) {
            return null;
          }

          return match;
        }
      }

      return null;

    } catch (error) {
      this.logger.error('Entity search failed', { text, error });
      return null;
    }
  }

  /**
   * Find entities matching a regex pattern
   *
   * @param pattern - Regular expression pattern
   * @returns Array of matching entities
   *
   * @example
   * ```typescript
   * const entities = await dictionary.findByPattern(/ley.*laboral/i);
   * ```
   */
  async findByPattern(pattern: RegExp): Promise<LegalEntity[]> {
    await this.ensureInitialized();

    try {
      const matches: LegalEntity[] = [];

      for (const { pattern: entityPattern, entityId } of this.patterns) {
        // Test if patterns are compatible
        const testString = pattern.source;
        if (entityPattern.test(testString)) {
          const entity = this.entities.get(entityId);
          if (entity) {
            matches.push(entity);
          }
        }
      }

      return matches.sort((a, b) => b.weight - a.weight);

    } catch (error) {
      this.logger.error('Pattern search failed', { pattern, error });
      return [];
    }
  }

  /**
   * Get normalized name for an entity
   *
   * @param entity - Legal entity
   * @returns Normalized canonical name
   */
  getNormalizedName(entity: LegalEntity): string {
    return entity.normalizedName;
  }

  /**
   * Get entity metadata
   *
   * @param entityId - Entity ID
   * @returns Entity metadata or undefined
   */
  getEntityMetadata(entityId: string): EntityMetadata | undefined {
    const entity = this.entities.get(entityId);
    return entity?.metadata;
  }

  /**
   * Add custom entity to dictionary
   *
   * @param entity - Legal entity to add
   */
  async addEntity(entity: Omit<LegalEntity, 'id'>): Promise<LegalEntity> {
    await this.ensureInitialized();

    try {
      const id = this.generateEntityId(entity.name);
      const fullEntity: LegalEntity = { ...entity, id };

      this.entities.set(id, fullEntity);
      this.patterns.push({ pattern: entity.pattern, entityId: id });

      // Re-initialize Fuse with new entity
      this.initializeFuse();

      this.logger.info('Entity added', { id, name: entity.name });

      return fullEntity;

    } catch (error) {
      this.logger.error('Failed to add entity', { entity, error });
      throw error;
    }
  }

  /**
   * Get all entities of a specific type
   *
   * @param type - Entity type to filter by
   * @returns Array of entities
   */
  getEntitiesByType(type: EntityType): LegalEntity[] {
    return Array.from(this.entities.values())
      .filter(entity => entity.type === type)
      .sort((a, b) => b.weight - a.weight);
  }

  /**
   * Get all entity types present in dictionary
   *
   * @returns Array of entity types
   */
  getAvailableTypes(): EntityType[] {
    const types = new Set<EntityType>();
    for (const entity of Array.from(this.entities.values())) {
      types.add(entity.type);
    }
    return Array.from(types);
  }

  /**
   * Load default Ecuadorian entities
   */
  private async loadDefaultEntities(): Promise<void> {
    for (const entityData of this.DEFAULT_ENTITIES) {
      const id = this.generateEntityId(entityData.name!);

      const entity: LegalEntity = {
        id,
        type: entityData.type!,
        name: entityData.name!,
        normalizedName: entityData.normalizedName!,
        synonyms: entityData.synonyms || [],
        pattern: entityData.pattern!,
        metadata: entityData.metadata!,
        weight: entityData.weight || 50
      };

      this.entities.set(id, entity);
    }

    this.logger.info('Default entities loaded', {
      count: this.DEFAULT_ENTITIES.length
    });
  }

  /**
   * Load custom entities from database
   */
  private async loadDatabaseEntities(): Promise<void> {
    try {
      // Query database for custom entities
      // Implementation depends on your schema
      // This is a placeholder

      this.logger.info('Database entities loaded', { count: 0 });

    } catch (error) {
      this.logger.warn('Failed to load database entities', { error });
    }
  }

  /**
   * Initialize Fuse.js for fuzzy searching
   */
  private initializeFuse(): void {
    const entityArray = Array.from(this.entities.values());

    this.fuse = new Fuse(entityArray, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'normalizedName', weight: 2 },
        { name: 'synonyms', weight: 1.5 }
      ],
      threshold: 0.4,
      distance: 100,
      includeScore: true
    });

    this.logger.debug('Fuse.js initialized', {
      entityCount: entityArray.length
    });
  }

  /**
   * Build pattern registry for quick matching
   */
  private buildPatternRegistry(): void {
    this.patterns = [];

    for (const [entityId, entity] of Array.from(this.entities.entries())) {
      this.patterns.push({
        pattern: entity.pattern,
        entityId
      });
    }

    this.logger.debug('Pattern registry built', {
      patternCount: this.patterns.length
    });
  }

  /**
   * Generate unique entity ID
   */
  private generateEntityId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Ensure dictionary is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Search entities by text with fuzzy matching
   * Returns multiple matching entities for autocomplete
   *
   * @param query - Search query
   * @param limit - Maximum number of results (default: 10)
   * @returns Array of matching entities
   *
   * @example
   * ```typescript
   * const results = await dictionary.searchEntities("codigo", 5);
   * console.log(results.map(e => e.name));
   * // ["Código Civil", "Código Orgánico Integral Penal", ...]
   * ```
   */
  async searchEntities(
    query: string,
    options?: {
      fuzzy?: boolean;
      fuzzyThreshold?: number;
      maxResults?: number;
      entityType?: EntityType;
      caseSensitive?: boolean;
    }
  ): Promise<LegalEntity[]> {
    const limit = options?.maxResults || 10;
    await this.ensureInitialized();

    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      const normalizedQuery = query.trim().toUpperCase();
      const results: Array<{ entity: LegalEntity; score: number }> = [];

      // Exact matches get highest score
      for (const entity of Array.from(this.entities.values())) {
        // Filter by entity type if specified
        if (options?.entityType && entity.type !== options.entityType) {
          continue;
        }

        if (entity.normalizedName === normalizedQuery) {
          results.push({ entity, score: 100 });
          continue;
        }

        // Check synonyms
        for (const synonym of entity.synonyms) {
          if (synonym.toUpperCase() === normalizedQuery) {
            results.push({ entity, score: 95 });
            break;
          }
        }

        // Prefix matches
        if (entity.normalizedName.startsWith(normalizedQuery)) {
          results.push({ entity, score: 80 });
        }

        // Contains matches
        if (entity.normalizedName.includes(normalizedQuery)) {
          results.push({ entity, score: 60 });
        }
      }

      // Fuzzy search if not enough results
      if (results.length < limit && this.fuse) {
        const fuseResults = this.fuse.search(query, {
          limit: limit * 2
        });

        for (const result of fuseResults) {
          // Avoid duplicates
          if (!results.some(r => r.entity.id === result.item.id)) {
            const score = result.score ? (1 - result.score) * 50 : 50;
            results.push({ entity: result.item, score });
          }
        }
      }

      // Sort by score and return top results
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(r => r.entity);

    } catch (error) {
      this.logger.error('Entity search failed', { query, error });
      return [];
    }
  }

  /**
   * Get entity by ID
   *
   * @param id - Entity ID
   * @returns Entity or null if not found
   *
   * @example
   * ```typescript
   * const entity = await dictionary.getEntityById("codigo_civil");
   * console.log(entity?.name); // "Código Civil"
   * ```
   */
  async getEntityById(id: string): Promise<LegalEntity | null> {
    await this.ensureInitialized();

    const entity = this.entities.get(id);
    return entity || null;
  }

  /**
   * Get total entity count
   *
   * @returns Number of entities in dictionary
   */
  getEntityCount(): number {
    return this.entities.size;
  }
}
