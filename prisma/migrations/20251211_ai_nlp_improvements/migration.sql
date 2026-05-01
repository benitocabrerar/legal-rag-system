-- ============================================================================
-- AI/NLP Improvements Migration
-- Date: 2025-12-11
-- Purpose: Add missing fields and models for 100% AI/NLP compliance
-- ============================================================================

-- ============================================================================
-- MODULE 1: PREDICTIVE INTELLIGENCE ENHANCEMENTS
-- ============================================================================

-- Add missing fields to ml_models
ALTER TABLE "ml_models"
ADD COLUMN IF NOT EXISTS "hyperparameters" JSONB,
ADD COLUMN IF NOT EXISTS "f1_score" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "auc" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "feature_importance" JSONB,
ADD COLUMN IF NOT EXISTS "training_size" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "validation_size" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "model_path" TEXT;

-- Add missing fields to predictions
ALTER TABLE "predictions"
ADD COLUMN IF NOT EXISTS "user_id" TEXT,
ADD COLUMN IF NOT EXISTS "document_id" TEXT,
ADD COLUMN IF NOT EXISTS "case_id" TEXT,
ADD COLUMN IF NOT EXISTS "explanations" JSONB,
ADD COLUMN IF NOT EXISTS "actual_outcome" JSONB,
ADD COLUMN IF NOT EXISTS "feedback_received" BOOLEAN DEFAULT FALSE;

-- Create prediction feedback table
CREATE TABLE IF NOT EXISTS "prediction_feedback" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "prediction_id" TEXT NOT NULL,
    "actual_outcome" JSONB NOT NULL,
    "was_accurate" BOOLEAN,
    "feedback" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prediction_feedback_pkey" PRIMARY KEY ("id")
);

-- Add indexes for prediction feedback
CREATE INDEX IF NOT EXISTS "prediction_feedback_prediction_id_idx" ON "prediction_feedback"("prediction_id");
CREATE INDEX IF NOT EXISTS "prediction_feedback_user_id_idx" ON "prediction_feedback"("user_id");
CREATE INDEX IF NOT EXISTS "prediction_feedback_created_at_idx" ON "prediction_feedback"("created_at" DESC);

-- Add foreign keys for predictions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'predictions_user_id_fkey') THEN
        ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'predictions_document_id_fkey') THEN
        ALTER TABLE "predictions" ADD CONSTRAINT "predictions_document_id_fkey"
        FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'predictions_case_id_fkey') THEN
        ALTER TABLE "predictions" ADD CONSTRAINT "predictions_case_id_fkey"
        FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key for prediction feedback
ALTER TABLE "prediction_feedback"
ADD CONSTRAINT "prediction_feedback_prediction_id_fkey"
FOREIGN KEY ("prediction_id") REFERENCES "predictions"("id") ON DELETE CASCADE;

-- ============================================================================
-- MODULE 2: TREND ANALYSIS
-- ============================================================================

-- Create trend data point table for efficient aggregation
CREATE TABLE IF NOT EXISTS "trend_data_points" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "metric_type" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "dimension_value" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trend_data_points_pkey" PRIMARY KEY ("id")
);

-- Create indexes for trend data points
CREATE INDEX IF NOT EXISTS "trend_data_points_metric_type_idx" ON "trend_data_points"("metric_type");
CREATE INDEX IF NOT EXISTS "trend_data_points_dimension_idx" ON "trend_data_points"("dimension", "dimension_value");
CREATE INDEX IF NOT EXISTS "trend_data_points_period_idx" ON "trend_data_points"("period_start", "period_end");
CREATE INDEX IF NOT EXISTS "trend_data_points_composite_idx" ON "trend_data_points"("metric_type", "dimension", "period_start" DESC);

-- Create trend alerts table
CREATE TABLE IF NOT EXISTS "trend_alerts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "alert_type" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "current_value" DOUBLE PRECISION NOT NULL,
    "percentage_change" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT FALSE,
    "acknowledged_by" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    CONSTRAINT "trend_alerts_pkey" PRIMARY KEY ("id")
);

