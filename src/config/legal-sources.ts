/**
 * Configuration for Ecuadorian legal sources to scrape
 */

export interface LegalSource {
  id: string;
  name: string;
  url: string;
  type: 'primary' | 'secondary' | 'tertiary';
  priority: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  cronExpression: string;
  isActive: boolean;
  config: {
    searchPattern?: string;
    maxDepth?: number;
    includeSubdomains?: boolean;
    documentTypes?: string[];
    extractMetadata?: boolean;
  };
}

/**
 * Ecuadorian Legal Sources Configuration
 */
export const ECUADORIAN_LEGAL_SOURCES: LegalSource[] = [
  // PRIMARY SOURCES - Highest authority and priority
  {
    id: 'registro-oficial',
    name: 'Registro Oficial del Ecuador',
    url: 'https://www.registroficial.gob.ec',
    type: 'primary',
    priority: 1,
    frequency: 'daily',
    cronExpression: '0 6 * * *', // Daily at 6 AM
    isActive: true,
    config: {
      searchPattern: '*.pdf',
      maxDepth: 3,
      includeSubdomains: false,
      documentTypes: ['law', 'decree', 'regulation', 'resolution'],
      extractMetadata: true
    }
  },
  {
    id: 'asamblea-nacional',
    name: 'Asamblea Nacional del Ecuador',
    url: 'https://www.asambleanacional.gob.ec',
    type: 'primary',
    priority: 1,
    frequency: 'weekly',
    cronExpression: '0 7 * * 1', // Every Monday at 7 AM
    isActive: true,
    config: {
      searchPattern: 'ley|proyecto',
      maxDepth: 2,
      includeSubdomains: false,
      documentTypes: ['law', 'bill', 'reform'],
      extractMetadata: true
    }
  },
  {
    id: 'corte-constitucional',
    name: 'Corte Constitucional del Ecuador',
    url: 'https://www.corteconstitucional.gob.ec',
    type: 'primary',
    priority: 1,
    frequency: 'weekly',
    cronExpression: '0 8 * * 2', // Every Tuesday at 8 AM
    isActive: true,
    config: {
      searchPattern: 'sentencia|jurisprudencia',
      maxDepth: 2,
      includeSubdomains: false,
      documentTypes: ['ruling', 'jurisprudence'],
      extractMetadata: true
    }
  },

  // SECONDARY SOURCES - Important institutions
  {
    id: 'corte-nacional',
    name: 'Corte Nacional de Justicia',
    url: 'https://www.cortenacional.gob.ec',
    type: 'secondary',
    priority: 2,
    frequency: 'weekly',
    cronExpression: '0 9 * * 3', // Every Wednesday at 9 AM
    isActive: true,
    config: {
      searchPattern: 'sentencia|resolución',
      maxDepth: 2,
      includeSubdomains: false,
      documentTypes: ['ruling', 'resolution'],
      extractMetadata: true
    }
  },
  {
    id: 'consejo-judicatura',
    name: 'Consejo de la Judicatura',
    url: 'https://www.funcionjudicial.gob.ec',
    type: 'secondary',
    priority: 2,
    frequency: 'biweekly',
    cronExpression: '0 10 1,15 * *', // 1st and 15th of month at 10 AM
    isActive: true,
    config: {
      searchPattern: 'resolución|circular',
      maxDepth: 2,
      includeSubdomains: false,
      documentTypes: ['resolution', 'circular'],
      extractMetadata: true
    }
  },
  {
    id: 'defensoria-pueblo',
    name: 'Defensoría del Pueblo',
    url: 'https://www.dpe.gob.ec',
    type: 'secondary',
    priority: 2,
    frequency: 'monthly',
    cronExpression: '0 11 1 * *', // First day of month at 11 AM
    isActive: true,
    config: {
      searchPattern: 'informe|resolución',
      maxDepth: 2,
      includeSubdomains: false,
      documentTypes: ['report', 'resolution'],
      extractMetadata: true
    }
  },
  {
    id: 'contraloria',
    name: 'Contraloría General del Estado',
    url: 'https://www.contraloria.gob.ec',
    type: 'secondary',
    priority: 2,
    frequency: 'monthly',
    cronExpression: '0 12 5 * *', // 5th day of month at 12 PM
    isActive: true,
    config: {
      searchPattern: 'informe|acuerdo',
      maxDepth: 2,
      includeSubdomains: false,
      documentTypes: ['report', 'agreement'],
      extractMetadata: true
    }
  },

  // TERTIARY SOURCES - Regulatory agencies
  {
    id: 'sri',
    name: 'Servicio de Rentas Internas',
    url: 'https://www.sri.gob.ec',
    type: 'tertiary',
    priority: 3,
    frequency: 'monthly',
    cronExpression: '0 13 10 * *', // 10th day of month at 1 PM
    isActive: true,
    config: {
      searchPattern: 'circular|resolución',
      maxDepth: 2,
      includeSubdomains: false,
      documentTypes: ['circular', 'resolution'],
      extractMetadata: true
    }
  },
  {
    id: 'superintendencia-compañias',
    name: 'Superintendencia de Compañías',
    url: 'https://www.supercias.gob.ec',
    type: 'tertiary',
    priority: 3,
    frequency: 'monthly',
    cronExpression: '0 14 15 * *', // 15th day of month at 2 PM
    isActive: true,
    config: {
      searchPattern: 'resolución|circular',
      maxDepth: 2,
      includeSubdomains: false,
      documentTypes: ['resolution', 'circular'],
      extractMetadata: true
    }
  },
  {
    id: 'superintendencia-bancos',
    name: 'Superintendencia de Bancos',
    url: 'https://www.superbancos.gob.ec',
    type: 'tertiary',
    priority: 3,
    frequency: 'monthly',
    cronExpression: '0 15 20 * *', // 20th day of month at 3 PM
    isActive: true,
    config: {
      searchPattern: 'resolución|circular',
      maxDepth: 2,
      includeSubdomains: false,
      documentTypes: ['resolution', 'circular'],
      extractMetadata: true
    }
  }
];

/**
 * Get legal source by ID
 */
export function getLegalSourceById(id: string): LegalSource | undefined {
  return ECUADORIAN_LEGAL_SOURCES.find(source => source.id === id);
}

/**
 * Get legal sources by type
 */
export function getLegalSourcesByType(type: 'primary' | 'secondary' | 'tertiary'): LegalSource[] {
  return ECUADORIAN_LEGAL_SOURCES.filter(source => source.type === type);
}

/**
 * Get active legal sources
 */
export function getActiveLegalSources(): LegalSource[] {
  return ECUADORIAN_LEGAL_SOURCES.filter(source => source.isActive);
}

/**
 * Get legal sources by frequency
 */
export function getLegalSourcesByFrequency(frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'): LegalSource[] {
  return ECUADORIAN_LEGAL_SOURCES.filter(source => source.frequency === frequency);
}

/**
 * Get legal sources by priority
 */
export function getLegalSourcesByPriority(priority: number): LegalSource[] {
  return ECUADORIAN_LEGAL_SOURCES.filter(source => source.priority === priority);
}

export default ECUADORIAN_LEGAL_SOURCES;
