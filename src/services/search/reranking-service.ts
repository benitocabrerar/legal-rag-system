/**
 * Re-Ranking Service
 * Combines multiple ranking signals to produce final document rankings:
 * - Semantic similarity (from embeddings)
 * - PageRank authority score
 * - User feedback (CTR + ratings)
 * - Document recency
 * - Legal hierarchy boost
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RerankingConfig {
  weights?: {
    semanticSimilarity?: number;  // Default: 0.4
    pageRankScore?: number;       // Default: 0.3
    userFeedback?: number;        // Default: 0.2
    recencyScore?: number;        // Default: 0.1
  };
  hierarchyBoosts?: Record<string, number>;
  decayRate?: number; // For recency scoring
}

export interface DocumentWithScores {
  id: string;
  title: string;
  normTitle?: string;
  legalHierarchy: string;
  publicationDate?: Date;

  // Individual scores
  semanticSimilarity?: number;
  pagerankScore?: number;
  userFeedbackScore?: number;
  recencyScore?: number;
  hierarchyBoost?: number;

  // Combined score
  finalScore: number;

  // Metadata
  viewCount?: number;
  clickThroughRate?: number;
  avgRating?: number;
  citationCount?: number;
}

export interface RerankingResult {
  documents: DocumentWithScores[];
  scoringBreakdown: {
    avgSemanticScore: number;
    avgPageRankScore: number;
    avgFeedbackScore: number;
    avgRecencyScore: number;
  };
  processingTimeMs: number;
}

/**
 * Default hierarchy boosts for Ecuadorian legal system
 */
const DEFAULT_HIERARCHY_BOOSTS: Record<string, number> = {
  'CONSTITUCION': 2.0,
  'TRATADOS_INTERNACIONALES': 1.8,
  'LEYES_ORGANICAS': 1.6,
  'LEYES_ORDINARIAS': 1.4,
  'CODIGOS_ORGANICOS': 1.5,
  'CODIGOS_ESPECIALIZADOS': 1.3,
  'DECRETOS_LEY': 1.2,
  'DECRETOS_EJECUTIVOS': 1.1,
  'REGLAMENTOS': 1.0,
  'ACUERDOS': 1.0,
  'RESOLUCIONES': 0.9,
  'ORDENANZAS': 0.9,
  'JURISPRUDENCIA_OBLIGATORIA': 1.7,
  'JURISPRUDENCIA_REFERENCIAL': 1.2
};

export class RerankingService {
  private config: Required<Omit<RerankingConfig, 'hierarchyBoosts'>> & Pick<RerankingConfig, 'hierarchyBoosts'>;

  constructor(config: RerankingConfig = {}) {
    this.config = {
      weights: {
        semanticSimilarity: config.weights?.semanticSimilarity ?? 0.4,
        pageRankScore: config.weights?.pageRankScore ?? 0.3,
        userFeedback: config.weights?.userFeedback ?? 0.2,
        recencyScore: config.weights?.recencyScore ?? 0.1
      },
      hierarchyBoosts: config.hierarchyBoosts,
      decayRate: config.decayRate ?? 0.1 // 10% decay per year
    };
  }

  /**
   * Re-rank documents based on multiple signals
   */
  async rerankDocuments(
    documents: Array<{
      id: string;
      semanticSimilarity?: number;
      [key: string]: any;
    }>
  ): Promise<RerankingResult> {
    const startTime = Date.now();

    // Fetch additional scoring data for all documents
    const enrichedDocs = await this.enrichDocuments(documents);

    // Calculate individual scores
    const scoredDocs = enrichedDocs.map(doc => this.calculateFinalScore(doc));

    // Sort by final score (descending)
    const sorted = scoredDocs.sort((a, b) => b.finalScore - a.finalScore);

    // Calculate scoring breakdown
    const scoringBreakdown = this.calculateScoringBreakdown(sorted);

    const processingTimeMs = Date.now() - startTime;

    return {
      documents: sorted,
      scoringBreakdown,
      processingTimeMs
    };
  }

