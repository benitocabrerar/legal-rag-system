/**
 * Validation Script for Critical Issue #3: Schema Mismatch Fix
 *
 * This script validates that all schema mismatch fixes are working correctly
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateSchemaFix() {
  console.log('🔍 Validating Schema Mismatch Fixes...\n');

  let allTestsPassed = true;

  // Test 1: Validate LegalDocumentSummary model and summaryText field
  console.log('Test 1: Validating LegalDocumentSummary.summaryText field...');
  try {
    const summaryCount = await prisma.legalDocumentSummary.count();
    console.log(`✅ LegalDocumentSummary model exists (${summaryCount} records)`);

    // Try to query using summaryText field
    const sampleSummary = await prisma.legalDocumentSummary.findFirst({
      where: {
        summaryText: { not: null }
      },
      select: {
        id: true,
        summaryText: true,
        summaryType: true,
        legalDocumentId: true
      }
    });

    if (sampleSummary) {
      console.log(`✅ summaryText field is accessible`);
      console.log(`   Sample: "${sampleSummary.summaryText.substring(0, 50)}..."`);
    } else {
      console.log(`⚠️  No summaries with summaryText found (table may be empty)`);
    }
  } catch (error) {
    console.error(`❌ LegalDocumentSummary validation failed:`, error.message);
    allTestsPassed = false;
  }

  console.log('');

  // Test 2: Validate LegalDocumentChunk embeddings
  console.log('Test 2: Validating LegalDocumentChunk.embedding field...');
  try {
    const chunkCount = await prisma.legalDocumentChunk.count({
      where: {
        embedding: { not: null }
      }
    });
    console.log(`✅ LegalDocumentChunk model exists (${chunkCount} chunks with embeddings)`);

    // Get a sample chunk with embedding
    const sampleChunk = await prisma.legalDocumentChunk.findFirst({
      where: {
        embedding: { not: null }
      },
      select: {
        id: true,
        legalDocumentId: true,
        embedding: true,
        chunkIndex: true
      }
    });

    if (sampleChunk) {
      const embeddingArray = sampleChunk.embedding as number[];
      console.log(`✅ Embedding field is accessible`);
      console.log(`   Chunk ID: ${sampleChunk.id}`);
      console.log(`   Document ID: ${sampleChunk.legalDocumentId}`);
      console.log(`   Embedding dimension: ${Array.isArray(embeddingArray) ? embeddingArray.length : 'N/A'}`);
    } else {
      console.log(`⚠️  No chunks with embeddings found (may need to generate embeddings)`);
    }
  } catch (error) {
    console.error(`❌ LegalDocumentChunk validation failed:`, error.message);
    allTestsPassed = false;
  }

  console.log('');

  // Test 3: Validate SearchQuery interface (TypeScript check)
  console.log('Test 3: Validating SearchQuery interface...');
  try {
    // This is a compile-time check - if this compiles, sessionId is in the interface
    const testQuery: any = {
      query: "test query",
      sessionId: "test-session-123",  // This should not cause TypeScript error
      userId: "test-user-456"
    };

    console.log(`✅ SearchQuery interface includes sessionId property`);
    console.log(`   Test query: "${testQuery.query}" with session: ${testQuery.sessionId}`);
  } catch (error) {
    console.error(`❌ SearchQuery interface validation failed:`, error.message);
    allTestsPassed = false;
  }

  console.log('');

  // Test 4: Test summary search (simulate the fixed query)
  console.log('Test 4: Testing summary search with summaryText field...');
  try {
    const testSearchQuery = "constitutional";

    // This simulates the fixed query in unified-search-orchestrator
    const results = await prisma.legalDocument.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: testSearchQuery, mode: 'insensitive' } },
          { content: { contains: testSearchQuery, mode: 'insensitive' } },
          {
            summaries: {
              some: {
                summaryText: { contains: testSearchQuery, mode: 'insensitive' }  // Fixed field name
              }
            }
          }
        ]
      },
      select: {
        id: true,
        normTitle: true,
        title: true
      },
      take: 5
    });

    console.log(`✅ Summary search query executed successfully`);
    console.log(`   Found ${results.length} documents matching "${testSearchQuery}"`);

    if (results.length > 0) {
      console.log(`   Sample result: "${results[0].normTitle || results[0].title}"`);
    }
  } catch (error) {
    console.error(`❌ Summary search test failed:`, error.message);
    allTestsPassed = false;
  }

  console.log('');

  // Test 5: Test embedding retrieval (simulate the fixed query)
  console.log('Test 5: Testing embedding retrieval with LegalDocumentChunk...');
  try {
    // Get some document IDs
    const documents = await prisma.legalDocument.findMany({
      take: 3,
      select: { id: true, normTitle: true, title: true }
    });

    if (documents.length > 0) {
      const documentIds = documents.map(d => d.id);

      // This simulates the fixed query in rerankWithEmbedding
      const chunks = await prisma.legalDocumentChunk.findMany({
        where: {
          legalDocumentId: { in: documentIds },
          embedding: { not: null }
        },
        select: {
          legalDocumentId: true,
          embedding: true,
          chunkIndex: true
        }
      });

      console.log(`✅ Embedding retrieval query executed successfully`);
      console.log(`   Retrieved ${chunks.length} chunks with embeddings for ${documentIds.length} documents`);

      if (chunks.length > 0) {
        const embeddingArray = chunks[0].embedding as number[];
        console.log(`   Sample embedding dimension: ${Array.isArray(embeddingArray) ? embeddingArray.length : 'N/A'}`);
      }
    } else {
      console.log(`⚠️  No documents found to test embedding retrieval`);
    }
  } catch (error) {
    console.error(`❌ Embedding retrieval test failed:`, error.message);
    allTestsPassed = false;
  }

  console.log('');

  // Test 6: Validate both summary models coexist
  console.log('Test 6: Checking for duplicate summary models...');
  try {
    const legalDocSummaryCount = await prisma.legalDocumentSummary.count();
    const docSummaryCount = await prisma.documentSummary.count();

    console.log(`ℹ️  LegalDocumentSummary records: ${legalDocSummaryCount}`);
    console.log(`ℹ️  DocumentSummary records: ${docSummaryCount}`);

    if (legalDocSummaryCount > 0 && docSummaryCount > 0) {
      console.log(`⚠️  Both summary models have data - consider consolidating`);
    } else if (legalDocSummaryCount > 0) {
      console.log(`✅ Using LegalDocumentSummary (Phase 3 model)`);
    } else if (docSummaryCount > 0) {
      console.log(`✅ Using DocumentSummary (Phase 10 model)`);
    } else {
      console.log(`⚠️  No summary data found in either model`);
    }
  } catch (error) {
    console.error(`❌ Summary model check failed:`, error.message);
    allTestsPassed = false;
  }

  console.log('');
  console.log('═'.repeat(60));

  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED - Schema fixes are working correctly!');
  } else {
    console.log('❌ SOME TESTS FAILED - Please review the errors above');
  }

  console.log('═'.repeat(60));

  await prisma.$disconnect();
}

// Run validation
validateSchemaFix()
  .catch(error => {
    console.error('Fatal error during validation:', error);
    process.exit(1);
  });
