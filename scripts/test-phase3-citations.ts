/**
 * Phase 3 Citation Parser Testing Script
 * Tests the Ecuadorian legal citation parser implementation
 */

import { EcuadorianCitationParser } from '../src/services/legal/citationParser';
import { CitationValidator } from '../src/services/legal/citationValidator';
import { ParsedCitation } from '../src/types/citations.types';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class CitationParserTestSuite {
  private parser: EcuadorianCitationParser;
  private validator: CitationValidator;
  private results: TestResult[] = [];

  constructor() {
    this.parser = new EcuadorianCitationParser();
    this.validator = new CitationValidator();
  }

  async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    try {
      await testFn();
      this.results.push({
        testName,
        passed: true,
        duration: Date.now() - startTime
      });
      console.log(`  ✅ ${testName}`);
    } catch (error: any) {
      this.results.push({
        testName,
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      });
      console.log(`  ❌ ${testName}`);
      console.log(`     Error: ${error.message}`);
    }
  }

  assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(message);
    }
  }

  async testOrdinaryLawCitation(): Promise<void> {
    const text = 'Según la Ley 123 de 2020, se establece...';
    const citations = await this.parser.parseCitations(text);

    this.assert(citations.length === 1, 'Should find 1 citation');
    this.assert(citations[0].type === 'law', 'Citation type should be "law"');
    this.assert(citations[0].components.number === '123', 'Law number should be "123"');
    this.assert(citations[0].components.year === '2020', 'Year should be "2020"');
    this.assert(citations[0].normalizedForm === 'Ley 123 de 2020', 'Normalized form incorrect');
    this.assert(citations[0].url?.includes('lexis.com.ec'), 'URL should contain lexis.com.ec');
  }

  async testOrganicLawCitation(): Promise<void> {
    const text = 'La Ley Orgánica 456 de 2021 establece...';
    const citations = await this.parser.parseCitations(text);

    this.assert(citations.length === 1, 'Should find 1 citation');
    this.assert(citations[0].components.organic === 'Orgánica', 'Should identify organic law');
    this.assert(citations[0].components.number === '456', 'Law number should be "456"');
    this.assert(citations[0].normalizedForm === 'Ley Orgánica 456 de 2021', 'Normalized form incorrect');
  }

  async testExecutiveDecreeCitation(): Promise<void> {
    const text = 'El Decreto Ejecutivo 789 de 2022 dispone...';
    const citations = await this.parser.parseCitations(text);

    this.assert(citations.length === 1, 'Should find 1 citation');
    this.assert(citations[0].type === 'decree', 'Citation type should be "decree"');
    this.assert(citations[0].components.executive === 'Ejecutivo', 'Should identify executive decree');
    this.assert(citations[0].components.number === '789', 'Decree number should be "789"');
    this.assert(citations[0].url?.includes('presidencia.gob.ec'), 'URL should contain presidencia.gob.ec');
  }

  async testConstitutionalCourtCitation(): Promise<void> {
    const text = 'La Sentencia 001-20/2022 de la Corte Constitucional...';
    const citations = await this.parser.parseCitations(text);

    this.assert(citations.length === 1, 'Should find 1 citation');
    this.assert(citations[0].type === 'constitutional_court', 'Type should be constitutional_court');
    this.assert(citations[0].components.number === '001-20', 'Number should be "001-20"');
    this.assert(citations[0].components.year === '2022', 'Year should be "2022"');
    this.assert(citations[0].url?.includes('corteconstitucional.gob.ec'), 'URL should contain corteconstitucional.gob.ec');
  }

  async testSupremeCourtCitation(): Promise<void> {
    const text = 'La Sentencia 123 del 15 de marzo de 2021...';
    const citations = await this.parser.parseCitations(text);

    this.assert(citations.length === 1, 'Should find 1 citation');
    this.assert(citations[0].type === 'supreme_court', 'Type should be supreme_court');
    this.assert(citations[0].components.number === '123', 'Number should be "123"');
    this.assert(citations[0].components.day === '15', 'Day should be "15"');
    this.assert(citations[0].components.month === 'marzo', 'Month should be "marzo"');
    this.assert(citations[0].url?.includes('funcionjudicial.gob.ec'), 'URL should contain funcionjudicial.gob.ec');
  }

  async testResolutionCitation(): Promise<void> {
    const text = 'La Resolución 123-ABC de 2020...';
    const citations = await this.parser.parseCitations(text);

    this.assert(citations.length === 1, 'Should find 1 citation');
    this.assert(citations[0].type === 'resolution', 'Type should be resolution');
    this.assert(citations[0].components.number === '123-ABC', 'Number should be "123-ABC"');
    this.assert(citations[0].url?.includes('gobiernoelectronico.gob.ec'), 'URL should contain gobiernoelectronico.gob.ec');
  }

  async testArticleCitation(): Promise<void> {
    const text = 'El artículo 25 establece...';
    const citations = await this.parser.parseCitations(text);

    this.assert(citations.length === 1, 'Should find 1 citation');
    this.assert(citations[0].type === 'article', 'Type should be article');
    this.assert(citations[0].components.article === '25', 'Article should be "25"');
  }

  async testArticleWithNumeral(): Promise<void> {
    const text = 'Según el Artículo 10 numeral 3...';
    const citations = await this.parser.parseCitations(text);

    this.assert(citations.length === 1, 'Should find 1 citation');
    this.assert(citations[0].components.article === '10', 'Article should be "10"');
    this.assert(citations[0].components.numeral === '3', 'Numeral should be "3"');
    this.assert(citations[0].normalizedForm === 'Artículo 10 numeral 3', 'Normalized form incorrect');
  }

  async testCodeCitation(): Promise<void> {
    const text = 'El Código Civil establece...';
    const citations = await this.parser.parseCitations(text);

    this.assert(citations.length === 1, 'Should find 1 citation');
    this.assert(citations[0].type === 'code', 'Type should be code');
    this.assert(citations[0].components.type === 'Civil', 'Code type should be "Civil"');
    this.assert(citations[0].url?.includes('lexis.com.ec'), 'URL should contain lexis.com.ec');
  }

  async testMultipleCitations(): Promise<void> {
    const text = 'La Ley 100 de 2019 y la Ley Orgánica 200 de 2020 establecen...';
    const citations = await this.parser.parseCitations(text);

    this.assert(citations.length === 2, 'Should find 2 citations');
    this.assert(citations[0].components.number === '100', 'First law number should be "100"');
    this.assert(citations[1].components.number === '200', 'Second law number should be "200"');
  }

  async testDeduplication(): Promise<void> {
    const text = 'La Ley 123 de 2020 establece... según la Ley 123 de 2020...';
    const citations = await this.parser.parseCitations(text);

    this.assert(citations.length === 1, 'Should deduplicate repeated citations');
  }

  async testComplexDocument(): Promise<void> {
    const text = `
      CONSIDERANDO:
      Que, la Ley Orgánica 123 de 2019 establece el marco regulatorio;
      Que, mediante Decreto Ejecutivo 456 de 2020 se implementó;
      Que, la Sentencia 001-20/2021 de la Corte Constitucional determinó;
      Que, el Código Civil en su artículo 1234 dispone;
      Que, la Resolución 789-XYZ de 2022 aprobó;
      RESUELVE:
      Aplicar lo establecido en el Artículo 25 numeral 3...
    `;

    const citations = await this.parser.parseCitations(text);

    this.assert(citations.length >= 6, 'Should find at least 6 citations');

    const types = citations.map(c => c.type);
    this.assert(types.includes('law'), 'Should include law citation');
    this.assert(types.includes('decree'), 'Should include decree citation');
    this.assert(types.includes('constitutional_court'), 'Should include constitutional court citation');
    this.assert(types.includes('code'), 'Should include code citation');
    this.assert(types.includes('resolution'), 'Should include resolution citation');
    this.assert(types.includes('article'), 'Should include article citation');
  }

  async testCitationStatistics(): Promise<void> {
    const text = `
      La Ley 100 de 2020 y la Ley 200 de 2021 establecen...
      Decreto Ejecutivo 500 de 2022...
      Artículo 25...
      Código Civil...
    `;

    const stats = await this.parser.getCitationStatistics(text);

    this.assert(stats.total === 5, `Total should be 5, got ${stats.total}`);
    this.assert(stats.byType['law'] === 2, `Law count should be 2, got ${stats.byType['law']}`);
    this.assert(stats.byType['decree'] === 1, `Decree count should be 1, got ${stats.byType['decree']}`);
    this.assert(stats.byType['article'] === 1, `Article count should be 1, got ${stats.byType['article']}`);
    this.assert(stats.byType['code'] === 1, `Code count should be 1, got ${stats.byType['code']}`);
  }

  // Validation tests
  async testValidateLaw(): Promise<void> {
    const citation: ParsedCitation = {
      type: 'law',
      raw: 'Ley 123 de 2020',
      position: 0,
      components: { number: '123', year: '2020' },
      normalizedForm: 'Ley 123 de 2020',
      url: null
    };

    const isValid = await this.validator.validate(citation);
    this.assert(isValid === true, 'Valid law should be accepted');
  }

  async testRejectOldLaw(): Promise<void> {
    const citation: ParsedCitation = {
      type: 'law',
      raw: 'Ley 123 de 1800',
      position: 0,
      components: { number: '123', year: '1800' },
      normalizedForm: 'Ley 123 de 1800',
      url: null
    };

    const isValid = await this.validator.validate(citation);
    this.assert(isValid === false, 'Law before 1830 should be rejected');
  }

  async testRejectFutureLaw(): Promise<void> {
    const citation: ParsedCitation = {
      type: 'law',
      raw: 'Ley 123 de 2099',
      position: 0,
      components: { number: '123', year: '2099' },
      normalizedForm: 'Ley 123 de 2099',
      url: null
    };

    const isValid = await this.validator.validate(citation);
    this.assert(isValid === false, 'Future law should be rejected');
  }

  async testValidateConstitutionalCourt(): Promise<void> {
    const citation: ParsedCitation = {
      type: 'constitutional_court',
      raw: 'Sentencia 001-20/2020',
      position: 0,
      components: { type: 'Sentencia', number: '001-20', year: '20' },
      normalizedForm: 'Sentencia 001-20/2020',
      url: null
    };

    const isValid = await this.validator.validate(citation);
    this.assert(isValid === true, 'Valid constitutional court sentence should be accepted');
  }

  async testRejectOldConstitutionalCourt(): Promise<void> {
    const citation: ParsedCitation = {
      type: 'constitutional_court',
      raw: 'Sentencia 001-05/2005',
      position: 0,
      components: { type: 'Sentencia', number: '001-05', year: '05' },
      normalizedForm: 'Sentencia 001-05/2005',
      url: null
    };

    const isValid = await this.validator.validate(citation);
    this.assert(isValid === false, 'Constitutional court sentence before 2008 should be rejected');
  }

  async testValidateCode(): Promise<void> {
    const citation: ParsedCitation = {
      type: 'code',
      raw: 'Código Civil',
      position: 0,
      components: { type: 'Civil' },
      normalizedForm: 'Código Civil',
      url: null
    };

    const isValid = await this.validator.validate(citation);
    this.assert(isValid === true, 'Civil Code should be accepted');
  }

  async runAllTests(): Promise<void> {
    console.log('\n========================================');
    console.log('PHASE 3: CITATION PARSER TESTS');
    console.log('========================================\n');

    console.log('📝 Citation Parsing Tests:');
    await this.runTest('Parse ordinary law citation', () => this.testOrdinaryLawCitation());
    await this.runTest('Parse organic law citation', () => this.testOrganicLawCitation());
    await this.runTest('Parse executive decree citation', () => this.testExecutiveDecreeCitation());
    await this.runTest('Parse constitutional court citation', () => this.testConstitutionalCourtCitation());
    await this.runTest('Parse supreme court citation', () => this.testSupremeCourtCitation());
    await this.runTest('Parse resolution citation', () => this.testResolutionCitation());
    await this.runTest('Parse article citation', () => this.testArticleCitation());
    await this.runTest('Parse article with numeral', () => this.testArticleWithNumeral());
    await this.runTest('Parse code citation', () => this.testCodeCitation());
    await this.runTest('Parse multiple citations', () => this.testMultipleCitations());
    await this.runTest('Deduplicate repeated citations', () => this.testDeduplication());
    await this.runTest('Parse complex document', () => this.testComplexDocument());
    await this.runTest('Calculate citation statistics', () => this.testCitationStatistics());

    console.log('\n🔍 Validation Tests:');
    await this.runTest('Validate correct law', () => this.testValidateLaw());
    await this.runTest('Reject law before 1830', () => this.testRejectOldLaw());
    await this.runTest('Reject future law', () => this.testRejectFutureLaw());
    await this.runTest('Validate constitutional court', () => this.testValidateConstitutionalCourt());
    await this.runTest('Reject old constitutional court', () => this.testRejectOldConstitutionalCourt());
    await this.runTest('Validate code citation', () => this.testValidateCode());

    this.printSummary();
  }

  printSummary(): void {
    console.log('\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================\n');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => r.passed === false).length;
    const total = this.results.length;

    console.log(`📊 Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Pass Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

    if (failed > 0) {
      console.log('FAILED TESTS:');
      console.log('─'.repeat(80));
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`❌ ${r.testName}`);
        console.log(`   Error: ${r.error}`);
      });
      console.log('─'.repeat(80));
    }

    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total;
    console.log(`\n⏱️  Average Test Duration: ${avgDuration.toFixed(2)}ms`);

    console.log('\n========================================');
    console.log('FINAL RESULT');
    console.log('========================================\n');

    if (passed === total) {
      console.log('✅ PHASE 3 TESTS SUCCESSFUL');
      console.log('   All citation parser tests passed!');
      console.log('   Ready to generate Phase 3 report.\n');
      process.exit(0);
    } else {
      console.log('⚠️  PHASE 3 TESTS FAILED');
      console.log(`   ${failed} test(s) need attention.\n`);
      process.exit(1);
    }
  }
}

// Run tests
const testSuite = new CitationParserTestSuite();
testSuite.runAllTests().catch(error => {
  console.error('\n❌ Fatal error during testing:', error);
  process.exit(1);
});
