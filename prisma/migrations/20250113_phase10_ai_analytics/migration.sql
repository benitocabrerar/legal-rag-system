-- Phase 10: AI-Powered Legal Assistant & Advanced Analytics

-- Create AI Conversations table
CREATE TABLE IF NOT EXISTS "ai_conversations" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL,
  "title" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "message_count" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for ai_conversations
CREATE INDEX IF NOT EXISTS "ai_conversations_user_id_started_at_idx" ON "ai_conversations"("user_id", "started_at" DESC);
CREATE INDEX IF NOT EXISTS "ai_conversations_user_id_is_active_idx" ON "ai_conversations"("user_id", "is_active");

-- Create AI Messages table
CREATE TABLE IF NOT EXISTS "ai_messages" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "conversation_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "intent" TEXT,
  "confidence" DOUBLE PRECISION,
  "processing_time_ms" INTEGER,
  "cited_documents" JSONB,
  "cited_chunks" JSONB,
  "was_helpful" BOOLEAN,
  "feedback_text" TEXT,
  CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for ai_messages
CREATE INDEX IF NOT EXISTS "ai_messages_conversation_id_timestamp_idx" ON "ai_messages"("conversation_id", "timestamp");
CREATE INDEX IF NOT EXISTS "ai_messages_role_idx" ON "ai_messages"("role");

-- Create AI Citations table
CREATE TABLE IF NOT EXISTS "ai_citations" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "message_id" TEXT NOT NULL,
  "document_id" TEXT NOT NULL,
  "chunk_id" TEXT,
  "relevance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "article_ref" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_citations_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "ai_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_citations_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for ai_citations
CREATE INDEX IF NOT EXISTS "ai_citations_message_id_idx" ON "ai_citations"("message_id");
CREATE INDEX IF NOT EXISTS "ai_citations_document_id_idx" ON "ai_citations"("document_id");
CREATE INDEX IF NOT EXISTS "ai_citations_relevance_idx" ON "ai_citations"("relevance" DESC);

-- Create Analytics Events table
CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "event_type" TEXT NOT NULL,
  "user_id" TEXT,
  "session_id" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "duration_ms" INTEGER,
  "success" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for analytics_events
CREATE INDEX IF NOT EXISTS "analytics_events_event_type_timestamp_idx" ON "analytics_events"("event_type", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "analytics_events_user_id_timestamp_idx" ON "analytics_events"("user_id", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "analytics_events_session_id_idx" ON "analytics_events"("session_id");

-- Create Analytics Metrics table
CREATE TABLE IF NOT EXISTS "analytics_metrics" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "metric_name" TEXT NOT NULL,
  "metric_value" DOUBLE PRECISION NOT NULL,
  "dimensions" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL
);

-- Create indexes for analytics_metrics
CREATE INDEX IF NOT EXISTS "analytics_metrics_metric_name_timestamp_idx" ON "analytics_metrics"("metric_name", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "analytics_metrics_period_start_period_end_idx" ON "analytics_metrics"("period_start", "period_end");

-- Create Document Analytics table
CREATE TABLE IF NOT EXISTS "document_analytics" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "document_id" TEXT NOT NULL,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "search_count" INTEGER NOT NULL DEFAULT 0,
  "citation_count" INTEGER NOT NULL DEFAULT 0,
  "download_count" INTEGER NOT NULL DEFAULT 0,
  "avg_time_spent" DOUBLE PRECISION,
  "bounce_rate" DOUBLE PRECISION,
  "relevance_score" DOUBLE PRECISION,
  "last_viewed" TIMESTAMP(3),
  "last_cited" TIMESTAMP(3),
  "trending_score" DOUBLE PRECISION,
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "document_analytics_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE("document_id", "period_start")
);

-- Create indexes for document_analytics
CREATE INDEX IF NOT EXISTS "document_analytics_trending_score_idx" ON "document_analytics"("trending_score" DESC);
CREATE INDEX IF NOT EXISTS "document_analytics_view_count_idx" ON "document_analytics"("view_count" DESC);

-- Create Search Analytics table
CREATE TABLE IF NOT EXISTS "search_analytics" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "query" TEXT NOT NULL,
  "result_count" INTEGER NOT NULL,
  "click_through_rate" DOUBLE PRECISION,
  "avg_position" DOUBLE PRECISION,
  "search_count" INTEGER NOT NULL DEFAULT 1,
  "last_searched" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for search_analytics
CREATE INDEX IF NOT EXISTS "search_analytics_query_idx" ON "search_analytics"("query");
CREATE INDEX IF NOT EXISTS "search_analytics_search_count_idx" ON "search_analytics"("search_count" DESC);
CREATE INDEX IF NOT EXISTS "search_analytics_click_through_rate_idx" ON "search_analytics"("click_through_rate" DESC);

-- Create ML Models table
CREATE TABLE IF NOT EXISTS "ml_models" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "trained_at" TIMESTAMP(3) NOT NULL,
  "accuracy" DOUBLE PRECISION,
  "precision" DOUBLE PRECISION,
  "recall" DOUBLE PRECISION,
  "config" JSONB NOT NULL,
  "training_set" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes for ml_models
CREATE INDEX IF NOT EXISTS "ml_models_type_is_active_idx" ON "ml_models"("type", "is_active");

-- Create Predictions table
CREATE TABLE IF NOT EXISTS "predictions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "model_id" TEXT NOT NULL,
  "prediction_type" TEXT NOT NULL,
  "input_data" JSONB NOT NULL,
  "prediction" JSONB NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "predictions_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ml_models"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for predictions
CREATE INDEX IF NOT EXISTS "predictions_model_id_idx" ON "predictions"("model_id");
CREATE INDEX IF NOT EXISTS "predictions_confidence_idx" ON "predictions"("confidence" DESC);
CREATE INDEX IF NOT EXISTS "predictions_timestamp_idx" ON "predictions"("timestamp" DESC);

-- Create Legal Patterns table
CREATE TABLE IF NOT EXISTS "legal_patterns" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pattern_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "impact" TEXT NOT NULL,
  "timeframe" JSONB NOT NULL,
  "evidence" JSONB NOT NULL,
  "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "detected_by" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "verified_by" TEXT,
  "verified_at" TIMESTAMP(3)
);

