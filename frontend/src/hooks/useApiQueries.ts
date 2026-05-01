/**
 * React Query Hooks - Centralized API hooks for all backend endpoints
 * Provides consistent data fetching, caching, and mutation patterns
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import apiClient, { parseApiError } from '@/lib/api-client';

// ==================== QUERY KEYS ====================
export const queryKeys = {
  // Cases
  cases: ['cases'] as const,
  case: (id: string) => ['cases', id] as const,

  // Documents
  documents: (caseId?: string) => ['documents', caseId] as const,
  document: (id: string) => ['documents', id] as const,

  // Legal Documents
  legalDocuments: (category?: string) => ['legal-documents', category] as const,
  legalDocument: (id: string) => ['legal-documents', id] as const,

  // Query/Search
  semanticSearch: (query: string) => ['semantic-search', query] as const,
  unifiedSearch: (query: string, filters?: any) => ['unified-search', query, filters] as const,
  queryHistory: (caseId?: string) => ['query-history', caseId] as const,

  // Analytics
  analytics: (timeframe?: string) => ['analytics', timeframe] as const,
  queryTrends: (timeframe?: string) => ['query-trends', timeframe] as const,
  documentTrends: (timeframe?: string) => ['document-trends', timeframe] as const,

  // AI Assistant
  aiChat: (sessionId: string) => ['ai-chat', sessionId] as const,
  aiPredictions: (caseId: string) => ['ai-predictions', caseId] as const,

  // Feedback
  feedbackStats: ['feedback-stats'] as const,

  // User
  userProfile: ['user-profile'] as const,
  userSettings: ['user-settings'] as const,

  // Notifications
  notifications: ['notifications'] as const,

  // Admin
  adminUsers: (filters?: any) => ['admin-users', filters] as const,
  adminAudit: (filters?: any) => ['admin-audit', filters] as const,
  adminQuotas: ['admin-quotas'] as const,
};

// ==================== CASES ====================
export const useCases = (options?: UseQueryOptions<any[], Error>) => {
  return useQuery<any[], Error>({
    queryKey: queryKeys.cases,
    queryFn: async () => {
      const { data } = await apiClient.get('/cases');
      return data.cases || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

export const useCase = (id: string, options?: UseQueryOptions<any, Error>) => {
  return useQuery<any, Error>({
    queryKey: queryKeys.case(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/cases/${id}`);
      return data.case;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const useCreateCase = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, any>({
    mutationFn: async (caseData) => {
      const { data } = await apiClient.post('/cases', caseData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases });
    },
    ...options,
  });
};

export const useUpdateCase = (options?: UseMutationOptions<any, Error, { id: string; data: any }>) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: string; data: any }>({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.patch(`/cases/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases });
      queryClient.invalidateQueries({ queryKey: queryKeys.case(variables.id) });
    },
    ...options,
  });
};

export const useDeleteCase = (options?: UseMutationOptions<any, Error, string>) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: async (id) => {
      const { data } = await apiClient.delete(`/cases/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases });
    },
    ...options,
  });
};

// ==================== DOCUMENTS ====================
export const useDocuments = (caseId?: string, options?: UseQueryOptions<any[], Error>) => {
  return useQuery<any[], Error>({
    queryKey: queryKeys.documents(caseId),
    queryFn: async () => {
      const url = caseId ? `/documents/case/${caseId}` : '/documents';
      const { data } = await apiClient.get(url);
      return data.documents || [];
    },
    staleTime: 1000 * 60 * 3,
    ...options,
  });
};

export const useDocument = (id: string, options?: UseQueryOptions<any, Error>) => {
  return useQuery<any, Error>({
    queryKey: queryKeys.document(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/documents/${id}`);
      return data.document;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 3,
    ...options,
  });
};

export const useUploadDocument = (options?: UseMutationOptions<any, Error, { caseId: string; file: File }>) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { caseId: string; file: File }>({
    mutationFn: async ({ caseId, file }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caseId', caseId);

      const { data } = await apiClient.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents(variables.caseId) });
    },
    ...options,
  });
};

export const useDeleteDocument = (options?: UseMutationOptions<any, Error, string>) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: async (id) => {
      const { data } = await apiClient.delete(`/documents/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents() });
    },
    ...options,
  });
};

// ==================== LEGAL DOCUMENTS ====================
export const useLegalDocuments = (category?: string, options?: UseQueryOptions<any[], Error>) => {
  return useQuery<any[], Error>({
    queryKey: queryKeys.legalDocuments(category),
    queryFn: async () => {
      const params = category ? { category } : {};
      const { data } = await apiClient.get('/legal-documents', { params });
      return data.documents || [];
    },
    staleTime: 1000 * 60 * 10,
    ...options,
  });
};

export const useLegalDocument = (id: string, options?: UseQueryOptions<any, Error>) => {
  return useQuery<any, Error>({
    queryKey: queryKeys.legalDocument(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/legal-documents/${id}`);
      return data.document;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
    ...options,
  });
};

export const useSearchLegalDocuments = (options?: UseMutationOptions<any, Error, { query: string; filters?: any }>) => {
  return useMutation<any, Error, { query: string; filters?: any }>({
    mutationFn: async ({ query, filters }) => {
      const { data } = await apiClient.post('/legal-documents/search', { query, ...filters });
      return data;
    },
    ...options,
  });
};

// ==================== QUERY/SEARCH ====================
export const useSemanticSearch = (options?: UseMutationOptions<any, Error, { caseId: string; query: string }>) => {
  return useMutation<any, Error, { caseId: string; query: string }>({
    mutationFn: async ({ caseId, query }) => {
      const { data } = await apiClient.post('/query', { caseId, query });
      return data;
    },
    ...options,
  });
};

export const useUnifiedSearch = (options?: UseMutationOptions<any, Error, { query: string; filters?: any }>) => {
  return useMutation<any, Error, { query: string; filters?: any }>({
    mutationFn: async ({ query, filters }) => {
      const { data } = await apiClient.post('/search/unified', { query, ...filters });
      return data;
    },
    ...options,
  });
};

export const useQueryHistory = (caseId?: string, options?: UseQueryOptions<any[], Error>) => {
  return useQuery<any[], Error>({
    queryKey: queryKeys.queryHistory(caseId),
    queryFn: async () => {
      const url = caseId ? `/query/history/${caseId}` : '/query/history';
      const { data } = await apiClient.get(url);
      return data.queries || [];
    },
    staleTime: 1000 * 60 * 2,
    ...options,
  });
};

// ==================== ANALYTICS ====================
export const useAnalytics = (timeframe: string = '30d', options?: UseQueryOptions<any, Error>) => {
  return useQuery<any, Error>({
    queryKey: queryKeys.analytics(timeframe),
    queryFn: async () => {
      const { data } = await apiClient.get('/analytics', { params: { timeframe } });
      return data;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const useQueryTrends = (timeframe: string = '30d', options?: UseQueryOptions<any, Error>) => {
  return useQuery<any, Error>({
    queryKey: queryKeys.queryTrends(timeframe),
    queryFn: async () => {
      const { data } = await apiClient.get('/analytics/query-trends', { params: { timeframe } });
      return data;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const useDocumentTrends = (timeframe: string = '30d', options?: UseQueryOptions<any, Error>) => {
  return useQuery<any, Error>({
    queryKey: queryKeys.documentTrends(timeframe),
    queryFn: async () => {
      const { data } = await apiClient.get('/analytics/document-trends', { params: { timeframe } });
      return data;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

// ==================== AI ASSISTANT ====================
export const useAIChat = (sessionId: string, options?: UseQueryOptions<any[], Error>) => {
  return useQuery<any[], Error>({
    queryKey: queryKeys.aiChat(sessionId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/ai/chat/${sessionId}`);
      return data.messages || [];
    },
    enabled: !!sessionId,
    staleTime: 1000 * 30,
    ...options,
  });
};

export const useAIAssistant = (options?: UseMutationOptions<any, Error, { message: string; context?: any }>) => {
  return useMutation<any, Error, { message: string; context?: any }>({
    mutationFn: async ({ message, context }) => {
      const { data } = await apiClient.post('/ai/assistant', { message, context });
      return data;
    },
    ...options,
  });
};

export const usePredictions = (caseId: string, options?: UseQueryOptions<any, Error>) => {
  return useQuery<any, Error>({
    queryKey: queryKeys.aiPredictions(caseId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/ai/predictions/${caseId}`);
      return data;
    },
    enabled: !!caseId,
    staleTime: 1000 * 60 * 10,
    ...options,
  });
};

// ==================== FEEDBACK ====================
export const useSubmitFeedback = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, any>({
    mutationFn: async (feedbackData) => {
      const { data } = await apiClient.post('/feedback', feedbackData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feedbackStats });
    },
    ...options,
  });
};

export const useFeedbackStats = (options?: UseQueryOptions<any, Error>) => {
  return useQuery<any, Error>({
    queryKey: queryKeys.feedbackStats,
    queryFn: async () => {
      const { data } = await apiClient.get('/feedback/stats');
      return data;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

// ==================== USER ====================
export const useUserProfile = (options?: UseQueryOptions<any, Error>) => {
  return useQuery<any, Error>({
    queryKey: queryKeys.userProfile,
    queryFn: async () => {
      const { data } = await apiClient.get('/user/profile');
      return data.user;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const useUserSettings = (options?: UseQueryOptions<any, Error>) => {
  return useQuery<any, Error>({
    queryKey: queryKeys.userSettings,
    queryFn: async () => {
      const { data } = await apiClient.get('/user/settings');
      return data.settings;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const useUpdateSettings = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, any>({
    mutationFn: async (settings) => {
      const { data } = await apiClient.patch('/user/settings', settings);
      return data.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userSettings });
    },
    ...options,
  });
};

// ==================== NOTIFICATIONS ====================
export const useNotifications = (options?: UseQueryOptions<any[], Error>) => {
  return useQuery<any[], Error>({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const { data } = await apiClient.get('/notifications');
      return data.notifications || [];
    },
    staleTime: 1000 * 60,
    ...options,
  });
};

export const useMarkNotificationRead = (options?: UseMutationOptions<any, Error, string>) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: async (id) => {
      const { data } = await apiClient.patch(`/notifications/${id}/read`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
    ...options,
  });
};

// ==================== ADMIN ====================
export const useAdminUsers = (filters?: any, options?: UseQueryOptions<any[], Error>) => {
  return useQuery<any[], Error>({
    queryKey: queryKeys.adminUsers(filters),
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/users', { params: filters });
      return data.users || [];
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const useAdminAudit = (filters?: any, options?: UseQueryOptions<any[], Error>) => {
  return useQuery<any[], Error>({
    queryKey: queryKeys.adminAudit(filters),
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/audit', { params: filters });
      return data.auditLogs || [];
    },
    staleTime: 1000 * 60 * 2,
    ...options,
  });
};

export const useAdminQuotas = (options?: UseQueryOptions<any, Error>) => {
  return useQuery<any, Error>({
    queryKey: queryKeys.adminQuotas,
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/quotas');
      return data;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export { parseApiError };
