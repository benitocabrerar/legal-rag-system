# Week 5-6: Observabilidad - Variables de Entorno

## Variables de Entorno Necesarias

### OpenTelemetry Configuration

```bash
# Service Information
OTEL_SERVICE_NAME=legal-rag-backend
NODE_ENV=production

# OpenTelemetry Exporter Endpoint
# Para Jaeger (local development):
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Para Datadog (production):
OTEL_EXPORTER_OTLP_ENDPOINT=https://trace.agent.datadoghq.com

# Datadog APM (si usas Datadog)
DD_AGENT_HOST=localhost
DD_TRACE_AGENT_PORT=8126
DD_ENV=production
DD_SERVICE=legal-rag-backend
DD_VERSION=1.0.0
DD_LOGS_INJECTION=true
DD_TRACE_SAMPLE_RATE=1.0
DD_PROFILING_ENABLED=true
```

### Configuración de Caché (Redis)

```bash
# Redis URL para caché de métricas
REDIS_URL=redis://localhost:6379
# O para Redis Cloud:
REDIS_URL=rediss://default:password@redis-xxxxx.c1.cloud.redislabs.com:6379
```

### Configuración de Alertas

```bash
# Email Alerts (SendGrid)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
ALERT_EMAIL_FROM=alerts@yourdomain.com
ALERT_EMAIL_TO=team@yourdomain.com

# Slack Webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
SLACK_CHANNEL=#alerts

# PagerDuty (opcional)
PAGERDUTY_API_KEY=xxxxxxxxxxxxxxxxxxxxx
PAGERDUTY_SERVICE_ID=PXXXXXX
```

### Configuración de Health Checks

```bash
# Database connection check timeout (ms)
HEALTH_CHECK_TIMEOUT=5000

# Max response time before marking as degraded (ms)
HEALTH_CHECK_DEGRADED_THRESHOLD=1000
```

## Endpoints de Observabilidad

Una vez configurado, tendrás acceso a los siguientes endpoints:

### Metrics
- **GET /observability/metrics** - Prometheus format metrics
- **GET /observability/metrics/json** - JSON format metrics

### Health Checks
- **GET /observability/health** - Comprehensive health check
- **GET /observability/ready** - Kubernetes readiness probe
- **GET /observability/live** - Kubernetes liveness probe

## Integración con Herramientas

### 1. Jaeger (Distributed Tracing - Local Development)

```bash
# Run Jaeger all-in-one (Docker)
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# Access Jaeger UI
http://localhost:16686
```

### 2. Prometheus (Metrics Collection)

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'legal-rag-backend'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/observability/metrics'
```

### 3. Grafana (Visualization)

```bash
# Run Grafana (Docker)
docker run -d --name grafana \
  -p 3000:3000 \
  grafana/grafana:latest

# Add Prometheus as data source
# URL: http://prometheus:9090
```

### 4. Datadog (Production APM)

```bash
# Datadog Agent (Docker)
docker run -d --name dd-agent \
  -e DD_API_KEY=<YOUR_DD_API_KEY> \
  -e DD_SITE=datadoghq.com \
  -e DD_APM_ENABLED=true \
  -e DD_APM_NON_LOCAL_TRAFFIC=true \
  -p 8126:8126 \
  -p 8125:8125/udp \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /proc/:/host/proc/:ro \
  -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro \
  datadog/agent:latest
```

## Kubernetes Deployment

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legal-rag-backend
spec:
  ports:
    - name: http
      port: 8000
      targetPort: 8000
    - name: metrics
      port: 9090
      targetPort: 8000
  selector:
    app: legal-rag-backend

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legal-rag-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: legal-rag-backend
  template:
    metadata:
      labels:
        app: legal-rag-backend
    spec:
      containers:
        - name: legal-rag-backend
          image: your-registry/legal-rag-backend:latest
          ports:
            - containerPort: 8000
          env:
            - name: OTEL_SERVICE_NAME
              value: "legal-rag-backend"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://jaeger-collector:4318"
          livenessProbe:
            httpGet:
              path: /observability/live
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /observability/ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
```

## Métricas Disponibles

### Counters
- `legal_rag_http_requests_total` - Total HTTP requests
- `legal_rag_search_queries_total` - Total search queries
- `legal_rag_ai_calls_total` - Total AI API calls
- `legal_rag_errors_total` - Total errors

### Histograms
- `legal_rag_http_request_duration_seconds` - HTTP request duration
- `legal_rag_database_query_duration_seconds` - Database query duration
- `legal_rag_ai_call_duration_seconds` - AI API call duration
- `legal_rag_search_query_duration_seconds` - Search query duration

### Gauges
- `legal_rag_active_connections` - Active connections
- `legal_rag_cache_size_bytes` - Cache size
- `legal_rag_queue_size` - Queue size
- `legal_rag_active_users` - Active users

## Alertas Recomendadas

### Latencia Alta
```yaml
alert: HighLatency
expr: histogram_quantile(0.95, legal_rag_http_request_duration_seconds) > 2
for: 5m
labels:
  severity: warning
annotations:
  summary: "High API latency detected"
  description: "P95 latency is {{ $value }}s (threshold: 2s)"
```

### Error Rate Alto
```yaml
alert: HighErrorRate
expr: rate(legal_rag_errors_total[5m]) > 0.05
for: 5m
labels:
  severity: critical
annotations:
  summary: "High error rate detected"
  description: "Error rate is {{ $value }} (threshold: 5%)"
```

### Database Slow Queries
```yaml
alert: SlowDatabaseQueries
expr: histogram_quantile(0.95, legal_rag_database_query_duration_seconds) > 0.5
for: 5m
labels:
  severity: warning
annotations:
  summary: "Slow database queries detected"
  description: "P95 query time is {{ $value }}s (threshold: 0.5s)"
```

## Testing Observability

```bash
# Test health endpoints
curl http://localhost:8000/observability/health
curl http://localhost:8000/observability/ready
curl http://localhost:8000/observability/live

# Test metrics endpoint
curl http://localhost:8000/observability/metrics

# Generate some traffic
for i in {1..100}; do
  curl http://localhost:8000/api/v1/query
done

# Check metrics again
curl http://localhost:8000/observability/metrics | grep legal_rag
```
