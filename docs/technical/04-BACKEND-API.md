# Backend API Documentation - Legal RAG System

## Technology Stack

### Core Framework
- **Fastify 4.26.0** - High-performance web framework
- **TypeScript 5.3.3** - Type-safe development
- **tsx 4.7.1** - TypeScript execution runtime
- **Node.js** - JavaScript runtime

### Plugins & Middleware
- **@fastify/cors 9.0.1** - Cross-origin resource sharing
- **@fastify/jwt 8.0.0** - JSON Web Token authentication
- **@fastify/multipart 8.1.0** - File upload handling
- **@fastify/rate-limit 9.1.0** - Request rate limiting

### Data & Storage
- **@prisma/client 5.10.0** - ORM for database operations
- **Prisma 5.10.0** - Database toolkit
- **pg 8.16.3** - PostgreSQL client
- **Redis 4.6.13** - In-memory caching

### AI & ML
- **OpenAI 4.28.0** - GPT-4 and embeddings
- **LangChain 0.1.25** - AI application framework
- **@langchain/openai 0.0.19** - OpenAI integration
- **@langchain/anthropic 0.1.3** - Anthropic integration

### Utilities
- **bcrypt 5.1.1** - Password hashing
- **zod 3.22.4** - Schema validation
- **dotenv 16.4.5** - Environment configuration

## Server Architecture

### Server Configuration (`src/server.ts`)

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';

const app = Fastify({ logger: true });

// Plugin Registration
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'supersecret',
});

await app.register(multipart);

await app.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
});

// Start server on port 8000
const port = parseInt(process.env.PORT || '8000');
await app.listen({ port, host: '0.0.0.0' });
```

### Middleware Chain

```
Incoming Request
    │
    ▼
CORS Middleware (Allow frontend origin)
    │
    ▼
Rate Limit Middleware (100 req/15 min)
    │
    ▼
Multipart Parser (File uploads)
    │
    ▼
JWT Verification (Protected routes only)
    │
    ▼
Route Handler
    │
    ▼
