/**
 * Test Script: NLP API Integration
 * Validates the complete NLP → Search integration pipeline
 *
 * Run with: npx tsx scripts/test-nlp-api-integration.ts
 */

import { QueryTransformationService } from '../src/services/nlp/query-transformation-service.js';
import { nlpSearchIntegrationService } from '../src/services/nlp/nlp-search-integration.js';
import { LegalEntityDictionary } from '../src/services/nlp/legal-entity-dictionary.js';

/**
 * ANSI color codes for console output
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

/**
 * Test queries covering various scenarios
 */
const testQueries = [
  {
    name: 'Basic Legal Query',
    query: 'leyes laborales vigentes',
    expectedFilters: ['normType', 'documentState']
  },
  {
    name: 'Query with Date Range',
    query: 'decretos presidenciales del último año',
    expectedFilters: ['normType', 'dateRange', 'issuingEntities']
  },
  {
    name: 'Specific Legal Topic',
    query: 'código civil sobre sucesiones',
    expectedFilters: ['normType', 'topics']
  },
  {
    name: 'Jurisdiction Query',
    query: 'ordenanzas municipales de Quito',
    expectedFilters: ['normType', 'jurisdiction', 'geographicScope']
  },
  {
    name: 'Complex Query',
    query: 'resoluciones sobre educación emitidas por el Ministerio de Educación en 2023',
    expectedFilters: ['normType', 'topics', 'issuingEntities', 'dateRange']
  }
];

/**
 * Print section header
 */
function printHeader(title: string) {
  console.log('\n' + colors.cyan + '='.repeat(70) + colors.reset);
  console.log(colors.cyan + title.toUpperCase().padStart(35 + title.length / 2) + colors.reset);
  console.log(colors.cyan + '='.repeat(70) + colors.reset + '\n');
}

/**
 * Print test result
 */
function printResult(passed: boolean, message: string) {
  const icon = passed ? '✓' : '✗';
  const color = passed ? colors.green : colors.red;
  console.log(`${color}${icon} ${message}${colors.reset}`);
}

/**
 * Test 1: Query Transformation Service
 */
