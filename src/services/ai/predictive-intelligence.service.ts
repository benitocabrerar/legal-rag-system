/**
 * Predictive Intelligence Service
 *
 * AI-powered predictions for case outcomes, document relevance, and timeline forecasting.
 * Uses OpenAI GPT-4 for analysis and text-embedding-3-small for semantic similarity.
 */

import { PrismaClient } from '@prisma/client';
import { prisma as prismaClient } from '../../lib/prisma.js';
import { OpenAI } from 'openai';
import * as crypto from 'crypto';

// Types for predictions
interface CaseOutcomePrediction {
  id: string;
  caseId: string;
  predictedOutcome: string;
  confidenceScore: number;
  factors: PredictionFactor[];
  similarCases: SimilarCase[];
  recommendations: string[];
  createdAt: Date;
}

interface PredictionFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

interface SimilarCase {
  caseId: string;
  title: string;
  similarity: number;
  outcome?: string;
}

interface DocumentRelevancePrediction {
  id: string;
  documentId: string;
  queryContext: string;
  relevanceScore: number;
  semanticSimilarity: number;
  keyMatchingTerms: string[];
  explanation: string;
  createdAt: Date;
}

interface TimelinePrediction {
  id: string;
  caseId: string;
  milestones: MilestonePrediction[];
  estimatedCompletionDate: Date;
  confidenceScore: number;
  riskFactors: string[];
  createdAt: Date;
}

interface MilestonePrediction {
  name: string;
  predictedDate: Date;
  confidenceLevel: 'high' | 'medium' | 'low';
  dependencies: string[];
  description: string;
}

interface PredictionFeedback {
  predictionId: string;
  userId: string;
  accuracy: number;
  helpful: boolean;
  comment?: string;
}

