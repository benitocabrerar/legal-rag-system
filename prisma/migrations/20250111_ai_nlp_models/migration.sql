-- ============================================================================
-- Migration: 20250111_ai_nlp_models
-- Description: Complete SQL migration for AI/NLP tables
-- Date: 2025-01-11
-- ============================================================================

-- Create custom enums for AI/NLP models
DO $$ BEGIN
    CREATE TYPE "MLModelType" AS ENUM (
        'CASE_OUTCOME',
        'DOCUMENT_CLASSIFICATION',
        'TIMELINE_PREDICTION',
        'RISK_ASSESSMENT',
        'ENTITY_EXTRACTION',
        'SENTIMENT_ANALYSIS',
        'TREND_FORECASTING',
        'PATTERN_DETECTION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MLModelStatus" AS ENUM (
        'TRAINING',
        'VALIDATING',
        'ACTIVE',
        'INACTIVE',
        'DEPRECATED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TrendDirection" AS ENUM (
        'INCREASING',
        'DECREASING',
        'STABLE',
        'VOLATILE',
        'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AlertType" AS ENUM (
        'THRESHOLD_BREACH',
        'ANOMALY_DETECTED',
        'TREND_CHANGE',
        'PATTERN_MATCH',
        'PREDICTION_ALERT',
        'SYSTEM_ALERT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AlertSeverity" AS ENUM (
        'INFO',
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ChangeType" AS ENUM (
        'ADDITION',
        'DELETION',
        'MODIFICATION',
        'REORDERING',
        'FORMATTING'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- Check if ml_models table exists and add new columns if needed
-- ============================================================================

-- Add new columns to existing ml_models table if they don't exist
DO $$
BEGIN
    -- Add status column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ml_models' AND column_name = 'status') THEN
        ALTER TABLE "ml_models" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'TRAINING';
    END IF;

    -- Add metrics column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ml_models' AND column_name = 'metrics') THEN
        ALTER TABLE "ml_models" ADD COLUMN "metrics" JSONB;
    END IF;

    -- Add createdAt column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ml_models' AND column_name = 'created_at') THEN
        ALTER TABLE "ml_models" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Add updatedAt column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ml_models' AND column_name = 'updated_at') THEN
        ALTER TABLE "ml_models" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

-- ============================================================================
-- PredictionFeedback table - User feedback on predictions
-- ============================================================================

CREATE TABLE IF NOT EXISTS "prediction_feedback" (
    "id" TEXT NOT NULL,
    "prediction_id" TEXT NOT NULL,
    "user_id" TEXT,
    "is_accurate" BOOLEAN NOT NULL,
    "actual_outcome" JSONB,
    "feedback_text" TEXT,
    "rating" INTEGER,
    "categories" TEXT[],
    "impact_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_feedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "prediction_feedback_rating_check" CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5))
);

-- Create indexes for prediction_feedback
CREATE INDEX IF NOT EXISTS "prediction_feedback_prediction_id_idx" ON "prediction_feedback"("prediction_id");
CREATE INDEX IF NOT EXISTS "prediction_feedback_user_id_idx" ON "prediction_feedback"("user_id");
CREATE INDEX IF NOT EXISTS "prediction_feedback_is_accurate_idx" ON "prediction_feedback"("is_accurate");
CREATE INDEX IF NOT EXISTS "prediction_feedback_created_at_idx" ON "prediction_feedback"("created_at" DESC);

-- ============================================================================
-- TrendDataPoint table - Individual data points for trend analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS "trend_data_points" (
    "id" TEXT NOT NULL,
    "trend_forecast_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "is_predicted" BOOLEAN NOT NULL DEFAULT false,
    "confidence_lower" DOUBLE PRECISION,
    "confidence_upper" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_data_points_pkey" PRIMARY KEY ("id")
);

-- Create indexes for trend_data_points
CREATE INDEX IF NOT EXISTS "trend_data_points_trend_forecast_id_idx" ON "trend_data_points"("trend_forecast_id");
CREATE INDEX IF NOT EXISTS "trend_data_points_timestamp_idx" ON "trend_data_points"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "trend_data_points_is_predicted_idx" ON "trend_data_points"("is_predicted");

-- ============================================================================
-- TrendAlert table - Alerts generated from trend analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS "trend_alerts" (
    "id" TEXT NOT NULL,
    "trend_forecast_id" TEXT,
    "alert_type" TEXT NOT NULL DEFAULT 'THRESHOLD_BREACH',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "threshold_value" DOUBLE PRECISION,
    "actual_value" DOUBLE PRECISION,
    "direction" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "is_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_by" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolution_notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_alerts_pkey" PRIMARY KEY ("id")
);

-- Create indexes for trend_alerts
CREATE INDEX IF NOT EXISTS "trend_alerts_trend_forecast_id_idx" ON "trend_alerts"("trend_forecast_id");
CREATE INDEX IF NOT EXISTS "trend_alerts_alert_type_idx" ON "trend_alerts"("alert_type");
CREATE INDEX IF NOT EXISTS "trend_alerts_severity_idx" ON "trend_alerts"("severity");
CREATE INDEX IF NOT EXISTS "trend_alerts_is_acknowledged_idx" ON "trend_alerts"("is_acknowledged");
CREATE INDEX IF NOT EXISTS "trend_alerts_is_resolved_idx" ON "trend_alerts"("is_resolved");
CREATE INDEX IF NOT EXISTS "trend_alerts_created_at_idx" ON "trend_alerts"("created_at" DESC);

-- ============================================================================
-- ComparisonChange table - Individual changes within document comparisons
-- ============================================================================

CREATE TABLE IF NOT EXISTS "comparison_changes" (
    "id" TEXT NOT NULL,
    "comparison_id" TEXT NOT NULL,
    "change_type" TEXT NOT NULL DEFAULT 'MODIFICATION',
    "location" TEXT,
    "article_reference" TEXT,
    "section_reference" TEXT,
    "original_text" TEXT,
    "modified_text" TEXT,
    "change_description" TEXT,
    "significance_score" DOUBLE PRECISION,
    "legal_impact" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comparison_changes_pkey" PRIMARY KEY ("id")
);

-- Create indexes for comparison_changes
CREATE INDEX IF NOT EXISTS "comparison_changes_comparison_id_idx" ON "comparison_changes"("comparison_id");
CREATE INDEX IF NOT EXISTS "comparison_changes_change_type_idx" ON "comparison_changes"("change_type");
CREATE INDEX IF NOT EXISTS "comparison_changes_significance_score_idx" ON "comparison_changes"("significance_score" DESC);

-- ============================================================================
-- PatternDocument table - Junction table for LegalPattern and Documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS "pattern_documents" (
    "id" TEXT NOT NULL,
    "pattern_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "relevance_score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "match_locations" JSONB,
    "match_count" INTEGER NOT NULL DEFAULT 1,
    "first_detected" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_detected" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "pattern_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pattern_documents_unique" UNIQUE ("pattern_id", "document_id")
);

-- Create indexes for pattern_documents
CREATE INDEX IF NOT EXISTS "pattern_documents_pattern_id_idx" ON "pattern_documents"("pattern_id");
CREATE INDEX IF NOT EXISTS "pattern_documents_document_id_idx" ON "pattern_documents"("document_id");
CREATE INDEX IF NOT EXISTS "pattern_documents_relevance_score_idx" ON "pattern_documents"("relevance_score" DESC);

-- ============================================================================
-- GraphSnapshot table - Snapshots of the document citation graph
-- ============================================================================

CREATE TABLE IF NOT EXISTS "graph_snapshots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "snapshot_type" TEXT NOT NULL DEFAULT 'FULL',
    "node_count" INTEGER NOT NULL DEFAULT 0,
    "edge_count" INTEGER NOT NULL DEFAULT 0,
    "graph_data" JSONB NOT NULL,
    "statistics" JSONB,
    "algorithm_version" TEXT,
    "calculation_time_ms" INTEGER,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "graph_snapshots_pkey" PRIMARY KEY ("id")
);

