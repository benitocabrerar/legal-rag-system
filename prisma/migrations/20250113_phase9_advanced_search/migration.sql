-- Phase 9: Advanced Search & User Experience Enhancement
-- Database migration for search improvements, collections, and sharing

-- ============================================================================
-- 1. Saved Searches Table
-- Users can save their searches for quick access
-- ============================================================================
CREATE TABLE "saved_searches" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "filters" JSONB,
  "results_count" INTEGER,
  "is_favorite" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- 2. Document Collections Table
-- Users can organize documents into collections
-- ============================================================================
CREATE TABLE "document_collections" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "share_token" TEXT UNIQUE,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "document_collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- 3. Collection Documents Junction Table
-- Links documents to collections (many-to-many)
-- ============================================================================
CREATE TABLE "collection_documents" (
  "collection_id" TEXT NOT NULL,
  "document_id" TEXT NOT NULL,
  "added_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,

  CONSTRAINT "collection_documents_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "document_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collection_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE,

  PRIMARY KEY ("collection_id", "document_id")
);

-- ============================================================================
-- 4. Search Suggestions Table
-- Tracks popular search terms for autocomplete
-- ============================================================================
CREATE TABLE "search_suggestions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "suggestion_text" TEXT NOT NULL UNIQUE,
  "search_count" INTEGER NOT NULL DEFAULT 1,
  "last_used" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "category" TEXT, -- legal_term, document_title, case_name, etc.
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. Shared Search Links Table
-- Temporary shareable links for search results
-- ============================================================================
CREATE TABLE "shared_search_links" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "share_token" TEXT NOT NULL UNIQUE,
  "user_id" TEXT,
  "search_query" TEXT NOT NULL,
  "filters" JSONB,
  "result_ids" TEXT[], -- Array of document IDs from search
  "expires_at" TIMESTAMP,
  "access_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shared_search_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================================================
-- 6. Document Recommendations Table
-- Pre-computed recommendations for faster retrieval
-- ============================================================================
CREATE TABLE "document_recommendations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "source_document_id" TEXT NOT NULL,
  "recommended_document_id" TEXT NOT NULL,
  "recommendation_type" TEXT NOT NULL, -- similar, cited_together, collaborative, personalized
  "score" REAL NOT NULL,
  "reason" TEXT,
  "calculated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "document_recommendations_source_fkey" FOREIGN KEY ("source_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "document_recommendations_recommended_fkey" FOREIGN KEY ("recommended_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- 7. Query Expansions Table
-- Stores synonym mappings and query expansions for legal terms
-- ============================================================================
CREATE TABLE "query_expansions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "original_term" TEXT NOT NULL,
  "expanded_terms" TEXT[] NOT NULL,
  "context" TEXT, -- legal_area, jurisdiction, etc.
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Saved Searches Indexes
CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches"("user_id");
CREATE INDEX "saved_searches_created_at_idx" ON "saved_searches"("created_at" DESC);
CREATE INDEX "saved_searches_is_favorite_idx" ON "saved_searches"("is_favorite");

-- Document Collections Indexes
CREATE INDEX "document_collections_user_id_idx" ON "document_collections"("user_id");
CREATE INDEX "document_collections_is_public_idx" ON "document_collections"("is_public");
CREATE INDEX "document_collections_share_token_idx" ON "document_collections"("share_token");

-- Collection Documents Indexes
CREATE INDEX "collection_documents_collection_id_idx" ON "collection_documents"("collection_id");
CREATE INDEX "collection_documents_document_id_idx" ON "collection_documents"("document_id");

-- Search Suggestions Indexes
CREATE INDEX "search_suggestions_text_idx" ON "search_suggestions"("suggestion_text");
CREATE INDEX "search_suggestions_count_idx" ON "search_suggestions"("search_count" DESC);
CREATE INDEX "search_suggestions_category_idx" ON "search_suggestions"("category");

-- Shared Links Indexes
CREATE INDEX "shared_search_links_token_idx" ON "shared_search_links"("share_token");
CREATE INDEX "shared_search_links_user_id_idx" ON "shared_search_links"("user_id");
CREATE INDEX "shared_search_links_expires_at_idx" ON "shared_search_links"("expires_at");

-- Document Recommendations Indexes
CREATE INDEX "document_recommendations_source_idx" ON "document_recommendations"("source_document_id");
CREATE INDEX "document_recommendations_type_idx" ON "document_recommendations"("recommendation_type");
CREATE INDEX "document_recommendations_score_idx" ON "document_recommendations"("score" DESC);

-- Query Expansions Indexes
CREATE INDEX "query_expansions_term_idx" ON "query_expansions"("original_term");
CREATE INDEX "query_expansions_usage_idx" ON "query_expansions"("usage_count" DESC);
