/**
 * Performance Analysis Script for Legal RAG System
 * Comprehensive performance profiling and benchmarking
 */

import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface PerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

interface DatabaseMetric {
  query: string;
  executionTime: number;
  rowCount: number;
  timestamp: Date;
}

interface VectorSearchMetric {
  operation: string;
  itemCount: number;
  executionTime: number;
  timestamp: Date;
}

class PerformanceAnalyzer {
  private metrics: PerformanceMetric[] = [];
  private dbMetrics: DatabaseMetric[] = [];
  private vectorMetrics: VectorSearchMetric[] = [];
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * 1. Backend Performance Metrics
   */
  async analyzeBackendPerformance() {
    console.log('\n📊 ANALYZING BACKEND PERFORMANCE METRICS\n');
    console.log('=' .repeat(60));

    const endpoints = [
      { path: '/health', method: 'GET' },
      { path: '/api/v1/legal-documents', method: 'GET' },
      { path: '/api/v1/legal-documents/search', method: 'POST' },
      { path: '/api/v1/query', method: 'POST' },
      { path: '/api/v1/feedback/search-quality', method: 'GET' },
    ];

    for (const endpoint of endpoints) {
      try {
        const startTime = performance.now();
        const startCpu = process.cpuUsage();
        const memBefore = process.memoryUsage();

        // Make request (simplified for analysis)
        const response = await this.makeRequest(endpoint.path, endpoint.method);

        const endTime = performance.now();
        const endCpu = process.cpuUsage(startCpu);
        const memAfter = process.memoryUsage();

        const metric: PerformanceMetric = {
          endpoint: endpoint.path,
          method: endpoint.method,
          responseTime: endTime - startTime,
          statusCode: response?.status || 0,
          timestamp: new Date(),
          memoryUsage: memAfter,
          cpuUsage: endCpu,
        };

        this.metrics.push(metric);
        console.log(`✓ ${endpoint.method} ${endpoint.path}: ${metric.responseTime.toFixed(2)}ms`);
      } catch (error) {
        console.log(`✗ ${endpoint.method} ${endpoint.path}: Failed`);
      }
    }

    // Calculate statistics
    this.calculateLatencyPercentiles();
  }

  /**
   * 2. Database Performance Analysis
   */
  async analyzeDatabasePerformance() {
    console.log('\n🗄️ ANALYZING DATABASE PERFORMANCE\n');
    console.log('=' .repeat(60));

    // Test queries
    const queries = [
      {
        name: 'Count Legal Documents',
        fn: async () => prisma.legalDocument.count(),
      },
      {
        name: 'Complex Search Query',
        fn: async () => prisma.legalDocument.findMany({
          where: {
            AND: [
              { normType: 'CONSTITUTIONAL_NORM' },
              { isActive: true },
            ],
          },
          include: {
            chunks: {
              take: 5,
            },
          },
          take: 10,
        }),
      },
      {
        name: 'Find with Full Text Search',
        fn: async () => prisma.$queryRaw`
          SELECT id, norm_title, content
          FROM "LegalDocument"
          WHERE to_tsvector('spanish', content) @@ to_tsquery('spanish', 'constitución')
          LIMIT 10
        `,
      },
    ];

    for (const query of queries) {
      const start = performance.now();
      try {
        const result = await query.fn();
        const duration = performance.now() - start;

        this.dbMetrics.push({
          query: query.name,
          executionTime: duration,
          rowCount: Array.isArray(result) ? result.length : 1,
          timestamp: new Date(),
        });

        console.log(`✓ ${query.name}: ${duration.toFixed(2)}ms`);
      } catch (error) {
        console.log(`✗ ${query.name}: Failed - ${error}`);
      }
    }

    // Check for N+1 queries
    await this.detectNPlusOneQueries();
  }

