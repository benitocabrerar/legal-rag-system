import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import crypto from 'crypto';

export interface QueryClassification {
  type: 'metadata' | 'navigation' | 'content' | 'comparison' | 'summary' | 'unknown';
  confidence: number;
  entities: QueryEntity[];
  intent: string | null;
  requiredStrategies: string[];
  query: string;
  normalizedQuery: string;
}

interface QueryEntity {
  type: 'article' | 'chapter' | 'section' | 'law' | 'date' | 'entity';
  value: string;
  normalizedValue: string;
  position: number;
}

interface SearchResult {
  id: string;
  content: string;
  score: number;
  type: string;
  metadata: any;
}

interface RouteResponse {
  answer: string;
  sources: any[];
  confidence: number;
  fromCache: boolean;
  queryType: string;
  strategies: string[];
}

export class QueryRouter {
  private queryPatterns = {
    metadata: [
      /cuántos?\s+artículos?\s+tiene/i,
      /número\s+de\s+artículos?/i,
      /cantidad\s+de\s+artículos?/i,
      /total\s+de\s+artículos?/i,
      /cuántos?\s+capítulos?/i,
      /cuántas?\s+secciones?/i,
      /estructura\s+de(?:l)?\s+/i,
      /índice\s+de\s+/i,
      /tabla\s+de\s+contenido/i,
      /contenido\s+de(?:l)?\s+documento/i,
      /organización\s+de(?:l)?\s+/i,
      /¿qué\s+contiene/i,
      /composición\s+de(?:l)?\s+/i
    ],

    navigation: [
      /artículo\s+\d+/i,
      /art\.\s*\d+/i,
      /arts?\.\s*\d+/i,
      /capítulo\s+[IVXLCDM\d]+/i,
      /sección\s+[IVXLCDM\d]+/i,
      /título\s+[IVXLCDM\d]+/i,
      /ir\s+al?\s+artículo/i,
      /buscar\s+artículo/i,
      /encontrar\s+artículo/i,
      /ver\s+artículo/i,
      /mostrar\s+artículo/i
    ],

    content: [
      /qué\s+dice\s+(?:el\s+)?artículo/i,
      /contenido\s+de(?:l)?\s+artículo/i,
      /cómo\s+se\s+define/i,
      /cuáles?\s+son\s+los?\s+requisitos/i,
      /explica(?:r)?\s+(?:el|la|los|las)?\s+/i,
      /describe?\s+/i,
      /procedimiento\s+para/i,
      /proceso\s+de\s+/i,
      /pasos\s+para\s+/i,
      /¿qué\s+es\s+/i,
      /definición\s+de\s+/i,
      /significado\s+de\s+/i
    ],

    comparison: [
      /diferencia\s+entre/i,
      /comparar?\s+/i,
      /versus/i,
      /mejor\s+que/i,
      /relación\s+entre/i,
      /similitudes?\s+/i,
      /distinto\s+a/i,
      /igual\s+que/i,
      /parecido\s+a/i,
      /contraste\s+entre/i
    ],

    summary: [
      /resumen\s+de(?:l)?\s+/i,
      /resumir?\s+/i,
      /puntos?\s+principales?/i,
      /lo\s+más\s+importante/i,
      /síntesis\s+de(?:l)?\s+/i,
      /ideas?\s+principales?/i,
      /aspectos?\s+clave/i,
      /elementos?\s+fundamentales?/i,
      /en\s+pocas\s+palabras/i,
      /brevemente/i
    ]
  };

  constructor(
    private prisma: PrismaClient,
    private openai: OpenAI
  ) {}

  /**
   * Main routing method
   */
  async route(query: string, caseId: string): Promise<RouteResponse> {
    console.log(`Routing query: ${query}`);

    // Check cache first
    const cached = await this.checkCache(query);
    if (cached) {
      console.log('Cache hit!');
      return cached;
    }

    // Classify the query
    const classification = await this.classifyQuery(query);
    console.log(`Query classified as: ${classification.type} with confidence ${classification.confidence}`);

    // Route based on classification
    let response: RouteResponse;

    switch (classification.type) {
      case 'metadata':
        response = await this.handleMetadataQuery(query, classification, caseId);
        break;

      case 'navigation':
        response = await this.handleNavigationQuery(query, classification, caseId);
        break;

      case 'content':
        response = await this.handleContentQuery(query, classification, caseId);
        break;

      case 'comparison':
        response = await this.handleComparisonQuery(query, classification, caseId);
        break;

      case 'summary':
        response = await this.handleSummaryQuery(query, classification, caseId);
        break;

      default:
        response = await this.handleHybridQuery(query, classification, caseId);
    }

    // Cache successful responses
    if (response.confidence > 0.7) {
      await this.cacheResponse(query, response);
    }

    return response;
  }

