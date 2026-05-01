# Week 2: Query Transformation - Developer Guide

**Phase 10 - Week 2: Natural Language Query Processing**
**Version:** 1.0.0
**Last Updated:** January 13, 2025
**Author:** Legal RAG System Development Team

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Service Documentation](#service-documentation)
4. [Integration Guide](#integration-guide)
5. [Best Practices](#best-practices)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)

---

## Getting Started

### Prerequisites

Before you begin development, ensure you have:

- **Node.js**: Version 20.x or higher
- **TypeScript**: Version 5.3 or higher
- **PostgreSQL**: Version 14+ (for Prisma)
- **Redis**: Version 7.0+ (for caching)
- **OpenAI API Key**: GPT-4 access required
- **Git**: For version control

### Quick Start

#### 1. Clone and Install

```bash
# Navigate to project root
cd C:/Users/benito/poweria/legal

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate
```

#### 2. Environment Configuration

Create or update `.env` file:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/legal_db"

# Redis Cache
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# OpenAI API
OPENAI_API_KEY="sk-proj-..."
OPENAI_MODEL="gpt-4-turbo-preview"

# NLP Service Configuration
NLP_ENABLE_CACHING=true
NLP_CACHE_TTL=3600
NLP_MAX_PROCESSING_TIME=2000
NLP_MIN_CONFIDENCE=0.5
NLP_DEBUG=true

# Server
PORT=3000
NODE_ENV=development
```

#### 3. Start Development Server

```bash
# Start Redis (separate terminal)
redis-server

# Start development server with hot reload
npm run dev

# Server will start on http://localhost:3000
```

#### 4. Verify Installation

```bash
# Health check
curl http://localhost:3000/api/nlp/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "transformation": "operational",
    "entityDictionary": "operational",
    "cache": "connected"
  },
  "version": "1.0.0"
}
```

### Local Development Setup

#### Project Structure

```
C:/Users/benito/poweria/legal/
├── src/
│   ├── services/
│   │   └── nlp/
│   │       ├── query-transformation-service.ts    # Main orchestrator
│   │       ├── query-processor.ts                 # Entity/Intent extraction
│   │       ├── nlp-search-integration.ts          # Search integration
│   │       ├── legal-entity-dictionary.ts         # Entity dictionary
│   │       ├── filter-builder.ts                  # Filter construction
│   │       ├── context-prompt-builder.ts          # LLM prompts
│   │       └── nlp-cache.ts                       # Redis caching
│   ├── routes/
│   │   ├── nlp.ts                                 # NLP API endpoints
│   │   └── query.ts                               # Query processing
│   ├── types/
│   │   └── query-transformation.types.ts          # Type definitions
│   └── utils/
│       └── logger.ts                              # Logging utility
├── scripts/
│   └── test-nlp.ts                                # Testing scripts
└── tests/
    └── nlp/                                       # Unit tests
```

#### Running Tests

```bash
# Run all NLP tests
npm test src/tests/nlp/

# Run specific test suite
npm test src/tests/nlp/query-transformation.test.ts

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

---

## Architecture Overview

### System Architecture

The Week 2 NLP system follows a modular, layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Fastify)                      │
│  /api/nlp/transform | /api/nlp/search | /api/nlp/entities   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              NLP Integration Service Layer                   │
│  NLPSearchIntegrationService (Bridge to Phase 9)            │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│           Query Transformation Service (Core)                │
│  Orchestrates: Preprocessing → Extraction → Building        │
└──────────────┬────────────────┬────────────────┬────────────┘
               │                │                │
       ┌───────▼────┐   ┌──────▼──────┐  ┌─────▼──────┐
       │   Query    │   │   Entity    │  │   Filter   │
       │ Processor  │   │ Dictionary  │  │  Builder   │
       └────────────┘   └─────────────┘  └────────────┘
               │                │                │
       ┌───────▼────────────────▼────────────────▼────────┐
       │         Supporting Services Layer                 │
       │  ContextPromptBuilder | NLPCache | Validator     │
       └──────────────────────┬──────────────────────────┘
                              │
                   ┌──────────▼───────────┐
                   │   Infrastructure     │
                   │  Redis | OpenAI API  │
                   └──────────────────────┘
```

### Data Flow Pipeline

```
Natural Language Query
        │
        ▼
1. Preprocessing
   - Normalize whitespace
   - Convert to lowercase
   - Remove special chars
        │
        ▼
2. Parallel Extraction
   ├─► Entity Extraction
   │   - Pattern matching
   │   - Dictionary lookup
   │   - GPT-4 extraction
   │
   └─► Intent Classification
       - Pattern recognition
       - GPT-4 classification
        │
        ▼
3. Filter Building
   - Map entities → filters
   - Map intent → filters
   - Combine & optimize
        │
        ▼
4. Validation
   - Check filter conflicts
   - Validate date ranges
   - Assess confidence
        │
        ▼
5. Search Integration
   - Map to Phase 9 format
   - Execute search
   - Return results
        │
        ▼
TransformationResult + SearchResults
```

---

## Service Documentation

### 1. QueryTransformationService

**Location:** `src/services/nlp/query-transformation-service.ts`

#### Purpose

Main orchestrator for the NLP pipeline. Coordinates entity extraction, intent classification, filter building, and validation.

#### Class Definition

```typescript
export class QueryTransformationService {
  constructor(config?: Partial<TransformationConfig>);

  async transformQuery(query: string): Promise<TransformationResult>;
  buildFilters(entities: Entity[], intent: Intent): SearchFilters;
  validateFilters(filters: SearchFilters): ValidationResult;
  getMetrics(): PerformanceMetrics[];
  clearMetrics(): void;
}
```

#### API Reference

##### transformQuery()

Transforms natural language query into structured search filters.

**Signature:**
```typescript
async transformQuery(query: string): Promise<TransformationResult>
```

**Parameters:**
- `query` (string): Natural language search query in Spanish

**Returns:**
```typescript
interface TransformationResult {
  filters: SearchFilters;          // Structured search filters
  entities: Entity[];              // Extracted legal entities
  intent: Intent;                  // Classified query intent
  confidence: number;              // 0.0-1.0 confidence score
  processingTimeMs: number;        // Processing duration
  validation: ValidationResult;    // Filter validation results
  refinementSuggestions: string[]; // User guidance
  usedCache: boolean;              // Cache hit indicator
}
```

**Usage Example:**

```typescript
import { QueryTransformationService } from './services/nlp/query-transformation-service';

// Initialize service
const transformService = new QueryTransformationService({
  debug: true,
  enableCaching: true,
  cacheTTL: 3600,
  minConfidenceThreshold: 0.5
});