-- Create indexes for graph_snapshots
CREATE INDEX IF NOT EXISTS "graph_snapshots_snapshot_type_idx" ON "graph_snapshots"("snapshot_type");
CREATE INDEX IF NOT EXISTS "graph_snapshots_is_current_idx" ON "graph_snapshots"("is_current");
CREATE INDEX IF NOT EXISTS "graph_snapshots_created_at_idx" ON "graph_snapshots"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "graph_snapshots_name_idx" ON "graph_snapshots"("name");

-- ============================================================================
-- Add foreign key constraints
-- ============================================================================

-- PredictionFeedback foreign keys
DO $$
BEGIN
    ALTER TABLE "prediction_feedback"
    ADD CONSTRAINT "prediction_feedback_prediction_id_fkey"
    FOREIGN KEY ("prediction_id") REFERENCES "predictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TABLE "prediction_feedback"
    ADD CONSTRAINT "prediction_feedback_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- TrendDataPoint foreign keys
DO $$
BEGIN
    ALTER TABLE "trend_data_points"
    ADD CONSTRAINT "trend_data_points_trend_forecast_id_fkey"
    FOREIGN KEY ("trend_forecast_id") REFERENCES "trend_forecasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- TrendAlert foreign keys
DO $$
BEGIN
    ALTER TABLE "trend_alerts"
    ADD CONSTRAINT "trend_alerts_trend_forecast_id_fkey"
    FOREIGN KEY ("trend_forecast_id") REFERENCES "trend_forecasts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ComparisonChange foreign keys
