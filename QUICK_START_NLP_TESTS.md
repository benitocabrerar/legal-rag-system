# Quick Start: NLP E2E Tests

## 🚀 5-Minute Quick Start

### Prerequisites
```bash
# Ensure dependencies are installed
npm install

# Ensure Vitest is available
npm list vitest
```

### Run Tests Now

#### Option 1: Direct Vitest (Recommended)
```bash
# Run all NLP E2E tests
npx vitest run src/tests/week2-nlp-e2e.test.ts

# With coverage
npx vitest run src/tests/week2-nlp-e2e.test.ts --coverage

# Watch mode (for development)
npx vitest watch src/tests/week2-nlp-e2e.test.ts
```

#### Option 2: Custom Test Runner
```bash
# Basic run
tsx scripts/run-nlp-e2e-tests.ts

# With coverage
tsx scripts/run-nlp-e2e-tests.ts --coverage

# Verbose output
tsx scripts/run-nlp-e2e-tests.ts --verbose
```

#### Option 3: Package Scripts (After adding to package.json)
```bash
# Add these to package.json scripts first:
"test:nlp-e2e": "vitest run src/tests/week2-nlp-e2e.test.ts",
"test:nlp-e2e:coverage": "vitest run src/tests/week2-nlp-e2e.test.ts --coverage",
"test:nlp-e2e:watch": "vitest watch src/tests/week2-nlp-e2e.test.ts"

# Then run:
npm run test:nlp-e2e
npm run test:nlp-e2e:coverage
npm run test:nlp-e2e:watch
```

## 📊 What You'll See

### Expected Output
```
Week 2 NLP Query Transformation - Comprehensive E2E Tests

  ✓ 1. Query Transformation Tests
    ✓ 1.1 Simple Query Transformations (10 tests)
    ✓ 1.2 Article Lookup Transformations (5 tests)
    ✓ 1.3 Date-Based Transformations (5 tests)
    ✓ 1.4 Jurisdiction Transformations (5 tests)
    ✓ 1.5 Complex Multi-Entity Transformations (5 tests)
    ✓ 1.6 Edge Case Transformations (7 tests)

  ✓ 2. Entity Extraction Tests (20 tests)
  ✓ 3. Intent Classification Tests (15 tests)
  ✓ 4. Filter Building Tests (20 tests)
  ✓ 5. API Integration Tests (15 tests)
  ✓ 6. Performance Tests (10 tests)
  ✓ 7. Coverage & Accuracy Tests (3 tests)
  ✓ 8. Legal Domain Specific Tests (2 tests)

Test Files  1 passed (1)
Tests  115 passed (115)
Duration  87.4s
```

### Key Metrics
- **Total Tests:** 115+
- **Duration:** ~90 seconds
- **Success Rate:** >95%
- **Coverage:** >90%

## 🎯 Common Commands

### Development
```bash
# Watch mode - auto-run on file changes
npx vitest watch src/tests/week2-nlp-e2e.test.ts

# Interactive UI
npx vitest --ui src/tests/week2-nlp-e2e.test.ts
```

### Specific Tests
```bash
# Run only transformation tests
npx vitest run src/tests/week2-nlp-e2e.test.ts -t "Query Transformation"

# Run only entity extraction tests
npx vitest run src/tests/week2-nlp-e2e.test.ts -t "Entity Extraction"

# Run only performance tests
npx vitest run src/tests/week2-nlp-e2e.test.ts -t "Performance"
```

### Debug Mode
```bash
# Verbose output
npx vitest run src/tests/week2-nlp-e2e.test.ts --reporter=verbose

# With console logs
npx vitest run src/tests/week2-nlp-e2e.test.ts --reporter=verbose --no-coverage
```

## ⚡ Performance Tips

### Fast Run (Skip Slow Tests)
```bash
# Run only fast tests
npx vitest run src/tests/week2-nlp-e2e.test.ts -t "Simple Query"
```