// Transform query
const query = "leyes laborales vigentes de 2023";

try {
  const result = await transformService.transformQuery(query);

  console.log('Confidence:', result.confidence);
  console.log('Filters:', result.filters);
  console.log('Entities found:', result.entities.length);
  console.log('Intent:', result.intent.primaryIntent);

  if (result.validation.isValid) {
    // Use filters for search
    const searchResults = await search(result.filters);
  } else {
    // Handle validation warnings
    console.warn('Warnings:', result.validation.warnings);
  }

} catch (error) {
  console.error('Transformation failed:', error);
}
```

##### buildFilters()

Constructs search filters from extracted entities and classified intent.

**Signature:**
```typescript
buildFilters(entities: Entity[], intent: Intent): SearchFilters
```

**Parameters:**
- `entities` (Entity[]): Array of extracted legal entities
- `intent` (Intent): Classified query intent

**Returns:**
```typescript
interface SearchFilters {
  normType?: string[];           // ['ley', 'decreto', ...]
  jurisdiction?: string[];       // ['nacional', 'provincial', ...]
  legalHierarchy?: string[];     // ['constitucional', 'legal', ...]
  publicationType?: string[];    // ['oficial', 'gaceta', ...]
  dateRange?: DateRangeFilter;   // { from, to, dateType }
  keywords?: string[];           // Extracted keywords
  // ... additional filter fields
}
```

**Usage Example:**

```typescript
// Example with extracted entities and intent
const entities: Entity[] = [
  {
    type: 'ORGANIC_LAW',
    text: 'Ley Orgánica de Servicio Público',
    normalizedText: 'LEY ORGÁNICA DE SERVICIO PÚBLICO',
    confidence: 0.95,
    startIndex: 0,
    endIndex: 34
  },
  {
    type: 'LEGAL_TOPIC',
    text: 'derechos laborales',
    normalizedText: 'DERECHOS LABORALES',
    confidence: 0.88,
    startIndex: 42,
    endIndex: 60
  }
];

const intent: Intent = {
  primaryIntent: 'FIND_DOCUMENT',
  confidence: 0.92,
  secondaryIntents: ['FIND_PROVISION'],
  requiresSpecificDocument: true,
  requiresComparison: false,
  requiresValidityCheck: false
};

// Build filters
const filters = transformService.buildFilters(entities, intent);

console.log(filters);
// {
//   normType: ['ley_organica'],
//   topics: ['laboral', 'derechos'],
//   keywords: ['Ley Orgánica de Servicio Público', 'derechos laborales'],
//   legalHierarchy: ['legal']
// }
```

##### validateFilters()

Validates constructed filters for conflicts and logical errors.

**Signature:**
```typescript
validateFilters(filters: SearchFilters): ValidationResult
```

**Returns:**
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;              // 0.0-1.0 validation quality
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion?: string;
}
```

**Usage Example:**

```typescript
const filters: SearchFilters = {
  normType: ['ley'],
  dateRange: {
    from: new Date('2023-01-01'),
    to: new Date('2022-12-31'),  // Invalid: to < from
    dateType: 'publication'
  }
};

const validation = transformService.validateFilters(filters);

if (!validation.isValid) {
  console.error('Validation failed:');

  validation.errors.forEach(error => {
    console.log(`- ${error.field}: ${error.message}`);
    if (error.suggestion) {
      console.log(`  Suggestion: ${error.suggestion}`);
    }
  });
}

// Output:
// Validation failed:
// - dateRange: End date must be after start date
//   Suggestion: Reverse the date range or correct the dates
```

##### getMetrics()

Retrieves performance metrics for monitoring.

**Signature:**
```typescript
getMetrics(): PerformanceMetrics[]
```

**Returns:**
```typescript
interface PerformanceMetrics {
  timestamp: Date;
  operation: string;
  durationMs: number;
  success: boolean;
  cacheHit?: boolean;
  entityCount?: number;
  confidence?: number;
}
```

**Usage Example:**

```typescript
// After processing multiple queries
const metrics = transformService.getMetrics();

// Calculate average response time
const avgTime = metrics.reduce((sum, m) => sum + m.durationMs, 0) / metrics.length;
console.log(`Average processing time: ${avgTime.toFixed(2)}ms`);

// Calculate cache hit rate
const cacheHits = metrics.filter(m => m.cacheHit).length;
const cacheHitRate = (cacheHits / metrics.length) * 100;
console.log(`Cache hit rate: ${cacheHitRate.toFixed(1)}%`);

// Find slow queries
const slowQueries = metrics.filter(m => m.durationMs > 1000);
console.log(`Slow queries (>1s): ${slowQueries.length}`);
```

#### Configuration Options

```typescript
interface TransformationConfig {
  debug: boolean;                    // Enable debug logging
  enableCaching: boolean;            // Use Redis cache
  cacheTTL: number;                  // Cache TTL in seconds
  maxProcessingTime: number;         // Max processing time (ms)
  llmModel: string;                  // OpenAI model name
  llmTemperature: number;            // 0.0-1.0, creativity
  maxLlmTokens: number;              // Max tokens per request
  minConfidenceThreshold: number;    // Min acceptable confidence
  enablePerformanceMonitoring: boolean; // Track metrics
}

// Default configuration
const defaultConfig: TransformationConfig = {
  debug: process.env.NODE_ENV === 'development',
  enableCaching: true,
  cacheTTL: 3600,                    // 1 hour
  maxProcessingTime: 2000,           // 2 seconds
  llmModel: 'gpt-4-turbo-preview',
  llmTemperature: 0.3,               // Low for consistency
  maxLlmTokens: 1000,
  minConfidenceThreshold: 0.5,
  enablePerformanceMonitoring: true
};
```

#### Error Handling

```typescript
try {
  const result = await transformService.transformQuery(query);

} catch (error) {
  if (error instanceof TransformationError) {
    // Known transformation error
    console.error(`Transformation failed: ${error.message}`);
    console.error(`Error code: ${error.code}`);

    // Fallback to basic search
    const fallbackFilters = { keywords: [query] };

  } else if (error instanceof OpenAIError) {
    // OpenAI API error
    console.error('OpenAI API unavailable:', error.message);

    // Use pattern-based fallback
    const fallbackResult = await patternBasedTransformation(query);

  } else {
    // Unexpected error
    console.error('Unexpected error:', error);
    throw error;
  }
}
```

---

### 2. LegalEntityDictionary

**Location:** `src/services/nlp/legal-entity-dictionary.ts`

#### Purpose

Provides fuzzy matching and lookup for Ecuadorian legal entities including laws, codes, institutions, and jurisdictions.

