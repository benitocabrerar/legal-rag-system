# Document Analysis System - Production Deployment Guide

## Table of Contents

1. [Infrastructure Requirements](#infrastructure-requirements)
2. [Docker Deployment](#docker-deployment)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Security Hardening](#security-hardening)
8. [Monitoring Setup](#monitoring-setup)
9. [Backup and Recovery](#backup-and-recovery)
10. [Performance Tuning](#performance-tuning)
11. [Troubleshooting](#troubleshooting)

---

## Infrastructure Requirements

### Minimum Production Requirements

| Component | Specification | Notes |
|-----------|--------------|-------|
| **API Servers** | 2x 4 vCPU, 8GB RAM | Load balanced |
| **Worker Nodes** | 2x 4 vCPU, 16GB RAM | For document processing |
| **PostgreSQL** | 8 vCPU, 32GB RAM, 500GB SSD | Primary database |
| **Redis** | 2 vCPU, 8GB RAM | Queue and cache |
| **Load Balancer** | Cloud provider managed | HTTPS termination |
| **Storage** | 1TB object storage | Document files |

### Recommended Production Setup

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer (HTTPS)                   │
└─────────────┬────────────────────────┬──────────────────────┘
              │                        │
    ┌─────────▼──────────┐  ┌─────────▼──────────┐
    │   API Server 1     │  │   API Server 2     │
    │   (4 CPU, 8GB)     │  │   (4 CPU, 8GB)     │
    └─────────┬──────────┘  └─────────┬──────────┘
              │                        │
    ┌─────────▼────────────────────────▼──────────┐
    │              Redis Cluster                   │
    │          (Master + 2 Replicas)               │
    └─────────┬────────────────────────┬──────────┘
              │                        │
    ┌─────────▼──────────┐  ┌─────────▼──────────┐
    │   Worker Node 1    │  │   Worker Node 2    │
    │   (4 CPU, 16GB)    │  │   (4 CPU, 16GB)    │
    └─────────┬──────────┘  └─────────┬──────────┘
              │                        │
    ┌─────────▼────────────────────────▼──────────┐
    │         PostgreSQL Primary                   │
    │         (8 CPU, 32GB, 500GB)                │
    └────────────────┬─────────────────────────────┘
                     │
    ┌────────────────▼─────────────────────────────┐
    │         PostgreSQL Replica                   │
    │         (4 CPU, 16GB, 500GB)                │
    └──────────────────────────────────────────────┘
```

---

## Docker Deployment

### Dockerfile for API Server

```dockerfile
# Dockerfile.api
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production
RUN npx prisma generate

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### Dockerfile for Worker

```dockerfile
# Dockerfile.worker
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies including dev for building
RUN npm ci
RUN npx prisma generate

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Install dumb-init
RUN apk add --no-cache dumb-init

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/workers/documentProcessor.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: legal_db
      POSTGRES_USER: legal_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./prisma/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U legal_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://legal_user:${DB_PASSWORD}@postgres:5432/legal_db
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 4G

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      DATABASE_URL: postgresql://legal_user:${DB_PASSWORD}@postgres:5432/legal_db
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      NODE_ENV: production
      WORKER_CONCURRENCY: 3
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 8G

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream api_servers {
        least_conn;
        server api:3000 max_fails=3 fail_timeout=30s;
    }

    server {
        listen 80;
        server_name api.legal-system.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.legal-system.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        client_max_body_size 50M;
        proxy_read_timeout 300s;

        location / {
            proxy_pass http://api_servers;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        location /health {
            access_log off;
            proxy_pass http://api_servers/health;
        }
    }
}
```

---

## Kubernetes Deployment

### Namespace and ConfigMap

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: legal-system

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: legal-config
  namespace: legal-system
data:
  NODE_ENV: "production"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  WORKER_CONCURRENCY: "3"
  LOG_LEVEL: "info"
```

### Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: legal-secrets
  namespace: legal-system
type: Opaque
stringData:
  database-url: "postgresql://user:pass@postgres:5432/legal_db"
  redis-password: "your-redis-password"
  openai-api-key: "sk-..."
  smtp-password: "smtp-password"
```

### API Deployment

```yaml
# k8s/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
  namespace: legal-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: legal-system/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: legal-secrets
              key: database-url
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: legal-secrets
              key: redis-password
        envFrom:
        - configMapRef:
            name: legal-config
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: legal-system
spec:
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Worker Deployment

```yaml
# k8s/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker-deployment
  namespace: legal-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
      - name: worker
        image: legal-system/worker:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: legal-secrets
              key: database-url
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: legal-secrets
              key: openai-api-key
        envFrom:
        - configMapRef:
            name: legal-config
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
```

### Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: legal-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Cloud Deployment

### AWS Deployment

#### Terraform Configuration

```hcl
# terraform/main.tf
provider "aws" {
  region = "us-west-2"
}

# VPC
resource "aws_vpc" "legal_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "legal-system-vpc"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "legal_cluster" {
  name = "legal-system-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "legal_db" {
  identifier             = "legal-system-db"
  engine                 = "postgres"
  engine_version         = "14.7"
  instance_class         = "db.r5.xlarge"
  allocated_storage      = 500
  storage_encrypted      = true
  storage_type          = "gp3"

  db_name  = "legal_db"
  username = "legal_admin"
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.legal.name

  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  multi_az               = true
  deletion_protection    = true

  enabled_cloudwatch_logs_exports = ["postgresql"]
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "legal_redis" {
  replication_group_id       = "legal-system-redis"
  replication_group_description = "Redis for Legal System"

  engine               = "redis"
  engine_version       = "7.0"
  node_type           = "cache.r6g.large"
  number_cache_clusters = 2

  automatic_failover_enabled = true
  multi_az_enabled          = true

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.redis_password

  subnet_group_name = aws_elasticache_subnet_group.legal.name
  security_group_ids = [aws_security_group.redis.id]

  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
}

# Application Load Balancer
resource "aws_lb" "legal_alb" {
  name               = "legal-system-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id

  enable_deletion_protection = true
  enable_http2              = true

  tags = {
    Name = "legal-system-alb"
  }
}

# ECS Task Definition - API
resource "aws_ecs_task_definition" "api" {
  family                   = "legal-api"
  network_mode            = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                     = "2048"
  memory                  = "4096"
  execution_role_arn      = aws_iam_role.ecs_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "api"
      image = "${aws_ecr_repository.api.repository_url}:latest"

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "REDIS_HOST"
          value = aws_elasticache_replication_group.legal_redis.configuration_endpoint_address
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.db_url.arn
        },
        {
          name      = "REDIS_PASSWORD"
          valueFrom = aws_secretsmanager_secret.redis_password.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.legal.name
          "awslogs-region"        = "us-west-2"
          "awslogs-stream-prefix" = "api"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])
}

# ECS Service - API
resource "aws_ecs_service" "api" {
  name            = "legal-api-service"
  cluster         = aws_ecs_cluster.legal_cluster.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  enable_ecs_managed_tags = true
}

# Auto Scaling
resource "aws_appautoscaling_target" "api" {
  max_capacity       = 20
  min_capacity       = 3
  resource_id        = "service/${aws_ecs_cluster.legal_cluster.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

### Google Cloud Platform

```yaml
# gcp/deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: legal-api
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
spec:
  type: NodePort
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 3000

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: legal-ingress
  annotations:
    kubernetes.io/ingress.global-static-ip-name: "legal-ip"
    networking.gke.io/managed-certificates: "legal-cert"
    kubernetes.io/ingress.class: "gce"
spec:
  rules:
  - host: api.legal-system.com
    http:
      paths:
      - path: /*
        pathType: ImplementationSpecific
        backend:
          service:
            name: legal-api
            port:
              number: 80

---
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: legal-cert
spec:
  domains:
  - api.legal-system.com
```

---

## Environment Configuration

### Production Environment Variables

```bash
# .env.production

# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@db.legal-system.com:5432/legal_db
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_SSL=true

# Redis
REDIS_HOST=redis.legal-system.com
REDIS_PORT=6379
REDIS_PASSWORD=strong_password_here
REDIS_TLS=true

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_MAX_RETRIES=3
OPENAI_TIMEOUT=30000

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=apikey
SMTP_PASSWORD=SG...
SMTP_FROM=noreply@legal-system.com

# Storage
CLOUDINARY_CLOUD_NAME=legal-system
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Worker
WORKER_CONCURRENCY=5
JOB_TIMEOUT=300000
MAX_RETRIES=3

# Security
JWT_SECRET=...
ENCRYPTION_KEY=...
CORS_ORIGIN=https://app.legal-system.com

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
NEW_RELIC_LICENSE_KEY=...
DATADOG_API_KEY=...
```

---

## Database Setup

### Production Database Configuration

```sql
-- Performance tuning
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '8GB';
ALTER SYSTEM SET effective_cache_size = '24GB';
ALTER SYSTEM SET maintenance_work_mem = '2GB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '20MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

-- Connection pooling
ALTER SYSTEM SET max_prepared_transactions = 100;

-- Reload configuration
SELECT pg_reload_conf();
```

### Backup Strategy

```bash
#!/bin/bash
# backup.sh

# Configuration
DB_NAME="legal_db"
DB_USER="legal_user"
BACKUP_DIR="/backups"
S3_BUCKET="legal-system-backups"
RETENTION_DAYS=30

# Create backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Perform backup
pg_dump -U ${DB_USER} -d ${DB_NAME} --verbose --no-owner | gzip > ${BACKUP_FILE}

# Upload to S3
aws s3 cp ${BACKUP_FILE} s3://${S3_BUCKET}/postgres/

# Clean old local backups
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +7 -delete

# Clean old S3 backups
aws s3 ls s3://${S3_BUCKET}/postgres/ | \
  awk '{print $4}' | \
  while read -r file; do
    age=$(aws s3api head-object --bucket ${S3_BUCKET} --key postgres/${file} | \
          jq -r '.LastModified' | \
          xargs -I {} date -d {} +%s)
    now=$(date +%s)
    diff=$((($now - $age) / 86400))
    if [ $diff -gt ${RETENTION_DAYS} ]; then
      aws s3 rm s3://${S3_BUCKET}/postgres/${file}
    fi
  done
```

---

## Security Hardening

### SSL/TLS Configuration

```nginx
# SSL Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_stapling on;
ssl_stapling_verify on;

# Security Headers
add_header Strict-Transport-Security "max-age=63072000" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Content-Security-Policy "default-src 'self'" always;
```

### Network Security

```yaml
# Network Policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
  namespace: legal-system
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

### Secrets Management

```bash
# Using HashiCorp Vault
vault kv put secret/legal-system/production \
  database_url="..." \
  redis_password="..." \
  openai_api_key="..." \
  jwt_secret="..."

# Kubernetes integration
kubectl create secret generic legal-secrets \
  --from-literal=database-url="$(vault kv get -field=database_url secret/legal-system/production)"
```

---

## Monitoring Setup

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'legal-api'
    static_configs:
      - targets: ['api-service:3000']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Grafana Dashboards

```json
{
  "dashboard": {
    "title": "Legal System Monitoring",
    "panels": [
      {
        "title": "API Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Document Processing Queue",
        "targets": [
          {
            "expr": "bullmq_queue_waiting{queue='document-processing'}"
          }
        ]
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~'5..'}[5m])"
          }
        ]
      }
    ]
  }
}
```

### Logging with ELK Stack

```yaml
# filebeat.yml
filebeat.inputs:
- type: container
  paths:
    - '/var/lib/docker/containers/*/*.log'
  processors:
    - add_kubernetes_metadata:
        host: ${NODE_NAME}
        matchers:
        - logs_path:
            logs_path: "/var/lib/docker/containers/"

output.elasticsearch:
  hosts: ['elasticsearch:9200']
  index: "legal-system-%{+yyyy.MM.dd}"

logging.level: info
logging.to_files: true
```

---

## Backup and Recovery

### Automated Backup Script

```bash
#!/bin/bash
# automated-backup.sh

set -e

# Configuration
source /etc/legal-system/backup.conf

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Database backup
backup_database() {
    log "Starting database backup..."

    BACKUP_FILE="${BACKUP_DIR}/db_$(date +%Y%m%d_%H%M%S).sql.gz"

    pg_dump \
        --host=${DB_HOST} \
        --port=${DB_PORT} \
        --username=${DB_USER} \
        --dbname=${DB_NAME} \
        --no-password \
        --verbose \
        --format=custom \
        --compress=9 \
        > ${BACKUP_FILE}

    # Upload to cloud storage
    aws s3 cp ${BACKUP_FILE} s3://${S3_BUCKET}/database/

    log "Database backup completed: ${BACKUP_FILE}"
}

# Redis backup
backup_redis() {
    log "Starting Redis backup..."

    redis-cli --rdb ${BACKUP_DIR}/redis_$(date +%Y%m%d_%H%M%S).rdb

    aws s3 cp ${BACKUP_DIR}/redis_*.rdb s3://${S3_BUCKET}/redis/

    log "Redis backup completed"
}

# Document files backup
backup_files() {
    log "Starting file backup..."

    tar czf ${BACKUP_DIR}/files_$(date +%Y%m%d_%H%M%S).tar.gz ${DOCUMENT_DIR}

    aws s3 sync ${DOCUMENT_DIR} s3://${S3_BUCKET}/documents/

    log "File backup completed"
}

# Main execution
main() {
    log "=== Backup started ==="

    backup_database
    backup_redis
    backup_files

    # Clean old backups
    find ${BACKUP_DIR} -mtime +${RETENTION_DAYS} -delete

    log "=== Backup completed ==="
}

main
```

### Disaster Recovery Plan

```bash
#!/bin/bash
# disaster-recovery.sh

# Restore database
restore_database() {
    echo "Restoring database from backup..."

    # Get latest backup
    LATEST_BACKUP=$(aws s3 ls s3://${S3_BUCKET}/database/ | sort | tail -1 | awk '{print $4}')
    aws s3 cp s3://${S3_BUCKET}/database/${LATEST_BACKUP} /tmp/

    # Restore
    pg_restore \
        --host=${DB_HOST} \
        --port=${DB_PORT} \
        --username=${DB_USER} \
        --dbname=${DB_NAME} \
        --clean \
        --no-owner \
        --verbose \
        /tmp/${LATEST_BACKUP}
}

# Restore Redis
restore_redis() {
    echo "Restoring Redis from backup..."

    LATEST_BACKUP=$(aws s3 ls s3://${S3_BUCKET}/redis/ | sort | tail -1 | awk '{print $4}')
    aws s3 cp s3://${S3_BUCKET}/redis/${LATEST_BACKUP} /tmp/

    redis-cli --rdb /tmp/${LATEST_BACKUP}
}

# Restore files
restore_files() {
    echo "Restoring files from backup..."

    aws s3 sync s3://${S3_BUCKET}/documents/ ${DOCUMENT_DIR}/
}
```

---

## Performance Tuning

### Node.js Optimization

```javascript
// cluster.js
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const cpuCount = os.cpus().length;

  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  require('./dist/index.js');
}
```

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX CONCURRENTLY idx_documents_case_created
  ON documents(case_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_legal_hierarchy_current
  ON document_registry(hierarchy_path)
  WHERE is_current_version = true;

-- Partitioning for large tables
CREATE TABLE document_processing_history_2024 PARTITION OF document_processing_history
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Materialized views for complex queries
CREATE MATERIALIZED VIEW document_stats_mv AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  document_type,
  COUNT(*) as count,
  AVG(processing_time_ms) as avg_processing_time
FROM document_processing_history
GROUP BY 1, 2
WITH DATA;

CREATE INDEX ON document_stats_mv(date, document_type);

-- Refresh schedule
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'refresh-stats',
  '0 */6 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY document_stats_mv;'
);
```

### Redis Optimization

```redis
# Redis configuration
maxmemory 4gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
```

---

## Troubleshooting

### Common Production Issues

#### High Memory Usage

```bash
# Check Node.js memory
node --inspect dist/index.js
chrome://inspect

# Heap snapshot
kill -USR2 <pid>

# Memory profiling
node --heap-prof dist/index.js
```

#### Database Connection Issues

```sql
-- Check connections
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  state_change
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- Kill long-running queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < NOW() - INTERVAL '10 minutes';
```

#### Redis Memory Issues

```bash
# Check memory usage
redis-cli INFO memory

# Clear cache
redis-cli FLUSHDB

# Check slow queries
redis-cli SLOWLOG GET 10
```

### Health Check Endpoints

```typescript
// Health check implementation
app.get('/health/live', async (req, res) => {
  res.status(200).json({ status: 'alive' });
});

app.get('/health/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

app.get('/health/detailed', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: await checkDatabase(),
    redis: await checkRedis(),
    queue: await checkQueue()
  };

  res.json(health);
});
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Security scan completed
- [ ] Dependencies updated
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Database migrations ready
- [ ] Backup system tested
- [ ] Monitoring configured
- [ ] Load testing completed
- [ ] Documentation updated

### Deployment Steps

1. [ ] Create database backup
2. [ ] Deploy database migrations
3. [ ] Build Docker images
4. [ ] Push to registry
5. [ ] Update Kubernetes manifests
6. [ ] Deploy to staging
7. [ ] Run smoke tests
8. [ ] Deploy to production (blue-green)
9. [ ] Verify health checks
10. [ ] Monitor metrics

### Post-Deployment

- [ ] Verify all services running
- [ ] Check error rates
- [ ] Monitor performance metrics
- [ ] Test critical paths
- [ ] Update status page
- [ ] Notify stakeholders
- [ ] Document any issues
- [ ] Schedule retrospective

---

*Deployment Guide Version: 1.0.0 | Last Updated: November 10, 2024*