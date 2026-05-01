/**
 * Debug Test 1 specifically
 */

import { HierarchicalChunker } from '../src/services/chunking/hierarchicalChunker';

const chunker = new HierarchicalChunker();

async function debugTest1() {
  const text = `LEY ORGÁNICA DE EDUCACIÓN SUPERIOR

CAPÍTULO I
DISPOSICIONES GENERALES

Artículo 1.- Esta ley regula...`;

  const chunks = await chunker.chunkDocument(text, {
    id: 'test-1',
    title: 'Test Document',
    type: 'law'
  });

  console.log(`Total chunks: ${chunks.length}`);
  chunks.forEach((chunk, i) => {
    console.log(`\nChunk ${i}:`);
    console.log(`  Section: "${chunk.section}"`);
    console.log(`  Type: ${chunk.sectionType}`);
    console.log(`  Content: "${chunk.content.substring(0, 80)}..."`);
  });

  console.log(`\nTest assertion: chunks[0].section.includes('CAPÍTULO')`);
  console.log(`  chunks[0].section = "${chunks[0].section}"`);
  console.log(`  Result: ${chunks[0].section.includes('CAPÍTULO')}`);

  const chapterChunk = chunks.find(c => c.section.includes('CAPÍTULO'));
  console.log(`\nChapter chunk index: ${chunks.indexOf(chapterChunk!)}`);
}

debugTest1().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
