# Week 2: Query Transformation - API Reference

**Phase 10 - Week 2: Natural Language Processing API**
**Version:** 1.0.0
**Last Updated:** January 13, 2025
**Base URL:** `http://localhost:3000/api`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Patterns](#common-patterns)
4. [Endpoints](#endpoints)
   - [POST /nlp/transform](#post-nlptransform)
   - [POST /nlp/search](#post-nlpsearch)
   - [GET /nlp/entities/search](#get-nlpentitiessearch)
   - [GET /nlp/entities/:id](#get-nlpentitiesid)
   - [POST /nlp/validate](#post-nlpvalidate)
   - [GET /nlp/health](#get-nlphealth)
5. [Type Definitions](#type-definitions)
6. [Error Codes](#error-codes)
7. [Rate Limiting](#rate-limiting)
8. [Code Examples](#code-examples)

---

## Overview

The NLP API provides natural language query transformation capabilities for the Legal RAG System. It enables users to search legal documents using natural Spanish language queries that are automatically converted into structured search filters.

### Key Features

- **Natural Language Processing**: Transforms Spanish queries into structured filters
- **Entity Extraction**: Identifies legal entities (laws, codes, institutions)
- **Intent Classification**: Determines user's search intent
- **Integrated Search**: Combines transformation with Phase 9 Advanced Search
- **Validation**: Ensures filter quality and logical consistency
- **Caching**: Redis-based caching for improved performance

### API Versions

- **Current Version**: 1.0.0
- **Stability**: Production-ready
- **Breaking Changes**: None expected until v2.0.0

---

## Authentication

### Current Implementation

The API currently does not require authentication for development. User IDs can be optionally provided for personalization and analytics.

```http
POST /api/nlp/search
Content-Type: application/json

{
  "query": "leyes laborales",
  "userId": "user_123"  // Optional
}
```

### Future Authentication (Planned)

Version 2.0 will introduce JWT-based authentication:

```http
POST /api/nlp/search
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
```

---

## Common Patterns

### Request Headers

```http
Content-Type: application/json
Accept: application/json
User-Agent: YourApp/1.0
```

### Response Format

All successful responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-13T10:30:00.000Z",
    "processingTimeMs": 432,
    "version": "1.0.0"
  }
}
```

### Error Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "TRANSFORMATION_ERROR",
    "message": "Failed to transform query",
    "details": "Query is too short",
    "timestamp": "2025-01-13T10:30:00.000Z"
  }
}
```

### Pagination

For paginated endpoints:

```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## Endpoints

### POST /nlp/transform

Transform a natural language query into structured search filters.

#### Request

**HTTP Method:** `POST`
**URL:** `/api/nlp/transform`
**Content-Type:** `application/json`

**Request Body:**

```typescript
{
  query: string;              // Natural language query (required)
  options?: {
    enableCaching?: boolean;  // Use Redis cache (default: true)
    minConfidenceThreshold?: number;  // Min confidence 0.0-1.0 (default: 0.5)
    includeMetadata?: boolean; // Include processing metadata (default: false)
  };
}
```

**Example Request:**

```json
{
  "query": "leyes laborales vigentes del último año sobre contratos de trabajo",
  "options": {
    "enableCaching": true,
    "minConfidenceThreshold": 0.6,
    "includeMetadata": true
  }
}
```

#### Response

**Status Code:** `200 OK`

**Response Body:**

```typescript
{
  success: true;
  data: {
    filters: SearchFilters;           // Structured search filters
    entities: Entity[];               // Extracted legal entities
    intent: Intent;                   // Classified query intent
    confidence: number;               // 0.0-1.0 confidence score
    processingTimeMs: number;         // Processing duration
    validation: ValidationResult;     // Filter validation results
    refinementSuggestions: string[];  // User guidance suggestions
    usedCache: boolean;               // Cache hit indicator
  };
  meta: {
    timestamp: string;
    processingTimeMs: number;
    version: string;
  };
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "filters": {
      "normType": ["ley"],
      "topics": ["laboral", "contratos", "trabajo"],
      "documentState": "vigente",
      "dateRange": {
        "from": "2024-01-01T00:00:00.000Z",
        "to": "2025-01-13T23:59:59.999Z",
        "dateType": "publication"
      },
      "keywords": ["leyes laborales", "contratos de trabajo"],
      "legalHierarchy": ["legal"]
    },
    "entities": [
      {
        "type": "ORDINARY_LAW",
        "text": "leyes laborales",
        "normalizedText": "LEYES LABORALES",
        "confidence": 0.92,
        "startIndex": 0,
        "endIndex": 15
      },
      {
        "type": "LEGAL_TOPIC",
        "text": "contratos de trabajo",
        "normalizedText": "CONTRATOS DE TRABAJO",
        "confidence": 0.88,
        "startIndex": 45,
        "endIndex": 65
      }
    ],
    "intent": {
      "primaryIntent": "FIND_DOCUMENT",
      "confidence": 0.89,
      "secondaryIntents": ["CHECK_VALIDITY"],
      "requiresSpecificDocument": false,
      "requiresComparison": false,
      "requiresValidityCheck": true,
      "requiresPrecedent": false
    },
    "confidence": 0.87,
    "processingTimeMs": 432,
    "validation": {
      "isValid": true,
      "errors": [],
      "warnings": [],
      "score": 0.95
    },
    "refinementSuggestions": [
      "Considera especificar el tipo de contrato (indefinido, temporal, por obra)"
    ],
    "usedCache": false
  },
  "meta": {
    "timestamp": "2025-01-13T10:30:00.000Z",
    "processingTimeMs": 432,
    "version": "1.0.0"
  }
}
```

#### Error Responses

**400 Bad Request - Empty Query:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUERY",
    "message": "Query cannot be empty",
    "timestamp": "2025-01-13T10:30:00.000Z"
  }
}
```

**500 Internal Server Error - Transformation Failed:**

```json
{
  "success": false,
  "error": {
    "code": "TRANSFORMATION_ERROR",
    "message": "Failed to transform query",
    "details": "OpenAI API timeout",
    "timestamp": "2025-01-13T10:30:00.000Z"
  }
}
```

#### Code Examples

**cURL:**

```bash
curl -X POST http://localhost:3000/api/nlp/transform \
  -H "Content-Type: application/json" \
  -d '{
    "query": "leyes laborales vigentes del último año",
    "options": {
      "enableCaching": true,
      "minConfidenceThreshold": 0.6
    }
  }'
```

**JavaScript (Fetch):**

```javascript
const response = await fetch('http://localhost:3000/api/nlp/transform', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'leyes laborales vigentes del último año',
    options: {
      enableCaching: true,
      minConfidenceThreshold: 0.6
    }
  })
});

const result = await response.json();

if (result.success) {
  console.log('Filters:', result.data.filters);
  console.log('Confidence:', result.data.confidence);
} else {
  console.error('Error:', result.error.message);
}
```

**Python (requests):**

```python
import requests

url = 'http://localhost:3000/api/nlp/transform'
payload = {
    'query': 'leyes laborales vigentes del último año',
    'options': {
        'enableCaching': True,
        'minConfidenceThreshold': 0.6
    }
}

response = requests.post(url, json=payload)
result = response.json()

if result['success']:
    print(f"Confidence: {result['data']['confidence']}")
    print(f"Filters: {result['data']['filters']}")
else:
    print(f"Error: {result['error']['message']}")
```

**TypeScript (axios):**

```typescript
import axios from 'axios';

interface TransformResponse {
  success: boolean;
  data: {
    filters: SearchFilters;
    entities: Entity[];
    confidence: number;
    // ... other fields
  };
}

const response = await axios.post<TransformResponse>(
  'http://localhost:3000/api/nlp/transform',
  {
    query: 'leyes laborales vigentes del último año',
    options: {
      enableCaching: true,
      minConfidenceThreshold: 0.6
    }
  }
);

if (response.data.success) {
  const { filters, confidence } = response.data.data;
  console.log(`Confidence: ${confidence}`);
  console.log('Filters:', filters);
}
```

---

### POST /nlp/search

Perform integrated NLP transformation + search in a single request.

#### Request

**HTTP Method:** `POST`
**URL:** `/api/nlp/search`
**Content-Type:** `application/json`

**Request Body:**

```typescript
{
  query: string;              // Natural language query (required)
  userId?: string;            // User ID for personalization
  limit?: number;             // Results per page (default: 20, max: 100)
  offset?: number;            // Pagination offset (default: 0)
  sortBy?: 'relevance' | 'date' | 'popularity' | 'authority';  // default: 'relevance'
  enableSpellCheck?: boolean; // Spell correction (default: true)
  enableQueryExpansion?: boolean;  // Synonym expansion (default: true)
  enableReranking?: boolean;  // ML re-ranking (default: true)
}
```

**Example Request:**

```json
{
  "query": "decretos presidenciales sobre educación del 2023",
  "userId": "user_123",
  "limit": 20,
  "sortBy": "relevance",
  "enableSpellCheck": true,
  "enableQueryExpansion": true,
  "enableReranking": true
}
```

#### Response

**Status Code:** `200 OK`

**Response Body:**

```typescript
{
  success: true;
  data: {
    transformation: TransformationResult;  // Query transformation details
    searchResults: {
      documents: Document[];               // Search results
      totalCount: number;                  // Total matching documents
      query: {
        original: string;
        corrected?: string;
        expanded?: string[];
        suggestions?: string;
      };
      pagination: {
        limit: number;
        offset: number;
        hasMore: boolean;
      };
      processingTimeMs: number;
    };
    combinedProcessingTimeMs: number;      // End-to-end time
    recommendations?: string[];            // User guidance
  };
  meta: {
    timestamp: string;
    version: string;
  };
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "transformation": {
      "filters": {
        "normType": ["decreto"],
        "topics": ["educacion"],
        "jurisdiction": ["nacional"],
        "issuingEntities": ["Presidencia"],
        "dateRange": {
          "from": "2023-01-01T00:00:00.000Z",
          "to": "2023-12-31T23:59:59.999Z",
          "dateType": "publication"
        }
      },
      "entities": [
        {
          "type": "DECREE",
          "text": "decretos presidenciales",
          "normalizedText": "DECRETOS PRESIDENCIALES",
          "confidence": 0.95
        },
        {
          "type": "LEGAL_TOPIC",
          "text": "educación",
          "normalizedText": "EDUCACIÓN",
          "confidence": 0.91
        }
      ],
      "intent": {
        "primaryIntent": "FIND_DOCUMENT",
        "confidence": 0.92
      },
      "confidence": 0.89,
      "processingTimeMs": 387
    },
    "searchResults": {
      "documents": [
        {
          "id": "doc_123",
          "title": "Decreto Ejecutivo 123 - Reforma Educativa",
          "summary": "Establece medidas para mejorar la calidad educativa...",
          "normType": "decreto",
          "publicationDate": "2023-03-15T00:00:00.000Z",
          "relevanceScore": 0.94,
          "highlights": ["educación", "reforma", "calidad educativa"]
        },
        {
          "id": "doc_456",
          "title": "Decreto Presidencial 456 - Sistema Educativo Nacional",
          "summary": "Regula el sistema educativo nacional...",
          "normType": "decreto",
          "publicationDate": "2023-06-20T00:00:00.000Z",
          "relevanceScore": 0.88,
          "highlights": ["sistema educativo", "nacional"]
        }
      ],
      "totalCount": 42,
      "query": {
        "original": "decretos presidenciales sobre educación del 2023",
        "corrected": null,
        "expanded": ["educativo", "enseñanza", "académico"],
        "suggestions": null
      },
      "pagination": {
        "limit": 20,
        "offset": 0,
        "hasMore": true
      },
      "processingTimeMs": 156
    },
    "combinedProcessingTimeMs": 543,
    "recommendations": [
      "Términos relacionados incluidos: educativo, enseñanza, académico"
    ]
  },
  "meta": {
    "timestamp": "2025-01-13T10:30:00.000Z",
    "version": "1.0.0"
  }
}
```

#### Error Responses

**400 Bad Request - Query Too Short:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUERY",
    "message": "Query must be at least 3 characters long",
    "timestamp": "2025-01-13T10:30:00.000Z"
  }
}
```

**503 Service Unavailable - Search Engine Down:**

```json
{
  "success": false,
  "error": {
    "code": "SEARCH_ENGINE_ERROR",
    "message": "Search engine is temporarily unavailable",
    "timestamp": "2025-01-13T10:30:00.000Z"
  }
}
```

#### Code Examples

**cURL:**

```bash
curl -X POST http://localhost:3000/api/nlp/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "decretos presidenciales sobre educación del 2023",
    "limit": 20,
    "sortBy": "relevance"
  }'
```

**JavaScript (Fetch):**

```javascript
const response = await fetch('http://localhost:3000/api/nlp/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'decretos presidenciales sobre educación del 2023',
    userId: 'user_123',
    limit: 20,
    sortBy: 'relevance'
  })
});

const result = await response.json();

if (result.success) {
  const { transformation, searchResults } = result.data;

  console.log(`Confidence: ${transformation.confidence}`);
  console.log(`Found: ${searchResults.totalCount} documents`);
  console.log(`Processing time: ${result.data.combinedProcessingTimeMs}ms`);

  searchResults.documents.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.title} (${doc.relevanceScore.toFixed(2)})`);
  });
} else {
  console.error('Search failed:', result.error.message);
}
```

**Python (requests):**

```python
import requests

url = 'http://localhost:3000/api/nlp/search'
payload = {
    'query': 'decretos presidenciales sobre educación del 2023',
    'userId': 'user_123',
    'limit': 20,
    'sortBy': 'relevance'
}

response = requests.post(url, json=payload)
result = response.json()

if result['success']:
    data = result['data']
    print(f"Confidence: {data['transformation']['confidence']}")
    print(f"Found: {data['searchResults']['totalCount']} documents")

    for i, doc in enumerate(data['searchResults']['documents']):
        print(f"{i+1}. {doc['title']} ({doc['relevanceScore']:.2f})")
else:
    print(f"Error: {result['error']['message']}")
```

**TypeScript (axios):**

```typescript
import axios from 'axios';

const response = await axios.post('http://localhost:3000/api/nlp/search', {
  query: 'decretos presidenciales sobre educación del 2023',
  userId: 'user_123',
  limit: 20,
  sortBy: 'relevance' as const
});

if (response.data.success) {
  const { transformation, searchResults, combinedProcessingTimeMs } = response.data.data;

  console.log(`Transformation confidence: ${transformation.confidence}`);
  console.log(`Search results: ${searchResults.totalCount}`);
  console.log(`Total time: ${combinedProcessingTimeMs}ms`);

  // Display results
  searchResults.documents.forEach((doc: any, index: number) => {
    console.log(`${index + 1}. ${doc.title}`);
    console.log(`   Score: ${doc.relevanceScore.toFixed(2)}`);
  });

  // Display recommendations
  if (response.data.data.recommendations) {
    console.log('\nRecommendations:');
    response.data.data.recommendations.forEach((rec: string) => {
      console.log(`- ${rec}`);
    });
  }
}
```

---

### GET /nlp/entities/search

Search the legal entity dictionary using fuzzy matching.

#### Request

**HTTP Method:** `GET`
**URL:** `/api/nlp/entities/search`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| q | string | Yes | - | Search query |
| type | EntityType | No | - | Filter by entity type |
| limit | number | No | 10 | Max results (1-50) |
| threshold | number | No | 0.6 | Fuzzy match threshold (0.0-1.0) |
| includeAliases | boolean | No | true | Search aliases too |

**Example Request:**

```
GET /api/nlp/entities/search?q=codigo%20civil&type=CODE&limit=5&threshold=0.6
```

#### Response

**Status Code:** `200 OK`

**Response Body:**

```typescript
{
  success: true;
  data: {
    results: EntitySearchResult[];
    query: string;
    filters: {
      type?: EntityType;
      limit: number;
      threshold: number;
    };
  };
  meta: {
    timestamp: string;
    version: string;
  };
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "entity": {
          "id": "codigo_civil",
          "name": "Código Civil",
          "type": "CODE",
          "aliases": ["CC", "Código Civil Ecuatoriano"],
          "jurisdiction": "nacional",
          "legalHierarchy": "legal",
          "topics": ["civil", "contratos", "obligaciones"],
          "description": "Código Civil del Ecuador",
          "patterns": ["código civil", "CC\\b"],
          "relatedEntities": ["codigo_procedimiento_civil"]
        },
        "score": 0.95,
        "matchedField": "name"
      }
    ],
    "query": "codigo civil",
    "filters": {
      "type": "CODE",
      "limit": 5,
      "threshold": 0.6
    }
  },
  "meta": {
    "timestamp": "2025-01-13T10:30:00.000Z",
    "version": "1.0.0"
  }
}
```

#### Error Responses

**400 Bad Request - Missing Query:**

```json
{
  "success": false,
  "error": {
    "code": "MISSING_PARAMETER",
    "message": "Query parameter 'q' is required",
    "timestamp": "2025-01-13T10:30:00.000Z"
  }
}
```

#### Code Examples

**cURL:**

```bash
curl "http://localhost:3000/api/nlp/entities/search?q=codigo%20civil&type=CODE&limit=5"
```

**JavaScript (Fetch):**

```javascript
const params = new URLSearchParams({
  q: 'codigo civil',
  type: 'CODE',
  limit: '5',
  threshold: '0.6'
});

const response = await fetch(`http://localhost:3000/api/nlp/entities/search?${params}`);
const result = await response.json();

if (result.success) {
  console.log(`Found ${result.data.results.length} matches:`);

  result.data.results.forEach(({ entity, score }) => {
    console.log(`- ${entity.name} (${score.toFixed(2)})`);
    console.log(`  Type: ${entity.type}`);
    console.log(`  Aliases: ${entity.aliases.join(', ')}`);
  });
}
```

**Python (requests):**

```python
import requests

params = {
    'q': 'codigo civil',
    'type': 'CODE',
    'limit': 5,
    'threshold': 0.6
}

response = requests.get('http://localhost:3000/api/nlp/entities/search', params=params)
result = response.json()

if result['success']:
    print(f"Found {len(result['data']['results'])} matches:")

    for item in result['data']['results']:
        entity = item['entity']
        score = item['score']
        print(f"- {entity['name']} ({score:.2f})")
        print(f"  Type: {entity['type']}")
```

**TypeScript:**

```typescript
const params = new URLSearchParams({
  q: 'codigo civil',
  type: 'CODE',
  limit: '5',
  threshold: '0.6'
});

const response = await fetch(`http://localhost:3000/api/nlp/entities/search?${params}`);
const result = await response.json();

if (result.success) {
  result.data.results.forEach(({ entity, score }: any) => {
    console.log(`${entity.name} (${score.toFixed(2)})`);
  });
}
```

---

### GET /nlp/entities/:id

Get detailed information about a specific legal entity.

#### Request

**HTTP Method:** `GET`
**URL:** `/api/nlp/entities/:id`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Entity ID (e.g., "codigo_civil") |

**Example Request:**

```
GET /api/nlp/entities/codigo_civil
```

#### Response

**Status Code:** `200 OK`

**Response Body:**

```typescript
{
  success: true;
  data: {
    entity: LegalEntity;
  };
  meta: {
    timestamp: string;
    version: string;
  };
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "entity": {
      "id": "codigo_civil",
      "name": "Código Civil",
      "type": "CODE",
      "aliases": ["CC", "Código Civil Ecuatoriano"],
      "jurisdiction": "nacional",
      "legalHierarchy": "legal",
      "topics": ["civil", "contratos", "obligaciones", "propiedad", "familia"],
      "description": "Código Civil del Ecuador - Regula las relaciones jurídicas privadas",
      "patterns": ["código civil", "CC\\b", "código civil ecuatoriano"],
      "relatedEntities": ["codigo_procedimiento_civil", "ley_arbitraje"],
      "metadata": {
        "yearPromulgated": 1970,
        "lastModified": "2024-05-15",
        "officialName": "Código Civil de la República del Ecuador"
      }
    }
  },
  "meta": {
    "timestamp": "2025-01-13T10:30:00.000Z",
    "version": "1.0.0"
  }
}
```

#### Error Responses

**404 Not Found - Entity Not Found:**

```json
{
  "success": false,
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "Entity with ID 'invalid_id' not found",
    "timestamp": "2025-01-13T10:30:00.000Z"
  }
}
```

#### Code Examples

**cURL:**

```bash
curl http://localhost:3000/api/nlp/entities/codigo_civil
```

**JavaScript (Fetch):**

```javascript
const entityId = 'codigo_civil';

const response = await fetch(`http://localhost:3000/api/nlp/entities/${entityId}`);
const result = await response.json();

if (result.success) {
  const { entity } = result.data;

  console.log('Entity Details:');
  console.log(`Name: ${entity.name}`);
  console.log(`Type: ${entity.type}`);
  console.log(`Jurisdiction: ${entity.jurisdiction}`);
  console.log(`Topics: ${entity.topics.join(', ')}`);
  console.log(`Description: ${entity.description}`);

  if (entity.relatedEntities && entity.relatedEntities.length > 0) {
    console.log(`Related: ${entity.relatedEntities.join(', ')}`);
  }
}
```

**Python (requests):**

```python
import requests

entity_id = 'codigo_civil'
response = requests.get(f'http://localhost:3000/api/nlp/entities/{entity_id}')
result = response.json()

if result['success']:
    entity = result['data']['entity']

    print('Entity Details:')
    print(f"Name: {entity['name']}")
    print(f"Type: {entity['type']}")
    print(f"Topics: {', '.join(entity['topics'])}")
```

---

### POST /nlp/validate

Validate search filters for logical consistency and conflicts.

#### Request

**HTTP Method:** `POST`
**URL:** `/api/nlp/validate`
**Content-Type:** `application/json`

**Request Body:**

```typescript
{
  filters: SearchFilters;  // Filters to validate
}
```

**Example Request:**

```json
{
  "filters": {
    "normType": ["ley"],
    "topics": ["laboral"],
    "dateRange": {
      "from": "2023-12-31T00:00:00.000Z",
      "to": "2023-01-01T00:00:00.000Z",
      "dateType": "publication"
    }
  }
}
```

#### Response

**Status Code:** `200 OK`

**Response Body:**

```typescript
{
  success: true;
  data: {
    validation: ValidationResult;
  };
  meta: {
    timestamp: string;
    version: string;
  };
}
```

**Example Response (Invalid Filters):**

```json
{
  "success": true,
  "data": {
    "validation": {
      "isValid": false,
      "errors": [
        {
          "field": "dateRange",
          "message": "End date must be after start date",
          "severity": "high",
          "suggestion": "Reverse the date range: from '2023-01-01' to '2023-12-31'"
        }
      ],
      "warnings": [],
      "score": 0.45
    }
  },
  "meta": {
    "timestamp": "2025-01-13T10:30:00.000Z",
    "version": "1.0.0"
  }
}
```

**Example Response (Valid Filters):**

```json
{
  "success": true,
  "data": {
    "validation": {
      "isValid": true,
      "errors": [],
      "warnings": [
        {
          "field": "keywords",
          "message": "Consider adding more specific keywords for better results",
          "severity": "low"
        }
      ],
      "score": 0.92
    }
  },
  "meta": {
    "timestamp": "2025-01-13T10:30:00.000Z",
    "version": "1.0.0"
  }
}
```

#### Code Examples

**cURL:**

```bash
curl -X POST http://localhost:3000/api/nlp/validate \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "normType": ["ley"],
      "topics": ["laboral"],
      "dateRange": {
        "from": "2023-01-01T00:00:00.000Z",
        "to": "2023-12-31T23:59:59.999Z",
        "dateType": "publication"
      }
    }
  }'
