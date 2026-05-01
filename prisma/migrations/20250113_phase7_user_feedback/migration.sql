-- Phase 7: User Feedback Loop Migration
-- Track user interactions, click-through rates, and relevance feedback

-- Search Interactions Table
CREATE TABLE IF NOT EXISTS "search_interactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "results_count" INTEGER NOT NULL DEFAULT 0,
    "filters" JSONB,
    "sort_by" TEXT,
    "session_id" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "search_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Click Events Table (tracks which results users clicked)
CREATE TABLE IF NOT EXISTS "click_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "search_interaction_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "relevance_score" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dwell_time" INTEGER, -- milliseconds

    CONSTRAINT "click_events_search_interaction_id_fkey" FOREIGN KEY ("search_interaction_id") REFERENCES "search_interactions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "click_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Relevance Feedback Table (explicit user feedback)
CREATE TABLE IF NOT EXISTS "relevance_feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "search_interaction_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL, -- 1-5 stars
    "is_relevant" BOOLEAN,
    "comment" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relevance_feedback_search_interaction_id_fkey" FOREIGN KEY ("search_interaction_id") REFERENCES "search_interactions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "relevance_feedback_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- A/B Test Configurations Table
CREATE TABLE IF NOT EXISTS "ab_test_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "variants" JSONB NOT NULL, -- Array of scoring weight configurations
    "traffic_split" JSONB NOT NULL, -- Percentage allocation per variant
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- A/B Test Assignments Table (which users see which variant)
CREATE TABLE IF NOT EXISTS "ab_test_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "test_config_id" TEXT NOT NULL,
    "variant" TEXT NOT NULL, -- 'control', 'variantA', 'variantB', etc.
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ab_test_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ab_test_assignments_test_config_id_fkey" FOREIGN KEY ("test_config_id") REFERENCES "ab_test_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE("user_id", "test_config_id")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "search_interactions_user_id_timestamp_idx" ON "search_interactions"("user_id", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "search_interactions_session_id_idx" ON "search_interactions"("session_id");
CREATE INDEX IF NOT EXISTS "click_events_search_interaction_id_idx" ON "click_events"("search_interaction_id");
CREATE INDEX IF NOT EXISTS "click_events_document_id_idx" ON "click_events"("document_id");
CREATE INDEX IF NOT EXISTS "click_events_timestamp_idx" ON "click_events"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "relevance_feedback_search_interaction_id_idx" ON "relevance_feedback"("search_interaction_id");
CREATE INDEX IF NOT EXISTS "relevance_feedback_document_id_idx" ON "relevance_feedback"("document_id");
CREATE INDEX IF NOT EXISTS "ab_test_assignments_user_id_test_config_id_idx" ON "ab_test_assignments"("user_id", "test_config_id");
