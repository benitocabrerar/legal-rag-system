import axios, { AxiosError, AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// API Client
// ============================================================================

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, redirect to login
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', token);
  }

  private clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
  }

  // ============================================================================
  // Auth
  // ============================================================================

  async login(email: string, password: string) {
    const response = await this.client.post('/api/auth/login', { email, password });
    const { accessToken } = response.data.data;
    this.setToken(accessToken);
    return response.data;
  }

  async register(email: string, password: string, name: string) {
    const response = await this.client.post('/api/auth/register', { email, password, name });
    const { accessToken } = response.data.data;
    this.setToken(accessToken);
    return response.data;
  }

  async logout() {
    this.clearToken();
  }

  async getCurrentUser() {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  // ============================================================================
  // Cases
  // ============================================================================

  async getCases() {
    const response = await this.client.get('/api/cases');
    return response.data;
  }

  async getCase(id: string) {
    const response = await this.client.get(`/api/cases/${id}`);
    return response.data;
  }

  async createCase(data: any) {
    const response = await this.client.post('/api/cases', data);
    return response.data;
  }

  async updateCase(id: string, data: any) {
    const response = await this.client.patch(`/api/cases/${id}`, data);
    return response.data;
  }

  async deleteCase(id: string) {
    const response = await this.client.delete(`/api/cases/${id}`);
    return response.data;
  }

  // ============================================================================
  // Documents
  // ============================================================================

  async uploadDocument(caseId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post(`/api/cases/${caseId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getDocuments(caseId: string) {
    const response = await this.client.get(`/api/cases/${caseId}/documents`);
    return response.data;
  }

  async deleteDocument(caseId: string, documentId: string) {
    const response = await this.client.delete(`/api/cases/${caseId}/documents/${documentId}`);
    return response.data;
  }

  // ============================================================================
  // Chat
  // ============================================================================

  async sendMessage(data: { message: string; conversationId?: string; caseId?: string }) {
    const response = await this.client.post('/api/chat', data);
    return response.data;
  }

  async getConversation(conversationId: string) {
    const response = await this.client.get(`/api/chat/conversations/${conversationId}`);
    return response.data;
  }

  async getConversations() {
    const response = await this.client.get('/api/chat/conversations');
    return response.data;
  }

  // ============================================================================
  // Search
  // ============================================================================

  async search(query: string, filters?: any) {
    const response = await this.client.post('/api/search', { query, filters });
    return response.data;
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export for direct use
export default api;
