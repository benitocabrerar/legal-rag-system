# Legal RAG System - API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Categories](#api-categories)
4. [Request/Response Examples](#request-response-examples)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Best Practices](#best-practices)
8. [SDK Examples](#sdk-examples)

---

## Overview

The Legal RAG System provides a comprehensive RESTful API for managing legal documents, performing AI-powered searches, and accessing intelligent legal assistance powered by GPT-4 and semantic embeddings.

### Base URLs

- **Production**: `https://api.legalrag.com/api/v1`
- **Staging**: `https://staging-api.legalrag.com/api/v1`
- **Development**: `http://localhost:3001/api/v1`

### API Standards

- **Protocol**: HTTPS (TLS 1.2+)
- **Format**: JSON
- **Authentication**: JWT Bearer tokens
- **Character Encoding**: UTF-8
- **Date Format**: ISO 8601 (e.g., `2025-01-13T10:30:00.000Z`)

---

## Authentication

### JWT Bearer Token

All authenticated endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Obtaining a Token

**Endpoint**: `POST /auth/login`

```bash
curl -X POST https://api.legalrag.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**Response**:

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "planTier": "professional"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Token Expiration

- JWT tokens expire after **7 days**
- Refresh tokens are not implemented yet (planned for v2.1)
- Upon expiration, users must re-authenticate

### Two-Factor Authentication (2FA)

If 2FA is enabled, the login response will indicate:

```json
{
  "requires2FA": true,
  "email": "user@example.com"
}
```

Complete login with:

```bash
curl -X POST https://api.legalrag.com/api/v1/auth/2fa/verify-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "token": "123456"
  }'
```

---

## API Categories

### 1. Authentication & Authorization

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/auth/register` | POST | Register new user | No |
| `/auth/login` | POST | User login | No |
| `/auth/me` | GET | Get current user | Yes |
| `/auth/google` | GET | Google OAuth initiation | No |
| `/auth/2fa/setup` | POST | Setup 2FA | Yes |
| `/auth/2fa/verify` | POST | Enable 2FA | Yes |
| `/auth/2fa/status` | GET | Check 2FA status | Yes |

### 2. Legal Documents (v2)

| Endpoint | Method | Description | Auth Required | Admin Only |
|----------|--------|-------------|---------------|------------|
| `/legal-documents-v2` | GET | Query documents | Yes | No |
| `/legal-documents-v2` | POST | Upload document | Yes | Yes |
| `/legal-documents-v2/{id}` | GET | Get document | Yes | No |
| `/legal-documents-v2/{id}` | PUT | Update document | Yes | Yes |
| `/legal-documents-v2/{id}` | DELETE | Delete document | Yes | Yes |
| `/legal-documents-v2/{id}/file` | GET | Download PDF | Yes | No |
| `/legal-documents-v2/search` | POST | Semantic search | Yes | No |
| `/legal-documents-v2/extract-metadata` | POST | AI extraction | Yes | Yes |
| `/legal-documents-v2/enums` | GET | Get enum values | Yes | No |

### 3. AI Assistant

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/ai/conversation` | POST | Create conversation | Yes |
| `/api/ai/query` | POST | Process AI query | Yes |
| `/api/ai/conversation/{id}/history` | GET | Get history | Yes |
| `/api/ai/conversations` | GET | List conversations | Yes |
| `/api/ai/feedback` | POST | Submit feedback | Yes |

### 4. Advanced Search

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/advanced` | POST | Advanced search | Yes |
| `/autocomplete` | GET | Get suggestions | Yes |
| `/spell-check` | POST | Check spelling | Yes |
| `/saved` | GET | Get saved searches | Yes |
| `/save` | POST | Save search | Yes |

### 5. User Management

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/user/profile` | GET | Get profile | Yes |
| `/user/profile` | PATCH | Update profile | Yes |
| `/user/avatar` | POST | Upload avatar | Yes |
| `/user/avatar` | DELETE | Delete avatar | Yes |

### 6. Subscription Management

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/user/subscription` | GET | Get subscription | Yes |
| `/user/subscription/plans` | GET | List plans | No |
| `/user/subscription/upgrade` | POST | Upgrade plan | Yes |
| `/user/subscription/cancel` | POST | Cancel subscription | Yes |

### 7. Analytics

| Endpoint | Method | Description | Auth Required | Admin Only |
|----------|--------|-------------|---------------|------------|
| `/api/analytics/trending` | GET | Trending docs | Yes | No |
| `/api/analytics/user/engagement` | GET | User metrics | Yes | No |
| `/api/analytics/dashboard` | GET | System dashboard | Yes | Yes |

### 8. Feedback & Tracking

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/search` | POST | Track search | Yes |
| `/click` | POST | Track click | Yes |
| `/relevance` | POST | Track feedback | Yes |
| `/metrics/ctr` | GET | Get CTR metrics | Yes |

---

## Request/Response Examples

### Example 1: Upload Legal Document with PDF

**Request**:

```bash
curl -X POST https://api.legalrag.com/api/v1/legal-documents-v2 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@constitucion_ecuador_2008.pdf" \
  -F "norm_title=Constitución de la República del Ecuador" \
  -F "norm_type=CONSTITUTIONAL_NORM" \
  -F "legal_hierarchy=CONSTITUCION" \
  -F "publication_type=ORDINARIO" \
  -F "publication_number=449" \
  -F "publication_date=2008-10-20" \
  -F "jurisdiction=NACIONAL"
```

**Response**:

```json
{
  "success": true,
  "message": "✅ Documento cargado y vectorizado correctamente. Se generaron 287 embeddings de 287 fragmentos. El documento está listo para búsquedas semánticas con IA.",
  "document": {
    "id": "d9e7f8a1-5c2b-4d3e-8f9a-1b2c3d4e5f6a",
    "normTitle": "Constitución de la República del Ecuador",
    "normType": "CONSTITUTIONAL_NORM",
    "legalHierarchy": "CONSTITUCION",
    "publicationType": "ORDINARIO",
    "publicationNumber": "449",
    "publicationDate": "2008-10-20T00:00:00.000Z",
    "jurisdiction": "NACIONAL",
    "documentState": "ORIGINAL",
    "isActive": true,
    "createdAt": "2025-01-13T10:30:00.000Z",
    "updatedAt": "2025-01-13T10:30:00.000Z"
  },
  "vectorization": {
    "totalChunks": 287,
    "embeddingsGenerated": 287,
    "embeddingsFailed": 0,
    "successRate": "100%"
  }
}
```

### Example 2: Semantic Search

**Request**:

```bash
curl -X POST https://api.legalrag.com/api/v1/legal-documents-v2/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "derechos de libertad y protección de datos personales",
    "limit": 5
  }'
