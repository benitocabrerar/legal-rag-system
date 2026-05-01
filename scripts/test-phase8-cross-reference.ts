/**
 * Phase 8 Test: Cross-Reference Graph and PageRank
 * Tests citation extraction and PageRank calculation
 */

import { PrismaClient } from '@prisma/client';
import { CitationExtractor } from '../src/services/legal/citationExtractor';
import { PageRankService } from '../src/services/legal/pagerankService';

const prisma = new PrismaClient();

interface TestResult {
  testName: string;
  passed: boolean;
  details: any;
  error?: string;
}

async function runPhase8Tests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('🧪 Starting Phase 8 Tests: Cross-Reference Graph & PageRank\n');

  // Test 1: Create test documents with citations
  results.push(await testCreateDocumentsWithCitations());

  // Test 2: Extract citations
  results.push(await testCitationExtraction());

  // Test 3: Calculate PageRank
  results.push(await testPageRankCalculation());

  // Test 4: Query top documents
  results.push(await testTopDocumentsQuery());

  // Test 5: Citation graph integrity
  results.push(await testCitationGraphIntegrity());

  return results;
}

async function testCreateDocumentsWithCitations(): Promise<TestResult> {
  try {
    console.log('Test 1: Creating test documents with citations...');

    // Create test documents
    const doc1 = await prisma.legalDocument.create({
      data: {
        id: 'test-doc-constitution',
        title: 'Constitución de la República del Ecuador',
        normTitle: 'Constitución de la República del Ecuador',
        registrationNumber: 'CONST-2008',
        normType: 'CONSTITUTIONAL_NORM',
        hierarchy: 'CONSTITUCION',
        legalHierarchy: 'CONSTITUCION',
        content: `Artículo 1. El Ecuador es un Estado constitucional de derechos.
                  Artículo 82. El derecho a la seguridad jurídica se fundamenta en el respeto a la Constitución.`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    const doc2 = await prisma.legalDocument.create({
      data: {
        id: 'test-doc-cogep',
        title: 'Código Orgánico General de Procesos',
        normTitle: 'Código Orgánico General de Procesos',
        registrationNumber: 'COGEP-2015',
        normType: 'ORGANIC_CODE',
        hierarchy: 'CODIGOS_ORGANICOS',
        legalHierarchy: 'CODIGOS_ORGANICOS',
        content: `Artículo 1. De conformidad con lo dispuesto en el artículo 82 de la Constitución de la República del Ecuador,
                  este código establece las normas procesales.
                  Se cita también la Sentencia No. 001-13-SCN-CC del Tribunal Constitucional.`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    const doc3 = await prisma.legalDocument.create({
      data: {
        id: 'test-doc-sentencia',
        title: 'Sentencia No. 001-13-SCN-CC',
        normTitle: 'Sentencia No. 001-13-SCN-CC',
        registrationNumber: 'SENT-001-13',
        normType: 'JUDICIAL_PRECEDENT',
        hierarchy: 'RESOLUCIONES',
        legalHierarchy: 'RESOLUCIONES',
        content: `La Corte Constitucional, en uso de sus atribuciones conforme al artículo 82 de la Constitución,
                  resuelve que el Código Orgánico General de Procesos debe interpretarse conforme a la Constitución.`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return {
      testName: 'Create Documents with Citations',
      passed: true,
      details: {
        documentsCreated: 3,
        documentIds: [doc1.id, doc2.id, doc3.id]
      }
    };
  } catch (error) {
    return {
      testName: 'Create Documents with Citations',
      passed: false,
      details: null,
      error: String(error)
    };
  }
}

async function testCitationExtraction(): Promise<TestResult> {
  try {
    console.log('Test 2: Extracting citations from documents...');

    const extractor = new CitationExtractor();

    // Extract from COGEP (should find citations to Constitution and Sentencia)
    const result = await extractor.extractFromDocument('test-doc-cogep');

    console.log(`  Found ${result.citationsFound} citations`);
    console.log(`  Stored ${result.citationsStored} citations`);

    // Verify citations were stored
    const storedCitations = await prisma.documentCitation.findMany({
      where: {
        sourceDocumentId: 'test-doc-cogep'
      }
    });

    return {
      testName: 'Citation Extraction',
      passed: result.citationsStored > 0 && storedCitations.length > 0,
      details: {
        citationsFound: result.citationsFound,
        citationsStored: result.citationsStored,
        processingTimeMs: result.processingTimeMs,
        errors: result.errors,
        storedCitationsCount: storedCitations.length
      }
    };
  } catch (error) {
    return {
      testName: 'Citation Extraction',
      passed: false,
      details: null,
      error: String(error)
    };
  }
}

async function testPageRankCalculation(): Promise<TestResult> {
  try {
    console.log('Test 3: Calculating PageRank...');

    const pagerankService = new PageRankService({
      dampingFactor: 0.85,
      maxIterations: 50,
      convergenceThreshold: 0.001
    });

    const result = await pagerankService.calculatePageRank();

    console.log(`  Processed ${result.documentsProcessed} documents`);
    console.log(`  Converged: ${result.converged} in ${result.iterationsRun} iterations`);
    console.log(`  Avg PageRank: ${result.avgPageRank.toFixed(4)}`);
    console.log(`  Max PageRank: ${result.maxPageRank.toFixed(4)}`);

    // Verify authority scores were created
    const authorityScores = await prisma.documentAuthorityScore.findMany();

    return {
      testName: 'PageRank Calculation',
      passed: result.converged && authorityScores.length > 0,
      details: {
        documentsProcessed: result.documentsProcessed,
        iterationsRun: result.iterationsRun,
        converged: result.converged,
        avgPageRank: result.avgPageRank,
        maxPageRank: result.maxPageRank,
        minPageRank: result.minPageRank,
        processingTimeMs: result.processingTimeMs,
        authorityScoresCreated: authorityScores.length
      }
    };
  } catch (error) {
    return {
      testName: 'PageRank Calculation',
      passed: false,
      details: null,
      error: String(error)
    };
  }
}

async function testTopDocumentsQuery(): Promise<TestResult> {
  try {
    console.log('Test 4: Querying top documents by PageRank...');

    const pagerankService = new PageRankService();
    const topDocs = await pagerankService.getTopDocuments(5);

    console.log(`  Top ${topDocs.length} documents:`);
    topDocs.forEach((doc, idx) => {
      console.log(`    ${idx + 1}. ${doc.title} (PageRank: ${doc.pagerankScore.toFixed(4)}, Citations: ${doc.citationCount})`);
    });

    return {
      testName: 'Top Documents Query',
      passed: topDocs.length > 0,
      details: {
        topDocumentsCount: topDocs.length,
        topDocuments: topDocs
      }
    };
  } catch (error) {
    return {
      testName: 'Top Documents Query',
      passed: false,
      details: null,
      error: String(error)
    };
  }
}

async function testCitationGraphIntegrity(): Promise<TestResult> {
  try {
    console.log('Test 5: Verifying citation graph integrity...');

    // Count total citations
    const totalCitations = await prisma.documentCitation.count();

    // Get citations with valid targets
    const validCitations = await prisma.documentCitation.count({
      where: {
        targetDocumentId: { not: null }
      }
    });

    // Get orphan citations (no target)
    const orphanCitations = await prisma.documentCitation.count({
      where: {
        targetDocumentId: null
      }
    });

    // Get citation types distribution
    const citationsByType = await prisma.documentCitation.groupBy({
      by: ['citationType'],
      _count: true
    });

    console.log(`  Total citations: ${totalCitations}`);
    console.log(`  Valid citations: ${validCitations}`);
    console.log(`  Orphan citations: ${orphanCitations}`);
    console.log(`  Citation types:`, citationsByType);

    return {
      testName: 'Citation Graph Integrity',
      passed: totalCitations > 0,
      details: {
        totalCitations,
        validCitations,
        orphanCitations,
        citationsByType
      }
    };
  } catch (error) {
    return {
      testName: 'Citation Graph Integrity',
      passed: false,
      details: null,
      error: String(error)
    };
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');

  // Delete test data
  await prisma.documentCitation.deleteMany({
    where: {
      sourceDocumentId: { startsWith: 'test-doc-' }
    }
  });

  await prisma.documentAuthorityScore.deleteMany({
    where: {
      documentId: { startsWith: 'test-doc-' }
    }
  });

  await prisma.legalDocument.deleteMany({
    where: {
      id: { startsWith: 'test-doc-' }
    }
  });

  console.log('✅ Cleanup complete');
}

async function main() {
  try {
    const results = await runPhase8Tests();

    console.log('\n' + '='.repeat(70));
    console.log('📊 PHASE 8 TEST RESULTS');
    console.log('='.repeat(70));

    let passedCount = 0;
    let failedCount = 0;

    results.forEach((result, idx) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`\n${idx + 1}. ${result.testName}: ${status}`);

      if (result.passed) {
        passedCount++;
        console.log('   Details:', JSON.stringify(result.details, null, 2));
      } else {
        failedCount++;
        console.log('   Error:', result.error);
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log(`Total: ${results.length} tests | Passed: ${passedCount} | Failed: ${failedCount}`);
    console.log('='.repeat(70));

    // Cleanup
    await cleanup();

    process.exit(failedCount === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    await cleanup();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