  /**
   * Enrich documents with additional scoring data
   */
  private async enrichDocuments(
    documents: Array<{ id: string; semanticSimilarity?: number; [key: string]: any }>
  ): Promise<any[]> {
    const documentIds = documents.map(d => d.id);

    // Fetch document data
    const docsData = await prisma.legalDocument.findMany({
      where: { id: { in: documentIds } },
      select: {
        id: true,
        title: true,
        normTitle: true,
        legalHierarchy: true,
        publicationDate: true,
        viewCount: true,

        // For now, we'll calculate these values differently since Phase 7 tables aren't fully integrated
        // TODO: Add proper relations when Phase 7 feedback tables are linked to LegalDocument
      }
    });

    // Merge with original documents
    return documents.map(doc => {
      const dbDoc = docsData.find(d => d.id === doc.id);
      if (!dbDoc) return doc;

      // TODO: When Phase 7 feedback is fully integrated, fetch actual CTR and ratings
      // For now, use view count as proxy for engagement
      const clickThroughRate = 0; // Placeholder
      const avgRating = 0; // Placeholder

      return {
        ...doc,
        title: dbDoc.title,
        normTitle: dbDoc.normTitle,
        legalHierarchy: dbDoc.legalHierarchy,
        publicationDate: dbDoc.publicationDate,
        viewCount: dbDoc.viewCount,
        pagerankScore: 0, // TODO: Get from AuthorityScore table when Phase 8 is integrated
        citationCount: 0, // TODO: Get from CitationGraph when Phase 8 is integrated
        clickThroughRate,
        avgRating
      };
    });
  }

  /**
   * Calculate final score for a document
   */
  private calculateFinalScore(doc: any): DocumentWithScores {
    // 1. Semantic Similarity (0-1, already provided)
    const semanticScore = doc.semanticSimilarity ?? 0;

    // 2. PageRank Score (normalize 0-1)
    const rawPageRank = doc.pagerankScore ?? 0;
    const normalizedPageRank = this.normalizePageRank(rawPageRank);

    // 3. User Feedback Score (combination of CTR and ratings)
    const feedbackScore = this.calculateFeedbackScore(
      doc.clickThroughRate ?? 0,
      doc.avgRating ?? 0
    );

    // 4. Recency Score (time decay)
    const recencyScore = this.calculateRecencyScore(doc.publicationDate);

    // 5. Hierarchy Boost
    const hierarchyBoost = this.getHierarchyBoost(doc.legalHierarchy);

    // Calculate weighted sum
    const baseScore =
      this.config.weights.semanticSimilarity * semanticScore +
      this.config.weights.pageRankScore * normalizedPageRank +
      this.config.weights.userFeedback * feedbackScore +
      this.config.weights.recencyScore * recencyScore;

    // Apply hierarchy boost (multiplicative)
    const finalScore = baseScore * hierarchyBoost;

    return {
      id: doc.id,
      title: doc.title,
      normTitle: doc.normTitle,
      legalHierarchy: doc.legalHierarchy,
      publicationDate: doc.publicationDate,

      semanticSimilarity: semanticScore,
      pagerankScore: normalizedPageRank,
      userFeedbackScore: feedbackScore,
      recencyScore,
      hierarchyBoost,

      finalScore,

      viewCount: doc.viewCount,
      clickThroughRate: doc.clickThroughRate,
      avgRating: doc.avgRating,
      citationCount: doc.citationCount
    };
  }

  /**
   * Normalize PageRank score to 0-1 range
   * Typical PageRank values are very small (e.g., 0.0001 to 0.01)
   */
  private normalizePageRank(rawScore: number): number {
    // Assume max PageRank in system is around 0.05
    // This can be adjusted based on actual data
    const maxExpectedPageRank = 0.05;
    return Math.min(rawScore / maxExpectedPageRank, 1.0);
  }