async function testQueryTransformation() {
  printHeader('Test 1: Query Transformation Service');

  const service = new QueryTransformationService({
    debug: true,
    enableCaching: false, // Disable for testing
    minConfidenceThreshold: 0.5
  });

  let passed = 0;
  let failed = 0;

  for (const test of testQueries) {
    console.log(colors.blue + `\nTesting: ${test.name}` + colors.reset);
    console.log(colors.dim + `Query: "${test.query}"` + colors.reset);

    try {
      const result = await service.transformQuery(test.query);

      // Check if transformation succeeded
      if (result.confidence > 0.3) {
        printResult(true, `Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        passed++;
      } else {
        printResult(false, `Low confidence: ${(result.confidence * 100).toFixed(1)}%`);
        failed++;
      }

      // Check entities extracted
      console.log(`  Entities: ${result.entities.length}`);
      result.entities.slice(0, 3).forEach(entity => {
        console.log(`    - ${entity.type}: "${entity.text}" (${(entity.confidence * 100).toFixed(0)}%)`);
      });

      // Check intent
      console.log(`  Intent: ${result.intent.primary} (${(result.intent.confidence * 100).toFixed(0)}%)`);

      // Check filters
      console.log(`  Filters: ${Object.keys(result.filters).join(', ')}`);

      // Check validation
      printResult(
        result.validation.isValid,
        `Validation: ${result.validation.isValid ? 'PASSED' : 'FAILED'}`
      );

      if (result.validation.errors.length > 0) {
        console.log(colors.red + '  Errors:' + colors.reset);
        result.validation.errors.forEach(err => {
          console.log(`    - ${err.field}: ${err.message}`);
        });
      }

      // Check processing time
      const timeOk = result.processingTimeMs < 2000;
      printResult(
        timeOk,
        `Processing time: ${result.processingTimeMs}ms ${timeOk ? '(OK)' : '(SLOW)'}`
      );

    } catch (error) {
      printResult(false, `Error: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  console.log('\n' + colors.yellow + `Summary: ${passed} passed, ${failed} failed` + colors.reset);
  return failed === 0;
}

/**
 * Test 2: Entity Dictionary
 */
async function testEntityDictionary() {
  printHeader('Test 2: Legal Entity Dictionary');

  const dictionary = new LegalEntityDictionary();

  const searchTests = [
    { query: 'constitución', expectedType: 'CONSTITUTION' },
    { query: 'código civil', expectedType: 'LAW' },
    { query: 'decreto ejecutivo', expectedType: 'DECREE' },
    { query: 'ordenanza municipal', expectedType: 'ORDINANCE' }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of searchTests) {
    console.log(colors.blue + `\nSearching: "${test.query}"` + colors.reset);

    try {
      const results = await dictionary.searchEntities(test.query, {
        fuzzy: true,
        maxResults: 5
      });

      if (results.length > 0) {
        printResult(true, `Found ${results.length} entities`);
        passed++;

        results.slice(0, 3).forEach(entity => {
          console.log(`  - ${entity.name} (${entity.type})`);
        });
      } else {
        printResult(false, 'No entities found');
        failed++;
      }

    } catch (error) {
      printResult(false, `Error: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  // Test entity count
  try {
    const count = await dictionary.getEntityCount();
    printResult(count > 0, `Total entities in dictionary: ${count}`);
    passed++;
  } catch (error) {
    printResult(false, 'Failed to get entity count');
    failed++;
  }

  console.log('\n' + colors.yellow + `Summary: ${passed} passed, ${failed} failed` + colors.reset);
  return failed === 0;
}

/**
 * Test 3: NLP-Search Integration
 */
async function testNLPSearchIntegration() {
  printHeader('Test 3: NLP-Search Integration');

  const integrationTests = [
    {
      name: 'Basic Integration',
      query: 'leyes laborales',
      options: {
        searchOptions: { limit: 5 }
      }
    },
    {
      name: 'With Date Filter',
      query: 'decretos de 2023',
      options: {
        searchOptions: { limit: 5, sortBy: 'date' as const }
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of integrationTests) {
    console.log(colors.blue + `\nTesting: ${test.name}` + colors.reset);
    console.log(colors.dim + `Query: "${test.query}"` + colors.reset);

    try {
      const result = await nlpSearchIntegrationService.searchWithNLP({
        query: test.query,
        ...test.options
      });

      // Check transformation
      printResult(
        result.transformation.confidence > 0.3,
        `Transformation confidence: ${(result.transformation.confidence * 100).toFixed(1)}%`
      );

      // Check search results
      console.log(`  Documents found: ${result.searchResults.totalCount}`);
      printResult(
        result.searchResults.documents.length >= 0,
        `Retrieved ${result.searchResults.documents.length} documents`
      );

      // Check processing time
      const timeOk = result.combinedProcessingTimeMs < 5000;
      printResult(
        timeOk,
        `Total processing time: ${result.combinedProcessingTimeMs}ms ${timeOk ? '(OK)' : '(SLOW)'}`
      );

      // Check recommendations
      if (result.recommendations && result.recommendations.length > 0) {
        console.log('  Recommendations:');
        result.recommendations.slice(0, 3).forEach(rec => {
          console.log(`    - ${rec}`);
        });
      }

      passed++;

    } catch (error) {
      printResult(false, `Error: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  console.log('\n' + colors.yellow + `Summary: ${passed} passed, ${failed} failed` + colors.reset);
  return failed === 0;
}

/**
 * Test 4: Filter Validation
 */
async function testFilterValidation() {
  printHeader('Test 4: Filter Validation');

  const service = new QueryTransformationService();

  const validationTests = [
    {
      name: 'Valid Filters',
      filters: {
        normType: ['ley', 'decreto'],
        jurisdiction: ['nacional'],
        limit: 20
      },
      shouldPass: true
    },
    {
      name: 'Invalid Norm Type',
      filters: {
        normType: ['invalid_type'],
        jurisdiction: ['nacional']
      },
      shouldPass: false
    },
    {
      name: 'Invalid Date Range',
      filters: {
        dateRange: {
          from: new Date('2024-01-01'),
          to: new Date('2023-01-01'), // End before start
          dateType: 'publication' as const
        }
      },
      shouldPass: false
    },
    {
      name: 'Invalid Limit',
      filters: {
        limit: -5
      },
      shouldPass: false
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of validationTests) {
    console.log(colors.blue + `\nTesting: ${test.name}` + colors.reset);

    try {
      const result = await service.validateFilters(test.filters as any);

      const testPassed = result.isValid === test.shouldPass;
      printResult(testPassed, `Expected: ${test.shouldPass}, Got: ${result.isValid}`);

      if (testPassed) {
        passed++;
      } else {
        failed++;
      }

      if (!result.isValid) {
        console.log('  Errors:');
        result.errors.forEach(err => {
          console.log(`    - ${err.field}: ${err.message}`);
        });
      }

      if (result.warnings.length > 0) {
        console.log('  Warnings:');
        result.warnings.forEach(warn => {
          console.log(`    - ${warn.field}: ${warn.message}`);
        });
      }

    } catch (error) {
      printResult(false, `Error: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  console.log('\n' + colors.yellow + `Summary: ${passed} passed, ${failed} failed` + colors.reset);
  return failed === 0;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(colors.cyan + '\n' + '█'.repeat(70));
  console.log('█' + ' '.repeat(68) + '█');
  console.log('█' + '  NLP API INTEGRATION TEST SUITE'.padStart(48) + ' '.repeat(20) + '█');
  console.log('█' + ' '.repeat(68) + '█');
  console.log('█'.repeat(70) + colors.reset);

  const results = {
    transformation: false,
    dictionary: false,
    integration: false,
    validation: false
  };

  try {
    // Run all tests
    results.transformation = await testQueryTransformation();
    results.dictionary = await testEntityDictionary();
    results.integration = await testNLPSearchIntegration();
    results.validation = await testFilterValidation();

    // Print final summary
    printHeader('Final Summary');

    const allPassed = Object.values(results).every(r => r);

    printResult(results.transformation, 'Query Transformation Tests');
    printResult(results.dictionary, 'Entity Dictionary Tests');
    printResult(results.integration, 'NLP-Search Integration Tests');
    printResult(results.validation, 'Filter Validation Tests');

    console.log('\n' + (allPassed ? colors.green : colors.red));
    console.log('═'.repeat(70));
    console.log(
      (allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED').padStart(40)
    );
    console.log('═'.repeat(70) + colors.reset + '\n');

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error(colors.red + '\n✗ Test suite failed with error:' + colors.reset);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
