/**
 * Prediction Type Definitions
 * Types for ML-based legal predictions
 *
 * @module prediction.types
 * @author Legal RAG System - AI/NLP Improvements
 * @version 1.0.0
 */

// ============================================================================
// Prediction Categories
// ============================================================================

export enum PredictionType {
  CASE_OUTCOME = 'case_outcome',
  APPEAL_LIKELIHOOD = 'appeal_likelihood',
  SETTLEMENT_ESTIMATE = 'settlement_estimate',
  TIMELINE_PREDICTION = 'timeline_prediction',
  RISK_ASSESSMENT = 'risk_assessment'
}

export enum CaseOutcomeType {
  FAVORABLE = 'favorable',
  UNFAVORABLE = 'unfavorable',
  PARTIAL = 'partial',
  SETTLEMENT = 'settlement',
  DISMISSED = 'dismissed',
  PENDING = 'pending'
}

export enum CaseType {
  CIVIL = 'civil',
  CRIMINAL = 'criminal',
  ADMINISTRATIVE = 'administrative',
  CONSTITUTIONAL = 'constitutional',
  LABOR = 'labor',
  FAMILY = 'family',
  COMMERCIAL = 'commercial'
}

export enum JurisdictionType {
  NACIONAL = 'nacional',
  PROVINCIAL = 'provincial',
  MUNICIPAL = 'municipal',
  INTERNACIONAL = 'internacional'
}

export enum ComplexityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

// ============================================================================
// Input Types
// ============================================================================

export interface CaseMetadata {
  plaintiffType?: string;
  defendantType?: string;
  claimAmount?: number;
  filingDate?: Date;
  legalArea?: string;
  complexity?: ComplexityLevel;
  numberOfParties?: number;
  hasExpertWitness?: boolean;
  previousRulings?: number;
}

export interface CasePredictionInput {
  caseType: CaseType | string;
  jurisdiction: JurisdictionType | string;
  documentIds?: string[];
  caseMetadata?: CaseMetadata;
  userId?: string;
  caseId?: string;
}

export interface AppealPredictionInput {
  rulingDocumentId: string;
  rulingDate?: Date;
  originalCaseType?: CaseType;
  jurisdiction?: JurisdictionType;
}

export interface SettlementInput {
  caseType: CaseType | string;
  jurisdiction: JurisdictionType | string;
  claimAmount: number;
  caseStrength?: number;
  complexity?: ComplexityLevel;
  timeToTrial?: number;
}

// ============================================================================
// Output Types
// ============================================================================

export interface PredictionOutcome {
  outcome: string;
  probability: number;
  confidence: number;
}

export interface CaseOutcomePrediction {
  predictionId: string;
  outcomes: PredictionOutcome[];
  primaryOutcome: string;
  overallConfidence: number;
  explanations: PredictionExplanation[];
  similarCases: SimilarCase[];
  modelInfo: ModelInfo;
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
  estimatedRange: SettlementRange;
  confidence: number;
  factors: SettlementFactor[];
  comparableSettlements: ComparableSettlement[];
  timestamp: Date;
}

export interface SettlementRange {
  low: number;
  median: number;
  high: number;
  currency?: string;
}

// ============================================================================
// Explanation Types
// ============================================================================

export type ImpactDirection = 'positive' | 'negative' | 'neutral';

export interface PredictionExplanation {
  feature: string;
  impact: ImpactDirection;
  contribution: number;
  description: string;
  category?: string;
}

export interface SHAPExplanation {
  feature: string;
  shapValue: number;
  baseValue: number;
  featureValue: number | string;
  absoluteImportance: number;
}

export interface LIMEExplanation {
  feature: string;
  weight: number;
  localPrediction: number;
  featureValue: number | string;
}

// ============================================================================
// Reference Types
// ============================================================================

export interface SimilarCase {
  caseId?: string;
  documentId: string;
  similarity: number;
  outcome: string;
  relevantFactors: string[];
  year?: number;
  jurisdiction?: string;
}

export interface AppealFactor {
  factor: string;
  weight: number;
  direction: 'increases' | 'decreases';
  explanation: string;
  evidence?: string[];
}

