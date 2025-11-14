/**
 * Hierarchical Document Chunker
 * Intelligent chunking that preserves legal document structure and hierarchy
 */

import {
  DocumentChunk,
  DocumentMetadata,
  DocumentStructure,
  Section,
  SectionType,
  ChunkingOptions,
  DEFAULT_CHUNKING_OPTIONS,
  ChunkRelationship,
  HierarchyNode,
  ImportanceFactors
} from './chunkTypes';

export class HierarchicalChunker {
  private options: Required<ChunkingOptions>;

  constructor(options: ChunkingOptions = {}) {
    this.options = { ...DEFAULT_CHUNKING_OPTIONS, ...options } as Required<ChunkingOptions>;
  }

  async chunkDocument(content: string, metadata: DocumentMetadata): Promise<DocumentChunk[]> {
    // 1. Parse document structure
    const structure = this.parseDocumentStructure(content);

    // 2. Create hierarchical chunks
    const chunks: DocumentChunk[] = [];
    let chunkId = 0;

    for (const section of structure.sections) {
      const sectionChunks = this.chunkSection(section, chunkId, metadata);
      chunks.push(...sectionChunks);
      chunkId += sectionChunks.length;
    }

    // 3. Add relationships between chunks
    this.establishChunkRelationships(chunks, structure);

    // 4. Calculate importance scores
    if (this.options.calculateImportance) {
      this.calculateImportanceScores(chunks, content);
    }

    return chunks;
  }

  private parseDocumentStructure(content: string): DocumentStructure {
    const structure: DocumentStructure = {
      title: '',
      sections: [],
      hierarchy: []
    };

    // Patterns for Ecuadorian legal document sections
    const sectionPatterns = [
      { pattern: /^T[ÍIíi]TULO\s+([IVXLCDM]+|[^\n]+)/mi, level: 1, type: 'title' as SectionType },
      { pattern: /^CAP[ÍIíi]TULO\s+([IVXLCDM]+|[^\n]+)/mi, level: 2, type: 'chapter' as SectionType },
      { pattern: /^SECCI[ÓOóo]N\s+([IVXLCDM]+|\d+|[^\n]+)/mi, level: 3, type: 'section' as SectionType },
      { pattern: /^[Aa]rt[ÍIíi]culo\s+(\d+)/mi, level: 4, type: 'article' as SectionType },
      { pattern: /^§\s*(\d+)/m, level: 5, type: 'paragraph' as SectionType },
      { pattern: /^CL[ÁAáa]USULA\s+(\w+)/mi, level: 4, type: 'clause' as SectionType },
      { pattern: /^CONSIDERANDO/mi, level: 2, type: 'considering' as SectionType },
      { pattern: /^RESUELVE/mi, level: 2, type: 'resolves' as SectionType },
      { pattern: /^PRE[ÁAáa]MBULO/mi, level: 1, type: 'preamble' as SectionType },
      { pattern: /^DISPOSICIONES?\s+TRANSITORIAS?/mi, level: 2, type: 'transitional' as SectionType },
      { pattern: /^DISPOSICI[ÓOóo]N\s+FINAL/mi, level: 2, type: 'final' as SectionType },
      { pattern: /^DISPOSICI[ÓOóo]N\s+DEROGATORIA/mi, level: 2, type: 'derogatory' as SectionType },
    ];

    const lines = content.split('\n');
    let currentSection: Section | null = null;
    let currentContent: string[] = [];

    // Extract document title
    if (lines.length > 0) {
      structure.title = lines[0].trim();
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let matched = false;

      for (const { pattern, level, type } of sectionPatterns) {
        const match = line.match(pattern);
        if (match) {
          // Save previous section
          if (currentSection && currentContent.length > 0) {
            currentSection.content = currentContent.join('\n').trim();
            structure.sections.push(currentSection);
          }

          // Start new section
          const fullLine = line.trim();
          // For articles, split title from content if on same line
          let title = fullLine;
          let firstContent: string[] = [];

          if (type === 'article' && fullLine.includes('.-')) {
            const parts = fullLine.split('.-');
            if (parts.length >= 2) {
              title = parts[0] + '.-';
              const content = parts.slice(1).join('.-').trim();
              if (content.length > 0) {
                firstContent = [content];
              }
            }
          }

          currentSection = {
            id: `${type}_${match[1] || i}`,
            type,
            level,
            title,
            content: '',
            startLine: i,
            endLine: i,
            children: []
          };

          currentContent = firstContent;
          matched = true;
          break;
        }
      }

      if (!matched && currentSection) {
        currentContent.push(line);
        currentSection.endLine = i;
      } else if (!matched && !currentSection) {
        // Content before first section (preamble)
        if (line.trim().length > 0) {
          if (!structure.sections.find(s => s.type === 'preamble')) {
            currentSection = {
              id: 'preamble_0',
              type: 'preamble',
              level: 0,
              title: 'Preámbulo',
              content: '',
              startLine: i,
              endLine: i,
              children: []
            };
            currentContent = [line];
          }
        }
      }
    }

    // Add last section
    if (currentSection && currentContent.length > 0) {
      currentSection.content = currentContent.join('\n').trim();
      structure.sections.push(currentSection);
    }

    // Build hierarchy
    structure.hierarchy = this.buildHierarchy(structure.sections);

    return structure;
  }

