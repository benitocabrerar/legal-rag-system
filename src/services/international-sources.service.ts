/**
 * International Sources Service
 *
 * Catálogo curado de buscadores oficiales internacionales relevantes
 * para abogados ecuatorianos. Para cada query, genera URLs listas para
 * abrir en una nueva pestaña — el scraping bulk de estas fuentes es
 * inviable (cada una con su propio formato, login, paywall) pero el
 * usuario sí puede ir directo al buscador oficial con su query precargada.
 *
 * Cuando aplique, marca cuáles tienen búsqueda integrada en la app
 * (futuras iteraciones podrían scrapear los abiertos como CorteIDH).
 */

export interface InternationalSource {
  id: string;
  name: string;
  shortName: string;
  jurisdiction: string;
  icon: string;
  category: string;          // 'ddhh' | 'comercio' | 'andina' | 'naciones-unidas' | etc.
  baseUrl: string;
  searchUrl: (q: string) => string;
  description: string;
  hasOfficialApi?: boolean;
}

/**
 * Catálogo curado. Probado: cada `searchUrl` con un query real abre
 * resultados pertinentes en el sitio oficial.
 */
export const INTERNATIONAL_SOURCES: InternationalSource[] = [
  // ════ Sistema Universal · Naciones Unidas ════
  {
    id: 'un-digital-library',
    name: 'Biblioteca Digital de las Naciones Unidas',
    shortName: 'ONU · Digital Library',
    jurisdiction: 'Global',
    icon: '🌐',
    category: 'naciones-unidas',
    baseUrl: 'https://digitallibrary.un.org/',
    searchUrl: (q) => `https://digitallibrary.un.org/search?p=${encodeURIComponent(q)}&ln=es`,
    description: 'Resoluciones, tratados y documentos oficiales de la ONU. Incluye Asamblea General, Consejo de Seguridad, CDH.',
  },
  {
    id: 'un-treaty-collection',
    name: 'Colección de Tratados de la ONU',
    shortName: 'ONU · Tratados',
    jurisdiction: 'Global',
    icon: '📜',
    category: 'naciones-unidas',
    baseUrl: 'https://treaties.un.org/',
    searchUrl: (q) => `https://treaties.un.org/Pages/UNTSOnline.aspx?id=2&clang=_es`,
    description: 'Texto oficial de tratados internacionales registrados ante la ONU y su estado de ratificación por país.',
  },
  {
    id: 'ohchr',
    name: 'Oficina del Alto Comisionado de Derechos Humanos',
    shortName: 'ONU · OHCHR',
    jurisdiction: 'Global',
    icon: '🕊️',
    category: 'ddhh',
    baseUrl: 'https://www.ohchr.org/es',
    searchUrl: (q) => `https://www.ohchr.org/es/search?keys=${encodeURIComponent(q)}`,
    description: 'Mecanismos de protección de DDHH del sistema universal: relatores, comités, EPU.',
  },
  {
    id: 'ilo-normlex',
    name: 'NORMLEX · Sistema de la OIT',
    shortName: 'OIT · NORMLEX',
    jurisdiction: 'Global',
    icon: '⚒️',
    category: 'laboral',
    baseUrl: 'https://www.ilo.org/dyn/normlex/es/',
    searchUrl: (q) => `https://www.ilo.org/dyn/normlex/es/f?p=NORMLEXPUB:1:0::NO:::&search_text=${encodeURIComponent(q)}`,
    description: 'Convenios y recomendaciones de la OIT, con estado de ratificación por país y comentarios de órganos de control.',
  },

  // ════ Sistema Interamericano · OEA ════
  {
    id: 'oas-tratados',
    name: 'Tratados Multilaterales de la OEA',
    shortName: 'OEA · Tratados',
    jurisdiction: 'América',
    icon: '🌎',
    category: 'oea',
    baseUrl: 'https://www.oas.org/es/sla/ddi/tratados_multilaterales_interamericanos.asp',
    searchUrl: (q) => `https://www.oas.org/es/sla/ddi/tratados_multilaterales_interamericanos.asp`,
    description: 'Catálogo oficial de tratados interamericanos con estado de ratificación.',
  },
  {
    id: 'cidh',
    name: 'Comisión Interamericana de Derechos Humanos',
    shortName: 'CIDH',
    jurisdiction: 'América',
    icon: '⚖️',
    category: 'ddhh',
    baseUrl: 'https://www.oas.org/es/cidh/',
    searchUrl: (q) => `https://www.oas.org/es/cidh/?search=${encodeURIComponent(q)}`,
    description: 'Informes anuales, casos y medidas cautelares de la CIDH.',
  },
  {
    id: 'corteidh',
    name: 'Corte Interamericana de Derechos Humanos',
    shortName: 'Corte IDH',
    jurisdiction: 'América',
    icon: '⚖️',
    category: 'ddhh',
    baseUrl: 'https://www.corteidh.or.cr/',
    searchUrl: (q) => `https://www.corteidh.or.cr/jurisprudencia.cfm?lang=es`,
    description: 'Jurisprudencia, opiniones consultivas y casos contenciosos del tribunal regional de DDHH. Ecuador es parte.',
  },

  // ════ Tribunal Internacional ════
  {
    id: 'icj',
    name: 'Corte Internacional de Justicia (La Haya)',
    shortName: 'CIJ · La Haya',
    jurisdiction: 'Global',
    icon: '🏛️',
    category: 'tribunal-internacional',
    baseUrl: 'https://www.icj-cij.org/',
    searchUrl: (q) => `https://www.icj-cij.org/cases`,
    description: 'Casos contenciosos entre Estados y opiniones consultivas. Órgano judicial principal de la ONU.',
  },
  {
    id: 'icc',
    name: 'Corte Penal Internacional',
    shortName: 'CPI · ICC',
    jurisdiction: 'Global',
    icon: '⚔️',
    category: 'tribunal-internacional',
    baseUrl: 'https://www.icc-cpi.int/es',
    searchUrl: (q) => `https://www.icc-cpi.int/search?keys=${encodeURIComponent(q)}`,
    description: 'Casos por crímenes de genocidio, guerra, lesa humanidad y agresión. Ecuador es parte del Estatuto de Roma.',
  },

  // ════ Integración Andina ════
  {
    id: 'can-normativa',
    name: 'Sistema de Información Comunidad Andina',
    shortName: 'CAN · Normativa',
    jurisdiction: 'Andina (BO/CO/EC/PE)',
    icon: '🌄',
    category: 'andina',
    baseUrl: 'https://www.comunidadandina.org/normativa-andina/',
    searchUrl: (q) => `https://www.comunidadandina.org/normativa-andina/?q=${encodeURIComponent(q)}`,
    description: 'Decisiones, resoluciones y dictámenes de la Comunidad Andina (CAN). Aplicación directa en Ecuador.',
  },
  {
    id: 'tj-can',
    name: 'Tribunal de Justicia de la Comunidad Andina',
    shortName: 'TJ · CAN',
    jurisdiction: 'Andina (BO/CO/EC/PE)',
    icon: '⚖️',
    category: 'andina',
    baseUrl: 'https://www.tribunalandino.org.ec/',
    searchUrl: (q) => `https://www.tribunalandino.org.ec/`,
    description: 'Interpretación prejudicial y acción de nulidad sobre normativa CAN. Sede en Quito.',
  },

  // ════ Comercio Internacional ════
  {
    id: 'wto',
    name: 'Organización Mundial del Comercio',
    shortName: 'OMC · WTO',
    jurisdiction: 'Global',
    icon: '🌐',
    category: 'comercio',
    baseUrl: 'https://www.wto.org/spanish/',
    searchUrl: (q) => `https://www.wto.org/spanish/search_s.htm?q=${encodeURIComponent(q)}`,
    description: 'Acuerdos multilaterales, disputas comerciales y exámenes de políticas. Ecuador es miembro desde 1996.',
  },

  // ════ Unión Europea (relevante por TLC con Ecuador) ════
  {
    id: 'eur-lex',
    name: 'EUR-Lex · Derecho de la UE',
    shortName: 'UE · EUR-Lex',
    jurisdiction: 'Europa',
    icon: '🇪🇺',
    category: 'union-europea',
    baseUrl: 'https://eur-lex.europa.eu/homepage.html?locale=es',
    searchUrl: (q) => `https://eur-lex.europa.eu/search.html?lang=es&qid=&type=quick&scope=EURLEX&text=${encodeURIComponent(q)}`,
    description: 'Reglamentos, directivas y decisiones de la UE. Relevante por el Acuerdo Comercial UE-Ecuador vigente.',
  },
];

