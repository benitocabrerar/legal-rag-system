// Legal Documents API V2 Extension
import axios from 'axios';

const API_V2_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v2`
  : 'https://legal-rag-api-qnew.onrender.com/api/v2';

export const apiV2 = axios.create({
  baseURL: API_V2_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiV2.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
apiV2.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Legal Documents API V2 (Admin) - Enhanced with full metadata support
export const legalDocumentsAPIV2 = {
  // V2 Create with full metadata
  create: async (data: {
    normType: string;
    normTitle: string;
    legalHierarchy: string;
    content: string;
    publicationType?: string;
    publicationNumber?: string;
    publicationDate?: string;
    documentState?: string;
    lastReformDate?: string;
    jurisdiction?: string;
    keywords?: string[];
    metadata?: any;
  }) => {
    const response = await apiV2.post('/legal-documents', data);
    return response.data;
  },

  // V2 Query with advanced filters
  query: async (params?: {
    normType?: string;
    legalHierarchy?: string;
    publicationType?: string;
    documentState?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const response = await apiV2.get('/legal-documents', { params });
    return response.data;
  },

  // Get enum values for dropdowns
  getEnums: async () => {
    const response = await apiV2.get('/legal-documents/enums');
    return response.data.enums;
  },

  // V2 Get single document
  get: async (id: string) => {
    const response = await apiV2.get(`/legal-documents/${id}`);
    return response.data.document;
  },

  // V2 Update document
  update: async (id: string, data: any) => {
    const response = await apiV2.put(`/legal-documents/${id}`, data);
    return response.data;
  },

  // V2 Delete (soft delete)
  delete: async (id: string) => {
    const response = await apiV2.delete(`/legal-documents/${id}`);
    return response.data;
  },

  // Semantic search
  semanticSearch: async (query: string, limit: number = 10) => {
    const response = await apiV2.post('/legal-documents/search', { query, limit });
    return response.data;
  },
};
