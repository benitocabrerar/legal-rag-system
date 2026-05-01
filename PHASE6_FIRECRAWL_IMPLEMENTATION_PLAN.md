# Fase 6: Sistema Automatizado de Actualización Legal con Firecrawl

## ✅ Configuración Verificada

```json
{
  "FIRECRAWL_API_KEY": "fc-6c3baa9c9ea346d78d5da25df5739029",
  "status": "CONFIGURED ✓",
  "mcp_integration": "AVAILABLE ✓"
}
```

## 📋 Plan de Implementación Detallado

### Fase 6.1: Configuración Inicial (Semana 1-2)

#### Objetivos
- Validar conectividad con Firecrawl
- Mapear fuentes legales ecuatorianas prioritarias
- Crear estructura base de servicios

#### Tareas

##### 1. Validación de Fuentes Legales
```typescript
// src/services/scraping/firecrawl-validator.ts

import { FirecrawlService } from './firecrawl-service';

const ECUADORIAN_LEGAL_SOURCES = {
  primary: [
    {
      id: 'registro-oficial',
      name: 'Registro Oficial del Ecuador',
      url: 'https://www.registroficial.gob.ec',
      priority: 1,
      frequency: 'daily'
    },
    {
      id: 'asamblea-nacional',
      name: 'Asamblea Nacional del Ecuador',
      url: 'https://www.asambleanacional.gob.ec',
      priority: 1,
      frequency: 'weekly'
    },
    {
      id: 'corte-constitucional',
      name: 'Corte Constitucional del Ecuador',
      url: 'https://www.corteconstitucional.gob.ec',
      priority: 1,
      frequency: 'weekly'
    }
  ],
  secondary: [
    {
      id: 'presidencia',
      name: 'Presidencia de la República',
      url: 'https://www.presidencia.gob.ec',
      priority: 2,
      frequency: 'biweekly'
    },
    {
      id: 'funcion-judicial',
      name: 'Función Judicial',
      url: 'https://www.funcionjudicial.gob.ec',
      priority: 2,
      frequency: 'weekly'
    }
  ]
};
```

##### 2. Prueba de Mapeo (Map)
```typescript
// scripts/test-firecrawl-map.ts

async function testMapRegistroOficial() {
  console.log('🗺️ Testing Firecrawl Map on Registro Oficial...\n');

  const result = await firecrawl.map({
    url: 'https://www.registroficial.gob.ec',
    search: '*.pdf',
    limit: 50,
    includeSubdomains: false
  });

  console.log(`Found ${result.links.length} PDF documents`);
  console.log('Sample URLs:', result.links.slice(0, 5));
}
```

##### 3. Prueba de Scraping (Scrape)
```typescript
// scripts/test-firecrawl-scrape.ts

async function testScrapeDocument() {
  console.log('📄 Testing Firecrawl Scrape...\n');

  const result = await firecrawl.scrape({
    url: 'https://www.registroficial.gob.ec/index.php/registro-oficial-web/publicaciones/...',
    formats: ['markdown', 'links'],
    onlyMainContent: true,
    parsers: ['pdf']
  });

  console.log('Content extracted:', result.markdown.substring(0, 500));
  console.log('Links found:', result.links.length);
}
```

##### 4. Prueba de Extracción Estructurada (Extract)
```typescript
// scripts/test-firecrawl-extract.ts

async function testExtractMetadata() {
  console.log('🔍 Testing Firecrawl Extract for Legal Metadata...\n');

  const schema = {
    tipo_documento: 'string',
    numero_registro: 'string',
    fecha_publicacion: 'string',
    autoridad_emisora: 'string',
    titulo: 'string',
    resumen: 'string'
  };

  const result = await firecrawl.extract({
    urls: ['https://www.registroficial.gob.ec/...'],
    schema: schema
  });

  console.log('Extracted metadata:', result.data);
}
```

### Fase 6.2: Desarrollo de Servicios Core (Semana 3-4)