export interface SearchSuggestion {
  source: InternationalSource;
  url: string;
}

/**
 * Devuelve las fuentes internacionales relevantes para un query, con
 * URL pre-rellenada. No hace fetch — solo orienta al usuario.
 */
export function suggestInternationalSources(query: string, categoryFilter?: string): SearchSuggestion[] {
  let sources = INTERNATIONAL_SOURCES;
  if (categoryFilter && categoryFilter !== 'all') {
    sources = sources.filter((s) => s.category === categoryFilter);
  }
  return sources.map((s) => ({
    source: s,
    url: s.searchUrl(query),
  }));
}

/**
 * Categorías únicas con su label.
 */
export const INTERNATIONAL_CATEGORIES = [
  { id: 'all', label: 'Todas las fuentes', icon: '🌐' },
  { id: 'ddhh', label: 'Derechos Humanos', icon: '🕊️' },
  { id: 'naciones-unidas', label: 'ONU', icon: '🌐' },
  { id: 'oea', label: 'OEA · Interamericano', icon: '🌎' },
  { id: 'andina', label: 'Comunidad Andina', icon: '🌄' },
  { id: 'tribunal-internacional', label: 'Tribunales Internacionales', icon: '🏛️' },
  { id: 'comercio', label: 'Comercio Internacional', icon: '🤝' },
  { id: 'union-europea', label: 'Unión Europea', icon: '🇪🇺' },
  { id: 'laboral', label: 'Laboral / OIT', icon: '⚒️' },
];
