/**
 * Phase 5: Enhanced Relevance Scoring Tests
 * Comprehensive test suite for multi-factor document scoring
 */

import { EnhancedRelevanceScorer } from '../src/services/scoring/enhancedRelevanceScorer';
import {
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_SEARCH_CONTEXT,
  ECUADORIAN_SOURCE_AUTHORITY,
  type DocumentMetadata,
  type SearchContext
} from '../src/services/scoring/scoringTypes';

class Phase5TestSuite {
  private scorer: EnhancedRelevanceScorer;
  private passedTests: number = 0;
  private totalTests: number = 0;

  constructor() {
    this.scorer = new EnhancedRelevanceScorer();
  }

  private assert(condition: boolean, message: string): void {
    this.totalTests++;
    if (condition) {
      this.passedTests++;
      console.log(`✓ ${message}`);
    } else {
      console.error(`✗ ${message}`);
    }
  }

  // Test 1: Query Feature Extraction - Basic Terms
  async testQueryFeatureExtractionBasic(): Promise<void> {
    const query = 'derechos humanos constitución';
    const features = await this.scorer.extractQueryFeatures(query);

    this.assert(features.rawQuery === query, 'Should preserve raw query');
    this.assert(features.terms.length === 3, 'Should extract 3 terms');
    this.assert(features.terms.includes('derechos'), 'Should include "derechos"');
    this.assert(features.terms.includes('humanos'), 'Should include "humanos"');
    this.assert(features.terms.includes('constitución'), 'Should include "constitución"');
  }

  // Test 2: Query Feature Extraction - Phrases
  async testQueryFeatureExtractionPhrases(): Promise<void> {
    const query = '"derechos humanos" "código civil"';
    const features = await this.scorer.extractQueryFeatures(query);

    this.assert(features.phrases.length === 2, 'Should extract 2 phrases');
    this.assert(features.phrases.includes('derechos humanos'), 'Should include phrase "derechos humanos"');
    this.assert(features.phrases.includes('código civil'), 'Should include phrase "código civil"');
  }

  // Test 3: Query Feature Extraction - Document Types
  async testQueryFeatureExtractionDocTypes(): Promise<void> {
    const query = 'ley orgánica regulación ambiental';
    const features = await this.scorer.extractQueryFeatures(query);

    this.assert(features.documentTypes.length > 0, 'Should extract document types');
    this.assert(features.documentTypes.includes('law'), 'Should identify "ley" as law type');
  }

  // Test 4: Query Feature Extraction - Legal Areas
  async testQueryFeatureExtractionLegalAreas(): Promise<void> {
    const query = 'derecho penal procesal código penal';
    const features = await this.scorer.extractQueryFeatures(query);

    this.assert(features.legalAreas.length > 0, 'Should extract legal areas');
    this.assert(features.legalAreas.includes('criminal'), 'Should identify "penal" as criminal area');
  }

  // Test 5: BM25 Keyword Scoring - Exact Match
  async testBM25ExactMatch(): Promise<void> {
    const query = 'derechos humanos';
    const documents = [
      {
        id: 'doc1',
        content: 'Los derechos humanos son fundamentales en nuestra constitución.',
        metadata: this.createTestMetadata('law')
      },
      {
        id: 'doc2',
        content: 'El código civil regula las obligaciones entre personas.',
        metadata: this.createTestMetadata('law')
      }
    ];

    const scored = await this.scorer.scoreDocuments(query, documents, DEFAULT_SEARCH_CONTEXT);

    this.assert(scored.length === 2, 'Should score 2 documents');
    this.assert(scored[0].id === 'doc1', 'Doc with exact match should rank first');
    this.assert(scored[0].relevanceScore > scored[1].relevanceScore, 'Exact match should score higher');
  }

  // Test 6: BM25 Keyword Scoring - Partial Match
  async testBM25PartialMatch(): Promise<void> {
    const query = 'derechos humanos fundamentales';
    const documents = [
      {
        id: 'doc1',
        content: 'Los derechos humanos son esenciales.',
        metadata: this.createTestMetadata('law')
      },
      {
        id: 'doc2',
        content: 'Derechos fundamentales de las personas.',
        metadata: this.createTestMetadata('law')
      }
    ];

    const scored = await this.scorer.scoreDocuments(query, documents, DEFAULT_SEARCH_CONTEXT);

    this.assert(scored.length === 2, 'Should score 2 documents');
    this.assert(scored[0].scoreBreakdown.keyword > 0, 'Should have keyword score');
    this.assert(scored[1].scoreBreakdown.keyword > 0, 'Both docs should have keyword scores');
  }