### Parallel Execution
```bash
# Run tests in parallel (default)
npx vitest run src/tests/week2-nlp-e2e.test.ts

# Sequential (slower but more stable)
npx vitest run src/tests/week2-nlp-e2e.test.ts --no-threads
```

## 🐛 Troubleshooting

### Tests Timing Out
```bash
# Increase timeout
npx vitest run src/tests/week2-nlp-e2e.test.ts --testTimeout=60000
```

### Memory Issues
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npx vitest run src/tests/week2-nlp-e2e.test.ts
```

### LLM Rate Limits
```bash
# Run specific test groups sequentially
npx vitest run src/tests/week2-nlp-e2e.test.ts -t "Simple" --no-threads
```

## 📝 Test Coverage

### Generate Coverage Report
```bash
# HTML report
npx vitest run src/tests/week2-nlp-e2e.test.ts --coverage --reporter=html

# JSON report
npx vitest run src/tests/week2-nlp-e2e.test.ts --coverage --reporter=json

# Open coverage in browser
open coverage/index.html
```

### Coverage Thresholds
```json
{
  "branches": 90,
  "functions": 90,
  "lines": 90,
  "statements": 90
}
```

## 📦 File Structure

```
src/
├── tests/
│   ├── week2-nlp-e2e.test.ts          # Main test suite (110+ tests)
│   └── test-helpers/
│       └── nlp-test-utils.ts          # Test utilities
│
scripts/
└── run-nlp-e2e-tests.ts               # Custom test runner

Documentation:
├── WEEK2_NLP_E2E_TEST_DOCUMENTATION.md   # Full documentation
├── WEEK2_NLP_E2E_TEST_SUITE_SUMMARY.md   # Summary
└── QUICK_START_NLP_TESTS.md              # This file
```

## 🎓 Test Categories

1. **Query Transformation (30+ tests)** - Core transformation logic
2. **Entity Extraction (20+ tests)** - Legal entity recognition
3. **Intent Classification (15+ tests)** - Query intent detection
4. **Filter Building (20+ tests)** - Search filter generation
5. **API Integration (15+ tests)** - Endpoint testing
6. **Performance (10+ tests)** - Speed and concurrency
7. **Coverage (3 tests)** - Accuracy metrics
8. **Domain (2 tests)** - Legal domain coverage

## ✅ Success Criteria

### All Tests Should:
- ✅ Complete in <2 minutes
- ✅ Pass with >95% success rate
- ✅ Show transformation confidence >0.7
- ✅ Process queries in <2s
- ✅ Extract entities accurately

### Performance Targets:
- Simple queries: <500ms
- Complex queries: <2000ms
- Entity extraction: >90% precision
- Transformation accuracy: >95%

## 🔗 Quick Links

- **Full Documentation:** [WEEK2_NLP_E2E_TEST_DOCUMENTATION.md](./WEEK2_NLP_E2E_TEST_DOCUMENTATION.md)
- **Summary:** [WEEK2_NLP_E2E_TEST_SUITE_SUMMARY.md](./WEEK2_NLP_E2E_TEST_SUITE_SUMMARY.md)
- **Test Code:** [src/tests/week2-nlp-e2e.test.ts](./src/tests/week2-nlp-e2e.test.ts)
- **Test Utils:** [src/tests/test-helpers/nlp-test-utils.ts](./src/tests/test-helpers/nlp-test-utils.ts)

## 💡 Pro Tips

1. **Use watch mode during development** - Auto-runs tests on changes
2. **Run specific test groups** - Use `-t` flag to filter
3. **Check coverage regularly** - Aim for >90%
4. **Review failed tests immediately** - Don't let them accumulate
5. **Use verbose mode for debugging** - See detailed output

## 🆘 Need Help?

1. Check [troubleshooting section](#-troubleshooting)
2. Review full documentation
3. Run with `--reporter=verbose`
4. Check test logs in `test-results/`
5. Contact development team

---

**Ready to test?** Run this now:
```bash
npx vitest run src/tests/week2-nlp-e2e.test.ts
```

✨ **Happy Testing!**
