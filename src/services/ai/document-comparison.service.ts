/**
 * Document Comparison Service
 *
 * Compares legal documents using structural and semantic analysis.
 * Features:
 * - Full document comparison
 * - Similar document discovery
 * - Change detection (additions, deletions, modifications)
 * - AI-generated comparison summaries
 */

import { PrismaClient } from '@prisma/client';
import { prisma as prismaClient } from '../../lib/prisma.js';
import { OpenAI } from 'openai';
import * as crypto from 'crypto';

// Types
interface DocumentSection {
  type: string;
  number: string;
  title: string;
  content: string;
  embedding?: number[];
}

interface StructuralComparison {
  commonSections: string[];
  uniqueToA: string[];
  uniqueToB: string[];
  sectionSimilarities: SectionSimilarity[];
}

interface SectionSimilarity {
  sectionA: string;
  sectionB: string;
  similarity: number;
  changes: ContentChange[];
}

interface ContentChange {
  type: 'addition' | 'deletion' | 'modification';
  location: string;
  contentA?: string;
  contentB?: string;
  description: string;
}

interface SemanticComparison {
  overallSimilarity: number;
  conceptualSimilarity: number;
  terminologySimilarity: number;
  legalIntentSimilarity: number;
  keyConceptsA: string[];
  keyConceptsB: string[];
  sharedConcepts: string[];
}

interface DocumentComparison {
  id: string;
  documentAId: string;
  documentBId: string;
  documentATile: string;
  documentBTitle: string;
  structuralComparison: StructuralComparison;
  semanticComparison: SemanticComparison;
  changes: ContentChange[];
  summary: string;
  detailedAnalysis: string;
  createdAt: Date;
}

interface SimilarDocument {
  documentId: string;
  title: string;
  normType: string;
  similarity: number;
  matchingConcepts: string[];
  relationship: 'related' | 'supersedes' | 'superseded_by' | 'amends' | 'similar';
}

