# RAG System Documentation - Legal RAG System

## RAG Overview

**RAG (Retrieval-Augmented Generation)** combines information retrieval with AI text generation to provide accurate, context-aware answers based on a knowledge base.

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    RAG Query Pipeline                        │
└─────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
    ┌─────────────┐   ┌──────────────┐   ┌─────────────┐
    │  Document   │   │   Vector     │   │    GPT-4    │
    │  Chunking   │   │  Embeddings  │   │  Generator  │
    └─────────────┘   └──────────────┘   └─────────────┘
```

## Document Processing Pipeline

### 1. Document Upload & Text Extraction

**Supported Formats**:
- PDF (`.pdf`)
- Word Documents (`.docx`)
- Plain Text (`.txt`)

**Processing Flow**:
```typescript
async function processDocument(file: File) {
  // 1. Extract text based on file type
  const text = await extractText(file);

  // 2. Clean and normalize text
  const cleanedText = normalizeText(text);

  // 3. Split into chunks
  const chunks = chunkText(cleanedText, {
    maxChunkSize: 1000,
    overlap: 100
  });

  // 4. Generate embeddings
  const embeddings = await generateEmbeddings(chunks);

  // 5. Save to database
  await saveDocument(text, chunks, embeddings);
}
```

### 2. Text Chunking Strategy

**Configuration**:
- **Chunk Size**: 1000 characters (optimal for embedding quality)
- **Overlap**: 100 characters (maintains context between chunks)
- **Splitting**: Sentence boundaries when possible

**Algorithm**:
```typescript
function chunkText(text: string, options: ChunkOptions): string[] {
  const { maxChunkSize, overlap } = options;
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + maxChunkSize;

    // Try to split at sentence boundary
    if (endIndex < text.length) {
      const sentenceEnd = text.lastIndexOf('.', endIndex);
      if (sentenceEnd > startIndex + maxChunkSize * 0.7) {
        endIndex = sentenceEnd + 1;
      }
    }

    const chunk = text.substring(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    startIndex = endIndex - overlap;
  }

  return chunks;
}
```

**Example**:
```
Original Text (2500 chars)
  │
  ├─► Chunk 0: chars 0-1000
  ├─► Chunk 1: chars 900-1900  (100 char overlap)
  └─► Chunk 2: chars 1800-2500 (100 char overlap)
```

### 3. Embedding Generation

**Model**: OpenAI `text-embedding-ada-002`
- **Dimensions**: 1536
- **Cost**: $0.0001 per 1K tokens
- **Max Input**: 8,191 tokens

**Generation Process**:
```typescript
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (const chunk of chunks) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: chunk,
    });

    embeddings.push(response.data[0].embedding);
  }

  return embeddings;
}
```

**Embedding Structure**:
```json
{
  "embedding": [
    0.0023064255,
    -0.009327292,
    0.015797348,
    // ... 1,533 more values
    -0.0028842222
  ],
  "dimensions": 1536
}
```

## Query Processing Pipeline

### 1. Query Embedding

**Input**: Natural language question
**Output**: 1536-dimensional vector

```typescript
async function embedQuery(query: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });

  return response.data[0].embedding;
}
```

**Example**:
```
Query: "What are the payment terms?"
  ↓
Embedding: [0.0123, -0.0456, 0.0789, ..., 0.0234]
```

### 2. Vector Similarity Search

**Algorithm**: Cosine Similarity

**Formula**:
```
similarity = (A · B) / (||A|| × ||B||)

