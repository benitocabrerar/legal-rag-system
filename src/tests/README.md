# Test Suite Documentation

## Overview

This directory contains comprehensive test suites for the Legal RAG System, with a focus on the Week 2 NLP Query Transformation implementation.

## Test Files

### Week 2 NLP E2E Tests
**File:** `week2-nlp-e2e.test.ts`

Comprehensive end-to-end test suite for NLP Query Transformation with:
- 110+ test cases
- 100+ real Ecuadorian legal queries
- 8 test categories
- Performance benchmarking
- Coverage validation

**Run:**
```bash
npx vitest run src/tests/week2-nlp-e2e.test.ts
```

### Other Test Files
- `legal-document-service.test.ts` - Document service tests
- `phase10-integration.test.ts` - Phase 10 integration tests

## Test Helpers

### NLP Test Utilities
**File:** `test-helpers/nlp-test-utils.ts`

Reusable test utilities for NLP testing:
- `TestMetricsCollector` - Metrics tracking and reporting
- Assertion helpers for validation
- Performance benchmarking utilities
- Parallel query execution helpers
- Distribution analyzers

**Usage:**
```typescript
import { TestMetricsCollector, benchmarkQuery } from './test-helpers/nlp-test-utils.js';

const collector = new TestMetricsCollector();
const metrics = await benchmarkQuery(() => someAsyncFunction(), 10);
```

## Quick Commands

### Run All Tests
```bash
# All tests in project
npm run test

# Watch mode
npm run test:watch

# UI mode
npm run test:ui
```

### Run NLP E2E Tests
```bash
# Basic run
npx vitest run src/tests/week2-nlp-e2e.test.ts

# With coverage
npx vitest run src/tests/week2-nlp-e2e.test.ts --coverage

# Watch mode
npx vitest watch src/tests/week2-nlp-e2e.test.ts

# Interactive UI
npx vitest --ui src/tests/week2-nlp-e2e.test.ts
```

### Run Specific Test Groups
```bash
# Query transformation tests
npx vitest run src/tests/week2-nlp-e2e.test.ts -t "Query Transformation"

# Entity extraction tests
npx vitest run src/tests/week2-nlp-e2e.test.ts -t "Entity Extraction"

# Performance tests
npx vitest run src/tests/week2-nlp-e2e.test.ts -t "Performance"
```

## Test Structure

```
src/tests/
├── README.md                          # This file
├── week2-nlp-e2e.test.ts             # NLP E2E test suite (110+ tests)
├── legal-document-service.test.ts    # Document service tests
├── phase10-integration.test.ts       # Phase 10 tests
└── test-helpers/
    └── nlp-test-utils.ts             # NLP test utilities
```

## Test Categories

### Week 2 NLP E2E Tests

1. **Query Transformation (30+ tests)**
   - Simple queries
   - Article lookups
   - Date-based queries
   - Jurisdiction queries
   - Complex multi-entity queries
   - Edge cases

2. **Entity Extraction (20+ tests)**
   - Constitution references
   - Code references
   - Law references
   - Institution references
   - Date extraction
   - Article patterns

3. **Intent Classification (15+ tests)**
   - FIND_DOCUMENT intent
   - FIND_PROVISION intent
   - COMPARE_NORMS intent
   - CHECK_VALIDITY intent
   - GENERAL_SEARCH intent

4. **Filter Building (20+ tests)**
   - normType filters
   - jurisdiction filters
   - legalHierarchy filters
   - dateRange filters
   - keyword filters
   - Combined filters

5. **API Integration (15+ tests)**
   - Transform endpoint
   - Error handling
   - Validation
   - Performance benchmarks

6. **Performance (10+ tests)**
   - Individual query performance
   - Concurrent queries
   - Cache effectiveness
   - Memory usage
   - Batch performance

7. **Coverage & Accuracy (3 tests)**
   - Transformation accuracy
   - Response time compliance
   - Test query coverage

8. **Legal Domain (2 tests)**
   - Ecuadorian legal system coverage
   - Legal terminology recognition

## Performance Targets