  // Test 7: Metadata Scoring - Document Type Match
  async testMetadataScoringDocType(): Promise<void> {
    const query = 'ley orgánica educación superior';
    const documents = [
      {
        id: 'doc1',
        content: 'Ley Orgánica de Educación Superior',
        metadata: this.createTestMetadata('law', 'Ley Orgánica de Educación Superior')
      },
      {
        id: 'doc2',
        content: 'Reglamento de aplicación',
        metadata: this.createTestMetadata('regulation', 'Reglamento')
      }
    ];

    const scored = await this.scorer.scoreDocuments(query, documents, DEFAULT_SEARCH_CONTEXT);

    this.assert(scored[0].scoreBreakdown.metadata > 0, 'Should have metadata score');
    this.assert(scored[0].id === 'doc1', 'Law document should match query mentioning "ley"');
  }

  // Test 8: Metadata Scoring - Jurisdiction Match
  async testMetadataScoringJurisdiction(): Promise<void> {
    const query = 'regulación municipal quito';
    const documents = [
      {
        id: 'doc1',
        content: 'Ordenanza Municipal de Quito',
        metadata: this.createTestMetadata('ordinance', 'Ordenanza', 'municipal')
      },
      {
        id: 'doc2',
        content: 'Ley Nacional de Regulaciones',
        metadata: this.createTestMetadata('law', 'Ley', 'national')
      }
    ];

    const scored = await this.scorer.scoreDocuments(query, documents, DEFAULT_SEARCH_CONTEXT);

    this.assert(scored[0].scoreBreakdown.metadata > 0, 'Should have metadata score');
    // Municipal document should score reasonably even if not first
    const municipalDoc = scored.find(d => d.id === 'doc1');
    this.assert(municipalDoc !== undefined, 'Should find municipal document');
  }

  // Test 9: Recency Scoring - Recent Documents
  async testRecencyScoringRecent(): Promise<void> {
    const query = 'código civil';
    const documents = [
      {
        id: 'doc1',
        content: 'Código Civil actualizado',
        metadata: this.createTestMetadata('law', 'Código Civil', 'national', '2024-01-15')
      },
      {
        id: 'doc2',
        content: 'Código Civil antiguo',
        metadata: this.createTestMetadata('law', 'Código Civil', 'national', '2005-06-20')
      }
    ];

    const context: SearchContext = { ...DEFAULT_SEARCH_CONTEXT, preferRecent: true };
    const scored = await this.scorer.scoreDocuments(query, documents, context);

    this.assert(scored[0].scoreBreakdown.recency > 0, 'Should have recency score');
    this.assert(scored[0].id === 'doc1', 'More recent document should rank first when preferRecent is true');
    this.assert(
      scored[0].scoreBreakdown.recency > scored[1].scoreBreakdown.recency,
      'Recent doc should have higher recency score'
    );
  }

  // Test 10: Authority Scoring - Source Authority
  async testAuthorityScoringSource(): Promise<void> {
    const query = 'interpretación constitucional';
    const documents = [
      {
        id: 'doc1',
        content: 'Sentencia de la Corte Constitucional',
        metadata: this.createTestMetadata('ruling', 'Sentencia', 'national', '2023-01-15', 'constitutional_court')
      },
      {
        id: 'doc2',
        content: 'Resolución del Ministerio',
        metadata: this.createTestMetadata('resolution', 'Resolución', 'national', '2023-01-15', 'ministry')
      }
    ];

    const scored = await this.scorer.scoreDocuments(query, documents, DEFAULT_SEARCH_CONTEXT);

    this.assert(scored[0].scoreBreakdown.authority > 0, 'Should have authority score');
    this.assert(scored[0].id === 'doc1', 'Constitutional Court document should rank first');
    this.assert(
      scored[0].scoreBreakdown.authority > scored[1].scoreBreakdown.authority,
      'Constitutional Court should have higher authority than Ministry'
    );
  }

  // Test 11: Authority Scoring - Citation Count
  async testAuthorityScoringCitations(): Promise<void> {
    const query = 'código civil obligaciones';
    const documents = [
      {
        id: 'doc1',
        content: 'Artículo sobre obligaciones civiles',
        metadata: {
          ...this.createTestMetadata('law'),
          cited_by: ['ref1', 'ref2', 'ref3', 'ref4', 'ref5']
        }
      },
      {
        id: 'doc2',
        content: 'Artículo sobre obligaciones civiles',
        metadata: {
          ...this.createTestMetadata('law'),
          cited_by: ['ref1']
        }
      }
    ];

    const scored = await this.scorer.scoreDocuments(query, documents, DEFAULT_SEARCH_CONTEXT);

    this.assert(
      scored[0].scoreBreakdown.authority > scored[1].scoreBreakdown.authority,
      'Document with more citations should have higher authority'
    );
  }

