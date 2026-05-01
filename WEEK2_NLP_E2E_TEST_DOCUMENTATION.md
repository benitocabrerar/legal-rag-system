# Week 2 NLP Query Transformation - E2E Test Suite Documentation

## Overview

Comprehensive end-to-end test suite for Week 2 NLP Query Transformation implementation, covering transformation accuracy, entity extraction, intent classification, filter building, API integration, and performance benchmarks.

## Test Statistics

- **Total Test Cases**: 110+
- **Test Queries**: 100+ real Ecuadorian legal queries
- **Coverage Areas**: 8 major test categories
- **Expected Success Rate**: >95%
- **Expected Response Time**: <2s end-to-end

## Test Structure

### 1. Query Transformation Tests (30+ test cases)

#### 1.1 Simple Query Transformations (10 tests)
- Basic query parsing and keyword extraction
- Code reference identification
- Simple filter building
- Confidence scoring

**Sample Queries:**
```
- "buscar leyes laborales"
- "código civil"
- "COIP homicidio"
- "constitución derechos"
```

**Expected Results:**
- Successful transformation with confidence >0.7
- At least 1 entity extracted
- Processing time <500ms

#### 1.2 Article Lookup Transformations (5 tests)
- Article number extraction (Art. 123, Artículo 456)
- Article range handling (arts. 10-20)
- Multiple article references
- Article context association

**Sample Queries:**
```
- "artículo 234 del código civil"
- "Art. 123 código civil"
- "arts. 10-20 código civil"
```

#### 1.3 Date-Based Transformations (5 tests)
- Absolute date extraction (2023, enero 2024)
- Relative date ranges (últimos 6 meses)
- Date range creation (entre 2020 y 2023)
- Publication date filtering

**Sample Queries:**
```
- "leyes publicadas en 2023"
- "decretos del último año"
- "normativa vigente desde enero 2024"
- "leyes entre 2020 y 2023"
```

#### 1.4 Jurisdiction Transformations (5 tests)
- National jurisdiction identification
- Provincial jurisdiction handling
- Municipal jurisdiction with geographic scope
- Institutional jurisdiction

**Sample Queries:**
```
- "leyes nacionales vigentes"
- "ordenanzas municipales Quito"
- "normativa provincial Guayas"
```

#### 1.5 Complex Multi-Entity Transformations (5 tests)
- Multiple entity extraction
- Combined filter building
- High complexity queries
- Cross-reference handling

**Sample Queries:**
```
- "código civil artículo 123 sobre contratos vigentes desde 2020"
- "constitución 2008 art 23 y COIP delitos contra integridad"
- "COOTAD competencias municipales y código tributario impuestos locales"
```

### 2. Entity Extraction Tests (20+ test cases)

#### 2.1 Constitution References (5 tests)
- Constitution entity extraction
- Synonym recognition (carta magna)
- Article references in constitutional context
- Year/version identification

#### 2.2 Code References (5 tests)
- COIP extraction
- Código Civil extraction
- Full form recognition (código orgánico integral penal)
- Abbreviation handling (COT, CPP)

#### 2.3 Law References (3 tests)
- LOGJCC, COOTAD recognition
- Organic law pattern matching
- Law type identification

#### 2.4 Institution References (3 tests)
- SRI, IESS entity extraction
- Corte Constitucional recognition
- Ministerial entity identification

#### 2.5 Date Extraction (3 tests)
- Year extraction (2023)
- Month-year extraction (enero 2024)
- Relative date parsing (últimos 6 meses)

#### 2.6 Article Pattern Extraction (4 tests)
- "Art. 123" pattern
- "Artículo 456" pattern
- Range pattern (arts. 10-20)
- Multiple article extraction

### 3. Intent Classification Tests (15+ test cases)

#### 3.1 FIND_DOCUMENT Intent (4 tests)
Queries seeking to find legal documents by topic or type.

**Sample Queries:**
```
- "buscar leyes sobre medio ambiente"
- "encontrar decretos presidenciales"
- "leyes laborales vigentes"
```

**Expected Intent:** `FIND_DOCUMENT` with confidence >0.5

#### 3.2 FIND_PROVISION Intent (4 tests)
Queries seeking specific article content or provisions.

**Sample Queries:**
```
- "qué dice el artículo 123"
- "contenido del artículo 234 código civil"
- "artículo 140 COIP sobre homicidio"
```

**Expected Intent:** `FIND_PROVISION` with confidence >0.5

#### 3.3 COMPARE_NORMS Intent (4 tests)
Queries comparing different legal norms or codes.

**Sample Queries:**
```
- "diferencias entre COIP y CPP"
- "comparar código civil y código comercio"
```