  /**
   * Classify the query type
   */
  async classifyQuery(query: string): Promise<QueryClassification> {
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');

    const classification: QueryClassification = {
      type: 'unknown',
      confidence: 0,
      entities: [],
      intent: null,
      requiredStrategies: [],
      query: query,
      normalizedQuery: normalizedQuery
    };

    // Check each pattern type
    let maxMatches = 0;
    let bestType: string | null = null;

    for (const [type, patterns] of Object.entries(this.queryPatterns)) {
      let matches = 0;
      for (const pattern of patterns) {
        if (pattern.test(normalizedQuery)) {
          matches++;
        }
      }

      if (matches > maxMatches) {
        maxMatches = matches;
        bestType = type;
      }
    }

    if (bestType) {
      classification.type = bestType as any;
      classification.confidence = Math.min(0.95, 0.6 + (maxMatches * 0.15));
    }

    // Extract entities from query
    classification.entities = this.extractEntities(normalizedQuery);

    // Determine intent using GPT
    classification.intent = await this.detectIntent(query);

    // Determine required search strategies
    classification.requiredStrategies = this.determineStrategies(classification);

    return classification;
  }

  /**
   * Extract entities from query
   */
  private extractEntities(query: string): QueryEntity[] {
    const entities: QueryEntity[] = [];

    // Extract article numbers
    const articlePatterns = [
      /artículos?\s+(\d+(?:-\w+)?)/gi,
      /arts?\.\s*(\d+(?:-\w+)?)/gi
    ];

    for (const pattern of articlePatterns) {
      let match;
      while ((match = pattern.exec(query)) !== null) {
        entities.push({
          type: 'article',
          value: match[0],
          normalizedValue: match[1],
          position: match.index
        });
      }
    }

    // Extract chapter numbers
    const chapterPattern = /capítulo\s+([IVXLCDM]+|\d+)/gi;
    let match;
    while ((match = chapterPattern.exec(query)) !== null) {
      entities.push({
        type: 'chapter',
        value: match[0],
        normalizedValue: match[1],
        position: match.index
      });
    }

    // Extract law references
    const lawPatterns = [
      /constitución(?:\s+de\s+(?:la\s+)?(?:república|ecuador))?/gi,
      /código\s+\w+/gi,
      /ley\s+(?:orgánica\s+)?(?:de\s+)?\w+/gi
    ];

    for (const pattern of lawPatterns) {
      let match;
      while ((match = pattern.exec(query)) !== null) {
        entities.push({
          type: 'law',
          value: match[0],
          normalizedValue: match[0].toLowerCase(),
          position: match.index
        });
      }
    }

    return entities;
  }

  /**
   * Detect intent using GPT
   */
  private async detectIntent(query: string): Promise<string | null> {
    try {
      const prompt = `Analyze the intent of this legal query and respond with a single word:

      Query: "${query}"

      Possible intents:
      - lookup: User wants to find specific information
      - explain: User wants explanation or clarification
      - compare: User wants to compare elements
      - summarize: User wants a summary
      - navigate: User wants to go to a specific part
      - count: User wants to know quantity or structure

      Intent:`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 10
      });

