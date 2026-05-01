# Legal RAG System - Complete API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
   - [Authentication & Authorization](#authentication--authorization)
   - [Legal Documents](#legal-documents)
   - [RAG Query System](#rag-query-system)
   - [AI Assistant](#ai-assistant)
   - [Advanced Search](#advanced-search)
   - [Analytics](#analytics)
   - [User Feedback](#user-feedback)
   - [User Management](#user-management)
   - [Subscription Management](#subscription-management)
   - [Admin Routes](#admin-routes)
4. [Data Schemas](#data-schemas)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Best Practices](#best-practices)
8. [SDK Examples](#sdk-examples)

---

## Overview

The Legal RAG (Retrieval-Augmented Generation) System is a comprehensive platform for legal document management, semantic search, and AI-powered legal assistance. Built with Fastify, Prisma, PostgreSQL, and OpenAI GPT-4.

**Base URL**: `https://api.legalrag.com/api/v1` (Production)
**Staging**: `https://staging-api.legalrag.com/api/v1`
**Local**: `http://localhost:3000/api/v1`

**Tech Stack**:
- Framework: Fastify (Node.js/TypeScript)
- Database: PostgreSQL with Prisma ORM
- AI: OpenAI GPT-4 + text-embedding-ada-002
- Storage: S3-compatible object storage
- Caching: Redis
- Authentication: JWT + OAuth2 + 2FA (TOTP)

---

## Authentication

### Authentication Schemes

#### 1. JWT Bearer Token
```
Authorization: Bearer <token>
```
- Token expiration: 7 days
- Refresh: Re-authenticate when expired
- Token payload: `{ id, email, role }`

#### 2. OAuth2 (Google)
- Authorization endpoint: `/api/v1/auth/google`
- Callback: `/api/v1/auth/google/callback`
- Scopes: `profile`, `email`

#### 3. Two-Factor Authentication (2FA)
- Method: TOTP (Time-based One-Time Password)
- Library: speakeasy
- Setup flow: Enable → Verify → Active
- Recovery: Disable/Re-enable via password verification

---

## API Endpoints

### Authentication & Authorization

#### POST /api/v1/auth/register
Register a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response** (201):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "planTier": "free",
    "createdAt": "2025-01-13T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:
- 400: Validation error (invalid email, weak password)
- 409: Email already exists

---

#### POST /api/v1/auth/login
Authenticate user and receive JWT token.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "twoFactorEnabled": false
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "requiresTwoFactor": false
}
```

**With 2FA Enabled**:
```json
{
  "requiresTwoFactor": true,
  "tempToken": "temp_token_for_2fa_verification"
}
```

**Errors**:
- 400: Missing credentials
- 401: Invalid email or password
- 403: Account inactive

---

#### GET /api/v1/auth/me
Get current authenticated user information.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "planTier": "professional",
    "avatarUrl": "/uploads/avatars/avatar-123.jpg",
    "twoFactorEnabled": true,
    "lastLogin": "2025-01-13T10:00:00.000Z"
  }
}
```

---

#### POST /api/v1/auth/2fa/setup
Setup two-factor authentication.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Instructions**:
1. Scan QR code with authenticator app (Google Authenticator, Authy)
2. Verify with POST /api/v1/auth/2fa/verify

---

#### POST /api/v1/auth/2fa/verify
Verify and activate 2FA with TOTP token.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "token": "123456"
}
```

**Response** (200):
```json
{
  "message": "2FA enabled successfully",
  "backupCodes": ["ABC123", "DEF456", "GHI789"]
}
```

**Errors**:
- 400: Invalid token
- 401: Unauthorized

---

#### GET /api/v1/auth/google
Initiate Google OAuth2 authentication flow.

**Response**: Redirects to Google consent screen

**Query Parameters**:
- `redirect_uri`: Optional custom redirect URI

---

#### GET /api/v1/auth/google/callback
Google OAuth2 callback endpoint.

**Query Parameters**:
- `code`: Authorization code from Google
- `state`: CSRF protection token

**Response**: Redirects to frontend with token
```
https://app.legalrag.com/auth/callback?token=<jwt_token>
```

---

### Legal Documents

#### GET /api/v1/legal-documents-v2
List legal documents with filtering, pagination, and sorting.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 20, max: 100)
- `search` (string): Search in title and content
- `normType` (string): Filter by document type (LEY, CODIGO, DECRETO, etc.)
- `legalHierarchy` (number): Filter by hierarchy level (1-7)
- `jurisdiction` (string): Filter by jurisdiction
- `status` (string): Filter by status (active, archived, draft)
- `sortBy` (string): Sort field (title, date, hierarchy)
- `sortOrder` (string): Sort direction (asc, desc)

**Response** (200):
```json
{
  "documents": [
    {
      "id": "uuid",
      "normTitle": "Código Civil del Ecuador",
      "normType": "CODIGO",
      "normNumber": "001",
      "legalHierarchy": 3,
      "publicationDate": "1970-01-01",
      "effectiveDate": "1970-01-01",
      "jurisdiction": "Nacional",
      "isActive": true,
      "tags": ["civil", "código"],
      "s3Url": "https://s3.amazonaws.com/bucket/document.pdf",
      "createdAt": "2025-01-13T10:00:00.000Z",
      "updatedAt": "2025-01-13T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

#### GET /api/v1/legal-documents-v2/:id
Get a single legal document by ID.

**Headers**: `Authorization: Bearer <token>`

**Path Parameters**:
- `id` (string): Document UUID

**Response** (200):
```json
{
  "document": {
    "id": "uuid",
    "normTitle": "Constitución de la República del Ecuador",
    "normType": "CONSTITUCION",
    "normNumber": "2008",
    "legalHierarchy": 1,
    "publicationDate": "2008-10-20",
    "effectiveDate": "2008-10-20",
    "jurisdiction": "Nacional",
    "issuingAuthority": "Asamblea Constituyente",
    "summary": "Norma suprema del ordenamiento jurídico ecuatoriano...",
    "keyArticles": ["Art. 1", "Art. 3", "Art. 11"],
    "isActive": true,
    "tags": ["constitución", "derechos fundamentales"],
    "s3Url": "https://s3.amazonaws.com/bucket/constitucion.pdf",
    "s3Key": "legal-documents/constitucion-2008.pdf",
    "fileSize": 2547892,
    "pageCount": 218,
    "chunkCount": 450,
    "hasEmbeddings": true,
    "metadata": {
      "language": "es",
      "format": "pdf",
      "version": "2021-consolidated"
    },
    "createdAt": "2025-01-13T10:00:00.000Z",
    "updatedAt": "2025-01-13T10:00:00.000Z"
  }
}
```

**Errors**:
- 404: Document not found

---

#### POST /api/v1/legal-documents-v2
Create new legal document with PDF upload.

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data**:
- `file` (file): PDF file (max 50MB)
- `normTitle` (string, required): Document title
- `normType` (string, required): Document type (LEY, CODIGO, etc.)
- `normNumber` (string): Document number
- `legalHierarchy` (number, 1-7): Hierarchy level
- `publicationDate` (string): Publication date (YYYY-MM-DD)
- `effectiveDate` (string): Effective date
- `jurisdiction` (string): Jurisdiction
- `issuingAuthority` (string): Issuing authority
- `summary` (string): Brief summary
- `tags` (array): Array of tags

**Response** (201):
```json
{
  "document": {
    "id": "uuid",
    "normTitle": "Ley Orgánica de Protección de Datos",
    "normType": "LEY",
    "s3Url": "https://s3.amazonaws.com/bucket/lopd.pdf",
    "fileSize": 1245678,
    "pageCount": 45,
    "processingStatus": "pending_vectorization"
  },
  "message": "Document created successfully. Vectorization in progress."
}
```

**Errors**:
- 400: Invalid file type or missing required fields
- 413: File too large
- 507: Storage quota exceeded

---

#### PUT /api/v1/legal-documents-v2/:id
Update legal document metadata.

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body** (partial update allowed):
```json
{
  "normTitle": "Updated Title",
  "summary": "Updated summary",
  "tags": ["tag1", "tag2"],
  "isActive": true,
  "metadata": {
    "version": "2025-amendment"
  }
}
```

**Response** (200):
```json
{
  "document": {
    "id": "uuid",
    "normTitle": "Updated Title",
    "updatedAt": "2025-01-13T11:00:00.000Z"
  },
  "message": "Document updated successfully"
}
```

---

#### DELETE /api/v1/legal-documents-v2/:id
Delete (soft delete) a legal document.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "message": "Document deleted successfully"
}
```

**Note**: Soft delete - document marked as inactive, not physically removed.

---

### RAG Query System

#### POST /api/v1/query
Execute RAG-based query across case documents and legal library.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "caseId": "uuid",
  "query": "¿Cuáles son los derechos del trabajador en caso de despido intempestivo según el Código de Trabajo?",
  "maxResults": 10
}
```

**Response** (200):
```json
{
  "answer": "Según el Código de Trabajo del Ecuador, el trabajador despedido intempestivamente tiene derecho a:\n\n1. **Indemnización por despido intempestivo** (Art. 188): Equivalente a tres meses de remuneración...\n\n2. **Desahucio** (Art. 184): Un mes adicional de remuneración...\n\n3. **Parte proporcional del décimo tercer y décimo cuarto sueldo**...",
  "sources": [
    {
      "documentId": "uuid",
      "documentTitle": "Código de Trabajo del Ecuador",
      "chunkIndex": 45,
      "similarity": 0.92,
      "content": "Art. 188.- Indemnización por despido intempestivo...",
      "source": "legal",
      "normType": "CODIGO",
      "legalHierarchy": 3
    },
    {
      "documentId": "uuid",
      "documentTitle": "Sentencia precedente sobre despido",
      "chunkIndex": 12,
      "similarity": 0.87,
      "content": "En el caso No. 123-2023...",
      "source": "case"
    }
  ],
  "query": "¿Cuáles son los derechos del trabajador...",
  "caseId": "uuid"
}
```

**Features**:
- Searches both case-specific documents and global legal library
- Automatic article reference detection (Art. 100, Artículo 100)
- Multi-term embedding for comprehensive search
- Cosine similarity ranking
- GPT-4 powered answer generation
- Source attribution with confidence scores

**Errors**:
- 400: Invalid request body
- 404: Case not found or unauthorized
- 500: Processing error

---

#### GET /api/v1/query/history/:caseId
Get query history for a specific case.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `limit` (number): Max results (default: 20)
- `offset` (number): Pagination offset (default: 0)

**Response** (200):
```json
{
  "queries": []
}
```

**Note**: Placeholder endpoint - requires Query model implementation.

---

### AI Assistant

#### POST /api/v1/ai/conversation
Initialize a new AI conversation session.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "title": "Consulta sobre contratos laborales"
}
```

**Response** (200):
```json
{
  "conversationId": "uuid",
  "title": "Consulta sobre contratos laborales"
}
```

---

#### POST /api/v1/ai/query
Process a query within an AI conversation.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "conversationId": "uuid",
  "query": "¿Cuáles son los elementos esenciales de un contrato de trabajo?",
  "searchResults": [
    {
      "id": "doc-uuid",
      "title": "Código de Trabajo",
      "content": "Art. 8.- Contrato individual es el convenio...",
      "articleNumber": "Art. 8"
    }
  ]
}
```

**Response** (200):
```json
{
  "answer": "Los elementos esenciales de un contrato de trabajo son:\n\n1. **Acuerdo de voluntades**...",
  "citedDocuments": [
    {
      "id": "doc-uuid",
      "title": "Código de Trabajo",
      "articleNumber": "Art. 8",
      "relevance": 0.95
    }
  ],
  "confidence": 0.92,
  "processingTimeMs": 1250,
  "intent": {
    "type": "definition",
    "confidence": 0.88,
    "entities": ["contrato de trabajo"]
  }
}
```

---

#### GET /api/v1/ai/conversation/:id/history
Retrieve conversation message history.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "¿Cuáles son los elementos esenciales...",
      "timestamp": "2025-01-13T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Los elementos esenciales son...",
      "timestamp": "2025-01-13T10:00:05.000Z",
      "confidence": 0.92
    }
  ]
}
```

---

#### GET /api/v1/ai/conversations
List user's conversations.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Consulta sobre contratos laborales",
      "createdAt": "2025-01-13T10:00:00.000Z",
      "lastMessageAt": "2025-01-13T10:15:00.000Z",
      "messageCount": 8,
      "isActive": true
    }
  ]
}
```

---

#### POST /api/v1/ai/feedback
Submit feedback on AI response quality.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "messageId": "uuid",
  "wasHelpful": true,
  "feedbackText": "Very accurate and comprehensive answer"
}
```

**Response** (200):
```json
{
  "success": true
}
```

---

#### POST /api/v1/ai/conversation/:id/close
Close an AI conversation.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true
}
```

---

### Advanced Search

#### POST /api/v1/search/advanced
Execute advanced semantic search with multiple features.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "query": "jurisprudencia sobre responsabilidad civil extracontractual",
  "filters": {
    "normType": ["LEY", "CODIGO"],
    "dateFrom": "2020-01-01",
    "dateTo": "2025-01-13",
    "jurisdiction": "Nacional"
  },
  "limit": 20,
  "offset": 0,
  "sortBy": "relevance",
  "enableSpellCheck": true,
  "enableQueryExpansion": true,
  "enableReranking": true
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "uuid",
        "title": "Código Civil - Título XXXIII",
        "snippet": "...responsabilidad civil extracontractual...",
        "relevanceScore": 0.94,
        "highlightedContent": "...<mark>responsabilidad civil</mark>...",
        "metadata": {
          "normType": "CODIGO",
          "articleNumber": "Art. 2214"
        }
      }
    ],
    "totalResults": 47,
    "spellingSuggestion": null,
    "expandedQuery": {
      "original": "jurisprudencia sobre responsabilidad civil extracontractual",
      "expanded": ["jurisprudencia", "precedente judicial", "responsabilidad civil", "culpa aquiliana", "daños", "indemnización"]
    },
    "processingTimeMs": 850
  }
}
```

---

#### GET /api/v1/search/autocomplete
Get autocomplete suggestions for search queries.

**Query Parameters**:
- `q` (string, required): Query string (min 2 chars)
- `limit` (number): Max suggestions (default: 10, max: 20)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "query": "responsab",
    "suggestions": [
      {
        "text": "responsabilidad civil",
        "frequency": 342,
        "category": "legal-term"
      },
      {
        "text": "responsabilidad penal",
        "frequency": 187,
        "category": "legal-term"
      },
      {
        "text": "responsabilidad administrativa",
        "frequency": 95,
        "category": "legal-term"
      }
    ]
  }
}
```

---

#### GET /api/v1/search/popular
Get popular search terms.

**Query Parameters**:
- `limit` (number): Max results (default: 10, max: 50)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "popularSearches": [
      {
        "term": "despido intempestivo",
        "searchCount": 1247,
        "trend": "rising"
      },
      {
        "term": "alimentos",
        "searchCount": 982,
        "trend": "stable"
      }
    ]
  }
}
```

---

#### POST /api/v1/search/spell-check
Check spelling and get corrections.

**Request Body**:
```json
{
  "query": "resposabilidad sivil"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "hasErrors": true,
    "corrections": [
      {
        "word": "resposabilidad",
        "position": 0,
        "suggestions": ["responsabilidad"],
        "confidence": 0.95
      },
      {
        "word": "sivil",
        "position": 16,
        "suggestions": ["civil"],
        "confidence": 0.92
      }
    ],
    "suggestion": "responsabilidad civil"
  }
}
```

---

#### GET /api/v1/search/saved
Get user's saved searches (requires authentication).

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `limit` (number): Max results (default: 10, max: 50)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "savedSearches": [
      {
        "id": "uuid",
        "query": "jurisprudencia laboral",
        "filters": { "normType": ["LEY"] },
        "isFavorite": true,
        "createdAt": "2025-01-10T15:00:00.000Z",
        "lastUsed": "2025-01-13T09:30:00.000Z",
        "usageCount": 5
      }
    ]
  }
}
```

