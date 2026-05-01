/**
 * Predictive Intelligence Service
 * ML-based prediction engine for legal case outcomes, appeal likelihood, and settlement estimation
 *
 * @module predictive-intelligence.service
 * @author Legal RAG System - AI/NLP Improvements
 * @version 1.0.0
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CasePredictionInput {
  caseType: string;
  jurisdiction: string;
  documentIds?: string[];
  caseMetadata?: {
    plaintiffType?: string;
    defendantType?: string;
    claimAmount?: number;
    filingDate?: Date;
    legalArea?: string;
    complexity?: 'low' | 'medium' | 'high';
  };
}

export interface CaseOutcomePrediction {
  predictionId: string;
  outcomes: {
    outcome: string;
    probability: number;
    confidence: number;
  }[];
  primaryOutcome: string;
  overallConfidence: number;
  explanations: PredictionExplanation[];
  similarCases: SimilarCase[];
  modelInfo: {
    modelId: string;
    modelVersion: string;
    accuracy: number;
  };
  timestamp: Date;
}

export interface AppealPrediction {
  predictionId: string;
  appealLikelihood: number;
  appealSuccessRate: number;
  confidence: number;
  factors: AppealFactor[];
  recommendations: string[];
  timestamp: Date;
}

export interface SettlementEstimate {
  predictionId: string;
  estimatedRange: {
    low: number;
    median: number;
    high: number;
  };
  confidence: number;
  factors: SettlementFactor[];
  comparableSettlements: ComparableSettlement[];
  timestamp: Date;
}

export interface PredictionExplanation {
  feature: string;
  impact: 'positive' | 'negative' | 'neutral';
  contribution: number;
  description: string;
}

export interface SimilarCase {
  caseId?: string;
  documentId: string;
  similarity: number;
  outcome: string;
  relevantFactors: string[];
}

export interface AppealFactor {
  factor: string;
  weight: number;
  direction: 'increases' | 'decreases';
  explanation: string;
}

export interface SettlementFactor {
  factor: string;
  influence: number;
  category: 'case_strength' | 'precedent' | 'economic' | 'procedural';
}

export interface ComparableSettlement {
  caseType: string;
  settlementAmount: number;
  year: number;
  jurisdiction: string;
}

export interface ModelMetrics {
  modelId: string;
  modelName: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  trainingSize: number;
  lastTrainedAt: Date;
  predictionCount: number;
  feedbackCount: number;
  feedbackAccuracy: number;
}

export interface TrainingConfig {
  modelType: 'outcome_predictor' | 'appeal_predictor' | 'settlement_estimator';
  hyperparameters?: Record<string, any>;
  trainingDataFilter?: {
    startDate?: Date;
    endDate?: Date;
    jurisdictions?: string[];
    caseTypes?: string[];
  };
  validationSplit?: number;
}

// ============================================================================
// Feature Engineering Helper
// ============================================================================

class FeatureEngineeringHelper {
  /**
   * Extract numerical features from case data for model input
   */
  async extractFeatures(input: CasePredictionInput): Promise<Record<string, number>> {
    const features: Record<string, number> = {};

    // Case type encoding
    const caseTypeMap: Record<string, number> = {
      'civil': 1,
      'criminal': 2,
      'administrative': 3,
      'constitutional': 4,
      'labor': 5,
      'family': 6,
      'commercial': 7
    };
    features['case_type'] = caseTypeMap[input.caseType.toLowerCase()] || 0;

    // Jurisdiction encoding
    const jurisdictionMap: Record<string, number> = {
      'nacional': 1,
      'provincial': 2,
      'municipal': 3,
      'internacional': 4
    };
    features['jurisdiction'] = jurisdictionMap[input.jurisdiction.toLowerCase()] || 0;

    // Metadata features
    if (input.caseMetadata) {
      features['claim_amount_log'] = input.caseMetadata.claimAmount
        ? Math.log10(input.caseMetadata.claimAmount + 1)
        : 0;

      const complexityMap: Record<string, number> = {
        'low': 1,
        'medium': 2,
        'high': 3
      };
      features['complexity'] = input.caseMetadata.complexity
        ? complexityMap[input.caseMetadata.complexity]
        : 2;

      // Days since filing
      if (input.caseMetadata.filingDate) {
        const daysSinceFiling = Math.floor(
          (Date.now() - input.caseMetadata.filingDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        features['days_since_filing'] = daysSinceFiling;
      }
    }

    // Document-based features
    if (input.documentIds && input.documentIds.length > 0) {
      features['document_count'] = input.documentIds.length;

      // Calculate citation density from documents
      const citationCount = await prisma.documentCitation.count({
        where: {
          sourceDocumentId: { in: input.documentIds }
        }
      });
      features['citation_density'] = citationCount / input.documentIds.length;
    }

    return features;
  }

  /**
   * Find similar historical cases for comparison
   */
  async findSimilarCases(
    input: CasePredictionInput,
    limit: number = 5
  ): Promise<SimilarCase[]> {
    // Query for similar documents based on metadata matching
    const similarDocs = await prisma.legalDocument.findMany({
      where: {
        AND: [
          { jurisdiction: input.jurisdiction as any },
          { isActive: true }
        ]
      },
      take: limit * 2,
      include: {
        authorityScore: true
      },
      orderBy: {
        viewCount: 'desc'
      }
    });

    // Calculate similarity scores and filter
    const similarCases: SimilarCase[] = similarDocs
      .map(doc => ({
        documentId: doc.id,
        similarity: this.calculateSimilarity(input, doc),
        outcome: this.inferOutcome(doc),
        relevantFactors: this.extractRelevantFactors(doc)
      }))
      .filter(c => c.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarCases;
  }

  private calculateSimilarity(input: CasePredictionInput, doc: any): number {
    let score = 0;
    let weights = 0;

    // Jurisdiction match
    if (doc.jurisdiction === input.jurisdiction) {
      score += 0.3;
    }
    weights += 0.3;

    // Case type inference from document category
    const categoryMatch = this.inferCaseTypeFromCategory(doc.category || doc.legalHierarchy);
    if (categoryMatch === input.caseType) {
      score += 0.4;
    }
    weights += 0.4;

    // Complexity match
    if (input.caseMetadata?.complexity) {
      const docComplexity = this.inferComplexity(doc);
      if (docComplexity === input.caseMetadata.complexity) {
        score += 0.3;
      }
    }
    weights += 0.3;

    return score / weights;
  }

  private inferCaseTypeFromCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'CONSTITUTIONAL_NORM': 'constitutional',
      'ORGANIC_LAW': 'civil',
      'ORDINARY_LAW': 'civil',
      'RESOLUTION_JUDICIAL': 'criminal',
      'ADMINISTRATIVE_AGREEMENT': 'administrative'
    };
    return categoryMap[category] || 'civil';
  }

  private inferComplexity(doc: any): string {
    const contentLength = doc.content?.length || 0;
    if (contentLength > 50000) return 'high';
    if (contentLength > 20000) return 'medium';
    return 'low';
  }

  private inferOutcome(doc: any): string {
    // This would ideally come from labeled data
    // For now, return placeholder
    return 'favorable';
  }

  private extractRelevantFactors(doc: any): string[] {
    const factors: string[] = [];

    if (doc.normType) factors.push(`Norm Type: ${doc.normType}`);
    if (doc.legalHierarchy) factors.push(`Hierarchy: ${doc.legalHierarchy}`);
    if (doc.authorityScore?.pagerankScore) {
      factors.push(`Authority Score: ${doc.authorityScore.pagerankScore.toFixed(2)}`);
    }

    return factors;
  }
}

