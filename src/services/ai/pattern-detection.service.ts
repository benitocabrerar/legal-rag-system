/**
 * Pattern Detection Service
 *
 * Detects legal patterns in documents including:
 * - Common legal clause patterns
 * - Legal entity extraction (NER)
 * - Citation patterns
 * - Document structure patterns
 */

import { PrismaClient } from '@prisma/client';
import { prisma as prismaClient } from '../../lib/prisma.js';
import { OpenAI } from 'openai';
import * as crypto from 'crypto';

// Types
interface LegalPattern {
  id: string;
  type: PatternType;
  name: string;
  description: string;
  pattern: string;
  examples: string[];
  frequency: number;
  confidence: number;
}

type PatternType =
  | 'clause'
  | 'citation'
  | 'definition'
  | 'obligation'
  | 'right'
  | 'procedure'
  | 'penalty'
  | 'exception'
  | 'delegation'
  | 'reference';

interface ClausePattern {
  id: string;
  clauseType: string;
  text: string;
  normalizedText: string;
  documentId: string;
  articleNumber?: string;
  frequency: number;
  variations: string[];
}

interface LegalEntity {
  id: string;
  type: EntityType;
  text: string;
  normalizedText: string;
  context: string;
  position: {
    start: number;
    end: number;
  };
  confidence: number;
  metadata?: Record<string, any>;
}

type EntityType =
  | 'ORGANIZATION'
  | 'PERSON'
  | 'LAW'
  | 'ARTICLE'
  | 'DATE'
  | 'LOCATION'
  | 'COURT'
  | 'GOVERNMENT_BODY'
  | 'LEGAL_TERM'
  | 'MONETARY_VALUE';

interface PatternDetectionResult {
  documentId: string;
  patterns: LegalPattern[];
  entities: LegalEntity[];
  clauses: ClausePattern[];
  statistics: PatternStatistics;
  processingTimeMs: number;
}

interface PatternStatistics {
  totalPatterns: number;
  patternsByType: Record<PatternType, number>;
  totalEntities: number;
  entitiesByType: Record<EntityType, number>;
  uniqueClauses: number;
  documentComplexity: 'low' | 'medium' | 'high';
}

interface PatternFrequency {
  pattern: string;
  type: PatternType;
  count: number;
  documentIds: string[];
  lastSeen: Date;
}

export class PatternDetectionService {
  private prisma: PrismaClient;
  private openai: OpenAI;
  private patternCache: Map<string, LegalPattern[]> = new Map();

  // Pre-defined legal patterns
  private readonly legalPatterns: Record<PatternType, RegExp[]> = {
    clause: [
      /(?:se\s+establece|se\s+dispone|queda\s+establecido)\s+que\s+.{20,200}/gi,
      /(?:para\s+los\s+efectos|a\s+los\s+efectos)\s+de\s+(?:la\s+presente|esta)\s+.{10,100}/gi,
    ],
    citation: [
      /artículos?\s+(\d+(?:\s*[,y]\s*\d+)*)/gi,
      /(?:ley|código|decreto|reglamento)\s+(?:n[°º]?\s*)?(\d+)/gi,
      /registro\s+oficial\s+(?:n[°º]?\s*)?(\d+)/gi,
    ],
    definition: [
      /(?:se\s+entiende|se\s+considera|se\s+define)\s+(?:por|como)\s+.{20,200}/gi,
      /(?:para\s+efectos|a\s+efectos)\s+de\s+.{20,150}/gi,
    ],
    obligation: [
      /(?:deberá|deberán|está\s+obligado|están\s+obligados)\s+.{10,150}/gi,
      /(?:es\s+obligatorio|será\s+obligación)\s+.{10,150}/gi,
    ],
    right: [
      /(?:tiene|tienen|tendrá|tendrán)\s+derecho\s+a\s+.{10,150}/gi,
      /(?:podrá|podrán|puede|pueden)\s+.{10,150}/gi,
    ],
    procedure: [
      /(?:el\s+procedimiento|procedimiento\s+para)\s+.{20,200}/gi,
      /(?:se\s+tramitará|tramitación)\s+.{20,150}/gi,
    ],
    penalty: [
      /(?:será\s+sancionado|se\s+sancionará|multa\s+de)\s+.{10,150}/gi,
      /(?:infracción|sanción)\s+.{10,150}/gi,
    ],
    exception: [
      /(?:excepto|salvo|a\s+excepción\s+de)\s+.{10,150}/gi,
      /(?:no\s+se\s+aplicará|quedan\s+excluidos)\s+.{10,150}/gi,
    ],
    delegation: [
      /(?:el\s+(?:presidente|ministro|director))\s+(?:podrá\s+)?delegar\s+.{10,150}/gi,
      /(?:se\s+delega|delegación\s+de)\s+.{10,150}/gi,
    ],
    reference: [
      /(?:de\s+conformidad|conforme)\s+(?:con|a)\s+.{10,100}/gi,
      /(?:según|de\s+acuerdo)\s+(?:con|a)\s+.{10,100}/gi,
    ],
  };

