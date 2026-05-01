# CRITICAL ISSUE #3: Schema Mismatch Analysis - Unified Search Orchestrator

## Executive Summary

The unified search orchestrator has **FOUR CRITICAL SCHEMA MISMATCHES** that prevent the search functionality from working:

1. **Wrong relation field name** - Using `summaries` instead of `documentSummaries`
2. **Missing Embedding model** - `prisma.embedding` doesn't exist
3. **Missing sessionId in SearchQuery interface** - TypeScript interface incomplete
4. **Duplicate Summary models** - Two conflicting models: `LegalDocumentSummary` and `DocumentSummary`

## Root Cause Analysis

### Issue 1: Wrong Relation Field Name (Lines 325-330)

**Location**: `src/services/orchestration/unified-search-orchestrator.ts:325-330`

**Current Code**:
```typescript
whereClause.OR = [
  { title: { contains: query, mode: 'insensitive' } },
  { content: { contains: query, mode: 'insensitive' } },
  {
    summaries: {  // ❌ WRONG FIELD NAME
      some: {
        summary: { contains: query, mode: 'insensitive' }
      }
    }
  }
];
```

**Schema Definition** (prisma/schema.prisma:248):
```prisma
model LegalDocument {
  // ...
  summaries            LegalDocumentSummary[]  // Old relation (Phase 3)
  // ...
  documentSummaries    DocumentSummary[]       @relation("DocumentSummaries") // New relation (Phase 10)
}
```

**Root Cause**: The schema has TWO summary relations:
- `summaries` → `LegalDocumentSummary[]` (old model from Phase 3)
- `documentSummaries` → `DocumentSummary[]` (new model from Phase 10)

The orchestrator is using the wrong relation name AND wrong field. The `LegalDocumentSummary` model has `summaryText` field, not `summary`.

**Why This Fails**:
```typescript
// Current query attempts to access:
summaries.some.summary  // ❌ LegalDocumentSummary.summary doesn't exist

// Correct field name in LegalDocumentSummary:
summaries.some.summaryText  // ✅ This field exists

// OR use the Phase 10 model:
documentSummaries.some.summary  // ✅ DocumentSummary.summary exists
```

---

### Issue 2: Missing Embedding Model (Line 465)

**Location**: `src/services/orchestration/unified-search-orchestrator.ts:465`

**Current Code**:
```typescript
const embeddings = await prisma.embedding.findMany({  // ❌ Model doesn't exist
  where: {
    documentId: { in: documentIds }
  },
  select: {
    documentId: true,
    embedding: true
  }
});
```

**Schema Reality**: There is NO `Embedding` model in the schema.

**Available Embedding Storage**:
1. `LegalDocumentChunk.embedding` (JSON field)
2. `LegalDocumentArticle.embedding` (JSON field)
3. `LegalDocumentSection.embedding` (JSON field)

**Root Cause**: The code assumes a dedicated `Embedding` model that was never created. The embeddings are stored as JSON fields in various document structure models.

---

### Issue 3: Missing sessionId Property (Lines 547, 551)

**Location**: `src/services/orchestration/unified-search-orchestrator.ts:547,551`

**Current Interface** (Line 9-20):
```typescript
export interface SearchQuery {
  query: string;
  userId?: string;
  filters?: {
    category?: string[];
    dateRange?: { start: Date; end: Date };
    tags?: string[];
    jurisdiction?: string[];
  };
  limit?: number;
  offset?: number;
  // ❌ MISSING: sessionId
}
```

**Usage** (Line 547, 551):
```typescript
if (query.sessionId) {  // ❌ Property doesn't exist in interface
  await prisma.queryHistory.create({
    data: {
      queryHash,
      sessionId: query.sessionId,  // ❌ TypeScript error
      // ...
    }
  });
}
```

**Root Cause**: The `SearchQuery` interface was not updated when session tracking was implemented.

---

### Issue 4: Duplicate Summary Models

**Schema Contains TWO Summary Models**:

1. **LegalDocumentSummary** (Phase 3 - Lines 1494-1524):
```prisma
model LegalDocumentSummary {
  id                  String    @id @default(uuid())
  legalDocumentId     String    @map("legal_document_id")
  summaryType         String    @map("summary_type")
  summaryLevel        String    @map("summary_level")
  summaryText         String    @map("summary_text") @db.Text  // ⚠️ Note: summaryText
  sectionId           String?   @map("section_id")
  articleId           String?   @map("article_id")
  // ...
  legalDocument       LegalDocument @relation(fields: [legalDocumentId], references: [id])
  @@map("legal_document_summaries")
}
```