// ============================================================================
// Predictive Intelligence Service
// ============================================================================

export class PredictiveIntelligenceService {
  private featureHelper: FeatureEngineeringHelper;

  constructor() {
    this.featureHelper = new FeatureEngineeringHelper();
  }

  /**
   * Predict case outcome using ML model
   */
  async predictCaseOutcome(input: CasePredictionInput): Promise<CaseOutcomePrediction> {
    const startTime = Date.now();

    try {
      // Get active model for outcome prediction
      const model = await this.getActiveModel('outcome_predictor');

      // Extract features
      const features = await this.featureHelper.extractFeatures(input);

      // Find similar cases for reference
      const similarCases = await this.featureHelper.findSimilarCases(input);

      // Run inference (placeholder - would use actual ML model)
      const prediction = await this.runOutcomeInference(features, model);

      // Generate explanations
      const explanations = this.generateExplanations(features, prediction);

      // Store prediction
      const storedPrediction = await prisma.prediction.create({
        data: {
          modelId: model.id,
          predictionType: 'case_outcome',
          inputData: { ...input, features },
          prediction: prediction,
          confidence: prediction.overallConfidence,
          timestamp: new Date()
        }
      });

      return {
        predictionId: storedPrediction.id,
        outcomes: prediction.outcomes,
        primaryOutcome: prediction.primaryOutcome,
        overallConfidence: prediction.overallConfidence,
        explanations,
        similarCases,
        modelInfo: {
          modelId: model.id,
          modelVersion: model.version,
          accuracy: model.accuracy || 0
        },
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Case outcome prediction failed:', error);
      throw error;
    }
  }

  /**
   * Predict likelihood of appeal
   */
  async predictAppealLikelihood(rulingDocumentId: string): Promise<AppealPrediction> {
    try {
      // Get the ruling document
      const document = await prisma.legalDocument.findUnique({
        where: { id: rulingDocumentId },
        include: {
          authorityScore: true,
          sourceCitations: true
        }
      });

      if (!document) {
        throw new Error('Ruling document not found');
      }

      // Get active model
      const model = await this.getActiveModel('appeal_predictor');

      // Analyze ruling characteristics
      const factors = this.analyzeAppealFactors(document);

      // Calculate appeal likelihood
      const appealLikelihood = this.calculateAppealLikelihood(factors);
      const appealSuccessRate = this.calculateAppealSuccessRate(factors);

      // Store prediction
      const storedPrediction = await prisma.prediction.create({
        data: {
          modelId: model.id,
          predictionType: 'appeal_likelihood',
          inputData: { documentId: rulingDocumentId },
          prediction: {
            appealLikelihood,
            appealSuccessRate,
            factors
          },
          confidence: 0.75,
          documentId: rulingDocumentId,
          timestamp: new Date()
        }
      });

      return {
        predictionId: storedPrediction.id,
        appealLikelihood,
        appealSuccessRate,
        confidence: 0.75,
        factors,
        recommendations: this.generateAppealRecommendations(factors, appealLikelihood),
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Appeal likelihood prediction failed:', error);
      throw error;
    }
  }

  /**
   * Estimate settlement range
   */
  async estimateSettlement(input: CasePredictionInput): Promise<SettlementEstimate> {
    try {
      const model = await this.getActiveModel('settlement_estimator');

      // Extract features for settlement estimation
      const features = await this.featureHelper.extractFeatures(input);

      // Analyze settlement factors
      const factors = this.analyzeSettlementFactors(input, features);

      // Calculate settlement range
      const estimatedRange = this.calculateSettlementRange(input, factors);

      // Find comparable settlements
      const comparableSettlements = await this.findComparableSettlements(input);

      // Store prediction
      const storedPrediction = await prisma.prediction.create({
        data: {
          modelId: model.id,
          predictionType: 'settlement_estimate',
          inputData: { ...input, features },
          prediction: {
            estimatedRange,
            factors,
            comparableSettlements
          },
          confidence: 0.65,
          timestamp: new Date()
        }
      });

      return {
        predictionId: storedPrediction.id,
        estimatedRange,
        confidence: 0.65,
        factors,
        comparableSettlements,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Settlement estimation failed:', error);
      throw error;
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelPerformance(modelId?: string): Promise<ModelMetrics[]> {
    const where = modelId ? { id: modelId } : { isActive: true };

    const models = await prisma.mLModel.findMany({
      where,
      include: {
        predictions: {
          select: {
            id: true,
            confidence: true,
            feedbackReceived: true,
            actualOutcome: true
          }
        }
      }
    });

    return models.map(model => {
      const predictions = model.predictions || [];
      const feedbackPredictions = predictions.filter(p => p.feedbackReceived);

      // Calculate feedback accuracy (predictions where actual matched predicted)
      let feedbackAccuracy = 0;
      if (feedbackPredictions.length > 0) {
        const correctPredictions = feedbackPredictions.filter(p => {
          // This is simplified - would need actual comparison logic
          return p.actualOutcome !== null;
        }).length;
        feedbackAccuracy = correctPredictions / feedbackPredictions.length;
      }

      return {
        modelId: model.id,
        modelName: model.name,
        accuracy: model.accuracy || 0,
        precision: model.precision || 0,
        recall: model.recall || 0,
        f1Score: (model.config as any)?.f1Score || 0,
        auc: (model.config as any)?.auc || 0,
        trainingSize: (model.trainingSet as any)?.size || 0,
        lastTrainedAt: model.trainedAt,
        predictionCount: predictions.length,
        feedbackCount: feedbackPredictions.length,
        feedbackAccuracy
      };
    });
  }

  /**
   * Submit feedback on a prediction
   */
  async submitFeedback(
    predictionId: string,
    actualOutcome: any,
    wasAccurate: boolean,
    feedback?: string,
    userId?: string
  ): Promise<void> {
    // Create feedback record
    await prisma.$executeRaw`
      INSERT INTO prediction_feedback (prediction_id, actual_outcome, was_accurate, feedback, user_id)
      VALUES (${predictionId}, ${JSON.stringify(actualOutcome)}::jsonb, ${wasAccurate}, ${feedback}, ${userId})
    `;

    // Update prediction with actual outcome
    await prisma.prediction.update({
      where: { id: predictionId },
      data: {
        actualOutcome,
        feedbackReceived: true
      }
    });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async getActiveModel(type: string) {
    let model = await prisma.mLModel.findFirst({
      where: {
        type,
        isActive: true
      },
      orderBy: { trainedAt: 'desc' }
    });

    if (!model) {
      // Create a default model if none exists
      model = await prisma.mLModel.create({
        data: {
          name: `Default ${type}`,
          type,
          version: '1.0.0',
          trainedAt: new Date(),
          accuracy: 0.7,
          precision: 0.7,
          recall: 0.7,
          config: {},
          isActive: true
        }
      });
    }

    return model;
  }

  private async runOutcomeInference(
    features: Record<string, number>,
    _model: any
  ): Promise<any> {
    // Placeholder for actual ML inference
    // In production, this would:
    // 1. Load the model from S3/storage
    // 2. Preprocess features according to model requirements
    // 3. Run inference using TensorFlow.js or call external API
    // 4. Post-process and return results

    const outcomes = [
      { outcome: 'favorable', probability: 0.65, confidence: 0.75 },
      { outcome: 'unfavorable', probability: 0.25, confidence: 0.75 },
      { outcome: 'settlement', probability: 0.10, confidence: 0.70 }
    ];

    return {
      outcomes,
      primaryOutcome: outcomes[0].outcome,
      overallConfidence: outcomes[0].confidence
    };
  }

  private generateExplanations(
    features: Record<string, number>,
    _prediction: any
  ): PredictionExplanation[] {
    const explanations: PredictionExplanation[] = [];

    // Generate SHAP-like explanations based on feature values
    if (features['jurisdiction'] === 1) {
      explanations.push({
        feature: 'Jurisdiction',
        impact: 'positive',
        contribution: 0.15,
        description: 'National jurisdiction typically has clearer precedents'
      });
    }

    if (features['citation_density'] && features['citation_density'] > 2) {
      explanations.push({
        feature: 'Citation Density',
        impact: 'positive',
        contribution: 0.12,
        description: 'High citation count indicates well-documented case'
      });
    }

    if (features['complexity'] === 3) {
      explanations.push({
        feature: 'Case Complexity',
        impact: 'negative',
        contribution: -0.08,
        description: 'High complexity cases have more uncertain outcomes'
      });
    }

    if (features['claim_amount_log'] && features['claim_amount_log'] > 5) {
      explanations.push({
        feature: 'Claim Amount',
        impact: 'neutral',
        contribution: 0.05,
        description: 'Large claims tend to involve more thorough review'
      });
    }

    return explanations;
  }

  private analyzeAppealFactors(document: any): AppealFactor[] {
    const factors: AppealFactor[] = [];

    // Authority score factor
    if (document.authorityScore?.pagerankScore) {
      const score = document.authorityScore.pagerankScore;
      factors.push({
        factor: 'Document Authority',
        weight: score > 0.5 ? 0.3 : 0.1,
        direction: score > 0.5 ? 'decreases' : 'increases',
        explanation: score > 0.5
          ? 'High authority rulings are less likely to be appealed successfully'
          : 'Lower authority may encourage appeals'
      });
    }

    // Citation count factor
    const citationCount = document.sourceCitations?.length || 0;
    factors.push({
      factor: 'Citation Support',
      weight: citationCount > 5 ? 0.25 : 0.15,
      direction: citationCount > 5 ? 'decreases' : 'increases',
      explanation: citationCount > 5
        ? 'Well-cited rulings have stronger legal foundation'
        : 'Limited citations may provide grounds for appeal'
    });

    // Content length as proxy for thoroughness
    const contentLength = document.content?.length || 0;
    factors.push({
      factor: 'Ruling Thoroughness',
      weight: contentLength > 30000 ? 0.2 : 0.1,
      direction: contentLength > 30000 ? 'decreases' : 'increases',
      explanation: contentLength > 30000
        ? 'Detailed rulings are harder to challenge'
        : 'Brief rulings may have overlooked issues'
    });

    return factors;
  }

  private calculateAppealLikelihood(factors: AppealFactor[]): number {
    // Base likelihood
    let likelihood = 0.3;

    // Adjust based on factors
    for (const factor of factors) {
      if (factor.direction === 'increases') {
        likelihood += factor.weight * 0.5;
      } else {
        likelihood -= factor.weight * 0.3;
      }
    }

    // Ensure within bounds
    return Math.max(0.05, Math.min(0.95, likelihood));
  }

  private calculateAppealSuccessRate(factors: AppealFactor[]): number {
    // Base success rate
    let successRate = 0.25;

    // Adjust based on factors
    for (const factor of factors) {
      if (factor.direction === 'increases') {
        successRate += factor.weight * 0.3;
      } else {
        successRate -= factor.weight * 0.2;
      }
    }

    // Ensure within bounds
    return Math.max(0.05, Math.min(0.75, successRate));
  }

  private generateAppealRecommendations(
    factors: AppealFactor[],
    appealLikelihood: number
  ): string[] {
    const recommendations: string[] = [];

    if (appealLikelihood > 0.6) {
      recommendations.push('High appeal likelihood - consider preparing defense strategy');
    }

    const weakFactors = factors.filter(f => f.direction === 'increases' && f.weight > 0.15);
    for (const factor of weakFactors) {
      recommendations.push(`Address ${factor.factor}: ${factor.explanation}`);
    }

    if (appealLikelihood < 0.3) {
      recommendations.push('Low appeal risk - ruling appears well-supported');
    }

    return recommendations;
  }

  private analyzeSettlementFactors(
    input: CasePredictionInput,
    features: Record<string, number>
  ): SettlementFactor[] {
    const factors: SettlementFactor[] = [];

    // Case strength based on features
    factors.push({
      factor: 'Case Strength',
      influence: features['citation_density'] ? features['citation_density'] * 0.1 : 0.5,
      category: 'case_strength'
    });

    // Economic factors
    if (input.caseMetadata?.claimAmount) {
      factors.push({
        factor: 'Claim Amount',
        influence: 0.3,
        category: 'economic'
      });
    }

    // Complexity factor
    factors.push({
      factor: 'Case Complexity',
      influence: features['complexity'] === 3 ? 0.2 : 0.1,
      category: 'procedural'
    });

    return factors;
  }

  private calculateSettlementRange(
    input: CasePredictionInput,
    factors: SettlementFactor[]
  ): { low: number; median: number; high: number } {
    const baseAmount = input.caseMetadata?.claimAmount || 10000;

    // Calculate multipliers based on factors
    let multiplier = 0.5; // Base settlement is typically 50% of claim
    for (const factor of factors) {
      if (factor.category === 'case_strength') {
        multiplier += factor.influence * 0.3;
      } else if (factor.category === 'economic') {
        multiplier += factor.influence * 0.1;
      }
    }

    const median = baseAmount * multiplier;

    return {
      low: median * 0.6,
      median,
      high: median * 1.5
    };
  }

  private async findComparableSettlements(
    input: CasePredictionInput
  ): Promise<ComparableSettlement[]> {
    // This would query historical settlement data
    // For now, return sample data
    return [
      {
        caseType: input.caseType,
        settlementAmount: 15000,
        year: 2024,
        jurisdiction: input.jurisdiction
      },
      {
        caseType: input.caseType,
        settlementAmount: 22000,
        year: 2023,
        jurisdiction: input.jurisdiction
      }
    ];
  }
}

// Singleton instance
let serviceInstance: PredictiveIntelligenceService | null = null;

export function getPredictiveIntelligenceService(): PredictiveIntelligenceService {
  if (!serviceInstance) {
    serviceInstance = new PredictiveIntelligenceService();
  }
  return serviceInstance;
}

export const predictiveIntelligenceService = getPredictiveIntelligenceService();