---

#### POST /api/v1/search/save
Save a search for later (requires authentication).

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "query": "precedentes constitucionales",
  "filters": {
    "legalHierarchy": 1
  }
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Search saved successfully"
}
```

---

#### PUT /api/v1/search/saved/:id/favorite
Toggle favorite status for saved search.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "message": "Favorite status toggled successfully"
}
```

---

#### POST /api/v1/search/expand
Expand query with synonyms and related terms.

**Request Body**:
```json
{
  "query": "despido"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "original": "despido",
    "expanded": [
      "despido",
      "terminación",
      "desvinculación laboral",
      "cesación",
      "desahucio",
      "visto bueno"
    ],
    "synonyms": {
      "despido": ["terminación", "desvinculación laboral"]
    },
    "relatedTerms": ["indemnización", "liquidación", "finiquito"]
  }
}
```

---

### Analytics

#### GET /api/v1/analytics/trending
Get trending documents.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `limit` (number): Max results (default: 10)

**Response** (200):
```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "Código de Trabajo - Reforma 2024",
      "viewCount": 1547,
      "downloadCount": 342,
      "trend": "rising",
      "trendPercentage": 45.2
    }
  ]
}
```

---

#### GET /api/v1/analytics/top-searches
Get most popular search queries.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `limit` (number): Max results (default: 20)