Where:
- A · B = dot product of vectors A and B
- ||A|| = magnitude (norm) of vector A
- ||B|| = magnitude (norm) of vector B
```

**Implementation**:
```typescript
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
```

**Similarity Score Interpretation**:
- **1.0**: Identical vectors
- **0.8-0.99**: Highly similar
- **0.6-0.79**: Moderately similar
- **0.4-0.59**: Somewhat similar
- **< 0.4**: Low similarity

### 3. Retrieval Process

**Steps**:
1. Embed user query
2. Fetch all document chunks for the case
3. Calculate similarity score for each chunk
4. Sort by similarity (descending)
5. Return top K chunks (default K=5)

```typescript
async function retrieveRelevantChunks(
  caseId: string,
  queryEmbedding: number[],
  maxResults: number = 5
): Promise<Chunk[]> {
  // Fetch all chunks for the case
  const allChunks = await prisma.documentChunk.findMany({
    where: {
      document: {
        caseId: caseId,
      },
    },
    include: {
      document: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  // Calculate similarity scores
  const chunksWithScores = allChunks.map((chunk) => {
    const embedding = chunk.embedding as number[];
    const similarity = cosineSimilarity(queryEmbedding, embedding);
    return {
      ...chunk,
      similarity,
    };
  });

  // Sort and take top results
  return chunksWithScores
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
}
```

**Example Result**:
```json
[
  {
    "id": "chunk-1",
    "content": "Payment terms: Net 30 days from invoice date...",
    "similarity": 0.89,
    "documentTitle": "Service Agreement"
  },
  {
    "id": "chunk-5",
    "content": "All payments shall be made by wire transfer...",
    "similarity": 0.82,
    "documentTitle": "Service Agreement"
  },
  {
    "id": "chunk-12",
    "content": "Late payment penalty: 1.5% per month...",
    "similarity": 0.75,
    "documentTitle": "Payment Policy"
  }
]
```

### 4. Context Building

**Purpose**: Prepare retrieved chunks for GPT-4 consumption

```typescript
function buildContext(chunks: Chunk[]): string {
  return chunks
    .map((chunk, index) => {
      return `[Document: ${chunk.document.title}, Chunk ${chunk.chunkIndex + 1}]
${chunk.content}`;
    })
    .join('\n\n---\n\n');
}
```

**Example Context**:
```
[Document: Service Agreement, Chunk 3]
Payment terms: Net 30 days from invoice date. All invoices must be paid within thirty (30) days of the invoice date. Payments shall be made by wire transfer to the account specified in Exhibit A.

---

[Document: Service Agreement, Chunk 5]
All payments shall be made by wire transfer to the following account: Bank of America, Account #123456789, Routing #987654321. Check payments are not accepted.

---

[Document: Payment Policy, Chunk 12]
Late payment penalty: A late fee of one and one-half percent (1.5%) per month will be applied to all overdue amounts. Interest accrues from the original due date.
```

### 5. Answer Generation with GPT-4

**Model**: `gpt-4`
**Configuration**:
- **Temperature**: 0.3 (deterministic, factual)
- **Max Tokens**: 1500
- **Top P**: 1.0

```typescript
async function generateAnswer(
  query: string,
  context: string
): Promise<string> {
  const systemPrompt = `You are a legal assistant helping with case analysis.
You have access to relevant documents from the case files.
Use the provided context to answer the user's question accurately.
If the context doesn't contain enough information to answer the question, say so clearly.
Always cite which documents you're referencing in your answer.`;

  const userPrompt = `Context from case documents:

${context}

---

Question: ${query}

Please provide a detailed answer based on the context above.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 1500,
  });

  return completion.choices[0].message.content || '';
}
```

**Example Response**:
```
Based on the Service Agreement and Payment Policy documents, the payment terms are as follows:

1. **Due Date**: Net 30 days from invoice date (Service Agreement, Chunk 3)

2. **Payment Method**: All payments must be made by wire transfer to:
   - Bank of America
   - Account #123456789
   - Routing #987654321
   (Service Agreement, Chunk 5)

3. **Late Payments**: A penalty of 1.5% per month applies to overdue amounts, accruing from the original due date (Payment Policy, Chunk 12)

Note that check payments are not accepted according to the Service Agreement.
```

## Complete RAG Flow

### Full Implementation

```typescript
// src/routes/query.ts
export async function ragQuery(
  caseId: string,
  query: string,
  userId: string,
  maxResults: number = 5
) {
  // 1. Verify case ownership
  const caseDoc = await prisma.case.findFirst({
    where: { id: caseId, userId },
  });

  if (!caseDoc) {
    throw new Error('Case not found');
  }

  // 2. Generate query embedding
  const queryEmbeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });

  const queryEmbedding = queryEmbeddingResponse.data[0].embedding;

  // 3. Retrieve similar chunks
  const topChunks = await retrieveRelevantChunks(
    caseId,
    queryEmbedding,
    maxResults
  );

  // 4. Build context
  const context = buildContext(topChunks);

  // 5. Generate answer
  const answer = await generateAnswer(query, context);

  // 6. Format sources
  const sources = topChunks.map((chunk) => ({
    documentId: chunk.document.id,
    documentTitle: chunk.document.title,
    chunkIndex: chunk.chunkIndex,
    similarity: chunk.similarity,
    content: chunk.content.substring(0, 200) + '...',
  }));

  return {
    answer,
    sources,
    query,
    caseId,
  };
}
```

## Performance Metrics

### Latency Breakdown

```
Total Query Time: ~5-8 seconds

┌────────────────────────┬────────┐
│ Embedding Generation   │ ~1s    │
├────────────────────────┼────────┤
│ Vector Search          │ ~0.5s  │
├────────────────────────┼────────┤
│ Context Building       │ ~0.1s  │
├────────────────────────┼────────┤
│ GPT-4 Generation       │ ~3-6s  │
└────────────────────────┴────────┘
```

### Cost Analysis

**Per Query**:
- Embedding: $0.0001 (1K tokens avg)
- GPT-4: $0.015-0.03 (500-1000 tokens avg)
- **Total**: ~$0.015-0.03 per query

**Per Document Upload** (10 page document):
- Text extraction: Free
- Chunking: Free
- Embeddings (10 chunks): $0.001
- Storage: Negligible
- **Total**: ~$0.001 per document

### Accuracy Metrics

**Target Metrics**:
- **Relevance**: 85%+ (top-5 chunks contain answer)
- **Precision**: 90%+ (answer factually correct)
- **Recall**: 80%+ (answer complete)
- **Citation Accuracy**: 95%+ (sources correctly cited)

## Optimization Strategies

### 1. Caching

```typescript
// Cache query embeddings
const embeddingCache = new Map<string, number[]>();

async function getQueryEmbedding(query: string): Promise<number[]> {
  if (embeddingCache.has(query)) {
    return embeddingCache.get(query)!;
  }

  const embedding = await embedQuery(query);
  embeddingCache.set(query, embedding);
  return embedding;
}
```

### 2. Batch Processing

```typescript
// Generate multiple embeddings in one API call
async function batchEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: texts, // Array of texts
  });

  return response.data.map(d => d.embedding);
}
```

### 3. Database Optimization

**Future Enhancement**: Use pgvector extension for native vector search

```sql
-- Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column
ALTER TABLE document_chunks
ADD COLUMN embedding vector(1536);

-- Create HNSW index for fast similarity search
CREATE INDEX ON document_chunks
USING hnsw (embedding vector_cosine_ops);

-- Query with native vector operations
SELECT * FROM document_chunks
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

**Performance Improvement**:
- Current: O(n) linear scan
- With pgvector: O(log n) indexed search
- Speedup: 10-100x for large datasets

### 4. Hybrid Search

**Combine semantic + keyword search**:

```typescript
async function hybridSearch(
  query: string,
  caseId: string
): Promise<Chunk[]> {
  // 1. Semantic search (vector similarity)
  const semanticResults = await vectorSearch(query, caseId);

  // 2. Keyword search (full-text search)
  const keywordResults = await fullTextSearch(query, caseId);

  // 3. Merge and re-rank
  return mergeResults(semanticResults, keywordResults);
}
```

## Limitations & Future Improvements

### Current Limitations

1. **Vector Search Performance**: O(n) linear scan
2. **No Query History**: Queries not persisted
3. **Single Case Scope**: Can't search across cases
4. **No Multi-modal**: Text only (no images/tables)
5. **Fixed Chunk Size**: 1000 chars (not adaptive)

### Planned Enhancements

1. **pgvector Integration**: Fast native vector search
2. **Query History**: Save and display past queries
3. **Cross-Case Search**: Search all user's cases
4. **OCR Support**: Extract text from images/scans
5. **Adaptive Chunking**: Dynamic chunk sizes based on content
6. **Reranking**: Use cross-encoder for better relevance
7. **Streaming Responses**: Real-time answer streaming
8. **Multi-document Queries**: Ask about multiple cases

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Classification**: Technical Documentation
