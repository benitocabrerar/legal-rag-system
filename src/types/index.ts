import type { FastifyRequest } from 'fastify';
import type { User } from '@prisma/client';

// ============================================================================
// Request Types
// ============================================================================

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    role: string;
    organizationId?: string;
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Auth Types
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  organizationId?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  user: Omit<User, 'passwordHash'>;
}

// ============================================================================
// RAG Types
// ============================================================================

export interface SearchQuery {
  query: string;
  caseId?: string;
  limit?: number;
  minSimilarity?: number;
  filters?: {
    jurisdiction?: string;
    documentType?: string;
    dateRange?: {
      from: Date;
      to: Date;
    };
  };
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: {
    documentId: string;
    documentTitle: string;
    chunkIndex: number;
    type: string;
    [key: string]: unknown;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: SearchResult[];
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  caseId?: string;
  includeContext?: boolean;
}

export interface ChatResponse {
  conversationId: string;
  message: ChatMessage;
  sources: SearchResult[];
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

// ============================================================================
// Document Types
// ============================================================================

export interface DocumentUpload {
  filename: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface DocumentProcessingResult {
  documentId: string;
  status: 'success' | 'failed';
  chunksCreated?: number;
  error?: string;
}

// ============================================================================
// Embedding Types
// ============================================================================

export interface EmbeddingRequest {
  text: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// Case Types
// ============================================================================

export interface CreateCaseData {
  title: string;
  caseNumber?: string;
  caseType: string;
  plaintiff?: string;
  defendant?: string;
  filingDate?: Date;
  description?: string;
}

export interface UpdateCaseData extends Partial<CreateCaseData> {
  status?: 'ACTIVE' | 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED';
  notes?: string;
}

// ============================================================================
// Subscription Types
// ============================================================================

export interface PlanLimits {
  maxCases: number;
  maxDocumentsPerCase: number;
  maxChatMessages: number;
  maxStorageMB: number;
  features: string[];
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    maxCases: 5,
    maxDocumentsPerCase: 10,
    maxChatMessages: 50,
    maxStorageMB: 100,
    features: ['basic_search', 'basic_chat'],
  },
  BASIC: {
    maxCases: 50,
    maxDocumentsPerCase: 50,
    maxChatMessages: 500,
    maxStorageMB: 1000,
    features: ['basic_search', 'basic_chat', 'document_upload', 'advanced_search'],
  },
  PROFESSIONAL: {
    maxCases: 200,
    maxDocumentsPerCase: 200,
    maxChatMessages: 2000,
    maxStorageMB: 5000,
    features: [
      'basic_search',
      'basic_chat',
      'document_upload',
      'advanced_search',
      'document_generation',
      'analytics',
    ],
  },
  TEAM: {
    maxCases: 1000,
    maxDocumentsPerCase: 1000,
    maxChatMessages: 10000,
    maxStorageMB: 20000,
    features: [
      'basic_search',
      'basic_chat',
      'document_upload',
      'advanced_search',
      'document_generation',
      'analytics',
      'team_collaboration',
      'api_access',
    ],
  },
};

// ============================================================================
// Error Types
// ============================================================================

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(409, message);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(429, message);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(500, message);
  }
}
