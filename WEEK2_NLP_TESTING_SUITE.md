# Week 2: NLP Query Transformation Testing Suite

**Phase 10 - Week 2: Comprehensive Testing & Validation**

---

## 📋 Executive Summary

This document describes the comprehensive testing suite for validating the NLP Query Transformation system in the Legal RAG platform. The suite includes 120+ annotated test queries, performance benchmarking, accuracy validation, and detailed reporting capabilities.

**Status:** ✅ **COMPLETE**
**Version:** 1.0
**Date:** January 2025
**Testing Framework:** pytest + asyncio

---

## 🎯 Testing Objectives

### Primary Goals

1. **Query-to-Filter Transformation Accuracy**
   - Validate 120+ sample queries in Spanish
   - Measure accuracy: expected vs actual filters
   - Target: **95% accuracy**

2. **Legal Entity Extraction**
   - Test extraction of laws, articles, codes, institutions
   - Handle variations: "Art. 123", "Artículo 123", "Art 123"
   - Test Ecuadorian-specific entities
   - Target: **90% precision**

3. **Performance Testing**
   - Measure response times for transformation
   - Target: **<2 seconds** end-to-end
   - Load testing: concurrent queries
   - Identify bottlenecks

4. **Integration Testing**
   - Test integration with Advanced Search (Phase 9)
   - Verify end-to-end NL query → search results flow
   - Test error handling

---

## 📦 Test Suite Components

### 1. Test Data Files

#### `test_data_queries.json`
- **Queries:** Q001-Q050 (50 queries)
- **Categories:**
  - Simple search (15 queries)
  - Article lookup (12 queries)
  - Date-based (8 queries)
  - Jurisdiction-based (5 queries)
  - Comparative (3 queries)
  - Entity extraction (4 queries)
  - Edge cases (3 queries)

#### `test_data_queries_extended.json`
- **Queries:** Q051-Q120 (70 queries)
- **Additional coverage:**
  - Complex filters (12 queries)
  - More edge cases (8 queries)
  - Comprehensive entity extraction (10 queries)
  - Mixed category queries (40 queries)

#### Total Test Coverage
```
Total queries: 120
Categories: 8
Difficulty levels: 3 (easy, medium, hard)
Language: Spanish (Ecuadorian legal context)
```

### 2. Python Test Scripts

#### `test_query_transformation.py`
**Main test suite with:**
- `TestDataLoader`: Load and manage test query data
- `QueryTransformationValidator`: Validate transformation results
- `NLPQueryTransformationTests`: Main test execution class

**Features:**
- Async test execution
- Detailed validation logic
- Multiple report formats (HTML, JSON, CSV)
- Statistical analysis
- pytest integration

**Key Classes:**

```python
class NLPQueryTransformationTests:
    """Main test suite for NLP query transformation"""

    async def run_single_query_test(test_case) -> Dict
    async def run_all_tests() -> Dict
    def generate_detailed_report(output_format)
    def _calculate_statistics() -> Dict
```

#### `test_performance.py`
**Performance testing suite with:**
- Load testing
- Stress testing
- Spike testing
- Soak/endurance testing

**Features:**
- Concurrent user simulation
- Throughput measurement
- Response time percentiles (P50, P95, P99)
- Error rate tracking
- Performance degradation detection

**Key Classes:**

```python
class PerformanceTestSuite:
    """Performance testing suite"""

    async def run_load_test(concurrent_users, duration)
    async def run_stress_test(max_concurrent, step)
    async def run_spike_test(normal_load, spike_load)
    async def run_soak_test(duration_minutes)
```

---

## 🧪 Test Data Structure

### Query Test Case Format

```json
{
  "id": "Q001",
  "category": "simple_search",
  "query": "¿Cuáles son los derechos fundamentales en Ecuador?",
  "expected_output": {
    "intent": "search",
    "query_terms": ["derechos fundamentales"],
    "filters": {
      "normType": ["CONSTITUCION"],
      "legalHierarchy": ["CONSTITUCION"]
    },
    "confidence_min": 0.85,
    "article_search": false
  },
  "difficulty": "easy"
}
```

### Test Categories

#### 1. Simple Search (`simple_search`)
**Count:** 22 queries
**Examples:**
- "¿Cuáles son los derechos fundamentales en Ecuador?"
- "Derechos de los trabajadores en Ecuador"
- "Ley de Protección al Consumidor"

**Validates:**
- Basic query term extraction
- Document type identification
- Legal hierarchy mapping

