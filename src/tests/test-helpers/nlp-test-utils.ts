/**
 * NLP Test Utilities
 * Helper functions and utilities for NLP E2E testing
 *
 * @module nlp-test-utils
 * @author Legal RAG System - Test Automation
 */

import type {
  TransformationResult,
  SearchFilters,
  Entity,
  EntityType,
  QueryIntent
} from '../../types/query-transformation.types.js';

/**
 * Test metrics collector
 */
export class TestMetricsCollector {
  private metrics: {
    query: string;
    duration: number;
    confidence: number;
    entityCount: number;
    success: boolean;
    timestamp: Date;
  }[] = [];

  addMetric(
    query: string,
    duration: number,
    confidence: number,
    entityCount: number,
    success: boolean
  ) {
    this.metrics.push({
      query,
      duration,
      confidence,
      entityCount,
      success,
      timestamp: new Date()
    });
  }

  getAverageDuration(): number {
    if (this.metrics.length === 0) return 0;
    return this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length;
  }

  getAverageConfidence(): number {
    if (this.metrics.length === 0) return 0;
    return this.metrics.reduce((sum, m) => sum + m.confidence, 0) / this.metrics.length;
  }

  getSuccessRate(): number {
    if (this.metrics.length === 0) return 0;
    const successCount = this.metrics.filter(m => m.success).length;
    return successCount / this.metrics.length;
  }

  getReport(): string {
    return `
Test Metrics Report
===================
Total Queries: ${this.metrics.length}
Success Rate: ${(this.getSuccessRate() * 100).toFixed(2)}%
Avg Duration: ${this.getAverageDuration().toFixed(2)}ms
Avg Confidence: ${(this.getAverageConfidence() * 100).toFixed(2)}%

Top 5 Slowest Queries:
${this.metrics
  .sort((a, b) => b.duration - a.duration)
  .slice(0, 5)
  .map((m, i) => `${i + 1}. ${m.query} (${m.duration}ms)`)
  .join('\n')}

Top 5 Lowest Confidence:
${this.metrics
  .sort((a, b) => a.confidence - b.confidence)
  .slice(0, 5)
  .map((m, i) => `${i + 1}. ${m.query} (${(m.confidence * 100).toFixed(2)}%)`)
  .join('\n')}
    `.trim();
  }

  reset() {
    this.metrics = [];
  }
}

/**
 * Assert transformation result structure
 */
export function assertValidTransformationResult(result: TransformationResult): void {
  if (!result) {
    throw new Error('Transformation result is undefined');
  }

  if (!result.filters) {
    throw new Error('Filters are missing from transformation result');
  }

  if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
    throw new Error(`Invalid confidence score: ${result.confidence}`);
  }

  if (!Array.isArray(result.entities)) {
    throw new Error('Entities must be an array');
  }

  if (!result.intent || !result.intent.primary) {
    throw new Error('Intent is missing from transformation result');
  }

  if (typeof result.processingTimeMs !== 'number' || result.processingTimeMs < 0) {
    throw new Error(`Invalid processing time: ${result.processingTimeMs}`);
  }

  if (!result.validation) {
    throw new Error('Validation is missing from transformation result');
  }
}

/**
 * Assert entity structure
 */
export function assertValidEntity(entity: Entity): void {
  if (!entity.id) {
    throw new Error('Entity ID is missing');
  }

  if (!entity.type) {
    throw new Error('Entity type is missing');
  }

  if (!entity.text) {
    throw new Error('Entity text is missing');
  }

  if (typeof entity.confidence !== 'number' || entity.confidence < 0 || entity.confidence > 1) {
    throw new Error(`Invalid entity confidence: ${entity.confidence}`);
  }

  if (typeof entity.startIndex !== 'number' || entity.startIndex < 0) {
    throw new Error(`Invalid entity startIndex: ${entity.startIndex}`);
  }

  if (typeof entity.endIndex !== 'number' || entity.endIndex < entity.startIndex) {
    throw new Error(`Invalid entity endIndex: ${entity.endIndex}`);
  }
}

/**
 * Assert filters structure
 */
export function assertValidFilters(filters: SearchFilters): void {
  if (filters.normType && !Array.isArray(filters.normType)) {
    throw new Error('normType must be an array');
  }

  if (filters.jurisdiction && !Array.isArray(filters.jurisdiction)) {
    throw new Error('jurisdiction must be an array');
  }

  if (filters.keywords && !Array.isArray(filters.keywords)) {
    throw new Error('keywords must be an array');
  }

  if (filters.dateRange) {
    if (!(filters.dateRange.from instanceof Date)) {
      throw new Error('dateRange.from must be a Date object');
    }

    if (!(filters.dateRange.to instanceof Date)) {
      throw new Error('dateRange.to must be a Date object');
    }

    if (filters.dateRange.from > filters.dateRange.to) {
      throw new Error('dateRange.from must be before dateRange.to');
    }
  }

  if (filters.limit && (typeof filters.limit !== 'number' || filters.limit < 1)) {
    throw new Error(`Invalid limit: ${filters.limit}`);
  }

  if (filters.offset && (typeof filters.offset !== 'number' || filters.offset < 0)) {
    throw new Error(`Invalid offset: ${filters.offset}`);
  }
}

/**
 * Compare two transformation results for similarity
 */