-- Create indexes for trend alerts
CREATE INDEX IF NOT EXISTS "trend_alerts_severity_idx" ON "trend_alerts"("severity");
CREATE INDEX IF NOT EXISTS "trend_alerts_acknowledged_idx" ON "trend_alerts"("acknowledged");
CREATE INDEX IF NOT EXISTS "trend_alerts_detected_at_idx" ON "trend_alerts"("detected_at" DESC);

-- Add missing fields to trend_forecasts
ALTER TABLE "trend_forecasts"
ADD COLUMN IF NOT EXISTS "methodology" TEXT DEFAULT 'linear',
ADD COLUMN IF NOT EXISTS "historical_data_points" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "seasonality_factors" JSONB,
ADD COLUMN IF NOT EXISTS "upper_bound" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "lower_bound" DOUBLE PRECISION;

-- ============================================================================
-- MODULE 3: DOCUMENT COMPARISON ENHANCEMENTS
-- ============================================================================

-- Add missing fields to document_comparisons
ALTER TABLE "document_comparisons"
ADD COLUMN IF NOT EXISTS "comparison_type" TEXT DEFAULT 'cross_document',
ADD COLUMN IF NOT EXISTS "additions_count" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "deletions_count" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "modifications_count" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "structural_changes" JSONB,
ADD COLUMN IF NOT EXISTS "semantic_changes" JSONB,
ADD COLUMN IF NOT EXISTS "impact_assessment" JSONB,
ADD COLUMN IF NOT EXISTS "highlighted_diff" JSONB;

-- Create comparison changes table for detailed change tracking
CREATE TABLE IF NOT EXISTS "comparison_changes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "comparison_id" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "original_text" TEXT,
    "new_text" TEXT,
    "semantic_impact" TEXT NOT NULL,
    "impact_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comparison_changes_pkey" PRIMARY KEY ("id")
);

-- Add indexes and foreign key for comparison changes
CREATE INDEX IF NOT EXISTS "comparison_changes_comparison_id_idx" ON "comparison_changes"("comparison_id");
CREATE INDEX IF NOT EXISTS "comparison_changes_change_type_idx" ON "comparison_changes"("change_type");

ALTER TABLE "comparison_changes"
ADD CONSTRAINT "comparison_changes_comparison_id_fkey"
FOREIGN KEY ("comparison_id") REFERENCES "document_comparisons"("id") ON DELETE CASCADE;

-- ============================================================================
-- MODULE 4: LEGAL PATTERN DETECTION ENHANCEMENTS
-- ============================================================================

-- Add missing fields to legal_patterns
ALTER TABLE "legal_patterns"
ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS "document_ids" TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "end_date" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "affected_jurisdictions" TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "visualization_data" JSONB,
ADD COLUMN IF NOT EXISTS "related_patterns" TEXT[] DEFAULT '{}';

-- Create pattern documents join table
CREATE TABLE IF NOT EXISTS "pattern_documents" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "pattern_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "position" INTEGER,
    "contribution" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pattern_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pattern_documents_unique" UNIQUE ("pattern_id", "document_id")
);

-- Add indexes and foreign keys for pattern documents
CREATE INDEX IF NOT EXISTS "pattern_documents_pattern_id_idx" ON "pattern_documents"("pattern_id");
CREATE INDEX IF NOT EXISTS "pattern_documents_document_id_idx" ON "pattern_documents"("document_id");

ALTER TABLE "pattern_documents"
ADD CONSTRAINT "pattern_documents_pattern_id_fkey"
FOREIGN KEY ("pattern_id") REFERENCES "legal_patterns"("id") ON DELETE CASCADE;

ALTER TABLE "pattern_documents"
ADD CONSTRAINT "pattern_documents_document_id_fkey"
FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE;

-- ============================================================================
-- MODULE 5: GRAPH VISUALIZATION
-- ============================================================================

-- Create graph snapshots table for caching
CREATE TABLE IF NOT EXISTS "graph_snapshots" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "graph_type" TEXT NOT NULL,
    "node_count" INTEGER NOT NULL DEFAULT 0,
    "edge_count" INTEGER NOT NULL DEFAULT 0,
    "graph_data" JSONB NOT NULL,
    "metrics" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    CONSTRAINT "graph_snapshots_pkey" PRIMARY KEY ("id")
);

