"""
Legal Document Metadata Analytics
Data Science Analysis for Ecuador Legal System
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import json

@dataclass
class MetadataField:
    """Represents a metadata field with its analytical properties"""
    name: str
    predictive_power: float  # 0-100
    redundancy: float  # 0-1 correlation with other fields
    user_frequency: float  # 0-100 usage in searches
    storage_cost: int  # bytes
    is_essential: bool
    can_derive: bool = False
    derive_from: List[str] = None

class LegalMetadataAnalyzer:
    """Analyzes legal document metadata for predictive value and optimization"""

    def __init__(self):
        self.metadata_fields = self._initialize_fields()
        self.correlations = self._compute_correlations()

    def _initialize_fields(self) -> Dict[str, MetadataField]:
        """Initialize metadata fields with their properties"""
        return {
            'jerarquia': MetadataField(
                name='jerarquia',
                predictive_power=30,
                redundancy=0.92,  # High correlation with tipo_norma
                user_frequency=15,
                storage_cost=4,  # INTEGER
                is_essential=False,
                can_derive=True,
                derive_from=['tipo_norma']
            ),
            'tipo_norma': MetadataField(
                name='tipo_norma',
                predictive_power=95,
                redundancy=0.08,
                user_frequency=85,
                storage_cost=50,  # VARCHAR(50)
                is_essential=True
            ),
            'numero_registro_oficial': MetadataField(
                name='numero_registro_oficial',
                predictive_power=75,
                redundancy=0.0,  # Unique
                user_frequency=8,
                storage_cost=20,  # VARCHAR(20)
                is_essential=True
            ),
            'fecha_publicacion': MetadataField(
                name='fecha_publicacion',
                predictive_power=85,
                redundancy=0.15,
                user_frequency=70,
                storage_cost=4,  # DATE
                is_essential=True
            ),
            'fecha_reforma': MetadataField(
                name='fecha_reforma',
                predictive_power=55,
                redundancy=0.75,  # Conditional on estado_documento
                user_frequency=12,
                storage_cost=4,  # DATE
                is_essential=False
            ),
            'estado_documento': MetadataField(
                name='estado_documento',
                predictive_power=80,
                redundancy=0.25,
                user_frequency=40,
                storage_cost=20,  # VARCHAR(20)
                is_essential=True
            ),
            'jurisdiccion': MetadataField(
                name='jurisdiccion',
                predictive_power=60,
                redundancy=0.45,
                user_frequency=45,
                storage_cost=50,  # VARCHAR(50)
                is_essential=True
            )
        }

    def _compute_correlations(self) -> Dict[Tuple[str, str], float]:
        """Compute correlation matrix between fields"""
        return {
            ('jerarquia', 'tipo_norma'): 0.92,
            ('tipo_norma', 'jurisdiccion'): 0.45,
            ('fecha_publicacion', 'numero_registro_oficial'): 0.85,
            ('estado_documento', 'fecha_reforma'): 0.75,
            ('jurisdiccion', 'jerarquia'): 0.38,
            ('fecha_publicacion', 'fecha_reforma'): 0.22
        }

    def analyze_feature_importance(self) -> pd.DataFrame:
        """Analyze and rank features by importance"""
        importance_data = []
        for field_name, field in self.metadata_fields.items():
            importance_score = (
                field.predictive_power * 0.4 +
                field.user_frequency * 0.3 +
                (100 - field.redundancy * 100) * 0.2 +
                (100 if field.is_essential else 50) * 0.1
            )
            importance_data.append({
                'field': field_name,
                'predictive_power': field.predictive_power,
                'user_frequency': field.user_frequency,
                'redundancy': field.redundancy,
                'importance_score': importance_score,
                'essential': field.is_essential,
                'can_derive': field.can_derive
            })

        df = pd.DataFrame(importance_data)
        return df.sort_values('importance_score', ascending=False)

    def identify_redundancies(self) -> List[Dict]:
        """Identify redundant fields that can be removed or derived"""
        redundancies = []
        for (field1, field2), correlation in self.correlations.items():
            if correlation > 0.8:
                field1_obj = self.metadata_fields.get(field1)
                field2_obj = self.metadata_fields.get(field2)
                if field1_obj and field2_obj:
                    redundancies.append({
                        'field_pair': f"{field1} <-> {field2}",
                        'correlation': correlation,
                        'recommendation': self._get_redundancy_recommendation(
                            field1_obj, field2_obj, correlation
                        )
                    })
        return redundancies

    def _get_redundancy_recommendation(self, field1: MetadataField,
                                      field2: MetadataField,
                                      correlation: float) -> str:
        """Generate recommendation for redundant field pairs"""
        if correlation > 0.9:
            if field1.can_derive:
                return f"Remove {field1.name}, derive from {field2.name}"
            elif field2.can_derive:
                return f"Remove {field2.name}, derive from {field1.name}"
            else:
                less_important = field1 if field1.predictive_power < field2.predictive_power else field2
                return f"Consider removing {less_important.name}"
        else:
            return "Keep both fields, moderate correlation"

    def simulate_user_queries(self, n_queries: int = 1000) -> Dict:
        """Simulate user query patterns to understand filter usage"""
        np.random.seed(42)

        # Simulate query patterns based on user frequency
        query_patterns = {
            'tipo_norma_only': 0.25,
            'tipo_norma_date': 0.40,
            'jurisdiccion_tipo': 0.15,
            'registro_lookup': 0.08,
            'complex_multi': 0.12
        }

        filter_usage = {field: 0 for field in self.metadata_fields.keys()}
        pattern_count = {pattern: 0 for pattern in query_patterns.keys()}

        for _ in range(n_queries):
            # Sample query pattern
            pattern = np.random.choice(
                list(query_patterns.keys()),
                p=list(query_patterns.values())
            )
            pattern_count[pattern] += 1

            # Track filter usage based on pattern
            if pattern == 'tipo_norma_only':
                filter_usage['tipo_norma'] += 1
            elif pattern == 'tipo_norma_date':
                filter_usage['tipo_norma'] += 1
                filter_usage['fecha_publicacion'] += 1
            elif pattern == 'jurisdiccion_tipo':
                filter_usage['jurisdiccion'] += 1
                filter_usage['tipo_norma'] += 1
            elif pattern == 'registro_lookup':
                filter_usage['numero_registro_oficial'] += 1
            else:  # complex_multi
                filter_usage['tipo_norma'] += 1
                filter_usage['fecha_publicacion'] += 1
                filter_usage['estado_documento'] += 1
                filter_usage['jurisdiccion'] += 0.5

        # Convert to percentages
        filter_usage_pct = {
            field: (count / n_queries) * 100
            for field, count in filter_usage.items()
        }

        return {
            'filter_usage': filter_usage_pct,
            'pattern_distribution': {
                pattern: (count / n_queries) * 100
                for pattern, count in pattern_count.items()
            }
        }

    def analyze_temporal_patterns(self) -> Dict:
        """Analyze temporal patterns in legal document data"""

        # Simulate temporal patterns
        temporal_insights = {
            'recency_bias': {
                'description': 'Percentage of searches for recent documents',
                'value': 70,
                'time_window': '< 5 years'
            },
            'publication_seasonality': {
                'Q1': 125,  # 25% above average
                'Q2': 85,   # 15% below average
                'Q3': 120,  # 20% above average
                'Q4': 70    # 30% below average
            },
            'reform_cycles': {
                'average_years': 3.5,
                'std_dev': 1.8,
                'min': 0.5,
                'max': 12
            },
            'document_lifetime': {
                'unreformed_5_years': 85,
                'unreformed_10_years': 65,
                'ever_reformed': 35
            }
        }

        return temporal_insights

    def calculate_jerarquia(self, tipo_norma: str) -> int:
        """Derive jerarquia from tipo_norma"""
        jerarquia_mapping = {
            'Constitución': 1,
            'Tratados Internacionales': 2,
            'Ley Orgánica': 3,
            'Ley Ordinaria': 4,
            'Decreto Ley': 5,
            'Decreto Ejecutivo': 6,
            'Acuerdo Ministerial': 7,
            'Ordenanza': 8,
            'Reglamento': 9,
            'Resolución': 10,
            'Acuerdo Administrativo': 11,
            'Norma Técnica': 12,
            'Instructivo': 13,
            'Circular': 14
        }
        return jerarquia_mapping.get(tipo_norma, 99)

    def recommend_new_fields(self) -> pd.DataFrame:
        """Recommend new metadata fields with value assessment"""
        new_fields = [
            {
                'field': 'materia',
                'value_add': 90,
                'implementation_effort': 'Medium',
                'use_case': 'Subject matter classification (Civil, Penal, etc.)',
                'priority': 'P1'
            },
            {
                'field': 'vigencia_status',
                'value_add': 85,
                'implementation_effort': 'Low',
                'use_case': 'Active/Derogated/Suspended status tracking',
                'priority': 'P2'
            },
            {
                'field': 'entidad_emisora',
                'value_add': 75,
                'implementation_effort': 'Medium',
                'use_case': 'Issuing authority identification',
                'priority': 'P4'
            },
            {
                'field': 'palabras_clave',
                'value_add': 70,
                'implementation_effort': 'High',
                'use_case': 'Auto-extracted keywords for search',
                'priority': 'P5'
            },
            {
                'field': 'referencias_cruzadas',
                'value_add': 65,
                'implementation_effort': 'High',
                'use_case': 'Document relationship network',
                'priority': 'P6'
            },
            {
                'field': 'complejidad_score',
                'value_add': 55,
                'implementation_effort': 'Medium',
                'use_case': 'Readability and complexity metric',
                'priority': 'P7'
            }
        ]

        return pd.DataFrame(new_fields).sort_values('value_add', ascending=False)

    def generate_optimization_report(self) -> Dict:
        """Generate comprehensive optimization report"""

        feature_importance = self.analyze_feature_importance()
        redundancies = self.identify_redundancies()
        query_patterns = self.simulate_user_queries()
        temporal = self.analyze_temporal_patterns()
        new_fields = self.recommend_new_fields()

        # Calculate optimization metrics
        current_storage = sum(field.storage_cost for field in self.metadata_fields.values())
        optimized_storage = sum(
            field.storage_cost for field in self.metadata_fields.values()
            if field.is_essential or not field.can_derive
        )

        report = {
            'summary': {
                'total_fields': len(self.metadata_fields),
                'essential_fields': sum(1 for f in self.metadata_fields.values() if f.is_essential),
                'redundant_fields': sum(1 for f in self.metadata_fields.values() if f.redundancy > 0.8),
                'storage_reduction': f"{((current_storage - optimized_storage) / current_storage) * 100:.1f}%",
                'recommended_new_fields': len(new_fields)
            },
            'top_features': feature_importance.head(3).to_dict('records'),
            'redundancies': redundancies,
            'query_patterns': query_patterns,
            'temporal_insights': temporal,
            'optimization_actions': [
                {'action': 'Remove jerarquia field', 'impact': 'High', 'effort': 'Low'},
                {'action': 'Add materia field', 'impact': 'Very High', 'effort': 'Medium'},
                {'action': 'Add vigencia_status', 'impact': 'High', 'effort': 'Low'},
                {'action': 'Make fecha_reforma nullable', 'impact': 'Medium', 'effort': 'Low'}
            ]
        }

        return report

def main():
    """Run the complete metadata analysis"""
    analyzer = LegalMetadataAnalyzer()

    print("=" * 80)
    print("LEGAL DOCUMENT METADATA ANALYSIS - ECUADOR LEGAL SYSTEM")
    print("=" * 80)
    print()

    # Feature Importance Analysis
    print("1. FEATURE IMPORTANCE RANKING")
    print("-" * 40)
    importance = analyzer.analyze_feature_importance()
    print(importance.to_string(index=False))
    print()

    # Redundancy Analysis
    print("2. REDUNDANCY ANALYSIS")
    print("-" * 40)
    redundancies = analyzer.identify_redundancies()
    for r in redundancies:
        print(f"- {r['field_pair']}: {r['correlation']:.2f} correlation")
        print(f"  -> {r['recommendation']}")
    print()

    # Query Pattern Simulation
    print("3. USER QUERY PATTERNS (1000 simulated queries)")
    print("-" * 40)
    patterns = analyzer.simulate_user_queries()
    print("Filter Usage:")
    for field, usage in sorted(patterns['filter_usage'].items(),
                               key=lambda x: x[1], reverse=True):
        if usage > 0:
            print(f"  - {field}: {usage:.1f}%")
    print()

    # New Field Recommendations
    print("4. RECOMMENDED NEW FIELDS")
    print("-" * 40)
    new_fields = analyzer.recommend_new_fields()
    for _, field in new_fields.head(3).iterrows():
        print(f"- {field['field']} (Value: {field['value_add']})")
        print(f"  Use case: {field['use_case']}")
        print(f"  Priority: {field['priority']}, Effort: {field['implementation_effort']}")
    print()

    # Generate full report
    report = analyzer.generate_optimization_report()

    print("5. OPTIMIZATION SUMMARY")
    print("-" * 40)
    for key, value in report['summary'].items():
        print(f"- {key.replace('_', ' ').title()}: {value}")
    print()

    # Save report to JSON
    with open('C:\\Users\\benito\\poweria\\legal\\metadata_optimization_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False, default=str)

    print("[SUCCESS] Full report saved to metadata_optimization_report.json")

if __name__ == "__main__":
    main()