"""
NLP Query Transformation Test Suite
===================================

Comprehensive testing suite for validating NLP-to-structured-query transformation
for Legal RAG System (Ecuadorian law context).

Test Categories:
- Query-to-Filter Transformation Accuracy
- Legal Entity Extraction
- Performance Testing
- Integration Testing

Author: Poweria Legal Team
Version: 1.0
Date: January 2025
"""

import pytest
import json
import time
import asyncio
from typing import Dict, List, Any, Tuple
from pathlib import Path
from datetime import datetime
import statistics
import csv


# Configuration
TEST_DATA_DIR = Path(__file__).parent
QUERY_FILE_1 = TEST_DATA_DIR / "test_data_queries.json"
QUERY_FILE_2 = TEST_DATA_DIR / "test_data_queries_extended.json"
REPORT_DIR = TEST_DATA_DIR / "reports"
REPORT_DIR.mkdir(exist_ok=True)

# Performance targets
TARGET_ACCURACY = 0.95  # 95% accuracy target
TARGET_RESPONSE_TIME = 2.0  # 2 seconds max
TARGET_ENTITY_PRECISION = 0.90  # 90% entity extraction precision


class TestDataLoader:
    """Load and manage test query data"""

    def __init__(self):
        self.queries = []
        self.load_test_data()

    def load_test_data(self):
        """Load all test queries from JSON files"""
        # Load first file
        with open(QUERY_FILE_1, 'r', encoding='utf-8') as f:
            data1 = json.load(f)
            self.queries.extend(data1['test_queries'])

        # Load second file
        with open(QUERY_FILE_2, 'r', encoding='utf-8') as f:
            data2 = json.load(f)
            self.queries.extend(data2['test_queries'])

        print(f"✓ Loaded {len(self.queries)} test queries")

    def get_queries_by_category(self, category: str) -> List[Dict]:
        """Get all queries for a specific category"""
        return [q for q in self.queries if q['category'] == category]

    def get_queries_by_difficulty(self, difficulty: str) -> List[Dict]:
        """Get queries filtered by difficulty"""
        return [q for q in self.queries if q['difficulty'] == difficulty]

    def get_all_queries(self) -> List[Dict]:
        """Get all test queries"""
        return self.queries


class QueryTransformationValidator:
    """Validate query transformation results"""

    @staticmethod
    def validate_intent(expected: str, actual: str) -> bool:
        """Validate intent classification"""
        return expected == actual

    @staticmethod
    def validate_filters(expected: Dict, actual: Dict) -> Tuple[bool, float]:
        """
        Validate filters match expected output
        Returns: (is_valid, similarity_score)
        """
        if not expected and not actual:
            return True, 1.0

        if not expected or not actual:
            return False, 0.0

        # Calculate similarity based on matching keys and values
        expected_keys = set(expected.keys())
        actual_keys = set(actual.keys())

        # Key matching score
        common_keys = expected_keys & actual_keys
        missing_keys = expected_keys - actual_keys
        extra_keys = actual_keys - expected_keys

        if not expected_keys:
            key_score = 1.0
        else:
            key_score = len(common_keys) / len(expected_keys)

        # Value matching score
        value_matches = 0
        value_total = len(common_keys)

        for key in common_keys:
            if expected[key] == actual[key]:
                value_matches += 1
            elif isinstance(expected[key], list) and isinstance(actual[key], list):
                # For lists, check overlap
                expected_set = set(expected[key])
                actual_set = set(actual[key])
                if expected_set & actual_set:
                    value_matches += len(expected_set & actual_set) / len(expected_set)

        if value_total > 0:
            value_score = value_matches / value_total
        else:
            value_score = 1.0

        # Combined score
        overall_score = (key_score + value_score) / 2

        # Consider valid if score >= 0.80
        is_valid = overall_score >= 0.80

        return is_valid, overall_score

    @staticmethod
    def validate_confidence(expected_min: float, actual: float) -> bool:
        """Validate confidence score meets minimum threshold"""
        return actual >= expected_min

    @staticmethod
    def validate_article_search(expected: bool, actual: bool) -> bool:
        """Validate article search flag"""
        return expected == actual

    @staticmethod
    def validate_entities(expected: Dict, actual: Dict) -> Tuple[bool, float]:
        """
        Validate extracted entities
        Returns: (is_valid, precision_score)
        """
        if not expected:
            return True, 1.0

        if not actual:
            return False, 0.0

        matches = 0
        total = len(expected)

        for key, expected_value in expected.items():
            if key in actual:
                actual_value = actual[key]
                if isinstance(expected_value, str) and isinstance(actual_value, str):
                    # Fuzzy string matching
                    if expected_value.lower() in actual_value.lower() or \
                       actual_value.lower() in expected_value.lower():
                        matches += 1
                elif expected_value == actual_value:
                    matches += 1

        precision = matches / total if total > 0 else 0.0
        is_valid = precision >= 0.80

        return is_valid, precision