-- Add indexes for graph snapshots
CREATE INDEX IF NOT EXISTS "graph_snapshots_graph_type_idx" ON "graph_snapshots"("graph_type");
CREATE INDEX IF NOT EXISTS "graph_snapshots_expires_at_idx" ON "graph_snapshots"("expires_at");
CREATE INDEX IF NOT EXISTS "graph_snapshots_created_at_idx" ON "graph_snapshots"("created_at" DESC);

-- ============================================================================
-- MODULE 6: DOCUMENT SUMMARIZATION ENHANCEMENTS
-- ============================================================================

-- Add missing fields to document_summaries
ALTER TABLE "document_summaries"
ADD COLUMN IF NOT EXISTS "quality_score" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "coherence_score" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "coverage_score" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "faithfulness_score" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "word_count" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "compression_ratio" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "target_audience" TEXT DEFAULT 'legal_professional';

-- ============================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================================

-- Prediction indexes
CREATE INDEX IF NOT EXISTS "predictions_user_id_idx" ON "predictions"("user_id");
CREATE INDEX IF NOT EXISTS "predictions_document_id_idx" ON "predictions"("document_id");
CREATE INDEX IF NOT EXISTS "predictions_case_id_idx" ON "predictions"("case_id");
CREATE INDEX IF NOT EXISTS "predictions_feedback_received_idx" ON "predictions"("feedback_received");

-- ML Model indexes
CREATE INDEX IF NOT EXISTS "ml_models_type_active_idx" ON "ml_models"("type", "is_active");
CREATE INDEX IF NOT EXISTS "ml_models_accuracy_idx" ON "ml_models"("accuracy" DESC NULLS LAST);

-- Legal patterns indexes
CREATE INDEX IF NOT EXISTS "legal_patterns_category_idx" ON "legal_patterns"("category");
CREATE INDEX IF NOT EXISTS "legal_patterns_start_date_idx" ON "legal_patterns"("start_date" DESC NULLS LAST);

-- Document comparison indexes
CREATE INDEX IF NOT EXISTS "document_comparisons_type_idx" ON "document_comparisons"("comparison_type");
CREATE INDEX IF NOT EXISTS "document_comparisons_similarity_idx" ON "document_comparisons"("similarity_score" DESC);

-- Document summaries indexes
CREATE INDEX IF NOT EXISTS "document_summaries_quality_idx" ON "document_summaries"("quality_score" DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS "document_summaries_audience_idx" ON "document_summaries"("target_audience");

-- ============================================================================
-- CLEANUP EXPIRED DATA (for scheduled job)
-- ============================================================================

-- Create function to clean up expired graph snapshots
CREATE OR REPLACE FUNCTION cleanup_expired_graph_snapshots() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM "graph_snapshots" WHERE "expires_at" < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old trend alerts (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_trend_alerts() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM "trend_alerts"
    WHERE "acknowledged" = TRUE
    AND "detected_at" < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE "prediction_feedback" IS 'Stores user feedback on AI predictions for model improvement';
COMMENT ON TABLE "trend_data_points" IS 'Aggregated trend data for efficient time series queries';
COMMENT ON TABLE "trend_alerts" IS 'Alerts generated when significant trend changes are detected';
COMMENT ON TABLE "comparison_changes" IS 'Detailed changes extracted from document comparisons';
COMMENT ON TABLE "pattern_documents" IS 'Many-to-many relationship between patterns and documents';
COMMENT ON TABLE "graph_snapshots" IS 'Cached graph visualizations for faster rendering';

COMMENT ON COLUMN "predictions"."explanations" IS 'SHAP/LIME explanations for prediction interpretability';
COMMENT ON COLUMN "predictions"."actual_outcome" IS 'Actual outcome for feedback loop and model retraining';
COMMENT ON COLUMN "trend_forecasts"."methodology" IS 'Forecasting algorithm: linear, arima, prophet, etc.';
COMMENT ON COLUMN "document_comparisons"."impact_assessment" IS 'Analysis of change impact on legal interpretation';
COMMENT ON COLUMN "legal_patterns"."visualization_data" IS 'D3.js/Cytoscape.js compatible visualization data';
COMMENT ON COLUMN "document_summaries"."target_audience" IS 'Intended reader: legal_professional, executive, general';
