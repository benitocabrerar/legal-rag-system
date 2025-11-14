/**
 * Hierarchical Document Chunking Types
 * Types for intelligent chunking of legal documents
 */

export interface DocumentMetadata {
  id: string;
  title: string;
  type: string;
  createdAt?: Date;
  author?: string;
  [key: string]: any;
}

export interface Section {
  id: string;
  type: SectionType;
  level: number;
  title: string;
  content: string;
  startLine: number;
  endLine: number;
  children: Section[];
  parent?: Section;
}

export type SectionType =
  | 'chapter'      // CAPÍTULO
  | 'article'      // ARTÍCULO
  | 'section'      // SECCIÓN
  | 'paragraph'    // §
  | 'clause'       // CLÁUSULA
  | 'considering'  // CONSIDERANDO
  | 'resolves'     // RESUELVE
  | 'dispositions' // DISPOSICIONES
  | 'transitional' // DISPOSICIONES TRANSITORIAS
  | 'final'        // DISPOSICIÓN FINAL
  | 'derogatory'   // DISPOSICIÓN DEROGATORIA
  | 'preamble'     // PREÁMBULO
  | 'title'        // TÍTULO
  | 'subtitle';    // SUBTÍTULO

export interface DocumentStructure {
  title: string;
  sections: Section[];
  hierarchy: HierarchyNode[];
}

export interface HierarchyNode {
  section: Section;
  children: HierarchyNode[];
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  section: string;
  sectionType: SectionType | string;
  level: number;
  startChar: number;
  endChar: number;
  metadata: ChunkMetadata;
  embedding: number[] | null;
  importance: number;
  relationships: ChunkRelationship[];
}

export interface ChunkMetadata extends DocumentMetadata {
  chunkIndex: number;
  totalChunks: number;
  hasOverlap?: boolean;
  overlapWith?: string[];
}

export interface ChunkRelationship {
  type: RelationshipType;
  chunkId: string;
  strength?: number; // 0-1 score of relationship strength
}

export type RelationshipType =
  | 'previous'     // Sequential previous chunk
  | 'next'         // Sequential next chunk
  | 'parent'       // Parent section chunk
  | 'child'        // Child section chunk
  | 'sibling'      // Same level section chunk
  | 'citation'     // References another chunk
  | 'cited_by';    // Referenced by another chunk

export interface ChunkingOptions {
  maxChunkSize?: number;
  minChunkSize?: number;
  overlapSize?: number;
  preserveSectionBoundaries?: boolean;
  calculateImportance?: boolean;
}

export interface ImportanceFactors {
  sectionLevel: number;        // Weight: 0.3
  positionInDocument: number;  // Weight: 0.2
  citationCount: number;       // Weight: 0.3
  keywordDensity: number;      // Weight: 0.2
}

export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  maxChunkSize: 1500,
  minChunkSize: 100,
  overlapSize: 200,
  preserveSectionBoundaries: true,
  calculateImportance: true
};