2. **DocumentSummary** (Phase 10 - Lines 2323-2339):
```prisma
model DocumentSummary {
  id            String        @id @default(uuid())
  documentId    String        @map("document_id")
  summaryType   String        @map("summary_type")
  summary       String        @db.Text  // ⚠️ Note: summary (different field name)
  keyPoints     Json?         @map("key_points")
  // ...
  document      LegalDocument @relation("DocumentSummaries", fields: [documentId], references: [id])
  @@map("document_summaries")
}
```

**Root Cause**: Two phases created different summary models with:
- Different table names (`legal_document_summaries` vs `document_summaries`)
- Different foreign key names (`legalDocumentId` vs `documentId`)
- Different summary field names (`summaryText` vs `summary`)
- Different relation names (unnamed vs `"DocumentSummaries"`)

---

## Complete Fix Strategy

### Step 1: Fix SearchQuery Interface

**File**: `src/services/orchestration/unified-search-orchestrator.ts`

**Change**:
```typescript
export interface SearchQuery {
  query: string;
  userId?: string;
  sessionId?: string;  // ✅ ADD THIS
  filters?: {
    category?: string[];
    dateRange?: { start: Date; end: Date };
    tags?: string[];
    jurisdiction?: string[];
  };
  limit?: number;
  offset?: number;
}
```

---

### Step 2: Fix Summary Field Reference (Choose ONE approach)

#### Option A: Use LegalDocumentSummary (Recommended for compatibility)

**File**: `src/services/orchestration/unified-search-orchestrator.ts:325-330`

```typescript
whereClause.OR = [
  { title: { contains: query, mode: 'insensitive' } },
  { content: { contains: query, mode: 'insensitive' } },
  {
    summaries: {  // ✅ Correct relation name
      some: {
        summaryText: { contains: query, mode: 'insensitive' }  // ✅ Correct field name
      }
    }
  }
];
```

#### Option B: Use DocumentSummary (Phase 10 model)

```typescript
whereClause.OR = [
  { title: { contains: query, mode: 'insensitive' } },
  { content: { contains: query, mode: 'insensitive' } },
  {
    documentSummaries: {  // ✅ Use Phase 10 relation
      some: {
        summary: { contains: query, mode: 'insensitive' }  // ✅ Correct field name for Phase 10
      }
    }
  }
];
```

**Recommendation**: Use **Option A** unless you plan to migrate all summary data to the new model.

---

### Step 3: Fix Embedding Query (Lines 465-473)

**Current Code**:
```typescript
const embeddings = await prisma.embedding.findMany({  // ❌ No such model
  where: {
    documentId: { in: documentIds }
  },
  select: {
    documentId: true,
    embedding: true
  }
});
```

**Corrected Code** (use LegalDocumentChunk embeddings):
```typescript
const chunks = await prisma.legalDocumentChunk.findMany({  // ✅ Use actual model
  where: {
    legalDocumentId: { in: documentIds }
  },
  select: {
    legalDocumentId: true,
    embedding: true
  }
});

// Create embedding lookup (aggregate chunks per document)
const embeddingMap = new Map<string, number[]>();
for (const chunk of chunks) {
  if (chunk.embedding && Array.isArray(chunk.embedding)) {
    // Take first chunk's embedding per document (or implement averaging)
    if (!embeddingMap.has(chunk.legalDocumentId)) {
      embeddingMap.set(chunk.legalDocumentId, chunk.embedding as number[]);
    }
  }
}
```

**Alternative** (use article embeddings):
```typescript
const articles = await prisma.legalDocumentArticle.findMany({
  where: {
    legalDocumentId: { in: documentIds }
  },
  select: {
    legalDocumentId: true,
    embedding: true
  }
});

// Aggregate article embeddings per document
const embeddingMap = new Map<string, number[]>();
for (const article of articles) {
  if (article.embedding && Array.isArray(article.embedding)) {
    if (!embeddingMap.has(article.legalDocumentId)) {
      embeddingMap.set(article.legalDocumentId, article.embedding as number[]);
    }
  }
}
```