```

**Response**:

```json
{
  "success": true,
  "results": [
    {
      "documentId": "d9e7f8a1-5c2b-4d3e-8f9a-1b2c3d4e5f6a",
      "documentTitle": "Constitución de la República del Ecuador",
      "chunkIndex": 45,
      "similarity": 0.89,
      "content": "Art. 66.- Se reconoce y garantizará a las personas: ... 19. El derecho a la protección de datos de carácter personal, que incluye el acceso y la decisión sobre información y datos de este carácter...",
      "metadata": {
        "normType": "CONSTITUTIONAL_NORM",
        "legalHierarchy": "CONSTITUCION"
      }
    },
    {
      "documentId": "d9e7f8a1-5c2b-4d3e-8f9a-1b2c3d4e5f6a",
      "documentTitle": "Constitución de la República del Ecuador",
      "chunkIndex": 44,
      "similarity": 0.85,
      "content": "Art. 66.- Se reconoce y garantizará a las personas: ... 2. El derecho a la libertad de conciencia, la manifestación de religión, creencia y pensamiento...",
      "metadata": {
        "normType": "CONSTITUTIONAL_NORM",
        "legalHierarchy": "CONSTITUCION"
      }
    }
  ],
  "count": 5
}
```

### Example 3: AI Assistant Query

**Request**:

```bash
curl -X POST https://api.legalrag.com/api/v1/api/ai/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "550e8400-e29b-41d4-a716-446655440000",
    "query": "¿Qué dice la Constitución sobre la protección de datos personales?",
    "searchResults": [
      {
        "id": "d9e7f8a1-5c2b-4d3e-8f9a-1b2c3d4e5f6a",
        "title": "Constitución de la República del Ecuador",
        "content": "Art. 66.- Se reconoce y garantizará a las personas: 19. El derecho a la protección de datos de carácter personal...",
        "articleNumber": "66"
      }
    ]
  }'