-- Create indexes for legal_patterns
CREATE INDEX IF NOT EXISTS "legal_patterns_pattern_type_detected_at_idx" ON "legal_patterns"("pattern_type", "detected_at" DESC);
CREATE INDEX IF NOT EXISTS "legal_patterns_confidence_idx" ON "legal_patterns"("confidence" DESC);

-- Create Trend Forecasts table
CREATE TABLE IF NOT EXISTS "trend_forecasts" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "forecast_type" TEXT NOT NULL,
  "target_metric" TEXT NOT NULL,
  "forecast_period" TEXT NOT NULL,
  "predicted_value" DOUBLE PRECISION NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "factors" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL
);

-- Create indexes for trend_forecasts
CREATE INDEX IF NOT EXISTS "trend_forecasts_forecast_type_idx" ON "trend_forecasts"("forecast_type");
CREATE INDEX IF NOT EXISTS "trend_forecasts_confidence_idx" ON "trend_forecasts"("confidence" DESC);
CREATE INDEX IF NOT EXISTS "trend_forecasts_expires_at_idx" ON "trend_forecasts"("expires_at");

-- Create Document Summaries table
CREATE TABLE IF NOT EXISTS "document_summaries" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "document_id" TEXT NOT NULL,
  "summary_type" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "key_points" JSONB,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "generated_by" TEXT NOT NULL,
  "version" TEXT NOT NULL DEFAULT '1.0',
  CONSTRAINT "document_summaries_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for document_summaries
CREATE INDEX IF NOT EXISTS "document_summaries_document_id_idx" ON "document_summaries"("document_id");
CREATE INDEX IF NOT EXISTS "document_summaries_summary_type_idx" ON "document_summaries"("summary_type");

-- Create Article Analysis table
CREATE TABLE IF NOT EXISTS "article_analysis" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "document_id" TEXT NOT NULL,
  "article_number" TEXT NOT NULL,
  "analysis_type" TEXT NOT NULL,
  "analysis" JSONB NOT NULL,
  "score" DOUBLE PRECISION,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "article_analysis_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for article_analysis
CREATE INDEX IF NOT EXISTS "article_analysis_document_id_idx" ON "article_analysis"("document_id");
CREATE INDEX IF NOT EXISTS "article_analysis_analysis_type_idx" ON "article_analysis"("analysis_type");

-- Create Document Comparisons table
CREATE TABLE IF NOT EXISTS "document_comparisons" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "document1_id" TEXT NOT NULL,
  "document2_id" TEXT NOT NULL,
  "similarity_score" DOUBLE PRECISION NOT NULL,
  "differences" JSONB NOT NULL,
  "similarities" JSONB NOT NULL,
  "compared_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "compared_by" TEXT
);

-- Create indexes for document_comparisons
CREATE INDEX IF NOT EXISTS "document_comparisons_document1_id_idx" ON "document_comparisons"("document1_id");
CREATE INDEX IF NOT EXISTS "document_comparisons_document2_id_idx" ON "document_comparisons"("document2_id");
CREATE INDEX IF NOT EXISTS "document_comparisons_similarity_score_idx" ON "document_comparisons"("similarity_score" DESC);
