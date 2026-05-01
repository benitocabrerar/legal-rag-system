/**
 * Phase 4: Hierarchical Document Chunking - Test Suite
 * Tests for intelligent chunking of Ecuadorian legal documents
 */

import { HierarchicalChunker } from '../src/services/chunking/hierarchicalChunker';
import { DocumentMetadata, SectionType } from '../src/services/chunking/chunkTypes';

class Phase4TestSuite {
  private chunker: HierarchicalChunker;
  private testsRun = 0;
  private testsPassed = 0;
  private testsFailed = 0;

  constructor() {
    this.chunker = new HierarchicalChunker();
  }

  private assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    this.testsRun++;
    const startTime = performance.now();

    try {
      await testFn();
      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`✅ PASS: ${name} (${duration}ms)`);
      this.testsPassed++;
    } catch (error) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`❌ FAIL: ${name} (${duration}ms)`);
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      this.testsFailed++;
    }
  }

  // ========================================
  // STRUCTURE PARSING TESTS
  // ========================================

  async testParseDocumentTitle(): Promise<void> {
    const text = `LEY ORGÁNICA DE EDUCACIÓN SUPERIOR

CAPÍTULO I
DISPOSICIONES GENERALES

Artículo 1.- Esta ley regula...`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-1',
      title: 'Test Document',
      type: 'law'
    });

    this.assert(chunks.length >= 3, 'Should create multiple chunks');
    const chapterChunk = chunks.find(c => c.sectionType === 'chapter');
    this.assert(chapterChunk !== undefined, 'Should detect chapter section');
    this.assert(chapterChunk!.section.includes('CAPÍTULO'), 'Chapter section should include CAPÍTULO');
  }

  async testParseChapterSection(): Promise<void> {
    const text = `CAPÍTULO I
PRINCIPIOS FUNDAMENTALES

El presente capítulo establece los principios fundamentales que rigen esta ley.

CAPÍTULO II
DISPOSICIONES APLICABLES

Las disposiciones de este capítulo son de aplicación inmediata.`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-2',
      title: 'Test Chapters',
      type: 'law'
    });

    const chapterChunks = chunks.filter(c => c.sectionType === 'chapter');
    this.assert(chapterChunks.length >= 2, 'Should detect multiple chapters');
    this.assert(chapterChunks[0].level === 2, 'Chapter should be level 2');
  }

  async testParseArticleSection(): Promise<void> {
    const text = `ARTÍCULO 1.- El Estado garantiza el derecho a la educación.

ARTÍCULO 2.- La educación es un derecho fundamental.

ARTÍCULO 3.- El sistema educativo es público y gratuito.`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-3',
      title: 'Test Articles',
      type: 'law'
    });

    const articleChunks = chunks.filter(c => c.sectionType === 'article');
    this.assert(articleChunks.length >= 3, 'Should detect all articles');
    this.assert(articleChunks[0].level === 4, 'Article should be level 4');
  }

  async testParseConsiderandoSection(): Promise<void> {
    const text = `CONSIDERANDO:

Que, la Constitución de la República del Ecuador garantiza el derecho a la educación;

Que, es necesario establecer un marco normativo;

RESUELVE:

Expedir la siguiente ley.`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-4',
      title: 'Test Considerandos',
      type: 'decree'
    });

    const considerandoChunk = chunks.find(c => c.sectionType === 'considering');
    const resuelveChunk = chunks.find(c => c.sectionType === 'resolves');

    this.assert(considerandoChunk !== undefined, 'Should detect CONSIDERANDO section');
    this.assert(resuelveChunk !== undefined, 'Should detect RESUELVE section');
  }

  async testParseTitleSection(): Promise<void> {
    const text = `TÍTULO I
DE LOS DERECHOS FUNDAMENTALES

CAPÍTULO I
DERECHOS CIVILES

ARTÍCULO 1.- Toda persona tiene derecho...`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-5',
      title: 'Test Title Hierarchy',
      type: 'law'
    });

    const titleChunk = chunks.find(c => c.sectionType === 'title');
    this.assert(titleChunk !== undefined, 'Should detect TÍTULO section');
    this.assert(titleChunk!.level === 1, 'Title should be level 1');
  }

  async testParseDisposicionesTransitorias(): Promise<void> {
    const text = `ARTÍCULO 10.- Disposiciones finales.

DISPOSICIONES TRANSITORIAS

Primera.- Esta ley entrará en vigencia...
Segunda.- Se derogan todas las disposiciones...

DISPOSICIÓN FINAL

La presente ley entrará en vigencia...`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-6',
      title: 'Test Disposiciones',
      type: 'law'
    });

    const transitionalChunk = chunks.find(c => c.sectionType === 'transitional');
    const finalChunk = chunks.find(c => c.sectionType === 'final');

    this.assert(transitionalChunk !== undefined, 'Should detect DISPOSICIONES TRANSITORIAS');
    this.assert(finalChunk !== undefined, 'Should detect DISPOSICIÓN FINAL');
  }

  // ========================================
  // CHUNKING BEHAVIOR TESTS
  // ========================================

  async testSmallSectionSingleChunk(): Promise<void> {
    const text = `ARTÍCULO 1.- El Estado garantiza el derecho a la educación de todos los ciudadanos.`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-7',
      title: 'Small Section',
      type: 'law'
    });

    this.assert(chunks.length === 1, 'Small section should create single chunk');
    this.assert(chunks[0].content.includes('garantiza'), 'Chunk should contain content');
  }

  async testLargeSectionMultipleChunks(): Promise<void> {
    // Create a large section that exceeds maxChunkSize (1500 chars)
    const longContent = 'Este es un artículo muy extenso que contiene múltiples disposiciones legales. '.repeat(50);
    const text = `ARTÍCULO 1.- ${longContent}`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-8',
      title: 'Large Section',
      type: 'law'
    });

    this.assert(chunks.length > 1, 'Large section should create multiple chunks');
    this.assert(chunks[0].content.length <= 1500, 'Chunk should not exceed maxChunkSize');
  }

  async testChunkOverlap(): Promise<void> {
    // Create content that will be split into multiple chunks
    const sentences = Array(20).fill(0).map((_, i) =>
      `Esta es la oración número ${i + 1} que forma parte del contenido legal. `
    ).join('');

    const text = `ARTÍCULO 1.- ${sentences}`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-9',
      title: 'Overlap Test',
      type: 'law'
    });

    if (chunks.length > 1) {
      // Check if there's content overlap between consecutive chunks
      const firstChunkEnd = chunks[0].content.slice(-100);
      const secondChunkStart = chunks[1].content.slice(0, 100);

      // There should be some common words due to overlap
      const firstWords = new Set(firstChunkEnd.split(/\s+/));
      const secondWords = secondChunkStart.split(/\s+/);
      const commonWords = secondWords.filter(w => firstWords.has(w));

      this.assert(commonWords.length > 0, 'Consecutive chunks should have overlap');
    }
  }

  async testPreserveSectionBoundaries(): Promise<void> {
    const text = `ARTÍCULO 1.- Primera disposición.

ARTÍCULO 2.- Segunda disposición.

ARTÍCULO 3.- Tercera disposición.`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-10',
      title: 'Section Boundaries',
      type: 'law'
    });

    // Each article should be in its own chunk (or set of chunks)
    const article1Chunks = chunks.filter(c => c.section.includes('ARTÍCULO 1'));
    const article2Chunks = chunks.filter(c => c.section.includes('ARTÍCULO 2'));
    const article3Chunks = chunks.filter(c => c.section.includes('ARTÍCULO 3'));

    this.assert(article1Chunks.length > 0, 'Should have chunks for Article 1');
    this.assert(article2Chunks.length > 0, 'Should have chunks for Article 2');
    this.assert(article3Chunks.length > 0, 'Should have chunks for Article 3');
  }

  // ========================================
  // RELATIONSHIP TESTS
  // ========================================

  async testPreviousNextRelationships(): Promise<void> {
    const text = `ARTÍCULO 1.- Primera disposición.

ARTÍCULO 2.- Segunda disposición.

ARTÍCULO 3.- Tercera disposición.`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-11',
      title: 'Sequential Relationships',
      type: 'law'
    });

    this.assert(chunks.length >= 3, 'Should have at least 3 chunks');

    // Check first chunk has 'next' but not 'previous'
    const firstChunk = chunks[0];
    this.assert(
      firstChunk.relationships.some(r => r.type === 'next'),
      'First chunk should have next relationship'
    );
    this.assert(
      !firstChunk.relationships.some(r => r.type === 'previous'),
      'First chunk should not have previous relationship'
    );

    // Check middle chunk has both
    const middleChunk = chunks[1];
    this.assert(
      middleChunk.relationships.some(r => r.type === 'previous'),
      'Middle chunk should have previous relationship'
    );
    this.assert(
      middleChunk.relationships.some(r => r.type === 'next'),
      'Middle chunk should have next relationship'
    );

    // Check last chunk has 'previous' but not 'next'
    const lastChunk = chunks[chunks.length - 1];
    this.assert(
      lastChunk.relationships.some(r => r.type === 'previous'),
      'Last chunk should have previous relationship'
    );
    this.assert(
      !lastChunk.relationships.some(r => r.type === 'next'),
      'Last chunk should not have next relationship'
    );
  }

  async testParentChildRelationships(): Promise<void> {
    const text = `CAPÍTULO I
DISPOSICIONES GENERALES

ARTÍCULO 1.- El Estado garantiza el derecho a la educación.

ARTÍCULO 2.- La educación es un servicio público.`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-12',
      title: 'Hierarchical Relationships',
      type: 'law'
    });

    const chapterChunk = chunks.find(c => c.sectionType === 'chapter');
    const articleChunks = chunks.filter(c => c.sectionType === 'article');

    if (chapterChunk && articleChunks.length > 0) {
      // Chapter should have child relationships to articles
      const hasChildRelationships = chapterChunk.relationships.some(r => r.type === 'child');
      this.assert(hasChildRelationships, 'Chapter should have child relationships');

      // Articles should have parent relationship to chapter
      const articleHasParent = articleChunks[0].relationships.some(r => r.type === 'parent');
      this.assert(articleHasParent, 'Article should have parent relationship');
    }
  }

  // ========================================
  // IMPORTANCE SCORING TESTS
  // ========================================

  async testImportanceCalculation(): Promise<void> {
    const text = `TÍTULO I
DE LOS PRINCIPIOS FUNDAMENTALES

ARTÍCULO 1.- El derecho a la educación es fundamental y constituye un derecho humano
establecido en la Constitución de la República del Ecuador.`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-13',
      title: 'Importance Test',
      type: 'law'
    });

    // All chunks should have importance scores calculated
    this.assert(
      chunks.every(c => c.importance !== undefined && c.importance >= 0 && c.importance <= 1),
      'All chunks should have valid importance scores (0-1)'
    );

    // Title sections should generally have higher importance
    const titleChunk = chunks.find(c => c.sectionType === 'title');
    if (titleChunk) {
      this.assert(titleChunk.importance > 0.5, 'Title chunk should have high importance');
    }
  }

  async testKeywordDensity(): Promise<void> {
    const legalText = `ARTÍCULO 1.- Esta ley establece el marco legal para la aplicación
del derecho constitucional. El tribunal determinará la responsabilidad según lo dispone
el decreto y la resolución de la Corte.`;

    const nonLegalText = `ARTÍCULO 2.- El color azul es bonito. Los gatos duermen mucho.
El sol brilla en verano. Las flores huelen bien.`;

    const chunks1 = await this.chunker.chunkDocument(legalText, {
      id: 'test-14a',
      title: 'Legal Keywords',
      type: 'law'
    });

    const chunks2 = await this.chunker.chunkDocument(nonLegalText, {
      id: 'test-14b',
      title: 'Non-Legal Keywords',
      type: 'law'
    });

    if (chunks1.length > 0 && chunks2.length > 0) {
      // Legal text should have higher importance due to keyword density
      this.assert(
        chunks1[0].importance > chunks2[0].importance,
        'Legal text should have higher importance than non-legal text'
      );
    }
  }

  // ========================================
  // SENTENCE SPLITTING TESTS
  // ========================================

  async testLegalAbbreviationProtection(): Promise<void> {
    const text = `ARTÍCULO 1.- El Dr. García y la Dra. Pérez, representantes de la
empresa Construcciones S.A. y de la firma Arquitectos Ltda., según el Art. 25 del
Código Civil, No. 123, presentaron el Inc. 5 del expediente.`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-15',
      title: 'Abbreviation Test',
      type: 'law'
    });

    // Should create single chunk without breaking at abbreviations
    this.assert(chunks.length === 1, 'Should not split on legal abbreviations');
    this.assert(chunks[0].content.includes('Dr. García'), 'Should preserve Dr. abbreviation');
    this.assert(chunks[0].content.includes('S.A.'), 'Should preserve S.A. abbreviation');
    this.assert(chunks[0].content.includes('Ltda.'), 'Should preserve Ltda. abbreviation');
  }

  // ========================================
  // UTILITY METHOD TESTS
  // ========================================

  async testGetChunksBySection(): Promise<void> {
    const text = `ARTÍCULO 1.- Primera disposición.
ARTÍCULO 2.- Segunda disposición.
CAPÍTULO I
DISPOSICIONES GENERALES`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-16',
      title: 'Section Filter',
      type: 'law'
    });

    const articleChunks = this.chunker.getChunksBySection(chunks, 'article');
    const chapterChunks = this.chunker.getChunksBySection(chunks, 'chapter');

    this.assert(articleChunks.length > 0, 'Should find article chunks');
    this.assert(chapterChunks.length > 0, 'Should find chapter chunks');
    this.assert(
      articleChunks.every(c => c.sectionType === 'article'),
      'All filtered chunks should be articles'
    );
  }

  async testGetImportantChunks(): Promise<void> {
    const text = `TÍTULO I
DE LOS DERECHOS FUNDAMENTALES

ARTÍCULO 1.- El derecho a la educación es fundamental según establece la ley orgánica
y lo dispone el decreto constitucional mediante resolución de la Corte.

ARTÍCULO 2.- El sol brilla. Los pájaros cantan. El agua fluye.`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-17',
      title: 'Important Chunks',
      type: 'law'
    });

    const importantChunks = this.chunker.getImportantChunks(chunks, 0.7);

    this.assert(importantChunks.length > 0, 'Should find important chunks');
    this.assert(
      importantChunks.every(c => c.importance >= 0.7),
      'All important chunks should meet threshold'
    );
  }

  async testGetRelatedChunks(): Promise<void> {
    const text = `ARTÍCULO 1.- Primera disposición.
ARTÍCULO 2.- Segunda disposición.
ARTÍCULO 3.- Tercera disposición.`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-18',
      title: 'Related Chunks',
      type: 'law'
    });

    if (chunks.length >= 2) {
      const nextChunks = this.chunker.getRelatedChunks(chunks[0], chunks, 'next');
      this.assert(nextChunks.length > 0, 'Should find next chunks');

      const previousChunks = this.chunker.getRelatedChunks(chunks[1], chunks, 'previous');
      this.assert(previousChunks.length > 0, 'Should find previous chunks');
    }
  }

  // ========================================
  // COMPLEX DOCUMENT TEST
  // ========================================

  async testComplexLegalDocument(): Promise<void> {
    const text = `LEY ORGÁNICA DE EDUCACIÓN SUPERIOR

CONSIDERANDO:

Que, la Constitución de la República del Ecuador en su artículo 350 establece que el
sistema de educación superior tiene como finalidad la formación académica y profesional;

Que, es necesario garantizar el derecho a la educación superior de calidad;

RESUELVE:

Expedir la siguiente LEY ORGÁNICA DE EDUCACIÓN SUPERIOR

TÍTULO I
DEL SISTEMA DE EDUCACIÓN SUPERIOR

CAPÍTULO I
ÁMBITO, OBJETO, FINES Y PRINCIPIOS

ARTÍCULO 1.- Ámbito.- Esta Ley regula el sistema de educación superior en el país.

ARTÍCULO 2.- Objeto.- Esta Ley tiene como objeto definir sus principios, garantizar
el derecho a la educación superior de calidad que propenda a la excelencia.

CAPÍTULO II
AUTONOMÍA RESPONSABLE

ARTÍCULO 3.- Autonomía Responsable.- La autonomía responsable que ejercen las
universidades y escuelas politécnicas consiste en la independencia para que los
organismos que la integran ejerzan sus funciones.

TÍTULO II
DE LAS INSTITUCIONES DE EDUCACIÓN SUPERIOR

CAPÍTULO I
TIPOLOGÍA DE INSTITUCIONES

ARTÍCULO 4.- Instituciones.- Las instituciones de educación superior ecuatorianas son:
universidades y escuelas politécnicas, institutos superiores técnicos, tecnológicos,
pedagógicos, de artes y conservatorios superiores.

DISPOSICIONES TRANSITORIAS

Primera.- En el plazo de 18 meses contados a partir de la publicación de esta Ley,
todas las instituciones del Sistema de Educación Superior deberán haber adecuado sus
estatutos.

Segunda.- Los profesores e investigadores que actualmente laboran en el Sistema de
Educación Superior tendrán un plazo de 5 años para obtener el título de PhD.

DISPOSICIÓN FINAL

La presente Ley entrará en vigencia a partir de su publicación en el Registro Oficial.`;

    const chunks = await this.chunker.chunkDocument(text, {
      id: 'test-19',
      title: 'Ley Orgánica de Educación Superior',
      type: 'law'
    });

    // Verify comprehensive chunking
    this.assert(chunks.length >= 10, 'Complex document should create multiple chunks');

    // Verify section detection
    const hasPreamble = chunks.some(c => c.sectionType === 'preamble' || c.section.includes('CONSIDERANDO'));
    const hasTitle = chunks.some(c => c.sectionType === 'title');
    const hasChapter = chunks.some(c => c.sectionType === 'chapter');
    const hasArticle = chunks.some(c => c.sectionType === 'article');
    const hasTransitional = chunks.some(c => c.sectionType === 'transitional');
    const hasFinal = chunks.some(c => c.sectionType === 'final');

    this.assert(hasTitle, 'Should detect TÍTULO sections');
    this.assert(hasChapter, 'Should detect CAPÍTULO sections');
    this.assert(hasArticle, 'Should detect ARTÍCULO sections');
    this.assert(hasTransitional, 'Should detect DISPOSICIONES TRANSITORIAS');
    this.assert(hasFinal, 'Should detect DISPOSICIÓN FINAL');

    // Verify all chunks have metadata
    this.assert(
      chunks.every(c => c.id && c.documentId && c.content && c.metadata),
      'All chunks should have complete metadata'
    );

    // Verify relationships exist
    this.assert(
      chunks.every(c => Array.isArray(c.relationships)),
      'All chunks should have relationships array'
    );
  }

  // ========================================
  // RUN ALL TESTS
  // ========================================

  async runAllTests(): Promise<void> {
    console.log('\n='.repeat(80));
    console.log('PHASE 4: HIERARCHICAL DOCUMENT CHUNKING - TEST SUITE');
    console.log('='.repeat(80));
    console.log('');

    console.log('📝 STRUCTURE PARSING TESTS');
    console.log('-'.repeat(80));
    await this.runTest('Parse document title', () => this.testParseDocumentTitle());
    await this.runTest('Parse chapter section', () => this.testParseChapterSection());
    await this.runTest('Parse article section', () => this.testParseArticleSection());
    await this.runTest('Parse considerando section', () => this.testParseConsiderandoSection());
    await this.runTest('Parse title section', () => this.testParseTitleSection());
    await this.runTest('Parse disposiciones transitorias', () => this.testParseDisposicionesTransitorias());

    console.log('');
    console.log('✂️  CHUNKING BEHAVIOR TESTS');
    console.log('-'.repeat(80));
    await this.runTest('Small section single chunk', () => this.testSmallSectionSingleChunk());
    await this.runTest('Large section multiple chunks', () => this.testLargeSectionMultipleChunks());
    await this.runTest('Chunk overlap', () => this.testChunkOverlap());
    await this.runTest('Preserve section boundaries', () => this.testPreserveSectionBoundaries());

    console.log('');
    console.log('🔗 RELATIONSHIP TESTS');
    console.log('-'.repeat(80));
    await this.runTest('Previous/Next relationships', () => this.testPreviousNextRelationships());
    await this.runTest('Parent/Child relationships', () => this.testParentChildRelationships());

    console.log('');
    console.log('⭐ IMPORTANCE SCORING TESTS');
    console.log('-'.repeat(80));
    await this.runTest('Importance calculation', () => this.testImportanceCalculation());
    await this.runTest('Keyword density scoring', () => this.testKeywordDensity());

    console.log('');
    console.log('✍️  SENTENCE SPLITTING TESTS');
    console.log('-'.repeat(80));
    await this.runTest('Legal abbreviation protection', () => this.testLegalAbbreviationProtection());

    console.log('');
    console.log('🛠️  UTILITY METHOD TESTS');
    console.log('-'.repeat(80));
    await this.runTest('Get chunks by section', () => this.testGetChunksBySection());
    await this.runTest('Get important chunks', () => this.testGetImportantChunks());
    await this.runTest('Get related chunks', () => this.testGetRelatedChunks());

    console.log('');
    console.log('📄 COMPLEX DOCUMENT TEST');
    console.log('-'.repeat(80));
    await this.runTest('Complex legal document', () => this.testComplexLegalDocument());

    console.log('');
    console.log('='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests:  ${this.testsRun}`);
    console.log(`✅ Passed:    ${this.testsPassed}`);
    console.log(`❌ Failed:    ${this.testsFailed}`);
    console.log(`Success Rate: ${((this.testsPassed / this.testsRun) * 100).toFixed(1)}%`);
    console.log('='.repeat(80));
    console.log('');

    if (this.testsFailed === 0) {
      console.log('🎉 ALL TESTS PASSED! Phase 4 implementation is successful.');
    } else {
      console.log('⚠️  Some tests failed. Review the errors above.');
      process.exit(1);
    }
  }
}

// Run tests
const suite = new Phase4TestSuite();
suite.runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