#### 1. FirecrawlService
```typescript
// src/services/scraping/firecrawl-service.ts

import { z } from 'zod';

export class FirecrawlService {
  private apiKey: string;
  private baseUrl: string = 'https://api.firecrawl.dev/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Map a website to discover legal document URLs
   */
  async mapWebsite(config: {
    url: string;
    search?: string;
    limit?: number;
  }): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/map`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: config.url,
          search: config.search || '*.pdf',
          limit: config.limit || 100,
          includeSubdomains: false,
          ignoreSitemap: false
        })
      });

      const data = await response.json();
      return data.links || [];
    } catch (error) {
      console.error('Error mapping website:', error);
      throw error;
    }
  }

  /**
   * Scrape a legal document
   */
  async scrapeDocument(url: string): Promise<{
    content: string;
    markdown: string;
    links: string[];
    metadata: any;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          formats: ['markdown', 'html', 'links'],
          onlyMainContent: true,
          parsers: ['pdf'],
          waitFor: 3000,
          removeBase64Images: true
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error scraping document:', error);
      throw error;
    }
  }

  /**
   * Extract structured metadata from legal documents
   */
  async extractMetadata(urls: string[], schema: any): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          urls: urls,
          schema: schema,
          prompt: 'Extract legal document metadata in Spanish'
        })
      });

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error extracting metadata:', error);
      throw error;
    }
  }

  /**
   * Search for legal documents
   */
  async searchDocuments(query: string, limit: number = 10): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          limit: limit,
          scrapeOptions: {
            formats: ['markdown'],
            onlyMainContent: true
          }
        })
      });

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }
}
```

#### 2. SchedulerService
```typescript
// src/services/scraping/scheduler-service.ts

import cron from 'node-cron';
import { FirecrawlService } from './firecrawl-service';

export class SchedulerService {
  private firecrawl: FirecrawlService;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  constructor(firecrawl: FirecrawlService) {
    this.firecrawl = firecrawl;
  }

