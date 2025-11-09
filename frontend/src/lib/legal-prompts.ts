// Legal-specific AI prompts organized by case type

import { LegalType } from './design-tokens';

// Re-export types for convenience
export type { LegalType };
export type PromptCategory = 'analysis' | 'drafting' | 'research' | 'strategy' | 'compliance' | 'search' | 'document' | 'citation';

export interface PromptTemplate {
  id: string;
  label: string;
  prompt: string;
  category: PromptCategory;
  icon: string;
}

export const legalPromptsByType: Record<LegalType, PromptTemplate[]> = {
  civil: [
    {
      id: 'civil-analyze',
      label: 'Analizar fundamentos jurídicos',
      prompt: 'Analiza los fundamentos jurídicos para esta demanda civil. Identifica los artículos del Código Civil aplicables y proporciona argumentos legales sólidos.',
      category: 'analysis',
      icon: '📊',
    },
    {
      id: 'civil-jurisprudence',
      label: 'Buscar jurisprudencia',
      prompt: 'Encuentra jurisprudencia relevante sobre [tema específico] en casos civiles ecuatorianos. Prioriza sentencias de la Corte Nacional de Justicia.',
      category: 'search',
      icon: '🔍',
    },
    {
      id: 'civil-response',
      label: 'Generar contestación',
      prompt: 'Genera un escrito de contestación a la demanda civil basado en los documentos del caso. Incluye fundamentos de hecho y derecho.',
      category: 'document',
      icon: '📝',
    },
    {
      id: 'civil-articles',
      label: 'Artículos del Código Civil',
      prompt: '¿Qué artículos del Código Civil ecuatoriano aplican a este caso? Proporciona análisis detallado de cada artículo relevante.',
      category: 'citation',
      icon: '📚',
    },
  ],
  penal: [
    {
      id: 'penal-elements',
      label: 'Analizar elementos del tipo penal',
      prompt: 'Analiza los elementos del tipo penal en este caso. Identifica si se configuran todos los elementos objetivos y subjetivos del delito.',
      category: 'analysis',
      icon: '📊',
    },
    {
      id: 'penal-mitigating',
      label: 'Buscar atenuantes',
      prompt: 'Encuentra circunstancias atenuantes aplicables según el COIP. Analiza todas las posibilidades para reducir la pena.',
      category: 'search',
      icon: '🔍',
    },
    {
      id: 'penal-defense',
      label: 'Generar escrito de defensa',
      prompt: 'Genera un escrito de defensa penal profesional. Incluye teoría del caso, análisis de pruebas y argumentos jurídicos.',
      category: 'document',
      icon: '📝',
    },
    {
      id: 'penal-coip',
      label: 'Artículos del COIP',
      prompt: '¿Qué dice el Código Orgánico Integral Penal (COIP) sobre [delito específico]? Proporciona análisis completo.',
      category: 'citation',
      icon: '📚',
    },
  ],
  laboral: [
    {
      id: 'laboral-calculation',
      label: 'Calcular indemnizaciones',
      prompt: 'Calcula las indemnizaciones laborales según el Código de Trabajo ecuatoriano. Incluye despido intempestivo, utilidades, vacaciones no gozadas y décimos.',
      category: 'analysis',
      icon: '💰',
    },
    {
      id: 'laboral-dismissal',
      label: 'Analizar despido',
      prompt: 'Analiza si el despido fue intempestivo según el Código de Trabajo. Evalúa las circunstancias y las posibles reclamaciones.',
      category: 'analysis',
      icon: '📊',
    },
    {
      id: 'laboral-claim',
      label: 'Generar demanda laboral',
      prompt: 'Genera una demanda laboral por despido intempestivo. Incluye cálculo de indemnizaciones y fundamentos legales.',
      category: 'document',
      icon: '📝',
    },
    {
      id: 'laboral-jurisprudence',
      label: 'Jurisprudencia laboral',
      prompt: 'Encuentra jurisprudencia sobre acoso laboral y derechos del trabajador en Ecuador.',
      category: 'search',
      icon: '🔍',
    },
  ],
  constitucional: [
    {
      id: 'const-protection',
      label: 'Acción de protección',
      prompt: 'Analiza si procede una acción de protección. Identifica qué derechos constitucionales fueron vulnerados.',
      category: 'analysis',
      icon: '📊',
    },
    {
      id: 'const-articles',
      label: 'Artículos constitucionales',
      prompt: 'Encuentra los artículos de la Constitución de Ecuador que protegen [derecho específico]. Proporciona análisis jurisprudencial.',
      category: 'citation',
      icon: '📚',
    },
    {
      id: 'const-action',
      label: 'Generar acción',
      prompt: 'Genera una acción de protección constitucional. Incluye fundamentos de vulneración de derechos y petitorio.',
      category: 'document',
      icon: '📝',
    },
    {
      id: 'const-precedent',
      label: 'Precedentes constitucionales',
      prompt: 'Busca precedentes de la Corte Constitucional sobre casos similares. Analiza la línea jurisprudencial.',
      category: 'search',
      icon: '🔍',
    },
  ],
  transito: [
    {
      id: 'transito-liability',
      label: 'Analizar responsabilidad',
      prompt: 'Analiza la responsabilidad civil y penal en este accidente de tránsito según la Ley de Tránsito ecuatoriana.',
      category: 'analysis',
      icon: '📊',
    },
    {
      id: 'transito-damages',
      label: 'Calcular daños',
      prompt: 'Calcula los daños materiales y morales reclamables en este caso de tránsito. Incluye lucro cesante y daño emergente.',
      category: 'analysis',
      icon: '💰',
    },
    {
      id: 'transito-claim',
      label: 'Generar reclamo',
      prompt: 'Genera un reclamo por daños de tránsito. Incluye descripción del accidente, responsabilidad y cuantificación de daños.',
      category: 'document',
      icon: '📝',
    },
    {
      id: 'transito-law',
      label: 'Ley de Tránsito',
      prompt: '¿Qué establece la Ley Orgánica de Transporte Terrestre sobre [tema específico]? Proporciona análisis completo.',
      category: 'citation',
      icon: '📚',
    },
  ],
  administrativo: [
    {
      id: 'admin-procedure',
      label: 'Analizar procedimiento',
      prompt: 'Analiza el procedimiento administrativo aplicable. Verifica si se respetó el debido proceso y los plazos legales.',
      category: 'analysis',
      icon: '📊',
    },
    {
      id: 'admin-appeal',
      label: 'Generar recurso',
      prompt: 'Genera un recurso administrativo contra el acto impugnado. Incluye vicios de nulidad y fundamentos legales.',
      category: 'document',
      icon: '📝',
    },
    {
      id: 'admin-jurisprudence',
      label: 'Jurisprudencia administrativa',
      prompt: 'Busca jurisprudencia del Tribunal Contencioso Administrativo sobre casos similares.',
      category: 'search',
      icon: '🔍',
    },
    {
      id: 'admin-law',
      label: 'Normativa administrativa',
      prompt: '¿Qué normativa administrativa regula este caso? Identifica leyes, reglamentos y ordenanzas aplicables.',
      category: 'citation',
      icon: '📚',
    },
  ],
};

