/**
 * Citation Extraction Service
 * Extracts and stores citations from legal documents
 */

import { PrismaClient } from '@prisma/client';
import { EcuadorianCitationParser } from './citationParser';
import { CitationValidator } from './citationValidator';

const prisma = new PrismaClient();

export interface CitationExtractionResult {
  documentId: string;
  citationsFound: number;
  citationsStored: number;
  processingTimeMs: number;
  errors: string[];
}

export class CitationExtractor {
  private parser: EcuadorianCitationParser;
  private validator: CitationValidator;

  constructor() {
    this.parser = new EcuadorianCitationParser();
    this.validator = new CitationValidator();
  }

  /**
   * Extract citations from a single document
   */
  async extractFromDocument(documentId: string): Promise<CitationExtractionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let citationsStored = 0;

    try {
      // Get document content
      const document = await prisma.legalDocument.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          content: true,
          title: true,
          normType: true
        }
      });

      if (!document || !document.content) {
        throw new Error(`Document ${documentId} not found or has no content`);
      }

      // Parse citations from content
      const citations = await this.parser.parseCitations(document.content);

      // Store each citation
      for (const citation of citations) {
        try {
          // Try to match citation to existing document
          const targetDocument = await this.findTargetDocument(citation);

          await prisma.documentCitation.create({
            data: {
              id: `cit-${documentId}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              sourceDocumentId: documentId,
              targetDocumentId: targetDocument?.id || null,
              citationText: citation.raw,
              citationContext: this.extractContext(document.content, citation.position),
              articleReference: citation.components.article || null,
              citationType: this.mapCitationType(citation.type),
              citationStrength: this.calculateStrength(citation),
              confidenceScore: citation.confidence || 0.8,
              extractedBy: 'automatic',
              extractionMethod: 'regex_parser',
              isValidated: false
            }
          });

          citationsStored++;
        } catch (error) {
          errors.push(`Failed to store citation: ${citation.raw} - ${error}`);
        }
      }

      const processingTimeMs = Date.now() - startTime;

      return {
        documentId,
        citationsFound: citations.length,
        citationsStored,
        processingTimeMs,
        errors
      };

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      errors.push(`Extraction failed: ${error}`);

      return {
        documentId,
        citationsFound: 0,
        citationsStored: 0,
        processingTimeMs,
        errors
      };
    }
  }

  /**
   * Extract citations from all documents
   */
  async extractFromAllDocuments(batchSize: number = 10): Promise<CitationExtractionResult[]> {
    const results: CitationExtractionResult[] = [];

    // Get all documents
    const documents = await prisma.legalDocument.findMany({
      select: { id: true },
      where: {
        content: { not: null }
      }
    });

    // Process in batches
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(doc => this.extractFromDocument(doc.id))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Find target document from parsed citation
   */
  private async findTargetDocument(citation: any): Promise<any | null> {
    // Try to find document by normalized form
    const searchTerms = [
      citation.normalizedForm,
      citation.components.title,
      citation.components.number
    ].filter(Boolean);

    for (const term of searchTerms) {
      const document = await prisma.legalDocument.findFirst({
        where: {
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { registrationNumber: term }
          ]
        },
        select: { id: true }
      });

      if (document) {
        return document;
      }
    }

    return null;
  }

  /**
   * Extract context around citation
   */
  private extractContext(content: string, position: number, contextSize: number = 200): string {
    const start = Math.max(0, position - contextSize);
    const end = Math.min(content.length, position + contextSize);
    return content.substring(start, end);
  }

  /**
   * Map citation type to database enum
   */
  private mapCitationType(type: string): string {
    const typeMap: Record<string, string> = {
      'law': 'reference',
      'decree': 'reference',
      'constitutional_court': 'judicial_precedent',
      'supreme_court': 'judicial_precedent',
      'resolution': 'reference',
      'article': 'reference',
      'code': 'reference'
    };

    return typeMap[type] || 'reference';
  }

  /**
   * Calculate citation strength based on type and context
   */
  private calculateStrength(citation: any): number {
    let strength = 1.0;

    // Boost strength for constitutional and supreme court citations
    if (citation.type === 'constitutional_court') {
      strength = 2.0;
    } else if (citation.type === 'supreme_court') {
      strength = 1.5;
    }

    // Adjust based on confidence
    if (citation.confidence) {
      strength *= citation.confidence;
    }

    return strength;
  }
}
