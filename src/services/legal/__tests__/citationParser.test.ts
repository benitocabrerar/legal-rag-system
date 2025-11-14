/**
 * Ecuadorian Legal Citation Parser Tests
 * Comprehensive test suite for legal citation parsing and validation
 */

import { EcuadorianCitationParser } from '../citationParser';
import { CitationValidator } from '../citationValidator';
import { ParsedCitation, CitationType } from '../../../types/citations.types';

describe('EcuadorianCitationParser', () => {
  let parser: EcuadorianCitationParser;

  beforeEach(() => {
    parser = new EcuadorianCitationParser();
  });

  describe('Law Citations (Leyes)', () => {
    it('should parse ordinary law citation', async () => {
      const text = 'Según la Ley 123 de 2020, se establece...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].type).toBe('law');
      expect(citations[0].components.number).toBe('123');
      expect(citations[0].components.year).toBe('2020');
      expect(citations[0].normalizedForm).toBe('Ley 123 de 2020');
      expect(citations[0].url).toContain('lexis.com.ec');
    });

    it('should parse organic law citation', async () => {
      const text = 'La Ley Orgánica 456 de 2021 establece...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].type).toBe('law');
      expect(citations[0].components.organic).toBe('Orgánica');
      expect(citations[0].components.number).toBe('456');
      expect(citations[0].components.year).toBe('2021');
      expect(citations[0].normalizedForm).toBe('Ley Orgánica 456 de 2021');
    });

    it('should handle multiple law citations in same text', async () => {
      const text = 'La Ley 100 de 2019 y la Ley Orgánica 200 de 2020 establecen...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(2);
      expect(citations[0].components.number).toBe('100');
      expect(citations[1].components.number).toBe('200');
    });
  });

  describe('Decree Citations (Decretos)', () => {
    it('should parse executive decree citation', async () => {
      const text = 'El Decreto Ejecutivo 789 de 2022 dispone...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].type).toBe('decree');
      expect(citations[0].components.executive).toBe('Ejecutivo');
      expect(citations[0].components.number).toBe('789');
      expect(citations[0].components.year).toBe('2022');
      expect(citations[0].normalizedForm).toBe('Decreto Ejecutivo 789 de 2022');
      expect(citations[0].url).toContain('presidencia.gob.ec');
    });

    it('should parse regular decree citation', async () => {
      const text = 'Mediante Decreto 555 de 2021...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].type).toBe('decree');
      expect(citations[0].components.number).toBe('555');
      expect(citations[0].components.year).toBe('2021');
    });
  });

  describe('Constitutional Court Citations', () => {
    it('should parse constitutional court sentence with slash', async () => {
      const text = 'La Sentencia 001-20/2022 de la Corte Constitucional...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].type).toBe('constitutional_court');
      expect(citations[0].components.number).toBe('001-20');
      expect(citations[0].components.year).toBe('2022');
      expect(citations[0].normalizedForm).toBe('Sentencia 001-20/2022');
      expect(citations[0].url).toContain('corteconstitucional.gob.ec');
    });

    it('should parse constitutional court sentence with dash', async () => {
      const text = 'Según Sentencia No. 045-23-2023...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].type).toBe('constitutional_court');
      expect(citations[0].components.number).toBe('045-23');
      expect(citations[0].components.year).toBe('2023');
    });
  });

  describe('Supreme Court Citations (Corte Nacional de Justicia)', () => {
    it('should parse supreme court sentence with full date', async () => {
      const text = 'La Sentencia 123 del 15 de marzo de 2021...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].type).toBe('supreme_court');
      expect(citations[0].components.number).toBe('123');
      expect(citations[0].components.day).toBe('15');
      expect(citations[0].components.month).toBe('marzo');
      expect(citations[0].components.year).toBe('2021');
      expect(citations[0].normalizedForm).toBe('Sentencia 123 del 15 de marzo de 2021');
      expect(citations[0].url).toContain('funcionjudicial.gob.ec');
    });
  });

  describe('Resolution Citations', () => {
    it('should parse resolution citation', async () => {
      const text = 'La Resolución 123-ABC de 2020...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].type).toBe('resolution');
      expect(citations[0].components.number).toBe('123-ABC');
      expect(citations[0].components.year).toBe('2020');
      expect(citations[0].normalizedForm).toBe('Resolución 123-ABC de 2020');
      expect(citations[0].url).toContain('gobiernoelectronico.gob.ec');
    });

    it('should parse resolution without "No."', async () => {
      const text = 'Según Resolución 456 de 2021...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].components.number).toBe('456');
    });
  });

  describe('Article Citations', () => {
    it('should parse simple article citation', async () => {
      const text = 'El artículo 25 establece...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].type).toBe('article');
      expect(citations[0].components.article).toBe('25');
      expect(citations[0].normalizedForm).toBe('Artículo 25');
    });

    it('should parse article with numeral', async () => {
      const text = 'Según el Artículo 10 numeral 3...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].type).toBe('article');
      expect(citations[0].components.article).toBe('10');
      expect(citations[0].components.numeral).toBe('3');
      expect(citations[0].normalizedForm).toBe('Artículo 10 numeral 3');
    });
  });

  describe('Code Citations', () => {
    it('should parse Civil Code citation', async () => {
      const text = 'El Código Civil establece...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].type).toBe('code');
      expect(citations[0].components.type).toBe('Civil');
      expect(citations[0].normalizedForm).toBe('Código Civil');
      expect(citations[0].url).toContain('lexis.com.ec');
    });

    it('should parse Código Orgánico General de Procesos', async () => {
      const text = 'Según el Código Orgánico General de Procesos...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].type).toBe('code');
      expect(citations[0].components.type).toBe('Orgánico General de Procesos');
    });

    it('should parse Penal Code citation', async () => {
      const text = 'El Código Penal dispone...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].components.type).toBe('Penal');
    });
  });

  describe('Concept/Office Citations', () => {
    it('should parse concept citation', async () => {
      const text = 'Según Concepto 123-ABC de 2021...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].type).toBe('concept');
      expect(citations[0].components.number).toBe('123-ABC');
      expect(citations[0].components.year).toBe('2021');
    });

    it('should parse office citation', async () => {
      const text = 'Mediante Oficio No. 456-XYZ de 2022...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].type).toBe('concept');
      expect(citations[0].components.number).toBe('456-XYZ');
    });
  });

  describe('Deduplication', () => {
    it('should not duplicate same citation mentioned multiple times', async () => {
      const text = 'La Ley 123 de 2020 establece... según la Ley 123 de 2020...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].components.number).toBe('123');
    });
  });

  describe('Sorting by Position', () => {
    it('should sort citations by their position in text', async () => {
      const text = 'Ley 200 de 2021... Ley 100 de 2020...';
      const citations = await parser.parseCitations(text);

      expect(citations).toHaveLength(2);
      expect(citations[0].components.number).toBe('200');
      expect(citations[1].components.number).toBe('100');
      expect(citations[0].position).toBeLessThan(citations[1].position);
    });
  });

  describe('Citation Statistics', () => {
    it('should calculate citation statistics correctly', async () => {
      const text = `
        La Ley 100 de 2020 y la Ley 200 de 2021 establecen...
        Decreto Ejecutivo 500 de 2022...
        Artículo 25...
        Código Civil...
      `;

      const stats = await parser.getCitationStatistics(text);

      expect(stats.total).toBe(5);
      expect(stats.byType['law']).toBe(2);
      expect(stats.byType['decree']).toBe(1);
      expect(stats.byType['article']).toBe(1);
      expect(stats.byType['code']).toBe(1);
    });
  });

  describe('Complex Document', () => {
    it('should extract all citations from complex legal text', async () => {
      const text = `
        CONSIDERANDO:

        Que, la Ley Orgánica 123 de 2019 establece el marco regulatorio;
        Que, mediante Decreto Ejecutivo 456 de 2020 se implementó;
        Que, la Sentencia 001-20/2021 de la Corte Constitucional determinó;
        Que, el Código Civil en su artículo 1234 dispone;
        Que, la Resolución 789-XYZ de 2022 aprobó;

        RESUELVE:

        Aplicar lo establecido en el Artículo 25 numeral 3...
      `;

      const citations = await parser.parseCitations(text);

      expect(citations.length).toBeGreaterThanOrEqual(6);

      const types = citations.map(c => c.type);
      expect(types).toContain('law');
      expect(types).toContain('decree');
      expect(types).toContain('constitutional_court');
      expect(types).toContain('code');
      expect(types).toContain('resolution');
      expect(types).toContain('article');
    });
  });
});

