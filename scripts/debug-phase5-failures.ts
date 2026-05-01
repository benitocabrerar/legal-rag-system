/**
 * Debug Phase 5 failing tests
 */

import { EnhancedRelevanceScorer } from '../src/services/scoring/enhancedRelevanceScorer';
import { DEFAULT_SEARCH_CONTEXT, DEFAULT_SCORING_WEIGHTS, type DocumentMetadata } from '../src/services/scoring/scoringTypes';

const scorer = new EnhancedRelevanceScorer();

function createTestMetadata(
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

async function debugTest1() {
  console.log('=== Debug Test 1: Multi-Factor Score Combination ===\n');

  const query = 'ley orgánica educación superior';
  const documents = [
    {
      id: 'doc1',
      content: 'Ley Orgánica de Educación Superior - Esta ley regula el sistema de educación superior en Ecuador.',
      metadata: createTestMetadata('law', 'Ley Orgánica', 'national', '2023-01-15', 'national_assembly')
    }
  ];

  const scored = await scorer.scoreDocuments(query, documents, DEFAULT_SEARCH_CONTEXT);

  console.log('Score breakdown:');
  console.log(`  Semantic: ${scored[0].scoreBreakdown.semantic}`);
  console.log(`  Keyword: ${scored[0].scoreBreakdown.keyword}`);
  console.log(`  Metadata: ${scored[0].scoreBreakdown.metadata}`);
  console.log(`  Recency: ${scored[0].scoreBreakdown.recency}`);
  console.log(`  Authority: ${scored[0].scoreBreakdown.authority}`);

  console.log('\nWeights:');
  console.log(`  Semantic: ${DEFAULT_SCORING_WEIGHTS.semantic}`);
  console.log(`  Keyword: ${DEFAULT_SCORING_WEIGHTS.keyword}`);
  console.log(`  Metadata: ${DEFAULT_SCORING_WEIGHTS.metadata}`);
  console.log(`  Recency: ${DEFAULT_SCORING_WEIGHTS.recency}`);
  console.log(`  Authority: ${DEFAULT_SCORING_WEIGHTS.authority}`);

  const expectedScore =
    scored[0].scoreBreakdown.semantic * DEFAULT_SCORING_WEIGHTS.semantic +
    scored[0].scoreBreakdown.keyword * DEFAULT_SCORING_WEIGHTS.keyword +
    scored[0].scoreBreakdown.metadata * DEFAULT_SCORING_WEIGHTS.metadata +
    scored[0].scoreBreakdown.recency * DEFAULT_SCORING_WEIGHTS.recency +
    scored[0].scoreBreakdown.authority * DEFAULT_SCORING_WEIGHTS.authority;

  console.log('\nScores:');
  console.log(`  Final score: ${scored[0].relevanceScore}`);
  console.log(`  Expected score: ${expectedScore}`);
  console.log(`  Difference: ${Math.abs(scored[0].relevanceScore - expectedScore)}`);
  console.log(`  Test threshold: 0.001`);
}

async function debugTest2() {
  console.log('\n=== Debug Test 2: Score Breakdown Explanation ===\n');

  const query = 'código civil';
  const documents = [
    {
      id: 'doc1',
      content: 'Código Civil del Ecuador',
      metadata: createTestMetadata('law')
    }
  ];

  const scored = await scorer.scoreDocuments(query, documents, DEFAULT_SEARCH_CONTEXT);

  console.log('Explanation:');
  console.log(scored[0].explanation);
  console.log(`\nContains "keyword": ${scored[0].explanation.includes('keyword')}`);
  console.log(`Explanation length: ${scored[0].explanation.length}`);
}

async function debugTest3() {
  console.log('\n=== Debug Test 3: Empty Query Handling ===\n');

  const query = '';
  const documents = [
    {
      id: 'doc1',
      content: 'Contenido del documento',
      metadata: createTestMetadata('law')
    }
  ];

  const scored = await scorer.scoreDocuments(query, documents, DEFAULT_SEARCH_CONTEXT);

  console.log('Result:');
  console.log(`  Relevance score: ${scored[0].relevanceScore}`);
  console.log(`  Score >= 0: ${scored[0].relevanceScore >= 0}`);
  console.log(`  Score breakdown:`, scored[0].scoreBreakdown);
}

async function runDebug() {
  await debugTest1();
  await debugTest2();
  await debugTest3();
}

runDebug().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