```

**Response**:

```json
{
  "answer": "Según la Constitución de la República del Ecuador, en el Artículo 66, numeral 19, se reconoce y garantiza el derecho a la protección de datos de carácter personal. Este derecho incluye:\n\n1. **Acceso**: Las personas tienen derecho a acceder a sus datos personales.\n2. **Decisión**: Las personas pueden decidir sobre la información y datos de carácter personal que les conciernen.\n3. **Protección**: Se garantiza la protección de esta información contra su uso indebido.\n\nEste derecho fundamental asegura que las personas tengan control sobre su información personal y cómo es utilizada por terceros, tanto en el sector público como privado.",
  "citedDocuments": [
    {
      "id": "d9e7f8a1-5c2b-4d3e-8f9a-1b2c3d4e5f6a",
      "title": "Constitución de la República del Ecuador",
      "excerpt": "Art. 66.- Se reconoce y garantizará a las personas: 19. El derecho a la protección de datos de carácter personal..."
    }
  ],
  "confidence": 0.92,
  "processingTimeMs": 1847,
  "intent": {
    "type": "legal_query",
    "confidence": 0.95
  }
}
```

### Example 4: Advanced Search with Filters

**Request**:

```bash
curl -X POST https://api.legalrag.com/api/v1/advanced \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "derechos fundamentales",
    "filters": {
      "normType": ["CONSTITUTIONAL_NORM", "ORGANIC_LAW"],
      "legalHierarchy": ["CONSTITUCION", "LEYES_ORGANICAS"],
      "dateFrom": "2008-01-01",
      "dateTo": "2025-12-31"
    },
    "limit": 20,
    "offset": 0,
    "sortBy": "relevance",
    "enableSpellCheck": true,
    "enableQueryExpansion": true,
    "enableReranking": true
  }'
```

**Response**:

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "d9e7f8a1-5c2b-4d3e-8f9a-1b2c3d4e5f6a",
        "title": "Constitución de la República del Ecuador",
        "excerpt": "TÍTULO II - DERECHOS - Capítulo primero - Principios de aplicación de los derechos...",
        "relevanceScore": 0.94,
        "normType": "CONSTITUTIONAL_NORM",
        "legalHierarchy": "CONSTITUCION",
        "publicationDate": "2008-10-20T00:00:00.000Z"
      }
    ],
    "totalCount": 47,
    "spellingSuggestion": null,
    "expandedTerms": [
      "derechos fundamentales",
      "derechos constitucionales",
      "garantías constitucionales",
      "derechos humanos"
    ],
    "queryTime": 234
  }
}
```

### Example 5: Track User Interaction

**Request**:

```bash
# First, track the search
curl -X POST https://api.legalrag.com/api/v1/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "derechos fundamentales",
    "resultsCount": 20,
    "filters": {"normType": ["CONSTITUTIONAL_NORM"]},
    "sortBy": "relevance",
    "sessionId": "session-123"
  }'

# Returns: {"id": "search-interaction-456"}

# Then, track when user clicks on a result
curl -X POST https://api.legalrag.com/api/v1/click \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "searchInteractionId": "search-interaction-456",
    "documentId": "d9e7f8a1-5c2b-4d3e-8f9a-1b2c3d4e5f6a",
    "position": 0,
    "relevanceScore": 0.94
  }'

# Returns: {"id": "click-event-789"}

# Finally, update dwell time when user leaves
curl -X PUT https://api.legalrag.com/api/v1/click/click-event-789/dwell-time \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dwellTime": 45000
  }'
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required or token invalid |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Response Format

```json
{
  "error": "Validation Error",
  "details": [
    {
      "field": "normTitle",
      "message": "Required field is missing"
    }
  ],
  "code": "VALIDATION_ERROR"
}
```

### Common Error Examples

#### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

#### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "Only administrators can create legal documents"
}
```