DO $$
BEGIN
    ALTER TABLE "comparison_changes"
    ADD CONSTRAINT "comparison_changes_comparison_id_fkey"
    FOREIGN KEY ("comparison_id") REFERENCES "document_comparisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PatternDocument foreign keys
DO $$
BEGIN
    ALTER TABLE "pattern_documents"
    ADD CONSTRAINT "pattern_documents_pattern_id_fkey"
    FOREIGN KEY ("pattern_id") REFERENCES "legal_patterns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TABLE "pattern_documents"
    ADD CONSTRAINT "pattern_documents_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- Add additional columns to existing tables if needed
-- ============================================================================

-- Add direction column to trend_forecasts if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'trend_forecasts' AND column_name = 'direction') THEN
        ALTER TABLE "trend_forecasts" ADD COLUMN "direction" TEXT NOT NULL DEFAULT 'UNKNOWN';
    END IF;
END $$;

-- Add upper and lower bounds to trend_forecasts if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'trend_forecasts' AND column_name = 'upper_bound') THEN
        ALTER TABLE "trend_forecasts" ADD COLUMN "upper_bound" DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'trend_forecasts' AND column_name = 'lower_bound') THEN
        ALTER TABLE "trend_forecasts" ADD COLUMN "lower_bound" DOUBLE PRECISION;
    END IF;
END $$;

-- Add model_id to trend_forecasts for ML model tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'trend_forecasts' AND column_name = 'model_id') THEN
        ALTER TABLE "trend_forecasts" ADD COLUMN "model_id" TEXT;
    END IF;
END $$;

-- Add model relation to legal_patterns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'legal_patterns' AND column_name = 'model_id') THEN
        ALTER TABLE "legal_patterns" ADD COLUMN "model_id" TEXT;
    END IF;
END $$;

-- ============================================================================
-- Create triggers for updated_at columns
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to prediction_feedback
DROP TRIGGER IF EXISTS update_prediction_feedback_updated_at ON "prediction_feedback";
CREATE TRIGGER update_prediction_feedback_updated_at
    BEFORE UPDATE ON "prediction_feedback"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to trend_alerts
DROP TRIGGER IF EXISTS update_trend_alerts_updated_at ON "trend_alerts";
CREATE TRIGGER update_trend_alerts_updated_at
    BEFORE UPDATE ON "trend_alerts"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Add composite indexes for common query patterns
-- ============================================================================

-- Composite index for finding active models of a specific type
CREATE INDEX IF NOT EXISTS "ml_models_type_is_active_idx" ON "ml_models"("type", "is_active");

-- Composite index for prediction feedback analysis
CREATE INDEX IF NOT EXISTS "prediction_feedback_is_accurate_created_at_idx"
    ON "prediction_feedback"("is_accurate", "created_at" DESC);

-- Composite index for trend alerts by severity and status
CREATE INDEX IF NOT EXISTS "trend_alerts_severity_is_resolved_idx"
    ON "trend_alerts"("severity", "is_resolved");

-- Composite index for pattern documents by relevance
CREATE INDEX IF NOT EXISTS "pattern_documents_pattern_relevance_idx"
    ON "pattern_documents"("pattern_id", "relevance_score" DESC);

-- ============================================================================
-- Migration complete
-- ============================================================================

COMMENT ON TABLE "prediction_feedback" IS 'User feedback on ML predictions for model improvement';
COMMENT ON TABLE "trend_data_points" IS 'Time series data points for trend forecasting';
COMMENT ON TABLE "trend_alerts" IS 'Alerts generated from trend analysis and anomaly detection';
COMMENT ON TABLE "comparison_changes" IS 'Individual changes detected in document comparisons';
COMMENT ON TABLE "pattern_documents" IS 'Junction table linking legal patterns to documents';
COMMENT ON TABLE "graph_snapshots" IS 'Snapshots of the document citation/relationship graph';