---

### Step 4: Update embeddingMap Construction (Lines 476-481)

**Current Code**:
```typescript
const embeddingMap = new Map<string, number[]>();
for (const emb of embeddings) {
  if (emb.embedding && Array.isArray(emb.embedding)) {
    embeddingMap.set(emb.documentId, emb.embedding as number[]);  // ❌ Wrong property
  }
}
```

**Corrected Code** (for chunks):
```typescript
const embeddingMap = new Map<string, number[]>();
for (const chunk of chunks) {
  if (chunk.embedding && Array.isArray(chunk.embedding)) {
    if (!embeddingMap.has(chunk.legalDocumentId)) {  // ✅ Use legalDocumentId
      embeddingMap.set(chunk.legalDocumentId, chunk.embedding as number[]);
    }
  }
}
```

---

## Migration Plan (If Needed)

If you want to standardize on ONE summary model, here's the migration:

### Option 1: Keep LegalDocumentSummary (Recommended)

**Action**: Remove `DocumentSummary` model and its relation

**Schema Changes**:
```prisma
model LegalDocument {
  // REMOVE this line:
  // documentSummaries    DocumentSummary[]  @relation("DocumentSummaries")

  // KEEP this line:
  summaries            LegalDocumentSummary[]
}

// DELETE entire model:
// model DocumentSummary { ... }
```

### Option 2: Migrate to DocumentSummary (Phase 10)

**Action**: Migrate data and remove old model

**SQL Migration**:
```sql
-- Migrate data from old to new table
INSERT INTO document_summaries (
  id, document_id, summary_type, summary, key_points, generated_at, generated_by, version
)
SELECT
  id,
  legal_document_id,
  summary_type,
  summary_text,
  key_points,
  created_at,
  'ai',
  '1.0'
FROM legal_document_summaries;

-- Drop old table
DROP TABLE legal_document_summaries;
```

**Schema Changes**:
```prisma
model LegalDocument {
  // REMOVE this line:
  // summaries            LegalDocumentSummary[]

  // KEEP this line:
  documentSummaries    DocumentSummary[]  @relation("DocumentSummaries")
}

// DELETE model LegalDocumentSummary
```

---

## Implementation Steps

### Phase 1: Immediate Fixes (Required for search to work)

1. **Add sessionId to SearchQuery**:
   ```bash
   # File: src/services/orchestration/unified-search-orchestrator.ts
   # Line: 9-20 (interface)
   ```

2. **Fix summary field name**:
   ```bash
   # File: src/services/orchestration/unified-search-orchestrator.ts
   # Line: 327 - Change "summary" to "summaryText"
   ```

3. **Fix embedding query**:
   ```bash
   # File: src/services/orchestration/unified-search-orchestrator.ts
   # Lines: 465-481 - Replace with chunk-based query
   ```

### Phase 2: Schema Cleanup (Recommended but optional)

4. **Decide on ONE summary model** and remove the other

5. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

6. **Apply migration** if schema changed:
   ```bash
   npx prisma migrate dev --name fix_summary_model_duplication
   ```

---

## Testing Strategy

### Test 1: Interface Validation
```bash
npx tsc --noEmit src/services/orchestration/unified-search-orchestrator.ts
```
**Expected**: No TypeScript errors related to sessionId

### Test 2: Prisma Client Validation
```bash
npx prisma validate
```
**Expected**: Schema validation passes

### Test 3: Search Query Test
```typescript
import { getUnifiedSearchOrchestrator } from './src/services/orchestration/unified-search-orchestrator';

const orchestrator = getUnifiedSearchOrchestrator();

// Test with sessionId
const result = await orchestrator.search({
  query: "constitutional law",
  sessionId: "test-session-123",  // ✅ Should work now
  userId: "test-user-456"
});

console.log('Search results:', result.results.length);
console.log('NLP processing:', result.nlpProcessing);
```

### Test 4: Summary Search Test
```sql
-- Check which table has data
SELECT COUNT(*) FROM legal_document_summaries;
SELECT COUNT(*) FROM document_summaries;

-- Test summary search directly
SELECT ld.id, ld.norm_title, lds.summary_text
FROM legal_documents ld
JOIN legal_document_summaries lds ON lds.legal_document_id = ld.id
WHERE lds.summary_text ILIKE '%constitutional%'
LIMIT 5;
```

