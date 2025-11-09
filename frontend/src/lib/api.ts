// Version: 3.0.0 - Complete rebuild with defensive error handling
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
  : 'https://legal-rag-api-qnew.onrender.com/api/v1';

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
    return response.data.cases || [];
  },
  get: async (id: string) => {
    const response = await api.get(`/cases/${id}`);
    return response.data.case;
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
    return response.data.documents || [];
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
    return response.data.queries || [];
  },
};

// Legal Documents API (Admin)
export const legalDocumentsAPI = {
  upload: async (data: {
    title: string;
    category: 'constitution' | 'law' | 'code' | 'regulation' | 'jurisprudence';
    content: string;
    metadata?: {
      year?: number;
      number?: string;
      jurisdiction?: string;
    };
  }) => {
    const response = await api.post('/legal-documents/upload', data);
    return response.data;
  },
  list: async (category?: string) => {
    const params = category ? { category } : {};
    const response = await api.get('/legal-documents', { params });
    return response.data.documents || [];
  },
  get: async (id: string) => {
    const response = await api.get(`/legal-documents/${id}`);
    return response.data.document;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/legal-documents/${id}`);
    return response.data;
  },
};

// User API
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/user/profile');
    return response.data.user;
  },
  updateProfile: async (data: any) => {
    const response = await api.patch('/user/profile', data);
    return response.data.user;
  },
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.user;
  },
  deleteAvatar: async () => {
    const response = await api.delete('/user/avatar');
    return response.data;
  },
};

// Subscription API
export const subscriptionAPI = {
  getCurrent: async () => {
    const response = await api.get('/user/subscription');
    return response.data;
  },
  getPlans: async () => {
    const response = await api.get('/user/subscription/plans');
    return response.data.plans;
  },
  upgrade: async (planCode: string, billingCycle: 'monthly' | 'yearly' = 'monthly') => {
    const response = await api.post('/user/subscription/upgrade', {
      planCode,
      billingCycle
    });
    return response.data;
  },
  cancel: async (immediately: boolean = false) => {
    const response = await api.post('/user/subscription/cancel', {
      immediately
    });
    return response.data;
  },
};

// Usage API
export const usageAPI = {
  getCurrent: async () => {
    const response = await api.get('/user/usage');
    return response.data;
  },
  getHistory: async (months: number = 6) => {
    const response = await api.get(`/user/usage/history?months=${months}`);
    return response.data;
  },
  track: async (type: 'query' | 'document' | 'case' | 'storage' | 'api', metadata: any = {}) => {
    const response = await api.post('/user/usage/track', { type, metadata });
    return response.data;
  },
};

// Billing API
export const billingAPI = {
  getInvoices: async (limit: number = 10, offset: number = 0) => {
    const response = await api.get(`/billing/invoices?limit=${limit}&offset=${offset}`);
    return response.data;
  },
  getInvoice: async (id: string) => {
    const response = await api.get(`/billing/invoices/${id}`);
    return response.data.invoice;
  },
  getPaymentMethods: async () => {
    const response = await api.get('/billing/payment-methods');
    return response.data.paymentMethods;
  },
  addPaymentMethod: async (data: any) => {
    const response = await api.post('/billing/payment-methods', data);
    return response.data;
  },
  deletePaymentMethod: async (id: string) => {
    const response = await api.delete(`/billing/payment-methods/${id}`);
    return response.data;
  },
  setDefaultPaymentMethod: async (id: string) => {
    const response = await api.patch(`/billing/payment-methods/${id}/default`);
    return response.data;
  },
};

// Settings API
export const settingsAPI = {
  get: async () => {
    const response = await api.get('/user/settings');
    return response.data.settings;
  },
  update: async (data: any) => {
    const response = await api.patch('/user/settings', data);
    return response.data.settings;
  },
  exportData: async () => {
    const response = await api.post('/user/settings/export-data');
    return response.data;
  },
  deleteAccount: async (confirmEmail: string) => {
    const response = await api.delete('/user/settings/account', {
      data: { confirmEmail }
    });
    return response.data;
  },
};