class NLPQueryTransformationTests:
    """Main test suite for NLP query transformation"""

    def __init__(self, nlp_service=None):
        """
        Initialize test suite

        Args:
            nlp_service: The NLP service to test (injected dependency)
                        Should have a method: parse_query(query: str) -> Dict
        """
        self.nlp_service = nlp_service
        self.data_loader = TestDataLoader()
        self.validator = QueryTransformationValidator()
        self.results = []

    async def run_single_query_test(self, test_case: Dict) -> Dict:
        """
        Test a single query transformation

        Returns:
            Test result with validation details
        """
        query_id = test_case['id']
        query = test_case['query']
        expected = test_case['expected_output']

        # Measure response time
        start_time = time.time()

        try:
            # Call NLP service
            if self.nlp_service:
                actual = await self.nlp_service.parse_query(query)
            else:
                # Mock response for testing framework
                actual = self._mock_nlp_response(query, expected)

            response_time = time.time() - start_time

            # Validate results
            validations = {
                'intent': self.validator.validate_intent(
                    expected.get('intent', ''),
                    actual.get('intent', '')
                ),
                'filters': self.validator.validate_filters(
                    expected.get('filters', {}),
                    actual.get('filters', {})
                ),
                'confidence': self.validator.validate_confidence(
                    expected.get('confidence_min', 0.0),
                    actual.get('confidence', 0.0)
                ),
                'article_search': self.validator.validate_article_search(
                    expected.get('article_search', False),
                    actual.get('article_search', False)
                )
            }

            # Entity validation if applicable
            if 'entities' in expected:
                entities_valid, entity_precision = self.validator.validate_entities(
                    expected['entities'],
                    actual.get('entities', {})
                )
                validations['entities'] = (entities_valid, entity_precision)

            # Calculate overall pass/fail
            filters_valid, filter_score = validations['filters']

            passed = (
                validations['intent'] and
                filters_valid and
                validations['confidence'] and
                validations['article_search']
            )

            if 'entities' in validations:
                entities_valid, _ = validations['entities']
                passed = passed and entities_valid

            return {
                'query_id': query_id,
                'query': query,
                'category': test_case['category'],
                'difficulty': test_case['difficulty'],
                'passed': passed,
                'response_time': response_time,
                'validations': validations,
                'filter_score': filter_score,
                'expected': expected,
                'actual': actual,
                'error': None
            }

        except Exception as e:
            response_time = time.time() - start_time
            return {
                'query_id': query_id,
                'query': query,
                'category': test_case['category'],
                'difficulty': test_case['difficulty'],
                'passed': False,
                'response_time': response_time,
                'validations': {},
                'filter_score': 0.0,
                'expected': expected,
                'actual': {},
                'error': str(e)
            }

    def _mock_nlp_response(self, query: str, expected: Dict) -> Dict:
        """
        Mock NLP response for testing the framework itself
        Simulates realistic variations in accuracy
        """
        import random

        # Simulate 85-95% accuracy by sometimes introducing errors
        accuracy_roll = random.random()

        if accuracy_roll > 0.10:  # 90% of the time, return correct response
            return {
                'intent': expected.get('intent', 'search'),
                'query_terms': expected.get('query_terms', []),
                'filters': expected.get('filters', {}),
                'confidence': expected.get('confidence_min', 0.85) + random.uniform(0.0, 0.10),
                'article_search': expected.get('article_search', False),
                'entities': expected.get('entities', {})
            }
        else:  # 10% of the time, introduce some error
            filters = expected.get('filters', {}).copy()
            if filters and random.random() > 0.5:
                # Remove a random filter
                key = random.choice(list(filters.keys()))
                del filters[key]

            return {
                'intent': expected.get('intent', 'search'),
                'query_terms': expected.get('query_terms', []),
                'filters': filters,
                'confidence': expected.get('confidence_min', 0.85) - random.uniform(0.0, 0.10),
                'article_search': expected.get('article_search', False),
                'entities': {}
            }

    async def run_all_tests(self) -> Dict:
        """
        Run all test queries and generate comprehensive report

        Returns:
            Test results summary with statistics
        """
        queries = self.data_loader.get_all_queries()

        print(f"\n{'='*80}")
        print(f"Running NLP Query Transformation Tests")
        print(f"{'='*80}")
        print(f"Total test queries: {len(queries)}")
        print(f"Target accuracy: {TARGET_ACCURACY * 100:.1f}%")
        print(f"Target response time: {TARGET_RESPONSE_TIME:.1f}s")
        print(f"{'='*80}\n")

        # Run tests
        tasks = [self.run_single_query_test(query) for query in queries]
        self.results = await asyncio.gather(*tasks)

        # Calculate statistics
        stats = self._calculate_statistics()

        # Print summary
        self._print_summary(stats)

        return {
            'stats': stats,
            'results': self.results
        }

    def _calculate_statistics(self) -> Dict:
        """Calculate comprehensive test statistics"""
        total = len(self.results)
        passed = sum(1 for r in self.results if r['passed'])
        failed = total - passed

        # Response times
        response_times = [r['response_time'] for r in self.results]

        # Filter scores
        filter_scores = [r['filter_score'] for r in self.results]

        # By category
        categories = {}
        for result in self.results:
            cat = result['category']
            if cat not in categories:
                categories[cat] = {'total': 0, 'passed': 0}
            categories[cat]['total'] += 1
            if result['passed']:
                categories[cat]['passed'] += 1

        # By difficulty
        difficulties = {}
        for result in self.results:
            diff = result['difficulty']
            if diff not in difficulties:
                difficulties[diff] = {'total': 0, 'passed': 0}
            difficulties[diff]['total'] += 1
            if result['passed']:
                difficulties[diff]['passed'] += 1

        # Performance metrics
        slow_queries = [r for r in self.results if r['response_time'] > TARGET_RESPONSE_TIME]

        return {
            'total_queries': total,
            'passed': passed,
            'failed': failed,
            'accuracy': passed / total if total > 0 else 0.0,
            'response_time': {
                'mean': statistics.mean(response_times),
                'median': statistics.median(response_times),
                'min': min(response_times),
                'max': max(response_times),
                'std_dev': statistics.stdev(response_times) if len(response_times) > 1 else 0.0
            },
            'filter_accuracy': {
                'mean': statistics.mean(filter_scores),
                'median': statistics.median(filter_scores),
                'min': min(filter_scores),
                'max': max(filter_scores)
            },
            'by_category': categories,
            'by_difficulty': difficulties,
            'slow_queries': len(slow_queries),
            'slow_query_details': slow_queries[:10]  # Top 10 slowest
        }

    def _print_summary(self, stats: Dict):
        """Print test results summary"""
        print(f"\n{'='*80}")
        print(f"TEST RESULTS SUMMARY")
        print(f"{'='*80}\n")

        # Overall results
        print(f"📊 Overall Results:")
        print(f"   Total queries: {stats['total_queries']}")
        print(f"   ✓ Passed: {stats['passed']} ({stats['accuracy']*100:.2f}%)")
        print(f"   ✗ Failed: {stats['failed']}")

        # Accuracy assessment
        if stats['accuracy'] >= TARGET_ACCURACY:
            print(f"   🎯 ACCURACY TARGET MET! (Target: {TARGET_ACCURACY*100:.1f}%)")
        else:
            print(f"   ⚠️  Below target (Target: {TARGET_ACCURACY*100:.1f}%)")

        print(f"\n⏱️  Performance Metrics:")
        print(f"   Mean response time: {stats['response_time']['mean']*1000:.0f}ms")
        print(f"   Median response time: {stats['response_time']['median']*1000:.0f}ms")
        print(f"   Min/Max: {stats['response_time']['min']*1000:.0f}ms / {stats['response_time']['max']*1000:.0f}ms")
        print(f"   Std deviation: {stats['response_time']['std_dev']*1000:.0f}ms")

        if stats['response_time']['mean'] <= TARGET_RESPONSE_TIME:
            print(f"   🎯 PERFORMANCE TARGET MET! (Target: {TARGET_RESPONSE_TIME:.1f}s)")
        else:
            print(f"   ⚠️  Above target (Target: {TARGET_RESPONSE_TIME:.1f}s)")

        print(f"\n   Slow queries (>{TARGET_RESPONSE_TIME:.1f}s): {stats['slow_queries']}")

        print(f"\n🎯 Filter Accuracy:")
        print(f"   Mean filter score: {stats['filter_accuracy']['mean']*100:.2f}%")
        print(f"   Median filter score: {stats['filter_accuracy']['median']*100:.2f}%")

        print(f"\n📂 Results by Category:")
        for category, data in stats['by_category'].items():
            accuracy = data['passed'] / data['total'] * 100 if data['total'] > 0 else 0
            print(f"   {category:25s}: {data['passed']:3d}/{data['total']:3d} ({accuracy:5.1f}%)")

        print(f"\n📊 Results by Difficulty:")
        for difficulty, data in stats['by_difficulty'].items():
            accuracy = data['passed'] / data['total'] * 100 if data['total'] > 0 else 0
            print(f"   {difficulty:10s}: {data['passed']:3d}/{data['total']:3d} ({accuracy:5.1f}%)")

        print(f"\n{'='*80}\n")

    def generate_detailed_report(self, output_format='html'):
        """
        Generate detailed test report

        Args:
            output_format: 'html', 'json', or 'csv'
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if output_format == 'html':
            self._generate_html_report(timestamp)
        elif output_format == 'json':
            self._generate_json_report(timestamp)
        elif output_format == 'csv':
            self._generate_csv_report(timestamp)
        else:
            raise ValueError(f"Unsupported format: {output_format}")

    def _generate_html_report(self, timestamp: str):
        """Generate HTML report"""
        filename = REPORT_DIR / f"test_report_{timestamp}.html"

        stats = self._calculate_statistics()

        html_content = f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NLP Query Transformation Test Report</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #34495e;
            margin-top: 30px;
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }}
        .stat-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .stat-card.success {{
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }}
        .stat-card.warning {{
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }}
        .stat-value {{
            font-size: 2.5em;
            font-weight: bold;
            margin: 10px 0;
        }}
        .stat-label {{
            font-size: 0.9em;
            opacity: 0.9;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background: #3498db;
            color: white;
            font-weight: 600;
        }}
        tr:hover {{
            background: #f5f5f5;
        }}
        .pass {{
            color: #27ae60;
            font-weight: bold;
        }}
        .fail {{
            color: #e74c3c;
            font-weight: bold;
        }}
        .badge {{
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
        }}
        .badge-easy {{
            background: #d4edda;
            color: #155724;
        }}
        .badge-medium {{
            background: #fff3cd;
            color: #856404;
        }}
        .badge-hard {{
            background: #f8d7da;
            color: #721c24;
        }}
        .progress-bar {{
            width: 100%;
            height: 30px;
            background: #ecf0f1;
            border-radius: 15px;
            overflow: hidden;
            margin: 10px 0;
        }}
        .progress-fill {{
            height: 100%;
            background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }}
        .chart-container {{
            margin: 30px 0;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 NLP Query Transformation Test Report</h1>
        <p><strong>Generated:</strong> {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
        <p><strong>Total Test Queries:</strong> {stats['total_queries']}</p>

        <div class="stats-grid">
            <div class="stat-card success">
                <div class="stat-label">Accuracy</div>
                <div class="stat-value">{stats['accuracy']*100:.1f}%</div>
                <div class="stat-label">Target: {TARGET_ACCURACY*100:.1f}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Passed Tests</div>
                <div class="stat-value">{stats['passed']}</div>
                <div class="stat-label">of {stats['total_queries']}</div>
            </div>
            <div class="stat-card {'warning' if stats['failed'] > 0 else 'success'}">
                <div class="stat-label">Failed Tests</div>
                <div class="stat-value">{stats['failed']}</div>
                <div class="stat-label">Need attention</div>
            </div>
            <div class="stat-card {'success' if stats['response_time']['mean'] <= TARGET_RESPONSE_TIME else 'warning'}">
                <div class="stat-label">Avg Response Time</div>
                <div class="stat-value">{stats['response_time']['mean']*1000:.0f}ms</div>
                <div class="stat-label">Target: {TARGET_RESPONSE_TIME*1000:.0f}ms</div>
            </div>
        </div>

        <h2>📊 Performance Metrics</h2>
        <div class="chart-container">
            <h3>Overall Accuracy</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: {stats['accuracy']*100:.1f}%">
                    {stats['accuracy']*100:.1f}%
                </div>
            </div>

            <h3>Response Time Distribution</h3>
            <ul>
                <li><strong>Mean:</strong> {stats['response_time']['mean']*1000:.0f}ms</li>
                <li><strong>Median:</strong> {stats['response_time']['median']*1000:.0f}ms</li>
                <li><strong>Min:</strong> {stats['response_time']['min']*1000:.0f}ms</li>
                <li><strong>Max:</strong> {stats['response_time']['max']*1000:.0f}ms</li>
                <li><strong>Std Dev:</strong> {stats['response_time']['std_dev']*1000:.0f}ms</li>
                <li><strong>Slow queries (>{TARGET_RESPONSE_TIME}s):</strong> {stats['slow_queries']}</li>
            </ul>
        </div>

        <h2>📂 Results by Category</h2>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Total</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Accuracy</th>
                </tr>
            </thead>
            <tbody>
"""

        for category, data in stats['by_category'].items():
            accuracy = data['passed'] / data['total'] * 100 if data['total'] > 0 else 0
            html_content += f"""
                <tr>
                    <td>{category}</td>
                    <td>{data['total']}</td>
                    <td class="pass">{data['passed']}</td>
                    <td class="fail">{data['total'] - data['passed']}</td>
                    <td>{accuracy:.1f}%</td>
                </tr>
"""

        html_content += """
            </tbody>
        </table>

        <h2>📊 Results by Difficulty</h2>
        <table>
            <thead>
                <tr>
                    <th>Difficulty</th>
                    <th>Total</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Accuracy</th>
                </tr>
            </thead>
            <tbody>
"""

        for difficulty, data in stats['by_difficulty'].items():
            accuracy = data['passed'] / data['total'] * 100 if data['total'] > 0 else 0
            html_content += f"""
                <tr>
                    <td><span class="badge badge-{difficulty}">{difficulty}</span></td>
                    <td>{data['total']}</td>
                    <td class="pass">{data['passed']}</td>
                    <td class="fail">{data['total'] - data['passed']}</td>
                    <td>{accuracy:.1f}%</td>
                </tr>
"""

        html_content += """
            </tbody>
        </table>

        <h2>❌ Failed Test Cases</h2>
        <table>
            <thead>
                <tr>
                    <th>Query ID</th>
                    <th>Query</th>
                    <th>Category</th>
                    <th>Difficulty</th>
                    <th>Error</th>
                </tr>
            </thead>
            <tbody>
"""

        failed_tests = [r for r in self.results if not r['passed']]
        for result in failed_tests[:50]:  # Show first 50 failures
            error_msg = result.get('error', 'Validation failed')
            html_content += f"""
                <tr>
                    <td>{result['query_id']}</td>
                    <td>{result['query']}</td>
                    <td>{result['category']}</td>
                    <td><span class="badge badge-{result['difficulty']}">{result['difficulty']}</span></td>
                    <td>{error_msg}</td>
                </tr>
"""

        html_content += """
            </tbody>
        </table>

        <h2>⏱️ Slowest Queries</h2>
        <table>
            <thead>
                <tr>
                    <th>Query ID</th>
                    <th>Query</th>
                    <th>Response Time</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
"""

        # Sort by response time and get top 20
        sorted_by_time = sorted(self.results, key=lambda x: x['response_time'], reverse=True)
        for result in sorted_by_time[:20]:
            status = '<span class="pass">✓ PASS</span>' if result['passed'] else '<span class="fail">✗ FAIL</span>'
            html_content += f"""
                <tr>
                    <td>{result['query_id']}</td>
                    <td>{result['query']}</td>
                    <td>{result['response_time']*1000:.0f}ms</td>
                    <td>{status}</td>
                </tr>
"""

        html_content += """
            </tbody>
        </table>

        <h2>✅ Recommendations</h2>
        <ul>
"""

        # Generate recommendations based on results
        if stats['accuracy'] < TARGET_ACCURACY:
            html_content += f"""
            <li><strong>Accuracy below target:</strong> Review failed test cases and improve entity extraction and intent classification.</li>
"""

        if stats['response_time']['mean'] > TARGET_RESPONSE_TIME:
            html_content += f"""
            <li><strong>Performance issue:</strong> Mean response time ({stats['response_time']['mean']*1000:.0f}ms) exceeds target. Consider optimization.</li>
"""

        if stats['slow_queries'] > len(self.results) * 0.10:
            html_content += f"""
            <li><strong>Too many slow queries:</strong> {stats['slow_queries']} queries exceed {TARGET_RESPONSE_TIME}s. Review slow query patterns.</li>
"""

        # Category-specific recommendations
        for category, data in stats['by_category'].items():
            accuracy = data['passed'] / data['total'] if data['total'] > 0 else 0
            if accuracy < 0.80:
                html_content += f"""
            <li><strong>{category} needs improvement:</strong> Only {accuracy*100:.1f}% accuracy. Focus on this category.</li>
"""

        html_content += """
        </ul>

        <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #7f8c8d;">
            <p>Generated by Poweria Legal RAG System - NLP Testing Suite v1.0</p>
        </footer>
    </div>
</body>
</html>
"""

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_content)

        print(f"✓ HTML report generated: {filename}")

    def _generate_json_report(self, timestamp: str):
        """Generate JSON report"""
        filename = REPORT_DIR / f"test_report_{timestamp}.json"

        stats = self._calculate_statistics()

        report = {
            'metadata': {
                'timestamp': datetime.now().isoformat(),
                'total_queries': stats['total_queries'],
                'target_accuracy': TARGET_ACCURACY,
                'target_response_time': TARGET_RESPONSE_TIME
            },
            'summary': stats,
            'test_results': self.results
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        print(f"✓ JSON report generated: {filename}")

    def _generate_csv_report(self, timestamp: str):
        """Generate CSV report"""
        filename = REPORT_DIR / f"test_report_{timestamp}.csv"

        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'query_id', 'query', 'category', 'difficulty', 'passed',
                'response_time_ms', 'filter_score', 'error'
            ])
            writer.writeheader()

            for result in self.results:
                writer.writerow({
                    'query_id': result['query_id'],
                    'query': result['query'],
                    'category': result['category'],
                    'difficulty': result['difficulty'],
                    'passed': result['passed'],
                    'response_time_ms': f"{result['response_time']*1000:.0f}",
                    'filter_score': f"{result['filter_score']*100:.1f}%",
                    'error': result.get('error', '')
                })

        print(f"✓ CSV report generated: {filename}")


