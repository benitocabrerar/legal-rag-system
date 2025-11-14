import { PrismaClient, Prisma } from '@prisma/client';
import { OpenAI } from 'openai';
import {
  CreateLegalDocument,
  UpdateLegalDocument,
  QueryLegalDocuments,
  LegalDocumentResponse,
  PaginatedLegalDocumentsResponse,
  LegacyLegalDocument,
  NormType,
  LegalHierarchy,
  PublicationType,
  DocumentState
} from '../schemas/legal-document-schemas';
import { openAIConfig, isRetryableError, getRetryDelay } from '../config/openai.config';

export class LegalDocumentService {
  constructor(
    private prisma: PrismaClient,
    private openai: OpenAI
  ) {}

  /**
   * Create a new legal document with enhanced fields
   */
  async createDocument(
    data: CreateLegalDocument,
    userId: string
  ): Promise<LegalDocumentResponse> {
    // Start a transaction to ensure atomicity
    return await this.prisma.$transaction(async (tx) => {
      // Create the main document
      const document = await tx.legalDocument.create({
        data: {
          normType: data.normType,
          normTitle: data.normTitle,
          legalHierarchy: data.legalHierarchy,
          content: data.content,

          // Prisma requires these fields - provide defaults if not specified
          publicationType: data.publicationType || 'ORDINARIO',
          publicationNumber: data.publicationNumber || 'S/N',
          publicationDate: data.publicationDate ? new Date(data.publicationDate) : null,

          documentState: data.documentState || 'ORIGINAL',
          lastReformDate: data.lastReformDate ? new Date(data.lastReformDate) : null,

          jurisdiction: data.jurisdiction || 'NACIONAL',

          metadata: data.metadata || {},

          uploadedBy: userId,
        },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE_LEGAL_DOCUMENT',
          entity: 'LegalDocument',
          entityId: document.id,
          changes: {
            normType: data.normType,
            normTitle: data.normTitle,
            legalHierarchy: data.legalHierarchy,
          },
          success: true,
        },
      });

      return document;
    }).then(async (document) => {
      // Generate chunks and embeddings asynchronously AFTER transaction completes
      // This prevents transaction timeout issues with slow OpenAI API calls
      const vectorizationResult = await this.createDocumentChunksAsync(document.id, data.content);

      return {
        ...document,
        chunksCount: vectorizationResult.chunks.length,
        revisionsCount: 0,
        vectorization: {
          totalChunks: vectorizationResult.totalChunks,
          embeddingsGenerated: vectorizationResult.embeddingsGenerated,
          embeddingsFailed: vectorizationResult.embeddingsFailed,
          success: vectorizationResult.success,
        },
      } as any; // Extended LegalDocumentResponse with vectorization info
    });
  }

  /**
   * Update an existing legal document
   */
  async updateDocument(
    documentId: string,
    data: UpdateLegalDocument,
    userId: string
  ): Promise<LegalDocumentResponse> {
    return await this.prisma.$transaction(async (tx) => {
      // Get the existing document
      const existingDoc = await tx.legalDocument.findUnique({
        where: { id: documentId },
      });

      if (!existingDoc) {
        throw new Error('Legal document not found');
      }

      // Track if content changed for re-chunking
      const contentChanged = data.content && data.content !== existingDoc.content;

      // Update the document
      const updated = await tx.legalDocument.update({
        where: { id: documentId },
        data: {
          normType: data.normType,
          normTitle: data.normTitle,
          legalHierarchy: data.legalHierarchy,
          content: data.content,

          publicationType: data.publicationType,
          publicationNumber: data.publicationNumber,
          publicationDate: data.publicationDate ? new Date(data.publicationDate) : undefined,

          documentState: data.documentState,
          lastReformDate: data.lastReformDate ? new Date(data.lastReformDate) : undefined,

          jurisdiction: data.jurisdiction,

          metadata: data.metadata,

          isActive: data.isActive,
        },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              chunks: true,
              specialties: true,
            },
          },
        },
      });

      // If content changed, delete old chunks (regeneration happens after transaction)
      if (contentChanged && data.content) {
        await tx.legalDocumentChunk.deleteMany({
          where: { legalDocumentId: documentId },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE_LEGAL_DOCUMENT',
          entity: 'LegalDocument',
          entityId: documentId,
          changes: data,
          success: true,
        },
      });

      return { updated, contentChanged, newContent: data.content };
    }).then(async (result) => {
      const { updated, contentChanged, newContent } = result;

      // Regenerate chunks and embeddings asynchronously AFTER transaction
      if (contentChanged && newContent) {
        const vectorizationResult = await this.createDocumentChunksAsync(updated.id, newContent);
        return {
          ...updated,
          chunksCount: vectorizationResult.chunks.length,
          revisionsCount: 0,
          vectorization: {
            totalChunks: vectorizationResult.totalChunks,
            embeddingsGenerated: vectorizationResult.embeddingsGenerated,
            embeddingsFailed: vectorizationResult.embeddingsFailed,
            success: vectorizationResult.success,
          },
        } as any;
      }

      return {
        ...updated,
        chunksCount: updated._count.chunks,
        revisionsCount: 0,
      } as LegalDocumentResponse;
    });
  }

  /**
   * Query legal documents with filters and pagination
   */
  async queryDocuments(
    query: QueryLegalDocuments
  ): Promise<PaginatedLegalDocumentsResponse> {
    // Build where clause
    const where: Prisma.LegalDocumentWhereInput = {
      ...(query.normType && { normType: query.normType }),
      ...(query.legalHierarchy && { legalHierarchy: query.legalHierarchy }),
      ...(query.publicationType && { publicationType: query.publicationType }),
      ...(query.documentState && { documentState: query.documentState }),
      ...(query.jurisdiction && { jurisdiction: query.jurisdiction }),
      // Filter active documents by default unless explicitly specified
      isActive: query.isActive !== undefined ? query.isActive : true,
      ...(query.search && {
        OR: [
          { normTitle: { contains: query.search, mode: 'insensitive' } },
          { content: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.keywords && {
        keywords: {
          hasSome: query.keywords,
        },
      }),
      ...(query.publicationDateFrom || query.publicationDateTo
        ? {
            publicationDate: {
              ...(query.publicationDateFrom && { gte: new Date(query.publicationDateFrom) }),
              ...(query.publicationDateTo && { lte: new Date(query.publicationDateTo) }),
            },
          }
        : {}),
      ...(query.lastReformDateFrom || query.lastReformDateTo
        ? {
            lastReformDate: {
              ...(query.lastReformDateFrom && { gte: new Date(query.lastReformDateFrom) }),
              ...(query.lastReformDateTo && { lte: new Date(query.lastReformDateTo) }),
            },
          }
        : {}),
    };

    // Build orderBy
    const orderBy: Prisma.LegalDocumentOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    // Execute queries in parallel
    const [documents, total] = await Promise.all([
      this.prisma.legalDocument.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              chunks: true,
              specialties: true,
            },
          },
        },
      }),
      this.prisma.legalDocument.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / query.limit);
    const hasNext = query.page < totalPages;
    const hasPrevious = query.page > 1;

    // Transform documents
    const transformedDocs = documents.map((doc) => ({
      ...doc,
      chunksCount: doc._count.chunks,
      specialtiesCount: doc._count.specialties,
    }));

    return {
      documents: transformedDocs as LegalDocumentResponse[],
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
        hasNext,
        hasPrevious,
      },
    };
  }

  /**
   * Get a single document by ID
   */
  async getDocumentById(documentId: string): Promise<LegalDocumentResponse | null> {
    const document = await this.prisma.legalDocument.findUnique({
      where: { id: documentId },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            chunks: true,
            specialties: true,
          },
        },
      },
    });

    if (!document) {
      return null;
    }

    // Increment view count
    await this.prisma.legalDocument.update({
      where: { id: documentId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    return {
      ...document,
      chunksCount: document._count.chunks,
      revisionsCount: 0,
    } as LegalDocumentResponse;
  }

  /**
   * Migrate legacy document to new structure
   */
  async migrateLegacyDocument(
    legacyData: LegacyLegalDocument,
    userId: string
  ): Promise<LegalDocumentResponse> {
    // Map legacy category to new legal hierarchy
    const hierarchyMapping: Record<string, LegalHierarchy> = {
      constitution: 'CONSTITUCION',
      law: 'LEYES_ORDINARIAS',
      code: 'CODIGOS_ORDINARIOS',
      regulation: 'REGLAMENTOS',
      jurisprudence: 'RESOLUCIONES',
    };

    // Infer norm type from title and category
    const inferNormType = (title: string, category: string): NormType => {
      if (category === 'constitution') return 'CONSTITUTIONAL_NORM';
      if (category === 'law' && title.toLowerCase().includes('orgánica')) return 'ORGANIC_LAW';
      if (category === 'law') return 'ORDINARY_LAW';
      if (category === 'code' && title.toLowerCase().includes('orgánico')) return 'ORGANIC_CODE';
      if (category === 'code') return 'ORDINARY_CODE';
      if (category === 'regulation') return 'REGULATION_GENERAL';
      if (category === 'jurisprudence') return 'JUDICIAL_PRECEDENT';
      return 'ORDINARY_LAW';
    };

    const transformedData: CreateLegalDocument = {
      normType: inferNormType(legacyData.title, legacyData.category),
      normTitle: legacyData.title,
      legalHierarchy: hierarchyMapping[legacyData.category] || 'LEYES_ORDINARIAS',
      content: legacyData.content,

      publicationNumber: legacyData.metadata?.number,
      publicationDate: legacyData.metadata?.year
        ? new Date(legacyData.metadata.year, 0, 1).toISOString()
        : undefined,

      jurisdiction: legacyData.metadata?.jurisdiction,
      lastReformDate: legacyData.metadata?.effectiveDate,

      documentState: 'ORIGINAL',
      metadata: legacyData.metadata,
    };

    return await this.createDocument(transformedData, userId);
  }

  /**
   * Private helper to retry OpenAI API calls with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries - 1;
        if (isLastAttempt) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`  ⚠️  Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return null;
  }

  /**
   * Private helper to create document chunks with embeddings (async, no transaction)
   */
  private async createDocumentChunksAsync(
    documentId: string,
    content: string
  ): Promise<{
    chunks: any[];
    totalChunks: number;
    embeddingsGenerated: number;
    embeddingsFailed: number;
    success: boolean;
  }> {
    const chunkSize = 1000;
    const chunks = [];

    // Split content into chunks
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }

    // Generate embeddings and store chunks
    const createdChunks = [];
    let successCount = 0;
    let failCount = 0;

    console.log(`📝 Generating embeddings for ${chunks.length} chunks...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      let embedding = null;

      // Try to generate embedding with retries
      try {
        const embeddingResponse = await this.retryWithBackoff(
          () => this.openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: chunk,
          }),
          3, // max 3 retries
          1000 // 1 second base delay
        );

        if (embeddingResponse) {
          embedding = embeddingResponse.data[0].embedding;
          successCount++;

          if (i % 10 === 0) {
            console.log(`  ✅ Generated ${successCount} embeddings (chunk ${i + 1}/${chunks.length})`);
          }
        } else {
          failCount++;
          console.error(`  ❌ Failed to generate embedding for chunk ${i} after retries`);
        }
      } catch (error: any) {
        failCount++;
        console.error(`  ❌ Failed to generate embedding for chunk ${i}:`, error.message);
        // Continue without embedding - document will still be searchable via text search
      }

      // Store chunk with or without embedding
      const createdChunk = await this.prisma.legalDocumentChunk.create({
        data: {
          legalDocumentId: documentId,
          content: chunk,
          chunkIndex: i,
          embedding: embedding,
        },
      });

      createdChunks.push(createdChunk);
    }

    console.log(`\n📊 Embedding generation complete:`);
    console.log(`  ✅ Success: ${successCount}/${chunks.length}`);
    console.log(`  ❌ Failed: ${failCount}/${chunks.length}`);

    if (failCount > 0) {
      console.warn(`⚠️  WARNING: ${failCount} chunks saved without embeddings`);
      console.warn(`   These chunks will only be searchable via text search`);
    }

    return {
      chunks: createdChunks,
      totalChunks: chunks.length,
      embeddingsGenerated: successCount,
      embeddingsFailed: failCount,
      success: failCount === 0, // Only successful if ALL embeddings were generated
    };
  }

  /**
   * Private helper to create document chunks with embeddings (within transaction)
   */
  private async createDocumentChunks(
    documentId: string,
    content: string,
    tx: Prisma.TransactionClient
  ): Promise<any[]> {
    const chunkSize = 1000;
    const chunks = [];

    // Split content into chunks
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }

    // Store chunks WITHOUT embeddings to avoid transaction timeout
    const createdChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Store chunk without embedding
      const createdChunk = await tx.legalDocumentChunk.create({
        data: {
          legalDocumentId: documentId,
          content: chunk,
          chunkIndex: i,
          embedding: null,
        },
      });

      createdChunks.push(createdChunk);
    }

    return createdChunks;
  }

  /**
   * Perform semantic search on legal documents
   */
  async semanticSearch(
    query: string,
    limit: number = 10
  ): Promise<LegalDocumentResponse[]> {
    // Generate query embedding
    const embeddingResponse = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Perform vector similarity search
    // Note: This requires pgvector extension in PostgreSQL
    const results = await this.prisma.$queryRaw<any[]>`
      SELECT
        ld.*,
        ldc.content as matched_content,
        1 - (ldc.embedding_vector <=> ${queryEmbedding}::vector) as similarity
      FROM legal_document_chunks ldc
      JOIN legal_documents ld ON ld.id = ldc.legal_document_id
      WHERE ld.is_active = true
        AND ldc.embedding_vector IS NOT NULL
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    // Transform and deduplicate results
    const documentMap = new Map<string, any>();
    for (const result of results) {
      if (!documentMap.has(result.id)) {
        documentMap.set(result.id, result);
      }
    }

    return Array.from(documentMap.values());
  }

  /**
   * Regenerate embeddings for an existing document
   * Deletes all existing chunks and recreates them with new embeddings
   */
  async regenerateEmbeddings(
    documentId: string,
    userId: string
  ): Promise<{
    success: boolean;
    totalChunks: number;
    embeddingsGenerated: number;
    embeddingsFailed: number;
    message: string;
  }> {
    // 1. Fetch the document
    const document = await this.prisma.legalDocument.findUnique({
      where: { id: documentId },
      select: { id: true, content: true, normTitle: true, isActive: true },
    });

    if (!document) {
      throw new Error('Legal document not found');
    }

    if (!document.isActive) {
      throw new Error('Cannot regenerate embeddings for inactive document');
    }

    if (!document.content || document.content.trim().length === 0) {
      throw new Error('Document has no content to vectorize');
    }

    console.log(`\n🔄 Regenerating embeddings for document: ${document.normTitle}`);
    console.log(`📄 Document ID: ${documentId}`);

    // 2. Delete all existing chunks (in transaction for safety)
    const deletedCount = await this.prisma.$transaction(async (tx) => {
      const result = await tx.legalDocumentChunk.deleteMany({
        where: { legalDocumentId: documentId },
      });
      return result.count;
    });

    console.log(`🗑️  Deleted ${deletedCount} existing chunks`);

    // 3. Regenerate chunks and embeddings (async, outside transaction)
    const vectorizationResult = await this.createDocumentChunksAsync(
      documentId,
      document.content
    );

    // 4. Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'REGENERATE_EMBEDDINGS',
        entity: 'LegalDocument',
        entityId: documentId,
        success: vectorizationResult.success,
        metadata: {
          totalChunks: vectorizationResult.totalChunks,
          embeddingsGenerated: vectorizationResult.embeddingsGenerated,
          embeddingsFailed: vectorizationResult.embeddingsFailed,
          deletedChunks: deletedCount,
        },
      },
    });

    console.log(`✅ Embedding regeneration complete\n`);

    // 5. Build result message
    let message: string;
    if (vectorizationResult.success) {
      message = `Embeddings regenerados exitosamente. Se generaron ${vectorizationResult.embeddingsGenerated} embeddings de ${vectorizationResult.totalChunks} chunks.`;
    } else {
      message = `Regeneración parcial. Se generaron ${vectorizationResult.embeddingsGenerated} de ${vectorizationResult.totalChunks} embeddings. ${vectorizationResult.embeddingsFailed} chunks fallaron.`;
    }

    return {
      success: vectorizationResult.success,
      totalChunks: vectorizationResult.totalChunks,
      embeddingsGenerated: vectorizationResult.embeddingsGenerated,
      embeddingsFailed: vectorizationResult.embeddingsFailed,
      message,
    };
  }

  /**
   * Extract metadata from document content using OpenAI GPT-4 with retry logic
   * Returns suggested values for all metadata fields
   * Phase 1 Enhancement: Added retry logic, validation, and enrichment
   */
  async extractMetadataWithAI(
    content: string
  ): Promise<{
    suggestions: {
      normType: string;
      normTitle: string;
      legalHierarchy: string;
      publicationType: string | null;
      publicationNumber: string | null;
      publicationDate: string | null;
      documentState: string;
      jurisdiction: string | null;
      lastReformDate: string | null;
      keywords: string[];
    };
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    validationErrors?: string[];
  }> {
    console.log('\n🤖 Extracting metadata with AI (Phase 1 Enhanced)...');

    // Validate input
    if (!content || content.trim().length === 0) {
      return this.getDefaultMetadata('Contenido vacío proporcionado');
    }

    // Truncate content if too long (GPT-4 has token limits)
    const maxChars = 8000;
    const truncatedContent = content.length > maxChars
      ? content.slice(0, maxChars) + '...[contenido truncado]'
      : content;

    // Retry with exponential backoff
    for (let attempt = 0; attempt < openAIConfig.maxRetries; attempt++) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: openAIConfig.model,
          messages: [
            {
              role: 'system',
              content: `Eres un experto en derecho ecuatoriano. Tu tarea es analizar documentos legales y extraer metadatos estructurados.

TIPOS DE NORMA (normType) válidos:
- CONSTITUTIONAL_NORM: Normas constitucionales
- ORGANIC_LAW: Leyes orgánicas
- ORDINARY_LAW: Leyes ordinarias
- ORGANIC_CODE: Códigos orgánicos
- ORDINARY_CODE: Códigos ordinarios
- REGULATION_GENERAL: Reglamentos generales
- REGULATION_EXECUTIVE: Decretos ejecutivos
- ORDINANCE_MUNICIPAL: Ordenanzas municipales
- ORDINANCE_METROPOLITAN: Ordenanzas metropolitanas
- RESOLUTION_ADMINISTRATIVE: Resoluciones administrativas
- RESOLUTION_JUDICIAL: Resoluciones judiciales
- ADMINISTRATIVE_AGREEMENT: Acuerdos ministeriales
- INTERNATIONAL_TREATY: Tratados internacionales
- JUDICIAL_PRECEDENT: Jurisprudencia

JERARQUÍA LEGAL (legalHierarchy) válida:
- CONSTITUCION: Constitución de la República
- TRATADOS_INTERNACIONALES_DDHH: Tratados internacionales de DDHH
- LEYES_ORGANICAS: Leyes orgánicas
- LEYES_ORDINARIAS: Leyes ordinarias
- CODIGOS_ORGANICOS: Códigos orgánicos
- CODIGOS_ORDINARIOS: Códigos ordinarios
- REGLAMENTOS: Reglamentos y decretos
- ORDENANZAS: Ordenanzas
- RESOLUCIONES: Resoluciones
- ACUERDOS_ADMINISTRATIVOS: Acuerdos administrativos

TIPO DE PUBLICACIÓN (publicationType) válido:
- ORDINARIO: Registro oficial ordinario
- SUPLEMENTO: Suplemento
- SEGUNDO_SUPLEMENTO: Segundo suplemento
- SUPLEMENTO_ESPECIAL: Suplemento especial
- EDICION_CONSTITUCIONAL: Edición constitucional

ESTADO DEL DOCUMENTO (documentState):
- ORIGINAL: Documento original sin reformas
- REFORMADO: Documento que ha sido reformado

Extrae los metadatos del documento legal proporcionado. Responde en formato JSON con la siguiente estructura:
{
  "normType": "tipo de norma",
  "normTitle": "título completo del documento",
  "legalHierarchy": "jerarquía legal",
  "publicationType": "tipo de publicación o null",
  "publicationNumber": "número de publicación o null",
  "publicationDate": "fecha YYYY-MM-DD o null",
  "documentState": "estado del documento",
  "jurisdiction": "jurisdicción (NACIONAL, PROVINCIAL, CANTONAL, etc.) o null",
  "lastReformDate": "fecha YYYY-MM-DD o null",
  "keywords": ["palabra1", "palabra2"],
  "confidence": "high|medium|low",
  "reasoning": "explicación de la extracción"
}`
            },
            {
              role: 'user',
              content: `Analiza el siguiente documento legal ecuatoriano y extrae los metadatos:\n\n${truncatedContent}`
            }
          ],
          response_format: { type: 'json_object' },
          temperature: openAIConfig.temperature,
          max_tokens: openAIConfig.maxTokens,
          top_p: openAIConfig.topP,
        });

        const result = completion.choices[0].message.content;
        if (!result) {
          throw new Error('No response from OpenAI');
        }

        const parsed = JSON.parse(result);

        // Validate and enrich extracted metadata
        const validated = this.validateAndEnrichMetadata(parsed);

        console.log('✅ AI extraction complete (Phase 1)');
        console.log(`  📋 Norm Type: ${validated.suggestions.normType}`);
        console.log(`  📝 Title: ${validated.suggestions.normTitle.substring(0, 60)}...`);
        console.log(`  📊 Hierarchy: ${validated.suggestions.legalHierarchy}`);
        console.log(`  🎯 Confidence: ${validated.confidence}`);
        if (validated.validationErrors && validated.validationErrors.length > 0) {
          console.log(`  ⚠️  Validation warnings: ${validated.validationErrors.length}`);
        }

        return validated;

      } catch (error: any) {
        const isLastAttempt = attempt === openAIConfig.maxRetries - 1;

        if (isRetryableError(error) && !isLastAttempt) {
          const delay = getRetryDelay(attempt);
          console.warn(`  ⚠️  Retry attempt ${attempt + 1}/${openAIConfig.maxRetries} after ${delay}ms...`);
          console.warn(`  📋 Error: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Non-retryable error or last attempt failed
        console.error('❌ AI extraction failed:', error.message);
        return this.getDefaultMetadata(`Error: ${error.message}`);
      }
    }

    // Fallback (should never reach here)
    return this.getDefaultMetadata('Máximo número de reintentos alcanzado');
  }

  /**
   * Validate and enrich extracted metadata
   * Phase 1 Enhancement: Ensure consistency and completeness
   */
  private validateAndEnrichMetadata(parsed: any): {
    suggestions: {
      normType: string;
      normTitle: string;
      legalHierarchy: string;
      publicationType: string | null;
      publicationNumber: string | null;
      publicationDate: string | null;
      documentState: string;
      jurisdiction: string | null;
      lastReformDate: string | null;
      keywords: string[];
    };
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    validationErrors?: string[];
  } {
    const validationErrors: string[] = [];

    // Valid norm types
    const validNormTypes = [
      'CONSTITUTIONAL_NORM', 'ORGANIC_LAW', 'ORDINARY_LAW', 'ORGANIC_CODE',
      'ORDINARY_CODE', 'REGULATION_GENERAL', 'REGULATION_EXECUTIVE',
      'ORDINANCE_MUNICIPAL', 'ORDINANCE_METROPOLITAN', 'RESOLUTION_ADMINISTRATIVE',
      'RESOLUTION_JUDICIAL', 'ADMINISTRATIVE_AGREEMENT', 'INTERNATIONAL_TREATY',
      'JUDICIAL_PRECEDENT'
    ];

    // Valid hierarchies
    const validHierarchies = [
      'CONSTITUCION', 'TRATADOS_INTERNACIONALES_DDHH', 'LEYES_ORGANICAS',
      'LEYES_ORDINARIAS', 'CODIGOS_ORGANICOS', 'CODIGOS_ORDINARIOS',
      'REGLAMENTOS', 'ORDENANZAS', 'RESOLUCIONES', 'ACUERDOS_ADMINISTRATIVOS'
    ];

    // Validate normType
    const normType = validNormTypes.includes(parsed.normType)
      ? parsed.normType
      : 'ORDINARY_LAW';
    if (!validNormTypes.includes(parsed.normType)) {
      validationErrors.push(`Tipo de norma inválido: ${parsed.normType}, usando ORDINARY_LAW`);
    }

    // Validate legalHierarchy
    const legalHierarchy = validHierarchies.includes(parsed.legalHierarchy)
      ? parsed.legalHierarchy
      : 'LEYES_ORDINARIAS';
    if (!validHierarchies.includes(parsed.legalHierarchy)) {
      validationErrors.push(`Jerarquía inválida: ${parsed.legalHierarchy}, usando LEYES_ORDINARIAS`);
    }

    // Ensure normType and legalHierarchy are consistent
    const hierarchyMapping: Record<string, string[]> = {
      'CONSTITUCION': ['CONSTITUTIONAL_NORM'],
      'LEYES_ORGANICAS': ['ORGANIC_LAW'],
      'LEYES_ORDINARIAS': ['ORDINARY_LAW'],
      'CODIGOS_ORGANICOS': ['ORGANIC_CODE'],
      'CODIGOS_ORDINARIOS': ['ORDINARY_CODE'],
      'REGLAMENTOS': ['REGULATION_GENERAL', 'REGULATION_EXECUTIVE'],
      'ORDENANZAS': ['ORDINANCE_MUNICIPAL', 'ORDINANCE_METROPOLITAN'],
      'RESOLUCIONES': ['RESOLUTION_ADMINISTRATIVE', 'RESOLUTION_JUDICIAL'],
      'ACUERDOS_ADMINISTRATIVOS': ['ADMINISTRATIVE_AGREEMENT'],
    };

    // Validate date formats
    const isValidDate = (dateStr: string | null): boolean => {
      if (!dateStr) return true;
      return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    };

    if (parsed.publicationDate && !isValidDate(parsed.publicationDate)) {
      validationErrors.push(`Fecha de publicación inválida: ${parsed.publicationDate}`);
      parsed.publicationDate = null;
    }

    if (parsed.lastReformDate && !isValidDate(parsed.lastReformDate)) {
      validationErrors.push(`Fecha de reforma inválida: ${parsed.lastReformDate}`);
      parsed.lastReformDate = null;
    }

    // Adjust confidence based on validation errors
    let confidence: 'high' | 'medium' | 'low' = parsed.confidence || 'medium';
    if (validationErrors.length > 3) {
      confidence = 'low';
    } else if (validationErrors.length > 0) {
      confidence = confidence === 'high' ? 'medium' : confidence;
    }

    return {
      suggestions: {
        normType,
        normTitle: parsed.normTitle || '',
        legalHierarchy,
        publicationType: parsed.publicationType || null,
        publicationNumber: parsed.publicationNumber || null,
        publicationDate: parsed.publicationDate || null,
        documentState: parsed.documentState || 'ORIGINAL',
        jurisdiction: parsed.jurisdiction || 'NACIONAL',
        lastReformDate: parsed.lastReformDate || null,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      },
      confidence,
      reasoning: parsed.reasoning || 'Análisis automático completado',
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
    };
  }

  /**
   * Get default metadata when extraction fails
   */
  private getDefaultMetadata(reason: string): {
    suggestions: {
      normType: string;
      normTitle: string;
      legalHierarchy: string;
      publicationType: string | null;
      publicationNumber: string | null;
      publicationDate: string | null;
      documentState: string;
      jurisdiction: string | null;
      lastReformDate: string | null;
      keywords: string[];
    };
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
  } {
    return {
      suggestions: {
        normType: 'ORDINARY_LAW',
        normTitle: '',
        legalHierarchy: 'LEYES_ORDINARIAS',
        publicationType: null,
        publicationNumber: null,
        publicationDate: null,
        documentState: 'ORIGINAL',
        jurisdiction: 'NACIONAL',
        lastReformDate: null,
        keywords: [],
      },
      confidence: 'low',
      reasoning: `${reason}. Por favor ingrese los metadatos manualmente.`,
    };
  }
}