#### 2. Article Lookup (`article_lookup`)
**Count:** 25 queries
**Examples:**
- "Artículo 234 del Código Civil"
- "Art. 123 COIP"
- "Arts. 150 al 155 del COIP"

**Validates:**
- Article number extraction
- Article range parsing
- Document name variations
- Format variations (Art., Artículo, Art)

#### 3. Date-Based Queries (`date_based`)
**Count:** 18 queries
**Examples:**
- "Leyes sobre medio ambiente publicadas en 2023"
- "Reformas al COIP entre 2020 y 2023"
- "Decretos ejecutivos emitidos en enero de 2024"

**Validates:**
- Date extraction and parsing
- Date range handling
- Relative dates ("últimos 5 años")
- Period specifications (trimestre, año)

#### 4. Jurisdiction-Based (`jurisdiction_based`)
**Count:** 14 queries
**Examples:**
- "Jurisprudencia de la Corte Constitucional"
- "Sentencias de la Corte Nacional de Justicia"
- "Resoluciones del Consejo de la Judicatura"

**Validates:**
- Institution identification
- Jurisdiction extraction
- Document type mapping

#### 5. Comparative Queries (`comparative`)
**Count:** 10 queries
**Examples:**
- "Comparar Código Civil con Código de Comercio"
- "Diferencias entre Constitución 1998 y 2008"
- "Evolución de la regulación sobre adopción desde 1990"

**Validates:**
- Comparison intent detection
- Multiple document identification
- Topic extraction for comparison

#### 6. Complex Filters (`complex_filters`)
**Count:** 15 queries
**Examples:**
- "Leyes orgánicas sobre protección de datos publicadas después del 2015"
- "Sentencias de segunda instancia sobre delitos sexuales en Pichincha"
- "Códigos orgánicos que regulan el sector financiero"

**Validates:**
- Multiple filter combination
- Hierarchical filtering
- Status filtering (vigente, derogada)

#### 7. Entity Extraction (`entity_extraction`)
**Count:** 12 queries
**Examples:**
- "¿Qué establece la Constitución 2008 sobre educación?"
- "Normativa del IESS sobre jubilación"
- "Acuerdos del SRI sobre facturación electrónica"

**Validates:**
- Legal entity recognition
- Institution name extraction
- Topic identification
- Document reference extraction

#### 8. Edge Cases (`edge_cases`)
**Count:** 4 queries
**Examples:**
- "Art 123" (incomplete query)
- "Leyes" (too broad)
- "Art" (minimal input)
- "¿Qué es?" (no context)

**Validates:**
- Error handling
- Graceful degradation
- Low confidence detection
- Incomplete query handling

---

## 📊 Validation Logic

### 1. Intent Classification Validation

```python
def validate_intent(expected: str, actual: str) -> bool:
    """Exact match for intent"""
    return expected == actual
```

**Intent Types:**
- `search`: General search query
- `question`: Question-answering query
- `compare`: Comparison query
- `article_lookup`: Specific article lookup

### 2. Filter Validation

```python
def validate_filters(expected: Dict, actual: Dict) -> Tuple[bool, float]:
    """
    Validates filters with similarity scoring
    Returns: (is_valid, similarity_score)

    Scoring:
    - Key matching: Common keys / Expected keys
    - Value matching: Matching values / Total keys
    - Combined score: (Key score + Value score) / 2
    - Valid if score >= 0.80
    """
```

**Filter Types:**
- `normType`: Document type (COIP, CONSTITUCION, etc.)
- `legalHierarchy`: Legal hierarchy level
- `publicationDate`: Publication date filters
- `articleNumber`: Article number or range
- `jurisdiction`: Court or institution
- `status`: Document status (VIGENTE, DEROGADA)

### 3. Confidence Validation

```python
def validate_confidence(expected_min: float, actual: float) -> bool:
    """Validates confidence meets minimum threshold"""
    return actual >= expected_min
```

**Confidence Thresholds:**
- Easy queries: ≥ 0.90
- Medium queries: ≥ 0.85
- Hard queries: ≥ 0.70

### 4. Entity Extraction Validation

```python
def validate_entities(expected: Dict, actual: Dict) -> Tuple[bool, float]:
    """
    Validates extracted entities with fuzzy matching
    Returns: (is_valid, precision_score)

    - Fuzzy string matching for flexibility
    - Precision = Matches / Total expected
    - Valid if precision >= 0.80
    """
```

**Entity Types:**
- `document`: Document name
- `institution`: Government institution
- `topic`: Legal topic/subject
- `articleRef`: Article reference

---

## 🚀 Running the Tests

### Prerequisites

