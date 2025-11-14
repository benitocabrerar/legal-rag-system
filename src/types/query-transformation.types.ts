/**
 * Query Transformation Types
 * Comprehensive type definitions for the NL → Filter transformation pipeline
 *
 * @module query-transformation.types
 * @author Legal RAG System
 * @version 2.0.0
 */

/**
 * Entity types specific to Ecuadorian legal system
 */
export enum EntityType {
  // Normative types
  CONSTITUTION = 'CONSTITUTION',
  LAW = 'LAW',
  ORGANIC_LAW = 'ORGANIC_LAW',
  REGULATION = 'REGULATION',
  DECREE = 'DECREE',
  RESOLUTION = 'RESOLUTION',
  ORDINANCE = 'ORDINANCE',
  AGREEMENT = 'AGREEMENT',

  // Jurisdictions
  NATIONAL = 'NATIONAL',
  PROVINCIAL = 'PROVINCIAL',
  MUNICIPAL = 'MUNICIPAL',
  INSTITUTIONAL = 'INSTITUTIONAL',

  // Organizations
  GOVERNMENT_ENTITY = 'GOVERNMENT_ENTITY',
  MINISTRY = 'MINISTRY',
  SECRETARY = 'SECRETARY',
  AGENCY = 'AGENCY',

  // Legal concepts
  LEGAL_PRINCIPLE = 'LEGAL_PRINCIPLE',
  LEGAL_PROCEDURE = 'LEGAL_PROCEDURE',
  LEGAL_RIGHT = 'LEGAL_RIGHT',

  // Temporal
  DATE = 'DATE',
  DATE_RANGE = 'DATE_RANGE',

  // Geographic
  PROVINCE = 'PROVINCE',
  CANTON = 'CANTON',
  MUNICIPALITY = 'MUNICIPALITY',

  // Subject matter
  LEGAL_TOPIC = 'LEGAL_TOPIC',
  LEGAL_DOMAIN = 'LEGAL_DOMAIN'
}

/**
 * Intent classification for legal queries
 */
export enum QueryIntent {
  FIND_DOCUMENT = 'FIND_DOCUMENT',
  FIND_PROVISION = 'FIND_PROVISION',
  COMPARE_NORMS = 'COMPARE_NORMS',
  CHECK_VALIDITY = 'CHECK_VALIDITY',
  FIND_PRECEDENT = 'FIND_PRECEDENT',
  UNDERSTAND_PROCEDURE = 'UNDERSTAND_PROCEDURE',
  FIND_AUTHORITY = 'FIND_AUTHORITY',
  GENERAL_SEARCH = 'GENERAL_SEARCH'
}

/**
 * Confidence levels for entity extraction and intent classification
 */
export enum ConfidenceLevel {
  HIGH = 'HIGH',        // >= 0.8
  MEDIUM = 'MEDIUM',    // >= 0.5
  LOW = 'LOW',          // >= 0.3
  VERY_LOW = 'VERY_LOW' // < 0.3
}

/**
 * Entity metadata for Ecuadorian legal context
 */
export interface EntityMetadata {
  /** Official legal name */
  officialName: string;

  /** Common abbreviations */
  abbreviations: string[];

  /** Legal hierarchy level (0 = highest, e.g., Constitution) */
  hierarchyLevel: number;

  /** Issuing authority */
  issuingAuthority?: string;

  /** Publication source (e.g., Registro Oficial) */
  publicationSource?: string;

  /** Related entity IDs */
  relatedEntities: string[];

  /** Entity status (active, repealed, amended) */
  status: 'active' | 'repealed' | 'amended' | 'suspended';

  /** Additional context-specific metadata */
  customMetadata: Record<string, unknown>;
}

/**
 * Extracted legal entity with confidence and position
 */
export interface Entity {
  /** Unique identifier */
  id: string;

  /** Entity type */
  type: EntityType;

  /** Extracted text */
  text: string;

  /** Normalized canonical form */
  normalizedText: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Position in original query */
  startIndex: number;
  endIndex: number;

  /** Entity metadata */
  metadata?: EntityMetadata;

  /** Source of extraction (pattern, dictionary, LLM) */
  source: 'pattern' | 'dictionary' | 'llm' | 'hybrid';
}

/**
 * Query intent with confidence and reasoning
 */
export interface Intent {
  /** Primary intent classification */
  primary: QueryIntent;

  /** Confidence score (0-1) */
  confidence: number;

  /** Secondary intents if applicable */
  secondary: QueryIntent[];

  /** Reasoning for classification */
  reasoning?: string;

  /** Suggested query refinements */
  suggestions: string[];
}

/**
 * Date range filter
 */
export interface DateRange {
  /** Start date (inclusive) */
  from: Date;

  /** End date (inclusive) */
  to: Date;

  /** Filter type (publication, effective, etc.) */
  dateType: 'publication' | 'effective' | 'lastModified';
}

/**
 * Advanced search filters compatible with Phase 9
 */
export interface SearchFilters {
  /** Normative types (ley, decreto, etc.) */
  normType?: string[];

  /** Jurisdictions (nacional, provincial, municipal) */
  jurisdiction?: string[];

  /** Legal hierarchy levels */
  legalHierarchy?: string[];

  /** Publication types (registro oficial, gaceta, etc.) */
  publicationType?: string[];