describe('CitationValidator', () => {
  let validator: CitationValidator;

  beforeEach(() => {
    validator = new CitationValidator();
  });

  describe('Law Validation', () => {
    it('should validate correct law citation', async () => {
      const citation: ParsedCitation = {
        type: 'law',
        raw: 'Ley 123 de 2020',
        position: 0,
        components: { number: '123', year: '2020' },
        normalizedForm: 'Ley 123 de 2020',
        url: null
      };

      const isValid = await validator.validate(citation);
      expect(isValid).toBe(true);
    });

    it('should reject law with year before Ecuador independence (1830)', async () => {
      const citation: ParsedCitation = {
        type: 'law',
        raw: 'Ley 123 de 1800',
        position: 0,
        components: { number: '123', year: '1800' },
        normalizedForm: 'Ley 123 de 1800',
        url: null
      };

      const isValid = await validator.validate(citation);
      expect(isValid).toBe(false);
    });

    it('should reject law with future year', async () => {
      const citation: ParsedCitation = {
        type: 'law',
        raw: 'Ley 123 de 2099',
        position: 0,
        components: { number: '123', year: '2099' },
        normalizedForm: 'Ley 123 de 2099',
        url: null
      };

      const isValid = await validator.validate(citation);
      expect(isValid).toBe(false);
    });

    it('should reject law with non-numeric number', async () => {
      const citation: ParsedCitation = {
        type: 'law',
        raw: 'Ley ABC de 2020',
        position: 0,
        components: { number: 'ABC', year: '2020' },
        normalizedForm: 'Ley ABC de 2020',
        url: null
      };

      const isValid = await validator.validate(citation);
      expect(isValid).toBe(false);
    });
  });

  describe('Constitutional Court Validation', () => {
    it('should validate constitutional court citation from 2008 onwards', async () => {
      const citation: ParsedCitation = {
        type: 'constitutional_court',
        raw: 'Sentencia 001-20/2020',
        position: 0,
        components: { type: 'Sentencia', number: '001-20', year: '20' },
        normalizedForm: 'Sentencia 001-20/2020',
        url: null
      };

      const isValid = await validator.validate(citation);
      expect(isValid).toBe(true);
    });

    it('should reject constitutional court citation before 2008', async () => {
      const citation: ParsedCitation = {
        type: 'constitutional_court',
        raw: 'Sentencia 001-05/2005',
        position: 0,
        components: { type: 'Sentencia', number: '001-05', year: '05' },
        normalizedForm: 'Sentencia 001-05/2005',
        url: null
      };

      const isValid = await validator.validate(citation);
      expect(isValid).toBe(false);
    });
  });

  describe('Code Validation', () => {
    it('should validate Civil Code', async () => {
      const citation: ParsedCitation = {
        type: 'code',
        raw: 'Código Civil',
        position: 0,
        components: { type: 'Civil' },
        normalizedForm: 'Código Civil',
        url: null
      };

      const isValid = await validator.validate(citation);
      expect(isValid).toBe(true);
    });

    it('should validate Penal Code', async () => {
      const citation: ParsedCitation = {
        type: 'code',
        raw: 'Código Penal',
        position: 0,
        components: { type: 'Penal' },
        normalizedForm: 'Código Penal',
        url: null
      };

      const isValid = await validator.validate(citation);
      expect(isValid).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should cache validation results', async () => {
      const citation: ParsedCitation = {
        type: 'law',
        raw: 'Ley 123 de 2020',
        position: 0,
        components: { number: '123', year: '2020' },
        normalizedForm: 'Ley 123 de 2020',
        url: null
      };

      const validity1 = await validator.checkValidity(citation);
      const validity2 = await validator.checkValidity(citation);

      expect(validity1.lastChecked).toEqual(validity2.lastChecked);
    });

    it('should clear cache correctly', async () => {
      const citation: ParsedCitation = {
        type: 'law',
        raw: 'Ley 123 de 2020',
        position: 0,
        components: { number: '123', year: '2020' },
        normalizedForm: 'Ley 123 de 2020',
        url: null
      };

      await validator.checkValidity(citation);
      validator.clearCache();

      // After clearing cache, new check should create new entry
      const validity = await validator.checkValidity(citation);
      expect(validity).toBeDefined();
    });
  });
});