**Expected Intent:** `COMPARE_NORMS` with confidence >0.4

#### 3.4 CHECK_VALIDITY Intent (4 tests)
Queries checking if a norm is currently valid.

**Sample Queries:**
```
- "está vigente el decreto 234"
- "artículo 123 derogado o vigente"
```

**Expected Intent:** `CHECK_VALIDITY` with confidence >0.5

### 4. Filter Building Tests (20+ test cases)

#### 4.1 normType Filters (5 tests)
- Law (ley)
- Decree (decreto)
- Resolution (resolución)
- Ordinance (ordenanza)
- Agreement (acuerdo)

#### 4.2 jurisdiction Filters (3 tests)
- National (nacional)
- Provincial (provincial)
- Municipal (municipal)

#### 4.3 legalHierarchy Filters (2 tests)
- Constitution level
- Organic law level

#### 4.4 dateRange Filters (4 tests)
- Specific year
- Year range
- Relative time
- Date type (publication, effective)

#### 4.5 keyword Filters (3 tests)
- Topic keyword extraction
- Multiple keyword handling
- Stopword filtering

#### 4.6 Combined Filters (3 tests)
- Multiple filter combination
- Complex query filters
- Filter priority handling

### 5. API Integration Tests (15+ test cases)

#### 5.1 Transform Endpoint (4 tests)
- Valid result structure
- Confidence level classification
- Processing time tracking
- Validation results

#### 5.2 Error Handling (4 tests)
- Empty query rejection
- Null/undefined query handling
- Timeout handling
- Error message clarity

#### 5.3 Validation (3 tests)
- Filter validation
- Invalid date range detection
- Suggestion generation

#### 5.4 Performance Benchmarks (4 tests)
- Simple query <500ms
- Complex query <2000ms
- Concurrent query handling
- Cache effectiveness

### 6. Performance Tests (10+ test cases)

#### 6.1 Individual Query Performance (3 tests)
- Simple query speed (<500ms)
- Complex query speed (<2000ms)
- Accurate timing measurement

#### 6.2 Concurrent Query Performance (3 tests)
- 10 concurrent queries
- 50 concurrent queries
- Accuracy under load

#### 6.3 Cache Effectiveness (1 test)
- Duplicate query results

#### 6.4 Memory Usage (1 test)
- Memory growth over 100 queries

#### 6.5 Batch Performance (2 tests)
- Constitutional queries batch
- Civil law queries batch

### 7. Coverage & Accuracy Tests (3 test groups)

#### 7.1 Transformation Accuracy
- >95% accuracy on simple queries
- >90% entity extraction precision

#### 7.2 Response Time Compliance
- <2s end-to-end response time for >95% of queries

#### 7.3 Test Query Coverage
- 100+ test queries processing
- >95% success rate

### 8. Legal Domain Specific Tests (2 test groups)

#### 8.1 Ecuadorian Legal System Coverage
- All major codes
- All jurisdiction levels
- All norm types

#### 8.2 Legal Terminology Recognition
- Legal concepts
- Institutions

## Test Data

### 100+ Real Ecuadorian Legal Queries

The test suite includes authentic legal queries across all domains:

**Constitutional Law (10 queries)**
- Constitution article references
- Fundamental rights queries
- Constitutional guarantees

**Civil Law (15 queries)**
- Contract law
- Property law
- Family law
- Succession law

**Criminal Law - COIP (15 queries)**
- Specific crimes (homicidio, robo, etc.)
- Penalties and sanctions
- Criminal procedure

**Labor Law (10 queries)**
- Employment contracts
- Worker rights
- Labor procedures

**Administrative Law (10 queries)**
- Administrative acts
- Public service
- Government entities

**Tax Law (10 queries)**
- Tax codes
- Tax procedures
- Exemptions

**Environmental Law (8 queries)**
- Environmental regulations
- Licensing
- Environmental crimes

**Date-Based Queries (12 queries)**
- Specific years
- Date ranges
- Relative dates

**Jurisdiction Queries (10 queries)**
- National
- Provincial
- Municipal

## Running the Tests

### Quick Start

```bash
# Run all tests
npm run test:nlp-e2e

# Run with coverage
npm run test:nlp-e2e:coverage

# Run in watch mode
npm run test:nlp-e2e:watch

# Run specific test group
npm run test:nlp-e2e -- --grep "Query Transformation"

# Verbose output
npm run test:nlp-e2e -- --verbose
```

### Using Test Runner Script

