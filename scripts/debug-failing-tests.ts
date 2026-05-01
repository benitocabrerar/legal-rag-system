/**
 * Debug failing Phase 4 tests
 */

import { HierarchicalChunker } from '../src/services/chunking/hierarchicalChunker';

const chunker = new HierarchicalChunker();

async function debugTest1() {
  console.log('='.repeat(80));
  console.log('TEST 1: Parse document title');
  console.log('='.repeat(80));

  const text = `LEY ORGÁNICA DE EDUCACIÓN SUPERIOR

CAPÍTULO I
DISPOSICIONES GENERALES

Artículo 1.- Esta ley regula...`;

  const chunks = await chunker.chunkDocument(text, {
    id: 'test-1',
    title: 'Test Document',
    type: 'law'
  });

  console.log(`Chunks: ${chunks.length}`);
  chunks.forEach((chunk, i) => {
    console.log(`\nChunk ${i}:`);
    console.log(`  Section: ${chunk.section}`);
    console.log(`  Type: ${chunk.sectionType}`);
    console.log(`  Content: "${chunk.content.substring(0, 50)}..."`);
  });

  const chapterChunk = chunks.find(c => c.sectionType === 'chapter');
  console.log(`\nChapter chunk found: ${chapterChunk ? 'YES' : 'NO'}`);
  if (chapterChunk) {
    console.log(`Chapter includes 'CAPÍTULO': ${chapterChunk.section.includes('CAPÍTULO')}`);
  }
}

async function debugTest2() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: Parent/Child relationships');
  console.log('='.repeat(80));

  const text = `CAPÍTULO I
DISPOSICIONES GENERALES

ARTÍCULO 1.- El Estado garantiza el derecho a la educación.

ARTÍCULO 2.- La educación es un servicio público.`;

  const chunks = await chunker.chunkDocument(text, {
    id: 'test-2',
    title: 'Hierarchical Relationships',
    type: 'law'
  });

  console.log(`Chunks: ${chunks.length}`);
  chunks.forEach((chunk, i) => {
    console.log(`\nChunk ${i}:`);
    console.log(`  Section: ${chunk.section}`);
    console.log(`  Type: ${chunk.sectionType}`);
    console.log(`  Relationships: ${chunk.relationships.map(r => r.type).join(', ')}`);
  });

  const chapterChunk = chunks.find(c => c.sectionType === 'chapter');
  if (chapterChunk) {
    console.log(`\nChapter has ${chapterChunk.relationships.length} relationships`);
    console.log(`Child relationships: ${chapterChunk.relationships.filter(r => r.type === 'child').length}`);
  }
}

async function debugTest3() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 3: Importance calculation');
  console.log('='.repeat(80));

  const text = `TÍTULO I
DE LOS PRINCIPIOS FUNDAMENTALES

ARTÍCULO 1.- El derecho a la educación es fundamental y constituye un derecho humano
establecido en la Constitución de la República del Ecuador.`;

  const chunks = await chunker.chunkDocument(text, {
    id: 'test-3',
    title: 'Importance Test',
    type: 'law'
  });

  console.log(`Chunks: ${chunks.length}`);
  chunks.forEach((chunk, i) => {
    console.log(`\nChunk ${i}:`);
    console.log(`  Section: ${chunk.section}`);
    console.log(`  Type: ${chunk.sectionType}`);
    console.log(`  Importance: ${chunk.importance}`);
    console.log(`  Level: ${chunk.level}`);
  });

  const titleChunk = chunks.find(c => c.sectionType === 'title');
  if (titleChunk) {
    console.log(`\nTitle chunk importance: ${titleChunk.importance}`);
    console.log(`Is > 0.5? ${titleChunk.importance > 0.5}`);
  }
}

async function debugTest4() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 4: Get important chunks');
  console.log('='.repeat(80));

  const text = `TÍTULO I
DE LOS DERECHOS FUNDAMENTALES

ARTÍCULO 1.- El derecho a la educación es fundamental según establece la ley orgánica
y lo dispone el decreto constitucional mediante resolución de la Corte.

ARTÍCULO 2.- El sol brilla. Los pájaros cantan. El agua fluye.`;

  const chunks = await chunker.chunkDocument(text, {
    id: 'test-4',
    title: 'Important Chunks',
    type: 'law'
  });

  console.log(`Total chunks: ${chunks.length}`);
  chunks.forEach((chunk, i) => {
    console.log(`\nChunk ${i}:`);
    console.log(`  Section: ${chunk.section}`);
    console.log(`  Importance: ${chunk.importance}`);
  });

  const importantChunks = chunker.getImportantChunks(chunks, 0.7);
  console.log(`\nImportant chunks (threshold 0.7): ${importantChunks.length}`);
  importantChunks.forEach(chunk => {
    console.log(`  - ${chunk.section}: ${chunk.importance}`);
  });
}

// Run all debug tests
Promise.all([
  debugTest1(),
  debugTest2(),
  debugTest3(),
  debugTest4()
]).catch(error => {
  console.error('Debug error:', error);
  process.exit(1);
});
