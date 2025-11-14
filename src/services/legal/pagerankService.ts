/**
 * PageRank Service for Legal Documents
 * Implements PageRank algorithm to calculate authority scores for legal documents
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PageRankConfig {
  dampingFactor?: number;
  maxIterations?: number;
  convergenceThreshold?: number;
}

export interface PageRankResult {
  documentsProcessed: number;
  iterationsRun: number;
  converged: boolean;
  avgPageRank: number;
  maxPageRank: number;
  minPageRank: number;
  processingTimeMs: number;
}

export class PageRankService {
  private dampingFactor: number;
  private maxIterations: number;
  private convergenceThreshold: number;

  constructor(config: PageRankConfig = {}) {
    this.dampingFactor = config.dampingFactor || 0.85;
    this.maxIterations = config.maxIterations || 100;
    this.convergenceThreshold = config.convergenceThreshold || 0.0001;
  }

  /**
   * Calculate PageRank for all documents
   */
  async calculatePageRank(): Promise<PageRankResult> {
    const startTime = Date.now();

    // Create log entry
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      // Get all documents with their citations
      const documents = await this.getDocumentGraph();
      const N = documents.length;

      if (N === 0) {
        throw new Error('No documents found to calculate PageRank');
      }

      // Initialize PageRank scores
      const pageRanks = new Map<string, number>();
      const newPageRanks = new Map<string, number>();

      // Set initial PageRank (1/N for each document)
      const initialRank = 1.0 / N;
      documents.forEach(doc => {
        pageRanks.set(doc.id, initialRank);
        newPageRanks.set(doc.id, initialRank);
      });

      // Build citation graph
      const outLinks = new Map<string, Set<string>>();
      const inLinks = new Map<string, Set<string>>();

      documents.forEach(doc => {
        outLinks.set(doc.id, new Set(doc.outgoingCitations));
        inLinks.set(doc.id, new Set(doc.incomingCitations));
      });

      // Iterative PageRank calculation
      let iteration = 0;
      let hasConverged = false;

      while (iteration < this.maxIterations && !hasConverged) {
        // Calculate new PageRank for each document
        documents.forEach(doc => {
          let rank = (1 - this.dampingFactor) / N;

          // Sum contributions from incoming links
          const incoming = inLinks.get(doc.id) || new Set();
          incoming.forEach(sourceId => {
            const sourceRank = pageRanks.get(sourceId) || 0;
            const sourceOutLinks = outLinks.get(sourceId)?.size || 1;
            rank += this.dampingFactor * (sourceRank / sourceOutLinks);
          });

          newPageRanks.set(doc.id, rank);
        });

        // Check for convergence
        let maxDiff = 0;
        documents.forEach(doc => {
          const oldRank = pageRanks.get(doc.id) || 0;
          const newRank = newPageRanks.get(doc.id) || 0;
          const diff = Math.abs(newRank - oldRank);
          maxDiff = Math.max(maxDiff, diff);
        });

        // Update pageRanks
        documents.forEach(doc => {
          pageRanks.set(doc.id, newPageRanks.get(doc.id) || 0);
        });

        iteration++;
        hasConverged = maxDiff < this.convergenceThreshold;
      }

      // Store results in database
      await this.storePageRankScores(pageRanks, outLinks, inLinks);

      // Calculate statistics
      const ranks = Array.from(pageRanks.values());
      const avgPageRank = ranks.reduce((a, b) => a + b, 0) / ranks.length;
      const maxPageRank = Math.max(...ranks);
      const minPageRank = Math.min(...ranks);

      const processingTimeMs = Date.now() - startTime;

      // Update log
      await prisma.pageRankCalculationLog.create({
        data: {
          id: logId,
          dampingFactor: this.dampingFactor,
          maxIterations: this.maxIterations,
          convergenceThreshold: this.convergenceThreshold,
          documentsProcessed: N,
          iterationsRun: iteration,
          converged: hasConverged,
          avgPagerank: avgPageRank,
          maxPagerank: maxPageRank,
          minPagerank: minPageRank,
          processingTimeMs,
          calculationMethod: 'iterative',
          startedAt: new Date(startTime),
          completedAt: new Date()
        }
      });

      return {
        documentsProcessed: N,
        iterationsRun: iteration,
        converged: hasConverged,
        avgPageRank,
        maxPageRank,
        minPageRank,
        processingTimeMs
      };

    } catch (error) {
      // Log failure
      await prisma.pageRankCalculationLog.create({
        data: {
          id: logId,
          dampingFactor: this.dampingFactor,
          maxIterations: this.maxIterations,
          convergenceThreshold: this.convergenceThreshold,
          documentsProcessed: 0,
          converged: false,
          startedAt: new Date(startTime),
          notes: `Failed: ${error}`
        }
      });

      throw error;
    }
  }

  /**
   * Get document citation graph
   */
  private async getDocumentGraph(): Promise<Array<{
    id: string;
    outgoingCitations: string[];
    incomingCitations: string[];
  }>> {
    const documents = await prisma.legalDocument.findMany({
      select: {
        id: true,
        sourceCitations: {
          select: {
            targetDocumentId: true,
            citationStrength: true
          }
        },
        targetCitations: {
          select: {
            sourceDocumentId: true
          }
        }
      }
    });

    return documents.map(doc => ({
      id: doc.id,
      outgoingCitations: doc.sourceCitations
        .filter(c => c.targetDocumentId !== null)
        .map(c => c.targetDocumentId as string),
      incomingCitations: doc.targetCitations
        .map(c => c.sourceDocumentId)
    }));
  }

  /**
   * Store PageRank scores in database
   */
  private async storePageRankScores(
    pageRanks: Map<string, number>,
    outLinks: Map<string, Set<string>>,
    inLinks: Map<string, Set<string>>
  ): Promise<void> {
    const updates = Array.from(pageRanks.entries()).map(([documentId, pagerank]) => {
      const citationOutCount = outLinks.get(documentId)?.size || 0;
      const citationInCount = inLinks.get(documentId)?.size || 0;
      const citationCount = citationOutCount + citationInCount;

      return prisma.documentAuthorityScore.upsert({
        where: { documentId },
        create: {
          id: `auth-${documentId}`,
          documentId,
          pagerankScore: pagerank,
          weightedPagerank: pagerank,
          citationCount,
          citationInCount,
          citationOutCount,
          hIndex: this.calculateHIndex(citationInCount),
          lastCalculated: new Date(),
          calculationVersion: '1.0',
          convergenceIterations: 0
        },
        update: {
          pagerankScore: pagerank,
          weightedPagerank: pagerank,
          citationCount,
          citationInCount,
          citationOutCount,
          hIndex: this.calculateHIndex(citationInCount),
          lastCalculated: new Date()
        }
      });
    });

    await Promise.all(updates);
  }

  /**
   * Calculate h-index (simplified version)
   */
  private calculateHIndex(citationCount: number): number {
    // Simplified: h-index is sqrt of citation count
    return Math.floor(Math.sqrt(citationCount));
  }

  /**
   * Get top documents by PageRank
   */
  async getTopDocuments(limit: number = 10): Promise<Array<{
    documentId: string;
    title: string;
    pagerankScore: number;
    citationCount: number;
  }>> {
    const scores = await prisma.documentAuthorityScore.findMany({
      take: limit,
      orderBy: {
        pagerankScore: 'desc'
      },
      include: {
        document: {
          select: {
            title: true
          }
        }
      }
    });

    return scores.map(score => ({
      documentId: score.documentId,
      title: score.document.title,
      pagerankScore: score.pagerankScore,
      citationCount: score.citationCount
    }));
  }

  /**
   * Get authority score for a specific document
   */
  async getDocumentAuthority(documentId: string) {
    return await prisma.documentAuthorityScore.findUnique({
      where: { documentId },
      include: {
        document: {
          select: {
            title: true,
            normType: true,
            hierarchy: true
          }
        }
      }
    });
  }
}