```bash
# Install dependencies
pip install pytest pytest-asyncio

# Ensure test data files are in place
ls tests/nlp/test_data_queries.json
ls tests/nlp/test_data_queries_extended.json
```

### Run All Tests

```bash
# Run complete test suite
cd tests/nlp
python test_query_transformation.py

# Run with pytest
pytest test_query_transformation.py -v
```

### Run Specific Test Categories

```bash
# Run only simple search tests
pytest test_query_transformation.py::test_simple_search_queries -v

# Run only article lookup tests
pytest test_query_transformation.py::test_article_lookup_queries -v

# Run only performance tests
pytest test_query_transformation.py::test_response_time_performance -v
```

### Run Performance Tests

```bash
# Run all performance tests
python test_performance.py

# Load test only (quick)
python -c "
import asyncio
from test_performance import PerformanceTestSuite, SAMPLE_QUERIES

async def main():
    suite = PerformanceTestSuite()
    await suite.run_load_test(SAMPLE_QUERIES, concurrent_users=50, duration_seconds=60)

asyncio.run(main())
"
```

---

## 📈 Test Reports

### Generated Reports

The test suite generates three report formats:

#### 1. HTML Report
**File:** `reports/test_report_{timestamp}.html`

**Contents:**
- Interactive dashboard with statistics
- Visual charts and graphs
- Category breakdown tables
- Failed test details
- Slowest queries analysis
- Actionable recommendations

**Features:**
- Responsive design
- Color-coded results (pass/fail)
- Progress bars
- Difficulty badges
- Filter by category/difficulty

#### 2. JSON Report
**File:** `reports/test_report_{timestamp}.json`

**Contents:**
```json
{
  "metadata": {
    "timestamp": "2025-01-13T10:30:00",
    "total_queries": 120,
    "target_accuracy": 0.95,
    "target_response_time": 2.0
  },
  "summary": {
    "total_queries": 120,
    "passed": 115,
    "failed": 5,
    "accuracy": 0.958,
    "response_time": {...},
    "by_category": {...},
    "by_difficulty": {...}
  },
  "test_results": [...]
}
```

#### 3. CSV Report
**File:** `reports/test_report_{timestamp}.csv`

**Columns:**
- query_id
- query
- category
- difficulty
- passed
- response_time_ms
- filter_score
- error

**Use Cases:**
- Excel analysis
- Database import
- Custom visualization

---

## 📊 Success Metrics

### Target Metrics

| Metric | Target | Priority |
|--------|--------|----------|
| Overall Accuracy | ≥ 95% | HIGH |
| Simple Search Accuracy | ≥ 90% | HIGH |
| Article Lookup Accuracy | ≥ 95% | HIGH |
| Entity Extraction Precision | ≥ 90% | HIGH |
| Mean Response Time | ≤ 2.0s | HIGH |
| P95 Response Time | ≤ 3.0s | MEDIUM |
| P99 Response Time | ≤ 5.0s | MEDIUM |
| Error Rate | ≤ 1% | HIGH |
| Load Test (50 users) | No degradation | MEDIUM |
| Throughput | ≥ 25 req/s | MEDIUM |

### Acceptance Criteria

✅ **PASS Criteria:**
- Overall accuracy ≥ 95%
- All category accuracies ≥ 85%
- Mean response time ≤ 2.0s
- Error rate ≤ 1%
- No critical failures in edge cases

⚠️ **WARNING Criteria:**
- Overall accuracy 90-94%
- Any category accuracy 80-84%
- Mean response time 2.0-3.0s
- Error rate 1-5%

❌ **FAIL Criteria:**
- Overall accuracy < 90%
- Any category accuracy < 80%
- Mean response time > 3.0s
- Error rate > 5%
- Critical failures in article lookup

---

## 🔧 Integration with CI/CD

### GitHub Actions Integration

```yaml
# .github/workflows/nlp-tests.yml
name: NLP Query Transformation Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: |
        pip install pytest pytest-asyncio

    - name: Run NLP tests
      run: |
        cd tests/nlp
        pytest test_query_transformation.py -v --html=report.html

    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: tests/nlp/reports/

    - name: Check accuracy threshold
      run: |
        python -c "
        import json
        with open('tests/nlp/reports/test_report_latest.json') as f:
            data = json.load(f)
            if data['summary']['accuracy'] < 0.95:
                raise ValueError('Accuracy below 95% threshold')
        "
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running NLP query transformation tests..."

cd tests/nlp
python test_query_transformation.py

if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Commit aborted."
    exit 1
fi

echo "✅ Tests passed. Proceeding with commit."
exit 0
```

---

