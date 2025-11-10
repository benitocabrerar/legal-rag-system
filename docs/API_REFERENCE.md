# Document Analysis System - API Reference

## Base URL
```
Production: https://api.legal-system.com
Development: http://localhost:3000
```

## Authentication

All API endpoints require Bearer token authentication:

```http
Authorization: Bearer <token>
```

---

## Legal Documents API

### POST /api/legal-documents/upload
Upload a new legal document for automatic processing.

**Authorization:** Admin only

**Request Body:**
```typescript
{
  normTitle: string;           // Required: Document title
  normType: enum;              // Required: Type of legal norm
  legalHierarchy: enum;        // Required: Hierarchical level
  content: string;             // Required: Document content
  publicationType?: enum;      // Publication type
  publicationNumber?: string;  // Official publication number
  publicationDate?: string;    // ISO 8601 date
  jurisdiction?: enum;         // Geographic jurisdiction
  specialties?: string[];      // Legal specialties
  metadata?: {
    year?: number;
    number?: string;
    tags?: string[];
    description?: string;
  }
}
```

**Enums:**
```typescript
normType:
  - CONSTITUTIONAL_NORM
  - ORGANIC_LAW
  - ORDINARY_LAW
  - ORGANIC_CODE
  - ORDINARY_CODE
  - REGULATION_GENERAL
  - REGULATION_EXECUTIVE
  - ORDINANCE_MUNICIPAL
  - ORDINANCE_METROPOLITAN
  - RESOLUTION_ADMINISTRATIVE
  - RESOLUTION_JUDICIAL
  - ADMINISTRATIVE_AGREEMENT
  - INTERNATIONAL_TREATY
  - JUDICIAL_PRECEDENT

legalHierarchy:
  - CONSTITUCION
  - TRATADOS_INTERNACIONALES_DDHH
  - LEYES_ORGANICAS
  - LEYES_ORDINARIAS
  - CODIGOS_ORGANICOS
  - CODIGOS_ORDINARIOS
  - REGLAMENTOS
  - ORDENANZAS
  - RESOLUCIONES
  - ACUERDOS_ADMINISTRATIVOS

publicationType:
  - ORDINARIO
  - SUPLEMENTO
  - SEGUNDO_SUPLEMENTO
  - SUPLEMENTO_ESPECIAL
  - EDICION_CONSTITUCIONAL

jurisdiction:
  - NACIONAL
  - PROVINCIAL
  - MUNICIPAL
  - INTERNACIONAL
```