**Response** (200):
```json
{
  "queries": [
    {
      "query": "despido intempestivo",
      "count": 1247,
      "avgResultCount": 15,
      "avgCTR": 0.42
    }
  ]
}
```

---

#### GET /api/v1/analytics/user/engagement
Get user engagement metrics.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `days` (number): Time period in days (default: 30)

**Response** (200):
```json
{
  "metrics": {
    "totalSearches": 78,
    "totalDocumentViews": 142,
    "avgSessionDuration": 1847,
    "totalDownloads": 23,
    "activeConversations": 5,
    "feedbackSubmitted": 12
  }
}
```

---

#### GET /api/v1/analytics/dashboard
Get system-wide analytics dashboard (admin only).

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `days` (number): Time period (default: 30)

**Response** (200):
```json
{
  "dashboard": {
    "users": {
      "total": 1547,
      "active": 892,
      "new": 45
    },
    "documents": {
      "total": 2847,
      "indexed": 2847,
      "processing": 0
    },
    "searches": {
      "total": 45789,
      "avgResponseTime": 850,
      "avgCTR": 0.38
    },
    "aiQueries": {
      "total": 12456,
      "avgConfidence": 0.87,
      "feedbackScore": 4.2
    }
  }
}
```

**Errors**:
- 403: Admin access required