# Pytest test cases
@pytest.fixture
def test_suite():
    """Fixture to create test suite instance"""
    return NLPQueryTransformationTests()


@pytest.mark.asyncio
async def test_simple_search_queries(test_suite):
    """Test simple search query transformations"""
    queries = test_suite.data_loader.get_queries_by_category('simple_search')
    tasks = [test_suite.run_single_query_test(q) for q in queries]
    results = await asyncio.gather(*tasks)

    passed = sum(1 for r in results if r['passed'])
    accuracy = passed / len(results)

    assert accuracy >= 0.90, f"Simple search accuracy {accuracy*100:.1f}% below 90%"


@pytest.mark.asyncio
async def test_article_lookup_queries(test_suite):
    """Test article lookup query transformations"""
    queries = test_suite.data_loader.get_queries_by_category('article_lookup')
    tasks = [test_suite.run_single_query_test(q) for q in queries]
    results = await asyncio.gather(*tasks)

    passed = sum(1 for r in results if r['passed'])
    accuracy = passed / len(results)

    assert accuracy >= 0.95, f"Article lookup accuracy {accuracy*100:.1f}% below 95%"


@pytest.mark.asyncio
async def test_date_based_queries(test_suite):
    """Test date-based query transformations"""
    queries = test_suite.data_loader.get_queries_by_category('date_based')
    tasks = [test_suite.run_single_query_test(q) for q in queries]
    results = await asyncio.gather(*tasks)

    passed = sum(1 for r in results if r['passed'])
    accuracy = passed / len(results)

    assert accuracy >= 0.85, f"Date-based accuracy {accuracy*100:.1f}% below 85%"