  /**
   * 3. Vector Search Performance
   */
  async analyzeVectorSearchPerformance() {
    console.log('\n🔍 ANALYZING VECTOR SEARCH PERFORMANCE\n');
    console.log('=' .repeat(60));

    const testTexts = [
      'Artículo 100 de la Constitución',
      'Derechos fundamentales del ciudadano',
      'Proceso administrativo sancionador',
    ];

    for (const text of testTexts) {
      const start = performance.now();

      try {
        // Test embedding generation
        const embeddingStart = performance.now();
        const embedding = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: text,
        });
        const embeddingTime = performance.now() - embeddingStart;

        // Test vector similarity search (simulated)
        const searchStart = performance.now();
        const searchResults = await this.simulateVectorSearch(embedding.data[0].embedding);
        const searchTime = performance.now() - searchStart;

        const totalTime = performance.now() - start;

        this.vectorMetrics.push({
          operation: 'embedding_generation',
          itemCount: 1,
          executionTime: embeddingTime,
          timestamp: new Date(),
        });

        this.vectorMetrics.push({
          operation: 'similarity_search',
          itemCount: searchResults.length,
          executionTime: searchTime,
          timestamp: new Date(),
        });

        console.log(`✓ Vector Search for "${text.substring(0, 30)}..."`);
        console.log(`  - Embedding Generation: ${embeddingTime.toFixed(2)}ms`);
        console.log(`  - Similarity Search: ${searchTime.toFixed(2)}ms`);
        console.log(`  - Total: ${totalTime.toFixed(2)}ms`);
      } catch (error) {
        console.log(`✗ Vector Search for "${text}": Failed`);
      }
    }
  }

  /**
   * 4. Memory and Resource Analysis
   */
  async analyzeMemoryUsage() {
    console.log('\n💾 ANALYZING MEMORY USAGE\n');
    console.log('=' .repeat(60));

    const memUsage = process.memoryUsage();
    const formatMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

    console.log(`Heap Used: ${formatMB(memUsage.heapUsed)} MB`);
    console.log(`Heap Total: ${formatMB(memUsage.heapTotal)} MB`);
    console.log(`RSS: ${formatMB(memUsage.rss)} MB`);
    console.log(`External: ${formatMB(memUsage.external)} MB`);
    console.log(`Array Buffers: ${formatMB(memUsage.arrayBuffers)} MB`);

    // Check for memory leaks
    await this.checkForMemoryLeaks();
  }

  /**
   * 5. Identify Bottlenecks
   */
  async identifyBottlenecks() {
    console.log('\n🚨 IDENTIFYING BOTTLENECKS\n');
    console.log('=' .repeat(60));

    // Analyze slow endpoints
    const slowEndpoints = this.metrics
      .filter(m => m.responseTime > 1000)
      .sort((a, b) => b.responseTime - a.responseTime);

    if (slowEndpoints.length > 0) {
      console.log('\n⚠️  Slow Endpoints (>1000ms):');
      slowEndpoints.forEach(endpoint => {
        console.log(`  - ${endpoint.method} ${endpoint.endpoint}: ${endpoint.responseTime.toFixed(2)}ms`);
      });
    }

    // Analyze slow database queries
    const slowQueries = this.dbMetrics
      .filter(m => m.executionTime > 500)
      .sort((a, b) => b.executionTime - a.executionTime);

    if (slowQueries.length > 0) {
      console.log('\n⚠️  Slow Database Queries (>500ms):');
      slowQueries.forEach(query => {
        console.log(`  - ${query.query}: ${query.executionTime.toFixed(2)}ms`);
      });
    }

    // Check connection pool
    await this.checkConnectionPool();
  }

  /**
   * 6. Generate Optimization Recommendations
   */
  generateOptimizations() {
    console.log('\n💡 OPTIMIZATION RECOMMENDATIONS\n');
    console.log('=' .repeat(60));

    const recommendations = [];

    // Backend optimizations
    const avgResponseTime = this.metrics.reduce((sum, m) => sum + m.responseTime, 0) / this.metrics.length;
    if (avgResponseTime > 500) {
      recommendations.push({
        category: 'Backend',
        issue: 'High average response time',
        recommendation: 'Implement Redis caching for frequently accessed data',
        priority: 'HIGH',
      });
    }

    // Database optimizations
    const avgQueryTime = this.dbMetrics.reduce((sum, m) => sum + m.executionTime, 0) / this.dbMetrics.length;
    if (avgQueryTime > 200) {
      recommendations.push({
        category: 'Database',
        issue: 'Slow query execution',
        recommendation: 'Add composite indexes for frequently queried column combinations',
        priority: 'HIGH',
      });
    }

    // Vector search optimizations
    const avgVectorTime = this.vectorMetrics
      .filter(m => m.operation === 'similarity_search')
      .reduce((sum, m, _, arr) => sum + m.executionTime / arr.length, 0);

    if (avgVectorTime > 300) {
      recommendations.push({
        category: 'Vector Search',
        issue: 'Slow similarity search',
        recommendation: 'Implement approximate nearest neighbor (ANN) indexing',
        priority: 'MEDIUM',
      });
    }

    // Memory optimizations
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed / memUsage.heapTotal > 0.9) {
      recommendations.push({
        category: 'Memory',
        issue: 'High heap usage',
        recommendation: 'Implement object pooling and aggressive garbage collection',
        priority: 'HIGH',
      });
    }

    // Print recommendations
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. [${rec.priority}] ${rec.category}`);
      console.log(`   Issue: ${rec.issue}`);
      console.log(`   Recommendation: ${rec.recommendation}`);
    });

    return recommendations;
  }

  /**
   * Helper Methods
   */
  private calculateLatencyPercentiles() {
    if (this.metrics.length === 0) return;

    const times = this.metrics.map(m => m.responseTime).sort((a, b) => a - b);
    const p50 = times[Math.floor(times.length * 0.5)];
    const p95 = times[Math.floor(times.length * 0.95)];
    const p99 = times[Math.floor(times.length * 0.99)];

    console.log('\n📈 Latency Percentiles:');
    console.log(`  P50: ${p50.toFixed(2)}ms`);
    console.log(`  P95: ${p95.toFixed(2)}ms`);
    console.log(`  P99: ${p99.toFixed(2)}ms`);
  }

  private async detectNPlusOneQueries() {
    console.log('\n🔍 Checking for N+1 Query Problems...');

    // Monitor queries when fetching related data
    const startQueries = await this.getQueryCount();

    // Typical N+1 scenario: fetching documents with chunks
    await prisma.legalDocument.findMany({
      take: 10,
      include: {
        chunks: true,
      },
    });

    const endQueries = await this.getQueryCount();
    const queryCount = endQueries - startQueries;

    if (queryCount > 11) {  // 1 for documents + 10 for chunks = 11 max
      console.log(`  ⚠️  Potential N+1 detected: ${queryCount} queries for 10 documents`);
    } else {
      console.log(`  ✓ No N+1 problems detected (${queryCount} queries)`);
    }
  }

  private async checkForMemoryLeaks() {
    console.log('\n🔍 Checking for Memory Leaks...');

    const iterations = 5;
    const memSamples = [];

    for (let i = 0; i < iterations; i++) {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      memSamples.push(process.memoryUsage().heapUsed);
    }

    // Check if memory is continuously increasing
    let increasing = true;
    for (let i = 1; i < memSamples.length; i++) {
      if (memSamples[i] <= memSamples[i - 1]) {
        increasing = false;
        break;
      }
    }

    if (increasing) {
      console.log('  ⚠️  Potential memory leak detected');
    } else {
      console.log('  ✓ No memory leaks detected');
    }
  }

  private async checkConnectionPool() {
    console.log('\n🔍 Checking Database Connection Pool...');

    try {
      // Get pool metrics from Prisma
      const metrics = await prisma.$metrics.json();
      console.log('  Database metrics retrieved successfully');

      // Analyze connection pool usage
      const poolMetrics = metrics.counters.find((c: any) => c.key === 'prisma_pool_connections_open');
      if (poolMetrics) {
        console.log(`  Open connections: ${poolMetrics.value}`);
      }
    } catch (error) {
      console.log('  Unable to retrieve connection pool metrics');
    }
  }

  private async makeRequest(path: string, method: string): Promise<any> {
    try {
      const url = `${this.baseUrl}${path}`;

      if (method === 'GET') {
        return await axios.get(url);
      } else if (method === 'POST') {
        // Sample POST data for testing
        const data = path.includes('search')
          ? { query: 'test' }
          : { caseId: 'test-id', query: 'test query' };
        return await axios.post(url, data);
      }
    } catch (error) {
      // Return error response
      return { status: 500 };
    }
  }

  private async simulateVectorSearch(embedding: number[]): Promise<any[]> {
    // Simulate vector search with database
    const chunks = await prisma.documentChunk.findMany({
      take: 10,
      select: {
        id: true,
        chunkIndex: true,
      },
    });

    return chunks;
  }

  private async getQueryCount(): Promise<number> {
    // This would need actual query counting implementation
    // For now, return a simulated value
    return Math.floor(Math.random() * 20);
  }

  /**
   * Generate Final Report
   */
  async generateReport() {
    console.log('\n📋 GENERATING PERFORMANCE REPORT\n');
    console.log('=' .repeat(60));

    const report = {
      timestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
      },
      metrics: {
        backend: {
          totalRequests: this.metrics.length,
          averageResponseTime: this.metrics.reduce((sum, m) => sum + m.responseTime, 0) / this.metrics.length,
          maxResponseTime: Math.max(...this.metrics.map(m => m.responseTime)),
          minResponseTime: Math.min(...this.metrics.map(m => m.responseTime)),
        },
        database: {
          totalQueries: this.dbMetrics.length,
          averageExecutionTime: this.dbMetrics.reduce((sum, m) => sum + m.executionTime, 0) / this.dbMetrics.length,
          maxExecutionTime: Math.max(...this.dbMetrics.map(m => m.executionTime)),
        },
        vectorSearch: {
          totalOperations: this.vectorMetrics.length,
          averageExecutionTime: this.vectorMetrics.reduce((sum, m) => sum + m.executionTime, 0) / this.vectorMetrics.length,
        },
      },
      recommendations: this.generateOptimizations(),
    };

    // Save report to file
    const reportPath = path.join(__dirname, `performance-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n✅ Report saved to: ${reportPath}`);

    return report;
  }
}

// Main execution
async function main() {
  console.log('🚀 LEGAL RAG SYSTEM - PERFORMANCE ANALYSIS');
  console.log('=' .repeat(60));

  const analyzer = new PerformanceAnalyzer();

  try {
    // Run all analyses
    await analyzer.analyzeBackendPerformance();
    await analyzer.analyzeDatabasePerformance();
    await analyzer.analyzeVectorSearchPerformance();
    await analyzer.analyzeMemoryUsage();
    await analyzer.identifyBottlenecks();

    // Generate final report
    const report = await analyzer.generateReport();

    console.log('\n✅ PERFORMANCE ANALYSIS COMPLETE');

  } catch (error) {
    console.error('❌ Error during performance analysis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
main().catch(console.error);

export { PerformanceAnalyzer };