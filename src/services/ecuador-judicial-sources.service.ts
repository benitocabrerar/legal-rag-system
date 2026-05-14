/**
 * Ecuador Judicial Sources Service
 *
 * Catálogo curado de fuentes oficiales ecuatorianas más allá del
 * Registro Oficial: organismos legislativos, judiciales y de control
 * que producen instrumentos jurídicos vinculantes o de alta relevancia
 * para la práctica.
 *
 * Cada fuente tiene una URL de búsqueda pre-rellenable. No scrapeamos
 * masivamente (cada sitio tiene su formato propio que cambia), sino
 * que orientamos al abogado al buscador oficial con su query.
 *
 * Cuando aplique, se marca con `hasIntegratedSearch=true` las fuentes
 * que en el futuro podrían integrarse al pipeline de ingesta automática.
 */

export interface EcuadorJudicialSource {
  id: string;
  name: string;
  shortName: string;
  type: 'legislativo' | 'judicial' | 'constitucional' | 'control' | 'administrativo';
  icon: string;
  baseUrl: string;
  searchUrl: (q: string) => string;
  description: string;
  documentTypes: string[];      // qué tipos de instrumentos produce
  isOfficialAuthoritative: boolean;  // ¿es fuente primaria o secundaria?
  hasIntegratedSearch?: boolean;     // futuro: ¿podríamos ingestar de aquí?
  notes?: string;
}