```

**JavaScript (Fetch):**

```javascript
const filters = {
  normType: ['ley'],
  topics: ['laboral'],
  dateRange: {
    from: new Date('2023-01-01'),
    to: new Date('2023-12-31'),
    dateType: 'publication'
  }
};

const response = await fetch('http://localhost:3000/api/nlp/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ filters })
});

const result = await response.json();

if (result.success) {
  const { validation } = result.data;

  if (validation.isValid) {
    console.log('✓ Filters are valid');
  } else {
    console.log('✗ Filters are invalid:');
    validation.errors.forEach(error => {
      console.log(`- ${error.field}: ${error.message}`);
      if (error.suggestion) {
        console.log(`  Suggestion: ${error.suggestion}`);
      }
    });
  }

  // Check warnings
  if (validation.warnings.length > 0) {
    console.log('\nWarnings:');
    validation.warnings.forEach(warning => {
      console.log(`- ${warning.message}`);
    });
  }

  console.log(`\nValidation score: ${validation.score.toFixed(2)}`);
}
```

---

### GET /nlp/health

Health check endpoint for monitoring NLP service status.

#### Request

**HTTP Method:** `GET`
**URL:** `/api/nlp/health`

**Example Request:**

```
GET /api/nlp/health
```

#### Response

**Status Code:** `200 OK` (healthy) or `503 Service Unavailable` (unhealthy)

**Response Body:**

```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    transformation: 'operational' | 'degraded' | 'down';
    entityDictionary: 'operational' | 'degraded' | 'down';
    cache: 'connected' | 'disconnected';
    llm: 'operational' | 'degraded' | 'down';
  };
  version: string;
  uptime: number;
  timestamp: string;
}
```

**Example Response (Healthy):**

```json
{
  "status": "healthy",
  "services": {
    "transformation": "operational",
    "entityDictionary": "operational",
    "cache": "connected",
    "llm": "operational"
  },
  "version": "1.0.0",
  "uptime": 86400,
  "timestamp": "2025-01-13T10:30:00.000Z"
}
```

**Example Response (Degraded):**

```json
{
  "status": "degraded",
  "services": {
    "transformation": "operational",
    "entityDictionary": "operational",
    "cache": "disconnected",
    "llm": "degraded"
  },
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2025-01-13T10:30:00.000Z"
}
```

#### Code Examples

**cURL:**

```bash
curl http://localhost:3000/api/nlp/health
```

**JavaScript (Fetch):**

```javascript
const response = await fetch('http://localhost:3000/api/nlp/health');
const health = await response.json();

