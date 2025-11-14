/**
 * Query Expansion Service
 * Expands legal search queries with synonyms, related terms, and legal variations
 * Handles Ecuadorian legal terminology and Spanish language processing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface QueryExpansionResult {
  originalQuery: string;
  expandedTerms: string[];
  synonyms: Map<string, string[]>;
  legalVariations: string[];
  confidence: number;
}

export interface QueryExpansionConfig {
  maxExpansions?: number;
  minConfidence?: number;
  includeAcronyms?: boolean;
  includePlurals?: boolean;
  context?: 'general' | 'constitutional' | 'civil' | 'penal' | 'laboral' | 'tributario';
}

/**
 * Legal term synonyms and variations for Ecuadorian law
 */
const LEGAL_SYNONYMS: Record<string, string[]> = {
  // Constitutional terms
  'constitución': ['carta magna', 'norma fundamental', 'ley suprema'],
  'derechos': ['garantías', 'libertades', 'prerrogativas'],
  'garantías': ['derechos fundamentales', 'protecciones constitucionales'],

  // Civil law terms
  'contrato': ['convenio', 'acuerdo', 'pacto'],
  'demanda': ['acción', 'solicitud judicial', 'petición'],
  'sentencia': ['fallo', 'resolución judicial', 'decisión'],
  'juez': ['magistrado', 'juzgador', 'autoridad judicial'],

  // Criminal law terms
  'delito': ['crimen', 'infracción penal', 'ilícito'],
  'pena': ['sanción', 'castigo', 'condena'],
  'procesado': ['acusado', 'imputado', 'indiciado'],
  'fiscalía': ['ministerio público', 'fiscalía general'],

  // Labor law terms
  'trabajador': ['empleado', 'obrero', 'asalariado', 'dependiente'],
  'empleador': ['patrono', 'empresario', 'contratante'],
  'despido': ['terminación laboral', 'cese', 'desahucio'],
  'salario': ['remuneración', 'sueldo', 'retribución', 'paga'],

  // Tax law terms
  'impuesto': ['tributo', 'contribución', 'gravamen'],
  'sri': ['servicio de rentas internas', 'administración tributaria'],
  'iva': ['impuesto al valor agregado'],
  'renta': ['impuesto a la renta', 'ir'],

  // Procedural terms
  'recurso': ['impugnación', 'medio de defensa', 'acción procesal'],
  'apelación': ['alzada', 'recurso de apelación'],
  'casación': ['recurso extraordinario', 'recurso de casación'],
  'amparo': ['acción de protección', 'tutela judicial'],

  // Administrative law
  'resolución': ['acto administrativo', 'decisión administrativa', 'providencia'],
  'decreto': ['decreto ejecutivo', 'reglamento', 'normativa'],
  'funcionario': ['servidor público', 'autoridad', 'empleado público']
};

/**
 * Common legal acronyms in Ecuador
 */
const LEGAL_ACRONYMS: Record<string, string> = {
  'COGEP': 'Código Orgánico General de Procesos',
  'COIP': 'Código Orgánico Integral Penal',
  'COT': 'Código Orgánico Tributario',
  'LOSEP': 'Ley Orgánica del Servicio Público',
  'LOGJCC': 'Ley Orgánica de Garantías Jurisdiccionales y Control Constitucional',
  'SRI': 'Servicio de Rentas Internas',
  'IESS': 'Instituto Ecuatoriano de Seguridad Social',
  'CJ': 'Consejo de la Judicatura',
  'FGE': 'Fiscalía General del Estado',
  'CC': 'Corte Constitucional',
  'CNJ': 'Corte Nacional de Justicia',
  'IVA': 'Impuesto al Valor Agregado',
  'IR': 'Impuesto a la Renta',
  'ICE': 'Impuesto a los Consumos Especiales'
};

/**
 * Reverse acronym mapping
 */
const REVERSE_ACRONYMS: Record<string, string> = Object.fromEntries(
  Object.entries(LEGAL_ACRONYMS).map(([key, value]) => [value.toLowerCase(), key])
);

export class QueryExpansionService {
  private config: Required<QueryExpansionConfig>;

  constructor(config: QueryExpansionConfig = {}) {
    this.config = {
      maxExpansions: config.maxExpansions || 10,
      minConfidence: config.minConfidence || 0.7,
      includeAcronyms: config.includeAcronyms !== undefined ? config.includeAcronyms : true,
      includePlurals: config.includePlurals !== undefined ? config.includePlurals : true,
      context: config.context || 'general'
    };
  }

  /**
   * Expand a search query with synonyms and related terms
   */
  async expandQuery(query: string): Promise<QueryExpansionResult> {
    const originalQuery = query.trim().toLowerCase();
    const words = this.tokenize(originalQuery);

    const expandedTerms: Set<string> = new Set([originalQuery]);
    const synonyms: Map<string, string[]> = new Map();
    const legalVariations: string[] = [];

    // Process each word
    for (const word of words) {
      // 1. Add exact synonyms from dictionary
      const directSynonyms = this.getSynonyms(word);
      if (directSynonyms.length > 0) {
        synonyms.set(word, directSynonyms);
        directSynonyms.forEach(syn => expandedTerms.add(syn));
      }

      // 2. Handle acronyms
      if (this.config.includeAcronyms) {
        const acronymExpansion = this.expandAcronym(word);
        if (acronymExpansion) {
          expandedTerms.add(acronymExpansion);
          legalVariations.push(acronymExpansion);
        }

        // Also check if word is full form of acronym
        const acronymForm = REVERSE_ACRONYMS[word];
        if (acronymForm) {
          expandedTerms.add(acronymForm);
          legalVariations.push(acronymForm);
        }
      }

      // 3. Add plural/singular variations
      if (this.config.includePlurals) {
        const variations = this.getPluralSingularVariations(word);
        variations.forEach(v => expandedTerms.add(v));
      }

      // 4. Check database for learned expansions
      const learnedExpansions = await this.getLearnedExpansions(word);
      learnedExpansions.forEach(exp => expandedTerms.add(exp));
    }

    // 5. Generate phrase variations
    const phraseVariations = this.generatePhraseVariations(originalQuery);
    phraseVariations.forEach(phrase => expandedTerms.add(phrase));

    // Filter and limit results
    const finalExpansions = Array.from(expandedTerms)
      .filter(term => term !== originalQuery)
      .slice(0, this.config.maxExpansions);

    // Calculate confidence based on number of sources
    const confidence = this.calculateConfidence(finalExpansions.length, synonyms.size);

    return {
      originalQuery,
      expandedTerms: finalExpansions,
      synonyms,
      legalVariations,
      confidence
    };
  }

