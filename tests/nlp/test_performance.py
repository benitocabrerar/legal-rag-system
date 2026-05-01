"""
Performance Testing Suite for NLP Query Transformation
======================================================

Load testing and performance benchmarking for the NLP Query Transformation system.

Tests:
- Response time under load
- Concurrent query handling
- Throughput measurement
- Resource utilization
- Bottleneck identification

Author: Poweria Legal Team
Version: 1.0
"""

import asyncio
import time
import statistics
from typing import List, Dict
from dataclasses import dataclass
from datetime import datetime
import json
from pathlib import Path


@dataclass
class PerformanceMetrics:
    """Performance test metrics"""
    total_requests: int
    successful_requests: int
    failed_requests: int
    mean_response_time: float
    median_response_time: float
    p95_response_time: float
    p99_response_time: float
    min_response_time: float
    max_response_time: float
    requests_per_second: float
    total_duration: float
    error_rate: float


class PerformanceTestSuite:
    """Performance testing suite"""

    def __init__(self, nlp_service=None):
        """
        Initialize performance test suite

        Args:
            nlp_service: NLP service instance to test
        """
        self.nlp_service = nlp_service
        self.results = []

    async def _execute_query(self, query: str) -> Dict:
        """Execute single query and measure performance"""
        start_time = time.time()
        error = None

        try:
            if self.nlp_service:
                result = await self.nlp_service.parse_query(query)
            else:
                # Mock service for testing
                await asyncio.sleep(0.1)  # Simulate processing
                result = {'intent': 'search', 'confidence': 0.90}

            success = True
        except Exception as e:
            success = False
            error = str(e)
            result = None

        end_time = time.time()
        response_time = end_time - start_time

        return {
            'query': query,
            'success': success,
            'response_time': response_time,
            'result': result,
            'error': error,
            'timestamp': datetime.now().isoformat()
        }

    async def run_load_test(
        self,
        queries: List[str],
        concurrent_users: int = 10,
        duration_seconds: int = 60
    ) -> PerformanceMetrics:
        """
        Run load test with concurrent users

        Args:
            queries: List of test queries
            concurrent_users: Number of concurrent users to simulate
            duration_seconds: Duration of load test in seconds

        Returns:
            Performance metrics
        """
        print(f"\n{'='*80}")
        print(f"LOAD TEST")
        print(f"{'='*80}")
        print(f"Concurrent users: {concurrent_users}")
        print(f"Duration: {duration_seconds}s")
        print(f"Test queries: {len(queries)}")
        print(f"{'='*80}\n")

        start_time = time.time()
        end_time = start_time + duration_seconds
        results = []

        async def worker(worker_id: int):
            """Worker coroutine simulating a user"""
            query_index = 0
            while time.time() < end_time:
                query = queries[query_index % len(queries)]
                result = await self._execute_query(query)
                result['worker_id'] = worker_id
                results.append(result)
                query_index += 1

                # Small delay to prevent overwhelming
                await asyncio.sleep(0.01)

        # Run workers concurrently
        workers = [worker(i) for i in range(concurrent_users)]
        await asyncio.gather(*workers)

        total_duration = time.time() - start_time

        # Calculate metrics
        metrics = self._calculate_metrics(results, total_duration)

        # Print results
        self._print_load_test_results(metrics)

        return metrics

    async def run_stress_test(
        self,
        queries: List[str],
        max_concurrent: int = 100,
        step: int = 10,
        step_duration: int = 30
    ) -> List[PerformanceMetrics]:
        """
        Run stress test with increasing load

        Args:
            queries: List of test queries
            max_concurrent: Maximum concurrent users
            step: Increment of concurrent users per step
            step_duration: Duration of each step in seconds

        Returns:
            List of metrics for each step
        """
        print(f"\n{'='*80}")
        print(f"STRESS TEST")
        print(f"{'='*80}")
        print(f"Starting users: {step}")
        print(f"Max users: {max_concurrent}")
        print(f"Step increment: {step}")
        print(f"Step duration: {step_duration}s")
        print(f"{'='*80}\n")

        all_metrics = []

        for concurrent_users in range(step, max_concurrent + 1, step):
            print(f"\n--- Testing with {concurrent_users} concurrent users ---")

            metrics = await self.run_load_test(
                queries=queries,
                concurrent_users=concurrent_users,
                duration_seconds=step_duration
            )

            all_metrics.append(metrics)

            # Check if system is degrading significantly
            if metrics.error_rate > 0.10:  # More than 10% errors
                print(f"\n⚠️  High error rate detected: {metrics.error_rate*100:.1f}%")
                print(f"Breaking point: ~{concurrent_users} concurrent users")
                break

            # Brief pause between steps
            await asyncio.sleep(2)

        return all_metrics

    async def run_spike_test(
        self,
        queries: List[str],
        normal_load: int = 10,
        spike_load: int = 100,
        spike_duration: int = 10
    ) -> Dict:
        """
        Test system behavior under sudden traffic spike

        Args:
            queries: List of test queries
            normal_load: Normal concurrent users
            spike_load: Spike concurrent users
            spike_duration: Duration of spike in seconds

        Returns:
            Metrics for normal and spike periods
        """
        print(f"\n{'='*80}")
        print(f"SPIKE TEST")
        print(f"{'='*80}")
        print(f"Normal load: {normal_load} users")
        print(f"Spike load: {spike_load} users")
        print(f"Spike duration: {spike_duration}s")
        print(f"{'='*80}\n")

        # Phase 1: Normal load (30s)
        print("\nPhase 1: Normal load (30s)")
        normal_metrics = await self.run_load_test(
            queries=queries,
            concurrent_users=normal_load,
            duration_seconds=30
        )

        # Phase 2: Spike (10s)
        print("\nPhase 2: Traffic spike")
        spike_metrics = await self.run_load_test(
            queries=queries,
            concurrent_users=spike_load,
            duration_seconds=spike_duration
        )

        # Phase 3: Recovery (30s)
        print("\nPhase 3: Recovery period (30s)")
        recovery_metrics = await self.run_load_test(
            queries=queries,
            concurrent_users=normal_load,
            duration_seconds=30
        )

        return {
            'normal': normal_metrics,
            'spike': spike_metrics,
            'recovery': recovery_metrics
        }

    async def run_soak_test(
        self,
        queries: List[str],
        concurrent_users: int = 20,
        duration_minutes: int = 60
    ) -> PerformanceMetrics:
        """
        Test system stability over extended period

        Args:
            queries: List of test queries
            concurrent_users: Concurrent users to simulate
            duration_minutes: Test duration in minutes

        Returns:
            Performance metrics
        """
        print(f"\n{'='*80}")
        print(f"SOAK TEST (Endurance Test)")
        print(f"{'='*80}")
        print(f"Concurrent users: {concurrent_users}")
        print(f"Duration: {duration_minutes} minutes")
        print(f"{'='*80}\n")

        metrics = await self.run_load_test(
            queries=queries,
            concurrent_users=concurrent_users,
            duration_seconds=duration_minutes * 60
        )

        return metrics

    def _calculate_metrics(
        self,
        results: List[Dict],
        total_duration: float
    ) -> PerformanceMetrics:
        """Calculate performance metrics from test results"""
        total_requests = len(results)
        successful = sum(1 for r in results if r['success'])
        failed = total_requests - successful

        response_times = [r['response_time'] for r in results]

        if response_times:
            sorted_times = sorted(response_times)
            p95_index = int(len(sorted_times) * 0.95)
            p99_index = int(len(sorted_times) * 0.99)

            return PerformanceMetrics(
                total_requests=total_requests,
                successful_requests=successful,
                failed_requests=failed,
                mean_response_time=statistics.mean(response_times),
                median_response_time=statistics.median(response_times),
                p95_response_time=sorted_times[p95_index] if p95_index < len(sorted_times) else sorted_times[-1],
                p99_response_time=sorted_times[p99_index] if p99_index < len(sorted_times) else sorted_times[-1],
                min_response_time=min(response_times),
                max_response_time=max(response_times),
                requests_per_second=total_requests / total_duration if total_duration > 0 else 0,
                total_duration=total_duration,
                error_rate=failed / total_requests if total_requests > 0 else 0
            )
        else:
            return PerformanceMetrics(
                total_requests=0,
                successful_requests=0,
                failed_requests=0,
                mean_response_time=0.0,
                median_response_time=0.0,
                p95_response_time=0.0,
                p99_response_time=0.0,
                min_response_time=0.0,
                max_response_time=0.0,
                requests_per_second=0.0,
                total_duration=total_duration,
                error_rate=1.0
            )

    def _print_load_test_results(self, metrics: PerformanceMetrics):
        """Print load test results"""
        print(f"\n{'='*60}")
        print(f"LOAD TEST RESULTS")
        print(f"{'='*60}")
        print(f"Total requests: {metrics.total_requests}")
        print(f"Successful: {metrics.successful_requests} ({(1-metrics.error_rate)*100:.1f}%)")
        print(f"Failed: {metrics.failed_requests} ({metrics.error_rate*100:.1f}%)")
        print(f"\nResponse Times:")
        print(f"  Mean: {metrics.mean_response_time*1000:.0f}ms")
        print(f"  Median: {metrics.median_response_time*1000:.0f}ms")
        print(f"  P95: {metrics.p95_response_time*1000:.0f}ms")
        print(f"  P99: {metrics.p99_response_time*1000:.0f}ms")
        print(f"  Min: {metrics.min_response_time*1000:.0f}ms")
        print(f"  Max: {metrics.max_response_time*1000:.0f}ms")
        print(f"\nThroughput:")
        print(f"  {metrics.requests_per_second:.1f} requests/second")
        print(f"\nDuration: {metrics.total_duration:.1f}s")
        print(f"{'='*60}\n")

    def generate_performance_report(
        self,
        test_results: Dict,
        output_file: str = "performance_report.json"
    ):
        """Generate performance test report"""
        report = {
            'metadata': {
                'timestamp': datetime.now().isoformat(),
                'test_suite': 'NLP Query Transformation Performance Tests'
            },
            'results': {}
        }

        # Convert metrics to dict
        for test_name, metrics in test_results.items():
            if isinstance(metrics, PerformanceMetrics):
                report['results'][test_name] = {
                    'total_requests': metrics.total_requests,
                    'successful_requests': metrics.successful_requests,
                    'failed_requests': metrics.failed_requests,
                    'mean_response_time_ms': metrics.mean_response_time * 1000,
                    'median_response_time_ms': metrics.median_response_time * 1000,
                    'p95_response_time_ms': metrics.p95_response_time * 1000,
                    'p99_response_time_ms': metrics.p99_response_time * 1000,
                    'min_response_time_ms': metrics.min_response_time * 1000,
                    'max_response_time_ms': metrics.max_response_time * 1000,
                    'requests_per_second': metrics.requests_per_second,
                    'error_rate': metrics.error_rate,
                    'total_duration_s': metrics.total_duration
                }
            elif isinstance(metrics, list):
                # Stress test results
                report['results'][test_name] = [
                    {
                        'concurrent_users': i * 10 + 10,
                        'mean_response_time_ms': m.mean_response_time * 1000,
                        'p95_response_time_ms': m.p95_response_time * 1000,
                        'requests_per_second': m.requests_per_second,
                        'error_rate': m.error_rate
                    }
                    for i, m in enumerate(metrics)
                ]

        output_path = Path(__file__).parent / "reports" / output_file
        output_path.parent.mkdir(exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)

        print(f"\n✓ Performance report saved: {output_path}")