## 🐛 Troubleshooting

### Common Issues

#### Issue 1: Import Errors
**Problem:** `ModuleNotFoundError: No module named 'pytest'`

**Solution:**
```bash
pip install pytest pytest-asyncio
```

#### Issue 2: Test Data Not Found
**Problem:** `FileNotFoundError: test_data_queries.json`

**Solution:**
```bash
# Ensure you're in the correct directory
cd tests/nlp

# Or use absolute paths in the script
```

#### Issue 3: Low Accuracy Results
**Problem:** Overall accuracy < 95%

**Solution:**
1. Review failed test cases in HTML report
2. Check if NLP service is properly configured
3. Verify OpenAI API key is valid
4. Check for specific category failures
5. Review entity extraction logic

#### Issue 4: Slow Performance
**Problem:** Response times > 2 seconds

**Solution:**
1. Check OpenAI API rate limits
2. Implement caching for common queries
3. Optimize prompt engineering
4. Review database query performance
5. Consider using smaller GPT model for testing

---

## 📚 Test Query Examples

### Easy Queries (Expected Accuracy: ≥ 95%)

```python
# Q002: Article lookup
"Artículo 234 del Código Civil"
→ {
    "intent": "article_lookup",
    "filters": {"normType": ["CODIGO_CIVIL"], "articleNumber": "234"},
    "article_search": true
}

# Q010: Simple search
"Derechos de los trabajadores en Ecuador"
→ {
    "intent": "search",
    "query_terms": ["derechos trabajadores"],
    "filters": {"normType": ["CODIGO_TRABAJO", "CONSTITUCION"]}
}
```

### Medium Queries (Expected Accuracy: ≥ 90%)

```python
# Q011: Date-based with entity
"Reformas al COIP entre 2020 y 2023"
→ {
    "intent": "search",
    "query_terms": ["reformas", "COIP"],
    "filters": {
        "normType": ["COIP"],
        "publicationDateFrom": "2020-01-01",
        "publicationDateTo": "2023-12-31",
        "documentType": ["REFORMA"]
    }
}

# Q016: Jurisdiction-based
"Sentencias de la Corte Nacional de Justicia sobre responsabilidad civil"
→ {
    "intent": "search",
    "query_terms": ["responsabilidad civil"],
    "filters": {
        "jurisdiction": "CORTE_NACIONAL_JUSTICIA",
        "documentType": ["SENTENCIA"]
    }
}
```

### Hard Queries (Expected Accuracy: ≥ 85%)

```python
# Q023: Complex filters
"Acuerdos ministeriales del Ministerio de Salud sobre COVID-19 en 2020"
→ {
    "intent": "search",
    "query_terms": ["COVID-19"],
    "filters": {
        "documentType": ["ACUERDO_MINISTERIAL"],
        "institution": "MINISTERIO_SALUD",
        "publicationYear": 2020
    }
}

# Q093: Comparative with temporal aspect
"Diferencias entre Constitución 1998 y 2008 sobre estructura del Estado"
→ {
    "intent": "compare",
    "query_terms": ["estructura Estado"],
    "filters": {"normType": ["CONSTITUCION"], "publicationYear": [1998, 2008]},
    "comparison": {
        "documents": ["CONSTITUCION_1998", "CONSTITUCION_2008"],
        "topic": "estructura del Estado"
    }
}
```

### Edge Cases (Expected Accuracy: ≥ 70%)

```python
# Q031: Incomplete query
"Art 123"
→ {
    "intent": "article_lookup",
    "filters": {"articleNumber": "123"},
    "confidence": 0.60,  # Low confidence
    "notes": "Missing document name"
}

# Q103: Minimal input
"Art"
→ {
    "intent": "article_lookup",
    "confidence": 0.40,  # Very low
    "notes": "Incomplete query - needs article number and document"
}
```

---

## 📈 Performance Testing Details

### Load Testing

**Purpose:** Validate system behavior under sustained load

**Configuration:**
```python
await suite.run_load_test(
    queries=SAMPLE_QUERIES,
    concurrent_users=50,
    duration_seconds=60
)
```

**Metrics Tracked:**
- Mean response time
- Median response time
- P95/P99 response times
- Requests per second
- Error rate
- Success rate

**Success Criteria:**
- Mean response time ≤ 2.0s
- Error rate ≤ 1%
- Throughput ≥ 25 req/s

### Stress Testing

**Purpose:** Find system breaking point

**Configuration:**
```python
await suite.run_stress_test(
    queries=SAMPLE_QUERIES,
    max_concurrent=100,
    step=10,
    step_duration=30
)
```

