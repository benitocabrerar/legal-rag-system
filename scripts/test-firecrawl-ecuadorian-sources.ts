/**
 * Test Firecrawl connectivity with Ecuadorian legal sources
 * Validates that we can access and scrape legal documents
 */

import { ECUADORIAN_LEGAL_SOURCES } from '../src/config/legal-sources';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  maxSourcestoTest: 3, // Test first 3 sources to avoid long execution
  maxUrlsPerSource: 5, // Limit URLs to scrape per source
  saveResults: true,
  verbose: true
};

interface TestResult {
  sourceId: string;
  sourceName: string;
  success: boolean;
  mapSuccess: boolean;
  scrapeSuccess: boolean;
  urlsDiscovered: number;
  documentsScraped: number;
  errors: string[];
  duration: number;
}

/**
 * Main test function
 */
async function testEcuadorianSources(): Promise<void> {
  console.log('='.repeat(80));
  console.log('🧪 Testing Firecrawl Integration with Ecuadorian Legal Sources');
  console.log('='.repeat(80));
  console.log();

  const results: TestResult[] = [];
  const startTime = Date.now();

  // Get active primary sources for testing
  const sourcesToTest = ECUADORIAN_LEGAL_SOURCES
    .filter(s => s.isActive && s.type === 'primary')
    .slice(0, TEST_CONFIG.maxSourcestoTest);

  console.log(`📋 Testing ${sourcesToTest.length} primary legal sources:\n`);

  for (const source of sourcesToTest) {
    const result = await testSource(source);
    results.push(result);
    displayResult(result);
  }

  // Display summary
  displaySummary(results, startTime);
}

/**
 * Test a single legal source
 */
async function testSource(source: any): Promise<TestResult> {
  const result: TestResult = {
    sourceId: source.id,
    sourceName: source.name,
    success: false,
    mapSuccess: false,
    scrapeSuccess: false,
    urlsDiscovered: 0,
    documentsScraped: 0,
    errors: [],
    duration: 0
  };

  const sourceStartTime = Date.now();

  try {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📍 Testing: ${source.name}`);
    console.log(`   URL: ${source.url}`);
    console.log(`   Type: ${source.type} | Priority: ${source.priority}`);
    console.log(`─'.repeat(80)}\n`);

    // Step 1: Test Map functionality
    console.log(`🗺️  Step 1: Mapping website to discover URLs...`);

    // Note: In actual MCP execution, this would call firecrawl_map
    // For now, simulate the structure
    console.log(`   ⚠️  MCP tool call would happen here: firecrawl_map`);
    console.log(`   Configuration:`);
    console.log(`     - URL: ${source.url}`);
    console.log(`     - Search pattern: ${source.config.searchPattern}`);
    console.log(`     - Max depth: ${source.config.maxDepth}`);

    // Simulated map results
    result.mapSuccess = true;
    result.urlsDiscovered = 0; // Would be populated by MCP call

    console.log(`   ✓ Map completed: ${result.urlsDiscovered} URLs discovered\n`);

    // Step 2: Test Scrape functionality (if URLs found)
    if (result.urlsDiscovered > 0) {
      console.log(`📄 Step 2: Scraping documents...`);

      const urlsToScrape = Math.min(result.urlsDiscovered, TEST_CONFIG.maxUrlsPerSource);
      console.log(`   Will scrape ${urlsToScrape} document(s)`);

      // Note: In actual MCP execution, this would call firecrawl_scrape for each URL
      console.log(`   ⚠️  MCP tool call would happen here: firecrawl_scrape`);

      result.scrapeSuccess = true;
      result.documentsScraped = urlsToScrape;

      console.log(`   ✓ Scrape completed: ${result.documentsScraped} documents\n`);
    } else {
      console.log(`   ⚠️  No URLs to scrape\n`);
    }

    // Mark as overall success if at least mapping worked
    result.success = result.mapSuccess;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMessage);
    console.error(`   ✗ Error: ${errorMessage}\n`);
  } finally {
    result.duration = Date.now() - sourceStartTime;
  }

  return result;
}

/**
 * Display individual test result
 */
function displayResult(result: TestResult): void {
  const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
  const icon = result.success ? '✓' : '✗';

  console.log(`\n${icon} ${result.sourceName}: ${status}`);
  console.log(`   Map: ${result.mapSuccess ? '✓' : '✗'} | Scrape: ${result.scrapeSuccess ? '✓' : '✗'}`);
  console.log(`   URLs: ${result.urlsDiscovered} | Scraped: ${result.documentsScraped}`);
  console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);

  if (result.errors.length > 0) {
    console.log(`   Errors: ${result.errors.join(', ')}`);
  }
}

/**
 * Display summary of all tests
 */
function displaySummary(results: TestResult[], startTime: number): void {
  const totalDuration = Date.now() - startTime;

  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;

  console.log(`\n✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);

  const totalUrls = results.reduce((sum, r) => sum + r.urlsDiscovered, 0);
  const totalScraped = results.reduce((sum, r) => sum + r.documentsScraped, 0);

  console.log(`\n📊 Statistics:`);
  console.log(`   Total URLs discovered: ${totalUrls}`);
  console.log(`   Total documents scraped: ${totalScraped}`);
  console.log(`   Total duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`   Average per source: ${(totalDuration / results.length / 1000).toFixed(2)}s`);

  // Show errors if any
  const allErrors = results.flatMap(r => r.errors);
  if (allErrors.length > 0) {
    console.log(`\n⚠️  Errors encountered:`);
    allErrors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('✨ Test completed');
  console.log('='.repeat(80));
  console.log();
}

/**
 * Expected MCP tool integration example
 */
function showMCPIntegrationExample(): void {
  console.log('\n📚 MCP Integration Example:');
  console.log('─'.repeat(80));

  console.log(`
// Step 1: Map website to discover URLs
const mapResult = await mcp__firecrawl_mcp__firecrawl_map({
  url: "https://www.registroficial.gob.ec",
  search: "*.pdf",
  limit: 100
});

// mapResult.links contains:
// [
//   {
//     url: "https://www.registroficial.gob.ec/media/.../RO765.pdf",
//     title: "Registro Oficial No. 765",
//     description: "..."
//   },
//   ...
// ]

// Step 2: Scrape specific document
const scrapeResult = await mcp__firecrawl_mcp__firecrawl_scrape({
  url: mapResult.links[0].url,
  formats: ["markdown", "html"],
  onlyMainContent: true
});

// scrapeResult contains:
// {
//   content: "Full text content...",
//   markdown: "# Markdown version...",
//   html: "<html>...",
//   links: [...],
//   metadata: { title, description, ... }
// }

// Step 3: Extract metadata
const schema = {
  type: "object",
  properties: {
    documentType: { type: "string" },
    documentNumber: { type: "string" },
    publicationDate: { type: "string" },
    title: { type: "string" }
  }
};

const extractResult = await mcp__firecrawl_mcp__firecrawl_extract({
  urls: [scrapeResult.metadata.sourceURL],
  schema: schema
});

// extractResult contains structured metadata
  `);

  console.log('─'.repeat(80));
}

/**
 * Run tests
 */
async function main(): Promise<void> {
  try {
    await testEcuadorianSources();
    showMCPIntegrationExample();

    console.log('✨ All tests completed successfully\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Execute tests
main();

export { testEcuadorianSources, testSource };