export const generalPrompts: PromptTemplate[] = [
  {
    id: 'general-search',
    label: 'Búsqueda semántica',
    prompt: 'Busca información sobre [tema] en los documentos del caso y en la base de conocimiento legal.',
    category: 'search',
    icon: '🔍',
  },
  {
    id: 'general-summarize',
    label: 'Resumir documentos',
    prompt: 'Resume los documentos clave del caso y extrae los puntos más importantes.',
    category: 'analysis',
    icon: '📋',
  },
  {
    id: 'general-timeline',
    label: 'Cronología de eventos',
    prompt: 'Crea una cronología detallada de los eventos del caso basándote en los documentos disponibles.',
    category: 'analysis',
    icon: '📅',
  },
  {
    id: 'general-citations',
    label: 'Verificar citas legales',
    prompt: 'Verifica y valida todas las citas legales presentes en los documentos. Identifica si hay errores o referencias incompletas.',
    category: 'citation',
    icon: '✓',
  },
];

export function getPromptsForLegalType(legalType: LegalType): PromptTemplate[] {
  return legalPromptsByType[legalType] || generalPrompts;
}

export function getPromptsByCategory(
  legalType: LegalType,
  category: PromptTemplate['category']
): PromptTemplate[] {
  const prompts = getPromptsForLegalType(legalType);
  return prompts.filter((p) => p.category === category);
}