  /**
   * Calculate user feedback score
   * Combines CTR and average rating
   */
  private calculateFeedbackScore(ctr: number, avgRating: number): number {
    // CTR is already 0-1
    // Rating is 1-5, normalize to 0-1
    const normalizedRating = avgRating > 0 ? (avgRating - 1) / 4 : 0;

    // Weighted average (CTR 60%, Rating 40%)
    return ctr * 0.6 + normalizedRating * 0.4;
  }

  /**
   * Calculate recency score with exponential decay
   */
  private calculateRecencyScore(publicationDate: Date | null | undefined): number {
    if (!publicationDate) {
      // If no date, assume old document (50% score)
      return 0.5;
    }

    const now = new Date();
    const ageInYears = (now.getTime() - publicationDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    // Exponential decay: score = e^(-decay_rate * age)
    const score = Math.exp(-this.config.decayRate * ageInYears);

    return Math.max(score, 0.1); // Minimum score of 0.1
  }

  /**
   * Get hierarchy boost multiplier
   */
  private getHierarchyBoost(hierarchy: string): number {
    const boosts = this.config.hierarchyBoosts || DEFAULT_HIERARCHY_BOOSTS;
    return boosts[hierarchy] || 1.0;
  }

  /**
   * Calculate average scores for analysis
   */
  private calculateScoringBreakdown(docs: DocumentWithScores[]): RerankingResult['scoringBreakdown'] {
    if (docs.length === 0) {
      return {
        avgSemanticScore: 0,
        avgPageRankScore: 0,
        avgFeedbackScore: 0,
        avgRecencyScore: 0
      };
    }

    const sum = docs.reduce((acc, doc) => ({
      semantic: acc.semantic + (doc.semanticSimilarity ?? 0),
      pagerank: acc.pagerank + (doc.pagerankScore ?? 0),
      feedback: acc.feedback + (doc.userFeedbackScore ?? 0),
      recency: acc.recency + (doc.recencyScore ?? 0)
    }), { semantic: 0, pagerank: 0, feedback: 0, recency: 0 });

    const count = docs.length;

    return {
      avgSemanticScore: sum.semantic / count,
      avgPageRankScore: sum.pagerank / count,
      avgFeedbackScore: sum.feedback / count,
      avgRecencyScore: sum.recency / count
    };
  }

  /**
   * Update weights dynamically based on query type
   */
  adjustWeightsForQueryType(queryType: 'general' | 'recent' | 'authoritative' | 'popular'): void {
    switch (queryType) {
      case 'recent':
        // Prioritize recency
        this.config.weights.semanticSimilarity = 0.3;
        this.config.weights.pageRankScore = 0.2;
        this.config.weights.userFeedback = 0.1;
        this.config.weights.recencyScore = 0.4;
        break;

      case 'authoritative':
        // Prioritize PageRank
        this.config.weights.semanticSimilarity = 0.3;
        this.config.weights.pageRankScore = 0.5;
        this.config.weights.userFeedback = 0.1;
        this.config.weights.recencyScore = 0.1;
        break;

      case 'popular':
        // Prioritize user feedback
        this.config.weights.semanticSimilarity = 0.3;
        this.config.weights.pageRankScore = 0.2;
        this.config.weights.userFeedback = 0.4;
        this.config.weights.recencyScore = 0.1;
        break;

      case 'general':
      default:
        // Balanced weights
        this.config.weights.semanticSimilarity = 0.4;
        this.config.weights.pageRankScore = 0.3;
        this.config.weights.userFeedback = 0.2;
        this.config.weights.recencyScore = 0.1;
        break;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): RerankingConfig {
    return {
      weights: { ...this.config.weights },
      hierarchyBoosts: this.config.hierarchyBoosts,
      decayRate: this.config.decayRate
    };
  }
}

// Export singleton instance with default config
export const rerankingService = new RerankingService();
