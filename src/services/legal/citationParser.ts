/**
 * Ecuadorian Legal Citation Parser
 * Parses and enriches legal citations from Ecuadorian legal documents
 */

import { ParsedCitation, CitationType, CitationComponents } from '../../types/citations.types';
import { CitationValidator } from './citationValidator';

export class EcuadorianCitationParser {
  private patterns: Map<CitationType, RegExp>;
  private validator: CitationValidator;

  constructor() {
    this.validator = new CitationValidator();
    this.patterns = this.initializePatterns();
  }

  private initializePatterns(): Map<CitationType, RegExp> {
    return new Map([
      // Leyes de Ecuador
      ['law', /Ley\s+(Org[áa]nica\s+)?(\d+)\s+de\s+(\d{4})/gi],

      // Decretos de Ecuador
      ['decree', /Decreto\s+(Ejecutivo\s+)?(\d+)\s+de\s+(\d{4})/gi],

      // Sentencias Corte Constitucional de Ecuador
      ['constitutional_court', /Sentencia\s+(?:No\.\s*)?(\d+[\-\w]*)[\/-](\d{2,4})/gi],

      // Sentencias Corte Nacional de Justicia
      ['supreme_court', /Sentencia\s+(\d+)\s+del?\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/gi],

      // Resoluciones
      ['resolution', /Resoluci[óo]n\s+(?:No\.\s*)?(\d+[\-\w]*)\s+de\s+(\d{4})/gi],

      // Conceptos / Oficios
      ['concept', /(?:Concepto|Oficio)\s+(?:No\.\s*)?(\d+[\-\w]*)\s+de\s+(\d{4})/gi],

      // Artículos específicos
      ['article', /[Aa]rt[íi]culo\s+(\d+)(?:\s+numeral\s+(\d+))?/gi],

      // Códigos ecuatorianos
      ['code', /C[óo]digo\s+(Civil|Org[áa]nico\s+General\s+de\s+Procesos|Penal|del\s+Trabajo|Tributario|Org[áa]nico\s+Monetario\s+y\s+Financiero)/gi]
    ]);
  }

  async parseCitations(text: string): Promise<ParsedCitation[]> {
    const citations: ParsedCitation[] = [];
    const processedCitations = new Set<string>();

    for (const [type, pattern] of this.patterns) {
      const matches = text.matchAll(pattern);

      for (const match of matches) {
        const citation = this.buildCitation(type, match);
        const citationKey = this.getCitationKey(citation);

        if (!processedCitations.has(citationKey)) {
          processedCitations.add(citationKey);

          // Validate citation
          const isValid = await this.validator.validate(citation);

          if (isValid) {
            // Enrich with metadata
            const enriched = await this.enrichCitation(citation);
            citations.push(enriched);
          }
        }
      }
    }

    // Sort by position in text
    citations.sort((a, b) => a.position - b.position);

    return citations;
  }

  private buildCitation(type: CitationType, match: RegExpMatchArray): ParsedCitation {
    const citation: ParsedCitation = {
      type,
      raw: match[0],
      position: match.index || 0,
      components: {},
      normalizedForm: '',
      url: null
    };

    switch (type) {
      case 'law':
        citation.components = {
          organic: match[1] ? 'Orgánica' : null,
          number: match[2],
          year: match[3]
        };
        citation.normalizedForm = match[1]
          ? `Ley Orgánica ${match[2]} de ${match[3]}`
          : `Ley ${match[2]} de ${match[3]}`;
        citation.url = this.buildLegalUrl('law', match[2], match[3]);
        break;

      case 'decree':
        citation.components = {
          executive: match[1] ? 'Ejecutivo' : null,
          number: match[2],
          year: match[3]
        };
        citation.normalizedForm = match[1]
          ? `Decreto Ejecutivo ${match[2]} de ${match[3]}`
          : `Decreto ${match[2]} de ${match[3]}`;
        citation.url = this.buildLegalUrl('decree', match[2], match[3]);
        break;

      case 'constitutional_court':
        citation.components = {
          type: 'Sentencia',
          number: match[1],
          year: match[2]
        };
        citation.normalizedForm = `Sentencia ${match[1]}/${match[2]}`;
        citation.url = this.buildLegalUrl('constitutional', match[1], match[2]);
        break;

      case 'supreme_court':
        citation.components = {
          number: match[1],
          day: match[2],
          month: match[3],
          year: match[4]
        };
        citation.normalizedForm = `Sentencia ${match[1]} del ${match[2]} de ${match[3]} de ${match[4]}`;
        citation.url = this.buildLegalUrl('supreme', match[1], match[4]);
        break;

      case 'resolution':
        citation.components = {
          number: match[1],
          year: match[2]
        };
        citation.normalizedForm = `Resolución ${match[1]} de ${match[2]}`;
        citation.url = this.buildLegalUrl('resolution', match[1], match[2]);
        break;

      case 'article':
        citation.components = {
          article: match[1],
          numeral: match[2] || null
        };
        citation.normalizedForm = match[2]
          ? `Artículo ${match[1]} numeral ${match[2]}`
          : `Artículo ${match[1]}`;
        break;

      case 'code':
        citation.components = {
          type: match[1]
        };
        citation.normalizedForm = `Código ${match[1]}`;
        citation.url = this.buildLegalUrl('code', match[1]);
        break;

      default:
        citation.normalizedForm = citation.raw;
    }

    return citation;
  }

