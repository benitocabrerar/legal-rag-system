/**
 * Document Processor Worker
 *
 * Background job worker for processing document analysis tasks
 * Implements queue-based processing with Bull for reliability
 */

import Bull, { Job, Queue, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { Logger } from 'pino';
import { OpenAI } from 'openai';
import { DocumentAnalyzer } from '../services/documentAnalyzer';
import { DocumentEventBus, DocumentEventType } from '../events/documentEventBus';
import { Redis } from 'ioredis';

export enum JobType {
  ANALYZE_DOCUMENT = 'analyze_document',
  EXTRACT_EMBEDDINGS = 'extract_embeddings',
  UPDATE_HIERARCHY = 'update_hierarchy',
  GENERATE_SUMMARIES = 'generate_summaries',
  INDEX_DOCUMENT = 'index_document',
  VALIDATE_REFERENCES = 'validate_references'
}

export interface DocumentJob {
  type: JobType;
  documentId: string;
  documentType: 'LegalDocument' | 'Document';
  userId?: string;
  metadata?: Record<string, any>;
  priority?: number;
  retryCount?: number;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTimeMs?: number;
}

/**
 * DocumentProcessor - Main worker class for document processing
 */
export class DocumentProcessor {
  private queue: Queue<DocumentJob>;
  private worker?: Worker<DocumentJob, JobResult>;
  private prisma: PrismaClient;
  private logger: Logger;
  private eventBus: DocumentEventBus;
  private analyzer: DocumentAnalyzer;
  private redis: Redis;
  private openai: OpenAI;
  private isRunning = false;

  constructor(
    prisma: PrismaClient,
    logger: Logger,
    eventBus: DocumentEventBus,
    redisConfig: any
  ) {
    this.prisma = prisma;
    this.logger = logger;
    this.eventBus = eventBus;
    this.redis = new Redis(redisConfig);
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.analyzer = new DocumentAnalyzer(prisma, this.openai);

    // Initialize queue
    this.queue = new Queue<DocumentJob>('document-processing', {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.setupEventListeners();
  }

  /**
   * Start the worker
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Document processor already running');
      return;
    }

    try {
      // Create worker (note: BullMQ v5+ handles delayed/repeated jobs automatically)
      this.worker = new Worker<DocumentJob, JobResult>(
        'document-processing',
        async (job: Job<DocumentJob>) => {
          return await this.processJob(job);
        },
        {
          connection: this.redis.duplicate(),
          concurrency: parseInt(process.env.WORKER_CONCURRENCY || '3'),
          limiter: {
            max: 10,
            duration: 1000 // Max 10 jobs per second
          }
        }
      );

      // Setup worker event handlers
      this.setupWorkerEvents();

      this.isRunning = true;
      this.logger.info('Document processor started successfully');

      // Process any existing jobs
      await this.processExistingJobs();
    } catch (error) {
      this.logger.error('Failed to start document processor', error);
      throw error;
    }
  }

  /**
   * Stop the worker
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      if (this.worker) {
        await this.worker.close();
      }

      await this.queue.close();
      await this.redis.quit();

      this.isRunning = false;
      this.logger.info('Document processor stopped');
    } catch (error) {
      this.logger.error('Error stopping document processor', error);
      throw error;
    }
  }

  /**
   * Add document for processing
   */
  public async addDocument(
    documentId: string,
    documentType: 'LegalDocument' | 'Document',
    options?: {
      userId?: string;
      priority?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    try {
      const job = await this.queue.add(
        JobType.ANALYZE_DOCUMENT,
        {
          type: JobType.ANALYZE_DOCUMENT,
          documentId,
          documentType,
          userId: options?.userId,
          metadata: options?.metadata,
          priority: options?.priority || 0
        },
        {
          priority: options?.priority || 0,
          delay: 0
        }
      );

      this.logger.info(`Document ${documentId} added to processing queue (Job ID: ${job.id})`);

      // Emit event
      this.eventBus.emitEvent(DocumentEventType.ANALYSIS_STARTED, {
        documentId,
        documentType,
        jobId: job.id,
        timestamp: new Date()
      });

      return job.id || '';
    } catch (error) {
      this.logger.error(`Error adding document ${documentId} to queue`, error);
      throw error;
    }
  }

  /**
   * Process a job
   */
  private async processJob(job: Job<DocumentJob>): Promise<JobResult> {
    const startTime = Date.now();
    const { data } = job;

    this.logger.info(`Processing job ${job.id}: ${data.type} for ${data.documentId}`);

    try {
      let result: any;

      // Update progress
      await job.updateProgress(10);

      switch (data.type) {
        case JobType.ANALYZE_DOCUMENT:
          result = await this.processDocumentAnalysis(job);
          break;

        case JobType.EXTRACT_EMBEDDINGS:
          result = await this.processEmbeddingExtraction(job);
          break;

        case JobType.UPDATE_HIERARCHY:
          result = await this.processHierarchyUpdate(job);
          break;

        case JobType.GENERATE_SUMMARIES:
          result = await this.processSummaryGeneration(job);
          break;

        case JobType.INDEX_DOCUMENT:
          result = await this.processDocumentIndexing(job);
          break;

        case JobType.VALIDATE_REFERENCES:
          result = await this.processReferenceValidation(job);
          break;

        default:
          throw new Error(`Unknown job type: ${data.type}`);
      }

      const processingTime = Date.now() - startTime;

      // Log success
      await this.logJobResult(job.id!, data, true, processingTime);

      // Emit completion event
      this.eventBus.emitEvent(DocumentEventType.ANALYSIS_COMPLETED, {
        documentId: data.documentId,
        documentType: data.documentType,
        jobId: job.id,
        results: result,
        processingTimeMs: processingTime,
        timestamp: new Date()
      });

      return {
        success: true,
        data: result,
        processingTimeMs: processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failure
      await this.logJobResult(job.id!, data, false, processingTime, errorMessage);

      // Emit failure event
      this.eventBus.emitEvent(DocumentEventType.ANALYSIS_FAILED, {
        documentId: data.documentId,
        documentType: data.documentType,
        jobId: job.id,
        error: errorMessage,
        processingTimeMs: processingTime,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Process document analysis job
   */
  private async processDocumentAnalysis(job: Job<DocumentJob>): Promise<any> {
    const { documentId, documentType } = job.data;

    // Update status in database
    await this.updateDocumentStatus(documentId, documentType, 'processing');

    // Update progress
    await job.updateProgress(20);

    // Get document content
    const document = await this.getDocument(documentId, documentType);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    await job.updateProgress(30);

    // Analyze document based on type
    let analysisResult;
    if (documentType === 'LegalDocument') {
      analysisResult = await this.analyzer.analyzeDocument(documentId);
    } else {
      // For user documents, use simplified analysis
      analysisResult = await this.analyzeUserDocument(documentId, document);
    }

    await job.updateProgress(70);

    // Generate additional embeddings
    await this.generateDocumentEmbeddings(documentId, documentType, document);

    await job.updateProgress(90);

    // Update document status
    await this.updateDocumentStatus(documentId, documentType, 'completed');

    await job.updateProgress(100);

    return {
      documentId,
      documentType,
      ...analysisResult.metadata
    };
  }

  /**
   * Process embedding extraction job
   */
  private async processEmbeddingExtraction(job: Job<DocumentJob>): Promise<any> {
    const { documentId, documentType } = job.data;

    const document = await this.getDocument(documentId, documentType);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    const embeddings = await this.generateDocumentEmbeddings(documentId, documentType, document);

    return {
      documentId,
      documentType,
      embeddingsGenerated: embeddings.length
    };
  }

  /**
   * Process hierarchy update job
   */
  private async processHierarchyUpdate(job: Job<DocumentJob>): Promise<any> {
    // This would typically trigger the DocumentRegistry to rebuild its hierarchy
    this.eventBus.emitEvent(DocumentEventType.INDEX_UPDATE_REQUIRED, {
      reason: 'hierarchy_update',
      documentId: job.data.documentId,
      timestamp: new Date()
    });

    return {
      documentId: job.data.documentId,
      action: 'hierarchy_update_triggered'
    };
  }

  /**
   * Process summary generation job
   */
  private async processSummaryGeneration(job: Job<DocumentJob>): Promise<any> {
    const { documentId, documentType } = job.data;

    const document = await this.getDocument(documentId, documentType);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Generate summary using OpenAI
    const summary = await this.generateSummary(document.content);

    // Store summary
    await this.storeSummary(documentId, documentType, summary);

    return {
      documentId,
      documentType,
      summaryLength: summary.length
    };
  }

  /**
   * Process document indexing job
   */
  private async processDocumentIndexing(job: Job<DocumentJob>): Promise<any> {
    const { documentId, documentType } = job.data;

    // Trigger index update
    this.eventBus.emitEvent(DocumentEventType.INDEX_UPDATE_REQUIRED, {
      documentId,
      documentType,
      action: 'index',
      timestamp: new Date()
    });

    return {
      documentId,
      documentType,
      indexed: true
    };
  }

  /**
   * Process reference validation job
   */
  private async processReferenceValidation(job: Job<DocumentJob>): Promise<any> {
    const { documentId, documentType } = job.data;

    if (documentType !== 'LegalDocument') {
      return { documentId, references: [] };
    }

    // Get document
    const document = await this.prisma.legalDocument.findUnique({
      where: { id: documentId },
      select: { metadata: true }
    });

    if (!document?.metadata) {
      return { documentId, references: [] };
    }

    const metadata = document.metadata as any;
    const references = metadata.crossReferences || [];

    // Validate each reference
    const validatedReferences = [];
    for (const ref of references) {
      const exists = await this.validateReference(ref);
      validatedReferences.push({
        reference: ref,
        valid: exists,
        checked: new Date()
      });
    }

    // Update metadata
    await this.prisma.legalDocument.update({
      where: { id: documentId },
      data: {
        metadata: {
          ...metadata,
          validatedReferences,
          referencesValidatedAt: new Date()
        }
      }
    });

    return {
      documentId,
      totalReferences: references.length,
      validReferences: validatedReferences.filter(r => r.valid).length
    };
  }

  /**
   * Analyze user document (simplified version)
   */
  private async analyzeUserDocument(documentId: string, document: any): Promise<any> {
    try {
      // Extract basic structure
      const chunks = this.chunkDocument(document.content);

      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await this.generateEmbedding(chunks[i]);

        await this.prisma.documentChunk.create({
          data: {
            documentId,
            content: chunks[i],
            chunkIndex: i,
            embedding
          }
        });
      }

      // Generate summary
      const summary = await this.generateSummary(document.content);

      return {
        success: true,
        metadata: {
          chunksCreated: chunks.length,
          summaryGenerated: true,
          wordCount: document.content.split(/\s+/).length
        }
      };
    } catch (error) {
      this.logger.error(`Error analyzing user document ${documentId}`, error);
      throw error;
    }
  }

  /**
   * Generate embeddings for document
   */
  private async generateDocumentEmbeddings(
    documentId: string,
    documentType: 'LegalDocument' | 'Document',
    document: any
  ): Promise<any[]> {
    const embeddings = [];

    try {
      // Generate different types of embeddings
      // 1. Full document embedding
      const fullEmbedding = await this.generateEmbedding(
        document.content.substring(0, 8000)
      );
      embeddings.push({
        type: 'full',
        embedding: fullEmbedding
      });

      // 2. Title/summary embedding
      const titleContent = documentType === 'LegalDocument'
        ? document.normTitle
        : document.title;
      const titleEmbedding = await this.generateEmbedding(titleContent);
      embeddings.push({
        type: 'title',
        embedding: titleEmbedding
      });

      // Store embeddings in cache for fast retrieval
      if (this.redis) {
        const key = `embeddings:${documentType}:${documentId}`;
        await this.redis.setex(key, 86400, JSON.stringify(embeddings)); // 24 hour cache
      }

      return embeddings;
    } catch (error) {
      this.logger.error(`Error generating embeddings for ${documentId}`, error);
      return [];
    }
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000)
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Error generating embedding', error);
      return [];
    }
  }

  /**
   * Generate summary for text
   */
  private async generateSummary(content: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a legal document summarizer. Create a concise summary of the document.'
          },
          {
            role: 'user',
            content: `Summarize this document in 2-3 paragraphs:\n\n${content.substring(0, 4000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      this.logger.error('Error generating summary', error);
      return '';
    }
  }

  /**
   * Chunk document into smaller pieces
   */
  private chunkDocument(content: string, chunkSize: number = 1000): string[] {
    const chunks: string[] = [];
    const sentences = content.split(/[.!?]+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Get document from database
   */
  private async getDocument(
    documentId: string,
    documentType: 'LegalDocument' | 'Document'
  ): Promise<any> {
    if (documentType === 'LegalDocument') {
      return await this.prisma.legalDocument.findUnique({
        where: { id: documentId }
      });
    } else {
      return await this.prisma.document.findUnique({
        where: { id: documentId }
      });
    }
  }

  /**
   * Update document status
   */
  private async updateDocumentStatus(
    documentId: string,
    documentType: 'LegalDocument' | 'Document',
    status: string
  ): Promise<void> {
    if (documentType === 'LegalDocument') {
      await this.prisma.legalDocument.update({
        where: { id: documentId },
        data: {
          metadata: {
            processingStatus: status,
            lastProcessed: new Date()
          }
        }
      });
    } else {
      // For user documents, we might have a status field
      // For now, just log it
      this.logger.info(`Document ${documentId} status: ${status}`);
    }
  }

  /**
   * Store summary
   */
  private async storeSummary(
    documentId: string,
    documentType: 'LegalDocument' | 'Document',
    summary: string
  ): Promise<void> {
    if (documentType === 'LegalDocument') {
      const doc = await this.prisma.legalDocument.findUnique({
        where: { id: documentId },
        select: { metadata: true }
      });

      await this.prisma.legalDocument.update({
        where: { id: documentId },
        data: {
          metadata: {
            ...(doc?.metadata as any || {}),
            generatedSummary: summary,
            summaryGeneratedAt: new Date()
          }
        }
      });
    }
  }

  /**
   * Validate reference
   */
  private async validateReference(reference: string): Promise<boolean> {
    // Check if referenced document exists
    const count = await this.prisma.legalDocument.count({
      where: {
        OR: [
          { normTitle: { contains: reference } },
          { metadata: { path: '$.references', array_contains: reference } }
        ]
      }
    });

    return count > 0;
  }

  /**
   * Log job result
   */
  private async logJobResult(
    jobId: string,
    data: DocumentJob,
    success: boolean,
    processingTime: number,
    error?: string
  ): Promise<void> {
    try {
      // Store in database or Redis
      const logEntry = {
        jobId,
        documentId: data.documentId,
        documentType: data.documentType,
        jobType: data.type,
        success,
        processingTimeMs: processingTime,
        error,
        timestamp: new Date()
      };

      // Store in Redis with expiry
      if (this.redis) {
        const key = `job:log:${jobId}`;
        await this.redis.setex(key, 604800, JSON.stringify(logEntry)); // 7 days
      }

      this.logger.info('Job result logged', logEntry);
    } catch (error) {
      this.logger.error('Error logging job result', error);
    }
  }

  /**
   * Process existing jobs on startup
   */
  private async processExistingJobs(): Promise<void> {
    try {
      const waitingCount = await this.queue.getWaitingCount();
      const activeCount = await this.queue.getActiveCount();

      this.logger.info(`Found ${waitingCount} waiting and ${activeCount} active jobs`);

      if (waitingCount > 0) {
        this.logger.info('Processing existing jobs in queue');
      }
    } catch (error) {
      this.logger.error('Error checking existing jobs', error);
    }
  }

  /**
   * Setup worker event handlers
   */
  private setupWorkerEvents(): void {
    if (!this.worker) return;

    this.worker.on('completed', (job: Job<DocumentJob>, result: JobResult) => {
      this.logger.info(`Job ${job.id} completed successfully`, {
        documentId: job.data.documentId,
        processingTime: result.processingTimeMs
      });
    });

    this.worker.on('failed', (job: Job<DocumentJob> | undefined, error: Error) => {
      if (job) {
        this.logger.error(`Job ${job.id} failed`, {
          documentId: job.data.documentId,
          error: error.message
        });
      }
    });

    this.worker.on('progress', (job: Job<DocumentJob>, progress: number | object) => {
      this.logger.debug(`Job ${job.id} progress: ${JSON.stringify(progress)}`);

      // Emit progress event
      this.eventBus.emitEvent(DocumentEventType.ANALYSIS_PROGRESS, {
        documentId: job.data.documentId,
        documentType: job.data.documentType,
        jobId: job.id,
        progress: typeof progress === 'number' ? progress : 0,
        stage: typeof progress === 'object' ? (progress as any).stage : '',
        currentStep: typeof progress === 'object' ? (progress as any).currentStep : '',
        totalSteps: typeof progress === 'object' ? (progress as any).totalSteps : 0,
        timestamp: new Date()
      });
    });

    this.worker.on('stalled', (jobId: string) => {
      this.logger.warn(`Job ${jobId} stalled`);
    });

    this.worker.on('error', (error: Error) => {
      this.logger.error('Worker error', error);
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for document upload events
    this.eventBus.subscribe(
      DocumentEventType.DOCUMENT_UPLOADED,
      async (event) => {
        await this.addDocument(
          event.payload.documentId,
          'Document',
          {
            userId: event.payload.userId,
            metadata: event.payload.metadata
          }
        );
      },
      'DocumentProcessor'
    );

    this.eventBus.subscribe(
      DocumentEventType.LEGAL_DOCUMENT_UPLOADED,
      async (event) => {
        await this.addDocument(
          event.payload.documentId,
          'LegalDocument',
          {
            userId: event.payload.userId,
            metadata: event.payload.metadata,
            priority: 1 // Higher priority for legal documents
          }
        );
      },
      'DocumentProcessor'
    );
  }

  /**
   * Get job status
   */
  public async getJobStatus(jobId: string): Promise<any> {
    try {
      const job = await this.queue.getJob(jobId);
      if (!job) {
        return null;
      }

      const state = await job.getState();
      const progress = job.progress;

      return {
        id: job.id,
        state,
        progress,
        data: job.data,
        attemptsMade: job.attemptsMade,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn,
        failedReason: job.failedReason
      };
    } catch (error) {
      this.logger.error(`Error getting job status for ${jobId}`, error);
      return null;
    }
  }

  /**
   * Get queue statistics
   */
  public async getQueueStats(): Promise<any> {
    try {
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
        this.queue.getPausedCount()
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused,
        total: waiting + active + completed + failed + delayed + paused
      };
    } catch (error) {
      this.logger.error('Error getting queue stats', error);
      return {};
    }
  }
}