  private buildHierarchy(sections: Section[]): HierarchyNode[] {
    const hierarchy: HierarchyNode[] = [];
    const stack: HierarchyNode[] = [];

    for (const section of sections) {
      const node: HierarchyNode = {
        section,
        children: []
      };

      // Find parent based on level
      while (stack.length > 0 && stack[stack.length - 1].section.level >= section.level) {
        stack.pop();
      }

      if (stack.length > 0) {
        // Add as child to parent
        const parentSection = stack[stack.length - 1].section;
        stack[stack.length - 1].children.push(node);
        section.parent = parentSection;
        // Also add to parent's children array
        parentSection.children.push(section);
      } else {
        // Top-level section
        hierarchy.push(node);
      }

      stack.push(node);
    }

    return hierarchy;
  }

  private chunkSection(
    section: Section,
    startId: number,
    metadata: DocumentMetadata
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const content = section.content;

    // Skip empty sections
    if (content.trim().length === 0) {
      return chunks;
    }

    if (content.length <= this.options.maxChunkSize) {
      // Single chunk for small sections
      chunks.push({
        id: `chunk_${startId}`,
        documentId: metadata.id,
        content: content,
        section: section.title,
        sectionType: section.type,
        level: section.level,
        startChar: 0,
        endChar: content.length,
        metadata: {
          ...metadata,
          chunkIndex: startId,
          totalChunks: 1
        },
        embedding: null,
        importance: 0,
        relationships: []
      });
    } else {
      // Split large sections intelligently
      const sentences = this.splitIntoSentences(content);
      let currentChunk = '';
      let chunkStart = 0;
      let chunkIndex = 0;

      for (const sentence of sentences) {
        const potentialChunk = currentChunk + sentence;

        if (potentialChunk.length > this.options.maxChunkSize && currentChunk.length >= this.options.minChunkSize) {
          // Create chunk
          chunks.push({
            id: `chunk_${startId + chunkIndex}`,
            documentId: metadata.id,
            content: currentChunk.trim(),
            section: section.title,
            sectionType: section.type,
            level: section.level,
            startChar: chunkStart,
            endChar: chunkStart + currentChunk.length,
            metadata: {
              ...metadata,
              chunkIndex: startId + chunkIndex,
              totalChunks: -1, // Will update later
              hasOverlap: true
            },
            embedding: null,
            importance: 0,
            relationships: []
          });

          // Start new chunk with overlap
          const overlap = this.extractOverlap(currentChunk);
          currentChunk = overlap + sentence;
          chunkStart += (currentChunk.length - overlap.length);
          chunkIndex++;
        } else {
          currentChunk += sentence;
        }
      }

      // Add remaining content
      if (currentChunk.trim().length > 0) {
        chunks.push({
          id: `chunk_${startId + chunkIndex}`,
          documentId: metadata.id,
          content: currentChunk.trim(),
          section: section.title,
          sectionType: section.type,
          level: section.level,
          startChar: chunkStart,
          endChar: chunkStart + currentChunk.length,
          metadata: {
            ...metadata,
            chunkIndex: startId + chunkIndex,
            totalChunks: chunkIndex + 1
          },
          embedding: null,
          importance: 0,
          relationships: []
        });
      }

      // Update total chunks
      chunks.forEach(chunk => {
        chunk.metadata.totalChunks = chunks.length;
      });
    }

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Legal document aware sentence splitting for Ecuador
    const sentences: string[] = [];

    // Protect common legal abbreviations in Ecuador
    let protectedText = text
      .replace(/Art\./gi, 'Art[DOT]')
      .replace(/Inc\./gi, 'Inc[DOT]')
      .replace(/Ltda\./gi, 'Ltda[DOT]')
      .replace(/S\.A\./gi, 'S[DOT]A[DOT]')
      .replace(/C\.A\./gi, 'C[DOT]A[DOT]')
      .replace(/No\./gi, 'No[DOT]')
      .replace(/Dr\./gi, 'Dr[DOT]')
      .replace(/Dra\./gi, 'Dra[DOT]')
      .replace(/Ing\./gi, 'Ing[DOT]')
      .replace(/Lic\./gi, 'Lic[DOT]')
      .replace(/Núm\./gi, 'Núm[DOT]')
      .replace(/vs\./gi, 'vs[DOT]')
      .replace(/etc\./gi, 'etc[DOT]');

    // Split on sentence boundaries
    const rawSentences = protectedText.split(/(?<=[.!?])\s+(?=[A-ZÁ-Ú])/);

    // Restore abbreviations and clean
    for (const sentence of rawSentences) {
      const restored = sentence.replace(/\[DOT\]/g, '.');
      if (restored.trim().length > 0) {
        sentences.push(restored.trim() + ' ');
      }
    }

    return sentences;
  }