#### Class Definition

```typescript
export class LegalEntityDictionary {
  searchEntity(query: string, options?: SearchOptions): EntitySearchResult[];
  getEntity(entityId: string): LegalEntity | null;
  getAllEntities(filter?: EntityFilter): LegalEntity[];
  extractEntitiesFromText(text: string): LegalEntity[];
}
```

#### API Reference

##### searchEntity()

Fuzzy search for legal entities by name or keyword.

**Signature:**
```typescript
searchEntity(
  query: string,
  options?: SearchOptions
): EntitySearchResult[]
```

**Parameters:**
```typescript
interface SearchOptions {
  type?: EntityType;           // Filter by entity type
  limit?: number;              // Max results (default: 10)
  threshold?: number;          // Fuzzy match threshold (0.0-1.0)
  includeAliases?: boolean;    // Search aliases too
}
```

**Returns:**
```typescript
interface EntitySearchResult {
  entity: LegalEntity;
  score: number;               // Match score 0.0-1.0
  matchedField: string;        // Which field matched
}
```

**Usage Example:**

```typescript
import { legalEntityDictionary } from './services/nlp/legal-entity-dictionary';

// Search for entity
const results = legalEntityDictionary.searchEntity('codigo civil', {
  type: 'CODE',
  limit: 5,
  threshold: 0.6,
  includeAliases: true
});

console.log(`Found ${results.length} matches:`);

results.forEach(result => {
  console.log(`- ${result.entity.name} (${result.score.toFixed(2)})`);
  console.log(`  Type: ${result.entity.type}`);
  console.log(`  Aliases: ${result.entity.aliases.join(', ')}`);
});

// Output:
// Found 1 matches:
// - Código Civil (0.95)
//   Type: CODE
//   Aliases: CC, Código Civil Ecuatoriano
```

##### getEntity()

Retrieve specific entity by ID.

**Signature:**
```typescript
getEntity(entityId: string): LegalEntity | null
```

**Usage Example:**

```typescript
const entity = legalEntityDictionary.getEntity('codigo_civil');

if (entity) {
  console.log('Entity details:');
  console.log(`Name: ${entity.name}`);
  console.log(`Type: ${entity.type}`);
  console.log(`Jurisdiction: ${entity.jurisdiction}`);
  console.log(`Hierarchy: ${entity.legalHierarchy}`);
  console.log(`Topics: ${entity.topics.join(', ')}`);

  if (entity.relatedEntities) {
    console.log(`Related: ${entity.relatedEntities.join(', ')}`);
  }
}
```

##### extractEntitiesFromText()

Extract all matching entities from text using pattern matching.

**Signature:**
```typescript
extractEntitiesFromText(text: string): LegalEntity[]
```

**Usage Example:**

```typescript
const text = "El Código Civil y la Ley Orgánica de Servicio Público regulan estos aspectos";

const entities = legalEntityDictionary.extractEntitiesFromText(text);

console.log(`Extracted ${entities.length} entities:`);

entities.forEach(entity => {
  console.log(`- ${entity.name} (${entity.type})`);
});

// Output:
// Extracted 2 entities:
// - Código Civil (CODE)
// - Ley Orgánica de Servicio Público (ORGANIC_LAW)
```

#### Entity Types

The dictionary includes 30+ entities across these categories:

```typescript
// Constitutional Documents
- Constitución de la República del Ecuador (2008)

// Codes (Códigos)
- Código Civil
- Código Penal (COIP)
- Código de Trabajo
- Código Tributario
- Código Orgánico General de Procesos (COGEP)

// Organic Laws (Leyes Orgánicas)
- Ley Orgánica de Servicio Público (LOSEP)
- Ley Orgánica de Educación Superior
- Ley Orgánica de Transparencia (LOTAIP)
- ... and more

// Government Entities
- Presidencia de la República
- Asamblea Nacional
- Ministerio de Trabajo
- Servicio de Rentas Internas (SRI)
- ... and more

// Jurisdictions
- Nacional
- Provincial
- Municipal/Cantonal
- Institucional
```

---

### 3. FilterBuilder

**Location:** `src/services/nlp/filter-builder.ts`

#### Purpose

Converts extracted entities and classified intent into structured search filters compatible with Phase 9 Advanced Search.

#### Class Definition

```typescript
export class FilterBuilder {
  buildFromEntities(entities: Entity[]): Partial<SearchFilters>;
  buildFromIntent(intent: Intent): Partial<SearchFilters>;
  combineFilters(...filters: Partial<SearchFilters>[]): SearchFilters;
  optimizeFilters(filters: SearchFilters): SearchFilters;
}
```

#### API Reference

##### buildFromEntities()

Maps entity array to search filters.

**Signature:**
```typescript
buildFromEntities(entities: Entity[]): Partial<SearchFilters>
```

**Entity-to-Filter Mappings:**

| Entity Type | Filter Field | Example |
|------------|--------------|---------|
| CONSTITUTION | normType, legalHierarchy | ['constitucion'], ['constitucional'] |
| CODE | normType, keywords | ['codigo'], ['Código Civil'] |
| ORGANIC_LAW | normType, legalHierarchy | ['ley_organica'], ['legal'] |
| ORDINARY_LAW | normType | ['ley'] |
| DECREE | normType | ['decreto'] |
| RESOLUTION | normType | ['resolucion'] |
| ORDINANCE | normType, jurisdiction | ['ordenanza'], ['municipal'] |
| MINISTRY | issuingEntities | ['Ministerio de Trabajo'] |
| GOVERNMENT_AGENCY | issuingEntities | ['SRI'] |
| NATIONAL_JURISDICTION | jurisdiction | ['nacional'] |
| PROVINCIAL_JURISDICTION | jurisdiction | ['provincial'] |
| MUNICIPAL_JURISDICTION | jurisdiction | ['municipal'] |
| LEGAL_TOPIC | topics | ['laboral'] |
| DATE_RANGE | dateRange | { from, to, dateType } |

**Usage Example:**

```typescript
import { FilterBuilder } from './services/nlp/filter-builder';

const filterBuilder = new FilterBuilder();

// Entities extracted from query
const entities: Entity[] = [
  {
    type: 'ORGANIC_LAW',
    text: 'Ley Orgánica de Servicio Público',
    normalizedText: 'LEY ORGÁNICA DE SERVICIO PÚBLICO',
    confidence: 0.95
  },
  {
    type: 'MINISTRY',
    text: 'Ministerio de Trabajo',
    normalizedText: 'MINISTERIO DE TRABAJO',
    confidence: 0.88
  },
  {
    type: 'LEGAL_TOPIC',
    text: 'derechos laborales',
    normalizedText: 'DERECHOS LABORALES',
    confidence: 0.82
  }
];

// Build filters
const filters = filterBuilder.buildFromEntities(entities);

console.log(JSON.stringify(filters, null, 2));

// Output:
// {
//   "normType": ["ley_organica"],
//   "legalHierarchy": ["legal"],
//   "issuingEntities": ["Ministerio de Trabajo"],
//   "topics": ["laboral", "derechos"],
//   "keywords": ["Ley Orgánica de Servicio Público", "derechos laborales"]
// }
```

