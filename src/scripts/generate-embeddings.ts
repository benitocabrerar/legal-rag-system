/**
 * Generate Embeddings Script
 * Phase 6: Semantic Embeddings Enhancement
 *
 * This script generates embeddings for existing legal documents in the database.
 * It processes chunks, articles, and sections, updating the database with generated embeddings.
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { EmbeddingService, DEFAULT_EMBEDDING_CONFIG } from '../services/embeddings/embedding-service';
const embeddingService = new EmbeddingService(DEFAULT_EMBEDDING_CONFIG);

interface GenerationStats {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  startTime: Date;
  endTime?: Date;
  errors: Array<{ id: string; type: string; error: string }>;
}

/**
 * Generate embeddings for LegalDocumentChunk records
 */
async function generateChunkEmbeddings(
  batchSize: number = 50,
  onProgress?: (current: number, total: number) => void
): Promise<GenerationStats> {
  console.log('\n[Chunk Embeddings] Starting generation...');

  const stats: GenerationStats = {
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    startTime: new Date(),
    errors: []
  };

  try {
    // Get total count
    const totalCount = await prisma.legalDocumentChunk.count();
    console.log(`[Chunk Embeddings] Found ${totalCount} chunks to process`);

    // Process in batches
    let offset = 0;
    while (offset < totalCount) {
      const chunks = await prisma.legalDocumentChunk.findMany({
        take: batchSize,
        skip: offset,
        select: {
          id: true,
          content: true,
          embedding: true
        }
      });

      if (chunks.length === 0) break;

      // Filter chunks that need embeddings
      const chunksNeedingEmbeddings = chunks.filter(chunk => !chunk.embedding);

      stats.skippedCount += chunks.length - chunksNeedingEmbeddings.length;

      if (chunksNeedingEmbeddings.length > 0) {
        console.log(`[Chunk Embeddings] Processing batch: ${offset + 1}-${offset + chunks.length} (${chunksNeedingEmbeddings.length} need embeddings)`);

        // Generate embeddings
        const texts = chunksNeedingEmbeddings.map(c => c.content);
        const batchResult = await embeddingService.embedBatch(texts);

        // Update database
        for (let i = 0; i < chunksNeedingEmbeddings.length; i++) {
          const chunk = chunksNeedingEmbeddings[i];
          const embedding = batchResult.embeddings[i];

          if (embedding) {
            try {
              await prisma.legalDocumentChunk.update({
                where: { id: chunk.id },
                data: {
                  embedding: JSON.stringify(embedding)
                }
              });
              stats.successCount++;
            } catch (error) {
              console.error(`[Chunk Embeddings] Error updating chunk ${chunk.id}:`, error);
              stats.errorCount++;
              stats.errors.push({
                id: chunk.id,
                type: 'chunk',
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          } else {
            stats.errorCount++;
            stats.errors.push({
              id: chunk.id,
              type: 'chunk',
              error: 'Failed to generate embedding'
            });
          }
        }
      }

      stats.totalProcessed += chunks.length;
      offset += batchSize;

      // Report progress
      if (onProgress) {
        onProgress(stats.totalProcessed, totalCount);
      }

      // Add delay to avoid rate limits
      await delay(1000);
    }

    stats.endTime = new Date();
    console.log(`[Chunk Embeddings] Complete: ${stats.successCount} successful, ${stats.errorCount} errors, ${stats.skippedCount} skipped`);

    return stats;
  } catch (error) {
    console.error('[Chunk Embeddings] Fatal error:', error);
    stats.endTime = new Date();
    return stats;
  }
}

/**
 * Generate embeddings for LegalDocumentArticle records
 */
async function generateArticleEmbeddings(
  batchSize: number = 50,
  onProgress?: (current: number, total: number) => void
): Promise<GenerationStats> {
  console.log('\n[Article Embeddings] Starting generation...');

  const stats: GenerationStats = {
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    startTime: new Date(),
    errors: []
  };

  try {
    const totalCount = await prisma.legalDocumentArticle.count();
    console.log(`[Article Embeddings] Found ${totalCount} articles to process`);

    let offset = 0;
    while (offset < totalCount) {
      const articles = await prisma.legalDocumentArticle.findMany({
        take: batchSize,
        skip: offset,
        select: {
          id: true,
          content: true,
          embedding: true
        }
      });

      if (articles.length === 0) break;

      const articlesNeedingEmbeddings = articles.filter(article => !article.embedding);
      stats.skippedCount += articles.length - articlesNeedingEmbeddings.length;

      if (articlesNeedingEmbeddings.length > 0) {
        console.log(`[Article Embeddings] Processing batch: ${offset + 1}-${offset + articles.length} (${articlesNeedingEmbeddings.length} need embeddings)`);

        const texts = articlesNeedingEmbeddings.map(a => a.content);
        const batchResult = await embeddingService.embedBatch(texts);

        for (let i = 0; i < articlesNeedingEmbeddings.length; i++) {
          const article = articlesNeedingEmbeddings[i];
          const embedding = batchResult.embeddings[i];

          if (embedding) {
            try {
              await prisma.legalDocumentArticle.update({
                where: { id: article.id },
                data: {
                  embedding: JSON.stringify(embedding)
                }
              });
              stats.successCount++;
            } catch (error) {
              console.error(`[Article Embeddings] Error updating article ${article.id}:`, error);
              stats.errorCount++;
              stats.errors.push({
                id: article.id,
                type: 'article',
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          } else {
            stats.errorCount++;
            stats.errors.push({
              id: article.id,
              type: 'article',
              error: 'Failed to generate embedding'
            });
          }
        }
      }

      stats.totalProcessed += articles.length;
      offset += batchSize;

      if (onProgress) {
        onProgress(stats.totalProcessed, totalCount);
      }

      await delay(1000);
    }

    stats.endTime = new Date();
    console.log(`[Article Embeddings] Complete: ${stats.successCount} successful, ${stats.errorCount} errors, ${stats.skippedCount} skipped`);

    return stats;
  } catch (error) {
    console.error('[Article Embeddings] Fatal error:', error);
    stats.endTime = new Date();
    return stats;
  }
}

/**
 * Generate embeddings for LegalDocumentSection records
 */
async function generateSectionEmbeddings(
  batchSize: number = 50,
  onProgress?: (current: number, total: number) => void
): Promise<GenerationStats> {
  console.log('\n[Section Embeddings] Starting generation...');

  const stats: GenerationStats = {
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    startTime: new Date(),
    errors: []
  };

  try {
    const totalCount = await prisma.legalDocumentSection.count();
    console.log(`[Section Embeddings] Found ${totalCount} sections to process`);

    let offset = 0;
    while (offset < totalCount) {
      const sections = await prisma.legalDocumentSection.findMany({
        take: batchSize,
        skip: offset,
        select: {
          id: true,
          content: true,
          embedding: true
        }
      });

      if (sections.length === 0) break;

      const sectionsNeedingEmbeddings = sections.filter(section => !section.embedding);
      stats.skippedCount += sections.length - sectionsNeedingEmbeddings.length;

      if (sectionsNeedingEmbeddings.length > 0) {
        console.log(`[Section Embeddings] Processing batch: ${offset + 1}-${offset + sections.length} (${sectionsNeedingEmbeddings.length} need embeddings)`);

        const texts = sectionsNeedingEmbeddings.map(s => s.content);
        const batchResult = await embeddingService.embedBatch(texts);

        for (let i = 0; i < sectionsNeedingEmbeddings.length; i++) {
          const section = sectionsNeedingEmbeddings[i];
          const embedding = batchResult.embeddings[i];

          if (embedding) {
            try {
              await prisma.legalDocumentSection.update({
                where: { id: section.id },
                data: {
                  embedding: JSON.stringify(embedding)
                }
              });
              stats.successCount++;
            } catch (error) {
              console.error(`[Section Embeddings] Error updating section ${section.id}:`, error);
              stats.errorCount++;
              stats.errors.push({
                id: section.id,
                type: 'section',
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          } else {
            stats.errorCount++;
            stats.errors.push({
              id: section.id,
              type: 'section',
              error: 'Failed to generate embedding'
            });
          }
        }
      }

      stats.totalProcessed += sections.length;
      offset += batchSize;

      if (onProgress) {
        onProgress(stats.totalProcessed, totalCount);
      }

      await delay(1000);
    }

    stats.endTime = new Date();
    console.log(`[Section Embeddings] Complete: ${stats.successCount} successful, ${stats.errorCount} errors, ${stats.skippedCount} skipped`);

    return stats;
  } catch (error) {
    console.error('[Section Embeddings] Fatal error:', error);
    stats.endTime = new Date();
    return stats;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('='.repeat(80));
  console.log('EMBEDDING GENERATION SCRIPT - Phase 6: Semantic Embeddings Enhancement');
  console.log('='.repeat(80));
  console.log(`Start time: ${new Date().toISOString()}`);
  console.log(`Model: ${DEFAULT_EMBEDDING_CONFIG.modelName}`);
  console.log(`Dimensions: ${DEFAULT_EMBEDDING_CONFIG.dimensions}`);
  console.log(`Batch size: ${DEFAULT_EMBEDDING_CONFIG.batchSize}`);
  console.log('='.repeat(80));

  const allStats: {
    chunks: GenerationStats | null;
    articles: GenerationStats | null;
    sections: GenerationStats | null;
  } = {
    chunks: null,
    articles: null,
    sections: null
  };

  try {
    // Progress reporter
    const progressReporter = (type: string) => (current: number, total: number) => {
      const percentage = ((current / total) * 100).toFixed(1);
      console.log(`[${type}] Progress: ${current}/${total} (${percentage}%)`);
    };

    // Generate embeddings for each entity type
    allStats.chunks = await generateChunkEmbeddings(50, progressReporter('Chunks'));
    allStats.articles = await generateArticleEmbeddings(50, progressReporter('Articles'));
    allStats.sections = await generateSectionEmbeddings(50, progressReporter('Sections'));

    // Print final summary
    console.log('\n' + '='.repeat(80));
    console.log('FINAL SUMMARY');
    console.log('='.repeat(80));

    const printStats = (name: string, stats: GenerationStats | null) => {
      if (!stats) {
        console.log(`\n${name}: NOT PROCESSED`);
        return;
      }

      const duration = stats.endTime
        ? ((stats.endTime.getTime() - stats.startTime.getTime()) / 1000).toFixed(2)
        : 'N/A';

      console.log(`\n${name}:`);
      console.log(`  Total Processed: ${stats.totalProcessed}`);
      console.log(`  Successful: ${stats.successCount}`);
      console.log(`  Errors: ${stats.errorCount}`);
      console.log(`  Skipped (already had embeddings): ${stats.skippedCount}`);
      console.log(`  Duration: ${duration}s`);

      if (stats.errors.length > 0) {
        console.log(`  Error Details:`);
        stats.errors.slice(0, 5).forEach(err => {
          console.log(`    - ${err.type} ${err.id}: ${err.error}`);
        });
        if (stats.errors.length > 5) {
          console.log(`    ... and ${stats.errors.length - 5} more errors`);
        }
      }
    };

    printStats('Chunks', allStats.chunks);
    printStats('Articles', allStats.articles);
    printStats('Sections', allStats.sections);

    // Calculate totals
    const totalSuccess =
      (allStats.chunks?.successCount || 0) +
      (allStats.articles?.successCount || 0) +
      (allStats.sections?.successCount || 0);

    const totalErrors =
      (allStats.chunks?.errorCount || 0) +
      (allStats.articles?.errorCount || 0) +
      (allStats.sections?.errorCount || 0);

    const totalSkipped =
      (allStats.chunks?.skippedCount || 0) +
      (allStats.articles?.skippedCount || 0) +
      (allStats.sections?.skippedCount || 0);

    console.log('\n' + '-'.repeat(80));
    console.log(`GRAND TOTAL:`);
    console.log(`  Successful: ${totalSuccess}`);
    console.log(`  Errors: ${totalErrors}`);
    console.log(`  Skipped: ${totalSkipped}`);
    console.log(`  Success Rate: ${((totalSuccess / (totalSuccess + totalErrors)) * 100).toFixed(2)}%`);

    // Cache statistics
    const cacheStats = embeddingService.getCacheStats();
    console.log('\n' + '-'.repeat(80));
    console.log('CACHE STATISTICS:');
    console.log(`  Cache Size: ${cacheStats.size} embeddings`);
    console.log(`  Cache Hits: ${cacheStats.hits}`);
    console.log(`  Cache Misses: ${cacheStats.misses}`);
    console.log(`  Hit Rate: ${cacheStats.hitRate}%`);
    console.log(`  Total Requests: ${cacheStats.totalRequests}`);

    console.log('\n' + '='.repeat(80));
    console.log(`End time: ${new Date().toISOString()}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n[FATAL ERROR]', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Helper function to add delays
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the script
main()
  .then(() => {
    console.log('\n✅ Embedding generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Embedding generation failed:', error);
    process.exit(1);
  });