export class PredictiveIntelligenceService {
  private prisma: PrismaClient;
  private openai: OpenAI;
  private embeddingModel = 'text-embedding-3-small';
  private chatModel = 'gpt-4';

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || prismaClient;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000'),
      maxRetries: parseInt(process.env.OPENAI_RETRY_ATTEMPTS || '3'),
    });
  }

  /**
   * Predict case outcome using GPT-4 analysis
   */
  async predictCaseOutcome(caseId: string): Promise<CaseOutcomePrediction> {
    const startTime = Date.now();

    try {
      // Fetch case data with related documents
      const caseData = await this.prisma.case.findUnique({
        where: { id: caseId },
        include: {
          documents: {
            include: {
              chunks: true
            }
          },
          tasks: {
            orderBy: { createdAt: 'desc' },
            take: 20
          },
          events: {
            orderBy: { startTime: 'desc' },
            take: 10
          }
        }
      });

      if (!caseData) {
        throw new Error(`Case not found: ${caseId}`);
      }

      // Prepare case summary for analysis
      const caseSummary = this.prepareCaseSummary(caseData);

      // Find similar cases using embeddings
      const caseEmbedding = await this.generateEmbedding(caseSummary);
      const similarCases = await this.findSimilarCases(caseEmbedding, caseId);

      // Generate prediction using GPT-4
      const predictionPrompt = this.buildOutcomePredictionPrompt(caseData, similarCases);

      const response = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages: [
          {
            role: 'system',
            content: `You are an expert legal analyst specializing in case outcome prediction.
            Analyze the provided case information and similar cases to predict the most likely outcome.
            Provide a structured analysis with confidence scores and key factors.
            Always respond in JSON format.`
          },
          {
            role: 'user',
            content: predictionPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const predictionResult = JSON.parse(response.choices[0].message.content || '{}');

      // Create prediction record
      const predictionId = crypto.randomUUID();
      const prediction: CaseOutcomePrediction = {
        id: predictionId,
        caseId,
        predictedOutcome: predictionResult.predictedOutcome || 'Unable to determine',
        confidenceScore: predictionResult.confidenceScore || 0.5,
        factors: predictionResult.factors || [],
        similarCases: similarCases.slice(0, 5),
        recommendations: predictionResult.recommendations || [],
        createdAt: new Date()
      };

      // Store prediction in database
      await this.storePrediction('case_outcome', prediction);

      // Log processing time
      const processingTime = Date.now() - startTime;
      console.log(`Case outcome prediction completed in ${processingTime}ms for case ${caseId}`);

      return prediction;
    } catch (error) {
      console.error('Error predicting case outcome:', error);
      throw error;
    }
  }

  /**
   * Predict document relevance to a specific query context
   */
  async predictDocumentRelevance(
    documentId: string,
    queryContext: string
  ): Promise<DocumentRelevancePrediction> {
    const startTime = Date.now();

    try {
      // Fetch document
      const document = await this.prisma.legalDocument.findUnique({
        where: { id: documentId },
        include: {
          chunks: true,
          summaries: {
            where: { summaryType: 'executive' },
            take: 1
          }
        }
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Generate embeddings for both document and query
      const documentText = document.content.substring(0, 8000);
      const summaryText = document.summaries[0]?.summaryText || documentText.substring(0, 2000);

      const [documentEmbedding, queryEmbedding] = await Promise.all([
        this.generateEmbedding(summaryText),
        this.generateEmbedding(queryContext)
      ]);

      // Calculate semantic similarity using cosine similarity
      const semanticSimilarity = this.cosineSimilarity(documentEmbedding, queryEmbedding);

      // Extract key matching terms
      const keyMatchingTerms = this.extractMatchingTerms(documentText, queryContext);

      // Generate explanation using GPT-4
      const explanationPrompt = `
        Analyze the relevance of this legal document to the given query.

        Document Title: ${document.normTitle}
        Document Type: ${document.normType}
        Document Summary: ${summaryText.substring(0, 1000)}

        Query: ${queryContext}

        Semantic Similarity Score: ${(semanticSimilarity * 100).toFixed(1)}%
        Matching Terms: ${keyMatchingTerms.join(', ')}

        Provide a brief explanation of why this document is or is not relevant to the query.
        Focus on legal concepts and practical applicability.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a legal document analyst. Provide concise, factual explanations.'
          },
          {
            role: 'user',
            content: explanationPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      const explanation = response.choices[0].message.content || '';

      // Calculate combined relevance score
      const relevanceScore = this.calculateRelevanceScore(
        semanticSimilarity,
        keyMatchingTerms.length,
        documentText.length
      );

      const predictionId = crypto.randomUUID();
      const prediction: DocumentRelevancePrediction = {
        id: predictionId,
        documentId,
        queryContext,
        relevanceScore,
        semanticSimilarity,
        keyMatchingTerms,
        explanation,
        createdAt: new Date()
      };

      // Store prediction
      await this.storePrediction('document_relevance', prediction);

      const processingTime = Date.now() - startTime;
      console.log(`Document relevance prediction completed in ${processingTime}ms`);

      return prediction;
    } catch (error) {
      console.error('Error predicting document relevance:', error);
      throw error;
    }
  }

  /**
   * Generate timeline predictions for case milestones
   */
  async generateTimelinePrediction(caseId: string): Promise<TimelinePrediction> {
    const startTime = Date.now();

    try {
      // Fetch case with related data
      const caseData = await this.prisma.case.findUnique({
        where: { id: caseId },
        include: {
          tasks: {
            orderBy: { dueDate: 'asc' }
          },
          events: {
            orderBy: { startTime: 'asc' }
          },
          documents: true
        }
      });

      if (!caseData) {
        throw new Error(`Case not found: ${caseId}`);
      }

      // Analyze historical data for similar cases
      const historicalPatterns = await this.analyzeHistoricalPatterns(caseData);

      // Build prediction prompt
      const predictionPrompt = `
        Analyze the following legal case and predict timeline milestones.

        Case Information:
        - Title: ${caseData.title}
        - Description: ${caseData.description || 'Not provided'}
        - Status: ${caseData.status}
        - Created: ${caseData.createdAt.toISOString()}
        - Current Tasks: ${caseData.tasks.length}
        - Scheduled Events: ${caseData.events.length}
        - Documents: ${caseData.documents.length}

        Existing Tasks:
        ${caseData.tasks.slice(0, 10).map(t => `- ${t.title} (Due: ${t.dueDate?.toISOString() || 'Not set'})`).join('\n')}

        Historical Patterns:
        ${JSON.stringify(historicalPatterns, null, 2)}

        Based on typical legal case workflows, predict:
        1. Key milestones and their expected dates
        2. Estimated case completion date
        3. Risk factors that could delay the case
        4. Confidence level for each prediction

        Respond in JSON format with the following structure:
        {
          "milestones": [
            {
              "name": "milestone name",
              "predictedDate": "ISO date string",
              "confidenceLevel": "high|medium|low",
              "dependencies": ["list of dependencies"],
              "description": "brief description"
            }
          ],
          "estimatedCompletionDate": "ISO date string",
          "confidenceScore": 0.0-1.0,
          "riskFactors": ["list of risk factors"]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages: [
          {
            role: 'system',
            content: `You are an expert legal project manager specializing in case timeline prediction.
            Provide realistic timeline estimates based on typical legal workflows and case complexity.
            Always respond in valid JSON format.`
          },
          {
            role: 'user',
            content: predictionPrompt
          }
        ],
        temperature: 0.4,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      const predictionId = crypto.randomUUID();
      const prediction: TimelinePrediction = {
        id: predictionId,
        caseId,
        milestones: (result.milestones || []).map((m: any) => ({
          name: m.name,
          predictedDate: new Date(m.predictedDate),
          confidenceLevel: m.confidenceLevel || 'medium',
          dependencies: m.dependencies || [],
          description: m.description || ''
        })),
        estimatedCompletionDate: new Date(result.estimatedCompletionDate || Date.now() + 90 * 24 * 60 * 60 * 1000),
        confidenceScore: result.confidenceScore || 0.6,
        riskFactors: result.riskFactors || [],
        createdAt: new Date()
      };

      // Store prediction
      await this.storePrediction('timeline', prediction);

      const processingTime = Date.now() - startTime;
      console.log(`Timeline prediction completed in ${processingTime}ms for case ${caseId}`);

      return prediction;
    } catch (error) {
      console.error('Error generating timeline prediction:', error);
      throw error;
    }
  }

  /**
   * Get prediction by ID
   */
  async getPrediction(predictionId: string): Promise<any> {
    const prediction = await this.prisma.systemMetric.findFirst({
      where: {
        metricName: 'ai_prediction',
        metadata: {
          path: ['id'],
          equals: predictionId
        }
      }
    });

    if (!prediction) {
      return null;
    }

    return prediction.metadata;
  }

  /**
   * Submit feedback for a prediction
   */
  async submitFeedback(feedback: PredictionFeedback): Promise<void> {
    try {
      await this.prisma.systemMetric.create({
        data: {
          metricName: 'prediction_feedback',
          metricValue: feedback.accuracy,
          metricUnit: 'accuracy_score',
          category: 'ai_predictions',
          metadata: {
            predictionId: feedback.predictionId,
            userId: feedback.userId,
            helpful: feedback.helpful,
            comment: feedback.comment,
            timestamp: new Date().toISOString()
          }
        }
      });

      console.log(`Feedback recorded for prediction ${feedback.predictionId}`);
    } catch (error) {
      console.error('Error submitting prediction feedback:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Generate embedding using text-embedding-3-small
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
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) {
      return 0;
    }

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

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Prepare case summary for embedding generation
   */
  private prepareCaseSummary(caseData: any): string {
    const parts = [
      `Case: ${caseData.title}`,
      caseData.description ? `Description: ${caseData.description}` : '',
      `Status: ${caseData.status}`,
      caseData.clientName ? `Client: ${caseData.clientName}` : '',
      `Documents: ${caseData.documents.length}`,
      `Tasks: ${caseData.tasks.length}`
    ];

    // Add document summaries
    if (caseData.documents.length > 0) {
      const docSummaries = caseData.documents
        .slice(0, 5)
        .map((d: any) => d.title)
        .join(', ');
      parts.push(`Related documents: ${docSummaries}`);
    }

    return parts.filter(p => p).join('\n');
  }

  /**
   * Find similar cases using embedding similarity
   */
  private async findSimilarCases(
    embedding: number[],
    excludeCaseId: string
  ): Promise<SimilarCase[]> {
    // This would ideally use a vector database like Qdrant or pgvector
    // For now, we'll do a simple in-memory comparison with recent cases
    const recentCases = await this.prisma.case.findMany({
      where: {
        id: { not: excludeCaseId },
        status: { in: ['completed', 'closed', 'resolved'] }
      },
      take: 50,
      orderBy: { updatedAt: 'desc' }
    });

    const similarCases: SimilarCase[] = [];

    for (const caseItem of recentCases) {
      const caseSummary = `${caseItem.title} ${caseItem.description || ''}`;
      const caseEmbedding = await this.generateEmbedding(caseSummary);
      const similarity = this.cosineSimilarity(embedding, caseEmbedding);

      if (similarity > 0.5) {
        similarCases.push({
          caseId: caseItem.id,
          title: caseItem.title,
          similarity,
          outcome: caseItem.status
        });
      }
    }

    return similarCases.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
  }

  /**
   * Build outcome prediction prompt
   */
  private buildOutcomePredictionPrompt(caseData: any, similarCases: SimilarCase[]): string {
    return `
      Analyze the following legal case and predict its outcome.

      Case Information:
      - Title: ${caseData.title}
      - Description: ${caseData.description || 'Not provided'}
      - Status: ${caseData.status}
      - Client: ${caseData.clientName || 'Not specified'}
      - Case Number: ${caseData.caseNumber || 'Not assigned'}
      - Created: ${caseData.createdAt.toISOString()}
      - Documents: ${caseData.documents.length}
      - Active Tasks: ${caseData.tasks.filter((t: any) => t.status !== 'COMPLETED').length}

      Similar Cases:
      ${similarCases.map(sc => `- ${sc.title} (Similarity: ${(sc.similarity * 100).toFixed(1)}%, Outcome: ${sc.outcome})`).join('\n')}

      Provide a prediction in the following JSON format:
      {
        "predictedOutcome": "favorable|unfavorable|settlement|dismissed|ongoing",
        "confidenceScore": 0.0-1.0,
        "factors": [
          {
            "name": "factor name",
            "impact": "positive|negative|neutral",
            "weight": 0.0-1.0,
            "description": "brief explanation"
          }
        ],
        "recommendations": [
          "actionable recommendation 1",
          "actionable recommendation 2"
        ]
      }
    `;
  }

  /**
   * Extract matching terms between document and query
   */
  private extractMatchingTerms(documentText: string, query: string): string[] {
    const queryTerms = query.toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 3)
      .filter(t => !this.isStopWord(t));

    const docLower = documentText.toLowerCase();
    const matchingTerms = queryTerms.filter(term => docLower.includes(term));

    return [...new Set(matchingTerms)].slice(0, 10);
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      'el', 'la', 'de', 'en', 'y', 'a', 'los', 'las', 'del', 'se', 'con',
      'para', 'por', 'una', 'un', 'su', 'al', 'es', 'lo', 'como', 'the',
      'and', 'or', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could'
    ];
    return stopWords.includes(word.toLowerCase());
  }

  /**
   * Calculate combined relevance score
   */
  private calculateRelevanceScore(
    semanticSimilarity: number,
    matchingTermCount: number,
    documentLength: number
  ): number {
    // Weighted combination of factors
    const semanticWeight = 0.6;
    const termMatchWeight = 0.3;
    const lengthPenalty = 0.1;

    // Normalize term match (0-1)
    const termMatchScore = Math.min(matchingTermCount / 5, 1);

    // Length factor (prefer medium-length documents)
    const optimalLength = 5000;
    const lengthFactor = 1 - Math.abs(documentLength - optimalLength) / (optimalLength * 4);
    const normalizedLengthFactor = Math.max(0, Math.min(1, lengthFactor));

    return (
      semanticSimilarity * semanticWeight +
      termMatchScore * termMatchWeight +
      normalizedLengthFactor * lengthPenalty
    );
  }

  /**
   * Analyze historical patterns for timeline prediction
   */
  private async analyzeHistoricalPatterns(caseData: any): Promise<any> {
    // Get completed cases for pattern analysis
    const completedCases = await this.prisma.case.findMany({
      where: {
        status: { in: ['completed', 'closed', 'resolved'] }
      },
      include: {
        tasks: true,
        events: true
      },
      take: 20,
      orderBy: { updatedAt: 'desc' }
    });

    if (completedCases.length === 0) {
      return {
        averageDuration: 90,
        averageTasks: 10,
        averageEvents: 5,
        sampleSize: 0
      };
    }

    // Calculate averages
    const durations = completedCases.map(c => {
      const created = new Date(c.createdAt).getTime();
      const updated = new Date(c.updatedAt).getTime();
      return (updated - created) / (1000 * 60 * 60 * 24); // days
    });

    const taskCounts = completedCases.map(c => c.tasks.length);
    const eventCounts = completedCases.map(c => c.events.length);

    return {
      averageDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      averageTasks: Math.round(taskCounts.reduce((a, b) => a + b, 0) / taskCounts.length),
      averageEvents: Math.round(eventCounts.reduce((a, b) => a + b, 0) / eventCounts.length),
      sampleSize: completedCases.length
    };
  }

  /**
   * Store prediction in database
   */
  private async storePrediction(type: string, prediction: any): Promise<void> {
    await this.prisma.systemMetric.create({
      data: {
        metricName: 'ai_prediction',
        metricValue: prediction.confidenceScore || prediction.relevanceScore || 0,
        metricUnit: 'confidence',
        category: `prediction_${type}`,
        metadata: prediction
      }
    });
  }
}

// Singleton instance
let predictiveIntelligenceInstance: PredictiveIntelligenceService | null = null;

export function getPredictiveIntelligenceService(prisma?: PrismaClient): PredictiveIntelligenceService {
  if (!predictiveIntelligenceInstance) {
    predictiveIntelligenceInstance = new PredictiveIntelligenceService(prisma);
  }
  return predictiveIntelligenceInstance;
}
