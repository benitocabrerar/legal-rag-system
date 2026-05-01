/**
 * Phase 2 Performance Testing Script
 * Tests query performance with newly created indexes
 * Target: Significant improvement on filtered queries
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BenchmarkResult {
  name: string;
  executionTime: number;
  resultCount: number;
  target: number;
  status: 'PASS' | 'FAIL';
}

async function runBenchmark(
  name: string,
  queryFn: () => Promise<any>,
  targetMs: number
): Promise<BenchmarkResult> {
  console.log(`\n⏱️  Running: ${name}...`);

  const startTime = Date.now();
  const result = await queryFn();
  const executionTime = Date.now() - startTime;

  const resultCount = Array.isArray(result) ? result.length : (typeof result === 'number' ? result : 1);
  const status = executionTime <= targetMs ? 'PASS' : 'FAIL';

  console.log(`   ✓ Execution time: ${executionTime}ms`);
  console.log(`   ✓ Results: ${resultCount}`);
  console.log(`   ✓ Target: ${targetMs}ms`);
  console.log(`   ✓ Status: ${status === 'PASS' ? '✅ PASS' : '⚠️  FAIL'}`);

  return {
    name,
    executionTime,
    resultCount,
    target: targetMs,
    status,
  };
}

async function runPerformanceTests(): Promise<void> {
  console.log('\n========================================');
  console.log('PHASE 2: DATABASE INDEX PERFORMANCE TEST');
  console.log('========================================\n');

  const benchmarks = [
    // Test 1: Filter by normType + legalHierarchy + isActive
    {
      name: 'Query 1: Composite filter (normType + legalHierarchy + isActive)',
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
      target: 50, // Target: < 50ms with composite index
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
      target: 100, // Target: < 100ms with date index
    },

    // Test 3: Full-text search on normTitle
    {
      name: 'Query 3: Full-text search on normTitle',
      query: async () => {
        return await prisma.$queryRaw`
          SELECT * FROM "legal_documents"
          WHERE to_tsvector('spanish', "norm_title") @@ plainto_tsquery('spanish', 'comercio electrónico')
          AND "is_active" = true
          LIMIT 20
        `;
      },
      target: 150, // Target: < 150ms with GIN index
    },

    // Test 4: Sort by viewCount
    {
      name: 'Query 4: Sort by viewCount DESC',
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
      target: 50, // Target: < 50ms with sorting index
    },

    // Test 5: Multi-filter query
    {
      name: 'Query 5: Multi-filter (jurisdiction + hierarchy + state + active)',
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
      target: 50, // Target: < 50ms with composite indexes
    },

    // Test 6: Count query (pagination)
    {
      name: 'Query 6: Count with filters',
      query: async () => {
        return await prisma.legalDocument.count({
          where: {
            normType: 'ORDINARY_LAW',
            isActive: true,
          },
        });
      },
      target: 25, // Target: < 25ms for count
    },

    // Test 7: Recently updated documents
    {
      name: 'Query 7: Recently updated documents (last 30 days)',
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
      target: 50, // Target: < 50ms with updated_at index
    },

    // Test 8: Full-text search on content
    {
      name: 'Query 8: Full-text search on content',
      query: async () => {
        return await prisma.$queryRaw`
          SELECT "id", "norm_title", ts_rank(
            to_tsvector('spanish', "content"),
            plainto_tsquery('spanish', 'obligaciones contractuales')
          ) as rank
          FROM "legal_documents"
          WHERE to_tsvector('spanish', "content") @@ plainto_tsquery('spanish', 'obligaciones contractuales')
          AND "is_active" = true
          ORDER BY rank DESC
          LIMIT 20
        `;
      },
      target: 250, // Target: < 250ms for full-text on large content
    },

    // Test 9: Join with uploader + sort by createdAt
    {
      name: 'Query 9: Join with uploader + sort by createdAt',
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
      target: 100, // Target: < 100ms with join optimization
    },

    // Test 10: Publication date range
    {
      name: 'Query 10: Publication date range with active filter',
      query: async () => {
        return await prisma.legalDocument.findMany({
          where: {
            isActive: true,
            publicationDate: {
              gte: new Date('2023-01-01'),
              lte: new Date('2024-12-31'),
            },
          },
          take: 20,
        });
      },
      target: 50, // Target: < 50ms with partial index
    },
  ];

  // Run all benchmarks
  const results: BenchmarkResult[] = [];

  for (const benchmark of benchmarks) {
    try {
      const result = await runBenchmark(
        benchmark.name,
        benchmark.query,
        benchmark.target
      );
      results.push(result);
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      results.push({
        name: benchmark.name,
        executionTime: -1,
        resultCount: 0,
        target: benchmark.target,
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
    'Query'.padEnd(65) +
      'Time'.padEnd(12) +
      'Target'.padEnd(12) +
      'Status'
  );
  console.log('─'.repeat(100));

  results.forEach((result) => {
    const queryName = result.name.substring(0, 63).padEnd(65);
    const time = `${result.executionTime}ms`.padEnd(12);
    const target = `${result.target}ms`.padEnd(12);
    const status = result.status === 'PASS' ? '✅ PASS' : '⚠️  FAIL';

    console.log(queryName + time + target + status);
  });

  console.log('─'.repeat(100));

  // Calculate average performance
  const validResults = results.filter((r) => r.executionTime > 0);
  const avgExecutionTime =
    validResults.reduce((sum, r) => sum + r.executionTime, 0) / validResults.length;

  const avgTargetTime =
    results.reduce((sum, r) => sum + r.target, 0) / results.length;

  console.log(`\n📊 PERFORMANCE METRICS:`);
  console.log(`   Average Execution Time: ${avgExecutionTime.toFixed(2)}ms`);
  console.log(`   Average Target Time: ${avgTargetTime.toFixed(2)}ms`);

  const performanceGoalMet = avgExecutionTime <= avgTargetTime;

  console.log('\n========================================');
  console.log('FINAL RESULT');
  console.log('========================================\n');

  if (performanceGoalMet && passedTests === totalTests) {
    console.log('✅ PHASE 2 SUCCESSFUL');
    console.log('   All performance targets met!');
    console.log('   Database index optimization complete.\n');
    process.exit(0);
  } else if (performanceGoalMet && passedTests >= totalTests * 0.8) {
    console.log('✅ PHASE 2 MOSTLY SUCCESSFUL');
    console.log('   Most performance targets met.');
    console.log(`   ${failedTests} test(s) need optimization.\n`);
    process.exit(0);
  } else {
    console.log('⚠️  PHASE 2 NEEDS REVIEW');
    console.log('   Some performance targets not met.');
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