**Progression:**
- 10 users → 20 users → ... → 100 users
- 30 seconds per step
- Stop if error rate > 10%

**Metrics Tracked:**
- Response time degradation
- Error rate increase
- Breaking point identification
- Recovery behavior

### Spike Testing

**Purpose:** Validate behavior under sudden traffic spike

**Configuration:**
```python
await suite.run_spike_test(
    queries=SAMPLE_QUERIES,
    normal_load=10,
    spike_load=100,
    spike_duration=10
)
```

**Phases:**
1. Normal load (30s)
2. Spike (10s)
3. Recovery (30s)

**Metrics Tracked:**
- Spike response time
- Recovery time
- Error rate during spike
- System stability after recovery

### Soak Testing

**Purpose:** Validate long-term stability

**Configuration:**
```python
await suite.run_soak_test(
    queries=SAMPLE_QUERIES,
    concurrent_users=20,
    duration_minutes=60
)
```

**Metrics Tracked:**
- Memory leaks
- Performance degradation over time
- Resource utilization trends
- Error rate stability

---

## 🎓 Best Practices

### 1. Test Data Management

✅ **DO:**
- Keep test queries diverse
- Include real-world examples
- Update queries based on failures
- Add edge cases discovered in production

❌ **DON'T:**
- Hardcode expected responses in production code
- Use production API keys in tests
- Skip validation of edge cases
- Ignore failed tests

### 2. Performance Testing

✅ **DO:**
- Run performance tests regularly
- Monitor trends over time
- Test with realistic query patterns
- Use production-like environment

❌ **DON'T:**
- Only test with simple queries
- Ignore slow queries
- Test only at low concurrency
- Skip load testing before deployment

### 3. Continuous Improvement

✅ **DO:**
- Review failed tests weekly
- Analyze patterns in failures
- Update test data based on production queries
- Track accuracy trends

❌ **DON'T:**
- Ignore systematic failures
- Lower accuracy thresholds without investigation
- Skip performance benchmarks
- Deploy without running tests

---

## 📞 Support & Contact

### Test Suite Maintainer
- **Team:** Poweria Legal Engineering
- **Version:** 1.0
- **Last Updated:** January 2025

### Getting Help

1. **Documentation:** This file (WEEK2_NLP_TESTING_SUITE.md)
2. **Test Data:** `tests/nlp/test_data_queries*.json`
3. **Code Examples:** `test_query_transformation.py`
4. **Performance Tests:** `test_performance.py`

### Reporting Issues

When reporting test failures:
1. Include query ID
2. Expected output
3. Actual output
4. Error messages
5. Test environment details

---

## ✅ Checklist for Week 2 Completion

- [x] Create 120+ annotated test queries
- [x] Implement query validation logic
- [x] Build test execution framework
- [x] Add performance testing suite
- [x] Generate HTML/JSON/CSV reports
- [x] Document testing procedures
- [x] Add CI/CD integration examples
- [x] Create troubleshooting guide
- [ ] Integrate with NLP service (Week 2)
- [ ] Run initial test suite (Week 2)
- [ ] Analyze and fix failures (Week 2)
- [ ] Achieve 95% accuracy target (Week 2)

---

## 📝 Appendix

### A. Query Category Distribution

| Category | Count | Percentage |
|----------|-------|------------|
| Simple Search | 22 | 18.3% |
| Article Lookup | 25 | 20.8% |
| Date-Based | 18 | 15.0% |
| Jurisdiction-Based | 14 | 11.7% |
| Comparative | 10 | 8.3% |
| Complex Filters | 15 | 12.5% |
| Entity Extraction | 12 | 10.0% |
| Edge Cases | 4 | 3.3% |
| **Total** | **120** | **100%** |

### B. Difficulty Distribution

| Difficulty | Count | Percentage |
|------------|-------|------------|
| Easy | 42 | 35.0% |
| Medium | 58 | 48.3% |
| Hard | 20 | 16.7% |
| **Total** | **120** | **100%** |

### C. Expected Accuracy by Category

| Category | Target Accuracy |
|----------|----------------|
| Article Lookup | ≥ 95% |
| Simple Search | ≥ 90% |
| Date-Based | ≥ 85% |
| Entity Extraction | ≥ 90% |
| Jurisdiction-Based | ≥ 85% |
| Complex Filters | ≥ 80% |
| Comparative | ≥ 85% |
| Edge Cases | ≥ 70% |

---

**Document Version:** 1.0
**Status:** Complete
**Next Steps:** Integration testing with actual NLP service in Week 2

---

*End of Documentation*