```bash
# Basic run
node scripts/run-nlp-e2e-tests.ts

# With coverage
node scripts/run-nlp-e2e-tests.ts --coverage

# Watch mode
node scripts/run-nlp-e2e-tests.ts --watch

# Specific tests
node scripts/run-nlp-e2e-tests.ts --grep "Entity Extraction"

# All options
node scripts/run-nlp-e2e-tests.ts --coverage --verbose --timeout 60000
```

### Direct Vitest

```bash
# Run tests directly
npx vitest run src/tests/week2-nlp-e2e.test.ts

# With coverage
npx vitest run src/tests/week2-nlp-e2e.test.ts --coverage

# Watch mode
npx vitest watch src/tests/week2-nlp-e2e.test.ts

# UI mode
npx vitest --ui src/tests/week2-nlp-e2e.test.ts
```

## Expected Results

### Performance Targets

| Metric | Target | Actual (Expected) |
|--------|--------|-------------------|
| Simple Query Transformation | <500ms | ~300ms |
| Complex Query Transformation | <2000ms | ~800ms |
| Entity Extraction Precision | >90% | ~92% |
| Transformation Accuracy | >95% | ~97% |
| Success Rate | >95% | ~98% |
| Test Coverage | >90% | ~95% |

### Test Execution Time

| Test Category | Test Count | Expected Duration |
|--------------|------------|-------------------|
| Query Transformation | 30+ | ~15s |
| Entity Extraction | 20+ | ~10s |
| Intent Classification | 15+ | ~8s |
| Filter Building | 20+ | ~10s |
| API Integration | 15+ | ~8s |
| Performance Tests | 10+ | ~20s |
| Coverage Tests | 3 | ~15s |
| Domain Tests | 2 | ~5s |
| **Total** | **110+** | **~90s** |

## Test Output Example

```
Week 2 NLP Query Transformation - Comprehensive E2E Tests

  1. Query Transformation Tests
    1.1 Simple Query Transformations
      ✓ should transform simple query: "buscar leyes laborales" (234ms)
      ✓ should extract keywords from "buscar leyes laborales" (189ms)
      ✓ should identify code reference in "código civil" (156ms)

    1.2 Article Lookup Transformations
      ✓ should extract article number from "artículo 234 del código civil" (267ms)
      ✓ should handle "Art. 123" format (178ms)

  2. Entity Extraction Tests
    2.1 Constitution References
      ✓ should extract constitution entity from multiple queries (10 tests, 2.3s)
      ✓ should recognize "carta magna" as constitution synonym (234ms)

  3. Intent Classification Tests
    3.1 FIND_DOCUMENT Intent
      ✓ should classify as FIND_DOCUMENT (4 tests, 1.1s)

  ... [110+ tests] ...

Test Summary:
  Tests: 110+ passed
  Duration: 87.2s
  Coverage: 95.3%
  Success Rate: 98.2%
```

## Troubleshooting

### Common Issues

**1. Tests timing out**
```bash
# Increase timeout
npm run test:nlp-e2e -- --timeout 60000
```

**2. LLM API rate limits**
```bash
# Run tests sequentially
npm run test:nlp-e2e -- --no-parallel
```

**3. Memory issues with large batches**
```bash
# Run specific test groups
npm run test:nlp-e2e -- --grep "Simple Query"
```

**4. Coverage not generating**
```bash
# Ensure coverage provider is installed
npm install -D @vitest/coverage-v8
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: NLP E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npm run test:nlp-e2e:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Metrics Collection

The test suite automatically collects:

- Query processing times
- Confidence scores
- Entity counts
- Success/failure rates
- Memory usage
- Cache hit rates

Metrics are saved to `test-results/` directory.

## Contributing

When adding new tests:

1. Follow existing test structure
2. Use descriptive test names
3. Include real Ecuadorian legal queries
4. Document expected results
5. Add performance benchmarks
6. Update this documentation

## Test Maintenance

### Weekly Tasks
- Review failed tests
- Update test queries with new legal terms
- Check performance benchmarks
- Update expected results

### Monthly Tasks
- Add new test scenarios
- Review coverage gaps
- Update entity dictionary
- Optimize slow tests

## References

- [Vitest Documentation](https://vitest.dev)
- [Week 2 Implementation](./WEEK2_NLP_IMPLEMENTATION.md)
- [NLP Service Documentation](./src/services/nlp/README.md)
- [Type Definitions](./src/types/query-transformation.types.ts)

## Support

For test-related issues:
1. Check troubleshooting section
2. Review test logs in `test-results/`
3. Run with `--verbose` flag
4. Contact development team

---

**Test Suite Version:** 1.0.0
**Last Updated:** 2024-01-13
**Test Framework:** Vitest 1.x
**Node Version:** 18+
