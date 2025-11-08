// Version: 3.0.0 - Complete rebuild with defensive error handling
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://legal-rag-api-qnew.onrender.com/api/v1';

// Helper function to safely handle API errors
export const parseApiError = (error: any): string => {
  try {
    const errorData = error?.response?.data;

    if (!errorData) {
      return 'Error de conexión con el servidor';
    }

    if (errorData.error) {
      if (Array.isArray(errorData.error)) {
        return errorData.error.map((e: any) => e.message || String(e)).join(', ');
      }
      return String(errorData.error);
    }

    if (errorData.message) {
      return String(errorData.message);
    }

    return 'Error al procesar la solicitud';
  } catch {
    return 'Error al procesar la solicitud';
  }
};

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
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

// Auth API
export const authAPI = {
  register: async (data: { email: string; password: string; name: string }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Cases API
export const casesAPI = {
  list: async () => {
    const response = await api.get('/cases');
    return response.data;
  },
  get: async (id: string) => {
    const response = await api.get(`/cases/${id}`);
    return response.data;
  },
  create: async (data: {
    title: string;
    clientName: string;
    caseNumber?: string;
    description?: string;
  }) => {
    const response = await api.post('/cases', data);
    return response.data;
  },
  update: async (id: string, data: Partial<{
    title: string;
    clientName: string;
    caseNumber: string;
    description: string;
    status: string;
  }>) => {
    const response = await api.patch(`/cases/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/cases/${id}`);
    return response.data;
  },
};

// Documents API
export const documentsAPI = {
  upload: async (caseId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caseId', caseId);

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  listByCase: async (caseId: string) => {
    const response = await api.get(`/documents/case/${caseId}`);
    return response.data;
  },
  get: async (id: string) => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },
};

// Query API (RAG)
export const queryAPI = {
  query: async (data: { caseId: string; query: string }) => {
    const response = await api.post('/query', data);
    return response.data;
  },
  getHistory: async (caseId: string) => {
    const response = await api.get(`/query/history/${caseId}`);
    return response.data;
  },
};
