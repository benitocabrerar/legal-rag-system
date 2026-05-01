/**
 * Debug script for Phase 4 chunking
 */

import { HierarchicalChunker } from '../src/services/chunking/hierarchicalChunker';

const chunker = new HierarchicalChunker();

async function debugSimpleArticle() {
  console.log('='.repeat(80));
  console.log('DEBUG: Simple Article Test');
  console.log('='.repeat(80));

  const text = `ARTÍCULO 1.- El Estado garantiza el derecho a la educación.`;

  const chunks = await chunker.chunkDocument(text, {
    id: 'debug-1',
    title: 'Debug Test',
    type: 'law'
  });

  console.log(`\nChunks created: ${chunks.length}`);
  chunks.forEach((chunk, i) => {
    console.log(`\nChunk ${i}:`);
    console.log(`  ID: ${chunk.id}`);
    console.log(`  Section: ${chunk.section}`);
    console.log(`  Section Type: ${chunk.sectionType}`);
    console.log(`  Level: ${chunk.level}`);
    console.log(`  Content length: ${chunk.content.length}`);
    console.log(`  Content: "${chunk.content.substring(0, 100)}..."`);
    console.log(`  Start char: ${chunk.startChar}`);
    console.log(`  End char: ${chunk.endChar}`);
    console.log(`  Relationships: ${chunk.relationships.length}`);
  });
}

async function debugMultipleArticles() {
  console.log('\n' + '='.repeat(80));
  console.log('DEBUG: Multiple Articles Test');
  console.log('='.repeat(80));

  const text = `ARTÍCULO 1.- Primera disposición.

ARTÍCULO 2.- Segunda disposición.

ARTÍCULO 3.- Tercera disposición.`;

  const chunks = await chunker.chunkDocument(text, {
    id: 'debug-2',
    title: 'Debug Test 2',
    type: 'law'
  });

  console.log(`\nChunks created: ${chunks.length}`);
  chunks.forEach((chunk, i) => {
    console.log(`\nChunk ${i}:`);
    console.log(`  Section: ${chunk.section}`);
    console.log(`  Section Type: ${chunk.sectionType}`);
    console.log(`  Content: "${chunk.content}"`);
    console.log(`  Relationships: ${JSON.stringify(chunk.relationships.map(r => r.type))}`);
  });
}

async function debugDocumentStructure() {
  console.log('\n' + '='.repeat(80));
  console.log('DEBUG: Document Structure Parsing');
  console.log('='.repeat(80));

  const text = `LEY ORGÁNICA DE EDUCACIÓN SUPERIOR

CAPÍTULO I
DISPOSICIONES GENERALES

ARTÍCULO 1.- Esta ley regula el sistema educativo.

ARTÍCULO 2.- La educación es un derecho fundamental.`;

  const chunks = await chunker.chunkDocument(text, {
    id: 'debug-3',
    title: 'Debug Test 3',
    type: 'law'
  });

  console.log(`\nChunks created: ${chunks.length}`);
  chunks.forEach((chunk, i) => {
    console.log(`\nChunk ${i}:`);
    console.log(`  Section: ${chunk.section}`);
    console.log(`  Section Type: ${chunk.sectionType}`);
    console.log(`  Level: ${chunk.level}`);
    console.log(`  Content length: ${chunk.content.length}`);
    console.log(`  Content: "${chunk.content.substring(0, 80)}..."`);
  });
}

// Run all debug tests
Promise.all([
  debugSimpleArticle(),
  debugMultipleArticles(),
  debugDocumentStructure()
]).catch(error => {
  console.error('Debug error:', error);
  process.exit(1);
});