**Response:**
```json
{
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "normTitle": "Constitución de la República",
    "normType": "CONSTITUTIONAL_NORM",
    "legalHierarchy": "CONSTITUCION",
    "createdAt": "2024-11-10T10:00:00Z",
    "processingStatus": "queued"
  },
  "jobId": "job-123",
  "message": "Document uploaded successfully and queued for processing"
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid input
- `403`: Insufficient permissions
- `500`: Server error

---

### GET /api/legal-documents/:id/processing-status
Get the processing status of a legal document.

**Parameters:**
- `id` (path): Document UUID

**Response:**
```json
{
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 45,
  "results": {
    "articlesExtracted": 150,
    "summariesGenerated": 10,
    "embeddingsCreated": 300
  },
  "error": null
}
```

**Status Values:**
- `queued`: Waiting in queue
- `processing`: Currently being processed
- `completed`: Successfully processed
- `failed`: Processing failed

---

### GET /api/legal-documents/hierarchy
Retrieve the complete document hierarchy.

**Query Parameters:**
- `depth` (optional): Maximum depth to retrieve
- `category` (optional): Filter by category

**Response:**
```json
{
  "id": "root",
  "name": "Document Registry",
  "type": "root",
  "documentCount": 1250,
  "children": [
    {
      "id": "constitutional",
      "name": "Constitutional Documents",
      "type": "category",
      "documentCount": 15,
      "children": [
        {
          "id": "doc-123",
          "name": "Constitución 2008",
          "type": "document",
          "metadata": {
            "normType": "CONSTITUTIONAL_NORM",
            "year": 2008,
            "articles": 444
          },
          "children": [...]
        }
      ]
    }
  ]
}
```

---

### GET /api/legal-documents/search
Search legal documents with full-text search.

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Maximum results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `type` (optional): Filter by document type
- `hierarchy` (optional): Filter by hierarchical level

**Response:**
```json
{
  "results": [
    {
      "id": "doc-123",
      "title": "Constitución de la República",
      "type": "LegalDocument",
      "score": 0.95,
      "highlights": [
        "Los <mark>derechos fundamentales</mark> están garantizados..."
      ],
      "metadata": {
        "normType": "CONSTITUTIONAL_NORM",
        "year": 2008,
        "articleCount": 444
      }
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

---

### GET /api/legal-documents/statistics
Get registry statistics and metrics.

**Response:**
```json
{
  "totalDocuments": 1250,
  "byType": {
    "CONSTITUTIONAL_NORM": 15,
    "ORGANIC_LAW": 125,
    "ORDINARY_LAW": 450
  },
  "byHierarchy": {
    "CONSTITUCION": 15,
    "LEYES_ORGANICAS": 125
  },
  "recentUploads": 25,
  "processingStats": {
    "avgProcessingTime": 45000,
    "successRate": 0.98
  },
  "lastUpdated": "2024-11-10T10:00:00Z"
}
```

---

### POST /api/legal-documents/:id/reprocess
Reprocess a legal document (Admin only).

**Parameters:**
- `id` (path): Document UUID

**Response:**
```json
{
  "jobId": "job-456",
  "message": "Document queued for reprocessing"
}
```

---

## User Documents API

### POST /api/documents/upload
Upload a file document for a case.

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file` (required): Binary file data
- `caseId` (required): Associated case UUID
- `title` (required): Document title
- `description` (optional): Document description
- `metadata` (optional): JSON metadata

**Supported File Types:**
- PDF (.pdf)
- Word (.docx, .doc)
- Text (.txt)
- RTF (.rtf)

**Max File Size:** 50MB

**Response:**
```json
{
  "document": {
    "id": "doc-789",
    "caseId": "case-456",
    "title": "Contract Agreement",
    "fileUrl": "https://storage.example.com/doc-789.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "processingStatus": "queued"
  },
  "jobId": "job-789",
  "message": "Document uploaded and queued for processing"
}
```

---

### POST /api/documents/upload-text
Upload a text document directly.

**Request Body:**
```json
{
  "caseId": "case-456",
  "title": "Legal Brief",
  "content": "Document content here...",
  "metadata": {
    "type": "brief",
    "tags": ["litigation", "contract"],
    "author": "John Doe"
  }
}
```

**Response:**
```json
{
  "document": {
    "id": "doc-890",
    "caseId": "case-456",
    "title": "Legal Brief",
    "processingStatus": "queued"
  },
  "jobId": "job-890",
  "message": "Document created and queued for processing"
}
```

---

### GET /api/documents/case/:caseId
Get all documents for a case.

**Parameters:**
- `caseId` (path): Case UUID

**Query Parameters:**
- `limit` (optional): Maximum results (default: 50)
- `offset` (optional): Pagination offset
- `sort` (optional): Sort field (createdAt, title)
- `order` (optional): Sort order (asc, desc)

**Response:**
```json
{
  "documents": [
    {
      "id": "doc-123",
      "title": "Initial Complaint",
      "createdAt": "2024-11-01T10:00:00Z",
      "fileSize": 512000,
      "status": "processed",
      "analysisResults": {
        "summaryAvailable": true,
        "embeddingsCount": 45
      }
    }
  ],
  "total": 25,
  "limit": 50,
  "offset": 0
}
```

---

### GET /api/documents/:id
Get a specific document.

**Parameters:**
- `id` (path): Document UUID

**Response:**
```json
{
  "id": "doc-123",
  "caseId": "case-456",
  "userId": "user-789",
  "title": "Contract Agreement",
  "content": "...",
  "fileUrl": "https://storage.example.com/doc-123.pdf",
  "metadata": {
    "type": "contract",
    "tags": ["agreement", "services"]
  },
  "analysisResults": {
    "summary": "This contract establishes...",
    "keyEntities": ["Party A", "Party B"],
    "importantDates": ["2024-01-01", "2024-12-31"]
  },
  "createdAt": "2024-11-01T10:00:00Z",
  "updatedAt": "2024-11-01T11:00:00Z"
}
```

---

### DELETE /api/documents/:id
Delete a document.

**Parameters:**
- `id` (path): Document UUID

**Response:**
```json
{
  "message": "Document deleted successfully",
  "deletedAt": "2024-11-10T10:00:00Z"
}
```

---

### GET /api/documents/search
Search user documents.

**Query Parameters:**
- `q` (required): Search query
- `caseId` (optional): Filter by case
- `limit` (optional): Maximum results
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "results": [
    {
      "id": "doc-123",
      "title": "Contract Agreement",
      "caseId": "case-456",
      "score": 0.85,
      "highlights": [
        "The <mark>agreement</mark> establishes..."
      ]
    }
  ],
  "total": 15
}
```

---

## Notifications API

### POST /api/legal-documents/notifications/subscribe
Subscribe to document notifications.

**Request Body:**
```json
{
  "subscriptionType": "document_upload",
  "channel": "email",
  "filters": {
    "documentTypes": ["CONSTITUTIONAL_NORM", "ORGANIC_LAW"],
    "categories": ["constitutional"],
    "keywords": ["rights", "privacy"]
  },
  "webhookUrl": "https://example.com/webhook"
}
```

**Subscription Types:**
- `document_upload`: New document uploaded
- `analysis_complete`: Analysis finished
- `hierarchy_update`: Registry updated

**Channels:**
- `email`: Email notifications
- `in-app`: In-app notifications
- `webhook`: HTTP webhook
- `sms`: SMS messages

**Response:**
```json
{
  "subscription": {
    "id": "sub-123",
    "userId": "user-456",
    "subscriptionType": "document_upload",
    "channel": "EMAIL",
    "isActive": true
  },
  "message": "Successfully subscribed to notifications"
}
```

---

### GET /api/notifications/subscriptions
Get user's notification subscriptions.

**Response:**
```json
{
  "subscriptions": [
    {
      "id": "sub-123",
      "subscriptionType": "document_upload",
      "channel": "EMAIL",
      "filters": {
        "documentTypes": ["CONSTITUTIONAL_NORM"]
      },
      "isActive": true,
      "createdAt": "2024-11-01T10:00:00Z"
    }
  ],
  "total": 3
}
```

---

### PUT /api/notifications/subscriptions/:id
Update a subscription.

**Parameters:**
- `id` (path): Subscription UUID

**Request Body:**
```json
{
  "isActive": false,
  "filters": {
    "documentTypes": ["ORGANIC_LAW"]
  }
}
```

---

### DELETE /api/notifications/subscriptions/:id
Delete a subscription.

**Parameters:**
- `id` (path): Subscription UUID

---

## Admin API

### GET /api/admin/processing-queue/stats
Get processing queue statistics (Admin only).

**Response:**
```json
{
  "waiting": 5,
  "active": 2,
  "completed": 1250,
  "failed": 3,
  "delayed": 0,
  "paused": 0,
  "avgProcessingTime": 45000,
  "throughput": {
    "perMinute": 2.5,
    "perHour": 150,
    "perDay": 3600
  },
  "jobTypes": {
    "ANALYZE_DOCUMENT": 3,
    "GENERATE_EMBEDDINGS": 2,
    "EXTRACT_STRUCTURE": 2
  }
}
```

---

### GET /api/admin/processing-queue/jobs
Get queue jobs (Admin only).

**Query Parameters:**
- `status` (optional): Filter by status
- `limit` (optional): Maximum results
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "jobs": [
    {
      "id": "job-123",
      "type": "ANALYZE_DOCUMENT",
      "documentId": "doc-456",
      "status": "processing",
      "progress": 60,
      "attempts": 1,
      "createdAt": "2024-11-10T10:00:00Z",
      "startedAt": "2024-11-10T10:01:00Z"
    }
  ],
  "total": 7
}
```

---

### POST /api/admin/processing-queue/retry/:jobId
Retry a failed job (Admin only).

**Parameters:**
- `jobId` (path): Job identifier

**Response:**
```json
{
  "jobId": "job-123",
  "status": "queued",
  "message": "Job queued for retry"
}
```

---

### DELETE /api/admin/processing-queue/job/:jobId
Remove a job from queue (Admin only).

**Parameters:**
- `jobId` (path): Job identifier

---

## Webhooks

### Document Upload Webhook
Sent when a new document is uploaded.

**Payload:**
```json
{
  "event": "document.uploaded",
  "timestamp": "2024-11-10T10:00:00Z",
  "data": {
    "documentId": "doc-123",
    "documentType": "LegalDocument",
    "title": "New Law",
    "userId": "user-456",
    "metadata": {
      "normType": "ORDINARY_LAW"
    }
  }
}
```

### Analysis Complete Webhook
Sent when document analysis is complete.

**Payload:**
```json
{
  "event": "analysis.completed",
  "timestamp": "2024-11-10T10:05:00Z",
  "data": {
    "documentId": "doc-123",
    "jobId": "job-456",
    "results": {
      "articlesExtracted": 250,
      "summariesGenerated": 15,
      "embeddingsCreated": 500,
      "processingTimeMs": 45000
    }
  }
}
```

### Analysis Failed Webhook
Sent when document analysis fails.

**Payload:**
```json
{
  "event": "analysis.failed",
  "timestamp": "2024-11-10T10:05:00Z",
  "data": {
    "documentId": "doc-123",
    "jobId": "job-456",
    "error": "OpenAI API rate limit exceeded",
    "attempts": 3
  }
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "E001",
    "message": "Document not found",
    "details": {
      "documentId": "doc-123"
    }
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| E001 | Document not found | 404 |
| E002 | Processing timeout | 408 |
| E003 | OpenAI API error | 502 |
| E004 | Redis connection failed | 503 |
| E005 | Insufficient permissions | 403 |
| E006 | Invalid document format | 400 |
| E007 | Queue overflow | 503 |
| E008 | Notification delivery failed | 502 |
| E009 | Invalid request body | 400 |
| E010 | Rate limit exceeded | 429 |

---

## Rate Limiting

API endpoints are rate limited:

- **Standard endpoints**: 100 requests per minute
- **Search endpoints**: 30 requests per minute
- **Upload endpoints**: 10 requests per minute
- **Admin endpoints**: No limit

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699612800
```

---

## Pagination

Paginated endpoints support:

```
?limit=20&offset=0
```

Response includes:
```json
{
  "data": [...],
  "total": 150,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}
```

---

## Versioning

API version is specified in the URL:
```
https://api.legal-system.com/v1/
```

Current version: v1
Deprecated versions: None

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { LegalSystemAPI } from '@legal-system/sdk';

const api = new LegalSystemAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://api.legal-system.com'
});

// Upload legal document
const document = await api.legalDocuments.upload({
  normTitle: 'New Law',
  normType: 'ORDINARY_LAW',
  legalHierarchy: 'LEYES_ORDINARIAS',
  content: '...'
});

// Check processing status
const status = await api.legalDocuments.getProcessingStatus(document.id);

// Search documents
const results = await api.legalDocuments.search({
  query: 'constitutional rights',
  limit: 20
});
```

### Python

```python
from legal_system import LegalSystemAPI

api = LegalSystemAPI(
    api_key='your-api-key',
    base_url='https://api.legal-system.com'
)

# Upload document
document = api.legal_documents.upload(
    norm_title='New Law',
    norm_type='ORDINARY_LAW',
    legal_hierarchy='LEYES_ORDINARIAS',
    content='...'
)

# Get hierarchy
hierarchy = api.legal_documents.get_hierarchy()

# Subscribe to notifications
subscription = api.notifications.subscribe(
    subscription_type='document_upload',
    channel='email',
    filters={'document_types': ['CONSTITUTIONAL_NORM']}
)
```

### cURL

```bash
# Upload legal document
curl -X POST https://api.legal-system.com/api/legal-documents/upload \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "normTitle": "New Law",
    "normType": "ORDINARY_LAW",
    "legalHierarchy": "LEYES_ORDINARIAS",
    "content": "..."
  }'

# Get processing status
curl -X GET https://api.legal-system.com/api/legal-documents/doc-123/processing-status \
  -H "Authorization: Bearer your-token"

# Search documents
curl -X GET "https://api.legal-system.com/api/legal-documents/search?q=rights" \
  -H "Authorization: Bearer your-token"
```

---

*API Version: 1.0.0 | Last Updated: November 10, 2024*