console.log(`Status: ${health.status}`);
console.log('Services:');
Object.entries(health.services).forEach(([service, status]) => {
  console.log(`- ${service}: ${status}`);
});
console.log(`Version: ${health.version}`);
console.log(`Uptime: ${health.uptime}s`);
```

**Python (requests):**

```python
import requests

response = requests.get('http://localhost:3000/api/nlp/health')
health = response.json()

print(f"Status: {health['status']}")
print("Services:")
for service, status in health['services'].items():
    print(f"- {service}: {status}")
```

---

## Type Definitions

### SearchFilters

```typescript
interface SearchFilters {
  normType?: string[];           // ['ley', 'decreto', 'resolucion', ...]
  jurisdiction?: string[];       // ['nacional', 'provincial', 'municipal', ...]
  legalHierarchy?: string[];     // ['constitucional', 'legal', 'sublegal', ...]
  publicationType?: string[];    // ['oficial', 'gaceta', ...]
  dateRange?: DateRangeFilter;
  keywords?: string[];
  topics?: string[];
  geographicScope?: string[];    // ['Quito', 'Guayaquil', ...]
  issuingEntities?: string[];    // ['Presidencia', 'Asamblea Nacional', ...]
  documentState?: 'vigente' | 'derogado' | 'suspendido';
}
```

### Entity

```typescript
interface Entity {
  type: EntityType;
  text: string;                  // Original text
  normalizedText: string;        // Uppercase normalized
  confidence: number;            // 0.0-1.0
  startIndex?: number;
  endIndex?: number;
  metadata?: Record<string, any>;
}