export function compareTransformationResults(
  result1: TransformationResult,
  result2: TransformationResult,
  tolerance = 0.1
): boolean {
  // Compare confidence scores
  if (Math.abs(result1.confidence - result2.confidence) > tolerance) {
    return false;
  }

  // Compare entity counts
  if (Math.abs(result1.entities.length - result2.entities.length) > 2) {
    return false;
  }

  // Compare intents
  if (result1.intent.primary !== result2.intent.primary) {
    return false;
  }

  return true;
}

/**
 * Generate test report
 */
export function generateTestReport(
  results: Array<{
    query: string;
    result?: TransformationResult;
    error?: Error;
    duration: number;
  }>
): string {
  const successful = results.filter(r => r.result && !r.error);
  const failed = results.filter(r => r.error);

  const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
  const avgConfidence =
    successful.reduce((sum, r) => sum + (r.result?.confidence || 0), 0) / successful.length;

  return `
NLP E2E Test Report
===================
Total Queries: ${results.length}
Successful: ${successful.length} (${((successful.length / results.length) * 100).toFixed(2)}%)
Failed: ${failed.length} (${((failed.length / results.length) * 100).toFixed(2)}%)

Performance Metrics:
- Average Duration: ${avgDuration.toFixed(2)}ms
- Average Confidence: ${(avgConfidence * 100).toFixed(2)}%
- Min Duration: ${Math.min(...successful.map(r => r.duration)).toFixed(2)}ms
- Max Duration: ${Math.max(...successful.map(r => r.duration)).toFixed(2)}ms

Entity Extraction:
- Total Entities Extracted: ${successful.reduce((sum, r) => sum + (r.result?.entities.length || 0), 0)}
- Avg Entities Per Query: ${(successful.reduce((sum, r) => sum + (r.result?.entities.length || 0), 0) / successful.length).toFixed(2)}

Intent Classification:
${Object.values(QueryIntent)
  .map(intent => {
    const count = successful.filter(r => r.result?.intent.primary === intent).length;
    return `- ${intent}: ${count} (${((count / successful.length) * 100).toFixed(2)}%)`;
  })
  .join('\n')}

${
  failed.length > 0
    ? `
Failed Queries:
${failed.map((f, i) => `${i + 1}. ${f.query}: ${f.error?.message}`).join('\n')}
`
    : ''
}
  `.trim();
}

/**
 * Mock LLM response for testing
 */
export function createMockLLMResponse(query: string): any {
  return {
    intent: 'FIND_DOCUMENT',
    confidence: 0.85,
    entities: [],
    filters: {
      keywords: query.split(' ').filter(w => w.length > 3)
    }
  };
}

/**
 * Create test filters
 */
export function createTestFilters(overrides: Partial<SearchFilters> = {}): SearchFilters {
  return {
    normType: ['ley'],
    jurisdiction: ['nacional'],
    keywords: ['test'],
    limit: 20,
    offset: 0,
    ...overrides
  };
}

/**
 * Create test entity
 */
export function createTestEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: 'test_entity_001',
    type: 'LAW' as EntityType,
    text: 'Código Civil',
    normalizedText: 'codigo civil',
    confidence: 0.9,
    startIndex: 0,
    endIndex: 12,
    source: 'dictionary',
    ...overrides
  };
}

/**
 * Performance benchmark helper
 */
export async function benchmarkQuery(
  fn: () => Promise<any>,
  iterations = 10
): Promise<{
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  medianDuration: number;
}> {
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    durations.push(duration);
  }

  durations.sort((a, b) => a - b);

  return {
    avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
    minDuration: durations[0],
    maxDuration: durations[durations.length - 1],
    medianDuration: durations[Math.floor(durations.length / 2)]
  };
}

/**
 * Parallel query executor
 */
export async function executeQueriesInParallel<T>(
  queries: string[],
  executor: (query: string) => Promise<T>,
  concurrency = 10
): Promise<Array<{ query: string; result?: T; error?: Error; duration: number }>> {
  const results: Array<{ query: string; result?: T; error?: Error; duration: number }> = [];

  for (let i = 0; i < queries.length; i += concurrency) {
    const batch = queries.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(async query => {
        const start = Date.now();
        try {
          const result = await executor(query);
          return { query, result, duration: Date.now() - start };
        } catch (error) {
          return { query, error: error as Error, duration: Date.now() - start };
        }
      })
    );

    results.push(
      ...batchResults.map(r => (r.status === 'fulfilled' ? r.value : r.reason))
    );
  }

  return results;
}

/**
 * Entity type distribution analyzer
 */
export function analyzeEntityDistribution(
  results: TransformationResult[]
): Record<string, number> {
  const distribution: Record<string, number> = {};

  for (const result of results) {
    for (const entity of result.entities) {
      distribution[entity.type] = (distribution[entity.type] || 0) + 1;
    }
  }

  return distribution;
}

/**
 * Intent distribution analyzer
 */
export function analyzeIntentDistribution(
  results: TransformationResult[]
): Record<string, number> {
  const distribution: Record<string, number> = {};

  for (const result of results) {
    const intent = result.intent.primary;
    distribution[intent] = (distribution[intent] || 0) + 1;
  }

  return distribution;
}

/**
 * Confidence score analyzer
 */
export function analyzeConfidenceScores(results: TransformationResult[]): {
  high: number;
  medium: number;
  low: number;
  veryLow: number;
} {
  return {
    high: results.filter(r => r.confidence >= 0.8).length,
    medium: results.filter(r => r.confidence >= 0.5 && r.confidence < 0.8).length,
    low: results.filter(r => r.confidence >= 0.3 && r.confidence < 0.5).length,
    veryLow: results.filter(r => r.confidence < 0.3).length
  };
}
