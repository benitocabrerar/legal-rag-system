/**
 * AI Service Exports
 *
 * Comprehensive AI services for the Legal RAG System including:
 * - OpenAI integration
 * - Predictive intelligence
 * - Trend analysis
 * - Document comparison
 * - Pattern detection
 * - Document summarization
 */

// Core OpenAI Service
export { OpenAIService, openAIService } from './openai-service';
export type {
  ChatOptions,
  ChatMessage,
  ModerationResult,
  EmbeddingOptions
} from './openai-service';

// Async OpenAI Service
export { AsyncOpenAIService, getAsyncOpenAIService } from './async-openai.service';

// Advanced AI Services for Legal RAG

// Predictive Intelligence Service
export {
  PredictiveIntelligenceService,
  getPredictiveIntelligenceService
} from './predictive-intelligence.service';

// Trend Analysis Service
export {
  TrendAnalysisService,
  getTrendAnalysisService
} from './trend-analysis.service';

// Document Comparison Service
export {
  DocumentComparisonService,
  getDocumentComparisonService
} from './document-comparison.service';

// Pattern Detection Service
export {
  PatternDetectionService,
  getPatternDetectionService
} from './pattern-detection.service';

// Document Summarization Service (includes compareDocuments method)
export {
  DocumentSummarizationService,
  getDocumentSummarizationService
} from './document-summarization.service';

// Legal Assistant Service (includes streaming support)
export { LegalAssistant, legalAssistant } from './legal-assistant';
export type { StreamChunk, StreamCallback, AssistantResponse, ConversationMessage } from './legal-assistant';