type EntityType =
  | 'CONSTITUTION'
  | 'CODE'
  | 'ORGANIC_LAW'
  | 'ORDINARY_LAW'
  | 'DECREE'
  | 'RESOLUTION'
  | 'ORDINANCE'
  | 'MINISTRY'
  | 'GOVERNMENT_AGENCY'
  | 'NATIONAL_JURISDICTION'
  | 'PROVINCIAL_JURISDICTION'
  | 'MUNICIPAL_JURISDICTION'
  | 'LEGAL_TOPIC'
  | 'DATE_RANGE';
```

### Intent

```typescript
interface Intent {
  primaryIntent: QueryIntent;
  confidence: number;            // 0.0-1.0
  secondaryIntents: QueryIntent[];
  requiresSpecificDocument: boolean;
  requiresComparison: boolean;
  requiresValidityCheck: boolean;
  requiresPrecedent: boolean;
  requiresAuthority: boolean;
}

type QueryIntent =
  | 'FIND_DOCUMENT'
  | 'FIND_PROVISION'
  | 'COMPARE_NORMS'
  | 'CHECK_VALIDITY'
  | 'FIND_PRECEDENT'
  | 'UNDERSTAND_PROCEDURE'
  | 'FIND_AUTHORITY'
  | 'GENERAL_SEARCH';