      return response.choices[0].message.content?.trim().toLowerCase() || null;
    } catch (error) {
      console.error('Error detecting intent:', error);
      return null;
    }
  }

  /**
   * Determine required search strategies
   */
  private determineStrategies(classification: QueryClassification): string[] {
    const strategies: string[] = [];

    switch (classification.type) {
      case 'metadata':
        strategies.push('metadata_search', 'document_summary', 'structure_search');
        break;

      case 'navigation':
        strategies.push('article_index', 'section_search', 'toc_search');
        if (classification.entities.some(e => e.type === 'article')) {
          strategies.push('direct_article_lookup');
        }
        break;

      case 'content':
        strategies.push('semantic_search', 'hybrid_search');
        if (classification.entities.length > 0) {
          strategies.push('entity_search');
        }
        break;

      case 'comparison':
        strategies.push('multi_doc_search', 'semantic_search', 'summary_comparison');
        break;

      case 'summary':
        strategies.push('summary_search', 'executive_summary', 'section_summaries');
        break;

      default:
        // Unknown queries use multiple strategies
        strategies.push('semantic_search', 'hybrid_search', 'metadata_search', 'fallback_search');
    }

    return strategies;
  }

  /**
   * Handle metadata queries
   */
  private async handleMetadataQuery(
    query: string,
    classification: QueryClassification,
    caseId: string
  ): Promise<RouteResponse> {
    console.log('Handling metadata query');

    // Identify the document being asked about
    const document = await this.identifyTargetDocument(classification.entities, caseId);

    if (!document) {
      return {
        answer: 'Lo siento, no pude identificar el documento específico sobre el que preguntas. Por favor, proporciona más detalles.',
        sources: [],
        confidence: 0.3,
        fromCache: false,
        queryType: 'metadata',
        strategies: ['document_identification_failed']
      };
    }

    // Extract metadata from document
    const metadata = document.metadata as any;

    // Check if asking about article count
    if (/cuántos?\s+artículos?/i.test(query)) {
      if (metadata?.totalArticles) {
        return {
          answer: `${document.normTitle} contiene ${metadata.totalArticles} artículos${
            metadata.totalChapters ? `, organizados en ${metadata.totalChapters} capítulos` : ''
          }${metadata.totalSections ? ` y ${metadata.totalSections} secciones` : ''}.`,
          sources: [{
            documentId: document.id,
            documentTitle: document.normTitle,
            metadata: {
              totalArticles: metadata.totalArticles,
              totalChapters: metadata.totalChapters,
              totalSections: metadata.totalSections,
              structure: metadata.tableOfContents
            }
          }],
          confidence: 1.0,
          fromCache: false,
          queryType: 'metadata',
          strategies: ['metadata_search']
        };
      } else {
        // Document needs analysis
        return await this.triggerDocumentAnalysis(document, query);
      }
    }

    // Check if asking about structure
    if (/estructura|organización|contenido/i.test(query)) {
      if (metadata?.tableOfContents) {
        const toc = metadata.tableOfContents;
        let structureDescription = `${document.normTitle} está organizado de la siguiente manera:\n\n`;

        if (toc.titles && toc.titles.length > 0) {
          structureDescription += `📚 ${toc.titles.length} Títulos principales:\n`;
          toc.titles.slice(0, 5).forEach((title: any) => {
            structureDescription += `  • Título ${title.number}: ${title.title || 'Sin título'}\n`;
          });
          if (toc.titles.length > 5) {
            structureDescription += `  • ... y ${toc.titles.length - 5} títulos más\n`;
          }
        }

        structureDescription += `\n📊 Estadísticas generales:\n`;
        structureDescription += `  • Total de artículos: ${metadata.totalArticles || 'No especificado'}\n`;
        structureDescription += `  • Total de capítulos: ${metadata.totalChapters || 'No especificado'}\n`;
        structureDescription += `  • Total de secciones: ${metadata.totalSections || 'No especificado'}\n`;

        if (metadata.summaryText) {
          structureDescription += `\n📝 Resumen:\n${metadata.summaryText}`;
        }

        return {
          answer: structureDescription,
          sources: [{
            documentId: document.id,
            documentTitle: document.normTitle,
            metadata: metadata
          }],
          confidence: 0.95,
          fromCache: false,
          queryType: 'metadata',
          strategies: ['structure_search', 'toc_search']
        };
      }
    }

    // Default metadata response
    return {
      answer: `Información sobre ${document.normTitle}:\n\n` +
              `• Tipo: ${document.normType}\n` +
              `• Jerarquía: ${document.legalHierarchy}\n` +
              `• Publicación: ${document.publicationType} N° ${document.publicationNumber}\n` +
              `• Fecha: ${document.publicationDate ? new Date(document.publicationDate).toLocaleDateString('es-EC') : 'No especificada'}\n` +
              (metadata?.totalArticles ? `• Total de artículos: ${metadata.totalArticles}\n` : '') +
              (metadata?.wordCount ? `• Palabras: ${metadata.wordCount.toLocaleString()}\n` : ''),
      sources: [{
        documentId: document.id,
        documentTitle: document.normTitle,
        metadata: metadata
      }],
      confidence: 0.9,
      fromCache: false,
      queryType: 'metadata',
      strategies: ['metadata_search']
    };
  }

  /**
   * Handle navigation queries
   */
  private async handleNavigationQuery(
    query: string,
    classification: QueryClassification,
    caseId: string
  ): Promise<RouteResponse> {
    console.log('Handling navigation query');

    // Look for article references
    const articleEntities = classification.entities.filter(e => e.type === 'article');

    if (articleEntities.length > 0) {
      const articleNumber = articleEntities[0].normalizedValue;

      // Direct article lookup
      const article = await this.prisma.$queryRaw<any[]>`
        SELECT
          a.*,
          ld.norm_title,
          ld.norm_type
        FROM legal_document_articles a
        JOIN legal_documents ld ON a.legal_document_id = ld.id
        WHERE a.article_number_text = ${articleNumber}
          OR a.article_number = ${parseInt(articleNumber) || 0}
        LIMIT 1
      `;

      if (article && article.length > 0) {
        const art = article[0];
        return {
          answer: `**Artículo ${art.article_number_text}**${art.article_title ? ` - ${art.article_title}` : ''}\n\n${art.article_content}\n\n📖 *Fuente: ${art.norm_title}*`,
          sources: [{
            documentId: art.legal_document_id,
            documentTitle: art.norm_title,
            articleNumber: art.article_number_text,
            articleTitle: art.article_title,
            content: art.article_content
          }],
          confidence: 1.0,
          fromCache: false,
          queryType: 'navigation',
          strategies: ['direct_article_lookup']
        };
      }
    }

    // Look for chapter/section references
    const chapterEntities = classification.entities.filter(e => e.type === 'chapter');

    if (chapterEntities.length > 0) {
      const chapterNumber = chapterEntities[0].normalizedValue;

      const section = await this.prisma.$queryRaw<any[]>`
        SELECT
          s.*,
          ld.norm_title
        FROM legal_document_sections s
        JOIN legal_documents ld ON s.legal_document_id = ld.id
        WHERE s.section_number = ${chapterNumber}
          AND s.section_type = 'chapter'
        LIMIT 1
      `;

      if (section && section.length > 0) {
        const chap = section[0];
        return {
          answer: `**Capítulo ${chap.section_number}**${chap.section_title ? ` - ${chap.section_title}` : ''}\n\n${chap.content.substring(0, 2000)}${chap.content.length > 2000 ? '...\n\n[Contenido truncado]' : ''}\n\n📖 *Fuente: ${chap.norm_title}*`,
          sources: [{
            documentId: chap.legal_document_id,
            documentTitle: chap.norm_title,
            chapterNumber: chap.section_number,
            chapterTitle: chap.section_title,
            content: chap.content
          }],
          confidence: 0.95,
          fromCache: false,
          queryType: 'navigation',
          strategies: ['section_search']
        };
      }
    }

    // Fallback to content search
    return await this.handleContentQuery(query, classification, caseId);
  }

  /**
   * Handle content queries
   */
  private async handleContentQuery(
    query: string,
    classification: QueryClassification,
    caseId: string
  ): Promise<RouteResponse> {
    console.log('Handling content query');

    // Use hybrid search for content queries
    const results = await this.hybridSearch(query, caseId);

    if (results.length === 0) {
      return {
        answer: 'No encontré información relevante para tu consulta. Por favor, intenta reformular tu pregunta o proporciona más detalles.',
        sources: [],
        confidence: 0.2,
        fromCache: false,
        queryType: 'content',
        strategies: ['hybrid_search_no_results']
      };
    }

    // Build context from results
    const context = results
      .slice(0, 5)
      .map((r, i) => `[Fuente ${i + 1}]: ${r.content}`)
      .join('\n\n---\n\n');

    // Generate answer using GPT
    const answer = await this.generateAnswer(query, context, 'content');

    return {
      answer: answer,
      sources: results.slice(0, 5).map(r => ({
        documentId: r.id,
        score: r.score,
        content: r.content.substring(0, 200) + '...',
        metadata: r.metadata
      })),
      confidence: Math.min(0.95, results[0].score),
      fromCache: false,
      queryType: 'content',
      strategies: ['hybrid_search', 'semantic_search']
    };
  }

  /**
   * Handle summary queries
   */
  private async handleSummaryQuery(
    query: string,
    classification: QueryClassification,
    caseId: string
  ): Promise<RouteResponse> {
    console.log('Handling summary query');

    // Identify target document
    const document = await this.identifyTargetDocument(classification.entities, caseId);

    if (!document) {
      return await this.handleContentQuery(query, classification, caseId);
    }

    // Look for existing summaries
    const summaries = await this.prisma.$queryRaw<any[]>`
      SELECT *
      FROM legal_document_summaries
      WHERE legal_document_id = ${document.id}::uuid
        AND summary_type = 'executive'
      LIMIT 1
    `;

    if (summaries && summaries.length > 0) {
      const summary = summaries[0];
      return {
        answer: `📝 **Resumen de ${document.normTitle}**\n\n${summary.summary_text}\n\n` +
                (summary.key_points ? `**Puntos clave:**\n${JSON.parse(summary.key_points).map((p: string) => `• ${p}`).join('\n')}` : ''),
        sources: [{
          documentId: document.id,
          documentTitle: document.normTitle,
          summaryType: summary.summary_type,
          summaryLevel: summary.summary_level
        }],
        confidence: 0.9,
        fromCache: false,
        queryType: 'summary',
        strategies: ['summary_search']
      };
    }

    // Generate summary on the fly
    const generatedSummary = await this.generateDocumentSummary(document);

    return {
      answer: generatedSummary,
      sources: [{
        documentId: document.id,
        documentTitle: document.normTitle
      }],
      confidence: 0.8,
      fromCache: false,
      queryType: 'summary',
      strategies: ['summary_generation']
    };
  }

  /**
   * Handle comparison queries
   */
  private async handleComparisonQuery(
    query: string,
    classification: QueryClassification,
    caseId: string
  ): Promise<RouteResponse> {
    console.log('Handling comparison query');

    // Extract entities to compare
    const entities = classification.entities.filter(e =>
      e.type === 'article' || e.type === 'chapter' || e.type === 'law'
    );

    if (entities.length < 2) {
      // Need at least 2 items to compare
      return await this.handleContentQuery(query, classification, caseId);
    }

    // Fetch content for comparison
    const comparisonData = await Promise.all(
      entities.map(entity => this.fetchEntityContent(entity))
    );

    // Generate comparison
    const comparison = await this.generateComparison(query, comparisonData);

    return {
      answer: comparison,
      sources: comparisonData.filter(d => d !== null).map(d => ({
        documentId: d.documentId,
        type: d.type,
        identifier: d.identifier,
        content: d.content.substring(0, 200) + '...'
      })),
      confidence: 0.85,
      fromCache: false,
      queryType: 'comparison',
      strategies: ['comparison_search', 'multi_doc_search']
    };
  }

  /**
   * Handle hybrid/unknown queries
   */
  private async handleHybridQuery(
    query: string,
    classification: QueryClassification,
    caseId: string
  ): Promise<RouteResponse> {
    console.log('Handling hybrid/unknown query');

    // Try multiple strategies in parallel
    const [
      semanticResults,
      metadataResults,
      summaryResults
    ] = await Promise.all([
      this.semanticSearch(query, caseId),
      this.metadataSearch(query, caseId),
      this.summarySearch(query, caseId)
    ]);

    // Combine and rank results
    const allResults = [
      ...semanticResults.map(r => ({ ...r, source: 'semantic' })),
      ...metadataResults.map(r => ({ ...r, source: 'metadata' })),
      ...summaryResults.map(r => ({ ...r, source: 'summary' }))
    ];

    // Sort by score
    allResults.sort((a, b) => b.score - a.score);

    if (allResults.length === 0) {
      return {
        answer: 'No pude encontrar información relevante para tu consulta. Por favor, intenta ser más específico o reformula tu pregunta.',
        sources: [],
        confidence: 0.1,
        fromCache: false,
        queryType: 'unknown',
        strategies: ['all_strategies_failed']
      };
    }

    // Build context from top results
    const context = allResults
      .slice(0, 5)
      .map((r, i) => `[${r.source} - ${i + 1}]: ${r.content}`)
      .join('\n\n---\n\n');

    // Generate answer
    const answer = await this.generateAnswer(query, context, 'hybrid');

    return {
      answer: answer,
      sources: allResults.slice(0, 5).map(r => ({
        documentId: r.id,
        score: r.score,
        source: r.source,
        content: r.content.substring(0, 200) + '...',
        metadata: r.metadata
      })),
      confidence: Math.min(0.9, allResults[0].score * 0.95),
      fromCache: false,
      queryType: 'hybrid',
      strategies: ['semantic_search', 'metadata_search', 'summary_search']
    };
  }

  // Helper methods

  private async identifyTargetDocument(entities: QueryEntity[], caseId: string): Promise<any> {
    // Look for law references in entities
    const lawEntities = entities.filter(e => e.type === 'law');

    if (lawEntities.length > 0) {
      const lawName = lawEntities[0].normalizedValue;

      // Search by title
      const document = await this.prisma.legalDocument.findFirst({
        where: {
          OR: [
            { normTitle: { contains: lawName, mode: 'insensitive' } },
            { title: { contains: lawName, mode: 'insensitive' } }
          ],
          isActive: true
        }
      });

      if (document) return document;
    }

    // Check for "constitución" specifically
    if (/constitución/i.test(entities.map(e => e.value).join(' '))) {
      const constitution = await this.prisma.legalDocument.findFirst({
        where: {
          OR: [
            { normTitle: { contains: 'Constitución', mode: 'insensitive' } },
            { normType: 'CONSTITUTIONAL_NORM' }
          ],
          isActive: true
        }
      });

      if (constitution) return constitution;
    }

    // Default to most relevant document in case
    const caseDocuments = await this.prisma.legalDocumentChunk.findMany({
      where: {
        legalDocument: {
          isActive: true
        }
      },
      select: {
        legalDocument: true
      },
      distinct: ['legalDocumentId'],
      take: 1
    });

    return caseDocuments[0]?.legalDocument || null;
  }

  private async triggerDocumentAnalysis(document: any, query: string): Promise<RouteResponse> {
    return {
      answer: `El documento "${document.normTitle}" aún no ha sido analizado completamente. El análisis está en proceso. Por favor, intenta nuevamente en unos momentos.

      Mientras tanto, puedo indicarte que este documento es de tipo ${document.normType} y fue publicado en ${document.publicationType} N° ${document.publicationNumber}.`,
      sources: [{
        documentId: document.id,
        documentTitle: document.normTitle,
        analysisRequired: true
      }],
      confidence: 0.5,
      fromCache: false,
      queryType: 'metadata',
      strategies: ['analysis_pending']
    };
  }

  private async hybridSearch(query: string, caseId: string): Promise<SearchResult[]> {
    // Implement hybrid search combining semantic and keyword search
    const [semanticResults, keywordResults] = await Promise.all([
      this.semanticSearch(query, caseId),
      this.keywordSearch(query, caseId)
    ]);

    // Reciprocal Rank Fusion
    return this.fuseResults([
      { results: semanticResults, weight: 0.6 },
      { results: keywordResults, weight: 0.4 }
    ]);
  }

  private async semanticSearch(query: string, caseId: string): Promise<SearchResult[]> {
    // Generate query embedding
    const embedding = await this.generateEmbedding(query);

    // Search in legal document chunks
    const results = await this.prisma.$queryRaw<any[]>`
      SELECT
        ldc.id,
        ldc.content,
        ld.norm_title,
        ld.id as document_id,
        1 - (ldc.embedding <=> $1::vector) as similarity
      FROM legal_document_chunks ldc
      JOIN legal_documents ld ON ldc.legal_document_id = ld.id
      WHERE ld.is_active = true
      ORDER BY similarity DESC
      LIMIT 20
    `, JSON.stringify(embedding);

    return results.map(r => ({
      id: r.document_id,
      content: r.content,
      score: r.similarity,
      type: 'semantic',
      metadata: {
        documentTitle: r.norm_title
      }
    }));
  }

  private async keywordSearch(query: string, caseId: string): Promise<SearchResult[]> {
    // Simple keyword search using PostgreSQL full-text search
    const results = await this.prisma.$queryRaw<any[]>`
      SELECT
        ldc.id,
        ldc.content,
        ld.norm_title,
        ld.id as document_id,
        ts_rank(to_tsvector('spanish', ldc.content), plainto_tsquery('spanish', $1)) as rank
      FROM legal_document_chunks ldc
      JOIN legal_documents ld ON ldc.legal_document_id = ld.id
      WHERE ld.is_active = true
        AND to_tsvector('spanish', ldc.content) @@ plainto_tsquery('spanish', $1)
      ORDER BY rank DESC
      LIMIT 20
    `, query;

    return results.map(r => ({
      id: r.document_id,
      content: r.content,
      score: r.rank,
      type: 'keyword',
      metadata: {
        documentTitle: r.norm_title
      }
    }));
  }

  private async metadataSearch(query: string, caseId: string): Promise<SearchResult[]> {
    // Search in document metadata and summaries
    const results = await this.prisma.$queryRaw<any[]>`
      SELECT
        ld.id,
        ld.norm_title,
        ld.metadata,
        lds.summary_text as content,
        0.8 as score
      FROM legal_documents ld
      LEFT JOIN legal_document_summaries lds ON ld.id = lds.legal_document_id
      WHERE ld.is_active = true
        AND (
          ld.norm_title ILIKE $1
          OR lds.summary_text ILIKE $1
        )
      LIMIT 10
    `, `%${query}%`;

    return results.map(r => ({
      id: r.id,
      content: r.content || `Documento: ${r.norm_title}`,
      score: r.score,
      type: 'metadata',
      metadata: r.metadata
    }));
  }

  private async summarySearch(query: string, caseId: string): Promise<SearchResult[]> {
    // Search in document summaries
    const embedding = await this.generateEmbedding(query);

    const results = await this.prisma.$queryRaw<any[]>`
      SELECT
        lds.id,
        lds.summary_text as content,
        ld.norm_title,
        ld.id as document_id,
        1 - (lds.embedding <=> $1::vector) as similarity
      FROM legal_document_summaries lds
      JOIN legal_documents ld ON lds.legal_document_id = ld.id
      WHERE ld.is_active = true
        AND lds.embedding IS NOT NULL
      ORDER BY similarity DESC
      LIMIT 10
    `, JSON.stringify(embedding);

    return results.map(r => ({
      id: r.document_id,
      content: r.content,
      score: r.similarity,
      type: 'summary',
      metadata: {
        documentTitle: r.norm_title
      }
    }));
  }

  private fuseResults(resultSets: { results: SearchResult[], weight: number }[]): SearchResult[] {
    const fusedScores = new Map<string, { result: SearchResult, score: number }>();

    for (const { results, weight } of resultSets) {
      results.forEach((result, rank) => {
        const reciprocalRank = 1 / (rank + 60);
        const key = `${result.id}-${result.content.substring(0, 50)}`;

        if (fusedScores.has(key)) {
          const existing = fusedScores.get(key)!;
          existing.score += reciprocalRank * weight;
        } else {
          fusedScores.set(key, {
            result,
            score: reciprocalRank * weight
          });
        }
      });
    }

    return Array.from(fusedScores.values())
      .sort((a, b) => b.score - a.score)
      .map(item => ({
        ...item.result,
        score: item.score
      }));
  }

  private async fetchEntityContent(entity: QueryEntity): Promise<any> {
    if (entity.type === 'article') {
      const article = await this.prisma.$queryRaw<any[]>`
        SELECT *
        FROM legal_document_articles
        WHERE article_number_text = $1
        LIMIT 1
      `, entity.normalizedValue;

      if (article && article.length > 0) {
        return {
          documentId: article[0].legal_document_id,
          type: 'article',
          identifier: entity.normalizedValue,
          content: article[0].article_content
        };
      }
    }

    return null;
  }

  private async generateAnswer(query: string, context: string, queryType: string): Promise<string> {
    const systemPrompts: { [key: string]: string } = {
      content: `Eres un asistente legal experto en leyes ecuatorianas. Responde la pregunta basándote en el contexto proporcionado. Si la información no está en el contexto, indícalo claramente.`,

      hybrid: `Eres un asistente legal experto. El contexto proviene de múltiples fuentes (semántica, metadatos, resúmenes). Integra la información coherentemente para responder la pregunta.`,

      comparison: `Eres un asistente legal experto en análisis comparativo. Compara los elementos solicitados destacando similitudes y diferencias clave.`
    };

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompts[queryType] || systemPrompts.content },
        { role: 'user', content: `Contexto:\n${context}\n\nPregunta: ${query}\n\nRespuesta:` }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    return response.choices[0].message.content || 'No pude generar una respuesta adecuada.';
  }

  private async generateDocumentSummary(document: any): Promise<string> {
    const chunks = await this.prisma.legalDocumentChunk.findMany({
      where: { legalDocumentId: document.id },
      take: 5,
      orderBy: { chunkIndex: 'asc' }
    });

    const content = chunks.map(c => c.content).join('\n\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Genera un resumen ejecutivo del documento legal, destacando los puntos más importantes.'
        },
        {
          role: 'user',
          content: `Documento: ${document.normTitle}\n\nContenido (primeros fragmentos):\n${content}\n\nResumen:`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    return response.choices[0].message.content || 'No se pudo generar el resumen.';
  }

  private async generateComparison(query: string, comparisonData: any[]): Promise<string> {
    const validData = comparisonData.filter(d => d !== null);

    if (validData.length < 2) {
      return 'No se encontró suficiente información para realizar la comparación solicitada.';
    }

    const context = validData
      .map(d => `${d.type} ${d.identifier}:\n${d.content}`)
      .join('\n\n---\n\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Realiza una comparación detallada entre los elementos proporcionados, destacando similitudes, diferencias y puntos clave.'
        },
        {
          role: 'user',
          content: `Solicitud: ${query}\n\nElementos a comparar:\n${context}\n\nComparación:`
        }
      ],
      temperature: 0.3,
      max_tokens: 800
    });

    return response.choices[0].message.content || 'No se pudo generar la comparación.';
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000)
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return [];
    }
  }

  // Cache methods

  private async checkCache(query: string): Promise<RouteResponse | null> {
    const hash = this.hashQuery(query);

    const cached = await this.prisma.$queryRaw<any[]>`
      SELECT *
      FROM query_cache
      WHERE query_hash = $1
        AND expires_at > NOW()
      LIMIT 1
    `, hash;

    if (cached && cached.length > 0) {
      // Update hit count and last accessed
      await this.prisma.$executeRaw`
        UPDATE query_cache
        SET hit_count = hit_count + 1,
            last_accessed_at = NOW()
        WHERE id = ${cached[0].id}::uuid
      `;

      return {
        answer: cached[0].response_text,
        sources: JSON.parse(cached[0].source_documents || '[]'),
        confidence: 1.0,
        fromCache: true,
        queryType: cached[0].query_type,
        strategies: ['cache_hit']
      };
    }

    return null;
  }

  private async cacheResponse(query: string, response: RouteResponse): Promise<void> {
    const hash = this.hashQuery(query);
    const ttlSeconds = 86400; // 24 hours

    await this.prisma.$executeRaw`
      INSERT INTO query_cache (
        id, query_hash, query_text, query_type,
        response_text, response_metadata, source_documents,
        ttl_seconds, expires_at, created_at, last_accessed_at
      ) VALUES (
        gen_random_uuid(),
        ${hash},
        ${query},
        ${response.queryType},
        ${response.answer},
        ${JSON.stringify({ confidence: response.confidence, strategies: response.strategies })}::jsonb,
        ${JSON.stringify(response.sources)}::jsonb,
        ${ttlSeconds},
        NOW() + INTERVAL '${ttlSeconds} seconds',
        NOW(),
        NOW()
      )
      ON CONFLICT (query_hash) DO UPDATE SET
        response_text = EXCLUDED.response_text,
        response_metadata = EXCLUDED.response_metadata,
        source_documents = EXCLUDED.source_documents,
        hit_count = query_cache.hit_count + 1,
        expires_at = EXCLUDED.expires_at,
        last_accessed_at = NOW()
    `;
  }

  private hashQuery(query: string): string {
    const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
}