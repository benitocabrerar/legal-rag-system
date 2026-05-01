# Week 2 Query Transformation Architecture
## Phase 10: AI-Powered Legal Assistant

**Document Version:** 1.0
**Date:** January 13, 2025
**Status:** Ready for Implementation
**Duration:** Days 8-14 (7 days)

---

## Executive Summary

Week 2 builds upon Week 1's NLP Query Understanding (intent classification + entity extraction) to create a complete Natural Language → Structured Search transformation pipeline. This week focuses on transforming user queries into executable search filters compatible with the existing Phase 9 Advanced Search Engine.

**Key Deliverables:**
- Query-to-filter transformation service
- Ecuadorian legal entity dictionary
- Legal context prompt builder
- Integration with Advanced Search Engine
- Performance-optimized pipeline (<2 second response)

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Service Architecture](#2-service-architecture)
3. [Data Structures](#3-data-structures)
4. [Integration Strategy](#4-integration-strategy)
5. [Performance Optimization](#5-performance-optimization)
6. [API Endpoints](#6-api-endpoints)
7. [Implementation Timeline](#7-implementation-timeline)
8. [Testing Strategy](#8-testing-strategy)

---

## 1. System Architecture Overview

### 1.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Week 2 Architecture Flow                      │
└─────────────────────────────────────────────────────────────────┘

User Natural Language Query
         │
         ▼
┌────────────────────────────┐
│   Week 1: QueryProcessor   │  (Already Implemented)
│   - Intent Classification  │
│   - Entity Extraction      │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ QueryTransformationService │  ◄─── Week 2 Main Orchestrator
└────────────────────────────┘
         │
         ├─────────────────────────────┐
         │                             │
         ▼                             ▼
┌─────────────────────┐     ┌──────────────────────┐
│ LegalEntityDictionary│     │ ContextPromptBuilder │
│ - Validate entities  │     │ - Ecuadorian context │
│ - Expand acronyms   │     │ - Legal hierarchy    │
│ - Map to taxonomy   │     │ - Jurisdiction rules │
└─────────────────────┘     └──────────────────────┘
         │                             │
         └─────────────┬───────────────┘
                       ▼
              ┌─────────────────┐
              │   FilterBuilder  │
              │ - Convert to     │
              │   SearchFilters  │
              └─────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Phase 9 Engine  │
              │ AdvancedSearch   │
              └─────────────────┘
                       │
                       ▼
                 Search Results
```

### 1.2 Component Responsibilities

| Component | Responsibility | Input | Output |
|-----------|---------------|-------|--------|
| **QueryProcessor** (Week 1) | Intent + entity extraction | Raw query | ProcessedQuery |
| **QueryTransformationService** | Orchestrate transformation | ProcessedQuery | TransformedQuery |
| **LegalEntityDictionary** | Validate/expand legal entities | Entity names | Validated entities |
| **FilterBuilder** | Convert to SearchFilters | Entities + context | SearchFilters |
| **ContextPromptBuilder** | Build legal context | Query + entities | Context prompts |
| **AdvancedSearchEngine** (Phase 9) | Execute search | SearchFilters | SearchResults |

---

## 2. Service Architecture

### 2.1 QueryTransformationService

**Primary orchestrator for query transformation pipeline.**

```typescript
// src/services/nlp/query-transformation-service.ts

import { queryProcessor, ProcessedQuery } from './query-processor';
import { legalEntityDictionary } from './legal-entity-dictionary';
import { filterBuilder } from './filter-builder';
import { contextPromptBuilder } from './context-prompt-builder';
import { advancedSearchEngine, SearchFilters } from '../search/advanced-search-engine';

interface TransformedQuery {
  // Original data
  original: string;
  processed: ProcessedQuery;

  // Transformation results
  validatedEntities: ValidatedEntities;
  searchFilters: SearchFilters;
  legalContext: LegalContext;

  // Metadata
  transformationTimeMs: number;
  confidence: number;
  warnings: string[];
}

interface ValidatedEntities {
  laws: LegalEntity[];
  articles: ArticleReference[];
  keywords: string[];
  dates?: DateRange;
  jurisdictions: string[];
  normTypes: string[];
}

interface LegalContext {
  hierarchy: string;
  jurisdiction: string;
  relevantCodes: string[];
  contextualPrompts: string[];
}

export class QueryTransformationService {
  /**
   * Main transformation method
   * Converts natural language query to structured search filters
   */
  async transformQuery(query: string): Promise<TransformedQuery> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Step 1: Process query with Week 1 QueryProcessor
      const processed = await queryProcessor.processQuery(query);

      // Step 2: Validate and expand entities using dictionary
      const validatedEntities = await legalEntityDictionary.validateEntities({
        laws: processed.intent.entities.laws,
        articles: processed.intent.entities.articles,
        keywords: processed.intent.entities.keywords,
        jurisdictions: processed.intent.entities.jurisdictions,
        dates: processed.intent.entities.dates
      });

      // Add warnings for unrecognized entities
      if (validatedEntities.unrecognizedLaws.length > 0) {
        warnings.push(
          `Leyes no reconocidas: ${validatedEntities.unrecognizedLaws.join(', ')}`
        );
      }

      // Step 3: Build legal context
      const legalContext = contextPromptBuilder.buildContext({
        intent: processed.intent.type,
        entities: validatedEntities,
        jurisdiction: this.determineJurisdiction(validatedEntities)
      });

      // Step 4: Build search filters
      const searchFilters = filterBuilder.buildFilters({
        validatedEntities,
        legalContext,
        intentType: processed.intent.type
      });

      // Step 5: Calculate confidence score
      const confidence = this.calculateConfidence(
        processed,
        validatedEntities,
        warnings
      );

      const transformationTimeMs = Date.now() - startTime;

      return {
        original: query,
        processed,
        validatedEntities,
        searchFilters,
        legalContext,
        transformationTimeMs,
        confidence,
        warnings
      };
    } catch (error) {
      console.error('Query transformation error:', error);
      throw new Error(`Failed to transform query: ${error.message}`);
    }
  }

  /**
   * Transform and execute search in one call
   */
  async transformAndSearch(query: string, userId?: string) {
    // Transform query
    const transformed = await this.transformQuery(query);

    // Check confidence threshold
    if (transformed.confidence < 0.5) {
      return {
        transformed,
        results: null,
        error: 'Query confidence too low. Please try rephrasing your question.',
        suggestions: this.generateSuggestions(transformed)
      };
    }

    // Execute search using Phase 9 engine
    const searchResults = await advancedSearchEngine.search({
      query: transformed.processed.searchTerms.join(' '),
      filters: transformed.searchFilters,
      userId,
      enableSpellCheck: false, // Already processed
      enableQueryExpansion: true,
      enableReranking: true
    });

    return {
      transformed,
      results: searchResults,
      error: null
    };
  }

  /**
   * Determine primary jurisdiction from entities
   */
  private determineJurisdiction(entities: ValidatedEntities): string {
    if (entities.jurisdictions.length > 0) {
      return entities.jurisdictions[0];
    }

    // Default to national jurisdiction for Ecuador
    return 'NACIONAL';
  }

  /**
   * Calculate confidence score for transformation
   */
  private calculateConfidence(
    processed: ProcessedQuery,
    validated: ValidatedEntities,
    warnings: string[]
  ): number {
    let confidence = processed.intent.confidence;

    // Reduce confidence for unrecognized entities
    if (validated.unrecognizedLaws?.length > 0) {
      confidence *= 0.8;
    }

    // Reduce confidence for warnings
    confidence *= Math.max(0.5, 1 - (warnings.length * 0.1));

    // Boost confidence for specific entity matches
    if (validated.laws.length > 0) {
      confidence = Math.min(1.0, confidence * 1.1);
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate suggestions for low confidence queries
   */
  private generateSuggestions(transformed: TransformedQuery): string[] {
    const suggestions: string[] = [];

    if (transformed.validatedEntities.laws.length === 0) {
      suggestions.push('Intenta especificar una ley o código específico (ej: COIP, Constitución)');
    }

    if (transformed.processed.intent.type === 'unknown') {
      suggestions.push('Reformula tu pregunta usando verbos como "buscar", "encontrar", "comparar"');
    }

    if (transformed.warnings.length > 0) {
      suggestions.push('Verifica la ortografía de las leyes mencionadas');
    }

    return suggestions;
  }
}

export const queryTransformationService = new QueryTransformationService();
```

### 2.2 LegalEntityDictionary

**Comprehensive dictionary of Ecuadorian legal entities with validation and expansion.**

```typescript
// src/services/nlp/legal-entity-dictionary.ts

interface LegalEntity {
  id: string;
  name: string;
  fullName: string;
  acronym?: string;
  type: LegalEntityType;
  hierarchy: string;
  jurisdiction: string;
  aliases: string[];
  enactmentDate?: Date;
  lastReformDate?: Date;
  isActive: boolean;
}

type LegalEntityType =
  | 'CONSTITUTION'
  | 'ORGANIC_CODE'
  | 'ORGANIC_LAW'
  | 'ORDINARY_LAW'
  | 'REGULATION'
  | 'ORDINANCE'
  | 'RESOLUTION'
  | 'INTERNATIONAL_TREATY'
  | 'JUDICIAL_PRECEDENT';

interface ArticleReference {
  lawId: string;
  articleNumber: string;
  articleRange?: { start: string; end: string };
  isValid: boolean;
}

interface EntityValidationResult {
  laws: LegalEntity[];
  articles: ArticleReference[];
  keywords: string[];
  normTypes: string[];
  jurisdictions: string[];
  unrecognizedLaws: string[];
  expandedAcronyms: Map<string, string>;
}

export class LegalEntityDictionary {
  private entities: Map<string, LegalEntity>;
  private acronymIndex: Map<string, string>; // acronym -> entity id
  private aliasIndex: Map<string, string>; // alias -> entity id
  private cache: Map<string, EntityValidationResult>;

  constructor() {
    this.entities = new Map();
    this.acronymIndex = new Map();
    this.aliasIndex = new Map();
    this.cache = new Map();

    this.initializeDictionary();
  }

  /**
   * Initialize with Ecuadorian legal entities
   */
  private initializeDictionary(): void {
    const ecuadorianLaws: LegalEntity[] = [
      // Constitution
      {
        id: 'const_ec_2008',
        name: 'Constitución',
        fullName: 'Constitución de la República del Ecuador',
        type: 'CONSTITUTION',
        hierarchy: 'CONSTITUCION',
        jurisdiction: 'NACIONAL',
        aliases: ['constitución', 'carta magna', 'norma fundamental', 'constitucion'],
        enactmentDate: new Date('2008-10-20'),
        isActive: true
      },

      // Organic Codes
      {
        id: 'coip',
        name: 'COIP',
        fullName: 'Código Orgánico Integral Penal',
        acronym: 'COIP',
        type: 'ORGANIC_CODE',
        hierarchy: 'CODIGOS_ORGANICOS',
        jurisdiction: 'NACIONAL',
        aliases: ['coip', 'código penal', 'codigo penal', 'código integral penal'],
        enactmentDate: new Date('2014-02-10'),
        lastReformDate: new Date('2023-02-14'),
        isActive: true
      },
      {
        id: 'cogep',
        name: 'COGEP',
        fullName: 'Código Orgánico General de Procesos',
        acronym: 'COGEP',
        type: 'ORGANIC_CODE',
        hierarchy: 'CODIGOS_ORGANICOS',
        jurisdiction: 'NACIONAL',
        aliases: ['cogep', 'código procesal', 'codigo procesal'],
        enactmentDate: new Date('2015-05-22'),
        isActive: true
      },
      {
        id: 'cootad',
        name: 'COOTAD',
        fullName: 'Código Orgánico de Organización Territorial, Autonomía y Descentralización',
        acronym: 'COOTAD',
        type: 'ORGANIC_CODE',
        hierarchy: 'CODIGOS_ORGANICOS',
        jurisdiction: 'NACIONAL',
        aliases: ['cootad', 'código territorial', 'codigo territorial'],
        enactmentDate: new Date('2010-10-19'),
        isActive: true
      },
      {
        id: 'cot',
        name: 'COT',
        fullName: 'Código Orgánico Tributario',
        acronym: 'COT',
        type: 'ORGANIC_CODE',
        hierarchy: 'CODIGOS_ORGANICOS',
        jurisdiction: 'NACIONAL',
        aliases: ['cot', 'código tributario', 'codigo tributario'],
        enactmentDate: new Date('2005-12-14'),
        lastReformDate: new Date('2022-11-29'),
        isActive: true
      },
      {
        id: 'cootad',
        name: 'COOTAD',
        fullName: 'Código Orgánico de Organización Territorial',
        acronym: 'COOTAD',
        type: 'ORGANIC_CODE',
        hierarchy: 'CODIGOS_ORGANICOS',
        jurisdiction: 'NACIONAL',
        aliases: ['cootad'],
        isActive: true
      },

      // Ordinary Codes
      {
        id: 'codigo_civil',
        name: 'Código Civil',
        fullName: 'Código Civil del Ecuador',
        type: 'ORGANIC_CODE',
        hierarchy: 'CODIGOS_ORDINARIOS',
        jurisdiction: 'NACIONAL',
        aliases: ['código civil', 'codigo civil', 'cc'],
        isActive: true
      },
      {
        id: 'codigo_comercio',
        name: 'Código de Comercio',
        fullName: 'Código de Comercio del Ecuador',
        type: 'ORGANIC_CODE',
        hierarchy: 'CODIGOS_ORDINARIOS',
        jurisdiction: 'NACIONAL',
        aliases: ['código de comercio', 'codigo de comercio'],
        isActive: true
      },
      {
        id: 'codigo_trabajo',
        name: 'Código del Trabajo',
        fullName: 'Código del Trabajo del Ecuador',
        type: 'ORGANIC_CODE',
        hierarchy: 'CODIGOS_ORDINARIOS',
        jurisdiction: 'NACIONAL',
        aliases: ['código del trabajo', 'codigo del trabajo', 'código laboral', 'codigo laboral'],
        isActive: true
      },

      // Organic Laws
      {
        id: 'losep',
        name: 'LOSEP',
        fullName: 'Ley Orgánica del Servicio Público',
        acronym: 'LOSEP',
        type: 'ORGANIC_LAW',
        hierarchy: 'LEYES_ORGANICAS',
        jurisdiction: 'NACIONAL',
        aliases: ['losep', 'ley servicio público', 'ley servicio publico'],
        enactmentDate: new Date('2010-10-06'),
        isActive: true
      },
      {
        id: 'logjcc',
        name: 'LOGJCC',
        fullName: 'Ley Orgánica de Garantías Jurisdiccionales y Control Constitucional',
        acronym: 'LOGJCC',
        type: 'ORGANIC_LAW',
        hierarchy: 'LEYES_ORGANICAS',
        jurisdiction: 'NACIONAL',
        aliases: ['logjcc', 'ley garantías jurisdiccionales'],
        enactmentDate: new Date('2009-09-21'),
        isActive: true
      },
      {
        id: 'lopc',
        name: 'LOPC',
        fullName: 'Ley Orgánica de Participación Ciudadana',
        acronym: 'LOPC',
        type: 'ORGANIC_LAW',
        hierarchy: 'LEYES_ORGANICAS',
        jurisdiction: 'NACIONAL',
        aliases: ['lopc', 'ley participación ciudadana', 'ley participacion ciudadana'],
        isActive: true
      },

      // Important Ordinary Laws
      {
        id: 'ley_seguridad_social',
        name: 'Ley de Seguridad Social',
        fullName: 'Ley de Seguridad Social del Ecuador',
        type: 'ORDINARY_LAW',
        hierarchy: 'LEYES_ORDINARIAS',
        jurisdiction: 'NACIONAL',
        aliases: ['ley seguridad social', 'lss'],
        isActive: true
      },
      {
        id: 'ley_proteccion_datos',
        name: 'Ley de Protección de Datos',
        fullName: 'Ley Orgánica de Protección de Datos Personales',
        type: 'ORGANIC_LAW',
        hierarchy: 'LEYES_ORGANICAS',
        jurisdiction: 'NACIONAL',
        aliases: ['ley protección datos', 'ley proteccion datos', 'lopd'],
        enactmentDate: new Date('2021-05-26'),
        isActive: true
      },

      // Key Institutions
      {
        id: 'sri',
        name: 'SRI',
        fullName: 'Servicio de Rentas Internas',
        acronym: 'SRI',
        type: 'REGULATION',
        hierarchy: 'REGLAMENTOS',
        jurisdiction: 'NACIONAL',
        aliases: ['sri', 'servicio rentas internas', 'rentas internas'],
        isActive: true
      },
      {
        id: 'iess',
        name: 'IESS',
        fullName: 'Instituto Ecuatoriano de Seguridad Social',
        acronym: 'IESS',
        type: 'REGULATION',
        hierarchy: 'REGLAMENTOS',
        jurisdiction: 'NACIONAL',
        aliases: ['iess', 'instituto seguridad social', 'seguro social'],
        isActive: true
      }
    ];

    // Index all entities
    for (const entity of ecuadorianLaws) {
      this.entities.set(entity.id, entity);

      // Index acronyms
      if (entity.acronym) {
        this.acronymIndex.set(entity.acronym.toLowerCase(), entity.id);
      }

      // Index aliases
      for (const alias of entity.aliases) {
        this.aliasIndex.set(alias.toLowerCase(), entity.id);
      }
    }
  }

  /**
   * Validate and expand entities from query
   */
  async validateEntities(input: {
    laws: string[];
    articles: string[];
    keywords: string[];
    jurisdictions?: string[];
    dates?: { start?: string; end?: string };
  }): Promise<EntityValidationResult> {
    const cacheKey = JSON.stringify(input);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const result: EntityValidationResult = {
      laws: [],
      articles: [],
      keywords: input.keywords,
      normTypes: [],
      jurisdictions: input.jurisdictions || ['NACIONAL'],
      unrecognizedLaws: [],
      expandedAcronyms: new Map()
    };

    // Validate and expand laws
    for (const lawName of input.laws) {
      const normalized = lawName.toLowerCase().trim();

      // Try direct match
      let entityId = this.aliasIndex.get(normalized);

      // Try acronym match
      if (!entityId) {
        entityId = this.acronymIndex.get(normalized);
      }

      if (entityId) {
        const entity = this.entities.get(entityId)!;
        result.laws.push(entity);
        result.normTypes.push(entity.type);

        // Track acronym expansion
        if (entity.acronym && normalized === entity.acronym.toLowerCase()) {
          result.expandedAcronyms.set(entity.acronym, entity.fullName);
        }
      } else {
        result.unrecognizedLaws.push(lawName);
      }
    }

    // Validate articles
    for (const article of input.articles) {
      // Extract article number
      const match = article.match(/art(?:ículo)?\.?\s*(\d+)/i);
      if (match) {
        result.articles.push({
          lawId: result.laws[0]?.id || 'unknown',
          articleNumber: match[1],
          isValid: true
        });
      }
    }

    // Cache result
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): LegalEntity | undefined {
    return this.entities.get(id);
  }

  /**
   * Search entities by partial name
   */
  searchEntities(query: string, limit: number = 10): LegalEntity[] {
    const normalized = query.toLowerCase();
    const matches: LegalEntity[] = [];

    for (const entity of this.entities.values()) {
      if (
        entity.name.toLowerCase().includes(normalized) ||
        entity.fullName.toLowerCase().includes(normalized) ||
        entity.aliases.some(alias => alias.includes(normalized))
      ) {
        matches.push(entity);
        if (matches.length >= limit) break;
      }
    }

    return matches;
  }

  /**
   * Get all entities of a specific type
   */
  getEntitiesByType(type: LegalEntityType): LegalEntity[] {
    return Array.from(this.entities.values()).filter(e => e.type === type);
  }

  /**
   * Get legal hierarchy for entity
   */
  getHierarchy(entityId: string): string {
    const entity = this.entities.get(entityId);
    return entity?.hierarchy || 'UNKNOWN';
  }
}

export const legalEntityDictionary = new LegalEntityDictionary();
```

### 2.3 FilterBuilder

**Converts validated entities to Phase 9 SearchFilters.**

```typescript
// src/services/nlp/filter-builder.ts

import { SearchFilters } from '../search/advanced-search-engine';
import { ValidatedEntities, LegalContext } from './query-transformation-service';

interface FilterBuildInput {
  validatedEntities: ValidatedEntities;
  legalContext: LegalContext;
  intentType: string;
}

export class FilterBuilder {
  /**
   * Build SearchFilters from validated entities
   */
  buildFilters(input: FilterBuildInput): SearchFilters {
    const filters: SearchFilters = {};

    // Legal hierarchy filter
    if (input.validatedEntities.laws.length > 0) {
      filters.legalHierarchy = input.validatedEntities.laws
        .map(law => law.hierarchy)
        .filter((v, i, a) => a.indexOf(v) === i); // unique
    }

    // Jurisdiction filter
    if (input.validatedEntities.jurisdictions.length > 0) {
      filters.jurisdiction = input.validatedEntities.jurisdictions;
    }

    // Norm type filter
    if (input.validatedEntities.normTypes.length > 0) {
      filters.normType = input.validatedEntities.laws
        .map(law => law.name.toUpperCase())
        .filter((v, i, a) => a.indexOf(v) === i);
    }

    // Date range filter
    if (input.validatedEntities.dates) {
      const { start, end } = input.validatedEntities.dates;

      if (start) {
        filters.publicationDateFrom = new Date(start);
      }

      if (end) {
        filters.publicationDateTo = new Date(end);
      }
    }

    // Intent-specific filters
    this.applyIntentFilters(filters, input.intentType);

    return filters;
  }

  /**
   * Apply filters based on query intent
   */
  private applyIntentFilters(filters: SearchFilters, intentType: string): void {
    switch (intentType) {
      case 'question':
        // For questions, prioritize authoritative sources
        filters.minPageRank = 0.3;
        break;

      case 'comparison':
        // For comparisons, no minimum citation requirement
        break;

      case 'analysis':
        // For analysis, prefer comprehensive documents
        filters.minPageRank = 0.2;
        break;

      case 'recommendation':
        // For recommendations, prioritize recent documents
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        filters.publicationDateFrom = sixMonthsAgo;
        break;
    }
  }

  /**
   * Add article-specific filters
   */
  addArticleFilter(
    filters: SearchFilters,
    articleRefs: Array<{ lawId: string; articleNumber: string }>
  ): void {
    // Article search will be handled by content search
    // This is a marker for the search engine
    (filters as any).articleSearch = true;
    (filters as any).articleRefs = articleRefs;
  }
}

export const filterBuilder = new FilterBuilder();
```

### 2.4 ContextPromptBuilder

**Builds Ecuadorian legal context for LLM prompts.**

```typescript
// src/services/nlp/context-prompt-builder.ts

import { ValidatedEntities } from './query-transformation-service';

interface ContextBuildInput {
  intent: string;
  entities: ValidatedEntities;
  jurisdiction: string;
}

interface LegalContext {
  hierarchy: string;
  jurisdiction: string;
  relevantCodes: string[];
  contextualPrompts: string[];
}

export class ContextPromptBuilder {
  /**
   * Build legal context for query
   */
  buildContext(input: ContextBuildInput): LegalContext {
    const context: LegalContext = {
      hierarchy: this.determineHierarchy(input.entities),
      jurisdiction: input.jurisdiction,
      relevantCodes: this.getRelevantCodes(input.entities),
      contextualPrompts: []
    };

    // Build contextual prompts based on intent
    context.contextualPrompts = this.buildContextualPrompts(input);

    return context;
  }

  /**
   * Determine legal hierarchy from entities
   */
  private determineHierarchy(entities: ValidatedEntities): string {
    const hierarchies = entities.laws.map(law => law.hierarchy);

    // Return highest hierarchy (Constitution > Laws > Codes > Regulations)
    const hierarchyOrder = [
      'CONSTITUCION',
      'TRATADOS_INTERNACIONALES_DDHH',
      'LEYES_ORGANICAS',
      'CODIGOS_ORGANICOS',
      'LEYES_ORDINARIAS',
      'CODIGOS_ORDINARIOS',
      'REGLAMENTOS',
      'ORDENANZAS',
      'RESOLUCIONES'
    ];

    for (const hierarchy of hierarchyOrder) {
      if (hierarchies.includes(hierarchy)) {
        return hierarchy;
      }
    }

    return 'LEYES_ORDINARIAS';
  }

  /**
   * Get relevant legal codes for context
   */
  private getRelevantCodes(entities: ValidatedEntities): string[] {
    return entities.laws
      .filter(law => law.type === 'ORGANIC_CODE' || law.type === 'ORGANIC_LAW')
      .map(law => law.acronym || law.name);
  }

  /**
   * Build contextual prompts for LLM
   */
  private buildContextualPrompts(input: ContextBuildInput): string[] {
    const prompts: string[] = [];

    // Base context for Ecuador
    prompts.push(`Contexto legal: Derecho ecuatoriano (${input.jurisdiction})`);

    // Hierarchy context
    const hierarchyName = this.getHierarchyName(input.entities);
    if (hierarchyName) {
      prompts.push(`Jerarquía normativa: ${hierarchyName}`);
    }

    // Specific code context
    if (input.entities.laws.length > 0) {
      const lawNames = input.entities.laws.map(law => law.fullName).join(', ');
      prompts.push(`Normativas relevantes: ${lawNames}`);
    }

    // Intent-specific context
    const intentPrompt = this.getIntentPrompt(input.intent);
    if (intentPrompt) {
      prompts.push(intentPrompt);
    }

    // Jurisdiction-specific notes
    if (input.jurisdiction === 'PROVINCIAL' || input.jurisdiction === 'MUNICIPAL') {
      prompts.push('Nota: Considerar autonomías y competencias descentralizadas (COOTAD)');
    }

    return prompts;
  }

  /**
   * Get human-readable hierarchy name
   */
  private getHierarchyName(entities: ValidatedEntities): string | null {
    const hierarchyNames: Record<string, string> = {
      'CONSTITUCION': 'Constitución de la República',
      'TRATADOS_INTERNACIONALES_DDHH': 'Tratados Internacionales de DDHH',
      'LEYES_ORGANICAS': 'Leyes Orgánicas',
      'CODIGOS_ORGANICOS': 'Códigos Orgánicos',
      'LEYES_ORDINARIAS': 'Leyes Ordinarias',
      'CODIGOS_ORDINARIOS': 'Códigos Ordinarios',
      'REGLAMENTOS': 'Reglamentos',
      'ORDENANZAS': 'Ordenanzas',
      'RESOLUCIONES': 'Resoluciones'
    };

    const hierarchy = this.determineHierarchy(entities);
    return hierarchyNames[hierarchy] || null;
  }

  /**
   * Get intent-specific prompt
   */
  private getIntentPrompt(intent: string): string | null {
    const intentPrompts: Record<string, string> = {
      'question': 'Proporcionar respuesta fundamentada en normativa vigente',
      'comparison': 'Análisis comparativo entre normativas señaladas',
      'analysis': 'Análisis jurídico detallado del tema consultado',
      'recommendation': 'Sugerencia basada en mejores prácticas y jurisprudencia',
      'search': 'Búsqueda exhaustiva en corpus normativo'
    };

    return intentPrompts[intent] || null;
  }

  /**
   * Build system prompt for AI assistant
   */
  buildSystemPrompt(context: LegalContext): string {
    return `Eres un asistente legal experto en derecho ecuatoriano.

${context.contextualPrompts.join('\n')}

Principios a seguir:
1. Citar SIEMPRE las fuentes legales específicas
2. Respetar la jerarquía normativa establecida
3. Considerar la jurisprudencia constitucional relevante
4. Explicar conceptos en lenguaje claro cuando sea necesario
5. Indicar cuando se requiera asesoría legal personalizada

IMPORTANTE: Toda respuesta debe estar fundamentada en el ordenamiento jurídico ecuatoriano vigente.`;
  }
}

export const contextPromptBuilder = new ContextPromptBuilder();
```

---

## 3. Data Structures

### 3.1 Core Interfaces

```typescript
// src/types/query-transformation.types.ts

export interface TransformedQuery {
  original: string;
  processed: ProcessedQuery;
  validatedEntities: ValidatedEntities;
  searchFilters: SearchFilters;
  legalContext: LegalContext;
  transformationTimeMs: number;
  confidence: number;
  warnings: string[];
}

export interface ValidatedEntities {
  laws: LegalEntity[];
  articles: ArticleReference[];
  keywords: string[];
  normTypes: string[];
  jurisdictions: string[];
  unrecognizedLaws: string[];
  expandedAcronyms: Map<string, string>;
}

export interface LegalEntity {
  id: string;
  name: string;
  fullName: string;
  acronym?: string;
  type: LegalEntityType;
  hierarchy: string;
  jurisdiction: string;
  aliases: string[];
  enactmentDate?: Date;
  lastReformDate?: Date;
  isActive: boolean;
}

export type LegalEntityType =
  | 'CONSTITUTION'
  | 'ORGANIC_CODE'
  | 'ORGANIC_LAW'
  | 'ORDINARY_LAW'
  | 'REGULATION'
  | 'ORDINANCE'
  | 'RESOLUTION'
  | 'INTERNATIONAL_TREATY'
  | 'JUDICIAL_PRECEDENT';

export interface ArticleReference {
  lawId: string;
  articleNumber: string;
  articleRange?: { start: string; end: string };
  isValid: boolean;
}

export interface LegalContext {
  hierarchy: string;
  jurisdiction: string;
  relevantCodes: string[];
  contextualPrompts: string[];
}

export interface DateRange {
  start?: string;
  end?: string;
}
```

### 3.2 Legal Entity Taxonomy

```typescript
// Ecuadorian Legal Hierarchy (Pyramid of Kelsen adapted for Ecuador)

const LEGAL_HIERARCHY = {
  // Level 1: Supreme Law
  CONSTITUCION: {
    level: 1,
    name: 'Constitución de la República',
    description: 'Norma suprema del ordenamiento jurídico'
  },

  // Level 2: International Human Rights Treaties
  TRATADOS_INTERNACIONALES_DDHH: {
    level: 2,
    name: 'Tratados Internacionales de Derechos Humanos',
    description: 'Prevalecen sobre cualquier otra norma jurídica'
  },

  // Level 3: Organic Laws and Codes
  LEYES_ORGANICAS: {
    level: 3,
    name: 'Leyes Orgánicas',
    description: 'Regulan organización y funcionamiento de instituciones'
  },
  CODIGOS_ORGANICOS: {
    level: 3,
    name: 'Códigos Orgánicos',
    description: 'Compilaciones sistemáticas de leyes orgánicas'
  },

  // Level 4: Ordinary Laws and Codes
  LEYES_ORDINARIAS: {
    level: 4,
    name: 'Leyes Ordinarias',
    description: 'Normas generales de aplicación'
  },
  CODIGOS_ORDINARIOS: {
    level: 4,
    name: 'Códigos Ordinarios',
    description: 'Compilaciones de leyes ordinarias'
  },

  // Level 5: Regulations
  REGLAMENTOS: {
    level: 5,
    name: 'Reglamentos',
    description: 'Normas ejecutivas y reglamentarias'
  },

  // Level 6: Local Ordinances
  ORDENANZAS: {
    level: 6,
    name: 'Ordenanzas',
    description: 'Normas de gobiernos autónomos descentralizados'
  },

  // Level 7: Resolutions
  RESOLUCIONES: {
    level: 7,
    name: 'Resoluciones',
    description: 'Actos administrativos específicos'
  },

  ACUERDOS_ADMINISTRATIVOS: {
    level: 7,
    name: 'Acuerdos Administrativos',
    description: 'Decisiones de autoridades administrativas'
  }
};

export { LEGAL_HIERARCHY };
```

---

## 4. Integration Strategy

### 4.1 Integration with Phase 9 Advanced Search

```typescript
// Integration flow with existing AdvancedSearchEngine

import { advancedSearchEngine } from '../search/advanced-search-engine';
import { queryTransformationService } from './query-transformation-service';

/**
 * Enhanced search endpoint using query transformation
 */
export async function enhancedNaturalLanguageSearch(
  naturalLanguageQuery: string,
  userId?: string
) {
  // Step 1: Transform NL query to structured search
  const transformed = await queryTransformationService.transformQuery(
    naturalLanguageQuery
  );

  // Step 2: Check confidence threshold
  if (transformed.confidence < 0.5) {
    return {
      success: false,
      error: 'Query confidence too low',
      confidence: transformed.confidence,
      warnings: transformed.warnings,
      suggestions: [
        'Intenta ser más específico sobre la ley o tema',
        'Menciona códigos específicos (COIP, COGEP, Constitución)',
        'Usa verbos de acción (buscar, encontrar, comparar)'
      ]
    };
  }

  // Step 3: Execute search using Phase 9 engine
  const searchResults = await advancedSearchEngine.search({
    query: transformed.processed.searchTerms.join(' '),
    filters: transformed.searchFilters,
    userId,
    enableSpellCheck: false, // Already processed
    enableQueryExpansion: true,
    enableReranking: true,
    sortBy: 'relevance'
  });

  // Step 4: Enhance results with transformation metadata
  return {
    success: true,
    query: {
      original: naturalLanguageQuery,
      normalized: transformed.processed.normalized,
      intent: transformed.processed.intent.type,
      confidence: transformed.confidence
    },
    entities: {
      laws: transformed.validatedEntities.laws.map(l => l.fullName),
      articles: transformed.validatedEntities.articles,
      expandedAcronyms: Object.fromEntries(transformed.validatedEntities.expandedAcronyms)
    },
    context: transformed.legalContext,
    results: searchResults.documents,
    totalCount: searchResults.totalCount,
    performance: {
      transformationTimeMs: transformed.transformationTimeMs,
      searchTimeMs: searchResults.performance.searchMs,
      totalTimeMs: transformed.transformationTimeMs + searchResults.performance.totalTimeMs
    },
    warnings: transformed.warnings
  };
}
```

### 4.2 Week 1 QueryProcessor Integration

**Week 1 Output → Week 2 Input mapping:**

```typescript
// Week 1 ProcessedQuery structure (from query-processor.ts)
interface ProcessedQuery {
  original: string;
  normalized: string;
  intent: QueryIntent;
  searchTerms: string[];
  filters: {
    documentType?: string[];
    jurisdiction?: string[];
    dateRange?: { start: Date; end: Date };
  };
  processingTimeMs: number;
}

// Week 2 uses Week 1 output directly:
const processed = await queryProcessor.processQuery(query); // Week 1
const validated = await legalEntityDictionary.validateEntities({
  laws: processed.intent.entities.laws,
  articles: processed.intent.entities.articles,
  keywords: processed.intent.entities.keywords,
  jurisdictions: processed.intent.entities.jurisdictions,
  dates: processed.intent.entities.dates
}); // Week 2
```

**No modifications needed to Week 1 code** - Week 2 consumes Week 1 output as-is.

---

## 5. Performance Optimization

### 5.1 Caching Strategy

```typescript
// src/services/nlp/query-cache.ts

import { createClient } from 'redis';

interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize: number; // Max cache entries
}

export class QueryTransformationCache {
  private redis: ReturnType<typeof createClient>;
  private config: CacheConfig;

  constructor(config: CacheConfig = { ttl: 3600, maxSize: 10000 }) {
    this.config = config;
    this.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.redis.connect();
  }

  /**
   * Cache transformed query
   */
  async set(query: string, result: TransformedQuery): Promise<void> {
    const key = this.generateKey(query);
    const serialized = JSON.stringify(result);

    await this.redis.setEx(key, this.config.ttl, serialized);
  }

  /**
   * Get cached transformation
   */
  async get(query: string): Promise<TransformedQuery | null> {
    const key = this.generateKey(query);
    const cached = await this.redis.get(key);

    if (!cached) return null;

    return JSON.parse(cached);
  }

  /**
   * Generate cache key
   */
  private generateKey(query: string): string {
    // Normalize query for consistent caching
    const normalized = query.trim().toLowerCase();
    return `query:transform:${Buffer.from(normalized).toString('base64')}`;
  }

  /**
   * Clear cache
   */
  async clear(): Promise<void> {
    const keys = await this.redis.keys('query:transform:*');
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }
}

export const queryTransformationCache = new QueryTransformationCache();
```

### 5.2 Performance Optimizations

**1. Entity Dictionary Indexing**
```typescript
// Pre-compute indexes at initialization
class LegalEntityDictionary {
  private acronymIndex: Map<string, string>;
  private aliasIndex: Map<string, string>;
  private nameIndex: Map<string, string>;

  // O(1) lookups instead of O(n) scans
  findEntity(name: string): LegalEntity | null {
    const normalized = name.toLowerCase();

    const id = this.nameIndex.get(normalized) ||
               this.acronymIndex.get(normalized) ||
               this.aliasIndex.get(normalized);

    return id ? this.entities.get(id) : null;
  }
}
```

**2. Parallel Processing**
```typescript
// Process validation and context building in parallel
async transformQuery(query: string): Promise<TransformedQuery> {
  const processed = await queryProcessor.processQuery(query);

  // Run in parallel
  const [validatedEntities, contextPrompts] = await Promise.all([
    legalEntityDictionary.validateEntities({
      laws: processed.intent.entities.laws,
      articles: processed.intent.entities.articles,
      keywords: processed.intent.entities.keywords
    }),
    contextPromptBuilder.buildContextualPrompts(processed.intent)
  ]);

  // Continue with filter building...
}
```

**3. Request Batching**
```typescript
// Batch multiple queries for bulk processing
async transformBatch(queries: string[]): Promise<TransformedQuery[]> {
  return Promise.all(queries.map(q => this.transformQuery(q)));
}
```

### 5.3 Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| **Transformation Time** | <500ms | Caching + parallel processing |
| **End-to-End Query** | <2000ms | Includes Phase 9 search |
| **Cache Hit Rate** | >60% | 1-hour TTL, 10K entries |
| **Memory Usage** | <256MB | Dictionary + cache |
| **Concurrent Requests** | 100/sec | Stateless services |

---

## 6. API Endpoints

### 6.1 Endpoint Specifications

```typescript
// src/routes/nlp-query.ts

import express from 'express';
import { queryTransformationService } from '../services/nlp/query-transformation-service';
import { legalEntityDictionary } from '../services/nlp/legal-entity-dictionary';

const router = express.Router();

/**
 * POST /api/nlp/transform
 * Transform natural language query to structured search
 */
router.post('/api/nlp/transform', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query is required and must be a string'
      });
    }

    const transformed = await queryTransformationService.transformQuery(query);

    res.json({
      success: true,
      data: transformed
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/nlp/search
 * Transform query and execute search in one call
 */
router.post('/api/nlp/search', async (req, res) => {
  try {
    const { query, userId } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query is required and must be a string'
      });
    }

    const result = await queryTransformationService.transformAndSearch(
      query,
      userId
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error,
        transformed: result.transformed,
        suggestions: result.suggestions
      });
    }

    res.json({
      success: true,
      query: {
        original: query,
        intent: result.transformed.processed.intent.type,
        confidence: result.transformed.confidence
      },
      entities: {
        laws: result.transformed.validatedEntities.laws.map(l => ({
          id: l.id,
          name: l.name,
          fullName: l.fullName,
          hierarchy: l.hierarchy
        })),
        articles: result.transformed.validatedEntities.articles,
        keywords: result.transformed.validatedEntities.keywords
      },
      results: result.results.documents,
      totalCount: result.results.totalCount,
      performance: {
        transformationMs: result.transformed.transformationTimeMs,
        searchMs: result.results.performance.searchMs,
        totalMs: result.transformed.transformationTimeMs +
                 result.results.performance.totalTimeMs
      },
      warnings: result.transformed.warnings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/nlp/entities/search
 * Search legal entities
 */
router.get('/api/nlp/entities/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        error: 'Query parameter "q" is required'
      });
    }

    const entities = legalEntityDictionary.searchEntities(
      q,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      query: q,
      results: entities.map(e => ({
        id: e.id,
        name: e.name,
        fullName: e.fullName,
        acronym: e.acronym,
        type: e.type,
        hierarchy: e.hierarchy
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/nlp/entities/:id
 * Get entity details
 */
router.get('/api/nlp/entities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entity = legalEntityDictionary.getEntity(id);

    if (!entity) {
      return res.status(404).json({
        success: false,
        error: 'Entity not found'
      });
    }

    res.json({
      success: true,
      entity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/nlp/entities/types/:type
 * Get entities by type
 */
router.get('/api/nlp/entities/types/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const entities = legalEntityDictionary.getEntitiesByType(type as any);

    res.json({
      success: true,
      type,
      count: entities.length,
      entities: entities.map(e => ({
        id: e.id,
        name: e.name,
        fullName: e.fullName,
        hierarchy: e.hierarchy
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

### 6.2 Example API Calls

**1. Transform Query**
```bash
POST /api/nlp/transform
Content-Type: application/json

{
  "query": "Muéstrame artículos del COIP sobre estafa del 2023"
}

# Response:
{
  "success": true,
  "data": {
    "original": "Muéstrame artículos del COIP sobre estafa del 2023",
    "validatedEntities": {
      "laws": [
        {
          "id": "coip",
          "name": "COIP",
          "fullName": "Código Orgánico Integral Penal",
          "hierarchy": "CODIGOS_ORGANICOS"
        }
      ],
      "keywords": ["estafa", "artículos"],
      "expandedAcronyms": {
        "COIP": "Código Orgánico Integral Penal"
      }
    },
    "searchFilters": {
      "legalHierarchy": ["CODIGOS_ORGANICOS"],
      "normType": ["COIP"],
      "publicationDateFrom": "2023-01-01T00:00:00.000Z",
      "publicationDateTo": "2023-12-31T23:59:59.999Z"
    },
    "confidence": 0.92,
    "transformationTimeMs": 347
  }
}
```

**2. Transform and Search**
```bash
POST /api/nlp/search
Content-Type: application/json

{
  "query": "¿Qué dice la Constitución sobre el derecho a la educación?",
  "userId": "user-123"
}

# Response:
{
  "success": true,
  "query": {
    "original": "¿Qué dice la Constitución sobre el derecho a la educación?",
    "intent": "question",
    "confidence": 0.94
  },
  "entities": {
    "laws": [
      {
        "id": "const_ec_2008",
        "name": "Constitución",
        "fullName": "Constitución de la República del Ecuador",
        "hierarchy": "CONSTITUCION"
      }
    ],
    "keywords": ["derecho", "educación"]
  },
  "results": [...], // Phase 9 search results
  "totalCount": 15,
  "performance": {
    "transformationMs": 412,
    "searchMs": 867,
    "totalMs": 1279
  }
}
```

**3. Search Legal Entities**
```bash
GET /api/nlp/entities/search?q=código&limit=5

# Response:
{
  "success": true,
  "query": "código",
  "results": [
    {
      "id": "coip",
      "name": "COIP",
      "fullName": "Código Orgánico Integral Penal",
      "acronym": "COIP",
      "type": "ORGANIC_CODE",
      "hierarchy": "CODIGOS_ORGANICOS"
    },
    {
      "id": "cogep",
      "name": "COGEP",
      "fullName": "Código Orgánico General de Procesos",
      "acronym": "COGEP",
      "type": "ORGANIC_CODE",
      "hierarchy": "CODIGOS_ORGANICOS"
    }
    // ... more results
  ]
}
```

---

## 7. Implementation Timeline

### Days 8-10: Transformation Logic (3 days)

#### Day 8: FilterBuilder + LegalEntityDictionary Setup
**Morning (4 hours):**
- Create `filter-builder.ts` with basic structure
- Implement `buildFilters()` method
- Add intent-specific filter logic
- Unit tests for FilterBuilder

**Afternoon (4 hours):**
- Create `legal-entity-dictionary.ts`
- Initialize dictionary with 30+ Ecuadorian entities
- Build acronym and alias indexes
- Unit tests for dictionary lookups

**Deliverables:**
- `src/services/nlp/filter-builder.ts` ✓
- `src/services/nlp/legal-entity-dictionary.ts` ✓
- 20+ unit tests passing

---

#### Day 9: Entity Validation + Context Prompts
**Morning (4 hours):**
- Implement `validateEntities()` method
- Add entity expansion logic (acronyms → full names)
- Handle unrecognized entities
- Add caching for validation results

**Afternoon (4 hours):**
- Create `context-prompt-builder.ts`
- Implement Ecuadorian legal context logic
- Build hierarchy-specific prompts
- Unit tests for context building

**Deliverables:**
- Complete entity validation with expansion
- Context prompt generation
- 15+ unit tests passing

---

#### Day 10: QueryTransformationService Integration
**Morning (4 hours):**
- Create `query-transformation-service.ts`
- Implement main `transformQuery()` method
- Integrate all Week 2 components
- Add confidence scoring

**Afternoon (4 hours):**
- Implement `transformAndSearch()` method
- Add error handling and warnings
- Create suggestion generation logic
- Integration tests with Week 1

**Deliverables:**
- `src/services/nlp/query-transformation-service.ts` ✓
- Full transformation pipeline working
- 25+ integration tests passing

---

### Days 11-14: Integration & Testing (4 days)

#### Day 11: Phase 9 Integration
**Morning (4 hours):**
- Test integration with AdvancedSearchEngine
- Verify SearchFilters compatibility
- Debug any interface mismatches
- Performance profiling

**Afternoon (4 hours):**
- Create API routes (`nlp-query.ts`)
- Implement `/api/nlp/transform` endpoint
- Implement `/api/nlp/search` endpoint
- API documentation

**Deliverables:**
- Full integration with Phase 9
- 4 API endpoints functional
- API tests passing

---

#### Day 12: Caching + Performance
**Morning (4 hours):**
- Implement `QueryTransformationCache`
- Add Redis caching layer
- Optimize dictionary lookups
- Parallel processing implementation

**Afternoon (4 hours):**
- Performance testing and profiling
- Optimize hot paths
- Reduce memory footprint
- Load testing (100 concurrent queries)

**Deliverables:**
- Caching layer operational
- <500ms transformation time achieved
- <2s end-to-end query time

---

#### Day 13: End-to-End Testing
**Morning (4 hours):**
- Create 50+ test queries covering:
  - Simple searches
  - Complex questions
  - Comparisons
  - Article references
  - Date ranges

**Afternoon (4 hours):**
- Run end-to-end tests
- Measure accuracy metrics
- Fix failing cases
- Document edge cases

**Deliverables:**
- 50+ E2E tests
- >85% query understanding accuracy
- Test report document

---

#### Day 14: Documentation + Polish
**Morning (4 hours):**
- Complete API documentation
- Write developer guide
- Create usage examples
- Performance benchmarks

**Afternoon (4 hours):**
- Code review and cleanup
- Final testing pass
- Deploy to staging
- Week 2 completion report

**Deliverables:**
- Complete documentation
- Week 2 COMPLETE
- Ready for production

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// tests/services/nlp/filter-builder.test.ts

describe('FilterBuilder', () => {
  const filterBuilder = new FilterBuilder();

  test('builds basic filters from entities', () => {
    const input = {
      validatedEntities: {
        laws: [{
          id: 'coip',
          name: 'COIP',
          hierarchy: 'CODIGOS_ORGANICOS',
          type: 'ORGANIC_CODE'
        }],
        jurisdictions: ['NACIONAL'],
        normTypes: ['COIP']
      },
      legalContext: {},
      intentType: 'search'
    };

    const filters = filterBuilder.buildFilters(input);

    expect(filters.legalHierarchy).toContain('CODIGOS_ORGANICOS');
    expect(filters.normType).toContain('COIP');
    expect(filters.jurisdiction).toContain('NACIONAL');
  });

  test('applies intent-specific filters', () => {
    const input = {
      validatedEntities: { laws: [], jurisdictions: [], normTypes: [] },
      legalContext: {},
      intentType: 'question'
    };

    const filters = filterBuilder.buildFilters(input);

    expect(filters.minPageRank).toBe(0.3); // Questions prefer authority
  });
});

// tests/services/nlp/legal-entity-dictionary.test.ts

describe('LegalEntityDictionary', () => {
  const dictionary = new LegalEntityDictionary();

  test('validates known Ecuadorian laws', async () => {
    const result = await dictionary.validateEntities({
      laws: ['COIP', 'Constitución'],
      articles: ['Art. 186'],
      keywords: ['estafa']
    });

    expect(result.laws).toHaveLength(2);
    expect(result.laws[0].fullName).toBe('Código Orgánico Integral Penal');
    expect(result.unrecognizedLaws).toHaveLength(0);
  });

  test('expands acronyms correctly', async () => {
    const result = await dictionary.validateEntities({
      laws: ['COGEP', 'LOSEP'],
      articles: [],
      keywords: []
    });

    expect(result.expandedAcronyms.get('COGEP')).toBe(
      'Código Orgánico General de Procesos'
    );
    expect(result.expandedAcronyms.get('LOSEP')).toBe(
      'Ley Orgánica del Servicio Público'
    );
  });

  test('handles unrecognized laws', async () => {
    const result = await dictionary.validateEntities({
      laws: ['LEY_INEXISTENTE'],
      articles: [],
      keywords: []
    });

    expect(result.unrecognizedLaws).toContain('LEY_INEXISTENTE');
    expect(result.laws).toHaveLength(0);
  });

  test('searches entities by partial name', () => {
    const results = dictionary.searchEntities('código', 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every(e =>
      e.name.toLowerCase().includes('código') ||
      e.fullName.toLowerCase().includes('código')
    )).toBe(true);
  });
});
```

### 8.2 Integration Tests

```typescript
// tests/services/nlp/query-transformation.integration.test.ts

describe('QueryTransformationService Integration', () => {
  const service = new QueryTransformationService();

  test('transforms complete NL query', async () => {
    const query = 'Muéstrame artículos del COIP sobre estafa del 2023';
    const result = await service.transformQuery(query);

    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.validatedEntities.laws).toHaveLength(1);
    expect(result.validatedEntities.laws[0].name).toBe('COIP');
    expect(result.searchFilters.legalHierarchy).toContain('CODIGOS_ORGANICOS');
    expect(result.searchFilters.publicationDateFrom).toEqual(
      new Date('2023-01-01')
    );
  });

  test('integrates with Phase 9 search engine', async () => {
    const query = '¿Qué dice la Constitución sobre educación?';
    const result = await service.transformAndSearch(query);

    expect(result.transformed).toBeDefined();
    expect(result.results).toBeDefined();
    expect(result.results.documents).toBeInstanceOf(Array);
    expect(result.transformed.transformationTimeMs +
           result.results.performance.totalTimeMs).toBeLessThan(2000);
  });

  test('handles low confidence queries', async () => {
    const query = 'sdklfjsdlkfj random garbage';
    const result = await service.transformAndSearch(query);

    expect(result.error).toBeTruthy();
    expect(result.suggestions).toBeInstanceOf(Array);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
```

### 8.3 Performance Tests

```typescript
// tests/performance/query-transformation.perf.test.ts

describe('Query Transformation Performance', () => {
  test('processes simple query in <500ms', async () => {
    const start = Date.now();

    await queryTransformationService.transformQuery(
      'buscar COIP artículo 186'
    );

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  test('handles 100 concurrent queries', async () => {
    const queries = Array(100).fill('buscar constitución educación');
    const start = Date.now();

    await Promise.all(queries.map(q =>
      queryTransformationService.transformQuery(q)
    ));

    const duration = Date.now() - start;
    const avgPerQuery = duration / 100;

    expect(avgPerQuery).toBeLessThan(1000); // <1s per query under load
  });

  test('achieves >60% cache hit rate', async () => {
    const query = 'buscar COIP estafa';

    // First call - cache miss
    await queryTransformationService.transformQuery(query);

    // Subsequent calls - cache hits
    const start = Date.now();
    for (let i = 0; i < 10; i++) {
      await queryTransformationService.transformQuery(query);
    }
    const duration = Date.now() - start;

    // Should be much faster with caching
    expect(duration / 10).toBeLessThan(50); // <50ms with cache
  });
});
```

### 8.4 End-to-End Test Queries

```typescript
// tests/e2e/sample-queries.test.ts

const testQueries = [
  // Simple searches
  {
    query: 'buscar código penal',
    expectedIntent: 'search',
    expectedLaws: ['COIP'],
    minConfidence: 0.85
  },
  {
    query: 'encontrar artículos sobre derechos laborales',
    expectedIntent: 'search',
    expectedLaws: ['Código del Trabajo'],
    minConfidence: 0.80
  },

  // Questions
  {
    query: '¿Qué dice la Constitución sobre el derecho a la educación?',
    expectedIntent: 'question',
    expectedLaws: ['Constitución'],
    minConfidence: 0.90
  },
  {
    query: '¿Cuál es la pena por estafa según el COIP?',
    expectedIntent: 'question',
    expectedLaws: ['COIP'],
    expectedArticles: true,
    minConfidence: 0.85
  },

  // Comparisons
  {
    query: 'comparar Código Civil y Código de Comercio sobre contratos',
    expectedIntent: 'comparison',
    expectedLaws: ['Código Civil', 'Código de Comercio'],
    minConfidence: 0.85
  },

  // Date ranges
  {
    query: 'leyes sobre protección de datos del 2021 al 2023',
    expectedIntent: 'search',
    expectedDateRange: { start: '2021-01-01', end: '2023-12-31' },
    minConfidence: 0.80
  },

  // Acronyms
  {
    query: 'artículos del COGEP sobre medidas cautelares',
    expectedIntent: 'search',
    expectedLaws: ['COGEP'],
    expectedAcronymExpansion: {
      'COGEP': 'Código Orgánico General de Procesos'
    },
    minConfidence: 0.85
  },

  // Complex queries
  {
    query: 'analizar jurisprudencia constitucional sobre derecho al trabajo de 2020 a 2024',
    expectedIntent: 'analysis',
    expectedLaws: ['Constitución'],
    expectedDateRange: { start: '2020-01-01', end: '2024-12-31' },
    minConfidence: 0.75
  }
];

describe('End-to-End Query Tests', () => {
  testQueries.forEach(testCase => {
    test(`processes: "${testCase.query}"`, async () => {
      const result = await queryTransformationService.transformQuery(
        testCase.query
      );

      expect(result.processed.intent.type).toBe(testCase.expectedIntent);
      expect(result.confidence).toBeGreaterThanOrEqual(testCase.minConfidence);

      if (testCase.expectedLaws) {
        const lawNames = result.validatedEntities.laws.map(l => l.name);
        testCase.expectedLaws.forEach(expectedLaw => {
          expect(lawNames.some(name =>
            name.includes(expectedLaw) ||
            result.validatedEntities.expandedAcronyms.get(expectedLaw)
          )).toBe(true);
        });
      }

      if (testCase.expectedDateRange) {
        expect(result.searchFilters.publicationDateFrom).toBeDefined();
        expect(result.searchFilters.publicationDateTo).toBeDefined();
      }

      if (testCase.expectedArticles) {
        expect(result.validatedEntities.articles.length).toBeGreaterThan(0);
      }

      if (testCase.expectedAcronymExpansion) {
        Object.entries(testCase.expectedAcronymExpansion).forEach(
          ([acronym, fullName]) => {
            expect(
              result.validatedEntities.expandedAcronyms.get(acronym)
            ).toBe(fullName);
          }
        );
      }
    });
  });
});
```

---

## Success Criteria

### Week 2 Completion Checklist

- [ ] **Core Services Implemented**
  - [ ] QueryTransformationService complete
  - [ ] LegalEntityDictionary with 30+ entities
  - [ ] FilterBuilder functional
  - [ ] ContextPromptBuilder operational

- [ ] **Integration Complete**
  - [ ] Phase 9 AdvancedSearchEngine integration working
  - [ ] Week 1 QueryProcessor integration seamless
  - [ ] All interfaces compatible

- [ ] **Performance Targets Met**
  - [ ] Transformation time <500ms (95th percentile)
  - [ ] End-to-end query <2000ms (95th percentile)
  - [ ] Cache hit rate >60%
  - [ ] Handle 100 concurrent queries

- [ ] **Quality Metrics**
  - [ ] >95% query understanding accuracy
  - [ ] >85% entity validation precision
  - [ ] >90% filter generation correctness
  - [ ] 100+ unit tests passing
  - [ ] 30+ integration tests passing
  - [ ] 50+ E2E tests passing

- [ ] **API & Documentation**
  - [ ] 4 API endpoints functional
  - [ ] OpenAPI spec complete
  - [ ] Developer guide written
  - [ ] Usage examples documented

---

## Appendix A: File Structure

```
src/
├── services/
│   ├── nlp/
│   │   ├── query-processor.ts              # Week 1 (existing)
│   │   ├── query-transformation-service.ts # NEW - Main orchestrator
│   │   ├── legal-entity-dictionary.ts      # NEW - Entity validation
│   │   ├── filter-builder.ts               # NEW - Filter generation
│   │   ├── context-prompt-builder.ts       # NEW - Context building
│   │   └── query-cache.ts                  # NEW - Caching layer
│   └── search/
│       └── advanced-search-engine.ts       # Phase 9 (existing)
├── routes/
│   └── nlp-query.ts                        # NEW - API routes
├── types/
│   └── query-transformation.types.ts       # NEW - Type definitions
└── tests/
    ├── services/
    │   └── nlp/
    │       ├── filter-builder.test.ts
    │       ├── legal-entity-dictionary.test.ts
    │       ├── context-prompt-builder.test.ts
    │       └── query-transformation.integration.test.ts
    ├── performance/
    │   └── query-transformation.perf.test.ts
    └── e2e/
        └── sample-queries.test.ts
```

---

## Appendix B: Dependencies

```json
{
  "dependencies": {
    "openai": "^4.20.0",
    "redis": "^4.6.5",
    "@prisma/client": "^5.7.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "jest": "^29.7.0",
    "vitest": "^1.0.0"
  }
}
```

---

## Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-13 | AI Development Team | Initial architecture document |

**Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tech Lead | ___________ | ___________ | _______ |
| Product Manager | ___________ | ___________ | _______ |
| QA Lead | ___________ | ___________ | _______ |

---

**End of Document**
