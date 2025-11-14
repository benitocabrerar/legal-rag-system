/**
 * Enhanced Relevance Scorer
 * Multi-factor document scoring for RAG Legal System (Ecuador)
 */

import {
  ScoringWeights,
  ScoreBreakdown,
  QueryFeatures,
  SearchContext,
  ScoredDocument,
  DocumentMetadata,
  TFIDFResult,
  BM25Params,
  BM25Result,
  DocumentStats,
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_BM25_PARAMS,
  ECUADORIAN_SOURCE_AUTHORITY,
  LEGAL_AREA_WEIGHTS
} from './scoringTypes';
import { EmbeddingService } from '../embeddings/embedding-service';

export class EnhancedRelevanceScorer {
  private weights: ScoringWeights;
  private bm25Params: BM25Params;
  private documentStats: DocumentStats | null = null;
  private embeddingService: EmbeddingService;

  constructor(
    weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
    bm25Params: BM25Params = DEFAULT_BM25_PARAMS,
    embeddingService?: EmbeddingService
  ) {
    this.weights = weights;
    this.bm25Params = bm25Params;
    this.embeddingService = embeddingService || new EmbeddingService();
  }

  /**
   * Initialize document statistics for TF-IDF and BM25
   */
  async initializeStats(documents: Array<{ id: string; content: string }>): Promise<void> {
    const totalDocuments = documents.length;
    const documentLengths = new Map<string, number>();
    const termDocumentFrequencies = new Map<string, number>();

    let totalLength = 0;

    for (const doc of documents) {
      const terms = this.tokenize(doc.content);
      const docLength = terms.length;

      documentLengths.set(doc.id, docLength);
      totalLength += docLength;

      // Count unique terms per document
      const uniqueTerms = new Set(terms);
      for (const term of uniqueTerms) {
        termDocumentFrequencies.set(
          term,
          (termDocumentFrequencies.get(term) || 0) + 1
        );
      }
    }

    this.documentStats = {
      totalDocuments,
      averageDocumentLength: totalLength / totalDocuments,
      documentLengths,
      termDocumentFrequencies
    };
  }

  /**
   * Score multiple documents against a query
   */
  async scoreDocuments(
    query: string,
    documents: Array<{ id: string; content: string; metadata: DocumentMetadata }>,
    context: SearchContext
  ): Promise<ScoredDocument[]> {
    // Extract query features
    const queryFeatures = await this.extractQueryFeatures(query);

    // Score each document
    const scoredDocs: ScoredDocument[] = [];

    for (const doc of documents) {
      const scores = await this.computeAllScores(doc, queryFeatures, context);
      const finalScore = this.combineScores(scores);

      scoredDocs.push({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
        relevanceScore: finalScore,
        scoreBreakdown: scores,
        explanation: this.generateExplanation(scores)
      });
    }

    // Apply re-ranking if enabled
    return this.rerank(scoredDocs, context);
  }

  /**
   * Extract features from query
   * Phase 6: Now generates real embeddings for the query
   */
  private async extractQueryFeatures(query: string): Promise<QueryFeatures> {
    const terms = this.tokenize(query);
    const phrases = this.extractPhrases(query);

    // Calculate IDF scores for query terms
    const idfScores = new Map<string, number>();
    if (this.documentStats) {
      for (const term of terms) {
        idfScores.set(term, this.calculateIDF(term));
      }
    }

    // Generate embedding for query
    let embedding: number[] | null = null;
    try {
      const embeddingResult = await this.embeddingService.embed(query);
      embedding = embeddingResult.embedding;
      console.log(`[EnhancedRelevanceScorer] Generated query embedding with ${embeddingResult.dimensions} dimensions`);
    } catch (error) {
      console.error('[EnhancedRelevanceScorer] Failed to generate query embedding:', error);
      // Continue without embedding - will fall back to Jaccard similarity
    }

    return {
      rawQuery: query,
      terms,
      phrases,
      idfScores,
      embedding, // Now populated with real embedding
      documentTypes: this.extractDocumentTypes(query),
      dateRange: this.extractDateRange(query),
      jurisdiction: this.extractJurisdiction(query),
      legalAreas: this.extractLegalAreas(query)
    };
  }

