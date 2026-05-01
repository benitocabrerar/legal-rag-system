/**
 * Document Summarization React Query Hooks
 *
 * @description Custom hooks for document summarization operations using React Query
 * @module hooks/useSummarization
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Summarization level options
 */
export type SummaryLevel = 'brief' | 'standard' | 'detailed';

/**
 * Language options for summaries
 */
export type SummaryLanguage = 'es' | 'en';

/**
 * Options for document summarization
 */
export interface SummarizeOptions {
  level?: SummaryLevel;
  language?: SummaryLanguage;
  includeKeyPoints?: boolean;
  maxLength?: number;
  focusAreas?: string[];
}

/**
 * Key point extracted from document
 */
export interface KeyPoint {
  id: string;
  text: string;
  category: string;
  importance: number;
  context?: string;
  pageNumber?: number;
  sourceText?: string;
}

/**
 * Document summary response
 */
export interface DocumentSummary {
  id: string;
  documentId: string;
  summary: string;
  level: SummaryLevel;
  language: SummaryLanguage;
  keyPoints?: KeyPoint[];
  wordCount: number;
  createdAt: string;
  metadata?: {
    processingTime?: number;
    confidence?: number;
    model?: string;
  };
}

/**
 * Executive summary for legal case
 */
export interface ExecutiveSummary {
  id: string;
  caseId: string;
  title: string;
  overview: string;
  keyFindings: string[];
  recommendations: string[];
  timeline?: Array<{
    date: string;
    event: string;
    significance: string;
  }>;
  riskAssessment?: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
  };
  nextSteps?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Batch summarization response
 */
export interface BatchSummaryResponse {
  summaries: Array<{
    documentId: string;
    summary: DocumentSummary;
    status: 'success' | 'failed';
    error?: string;
  }>;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  processingTime: number;
}

/**
 * Document comparison response
 */
export interface ComparisonResponse {
  id: string;
  documentIds: string[];
  similarities: Array<{
    text: string;
    documents: string[];
    similarity: number;
    category: string;
  }>;
  differences: Array<{
    text: string;
    documentId: string;
    category: string;
    significance: number;
  }>;
  summary: string;
  overallSimilarity: number;
  recommendations?: string[];
  createdAt: string;
}

/**
 * Options for executive summary generation
 */
export interface ExecutiveSummaryOptions {
  language?: SummaryLanguage;
  includeTimeline?: boolean;
  includeRiskAssessment?: boolean;
  includeRecommendations?: boolean;
  focusAreas?: string[];
}

// ============================================================================
// Query Keys Factory
// ============================================================================

export const summarizationKeys = {
  all: ['summarization'] as const,
  summaries: () => [...summarizationKeys.all, 'summaries'] as const,
  summary: (id: string) => [...summarizationKeys.all, 'summary', id] as const,
  documentSummaries: (documentId: string) =>
    [...summarizationKeys.all, 'document', documentId] as const,
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook for summarizing a document
 *
 * @example
 * ```tsx
 * const { mutate, isPending, data } = useSummarizeDocument();
 *
 * const handleSummarize = () => {
 *   mutate({
 *     documentId: '123',
 *     options: { level: 'standard', includeKeyPoints: true }
 *   });
 * };
 * ```
 */
export function useSummarizeDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      options = {},
    }: {
      documentId: string;
      options?: SummarizeOptions;
    }): Promise<DocumentSummary> => {
      const response = await apiClient.post(
        `/api/v1/summarization/document/${documentId}`,
        options
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate document summaries list
      queryClient.invalidateQueries({
        queryKey: summarizationKeys.documentSummaries(variables.documentId),
      });
      // Set the new summary in cache
      queryClient.setQueryData(
        summarizationKeys.summary(data.id),
        data
      );
    },
  });
}

/**
 * Hook for extracting key points from a document
 *
 * @example
 * ```tsx
 * const { mutate, isPending, data } = useExtractKeyPoints();
 *
 * const handleExtract = () => {
 *   mutate({ documentId: '123' });
 * };
 * ```
 */
export function useExtractKeyPoints() {
  return useMutation({
    mutationFn: async ({
      documentId,
    }: {
      documentId: string;
    }): Promise<KeyPoint[]> => {
      const response = await apiClient.post(
        `/api/v1/summarization/document/${documentId}/key-points`
      );
      return response.data;
    },
  });
}

/**
 * Hook for generating an executive summary for a legal case
 *
 * @example
 * ```tsx
 * const { mutate, isPending, data } = useExecutiveSummary();
 *
 * const handleGenerateExecutive = () => {
 *   mutate({
 *     caseId: 'case-123',
 *     options: { includeTimeline: true, includeRiskAssessment: true }
 *   });
 * };
 * ```
 */
export function useExecutiveSummary() {
  return useMutation({
    mutationFn: async ({
      caseId,
      options = {},
    }: {
      caseId: string;
      options?: ExecutiveSummaryOptions;
    }): Promise<ExecutiveSummary> => {
      const response = await apiClient.post(
        `/api/v1/summarization/case/${caseId}/executive`,
        options
      );
      return response.data;
    },
  });
}

