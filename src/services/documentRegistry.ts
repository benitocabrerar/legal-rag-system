/**
 * Document Registry Service
 *
 * Central registry for all documents (both LegalDocument and Document)
 * Maintains hierarchical structure, versioning, and discovery API
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { Logger } from 'pino';
import { DocumentEventBus, DocumentEventType } from '../events/documentEventBus';
import { Redis } from 'ioredis';

export interface DocumentNode {
  id: string;
  type: 'root' | 'category' | 'document' | 'title' | 'chapter' | 'section' | 'article';
  name: string;
  documentType?: 'LegalDocument' | 'Document';
  documentId?: string;
  metadata?: Record<string, any>;
  children: DocumentNode[];
  path: string;
  level: number;
  isActive: boolean;
  version?: string;
  lastUpdated: Date;
}

export interface DocumentSearchResult {
  id: string;
  type: 'LegalDocument' | 'Document';
  title: string;
  path: string;
  relevance: number;
  metadata: Record<string, any>;
  accessible: boolean;
}

export interface DocumentRegistryStats {
  totalDocuments: number;
  legalDocuments: number;
  userDocuments: number;
  totalArticles: number;
  totalSections: number;
  totalChapters: number;
  hierarchyDepth: number;
  lastUpdated: Date;
}

export class DocumentRegistry {
  private prisma: PrismaClient;
  private logger: Logger;
  private eventBus: DocumentEventBus;
  private redis?: Redis;
  private hierarchyCache: Map<string, DocumentNode> = new Map();
  private cacheExpiry = 3600; // 1 hour in seconds

  constructor(prisma: PrismaClient, logger: Logger, eventBus: DocumentEventBus, redis?: Redis) {
    this.prisma = prisma;
    this.logger = logger;
    this.eventBus = eventBus;
    this.redis = redis;

    this.setupEventListeners();
    this.initializeRegistry();
  }

  /**
   * Initialize the registry and build initial hierarchy
   */
  private async initializeRegistry(): Promise<void> {
    try {
      await this.rebuildHierarchy();
      this.logger.info('Document registry initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize document registry', error);
    }
  }

  /**
   * Get the complete document hierarchy
   */
  public async getHierarchy(userId?: string): Promise<DocumentNode> {
    const cacheKey = `hierarchy:${userId || 'global'}`;

    // Check cache first
    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Check memory cache
    if (this.hierarchyCache.has(cacheKey)) {
      return this.hierarchyCache.get(cacheKey)!;
    }

    // Build hierarchy
    const hierarchy = await this.buildHierarchy(userId);

    // Cache result
    if (this.redis) {
      await this.redis.setex(cacheKey, this.cacheExpiry, JSON.stringify(hierarchy));
    }
    this.hierarchyCache.set(cacheKey, hierarchy);

    return hierarchy;
  }

  /**
   * Build the document hierarchy
   */
  private async buildHierarchy(userId?: string): Promise<DocumentNode> {
    const root: DocumentNode = {
      id: 'root',
      type: 'root',
      name: 'Legal Document Registry',
      children: [],
      path: '/',
      level: 0,
      isActive: true,
      lastUpdated: new Date()
    };

    // Build Legal Documents branch
    const legalBranch = await this.buildLegalDocumentsBranch();
    root.children.push(legalBranch);

    // Build User Documents branch (if userId provided)
    if (userId) {
      const userBranch = await this.buildUserDocumentsBranch(userId);
      root.children.push(userBranch);
    }

    return root;
  }

  /**
   * Build Legal Documents hierarchy branch
   */
  private async buildLegalDocumentsBranch(): Promise<DocumentNode> {
    const branch: DocumentNode = {
      id: 'legal-documents',
      type: 'category',
      name: 'Legal Documents Library',
      children: [],
      path: '/legal-documents',
      level: 1,
      isActive: true,
      lastUpdated: new Date()
    };

    // Fetch legal documents grouped by hierarchy
    const documents = await this.prisma.legalDocument.findMany({
      where: { isActive: true },
      orderBy: [
        { legalHierarchy: 'asc' },
        { normType: 'asc' },
        { publicationDate: 'desc' }
      ],
      select: {
        id: true,
        normTitle: true,
        normType: true,
        legalHierarchy: true,
        publicationType: true,
        publicationDate: true,
        documentState: true,
        metadata: true
      }
    });

    // Group by legal hierarchy
    const hierarchyGroups = new Map<string, typeof documents>();
    for (const doc of documents) {
      const group = hierarchyGroups.get(doc.legalHierarchy) || [];
      group.push(doc);
      hierarchyGroups.set(doc.legalHierarchy, group);
    }

    // Create hierarchy nodes
    for (const [hierarchy, docs] of hierarchyGroups) {
      const hierarchyNode: DocumentNode = {
        id: `hierarchy-${hierarchy}`,
        type: 'category',
        name: this.formatHierarchyName(hierarchy),
        children: [],
        path: `/legal-documents/${hierarchy.toLowerCase()}`,
        level: 2,
        isActive: true,
        metadata: { hierarchy },
        lastUpdated: new Date()
      };

      // Add documents to hierarchy
      for (const doc of docs) {
        const docNode: DocumentNode = {
          id: doc.id,
          type: 'document',
          name: doc.normTitle,
          documentType: 'LegalDocument',
          documentId: doc.id,
          children: await this.getDocumentStructure(doc.id),
          path: `/legal-documents/${hierarchy.toLowerCase()}/${doc.id}`,
          level: 3,
          isActive: true,
          metadata: {
            normType: doc.normType,
            publicationType: doc.publicationType,
            publicationDate: doc.publicationDate,
            documentState: doc.documentState,
            ...((doc.metadata as any) || {})
          },
          version: doc.documentState,
          lastUpdated: new Date()
        };

        hierarchyNode.children.push(docNode);
      }

      branch.children.push(hierarchyNode);
    }

    return branch;
  }

  /**
   * Build User Documents hierarchy branch
   */
  private async buildUserDocumentsBranch(userId: string): Promise<DocumentNode> {
    const branch: DocumentNode = {
      id: 'user-documents',
      type: 'category',
      name: 'My Case Documents',
      children: [],
      path: '/user-documents',
      level: 1,
      isActive: true,
      lastUpdated: new Date()
    };

    // Fetch user's cases with documents
    const cases = await this.prisma.case.findMany({
      where: { userId },
      include: {
        documents: {
          select: {
            id: true,
            title: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Build case nodes
    for (const caseItem of cases) {
      const caseNode: DocumentNode = {
        id: `case-${caseItem.id}`,
        type: 'category',
        name: caseItem.title,
        children: [],
        path: `/user-documents/case-${caseItem.id}`,
        level: 2,
        isActive: caseItem.status === 'active',
        metadata: {
          caseNumber: caseItem.caseNumber,
          clientName: caseItem.clientName,
          status: caseItem.status
        },
        lastUpdated: caseItem.updatedAt
      };

      // Add documents to case
      for (const doc of caseItem.documents) {
        const docNode: DocumentNode = {
          id: doc.id,
          type: 'document',
          name: doc.title,
          documentType: 'Document',
          documentId: doc.id,
          children: [],
          path: `/user-documents/case-${caseItem.id}/${doc.id}`,
          level: 3,
          isActive: true,
          lastUpdated: doc.createdAt
        };

        caseNode.children.push(docNode);
      }

      branch.children.push(caseNode);
    }

    return branch;
  }

  /**
   * Get document internal structure (titles, chapters, sections, articles)
   */
  private async getDocumentStructure(documentId: string): Promise<DocumentNode[]> {
    const nodes: DocumentNode[] = [];

    try {
      // Fetch document metadata
      const document = await this.prisma.legalDocument.findUnique({
        where: { id: documentId },
        select: { metadata: true }
      });

      if (document?.metadata) {
        const metadata = document.metadata as any;

        // Build structure from metadata
        if (metadata.documentStructure) {
          const structure = metadata.documentStructure;

          // Add titles
          if (structure.titles) {
            for (const title of structure.titles) {
              const titleNode: DocumentNode = {
                id: `${documentId}-title-${title.number}`,
                type: 'title',
                name: `Título ${title.number}: ${title.title}`,
                children: [],
                path: `/document/${documentId}/title/${title.number}`,
                level: 4,
                isActive: true,
                lastUpdated: new Date()
              };

              // Add chapters under this title
              if (structure.chapters) {
                for (const chapter of structure.chapters) {
                  if (chapter.parentId === `title-${title.number}`) {
                    const chapterNode: DocumentNode = {
                      id: `${documentId}-chapter-${chapter.number}`,
                      type: 'chapter',
                      name: `Capítulo ${chapter.number}: ${chapter.title}`,
                      children: [],
                      path: `/document/${documentId}/chapter/${chapter.number}`,
                      level: 5,
                      isActive: true,
                      lastUpdated: new Date()
                    };

                    titleNode.children.push(chapterNode);
                  }
                }
              }

              nodes.push(titleNode);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error getting document structure for ${documentId}`, error);
    }

    return nodes;
  }

  /**
   * Search documents in the registry
   */
  public async searchDocuments(
    query: string,
    userId?: string,
    options?: {
      documentType?: 'LegalDocument' | 'Document';
      limit?: number;
      offset?: number;
      includeContent?: boolean;
    }
  ): Promise<DocumentSearchResult[]> {
    const results: DocumentSearchResult[] = [];
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // Search legal documents
    if (!options?.documentType || options.documentType === 'LegalDocument') {
      const legalDocs = await this.prisma.legalDocument.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                { normTitle: { contains: query, mode: 'insensitive' } },
                { metadata: { path: '$.keywords', array_contains: query } }
              ]
            }
          ]
        },
        take: limit,
        skip: offset
      });

      for (const doc of legalDocs) {
        results.push({
          id: doc.id,
          type: 'LegalDocument',
          title: doc.normTitle,
          path: `/legal-documents/${doc.legalHierarchy.toLowerCase()}/${doc.id}`,
          relevance: this.calculateRelevance(query, doc.normTitle),
          metadata: doc.metadata as any || {},
          accessible: true // Legal documents are accessible to all authenticated users
        });
      }
    }

    // Search user documents
    if (userId && (!options?.documentType || options.documentType === 'Document')) {
      const userDocs = await this.prisma.document.findMany({
        where: {
          AND: [
            { userId },
            { title: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: limit,
        skip: offset,
        include: { case: { select: { title: true } } }
      });

      for (const doc of userDocs) {
        results.push({
          id: doc.id,
          type: 'Document',
          title: doc.title,
          path: `/user-documents/case-${doc.caseId}/${doc.id}`,
          relevance: this.calculateRelevance(query, doc.title),
          metadata: { caseTitle: doc.case.title },
          accessible: true
        });
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    return results;
  }

  /**
   * Get registry statistics
   */
  public async getStatistics(): Promise<DocumentRegistryStats> {
    const [legalCount, userCount, articleStats, sectionStats, chapterStats] = await Promise.all([
      this.prisma.legalDocument.count({ where: { isActive: true } }),
      this.prisma.document.count(),
      this.prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COUNT(*) as total FROM legal_document_articles
      `,
      this.prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COUNT(*) as total FROM legal_document_sections WHERE section_type = 'section'
      `,
      this.prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COUNT(*) as total FROM legal_document_sections WHERE section_type = 'chapter'
      `
    ]);

    return {
      totalDocuments: legalCount + userCount,
      legalDocuments: legalCount,
      userDocuments: userCount,
      totalArticles: Number(articleStats[0]?.total || 0),
      totalSections: Number(sectionStats[0]?.total || 0),
      totalChapters: Number(chapterStats[0]?.total || 0),
      hierarchyDepth: 6, // root -> category -> document -> title -> chapter -> section
      lastUpdated: new Date()
    };
  }

  /**
   * Register a new document in the registry
   */
  public async registerDocument(
    documentId: string,
    documentType: 'LegalDocument' | 'Document',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Clear cache
      await this.clearCache();

      // Emit registry update event
      this.eventBus.emitEvent(DocumentEventType.REGISTRY_UPDATED, {
        documentId,
        documentType,
        action: 'registered',
        metadata,
        timestamp: new Date()
      });

      // Rebuild hierarchy asynchronously
      this.rebuildHierarchy().catch(error => {
        this.logger.error('Error rebuilding hierarchy after document registration', error);
      });

      this.logger.info(`Document registered: ${documentId} (${documentType})`);
    } catch (error) {
      this.logger.error(`Error registering document ${documentId}`, error);
      throw error;
    }
  }

  /**
   * Update document in registry
   */
  public async updateDocument(
    documentId: string,
    documentType: 'LegalDocument' | 'Document',
    updates: Record<string, any>
  ): Promise<void> {
    try {
      // Clear cache
      await this.clearCache();

      // Emit registry update event
      this.eventBus.emitEvent(DocumentEventType.REGISTRY_UPDATED, {
        documentId,
        documentType,
        action: 'updated',
        updates,
        timestamp: new Date()
      });

      this.logger.info(`Document updated in registry: ${documentId}`);
    } catch (error) {
      this.logger.error(`Error updating document ${documentId} in registry`, error);
      throw error;
    }
  }

  /**
   * Remove document from registry
   */
  public async unregisterDocument(
    documentId: string,
    documentType: 'LegalDocument' | 'Document'
  ): Promise<void> {
    try {
      // Clear cache
      await this.clearCache();

      // Emit registry update event
      this.eventBus.emitEvent(DocumentEventType.REGISTRY_UPDATED, {
        documentId,
        documentType,
        action: 'unregistered',
        timestamp: new Date()
      });

      this.logger.info(`Document unregistered: ${documentId}`);
    } catch (error) {
      this.logger.error(`Error unregistering document ${documentId}`, error);
      throw error;
    }
  }

  /**
   * Get document versions
   */
  public async getDocumentVersions(
    documentId: string,
    documentType: 'LegalDocument' | 'Document'
  ): Promise<any[]> {
    // TODO: Implement versioning table and logic
    // For now, return empty array
    return [];
  }

  /**
   * Rebuild the entire hierarchy
   */
  public async rebuildHierarchy(): Promise<void> {
    try {
      await this.clearCache();

      // Build fresh hierarchy
      const globalHierarchy = await this.buildHierarchy();

      // Cache it
      if (this.redis) {
        await this.redis.setex('hierarchy:global', this.cacheExpiry, JSON.stringify(globalHierarchy));
      }
      this.hierarchyCache.set('hierarchy:global', globalHierarchy);

      // Emit event
      this.eventBus.emitEvent(DocumentEventType.HIERARCHY_REBUILT, {
        timestamp: new Date(),
        stats: await this.getStatistics()
      });

      this.logger.info('Document hierarchy rebuilt successfully');
    } catch (error) {
      this.logger.error('Error rebuilding document hierarchy', error);
      throw error;
    }
  }

  // Private helper methods

  private formatHierarchyName(hierarchy: string): string {
    const names: Record<string, string> = {
      CONSTITUCION: 'Constitución',
      TRATADOS_INTERNACIONALES_DDHH: 'Tratados Internacionales y DDHH',
      LEYES_ORGANICAS: 'Leyes Orgánicas',
      LEYES_ORDINARIAS: 'Leyes Ordinarias',
      CODIGOS_ORGANICOS: 'Códigos Orgánicos',
      CODIGOS_ORDINARIOS: 'Códigos Ordinarios',
      REGLAMENTOS: 'Reglamentos',
      ORDENANZAS: 'Ordenanzas',
      RESOLUCIONES: 'Resoluciones',
      ACUERDOS_ADMINISTRATIVOS: 'Acuerdos Administrativos'
    };

    return names[hierarchy] || hierarchy;
  }

  private calculateRelevance(query: string, title: string): number {
    const queryLower = query.toLowerCase();
    const titleLower = title.toLowerCase();

    if (titleLower === queryLower) return 100;
    if (titleLower.startsWith(queryLower)) return 90;
    if (titleLower.includes(queryLower)) return 70;

    // Calculate word overlap
    const queryWords = queryLower.split(/\s+/);
    const titleWords = titleLower.split(/\s+/);
    const overlap = queryWords.filter(word => titleWords.includes(word)).length;

    return Math.min(50, overlap * 20);
  }

  private async clearCache(): Promise<void> {
    this.hierarchyCache.clear();

    if (this.redis) {
      const keys = await this.redis.keys('hierarchy:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }

  private setupEventListeners(): void {
    // Listen for document uploads
    this.eventBus.subscribe(
      DocumentEventType.DOCUMENT_UPLOADED,
      async (event) => {
        await this.registerDocument(
          event.payload.documentId,
          'Document',
          event.payload.metadata
        );
      },
      'DocumentRegistry'
    );

    this.eventBus.subscribe(
      DocumentEventType.LEGAL_DOCUMENT_UPLOADED,
      async (event) => {
        await this.registerDocument(
          event.payload.documentId,
          'LegalDocument',
          event.payload.metadata
        );
      },
      'DocumentRegistry'
    );

    // Listen for analysis completion
    this.eventBus.subscribe(
      DocumentEventType.ANALYSIS_COMPLETED,
      async (event) => {
        await this.updateDocument(
          event.payload.documentId,
          event.payload.documentType,
          { analyzed: true, ...event.payload.results }
        );
      },
      'DocumentRegistry'
    );
  }
}