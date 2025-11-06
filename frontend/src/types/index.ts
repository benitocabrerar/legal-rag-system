// ============================================================================
// User & Auth Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  avatarUrl?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken?: string;
    user: User;
  };
}

// ============================================================================
// Case Types
// ============================================================================

export type CaseStatus = 'ACTIVE' | 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED';

export interface Case {
  id: string;
  userId: string;
  title: string;
  caseNumber?: string;
  caseType: string;
  status: CaseStatus;
  plaintiff?: string;
  defendant?: string;
  filingDate?: string;
  closureDate?: string;
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    documents: number;
    conversations: number;
  };
}

export interface CreateCaseInput {
  title: string;
  caseNumber?: string;
  caseType: string;
  plaintiff?: string;
  defendant?: string;
  filingDate?: string;
  description?: string;
}

// ============================================================================
// Document Types
// ============================================================================

export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface CaseDocument {
  id: string;
  caseId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storageUrl: string;
  processingStatus: ProcessingStatus;
  extractedText?: string;
  uploadedAt: string;
  processedAt?: string;
  _count?: {
    chunks: number;
  };
}

// ============================================================================
// Chat Types
// ============================================================================

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  sources?: any[];
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  caseId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  _count?: {
    messages: number;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: SearchResult[];
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: {
    documentId: string;
    documentTitle: string;
    chunkIndex: number;
    type: string;
    [key: string]: any;
  };
}

export interface SearchQuery {
  query: string;
  caseId?: string;
  limit?: number;
  minSimilarity?: number;
  filters?: {
    jurisdiction?: string;
    documentType?: string;
    dateRange?: {
      from: string;
      to: string;
    };
  };
}

// ============================================================================
// Subscription Types
// ============================================================================

export type SubscriptionPlan = 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'TEAM';
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' | 'INCOMPLETE';

export interface Subscription {
  id: string;
  userId?: string;
  organizationId?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Form Types
// ============================================================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
}