  /**
   * Compute all scoring factors for a document
   */
  private async computeAllScores(
    doc: { id: string; content: string; metadata: DocumentMetadata; embedding?: number[] | null },
    queryFeatures: QueryFeatures,
    context: SearchContext
  ): Promise<ScoreBreakdown> {
    return {
      semantic: await this.computeSemanticScore(doc, queryFeatures),
      keyword: this.computeKeywordScore(doc, queryFeatures),
      metadata: this.computeMetadataScore(doc, queryFeatures),
      recency: this.computeRecencyScore(doc, context),
      authority: this.computeAuthorityScore(doc)
    };
  }

  /**
   * Semantic similarity score using embeddings
   * Phase 6: Now uses real OpenAI embeddings instead of Jaccard similarity
   */
  private async computeSemanticScore(
    doc: { id: string; content: string; embedding?: number[] | null },
    queryFeatures: QueryFeatures
  ): Promise<number> {
    try {
      // If query has embedding and document has embedding, use cosine similarity
      if (queryFeatures.embedding && doc.embedding) {
        const similarity = this.embeddingService.cosineSimilarity(
          queryFeatures.embedding,
          doc.embedding
        );

        // Cosine similarity is already in [-1, 1], normalize to [0, 1]
        return (similarity + 1) / 2;
      }

      // Fallback: If embeddings not available, generate them on-the-fly
      if (queryFeatures.embedding && !doc.embedding) {
        const docEmbedding = await this.embeddingService.embed(doc.content);
        const similarity = this.embeddingService.cosineSimilarity(
          queryFeatures.embedding,
          docEmbedding.embedding
        );
        return (similarity + 1) / 2;
      }

      // Fallback to Jaccard similarity if no embeddings available
      console.warn('[EnhancedRelevanceScorer] No embeddings available, falling back to Jaccard similarity');
      const docTerms = new Set(this.tokenize(doc.content));
      const queryTerms = new Set(queryFeatures.terms);

      const intersection = new Set([...queryTerms].filter(t => docTerms.has(t)));
      const union = new Set([...queryTerms, ...docTerms]);

      const jaccardSimilarity = intersection.size / union.size;

      // Apply transformation for better distribution
      return Math.pow(jaccardSimilarity, 0.5);
    } catch (error) {
      console.error('[EnhancedRelevanceScorer] Error computing semantic score:', error);
      // Fallback to Jaccard on error
      const docTerms = new Set(this.tokenize(doc.content));
      const queryTerms = new Set(queryFeatures.terms);
      const intersection = new Set([...queryTerms].filter(t => docTerms.has(t)));
      const union = new Set([...queryTerms, ...docTerms]);
      return Math.pow(intersection.size / union.size, 0.5);
    }
  }

  /**
   * Keyword matching score using BM25
   */
  private computeKeywordScore(
    doc: { id: string; content: string; metadata: DocumentMetadata },
    queryFeatures: QueryFeatures
  ): number {
    if (!this.documentStats) {
      // Fallback to simple TF-IDF if stats not initialized
      return this.computeTFIDFScore(doc, queryFeatures);
    }

    return this.computeBM25Score(doc, queryFeatures);
  }

  /**
   * TF-IDF scoring
   */
  private computeTFIDFScore(
    doc: { id: string; content: string },
    queryFeatures: QueryFeatures
  ): number {
    // Handle empty query
    if (queryFeatures.terms.length === 0) {
      return 0;
    }

    let score = 0;
    const docText = doc.content.toLowerCase();

    for (const term of queryFeatures.terms) {
      const tf = this.termFrequency(term, docText);
      const idf = queryFeatures.idfScores.get(term) || 1;
      score += tf * idf;
    }

    // Normalize by query length
    return Math.min(1.0, score / queryFeatures.terms.length);
  }