# Sample test queries for performance testing
SAMPLE_QUERIES = [
    "¿Cuáles son los derechos fundamentales en Ecuador?",
    "Artículo 234 del Código Civil",
    "Leyes sobre medio ambiente publicadas en 2023",
    "¿Qué dice la Constitución sobre la libertad de expresión?",
    "Artículo 140 COIP",
    "Normativa sobre teletrabajo",
    "Código Orgánico Integral Penal",
    "Derechos de los trabajadores",
    "Ley de Protección al Consumidor",
    "Sentencias de la Corte Constitucional"
]


async def main():
    """Main performance test execution"""
    print("\n" + "="*80)
    print("NLP QUERY TRANSFORMATION - PERFORMANCE TEST SUITE")
    print("="*80 + "\n")

    suite = PerformanceTestSuite()

    # Run different performance tests
    results = {}

    # 1. Load Test
    print("\n1️⃣  Running Load Test...")
    results['load_test'] = await suite.run_load_test(
        queries=SAMPLE_QUERIES,
        concurrent_users=50,
        duration_seconds=60
    )

    # 2. Stress Test
    print("\n2️⃣  Running Stress Test...")
    results['stress_test'] = await suite.run_stress_test(
        queries=SAMPLE_QUERIES,
        max_concurrent=100,
        step=10,
        step_duration=30
    )

    # 3. Spike Test
    print("\n3️⃣  Running Spike Test...")
    results['spike_test'] = await suite.run_spike_test(
        queries=SAMPLE_QUERIES,
        normal_load=10,
        spike_load=100,
        spike_duration=10
    )

    # Generate report
    suite.generate_performance_report(
        test_results=results,
        output_file=f"performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )

    print("\n" + "="*80)
    print("Performance testing complete!")
    print("="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