### Test 5: Embedding Retrieval Test
```typescript
// Test chunk embeddings
const chunks = await prisma.legalDocumentChunk.findMany({
  where: {
    embedding: { not: null }
  },
  select: {
    legalDocumentId: true,
    embedding: true
  },
  take: 5
});

console.log('Chunks with embeddings:', chunks.length);
```

---

## Code Changes Summary

### File 1: unified-search-orchestrator.ts

**Change 1 - Line 9-20**:
```typescript
export interface SearchQuery {
  query: string;
  userId?: string;
  sessionId?: string;  // ADD THIS LINE
  filters?: {
    category?: string[];
    dateRange?: { start: Date; end: Date };
    tags?: string[];
    jurisdiction?: string[];
  };
  limit?: number;
  offset?: number;
}
```

**Change 2 - Line 327**:
```typescript
// OLD:
summary: { contains: query, mode: 'insensitive' }

// NEW:
summaryText: { contains: query, mode: 'insensitive' }
```

**Change 3 - Lines 465-481** (replace entire rerankWithEmbedding method section):
```typescript
private async rerankWithEmbedding(
  queryEmbedding: number[],
  results: SearchResult[]
): Promise<SearchResult[]> {
  try {
    // Use LegalDocumentChunk embeddings (actual storage location)
    const documentIds = results.map(r => r.id);

    const chunks = await prisma.legalDocumentChunk.findMany({
      where: {
        legalDocumentId: { in: documentIds },
        embedding: { not: null }
      },
      select: {
        legalDocumentId: true,
        embedding: true
      }
    });

    // Create embedding lookup (use first chunk per document)
    const embeddingMap = new Map<string, number[]>();
    for (const chunk of chunks) {
      if (chunk.embedding && Array.isArray(chunk.embedding)) {
        if (!embeddingMap.has(chunk.legalDocumentId)) {
          embeddingMap.set(chunk.legalDocumentId, chunk.embedding as number[]);
        }
      }
    }

    // Calculate cosine similarity and re-rank
    const rankedResults = results.map(result => {
      const docEmbedding = embeddingMap.get(result.id);

      if (docEmbedding) {
        const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
        return {
          ...result,
          relevanceScore: similarity
        };
      }

      return result;
    });

    // Sort by relevance score (descending)
    rankedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return rankedResults;
  } catch (error) {
    console.error('Re-ranking error:', error);
    return results;
  }
}
```

---

## Risk Assessment

### High Risk Issues (MUST FIX):
1. ✅ Missing sessionId - TypeScript compilation fails
2. ✅ Wrong summary field - Database queries fail
3. ✅ Missing Embedding model - Runtime errors on search

### Medium Risk Issues (Should fix):
4. ⚠️ Duplicate summary models - Schema confusion

### Low Risk Issues (Optional):
5. ℹ️ Embedding aggregation strategy - May need optimization

---

## Verification Checklist

After applying fixes:

- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] Prisma schema validates: `npx prisma validate`
- [ ] Prisma client generates: `npx prisma generate`
- [ ] Search with sessionId works (integration test)
- [ ] Summary search returns results (database test)
- [ ] Embedding retrieval returns data (chunk test)
- [ ] RAG re-ranking works (full pipeline test)

---

## Additional Findings

### Other Type Errors Found:
1. **crypto import** (Line 4): `import crypto from 'crypto'` - Should use named import
2. **cache.set signature** (Lines 93, 119): Expects 2 args, getting 3
3. **intent type** (Line 674): GroupBy returns `JsonValue`, not `string`

These are separate from the schema mismatch but should be fixed together.

---

## Conclusion

The schema mismatch has **FOUR distinct root causes**:

1. **Incomplete interface** - sessionId missing from SearchQuery
2. **Wrong field name** - Using `summary` instead of `summaryText`
3. **Non-existent model** - Embedding model was never created
4. **Schema duplication** - Two conflicting summary models

All four issues must be fixed for the unified search orchestrator to function properly. The provided code changes are minimal, targeted, and preserve existing data.

**Priority**: CRITICAL - Core search functionality is broken without these fixes.

**Estimated Fix Time**: 30 minutes (code changes) + 10 minutes (testing) = 40 minutes total.
