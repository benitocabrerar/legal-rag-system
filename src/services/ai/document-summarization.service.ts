/**
 * Document Summarization Service
 *
 * Generates multi-level summaries for legal documents:
 * - Brief summaries (1-2 sentences)
 * - Standard summaries (paragraph)
 * - Detailed summaries (comprehensive)
 * - Key point extraction
 * - Executive summaries for cases
 */

import { PrismaClient } from '@prisma/client';
import { prisma as prismaClient } from '../../lib/prisma.js';
import { OpenAI } from 'openai';
import * as crypto from 'crypto';

// Types
type SummaryLevel = 'brief' | 'standard' | 'detailed';

interface SummaryOptions {
  level: SummaryLevel;
  language?: 'es' | 'en';
  includeKeyPoints?: boolean;
  includeReferences?: boolean;
  maxLength?: number;
}

interface DocumentSummary {
  id: string;
  documentId: string;
  level: SummaryLevel;
  summary: string;
  keyPoints: string[];
  references: string[];
  wordCount: number;
  confidenceScore: number;
  language: string;
  createdAt: Date;
}

interface KeyPoint {
  id: string;
  point: string;
  importance: 'high' | 'medium' | 'low';
  category: string;
  articleReference?: string;
}

interface ExecutiveSummary {
  id: string;
  caseId: string;
  title: string;
  overview: string;
  keyFindings: string[];
  recommendations: string[];
  riskFactors: string[];
  timeline: TimelineEvent[];
  documentSummaries: { documentId: string; title: string; summary: string }[];
  conclusion: string;
  createdAt: Date;
}

interface TimelineEvent {
  date: Date;
  event: string;
  importance: 'high' | 'medium' | 'low';
}

interface ChunkSummary {
  chunkIndex: number;
  content: string;
  summary: string;
}

interface ComparativeSummary {
  id: string;
  documentIds: string[];
  comparison: {
    commonThemes: string[];
    differences: string[];
    conflicts: string[];
    recommendations: string[];
  };
  documentSummaries: Array<{
    documentId: string;
    title: string;
    summary: string;
  }>;
  overallAnalysis: string;
  createdAt: Date;
}

/**
 * Stream chunk types for Server-Sent Events
 */
interface StreamChunk {
  type: 'text' | 'metadata' | 'error' | 'done' | 'keypoint' | 'reference';
  content: string;
  timestamp: number;
  metadata?: {
    wordCount?: number;
    chunkIndex?: number;
    totalChunks?: number;
    confidenceScore?: number;
  };
}

interface StreamSummaryOptions extends SummaryOptions {
  onProgress?: (progress: number) => void;
  includeMetadata?: boolean;
}

export class DocumentSummarizationService {
  private prisma: PrismaClient;
  private openai: OpenAI;

  private readonly defaultOptions: SummaryOptions = {
    level: 'standard',
    language: 'es',
    includeKeyPoints: true,
    includeReferences: true,
    maxLength: 500
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
   * Generate document summary at specified level
   */
  async summarizeDocument(
    documentId: string,
    options?: Partial<SummaryOptions>
  ): Promise<DocumentSummary> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };

    try {
      // Fetch document
      const document = await this.prisma.legalDocument.findUnique({
        where: { id: documentId },
        include: {
          sections: { orderBy: { displayOrder: 'asc' } },
          articles: { orderBy: { articleNumber: 'asc' }, take: 20 }
        }
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Check for existing summary at same level
      const existingSummary = await this.prisma.legalDocumentSummary.findFirst({
        where: {
          legalDocumentId: documentId,
          summaryType: opts.level,
          summaryLevel: 'document'
        }
      });

      if (existingSummary) {
        return {
          id: existingSummary.id,
          documentId,
          level: opts.level,
          summary: existingSummary.summaryText,
          keyPoints: (existingSummary.keyPoints as any)?.points || [],
          references: [],
          wordCount: existingSummary.summaryText.split(/\s+/).length,
          confidenceScore: existingSummary.confidenceScore || 0.85,
          language: opts.language || 'es',
          createdAt: existingSummary.createdAt
        };
      }

      // Generate summary based on level
      let summary: string;
      let keyPoints: string[] = [];
      let references: string[] = [];

      switch (opts.level) {
        case 'brief':
          summary = await this.generateBriefSummary(document, opts);
          break;
        case 'detailed':
          const detailed = await this.generateDetailedSummary(document, opts);
          summary = detailed.summary;
          keyPoints = detailed.keyPoints;
          references = detailed.references;
          break;
        default:
          const standard = await this.generateStandardSummary(document, opts);
          summary = standard.summary;
          keyPoints = standard.keyPoints;
          break;
      }

      // Store summary
      const summaryId = crypto.randomUUID();

      await this.prisma.legalDocumentSummary.create({
        data: {
          id: summaryId,
          legalDocumentId: documentId,
          summaryType: opts.level,
          summaryLevel: 'document',
          summaryText: summary,
          keyPoints: { points: keyPoints },
          confidenceScore: 0.85
        }
      });

      const result: DocumentSummary = {
        id: summaryId,
        documentId,
        level: opts.level,
        summary,
        keyPoints,
        references,
        wordCount: summary.split(/\s+/).length,
        confidenceScore: 0.85,
        language: opts.language || 'es',
        createdAt: new Date()
      };

      const processingTime = Date.now() - startTime;
      console.log(`Document summarization (${opts.level}) completed in ${processingTime}ms`);

      return result;
    } catch (error) {
      console.error('Error summarizing document:', error);
      throw error;
    }
  }

  /**
   * Extract key points from document
   */
  async extractKeyPoints(documentId: string): Promise<KeyPoint[]> {
    try {
      const document = await this.prisma.legalDocument.findUnique({
        where: { id: documentId },
        include: {
          articles: { orderBy: { articleNumber: 'asc' } }
        }
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      const prompt = `
        Analyze the following legal document and extract the most important key points.
        For each point, indicate its importance (high, medium, low) and categorize it.

        Document Title: ${document.normTitle}
        Document Type: ${document.normType}
        Legal Hierarchy: ${document.legalHierarchy}

        Content:
        ${document.content.substring(0, 6000)}

        Extract 5-10 key points in JSON format:
        {
          "keyPoints": [
            {
              "point": "description of the key point",
              "importance": "high|medium|low",
              "category": "category name (e.g., rights, obligations, procedures, definitions, penalties)",
              "articleReference": "article number if applicable"
            }
          ]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a legal document analyst specializing in extracting key information.
            Respond in ${document.content.includes('artículo') ? 'Spanish' : 'English'}.`
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

      return (result.keyPoints || []).map((kp: any) => ({
        id: crypto.randomUUID(),
        point: kp.point,
        importance: kp.importance || 'medium',
        category: kp.category || 'general',
        articleReference: kp.articleReference
      }));
    } catch (error) {
      console.error('Error extracting key points:', error);
      throw error;
    }
  }

  /**
   * Generate executive summary for a case
   */
  async generateExecutiveSummary(caseId: string): Promise<ExecutiveSummary> {
    const startTime = Date.now();

    try {
      // Fetch case with all related data
      const caseData = await this.prisma.case.findUnique({
        where: { id: caseId },
        include: {
          documents: {
            include: {
              chunks: { take: 5 }
            }
          },
          tasks: { orderBy: { createdAt: 'desc' } },
          events: { orderBy: { startTime: 'asc' } }
        }
      });

      if (!caseData) {
        throw new Error(`Case not found: ${caseId}`);
      }

      // Summarize each document
      const documentSummaries: { documentId: string; title: string; summary: string }[] = [];

      for (const doc of caseData.documents.slice(0, 5)) {
        const docContent = doc.content.substring(0, 2000);
        const quickSummary = await this.generateQuickSummary(docContent, doc.title);
        documentSummaries.push({
          documentId: doc.id,
          title: doc.title,
          summary: quickSummary
        });
      }

      // Build timeline from events
      const timeline: TimelineEvent[] = caseData.events.map(event => ({
        date: event.startTime,
        event: event.title,
        importance: event.type === 'HEARING' || event.type === 'DEADLINE' ? 'high' : 'medium'
      }));

      // Generate comprehensive executive summary
      const summaryPrompt = `
        Generate an executive summary for the following legal case.

        Case Information:
        - Title: ${caseData.title}
        - Description: ${caseData.description || 'Not provided'}
        - Status: ${caseData.status}
        - Client: ${caseData.clientName || 'Not specified'}
        - Case Number: ${caseData.caseNumber || 'Not assigned'}
        - Created: ${caseData.createdAt.toISOString()}

        Documents (${caseData.documents.length} total):
        ${documentSummaries.map(d => `- ${d.title}: ${d.summary}`).join('\n')}

        Tasks (${caseData.tasks.length} total):
        ${caseData.tasks.slice(0, 5).map(t => `- ${t.title} (${t.status})`).join('\n')}

        Events (${caseData.events.length} scheduled):
        ${timeline.slice(0, 5).map(e => `- ${e.date.toISOString().split('T')[0]}: ${e.event}`).join('\n')}

        Provide an executive summary in JSON format:
        {
          "overview": "2-3 sentence overview of the case",
          "keyFindings": ["finding 1", "finding 2", "finding 3"],
          "recommendations": ["recommendation 1", "recommendation 2"],
          "riskFactors": ["risk 1", "risk 2"],
          "conclusion": "brief conclusion"
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a senior legal analyst preparing executive summaries for legal cases.'
          },
          {
            role: 'user',
            content: summaryPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      const executiveSummary: ExecutiveSummary = {
        id: crypto.randomUUID(),
        caseId,
        title: caseData.title,
        overview: result.overview || 'Executive summary generated.',
        keyFindings: result.keyFindings || [],
        recommendations: result.recommendations || [],
        riskFactors: result.riskFactors || [],
        timeline,
        documentSummaries,
        conclusion: result.conclusion || '',
        createdAt: new Date()
      };

      // Store summary
      await this.storeExecutiveSummary(executiveSummary);

      const processingTime = Date.now() - startTime;
      console.log(`Executive summary generated in ${processingTime}ms for case ${caseId}`);

      return executiveSummary;
    } catch (error) {
      console.error('Error generating executive summary:', error);
      throw error;
    }
  }

  /**
   * Get summary by ID
   */
  async getSummary(summaryId: string): Promise<DocumentSummary | null> {
    const summary = await this.prisma.legalDocumentSummary.findUnique({
      where: { id: summaryId }
    });

    if (!summary) return null;

    return {
      id: summary.id,
      documentId: summary.legalDocumentId,
      level: summary.summaryType as SummaryLevel,
      summary: summary.summaryText,
      keyPoints: (summary.keyPoints as any)?.points || [],
      references: [],
      wordCount: summary.summaryText.split(/\s+/).length,
      confidenceScore: summary.confidenceScore || 0.85,
      language: 'es',
      createdAt: summary.createdAt
    };
  }

  /**
   * Batch summarize multiple documents
   */
  async batchSummarize(
    documentIds: string[],
    options?: Partial<SummaryOptions>
  ): Promise<DocumentSummary[]> {
    const summaries: DocumentSummary[] = [];

    for (const docId of documentIds) {
      try {
        const summary = await this.summarizeDocument(docId, options);
        summaries.push(summary);
      } catch (error) {
        console.error(`Error summarizing document ${docId}:`, error);
      }
    }

    return summaries;
  }

  /**
   * Compare multiple documents and generate comparative analysis
   */
  async compareDocuments(documentIds: string[]): Promise<ComparativeSummary> {
    const startTime = Date.now();

    if (documentIds.length < 2) {
      throw new Error('At least 2 documents required for comparison');
    }

    if (documentIds.length > 10) {
      throw new Error('Maximum 10 documents allowed for comparison');
    }

    try {
      // Fetch all documents
      const documents = await Promise.all(
        documentIds.map(id =>
          this.prisma.legalDocument.findUnique({
            where: { id },
            select: {
              id: true,
              normTitle: true,
              normType: true,
              legalHierarchy: true,
              content: true
            }
          })
        )
      );

      // Validate all documents exist
      const validDocuments = documents.filter(d => d !== null);
      if (validDocuments.length !== documentIds.length) {
        const missingIds = documentIds.filter(
          (id, idx) => documents[idx] === null
        );
        throw new Error(`Documents not found: ${missingIds.join(', ')}`);
      }

      // Generate brief summary for each document
      const documentSummaries: Array<{
        documentId: string;
        title: string;
        summary: string;
      }> = [];

      for (const doc of validDocuments) {
        const quickSummary = await this.generateQuickSummary(
          doc!.content.substring(0, 2000),
          doc!.normTitle
        );
        documentSummaries.push({
          documentId: doc!.id,
          title: doc!.normTitle,
          summary: quickSummary
        });
      }

      // Generate comparative analysis
      const comparisonPrompt = `
        Analyze and compare the following legal documents.

        Documents:
        ${validDocuments.map((doc, idx) => `
        Document ${idx + 1}: ${doc!.normTitle}
        Type: ${doc!.normType}
        Hierarchy: ${doc!.legalHierarchy}
        Content (excerpt): ${doc!.content.substring(0, 1500)}
        `).join('\n---\n')}

        Provide a comprehensive comparative analysis in JSON format:
        {
          "commonThemes": ["theme shared across documents", "another common element"],
          "differences": ["key difference 1", "key difference 2", "key difference 3"],
          "conflicts": ["any conflicting provisions or requirements"],
          "recommendations": ["recommendation for practitioners", "best practices"],
          "overallAnalysis": "2-3 paragraph analysis explaining how these documents relate to each other, their combined applicability, and practical implications"
        }

        Focus on:
        - Legal scope and applicability
        - Rights and obligations defined
        - Procedural requirements
        - Enforcement mechanisms
        - Temporal aspects (dates, deadlines)
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert legal analyst specializing in comparative legal analysis.
            Provide thorough, accurate comparisons that help legal practitioners understand
            how multiple documents interact. Respond in Spanish for documents written in Spanish.`
          },
          {
            role: 'user',
            content: comparisonPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2500,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      const comparativeSummary: ComparativeSummary = {
        id: crypto.randomUUID(),
        documentIds,
        comparison: {
          commonThemes: result.commonThemes || [],
          differences: result.differences || [],
          conflicts: result.conflicts || [],
          recommendations: result.recommendations || []
        },
        documentSummaries,
        overallAnalysis: result.overallAnalysis || 'Comparative analysis unavailable.',
        createdAt: new Date()
      };

      // Store comparative summary for future reference
      await this.prisma.systemMetric.create({
        data: {
          metricName: 'comparative_summary',
          metricValue: documentIds.length,
          metricUnit: 'documents_compared',
          category: 'document_analysis',
          metadata: {
            summaryId: comparativeSummary.id,
            documentIds,
            commonThemesCount: comparativeSummary.comparison.commonThemes.length,
            differencesCount: comparativeSummary.comparison.differences.length,
            conflictsCount: comparativeSummary.comparison.conflicts.length
          }
        }
      });

      const processingTime = Date.now() - startTime;
      console.log(`Comparative analysis of ${documentIds.length} documents completed in ${processingTime}ms`);

      return comparativeSummary;
    } catch (error) {
      console.error('Error comparing documents:', error);
      throw error;
    }
  }

  /**
   * Stream summary generation with Server-Sent Events support
   *
   * @param documentId - ID of the document to summarize
   * @param options - Summary options including level, language, and streaming preferences
   * @yields StreamChunk - Chunks of summary data with metadata
   *
   * @example
   * ```typescript
   * for await (const chunk of service.streamSummary(docId, { level: 'detailed' })) {
   *   console.log(`[${chunk.type}] ${chunk.content}`);
   * }
   * ```
   */
  async *streamSummary(
    documentId: string,
    options?: Partial<StreamSummaryOptions>
  ): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };

    try {
      // Emit initial metadata
      yield {
        type: 'metadata',
        content: JSON.stringify({
          status: 'started',
          documentId,
          level: opts.level,
          language: opts.language
        }),
        timestamp: Date.now()
      };

      // Fetch document
      const document = await this.prisma.legalDocument.findUnique({
        where: { id: documentId },
        include: {
          sections: { orderBy: { displayOrder: 'asc' } },
          articles: { orderBy: { articleNumber: 'asc' }, take: 20 }
        }
      });

      if (!document) {
        yield {
          type: 'error',
          content: JSON.stringify({
            error: 'Document not found',
            documentId
          }),
          timestamp: Date.now()
        };
        return;
      }

      // Check for existing summary
      const existingSummary = await this.prisma.legalDocumentSummary.findFirst({
        where: {
          legalDocumentId: documentId,
          summaryType: opts.level,
          summaryLevel: 'document'
        }
      });

      if (existingSummary) {
        // Stream existing summary in chunks
        const words = existingSummary.summaryText.split(' ');
        const chunkSize = 10;

        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(' ');
          yield {
            type: 'text',
            content: chunk + ' ',
            timestamp: Date.now(),
            metadata: {
              wordCount: i + chunkSize,
              chunkIndex: Math.floor(i / chunkSize),
              totalChunks: Math.ceil(words.length / chunkSize)
            }
          };

          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Emit key points if available
        const keyPoints = (existingSummary.keyPoints as any)?.points || [];
        for (const point of keyPoints) {
          yield {
            type: 'keypoint',
            content: point,
            timestamp: Date.now()
          };
        }

        yield {
          type: 'done',
          content: JSON.stringify({
            summaryId: existingSummary.id,
            wordCount: words.length,
            cached: true,
            processingTime: Date.now() - startTime
          }),
          timestamp: Date.now()
        };
        return;
      }

      // Generate new streaming summary
      yield* this.generateStreamingSummary(document, opts, startTime);

    } catch (error) {
      console.error('Error in streamSummary:', error);
      yield {
        type: 'error',
        content: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Stream comparative analysis of multiple documents
   *
   * @param documentIds - Array of document IDs to compare
   * @yields StreamChunk - Chunks of comparative analysis
   */
  async *streamComparison(
    documentIds: string[]
  ): AsyncGenerator<StreamChunk> {
    try {
      if (documentIds.length < 2) {
        yield {
          type: 'error',
          content: JSON.stringify({ error: 'At least 2 documents required' }),
          timestamp: Date.now()
        };
        return;
      }

      yield {
        type: 'metadata',
        content: JSON.stringify({
          status: 'started',
          documentCount: documentIds.length
        }),
        timestamp: Date.now()
      };

      // Fetch documents
      const documents = await Promise.all(
        documentIds.map(id =>
          this.prisma.legalDocument.findUnique({
            where: { id },
            select: {
              id: true,
              normTitle: true,
              normType: true,
              legalHierarchy: true,
              content: true
            }
          })
        )
      );

      const validDocuments = documents.filter(d => d !== null);

      if (validDocuments.length !== documentIds.length) {
        yield {
          type: 'error',
          content: JSON.stringify({ error: 'Some documents not found' }),
          timestamp: Date.now()
        };
        return;
      }

      // Build comparison prompt
      const comparisonPrompt = `
        Analyze and compare the following legal documents.

        Documents:
        ${validDocuments.map((doc, idx) => `
        Document ${idx + 1}: ${doc!.normTitle}
        Type: ${doc!.normType}
        Content (excerpt): ${doc!.content.substring(0, 1500)}
        `).join('\n---\n')}

        Provide a comprehensive comparative analysis with:
        - Common themes across documents
        - Key differences
        - Potential conflicts
        - Practical recommendations
        - Overall analysis
      `;

      // Stream response from OpenAI
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert legal analyst. Provide comparative analysis in a structured format.'
          },
          {
            role: 'user',
            content: comparisonPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2500,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield {
            type: 'text',
            content,
            timestamp: Date.now()
          };
        }
      }

      yield {
        type: 'done',
        content: JSON.stringify({
          documentCount: validDocuments.length,
          status: 'completed'
        }),
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Error in streamComparison:', error);
      yield {
        type: 'error',
        content: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error'
        }),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Generate streaming summary using OpenAI streaming API
   */
  private async *generateStreamingSummary(
    document: any,
    options: SummaryOptions,
    startTime: number
  ): AsyncGenerator<StreamChunk> {
    try {
      const prompt = this.buildSummaryPrompt(document, options);

      // Use OpenAI streaming
      const stream = await this.openai.chat.completions.create({
        model: options.level === 'brief' ? 'gpt-3.5-turbo' : 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a legal document analyst. Respond in ${options.language === 'en' ? 'English' : 'Spanish'}.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: options.level === 'brief' ? 150 : options.level === 'detailed' ? 1500 : 800,
        stream: true
      });

      let fullSummary = '';
      let wordCount = 0;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';

        if (content) {
          fullSummary += content;
          wordCount += content.split(/\s+/).filter(w => w.length > 0).length;

          yield {
            type: 'text',
            content,
            timestamp: Date.now(),
            metadata: {
              wordCount
            }
          };
        }
      }

      // Extract key points if requested
      if (options.includeKeyPoints && options.level !== 'brief') {
        yield {
          type: 'metadata',
          content: JSON.stringify({ status: 'extracting_key_points' }),
          timestamp: Date.now()
        };

        const keyPoints = await this.extractKeyPointsQuick(document);
        for (const point of keyPoints) {
          yield {
            type: 'keypoint',
            content: point,
            timestamp: Date.now()
          };
        }
      }

      // Store the generated summary
      const summaryId = crypto.randomUUID();
      await this.prisma.legalDocumentSummary.create({
        data: {
          id: summaryId,
          legalDocumentId: document.id,
          summaryType: options.level,
          summaryLevel: 'document',
          summaryText: fullSummary,
          keyPoints: options.includeKeyPoints ? { points: [] } : undefined,
          confidenceScore: 0.85
        }
      });

      // Final done event
      yield {
        type: 'done',
        content: JSON.stringify({
          summaryId,
          wordCount,
          cached: false,
          processingTime: Date.now() - startTime,
          confidenceScore: 0.85
        }),
        timestamp: Date.now(),
        metadata: {
          wordCount,
          confidenceScore: 0.85
        }
      };

    } catch (error) {
      console.error('Error generating streaming summary:', error);
      yield {
        type: 'error',
        content: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          phase: 'generation'
        }),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Build summary prompt based on document and options
   */
  private buildSummaryPrompt(document: any, options: SummaryOptions): string {
    const contentLength = options.level === 'brief' ? 2000 :
                         options.level === 'detailed' ? 6000 : 4000;

    let prompt = `
      ${options.level === 'brief' ? 'Provide a brief 1-2 sentence summary' :
        options.level === 'detailed' ? 'Provide a comprehensive detailed summary' :
        'Provide a standard paragraph summary'} of this legal document.

      Title: ${document.normTitle}
      Type: ${document.normType}
      Hierarchy: ${document.legalHierarchy}

      Content:
      ${document.content.substring(0, contentLength)}
    `;

    if (options.level === 'brief') {
      prompt += '\n\nSummary (1-2 sentences only):';
    } else if (options.level === 'detailed') {
      prompt += '\n\nProvide a comprehensive summary (300-500 words) covering all major aspects, key provisions, and legal implications.';
    } else {
      prompt += '\n\nProvide a clear paragraph summary (150-250 words) highlighting the main purpose, key provisions, and practical applications.';
    }

    return prompt;
  }

  /**
   * Quick key point extraction without full processing
   */
  private async extractKeyPointsQuick(document: any): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Extract 5 key points from this legal document. Return only the points, one per line.'
          },
          {
            role: 'user',
            content: `Document: ${document.normTitle}\n\n${document.content.substring(0, 3000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      const content = response.choices[0].message.content || '';
      return content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .slice(0, 5);
    } catch (error) {
      console.error('Error extracting quick key points:', error);
      return [];
    }
  }

  // Private helper methods

  /**
   * Generate brief summary (1-2 sentences)
   */
  private async generateBriefSummary(document: any, options: SummaryOptions): Promise<string> {
    const prompt = `
      Provide a brief 1-2 sentence summary of this legal document.

      Title: ${document.normTitle}
      Type: ${document.normType}
      Hierarchy: ${document.legalHierarchy}

      Content (first 2000 characters):
      ${document.content.substring(0, 2000)}

      Summary (1-2 sentences only):
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a legal document analyst. Respond in ${options.language === 'en' ? 'English' : 'Spanish'}.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 150
    });

    return response.choices[0].message.content?.trim() || 'Summary unavailable.';
  }

  /**
   * Generate standard summary (paragraph with key points)
   */
  private async generateStandardSummary(
    document: any,
    options: SummaryOptions
  ): Promise<{ summary: string; keyPoints: string[] }> {
    const prompt = `
      Provide a standard summary of this legal document with key points.

      Title: ${document.normTitle}
      Type: ${document.normType}
      Hierarchy: ${document.legalHierarchy}

      Content:
      ${document.content.substring(0, 4000)}

      Provide response in JSON format:
      {
        "summary": "A clear paragraph summarizing the document (150-250 words)",
        "keyPoints": ["key point 1", "key point 2", "key point 3", "key point 4", "key point 5"]
      }
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a legal document analyst. Respond in ${options.language === 'en' ? 'English' : 'Spanish'}.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      summary: result.summary || 'Summary unavailable.',
      keyPoints: result.keyPoints || []
    };
  }

  /**
   * Generate detailed summary (comprehensive)
   */
  private async generateDetailedSummary(
    document: any,
    options: SummaryOptions
  ): Promise<{ summary: string; keyPoints: string[]; references: string[] }> {
    // For long documents, use chunking
    const chunks = this.chunkContent(document.content, 3000);
    const chunkSummaries: ChunkSummary[] = [];

    for (let i = 0; i < Math.min(chunks.length, 5); i++) {
      const chunkSummary = await this.summarizeChunk(chunks[i], i);
      chunkSummaries.push(chunkSummary);
    }

    // Synthesize chunk summaries
    const synthesisPrompt = `
      Synthesize these section summaries into a comprehensive document summary.

      Document: ${document.normTitle}
      Type: ${document.normType}

      Section Summaries:
      ${chunkSummaries.map(cs => `Section ${cs.chunkIndex + 1}: ${cs.summary}`).join('\n\n')}

      Provide a comprehensive summary in JSON format:
      {
        "summary": "Comprehensive summary of 300-500 words covering all major aspects",
        "keyPoints": ["key point 1", "key point 2", ...up to 10 points],
        "references": ["any legal references mentioned"]
      }
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a legal document analyst creating comprehensive summaries.
          Respond in ${options.language === 'en' ? 'English' : 'Spanish'}.`
        },
        {
          role: 'user',
          content: synthesisPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      summary: result.summary || 'Detailed summary unavailable.',
      keyPoints: result.keyPoints || [],
      references: result.references || []
    };
  }

  /**
   * Generate quick summary for a text snippet
   */
  private async generateQuickSummary(content: string, title: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Provide a 1-sentence summary of the document content.'
        },
        {
          role: 'user',
          content: `Document: ${title}\nContent: ${content.substring(0, 1000)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    });

    return response.choices[0].message.content?.trim() || 'Summary unavailable.';
  }

  /**
   * Summarize a content chunk
   */
  private async summarizeChunk(content: string, index: number): Promise<ChunkSummary> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Summarize this section of a legal document in 2-3 sentences.'
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    return {
      chunkIndex: index,
      content: content.substring(0, 100),
      summary: response.choices[0].message.content?.trim() || 'Section summary unavailable.'
    };
  }

  /**
   * Split content into chunks
   */
  private chunkContent(content: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < content.length) {
      // Try to break at paragraph boundaries
      let end = Math.min(start + chunkSize, content.length);

      if (end < content.length) {
        const lastParagraph = content.lastIndexOf('\n\n', end);
        if (lastParagraph > start + chunkSize / 2) {
          end = lastParagraph;
        }
      }

      chunks.push(content.substring(start, end).trim());
      start = end;
    }

    return chunks;
  }

  /**
   * Store executive summary
   */
  private async storeExecutiveSummary(summary: ExecutiveSummary): Promise<void> {
    await this.prisma.systemMetric.create({
      data: {
        metricName: 'executive_summary',
        metricValue: summary.keyFindings.length,
        metricUnit: 'findings',
        category: 'case_analysis',
        metadata: summary as any
      }
    });
  }
}

// Singleton instance
let documentSummarizationInstance: DocumentSummarizationService | null = null;

export function getDocumentSummarizationService(prisma?: PrismaClient): DocumentSummarizationService {
  if (!documentSummarizationInstance) {
    documentSummarizationInstance = new DocumentSummarizationService(prisma);
  }
  return documentSummarizationInstance;
}
