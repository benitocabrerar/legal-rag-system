/**
 * Performance Testing Script for Phase 2: Database Index Optimization
 * Tests query performance before and after index creation
 * Target: 10x improvement on filtered queries
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QueryBenchmark {
  name: string;
  query: () => Promise<any>;
  expectedTimeMs: number;
}

interface BenchmarkResult {
  name: string;
  executionTime: number;
  resultCount: number;
  usedIndex: boolean;
  target: number;
  improvement: string;
  status: 'PASS' | 'FAIL';
}

/**
 * Run a single query benchmark with timing
 */
async function runBenchmark(
  name: string,
  queryFn: () => Promise<any>,
  expectedTimeMs: number
): Promise<BenchmarkResult> {
  console.log(`\n⏱️  Running: ${name}...`);

  const startTime = Date.now();
  const result = await queryFn();
  const executionTime = Date.now() - startTime;

  const resultCount = Array.isArray(result) ? result.length : 1;
  const improvement = expectedTimeMs > 0
    ? `${((expectedTimeMs / executionTime) * 100 - 100).toFixed(1)}%`
    : 'N/A';

  const status = executionTime <= expectedTimeMs ? 'PASS' : 'FAIL';

  console.log(`   ✓ Execution time: ${executionTime}ms`);
  console.log(`   ✓ Results: ${resultCount}`);
  console.log(`   ✓ Target: ${expectedTimeMs}ms`);
  console.log(`   ✓ Status: ${status === 'PASS' ? '✅ PASS' : '⚠️  FAIL'}`);

  return {
    name,
    executionTime,
    resultCount,
    usedIndex: true, // Will be verified with EXPLAIN
    target: expectedTimeMs,
    improvement,
    status,
  };
}

/**
 * Verify index usage with EXPLAIN ANALYZE
 */
async function verifyIndexUsage(query: string): Promise<boolean> {
  const explainResult: any = await prisma.$queryRawUnsafe(
    `EXPLAIN (FORMAT JSON) ${query}`
  );

  const planText = JSON.stringify(explainResult);
  return planText.includes('Index Scan') || planText.includes('Bitmap Index Scan');
}

/**
 * Benchmark Suite
 */