export interface SettlementFactor {
  factor: string;
  influence: number;
  category: SettlementFactorCategory;
  direction?: 'increases' | 'decreases';
}

export type SettlementFactorCategory =
  | 'case_strength'
  | 'precedent'
  | 'economic'
  | 'procedural'
  | 'party_characteristics'
  | 'external';

export interface ComparableSettlement {
  caseType: string;
  settlementAmount: number;
  year: number;
  jurisdiction: string;
  similarity?: number;
  claimAmount?: number;
  settlementRatio?: number;
}

// ============================================================================
// Model Types
// ============================================================================

export interface ModelInfo {
  modelId: string;
  modelVersion: string;
  accuracy: number;
  modelType?: string;
  trainedAt?: Date;
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
  confusionMatrix?: ConfusionMatrix;
}

export interface ConfusionMatrix {
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
}

export interface ModelConfig {
  modelType: PredictionType;
  hyperparameters: HyperParameters;
  featureConfig: FeatureConfig;
  trainingConfig: TrainingConfig;
}

export interface HyperParameters {
  learningRate?: number;
  epochs?: number;
  batchSize?: number;
  dropoutRate?: number;
  hiddenLayers?: number[];
  regularization?: string;
  optimizer?: string;
  [key: string]: any;
}

export interface FeatureConfig {
  numericalFeatures: string[];
  categoricalFeatures: string[];
  textFeatures: string[];
  embeddingDimension?: number;
  normalization?: 'standard' | 'minmax' | 'robust';
}

export interface TrainingConfig {
  modelType: string;
  hyperparameters?: HyperParameters;
  trainingDataFilter?: TrainingDataFilter;
  validationSplit?: number;
  testSplit?: number;
  crossValidationFolds?: number;
}

export interface TrainingDataFilter {
  startDate?: Date;
  endDate?: Date;
  jurisdictions?: string[];
  caseTypes?: string[];
  minConfidence?: number;
}

// ============================================================================
// Feature Types
// ============================================================================

export interface DocumentFeatures {
  documentId: string;
  textLength: number;
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  complexityScore: number;
  citationCount: number;
  citationDensity: number;
  entityCount: number;
  topicDistribution: Record<string, number>;
  embedding?: number[];
}

export interface CaseFeatures {
  caseId?: string;
  caseType: string;
  jurisdiction: string;
  complexity: number;
  partyCount: number;
  documentCount: number;
  totalCitationCount: number;
  daysSinceFiling: number;
  claimAmountLog?: number;
  hasExpertWitness: boolean;
  aggregatedDocumentFeatures: DocumentFeatures;
}

export interface NormalizedFeatures {
  featureVector: number[];
  featureNames: string[];
  normalizationParams: {
    mean: Record<string, number>;
    std: Record<string, number>;
    min: Record<string, number>;
    max: Record<string, number>;
  };
}

// ============================================================================
// Feedback Types
// ============================================================================

export interface PredictionFeedback {
  predictionId: string;
  actualOutcome: any;
  wasAccurate: boolean;
  feedback?: string;
  userId?: string;
  submittedAt: Date;
}

export interface FeedbackStats {
  totalPredictions: number;
  feedbackReceived: number;
  feedbackRate: number;
  accuracyRate: number;
  avgConfidence: number;
  confidenceCalibration: CalibrationData[];
}

export interface CalibrationData {
  confidenceBin: string;
  expectedAccuracy: number;
  actualAccuracy: number;
  count: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PredictionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface BatchPredictionResponse {
  success: boolean;
  predictions: CaseOutcomePrediction[];
  failedCount: number;
  successCount: number;
  errors?: Array<{ index: number; error: string }>;
  timestamp: string;
}

// ============================================================================
// Trend and Pattern Related
// ============================================================================

export interface PredictionTrend {
  metricType: string;
  period: 'daily' | 'weekly' | 'monthly';
  dataPoints: TrendDataPoint[];
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
}

export interface TrendDataPoint {
  date: Date;
  value: number;
  count?: number;
}

export interface AccuracyByCategory {
  category: string;
  accuracy: number;
  sampleSize: number;
  confidence: number;
}