```

### ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;                 // 0.0-1.0 quality score
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion?: string;
}

interface ValidationWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}
```

### DateRangeFilter

```typescript
interface DateRangeFilter {
  from: Date;
  to: Date;
  dateType: 'publication' | 'effectiveness' | 'modification';
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_QUERY | 400 | Query is empty, too short, or malformed |
| MISSING_PARAMETER | 400 | Required parameter is missing |
| INVALID_PARAMETER | 400 | Parameter value is invalid |
| TRANSFORMATION_ERROR | 500 | Query transformation failed |
| ENTITY_EXTRACTION_ERROR | 500 | Entity extraction failed |
| INTENT_CLASSIFICATION_ERROR | 500 | Intent classification failed |
| SEARCH_ENGINE_ERROR | 503 | Advanced search engine unavailable |
| LLM_ERROR | 503 | OpenAI API unavailable or failed |
| CACHE_ERROR | 500 | Redis cache error |
| VALIDATION_ERROR | 400 | Filter validation failed |
| ENTITY_NOT_FOUND | 404 | Entity ID not found in dictionary |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |

---

## Rate Limiting

### Current Limits

- **No rate limiting** in development
- Future production limits (planned):
  - 100 requests per minute per IP
  - 1000 requests per hour per user

### Rate Limit Headers (Planned)

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1673612400
```

