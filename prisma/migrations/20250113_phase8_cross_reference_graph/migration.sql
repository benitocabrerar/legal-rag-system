-- Phase 8: Cross-Reference Graph
-- Database migration for citation tracking and PageRank implementation

-- ============================================================================
-- 1. Document Citations Table
-- Tracks all citations between legal documents
-- ============================================================================
CREATE TABLE "document_citations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "source_document_id" TEXT NOT NULL,
  "target_document_id" TEXT,

  -- Citation details
  "citation_text" TEXT,
  "citation_context" TEXT,
  "article_reference" TEXT,
  "section_reference" TEXT,

  -- Citation type and strength
  "citation_type" TEXT NOT NULL DEFAULT 'reference', -- reference, amendment, repeal, supersedes, implements, judicial_precedent
  "citation_strength" REAL NOT NULL DEFAULT 1.0,
  "confidence_score" REAL,

  -- Extraction metadata
  "extracted_by" TEXT NOT NULL DEFAULT 'automatic', -- automatic, manual, ai_assisted
  "extraction_method" TEXT,
  "is_validated" BOOLEAN NOT NULL DEFAULT false,
  "validated_by" TEXT,
  "validated_at" TIMESTAMP,
  "validation_notes" TEXT,

  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys
  CONSTRAINT "document_citations_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "document_citations_target_document_id_fkey" FOREIGN KEY ("target_document_id") REFERENCES "legal_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================================================
-- 2. Document Relationships Table
-- Tracks various types of relationships between legal documents
-- ============================================================================
CREATE TABLE "document_relationships" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "source_document_id" TEXT NOT NULL,
  "target_document_id" TEXT NOT NULL,

  -- Relationship details
  "relationship_type" TEXT NOT NULL, -- supersedes, amends, implements, related_to, precedent, consolidates
  "relationship_strength" REAL NOT NULL DEFAULT 1.0,
  "description" TEXT,

  -- Temporal information
  "effective_date" TIMESTAMP,
  "end_date" TIMESTAMP,
  "is_active" BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  "metadata" JSONB,
  "created_by" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys
  CONSTRAINT "document_relationships_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "document_relationships_target_document_id_fkey" FOREIGN KEY ("target_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- 3. Document Authority Scores Table
-- Stores PageRank and other authority metrics
-- ============================================================================
CREATE TABLE "document_authority_scores" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "document_id" TEXT NOT NULL UNIQUE,

  -- PageRank scores
  "pagerank_score" REAL NOT NULL DEFAULT 0.15,
  "weighted_pagerank" REAL NOT NULL DEFAULT 0.15,
  "personalized_pagerank" REAL,

  -- Other authority metrics
  "citation_count" INTEGER NOT NULL DEFAULT 0,
  "citation_in_count" INTEGER NOT NULL DEFAULT 0,
  "citation_out_count" INTEGER NOT NULL DEFAULT 0,
  "h_index" INTEGER NOT NULL DEFAULT 0,

  -- Impact metrics
  "impact_score" REAL,
  "recency_factor" REAL,
  "combined_authority" REAL,

  -- Calculation metadata
  "last_calculated" TIMESTAMP,
  "calculation_version" TEXT,
  "convergence_iterations" INTEGER,

  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key
  CONSTRAINT "document_authority_scores_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- 4. Citation Extraction Jobs Table
-- Queue for processing documents to extract citations
-- ============================================================================
CREATE TABLE "citation_extraction_jobs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "document_id" TEXT NOT NULL,

  -- Job details
  "status" TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  "priority" INTEGER NOT NULL DEFAULT 5,
  "extraction_method" TEXT NOT NULL DEFAULT 'regex', -- regex, nlp, hybrid, manual

  -- Results
  "citations_found" INTEGER DEFAULT 0,
  "citations_validated" INTEGER DEFAULT 0,
  "processing_time_ms" INTEGER,
  "error_message" TEXT,

  -- Job metadata
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "started_at" TIMESTAMP,
  "completed_at" TIMESTAMP,
  "failed_at" TIMESTAMP,

  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key
  CONSTRAINT "citation_extraction_jobs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- 5. PageRank Calculation Logs Table
-- Tracks PageRank calculation runs
-- ============================================================================
CREATE TABLE "pagerank_calculation_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,

  -- Calculation parameters
  "damping_factor" REAL NOT NULL DEFAULT 0.85,
  "max_iterations" INTEGER NOT NULL DEFAULT 100,
  "convergence_threshold" REAL NOT NULL DEFAULT 0.0001,

  -- Results
  "documents_processed" INTEGER NOT NULL DEFAULT 0,
  "iterations_run" INTEGER,
  "converged" BOOLEAN NOT NULL DEFAULT false,
  "avg_pagerank" REAL,
  "max_pagerank" REAL,
  "min_pagerank" REAL,

  -- Performance
  "processing_time_ms" INTEGER,
  "calculation_method" TEXT DEFAULT 'iterative', -- iterative, power_iteration, monte_carlo

  -- Metadata
  "triggered_by" TEXT,
  "notes" TEXT,

  "started_at" TIMESTAMP NOT NULL,
  "completed_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Document Citations Indexes
CREATE INDEX "document_citations_source_document_id_idx" ON "document_citations"("source_document_id");
CREATE INDEX "document_citations_target_document_id_idx" ON "document_citations"("target_document_id");
CREATE INDEX "document_citations_citation_type_idx" ON "document_citations"("citation_type");
CREATE INDEX "document_citations_is_validated_idx" ON "document_citations"("is_validated");
CREATE INDEX "document_citations_created_at_idx" ON "document_citations"("created_at" DESC);

-- Document Relationships Indexes
CREATE INDEX "document_relationships_source_document_id_idx" ON "document_relationships"("source_document_id");
CREATE INDEX "document_relationships_target_document_id_idx" ON "document_relationships"("target_document_id");
CREATE INDEX "document_relationships_relationship_type_idx" ON "document_relationships"("relationship_type");
CREATE INDEX "document_relationships_is_active_idx" ON "document_relationships"("is_active");
CREATE INDEX "document_relationships_effective_date_idx" ON "document_relationships"("effective_date" DESC);

-- Document Authority Scores Indexes
CREATE INDEX "document_authority_scores_pagerank_score_idx" ON "document_authority_scores"("pagerank_score" DESC);
CREATE INDEX "document_authority_scores_combined_authority_idx" ON "document_authority_scores"("combined_authority" DESC);
CREATE INDEX "document_authority_scores_citation_count_idx" ON "document_authority_scores"("citation_count" DESC);
CREATE INDEX "document_authority_scores_last_calculated_idx" ON "document_authority_scores"("last_calculated" DESC);

-- Citation Extraction Jobs Indexes
CREATE INDEX "citation_extraction_jobs_document_id_idx" ON "citation_extraction_jobs"("document_id");
CREATE INDEX "citation_extraction_jobs_status_idx" ON "citation_extraction_jobs"("status");
CREATE INDEX "citation_extraction_jobs_priority_idx" ON "citation_extraction_jobs"("priority" DESC);
CREATE INDEX "citation_extraction_jobs_created_at_idx" ON "citation_extraction_jobs"("created_at" DESC);

-- PageRank Calculation Logs Indexes
CREATE INDEX "pagerank_calculation_logs_started_at_idx" ON "pagerank_calculation_logs"("started_at" DESC);
CREATE INDEX "pagerank_calculation_logs_converged_idx" ON "pagerank_calculation_logs"("converged");
