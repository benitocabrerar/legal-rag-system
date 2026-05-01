/**
 * M3: Document Summarization Schemas
 * Zod validation schemas for summarization API endpoints
 *
 * @module summarization-schemas
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================
// Request Schemas
// ============================================

/**
 * Schema for document summarization request
 */
export const SummarizeDocumentSchema = z.object({
  level: z.enum(['brief', 'standard', 'detailed']).default('standard'),
  language: z.enum(['es', 'en']).default('es'),
  includeKeyPoints: z.boolean().default(true),
  includeReferences: z.boolean().default(true),
  maxLength: z.number().min(100).max(5000).optional(),
  focusAreas: z.array(z.string()).optional(),
});

export type SummarizeDocumentInput = z.infer<typeof SummarizeDocumentSchema>;

/**
 * Schema for batch summarization request
 */
export const BatchSummarizeSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1).max(10),
  level: z.enum(['brief', 'standard', 'detailed']).default('brief'),
  language: z.enum(['es', 'en']).default('es'),
});

export type BatchSummarizeInput = z.infer<typeof BatchSummarizeSchema>;

/**
 * Schema for document comparison request
 */
export const CompareDocumentsSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(2).max(10),
  comparisonType: z.enum(['full', 'structure', 'content', 'legal_terms']).default('full'),
  language: z.enum(['es', 'en']).default('es'),
});

export type CompareDocumentsInput = z.infer<typeof CompareDocumentsSchema>;

/**
 * Schema for executive summary request
 */
export const ExecutiveSummarySchema = z.object({
  includeTimeline: z.boolean().default(true),
  includeRisks: z.boolean().default(true),
  includeRecommendations: z.boolean().default(true),
  language: z.enum(['es', 'en']).default('es'),
});

export type ExecutiveSummaryInput = z.infer<typeof ExecutiveSummarySchema>;

/**
 * Schema for key points extraction request
 */
export const ExtractKeyPointsSchema = z.object({
  maxPoints: z.number().min(3).max(20).default(10),
  categorize: z.boolean().default(true),
  language: z.enum(['es', 'en']).default('es'),
});

export type ExtractKeyPointsInput = z.infer<typeof ExtractKeyPointsSchema>;

// ============================================
// Response Schemas
// ============================================

/**
 * Schema for a single key point
 */
export const KeyPointSchema = z.object({
  id: z.string(),
  text: z.string(),
  category: z.string().optional(),
  importance: z.enum(['high', 'medium', 'low']),
  references: z.array(z.string()).optional(),
});

export type KeyPoint = z.infer<typeof KeyPointSchema>;

/**
 * Schema for document summary response
 */
export const DocumentSummaryResponseSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  level: z.enum(['brief', 'standard', 'detailed']),
  summary: z.string(),
  keyPoints: z.array(KeyPointSchema).optional(),
  references: z.array(z.string()).optional(),
  wordCount: z.number(),
  originalWordCount: z.number(),
  compressionRatio: z.number(),
  confidenceScore: z.number().min(0).max(1),
  language: z.string(),
  generatedAt: z.string().datetime(),
  processingTime: z.number(),
});

export type DocumentSummaryResponse = z.infer<typeof DocumentSummaryResponseSchema>;

/**
 * Schema for batch summary response
 */
export const BatchSummaryResponseSchema = z.object({
  summaries: z.array(DocumentSummaryResponseSchema),
  totalDocuments: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  totalProcessingTime: z.number(),
});

export type BatchSummaryResponse = z.infer<typeof BatchSummaryResponseSchema>;

/**
 * Schema for executive summary response
 */
export const ExecutiveSummaryResponseSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  title: z.string(),
  overview: z.string(),
  keyFindings: z.array(z.string()),
  timeline: z.array(z.object({
    date: z.string(),
    event: z.string(),
    significance: z.string().optional(),
  })).optional(),
  risks: z.array(z.object({
    category: z.string(),
    description: z.string(),
    severity: z.enum(['high', 'medium', 'low']),
    mitigation: z.string().optional(),
  })).optional(),
  recommendations: z.array(z.object({
    action: z.string(),
    priority: z.enum(['immediate', 'short-term', 'long-term']),
    rationale: z.string(),
  })).optional(),
  documentsCovered: z.number(),
  generatedAt: z.string().datetime(),
});

export type ExecutiveSummaryResponse = z.infer<typeof ExecutiveSummaryResponseSchema>;

/**
 * Schema for document comparison response
 */
export const ComparisonResponseSchema = z.object({
  id: z.string().uuid(),
  documentIds: z.array(z.string().uuid()),
  similarities: z.array(z.object({
    aspect: z.string(),
    description: z.string(),
    score: z.number().min(0).max(1),
  })),
  differences: z.array(z.object({
    aspect: z.string(),
    documents: z.array(z.object({
      documentId: z.string().uuid(),
      value: z.string(),
    })),
  })),
  overallSimilarityScore: z.number().min(0).max(1),
  comparisonType: z.string(),
  generatedAt: z.string().datetime(),
});

export type ComparisonResponse = z.infer<typeof ComparisonResponseSchema>;

// ============================================
// Query Parameter Schemas
// ============================================

/**
 * Schema for document ID parameter
 */
export const DocumentIdParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Schema for case ID parameter
 */
export const CaseIdParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Schema for summary ID parameter
 */
export const SummaryIdParamSchema = z.object({
  summaryId: z.string().uuid(),
});

/**
 * Schema for pagination query
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// ============================================
// Utility Functions
// ============================================

/**
 * Validate summarization request
 */
export function validateSummarizeRequest(data: unknown): SummarizeDocumentInput {
  return SummarizeDocumentSchema.parse(data);
}

/**
 * Validate batch summarization request
 */
export function validateBatchRequest(data: unknown): BatchSummarizeInput {
  return BatchSummarizeSchema.parse(data);
}

/**
 * Validate comparison request
 */
export function validateCompareRequest(data: unknown): CompareDocumentsInput {
  return CompareDocumentsSchema.parse(data);
}
