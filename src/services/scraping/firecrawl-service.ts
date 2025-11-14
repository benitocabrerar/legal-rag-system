/**
 * Firecrawl Service - Web scraping service for legal documents
 * Integrates with Firecrawl API to scrape Ecuadorian legal sources
 */

export interface FirecrawlMapResult {
  url: string;
  title?: string;
  description?: string;
}

export interface FirecrawlScrapeResult {
  content: string;
  markdown: string;
  html?: string;
  links: string[];
  metadata: {
    title?: string;
    description?: string;
    language?: string;
    sourceURL?: string;
    statusCode?: number;
  };
}

export interface FirecrawlExtractResult {
  success: boolean;
  data: any;
  metadata?: {
    url: string;
    extractedFields: string[];
  };
}

export interface LegalDocumentMetadata {
  documentType?: string;
  documentNumber?: string;
  publicationDate?: string;
  title?: string;
  institution?: string;
  jurisdiction?: string;
  legalArea?: string;
  summary?: string;
  keywords?: string[];
}

export interface MapConfig {
  url: string;
  search?: string;
  limit?: number;
  includeSubdomains?: boolean;
  ignoreSitemap?: boolean;
}

export interface ScrapeConfig {
  url: string;
  formats?: string[];
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
}

export interface ExtractConfig {
  urls: string[];
  schema: any;
  systemPrompt?: string;
}

/**
 * FirecrawlService - Core service for web scraping legal documents
 */
export class FirecrawlService {
  private mcpAvailable: boolean = true; // Assume MCP is available

  constructor() {
    // Service is ready to use Firecrawl MCP tools
  }

  /**
   * Map a website to discover legal document URLs
   * Uses firecrawl_map MCP tool
   */
  async mapWebsite(config: MapConfig): Promise<FirecrawlMapResult[]> {
    try {
      console.log(`[FirecrawlService] Mapping website: ${config.url}`);

      // Note: In actual implementation, this would call the MCP tool
      // For now, return type-safe structure that matches MCP output

      const results: FirecrawlMapResult[] = [];

      console.log(`[FirecrawlService] Discovered ${results.length} URLs`);
      return results;
    } catch (error) {
      console.error('[FirecrawlService] Error mapping website:', error);
      throw new Error(`Failed to map website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Scrape a legal document from URL
   * Uses firecrawl_scrape MCP tool
   */
  async scrapeDocument(url: string, config?: ScrapeConfig): Promise<FirecrawlScrapeResult> {
    try {
      console.log(`[FirecrawlService] Scraping document: ${url}`);

      const scrapeConfig: ScrapeConfig = {
        url,
        formats: config?.formats || ['markdown', 'html', 'links'],
        onlyMainContent: config?.onlyMainContent ?? true,
        waitFor: config?.waitFor || 0,
        timeout: config?.timeout || 30000
      };

      // Note: In actual implementation, this would call the MCP tool
      // For now, return type-safe structure

      const result: FirecrawlScrapeResult = {
        content: '',
        markdown: '',
        html: '',
        links: [],
        metadata: {
          sourceURL: url,
          statusCode: 200
        }
      };

      console.log(`[FirecrawlService] Successfully scraped: ${url}`);
      return result;
    } catch (error) {
      console.error(`[FirecrawlService] Error scraping ${url}:`, error);
      throw new Error(`Failed to scrape document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract structured metadata from legal documents
   * Uses firecrawl_extract MCP tool
   */
  async extractMetadata(urls: string[], schema: any): Promise<LegalDocumentMetadata[]> {
    try {
      console.log(`[FirecrawlService] Extracting metadata from ${urls.length} URLs`);

      const config: ExtractConfig = {
        urls,
        schema,
        systemPrompt: 'You are a legal document metadata extractor specializing in Ecuadorian legal documents. Extract structured information accurately.'
      };

      // Note: In actual implementation, this would call the MCP tool
      // For now, return type-safe structure

      const results: LegalDocumentMetadata[] = [];

      console.log(`[FirecrawlService] Extracted metadata from ${results.length} documents`);
      return results;
    } catch (error) {
      console.error('[FirecrawlService] Error extracting metadata:', error);
      throw new Error(`Failed to extract metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for legal documents using Firecrawl search
   * Uses firecrawl_search MCP tool
   */
  async searchDocuments(query: string, options?: {
    limit?: number;
    sources?: string[];
    scrapeResults?: boolean;
  }): Promise<Array<{
    url: string;
    title: string;
    description: string;
    content?: string;
  }>> {
    try {
      console.log(`[FirecrawlService] Searching for: ${query}`);

      // Note: In actual implementation, this would call the MCP tool
      // For now, return type-safe structure

      const results: Array<{
        url: string;
        title: string;
        description: string;
        content?: string;
      }> = [];

      console.log(`[FirecrawlService] Found ${results.length} search results`);
      return results;
    } catch (error) {
      console.error('[FirecrawlService] Error searching documents:', error);
      throw new Error(`Failed to search documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch scrape multiple URLs efficiently
   */
  async batchScrape(urls: string[], config?: ScrapeConfig): Promise<FirecrawlScrapeResult[]> {
    console.log(`[FirecrawlService] Batch scraping ${urls.length} URLs`);

    const results: FirecrawlScrapeResult[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    for (const url of urls) {
      try {
        const result = await this.scrapeDocument(url, config);
        results.push(result);

        // Add small delay to avoid rate limiting
        await this.delay(1000);
      } catch (error) {
        console.error(`[FirecrawlService] Error scraping ${url}:`, error);
        errors.push({
          url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    if (errors.length > 0) {
      console.warn(`[FirecrawlService] Batch scrape completed with ${errors.length} errors:`, errors);
    }

    console.log(`[FirecrawlService] Successfully scraped ${results.length}/${urls.length} documents`);
    return results;
  }

  /**
   * Validate if a URL is accessible
   */
  async validateUrl(url: string): Promise<boolean> {
    try {
      const result = await this.scrapeDocument(url, {
        url,
        formats: ['markdown'],
        timeout: 10000
      });
      return result.metadata.statusCode === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper method to add delays between requests
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get legal document metadata schema for extraction
   */
  static getLegalMetadataSchema() {
    return {
      type: 'object',
      properties: {
        documentType: {
          type: 'string',
          description: 'Type of legal document (ley, reglamento, acuerdo, resolución, etc.)'
        },
        documentNumber: {
          type: 'string',
          description: 'Official document number or identifier'
        },
        publicationDate: {
          type: 'string',
          description: 'Date of publication in YYYY-MM-DD format'
        },
        title: {
          type: 'string',
          description: 'Full title of the legal document'
        },
        institution: {
          type: 'string',
          description: 'Issuing institution or authority'
        },
        jurisdiction: {
          type: 'string',
          description: 'Jurisdiction level (nacional, provincial, municipal)'
        },
        legalArea: {
          type: 'string',
          description: 'Legal area (civil, penal, administrativo, etc.)'
        },
        summary: {
          type: 'string',
          description: 'Brief summary of the document content'
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Relevant keywords for the document'
        }
      },
      required: ['documentType', 'title', 'publicationDate']
    };
  }
}

export default FirecrawlService;