  /**
   * BM25 scoring
   */
  private computeBM25Score(
    doc: { id: string; content: string },
    queryFeatures: QueryFeatures
  ): number {
    if (!this.documentStats) return 0;

    const docLength = this.documentStats.documentLengths.get(doc.id) || 0;
    const avgDocLength = this.documentStats.averageDocumentLength;
    const k1 = this.bm25Params.k1;
    const b = this.bm25Params.b;

    let bm25Score = 0;
    const docText = doc.content.toLowerCase();

    for (const term of queryFeatures.terms) {
      const tf = this.termFrequency(term, docText);
      const idf = this.calculateIDF(term);

      // BM25 formula
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));

      bm25Score += idf * (numerator / denominator);
    }

    // Normalize to 0-1 range
    return Math.min(1.0, bm25Score / (queryFeatures.terms.length * 10));
  }

  /**
   * Metadata-based scoring
   */
  private computeMetadataScore(
    doc: { metadata: DocumentMetadata },
    queryFeatures: QueryFeatures
  ): number {
    let score = 0;

    // Document type match
    if (queryFeatures.documentTypes.length > 0) {
      if (queryFeatures.documentTypes.includes(doc.metadata.type)) {
        score += 0.3;
      }
    }

    // Date range match
    if (queryFeatures.dateRange) {
      const docDate = new Date(doc.metadata.date);
      if (docDate >= queryFeatures.dateRange.start &&
          docDate <= queryFeatures.dateRange.end) {
        score += 0.2;
      }
    }

    // Jurisdiction match
    if (queryFeatures.jurisdiction &&
        doc.metadata.jurisdiction === queryFeatures.jurisdiction) {
      score += 0.2;
    }

    // Legal area match
    if (queryFeatures.legalAreas.length > 0) {
      if (queryFeatures.legalAreas.includes(doc.metadata.legal_area)) {
        const weight = LEGAL_AREA_WEIGHTS[doc.metadata.legal_area] || 0.5;
        score += 0.3 * weight;
      }
    }

    // Keyword overlap
    const docKeywords = new Set(doc.metadata.keywords.map(k => k.toLowerCase()));
    const queryTerms = new Set(queryFeatures.terms);
    const keywordOverlap = [...queryTerms].filter(t => docKeywords.has(t)).length;

    if (queryTerms.size > 0) {
      score += (keywordOverlap / queryTerms.size) * 0.2;
    }

    return Math.min(1.0, score);
  }

  /**
   * Recency-based scoring
   */
  private computeRecencyScore(
    doc: { metadata: DocumentMetadata },
    context: SearchContext
  ): number {
    if (!context.preferRecent) return 0.5; // Neutral score

    const docDate = new Date(doc.metadata.date);
    const now = new Date();
    const daysSince = (now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24);

    // Exponential decay: score decreases by half every year
    return Math.exp(-daysSince / 365);
  }

  /**
   * Authority-based scoring
   */
  private computeAuthorityScore(doc: { metadata: DocumentMetadata }): number {
    let score = 0.5; // Base score

    // Citation count (incoming citations = authority)
    const citationCount = doc.metadata.cited_by?.length || 0;
    const citationScore = Math.min(0.3, citationCount * 0.05);
    score += citationScore;

    // Source authority for Ecuadorian legal system
    const sourceAuthority = ECUADORIAN_SOURCE_AUTHORITY[doc.metadata.source_type] ||
                           ECUADORIAN_SOURCE_AUTHORITY['other'];

    // Combine citation authority with source authority
    score = score * 0.6 + sourceAuthority * 0.4;

    return score;
  }

  /**
   * Combine individual scores using weighted sum
   */
  private combineScores(scores: ScoreBreakdown): number {
    let finalScore = 0;

    finalScore += scores.semantic * this.weights.semantic;
    finalScore += scores.keyword * this.weights.keyword;
    finalScore += scores.metadata * this.weights.metadata;
    finalScore += scores.recency * this.weights.recency;
    finalScore += scores.authority * this.weights.authority;

    // Apply sigmoid transformation for better distribution
    return this.sigmoid(finalScore * 5 - 2.5);
  }

  /**
   * Re-rank documents based on context
   */
  private rerank(
    documents: ScoredDocument[],
    context: SearchContext
  ): ScoredDocument[] {
    // Initial sort by relevance score
    documents.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply diversity re-ranking
    if (context.enableDiversity) {
      return this.diversifyResults(documents);
    }

    // Apply MMR if enabled
    if (context.enableMMR) {
      return this.applyMMR(documents, 0.7);
    }

    return documents;
  }

  /**
   * Diversify results to avoid redundancy
   */
  private diversifyResults(documents: ScoredDocument[]): ScoredDocument[] {
    const diversified: ScoredDocument[] = [];
    const usedTypes = new Set<string>();
    const usedJurisdictions = new Set<string>();
    const usedLegalAreas = new Set<string>();

    for (const doc of documents) {
      const type = doc.metadata.type;
      const jurisdiction = doc.metadata.jurisdiction;
      const legalArea = doc.metadata.legal_area;

      // Calculate diversity penalty
      let diversityPenalty = 0;

      if (usedTypes.has(type)) diversityPenalty += 0.1;
      if (usedJurisdictions.has(jurisdiction)) diversityPenalty += 0.05;
      if (usedLegalAreas.has(legalArea)) diversityPenalty += 0.05;

      // Apply penalty
      doc.relevanceScore *= (1 - Math.min(0.3, diversityPenalty));

      diversified.push(doc);
      usedTypes.add(type);
      usedJurisdictions.add(jurisdiction);
      usedLegalAreas.add(legalArea);
    }

    // Re-sort after diversity adjustments
    diversified.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return diversified;
  }

  /**
   * Apply Maximal Marginal Relevance (MMR) re-ranking
   */
  private applyMMR(
    documents: ScoredDocument[],
    lambda: number = 0.7
  ): ScoredDocument[] {
    if (documents.length === 0) return [];

    const selected: ScoredDocument[] = [];
    const remaining = [...documents];

    // Select first document (highest relevance)
    selected.push(remaining.shift()!);

    while (remaining.length > 0 && selected.length < 20) {
      let bestScore = -Infinity;
      let bestIndex = -1;

      for (let i = 0; i < remaining.length; i++) {
        const doc = remaining[i];

        // Relevance to query
        const relevance = doc.relevanceScore;

        // Maximum similarity to already selected documents
        let maxSim = 0;
        for (const selectedDoc of selected) {
          const sim = this.documentSimilarity(doc, selectedDoc);
          maxSim = Math.max(maxSim, sim);
        }

        // MMR score balances relevance and diversity
        const mmrScore = lambda * relevance - (1 - lambda) * maxSim;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      if (bestIndex >= 0) {
        selected.push(...remaining.splice(bestIndex, 1));
      } else {
        break;
      }
    }

    return selected;
  }

  /**
   * Calculate similarity between two documents (simplified)
   */
  private documentSimilarity(doc1: ScoredDocument, doc2: ScoredDocument): number {
    // Simple overlap-based similarity
    const terms1 = new Set(this.tokenize(doc1.content));
    const terms2 = new Set(this.tokenize(doc2.content));

    const intersection = new Set([...terms1].filter(t => terms2.has(t)));
    const union = new Set([...terms1, ...terms2]);

    return intersection.size / union.size;
  }

  /**
   * Generate human-readable explanation of score
   */
  private generateExplanation(scores: ScoreBreakdown): string {
    const parts: string[] = [];

    // Mention all non-zero scoring factors
    if (scores.semantic > 0.7) parts.push('Alta similitud semántica');
    else if (scores.semantic > 0.3) parts.push('Similitud semántica moderada');

    if (scores.keyword > 0.7) parts.push('Coincidencia fuerte de palabras clave');
    else if (scores.keyword > 0.3) parts.push('Coincidencia de palabras clave');
    else if (scores.keyword > 0) parts.push('Coincidencia parcial de palabras clave');

    if (scores.metadata > 0.7) parts.push('Metadatos muy relevantes');
    else if (scores.metadata > 0.3) parts.push('Metadatos relevantes');

    if (scores.recency > 0.7) parts.push('Documento muy reciente');
    else if (scores.recency > 0.3) parts.push('Documento reciente');

    if (scores.authority > 0.7) parts.push('Fuente de alta autoridad');
    else if (scores.authority > 0.3) parts.push('Fuente de autoridad moderada');

    return parts.length > 0 ? parts.join(', ') : 'Relevancia moderada';
  }

  // === HELPER FUNCTIONS ===

  /**
   * Tokenize text into terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2); // Filter short terms
  }

  /**
   * Extract multi-word phrases from query
   */
  private extractPhrases(query: string): string[] {
    const phrases: string[] = [];
    const matches = query.match(/"([^"]+)"/g);

    if (matches) {
      for (const match of matches) {
        phrases.push(match.replace(/"/g, '').toLowerCase());
      }
    }

    return phrases;
  }

  /**
   * Calculate term frequency in document
   */
  private termFrequency(term: string, text: string): number {
    const terms = this.tokenize(text);
    const count = terms.filter(t => t === term.toLowerCase()).length;
    return count / (terms.length || 1);
  }

  /**
   * Calculate inverse document frequency
   */
  private calculateIDF(term: string): number {
    if (!this.documentStats) return 1;

    const docFreq = this.documentStats.termDocumentFrequencies.get(term) || 0;

    if (docFreq === 0) return 0;

    return Math.log((this.documentStats.totalDocuments + 1) / (docFreq + 1)) + 1;
  }

  /**
   * Sigmoid function for score normalization
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Extract document types from query (simple pattern matching)
   */
  private extractDocumentTypes(query: string): string[] {
    const types: string[] = [];
    const lowerQuery = query.toLowerCase();

    const typePatterns: Record<string, string> = {
      'ley': 'law',
      'decreto': 'decree',
      'resolución': 'resolution',
      'sentencia': 'ruling',
      'acuerdo': 'agreement',
      'ordenanza': 'ordinance'
    };

    for (const [pattern, type] of Object.entries(typePatterns)) {
      if (lowerQuery.includes(pattern)) {
        types.push(type);
      }
    }

    return types;
  }

  /**
   * Extract date range from query (simple pattern matching)
   */
  private extractDateRange(query: string): { start: Date; end: Date } | undefined {
    // Pattern: "desde YYYY hasta YYYY" or "año YYYY"
    const yearMatch = query.match(/año\s+(\d{4})/i);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31)
      };
    }

    const rangeMatch = query.match(/desde\s+(\d{4})\s+hasta\s+(\d{4})/i);
    if (rangeMatch) {
      return {
        start: new Date(parseInt(rangeMatch[1]), 0, 1),
        end: new Date(parseInt(rangeMatch[2]), 11, 31)
      };
    }

    return undefined;
  }

  /**
   * Extract jurisdiction from query
   */
  private extractJurisdiction(query: string): string | undefined {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('nacional')) return 'national';
    if (lowerQuery.includes('provincial')) return 'provincial';
    if (lowerQuery.includes('municipal')) return 'municipal';

    return undefined;
  }

  /**
   * Extract legal areas from query
   */
  private extractLegalAreas(query: string): string[] {
    const areas: string[] = [];
    const lowerQuery = query.toLowerCase();

    const areaPatterns: Record<string, string> = {
      'constitucional': 'constitutional',
      'penal': 'criminal',
      'civil': 'civil',
      'administrativo': 'administrative',
      'laboral': 'labor',
      'tributario': 'tax',
      'comercial': 'commercial',
      'ambiental': 'environmental',
      'familia': 'family'
    };

    for (const [pattern, area] of Object.entries(areaPatterns)) {
      if (lowerQuery.includes(pattern)) {
        areas.push(area);
      }
    }

    return areas;
  }
}