##### buildFromIntent()

Maps query intent to search filters.

**Signature:**
```typescript
buildFromIntent(intent: Intent): Partial<SearchFilters>
```

**Intent-to-Filter Mappings:**

| Intent | Filter Additions |
|--------|-----------------|
| FIND_DOCUMENT | Higher weight on title/keywords |
| FIND_PROVISION | Include article numbers in search |
| COMPARE_NORMS | Enable cross-reference search |
| CHECK_VALIDITY | Filter by documentState: 'vigente' |
| FIND_PRECEDENT | Search related documents |

**Usage Example:**

```typescript
const intent: Intent = {
  primaryIntent: 'CHECK_VALIDITY',
  confidence: 0.91,
  secondaryIntents: ['FIND_DOCUMENT'],
  requiresSpecificDocument: true,
  requiresValidityCheck: true
};

const intentFilters = filterBuilder.buildFromIntent(intent);

console.log(intentFilters);
// {
//   documentState: 'vigente',
//   sortBy: 'date',
//   sortOrder: 'desc'
// }
```

##### combineFilters()

Merges multiple filter objects into a single SearchFilters object.

**Signature:**
```typescript
combineFilters(...filters: Partial<SearchFilters>[]): SearchFilters
```

**Usage Example:**

```typescript
const entityFilters = {
  normType: ['ley'],
  topics: ['laboral']
};

const intentFilters = {
  documentState: 'vigente'
};

const dateFilters = {
  dateRange: {
    from: new Date('2023-01-01'),
    to: new Date('2023-12-31'),
    dateType: 'publication' as const
  }
};

// Combine all filters
const combined = filterBuilder.combineFilters(
  entityFilters,
  intentFilters,
  dateFilters
);

console.log(combined);
// {
//   normType: ['ley'],
//   topics: ['laboral'],
//   documentState: 'vigente',
//   dateRange: { from: '2023-01-01', to: '2023-12-31', dateType: 'publication' }
// }
```

##### optimizeFilters()

Optimizes filters by removing duplicates, validating ranges, and normalizing values.

**Signature:**
```typescript
optimizeFilters(filters: SearchFilters): SearchFilters
```

**Optimizations Performed:**
- Remove duplicate array values
- Normalize string arrays (lowercase, trim)
- Validate date ranges
- Remove empty arrays
- Consolidate redundant filters

**Usage Example:**

```typescript
const unoptimized = {
  normType: ['ley', 'LEY', 'ley '],  // Duplicates and inconsistent casing
  topics: ['laboral', 'trabajo', 'laboral'],  // Duplicate 'laboral'
  keywords: [],  // Empty array
  dateRange: {
    from: new Date('2023-12-31'),
    to: new Date('2023-01-01'),  // Invalid range
    dateType: 'publication' as const
  }
};

const optimized = filterBuilder.optimizeFilters(unoptimized);

console.log(optimized);
// {
//   normType: ['ley'],                   // Deduplicated, normalized
//   topics: ['laboral', 'trabajo'],      // Deduplicated
//   dateRange: {                          // Date range corrected
//     from: new Date('2023-01-01'),
//     to: new Date('2023-12-31'),
//     dateType: 'publication'
//   }
// }
// Note: Empty 'keywords' array removed
```

---

### 4. ContextPromptBuilder

**Location:** `src/services/nlp/context-prompt-builder.ts`

#### Purpose

Builds optimized LLM prompts with Ecuadorian legal context, few-shot examples, and chain-of-thought reasoning for accurate query transformation.

#### Class Definition

```typescript
export class ContextPromptBuilder {
  buildTransformationPrompt(query: string, options?: PromptOptions): string;
  buildEntityExtractionPrompt(text: string, options?: PromptOptions): string;
  buildIntentClassificationPrompt(query: string, options?: PromptOptions): string;
  addEcuadorianContext(prompt: string): string;
  optimizePromptLength(prompt: string, maxTokens?: number): string;
}
```

#### API Reference

##### buildTransformationPrompt()

Builds comprehensive prompt for query-to-filter transformation.

**Signature:**
```typescript
buildTransformationPrompt(
  query: string,
  options?: PromptOptions
): string
```

**Parameters:**
```typescript
interface PromptOptions {
  includeExamples?: boolean;         // Include few-shot examples
  exampleCount?: number;             // Number of examples (1-5)
  includeContext?: boolean;          // Include legal context
  includeChainOfThought?: boolean;   // Include reasoning steps
  maxTokens?: number;                // Token limit for optimization
}
```

**Usage Example:**

```typescript
import { ContextPromptBuilder } from './services/nlp/context-prompt-builder';

const promptBuilder = new ContextPromptBuilder();

const query = "leyes laborales vigentes de 2023";

const prompt = promptBuilder.buildTransformationPrompt(query, {
  includeExamples: true,
  exampleCount: 3,
  includeContext: true,
  includeChainOfThought: true,
  maxTokens: 2000
});

console.log('Generated prompt length:', prompt.length);
console.log('Estimated tokens:', prompt.length / 4);

// Use with OpenAI
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [
    { role: 'system', content: prompt },
    { role: 'user', content: query }
  ],
  temperature: 0.3,
  max_tokens: 1000
});

const filters = JSON.parse(completion.choices[0].message.content);
```

**Generated Prompt Structure:**

```
Eres un experto en el sistema legal ecuatoriano. Tu tarea es transformar consultas en lenguaje natural en filtros estructurados de búsqueda.

# CONTEXTO LEGAL ECUATORIANO

El sistema legal ecuatoriano se basa en:

1. JERARQUÍA NORMATIVA (de mayor a menor):
  - Constitución de la República (2008)
  - Tratados y Convenios Internacionales
  - Leyes Orgánicas
  - Leyes Ordinarias
  [... full hierarchy ...]

# EJEMPLOS DE TRANSFORMACIÓN

Consulta: "buscar leyes laborales vigentes del último año"
Filtros: {"normType":["ley"],"topics":["laboral"],...}
Explicación: Identifica tipo de norma (ley), tema (laboral), estado (vigente)

[... more examples ...]

# PROCESO DE ANÁLISIS

1. Identificar el tipo de norma buscada (ley, decreto, etc.)
2. Determinar la jurisdicción (nacional, provincial, municipal)
3. Extraer temas y palabras clave relevantes
[... reasoning steps ...]

# TAREA

Transforma la siguiente consulta en filtros de búsqueda estructurados:

Consulta: "leyes laborales vigentes de 2023"

Responde SOLO con un objeto JSON válido con los siguientes campos posibles:
- normType: array de tipos de norma
- jurisdiction: array de jurisdicciones
[... field descriptions ...]

JSON:
```