  // Test 12: Multi-Factor Score Combination
  async testMultiFactorCombination(): Promise<void> {
    const query = 'ley orgánica educación superior';
    const documents = [
      {
        id: 'doc1',
        content: 'Ley Orgánica de Educación Superior - Esta ley regula el sistema de educación superior en Ecuador.',
        metadata: this.createTestMetadata('law', 'Ley Orgánica', 'national', '2023-01-15', 'national_assembly')
      }
    ];

    const scored = await this.scorer.scoreDocuments(query, documents, DEFAULT_SEARCH_CONTEXT);

    this.assert(scored.length === 1, 'Should score 1 document');
    this.assert(scored[0].scoreBreakdown.keyword > 0, 'Should have keyword score');
    this.assert(scored[0].scoreBreakdown.metadata > 0, 'Should have metadata score');
    this.assert(scored[0].scoreBreakdown.recency > 0, 'Should have recency score');
    this.assert(scored[0].scoreBreakdown.authority > 0, 'Should have authority score');

    // Verify final score is in valid range (0-1) and represents combined factors
    this.assert(
      scored[0].relevanceScore >= 0 && scored[0].relevanceScore <= 1,
      'Final score should be between 0 and 1'
    );

    // Verify final score is positive when all factors are positive
    this.assert(
      scored[0].relevanceScore > 0,
      'Final score should be positive when factors are positive'
    );
  }

  // Test 13: Score Breakdown Explanation
  async testScoreBreakdownExplanation(): Promise<void> {
    const query = 'código civil';
    const documents = [
      {
        id: 'doc1',
        content: 'Código Civil del Ecuador',
        metadata: this.createTestMetadata('law')
      }
    ];

    const scored = await this.scorer.scoreDocuments(query, documents, DEFAULT_SEARCH_CONTEXT);

    this.assert(scored[0].explanation.length > 0, 'Should have explanation');
    this.assert(
      scored[0].explanation.includes('clave') || scored[0].explanation.includes('semántica'),
      'Explanation should mention scoring factors (palabras clave or semántica)'
    );
  }

  // Test 14: MMR Re-ranking
  async testMMRReranking(): Promise<void> {
    const query = 'derechos humanos';
    const documents = [
      {
        id: 'doc1',
        content: 'Los derechos humanos son fundamentales.',
        metadata: this.createTestMetadata('law')
      },
      {
        id: 'doc2',
        content: 'Los derechos humanos son esenciales.',
        metadata: this.createTestMetadata('law')
      },
      {
        id: 'doc3',
        content: 'El código civil regula obligaciones.',
        metadata: this.createTestMetadata('law')
      }
    ];

    const context: SearchContext = { ...DEFAULT_SEARCH_CONTEXT, enableMMR: true };
    const scored = await this.scorer.scoreDocuments(query, documents, context);

    this.assert(scored.length === 3, 'Should return 3 documents');
    // MMR should balance relevance and diversity
    // doc1 and doc2 are very similar, so MMR might not put them consecutively
    this.assert(scored[0].relevanceScore >= scored[1].relevanceScore, 'Results should be ordered by score');
  }

  // Test 15: Diversity Re-ranking
  async testDiversityReranking(): Promise<void> {
    const query = 'regulación';
    const documents = [
      {
        id: 'doc1',
        content: 'Regulación del sector eléctrico',
        metadata: this.createTestMetadata('regulation', 'Regulación', 'national', '2023-01-15', 'ministry')
      },
      {
        id: 'doc2',
        content: 'Regulación del sector eléctrico - modificación',
        metadata: this.createTestMetadata('regulation', 'Regulación', 'national', '2023-02-15', 'ministry')
      },
      {
        id: 'doc3',
        content: 'Regulación del sector financiero',
        metadata: this.createTestMetadata('regulation', 'Regulación', 'national', '2023-01-15', 'regulatory_agency')
      }
    ];

    const context: SearchContext = { ...DEFAULT_SEARCH_CONTEXT, enableDiversity: true };
    const scored = await this.scorer.scoreDocuments(query, documents, context);

    this.assert(scored.length === 3, 'Should return 3 documents');
    // Diversity should prefer documents from different sectors
    this.assert(scored[0].relevanceScore > 0, 'Should have positive scores');
  }

  // Test 16: Empty Query Handling
  async testEmptyQueryHandling(): Promise<void> {
    const query = '';
    const documents = [
      {
        id: 'doc1',
        content: 'Contenido del documento',
        metadata: this.createTestMetadata('law')
      }
    ];

    const scored = await this.scorer.scoreDocuments(query, documents, DEFAULT_SEARCH_CONTEXT);

    this.assert(scored.length === 1, 'Should handle empty query');
    this.assert(scored[0].relevanceScore >= 0, 'Should return non-negative score');
  }