  private buildLegalUrl(type: string, ...params: string[]): string {
    // URLs oficiales de Ecuador para documentos legales
    const baseUrls = {
      law: 'https://www.lexis.com.ec/biblioteca/ley',
      decree: 'https://www.presidencia.gob.ec/decretos',
      constitutional: 'https://www.corteconstitucional.gob.ec/sentencias',
      supreme: 'https://www.funcionjudicial.gob.ec/www/jurisprudencia',
      resolution: 'https://www.gobiernoelectronico.gob.ec/resoluciones',
      code: 'https://www.lexis.com.ec/biblioteca/codigo',
      registro: 'https://www.registroficial.gob.ec'
    };

    switch (type) {
      case 'law':
        // Lexis Ecuador - Leyes
        return `${baseUrls.law}/${params[1]}_${params[0]}`;

      case 'decree':
        // Presidencia de la República - Decretos
        return `${baseUrls.decree}/${params[1]}/${params[0]}`;

      case 'constitutional':
        // Corte Constitucional de Ecuador
        return `${baseUrls.constitutional}/${params[1]}/${params[0]}`;

      case 'supreme':
        // Función Judicial - Corte Nacional de Justicia
        return `${baseUrls.supreme}/${params[1]}/${params[0]}`;

      case 'resolution':
        // Registro Oficial / Gobierno Electrónico
        return `${baseUrls.resolution}/${params[1]}/${params[0]}`;

      case 'code':
        // Códigos ecuatorianos en Lexis
        const codeSlug = params[0].toLowerCase()
          .replace(/\s+/g, '-')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        return `${baseUrls.code}/${codeSlug}`;

      default:
        return baseUrls.registro;
    }
  }

  async enrichCitation(citation: ParsedCitation): Promise<ParsedCitation> {
    // Add context and related information
    citation.context = await this.extractContext(citation);
    citation.relatedCitations = await this.findRelatedCitations(citation);
    citation.validity = await this.validator.checkValidity(citation);

    return citation;
  }

  private async extractContext(citation: ParsedCitation): Promise<string> {
    // Context extraction would be implemented based on document analysis
    // For now, return raw text
    return citation.raw;
  }

  private async findRelatedCitations(citation: ParsedCitation): Promise<string[]> {
    // Find related citations in the legal knowledge graph
    // This would query the database for related legal documents
    return [];
  }

  private getCitationKey(citation: ParsedCitation): string {
    return `${citation.type}:${citation.normalizedForm}`;
  }

  /**
   * Extract citation statistics from document
   */
  async getCitationStatistics(text: string): Promise<CitationStatistics> {
    const citations = await this.parseCitations(text);

    const stats: CitationStatistics = {
      total: citations.length,
      byType: {},
      validCitations: 0,
      invalidCitations: 0
    };

    for (const citation of citations) {
      // Count by type
      if (!stats.byType[citation.type]) {
        stats.byType[citation.type] = 0;
      }
      stats.byType[citation.type]++;

      // Count validity
      if (citation.validity?.isValid) {
        stats.validCitations++;
      } else {
        stats.invalidCitations++;
      }
    }

    return stats;
  }
}

interface CitationStatistics {
  total: number;
  byType: Record<CitationType, number>;
  validCitations: number;
  invalidCitations: number;
}