  // Entity patterns for NER
  private readonly entityPatterns: Record<EntityType, RegExp[]> = {
    ORGANIZATION: [
      /(?:ministerio|secretaría|consejo|comisión|instituto|agencia)\s+(?:de\s+)?[A-Z][a-záéíóúñ]+(?:\s+[A-Z][a-záéíóúñ]+)*/gi,
      /(?:empresa|corporación|fundación|asociación)\s+[A-Z][a-záéíóúñ]+(?:\s+[A-Z][a-záéíóúñ]+)*/gi,
    ],
    PERSON: [
      /(?:señor|señora|sr\.|sra\.)\s+[A-Z][a-záéíóúñ]+(?:\s+[A-Z][a-záéíóúñ]+)*/gi,
      /(?:presidente|ministro|director|secretario)\s+[A-Z][a-záéíóúñ]+(?:\s+[A-Z][a-záéíóúñ]+)*/gi,
    ],
    LAW: [
      /ley\s+(?:orgánica|ordinaria)?\s*(?:n[°º]?\s*)?\d+/gi,
      /código\s+(?:civil|penal|de\s+\w+)/gi,
      /decreto\s+(?:ejecutivo|supremo)?\s*(?:n[°º]?\s*)?\d+/gi,
    ],
    ARTICLE: [
      /artículo\s+\d+(?:-\w+)?/gi,
      /art\.\s+\d+(?:-\w+)?/gi,
    ],
    DATE: [
      /\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    LOCATION: [
      /(?:provincia|cantón|parroquia)\s+(?:de\s+)?[A-Z][a-záéíóúñ]+/gi,
      /(?:república|estado)\s+(?:del?\s+)?[A-Z][a-záéíóúñ]+/gi,
    ],
    COURT: [
      /(?:corte|tribunal|juzgado)\s+(?:de\s+)?[A-Z][a-záéíóúñ]+(?:\s+[A-Z][a-záéíóúñ]+)*/gi,
    ],
    GOVERNMENT_BODY: [
      /(?:asamblea|congreso|parlamento)\s+(?:nacional|de\s+)?[A-Z][a-záéíóúñ]*/gi,
      /(?:gobierno|estado|administración)\s+(?:central|provincial|municipal)/gi,
    ],
    LEGAL_TERM: [
      /(?:prescripción|caducidad|nulidad|anulabilidad)/gi,
      /(?:jurisdicción|competencia|atribución)/gi,
      /(?:derecho|obligación|deber|facultad)/gi,
    ],
    MONETARY_VALUE: [
      /\$\s*[\d,]+(?:\.\d{2})?/g,
      /(?:USD|EUR|SBU)\s*[\d,]+(?:\.\d{2})?/gi,
      /\d+\s*(?:dólares|euros|salarios\s+básicos)/gi,
    ],
  };

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || prismaClient;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000'),
      maxRetries: parseInt(process.env.OPENAI_RETRY_ATTEMPTS || '3'),
    });
  }

  /**
   * Detect all legal patterns in a document
   */
  async detectLegalPatterns(documentId: string): Promise<PatternDetectionResult> {
    const startTime = Date.now();

    try {
      // Check cache
      if (this.patternCache.has(documentId)) {
        const cachedPatterns = this.patternCache.get(documentId)!;
        return {
          documentId,
          patterns: cachedPatterns,
          entities: [],
          clauses: [],
          statistics: this.calculateStatistics(cachedPatterns, [], []),
          processingTimeMs: Date.now() - startTime
        };
      }

      // Fetch document
      const document = await this.prisma.legalDocument.findUnique({
        where: { id: documentId },
        include: {
          articles: true,
          sections: true
        }
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Detect patterns
      const patterns = this.extractPatterns(document.content);

      // Extract entities
      const entities = this.extractEntities(document.content);

      // Identify clause patterns
      const clauses = await this.identifyClausePatternsInDocument(document);

      // Calculate statistics
      const statistics = this.calculateStatistics(patterns, entities, clauses);

      // Cache results
      this.patternCache.set(documentId, patterns);

      // Store pattern frequencies
      await this.updatePatternFrequencies(documentId, patterns);

      const result: PatternDetectionResult = {
        documentId,
        patterns,
        entities,
        clauses,
        statistics,
        processingTimeMs: Date.now() - startTime
      };

      // Store result in database
      await this.storePatternResult(result);

      return result;
    } catch (error) {
      console.error('Error detecting legal patterns:', error);
      throw error;
    }
  }

  /**
   * Identify common clause patterns across multiple documents
   */
  async identifyCommonClausePatterns(): Promise<ClausePattern[]> {
    try {
      // Get recent documents
      const documents = await this.prisma.legalDocument.findMany({
        where: { isActive: true },
        take: 50,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          articles: true
        }
      });

      const clauseMap = new Map<string, ClausePattern>();

      for (const doc of documents) {
        const clauses = await this.identifyClausePatternsInDocument(doc);

        for (const clause of clauses) {
          const key = clause.normalizedText;
          const existing = clauseMap.get(key);

          if (existing) {
            existing.frequency++;
            if (!existing.variations.includes(clause.text)) {
              existing.variations.push(clause.text);
            }
          } else {
            clauseMap.set(key, clause);
          }
        }
      }

      // Return sorted by frequency
      return Array.from(clauseMap.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 100);
    } catch (error) {
      console.error('Error identifying clause patterns:', error);
      throw error;
    }
  }

  /**
   * Extract legal entities using NER patterns
   */
  extractLegalEntities(text: string): LegalEntity[] {
    return this.extractEntities(text);
  }

  /**
   * Get pattern frequency statistics
   */
  async getPatternFrequencies(): Promise<PatternFrequency[]> {
    const metrics = await this.prisma.systemMetric.findMany({
      where: {
        metricName: 'pattern_frequency'
      },
      orderBy: { metricValue: 'desc' },
      take: 100
    });

    return metrics.map(m => ({
      pattern: (m.metadata as any).pattern,
      type: (m.metadata as any).type,
      count: m.metricValue,
      documentIds: (m.metadata as any).documentIds || [],
      lastSeen: m.timestamp
    }));
  }

  /**
   * Analyze document for AI-enhanced pattern detection
   */
  async analyzeWithAI(documentId: string): Promise<{
    patterns: LegalPattern[];
    insights: string[];
    recommendations: string[];
  }> {
    try {
      const document = await this.prisma.legalDocument.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      const prompt = `
        Analyze the following legal document and identify:
        1. Key legal patterns (obligations, rights, procedures, penalties)
        2. Important clauses that may have legal implications
        3. Potential ambiguities or areas needing clarification

        Document Title: ${document.normTitle}
        Document Type: ${document.normType}

        Content (first 4000 characters):
        ${document.content.substring(0, 4000)}

        Provide analysis in JSON format:
        {
          "patterns": [
            {
              "type": "pattern type",
              "name": "pattern name",
              "description": "description",
              "importance": "high|medium|low",
              "location": "approximate location in document"
            }
          ],
          "insights": ["insight 1", "insight 2"],
          "recommendations": ["recommendation 1", "recommendation 2"]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a legal document analyst specializing in pattern detection and legal analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      const patterns: LegalPattern[] = (result.patterns || []).map((p: any) => ({
        id: crypto.randomUUID(),
        type: this.mapPatternType(p.type),
        name: p.name,
        description: p.description,
        pattern: p.location || '',
        examples: [],
        frequency: 1,
        confidence: p.importance === 'high' ? 0.9 : p.importance === 'medium' ? 0.7 : 0.5
      }));

      return {
        patterns,
        insights: result.insights || [],
        recommendations: result.recommendations || []
      };
    } catch (error) {
      console.error('Error in AI pattern analysis:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Extract patterns from text using regex
   */
  private extractPatterns(text: string): LegalPattern[] {
    const patterns: LegalPattern[] = [];

    for (const [type, regexList] of Object.entries(this.legalPatterns)) {
      for (const regex of regexList) {
        const matches = text.matchAll(new RegExp(regex.source, regex.flags));

        for (const match of matches) {
          patterns.push({
            id: crypto.randomUUID(),
            type: type as PatternType,
            name: this.getPatternName(type as PatternType),
            description: match[0].substring(0, 100),
            pattern: regex.source,
            examples: [match[0]],
            frequency: 1,
            confidence: 0.8
          });
        }
      }
    }

    // Deduplicate and count frequencies
    const patternMap = new Map<string, LegalPattern>();

    for (const pattern of patterns) {
      const key = `${pattern.type}_${pattern.description.substring(0, 50)}`;

      if (patternMap.has(key)) {
        const existing = patternMap.get(key)!;
        existing.frequency++;
        if (!existing.examples.includes(pattern.examples[0])) {
          existing.examples.push(pattern.examples[0]);
        }
      } else {
        patternMap.set(key, pattern);
      }
    }

    return Array.from(patternMap.values());
  }

  /**
   * Extract entities from text
   */
  private extractEntities(text: string): LegalEntity[] {
    const entities: LegalEntity[] = [];

    for (const [type, regexList] of Object.entries(this.entityPatterns)) {
      for (const regex of regexList) {
        const matches = text.matchAll(new RegExp(regex.source, regex.flags));

        for (const match of matches) {
          const startPos = match.index || 0;
          const contextStart = Math.max(0, startPos - 50);
          const contextEnd = Math.min(text.length, startPos + match[0].length + 50);

          entities.push({
            id: crypto.randomUUID(),
            type: type as EntityType,
            text: match[0],
            normalizedText: this.normalizeText(match[0]),
            context: text.substring(contextStart, contextEnd),
            position: {
              start: startPos,
              end: startPos + match[0].length
            },
            confidence: 0.85
          });
        }
      }
    }

    // Deduplicate
    const entityMap = new Map<string, LegalEntity>();
    for (const entity of entities) {
      const key = `${entity.type}_${entity.normalizedText}`;
      if (!entityMap.has(key)) {
        entityMap.set(key, entity);
      }
    }

    return Array.from(entityMap.values());
  }

  /**
   * Identify clause patterns in a document
   */
  private async identifyClausePatternsInDocument(doc: any): Promise<ClausePattern[]> {
    const clauses: ClausePattern[] = [];

    // Extract from articles if available
    if (doc.articles) {
      for (const article of doc.articles) {
        const content = article.articleContent || '';

        // Look for common clause structures
        const clausePatterns = [
          /(?:se\s+establece|queda\s+establecido)\s+.{20,200}/gi,
          /(?:tiene|tendrá)\s+derecho\s+a\s+.{20,150}/gi,
          /(?:deberá|está\s+obligado)\s+.{20,150}/gi,
          /(?:será\s+sancionado|multa\s+de)\s+.{20,150}/gi,
        ];

        for (const pattern of clausePatterns) {
          const matches = content.matchAll(pattern);
          for (const match of matches) {
            clauses.push({
              id: crypto.randomUUID(),
              clauseType: this.determineClauseType(match[0]),
              text: match[0],
              normalizedText: this.normalizeText(match[0]),
              documentId: doc.id,
              articleNumber: article.articleNumberText || String(article.articleNumber),
              frequency: 1,
              variations: []
            });
          }
        }
      }
    }

    return clauses;
  }

  /**
   * Calculate pattern statistics
   */
  private calculateStatistics(
    patterns: LegalPattern[],
    entities: LegalEntity[],
    clauses: ClausePattern[]
  ): PatternStatistics {
    const patternsByType: Record<PatternType, number> = {
      clause: 0,
      citation: 0,
      definition: 0,
      obligation: 0,
      right: 0,
      procedure: 0,
      penalty: 0,
      exception: 0,
      delegation: 0,
      reference: 0
    };

    patterns.forEach(p => {
      patternsByType[p.type]++;
    });

    const entitiesByType: Record<EntityType, number> = {
      ORGANIZATION: 0,
      PERSON: 0,
      LAW: 0,
      ARTICLE: 0,
      DATE: 0,
      LOCATION: 0,
      COURT: 0,
      GOVERNMENT_BODY: 0,
      LEGAL_TERM: 0,
      MONETARY_VALUE: 0
    };

    entities.forEach(e => {
      entitiesByType[e.type]++;
    });

    // Calculate document complexity
    const totalIndicators = patterns.length + entities.length + clauses.length;
    const complexity = totalIndicators > 100 ? 'high' :
      totalIndicators > 30 ? 'medium' : 'low';

    return {
      totalPatterns: patterns.length,
      patternsByType,
      totalEntities: entities.length,
      entitiesByType,
      uniqueClauses: clauses.length,
      documentComplexity: complexity
    };
  }

  /**
   * Update pattern frequency tracking
   */
  private async updatePatternFrequencies(documentId: string, patterns: LegalPattern[]): Promise<void> {
    for (const pattern of patterns) {
      const key = `${pattern.type}_${pattern.pattern.substring(0, 50)}`;

      const existing = await this.prisma.systemMetric.findFirst({
        where: {
          metricName: 'pattern_frequency',
          metadata: {
            path: ['key'],
            equals: key
          }
        }
      });

      if (existing) {
        const metadata = existing.metadata as any;
        const documentIds = metadata.documentIds || [];
        if (!documentIds.includes(documentId)) {
          documentIds.push(documentId);
        }

        await this.prisma.systemMetric.update({
          where: { id: existing.id },
          data: {
            metricValue: existing.metricValue + 1,
            metadata: {
              ...metadata,
              documentIds
            }
          }
        });
      } else {
        await this.prisma.systemMetric.create({
          data: {
            metricName: 'pattern_frequency',
            metricValue: 1,
            metricUnit: 'count',
            category: 'pattern_detection',
            metadata: {
              key,
              pattern: pattern.pattern,
              type: pattern.type,
              documentIds: [documentId]
            }
          }
        });
      }
    }
  }

  /**
   * Store pattern detection result
   */
  private async storePatternResult(result: PatternDetectionResult): Promise<void> {
    await this.prisma.systemMetric.create({
      data: {
        metricName: 'pattern_detection_result',
        metricValue: result.patterns.length,
        metricUnit: 'patterns',
        category: 'document_analysis',
        metadata: JSON.parse(JSON.stringify({
          documentId: result.documentId,
          statistics: result.statistics,
          processingTimeMs: result.processingTimeMs,
          timestamp: new Date().toISOString()
        }))
      }
    });
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  /**
   * Get pattern name from type
   */
  private getPatternName(type: PatternType): string {
    const names: Record<PatternType, string> = {
      clause: 'Legal Clause',
      citation: 'Legal Citation',
      definition: 'Legal Definition',
      obligation: 'Legal Obligation',
      right: 'Legal Right',
      procedure: 'Legal Procedure',
      penalty: 'Penalty Clause',
      exception: 'Exception Clause',
      delegation: 'Delegation of Authority',
      reference: 'Cross-Reference'
    };
    return names[type];
  }

  /**
   * Determine clause type from text
   */
  private determineClauseType(text: string): string {
    const lower = text.toLowerCase();

    if (lower.includes('derecho') || lower.includes('podrá')) return 'right';
    if (lower.includes('deber') || lower.includes('obligación')) return 'obligation';
    if (lower.includes('sanción') || lower.includes('multa')) return 'penalty';
    if (lower.includes('procedimiento') || lower.includes('tramit')) return 'procedure';
    if (lower.includes('define') || lower.includes('entiende')) return 'definition';

    return 'general';
  }

  /**
   * Map AI pattern type to internal type
   */
  private mapPatternType(type: string): PatternType {
    const typeMap: Record<string, PatternType> = {
      obligation: 'obligation',
      right: 'right',
      procedure: 'procedure',
      penalty: 'penalty',
      definition: 'definition',
      exception: 'exception',
      reference: 'reference',
      citation: 'citation',
      delegation: 'delegation'
    };

    return typeMap[type.toLowerCase()] || 'clause';
  }
}

// Singleton instance
let patternDetectionInstance: PatternDetectionService | null = null;

export function getPatternDetectionService(prisma?: PrismaClient): PatternDetectionService {
  if (!patternDetectionInstance) {
    patternDetectionInstance = new PatternDetectionService(prisma);
  }
  return patternDetectionInstance;
}
