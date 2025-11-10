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

          publicationType: data.publicationType,
          publicationNumber: data.publicationNumber,
          publicationDate: data.publicationDate ? new Date(data.publicationDate) : null,

          documentState: data.documentState || 'ORIGINAL',
          lastReformDate: data.lastReformDate ? new Date(data.lastReformDate) : null,
          reformHistory: data.reformHistory || null,

          jurisdiction: data.jurisdiction,
          effectiveFromDate: data.effectiveFromDate ? new Date(data.effectiveFromDate) : null,

          keywords: data.keywords || [],
          relatedNorms: data.relatedNorms || [],
          attachments: data.attachments || null,
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

      // Generate and store embeddings in chunks
      const chunks = await this.createDocumentChunks(
        document.id,
        data.content,
        tx
      );

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

      return {
        ...document,
        chunksCount: chunks.length,
        revisionsCount: 0,
      } as LegalDocumentResponse;
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
          reformHistory: data.reformHistory,

          jurisdiction: data.jurisdiction,
          effectiveFromDate: data.effectiveFromDate ? new Date(data.effectiveFromDate) : undefined,

          keywords: data.keywords,
          relatedNorms: data.relatedNorms,
          attachments: data.attachments,
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

      // If content changed, regenerate chunks
      if (contentChanged && data.content) {
        // Delete old chunks
        await tx.legalDocumentChunk.deleteMany({
          where: { legalDocumentId: documentId },
        });

        // Create new chunks
        await this.createDocumentChunks(documentId, data.content, tx);
      }

      // Create revision entry if document state changed to REFORMADO
      if (data.documentState === 'REFORMADO' && existingDoc.documentState !== 'REFORMADO') {
        const revisionCount = await tx.legalDocumentRevision.count({
          where: { legalDocumentId: documentId },
        });

        await tx.legalDocumentRevision.create({
          data: {
            legalDocumentId: documentId,
            revisionNumber: revisionCount + 1,
            revisionType: 'reform',
            description: 'Document marked as reformed',
            previousContent: existingDoc.content,
            newContent: data.content || existingDoc.content,
            changedBy: userId,
            effectiveDate: data.lastReformDate ? new Date(data.lastReformDate) : new Date(),
          },
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

      return {
        ...updated,
        chunksCount: updated._count.chunks,
        revisionsCount: updated._count.revisions,
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
      ...(query.isActive !== undefined && { isActive: query.isActive }),
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
            revisions: true,
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
      revisionsCount: document._count.revisions,
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
   * Private helper to create document chunks with embeddings
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

    // Generate embeddings and store chunks
    const createdChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      let embedding = null;

      // Try to generate embedding, but continue if it fails
      try {
        const embeddingResponse = await this.openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: chunk,
        });
        embedding = embeddingResponse.data[0].embedding;
      } catch (error: any) {
        console.error(`Failed to generate embedding for chunk ${i}:`, error.message);
        // Continue without embedding - document will still be searchable via text search
      }

      // Store chunk with or without embedding
      const createdChunk = await tx.legalDocumentChunk.create({
        data: {
          legalDocumentId: documentId,
          content: chunk,
          chunkIndex: i,
          embedding: embedding,
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
        1 - (ldc.embedding <=> ${queryEmbedding}::vector) as similarity
      FROM legal_document_chunks ldc
      JOIN legal_documents ld ON ld.id = ldc.legal_document_id
      WHERE ld.is_active = true
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
}