| Metric | Target |
|--------|--------|
| Simple Query Transformation | <500ms |
| Complex Query Transformation | <2000ms |
| Entity Extraction Precision | >90% |
| Transformation Accuracy | >95% |
| Test Success Rate | >95% |
| Code Coverage | >90% |

## Writing New Tests

### Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { QueryTransformationService } from '../services/nlp/query-transformation-service.js';

describe('Feature Name', () => {
  describe('Specific Functionality', () => {
    it('should do something specific', async () => {
      // Arrange
      const service = new QueryTransformationService();
      const query = 'test query';

      // Act
      const result = await service.transformQuery(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });
});
```

### Best Practices
1. Use descriptive test names
2. Follow Arrange-Act-Assert pattern
3. Test both success and failure cases
4. Include performance benchmarks
5. Use real test data
6. Add helpful assertions
7. Document expected results

## Test Data

### Sample Queries
The NLP E2E suite includes 100+ real Ecuadorian legal queries:

**Constitutional Law:**
- "Constitución 2008 artículo 23 sobre derechos humanos"
- "qué dice la carta magna sobre educación"
- "búsqueda de garantías constitucionales"

**Civil Law:**
- "código civil artículo 234 sobre contratos"
- "capacidad legal para contratar código civil"
- "régimen de bienes gananciales"

**Criminal Law:**
- "COIP artículo 140 sobre homicidio"
- "delitos contra la integridad sexual COIP"
- "robo agravado código orgánico integral penal"

**And many more across all legal domains...**

## Coverage Reports

### Generate Coverage
```bash
# HTML report
npx vitest run src/tests/week2-nlp-e2e.test.ts --coverage --reporter=html

# JSON report
npx vitest run src/tests/week2-nlp-e2e.test.ts --coverage --reporter=json

# Open in browser
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

## Debugging Tests

### Verbose Output
```bash
npx vitest run src/tests/week2-nlp-e2e.test.ts --reporter=verbose
```

### Debug Single Test
```bash
npx vitest run src/tests/week2-nlp-e2e.test.ts -t "specific test name" --reporter=verbose
```

### Check Test Logs
Test results and logs are saved to:
- `test-results/` directory
- Console output
- Coverage reports in `coverage/`

## CI/CD Integration

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:nlp-e2e:coverage
```

### GitLab CI
```yaml
test:
  script:
    - npm ci
    - npm run test:nlp-e2e:coverage
  coverage: '/Coverage: \d+\.\d+%/'
```

## Maintenance

### Weekly
- Review failed tests
- Update test queries
- Check performance metrics
- Fix flaky tests

### Monthly
- Add new test scenarios
- Review coverage gaps
- Update dependencies
- Optimize slow tests

## Resources

### Documentation
- Full documentation: `../../WEEK2_NLP_E2E_TEST_DOCUMENTATION.md`
- Quick start: `../../QUICK_START_NLP_TESTS.md`
- Summary: `../../WEEK2_NLP_E2E_TEST_SUITE_SUMMARY.md`
- Complete status: `../../TEST_SUITE_COMPLETE.md`

### Related Files
- Test runner: `../../scripts/run-nlp-e2e-tests.ts`
- Vitest config: `../../vitest.config.ts`
- Package scripts: `../../package.json`

## Support

### Common Issues
1. **Tests timeout** - Increase timeout with `--testTimeout`
2. **Memory errors** - Use `NODE_OPTIONS="--max-old-space-size=4096"`
3. **Rate limits** - Run sequentially with `--no-threads`
4. **Coverage issues** - Install `@vitest/coverage-v8`

### Getting Help
1. Check documentation files
2. Review test logs
3. Run with `--verbose` flag
4. Contact development team

## Contributing

### Adding New Tests
1. Follow existing test structure
2. Use descriptive names
3. Include real test data
4. Add performance benchmarks
5. Update documentation

### Code Review Checklist
- [ ] Tests follow naming conventions
- [ ] Assertions are clear and specific
- [ ] Performance targets met
- [ ] Documentation updated
- [ ] All tests passing

---

**Framework:** Vitest 1.x
**Node Version:** 18+
**Last Updated:** January 13, 2024