  /** Keywords and search terms */
  keywords?: string[];

  /** Date range filters */
  dateRange?: DateRange;

  /** Document state (vigente, derogado, etc.) */
  documentState?: string;

  /** Geographic scope (province, canton, etc.) */
  geographicScope?: string[];

  /** Issuing entities */
  issuingEntities?: string[];

  /** Legal topics/domains */
  topics?: string[];

  /** Minimum relevance score */
  minRelevance?: number;

  /** Maximum results */
  limit?: number;

  /** Result offset for pagination */
  offset?: number;
}

/**
 * Filter validation result
 */
export interface ValidationResult {
  /** Whether filters are valid */
  isValid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Warnings (non-blocking) */
  warnings: ValidationWarning[];

  /** Suggested corrections */
  suggestions: FilterSuggestion[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Field with error */
  field: keyof SearchFilters;

  /** Error message */
  message: string;

  /** Error code for programmatic handling */
  code: string;

  /** Invalid value */
  value: unknown;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Field with warning */
  field: keyof SearchFilters;

  /** Warning message */
  message: string;

  /** Severity level */
  severity: 'low' | 'medium' | 'high';
}

/**
 * Filter suggestion for query improvement
 */
export interface FilterSuggestion {
  /** Field to modify */
  field: keyof SearchFilters;

  /** Suggested value */
  suggestedValue: unknown;

  /** Reason for suggestion */
  reason: string;

  /** Expected improvement */
  expectedImprovement: string;
}

/**
 * Complete transformation result
 */
export interface TransformationResult {
  /** Generated search filters */
  filters: SearchFilters;

  /** Overall confidence (0-1) */
  confidence: number;

  /** Confidence level classification */
  confidenceLevel: ConfidenceLevel;

  /** Extracted entities */
  entities: Entity[];

  /** Detected intent */
  intent: Intent;

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Validation result */
  validation: ValidationResult;

  /** Suggestions for query refinement */
  refinementSuggestions: string[];

  /** Debug information (if enabled) */
  debug?: TransformationDebugInfo;
}

/**
 * Debug information for transformation pipeline
 */
export interface TransformationDebugInfo {
  /** Original query */
  originalQuery: string;

  /** Preprocessed query */
  preprocessedQuery: string;

  /** Entity extraction details */
  entityExtraction: {
    patternMatches: number;
    dictionaryMatches: number;
    llmMatches: number;
    totalEntities: number;
  };

  /** Intent classification details */
  intentClassification: {
    scores: Record<QueryIntent, number>;
    reasoning: string;
  };

  /** Filter building steps */
  filterBuildingSteps: string[];

  /** Performance breakdown */
  performanceBreakdown: {
    preprocessing: number;
    entityExtraction: number;
    intentClassification: number;
    filterBuilding: number;
    validation: number;
  };
}

/**
 * Legal entity definition
 */
export interface LegalEntity {
  /** Unique identifier */
  id: string;

  /** Entity type */
  type: EntityType;

  /** Primary name */
  name: string;

  /** Normalized canonical name */
  normalizedName: string;

  /** Alternative names and synonyms */
  synonyms: string[];

  /** Regex pattern for matching */
  pattern: RegExp;

  /** Entity metadata */
  metadata: EntityMetadata;

  /** Matching weight (for disambiguation) */
  weight: number;
}

/**
 * Entity dictionary search options
 */
export interface EntitySearchOptions {
  /** Use fuzzy matching */
  fuzzy?: boolean;

  /** Fuzzy matching threshold (0-1) */
  fuzzyThreshold?: number;

  /** Maximum results */
  maxResults?: number;

  /** Filter by entity type */
  entityType?: EntityType;

  /** Case-sensitive matching */
  caseSensitive?: boolean;
}

/**
 * Prompt building options
 */
export interface PromptOptions {
  /** Include examples */
  includeExamples?: boolean;

  /** Number of examples to include */
  exampleCount?: number;

  /** Include legal context */
  includeContext?: boolean;

  /** Maximum prompt length in tokens */
  maxTokens?: number;

  /** Temperature for LLM */
  temperature?: number;

  /** Include chain-of-thought reasoning */
  includeChainOfThought?: boolean;
}

/**
 * Transformation service configuration
 */
export interface TransformationConfig {
  /** Enable debug mode */
  debug: boolean;

  /** Enable caching */
  enableCaching: boolean;

  /** Cache TTL in seconds */
  cacheTTL: number;

  /** Maximum processing time in ms */
  maxProcessingTime: number;

  /** LLM model to use */
  llmModel: string;

  /** LLM temperature */
  llmTemperature: number;

  /** Maximum LLM tokens */
  maxLlmTokens: number;

  /** Minimum confidence threshold */
  minConfidenceThreshold: number;

  /** Enable performance monitoring */
  enablePerformanceMonitoring: boolean;
}

/**
 * Custom error for query transformation
 */
export class QueryTransformationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'QueryTransformationError';
    Object.setPrototypeOf(this, QueryTransformationError.prototype);
  }
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Operation name */
  operation: string;

  /** Start timestamp */
  startTime: number;

  /** End timestamp */
  endTime: number;

  /** Duration in milliseconds */
  duration: number;

  /** Memory usage in bytes */
  memoryUsage?: number;

  /** Additional metrics */
  customMetrics?: Record<string, number>;
}