#### 400 Bad Request

```json
{
  "error": "Validation Error",
  "details": [
    {
      "path": ["normTitle"],
      "message": "String must contain at least 1 character(s)",
      "code": "too_small"
    }
  ]
}
```

---

## Rate Limiting

### Limits by Plan

| Plan | Requests/Hour | Requests/Day | Monthly Queries |
|------|---------------|--------------|-----------------|
| Free | 100 | 500 | 100 |
| Basic | 500 | 5,000 | 1,000 |
| Professional | 2,000 | 20,000 | 10,000 |
| Enterprise | Unlimited | Unlimited | Unlimited |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705147200
```

### Rate Limit Exceeded Response

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 3600 seconds.",
  "retryAfter": 3600
}
```

---

## Best Practices

### 1. Authentication

- **Store tokens securely**: Never commit tokens to version control
- **Use environment variables**: Keep tokens in `.env` files
- **Implement token refresh**: Handle token expiration gracefully
- **Enable 2FA**: For admin accounts, always enable 2FA

### 2. Error Handling

```javascript
async function makeRequest(endpoint, options) {
  try {
    const response = await fetch(endpoint, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    // Handle specific error types
    if (error.status === 401) {
      // Redirect to login
    } else if (error.status === 429) {
      // Wait and retry
    }
    throw error;
  }
}
```

### 3. Pagination

Always use pagination for large result sets:

```javascript
async function getAllDocuments() {
  const allDocs = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const response = await fetch(
      `/legal-documents-v2?limit=${limit}&offset=${offset}`
    );
    const data = await response.json();

    allDocs.push(...data.documents);

    if (data.documents.length < limit) break;
    offset += limit;
  }

  return allDocs;
}
```

### 4. Idempotency

For create operations, implement idempotency:

```javascript
// Add unique request ID
const requestId = crypto.randomUUID();

await fetch('/legal-documents-v2', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': requestId
  },
  body: JSON.stringify(documentData)
});
```

### 5. Semantic Search Optimization

For better search results:

```javascript
// Bad: Too generic
const query = "derechos";

// Good: Specific and contextual
const query = "derechos de libertad de expresión y comunicación en la Constitución";

// Best: Include article references when known
const query = "artículo 66 constitución derechos de libertad";
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

class LegalRAGClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = 'https://api.legalrag.com/api/v1') {
    this.baseURL = baseURL;
  }

  async login(email: string, password: string) {
    const response = await axios.post(`${this.baseURL}/auth/login`, {
      email,
      password
    });

    this.token = response.data.token;
    return response.data;
  }

  async searchDocuments(query: string, options = {}) {
    const response = await axios.post(
      `${this.baseURL}/legal-documents-v2/search`,
      { query, ...options },
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );

    return response.data;
  }

  async askAI(conversationId: string, query: string, searchResults?: any[]) {
    const response = await axios.post(
      `${this.baseURL}/api/ai/query`,
      { conversationId, query, searchResults },
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );

    return response.data;
  }

  async uploadDocument(file: File, metadata: any) {
    const formData = new FormData();
    formData.append('file', file);

    Object.entries(metadata).forEach(([key, value]) => {
      formData.append(key, value as string);
    });

    const response = await axios.post(
      `${this.baseURL}/legal-documents-v2`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return response.data;
  }
}

// Usage
const client = new LegalRAGClient();

await client.login('user@example.com', 'password');

const results = await client.searchDocuments(
  'derechos fundamentales',
  { limit: 10 }
);

const aiResponse = await client.askAI(
  conversationId,
  '¿Qué dice el artículo 66?',
  results.results
);
```