---

## Code Examples

### Complete Integration Example (React)

```typescript
import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

interface NLPSearchResult {
  transformation: any;
  searchResults: any;
  recommendations?: string[];
}

export function NLPSearchComponent() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NLPSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (query.length < 3) {
      setError('La consulta debe tener al menos 3 caracteres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE}/nlp/search`, {
        query,
        limit: 20,
        sortBy: 'relevance',
        enableSpellCheck: true,
        enableQueryExpansion: true
      });

      if (response.data.success) {
        setResult(response.data.data);
      } else {
        setError(response.data.error.message);
      }

    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error al buscar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nlp-search">
      <div className="search-box">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Buscar leyes, decretos, resoluciones..."
          disabled={loading}
        />
        <button onClick={handleSearch} disabled={loading || query.length < 3}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {error && (
        <div className="error">{error}</div>
      )}

      {result && (
        <div className="results">
          <div className="transformation-summary">
            <h3>Análisis de la consulta</h3>
            <p>Confianza: {(result.transformation.confidence * 100).toFixed(0)}%</p>
            <p>Entidades detectadas: {result.transformation.entities.length}</p>
            <p>Intención: {result.transformation.intent.primaryIntent}</p>
          </div>

          {result.recommendations && result.recommendations.length > 0 && (
            <div className="recommendations">
              <h3>Recomendaciones</h3>
              <ul>
                {result.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="search-results">
            <h3>Resultados ({result.searchResults.totalCount})</h3>
            {result.searchResults.documents.map((doc: any) => (
              <div key={doc.id} className="document-card">
                <h4>{doc.title}</h4>
                <p>{doc.summary}</p>
                <div className="metadata">
                  <span>{doc.normType}</span>
                  <span>{new Date(doc.publicationDate).toLocaleDateString()}</span>
                  <span>Relevancia: {(doc.relevanceScore * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Appendix

### Supported Query Patterns

The NLP API recognizes these common query patterns:

**1. Norm Type Queries:**
- "buscar leyes laborales"
- "decretos presidenciales"
- "resoluciones del SRI"
- "ordenanzas municipales"

**2. Topic Queries:**
- "normativa sobre educación"
- "legislación ambiental"
- "regulación tributaria"

**3. Date-Specific Queries:**
- "leyes de 2023"
- "decretos del último año"
- "normativa entre enero y junio 2024"

**4. Entity-Specific Queries:**
- "Código Civil artículos sobre contratos"
- "LOSEP reglamento"
- "Constitución artículo 66"

**5. Validity Queries:**
- "leyes laborales vigentes"
- "normativa derogada sobre..."
- "decretos suspendidos"

**6. Jurisdiction Queries:**
- "leyes nacionales sobre..."
- "ordenanzas de Quito"
- "normativa provincial de Pichincha"

---

**End of API Reference**

For additional documentation:
- **WEEK2_IMPLEMENTATION_REPORT.md**: Architecture and implementation
- **WEEK2_DEVELOPER_GUIDE.md**: Service documentation and integration
- **WEEK2_USER_GUIDE.md**: End-user query examples
- **WEEK2_SUCCESS_METRICS.md**: Performance benchmarks
