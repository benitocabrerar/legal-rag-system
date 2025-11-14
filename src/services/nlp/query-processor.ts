import { OpenAI } from 'openai';

interface QueryIntent {
  type: 'search' | 'question' | 'comparison' | 'recommendation' | 'analysis' | 'unknown';
  confidence: number;
  entities: {
    laws: string[];
    articles: string[];
    keywords: string[];
    dates?: { start?: string; end?: string };
    jurisdictions?: string[];
  };
  context?: string;
}

interface ProcessedQuery {
  original: string;
  normalized: string;
  intent: QueryIntent;
  searchTerms: string[];
  filters: {
    documentType?: string[];
    jurisdiction?: string[];
    dateRange?: { start: Date; end: Date };
  };
  processingTimeMs: number;
}

export class QueryProcessor {
  private openai: OpenAI;
  private intentPatterns: Map<string, RegExp[]>;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for NLP query processing');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize regex patterns for quick intent classification
    this.intentPatterns = new Map([
      ['search', [
        /busca|encuentra|localiza|dame|muestra|lista/i,
        /search|find|locate|show|list/i
      ]],
      ['question', [
        /qué|cómo|cuándo|dónde|por qué|quién|cuál/i,
        /what|how|when|where|why|who|which/i
      ]],
      ['comparison', [
        /compara|diferencia|versus|vs|entre/i,
        /compare|difference|versus|vs|between/i
      ]],
      ['recommendation', [
        /recomienda|sugiere|debería|mejor/i,
        /recommend|suggest|should|best/i
      ]],
      ['analysis', [
        /analiza|explica|interpreta|resumen/i,
        /analyze|explain|interpret|summary/i
      ]]
    ]);
  }

  /**
   * Process a natural language query
   */
  async processQuery(query: string): Promise<ProcessedQuery> {
    const startTime = Date.now();

    // Quick classification using patterns
    const quickIntent = this.classifyIntentQuick(query);

    // Normalize query
    const normalized = this.normalizeQuery(query);

    // Use GPT-4 for deep analysis
    const aiAnalysis = await this.analyzeWithAI(query, quickIntent);

    // Extract search terms
    const searchTerms = this.extractSearchTerms(normalized, aiAnalysis.entities);

    // Build filters
    const filters = this.buildFilters(aiAnalysis);

    const processingTimeMs = Date.now() - startTime;

    return {
      original: query,
      normalized,
      intent: aiAnalysis,
      searchTerms,
      filters,
      processingTimeMs
    };
  }

  /**
   * Quick intent classification using regex patterns
   */
  private classifyIntentQuick(query: string): string {
    for (const [intent, patterns] of Array.from(this.intentPatterns)) {
      if (patterns.some(pattern => pattern.test(query))) {
        return intent;
      }
    }
    return 'unknown';
  }

  /**
   * Normalize query text
   */
  private normalizeQuery(query: string): string {
    return query
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[¿?¡!]+/g, '');
  }

  /**
   * Use GPT-4 for deep query analysis
   */
  private async analyzeWithAI(query: string, quickIntent: string): Promise<QueryIntent> {
    const systemPrompt = `Eres un experto en análisis de consultas legales en español (Ecuador).
Tu tarea es analizar consultas de usuarios y extraer:
1. El tipo de intención (search, question, comparison, recommendation, analysis)
2. Entidades legales mencionadas (leyes, artículos, palabras clave)
3. Fechas relevantes
4. Jurisdicciones

Responde SOLO con JSON válido, sin explicaciones adicionales.`;

    const userPrompt = `Analiza esta consulta legal: "${query}"

Formato de respuesta requerido:
{
  "type": "search|question|comparison|recommendation|analysis",
  "confidence": 0-1,
  "entities": {
    "laws": ["nombre de ley 1", "nombre de ley 2"],
    "articles": ["Art. 123", "Art. 456"],
    "keywords": ["palabra clave 1", "palabra clave 2"],
    "dates": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"},
    "jurisdictions": ["Ecuador", "Pichincha"]
  },
  "context": "explicación breve del contexto"
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const analysis = JSON.parse(content);

      return {
        type: analysis.type || quickIntent,
        confidence: analysis.confidence || 0.5,
        entities: {
          laws: analysis.entities?.laws || [],
          articles: analysis.entities?.articles || [],
          keywords: analysis.entities?.keywords || [],
          dates: analysis.entities?.dates,
          jurisdictions: analysis.entities?.jurisdictions
        },
        context: analysis.context
      };
    } catch (error) {
      console.error('Error analyzing query with AI:', error);

      // Fallback to basic analysis
      return {
        type: quickIntent as any,
        confidence: 0.3,
        entities: {
          laws: [],
          articles: this.extractArticles(query),
          keywords: this.extractKeywords(query),
        }
      };
    }
  }

  /**
   * Extract article references from query
   */
  private extractArticles(query: string): string[] {
    const articlePattern = /art(?:ículo)?\.?\s*(\d+)/gi;
    const matches = Array.from(query.matchAll(articlePattern));
    return matches.map(m => `Art. ${m[1]}`);
  }

  /**
   * Extract keywords from query
   */
  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
      'de', 'del', 'al', 'a', 'en', 'por', 'para', 'con', 'sin',
      'que', 'qué', 'como', 'cómo', 'cuando', 'cuándo', 'donde', 'dónde'
    ]);

    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 10); // Top 10 keywords
  }

  /**
   * Extract search terms combining entities and keywords
   */
  private extractSearchTerms(normalized: string, entities: QueryIntent['entities']): string[] {
    const terms = new Set<string>();

    // Add laws
    entities.laws.forEach(law => terms.add(law));

    // Add articles
    entities.articles.forEach(article => terms.add(article));

    // Add keywords
    entities.keywords.forEach(keyword => terms.add(keyword));

    // Add original query as fallback
    if (terms.size === 0) {
      terms.add(normalized);
    }

    return Array.from(terms);
  }

  /**
   * Build filters from entities
   */
  private buildFilters(intent: QueryIntent): ProcessedQuery['filters'] {
    const filters: ProcessedQuery['filters'] = {};

    if (intent.entities.jurisdictions && intent.entities.jurisdictions.length > 0) {
      filters.jurisdiction = intent.entities.jurisdictions;
    }

    if (intent.entities.dates) {
      const { start, end } = intent.entities.dates;
      if (start || end) {
        filters.dateRange = {
          start: start ? new Date(start) : new Date(0),
          end: end ? new Date(end) : new Date()
        };
      }
    }

    return filters;
  }

  /**
   * Extract entities from query
   * Public method for extracting legal entities
   */
  async extractEntities(query: string): Promise<QueryIntent['entities']> {
    return {
      laws: [], // Will be enhanced by LegalEntityDictionary
      articles: this.extractArticles(query),
      keywords: this.extractKeywords(query),
    };
  }

  /**
   * Classify intent of query
   * Public method for intent classification
   */
  async classifyIntent(query: string): Promise<QueryIntent> {
    const normalizedQuery = query.toLowerCase().trim();

    // Try pattern matching first
    for (const [intentType, patterns] of Array.from(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedQuery)) {
          return {
            type: intentType as QueryIntent['type'],
            confidence: 0.8,
            entities: await this.extractEntities(query)
          };
        }
      }
    }

    // Default to search intent
    return {
      type: 'search',
      confidence: 0.6,
      entities: await this.extractEntities(query)
    };
  }
}

export const queryProcessor = new QueryProcessor();