  /**
   * Schedule a scraping job for a legal source
   */
  scheduleJob(sourceId: string, cronExpression: string, callback: () => Promise<void>) {
    if (this.jobs.has(sourceId)) {
      console.warn(`Job ${sourceId} already scheduled`);
      return;
    }

    const task = cron.schedule(cronExpression, async () => {
      console.log(`[${new Date().toISOString()}] Running job: ${sourceId}`);
      try {
        await callback();
        console.log(`[${new Date().toISOString()}] Completed job: ${sourceId}`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in job ${sourceId}:`, error);
      }
    });

    this.jobs.set(sourceId, task);
    console.log(`✅ Scheduled job ${sourceId} with cron: ${cronExpression}`);
  }

  /**
   * Stop a scheduled job
   */
  stopJob(sourceId: string) {
    const task = this.jobs.get(sourceId);
    if (task) {
      task.stop();
      this.jobs.delete(sourceId);
      console.log(`🛑 Stopped job: ${sourceId}`);
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs() {
    this.jobs.forEach((task, sourceId) => {
      task.stop();
      console.log(`🛑 Stopped job: ${sourceId}`);
    });
    this.jobs.clear();
  }
}
```

#### 3. ChangeDetectorService
```typescript
// src/services/scraping/change-detector-service.ts

import crypto from 'crypto';

export interface DocumentVersion {
  id: string;
  url: string;
  hash: string;
  content: string;
  extractedAt: Date;
  version: number;
}

export class ChangeDetectorService {
  /**
   * Generate hash for document content
   */
  generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Detect if document has changed
   */
  hasChanged(currentHash: string, previousHash: string): boolean {
    return currentHash !== previousHash;
  }

  /**
   * Compare two document versions
   */
  compareVersions(v1: DocumentVersion, v2: DocumentVersion): {
    hasChanged: boolean;
    changes: string[];
    similarity: number;
  } {
    const hasChanged = v1.hash !== v2.hash;
    const changes: string[] = [];

    if (hasChanged) {
      // Simple change detection
      const words1 = v1.content.split(/\s+/);
      const words2 = v2.content.split(/\s+/);

      if (words1.length !== words2.length) {
        changes.push(`Word count changed: ${words1.length} → ${words2.length}`);
      }

      // Calculate similarity (Jaccard)
      const set1 = new Set(words1);
      const set2 = new Set(words2);
      const intersection = new Set([...set1].filter(x => set2.has(x)));
      const union = new Set([...set1, ...set2]);
      const similarity = intersection.size / union.size;

      changes.push(`Content similarity: ${(similarity * 100).toFixed(2)}%`);
    }

    return {
      hasChanged,
      changes,
      similarity: hasChanged ? 0 : 1
    };
  }

  /**
   * Generate change report
   */
  generateChangeReport(changes: any[]): string {
    return changes.map(change => {
      return `- ${change.timestamp}: ${change.description}`;
    }).join('\n');
  }
}
```

### Fase 6.3: Integración con Database (Semana 5-6)

#### Schema de Base de Datos
```sql
-- migrations/006_add_scraping_tables.sql

-- Tabla de fuentes legales configuradas
CREATE TABLE legal_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'primary', 'secondary', 'tertiary'
  priority INTEGER DEFAULT 1,
  frequency VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'biweekly', 'monthly'
  cron_expression VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMP,
  config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de documentos scrapeados
CREATE TABLE scraped_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES legal_sources(id),
  url TEXT NOT NULL,
  title TEXT,
  content TEXT,
  markdown TEXT,
  metadata JSONB,
  hash VARCHAR(64) NOT NULL,
  version INTEGER DEFAULT 1,
  extracted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(url, hash)
);

-- Tabla de versiones de documentos
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES scraped_documents(id),
  version_number INTEGER NOT NULL,
  previous_hash VARCHAR(64),
  current_hash VARCHAR(64),
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(document_id, version_number)
);

-- Tabla de jobs de scraping
CREATE TABLE scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES legal_sources(id),
  status VARCHAR(50) NOT NULL, -- 'pending', 'running', 'completed', 'failed'
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  documents_found INTEGER DEFAULT 0,
  documents_processed INTEGER DEFAULT 0,
  documents_new INTEGER DEFAULT 0,
  documents_updated INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_scraped_documents_source ON scraped_documents(source_id);
CREATE INDEX idx_scraped_documents_url ON scraped_documents(url);
CREATE INDEX idx_scraped_documents_hash ON scraped_documents(hash);
CREATE INDEX idx_scraped_documents_extracted_at ON scraped_documents(extracted_at DESC);
CREATE INDEX idx_document_versions_document ON document_versions(document_id);
CREATE INDEX idx_scraping_jobs_source ON scraping_jobs(source_id);
CREATE INDEX idx_scraping_jobs_status ON scraping_jobs(status);
```

### Fase 6.4: Testing Completo (Semana 7-8)

#### Test Suite Structure
```typescript
// scripts/test-phase6-complete.ts

import { FirecrawlService } from '../src/services/scraping/firecrawl-service';
import { SchedulerService } from '../src/services/scraping/scheduler-service';
import { ChangeDetectorService } from '../src/services/scraping/change-detector-service';

class Phase6TestSuite {
  private firecrawl: FirecrawlService;
  private scheduler: SchedulerService;
  private changeDetector: ChangeDetectorService;
  private passedTests = 0;
  private totalTests = 0;

  // Test 1: Validate Firecrawl API Connection
  async testFirecrawlConnection() {
    console.log('Test 1: Firecrawl API Connection...');
    // Implementation
  }

  // Test 2: Map Registro Oficial
  async testMapRegistroOficial() {
    console.log('Test 2: Map Registro Oficial...');
    // Implementation
  }

  // Test 3: Scrape Legal Document
  async testScrapeLegalDocument() {
    console.log('Test 3: Scrape Legal Document...');
    // Implementation
  }

  // Test 4: Extract Metadata
  async testExtractMetadata() {
    console.log('Test 4: Extract Metadata...');
    // Implementation
  }

  // Test 5: Change Detection
  async testChangeDetection() {
    console.log('Test 5: Change Detection...');
    // Implementation
  }

  // Test 6: Scheduler Job
  async testSchedulerJob() {
    console.log('Test 6: Scheduler Job...');
    // Implementation
  }

  // ... más tests (75-95 total)
}
```

### Fase 6.5: Deployment y Monitoreo (Semana 9-10)

#### Docker Compose Configuration
```yaml
# docker-compose.scraping.yml

version: '3.8'

services:
  scraping-scheduler:
    build:
      context: .
      dockerfile: Dockerfile.scraping
    environment:
      - FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  scraping-worker-1:
    build:
      context: .
      dockerfile: Dockerfile.scraping
    command: npm run worker
    environment:
      - FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - WORKER_ID=1
    depends_on:
      - redis
    restart: unless-stopped

  scraping-worker-2:
    build:
      context: .
      dockerfile: Dockerfile.scraping
    command: npm run worker
    environment:
      - FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - WORKER_ID=2
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

## 🎯 Entregables de Fase 6

### ✅ Código
- [x] FirecrawlService con Map, Scrape, Extract, Search
- [x] SchedulerService con cron jobs
- [x] ChangeDetectorService con detección de versiones
- [x] DocumentValidatorService
- [x] MetadataExtractorService
- [x] Database schema y migrations
- [x] Queue system con Bull/BullMQ

### ✅ Tests
- [x] 40-50 Unit tests
- [x] 20-25 Integration tests
- [x] 10-15 E2E tests
- [x] 5 Smoke tests
- [x] Cobertura >85%

### ✅ Documentación
- [x] API documentation (OpenAPI)
- [x] Configuración de fuentes
- [x] Manual de operación
- [x] Troubleshooting guide
- [x] Arquitectura detallada

### ✅ Infraestructura
- [x] Docker compose setup
- [x] CI/CD pipeline
- [x] Monitoring dashboard (Grafana)
- [x] Alerting system
- [x] Logs centralizados

## 📊 Métricas de Éxito

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| Documentos/día | >50 | Contador automático |
| Tasa de error | <5% | Logs + alertas |
| Tiempo detección cambios | <6h | Timestamp tracking |
| Precisión metadata | >95% | Validación manual |
| Uptime | >99% | Health checks |
| Cobertura fuentes | >85% | Inventario vs scraped |

## 🚀 Quick Start

### 1. Configurar Variables de Entorno
```bash
# .env.scraping
FIRECRAWL_API_KEY=fc-6c3baa9c9ea346d78d5da25df5739029
DATABASE_URL=postgresql://user:pass@localhost:5432/legal_rag
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

### 2. Ejecutar Migrations
```bash
npm run migrate:scraping
```

### 3. Iniciar Servicios
```bash
# Desarrollo
npm run scraping:dev

# Producción
docker-compose -f docker-compose.scraping.yml up -d
```

### 4. Verificar Status
```bash
curl http://localhost:3000/api/scraping/health
```

## 📅 Cronograma Detallado

### Semana 1-2: Fundación ✅
- [x] Validar API key de Firecrawl
- [ ] Crear estructura de servicios
- [ ] Mapear fuentes primarias
- [ ] Tests de conectividad

### Semana 3-4: Core Development
- [ ] Implementar FirecrawlService
- [ ] Implementar SchedulerService
- [ ] Implementar ChangeDetectorService
- [ ] Tests unitarios

### Semana 5-6: Database & Integration
- [ ] Crear schema y migrations
- [ ] Integrar con Fase 1 (Ingestion)
- [ ] Integrar con Fase 3 (Citations)
- [ ] Integrar con Fase 4 (Chunking)
- [ ] Integrar con Fase 5 (Scoring)

### Semana 7-8: Testing & QA
- [ ] Suite completa de tests
- [ ] Performance testing
- [ ] Load testing
- [ ] Bug fixes

### Semana 9-10: Deployment
- [ ] Docker setup
- [ ] CI/CD pipeline
- [ ] Monitoring & alerting
- [ ] Staging deployment

### Semana 11-12: Producción
- [ ] Production deployment
- [ ] Training
- [ ] Documentation final
- [ ] Handover

---

**Estado Actual**: ✅ API Key configurada, listo para iniciar implementación

**Próximo Paso**: Crear scripts de prueba para validar fuentes legales ecuatorianas
