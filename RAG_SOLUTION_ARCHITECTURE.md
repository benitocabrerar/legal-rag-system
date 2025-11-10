# Comprehensive RAG Solution Architecture for Legal Document System

## Executive Summary

The current RAG implementation has a critical limitation: it cannot answer metadata queries like "¿Cuántos artículos tiene la constitución de ecuador?" because it only implements basic chunk indexing (Strategy #1). This document outlines a multi-strategy RAG solution that combines document metadata extraction, hybrid search, intelligent query routing, and caching mechanisms.

## Current State Analysis

### Existing Implementation
- **Chunking**: ~500 word chunks with overlapping windows
- **Embeddings**: OpenAI text-embedding-ada-002
- **Search**: Cosine similarity on chunk embeddings
- **Retrieval**: Top-K (10-20) chunks
- **Generation**: GPT-4 with retrieved context

### Critical Gaps
1. No document metadata (article count, sections, structure)
2. No document summaries or table of contents
3. Single search strategy (vector similarity only)
4. No query type classification
5. No caching mechanism for common queries
6. No fallback strategies for failed queries

## Proposed Architecture

### ASCII Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Query Input                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Query Analysis & Routing                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Query Type   │  │ Intent       │  │ Entity Recognition       │ │
│  │ Classifier   │→ │ Analyzer     │→ │ (Articles, Laws, etc)    │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
└─────────────┬───────────────┬───────────────┬──────────────────────┘
              │               │               │
     Metadata Query    Content Query    Hybrid Query
              │               │               │
              ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Retrieval Strategies                          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               1. Metadata Search                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐  │  │
│  │  │  Document   │  │   Section   │  │  Article Index    │  │  │
│  │  │  Summaries  │  │    TOCs     │  │   & Structure     │  │  │
│  │  └─────────────┘  └─────────────┘  └────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               2. Semantic Search                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐  │  │
│  │  │   Chunk     │  │  Sub-chunk  │  │  Query-based      │  │  │
│  │  │  Embeddings │  │  Embeddings │  │   Embeddings      │  │  │
│  │  └─────────────┘  └─────────────┘  └────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               3. Hybrid Search                                │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐  │  │
│  │  │   BM25      │  │   Regex     │  │   Fuzzy Match     │  │  │
│  │  │  Keyword    │  │   Pattern   │  │    Search         │  │  │
│  │  └─────────────┘  └─────────────┘  └────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────┬───────────────┬───────────────┬──────────────────────┘
              │               │               │
              ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Reranking & Fusion                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Cross-      │  │  Relevance   │  │  Reciprocal Rank         │ │
│  │  Encoder     │→ │   Scoring    │→ │      Fusion              │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Context Assembly & Caching                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Redis       │  │  Context     │  │  Response                │ │
│  │  Cache       │← │  Builder     │→ │  Generation              │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Fallback & Verification                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Document    │  │  Answer      │  │  Source                  │ │
│  │  Re-analysis │→ │  Validation  │→ │  Attribution             │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Final Response                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Schema Extensions

### 1. Document Metadata Tables

```sql
-- Enhanced Legal Document model with metadata
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS
  total_articles INTEGER,
  total_sections INTEGER,
  total_chapters INTEGER,
  page_count INTEGER,
  word_count INTEGER,
  document_structure JSONB, -- Hierarchical structure
  table_of_contents JSONB, -- TOC with page/section refs
  summary_text TEXT,
  key_entities JSONB, -- Important entities mentioned
  cross_references JSONB, -- References to other laws
  last_analyzed_at TIMESTAMP,
  analysis_version VARCHAR(20);

-- Document sections for hierarchical navigation
CREATE TABLE IF NOT EXISTS legal_document_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  parent_section_id UUID REFERENCES legal_document_sections(id) ON DELETE CASCADE,
  section_type VARCHAR(50) NOT NULL, -- 'title', 'chapter', 'section', 'article', 'paragraph'
  section_number VARCHAR(50),
  section_title TEXT,
  content TEXT,
  start_page INTEGER,
  end_page INTEGER,
  word_count INTEGER,
  level INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL,
  metadata JSONB,
  embedding JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_document_sections (legal_document_id),
  INDEX idx_parent_section (parent_section_id),
  INDEX idx_section_type (section_type),
  INDEX idx_display_order (display_order)
);

-- Article index for fast article lookups
CREATE TABLE IF NOT EXISTS legal_document_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  article_number INTEGER NOT NULL,
  article_number_text VARCHAR(50), -- "100", "100-A", "Transitorio 1"
  article_title TEXT,
  article_content TEXT NOT NULL,
  chapter_id UUID REFERENCES legal_document_sections(id),
  section_id UUID REFERENCES legal_document_sections(id),
  word_count INTEGER,
  referenced_articles JSONB, -- Array of article references
  keywords JSONB, -- Extracted keywords
  embedding JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(legal_document_id, article_number_text),
  INDEX idx_document_articles (legal_document_id),
  INDEX idx_article_number (article_number),
  INDEX idx_chapter_section (chapter_id, section_id)
);

-- Document summaries at different granularities
CREATE TABLE IF NOT EXISTS legal_document_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  summary_type VARCHAR(50) NOT NULL, -- 'executive', 'chapter', 'section', 'technical'
  summary_level VARCHAR(50), -- 'document', 'chapter', 'section'
  reference_id UUID, -- ID of section/chapter if applicable
  summary_text TEXT NOT NULL,
  key_points JSONB,
  embedding JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_document_summaries (legal_document_id),
  INDEX idx_summary_type (summary_type),
  INDEX idx_summary_level (summary_level)
);

-- Query templates for common questions
CREATE TABLE IF NOT EXISTS query_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern VARCHAR(500) NOT NULL, -- Regex pattern for query matching
  query_type VARCHAR(50) NOT NULL, -- 'metadata', 'content', 'navigation', 'comparison'
  response_template TEXT,
  required_fields JSONB, -- Fields needed from document metadata
  priority INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_query_type (query_type),
  INDEX idx_priority (priority DESC)
);

-- Cache for frequently asked queries
CREATE TABLE IF NOT EXISTS query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash VARCHAR(64) NOT NULL, -- SHA256 of normalized query
  query_text TEXT NOT NULL,
  query_type VARCHAR(50),
  response_text TEXT NOT NULL,
  response_metadata JSONB,
  source_documents JSONB,
  hit_count INTEGER DEFAULT 1,
  ttl_seconds INTEGER DEFAULT 86400, -- 24 hours default
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(query_hash),
  INDEX idx_expires_at (expires_at),
  INDEX idx_hit_count (hit_count DESC)
);
```

## Document Analysis Pipeline

### Phase 1: Document Ingestion & Structure Extraction

```typescript
interface DocumentAnalysisPipeline {
  stages: {
    1: "Text Extraction & Cleaning"
    2: "Structure Detection"
    3: "Article & Section Extraction"
    4: "Metadata Generation"
    5: "Summary Creation"
    6: "Embedding Generation"
    7: "Cross-reference Analysis"
  }
}

class LegalDocumentAnalyzer {
  async analyzeDocument(documentId: string) {
    // 1. Extract hierarchical structure
    const structure = await this.extractStructure(document);

    // 2. Identify and extract articles
    const articles = await this.extractArticles(document);

    // 3. Generate table of contents
    const toc = await this.generateTableOfContents(structure);

    // 4. Create multi-level summaries
    const summaries = await this.generateSummaries(document, structure);

    // 5. Extract metadata
    const metadata = {
      totalArticles: articles.length,
      totalSections: structure.sections.length,
      totalChapters: structure.chapters.length,
      pageCount: document.pages,
      wordCount: document.words,
      keyEntities: await this.extractEntities(document),
      crossReferences: await this.extractReferences(document)
    };

    // 6. Generate specialized embeddings
    await this.generateEmbeddings({
      documentSummary: summaries.executive,
      chapters: structure.chapters,
      articles: articles,
      queries: await this.generatePotentialQueries(document)
    });

    return { structure, articles, toc, summaries, metadata };
  }

  private async extractArticles(document: Document): Promise<Article[]> {
    // Pattern matching for different article formats
    const patterns = [
      /Art(?:ículo|\.)\s*(\d+(?:-\w+)?)/gi,
      /Artículo\s+(\w+)/gi,
      /ARTÍCULO\s+(\d+)/gi,
      /Art\.\s*(\d+(?:\s*bis)?)/gi
    ];

    const articles = [];
    for (const pattern of patterns) {
      const matches = document.content.matchAll(pattern);
      for (const match of matches) {
        const article = await this.extractArticleContent(document, match);
        articles.push(article);
      }
    }

    return this.normalizeArticles(articles);
  }
}
```

## Query Router Logic

### Intelligent Query Classification & Routing

```typescript
interface QueryRouter {
  classifyQuery(query: string): QueryClassification;
  routeQuery(classification: QueryClassification): SearchStrategy[];
  executeFallback(query: string, failedStrategies: string[]): Response;
}

class IntelligentQueryRouter implements QueryRouter {
  private queryPatterns = {
    metadata: [
      /cuántos?\s+artículos?/i,
      /número\s+de\s+artículos?/i,
      /cantidad\s+de\s+artículos?/i,
      /total\s+de\s+artículos?/i,
      /estructura\s+de(?:l)?\s+/i,
      /índice\s+de\s+/i,
      /tabla\s+de\s+contenido/i,
      /capítulos?\s+de(?:l)?\s+/i,
      /secciones?\s+de(?:l)?\s+/i
    ],

    navigation: [
      /artículo\s+\d+/i,
      /art\.\s*\d+/i,
      /capítulo\s+\w+/i,
      /sección\s+\w+/i,
      /título\s+\w+/i
    ],

    content: [
      /qué\s+dice/i,
      /cómo\s+se\s+define/i,
      /cuáles?\s+son/i,
      /explica/i,
      /describe/i,
      /requisitos/i,
      /procedimiento/i
    ],

    comparison: [
      /diferencia\s+entre/i,
      /comparar/i,
      /versus/i,
      /mejor\s+que/i,
      /relación\s+entre/i
    ],

    summary: [
      /resumen/i,
      /resumir/i,
      /puntos?\s+principales?/i,
      /lo\s+más\s+importante/i,
      /síntesis/i
    ]
  };

  classifyQuery(query: string): QueryClassification {
    const normalizedQuery = query.toLowerCase().trim();
    const classification: QueryClassification = {
      type: 'unknown',
      confidence: 0,
      entities: [],
      intent: null,
      requiredStrategies: []
    };

    // Check each pattern type
    for (const [type, patterns] of Object.entries(this.queryPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedQuery)) {
          classification.type = type as QueryType;
          classification.confidence = 0.9;
          break;
        }
      }
      if (classification.type !== 'unknown') break;
    }

    // Extract entities (articles, laws, etc)
    classification.entities = this.extractEntities(normalizedQuery);

    // Determine required search strategies
    classification.requiredStrategies = this.determineStrategies(classification);

    return classification;
  }

  private determineStrategies(classification: QueryClassification): string[] {
    const strategies = [];

    switch (classification.type) {
      case 'metadata':
        strategies.push('metadata_search', 'document_summary');
        break;

      case 'navigation':
        strategies.push('article_index', 'section_search', 'toc_search');
        break;

      case 'content':
        strategies.push('semantic_search', 'hybrid_search', 'sub_chunk_search');
        break;

      case 'comparison':
        strategies.push('multi_doc_search', 'semantic_search', 'summary_search');
        break;

      case 'summary':
        strategies.push('summary_search', 'metadata_search');
        break;

      default:
        // Unknown queries use all strategies
        strategies.push('semantic_search', 'hybrid_search', 'metadata_search');
    }

    return strategies;
  }

  async routeQuery(classification: QueryClassification): Promise<SearchResult[]> {
    const results = [];

    // Check cache first
    const cached = await this.checkCache(classification.query);
    if (cached && cached.ttl > Date.now()) {
      return cached.results;
    }

    // Execute strategies in parallel
    const strategyPromises = classification.requiredStrategies.map(strategy =>
      this.executeStrategy(strategy, classification)
    );

    const strategyResults = await Promise.allSettled(strategyPromises);

    // Merge and rank results
    for (const result of strategyResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(...result.value);
      }
    }

    // Rerank using cross-encoder
    const rerankedResults = await this.rerankResults(results, classification.query);

    // Cache successful results
    if (rerankedResults.length > 0) {
      await this.cacheResults(classification.query, rerankedResults);
    }

    return rerankedResults;
  }

  async executeFallback(query: string, failedStrategies: string[]): Promise<Response> {
    console.log(`Executing fallback for query: ${query}`);
    console.log(`Failed strategies: ${failedStrategies.join(', ')}`);

    // Fallback 1: Re-analyze document structure
    const documents = await this.identifyRelevantDocuments(query);
    for (const doc of documents) {
      const reanalysis = await this.reanalyzeDocument(doc.id);
      if (reanalysis.success) {
        return await this.retryWithNewData(query, doc.id);
      }
    }

    // Fallback 2: Use GPT-4 to generate search queries
    const alternativeQueries = await this.generateAlternativeQueries(query);
    for (const altQuery of alternativeQueries) {
      const result = await this.routeQuery(this.classifyQuery(altQuery));
      if (result.length > 0) {
        return this.adaptResponse(result, query, altQuery);
      }
    }

    // Fallback 3: Direct document scan
    return await this.directDocumentScan(query, documents);
  }
}
```

## Implementation Plan

### Phase 1: Database & Schema Updates (Week 1)
**Priority: HIGH**
**Files to Modify:**
- `prisma/schema.prisma` - Add new models
- `prisma/migrations/` - Create migration files

```typescript
// prisma/schema.prisma additions
model LegalDocumentSection {
  id              String   @id @default(uuid())
  legalDocumentId String   @map("legal_document_id")
  parentSectionId String?  @map("parent_section_id")
  sectionType     String   @map("section_type")
  sectionNumber   String?  @map("section_number")
  sectionTitle    String?  @map("section_title")
  content         String   @db.Text
  startPage       Int?     @map("start_page")
  endPage         Int?     @map("end_page")
  wordCount       Int?     @map("word_count")
  level           Int      @default(0)
  displayOrder    Int      @map("display_order")
  metadata        Json?
  embedding       Json?
  createdAt       DateTime @default(now()) @map("created_at")

  legalDocument   LegalDocument @relation(fields: [legalDocumentId], references: [id], onDelete: Cascade)
  parentSection   LegalDocumentSection? @relation("SectionHierarchy", fields: [parentSectionId], references: [id])
  childSections   LegalDocumentSection[] @relation("SectionHierarchy")

  @@index([legalDocumentId])
  @@index([parentSectionId])
  @@index([sectionType])
  @@map("legal_document_sections")
}

model LegalDocumentArticle {
  id                 String   @id @default(uuid())
  legalDocumentId    String   @map("legal_document_id")
  articleNumber      Int      @map("article_number")
  articleNumberText  String   @map("article_number_text")
  articleTitle       String?  @map("article_title")
  articleContent     String   @db.Text @map("article_content")
  chapterId          String?  @map("chapter_id")
  sectionId          String?  @map("section_id")
  wordCount          Int?     @map("word_count")
  referencedArticles Json?    @map("referenced_articles")
  keywords           Json?
  embedding          Json?
  createdAt          DateTime @default(now()) @map("created_at")

  legalDocument      LegalDocument @relation(fields: [legalDocumentId], references: [id], onDelete: Cascade)

  @@unique([legalDocumentId, articleNumberText])
  @@index([legalDocumentId])
  @@index([articleNumber])
  @@map("legal_document_articles")
}

model QueryCache {
  id               String   @id @default(uuid())
  queryHash        String   @unique @map("query_hash")
  queryText        String   @db.Text @map("query_text")
  queryType        String?  @map("query_type")
  responseText     String   @db.Text @map("response_text")
  responseMetadata Json?    @map("response_metadata")
  sourceDocuments  Json?    @map("source_documents")
  hitCount         Int      @default(1) @map("hit_count")
  ttlSeconds       Int      @default(86400) @map("ttl_seconds")
  expiresAt        DateTime @map("expires_at")
  createdAt        DateTime @default(now()) @map("created_at")
  lastAccessedAt   DateTime @default(now()) @map("last_accessed_at")

  @@index([expiresAt])
  @@index([hitCount(sort: Desc)])
  @@map("query_cache")
}
```

### Phase 2: Document Analysis Service (Week 1-2)
**Priority: HIGH**
**New Files:**
- `src/services/documentAnalyzer.ts`
- `src/services/structureExtractor.ts`
- `src/services/summaryGenerator.ts`

```typescript
// src/services/documentAnalyzer.ts
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';

export class DocumentAnalyzer {
  constructor(
    private prisma: PrismaClient,
    private openai: OpenAI
  ) {}

  async analyzeDocument(documentId: string) {
    const document = await this.prisma.legalDocument.findUnique({
      where: { id: documentId }
    });

    if (!document) throw new Error('Document not found');

    // Extract structure
    const structure = await this.extractStructure(document.content);

    // Extract articles
    const articles = await this.extractArticles(document.content, structure);

    // Generate summaries
    const summaries = await this.generateSummaries(document, structure);

    // Update document metadata
    await this.prisma.legalDocument.update({
      where: { id: documentId },
      data: {
        totalArticles: articles.length,
        totalSections: structure.sections.length,
        totalChapters: structure.chapters.length,
        documentStructure: structure,
        tableOfContents: this.generateTOC(structure),
        summaryText: summaries.executive,
        lastAnalyzedAt: new Date(),
        analysisVersion: '2.0'
      }
    });

    // Save articles
    await this.saveArticles(documentId, articles);

    // Save sections
    await this.saveSections(documentId, structure);

    // Save summaries
    await this.saveSummaries(documentId, summaries);

    return {
      success: true,
      metadata: {
        articlesExtracted: articles.length,
        sectionsExtracted: structure.sections.length,
        summariesGenerated: Object.keys(summaries).length
      }
    };
  }

  private async extractStructure(content: string) {
    // Use regex patterns to identify structure
    const structurePatterns = {
      title: /^TÍTULO\s+([IVXLCDM]+|\d+)[:\s]*(.*?)$/gmi,
      chapter: /^CAPÍTULO\s+([IVXLCDM]+|\d+)[:\s]*(.*?)$/gmi,
      section: /^SECCIÓN\s+([IVXLCDM]+|\d+)[:\s]*(.*?)$/gmi,
      article: /^Art(?:ículo|\.)\s*(\d+(?:-\w+)?)[:\s.-]*(.*?)$/gmi
    };

    const structure = {
      titles: [],
      chapters: [],
      sections: [],
      articles: []
    };

    for (const [type, pattern] of Object.entries(structurePatterns)) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        structure[type + 's'].push({
          type,
          number: match[1],
          title: match[2]?.trim() || '',
          position: match.index,
          content: this.extractSectionContent(content, match.index)
        });
      }
    }

    return this.buildHierarchy(structure);
  }
}
```

### Phase 3: Query Router Implementation (Week 2)
**Priority: HIGH**
**Files to Modify:**
- `src/routes/query.ts` - Integrate new router
**New Files:**
- `src/services/queryRouter.ts`
- `src/services/queryClassifier.ts`

```typescript
// src/services/queryRouter.ts
import { QueryClassifier } from './queryClassifier';
import { SearchStrategies } from './searchStrategies';

export class QueryRouter {
  constructor(
    private classifier: QueryClassifier,
    private strategies: SearchStrategies,
    private cache: QueryCache
  ) {}

  async route(query: string, caseId: string) {
    // Check cache first
    const cached = await this.cache.get(query);
    if (cached) return cached;

    // Classify query
    const classification = await this.classifier.classify(query);

    // Route based on classification
    switch (classification.type) {
      case 'metadata':
        return await this.handleMetadataQuery(query, classification);

      case 'navigation':
        return await this.handleNavigationQuery(query, classification);

      case 'content':
        return await this.handleContentQuery(query, classification);

      case 'summary':
        return await this.handleSummaryQuery(query, classification);

      default:
        return await this.handleHybridQuery(query, classification);
    }
  }

  private async handleMetadataQuery(query: string, classification: QueryClassification) {
    // Example: "¿Cuántos artículos tiene la constitución?"
    const document = await this.identifyDocument(classification.entities);

    if (document && document.totalArticles) {
      return {
        answer: `La ${document.normTitle} tiene ${document.totalArticles} artículos.`,
        sources: [{
          documentId: document.id,
          documentTitle: document.normTitle,
          metadata: {
            totalArticles: document.totalArticles,
            totalChapters: document.totalChapters,
            totalSections: document.totalSections
          }
        }],
        confidence: 1.0,
        fromCache: false
      };
    }

    // Fallback to document analysis
    return await this.fallbackAnalysis(query, document);
  }
}
```

### Phase 4: Advanced Search Strategies (Week 2-3)
**Priority: MEDIUM**
**New Files:**
- `src/services/search/hybridSearch.ts`
- `src/services/search/reranker.ts`
- `src/services/search/queryExpansion.ts`

```typescript
// src/services/search/hybridSearch.ts
export class HybridSearch {
  async search(query: string, documents: any[]) {
    // Parallel search strategies
    const [
      semanticResults,
      keywordResults,
      metadataResults
    ] = await Promise.all([
      this.semanticSearch(query, documents),
      this.keywordSearch(query, documents),
      this.metadataSearch(query, documents)
    ]);

    // Reciprocal Rank Fusion
    return this.fuseResults([
      { results: semanticResults, weight: 0.5 },
      { results: keywordResults, weight: 0.3 },
      { results: metadataResults, weight: 0.2 }
    ]);
  }

  private fuseResults(resultSets: ResultSet[]) {
    const fusedScores = new Map();

    for (const { results, weight } of resultSets) {
      results.forEach((result, rank) => {
        const reciprocalRank = 1 / (rank + 60);
        const currentScore = fusedScores.get(result.id) || 0;
        fusedScores.set(result.id, currentScore + (reciprocalRank * weight));
      });
    }

    return Array.from(fusedScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, score]) => ({ id, score }));
  }
}
```

### Phase 5: Caching Layer (Week 3)
**Priority: MEDIUM**
**New Files:**
- `src/services/cache/redisCache.ts`
- `src/services/cache/queryCache.ts`

```typescript
// src/services/cache/redisCache.ts
import Redis from 'ioredis';
import crypto from 'crypto';

export class QueryCache {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
  }

  async get(query: string): Promise<CachedResult | null> {
    const hash = this.hashQuery(query);
    const cached = await this.redis.get(`query:${hash}`);

    if (cached) {
      const result = JSON.parse(cached);
      // Increment hit counter
      await this.redis.incr(`query:${hash}:hits`);
      return result;
    }

    return null;
  }

  async set(query: string, result: any, ttl: number = 86400) {
    const hash = this.hashQuery(query);
    await this.redis.setex(
      `query:${hash}`,
      ttl,
      JSON.stringify(result)
    );

    // Store in database for persistence
    await this.persistToDatabase(query, result, ttl);
  }

  private hashQuery(query: string): string {
    const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
}
```

### Phase 6: Fallback Mechanisms (Week 3-4)
**Priority: LOW**
**New Files:**
- `src/services/fallback/documentReanalyzer.ts`
- `src/services/fallback/adaptiveRetrieval.ts`

## Key Components Implementation

### 1. Multi-Strategy Indexing

```typescript
// Implementation of the 4 RAG strategies
class MultiStrategyIndexer {
  // Strategy 1: Chunk Indexing (Current)
  async indexChunks(document: Document) {
    const chunks = this.splitIntoChunks(document.content, 500);
    return await this.generateEmbeddings(chunks);
  }

  // Strategy 2: Sub-chunk Indexing
  async indexSubChunks(document: Document) {
    const chunks = this.splitIntoChunks(document.content, 500);
    const subChunks = [];

    for (const chunk of chunks) {
      const sentences = this.splitIntoSentences(chunk);
      subChunks.push(...sentences);
    }

    return await this.generateEmbeddings(subChunks);
  }

  // Strategy 3: Query-based Indexing
  async indexByQueries(document: Document) {
    const potentialQueries = await this.generatePotentialQueries(document);
    const queryEmbeddings = await this.generateEmbeddings(potentialQueries);

    return queryEmbeddings.map((embedding, i) => ({
      query: potentialQueries[i],
      embedding,
      documentId: document.id,
      relevantChunks: this.mapQueryToChunks(potentialQueries[i], document)
    }));
  }

  // Strategy 4: Summary Indexing
  async indexBySummaries(document: Document) {
    const summaries = {
      executive: await this.generateExecutiveSummary(document),
      chapters: await this.generateChapterSummaries(document),
      sections: await this.generateSectionSummaries(document)
    };

    return await this.generateEmbeddings(Object.values(summaries).flat());
  }
}
```

### 2. Query Enhancement Pipeline

```typescript
class QueryEnhancer {
  async enhance(query: string) {
    return {
      original: query,
      normalized: this.normalize(query),
      expanded: await this.expand(query),
      translated: await this.translateTerms(query),
      entities: this.extractEntities(query),
      intent: await this.detectIntent(query)
    };
  }

  private async expand(query: string) {
    // Use GPT-4 to generate query variations
    const prompt = `Generate 3 alternative phrasings for this legal query:
      Query: ${query}

      Alternative phrasings:`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200
    });

    return this.parseAlternatives(response.choices[0].message.content);
  }
}
```

## Testing Strategy

### Unit Tests
```typescript
// src/services/__tests__/documentAnalyzer.test.ts
describe('DocumentAnalyzer', () => {
  it('should extract correct number of articles', async () => {
    const analyzer = new DocumentAnalyzer(prisma, openai);
    const result = await analyzer.analyzeDocument(testDocumentId);
    expect(result.metadata.articlesExtracted).toBe(444); // Constitution example
  });

  it('should generate accurate TOC', async () => {
    const toc = await analyzer.generateTableOfContents(testDocument);
    expect(toc.titles).toHaveLength(9);
    expect(toc.chapters).toHaveLength(15);
  });
});
```

### Integration Tests
```typescript
// src/routes/__tests__/query.integration.test.ts
describe('Query Router Integration', () => {
  it('should answer metadata queries correctly', async () => {
    const response = await request(app)
      .post('/query')
      .send({
        caseId: testCaseId,
        query: '¿Cuántos artículos tiene la constitución de ecuador?'
      });

    expect(response.body.answer).toContain('444 artículos');
  });
});
```

## Performance Optimizations

1. **Parallel Processing**: Execute multiple search strategies concurrently
2. **Caching**: Redis for frequent queries, PostgreSQL for persistent cache
3. **Lazy Loading**: Load document sections on-demand
4. **Batch Processing**: Process multiple documents in parallel
5. **Index Optimization**: Create appropriate database indexes
6. **Connection Pooling**: Optimize database connections

## Monitoring & Analytics

```typescript
// src/services/monitoring/queryAnalytics.ts
class QueryAnalytics {
  async trackQuery(query: string, result: any) {
    await this.prisma.queryLog.create({
      data: {
        query,
        queryType: result.classification.type,
        responseTime: result.responseTime,
        documentsFound: result.sources.length,
        tokensUsed: result.tokensUsed,
        success: result.success,
        cacheHit: result.fromCache,
        strategies: result.strategiesUsed,
        confidence: result.confidence
      }
    });
  }

  async getMetrics() {
    return {
      avgResponseTime: await this.getAverageResponseTime(),
      cacheHitRate: await this.getCacheHitRate(),
      queryTypeDistribution: await this.getQueryTypeDistribution(),
      failureRate: await this.getFailureRate()
    };
  }
}
```

## Deployment Strategy

### Phase 1: Development (Week 1-2)
- Set up development environment
- Implement database schema changes
- Create document analyzer service

### Phase 2: Testing (Week 3)
- Unit testing
- Integration testing
- Load testing

### Phase 3: Staging (Week 4)
- Deploy to staging environment
- Test with real documents
- Performance tuning

### Phase 4: Production (Week 5)
- Gradual rollout
- Monitor performance
- Collect user feedback

## Success Metrics

1. **Query Success Rate**: Target 95%+ for metadata queries
2. **Response Time**: < 2 seconds for cached, < 5 seconds for uncached
3. **Cache Hit Rate**: Target 40%+ after warm-up
4. **User Satisfaction**: Measure via feedback and query reformulation rate
5. **System Reliability**: 99.9% uptime

## Next Steps

1. **Immediate Actions** (This Week):
   - Create database migration scripts
   - Implement DocumentAnalyzer class
   - Set up Redis cache

2. **Short-term** (Next 2 Weeks):
   - Implement query router
   - Add hybrid search capabilities
   - Create fallback mechanisms

3. **Long-term** (Month 2):
   - Optimize performance
   - Add advanced features (cross-document search)
   - Implement monitoring dashboard