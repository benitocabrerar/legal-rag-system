/**
 * Ecuadorian Legal Citation Types
 * Defines types for legal citation parsing and validation
 */

export type CitationType =
  | 'law'                    // Leyes
  | 'decree'                 // Decretos
  | 'constitutional_court'   // Sentencias Corte Constitucional
  | 'supreme_court'          // Sentencias Corte Suprema
  | 'resolution'             // Resoluciones
  | 'concept'                // Conceptos
  | 'article'                // Artículos
  | 'code';                  // Códigos

export interface CitationComponents {
  number?: string;
  year?: string;
  type?: string;
  article?: string;
  numeral?: string | null;
  month?: string;
  day?: string;
  [key: string]: string | null | undefined;
}

export interface ParsedCitation {
  type: CitationType;
  raw: string;
  position: number;
  components: CitationComponents;
  normalizedForm: string;
  url: string | null;
  context?: string;
  relatedCitations?: string[];
  validity?: CitationValidity;
}

export interface CitationValidity {
  isValid: boolean;
  status: 'active' | 'modified' | 'repealed' | 'unknown';
  lastChecked: Date;
  source?: string;
}

export interface CitationContext {
  beforeText: string;
  afterText: string;
  fullSentence: string;
}

export interface CitationRelationship {
  fromCitationId: string;
  toCitationId: string;
  relationshipType: 'modifies' | 'repeals' | 'complements' | 'references';
}

export interface DocumentCitation {
  id: string;
  documentId: string;
  citation: ParsedCitation;
  createdAt: Date;
  updatedAt: Date;
}