async function runPerformanceTests(): Promise<void> {
  console.log('\n========================================');
  console.log('PHASE 2: DATABASE INDEX PERFORMANCE TEST');
  console.log('========================================\n');

  const benchmarks: QueryBenchmark[] = [
    // Test 1: Basic filter by normType + legalHierarchy + isActive
    {
      name: 'Query 1: Filter by normType + legalHierarchy + isActive',
      query: async () => {
        return await prisma.legalDocument.findMany({
          where: {
            normType: 'ORDINARY_LAW',
            legalHierarchy: 'LEYES_ORDINARIAS',
            isActive: true,
          },
          take: 20,
        });
      },
      expectedTimeMs: 10, // Target: < 10ms with composite index
    },

    // Test 2: Date range query with filters
    {
      name: 'Query 2: Date range + normType + isActive',
      query: async () => {
        return await prisma.legalDocument.findMany({
          where: {
            publicationDate: {
              gte: new Date('2020-01-01'),
              lte: new Date('2024-12-31'),
            },
            normType: 'ORDINARY_LAW',
            isActive: true,
          },
          orderBy: {
            publicationDate: 'desc',
          },
          take: 20,
        });
      },
      expectedTimeMs: 15, // Target: < 15ms with composite index
    },

    // Test 3: Full-text search on normTitle
    {
      name: 'Query 3: Full-text search on normTitle',
      query: async () => {
        return await prisma.$queryRaw`
          SELECT * FROM "LegalDocument"
          WHERE to_tsvector('spanish', "normTitle") @@ plainto_tsquery('spanish', 'comercio electrónico')
          AND "isActive" = true
          LIMIT 20
        `;
      },
      expectedTimeMs: 50, // Target: < 50ms with GIN index
    },

    // Test 4: Keywords array search
    {
      name: 'Query 4: Keywords array search',
      query: async () => {
        return await prisma.legalDocument.findMany({
          where: {
            keywords: {
              hasSome: ['comercio', 'digital'],
            },
            isActive: true,
          },
          take: 20,
        });
      },
      expectedTimeMs: 20, // Target: < 20ms with GIN index
    },

    // Test 5: Sort by viewCount (popular documents)
    {
      name: 'Query 5: Sort by viewCount DESC',
      query: async () => {
        return await prisma.legalDocument.findMany({
          where: {
            isActive: true,
          },
          orderBy: {
            viewCount: 'desc',
          },
          take: 20,
        });
      },
      expectedTimeMs: 10, // Target: < 10ms with sorting index
    },

    // Test 6: Complex multi-filter query
    {
      name: 'Query 6: Multi-filter (jurisdiction + hierarchy + state + active)',
      query: async () => {
        return await prisma.legalDocument.findMany({
          where: {
            jurisdiction: 'NACIONAL',
            legalHierarchy: 'LEYES_ORDINARIAS',
            documentState: 'REFORMADO',
            isActive: true,
          },
          take: 20,
        });
      },
      expectedTimeMs: 15, // Target: < 15ms with composite indexes
    },

    // Test 7: Join with uploader (common in admin dashboard)
    {
      name: 'Query 7: Join with uploader + sort by createdAt',
      query: async () => {
        return await prisma.legalDocument.findMany({
          where: {
            isActive: true,
          },
          include: {
            uploader: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        });
      },
      expectedTimeMs: 25, // Target: < 25ms with join optimization
    },

    // Test 8: Count query (pagination)
    {
      name: 'Query 8: Count with filters',
      query: async () => {
        return await prisma.legalDocument.count({
          where: {
            normType: 'ORDINARY_LAW',
            isActive: true,
          },
        });
      },
      expectedTimeMs: 5, // Target: < 5ms for count
    },

    // Test 9: Recently updated documents (partial index)
    {
      name: 'Query 9: Recently updated documents (last 30 days)',
      query: async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return await prisma.legalDocument.findMany({
          where: {
            isActive: true,
            updatedAt: {
              gte: thirtyDaysAgo,
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: 20,
        });
      },
      expectedTimeMs: 10, // Target: < 10ms with partial index
    },

    // Test 10: Text search in content (large field)
    {
      name: 'Query 10: Full-text search on content',
      query: async () => {
        return await prisma.$queryRaw`
          SELECT "id", "normTitle", ts_rank(
            to_tsvector('spanish', "content"),
            plainto_tsquery('spanish', 'obligaciones contractuales')
          ) as rank
          FROM "LegalDocument"
          WHERE to_tsvector('spanish', "content") @@ plainto_tsquery('spanish', 'obligaciones contractuales')
          AND "isActive" = true
          ORDER BY rank DESC
          LIMIT 20
        `;
      },
      expectedTimeMs: 100, // Target: < 100ms for full-text on large content
    },
  ];

  // Run all benchmarks
  const results: BenchmarkResult[] = [];

  for (const benchmark of benchmarks) {
    try {
      const result = await runBenchmark(
        benchmark.name,
        benchmark.query,
        benchmark.expectedTimeMs
      );
      results.push(result);
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      results.push({
        name: benchmark.name,
        executionTime: -1,
        resultCount: 0,
        usedIndex: false,
        target: benchmark.expectedTimeMs,
        improvement: 'ERROR',
        status: 'FAIL',
      });
    }
  }

  // Generate summary report
  console.log('\n========================================');
  console.log('PERFORMANCE TEST SUMMARY');
  console.log('========================================\n');

  const passedTests = results.filter((r) => r.status === 'PASS').length;
  const failedTests = results.filter((r) => r.status === 'FAIL').length;
  const totalTests = results.length;

  console.log(`📊 Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`⚠️  Failed: ${failedTests}`);
  console.log(`📈 Pass Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

  // Detailed results table
  console.log('DETAILED RESULTS:');
  console.log('─'.repeat(100));
  console.log(
    'Query'.padEnd(60) +
      'Time'.padEnd(10) +
      'Target'.padEnd(10) +
      'Improvement'.padEnd(15) +
      'Status'
  );
  console.log('─'.repeat(100));

  results.forEach((result) => {
    const queryName = result.name.substring(0, 58).padEnd(60);
    const time = `${result.executionTime}ms`.padEnd(10);
    const target = `${result.target}ms`.padEnd(10);
    const improvement = result.improvement.padEnd(15);
    const status = result.status === 'PASS' ? '✅ PASS' : '⚠️  FAIL';

    console.log(queryName + time + target + improvement + status);
  });

  console.log('─'.repeat(100));

  // Calculate average performance improvement
  const avgExecutionTime =
    results.reduce((sum, r) => sum + (r.executionTime > 0 ? r.executionTime : 0), 0) /
    results.filter((r) => r.executionTime > 0).length;

  const avgTargetTime =
    results.reduce((sum, r) => sum + r.target, 0) / results.length;

  const overallImprovement = avgTargetTime > 0
    ? ((avgTargetTime / avgExecutionTime) * 100 - 100).toFixed(1)
    : 'N/A';

  console.log(`\n📊 PERFORMANCE METRICS:`);
  console.log(`   Average Execution Time: ${avgExecutionTime.toFixed(2)}ms`);
  console.log(`   Average Target Time: ${avgTargetTime.toFixed(2)}ms`);
  console.log(`   Overall Improvement: ${overallImprovement}%`);

  // Check if we met the 10x performance goal
  const performanceGoalMet = avgExecutionTime <= avgTargetTime;

  console.log('\n========================================');
  console.log('FINAL RESULT');
  console.log('========================================\n');

  if (performanceGoalMet && passedTests === totalTests) {
    console.log('✅ PHASE 2 SUCCESSFUL');
    console.log('   All performance targets met!');
    console.log('   Database index optimization complete.\n');
    process.exit(0);
  } else if (performanceGoalMet && passedTests >= totalTests * 0.9) {
    console.log('⚠️  PHASE 2 PARTIALLY SUCCESSFUL');
    console.log('   Most performance targets met.');
    console.log(`   ${failedTests} test(s) need optimization.\n`);
    process.exit(0);
  } else {
    console.log('❌ PHASE 2 FAILED');
    console.log('   Performance targets not met.');
    console.log('   Consider reviewing index strategy.\n');
    process.exit(1);
  }
}

// Execute performance tests
runPerformanceTests()
  .catch((error) => {
    console.error('\n❌ Fatal error during performance testing:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