##### buildEntityExtractionPrompt()

Builds prompt specifically for entity extraction.

**Signature:**
```typescript
buildEntityExtractionPrompt(text: string, options?: PromptOptions): string
```

**Usage Example:**

```typescript
const text = "Código Civil y Ley de Educación Superior";

const prompt = promptBuilder.buildEntityExtractionPrompt(text, {
  includeExamples: true,
  exampleCount: 2
});

// Use with OpenAI for entity extraction
const entities = await extractEntitiesWithGPT(prompt, text);
```

##### optimizePromptLength()

Reduces prompt size to fit token limits while preserving essential information.

**Signature:**
```typescript
optimizePromptLength(prompt: string, maxTokens?: number): string
```

**Optimization Strategy:**
1. Remove examples if exceeds limit
2. Remove context section if still over
3. Truncate remaining content as last resort

**Usage Example:**

```typescript
const longPrompt = promptBuilder.buildTransformationPrompt(query, {
  includeExamples: true,
  exampleCount: 5,
  includeContext: true
});

console.log('Original length:', longPrompt.length); // 12,450 chars

const optimized = promptBuilder.optimizePromptLength(longPrompt, 1000);

console.log('Optimized length:', optimized.length); // ~4,000 chars
console.log('Estimated tokens:', optimized.length / 4); // ~1,000 tokens
```

---

### 5. NLPSearchIntegrationService

**Location:** `src/services/nlp/nlp-search-integration.ts`

#### Purpose

Critical bridge between NLP transformation (Week 2) and Advanced Search Engine (Phase 9). Orchestrates end-to-end NLP-powered search.

#### Class Definition

```typescript
export class NLPSearchIntegrationService {
  async searchWithNLP(options: NLPSearchOptions): Promise<NLPSearchResult>;
  getMetrics(): PerformanceMetrics[];
  clearMetrics(): void;
}
```

#### API Reference

##### searchWithNLP()

Complete NLP-powered search from query to results.

**Signature:**
```typescript
async searchWithNLP(options: NLPSearchOptions): Promise<NLPSearchResult>
```

**Parameters:**
```typescript
interface NLPSearchOptions {
  query: string;                  // Natural language query
  userId?: string;                // User ID for personalization
  searchOptions?: {
    limit?: number;               // Results per page (default: 20)
    offset?: number;              // Pagination offset
    sortBy?: 'relevance' | 'date' | 'popularity' | 'authority';
    enableSpellCheck?: boolean;   // Spell correction
    enableQueryExpansion?: boolean; // Synonym expansion
    enableReranking?: boolean;    // ML re-ranking
  };
  transformationConfig?: Partial<TransformationConfig>;
}
```

**Returns:**
```typescript
interface NLPSearchResult {
  transformation: TransformationResult;  // Query transformation details
  searchResults: {
    documents: any[];                    // Search results
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
}
```

**Usage Example:**

```typescript
import { nlpSearchIntegrationService } from './services/nlp/nlp-search-integration';

// Perform NLP-powered search
const result = await nlpSearchIntegrationService.searchWithNLP({
  query: "decretos presidenciales sobre educación del 2023",
  userId: "user_123",
  searchOptions: {
    limit: 20,
    sortBy: 'relevance',
    enableSpellCheck: true,
    enableQueryExpansion: true,
    enableReranking: true
  }
});

// Display transformation insights
console.log('Transformation Confidence:', result.transformation.confidence);
console.log('Entities Found:', result.transformation.entities.length);
console.log('Primary Intent:', result.transformation.intent.primaryIntent);

// Display search results
console.log(`Found ${result.searchResults.totalCount} documents in ${result.combinedProcessingTimeMs}ms`);

result.searchResults.documents.forEach((doc, i) => {
  console.log(`${i + 1}. ${doc.title} (${doc.relevanceScore.toFixed(2)})`);
});

// Show recommendations
if (result.recommendations && result.recommendations.length > 0) {
  console.log('\\nRecommendations:');
  result.recommendations.forEach(rec => console.log(`- ${rec}`));
}

// Example output:
// Transformation Confidence: 0.89
// Entities Found: 3
// Primary Intent: FIND_DOCUMENT
// Found 42 documents in 487ms
//
// 1. Decreto Ejecutivo 123 sobre Reforma Educativa (0.94)
// 2. Decreto Presidencial 456 - Sistema Educativo Nacional (0.88)
// ...
//
// Recommendations:
// - Términos relacionados incluidos: educativo, enseñanza, académico
```

**Filter Mapping:**

The service automatically maps NLP filters to Phase 9 format:

| NLP Filter | Phase 9 Filter | Notes |
|-----------|----------------|-------|
| normType | normType | Direct mapping |
| jurisdiction | jurisdiction | Direct mapping |
| legalHierarchy | legalHierarchy | Direct mapping |
| publicationType | publicationType | Direct mapping |
| dateRange.from | publicationDateFrom | Date extraction |
| dateRange.to | publicationDateTo | Date extraction |
| keywords | Merged into query | Keyword boost |

---

## Integration Guide

### How to Use NLP Services

#### Option 1: Direct Service Usage

For maximum control and customization:

```typescript
import {
  QueryTransformationService
} from './services/nlp/query-transformation-service';

// Initialize service with custom config
const transformService = new QueryTransformationService({
  debug: true,
  enableCaching: true,
  minConfidenceThreshold: 0.6
});

// Transform query
const result = await transformService.transformQuery(userQuery);

// Use filters in your own search implementation
const searchResults = await customSearch(result.filters);
```

#### Option 2: Integrated NLP Search

For end-to-end NLP search:

```typescript
import {
  nlpSearchIntegrationService
} from './services/nlp/nlp-search-integration';

// One-line NLP search
const result = await nlpSearchIntegrationService.searchWithNLP({
  query: userQuery,
  userId: currentUser.id,
  searchOptions: { limit: 20, sortBy: 'relevance' }
});

// Results include transformation + search
const { transformation, searchResults } = result;
```

#### Option 3: API Endpoint Usage

For frontend integration:

```typescript
// REST API call
const response = await fetch('/api/nlp/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: userQuery,
    limit: 20,
    sortBy: 'relevance'
  })
});

const result = await response.json();
```

### Frontend Integration

#### React Example

```typescript
import React, { useState } from 'react';

interface SearchResult {
  transformation: any;
  searchResults: any;
  recommendations?: string[];
}

export function NLPSearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/nlp/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 20 })
      });

      const data = await response.json();
      setResults(data);

    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nlp-search">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar leyes, decretos, resoluciones..."
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
      />

      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Buscando...' : 'Buscar'}
      </button>

      {results && (
        <div className="results">
          <div className="transformation-info">
            <p>Confianza: {(results.transformation.confidence * 100).toFixed(0)}%</p>
            <p>Entidades: {results.transformation.entities.length}</p>
          </div>

          {results.recommendations && (
            <div className="recommendations">
              {results.recommendations.map((rec, i) => (
                <p key={i}>{rec}</p>
              ))}
            </div>
          )}

          <div className="documents">
            <p>Encontrados: {results.searchResults.totalCount}</p>
            {results.searchResults.documents.map((doc: any) => (
              <div key={doc.id} className="document">
                <h3>{doc.title}</h3>
                <p>{doc.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Error Handling Patterns

#### Graceful Degradation

```typescript
async function robustNLPSearch(query: string) {
  try {
    // Try NLP search first
    const result = await nlpSearchIntegrationService.searchWithNLP({
      query,
      searchOptions: { limit: 20 }
    });

    // Check confidence
    if (result.transformation.confidence < 0.5) {
      console.warn('Low confidence transformation, results may be inaccurate');
    }

    return result;

  } catch (nlpError) {
    console.error('NLP search failed, falling back to keyword search:', nlpError);

    // Fallback to basic keyword search
    try {
      const fallbackResult = await advancedSearchEngine.search({
        query,
        filters: {},
        limit: 20
      });

      return {
        transformation: null,
        searchResults: fallbackResult,
        usedFallback: true
      };

    } catch (fallbackError) {
      console.error('Fallback search also failed:', fallbackError);
      throw new Error('All search methods failed');
    }
  }
}
```

#### Validation Before Search

```typescript
async function validatedNLPSearch(query: string) {
  // Step 1: Transform query
  const transformation = await transformService.transformQuery(query);

  // Step 2: Validate filters
  if (!transformation.validation.isValid) {
    console.error('Invalid filters generated:');
    transformation.validation.errors.forEach(err => {
      console.error(`- ${err.message}`);
    });

    // Fix filters or use fallback
    const fixedFilters = autoFixFilters(transformation.filters);

    // Search with fixed filters
    return await advancedSearchEngine.search({
      query,
      filters: fixedFilters,
      limit: 20
    });
  }

  // Step 3: Search with valid filters
  return await advancedSearchEngine.search({
    query,
    filters: transformation.filters,
    limit: 20
  });
}
```

---

## Best Practices

### 1. Code Organization

#### Service Layer Structure

```
src/services/nlp/
├── index.ts                          # Barrel export
├── query-transformation-service.ts   # Main orchestrator
├── query-processor.ts                # Entity/Intent extraction
├── nlp-search-integration.ts         # Search bridge
├── legal-entity-dictionary.ts        # Entity dictionary
├── filter-builder.ts                 # Filter construction
├── context-prompt-builder.ts         # Prompt engineering
└── nlp-cache.ts                      # Caching layer
```

**Barrel Export Pattern:**

```typescript
// src/services/nlp/index.ts
export { QueryTransformationService } from './query-transformation-service';
export { NLPSearchIntegrationService, nlpSearchIntegrationService } from './nlp-search-integration';
export { LegalEntityDictionary, legalEntityDictionary } from './legal-entity-dictionary';
export { FilterBuilder } from './filter-builder';
export { ContextPromptBuilder } from './context-prompt-builder';
export { QueryProcessor } from './query-processor';

// Import in application code
import {
  QueryTransformationService,
  nlpSearchIntegrationService
} from './services/nlp';
```

### 2. Error Handling

#### Custom Error Classes

```typescript
// src/errors/nlp-errors.ts

export class NLPError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'NLPError';
  }
}

export class TransformationError extends NLPError {
  constructor(message: string) {
    super(message, 'TRANSFORMATION_ERROR', 400);
    this.name = 'TransformationError';
  }
}

export class EntityExtractionError extends NLPError {
  constructor(message: string) {
    super(message, 'ENTITY_EXTRACTION_ERROR', 500);
    this.name = 'EntityExtractionError';
  }
}

export class LLMError extends NLPError {
  constructor(message: string, public originalError?: any) {
    super(message, 'LLM_ERROR', 503);
    this.name = 'LLMError';
  }
}

// Usage in services
import { TransformationError, LLMError } from '../errors/nlp-errors';

async transformQuery(query: string) {
  if (!query || query.trim().length === 0) {
    throw new TransformationError('Query cannot be empty');
  }

  try {
    const result = await this.llmExtraction(query);
    return result;
  } catch (error) {
    if (error instanceof OpenAIError) {
      throw new LLMError('OpenAI API failed', error);
    }
    throw error;
  }
}
```

#### Error Recovery

```typescript
async function searchWithRetry(query: string, maxRetries: number = 3) {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await nlpSearchIntegrationService.searchWithNLP({ query });

    } catch (error) {
      lastError = error as Error;

      if (error instanceof LLMError) {
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Non-retryable error
      throw error;
    }
  }

  throw new Error(`Search failed after ${maxRetries} attempts: ${lastError.message}`);
}
```

### 3. Performance Optimization

#### Caching Strategy

```typescript
// Use built-in caching
const transformService = new QueryTransformationService({
  enableCaching: true,
  cacheTTL: 3600  // 1 hour cache
});

// Cache warming for common queries
const commonQueries = [
  'leyes laborales vigentes',
  'código civil ecuatoriano',
  'decretos presidenciales'
];

async function warmCache() {
  for (const query of commonQueries) {
    await transformService.transformQuery(query);
  }
  console.log(`Warmed cache with ${commonQueries.length} queries`);
}
```

#### Parallel Processing

```typescript
// Process multiple queries in parallel
async function batchTransform(queries: string[]) {
  const promises = queries.map(query =>
    transformService.transformQuery(query)
      .catch(error => ({
        query,
        error: error.message,
        success: false
      }))
  );

  const results = await Promise.all(promises);

  const successful = results.filter(r => r.success !== false);
  const failed = results.filter(r => r.success === false);

  console.log(`Batch complete: ${successful.length} successful, ${failed.length} failed`);

  return { successful, failed };
}
```

#### Request Debouncing

```typescript
// For frontend search-as-you-type
import { debounce } from 'lodash';