@pytest.mark.asyncio
async def test_entity_extraction(test_suite):
    """Test legal entity extraction"""
    queries = test_suite.data_loader.get_queries_by_category('entity_extraction')
    tasks = [test_suite.run_single_query_test(q) for q in queries]
    results = await asyncio.gather(*tasks)

    passed = sum(1 for r in results if r['passed'])
    accuracy = passed / len(results)

    assert accuracy >= TARGET_ENTITY_PRECISION, f"Entity extraction {accuracy*100:.1f}% below target"


@pytest.mark.asyncio
async def test_response_time_performance(test_suite):
    """Test that response times meet performance target"""
    queries = test_suite.data_loader.get_all_queries()[:50]  # Sample 50 queries
    tasks = [test_suite.run_single_query_test(q) for q in queries]
    results = await asyncio.gather(*tasks)

    mean_time = statistics.mean([r['response_time'] for r in results])

    assert mean_time <= TARGET_RESPONSE_TIME, f"Mean response time {mean_time:.2f}s exceeds {TARGET_RESPONSE_TIME}s"


@pytest.mark.asyncio
async def test_overall_accuracy(test_suite):
    """Test overall accuracy meets target"""
    report = await test_suite.run_all_tests()
    accuracy = report['stats']['accuracy']

    assert accuracy >= TARGET_ACCURACY, f"Overall accuracy {accuracy*100:.1f}% below target {TARGET_ACCURACY*100:.1f}%"


# Main execution
if __name__ == "__main__":
    async def main():
        print("\n" + "="*80)
        print("NLP QUERY TRANSFORMATION TEST SUITE")
        print("="*80 + "\n")

        # Create test suite
        suite = NLPQueryTransformationTests()

        # Run all tests
        report = await suite.run_all_tests()

        # Generate reports
        print("\nGenerating test reports...")
        suite.generate_detailed_report('html')
        suite.generate_detailed_report('json')
        suite.generate_detailed_report('csv')

        print("\n" + "="*80)
        print("Testing complete! Check the reports directory for detailed results.")
        print("="*80 + "\n")

    # Run the test suite
    asyncio.run(main())