  private extractOverlap(chunk: string): string {
    const words = chunk.split(/\s+/);
    const targetOverlapWords = Math.floor(this.options.overlapSize / 6); // Avg 6 chars per word
    const overlapWords = Math.min(targetOverlapWords, Math.floor(words.length * 0.2));
    return words.slice(-overlapWords).join(' ') + ' ';
  }

  private establishChunkRelationships(chunks: DocumentChunk[], structure: DocumentStructure): void {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Previous/Next relationships
      if (i > 0) {
        chunk.relationships.push({
          type: 'previous',
          chunkId: chunks[i - 1].id,
          strength: 1.0
        });
      }

      if (i < chunks.length - 1) {
        chunk.relationships.push({
          type: 'next',
          chunkId: chunks[i + 1].id,
          strength: 1.0
        });
      }

      // Parent/Child relationships based on hierarchy
      const section = structure.sections.find(s => s.title === chunk.section);
      if (section) {
        // Find parent section
        if (section.parent) {
          const parentChunks = chunks.filter(c => c.section === section.parent!.title);
          if (parentChunks.length > 0) {
            chunk.relationships.push({
              type: 'parent',
              chunkId: parentChunks[0].id,
              strength: 0.8
            });
          }
        }

        // Find child sections
        const childSections = section.children;
        for (const childSection of childSections) {
          const childChunks = chunks.filter(c => c.section === childSection.title);
          for (const childChunk of childChunks) {
            chunk.relationships.push({
              type: 'child',
              chunkId: childChunk.id,
              strength: 0.6
            });
          }
        }

        // Find sibling sections (same level, same parent)
        if (section.parent) {
          const siblings = section.parent.children.filter(s => s.id !== section.id);
          for (const sibling of siblings) {
            const siblingChunks = chunks.filter(c => c.section === sibling.title);
            for (const siblingChunk of siblingChunks) {
              chunk.relationships.push({
                type: 'sibling',
                chunkId: siblingChunk.id,
                strength: 0.5
              });
            }
          }
        }
      }
    }
  }

  private calculateImportanceScores(chunks: DocumentChunk[], fullContent: string): void {
    const totalChunks = chunks.length;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      const factors: ImportanceFactors = {
        // Section level (lower number = higher in hierarchy = more important)
        // Level 1 (TÍTULO) = 0.9, Level 4 (ARTÍCULO) = 0.6
        sectionLevel: 1 - (chunk.level / 10),

        // Position in document (beginning and end are often more important)
        positionInDocument: this.calculatePositionImportance(i, totalChunks),

        // Citation count (not implemented yet, use 0.5 as neutral baseline)
        citationCount: 0.5,

        // Keyword density (legal keywords)
        keywordDensity: this.calculateKeywordDensity(chunk.content)
      };

      // Weighted importance score
      // Prioritize section level (50%) over other factors
      chunk.importance =
        factors.sectionLevel * 0.5 +
        factors.positionInDocument * 0.2 +
        factors.citationCount * 0.1 +
        factors.keywordDensity * 0.2;
    }
  }

  private calculatePositionImportance(index: number, total: number): number {
    const position = index / total;

    // U-shaped curve: higher importance at beginning and end
    if (position < 0.2) {
      return 1.0; // First 20%
    } else if (position > 0.8) {
      return 0.9; // Last 20%
    } else {
      return 0.5; // Middle
    }
  }

  private calculateKeywordDensity(content: string): number {
    const legalKeywords = [
      'artículo', 'decreto', 'ley', 'resolución', 'sentencia',
      'constitucional', 'derecho', 'obligación', 'dispone',
      'establece', 'modifica', 'deroga', 'vigencia', 'aplicación',
      'tribunal', 'corte', 'juez', 'magistrado', 'fiscal',
      'demanda', 'recurso', 'apelación', 'casación', 'amparo',
      'responsabilidad', 'sanción', 'multa', 'pena', 'delito'
    ];

    const words = content.toLowerCase().split(/\s+/);
    const keywordCount = words.filter(word =>
      legalKeywords.some(keyword => word.includes(keyword))
    ).length;

    return Math.min(1.0, keywordCount / words.length * 10);
  }

  /**
   * Get chunks by section type
   */
  getChunksBySection(chunks: DocumentChunk[], sectionType: SectionType): DocumentChunk[] {
    return chunks.filter(chunk => chunk.sectionType === sectionType);
  }

  /**
   * Get chunks with importance above threshold
   */
  getImportantChunks(chunks: DocumentChunk[], threshold: number = 0.7): DocumentChunk[] {
    return chunks.filter(chunk => chunk.importance >= threshold);
  }

  /**
   * Find related chunks by relationship type
   */
  getRelatedChunks(chunk: DocumentChunk, chunks: DocumentChunk[], relationshipType: string): DocumentChunk[] {
    const relatedIds = chunk.relationships
      .filter(rel => rel.type === relationshipType)
      .map(rel => rel.chunkId);

    return chunks.filter(c => relatedIds.includes(c.id));
  }
}
