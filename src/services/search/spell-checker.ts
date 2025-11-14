/**
 * Legal Spell Checker Service
 * Detects and corrects spelling errors in legal search queries
 * Specialized for Ecuadorian legal terminology and Spanish language
 */

export interface SpellCheckResult {
  originalQuery: string;
  correctedQuery: string;
  hasCorrections: boolean;
  corrections: SpellCorrection[];
  confidence: number;
}

export interface SpellCorrection {
  original: string;
  suggested: string;
  position: number;
  confidence: number;
  type: 'spelling' | 'legal_term' | 'acronym';
}

/**
 * Legal dictionary with common Ecuadorian legal terms
 */
const LEGAL_DICTIONARY: Set<string> = new Set([
  // Constitutional
  'constitución', 'constitucional', 'derechos', 'garantías', 'libertades',
  'amparo', 'hábeas', 'corpus', 'data', 'acción', 'protección',

  // Codes
  'código', 'orgánico', 'civil', 'penal', 'procesal', 'tributario',
  'laboral', 'comercio', 'niñez', 'adolescencia',

  // Procedural
  'demanda', 'sentencia', 'resolución', 'auto', 'providencia',
  'citación', 'notificación', 'apelación', 'casación', 'recurso',
  'competencia', 'jurisdicción', 'proceso', 'juicio', 'audiencia',

  // Parties
  'demandante', 'demandado', 'actor', 'accionado', 'tercero',
  'interviniente', 'coadyuvante', 'juez', 'magistrado', 'fiscal',
  'defensor', 'abogado', 'procurador', 'curador',

  // Criminal law
  'delito', 'crimen', 'infracción', 'contravención', 'pena',
  'prisión', 'reclusión', 'multa', 'procesado', 'imputado',
  'acusado', 'víctima', 'ofendido', 'indemnización',

  // Civil law
  'contrato', 'obligación', 'responsabilidad', 'daños', 'perjuicios',
  'indemnización', 'reparación', 'prescripción', 'caducidad',
  'nulidad', 'anulabilidad', 'rescisión', 'resolución',

  // Labor law
  'trabajador', 'empleador', 'salario', 'remuneración', 'despido',
  'visto', 'bueno', 'desahucio', 'indemnización', 'liquidación',
  'contrato', 'jornada', 'horas', 'extras', 'vacaciones',

  // Tax law
  'impuesto', 'tributo', 'contribución', 'renta', 'patrimonio',
  'iva', 'ice', 'sri', 'declaración', 'liquidación', 'recaudación',
  'evasión', 'elusión', 'sanción', 'multa', 'intereses',

  // Property
  'propiedad', 'posesión', 'dominio', 'usufructo', 'servidumbre',
  'hipoteca', 'prenda', 'anticresis', 'registro', 'inscripción',
  'catastro', 'linderos', 'medidas', 'área',

  // Family law
  'matrimonio', 'divorcio', 'separación', 'alimentos', 'custodia',
  'patria', 'potestad', 'régimen', 'bienes', 'sociedad', 'conyugal',
  'filiación', 'adopción', 'tutela', 'curatela',

  // Administrative
  'decreto', 'acuerdo', 'resolución', 'ordenanza', 'reglamento',
  'directriz', 'circular', 'instructivo', 'funcionario', 'servidor',
  'público', 'competencia', 'procedimiento', 'trámite',

  // Commercial
  'sociedad', 'compañía', 'empresa', 'comerciante', 'mercantil',
  'acciones', 'participaciones', 'dividendos', 'balance', 'quiebra',
  'insolvencia', 'concordato', 'liquidación', 'disolución',

  // Documents
  'escritura', 'documento', 'título', 'certificado', 'constancia',
  'acta', 'testimonio', 'copia', 'original', 'auténtico',
  'notarizado', 'protocolizado', 'registro',

  // Institutions
  'corte', 'tribunal', 'juzgado', 'fiscalía', 'defensoría',
  'procuraduría', 'contraloría', 'superintendencia', 'consejo',
  'asamblea', 'congreso', 'presidencia', 'ministerio',

  // Common verbs
  'demandar', 'accionar', 'recurrir', 'apelar', 'impugnar',
  'revocar', 'modificar', 'confirmar', 'anular', 'declarar',
  'ordenar', 'disponer', 'ejecutar', 'cumplir', 'notificar'
]);

/**
 * Common typos and their corrections
 */