---

#### POST /api/v1/analytics/track/view
Track document view event.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "documentId": "uuid",
  "timeSpent": 45000
}
```

**Response** (200):
```json
{
  "success": true
}
```

---

#### POST /api/v1/analytics/track/download
Track document download event.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "documentId": "uuid"
}
```

**Response** (200):
```json
{
  "success": true
}
```

---

#### POST /api/v1/analytics/track/search
Track search event with results.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "query": "responsabilidad civil",
  "resultCount": 47,
  "clickPosition": 2
}
```

**Response** (200):
```json
{
  "success": true
}
```

---

### User Feedback

#### POST /api/v1/feedback/search
Track a user search interaction.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "query": "despido intempestivo",
  "resultsCount": 25,
  "filters": {
    "normType": ["LEY", "CODIGO"]
  },
  "sortBy": "relevance",
  "sessionId": "session-uuid"
}
```

**Response** (200):
```json
{
  "id": "search-interaction-uuid"
}
```

---

#### POST /api/v1/feedback/click
Track when user clicks on search result.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "searchInteractionId": "uuid",
  "documentId": "uuid",
  "position": 2,
  "relevanceScore": 0.87
}
```

**Response** (200):
```json
{
  "id": "click-event-uuid"
}
```

---

#### PUT /api/v1/feedback/click/:clickEventId/dwell-time
Update dwell time when user leaves document.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "dwellTime": 125000
}
```

**Response** (200):
```json
{
  "success": true
}
```

---

#### POST /api/v1/feedback/relevance
Track explicit user relevance feedback.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "searchInteractionId": "uuid",
  "documentId": "uuid",
  "rating": 5,
  "isRelevant": true,
  "comment": "Exactly what I was looking for"
}
```

**Response** (200):
```json
{
  "id": "relevance-feedback-uuid"
}
```

---

#### GET /api/v1/feedback/metrics/ctr
Get click-through rate metrics.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `startDate` (string): Start date (ISO 8601)
- `endDate` (string): End date (ISO 8601)
- `userId` (string): Filter by specific user

**Response** (200):
```json
{
  "totalSearches": 1247,
  "searchesWithClicks": 897,
  "totalClicks": 1534,
  "ctr": 71.93,
  "avgClicksPerSearch": 1.23,
  "avgPosition": 2.8
}
```

---

#### GET /api/v1/feedback/metrics/relevance
Get relevance feedback metrics.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "totalFeedback": 342,
  "avgRating": 4.3,
  "relevantCount": 298,
  "irrelevantCount": 44,
  "relevanceRate": 87.1
}
```

---

#### GET /api/v1/feedback/top-clicked
Get most clicked documents for a query.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `query` (string, required): Search query
- `limit` (number): Max results (default: 10)

**Response** (200):
```json
[
  {
    "documentId": "uuid",
    "clickCount": 78,
    "avgPosition": 1.8
  }
]
```

---

#### POST /api/v1/feedback/ab-test
Create A/B test configuration (admin only).

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Search Algorithm Comparison",
  "description": "Testing new semantic search vs baseline",
  "variants": [
    {
      "name": "baseline",
      "config": { "algorithm": "tfidf" }
    },
    {
      "name": "semantic",
      "config": { "algorithm": "embedding" }
    }
  ],
  "trafficSplit": {
    "baseline": 0.5,
    "semantic": 0.5
  },
  "startDate": "2025-01-15T00:00:00.000Z",
  "endDate": "2025-02-15T00:00:00.000Z"
}
```

**Response** (200):
```json
{
  "id": "ab-test-uuid"
}
```

---

#### GET /api/v1/feedback/ab-test/:testConfigId/variant
Get or assign user to A/B test variant.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "variant": "semantic"
}
```

---

#### GET /api/v1/feedback/ab-test/:testConfigId/results
Get A/B test results (admin only).

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "variants": [
    {
      "variant": "baseline",
      "userCount": 487,
      "avgCTR": 0.68,
      "avgRelevance": 3.8
    },
    {
      "variant": "semantic",
      "userCount": 493,
      "avgCTR": 0.79,
      "avgRelevance": 4.3
    }
  ]
}
```

---

### User Management

#### GET /api/v1/user/profile
Get current user profile.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatarUrl": "/uploads/avatars/avatar-123.jpg",
    "phoneNumber": "+593991234567",
    "address": "Av. 10 de Agosto",
    "city": "Quito",
    "country": "Ecuador",
    "role": "user",
    "planTier": "professional",
    "isActive": true,
    "lastLogin": "2025-01-13T10:00:00.000Z",
    "storageUsedMB": 245.7,
    "totalQueries": 1247,
    "createdAt": "2024-06-01T00:00:00.000Z",
    "barNumber": "EC-12345",
    "lawFirm": "Doe & Associates",
    "specialization": "Derecho Laboral",
    "licenseState": "Pichincha",
    "bio": "Abogado especializado en derecho laboral...",
    "language": "es",
    "timezone": "America/Guayaquil",
    "theme": "light",
    "emailNotifications": true,
    "marketingEmails": false,
    "twoFactorEnabled": true,
    "twoFactorVerifiedAt": "2024-06-15T10:00:00.000Z"
  }
}
```