Response
```

## API Endpoints

### Authentication Routes (`/auth/*`)

#### POST `/api/v1/auth/register`
**Description**: Register a new user account

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
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
    "planTier": "free"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Validation**:
- Email: Valid email format, unique
- Password: Minimum 8 characters
- Name: Optional string

**Security**:
- Password hashed with bcrypt (10 salt rounds)
- JWT token generated with 7-day expiration

#### POST `/api/v1/auth/login`
**Description**: Authenticate existing user

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
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
    "planTier": "free"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- 400: Invalid credentials
- 404: User not found

#### GET `/api/v1/auth/me`
**Description**: Get current authenticated user

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "planTier": "free",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

---

### Case Routes (`/cases/*`)

#### GET `/api/v1/cases`
**Description**: List all cases for authenticated user

**Headers**: Authorization required

**Query Parameters**:
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `status` (optional): Filter by status (active, pending, closed)

**Response** (200):
```json
{
  "cases": [
    {
      "id": "uuid",
      "title": "Contract Dispute - ABC Corp",
      "description": "Client needs help with contract interpretation",
      "clientName": "ABC Corporation",
      "caseNumber": "2025-001",
      "status": "active",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-08T00:00:00.000Z",
      "_count": {
        "documents": 5
      }
    }
  ],
  "total": 10
}
```

#### POST `/api/v1/cases`
**Description**: Create a new case

**Headers**: Authorization required

**Request Body**:
```json
{
  "title": "Employment Contract Review",
  "description": "Review employee contract for compliance",
  "clientName": "Tech Startup Inc",
  "caseNumber": "2025-042"
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "title": "Employment Contract Review",
  "description": "Review employee contract for compliance",
  "clientName": "Tech Startup Inc",
  "caseNumber": "2025-042",
  "status": "active",
  "createdAt": "2025-01-08T00:00:00.000Z",
  "updatedAt": "2025-01-08T00:00:00.000Z"
}
```

**Validation**:
- `title`: Required, min 3 characters
- `description`: Optional
- `clientName`: Optional
- `caseNumber`: Optional, unique per user
- `status`: Default "active"

#### GET `/api/v1/cases/:id`
**Description**: Get specific case with documents

**Headers**: Authorization required

**Response** (200):
```json
{
  "id": "uuid",
  "title": "Contract Dispute - ABC Corp",
  "description": "...",
  "clientName": "ABC Corporation",
  "caseNumber": "2025-001",
  "status": "active",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-08T00:00:00.000Z",
  "documents": [
    {
      "id": "doc-uuid",
      "title": "Original Contract",
      "createdAt": "2025-01-02T00:00:00.000Z"
    }
  ]
}
```

**Error Responses**:
- 404: Case not found or doesn't belong to user

#### PATCH `/api/v1/cases/:id`
**Description**: Update case information

**Headers**: Authorization required

**Request Body** (all fields optional):
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "status": "closed"
}
```

**Response** (200): Updated case object

#### DELETE `/api/v1/cases/:id`
**Description**: Delete case and all associated documents

**Headers**: Authorization required

**Response** (200):
```json
{
  "message": "Case deleted successfully"
}
```

**Note**: Cascade delete removes all documents and chunks

---

### Document Routes (`/documents/*`)

#### POST `/api/v1/documents/upload`
**Description**: Upload document and generate embeddings

**Headers**:
- Authorization required
- Content-Type: multipart/form-data

**Form Data**:
- `file`: Document file (PDF, DOCX, TXT)
- `caseId`: UUID of associated case
- `title` (optional): Document title

**Processing Steps**:
1. Validate file type and size
2. Extract text content
3. Chunk text (1000 characters per chunk)
4. Generate embeddings for each chunk (OpenAI)
5. Save to database

**Response** (201):
```json
{
  "id": "doc-uuid",
  "caseId": "case-uuid",
  "userId": "user-uuid",
  "title": "Contract Agreement",
  "content": "Full text content...",
  "chunks": [
    {
      "id": "chunk-uuid",
      "chunkIndex": 0,
      "content": "First 1000 characters...",
      "embedding": [0.123, -0.456, ...]
    }
  ],
  "createdAt": "2025-01-08T00:00:00.000Z"
}
```

**Error Responses**:
- 400: Invalid file type or missing caseId
- 404: Case not found
- 413: File too large (> 10MB)

#### GET `/api/v1/documents/case/:caseId`
**Description**: List all documents for a case

**Headers**: Authorization required

**Response** (200):
```json
{
  "documents": [
    {
      "id": "doc-uuid",
      "title": "Contract Agreement",
      "createdAt": "2025-01-08T00:00:00.000Z",
      "updatedAt": "2025-01-08T00:00:00.000Z",
      "_count": {
        "chunks": 5
      }
    }
  ]
}
```

#### GET `/api/v1/documents/:id`
**Description**: Get specific document with chunks

**Headers**: Authorization required

**Response** (200):
```json
{
  "id": "doc-uuid",
  "caseId": "case-uuid",
  "title": "Contract Agreement",
  "content": "Full document text...",
  "createdAt": "2025-01-08T00:00:00.000Z",
  "chunks": [
    {
      "id": "chunk-uuid",
      "chunkIndex": 0,
      "content": "Chunk text...",
      "embedding": [...]
    }
  ]
}
```

#### DELETE `/api/v1/documents/:id`
**Description**: Delete document and all chunks

**Headers**: Authorization required

**Response** (200):
```json
{
  "message": "Document deleted successfully"
}
```

---

### Query Routes (`/query`)

#### POST `/api/v1/query`
**Description**: RAG query - Ask questions about case documents

**Headers**: Authorization required

**Request Body**:
```json
{
  "caseId": "case-uuid",
  "query": "What are the payment terms in the contract?",
  "maxResults": 5
}
```

**Processing Steps**:
1. Verify case ownership
2. Generate query embedding (OpenAI)
3. Search for similar chunks (cosine similarity)
4. Select top 5 most relevant chunks
5. Build context from chunks
6. Generate answer with GPT-4
7. Return answer with sources

**Response** (200):
```json
{
  "answer": "Based on the contract documents, the payment terms are net 30 days from invoice date. The contract specifies that payments must be made via wire transfer to the account specified in Section 5.2. Late payments incur a 1.5% monthly interest charge.",
  "sources": [
    {
      "documentId": "doc-uuid",
      "documentTitle": "Service Agreement",
      "chunkIndex": 3,
      "similarity": 0.87,
      "content": "Payment Terms: All invoices are due within 30 days..."
    }
  ],
  "query": "What are the payment terms in the contract?",
  "caseId": "case-uuid"
}
```

**Validation**:
- `caseId`: Required, valid UUID
- `query`: Required, min 1 character
- `maxResults`: Optional, 1-20 (default 5)

**Error Responses**:
- 404: Case not found
- 400: Invalid query or parameters

#### GET `/api/v1/query/history/:caseId`
**Description**: Get query history for a case

**Headers**: Authorization required

**Response** (200):
```json
{
  "queries": []
}
```

**Note**: Currently returns empty array (Query model not implemented)

---

### Legal Document Routes (`/legal-documents/*`)

#### GET `/api/v1/legal-documents`
**Description**: List all global legal documents

**Headers**: Authorization required

**Query Parameters**:
- `category` (optional): Filter by category
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

**Response** (200):
```json
{
  "documents": [
    {
      "id": "legal-doc-uuid",
      "title": "Civil Code - Title V",
      "category": "code",
      "metadata": {
        "year": "2024",
        "jurisdiction": "Federal"
      },
      "createdAt": "2025-01-01T00:00:00.000Z",
      "uploader": {
        "name": "Admin User",
        "email": "admin@example.com"
      }
    }
  ]
}
```

**Categories**:
- `constitution`
- `law`
- `code`
- `regulation`
- `jurisprudence`

#### POST `/api/v1/legal-documents/upload`
**Description**: Upload global legal document (admin only)

**Headers**:
- Authorization required
- Content-Type: multipart/form-data

**Authorization**: Requires `role: "admin"`

**Form Data**:
- `file`: Document file
- `title`: Document title
- `category`: Category (see above)
- `metadata` (optional): JSON metadata

**Response** (201):
```json
{
  "id": "legal-doc-uuid",
  "title": "Civil Code - Title V",
  "category": "code",
  "content": "Full text...",
  "metadata": {},
  "uploadedBy": "admin-user-uuid",
  "createdAt": "2025-01-08T00:00:00.000Z",
  "chunks": [...]
}
```

**Error Responses**:
- 403: Forbidden (not admin)
- 400: Invalid category or missing fields

#### DELETE `/api/v1/legal-documents/:id`
**Description**: Delete legal document (admin only)

**Headers**: Authorization required

**Authorization**: Requires `role: "admin"`

**Response** (200):
```json
{
  "message": "Legal document deleted successfully"
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Error message",
  "statusCode": 400,
  "details": {
    "field": "email",
    "message": "Email already exists"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Invalid/missing JWT token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 413 | Payload Too Large | File too large |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## Authentication & Authorization

### JWT Token Structure

```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "iat": 1704672000,
  "exp": 1705276800
}
```

### Authentication Flow

```typescript
// Fastify decorator
app.decorate('authenticate', async function(request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// Usage in routes
app.get('/protected', {
  onRequest: [app.authenticate]
}, async (request, reply) => {
  const userId = request.user.id;
  // Handle request
});
```

### Admin Authorization

```typescript
function requireAdmin(request, reply, done) {
  const user = request.user;
  if (user.role !== 'admin') {
    reply.code(403).send({ error: 'Admin access required' });
  }
  done();
}

app.post('/admin-only', {
  onRequest: [app.authenticate, requireAdmin]
}, handler);
```

## Rate Limiting

### Configuration
- **Limit**: 100 requests per 15 minutes
- **Scope**: Per IP address
- **Storage**: In-memory (Redis optional)
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### Rate Limit Response (429)

```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded, retry in 900 seconds"
}
```

## Logging

### Logger Configuration

```typescript
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          headers: request.headers,
          remoteAddress: request.ip,
        };
      },
    },
  },
});
```

### Log Levels
- **fatal**: Application crash
- **error**: Error responses
- **warn**: Warnings
- **info**: Request/response
- **debug**: Detailed debugging
- **trace**: Very detailed

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Classification**: Technical Documentation