const COMMON_TYPOS: Record<string, string> = {
  // Double letters
  'constitucion': 'constitución',
  'resolucion': 'resolución',
  'accion': 'acción',
  'casacion': 'casación',
  'apelacion': 'apelación',
  'declaracion': 'declaración',
  'notificacion': 'notificación',
  'jurisdiccion': 'jurisdicción',
  'prescripcion': 'prescripción',
  'indemnizacion': 'indemnización',

  // Missing accents
  'codigo': 'código',
  'organico': 'orgánico',
  'amparo': 'amparo',
  'habeas': 'hábeas',
  'juicio': 'juicio',
  'termino': 'término',
  'transito': 'tránsito',
  'tramite': 'trámite',
  'publico': 'público',
  'numero': 'número',

  // Common misspellings
  'demandante': 'demandante',
  'demandado': 'demandado',
  'sentecia': 'sentencia',
  'recuso': 'recurso',
  'proseso': 'proceso',
  'jues': 'juez',
  'fiskal': 'fiscal',
  'avogado': 'abogado',

  // Abbreviations
  'cc': 'corte constitucional',
  'cnj': 'corte nacional de justicia',
  'cogep': 'código orgánico general de procesos',
  'coip': 'código orgánico integral penal'
};

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export class SpellCheckerService {
  /**
   * Check and correct spelling in a query
   */
  checkSpelling(query: string): SpellCheckResult {
    const originalQuery = query.trim();
    const words = this.tokenize(originalQuery);
    const corrections: SpellCorrection[] = [];
    let correctedWords: string[] = [];
    let position = 0;

    for (const word of words) {
      const lowerWord = word.toLowerCase();

      // Skip very short words and numbers
      if (lowerWord.length <= 2 || /^\d+$/.test(lowerWord)) {
        correctedWords.push(word);
        position += word.length + 1;
        continue;
      }

      // 1. Check common typos first
      if (COMMON_TYPOS[lowerWord]) {
        corrections.push({
          original: word,
          suggested: COMMON_TYPOS[lowerWord],
          position,
          confidence: 0.95,
          type: 'spelling'
        });
        correctedWords.push(COMMON_TYPOS[lowerWord]);
        position += word.length + 1;
        continue;
      }

      // 2. Check if word is in legal dictionary
      if (LEGAL_DICTIONARY.has(lowerWord)) {
        correctedWords.push(word);
        position += word.length + 1;
        continue;
      }

      // 3. Try to find close matches using Levenshtein distance
      const suggestion = this.findClosestMatch(lowerWord);
      if (suggestion) {
        corrections.push({
          original: word,
          suggested: suggestion.word,
          position,
          confidence: suggestion.confidence,
          type: suggestion.type
        });
        correctedWords.push(suggestion.word);
      } else {
        correctedWords.push(word);
      }

      position += word.length + 1;
    }

    const correctedQuery = correctedWords.join(' ');
    const hasCorrections = corrections.length > 0;
    const confidence = this.calculateOverallConfidence(corrections);

    return {
      originalQuery,
      correctedQuery,
      hasCorrections,
      corrections,
      confidence
    };
  }

  /**
   * Find closest matching word in dictionary
   */
  private findClosestMatch(word: string): { word: string; confidence: number; type: SpellCorrection['type'] } | null {
    let minDistance = Infinity;
    let bestMatch: string | null = null;
    let matchType: SpellCorrection['type'] = 'spelling';

    // Search legal dictionary
    for (const dictWord of Array.from(LEGAL_DICTIONARY)) {
      const distance = levenshteinDistance(word, dictWord);

      // Only consider matches within reasonable edit distance
      if (distance < minDistance && distance <= 2) {
        minDistance = distance;
        bestMatch = dictWord;
        matchType = 'legal_term';
      }
    }

    // Calculate confidence based on edit distance
    if (bestMatch) {
      const confidence = 1 - (minDistance / Math.max(word.length, bestMatch.length));

      // Only return if confidence is high enough
      if (confidence >= 0.6) {
        return {
          word: bestMatch,
          confidence,
          type: matchType
        };
      }
    }

    return null;
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(corrections: SpellCorrection[]): number {
    if (corrections.length === 0) return 1.0;

    const avgConfidence = corrections.reduce((sum, c) => sum + c.confidence, 0) / corrections.length;
    return avgConfidence;
  }

  /**
   * Tokenize query into words
   */
  private tokenize(query: string): string[] {
    // Keep punctuation for better context
    return query.split(/\s+/).filter(word => word.length > 0);
  }

  /**
   * Generate "Did you mean?" suggestion
   */
  generateSuggestion(result: SpellCheckResult): string | null {
    if (!result.hasCorrections) return null;

    return `¿Quisiste decir: "${result.correctedQuery}"?`;
  }

  /**
   * Check if a term is in the legal dictionary
   */
  isLegalTerm(term: string): boolean {
    return LEGAL_DICTIONARY.has(term.toLowerCase());
  }

  /**
   * Add custom term to dictionary (for learning)
   */
  addToDictionary(term: string): void {
    LEGAL_DICTIONARY.add(term.toLowerCase());
  }
}

// Export singleton instance
export const spellCheckerService = new SpellCheckerService();