---

#### PATCH /api/v1/user/profile
Update user profile.

**Headers**: `Authorization: Bearer <token>`

**Request Body** (partial update):
```json
{
  "name": "John A. Doe",
  "phoneNumber": "+593991234567",
  "lawFirm": "Doe Legal Partners",
  "specialization": "Derecho Laboral y Seguridad Social",
  "theme": "dark",
  "emailNotifications": true
}
```

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "name": "John A. Doe",
    "phoneNumber": "+593991234567",
    "lawFirm": "Doe Legal Partners",
    "updatedAt": "2025-01-13T11:00:00.000Z"
  },
  "message": "Profile updated successfully"
}
```

---

#### POST /api/v1/user/avatar
Upload user avatar image.

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data**:
- `file` (file): Image file (JPEG, PNG, GIF, WebP)

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "avatarUrl": "/uploads/avatars/avatar-1705147200000-123456789.jpg"
  },
  "message": "Avatar uploaded successfully"
}
```

**Errors**:
- 400: Invalid file type or no file uploaded

---

#### DELETE /api/v1/user/avatar
Delete user avatar.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "message": "Avatar deleted successfully"
}
```

---

### Subscription Management

#### GET /api/v1/user/subscription
Get current user subscription and quota.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "subscription": {
    "id": "uuid",
    "userId": "uuid",
    "planId": "uuid",
    "status": "active",
    "billingCycle": "monthly",
    "currentPeriodStart": "2025-01-01T00:00:00.000Z",
    "currentPeriodEnd": "2025-02-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "plan": {
      "id": "uuid",
      "name": "Professional",
      "code": "professional",
      "price": 49.99,
      "currency": "USD",
      "storageGB": 50,
      "documentsLimit": 500,
      "monthlyQueries": 1000,
      "apiCallsLimit": 5000,
      "features": [
        "Unlimited semantic search",
        "AI assistant",
        "Advanced analytics",
        "Priority support"
      ]
    }
  },
  "quota": {
    "userId": "uuid",
    "storageGB": 50,
    "storageUsed": 12.5,
    "documentsLimit": 500,
    "documentsUsed": 187,
    "monthlyQueries": 1000,
    "queriesUsed": 342,
    "apiCallsLimit": 5000,
    "apiCallsUsed": 1247,
    "resetDate": "2025-02-01T00:00:00.000Z"
  }
}
```

---

#### GET /api/v1/user/subscription/plans
Get available subscription plans.

**Response** (200):
```json
{
  "plans": [
    {
      "id": "uuid",
      "name": "Free",
      "code": "free",
      "price": 0,
      "currency": "USD",
      "storageGB": 1,
      "documentsLimit": 10,
      "monthlyQueries": 50,
      "apiCallsLimit": 100,
      "features": [
        "Basic search",
        "10 documents",
        "50 queries/month"
      ],
      "displayOrder": 1,
      "isActive": true
    },
    {
      "id": "uuid",
      "name": "Professional",
      "code": "professional",
      "price": 49.99,
      "currency": "USD",
      "storageGB": 50,
      "documentsLimit": 500,
      "monthlyQueries": 1000,
      "apiCallsLimit": 5000,
      "features": [
        "Unlimited semantic search",
        "AI assistant",
        "Advanced analytics",
        "Priority support"
      ],
      "displayOrder": 2,
      "isActive": true
    }
  ]
}
```

---

#### POST /api/v1/user/subscription/upgrade
Upgrade or downgrade subscription.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "planCode": "professional",
  "billingCycle": "yearly"
}
```

**Response** (200):
```json
{
  "subscription": {
    "id": "uuid",
    "status": "pending",
    "plan": {
      "name": "Professional",
      "code": "professional",
      "price": 499.99
    },
    "billingCycle": "yearly",
    "currentPeriodEnd": "2026-01-13T00:00:00.000Z"
  },
  "message": "Subscription updated successfully"
}
```

**Note**: In MVP, status is "pending" awaiting payment integration (Stripe/PayPal).

---

#### POST /api/v1/user/subscription/cancel
Cancel subscription.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "immediately": false
}
```

**Response** (200):
```json
{
  "subscription": {
    "id": "uuid",
    "status": "active",
    "cancelAtPeriodEnd": true,
    "cancelledAt": "2025-01-13T10:00:00.000Z",
    "currentPeriodEnd": "2025-02-01T00:00:00.000Z"
  },
  "message": "Subscription will be cancelled at period end"
}
```

**With immediate cancellation**:
```json
{
  "immediately": true
}
```
Results in `status: "cancelled"` and immediate service termination.

---

### Admin Routes

**Note**: All admin routes require `role: "admin"` and return 403 for non-admin users.

#### Admin User Management
- GET /api/v1/admin/users - List all users with filters
- GET /api/v1/admin/users/:id - Get user details
- PATCH /api/v1/admin/users/:id - Update user (role, status, plan)
- DELETE /api/v1/admin/users/:id - Delete user account

#### Admin Plans Management
- GET /api/v1/admin/plans - List subscription plans
- POST /api/v1/admin/plans - Create new plan
- PATCH /api/v1/admin/plans/:id - Update plan
- DELETE /api/v1/admin/plans/:id - Delete plan