export class DocumentComparisonService {
  private prisma: PrismaClient;
  private openai: OpenAI;
  private embeddingModel = 'text-embedding-3-small';

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || prismaClient;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000'),
      maxRetries: parseInt(process.env.OPENAI_RETRY_ATTEMPTS || '3'),
    });
  }

  /**
   * Compare two documents comprehensively
   */
  async compareDocuments(docAId: string, docBId: string): Promise<DocumentComparison> {
    const startTime = Date.now();

    try {
      // Fetch both documents with their structure
      const [docA, docB] = await Promise.all([
        this.prisma.legalDocument.findUnique({
          where: { id: docAId },
          include: {
            sections: true,
            articles: true,
            summaries: { where: { summaryType: 'executive' }, take: 1 }
          }
        }),
        this.prisma.legalDocument.findUnique({
          where: { id: docBId },
          include: {
            sections: true,
            articles: true,
            summaries: { where: { summaryType: 'executive' }, take: 1 }
          }
        })
      ]);

      if (!docA) throw new Error(`Document A not found: ${docAId}`);
      if (!docB) throw new Error(`Document B not found: ${docBId}`);

      // Perform structural comparison
      const structuralComparison = await this.compareStructure(docA, docB);

      // Perform semantic comparison
      const semanticComparison = await this.compareSemantics(docA, docB);

      // Detect content changes
      const changes = await this.detectChanges(docA, docB, structuralComparison);

      // Generate AI summary
      const { summary, detailedAnalysis } = await this.generateComparisonSummary(
        docA,
        docB,
        structuralComparison,
        semanticComparison,
        changes
      );

      const comparisonId = crypto.randomUUID();
      const comparison: DocumentComparison = {
        id: comparisonId,
        documentAId: docAId,
        documentBId: docBId,
        documentATile: docA.normTitle,
        documentBTitle: docB.normTitle,
        structuralComparison,
        semanticComparison,
        changes,
        summary,
        detailedAnalysis,
        createdAt: new Date()
      };

      // Store comparison result
      await this.storeComparison(comparison);

      const processingTime = Date.now() - startTime;
      console.log(`Document comparison completed in ${processingTime}ms`);

      return comparison;
    } catch (error) {
      console.error('Error comparing documents:', error);
      throw error;
    }
  }

  /**
   * Find similar documents to a given document
   */
  async findSimilarDocuments(
    documentId: string,
    threshold: number = 0.6,
    limit: number = 10
  ): Promise<SimilarDocument[]> {
    try {
      // Fetch source document
      const sourceDoc = await this.prisma.legalDocument.findUnique({
        where: { id: documentId },
        include: {
          summaries: { where: { summaryType: 'executive' }, take: 1 },
          chunks: { take: 5 }
        }
      });

      if (!sourceDoc) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Generate embedding for source document
      const sourceText = sourceDoc.summaries[0]?.summaryText ||
        sourceDoc.content.substring(0, 4000);
      const sourceEmbedding = await this.generateEmbedding(sourceText);

      // Get candidate documents
      const candidates = await this.prisma.legalDocument.findMany({
        where: {
          id: { not: documentId },
          isActive: true
        },
        include: {
          summaries: { where: { summaryType: 'executive' }, take: 1 },
          chunks: { take: 5 }
        },
        take: 100
      });

      // Calculate similarities
      const similarities: SimilarDocument[] = [];

      for (const candidate of candidates) {
        const candidateText = candidate.summaries[0]?.summaryText ||
          candidate.content.substring(0, 4000);
        const candidateEmbedding = await this.generateEmbedding(candidateText);
        const similarity = this.cosineSimilarity(sourceEmbedding, candidateEmbedding);

        if (similarity >= threshold) {
          const matchingConcepts = this.findMatchingConcepts(
            sourceDoc.content,
            candidate.content
          );

          const relationship = this.determineRelationship(sourceDoc, candidate, similarity);

          similarities.push({
            documentId: candidate.id,
            title: candidate.normTitle,
            normType: candidate.normType,
            similarity,
            matchingConcepts,
            relationship
          });
        }
      }

      // Sort by similarity and limit results
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Error finding similar documents:', error);
      throw error;
    }
  }

  /**
   * Get comparison by ID
   */
  async getComparison(comparisonId: string): Promise<DocumentComparison | null> {
    const metric = await this.prisma.systemMetric.findFirst({
      where: {
        metricName: 'document_comparison',
        metadata: {
          path: ['id'],
          equals: comparisonId
        }
      }
    });

    return metric?.metadata as DocumentComparison | null;
  }

  // Private helper methods

  /**
   * Compare document structures
   */
  private async compareStructure(docA: any, docB: any): Promise<StructuralComparison> {
    // Extract sections from both documents
    const sectionsA = this.extractSections(docA);
    const sectionsB = this.extractSections(docB);

    const sectionNamesA = new Set(sectionsA.map(s => `${s.type}_${s.number}`));
    const sectionNamesB = new Set(sectionsB.map(s => `${s.type}_${s.number}`));

    // Find common and unique sections
    const commonSections: string[] = [];
    const uniqueToA: string[] = [];
    const uniqueToB: string[] = [];

    sectionNamesA.forEach(name => {
      if (sectionNamesB.has(name)) {
        commonSections.push(name);
      } else {
        uniqueToA.push(name);
      }
    });

    sectionNamesB.forEach(name => {
      if (!sectionNamesA.has(name)) {
        uniqueToB.push(name);
      }
    });

    // Calculate section-level similarities
    const sectionSimilarities: SectionSimilarity[] = [];

    for (const sectionA of sectionsA) {
      for (const sectionB of sectionsB) {
        if (sectionA.type === sectionB.type) {
          const similarity = await this.calculateTextSimilarity(
            sectionA.content,
            sectionB.content
          );

          if (similarity > 0.3) {
            const changes = this.detectSectionChanges(sectionA, sectionB);
            sectionSimilarities.push({
              sectionA: `${sectionA.type}_${sectionA.number}`,
              sectionB: `${sectionB.type}_${sectionB.number}`,
              similarity,
              changes
            });
          }
        }
      }
    }

    return {
      commonSections,
      uniqueToA,
      uniqueToB,
      sectionSimilarities: sectionSimilarities.sort((a, b) => b.similarity - a.similarity)
    };
  }

  /**
   * Compare document semantics
   */
  private async compareSemantics(docA: any, docB: any): Promise<SemanticComparison> {
    // Generate embeddings for overall content
    const [embeddingA, embeddingB] = await Promise.all([
      this.generateEmbedding(docA.content.substring(0, 8000)),
      this.generateEmbedding(docB.content.substring(0, 8000))
    ]);

    const overallSimilarity = this.cosineSimilarity(embeddingA, embeddingB);

    // Extract key concepts using simple keyword extraction
    const keyConceptsA = this.extractKeyConcepts(docA.content);
    const keyConceptsB = this.extractKeyConcepts(docB.content);

    const sharedConcepts = keyConceptsA.filter(c => keyConceptsB.includes(c));

    // Calculate different types of similarity
    const conceptualSimilarity = sharedConcepts.length /
      Math.max(keyConceptsA.length, keyConceptsB.length, 1);

    // Terminology similarity based on legal term overlap
    const legalTermsA = this.extractLegalTerms(docA.content);
    const legalTermsB = this.extractLegalTerms(docB.content);
    const sharedTerms = legalTermsA.filter(t => legalTermsB.includes(t));
    const terminologySimilarity = sharedTerms.length /
      Math.max(legalTermsA.length, legalTermsB.length, 1);

    // Legal intent similarity (based on document type and hierarchy)
    const legalIntentSimilarity = this.calculateLegalIntentSimilarity(docA, docB);

    return {
      overallSimilarity,
      conceptualSimilarity,
      terminologySimilarity,
      legalIntentSimilarity,
      keyConceptsA,
      keyConceptsB,
      sharedConcepts
    };
  }

  /**
   * Detect content changes between documents
   */
  private async detectChanges(
    docA: any,
    docB: any,
    structuralComparison: StructuralComparison
  ): Promise<ContentChange[]> {
    const changes: ContentChange[] = [];

    // Track additions (sections only in B)
    for (const section of structuralComparison.uniqueToB) {
      changes.push({
        type: 'addition',
        location: section,
        contentB: this.getSectionContent(docB, section),
        description: `New section added: ${section}`
      });
    }

    // Track deletions (sections only in A)
    for (const section of structuralComparison.uniqueToA) {
      changes.push({
        type: 'deletion',
        location: section,
        contentA: this.getSectionContent(docA, section),
        description: `Section removed: ${section}`
      });
    }

    // Track modifications in common sections
    for (const similarity of structuralComparison.sectionSimilarities) {
      if (similarity.similarity < 0.95 && similarity.similarity > 0.3) {
        const contentA = this.getSectionContent(docA, similarity.sectionA);
        const contentB = this.getSectionContent(docB, similarity.sectionB);

        changes.push({
          type: 'modification',
          location: similarity.sectionA,
          contentA: contentA?.substring(0, 500),
          contentB: contentB?.substring(0, 500),
          description: `Section modified: ${similarity.sectionA} (${(similarity.similarity * 100).toFixed(1)}% similar)`
        });
      }
    }

    return changes;
  }

  /**
   * Generate AI comparison summary
   */
  private async generateComparisonSummary(
    docA: any,
    docB: any,
    structural: StructuralComparison,
    semantic: SemanticComparison,
    changes: ContentChange[]
  ): Promise<{ summary: string; detailedAnalysis: string }> {
    const prompt = `
      Analyze and summarize the comparison between two legal documents.

      Document A: "${docA.normTitle}"
      - Type: ${docA.normType}
      - Hierarchy: ${docA.legalHierarchy}
      - Publication Date: ${docA.publicationDate?.toISOString() || 'Unknown'}

      Document B: "${docB.normTitle}"
      - Type: ${docB.normType}
      - Hierarchy: ${docB.legalHierarchy}
      - Publication Date: ${docB.publicationDate?.toISOString() || 'Unknown'}

      Structural Comparison:
      - Common sections: ${structural.commonSections.length}
      - Unique to Document A: ${structural.uniqueToA.length}
      - Unique to Document B: ${structural.uniqueToB.length}

      Semantic Comparison:
      - Overall similarity: ${(semantic.overallSimilarity * 100).toFixed(1)}%
      - Conceptual similarity: ${(semantic.conceptualSimilarity * 100).toFixed(1)}%
      - Terminology similarity: ${(semantic.terminologySimilarity * 100).toFixed(1)}%
      - Shared key concepts: ${semantic.sharedConcepts.slice(0, 10).join(', ')}

      Changes Detected:
      - Additions: ${changes.filter(c => c.type === 'addition').length}
      - Deletions: ${changes.filter(c => c.type === 'deletion').length}
      - Modifications: ${changes.filter(c => c.type === 'modification').length}

      Provide:
      1. A brief summary (2-3 sentences) of the key differences
      2. A detailed analysis (paragraph) explaining the legal implications of the differences

      Format your response as JSON:
      {
        "summary": "brief summary here",
        "detailedAnalysis": "detailed analysis here"
      }
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a legal document analyst. Provide clear, professional comparisons.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        summary: result.summary || 'Comparison completed.',
        detailedAnalysis: result.detailedAnalysis || 'No detailed analysis available.'
      };
    } catch (error) {
      console.error('Error generating comparison summary:', error);
      return {
        summary: `Documents compared: ${(semantic.overallSimilarity * 100).toFixed(1)}% similar with ${changes.length} changes detected.`,
        detailedAnalysis: 'AI analysis unavailable. Review structural and semantic comparisons for details.'
      };
    }
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text.substring(0, 8000),
        dimensions: 1536
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return new Array(1536).fill(0);
    }
  }

  /**
   * Calculate cosine similarity between vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Extract sections from document
   */
  private extractSections(doc: any): DocumentSection[] {
    const sections: DocumentSection[] = [];

    // Add sections from database
    if (doc.sections) {
      doc.sections.forEach((s: any) => {
        sections.push({
          type: s.sectionType,
          number: s.sectionNumber,
          title: s.sectionTitle || '',
          content: s.content || ''
        });
      });
    }

    // Add articles
    if (doc.articles) {
      doc.articles.forEach((a: any) => {
        sections.push({
          type: 'article',
          number: a.articleNumberText || String(a.articleNumber),
          title: a.articleTitle || '',
          content: a.articleContent || ''
        });
      });
    }

    return sections;
  }

  /**
   * Calculate text similarity using embeddings
   */
  private async calculateTextSimilarity(textA: string, textB: string): Promise<number> {
    if (!textA || !textB) return 0;

    const [embA, embB] = await Promise.all([
      this.generateEmbedding(textA.substring(0, 2000)),
      this.generateEmbedding(textB.substring(0, 2000))
    ]);

    return this.cosineSimilarity(embA, embB);
  }

  /**
   * Detect changes within a section
   */
  private detectSectionChanges(sectionA: DocumentSection, sectionB: DocumentSection): ContentChange[] {
    const changes: ContentChange[] = [];

    // Simple word-level comparison
    const wordsA = new Set(sectionA.content.toLowerCase().split(/\s+/));
    const wordsB = new Set(sectionB.content.toLowerCase().split(/\s+/));

    const addedWords = [...wordsB].filter(w => !wordsA.has(w)).length;
    const removedWords = [...wordsA].filter(w => !wordsB.has(w)).length;

    if (addedWords > 5) {
      changes.push({
        type: 'addition',
        location: `${sectionA.type}_${sectionA.number}`,
        description: `Approximately ${addedWords} words added`
      });
    }

    if (removedWords > 5) {
      changes.push({
        type: 'deletion',
        location: `${sectionA.type}_${sectionA.number}`,
        description: `Approximately ${removedWords} words removed`
      });
    }

    return changes;
  }

  /**
   * Extract key concepts from text
   */
  private extractKeyConcepts(text: string): string[] {
    const words = text.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4)
      .filter(w => !this.isStopWord(w));

    const frequency = new Map<string, number>();
    words.forEach(w => frequency.set(w, (frequency.get(w) || 0) + 1));

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Extract legal terms from text
   */
  private extractLegalTerms(text: string): string[] {
    const legalPatterns = [
      /artículo\s+\d+/gi,
      /ley\s+\w+/gi,
      /código\s+\w+/gi,
      /decreto\s+\w+/gi,
      /reglamento\s+\w+/gi,
      /constitución/gi,
      /jurisdicción/gi,
      /competencia/gi,
      /sentencia/gi,
      /demanda/gi,
      /recurso/gi,
      /apelación/gi
    ];

    const terms = new Set<string>();
    legalPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(m => terms.add(m.toLowerCase()));
    });

    return Array.from(terms);
  }

  /**
   * Calculate legal intent similarity
   */
  private calculateLegalIntentSimilarity(docA: any, docB: any): number {
    let similarity = 0;

    if (docA.normType === docB.normType) similarity += 0.4;
    if (docA.legalHierarchy === docB.legalHierarchy) similarity += 0.3;
    if (docA.jurisdiction === docB.jurisdiction) similarity += 0.2;
    if (docA.documentState === docB.documentState) similarity += 0.1;

    return similarity;
  }

  /**
   * Find matching concepts between documents
   */
  private findMatchingConcepts(textA: string, textB: string): string[] {
    const conceptsA = this.extractKeyConcepts(textA);
    const conceptsB = new Set(this.extractKeyConcepts(textB));

    return conceptsA.filter(c => conceptsB.has(c)).slice(0, 10);
  }

  /**
   * Determine relationship between documents
   */
  private determineRelationship(
    docA: any,
    docB: any,
    similarity: number
  ): 'related' | 'supersedes' | 'superseded_by' | 'amends' | 'similar' {
    // Check publication dates
    const dateA = docA.publicationDate ? new Date(docA.publicationDate) : null;
    const dateB = docB.publicationDate ? new Date(docB.publicationDate) : null;

    if (similarity > 0.9 && dateA && dateB) {
      if (dateA > dateB) return 'supersedes';
      if (dateB > dateA) return 'superseded_by';
    }

    if (similarity > 0.7 && similarity < 0.9) {
      return 'amends';
    }

    if (similarity > 0.8) {
      return 'similar';
    }

    return 'related';
  }

  /**
   * Get section content by identifier
   */
  private getSectionContent(doc: any, sectionId: string): string | undefined {
    const [type, number] = sectionId.split('_');

    if (type === 'article' && doc.articles) {
      const article = doc.articles.find((a: any) =>
        a.articleNumberText === number || String(a.articleNumber) === number
      );
      return article?.articleContent;
    }

    if (doc.sections) {
      const section = doc.sections.find((s: any) =>
        s.sectionType === type && s.sectionNumber === number
      );
      return section?.content;
    }

    return undefined;
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      'el', 'la', 'de', 'en', 'y', 'a', 'los', 'las', 'del', 'se', 'con',
      'para', 'por', 'una', 'un', 'su', 'al', 'es', 'lo', 'como', 'the',
      'and', 'or', 'is', 'are', 'that', 'this', 'which', 'with', 'from'
    ];
    return stopWords.includes(word.toLowerCase());
  }

  /**
   * Store comparison result
   */
  private async storeComparison(comparison: DocumentComparison): Promise<void> {
    await this.prisma.systemMetric.create({
      data: {
        metricName: 'document_comparison',
        metricValue: comparison.semanticComparison.overallSimilarity,
        metricUnit: 'similarity',
        category: 'document_analysis',
        metadata: comparison as any
      }
    });
  }
}

// Singleton instance
let documentComparisonInstance: DocumentComparisonService | null = null;

export function getDocumentComparisonService(prisma?: PrismaClient): DocumentComparisonService {
  if (!documentComparisonInstance) {
    documentComparisonInstance = new DocumentComparisonService(prisma);
  }
  return documentComparisonInstance;
}
