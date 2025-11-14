/**
 * Types for Enhanced Relevance Scoring System
 * Phase 5: Multi-factor document scoring for RAG Legal System
 */

/**
 * Weighting configuration for different scoring factors
 */
export interface ScoringWeights {
  semantic: number;     // Embedding-based similarity
  keyword: number;      // TF-IDF keyword matching
  metadata: number;     // Document metadata relevance
  recency: number;      // Time-based relevance
  authority: number;    // Source authority/citation count
}

/**
 * Breakdown of individual scoring components
 */
export interface ScoreBreakdown {
  semantic: number;
  keyword: number;
  metadata: number;
  recency: number;
  authority: number;
}

/**
 * Features extracted from search query
 */
export interface QueryFeatures {
  // Original query
  rawQuery: string;

  // Extracted terms
  terms: string[];

  // Multi-word phrases
  phrases: string[];

  // IDF scores for terms
  idfScores: Map<string, number>;

  // Query embedding for semantic search
  embedding: number[] | null;

  // Extracted metadata filters
  documentTypes: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  jurisdiction?: string;
  legalAreas: string[];
}

/**
 * Search context configuration
 */
export interface SearchContext {
  preferRecent: boolean;
  enableDiversity: boolean;
  enableMMR: boolean;  // Maximal Marginal Relevance
  userId?: string;
  sessionId?: string;
}

/**
 * Document with relevance score
 */
export interface ScoredDocument {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  relevanceScore: number;
  scoreBreakdown: ScoreBreakdown;
  explanation: string;
}

/**
 * Document metadata for scoring
 */
export interface DocumentMetadata {
  type: string;           // law, regulation, resolution, etc.
  title: string;
  date: string;           // ISO date
  jurisdiction: string;   // national, provincial, municipal
  legal_area: string;     // civil, criminal, administrative, etc.
  keywords: string[];
  source_type: string;    // supreme_court, ministry, etc.
  cited_by?: string[];    // List of document IDs that cite this
  citations?: string[];   // List of document IDs this cites
}

/**
 * TF-IDF calculation result
 */
export interface TFIDFResult {
  term: string;
  tf: number;   // Term frequency
  idf: number;  // Inverse document frequency
  score: number; // TF-IDF score
}

/**
 * BM25 scoring parameters
 */
export interface BM25Params {
  k1: number;  // Term frequency saturation parameter (typically 1.2-2.0)
  b: number;   // Length normalization parameter (typically 0.75)
}

/**
 * Document statistics for scoring algorithms
 */
export interface DocumentStats {
  totalDocuments: number;
  averageDocumentLength: number;
  documentLengths: Map<string, number>;
  termDocumentFrequencies: Map<string, number>; // How many documents contain each term
}

/**
 * BM25 scoring result
 */
export interface BM25Result {
  documentId: string;
  score: number;
  termScores: Map<string, number>; // Individual term contributions
}

/**
 * Default scoring weights (Ecuadorian legal system optimized)
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  semantic: 0.35,   // Embedding similarity is important
  keyword: 0.25,    // Exact keyword matches matter
  metadata: 0.20,   // Legal metadata is relevant
  recency: 0.10,    // Newer laws can override older ones
  authority: 0.10   // Source authority matters
};

/**
 * Default BM25 parameters
 */
export const DEFAULT_BM25_PARAMS: BM25Params = {
  k1: 1.5,  // Standard BM25 k1
  b: 0.75   // Standard BM25 b
};

/**
 * Default search context
 */
export const DEFAULT_SEARCH_CONTEXT: SearchContext = {
  preferRecent: false,
  enableDiversity: true,
  enableMMR: false
};

/**
 * Source authority rankings for Ecuadorian legal system
 */
export const ECUADORIAN_SOURCE_AUTHORITY: Record<string, number> = {
  'constitutional_court': 1.0,      // Corte Constitucional
  'supreme_court': 0.95,            // Corte Nacional de Justicia
  'state_council': 0.90,            // Consejo de Estado
  'electoral_court': 0.85,          // Consejo Nacional Electoral
  'national_assembly': 0.80,        // Asamblea Nacional
  'presidency': 0.75,               // Presidencia de la República
  'ministry': 0.70,                 // Ministerios
  'autonomous_agency': 0.65,        // Entidades autónomas
  'provincial_government': 0.60,    // Gobiernos provinciales
  'municipal_government': 0.55,     // Gobiernos municipales
  'regulatory_agency': 0.50,        // Agencias reguladoras
  'other': 0.40                     // Otras fuentes
};

/**
 * Legal area importance weights for Ecuador
 */
export const LEGAL_AREA_WEIGHTS: Record<string, number> = {
  'constitutional': 1.0,
  'criminal': 0.95,
  'civil': 0.90,
  'administrative': 0.85,
  'labor': 0.80,
  'tax': 0.75,
  'commercial': 0.70,
  'environmental': 0.65,
  'family': 0.60,
  'other': 0.50
};
