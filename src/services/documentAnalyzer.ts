import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import crypto from 'crypto';

interface DocumentStructure {
  titles: StructureElement[];
  chapters: StructureElement[];
  sections: StructureElement[];
  articles: ArticleElement[];
}

interface StructureElement {
  type: string;
  number: string;
  title: string;
  position: number;
  content: string;
  level: number;
  parentId?: string;
}

interface ArticleElement extends StructureElement {
  articleNumber: number;
  articleNumberText: string;
  referencedArticles?: string[];
  keywords?: string[];
}

interface DocumentSummaries {
  executive: string;
  chapters: { [key: string]: string };
  sections: { [key: string]: string };
  technical: string;
}

export class DocumentAnalyzer {
  constructor(
    private prisma: PrismaClient,
    private openai: OpenAI
  ) {}

  /**
   * Main entry point for document analysis
   */
  async analyzeDocument(documentId: string): Promise<{
    success: boolean;
    metadata: any;
    error?: string;
  }> {
    try {
      console.log(`Starting analysis for document ${documentId}`);

      const document = await this.prisma.legalDocument.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Step 1: Extract hierarchical structure
      const structure = await this.extractStructure(document.content);
      console.log(`Extracted structure: ${structure.articles.length} articles found`);

      // Step 2: Extract and normalize articles
      const articles = await this.extractArticles(document.content, structure);
      console.log(`Extracted ${articles.length} articles with content`);

      // Step 3: Generate table of contents
      const toc = this.generateTableOfContents(structure);

      // Step 4: Generate multi-level summaries
      const summaries = await this.generateSummaries(document, structure);

      // Step 5: Extract key entities and references
      const entities = await this.extractEntities(document.content);
      const crossReferences = await this.extractCrossReferences(document.content);

      // Step 6: Calculate document statistics
      const stats = this.calculateStatistics(document.content, structure);

      // Step 7: Update main document with metadata
      await this.prisma.legalDocument.update({
        where: { id: documentId },
        data: {
          metadata: {
            totalArticles: articles.length,
            totalSections: structure.sections.length,
            totalChapters: structure.chapters.length,
            totalTitles: structure.titles.length,
            pageCount: stats.estimatedPages,
            wordCount: stats.wordCount,
            documentStructure: structure,
            tableOfContents: toc,
            summaryText: summaries.executive,
            keyEntities: entities,
            crossReferences: crossReferences,
            lastAnalyzedAt: new Date(),
            analysisVersion: '2.0'
          }
        }
      });

      // Step 8: Save detailed article data
      await this.saveArticles(documentId, articles);

      // Step 9: Save hierarchical sections
      await this.saveSections(documentId, structure);

      // Step 10: Save summaries at different levels
      await this.saveSummaries(documentId, summaries);

      // Step 11: Generate specialized embeddings
      await this.generateSpecializedEmbeddings(documentId, {
        summaries,
        articles,
        structure
      });

      return {
        success: true,
        metadata: {
          documentId,
          articlesExtracted: articles.length,
          sectionsExtracted: structure.sections.length,
          chaptersExtracted: structure.chapters.length,
          summariesGenerated: Object.keys(summaries).length,
          entitiesFound: entities.length,
          crossReferencesFound: crossReferences.length,
          wordCount: stats.wordCount,
          estimatedPages: stats.estimatedPages,
          analysisVersion: '2.0',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Document analysis error:', error);
      return {
        success: false,
        metadata: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract hierarchical structure from document
   */
  private async extractStructure(content: string): Promise<DocumentStructure> {
    const structure: DocumentStructure = {
      titles: [],
      chapters: [],
      sections: [],
      articles: []
    };

    // Define patterns for different structural elements
    const patterns = {
      title: /^TÍTULO\s+([IVXLCDM]+|\d+)[:\s.-]*(.*?)$/gmi,
      chapter: /^CAPÍTULO\s+([IVXLCDM]+|\d+)[:\s.-]*(.*?)$/gmi,
      section: /^SECCIÓN\s+([IVXLCDM]+|\d+)[:\s.-]*(.*?)$/gmi,
      article: /^Art(?:ículo|\.)\s*(\d+(?:-\w+)?)[:\s.-]*(.*?)$/gmi
    };

    // Extract each type of element
    for (const [type, pattern] of Object.entries(patterns)) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);

      while ((match = regex.exec(content)) !== null) {
        const element = {
          type,
          number: match[1],
          title: match[2]?.trim() || '',
          position: match.index,
          content: '',
          level: this.getHierarchyLevel(type)
        };

        // Extract content until next element
        element.content = this.extractElementContent(content, match.index);

        switch (type) {
          case 'title':
            structure.titles.push(element);
            break;
          case 'chapter':
            structure.chapters.push(element);
            break;
          case 'section':
            structure.sections.push(element);
            break;
          case 'article':
            structure.articles.push(element as ArticleElement);
            break;
        }
      }
    }

    // Build parent-child relationships
    return this.buildHierarchy(structure);
  }

  /**
   * Extract detailed article information
   */
  private async extractArticles(
    content: string,
    structure: DocumentStructure
  ): Promise<ArticleElement[]> {
    const articles: ArticleElement[] = [];

    // Multiple patterns to catch different article formats
    const patterns = [
      /Art(?:ículo|\.)\s*(\d+(?:-\w+)?)[:\s.-]*(.*?)(?=Art(?:ículo|\.)\s*\d+|CAPÍTULO|SECCIÓN|TÍTULO|$)/gis,
      /ARTÍCULO\s+(\d+(?:-\w+)?)[:\s.-]*(.*?)(?=ARTÍCULO\s*\d+|CAPÍTULO|SECCIÓN|TÍTULO|$)/gis,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const articleNumberText = match[1];
        const articleNumber = parseInt(articleNumberText.replace(/\D/g, '')) || 0;

        // Skip if already processed
        if (articles.some(a => a.articleNumberText === articleNumberText)) {
          continue;
        }

        const articleContent = match[0];
        const articleTitle = match[2]?.trim() || '';

        // Extract referenced articles
        const referencedArticles = this.extractArticleReferences(articleContent);

        // Extract keywords using frequency analysis
        const keywords = await this.extractKeywords(articleContent);

        articles.push({
          type: 'article',
          number: articleNumberText,
          articleNumber,
          articleNumberText,
          title: articleTitle,
          position: match.index,
          content: articleContent,
          level: 4,
          referencedArticles,
          keywords
        });
      }
    }

    // Sort articles by number
    articles.sort((a, b) => a.articleNumber - b.articleNumber);

    return articles;
  }

  /**
   * Extract references to other articles
   */
  private extractArticleReferences(content: string): string[] {
    const references = new Set<string>();
    const patterns = [
      /artículos?\s+(\d+(?:\s*[,y]\s*\d+)*)/gi,
      /arts?\.\s+(\d+(?:\s*[,y]\s*\d+)*)/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const nums = match[1].split(/[,y]/);
        nums.forEach(num => {
          const cleaned = num.trim();
          if (cleaned) references.add(cleaned);
        });
      }
    }

    return Array.from(references);
  }

  /**
   * Extract key terms and entities using frequency and NER
   */
  private async extractKeywords(content: string): Promise<string[]> {
    // Simple frequency-based keyword extraction
    const words = content.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4)
      .filter(word => !this.isStopWord(word));

    const frequency = new Map<string, number>();
    words.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    // Get top 10 keywords
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Generate summaries at multiple levels
   */
  private async generateSummaries(
    document: any,
    structure: DocumentStructure
  ): Promise<DocumentSummaries> {
    const summaries: DocumentSummaries = {
      executive: '',
      chapters: {},
      sections: {},
      technical: ''
    };

    // Generate executive summary
    const executivePrompt = `Genera un resumen ejecutivo del siguiente documento legal:

    Título: ${document.normTitle}
    Tipo: ${document.normType}

    Contenido (primeros 3000 caracteres):
    ${document.content.substring(0, 3000)}

    El resumen debe:
    1. Explicar el propósito principal del documento
    2. Destacar los puntos clave
    3. Mencionar el número total de artículos (${structure.articles.length})
    4. Ser conciso (máximo 300 palabras)

    Resumen:`;

    const executiveResponse = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: executivePrompt }],
      temperature: 0.3,
      max_tokens: 500
    });

    summaries.executive = executiveResponse.choices[0].message.content || '';

    // Generate chapter summaries (limit to first 5 chapters for efficiency)
    for (const chapter of structure.chapters.slice(0, 5)) {
      const chapterPrompt = `Resume el siguiente capítulo legal en 2-3 oraciones:

      Capítulo ${chapter.number}: ${chapter.title}

      Contenido:
      ${chapter.content.substring(0, 1500)}

      Resumen:`;

      const chapterResponse = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: chapterPrompt }],
        temperature: 0.3,
        max_tokens: 150
      });

      summaries.chapters[chapter.number] =
        chapterResponse.choices[0].message.content || '';
    }

    return summaries;
  }

  /**
   * Generate table of contents
   */
  private generateTableOfContents(structure: DocumentStructure): any {
    const toc = {
      titles: structure.titles.map(t => ({
        number: t.number,
        title: t.title,
        chapters: []
      })),
      totalArticles: structure.articles.length,
      totalSections: structure.sections.length,
      totalChapters: structure.chapters.length
    };

    // Build hierarchical TOC
    for (const title of toc.titles) {
      const relatedChapters = structure.chapters.filter(c =>
        this.isWithinElement(c, title, structure)
      );

      title.chapters = relatedChapters.map(c => ({
        number: c.number,
        title: c.title,
        sections: structure.sections
          .filter(s => this.isWithinElement(s, c, structure))
          .map(s => ({
            number: s.number,
            title: s.title
          }))
      }));
    }

    return toc;
  }

  /**
   * Extract entities from document
   */
  private async extractEntities(content: string): Promise<string[]> {
    const entities = new Set<string>();

    // Pattern for legal entities
    const patterns = [
      /(?:Ministerio|Secretaría|Consejo|Comisión|Instituto|Agencia)\s+(?:de\s+)?[A-Z][a-záéíóúñ]+(?:\s+[A-Z][a-záéíóúñ]+)*/g,
      /(?:Corte|Tribunal|Juzgado)\s+[A-Z][a-záéíóúñ]+(?:\s+[A-Z][a-záéíóúñ]+)*/g,
      /(?:Ley|Código|Reglamento|Decreto)\s+(?:Orgánic[oa]|N[°º]\s*\d+)/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        entities.add(match[0].trim());
      }
    }

    return Array.from(entities).slice(0, 50); // Limit to top 50 entities
  }

  /**
   * Extract cross-references to other laws
   */
  private async extractCrossReferences(content: string): Promise<string[]> {
    const references = new Set<string>();

    const patterns = [
      /(?:según|conforme|de acuerdo)\s+(?:a\s+)?(?:la\s+)?Ley\s+[^\.,;]+/gi,
      /Código\s+[A-Z][a-záéíóúñ]+(?:\s+[A-Z][a-záéíóúñ]+)*/g,
      /Constitución\s+de\s+la\s+República/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        references.add(match[0].trim());
      }
    }

    return Array.from(references).slice(0, 30); // Limit to top 30 references
  }

  /**
   * Calculate document statistics
   */
  private calculateStatistics(content: string, structure: DocumentStructure): any {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      averageWordsPerSentence: Math.round(words.length / sentences.length),
      estimatedPages: Math.ceil(words.length / 250), // Assuming 250 words per page
      articlesPerChapter: structure.chapters.length > 0
        ? Math.round(structure.articles.length / structure.chapters.length)
        : 0,
      readingTimeMinutes: Math.ceil(words.length / 200) // Assuming 200 words per minute
    };
  }

  /**
   * Save articles to database
   */
  private async saveArticles(documentId: string, articles: ArticleElement[]): Promise<void> {
    // Delete existing articles for this document
    await this.prisma.$executeRaw`
      DELETE FROM legal_document_articles WHERE legal_document_id = ${documentId}::uuid
    `;

    // Batch insert new articles
    for (const article of articles) {
      // Generate embedding for article
      const embedding = await this.generateEmbedding(article.content);

      await this.prisma.$executeRaw`
        INSERT INTO legal_document_articles (
          id, legal_document_id, article_number, article_number_text,
          article_title, article_content, word_count,
          referenced_articles, keywords, embedding, created_at
        ) VALUES (
          gen_random_uuid(),
          ${documentId}::uuid,
          ${article.articleNumber},
          ${article.articleNumberText},
          ${article.title || null},
          ${article.content},
          ${article.content.split(/\s+/).length},
          ${JSON.stringify(article.referencedArticles || [])}::jsonb,
          ${JSON.stringify(article.keywords || [])}::jsonb,
          ${JSON.stringify(embedding)}::jsonb,
          NOW()
        )
      `;
    }
  }

  /**
   * Save document sections to database
   */
  private async saveSections(documentId: string, structure: DocumentStructure): Promise<void> {
    // Delete existing sections
    await this.prisma.$executeRaw`
      DELETE FROM legal_document_sections WHERE legal_document_id = ${documentId}::uuid
    `;

    // Save titles, chapters, and sections
    const allSections = [
      ...structure.titles,
      ...structure.chapters,
      ...structure.sections
    ];

    for (const section of allSections) {
      const embedding = await this.generateEmbedding(section.content);

      await this.prisma.$executeRaw`
        INSERT INTO legal_document_sections (
          id, legal_document_id, section_type, section_number,
          section_title, content, word_count, level,
          display_order, embedding, created_at
        ) VALUES (
          gen_random_uuid(),
          ${documentId}::uuid,
          ${section.type},
          ${section.number},
          ${section.title || null},
          ${section.content},
          ${section.content.split(/\s+/).length},
          ${section.level},
          ${section.position},
          ${JSON.stringify(embedding)}::jsonb,
          NOW()
        )
      `;
    }
  }

  /**
   * Save summaries to database
   */
  private async saveSummaries(documentId: string, summaries: DocumentSummaries): Promise<void> {
    // Delete existing summaries
    await this.prisma.$executeRaw`
      DELETE FROM legal_document_summaries WHERE legal_document_id = ${documentId}::uuid
    `;

    // Save executive summary
    if (summaries.executive) {
      const embedding = await this.generateEmbedding(summaries.executive);

      await this.prisma.$executeRaw`
        INSERT INTO legal_document_summaries (
          id, legal_document_id, summary_type, summary_level,
          summary_text, embedding, created_at
        ) VALUES (
          gen_random_uuid(),
          ${documentId}::uuid,
          'executive',
          'document',
          ${summaries.executive},
          ${JSON.stringify(embedding)}::jsonb,
          NOW()
        )
      `;
    }

    // Save chapter summaries
    for (const [chapterNum, summary] of Object.entries(summaries.chapters)) {
      const embedding = await this.generateEmbedding(summary);

      await this.prisma.$executeRaw`
        INSERT INTO legal_document_summaries (
          id, legal_document_id, summary_type, summary_level,
          summary_text, key_points, embedding, created_at
        ) VALUES (
          gen_random_uuid(),
          ${documentId}::uuid,
          'chapter',
          'chapter',
          ${summary},
          ${JSON.stringify({ chapterNumber: chapterNum })}::jsonb,
          ${JSON.stringify(embedding)}::jsonb,
          NOW()
        )
      `;
    }
  }

  /**
   * Generate specialized embeddings for different search strategies
   */
  private async generateSpecializedEmbeddings(
    documentId: string,
    data: any
  ): Promise<void> {
    // Generate query-based embeddings
    const potentialQueries = await this.generatePotentialQueries(data);

    for (const query of potentialQueries) {
      const embedding = await this.generateEmbedding(query);

      // Store query embeddings for query-based search
      await this.prisma.$executeRaw`
        INSERT INTO query_templates (
          id, pattern, query_type, response_template,
          required_fields, priority, created_at
        ) VALUES (
          gen_random_uuid(),
          ${query},
          'generated',
          ${`Use document ${documentId} to answer`},
          ${JSON.stringify({ documentId })}::jsonb,
          50,
          NOW()
        )
      `;
    }
  }

  /**
   * Generate potential queries for the document
   */
  private async generatePotentialQueries(data: any): Promise<string[]> {
    const queries = [];

    // Metadata queries
    queries.push(
      `¿Cuántos artículos tiene este documento?`,
      `¿Cuál es la estructura de este documento?`,
      `¿Cuántos capítulos contiene?`,
      `¿De qué trata este documento?`
    );

    // Article-specific queries
    if (data.articles && data.articles.length > 0) {
      const sampleArticles = data.articles.slice(0, 5);
      for (const article of sampleArticles) {
        queries.push(
          `¿Qué dice el artículo ${article.articleNumberText}?`,
          `¿Cuál es el contenido del artículo ${article.articleNumberText}?`
        );
      }
    }

    // Chapter-specific queries
    if (data.structure && data.structure.chapters.length > 0) {
      const sampleChapters = data.structure.chapters.slice(0, 3);
      for (const chapter of sampleChapters) {
        queries.push(
          `¿De qué trata el capítulo ${chapter.number}?`,
          `¿Qué contiene el capítulo sobre ${chapter.title}?`
        );
      }
    }

    return queries;
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000) // Limit to model's max tokens
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return [];
    }
  }

  // Helper methods

  private getHierarchyLevel(type: string): number {
    const levels: { [key: string]: number } = {
      'title': 1,
      'chapter': 2,
      'section': 3,
      'article': 4
    };
    return levels[type] || 5;
  }

  private extractElementContent(content: string, startPos: number): string {
    // Extract content until the next structural element
    const nextElementPattern = /^(?:TÍTULO|CAPÍTULO|SECCIÓN|Art(?:ículo|\.)\s*\d+)/mi;
    const remainingContent = content.substring(startPos);
    const match = nextElementPattern.exec(remainingContent.substring(100)); // Skip the current element

    if (match) {
      return remainingContent.substring(0, match.index + 100);
    }

    // If no next element, take next 2000 characters
    return remainingContent.substring(0, 2000);
  }

  private buildHierarchy(structure: DocumentStructure): DocumentStructure {
    // Assign parent-child relationships based on document position
    for (let i = 0; i < structure.chapters.length; i++) {
      const chapter = structure.chapters[i];

      // Find parent title
      for (let j = structure.titles.length - 1; j >= 0; j--) {
        if (structure.titles[j].position < chapter.position) {
          chapter.parentId = `title-${j}`;
          break;
        }
      }
    }

    for (let i = 0; i < structure.sections.length; i++) {
      const section = structure.sections[i];

      // Find parent chapter
      for (let j = structure.chapters.length - 1; j >= 0; j--) {
        if (structure.chapters[j].position < section.position) {
          section.parentId = `chapter-${j}`;
          break;
        }
      }
    }

    for (let i = 0; i < structure.articles.length; i++) {
      const article = structure.articles[i];

      // Find parent section or chapter
      for (let j = structure.sections.length - 1; j >= 0; j--) {
        if (structure.sections[j].position < article.position) {
          article.parentId = `section-${j}`;
          break;
        }
      }

      if (!article.parentId) {
        for (let j = structure.chapters.length - 1; j >= 0; j--) {
          if (structure.chapters[j].position < article.position) {
            article.parentId = `chapter-${j}`;
            break;
          }
        }
      }
    }

    return structure;
  }

  private isWithinElement(child: any, parent: any, structure: DocumentStructure): boolean {
    // Check if child element is within parent element's content range
    const parentEnd = this.getElementEnd(parent, structure);
    return child.position > parent.position && child.position < parentEnd;
  }

  private getElementEnd(element: any, structure: DocumentStructure): number {
    // Find the position of the next element at the same or higher level
    const allElements = [
      ...structure.titles,
      ...structure.chapters,
      ...structure.sections,
      ...structure.articles
    ].sort((a, b) => a.position - b.position);

    const elementIndex = allElements.findIndex(e => e.position === element.position);

    for (let i = elementIndex + 1; i < allElements.length; i++) {
      if (allElements[i].level <= element.level) {
        return allElements[i].position;
      }
    }

    return Number.MAX_SAFE_INTEGER;
  }

  private isStopWord(word: string): boolean {
    const stopWords = [
      'el', 'la', 'de', 'en', 'y', 'a', 'los', 'las', 'del', 'se', 'con',
      'para', 'por', 'una', 'un', 'su', 'al', 'es', 'lo', 'como', 'más',
      'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí', 'porque', 'esta',
      'entre', 'cuando', 'muy', 'sin', 'sobre', 'también', 'me', 'hasta',
      'hay', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos',
      'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos',
      'e', 'esto', 'mí', 'antes', 'algunos', 'qué', 'unos', 'yo', 'otro',
      'otras', 'otra', 'él', 'tanto', 'esa', 'estos', 'mucho', 'quienes',
      'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas',
      'algo', 'nosotros', 'mi', 'mis', 'tú', 'te', 'ti', 'tu', 'tus', 'ellas'
    ];

    return stopWords.includes(word.toLowerCase());
  }
}