const debouncedSearch = debounce(async (query: string) => {
  if (query.length < 3) return; // Min 3 characters

  const results = await nlpSearchIntegrationService.searchWithNLP({
    query,
    searchOptions: { limit: 10 }
  });

  updateUI(results);
}, 300); // 300ms delay

// Usage
searchInput.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});
```

### 4. Testing Strategies

#### Unit Testing Services

```typescript
// src/tests/nlp/filter-builder.test.ts
import { FilterBuilder } from '../../services/nlp/filter-builder';
import { Entity } from '../../types/query-transformation.types';

describe('FilterBuilder', () => {
  let filterBuilder: FilterBuilder;

  beforeEach(() => {
    filterBuilder = new FilterBuilder();
  });

  describe('buildFromEntities', () => {
    it('should map ORGANIC_LAW entity to filters', () => {
      const entities: Entity[] = [{
        type: 'ORGANIC_LAW',
        text: 'Ley Orgánica de Servicio Público',
        normalizedText: 'LEY ORGÁNICA DE SERVICIO PÚBLICO',
        confidence: 0.95
      }];

      const filters = filterBuilder.buildFromEntities(entities);

      expect(filters.normType).toContain('ley_organica');
      expect(filters.legalHierarchy).toContain('legal');
      expect(filters.keywords).toContain('Ley Orgánica de Servicio Público');
    });

    it('should handle multiple entities', () => {
      const entities: Entity[] = [
        {
          type: 'CODE',
          text: 'Código Civil',
          normalizedText: 'CÓDIGO CIVIL',
          confidence: 0.98
        },
        {
          type: 'LEGAL_TOPIC',
          text: 'contratos',
          normalizedText: 'CONTRATOS',
          confidence: 0.85
        }
      ];

      const filters = filterBuilder.buildFromEntities(entities);

      expect(filters.normType).toContain('codigo');
      expect(filters.topics).toContain('civil');
      expect(filters.topics).toContain('contratos');
    });
  });
});
```

#### Integration Testing

```typescript
// src/tests/nlp/integration.test.ts
import { nlpSearchIntegrationService } from '../../services/nlp/nlp-search-integration';

describe('NLP Search Integration', () => {
  it('should perform end-to-end NLP search', async () => {
    const result = await nlpSearchIntegrationService.searchWithNLP({
      query: 'leyes laborales vigentes de 2023',
      searchOptions: { limit: 10 }
    });

    // Verify transformation
    expect(result.transformation).toBeDefined();
    expect(result.transformation.confidence).toBeGreaterThan(0.7);
    expect(result.transformation.entities.length).toBeGreaterThan(0);

    // Verify search results
    expect(result.searchResults).toBeDefined();
    expect(result.searchResults.totalCount).toBeGreaterThan(0);
    expect(result.searchResults.documents).toBeInstanceOf(Array);

    // Verify performance
    expect(result.combinedProcessingTimeMs).toBeLessThan(3000);
  }, 10000); // 10s timeout
});
```

#### Mock LLM Responses

```typescript
// src/tests/nlp/mocks/llm-mock.ts
export class MockLLMService {
  async extractEntities(query: string): Promise<Entity[]> {
    // Return predefined entities for testing
    if (query.includes('código civil')) {
      return [{
        type: 'CODE',
        text: 'código civil',
        normalizedText: 'CÓDIGO CIVIL',
        confidence: 0.95
      }];
    }
    return [];
  }

  async classifyIntent(query: string): Promise<Intent> {
    // Return predefined intent
    return {
      primaryIntent: 'FIND_DOCUMENT',
      confidence: 0.90,
      secondaryIntents: [],
      requiresSpecificDocument: true
    };
  }
}

// Use in tests
const transformService = new QueryTransformationService({
  llmService: new MockLLMService()
});
```

---

## Testing

### Running Tests

```bash
# Run all NLP tests
npm test src/tests/nlp/

# Run specific test file
npm test src/tests/nlp/query-transformation.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Generate HTML coverage report
npm run test:coverage -- --reporter=html
```

### Test Coverage Goals

- **Services**: 90%+ coverage
- **Filters**: 95%+ coverage
- **Error Handlers**: 100% coverage
- **Integration**: 80%+ coverage

### Example Test Suite

```typescript
// src/tests/nlp/query-transformation.test.ts
import { QueryTransformationService } from '../../services/nlp/query-transformation-service';

describe('QueryTransformationService', () => {
  let service: QueryTransformationService;

  beforeAll(() => {
    service = new QueryTransformationService({
      debug: false,
      enableCaching: false
    });
  });

  describe('Labor Law Queries', () => {
    it('should identify labor law query', async () => {
      const result = await service.transformQuery('leyes laborales vigentes');

      expect(result.filters.normType).toContain('ley');
      expect(result.filters.topics).toContain('laboral');
      expect(result.filters.documentState).toBe('vigente');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should extract LOSEP reference', async () => {
      const result = await service.transformQuery('Ley Orgánica de Servicio Público artículo 25');

      const losepEntity = result.entities.find(e =>
        e.normalizedText.includes('LOSEP') ||
        e.normalizedText.includes('LEY ORGÁNICA DE SERVICIO PÚBLICO')
      );

      expect(losepEntity).toBeDefined();
      expect(result.filters.normType).toContain('ley_organica');
    });
  });

  describe('Date Range Extraction', () => {
    it('should extract year from query', async () => {
      const result = await service.transformQuery('decretos de 2023');

      expect(result.filters.dateRange).toBeDefined();
      expect(result.filters.dateRange?.from.getFullYear()).toBe(2023);
      expect(result.filters.dateRange?.to.getFullYear()).toBe(2023);
    });

    it('should extract date range', async () => {
      const result = await service.transformQuery('leyes entre enero y junio 2023');

      expect(result.filters.dateRange).toBeDefined();
      expect(result.filters.dateRange?.from.getMonth()).toBe(0); // January
      expect(result.filters.dateRange?.to.getMonth()).toBe(5);   // June
    });
  });

  describe('Caching', () => {
    it('should cache transformation results', async () => {
      const serviceWithCache = new QueryTransformationService({
        enableCaching: true,
        cacheTTL: 3600
      });

      const query = 'test query for caching';

      // First call - miss
      const result1 = await serviceWithCache.transformQuery(query);
      expect(result1.usedCache).toBe(false);

      // Second call - hit
      const result2 = await serviceWithCache.transformQuery(query);
      expect(result2.usedCache).toBe(true);

      // Results should be identical
      expect(result1.filters).toEqual(result2.filters);
    });
  });
});
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Low Transformation Confidence

