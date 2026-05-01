/**
 * Week 2 NLP Query Transformation - Comprehensive E2E Test Suite
 *
 * Test Coverage:
 * - 30+ Query Transformation tests
 * - 20+ Entity Extraction tests
 * - 15+ Intent Classification tests
 * - 20+ Filter Building tests
 * - 15+ API Integration tests
 * - 10+ Performance tests
 *
 * Total: 110+ test cases with 100+ real Ecuadorian legal queries
 *
 * @module week2-nlp-e2e.test
 * @author Legal RAG System - Test Automation
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { QueryTransformationService } from '../services/nlp/query-transformation-service.js';
import { LegalEntityDictionary } from '../services/nlp/legal-entity-dictionary.js';
import { FilterBuilder } from '../services/nlp/filter-builder.js';
import { ContextPromptBuilder } from '../services/nlp/context-prompt-builder.js';
import type {
  SearchFilters,
  Entity,
  EntityType,
  QueryIntent,
  TransformationResult,
  ValidationResult,
  TransformationConfig
} from '../types/query-transformation.types.js';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TEST_CONFIG: TransformationConfig = {
  debug: true,
  enableCaching: false, // Disable for testing
  cacheTTL: 3600,
  maxProcessingTime: 5000,
  llmModel: 'gpt-4-turbo-preview',
  llmTemperature: 0.3,
  maxLlmTokens: 1000,
  minConfidenceThreshold: 0.3,
  enablePerformanceMonitoring: true
};

// ============================================================================
// TEST FIXTURES - 100+ REAL ECUADORIAN LEGAL QUERIES
// ============================================================================

const TEST_QUERIES = {
  // Constitutional Law Queries (10)
  constitutional: [
    'Constitución 2008 artículo 23 sobre derechos humanos',
    'qué dice la carta magna sobre educación',
    'búsqueda de garantías constitucionales',
    'artículo 66 de la constitución vigente',
    'derechos de libertad en la constitución',
    'supremacía constitucional en Ecuador',
    'constitución artículos 10 al 20',
    'garantías jurisdiccionales constitución 2008',
    'reforma constitucional sobre reelección',
    'principios fundamentales de la constitución'
  ],

  // Civil Law Queries (15)
  civilLaw: [
    'código civil artículo 234 sobre contratos',
    'capacidad legal para contratar código civil',
    'régimen de bienes gananciales',
    'artículo 1561 código civil obligaciones',
    'nulidad de contratos código civil',
    'prescripción extintiva 10 años',
    'sucesión intestada código civil',
    'patria potestad y tutela',
    'derecho de propiedad código civil',
    'servidumbres legales artículo 859',
    'contratos de arrendamiento código civil',
    'responsabilidad civil extracontractual',
    'vicios del consentimiento código civil',
    'simulación de contratos',
    'lesión enorme en contratos'
  ],

  // Criminal Law - COIP (15)
  criminalLaw: [
    'COIP artículo 140 sobre homicidio',
    'delitos contra la integridad sexual COIP',
    'robo agravado código orgánico integral penal',
    'penas para tráfico de drogas COIP',
    'medidas cautelares código penal',
    'delitos de tránsito COIP artículo 376',
    'femicidio en el COIP',
    'peculado y cohecho COIP',
    'circunstancias agravantes COIP',
    'prescripción de la acción penal',
    'delitos contra el ambiente COIP',
    'estafa y otras defraudaciones',
    'violencia intrafamiliar COIP',
    'lavado de activos código penal',
    'delitos informáticos COIP'
  ],

  // Labor Law Queries (10)
  laborLaw: [
    'código del trabajo sobre jornada laboral',
    'despido intempestivo código laboral',
    'décimo tercer sueldo cálculo',
    'indemnización por despido',
    'desahucio laboral código del trabajo',
    'horas extraordinarias y suplementarias',
    'vacaciones anuales código laboral',
    'contrato a prueba código del trabajo',
    'utilidades trabajadores código laboral',
    'acoso laboral normativa Ecuador'
  ],

  // Administrative Law (10)
  administrativeLaw: [
    'COOTAD competencias municipales',
    'ley orgánica de servicio público',
    'procedimiento administrativo LOGJCC',
    'recursos administrativos contra actos',
    'estatuto régimen jurídico administrativo',
    'contratación pública LOSNCP',
    'acto administrativo válido requisitos',
    'revocatoria de actos administrativos',
    'silencio administrativo positivo',
    'responsabilidad del Estado COOTAD'
  ],

  // Tax Law Queries (10)
  taxLaw: [
    'código tributario plazos prescripción',
    'impuesto a la renta empresas',
    'IVA tarifa 12% código tributario',
    'infracciones tributarias y sanciones',
    'devolución IVA exportadores',
    'retención en la fuente impuesto renta',
    'exenciones tributarias código tributario',
    'procedimiento de determinación tributaria',
    'impuesto predial urbano COOTAD',
    'patente municipal código tributario'
  ],

  // Environmental Law (8)
  environmentalLaw: [
    'código orgánico del ambiente',
    'licencia ambiental requisitos',
    'delitos ambientales COIP',
    'consulta previa comunidades',
    'evaluación de impacto ambiental',
    'recursos naturales no renovables',
    'protección de áreas naturales',
    'contaminación ambiental sanciones'
  ],

  // Date-Based Queries (12)
  dateQueries: [
    'leyes publicadas en 2023',
    'decretos del último año',
    'normativa vigente desde enero 2024',
    'leyes entre 2020 y 2023',
    'decretos presidenciales 2022',
    'resoluciones de los últimos 6 meses',
    'normativa anterior a 2015',
    'leyes publicadas en el registro oficial 2023',
    'acuerdos ministeriales 2024',
    'ordenanzas municipales último trimestre',
    'decretos de estado de excepción 2023',
    'reformas legales de enero a junio 2024'
  ],

  // Jurisdiction Queries (10)
  jurisdictionQueries: [
    'leyes nacionales vigentes',
    'ordenanzas municipales Quito',
    'normativa provincial Guayas',
    'decretos presidenciales nacional',
    'acuerdos ministeriales salud',
    'resoluciones Corte Constitucional',
    'ordenanzas cantón Cuenca',
    'normativa municipal Guayaquil',
    'leyes orgánicas nacionales',
    'resoluciones SRI tributarias'
  ]
};

// Simple Queries for Basic Testing
const SIMPLE_QUERIES = [
  'buscar leyes laborales',
  'código civil',
  'COIP homicidio',
  'constitución derechos',
  'decretos presidenciales',
  'ordenanzas municipales',
  'código tributario',
  'ley de educación',
  'contratos código civil',
  'delitos ambientales'
];

// Complex Multi-Entity Queries
const COMPLEX_QUERIES = [
  'código civil artículo 123 sobre contratos vigentes desde 2020',
  'constitución 2008 art 23 y COIP delitos contra integridad',
  'COOTAD competencias municipales y código tributario impuestos locales',
  'leyes laborales vigentes publicadas entre 2022 y 2024 sobre despido',
  'código orgánico integral penal arts 140-150 homicidio culposo',
  'decretos ejecutivos sobre estado excepción últimos 2 años',
  'ordenanzas municipales Quito vigentes sobre uso suelo 2023',
  'ley orgánica servicio público reformas 2024 sobre contratación',
  'código civil y código comercio sobre sociedades mercantiles',
  'LOGJCC garantías constitucionales acción protección vigentes'
];

// Edge Case Queries
const EDGE_CASE_QUERIES = [
  '', // Empty
  '   ', // Whitespace only
  'a', // Too short
  'xyz123!@#$%^', // Special characters
  '¿Qué es la ley?', // Question format
  'Art. 123, 456, 789 y 1011', // Multiple articles
  'Artículos del 1 al 100 código civil', // Range
  'CONSTITUCIÓN ECUADOR 2008', // All caps
  'código_civil-artículo-123', // Special separators
  'buscar todo sobre todo' // Too vague
];

// ============================================================================
// TEST SUITE SETUP
// ============================================================================

describe('Week 2 NLP Query Transformation - Comprehensive E2E Tests', () => {
  let transformationService: QueryTransformationService;
  let entityDictionary: LegalEntityDictionary;
  let filterBuilder: FilterBuilder;
  let promptBuilder: ContextPromptBuilder;

  beforeAll(() => {
    // Initialize services
    transformationService = new QueryTransformationService(TEST_CONFIG);
    entityDictionary = new LegalEntityDictionary();
    filterBuilder = new FilterBuilder();
    promptBuilder = new ContextPromptBuilder();
  });

  afterAll(() => {
    // Cleanup
  });

  beforeEach(() => {
    // Reset any mocks or state before each test
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 1. QUERY TRANSFORMATION TESTS (30+ test cases)
  // ==========================================================================

  describe('1. Query Transformation Tests', () => {
    describe('1.1 Simple Query Transformations', () => {
      it.each(SIMPLE_QUERIES)('should transform simple query: "%s"', async (query) => {
        const result = await transformationService.transformQuery(query);

        expect(result).toBeDefined();
        expect(result.filters).toBeDefined();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(result.processingTimeMs).toBeGreaterThan(0);
        expect(result.processingTimeMs).toBeLessThan(5000);
      });

      it('should extract keywords from "buscar leyes laborales"', async () => {
        const result = await transformationService.transformQuery('buscar leyes laborales');

        expect(result.filters.keywords).toBeDefined();
        expect(result.filters.keywords).toContain('laborales');
        expect(result.filters.normType).toContain('ley');
      });

      it('should identify code reference in "código civil"', async () => {
        const result = await transformationService.transformQuery('código civil');

        expect(result.entities).toBeDefined();
        expect(result.entities.length).toBeGreaterThan(0);
        expect(result.entities.some(e => e.text.toLowerCase().includes('civil'))).toBe(true);
      });
    });

    describe('1.2 Article Lookup Transformations', () => {
      it('should extract article number from "artículo 234 del código civil"', async () => {
        const result = await transformationService.transformQuery('artículo 234 del código civil');

        expect(result.entities).toBeDefined();
        const articleEntity = result.entities.find(e => e.text.includes('234'));
        expect(articleEntity).toBeDefined();
      });

      it('should handle "Art. 123" format', async () => {
        const result = await transformationService.transformQuery('Art. 123 código civil');

        expect(result.entities.some(e => e.text.includes('123'))).toBe(true);
      });

      it('should handle "Artículo 456" format', async () => {
        const result = await transformationService.transformQuery('Artículo 456 COIP');

        expect(result.entities.some(e => e.text.includes('456'))).toBe(true);
      });

      it('should extract article range "arts. 10-20"', async () => {
        const result = await transformationService.transformQuery('arts. 10-20 código civil');

        expect(result.entities.length).toBeGreaterThan(0);
      });

      it('should handle multiple articles "Art. 123, 456, 789"', async () => {
        const result = await transformationService.transformQuery('Art. 123, 456, 789 COIP');

        expect(result.entities.length).toBeGreaterThan(0);
      });
    });

    describe('1.3 Date-Based Transformations', () => {
      it.each(TEST_QUERIES.dateQueries)('should handle date query: "%s"', async (query) => {
        const result = await transformationService.transformQuery(query);

        expect(result.filters.dateRange).toBeDefined();
        expect(result.filters.dateRange?.from).toBeInstanceOf(Date);
        expect(result.filters.dateRange?.to).toBeInstanceOf(Date);
      });

      it('should create date range for "leyes publicadas en 2023"', async () => {
        const result = await transformationService.transformQuery('leyes publicadas en 2023');

        expect(result.filters.dateRange).toBeDefined();
        expect(result.filters.dateRange?.from.getFullYear()).toBe(2023);
        expect(result.filters.dateRange?.to.getFullYear()).toBe(2023);
      });

      it('should handle relative dates "últimos 6 meses"', async () => {
        const result = await transformationService.transformQuery('decretos de los últimos 6 meses');

        expect(result.filters.dateRange).toBeDefined();
        const monthsDiff = Math.abs(
          result.filters.dateRange!.to.getTime() - result.filters.dateRange!.from.getTime()
        ) / (1000 * 60 * 60 * 24 * 30);
        expect(monthsDiff).toBeGreaterThanOrEqual(5);
        expect(monthsDiff).toBeLessThanOrEqual(7);
      });

      it('should handle date ranges "entre 2020 y 2023"', async () => {
        const result = await transformationService.transformQuery('leyes entre 2020 y 2023');

        expect(result.filters.dateRange).toBeDefined();
        expect(result.filters.dateRange?.from.getFullYear()).toBe(2020);
        expect(result.filters.dateRange?.to.getFullYear()).toBe(2023);
      });
    });

    describe('1.4 Jurisdiction Transformations', () => {
      it.each(TEST_QUERIES.jurisdictionQueries)('should handle jurisdiction: "%s"', async (query) => {
        const result = await transformationService.transformQuery(query);

        expect(result.filters.jurisdiction).toBeDefined();
        expect(result.filters.jurisdiction!.length).toBeGreaterThan(0);
      });

      it('should identify national jurisdiction', async () => {
        const result = await transformationService.transformQuery('leyes nacionales vigentes');

        expect(result.filters.jurisdiction).toContain('nacional');
      });

      it('should identify municipal jurisdiction', async () => {
        const result = await transformationService.transformQuery('ordenanzas municipales Quito');

        expect(result.filters.jurisdiction).toContain('municipal');
        expect(result.filters.geographicScope).toContain('Quito');
      });

      it('should identify provincial jurisdiction', async () => {
        const result = await transformationService.transformQuery('normativa provincial Guayas');

        expect(result.filters.jurisdiction).toContain('provincial');
      });
    });

    describe('1.5 Complex Multi-Entity Transformations', () => {
      it.each(COMPLEX_QUERIES)('should handle complex query: "%s"', async (query) => {
        const result = await transformationService.transformQuery(query);

        expect(result.entities.length).toBeGreaterThan(1);
        expect(result.confidence).toBeGreaterThan(0.5);
        expect(result.filters).toBeDefined();
      });

      it('should extract all entities from complex query', async () => {
        const query = 'código civil artículo 123 sobre contratos vigentes desde 2020';
        const result = await transformationService.transformQuery(query);

        expect(result.entities.some(e => e.text.toLowerCase().includes('civil'))).toBe(true);
        expect(result.entities.some(e => e.text.includes('123'))).toBe(true);
        expect(result.filters.dateRange).toBeDefined();
        expect(result.filters.keywords).toContain('contratos');
      });
    });

    describe('1.6 Edge Case Transformations', () => {
      it('should handle empty query gracefully', async () => {
        await expect(transformationService.transformQuery('')).rejects.toThrow();
      });

      it('should handle whitespace-only query', async () => {
        await expect(transformationService.transformQuery('   ')).rejects.toThrow();
      });

      it('should handle very short query', async () => {
        const result = await transformationService.transformQuery('ley');

        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });

      it('should handle special characters', async () => {
        const result = await transformationService.transformQuery('¿Qué es la ley?');

        expect(result).toBeDefined();
        expect(result.filters.keywords).toBeDefined();
      });

      it('should handle all-caps query', async () => {
        const result = await transformationService.transformQuery('CONSTITUCIÓN ECUADOR 2008');

        expect(result).toBeDefined();
        expect(result.entities.length).toBeGreaterThan(0);
      });

      it('should handle query with special separators', async () => {
        const result = await transformationService.transformQuery('código_civil-artículo-123');

        expect(result).toBeDefined();
        expect(result.entities.length).toBeGreaterThan(0);
      });

      it('should handle very long query (up to 1000 chars)', async () => {
        const longQuery = 'buscar ' + 'normativa '.repeat(100) + 'vigente';

        const result = await transformationService.transformQuery(longQuery.substring(0, 1000));

        expect(result).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // 2. ENTITY EXTRACTION TESTS (20+ test cases)
  // ==========================================================================

  describe('2. Entity Extraction Tests', () => {
    describe('2.1 Constitution References', () => {
      it.each(TEST_QUERIES.constitutional)('should extract constitution entity: "%s"', async (query) => {
        const result = await transformationService.transformQuery(query);

        const constitutionEntity = result.entities.find(
          e => e.type === 'CONSTITUTION' || e.text.toLowerCase().includes('constitución')
        );
        expect(constitutionEntity).toBeDefined();
      });

      it('should recognize "carta magna" as constitution synonym', async () => {
        const result = await transformationService.transformQuery('qué dice la carta magna sobre educación');

        const constitutionEntity = result.entities.find(
          e => e.text.toLowerCase().includes('carta magna') || e.type === 'CONSTITUTION'
        );
        expect(constitutionEntity).toBeDefined();
      });

      it('should extract article from constitutional query', async () => {
        const result = await transformationService.transformQuery('Constitución 2008 artículo 23');

        const articleEntity = result.entities.find(e => e.text.includes('23'));
        expect(articleEntity).toBeDefined();
      });
    });

    describe('2.2 Code References', () => {
      it('should extract COIP entity', async () => {
        const result = await transformationService.transformQuery('COIP artículo 140 homicidio');

        const coipEntity = result.entities.find(e => e.text.includes('COIP'));
        expect(coipEntity).toBeDefined();
      });

      it('should extract "Código Civil" entity', async () => {
        const result = await transformationService.transformQuery('Código Civil artículo 1561');

        const civilCodeEntity = result.entities.find(e => e.text.toLowerCase().includes('civil'));
        expect(civilCodeEntity).toBeDefined();
      });

      it('should extract "código orgánico integral penal" full form', async () => {
        const result = await transformationService.transformQuery(
          'código orgánico integral penal sobre delitos'
        );

        expect(result.entities.length).toBeGreaterThan(0);
      });

      it('should extract COT (Código Tributario)', async () => {
        const result = await transformationService.transformQuery('COT impuesto a la renta');

        const cotEntity = result.entities.find(e => e.text.includes('COT'));
        expect(cotEntity).toBeDefined();
      });
    });

    describe('2.3 Law References', () => {
      it('should extract LOGJCC entity', async () => {
        const result = await transformationService.transformQuery('LOGJCC garantías jurisdiccionales');

        const logjccEntity = result.entities.find(e => e.text.includes('LOGJCC'));
        expect(logjccEntity).toBeDefined();
      });

      it('should extract COOTAD entity', async () => {
        const result = await transformationService.transformQuery('COOTAD competencias municipales');

        const cootadEntity = result.entities.find(e => e.text.includes('COOTAD'));
        expect(cootadEntity).toBeDefined();
      });

      it('should extract "ley orgánica" pattern', async () => {
        const result = await transformationService.transformQuery('ley orgánica de servicio público');

        expect(result.filters.normType).toContain('ley');
      });
    });

    describe('2.4 Institution References', () => {
      it('should extract SRI entity', async () => {
        const result = await transformationService.transformQuery('resoluciones SRI tributarias');

        const sriEntity = result.entities.find(e => e.text.includes('SRI'));
        expect(sriEntity).toBeDefined();
      });

      it('should extract IESS entity', async () => {
        const result = await transformationService.transformQuery('normativa IESS seguridad social');

        const iessEntity = result.entities.find(e => e.text.includes('IESS'));
        expect(iessEntity).toBeDefined();
      });

      it('should extract "Corte Constitucional"', async () => {
        const result = await transformationService.transformQuery('sentencias Corte Constitucional');

        const corteEntity = result.entities.find(e =>
          e.text.toLowerCase().includes('corte constitucional')
        );
        expect(corteEntity).toBeDefined();
      });
    });

    describe('2.5 Date Extraction', () => {
      it('should extract year 2023', async () => {
        const result = await transformationService.transformQuery('leyes de 2023');

        const dateEntity = result.entities.find(e => e.type === 'DATE' && e.text.includes('2023'));
        expect(dateEntity).toBeDefined();
      });

      it('should extract "enero 2024"', async () => {
        const result = await transformationService.transformQuery('decretos de enero 2024');

        const dateEntity = result.entities.find(e => e.text.toLowerCase().includes('enero'));
        expect(dateEntity).toBeDefined();
      });

      it('should extract "últimos 6 meses"', async () => {
        const result = await transformationService.transformQuery('normativa de los últimos 6 meses');

        expect(result.filters.dateRange).toBeDefined();
      });
    });

    describe('2.6 Article Pattern Extraction', () => {
      it('should extract "Art. 123" pattern', async () => {
        const result = await transformationService.transformQuery('Art. 123 del código civil');

        const articleEntity = result.entities.find(e => e.text.includes('123'));
        expect(articleEntity).toBeDefined();
      });

      it('should extract "Artículo 456" pattern', async () => {
        const result = await transformationService.transformQuery('Artículo 456 COIP');

        const articleEntity = result.entities.find(e => e.text.includes('456'));
        expect(articleEntity).toBeDefined();
      });

      it('should extract "arts. 10-20" range pattern', async () => {
        const result = await transformationService.transformQuery('arts. 10-20 código civil');

        expect(result.entities.length).toBeGreaterThan(0);
      });

      it('should extract multiple articles', async () => {
        const result = await transformationService.transformQuery('artículos 10, 20 y 30');

        expect(result.entities.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  // ==========================================================================
  // 3. INTENT CLASSIFICATION TESTS (15+ test cases)
  // ==========================================================================

  describe('3. Intent Classification Tests', () => {
    describe('3.1 FIND_DOCUMENT Intent', () => {
      const findDocQueries = [
        'buscar leyes sobre medio ambiente',
        'encontrar decretos presidenciales',
        'busco normativa sobre contratos',
        'leyes laborales vigentes'
      ];

      it.each(findDocQueries)('should classify as FIND_DOCUMENT: "%s"', async (query) => {
        const result = await transformationService.transformQuery(query);

        expect(result.intent.primary).toBe('FIND_DOCUMENT');
        expect(result.intent.confidence).toBeGreaterThan(0.5);
      });
    });

    describe('3.2 FIND_PROVISION Intent', () => {
      const findProvisionQueries = [
        'qué dice el artículo 123',
        'contenido del artículo 234 código civil',
        'artículo 140 COIP sobre homicidio',
        'disposición del art. 66 constitución'
      ];

      it.each(findProvisionQueries)('should classify as FIND_PROVISION: "%s"', async (query) => {
        const result = await transformationService.transformQuery(query);

        expect(result.intent.primary).toBe('FIND_PROVISION');
        expect(result.intent.confidence).toBeGreaterThan(0.5);
      });
    });

    describe('3.3 COMPARE_NORMS Intent', () => {
      const compareQueries = [
        'diferencias entre COIP y CPP',
        'comparar código civil y código comercio',
        'similitudes constitución 2008 y 1998',
        'diferencias entre ley orgánica y ordinaria'
      ];

      it.each(compareQueries)('should classify as COMPARE_NORMS: "%s"', async (query) => {
        const result = await transformationService.transformQuery(query);

        expect(result.intent.primary).toBe('COMPARE_NORMS');
        expect(result.intent.confidence).toBeGreaterThan(0.4);
      });
    });

    describe('3.4 CHECK_VALIDITY Intent', () => {
      const validityQueries = [
        'está vigente el decreto 234',
        'validez de la ley orgánica',
        'artículo 123 derogado o vigente',
        'estado del decreto ejecutivo 456'
      ];

      it.each(validityQueries)('should classify as CHECK_VALIDITY: "%s"', async (query) => {
        const result = await transformationService.transformQuery(query);

        expect(result.intent.primary).toBe('CHECK_VALIDITY');
        expect(result.intent.confidence).toBeGreaterThan(0.5);
      });
    });

    describe('3.5 GENERAL_SEARCH Intent', () => {
      const generalQueries = [
        'información sobre contratos',
        'temas de derecho civil',
        'leyes importantes Ecuador',
        'normativa general'
      ];

      it.each(generalQueries)('should classify as GENERAL_SEARCH: "%s"', async (query) => {
        const result = await transformationService.transformQuery(query);

        expect(result.intent.primary).toBe('GENERAL_SEARCH');
      });
    });

    describe('3.6 Intent Confidence Scoring', () => {
      it('should have high confidence for explicit intent', async () => {
        const result = await transformationService.transformQuery('buscar leyes sobre educación');

        expect(result.intent.confidence).toBeGreaterThan(0.7);
      });

      it('should have lower confidence for ambiguous query', async () => {
        const result = await transformationService.transformQuery('información legal');

        expect(result.intent.confidence).toBeLessThan(0.7);
      });

      it('should provide reasoning for intent classification', async () => {
        const result = await transformationService.transformQuery('qué dice el artículo 123');

        expect(result.intent.reasoning).toBeDefined();
        expect(result.intent.reasoning!.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // 4. FILTER BUILDING TESTS (20+ test cases)
  // ==========================================================================

  describe('4. Filter Building Tests', () => {
    describe('4.1 normType Filters', () => {
      it('should build filter for "ley"', async () => {
        const result = await transformationService.transformQuery('buscar leyes laborales');

        expect(result.filters.normType).toBeDefined();
        expect(result.filters.normType).toContain('ley');
      });

      it('should build filter for "decreto"', async () => {
        const result = await transformationService.transformQuery('decretos presidenciales');

        expect(result.filters.normType).toContain('decreto');
      });

      it('should build filter for "resolución"', async () => {
        const result = await transformationService.transformQuery('resoluciones ministeriales');

        expect(result.filters.normType).toContain('resolución');
      });

      it('should build filter for "ordenanza"', async () => {
        const result = await transformationService.transformQuery('ordenanzas municipales');

        expect(result.filters.normType).toContain('ordenanza');
      });

      it('should build filter for "acuerdo"', async () => {
        const result = await transformationService.transformQuery('acuerdos ministeriales');

        expect(result.filters.normType).toContain('acuerdo');
      });
    });

    describe('4.2 jurisdiction Filters', () => {
      it('should build national jurisdiction filter', async () => {
        const result = await transformationService.transformQuery('leyes nacionales');

        expect(result.filters.jurisdiction).toContain('nacional');
      });

      it('should build provincial jurisdiction filter', async () => {
        const result = await transformationService.transformQuery('normativa provincial');

        expect(result.filters.jurisdiction).toContain('provincial');
      });

      it('should build municipal jurisdiction filter', async () => {
        const result = await transformationService.transformQuery('ordenanzas municipales');

        expect(result.filters.jurisdiction).toContain('municipal');
      });
    });

    describe('4.3 legalHierarchy Filters', () => {
      it('should set highest hierarchy for constitution', async () => {
        const result = await transformationService.transformQuery('constitución ecuador');

        expect(result.filters.legalHierarchy).toBeDefined();
        expect(result.filters.legalHierarchy).toContain('constitución');
      });

      it('should set appropriate hierarchy for organic law', async () => {
        const result = await transformationService.transformQuery('ley orgánica');

        expect(result.filters.legalHierarchy).toBeDefined();
      });
    });

    describe('4.4 dateRange Filters', () => {
      it('should build date range for specific year', async () => {
        const result = await transformationService.transformQuery('leyes de 2023');

        expect(result.filters.dateRange).toBeDefined();
        expect(result.filters.dateRange!.from.getFullYear()).toBe(2023);
        expect(result.filters.dateRange!.to.getFullYear()).toBe(2023);
      });

      it('should build date range for year range', async () => {
        const result = await transformationService.transformQuery('leyes entre 2020 y 2023');

        expect(result.filters.dateRange!.from.getFullYear()).toBe(2020);
        expect(result.filters.dateRange!.to.getFullYear()).toBe(2023);
      });

      it('should build date range for relative time', async () => {
        const result = await transformationService.transformQuery('decretos del último año');

        expect(result.filters.dateRange).toBeDefined();
        const yearDiff = Math.abs(
          result.filters.dateRange!.to.getTime() - result.filters.dateRange!.from.getTime()
        ) / (1000 * 60 * 60 * 24 * 365);
        expect(yearDiff).toBeGreaterThanOrEqual(0.9);
        expect(yearDiff).toBeLessThanOrEqual(1.1);
      });

      it('should set correct dateType', async () => {
        const result = await transformationService.transformQuery('leyes publicadas en 2023');

        expect(result.filters.dateRange!.dateType).toBe('publication');
      });
    });

    describe('4.5 keyword Filters', () => {
      it('should extract topic keywords', async () => {
        const result = await transformationService.transformQuery('leyes sobre educación');

        expect(result.filters.keywords).toContain('educación');
      });

      it('should extract multiple keywords', async () => {
        const result = await transformationService.transformQuery(
          'leyes sobre educación y salud'
        );

        expect(result.filters.keywords).toContain('educación');
        expect(result.filters.keywords).toContain('salud');
      });

      it('should filter out stopwords', async () => {
        const result = await transformationService.transformQuery('buscar leyes sobre el tema de educación');

        expect(result.filters.keywords).not.toContain('el');
        expect(result.filters.keywords).not.toContain('de');
      });
    });

    describe('4.6 Combined Filters', () => {
      it('should build multiple filters together', async () => {
        const result = await transformationService.transformQuery(
          'leyes laborales nacionales vigentes de 2023'
        );

        expect(result.filters.normType).toContain('ley');
        expect(result.filters.jurisdiction).toContain('nacional');
        expect(result.filters.dateRange).toBeDefined();
        expect(result.filters.keywords).toContain('laborales');
      });

      it('should handle complex filter combination', async () => {
        const result = await transformationService.transformQuery(
          'decretos presidenciales sobre educación publicados entre 2020 y 2023'
        );

        expect(result.filters.normType).toContain('decreto');
        expect(result.filters.keywords).toContain('educación');
        expect(result.filters.dateRange).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // 5. API INTEGRATION TESTS (15+ test cases)
  // ==========================================================================

  describe('5. API Integration Tests', () => {
    describe('5.1 Transform Endpoint', () => {
      it('should return valid transformation result structure', async () => {
        const result = await transformationService.transformQuery('buscar leyes laborales');

        expect(result).toMatchObject({
          filters: expect.any(Object),
          confidence: expect.any(Number),
          entities: expect.any(Array),
          intent: expect.any(Object),
          processingTimeMs: expect.any(Number),
          validation: expect.any(Object),
          refinementSuggestions: expect.any(Array)
        });
      });

      it('should include confidence level classification', async () => {
        const result = await transformationService.transformQuery('código civil');

        expect(result.confidenceLevel).toBeDefined();
        expect(['HIGH', 'MEDIUM', 'LOW', 'VERY_LOW']).toContain(result.confidenceLevel);
      });

      it('should include processing time', async () => {
        const result = await transformationService.transformQuery('buscar leyes');

        expect(result.processingTimeMs).toBeGreaterThan(0);
      });

      it('should include validation results', async () => {
        const result = await transformationService.transformQuery('leyes de 2023');

        expect(result.validation).toBeDefined();
        expect(result.validation.isValid).toBe(true);
      });
    });

    describe('5.2 Error Handling', () => {
      it('should throw error for empty query', async () => {
        await expect(transformationService.transformQuery('')).rejects.toThrow();
      });

      it('should throw error for null query', async () => {
        await expect(transformationService.transformQuery(null as any)).rejects.toThrow();
      });

      it('should throw error for undefined query', async () => {
        await expect(transformationService.transformQuery(undefined as any)).rejects.toThrow();
      });

      it('should handle timeout gracefully', async () => {
        const shortTimeoutService = new QueryTransformationService({
          ...TEST_CONFIG,
          maxProcessingTime: 1 // 1ms timeout
        });

        await expect(
          shortTimeoutService.transformQuery('búsqueda muy compleja con múltiples entidades')
        ).rejects.toThrow(/timeout|processing time/i);
      });
    });

    describe('5.3 Validation', () => {
      it('should validate filters correctly', async () => {
        const filters: SearchFilters = {
          normType: ['ley'],
          jurisdiction: ['nacional'],
          dateRange: {
            from: new Date('2023-01-01'),
            to: new Date('2023-12-31'),
            dateType: 'publication'
          }
        };

        const validation = await transformationService.validateFilters(filters);

        expect(validation.isValid).toBe(true);
        expect(validation.errors.length).toBe(0);
      });

      it('should detect invalid date range', async () => {
        const filters: SearchFilters = {
          dateRange: {
            from: new Date('2023-12-31'),
            to: new Date('2023-01-01'), // Invalid: from > to
            dateType: 'publication'
          }
        };

        const validation = await transformationService.validateFilters(filters);

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });

      it('should provide suggestions for invalid filters', async () => {
        const filters: SearchFilters = {
          normType: ['invalid_type'] as any
        };

        const validation = await transformationService.validateFilters(filters);

        expect(validation.suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('5.4 Performance Benchmarks', () => {
      it('should transform simple query in <500ms', async () => {
        const start = Date.now();
        await transformationService.transformQuery('buscar leyes');
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(500);
      });

      it('should transform complex query in <2000ms', async () => {
        const start = Date.now();
        await transformationService.transformQuery(
          'código civil artículo 123 sobre contratos vigentes desde 2020'
        );
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(2000);
      });
    });
  });

  // ==========================================================================
  // 6. PERFORMANCE TESTS (10+ test cases)
  // ==========================================================================

  describe('6. Performance Tests', () => {
    describe('6.1 Individual Query Performance', () => {
      it('should meet <500ms target for simple queries', async () => {
        const queries = SIMPLE_QUERIES.slice(0, 5);

        for (const query of queries) {
          const start = Date.now();
          await transformationService.transformQuery(query);
          const duration = Date.now() - start;

          expect(duration).toBeLessThan(500);
        }
      });

      it('should meet <2000ms target for complex queries', async () => {
        const queries = COMPLEX_QUERIES.slice(0, 5);

        for (const query of queries) {
          const start = Date.now();
          await transformationService.transformQuery(query);
          const duration = Date.now() - start;

          expect(duration).toBeLessThan(2000);
        }
      });

      it('should report accurate processing time', async () => {
        const result = await transformationService.transformQuery('buscar leyes laborales');

        expect(result.processingTimeMs).toBeGreaterThan(0);
        expect(result.processingTimeMs).toBeLessThan(5000);
      });
    });

    describe('6.2 Concurrent Query Performance', () => {
      it('should handle 10 concurrent queries', async () => {
        const queries = SIMPLE_QUERIES.slice(0, 10);
        const start = Date.now();

        const results = await Promise.all(
          queries.map(q => transformationService.transformQuery(q))
        );

        const duration = Date.now() - start;

        expect(results.length).toBe(10);
        expect(results.every(r => r.filters !== undefined)).toBe(true);
        expect(duration).toBeLessThan(5000); // 10 queries in <5s
      });

      it('should handle 50 concurrent queries without degradation', async () => {
        const queries = [
          ...SIMPLE_QUERIES,
          ...TEST_QUERIES.constitutional,
          ...TEST_QUERIES.civilLaw.slice(0, 10)
        ].slice(0, 50);

        const start = Date.now();

        const results = await Promise.all(
          queries.map(q => transformationService.transformQuery(q))
        );

        const duration = Date.now() - start;

        expect(results.length).toBe(50);
        expect(duration).toBeLessThan(15000); // 50 queries in <15s
      });

      it('should maintain accuracy under concurrent load', async () => {
        const query = 'código civil artículo 123';

        const results = await Promise.all(
          Array(20).fill(query).map(q => transformationService.transformQuery(q))
        );

        // All results should be similar
        results.forEach(result => {
          expect(result.entities.some(e => e.text.includes('123'))).toBe(true);
        });
      });
    });

    describe('6.3 Cache Effectiveness', () => {
      it('should return same results for duplicate queries', async () => {
        const query = 'buscar leyes laborales';

        const result1 = await transformationService.transformQuery(query);
        const result2 = await transformationService.transformQuery(query);

        expect(result1.filters).toEqual(result2.filters);
        expect(result1.entities.length).toBe(result2.entities.length);
      });
    });

    describe('6.4 Memory Usage', () => {
      it('should not accumulate memory over multiple queries', async () => {
        const initialMemory = process.memoryUsage().heapUsed;

        // Run 100 queries
        for (let i = 0; i < 100; i++) {
          await transformationService.transformQuery(
            SIMPLE_QUERIES[i % SIMPLE_QUERIES.length]
          );
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryGrowth = finalMemory - initialMemory;

        // Memory growth should be reasonable (<50MB)
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
      });
    });

    describe('6.5 Batch Performance', () => {
      it('should process all constitutional queries efficiently', async () => {
        const start = Date.now();

        const results = await Promise.all(
          TEST_QUERIES.constitutional.map(q => transformationService.transformQuery(q))
        );

        const duration = Date.now() - start;

        expect(results.length).toBe(TEST_QUERIES.constitutional.length);
        expect(duration).toBeLessThan(TEST_QUERIES.constitutional.length * 500);
      });

      it('should process all civil law queries efficiently', async () => {
        const start = Date.now();

        const results = await Promise.all(
          TEST_QUERIES.civilLaw.map(q => transformationService.transformQuery(q))
        );

        const duration = Date.now() - start;

        expect(results.length).toBe(TEST_QUERIES.civilLaw.length);
        expect(duration).toBeLessThan(TEST_QUERIES.civilLaw.length * 500);
      });
    });
  });

  // ==========================================================================
  // 7. COVERAGE & ACCURACY TESTS
  // ==========================================================================

  describe('7. Coverage and Accuracy Tests', () => {
    describe('7.1 Transformation Accuracy', () => {
      it('should achieve >95% accuracy on simple queries', async () => {
        let successCount = 0;

        for (const query of SIMPLE_QUERIES) {
          const result = await transformationService.transformQuery(query);
          if (result.confidence > 0.7 && result.filters.keywords && result.filters.keywords.length > 0) {
            successCount++;
          }
        }

        const accuracy = successCount / SIMPLE_QUERIES.length;
        expect(accuracy).toBeGreaterThan(0.95);
      });

      it('should achieve >90% entity extraction precision', async () => {
        const allQueries = [
          ...TEST_QUERIES.constitutional,
          ...TEST_QUERIES.civilLaw.slice(0, 5),
          ...TEST_QUERIES.criminalLaw.slice(0, 5)
        ];

        let totalEntities = 0;
        let highConfidenceEntities = 0;

        for (const query of allQueries) {
          const result = await transformationService.transformQuery(query);
          totalEntities += result.entities.length;
          highConfidenceEntities += result.entities.filter(e => e.confidence > 0.7).length;
        }

        const precision = highConfidenceEntities / totalEntities;
        expect(precision).toBeGreaterThan(0.9);
      });
    });

    describe('7.2 Response Time Compliance', () => {
      it('should meet <2s end-to-end response time target', async () => {
        const testQueries = [
          ...SIMPLE_QUERIES,
          ...COMPLEX_QUERIES.slice(0, 5)
        ];

        let compliantCount = 0;

        for (const query of testQueries) {
          const start = Date.now();
          await transformationService.transformQuery(query);
          const duration = Date.now() - start;

          if (duration < 2000) {
            compliantCount++;
          }
        }

        const compliance = compliantCount / testQueries.length;
        expect(compliance).toBeGreaterThan(0.95);
      });
    });

    describe('7.3 Test Query Coverage', () => {
      it('should successfully process 100+ test queries', async () => {
        const allQueries = [
          ...SIMPLE_QUERIES,
          ...TEST_QUERIES.constitutional,
          ...TEST_QUERIES.civilLaw,
          ...TEST_QUERIES.criminalLaw,
          ...TEST_QUERIES.laborLaw,
          ...TEST_QUERIES.administrativeLaw,
          ...TEST_QUERIES.taxLaw,
          ...TEST_QUERIES.environmentalLaw,
          ...TEST_QUERIES.dateQueries,
          ...TEST_QUERIES.jurisdictionQueries
        ];

        expect(allQueries.length).toBeGreaterThan(100);

        let successCount = 0;

        for (const query of allQueries) {
          try {
            const result = await transformationService.transformQuery(query);
            if (result && result.filters) {
              successCount++;
            }
          } catch (error) {
            // Log but continue
            console.error(`Failed query: ${query}`, error);
          }
        }

        const successRate = successCount / allQueries.length;
        expect(successRate).toBeGreaterThan(0.95);
      });
    });
  });

  // ==========================================================================
  // 8. LEGAL DOMAIN SPECIFIC TESTS
  // ==========================================================================

  describe('8. Legal Domain Specific Tests', () => {
    describe('8.1 Ecuadorian Legal System Coverage', () => {
      it('should handle all major codes', async () => {
        const codes = [
          'Constitución',
          'Código Civil',
          'COIP',
          'Código del Trabajo',
          'Código Tributario',
          'Código de Comercio'
        ];

        for (const code of codes) {
          const result = await transformationService.transformQuery(`buscar ${code}`);
          expect(result.entities.length).toBeGreaterThan(0);
        }
      });

      it('should handle all jurisdiction levels', async () => {
        const jurisdictions = ['nacional', 'provincial', 'municipal'];

        for (const jurisdiction of jurisdictions) {
          const result = await transformationService.transformQuery(`leyes ${jurisdiction}`);
          expect(result.filters.jurisdiction).toContain(jurisdiction);
        }
      });

      it('should handle all norm types', async () => {
        const normTypes = [
          'ley',
          'decreto',
          'resolución',
          'ordenanza',
          'acuerdo'
        ];

        for (const normType of normTypes) {
          const result = await transformationService.transformQuery(`buscar ${normType}`);
          expect(result.filters.normType).toContain(normType);
        }
      });
    });

    describe('8.2 Legal Terminology Recognition', () => {
      it('should recognize legal concepts', async () => {
        const concepts = [
          'derechos humanos',
          'garantías constitucionales',
          'debido proceso',
          'tutela judicial efectiva',
          'seguridad jurídica'
        ];

        for (const concept of concepts) {
          const result = await transformationService.transformQuery(concept);
          expect(result.filters.keywords?.some(k => concept.includes(k))).toBe(true);
        }
      });

      it('should recognize institutions', async () => {
        const institutions = [
          'Corte Constitucional',
          'Corte Nacional de Justicia',
          'Asamblea Nacional',
          'Presidencia',
          'SRI',
          'IESS'
        ];

        for (const institution of institutions) {
          const result = await transformationService.transformQuery(`normativa ${institution}`);
          expect(result.entities.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
