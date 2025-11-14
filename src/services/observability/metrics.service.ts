/**
 * Metrics Service
 *
 * Custom metrics collection using Prometheus client
 * Week 5-6: Observabilidad - Custom Metrics
 */

import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Collect default metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({
  prefix: 'legal_rag_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Custom Counters
export const requestCounter = new Counter({
  name: 'legal_rag_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const searchQueryCounter = new Counter({
  name: 'legal_rag_search_queries_total',
  help: 'Total number of search queries',
  labelNames: ['query_type', 'cache_hit'],
});

export const aiCallCounter = new Counter({
  name: 'legal_rag_ai_calls_total',
  help: 'Total number of AI API calls',
  labelNames: ['provider', 'model', 'operation'],
});

export const errorCounter = new Counter({
  name: 'legal_rag_errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'service'],
});

// Custom Histograms
export const requestDuration = new Histogram({
  name: 'legal_rag_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});

export const databaseQueryDuration = new Histogram({
  name: 'legal_rag_database_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

export const aiCallDuration = new Histogram({
  name: 'legal_rag_ai_call_duration_seconds',
  help: 'AI API call duration in seconds',
  labelNames: ['provider', 'model', 'operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

export const searchQueryDuration = new Histogram({
  name: 'legal_rag_search_query_duration_seconds',
  help: 'Search query duration in seconds',
  labelNames: ['query_type', 'cache_hit'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// Custom Gauges
export const activeConnections = new Gauge({
  name: 'legal_rag_active_connections',
  help: 'Number of active connections',
  labelNames: ['type'],
});

export const cacheSize = new Gauge({
  name: 'legal_rag_cache_size_bytes',
  help: 'Cache size in bytes',
  labelNames: ['cache_tier'],
});

export const queueSize = new Gauge({
  name: 'legal_rag_queue_size',
  help: 'Number of items in queue',
  labelNames: ['queue_name'],
});

export const activeUsers = new Gauge({
  name: 'legal_rag_active_users',
  help: 'Number of active users',
});

/**
 * Metrics Service
 */
export class MetricsService {
  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Get metrics as JSON
   */
  async getMetricsJSON(): Promise<any> {
    return register.getMetricsAsJSON();
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    register.clear();
  }

  /**
   * Record HTTP request
   */
  recordRequest(method: string, route: string, statusCode: number, duration: number): void {
    requestCounter.inc({ method, route, status_code: statusCode });
    requestDuration.observe({ method, route, status_code: statusCode }, duration);
  }

  /**
   * Record search query
   */
  recordSearch(queryType: string, cacheHit: boolean, duration: number): void {
    searchQueryCounter.inc({ query_type: queryType, cache_hit: cacheHit });
    searchQueryDuration.observe({ query_type: queryType, cache_hit: cacheHit }, duration);
  }

  /**
   * Record AI API call
   */
  recordAICall(provider: string, model: string, operation: string, duration: number): void {
    aiCallCounter.inc({ provider, model, operation });
    aiCallDuration.observe({ provider, model, operation }, duration);
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(operation: string, model: string, duration: number): void {
    databaseQueryDuration.observe({ operation, model }, duration);
  }

  /**
   * Record error
   */
  recordError(errorType: string, service: string): void {
    errorCounter.inc({ error_type: errorType, service });
  }

  /**
   * Update active connections gauge
   */
  setActiveConnections(type: string, count: number): void {
    activeConnections.set({ type }, count);
  }

  /**
   * Update cache size gauge
   */
  setCacheSize(cacheTier: string, bytes: number): void {
    cacheSize.set({ cache_tier: cacheTier }, bytes);
  }

  /**
   * Update queue size gauge
   */
  setQueueSize(queueName: string, size: number): void {
    queueSize.set({ queue_name: queueName }, size);
  }

  /**
   * Update active users gauge
   */
  setActiveUsers(count: number): void {
    activeUsers.set(count);
  }
}

// Singleton instance
let metricsServiceInstance: MetricsService | null = null;

export function getMetricsService(): MetricsService {
  if (!metricsServiceInstance) {
    metricsServiceInstance = new MetricsService();
  }
  return metricsServiceInstance;
}