### Python

```python
import requests
from typing import Optional, Dict, Any, List

class LegalRAGClient:
    def __init__(self, base_url: str = 'https://api.legalrag.com/api/v1'):
        self.base_url = base_url
        self.token: Optional[str] = None

    def login(self, email: str, password: str) -> Dict[str, Any]:
        response = requests.post(
            f'{self.base_url}/auth/login',
            json={'email': email, 'password': password}
        )
        response.raise_for_status()

        data = response.json()
        self.token = data['token']
        return data

    def _headers(self) -> Dict[str, str]:
        return {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }

    def search_documents(
        self,
        query: str,
        limit: int = 10,
        **kwargs
    ) -> Dict[str, Any]:
        response = requests.post(
            f'{self.base_url}/legal-documents-v2/search',
            json={'query': query, 'limit': limit, **kwargs},
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

    def ask_ai(
        self,
        conversation_id: str,
        query: str,
        search_results: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        payload = {
            'conversationId': conversation_id,
            'query': query
        }

        if search_results:
            payload['searchResults'] = search_results

        response = requests.post(
            f'{self.base_url}/api/ai/query',
            json=payload,
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

    def upload_document(
        self,
        file_path: str,
        metadata: Dict[str, str]
    ) -> Dict[str, Any]:
        with open(file_path, 'rb') as f:
            files = {'file': f}

            # Convert metadata keys to form field names
            data = {
                f.replace('_', '_'): v
                for f, v in metadata.items()
            }

            response = requests.post(
                f'{self.base_url}/legal-documents-v2',
                files=files,
                data=data,
                headers={'Authorization': f'Bearer {self.token}'}
            )
            response.raise_for_status()
            return response.json()

# Usage
client = LegalRAGClient()

client.login('user@example.com', 'password')

results = client.search_documents(
    'derechos fundamentales',
    limit=10
)

ai_response = client.ask_ai(
    conversation_id,
    '¿Qué dice el artículo 66?',
    results['results']
)
```

### cURL Examples

#### Complete Workflow

```bash
# 1. Register
curl -X POST https://api.legalrag.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'

# 2. Login
TOKEN=$(curl -X POST https://api.legalrag.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!"
  }' | jq -r '.token')

# 3. Search documents
curl -X POST https://api.legalrag.com/api/v1/legal-documents-v2/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "derechos fundamentales",
    "limit": 5
  }'

# 4. Create AI conversation
CONVERSATION_ID=$(curl -X POST https://api.legalrag.com/api/v1/api/ai/conversation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Consulta sobre derechos"
  }' | jq -r '.conversationId')

# 5. Ask AI
curl -X POST https://api.legalrag.com/api/v1/api/ai/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "'$CONVERSATION_ID'",
    "query": "¿Qué dice la Constitución sobre los derechos de libertad?"
  }'
```

---

## Additional Resources

- **OpenAPI Specification**: See `API_DOCUMENTATION.yaml` for complete OpenAPI 3.0 spec
- **Postman Collection**: Import the OpenAPI spec into Postman for interactive testing
- **Support**: support@legalrag.com
- **Developer Portal**: https://developers.legalrag.com (coming soon)

---

## Changelog

### Version 2.0.0 (2025-01-13)

- Complete API redesign with OpenAPI 3.0 documentation
- Added semantic search with embeddings
- Implemented AI assistant with conversational interface
- Enhanced feedback loop with A/B testing
- Added advanced search with spell-checking
- Improved authentication with 2FA support
- Added comprehensive analytics

### Version 1.0.0 (2024-11-01)

- Initial release
- Basic CRUD operations for legal documents
- Simple search functionality
- User authentication

---

**Generated on**: 2025-01-13
**Documentation Version**: 2.0.0
**API Version**: 2.0.0
