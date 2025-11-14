/**
 * Ecuadorian Legal Citation Validator
 * Validates legal citations and checks their current status
 */

import { ParsedCitation, CitationValidity } from '../../types/citations.types';

export class CitationValidator {
  private validationCache: Map<string, CitationValidity>;

  constructor() {
    this.validationCache = new Map();
  }

  async validate(citation: ParsedCitation): Promise<boolean> {
    // Basic structural validation
    if (!this.isStructurallyValid(citation)) {
      return false;
    }

    // Validate citation components based on type
    switch (citation.type) {
      case 'law':
        return this.validateLaw(citation);
      case 'decree':
        return this.validateDecree(citation);
      case 'constitutional_court':
        return this.validateConstitutionalCourt(citation);
      case 'supreme_court':
        return this.validateSupremeCourt(citation);
      case 'resolution':
        return this.validateResolution(citation);
      case 'article':
        return this.validateArticle(citation);
      case 'code':
        return this.validateCode(citation);
      default:
        return true; // Accept other types with basic validation
    }
  }

  private isStructurallyValid(citation: ParsedCitation): boolean {
    // Check basic structure
    if (!citation.raw || citation.raw.trim().length === 0) {
      return false;
    }

    if (!citation.type || !citation.normalizedForm) {
      return false;
    }

    return true;
  }

  private validateLaw(citation: ParsedCitation): boolean {
    const { number, year } = citation.components;

    if (!number || !year) {
      return false;
    }

    // Validate year range (Ecuadorian laws - República del Ecuador desde 1830)
    const yearNum = parseInt(year);
    if (yearNum < 1830 || yearNum > new Date().getFullYear()) {
      return false;
    }

    // Validate law number format (numeric)
    if (!/^\d+$/.test(number)) {
      return false;
    }

    return true;
  }

  private validateDecree(citation: ParsedCitation): boolean {
    const { number, year } = citation.components;

    if (!number || !year) {
      return false;
    }

    // Validate year range (Ecuador)
    const yearNum = parseInt(year);
    if (yearNum < 1830 || yearNum > new Date().getFullYear()) {
      return false;
    }

    // Validate decree number format
    if (!/^\d+$/.test(number)) {
      return false;
    }

    return true;
  }

  private validateConstitutionalCourt(citation: ParsedCitation): boolean {
    const { type, number, year } = citation.components;

    if (!type || !number || !year) {
      return false;
    }

    // Ecuador: Corte Constitucional
    if (!/^[0-9\-]+$/.test(number)) {
      return false;
    }

    // Validate year (Corte Constitucional de Ecuador desde 2008)
    const yearNum = parseInt(year);
    const fullYear = yearNum < 100 ? 2000 + yearNum : yearNum;

    if (fullYear < 2008 || fullYear > new Date().getFullYear()) {
      return false;
    }

    return true;
  }

  private validateSupremeCourt(citation: ParsedCitation): boolean {
    const { number, day, month, year } = citation.components;

    if (!number || !year) {
      return false;
    }

    // Validate year (Corte Nacional de Justicia de Ecuador)
    const yearNum = parseInt(year);
    if (yearNum < 1830 || yearNum > new Date().getFullYear()) {
      return false;
    }

    return true;
  }

  private validateResolution(citation: ParsedCitation): boolean {
    const { number, year } = citation.components;

    if (!number || !year) {
      return false;
    }

    // Validate year (Ecuador)
    const yearNum = parseInt(year);
    if (yearNum < 1830 || yearNum > new Date().getFullYear()) {
      return false;
    }

    return true;
  }

  private validateArticle(citation: ParsedCitation): boolean {
    const { article } = citation.components;

    if (!article) {
      return false;
    }

    // Article must be numeric
    if (!/^\d+$/.test(article)) {
      return false;
    }

    return true;
  }

  private validateCode(citation: ParsedCitation): boolean {
    const { type } = citation.components;

    if (!type) {
      return false;
    }

    // Valid code types
    const validCodes = [
      'Civil',
      'Comercial',
      'Penal',
      'Laboral',
      'Contencioso Administrativo',
      'Procedimiento Civil',
      'Procedimiento Penal'
    ];

    return validCodes.some(code =>
      type.toLowerCase().includes(code.toLowerCase())
    );
  }

  async checkValidity(citation: ParsedCitation): Promise<CitationValidity> {
    const cacheKey = citation.normalizedForm;

    // Check cache first
    if (this.validationCache.has(cacheKey)) {
      const cached = this.validationCache.get(cacheKey)!;
      // Cache valid for 7 days
      if (Date.now() - cached.lastChecked.getTime() < 7 * 24 * 60 * 60 * 1000) {
        return cached;
      }
    }

    // Default validity status
    const validity: CitationValidity = {
      isValid: await this.validate(citation),
      status: 'unknown',
      lastChecked: new Date(),
      source: 'internal_validation'
    };

    // Cache result
    this.validationCache.set(cacheKey, validity);

    return validity;
  }

  clearCache(): void {
    this.validationCache.clear();
  }
}