  /**
   * Store successful query expansion for future learning
   */
  async storeExpansion(originalTerm: string, expandedTerms: string[], context?: string): Promise<void> {
    try {
      // Check if expansion already exists
      const existing = await prisma.queryExpansion.findFirst({
        where: {
          originalTerm: originalTerm.toLowerCase(),
          context: context || null
        }
      });

      if (existing) {
        // Update usage count and expanded terms
        await prisma.queryExpansion.update({
          where: { id: existing.id },
          data: {
            expandedTerms: Array.from(new Set([...existing.expandedTerms, ...expandedTerms])),
            usageCount: existing.usageCount + 1,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new expansion
        await prisma.queryExpansion.create({
          data: {
            originalTerm: originalTerm.toLowerCase(),
            expandedTerms,
            context: context || null,
            usageCount: 1
          }
        });
      }
    } catch (error) {
      console.error('Error storing query expansion:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Get learned expansions from database
   */
  private async getLearnedExpansions(term: string): Promise<string[]> {
    try {
      const expansions = await prisma.queryExpansion.findMany({
        where: {
          originalTerm: term.toLowerCase(),
          OR: [
            { context: this.config.context },
            { context: null }
          ]
        },
        orderBy: {
          usageCount: 'desc'
        },
        take: 3
      });

      return expansions.flatMap(exp => exp.expandedTerms);
    } catch (error) {
      console.error('Error fetching learned expansions:', error);
      return [];
    }
  }

  /**
   * Get synonyms for a word
   */
  private getSynonyms(word: string): string[] {
    return LEGAL_SYNONYMS[word.toLowerCase()] || [];
  }

  /**
   * Expand acronym to full form
   */
  private expandAcronym(word: string): string | null {
    const upperWord = word.toUpperCase();
    return LEGAL_ACRONYMS[upperWord] || null;
  }

  /**
   * Generate plural and singular variations
   */
  private getPluralSingularVariations(word: string): string[] {
    const variations: string[] = [];

    // Spanish plural rules
    if (word.endsWith('s')) {
      // Remove 's' for potential singular
      variations.push(word.slice(0, -1));
    } else if (word.endsWith('es')) {
      // Remove 'es' for potential singular
      variations.push(word.slice(0, -2));
    } else {
      // Add plural forms
      if (word.endsWith('z')) {
        variations.push(word.slice(0, -1) + 'ces');
      } else if (/[aeiou]$/.test(word)) {
        variations.push(word + 's');
      } else {
        variations.push(word + 'es');
      }
    }

    return variations;
  }

  /**
   * Generate phrase variations (word order, prepositions)
   */
  private generatePhraseVariations(phrase: string): string[] {
    const variations: string[] = [];
    const words = this.tokenize(phrase);

    if (words.length < 2) {
      return variations;
    }

    // Common legal phrase patterns
    // "derecho de trabajo" -> "derecho laboral", "derecho al trabajo"
    if (words.includes('de')) {
      const deIndex = words.indexOf('de');
      if (deIndex > 0 && deIndex < words.length - 1) {
        // Try removing "de"
        const withoutDe = [...words.slice(0, deIndex), ...words.slice(deIndex + 1)];
        variations.push(withoutDe.join(' '));
      }
    }

    // Add "del/de la/de los/de las" variations
    if (words.includes('del')) {
      variations.push(phrase.replace('del', 'de la'));
      variations.push(phrase.replace('del', 'de los'));
    }

    return variations;
  }

  /**
   * Tokenize query into words
   */
  private tokenize(query: string): string[] {
    // Remove special characters but keep spaces and hyphens
    const cleaned = query.toLowerCase().replace(/[^\wáéíóúñü\s-]/g, ' ');
    return cleaned.split(/\s+/).filter(word => word.length > 0);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(expansionCount: number, synonymCount: number): number {
    if (expansionCount === 0) return 0;

    // Higher confidence if we found multiple types of expansions
    const diversityScore = Math.min(synonymCount / 3, 1.0);
    const volumeScore = Math.min(expansionCount / this.config.maxExpansions, 1.0);

    return (diversityScore * 0.6 + volumeScore * 0.4);
  }

  /**
   * Get popular query expansions for autocomplete suggestions
   */
  async getPopularExpansions(limit: number = 10): Promise<Array<{term: string, count: number}>> {
    try {
      const popular = await prisma.queryExpansion.findMany({
        orderBy: {
          usageCount: 'desc'
        },
        take: limit,
        select: {
          originalTerm: true,
          usageCount: true
        }
      });

      return popular.map(p => ({
        term: p.originalTerm,
        count: p.usageCount
      }));
    } catch (error) {
      console.error('Error fetching popular expansions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const queryExpansionService = new QueryExpansionService();