export const ECUADOR_JUDICIAL_SOURCES: EcuadorJudicialSource[] = [
  // ════ Asamblea Nacional ════
  {
    id: 'asamblea-leyes-aprobadas',
    name: 'Leyes Aprobadas · Asamblea Nacional del Ecuador',
    shortName: 'Asamblea · Leyes',
    type: 'legislativo',
    icon: '🏛️',
    baseUrl: 'https://www.asambleanacional.gob.ec/es/leyes-aprobadas',
    searchUrl: (q) => `https://www.asambleanacional.gob.ec/es/leyes-aprobadas?title=${encodeURIComponent(q)}`,
    description: 'Listado oficial de leyes aprobadas por la Asamblea Nacional desde 2013, con PDF descargable. Cubre leyes orgánicas, ordinarias y reformatorias.',
    documentTypes: ['ley_organica', 'ley_ordinaria', 'reforma_legal'],
    isOfficialAuthoritative: true,
    hasIntegratedSearch: true,
    notes: 'PDFs en patrón estable asambleanacional.gob.ec/es/system/files/ro_*.pdf — candidatos a integración con el pipeline de ingesta.',
  },
  {
    id: 'asamblea-proyectos',
    name: 'Proyectos de Ley en Trámite · Asamblea Nacional',
    shortName: 'Asamblea · Proyectos',
    type: 'legislativo',
    icon: '📋',
    baseUrl: 'https://www.asambleanacional.gob.ec/es/proyectos-de-ley',
    searchUrl: (q) => `https://www.asambleanacional.gob.ec/es/proyectos-de-ley?title=${encodeURIComponent(q)}`,
    description: 'Proyectos de ley en discusión legislativa. Útil para anticipar cambios normativos antes de su aprobación.',
    documentTypes: ['proyecto_ley'],
    isOfficialAuthoritative: false,
    notes: 'No vinculante pero estratégico para planificación. Sin valor jurídico hasta aprobación + publicación en RO.',
  },

  // ════ Corte Constitucional ════
  {
    id: 'corte-const-sentencias',
    name: 'Sentencias · Corte Constitucional del Ecuador',
    shortName: 'CC · Sentencias',
    type: 'constitucional',
    icon: '⚖️',
    baseUrl: 'https://www.corteconstitucional.gob.ec/',
    searchUrl: (q) => `https://www.corteconstitucional.gob.ec/buscador-de-sentencias/?busqueda=${encodeURIComponent(q)}`,
    description: 'Sentencias de control concreto y abstracto de constitucionalidad, acciones de protección, hábeas corpus, hábeas data, acceso a información pública.',
    documentTypes: ['sentencia_constitucional', 'dictamen', 'jurisprudencia_vinculante'],
    isOfficialAuthoritative: true,
    notes: 'Las sentencias de la CC con efectos generales (erga omnes) tienen carácter vinculante para todos los operadores jurídicos.',
  },
  {
    id: 'corte-const-jurisprudencia',
    name: 'Jurisprudencia Vinculante · Corte Constitucional',
    shortName: 'CC · Jurisprudencia',
    type: 'constitucional',
    icon: '📚',
    baseUrl: 'https://www.corteconstitucional.gob.ec/jurisprudencia/',
    searchUrl: (q) => `https://www.corteconstitucional.gob.ec/jurisprudencia/?busqueda=${encodeURIComponent(q)}`,
    description: 'Líneas jurisprudenciales consolidadas de la CC sobre derechos fundamentales, garantías jurisdiccionales y control constitucional.',
    documentTypes: ['jurisprudencia_vinculante'],
    isOfficialAuthoritative: true,
  },

  // ════ Función Judicial — Corte Nacional ════
  {
    id: 'cnj-resoluciones',
    name: 'Resoluciones · Corte Nacional de Justicia',
    shortName: 'CNJ · Resoluciones',
    type: 'judicial',
    icon: '⚖️',
    baseUrl: 'https://www.cortenacional.gob.ec/cnj/',
    searchUrl: (q) => `https://www.cortenacional.gob.ec/cnj/index.php/component/search/?searchword=${encodeURIComponent(q)}`,
    description: 'Resoluciones generales del Pleno de la Corte Nacional, jurisprudencia obligatoria sobre interpretación de la ley, líneas jurisprudenciales por sala (penal, civil, laboral, administrativo).',
    documentTypes: ['resolucion_cnj', 'jurisprudencia_vinculante_cnj', 'absolucion_consulta'],
    isOfficialAuthoritative: true,
    notes: 'Las resoluciones del Pleno con triple reiteración son jurisprudencia obligatoria para todos los jueces (art. 182 COFJ).',
  },
  {
    id: 'cnj-jurisprudencia-buscador',
    name: 'Buscador de Jurisprudencia · CNJ',
    shortName: 'CNJ · Búsqueda',
    type: 'judicial',
    icon: '🔍',
    baseUrl: 'https://www.cortenacional.gob.ec/cnj/index.php/jurisprudencia',
    searchUrl: (q) => `https://www.cortenacional.gob.ec/cnj/index.php/jurisprudencia?searchword=${encodeURIComponent(q)}`,
    description: 'Búsqueda libre en repositorio de jurisprudencia de la CNJ por palabras clave, número de causa, magistrado ponente, materia.',
    documentTypes: ['jurisprudencia_vinculante_cnj'],
    isOfficialAuthoritative: true,
  },

  // ════ Función Judicial — Cortes Provinciales y Tribunales ════
  {
    id: 'funcion-judicial-consulta-causas',
    name: 'Consulta de Causas · Función Judicial',
    shortName: 'eSATJE · Causas',
    type: 'judicial',
    icon: '📂',
    baseUrl: 'https://www.funcionjudicial.gob.ec/index.php/consulta-de-causas',
    searchUrl: (q) => `https://procesosjudiciales.funcionjudicial.gob.ec/busqueda-filtros`,
    description: 'Consulta pública de causas judiciales en trámite y archivadas. Búsqueda por número de causa, partes procesales, fecha.',
    documentTypes: ['providencia', 'auto', 'sentencia'],
    isOfficialAuthoritative: true,
    notes: 'Sistema eSATJE de la Función Judicial. Acceso público a expedientes (con limitaciones de privacidad).',
  },
  {
    id: 'tca-tribunal-contencioso',
    name: 'Tribunales Contencioso-Administrativos',
    shortName: 'TDCA',
    type: 'administrativo',
    icon: '🏛️',
    baseUrl: 'https://www.funcionjudicial.gob.ec/',
    searchUrl: (q) => `https://www.google.com/search?q=site%3Afuncionjudicial.gob.ec+contencioso+administrativo+${encodeURIComponent(q)}`,
    description: 'Sala de lo Contencioso Administrativo de la CNJ y Tribunales Distritales. Resuelve impugnación de actos administrativos.',
    documentTypes: ['sentencia_administrativa'],
    isOfficialAuthoritative: true,
    notes: 'Búsqueda actualmente vía Google site-restricted porque no hay buscador unificado para TDCA distritales.',
  },
  {
    id: 'tribunal-fiscal',
    name: 'Tribunal Distrital de lo Fiscal',
    shortName: 'TDF',
    type: 'administrativo',
    icon: '💰',
    baseUrl: 'https://www.funcionjudicial.gob.ec/',
    searchUrl: (q) => `https://www.google.com/search?q=site%3Afuncionjudicial.gob.ec+tribunal+fiscal+${encodeURIComponent(q)}`,
    description: 'Tribunales fiscales que resuelven controversias tributarias en primera instancia. Cabe recurso de casación a la CNJ.',
    documentTypes: ['sentencia_fiscal'],
    isOfficialAuthoritative: true,
  },

  // ════ Organismos de Control ════
  {
    id: 'contraloria-resoluciones',
    name: 'Contraloría General del Estado',
    shortName: 'CGE',
    type: 'control',
    icon: '📊',
    baseUrl: 'https://www.contraloria.gob.ec/',
    searchUrl: (q) => `https://www.contraloria.gob.ec/Buscador?q=${encodeURIComponent(q)}`,
    description: 'Resoluciones, informes de auditoría, glosas y responsabilidades civiles culposas. Acuerdos sobre contratación pública y control gubernamental.',
    documentTypes: ['resolucion_contraloria', 'informe_auditoria', 'glosa'],
    isOfficialAuthoritative: true,
  },
  {
    id: 'sercop-resoluciones',
    name: 'SERCOP · Servicio Nacional de Contratación Pública',
    shortName: 'SERCOP',
    type: 'control',
    icon: '📋',
    baseUrl: 'https://portal.compraspublicas.gob.ec/sercop/',
    searchUrl: (q) => `https://portal.compraspublicas.gob.ec/sercop/buscar/?q=${encodeURIComponent(q)}`,
    description: 'Resoluciones, normativa secundaria, pliegos modelo, jurisprudencia administrativa en contratación pública.',
    documentTypes: ['resolucion_sercop', 'pliego_modelo', 'directriz'],
    isOfficialAuthoritative: true,
  },
  {
    id: 'sri-resoluciones',
    name: 'SRI · Servicio de Rentas Internas',
    shortName: 'SRI',
    type: 'control',
    icon: '💼',
    baseUrl: 'https://www.sri.gob.ec/',
    searchUrl: (q) => `https://www.sri.gob.ec/web/intersri/buscador?q=${encodeURIComponent(q)}`,
    description: 'Resoluciones tributarias, circulares, oficios, jurisprudencia administrativa fiscal del SRI.',
    documentTypes: ['resolucion_sri', 'circular', 'oficio_doctrina'],
    isOfficialAuthoritative: true,
  },
  {
    id: 'supercias-resoluciones',
    name: 'Superintendencia de Compañías, Valores y Seguros',
    shortName: 'SUPERCIAS',
    type: 'control',
    icon: '🏢',
    baseUrl: 'https://www.supercias.gob.ec/',
    searchUrl: (q) => `https://www.supercias.gob.ec/buscador/?q=${encodeURIComponent(q)}`,
    description: 'Doctrina, resoluciones, circulares en materia societaria, mercado de valores y seguros.',
    documentTypes: ['resolucion_supercias', 'doctrina_societaria'],
    isOfficialAuthoritative: true,
  },
];

export interface EcSuggestion {
  source: EcuadorJudicialSource;
  url: string;
}

export function suggestEcuadorJudicialSources(query: string, typeFilter?: string): EcSuggestion[] {
  let sources = ECUADOR_JUDICIAL_SOURCES;
  if (typeFilter && typeFilter !== 'all') {
    sources = sources.filter((s) => s.type === typeFilter);
  }
  return sources.map((s) => ({
    source: s,
    url: s.searchUrl(query),
  }));
}

export const ECUADOR_JUDICIAL_TYPES = [
  { id: 'all', label: 'Todas las fuentes', icon: '🇪🇨' },
  { id: 'legislativo', label: 'Asamblea Nacional', icon: '🏛️' },
  { id: 'constitucional', label: 'Corte Constitucional', icon: '⚖️' },
  { id: 'judicial', label: 'CNJ · Función Judicial', icon: '📚' },
  { id: 'administrativo', label: 'Tribunales (Contencioso, Fiscal)', icon: '⚒️' },
  { id: 'control', label: 'Organismos de Control', icon: '📊' },
];