**Symptoms:**
- Confidence scores consistently below 0.5
- Inaccurate filter generation
- Missing entities

**Diagnosis:**
```typescript
const result = await transformService.transformQuery(query);

console.log('Confidence:', result.confidence);
console.log('Entities:', result.entities);
console.log('Validation:', result.validation);
```

**Solutions:**

1. **Improve Query Quality:**
```typescript
// Bad: vague query
"buscar cosas de trabajo"

// Good: specific query
"buscar leyes laborales sobre contratos de trabajo vigentes"
```

2. **Add More Context:**
```typescript
const result = await transformService.transformQuery(
  "buscar artículo 123",
  {
    context: {
      previousQuery: "Código Civil",
      userPreferences: { jurisdiction: 'nacional' }
    }
  }
);
```

3. **Check Entity Dictionary:**
```typescript
// Verify entity exists
const matches = legalEntityDictionary.searchEntity('LOSEP');
console.log('Dictionary matches:', matches);

// Add custom entity if missing
legalEntityDictionary.addCustomEntity({
  name: 'Ley de Comunicación',
  type: 'ORDINARY_LAW',
  aliases: ['LOC', 'Ley Orgánica de Comunicación'],
  // ...
});
```

#### Issue 2: Slow Response Times

**Symptoms:**
- Transformations taking >2 seconds
- Timeout errors
- Poor user experience

**Diagnosis:**
```typescript
const metrics = transformService.getMetrics();

const avgTime = metrics.reduce((sum, m) => sum + m.durationMs, 0) / metrics.length;
console.log('Average processing time:', avgTime);

const slowQueries = metrics.filter(m => m.durationMs > 2000);
console.log('Slow queries:', slowQueries.length);
```

**Solutions:**

1. **Enable Caching:**
```typescript
const transformService = new QueryTransformationService({
  enableCaching: true,
  cacheTTL: 3600
});
```

2. **Optimize LLM Calls:**
```typescript
// Use faster model for simple queries
const config = {
  llmModel: 'gpt-3.5-turbo',  // Faster than GPT-4
  maxLlmTokens: 500,           // Reduce token limit
  llmTemperature: 0.2          // Lower temperature = faster
};
```

3. **Implement Pattern-Based Fast Path:**
```typescript
// Check for simple patterns first
const quickResult = await quickPatternMatch(query);
if (quickResult.confidence > 0.8) {
  return quickResult; // Skip LLM call
}

// Fall back to LLM for complex queries
return await llmTransformation(query);
```

#### Issue 3: Cache Misses

**Symptoms:**
- `usedCache: false` for duplicate queries
- Higher costs and latency

**Diagnosis:**
```typescript
const metrics = transformService.getMetrics();

const cacheHitRate = metrics.filter(m => m.cacheHit).length / metrics.length;
console.log('Cache hit rate:', (cacheHitRate * 100).toFixed(1) + '%');
```

**Solutions:**

1. **Check Redis Connection:**
```typescript
import { redisClient } from './utils/redis';

// Test connection
try {
  await redisClient.ping();
  console.log('Redis connected');
} catch (error) {
  console.error('Redis connection failed:', error);
}
```

2. **Increase Cache TTL:**
```typescript
const config = {
  enableCaching: true,
  cacheTTL: 7200  // 2 hours instead of 1
};
```

3. **Normalize Queries Before Caching:**
```typescript
function normalizeQueryForCache(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/[¿?¡!]/g, ''); // Remove punctuation
}
```

#### Issue 4: OpenAI API Errors

**Symptoms:**
- 429 Rate Limit errors
- 503 Service Unavailable
- Timeout errors

**Diagnosis:**
```typescript
try {
  const result = await transformService.transformQuery(query);
} catch (error) {
  if (error instanceof OpenAIError) {
    console.error('OpenAI Error:', error.code, error.message);
  }
}
```

**Solutions:**

1. **Implement Retry Logic:**
```typescript
async function callOpenAIWithRetry(prompt: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await openai.chat.completions.create({...});
    } catch (error) {
      if (error.status === 429) {
        // Rate limit - wait and retry
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

2. **Use Fallback Service:**
```typescript
try {
  return await gpt4Extraction(query);
} catch (error) {
  console.warn('GPT-4 failed, using GPT-3.5 fallback');
  return await gpt35Extraction(query);
}
```

3. **Add Circuit Breaker:**
```typescript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(async (query) => {
  return await openaiService.extract(query);
}, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

breaker.on('open', () => {
  console.error('Circuit breaker opened - too many OpenAI failures');
});
```

---

## API Reference

### REST Endpoints

#### POST /api/nlp/transform

Transform natural language query to structured filters.

**Request:**
```json
{
  "query": "leyes laborales vigentes de 2023",
  "options": {
    "enableCaching": true,
    "minConfidenceThreshold": 0.5
  }
}
```

**Response:**
```json
{
  "filters": {
    "normType": ["ley"],
    "topics": ["laboral"],
    "documentState": "vigente",
    "dateRange": {
      "from": "2023-01-01T00:00:00.000Z",
      "to": "2023-12-31T23:59:59.999Z",
      "dateType": "publication"
    }
  },
  "entities": [...],
  "intent": {...},
  "confidence": 0.87,
  "processingTimeMs": 432,
  "validation": {...},
  "usedCache": false
}
```

See **WEEK2_API_REFERENCE.md** for complete endpoint documentation.

---

## Appendix

### Environment Variables Reference

```bash
# Required
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-proj-...
REDIS_URL=redis://localhost:6379

# Optional - NLP Configuration
NLP_ENABLE_CACHING=true
NLP_CACHE_TTL=3600
NLP_MAX_PROCESSING_TIME=2000
NLP_MIN_CONFIDENCE=0.5
NLP_DEBUG=true

# Optional - OpenAI Configuration
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_TEMPERATURE=0.3
OPENAI_MAX_TOKENS=1000
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

### Dependency Versions

```json
{
  "openai": "^4.28.0",
  "fuse.js": "^7.1.0",
  "redis": "^4.6.13",
  "fastify": "^4.26.0",
  "@prisma/client": "^5.8.0"
}
```

---

**End of Developer Guide**

For additional documentation:
- **WEEK2_IMPLEMENTATION_REPORT.md**: Architecture and implementation details
- **WEEK2_API_REFERENCE.md**: Complete API endpoint documentation
- **WEEK2_USER_GUIDE.md**: End-user query examples and tips
- **WEEK2_SUCCESS_METRICS.md**: Performance benchmarks and validation