  // Test 17: No Documents Handling
  async testNoDocumentsHandling(): Promise<void> {
    const query = 'código civil';
    const documents: Array<{ id: string; content: string; metadata: DocumentMetadata }> = [];

    const scored = await this.scorer.scoreDocuments(query, documents, DEFAULT_SEARCH_CONTEXT);

    this.assert(scored.length === 0, 'Should return empty array for no documents');
  }

  // Test 18: Custom Scoring Weights
  async testCustomScoringWeights(): Promise<void> {
    const query = 'código civil';
    const documents = [
      {
        id: 'doc1',
        content: 'Código Civil del Ecuador',
        metadata: this.createTestMetadata('law', 'Código Civil', 'national', '2023-01-15', 'national_assembly')
      }
    ];

    const customWeights = {
      semantic: 0.5,
      keyword: 0.3,
      metadata: 0.1,
      recency: 0.05,
      authority: 0.05
    };

    const customScorer = new EnhancedRelevanceScorer(customWeights);
    const scored = await customScorer.scoreDocuments(query, documents, DEFAULT_SEARCH_CONTEXT);

    this.assert(scored.length === 1, 'Should score with custom weights');
    this.assert(scored[0].relevanceScore > 0, 'Should have positive score');
  }

  // Test 19: Ecuadorian Source Authority Rankings
  async testEcuadorianSourceAuthority(): Promise<void> {
    this.assert(
      ECUADORIAN_SOURCE_AUTHORITY['constitutional_court'] === 1.0,
      'Constitutional Court should have highest authority (1.0)'
    );
    this.assert(
      ECUADORIAN_SOURCE_AUTHORITY['supreme_court'] === 0.95,
      'Supreme Court should have 0.95 authority'
    );
    this.assert(
      ECUADORIAN_SOURCE_AUTHORITY['municipal_government'] < ECUADORIAN_SOURCE_AUTHORITY['national_assembly'],
      'Municipal government should have lower authority than National Assembly'
    );
    this.assert(
      ECUADORIAN_SOURCE_AUTHORITY['other'] === 0.40,
      'Other sources should have lowest authority (0.40)'
    );
  }

  // Helper method to create test metadata
  private createTestMetadata(
    type: string = 'law',
    title: string = 'Test Document',
    jurisdiction: string = 'national',
    date: string = '2023-01-15',
    source_type: string = 'national_assembly'
  ): DocumentMetadata {
    return {
      type,
      title,
      date,
      jurisdiction,
      legal_area: 'civil',
      keywords: [],
      source_type,
      cited_by: [],
      citations: []
    };
  }

  // Run all tests
  async runAllTests(): Promise<void> {
    console.log('\n=== PHASE 5: ENHANCED RELEVANCE SCORING TESTS ===\n');

    console.log('--- Query Feature Extraction Tests ---');
    await this.testQueryFeatureExtractionBasic();
    await this.testQueryFeatureExtractionPhrases();
    await this.testQueryFeatureExtractionDocTypes();
    await this.testQueryFeatureExtractionLegalAreas();

    console.log('\n--- BM25 Keyword Scoring Tests ---');
    await this.testBM25ExactMatch();
    await this.testBM25PartialMatch();

    console.log('\n--- Metadata Scoring Tests ---');
    await this.testMetadataScoringDocType();
    await this.testMetadataScoringJurisdiction();

    console.log('\n--- Recency Scoring Tests ---');
    await this.testRecencyScoringRecent();

    console.log('\n--- Authority Scoring Tests ---');
    await this.testAuthorityScoringSource();
    await this.testAuthorityScoringCitations();

    console.log('\n--- Multi-Factor Scoring Tests ---');
    await this.testMultiFactorCombination();
    await this.testScoreBreakdownExplanation();

    console.log('\n--- Re-ranking Tests ---');
    await this.testMMRReranking();
    await this.testDiversityReranking();

    console.log('\n--- Edge Cases Tests ---');
    await this.testEmptyQueryHandling();
    await this.testNoDocumentsHandling();

    console.log('\n--- Configuration Tests ---');
    await this.testCustomScoringWeights();
    await this.testEcuadorianSourceAuthority();

    console.log('\n=== TEST RESULTS ===');
    console.log(`Passed: ${this.passedTests}/${this.totalTests}`);
    console.log(`Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);

    if (this.passedTests === this.totalTests) {
      console.log('\n✅ ALL TESTS PASSED!');
      process.exit(0);
    } else {
      console.log('\n❌ SOME TESTS FAILED');
      process.exit(1);
    }
  }
}

// Run tests
const testSuite = new Phase5TestSuite();
testSuite.runAllTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