#### Admin Quotas Management
- GET /api/v1/admin/quotas - List user quotas
- PATCH /api/v1/admin/quotas/:userId - Update user quota

#### Admin Audit Logs
- GET /api/v1/admin/audit - Get system audit logs with filters

#### Admin Data Migration
- POST /api/v1/admin/migration/start - Start data migration
- GET /api/v1/admin/migration/status - Check migration status

---

## Data Schemas

### User Schema
```typescript
{
  id: string;                    // UUID
  email: string;                 // Unique, validated
  name: string;
  passwordHash: string;          // bcrypt hashed
  role: "user" | "admin";
  planTier: string;              // "free", "professional", "enterprise"
  avatarUrl: string | null;
  phoneNumber: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  barNumber: string | null;      // Bar association number
  lawFirm: string | null;
  specialization: string | null;
  licenseState: string | null;
  bio: string | null;
  language: string;              // Default: "es"
  timezone: string;              // Default: "America/Guayaquil"
  theme: "light" | "dark";
  emailNotifications: boolean;
  marketingEmails: boolean;
  provider: "local" | "google";
  isActive: boolean;
  lastLogin: Date | null;
  storageUsedMB: number;
  totalQueries: number;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  twoFactorVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Legal Document Schema
```typescript
{
  id: string;                    // UUID
  normTitle: string;             // Official title
  normType: string;              // CONSTITUCION, LEY, CODIGO, DECRETO, etc.
  normNumber: string | null;     // Official number
  legalHierarchy: number;        // 1-7 (Constitution = 1)
  publicationDate: Date | null;
  effectiveDate: Date | null;
  jurisdiction: string | null;   // Nacional, Provincial, Cantonal
  issuingAuthority: string | null;
  summary: string | null;
  keyArticles: string[];
  relatedNorms: string[];
  isActive: boolean;
  tags: string[];
  s3Url: string | null;
  s3Key: string | null;
  fileSize: number | null;
  pageCount: number | null;
  chunkCount: number;
  hasEmbeddings: boolean;
  metadata: object;              // JSON metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### Subscription Plan Schema
```typescript
{
  id: string;                    // UUID
  name: string;
  code: string;                  // Unique: "free", "professional"
  description: string | null;
  price: number;                 // Decimal price
  currency: string;              // Default: "USD"
  billingPeriod: "monthly" | "yearly";
  storageGB: number;
  documentsLimit: number;
  monthlyQueries: number;
  apiCallsLimit: number;
  features: string[];            // JSON array
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Search Interaction Schema
```typescript
{
  id: string;                    // UUID
  userId: string;
  query: string;
  resultsCount: number;
  filters: object | null;
  sortBy: string | null;
  sessionId: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  timestamp: Date;
}
```

### Click Event Schema
```typescript
{
  id: string;                    // UUID
  searchInteractionId: string;
  documentId: string;
  position: number;              // 0-indexed position in results
  relevanceScore: number | null;
  dwellTime: number | null;      // Time spent in milliseconds
  timestamp: Date;
}
```

### Relevance Feedback Schema
```typescript
{
  id: string;                    // UUID
  searchInteractionId: string;
  documentId: string;
  rating: number;                // 1-5 stars
  isRelevant: boolean | null;
  comment: string | null;
  userId: string;
  timestamp: Date;
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### HTTP Status Codes

| Status | Meaning | Usage |
|--------|---------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request body/parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource (e.g., email exists) |
| 413 | Payload Too Large | File size exceeds limit |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily down |
| 507 | Insufficient Storage | Storage quota exceeded |

### Common Error Codes

| Code | Description |
|------|-------------|
| VALIDATION_ERROR | Request validation failed |
| AUTHENTICATION_ERROR | Invalid credentials |
| AUTHORIZATION_ERROR | Insufficient permissions |
| RESOURCE_NOT_FOUND | Requested resource not found |
| DUPLICATE_RESOURCE | Resource already exists |
| RATE_LIMIT_EXCEEDED | Too many requests |
| QUOTA_EXCEEDED | Usage quota exceeded |
| STORAGE_FULL | Storage limit reached |
| PROCESSING_ERROR | Document processing failed |
| AI_SERVICE_ERROR | AI service unavailable |

---

## Rate Limiting

Rate limits vary by subscription plan:

| Plan | Requests/Minute | Requests/Hour | Daily Queries |
|------|----------------|---------------|---------------|
| Free | 10 | 100 | 50 |
| Professional | 60 | 1000 | 1000 |
| Enterprise | 120 | 5000 | Unlimited |

### Rate Limit Headers
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705150800
```

### Rate Limit Response (429)
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60,
  "limit": 60,
  "remaining": 0,
  "resetAt": "2025-01-13T11:00:00.000Z"
}
```

---

## Best Practices

### 1. Authentication
- Always include `Authorization: Bearer <token>` header
- Refresh tokens before expiration (7 days)
- Implement token refresh flow in production
- Use HTTPS in production
- Enable 2FA for enhanced security

### 2. Error Handling
```typescript
try {
  const response = await fetch('/api/v1/legal-documents-v2', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error);
  // Handle error appropriately
}
```

### 3. Pagination
```typescript
async function fetchAllDocuments() {
  let page = 1;
  let hasMore = true;
  const allDocuments = [];

  while (hasMore) {
    const response = await fetch(
      `/api/v1/legal-documents-v2?page=${page}&pageSize=50`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const data = await response.json();
    allDocuments.push(...data.documents);
    hasMore = data.pagination.hasNextPage;
    page++;
  }

  return allDocuments;
}
```

### 4. File Upload
```typescript
async function uploadDocument(file: File, metadata: object) {
  const formData = new FormData();
  formData.append('file', file);

  Object.entries(metadata).forEach(([key, value]) => {
    formData.append(key, String(value));
  });

  const response = await fetch('/api/v1/legal-documents-v2', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });

  return response.json();
}
```

### 5. Rate Limiting
```typescript
function checkRateLimit(response: Response) {
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');

  if (remaining && parseInt(remaining) < 10) {
    console.warn(`Rate limit almost reached. Remaining: ${remaining}`);
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
  }
}
```

### 6. Idempotency
For critical operations, use idempotency keys:
```typescript
const idempotencyKey = crypto.randomUUID();

await fetch('/api/v1/legal-documents-v2', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Idempotency-Key': idempotencyKey
  },
  body: JSON.stringify(data)
});
```

---

## SDK Examples

### JavaScript/TypeScript SDK

```typescript
class LegalRAGClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = 'https://api.legalrag.com/api/v1') {
    this.baseURL = baseURL;
  }

  // Authentication
  async register(email: string, password: string, name: string) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });

    const data = await response.json();
    if (response.ok) {
      this.token = data.token;
    }
    return data;
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (response.ok && data.token) {
      this.token = data.token;
    }
    return data;
  }

  // Legal Documents
  async getDocuments(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    normType?: string;
  } = {}) {
    const queryString = new URLSearchParams(params as any).toString();
    const response = await fetch(
      `${this.baseURL}/legal-documents-v2?${queryString}`,
      { headers: this.getHeaders() }
    );
    return response.json();
  }

  async getDocument(id: string) {
    const response = await fetch(
      `${this.baseURL}/legal-documents-v2/${id}`,
      { headers: this.getHeaders() }
    );
    return response.json();
  }

  async uploadDocument(file: File, metadata: any) {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const response = await fetch(`${this.baseURL}/legal-documents-v2`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` },
      body: formData
    });
    return response.json();
  }

  // RAG Query
  async query(caseId: string, query: string, maxResults: number = 10) {
    const response = await fetch(`${this.baseURL}/query`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ caseId, query, maxResults })
    });
    return response.json();
  }

  // Advanced Search
  async advancedSearch(params: {
    query: string;
    filters?: any;
    limit?: number;
    sortBy?: string;
  }) {
    const response = await fetch(`${this.baseURL}/search/advanced`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params)
    });
    return response.json();
  }

  // AI Assistant
  async createConversation(title: string) {
    const response = await fetch(`${this.baseURL}/ai/conversation`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ title })
    });
    return response.json();
  }

  async askAI(conversationId: string, query: string, searchResults?: any[]) {
    const response = await fetch(`${this.baseURL}/ai/query`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ conversationId, query, searchResults })
    });
    return response.json();
  }

  // User Profile
  async getProfile() {
    const response = await fetch(`${this.baseURL}/user/profile`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  async updateProfile(updates: any) {
    const response = await fetch(`${this.baseURL}/user/profile`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  // Subscription
  async getSubscription() {
    const response = await fetch(`${this.baseURL}/user/subscription`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  async upgradeSubscription(planCode: string, billingCycle: 'monthly' | 'yearly' = 'monthly') {
    const response = await fetch(`${this.baseURL}/user/subscription/upgrade`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ planCode, billingCycle })
    });
    return response.json();
  }

  // Helper methods
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  }
}

// Usage Example
const client = new LegalRAGClient();

// Login
await client.login('user@example.com', 'password');

// Search documents
const documents = await client.getDocuments({
  search: 'responsabilidad civil',
  normType: 'CODIGO',
  page: 1,
  pageSize: 20
});

// RAG Query
const answer = await client.query(
  'case-uuid',
  '¿Cuáles son los derechos del trabajador en caso de despido?'
);

// Create AI conversation
const conversation = await client.createConversation('Consulta laboral');
const aiResponse = await client.askAI(
  conversation.conversationId,
  '¿Qué es un contrato de trabajo?'
);
```

### Python SDK

```python
import requests
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

@dataclass
class LegalRAGClient:
    base_url: str = "https://api.legalrag.com/api/v1"
    token: Optional[str] = None

    def __post_init__(self):
        self.session = requests.Session()

    # Authentication
    def register(self, email: str, password: str, name: str) -> Dict[str, Any]:
        response = self.session.post(
            f"{self.base_url}/auth/register",
            json={"email": email, "password": password, "name": name}
        )
        data = response.json()
        if response.ok and 'token' in data:
            self.token = data['token']
        return data

    def login(self, email: str, password: str) -> Dict[str, Any]:
        response = self.session.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        )
        data = response.json()
        if response.ok and 'token' in data:
            self.token = data['token']
        return data

    # Legal Documents
    def get_documents(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        norm_type: Optional[str] = None
    ) -> Dict[str, Any]:
        params = {"page": page, "pageSize": page_size}
        if search:
            params["search"] = search
        if norm_type:
            params["normType"] = norm_type

        response = self.session.get(
            f"{self.base_url}/legal-documents-v2",
            params=params,
            headers=self._get_headers()
        )
        return response.json()

    def get_document(self, document_id: str) -> Dict[str, Any]:
        response = self.session.get(
            f"{self.base_url}/legal-documents-v2/{document_id}",
            headers=self._get_headers()
        )
        return response.json()

    def upload_document(
        self,
        file_path: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        with open(file_path, 'rb') as f:
            files = {'file': f}
            response = self.session.post(
                f"{self.base_url}/legal-documents-v2",
                files=files,
                data=metadata,
                headers={'Authorization': f'Bearer {self.token}'}
            )
        return response.json()

    # RAG Query
    def query(
        self,
        case_id: str,
        query: str,
        max_results: int = 10
    ) -> Dict[str, Any]:
        response = self.session.post(
            f"{self.base_url}/query",
            json={
                "caseId": case_id,
                "query": query,
                "maxResults": max_results
            },
            headers=self._get_headers()
        )
        return response.json()

    # Advanced Search
    def advanced_search(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 20,
        sort_by: str = "relevance"
    ) -> Dict[str, Any]:
        response = self.session.post(
            f"{self.base_url}/search/advanced",
            json={
                "query": query,
                "filters": filters or {},
                "limit": limit,
                "sortBy": sort_by
            },
            headers=self._get_headers()
        )
        return response.json()

    # AI Assistant
    def create_conversation(self, title: str) -> Dict[str, Any]:
        response = self.session.post(
            f"{self.base_url}/ai/conversation",
            json={"title": title},
            headers=self._get_headers()
        )
        return response.json()

    def ask_ai(
        self,
        conversation_id: str,
        query: str,
        search_results: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        response = self.session.post(
            f"{self.base_url}/ai/query",
            json={
                "conversationId": conversation_id,
                "query": query,
                "searchResults": search_results or []
            },
            headers=self._get_headers()
        )
        return response.json()

    # User Profile
    def get_profile(self) -> Dict[str, Any]:
        response = self.session.get(
            f"{self.base_url}/user/profile",
            headers=self._get_headers()
        )
        return response.json()

    def update_profile(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        response = self.session.patch(
            f"{self.base_url}/user/profile",
            json=updates,
            headers=self._get_headers()
        )
        return response.json()

    # Subscription
    def get_subscription(self) -> Dict[str, Any]:
        response = self.session.get(
            f"{self.base_url}/user/subscription",
            headers=self._get_headers()
        )
        return response.json()

    def upgrade_subscription(
        self,
        plan_code: str,
        billing_cycle: str = "monthly"
    ) -> Dict[str, Any]:
        response = self.session.post(
            f"{self.base_url}/user/subscription/upgrade",
            json={
                "planCode": plan_code,
                "billingCycle": billing_cycle
            },
            headers=self._get_headers()
        )
        return response.json()

    # Helper methods
    def _get_headers(self) -> Dict[str, str]:
        return {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.token}'
        }


# Usage Example
if __name__ == "__main__":
    client = LegalRAGClient()

    # Login
    client.login("user@example.com", "password")

    # Search documents
    documents = client.get_documents(
        search="responsabilidad civil",
        norm_type="CODIGO",
        page=1,
        page_size=20
    )
    print(f"Found {documents['pagination']['totalItems']} documents")

    # RAG Query
    answer = client.query(
        "case-uuid",
        "¿Cuáles son los derechos del trabajador en caso de despido?"
    )
    print(f"Answer: {answer['answer']}")
    print(f"Sources: {len(answer['sources'])} documents")

    # Create AI conversation
    conversation = client.create_conversation("Consulta laboral")
    ai_response = client.ask_ai(
        conversation['conversationId'],
        "¿Qué es un contrato de trabajo?"
    )
    print(f"AI Answer: {ai_response['answer']}")
```

---

## Appendix: Complete Endpoint Index

### Authentication (9 endpoints)
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/me
- POST /api/v1/auth/2fa/setup
- POST /api/v1/auth/2fa/verify
- POST /api/v1/auth/2fa/disable
- GET /api/v1/auth/2fa/status
- GET /api/v1/auth/google
- GET /api/v1/auth/google/callback

### Legal Documents (5 endpoints)
- GET /api/v1/legal-documents-v2
- GET /api/v1/legal-documents-v2/:id
- POST /api/v1/legal-documents-v2
- PUT /api/v1/legal-documents-v2/:id
- DELETE /api/v1/legal-documents-v2/:id

### RAG Query (2 endpoints)
- POST /api/v1/query
- GET /api/v1/query/history/:caseId

### AI Assistant (6 endpoints)
- POST /api/v1/ai/conversation
- POST /api/v1/ai/query
- GET /api/v1/ai/conversation/:id/history
- GET /api/v1/ai/conversations
- POST /api/v1/ai/feedback
- POST /api/v1/ai/conversation/:id/close

### Advanced Search (8 endpoints)
- POST /api/v1/search/advanced
- GET /api/v1/search/autocomplete
- GET /api/v1/search/popular
- POST /api/v1/search/spell-check
- GET /api/v1/search/saved
- POST /api/v1/search/save
- PUT /api/v1/search/saved/:id/favorite
- POST /api/v1/search/expand

### Analytics (7 endpoints)
- GET /api/v1/analytics/trending
- GET /api/v1/analytics/top-searches
- GET /api/v1/analytics/user/engagement
- GET /api/v1/analytics/dashboard
- POST /api/v1/analytics/track/view
- POST /api/v1/analytics/track/download
- POST /api/v1/analytics/track/search

### User Feedback (10 endpoints)
- POST /api/v1/feedback/search
- POST /api/v1/feedback/click
- PUT /api/v1/feedback/click/:clickEventId/dwell-time
- POST /api/v1/feedback/relevance
- GET /api/v1/feedback/metrics/ctr
- GET /api/v1/feedback/metrics/relevance
- GET /api/v1/feedback/top-clicked
- POST /api/v1/feedback/ab-test
- GET /api/v1/feedback/ab-test/:testConfigId/variant
- GET /api/v1/feedback/ab-test/:testConfigId/results

### User Management (4 endpoints)
- GET /api/v1/user/profile
- PATCH /api/v1/user/profile
- POST /api/v1/user/avatar
- DELETE /api/v1/user/avatar

### Subscription (4 endpoints)
- GET /api/v1/user/subscription
- GET /api/v1/user/subscription/plans
- POST /api/v1/user/subscription/upgrade
- POST /api/v1/user/subscription/cancel

### Admin Routes (12+ endpoints)
- User management (CRUD)
- Plan management (CRUD)
- Quota management
- Audit logs
- Data migration

**Total: 67+ documented endpoints**

---

## Support

For API support:
- Email: api-support@legalrag.com
- Documentation: https://docs.legalrag.com
- Status: https://status.legalrag.com

For bug reports and feature requests:
- GitHub: https://github.com/legalrag/api
- Issue Tracker: https://github.com/legalrag/api/issues

---

**Document Version**: 2.0
**Last Updated**: January 13, 2025
**API Version**: v1
**Generated by**: Legal RAG Documentation Team
