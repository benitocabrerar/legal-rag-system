/**
 * Tracing Service
 *
 * Custom spans and distributed tracing utilities
 * Week 5-6: Observabilidad - Distributed Tracing
 */

import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';

const tracer = trace.getTracer('legal-rag-backend', '1.0.0');

/**
 * Tracing Service
 */
export class TracingService {
  /**
   * Create a new span and execute function within it
   */
  async executeInSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Record<string, any>
  ): Promise<T> {
    return tracer.startActiveSpan(name, async (span) => {
      try {
        // Add custom attributes
        if (attributes) {
          Object.entries(attributes).forEach(([key, value]) => {
            span.setAttribute(key, value);
          });
        }

        // Execute function
        const result = await fn(span);

        // Mark span as successful
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        // Mark span as failed
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });

        // Record exception
        span.recordException(error as Error);

        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Trace database query
   */
  async traceDatabaseQuery<T>(
    operation: string,
    model: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.executeInSpan(
      `db.${operation}`,
      async (span) => {
        span.setAttribute('db.system', 'postgresql');
        span.setAttribute('db.operation', operation);
        span.setAttribute('db.model', model);

        const startTime = Date.now();
        const result = await fn();
        const duration = (Date.now() - startTime) / 1000;

        span.setAttribute('db.duration_seconds', duration);

        return result;
      }
    );
  }

  /**
   * Trace AI API call
   */
  async traceAICall<T>(
    provider: string,
    model: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.executeInSpan(
      `ai.${provider}.${operation}`,
      async (span) => {
        span.setAttribute('ai.provider', provider);
        span.setAttribute('ai.model', model);
        span.setAttribute('ai.operation', operation);

        const startTime = Date.now();
        const result = await fn();
        const duration = (Date.now() - startTime) / 1000;

        span.setAttribute('ai.duration_seconds', duration);

        return result;
      }
    );
  }

  /**
   * Trace cache operation
   */
  async traceCacheOperation<T>(
    operation: 'get' | 'set' | 'del',
    tier: string,
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.executeInSpan(
      `cache.${operation}`,
      async (span) => {
        span.setAttribute('cache.operation', operation);
        span.setAttribute('cache.tier', tier);
        span.setAttribute('cache.key', key);

        const result = await fn();

        // Record cache hit/miss for get operations
        if (operation === 'get') {
          span.setAttribute('cache.hit', result !== null && result !== undefined);
        }

        return result;
      }
    );
  }

  /**
   * Trace search query
   */
  async traceSearchQuery<T>(
    queryType: string,
    query: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.executeInSpan(
      `search.${queryType}`,
      async (span) => {
        span.setAttribute('search.type', queryType);
        span.setAttribute('search.query', query.substring(0, 100)); // Truncate for privacy

        const startTime = Date.now();
        const result = await fn();
        const duration = (Date.now() - startTime) / 1000;

        span.setAttribute('search.duration_seconds', duration);

        return result;
      }
    );
  }

  /**
   * Trace HTTP request
   */
  async traceHTTPRequest<T>(
    method: string,
    url: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.executeInSpan(
      `http.${method}`,
      async (span) => {
        span.setAttribute('http.method', method);
        span.setAttribute('http.url', url);

        const startTime = Date.now();
        const result = await fn();
        const duration = (Date.now() - startTime) / 1000;

        span.setAttribute('http.duration_seconds', duration);

        return result;
      }
    );
  }

  /**
   * Add event to current span
   */
  addEvent(name: string, attributes?: Record<string, any>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  /**
   * Set attribute on current span
   */
  setAttribute(key: string, value: any): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttribute(key, value);
    }
  }

  /**
   * Get current span
   */
  getCurrentSpan(): Span | undefined {
    return trace.getActiveSpan();
  }

  /**
   * Get current trace ID
   */
  getCurrentTraceId(): string | undefined {
    const span = trace.getActiveSpan();
    if (span) {
      return span.spanContext().traceId;
    }
    return undefined;
  }
}

// Singleton instance
let tracingServiceInstance: TracingService | null = null;

export function getTracingService(): TracingService {
  if (!tracingServiceInstance) {
    tracingServiceInstance = new TracingService();
  }
  return tracingServiceInstance;
}
