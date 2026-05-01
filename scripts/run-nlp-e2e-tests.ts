#!/usr/bin/env node
/**
 * NLP E2E Test Runner
 * Comprehensive test runner with detailed reporting and metrics
 *
 * @module run-nlp-e2e-tests
 * @author Legal RAG System - Test Automation
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestConfig {
  testFile: string;
  coverage: boolean;
  verbose: boolean;
  timeout: number;
  parallel: boolean;
  watch: boolean;
  grep?: string;
  reporter?: 'default' | 'verbose' | 'json' | 'html';
}

class NLPTestRunner {
  private config: TestConfig;
  private startTime: number = 0;

  constructor(config: Partial<TestConfig> = {}) {
    this.config = {
      testFile: 'src/tests/week2-nlp-e2e.test.ts',
      coverage: false,
      verbose: false,
      timeout: 30000,
      parallel: false,
      watch: false,
      reporter: 'default',
      ...config
    };
  }

  /**
   * Run tests
   */
  async run(): Promise<void> {
    console.log('🚀 Starting Week 2 NLP E2E Test Suite...\n');
    this.startTime = Date.now();

    try {
      await this.setupTestEnvironment();
      await this.executeTests();
      await this.generateReports();
      this.printSummary();
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  /**
   * Setup test environment
   */
  private async setupTestEnvironment(): Promise<void> {
    console.log('📦 Setting up test environment...');

    // Check if test file exists
    if (!fs.existsSync(this.config.testFile)) {
      throw new Error(`Test file not found: ${this.config.testFile}`);
    }

    // Ensure test results directory exists
    const resultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    console.log('✅ Test environment ready\n');
  }

  /**
   * Execute tests using Vitest
   */
  private async executeTests(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🧪 Executing tests...\n');

      const args = [
        'vitest',
        'run',
        this.config.testFile
      ];

      // Add coverage if enabled
      if (this.config.coverage) {
        args.push('--coverage');
      }

      // Add verbose output
      if (this.config.verbose) {
        args.push('--reporter=verbose');
      }

      // Add grep filter if specified
      if (this.config.grep) {
        args.push('-t', this.config.grep);
      }

      // Add watch mode if enabled
      if (this.config.watch) {
        args[1] = 'watch';
      }

      // Run tests
      const testProcess = spawn('npx', args, {
        stdio: 'inherit',
        shell: true,
        cwd: process.cwd()
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Tests failed with exit code ${code}`));
        }
      });

      testProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Generate test reports
   */
  private async generateReports(): Promise<void> {
    console.log('\n📊 Generating test reports...');

    const resultsDir = path.join(process.cwd(), 'test-results');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Generate JSON report
    const jsonReport = {
      testSuite: 'Week 2 NLP E2E Tests',
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      environment: {
        node: process.version,
        platform: process.platform,
        cwd: process.cwd()
      },
      config: this.config
    };

    const jsonPath = path.join(resultsDir, `nlp-e2e-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));

    console.log(`✅ JSON report saved to: ${jsonPath}`);
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    const duration = Date.now() - this.startTime;

    console.log('\n' + '='.repeat(80));
    console.log('📈 TEST EXECUTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Test Suite: Week 2 NLP Query Transformation E2E Tests`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Configuration:`);
    console.log(`  - Test File: ${this.config.testFile}`);
    console.log(`  - Coverage: ${this.config.coverage ? 'Enabled' : 'Disabled'}`);
    console.log(`  - Verbose: ${this.config.verbose ? 'Enabled' : 'Disabled'}`);
    console.log(`  - Timeout: ${this.config.timeout}ms`);
    console.log('='.repeat(80));
    console.log('✅ Test execution completed successfully!');
    console.log('='.repeat(80) + '\n');
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): Partial<TestConfig> {
  const args = process.argv.slice(2);
  const config: Partial<TestConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--coverage':
      case '-c':
        config.coverage = true;
        break;

      case '--verbose':
      case '-v':
        config.verbose = true;
        break;

      case '--watch':
      case '-w':
        config.watch = true;
        break;

      case '--grep':
      case '-g':
        config.grep = args[++i];
        break;

      case '--timeout':
      case '-t':
        config.timeout = parseInt(args[++i], 10);
        break;

      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return config;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Week 2 NLP E2E Test Runner

Usage: node scripts/run-nlp-e2e-tests.ts [options]

Options:
  -c, --coverage     Enable code coverage reporting
  -v, --verbose      Enable verbose test output
  -w, --watch        Run tests in watch mode
  -g, --grep <pattern>  Run only tests matching pattern
  -t, --timeout <ms>    Set test timeout in milliseconds
  -h, --help         Show this help message

Examples:
  # Run all tests
  node scripts/run-nlp-e2e-tests.ts

  # Run with coverage
  node scripts/run-nlp-e2e-tests.ts --coverage

  # Run specific test group
  node scripts/run-nlp-e2e-tests.ts --grep "Query Transformation"

  # Run in watch mode
  node scripts/run-nlp-e2e-tests.ts --watch

  # Verbose output with coverage
  node scripts/run-nlp-e2e-tests.ts --verbose --coverage
  `);
}

/**
 * Main entry point
 */
async function main() {
  try {
    const config = parseArgs();
    const runner = new NLPTestRunner(config);
    await runner.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { NLPTestRunner, TestConfig };