/**
 * Hook for batch summarizing multiple documents
 *
 * @example
 * ```tsx
 * const { mutate, isPending, data } = useBatchSummarize();
 *
 * const handleBatchSummarize = () => {
 *   mutate({
 *     documentIds: ['doc1', 'doc2', 'doc3'],
 *     level: 'brief'
 *   });
 * };
 * ```
 */
export function useBatchSummarize() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentIds,
      level = 'standard',
      options = {},
    }: {
      documentIds: string[];
      level?: SummaryLevel;
      options?: Omit<SummarizeOptions, 'level'>;
    }): Promise<BatchSummaryResponse> => {
      const response = await apiClient.post(
        '/api/v1/summarization/batch',
        {
          documentIds,
          level,
          ...options,
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate all affected document summaries
      data.summaries.forEach(({ documentId, summary, status }) => {
        if (status === 'success') {
          queryClient.invalidateQueries({
            queryKey: summarizationKeys.documentSummaries(documentId),
          });
          // Cache individual summary
          queryClient.setQueryData(
            summarizationKeys.summary(summary.id),
            summary
          );
        }
      });
    },
  });
}

/**
 * Hook for comparing multiple documents
 *
 * @example
 * ```tsx
 * const { mutate, isPending, data } = useCompareDocuments();
 *
 * const handleCompare = () => {
 *   mutate({
 *     documentIds: ['doc1', 'doc2']
 *   });
 * };
 * ```
 */
export function useCompareDocuments() {
  return useMutation({
    mutationFn: async ({
      documentIds,
      options = {},
    }: {
      documentIds: string[];
      options?: {
        includeRecommendations?: boolean;
        focusAreas?: string[];
        language?: SummaryLanguage;
      };
    }): Promise<ComparisonResponse> => {
      const response = await apiClient.post(
        '/api/v1/summarization/compare',
        {
          documentIds,
          ...options,
        }
      );
      return response.data;
    },
  });
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook for fetching all summaries for a document
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useDocumentSummaries('doc-123');
 *
 * // With conditional fetching
 * const { data } = useDocumentSummaries(documentId, {
 *   enabled: !!documentId
 * });
 * ```
 */
export function useDocumentSummaries(
  documentId: string | undefined,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: documentId
      ? summarizationKeys.documentSummaries(documentId)
      : ['summarization', 'disabled'],
    queryFn: async (): Promise<DocumentSummary[]> => {
      if (!documentId) {
        throw new Error('Document ID is required');
      }
      const response = await apiClient.get(
        `/api/v1/summarization/document/${documentId}/summaries`
      );
      return response.data;
    },
    enabled: !!documentId && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching a single summary by ID
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useSummary('summary-123');
 *
 * // With conditional fetching
 * const { data } = useSummary(summaryId, {
 *   enabled: !!summaryId
 * });
 * ```
 */
export function useSummary(
  summaryId: string | undefined,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: summaryId
      ? summarizationKeys.summary(summaryId)
      : ['summarization', 'disabled'],
    queryFn: async (): Promise<DocumentSummary> => {
      if (!summaryId) {
        throw new Error('Summary ID is required');
      }
      const response = await apiClient.get(
        `/api/v1/summarization/${summaryId}`
      );
      return response.data;
    },
    enabled: !!summaryId && (options?.enabled !== false),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for prefetching document summaries
 *
 * @example
 * ```tsx
 * const prefetch = usePrefetchDocumentSummaries();
 *
 * <button onMouseEnter={() => prefetch('doc-123')}>
 *   View Summaries
 * </button>
 * ```
 */
export function usePrefetchDocumentSummaries() {
  const queryClient = useQueryClient();

  return (documentId: string) => {
    queryClient.prefetchQuery({
      queryKey: summarizationKeys.documentSummaries(documentId),
      queryFn: async () => {
        const response = await apiClient.get(
          `/api/v1/summarization/document/${documentId}/summaries`
        );
        return response.data;
      },
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Hook for invalidating summarization queries
 *
 * @example
 * ```tsx
 * const invalidate = useInvalidateSummarization();
 *
 * const handleRefresh = () => {
 *   invalidate.all(); // Invalidate all summarization queries
 *   invalidate.documentSummaries('doc-123'); // Invalidate specific document
 * };
 * ```
 */
export function useInvalidateSummarization() {
  const queryClient = useQueryClient();

  return {
    all: () => {
      queryClient.invalidateQueries({
        queryKey: summarizationKeys.all,
      });
    },
    documentSummaries: (documentId: string) => {
      queryClient.invalidateQueries({
        queryKey: summarizationKeys.documentSummaries(documentId),
      });
    },
    summary: (summaryId: string) => {
      queryClient.invalidateQueries({
        queryKey: summarizationKeys.summary(summaryId),
      });
    },
  };
}
