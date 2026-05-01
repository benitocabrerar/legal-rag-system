/**
 * Seed Script: Initial ML Models
 *
 * This script seeds the database with initial ML model configurations:
 * - CASE_OUTCOME: Predicts legal case outcomes
 * - DOCUMENT_CLASSIFICATION: Classifies legal documents
 * - TIMELINE_PREDICTION: Predicts case timelines
 * - RISK_ASSESSMENT: Assesses legal risks
 *
 * Usage: npx ts-node prisma/seed-ai-models.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
});

// ML Model configurations
const ML_MODEL_CONFIGS = [
  {
    id: 'ml-case-outcome-v1',
    name: 'Case Outcome Predictor',
    type: 'outcome_predictor',
    version: '1.0.0',
    status: 'ACTIVE',
    modelType: 'CASE_OUTCOME',
    accuracy: 0.78,
    precision: 0.76,
    recall: 0.80,
    f1Score: 0.78,
    metrics: {
      auc_roc: 0.82,
      confusion_matrix: {
        true_positive: 156,
        true_negative: 142,
        false_positive: 38,
        false_negative: 24,
      },
      class_distribution: {
        favorable: 0.45,
        unfavorable: 0.35,
        settlement: 0.20,
      },
      feature_importance: [
        { feature: 'case_type', importance: 0.25 },
        { feature: 'jurisdiction', importance: 0.18 },
        { feature: 'precedent_strength', importance: 0.15 },
        { feature: 'evidence_count', importance: 0.12 },
        { feature: 'attorney_experience', importance: 0.10 },
      ],
    },
    config: {
      model_architecture: 'gradient_boosting',
      hyperparameters: {
        n_estimators: 200,
        max_depth: 8,
        learning_rate: 0.05,
        min_samples_split: 10,
        min_samples_leaf: 5,
      },
      features: [
        'case_type',
        'jurisdiction',
        'norm_type',
        'precedent_count',
        'evidence_strength',
        'timeline_length',
        'party_history',
        'legal_complexity_score',
      ],
      output_classes: ['favorable', 'unfavorable', 'settlement', 'dismissed'],
      confidence_threshold: 0.65,
      update_frequency: 'weekly',
    },
    trainedAt: new Date('2025-01-10T08:00:00Z'),
    isActive: true,
    trainingDuration: 3600, // 1 hour
  },
  {
    id: 'ml-doc-classification-v1',
    name: 'Document Classification Engine',
    type: 'document_classifier',
    version: '1.0.0',
    status: 'ACTIVE',
    modelType: 'DOCUMENT_CLASSIFICATION',
    accuracy: 0.92,
    precision: 0.90,
    recall: 0.93,
    f1Score: 0.91,
    metrics: {
      auc_roc: 0.96,
      per_class_accuracy: {
        constitutional: 0.95,
        civil: 0.92,
        criminal: 0.91,
        administrative: 0.89,
        commercial: 0.90,
        labor: 0.88,
      },
      embeddings_quality: {
        silhouette_score: 0.72,
        davies_bouldin_index: 0.45,
      },
    },
    config: {
      model_architecture: 'transformer_classifier',
      base_model: 'legal-bert-spanish',
      hyperparameters: {
        max_sequence_length: 512,
        embedding_dim: 768,
        attention_heads: 12,
        hidden_layers: 6,
        dropout: 0.1,
        learning_rate: 2e-5,
      },
      categories: [
        'constitutional_law',
        'civil_law',
        'criminal_law',
        'administrative_law',
        'commercial_law',
        'labor_law',
        'family_law',
        'tax_law',
        'environmental_law',
        'intellectual_property',
      ],
      multi_label: true,
      confidence_threshold: 0.70,
    },
    trainedAt: new Date('2025-01-09T12:00:00Z'),
    isActive: true,
    trainingDuration: 7200, // 2 hours
  },
  {
    id: 'ml-timeline-prediction-v1',
    name: 'Case Timeline Predictor',
    type: 'trend_forecaster',
    version: '1.0.0',
    status: 'ACTIVE',
    modelType: 'TIMELINE_PREDICTION',
    accuracy: 0.73,
    precision: 0.71,
    recall: 0.75,
    f1Score: 0.73,
    metrics: {
      mae_days: 15.5,
      rmse_days: 22.3,
      r2_score: 0.68,
      percentile_accuracy: {
        p50: 0.82,
        p75: 0.71,
        p90: 0.58,
      },
    },
    config: {
      model_architecture: 'lstm_regression',
      hyperparameters: {
        lstm_units: 128,
        dense_units: 64,
        dropout: 0.2,
        sequence_length: 30,
        batch_size: 32,
        epochs: 100,
      },
      prediction_horizons: ['30_days', '60_days', '90_days', '180_days', '365_days'],
      features: [
        'case_type',
        'jurisdiction',
        'court_backlog',
        'complexity_score',
        'party_count',
        'historical_avg_duration',
        'procedural_stage',
      ],
      output_format: {
        type: 'distribution',
        percentiles: [25, 50, 75, 90],
      },
    },
    trainedAt: new Date('2025-01-08T16:00:00Z'),
    isActive: true,
    trainingDuration: 5400, // 1.5 hours
  },
  {
    id: 'ml-risk-assessment-v1',
    name: 'Legal Risk Assessment Model',
    type: 'pattern_detector',
    version: '1.0.0',
    status: 'ACTIVE',
    modelType: 'RISK_ASSESSMENT',
    accuracy: 0.81,
    precision: 0.79,
    recall: 0.83,
    f1Score: 0.81,
    metrics: {
      auc_roc: 0.87,
      calibration_score: 0.92,
      brier_score: 0.15,
      risk_distribution: {
        low: 0.40,
        medium: 0.35,
        high: 0.20,
        critical: 0.05,
      },
    },
    config: {
      model_architecture: 'ensemble',
      ensemble_members: [
        { type: 'random_forest', weight: 0.3 },
        { type: 'xgboost', weight: 0.4 },
        { type: 'neural_network', weight: 0.3 },
      ],
      hyperparameters: {
        rf_n_estimators: 150,
        xgb_max_depth: 6,
        nn_hidden_layers: [128, 64, 32],
      },
      risk_categories: ['compliance', 'litigation', 'regulatory', 'contractual', 'reputational'],
      risk_levels: ['low', 'medium', 'high', 'critical'],
      features: [
        'document_complexity',
        'regulatory_changes_count',
        'similar_case_outcomes',
        'precedent_volatility',
        'jurisdiction_risk_score',
        'time_sensitivity',
        'stakeholder_impact',
      ],
      confidence_threshold: 0.60,
      explanation_enabled: true,
    },
    trainedAt: new Date('2025-01-07T10:00:00Z'),
    isActive: true,
    trainingDuration: 4800, // 1.3 hours
  },
  {
    id: 'ml-entity-extraction-v1',
    name: 'Legal Entity Extractor',
    type: 'pattern_detector',
    version: '1.0.0',
    status: 'ACTIVE',
    modelType: 'ENTITY_EXTRACTION',
    accuracy: 0.89,
    precision: 0.87,
    recall: 0.91,
    f1Score: 0.89,
    metrics: {
      entity_f1_scores: {
        person: 0.92,
        organization: 0.90,
        date: 0.95,
        legal_reference: 0.88,
        monetary_value: 0.93,
        jurisdiction: 0.86,
        case_number: 0.94,
      },
      micro_f1: 0.90,
      macro_f1: 0.89,
    },
    config: {
      model_architecture: 'bert_ner',
      base_model: 'legal-bert-spanish-ner',
      hyperparameters: {
        max_sequence_length: 256,
        batch_size: 16,
        learning_rate: 3e-5,
        warmup_steps: 500,
      },
      entity_types: [
        'PERSON',
        'ORGANIZATION',
        'DATE',
        'LEGAL_REFERENCE',
        'MONETARY_VALUE',
        'JURISDICTION',
        'CASE_NUMBER',
        'LEGAL_TERM',
        'LOCATION',
        'ARTICLE_REFERENCE',
      ],
      post_processing: {
        merge_adjacent: true,
        normalize_dates: true,
        validate_references: true,
      },
    },
    trainedAt: new Date('2025-01-06T14:00:00Z'),
    isActive: true,
    trainingDuration: 6000, // 1.7 hours
  },
  {
    id: 'ml-sentiment-analysis-v1',
    name: 'Legal Sentiment Analyzer',
    type: 'document_classifier',
    version: '1.0.0',
    status: 'TRAINING',
    modelType: 'SENTIMENT_ANALYSIS',
    accuracy: null,
    precision: null,
    recall: null,
    f1Score: null,
    metrics: {
      training_progress: 0.65,
      current_epoch: 45,
      total_epochs: 70,
      validation_loss: 0.42,
    },
    config: {
      model_architecture: 'transformer_classifier',
      base_model: 'legal-roberta-spanish',
      hyperparameters: {
        max_sequence_length: 256,
        batch_size: 32,
        learning_rate: 2e-5,
        epochs: 70,
      },
      sentiment_categories: [
        'favorable',
        'unfavorable',
        'neutral',
        'mixed',
      ],
      aspect_based: true,
      aspects: [
        'legal_argument',
        'evidence_strength',
        'procedural_compliance',
        'party_conduct',
      ],
    },
    trainedAt: null,
    isActive: false,
    trainingDuration: null,
  },
  {
    id: 'ml-trend-forecasting-v1',
    name: 'Legal Trend Forecaster',
    type: 'trend_forecaster',
    version: '1.0.0',
    status: 'ACTIVE',
    modelType: 'TREND_FORECASTING',
    accuracy: 0.75,
    precision: 0.73,
    recall: 0.77,
    f1Score: 0.75,
    metrics: {
      mape: 12.5,
      smape: 11.8,
      directional_accuracy: 0.82,
      forecast_horizons: {
        '7_days': { mape: 8.2, accuracy: 0.88 },
        '30_days': { mape: 11.5, accuracy: 0.79 },
        '90_days': { mape: 15.3, accuracy: 0.71 },
      },
    },
    config: {
      model_architecture: 'prophet_hybrid',
      hyperparameters: {
        seasonality_mode: 'multiplicative',
        changepoint_prior_scale: 0.05,
        seasonality_prior_scale: 10,
        holidays_prior_scale: 10,
        yearly_seasonality: true,
        weekly_seasonality: true,
      },
      forecast_targets: [
        'case_volume',
        'resolution_time',
        'success_rate',
        'appeal_rate',
        'settlement_rate',
      ],
      external_regressors: [
        'economic_indicators',
        'regulatory_changes',
        'court_capacity',
      ],
      update_frequency: 'daily',
    },
    trainedAt: new Date('2025-01-05T09:00:00Z'),
    isActive: true,
    trainingDuration: 2400, // 40 minutes
  },
  {
    id: 'ml-pattern-detection-v1',
    name: 'Legal Pattern Detector',
    type: 'pattern_detector',
    version: '1.0.0',
    status: 'ACTIVE',
    modelType: 'PATTERN_DETECTION',
    accuracy: 0.84,
    precision: 0.82,
    recall: 0.86,
    f1Score: 0.84,
    metrics: {
      pattern_types_detected: 12,
      avg_confidence: 0.81,
      false_positive_rate: 0.08,
      detection_latency_ms: 145,
    },
    config: {
      model_architecture: 'graph_neural_network',
      hyperparameters: {
        gnn_layers: 4,
        hidden_dim: 256,
        attention_heads: 8,
        dropout: 0.15,
        aggregation: 'mean',
      },
      pattern_categories: [
        'citation_cluster',
        'amendment_chain',
        'precedent_evolution',
        'regulatory_cascade',
        'jurisdictional_conflict',
        'temporal_pattern',
      ],
      detection_threshold: 0.70,
      min_support: 3,
      max_pattern_length: 10,
    },
    trainedAt: new Date('2025-01-04T11:00:00Z'),
    isActive: true,
    trainingDuration: 5400, // 1.5 hours
  },
];

// Default trend forecast configurations
const DEFAULT_TREND_FORECASTS = [
  {
    id: 'trend-case-volume-2025',
    forecastType: 'case_volume',
    targetMetric: 'total_cases_filed',
    forecastPeriod: 'Q1_2025',
    predictedValue: 1250,
    confidence: 0.78,
    direction: 'INCREASING',
    upperBound: 1400,
    lowerBound: 1100,
    factors: {
      seasonal_factor: 1.12,
      trend_factor: 1.05,
      economic_impact: 0.98,
      regulatory_changes: 1.03,
    },
    expiresAt: new Date('2025-04-01T00:00:00Z'),
    modelId: 'ml-trend-forecasting-v1',
  },
  {
    id: 'trend-resolution-time-2025',
    forecastType: 'resolution_time',
    targetMetric: 'avg_days_to_resolution',
    forecastPeriod: 'Q1_2025',
    predictedValue: 145,
    confidence: 0.72,
    direction: 'STABLE',
    upperBound: 165,
    lowerBound: 125,
    factors: {
      court_backlog: 1.08,
      efficiency_improvements: 0.95,
      complexity_trend: 1.02,
    },
    expiresAt: new Date('2025-04-01T00:00:00Z'),
    modelId: 'ml-trend-forecasting-v1',
  },
];

async function seedMLModels(): Promise<void> {
  console.log('\n[SEED] Starting ML model seeding...\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const modelConfig of ML_MODEL_CONFIGS) {
    try {
      const existing = await prisma.mLModel.findUnique({
        where: { id: modelConfig.id },
      });

      if (existing) {
        // Update existing model
        await prisma.mLModel.update({
          where: { id: modelConfig.id },
          data: {
            name: modelConfig.name,
            type: modelConfig.type,
            version: modelConfig.version,
            accuracy: modelConfig.accuracy,
            precision: modelConfig.precision,
            recall: modelConfig.recall,
            config: modelConfig.config as any,
            metrics: modelConfig.metrics as any,
            trainedAt: modelConfig.trainedAt,
            isActive: modelConfig.isActive,
            trainingDuration: modelConfig.trainingDuration,
          },
        });
        updated++;
        console.log(`  [UPDATED] ${modelConfig.name} (${modelConfig.id})`);
      } else {
        // Create new model
        await prisma.mLModel.create({
          data: {
            id: modelConfig.id,
            name: modelConfig.name,
            type: modelConfig.type,
            version: modelConfig.version,
            accuracy: modelConfig.accuracy,
            precision: modelConfig.precision,
            recall: modelConfig.recall,
            config: modelConfig.config as any,
            metrics: modelConfig.metrics as any,
            trainedAt: modelConfig.trainedAt,
            isActive: modelConfig.isActive,
            trainingDuration: modelConfig.trainingDuration,
          },
        });
        created++;
        console.log(`  [CREATED] ${modelConfig.name} (${modelConfig.id})`);
      }
    } catch (error: any) {
      console.error(`  [ERROR] Failed to seed ${modelConfig.name}: ${error.message}`);
      skipped++;
    }
  }

  console.log(`\n[SEED] ML Models: ${created} created, ${updated} updated, ${skipped} skipped`);
}

async function seedTrendForecasts(): Promise<void> {
  console.log('\n[SEED] Starting trend forecast seeding...\n');

  let created = 0;
  let skipped = 0;

  for (const forecast of DEFAULT_TREND_FORECASTS) {
    try {
      const existing = await prisma.trendForecast.findUnique({
        where: { id: forecast.id },
      });

      if (existing) {
        console.log(`  [SKIP] Trend forecast ${forecast.id} already exists`);
        skipped++;
        continue;
      }

      await prisma.trendForecast.create({
        data: {
          id: forecast.id,
          forecastType: forecast.forecastType,
          targetMetric: forecast.targetMetric,
          forecastPeriod: forecast.forecastPeriod,
          predictedValue: forecast.predictedValue,
          confidence: forecast.confidence,
          direction: forecast.direction as any,
          upperBound: forecast.upperBound,
          lowerBound: forecast.lowerBound,
          factors: forecast.factors as any,
          expiresAt: forecast.expiresAt,
          modelId: forecast.modelId,
        },
      });
      created++;
      console.log(`  [CREATED] ${forecast.forecastType} forecast (${forecast.id})`);
    } catch (error: any) {
      console.error(`  [ERROR] Failed to seed ${forecast.id}: ${error.message}`);
      skipped++;
    }
  }

  console.log(`\n[SEED] Trend Forecasts: ${created} created, ${skipped} skipped`);
}

async function seedSamplePatterns(): Promise<void> {
  console.log('\n[SEED] Creating sample legal patterns...\n');

  const samplePatterns = [
    {
      id: 'pattern-constitutional-citation-cluster',
      patternType: 'citation_cluster',
      title: 'Constitutional Rights Citation Pattern',
      description: 'Frequently co-cited articles from the Constitution related to fundamental rights. Articles 11, 66, and 75 are commonly referenced together in human rights cases.',
      confidence: 0.85,
      impact: 'high',
      timeframe: { start: '2020-01-01', end: '2025-01-01' },
      evidence: {
        document_count: 156,
        co_citation_frequency: 89,
        avg_citation_strength: 0.82,
      },
      detectedBy: 'ml-pattern-detection-v1',
      isActive: true,
      verified: true,
      verifiedBy: 'system',
      verifiedAt: new Date(),
      modelId: 'ml-pattern-detection-v1',
    },
    {
      id: 'pattern-labor-law-amendment-chain',
      patternType: 'amendment_chain',
      title: 'Labor Code Amendment Pattern 2020-2024',
      description: 'Sequential amendments to the Labor Code following COVID-19 pandemic, showing evolution of remote work regulations.',
      confidence: 0.92,
      impact: 'high',
      timeframe: { start: '2020-03-01', end: '2024-12-01' },
      evidence: {
        amendment_count: 12,
        affected_articles: [23, 47, 55, 172, 178],
        regulatory_scope: 'national',
      },
      detectedBy: 'ml-pattern-detection-v1',
      isActive: true,
      verified: true,
      verifiedBy: 'system',
      verifiedAt: new Date(),
      modelId: 'ml-pattern-detection-v1',
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const pattern of samplePatterns) {
    try {
      const existing = await prisma.legalPattern.findUnique({
        where: { id: pattern.id },
      });

      if (existing) {
        console.log(`  [SKIP] Pattern ${pattern.id} already exists`);
        skipped++;
        continue;
      }

      await prisma.legalPattern.create({
        data: {
          id: pattern.id,
          patternType: pattern.patternType,
          title: pattern.title,
          description: pattern.description,
          confidence: pattern.confidence,
          impact: pattern.impact,
          timeframe: pattern.timeframe as any,
          evidence: pattern.evidence as any,
          detectedBy: pattern.detectedBy,
          isActive: pattern.isActive,
          verified: pattern.verified,
          verifiedBy: pattern.verifiedBy,
          verifiedAt: pattern.verifiedAt,
          modelId: pattern.modelId,
        },
      });
      created++;
      console.log(`  [CREATED] ${pattern.title} (${pattern.id})`);
    } catch (error: any) {
      console.error(`  [ERROR] Failed to seed ${pattern.id}: ${error.message}`);
      skipped++;
    }
  }

  console.log(`\n[SEED] Legal Patterns: ${created} created, ${skipped} skipped`);
}

async function printSummary(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('SEED SUMMARY');
  console.log('='.repeat(60));

  const mlModelsCount = await prisma.mLModel.count();
  const activeModels = await prisma.mLModel.count({ where: { isActive: true } });
  const forecastsCount = await prisma.trendForecast.count();
  const patternsCount = await prisma.legalPattern.count();

  console.log(`\nML Models: ${mlModelsCount} total (${activeModels} active)`);
  console.log(`Trend Forecasts: ${forecastsCount}`);
  console.log(`Legal Patterns: ${patternsCount}`);

  // List active models
  const models = await prisma.mLModel.findMany({
    where: { isActive: true },
    select: { name: true, type: true, accuracy: true },
  });

  console.log('\nActive ML Models:');
  models.forEach(m => {
    const accuracy = m.accuracy ? `${(m.accuracy * 100).toFixed(1)}%` : 'N/A';
    console.log(`  - ${m.name} (${m.type}): ${accuracy} accuracy`);
  });

  console.log('\n' + '='.repeat(60));
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('AI/NLP Models Seed Script');
  console.log('Date: ' + new Date().toISOString());
  console.log('='.repeat(60));

  try {
    // Seed ML models
    await seedMLModels();

    // Seed trend forecasts
    await seedTrendForecasts();

    // Seed sample patterns
    await seedSamplePatterns();

    // Print summary
    await printSummary();

    console.log('\n[SUCCESS] Seeding completed successfully!\n');

  } catch (error: any) {
    console.error('\n[FATAL ERROR]', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding
main();
