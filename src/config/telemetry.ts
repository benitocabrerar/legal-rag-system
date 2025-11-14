/**
 * OpenTelemetry Configuration
 *
 * Distributed tracing and metrics collection for observability
 * Week 5-6: Observabilidad - OpenTelemetry Setup
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const serviceName = process.env.OTEL_SERVICE_NAME || 'legal-rag-backend';
const serviceVersion = process.env.npm_package_version || '1.0.0';
const environment = process.env.NODE_ENV || 'development';

// OTLP Exporters Configuration
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  headers: {},
});

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics',
  headers: {},
});

// Resource configuration
const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: serviceName,
  [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
  'deployment.environment': environment,
  'service.namespace': 'legal-rag',
});

// SDK Configuration
const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60000, // Export every 60 seconds
  }),
  instrumentations: [
    // Auto-instrumentation for common libraries
    getNodeAutoInstrumentations({
      // Disable some instrumentations if needed
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable fs instrumentation (too noisy)
      },
      '@opentelemetry/instrumentation-dns': {
        enabled: false,
      },
    }),
    // Fastify-specific instrumentation
    new FastifyInstrumentation({
      requestHook: (span, info) => {
        span.setAttribute('http.route', info.request.routerPath || 'unknown');
        span.setAttribute('http.method', info.request.method);
      },
    }),
    // HTTP instrumentation
    new HttpInstrumentation({
      requestHook: (span, request) => {
        // Add custom attributes to HTTP spans
        span.setAttribute('http.client.host', request.host || 'unknown');
      },
    }),
  ],
});

/**
 * Initialize OpenTelemetry SDK
 */
export function initializeTelemetry(): void {
  try {
    sdk.start();
    console.log('✅ OpenTelemetry initialized successfully');
    console.log(`   Service: ${serviceName}`);
    console.log(`   Version: ${serviceVersion}`);
    console.log(`   Environment: ${environment}`);
  } catch (error) {
    console.error('❌ Failed to initialize OpenTelemetry:', error);
  }
}

/**
 * Gracefully shutdown OpenTelemetry SDK
 */
export async function shutdownTelemetry(): Promise<void> {
  try {
    await sdk.shutdown();
    console.log('✅ OpenTelemetry shut down successfully');
  } catch (error) {
    console.error('❌ Error shutting down OpenTelemetry:', error);
  }
}

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  initializeTelemetry();
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await shutdownTelemetry();
  process.exit(0);
});

export default sdk;
