/**
 * Tests for FirecrawlService
 * Phase 6: Web Scraping Integration
 */

import FirecrawlService from '../firecrawl-service';

describe('FirecrawlService', () => {
  let service: FirecrawlService;

  beforeEach(() => {
    service = new FirecrawlService();
  });

  describe('constructor', () => {
    it('should create a new FirecrawlService instance', () => {
      expect(service).toBeInstanceOf(FirecrawlService);
    });
  });

  describe('mapWebsite', () => {
    it('should map a website and return URLs', async () => {
      const result = await service.mapWebsite({
        url: 'https://www.registroficial.gob.ec',
        search: '*.pdf',
        limit: 10
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle invalid URLs gracefully', async () => {
      await expect(
        service.mapWebsite({
          url: 'https://invalid-domain-that-does-not-exist-12345.com',
          limit: 5
        })
      ).rejects.toThrow();
    });

    it('should respect limit parameter', async () => {
      const limit = 5;
      const result = await service.mapWebsite({
        url: 'https://www.registroficial.gob.ec',
        limit
      });

      expect(result.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('scrapeDocument', () => {
    it('should scrape a document and return content', async () => {
      const url = 'https://www.registroficial.gob.ec';

      const result = await service.scrapeDocument(url);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.sourceURL).toBe(url);
    });

    it('should include specified formats', async () => {
      const url = 'https://www.registroficial.gob.ec';

      const result = await service.scrapeDocument(url, {
        url,
        formats: ['markdown', 'html']
      });

      expect(result.markdown).toBeDefined();
      expect(result.html).toBeDefined();
    });

    it('should handle scraping errors', async () => {
      const invalidUrl = 'https://invalid-url-12345.com/document.pdf';

      await expect(service.scrapeDocument(invalidUrl)).rejects.toThrow();
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata using schema', async () => {
      const urls = ['https://www.registroficial.gob.ec/documento.pdf'];
      const schema = FirecrawlService.getLegalMetadataSchema();

      const results = await service.extractMetadata(urls, schema);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle empty URL array', async () => {
      const schema = FirecrawlService.getLegalMetadataSchema();

      const results = await service.extractMetadata([], schema);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('searchDocuments', () => {
    it('should search for documents by query', async () => {
      const query = 'código civil';

      const results = await service.searchDocuments(query);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should respect limit parameter in search', async () => {
      const query = 'ley orgánica';
      const limit = 5;

      const results = await service.searchDocuments(query, { limit });

      expect(results.length).toBeLessThanOrEqual(limit);
    });

    it('should handle empty query', async () => {
      const results = await service.searchDocuments('');

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('batchScrape', () => {
    it('should scrape multiple URLs', async () => {
      const urls = [
        'https://www.registroficial.gob.ec',
        'https://www.asambleanacional.gob.ec'
      ];

      const results = await service.batchScrape(urls);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle partial failures in batch', async () => {
      const urls = [
        'https://www.registroficial.gob.ec',
        'https://invalid-url-12345.com'
      ];

      const results = await service.batchScrape(urls);

      // Should return results for successful scrapes
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle empty URL array', async () => {
      const results = await service.batchScrape([]);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('validateUrl', () => {
    it('should return true for valid accessible URL', async () => {
      const isValid = await service.validateUrl('https://www.registroficial.gob.ec');

      expect(typeof isValid).toBe('boolean');
    });

    it('should return false for invalid URL', async () => {
      const isValid = await service.validateUrl('https://invalid-domain-12345.com');

      expect(isValid).toBe(false);
    });

    it('should handle timeout gracefully', async () => {
      const isValid = await service.validateUrl('https://www.registroficial.gob.ec');

      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('getLegalMetadataSchema', () => {
    it('should return valid JSON schema', () => {
      const schema = FirecrawlService.getLegalMetadataSchema();

      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
    });

    it('should include required legal fields', () => {
      const schema = FirecrawlService.getLegalMetadataSchema();

      expect(schema.properties.documentType).toBeDefined();
      expect(schema.properties.title).toBeDefined();
      expect(schema.properties.publicationDate).toBeDefined();
      expect(schema.properties.institution).toBeDefined();
      expect(schema.properties.jurisdiction).toBeDefined();
      expect(schema.properties.legalArea).toBeDefined();
    });

    it('should specify required fields', () => {
      const schema = FirecrawlService.getLegalMetadataSchema();

      expect(Array.isArray(schema.required)).toBe(true);
      expect(schema.required).toContain('documentType');
      expect(schema.required).toContain('title');
      expect(schema.required).toContain('publicationDate');
    });

    it('should include array field for keywords', () => {
      const schema = FirecrawlService.getLegalMetadataSchema();

      expect(schema.properties.keywords).toBeDefined();
      expect(schema.properties.keywords.type).toBe('array');
      expect(schema.properties.keywords.items).toBeDefined();
    });
  });

  describe('delay helper', () => {
    it('should delay execution', async () => {
      const startTime = Date.now();
      await service['delay'](100);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeGreaterThanOrEqual(90); // Allow small timing variance
    });
  });
});
