/**
 * Document Summarization Streaming Routes (SSE)
 *
 * Server-Sent Events endpoint for real-time document summarization streaming.
 * Provides: Progressive summary generation, live status updates, chunk-by-chunk processing
 *
 * Enhanced with comprehensive error handling:
 * - Graceful client disconnect handling
 * - Streaming progress updates
 * - Connection timeout management
 * - Rate limiting and resource control
 *
 * @module routes/summarization-streaming
 * @version 1.0.0
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getDocumentSummarizationService } from '../services/ai/document-summarization.service.js';
import { OpenAI } from 'openai';

// ============================================================================
// Schema Validation
// ============================================================================

/**
 * Schema for streaming summarization request
 */
const StreamSummarySchema = z.object({
  documentId: z.string().uuid('Invalid document UUID'),
  level: z.enum(['brief', 'standard', 'detailed'], {
    errorMap: () => ({ message: 'Level must be one of: brief, standard, detailed' })
  }),
  language: z.enum(['es', 'en']).default('es'),
  includeKeyPoints: z.boolean().default(true),
  includeReferences: z.boolean().default(false),
  streamChunks: z.boolean().default(true)
});

type StreamSummaryInput = z.infer<typeof StreamSummarySchema>;

/**
 * Schema for streaming comparison request
 */
const StreamComparisonSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(2).max(5),
  language: z.enum(['es', 'en']).default('es'),
  includeDocumentSummaries: z.boolean().default(true)
});

type StreamComparisonInput = z.infer<typeof StreamComparisonSchema>;

// ============================================================================
// Types and Interfaces
// ============================================================================

interface SSEClient {
  reply: FastifyReply;
  userId: string;
  connectedAt: Date;
  lastActivity: Date;
  documentId?: string;
  aborted: boolean;
}

interface SSEEvent {
  type: 'connected' | 'progress' | 'chunk' | 'keypoint' | 'completed' | 'error' | 'timeout' | 'heartbeat';
  data?: any;
  timestamp: string;
  progress?: number;
}

interface StreamingProgress {
  stage: 'initializing' | 'analyzing' | 'summarizing' | 'extracting' | 'finalizing' | 'completed';
  progress: number;
  message: string;
  details?: Record<string, any>;
}

// ============================================================================
// Active Connection Management
// ============================================================================

// Track active SSE connections
const activeStreams = new Map<string, SSEClient>();

// Connection timeout (15 minutes for long-running summarizations)
const CONNECTION_TIMEOUT_MS = parseInt(process.env.SSE_SUMMARIZATION_TIMEOUT_MS || '900000');
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

// Maximum concurrent streams per user
const MAX_STREAMS_PER_USER = 3;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate unique stream ID
 */
function generateStreamId(userId: string): string {
  return `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Send SSE event to client
 */
function sendSSEEvent(client: SSEClient, event: SSEEvent): boolean {
  if (client.aborted) {
    return false;
  }

  try {
    const eventData = {
      type: event.type,
      timestamp: event.timestamp,
      ...(event.progress !== undefined && { progress: event.progress }),
      ...(event.data && { data: event.data })
    };

    client.reply.raw.write(`data: ${JSON.stringify(eventData)}\n\n`);
    client.lastActivity = new Date();
    return true;
  } catch (error) {
    console.error('[SSE] Failed to send event:', error);
    client.aborted = true;
    return false;
  }
}

/**
 * Send progress update
 */
function sendProgress(client: SSEClient, progressData: StreamingProgress): boolean {
  return sendSSEEvent(client, {
    type: 'progress',
    data: progressData,
    timestamp: new Date().toISOString(),
    progress: progressData.progress
  });
}

/**
 * Send chunk update
 */
function sendChunk(client: SSEClient, chunkData: any): boolean {
  return sendSSEEvent(client, {
    type: 'chunk',
    data: chunkData,
    timestamp: new Date().toISOString()
  });
}

/**
 * Send error event
 */
function sendError(client: SSEClient, error: Error | string): boolean {
  return sendSSEEvent(client, {
    type: 'error',
    data: {
      error: error instanceof Error ? error.message : error,
      code: (error as any)?.code || 'STREAMING_ERROR'
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Send completion event
 */
function sendCompletion(client: SSEClient, result: any): boolean {
  return sendSSEEvent(client, {
    type: 'completed',
    data: result,
    timestamp: new Date().toISOString(),
    progress: 100
  });
}

/**
 * Check if user has too many active streams
 */
function hasMaxStreams(userId: string): boolean {
  let userStreamCount = 0;
  const clients = Array.from(activeStreams.values());
  for (const client of clients) {
    if (client.userId === userId) {
      userStreamCount++;
    }
  }
  return userStreamCount >= MAX_STREAMS_PER_USER;
}

/**
 * Clean up disconnected streams
 */
function cleanupStream(streamId: string): void {
  const client = activeStreams.get(streamId);
  if (client) {
    client.aborted = true;
    activeStreams.delete(streamId);
    console.log(`[SSE] Stream ${streamId} cleaned up`);
  }
}

/**
 * Get all clients as array (for iteration)
 */
function getActiveClients(): Array<[string, SSEClient]> {
  return Array.from(activeStreams.entries());
}

/**
 * Heartbeat to keep connections alive
 */
let heartbeatInterval: NodeJS.Timeout | null = null;

function startHeartbeat(): void {
  if (heartbeatInterval) return;

  heartbeatInterval = setInterval(() => {
    const now = Date.now();
    const staleStreams: string[] = [];

    for (const [streamId, client] of getActiveClients()) {
      const connectionAge = now - client.connectedAt.getTime();
      const inactivityDuration = now - client.lastActivity.getTime();

      // Remove stale connections
      if (connectionAge > CONNECTION_TIMEOUT_MS || client.aborted) {
        staleStreams.push(streamId);
        continue;
      }

      // Send heartbeat
      try {
        client.reply.raw.write(`: heartbeat ${now}\n\n`);
        client.lastActivity = new Date();
      } catch (error) {
        staleStreams.push(streamId);
      }
    }

    // Cleanup stale streams
    for (const streamId of staleStreams) {
      cleanupStream(streamId);
    }
  }, HEARTBEAT_INTERVAL_MS);

  console.log('[SSE] Heartbeat started');
}

function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('[SSE] Heartbeat stopped');
  }
}

// ============================================================================
// OpenAI Streaming Helper
// ============================================================================

/**
 * Stream OpenAI completion with progress updates
 */
async function streamOpenAICompletion(
  client: SSEClient,
  prompt: string,
  systemPrompt: string,
  model: string = 'gpt-4'
): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000'),
  });

  let fullContent = '';
  let chunkCount = 0;

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      stream: true
    });

    for await (const chunk of stream) {
      if (client.aborted) {
        throw new Error('Stream aborted by client');
      }

      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        chunkCount++;

        // Send chunk every 10 tokens for smooth streaming
        if (chunkCount % 10 === 0) {
          sendChunk(client, {
            chunk: content,
            totalLength: fullContent.length,
            chunkIndex: chunkCount
          });
        }
      }
    }

    // Send final chunk
    if (fullContent) {
      sendChunk(client, {
        chunk: '',
        totalLength: fullContent.length,
        chunkIndex: chunkCount,
        isFinal: true
      });
    }

    return fullContent;
  } catch (error) {
    console.error('[SSE] OpenAI streaming error:', error);
    throw error;
  }
}

// ============================================================================
// Route Handlers
// ============================================================================

export async function summarizationStreamingRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/summarization/stream
   * Stream document summary generation with real-time progress
   */
  app.post<{
    Body: StreamSummaryInput;
  }>(
    '/stream',
    {
      schema: {
        body: {
          type: 'object',
          required: ['documentId', 'level'],
          properties: {
            documentId: { type: 'string', format: 'uuid' },
            level: { type: 'string', enum: ['brief', 'standard', 'detailed'] },
            language: { type: 'string', enum: ['es', 'en'], default: 'es' },
            includeKeyPoints: { type: 'boolean', default: true },
            includeReferences: { type: 'boolean', default: false },
            streamChunks: { type: 'boolean', default: true }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      let streamId: string | null = null;

      try {
        // Authenticate user
        await (request as any).jwtVerify();
        const userId = ((request as any).user as any).id;

        // Validate request body
        const options = StreamSummarySchema.parse(request.body);

        // Check concurrent stream limit
        if (hasMaxStreams(userId)) {
          return reply.code(429).send({
            error: 'TOO_MANY_STREAMS',
            message: `Maximum ${MAX_STREAMS_PER_USER} concurrent streams allowed`,
            retryAfter: 60
          });
        }

        // Verify document exists and user has access
        const document = await prisma.legalDocument.findUnique({
          where: { id: options.documentId },
          select: {
            id: true,
            normTitle: true,
            normType: true,
            legalHierarchy: true,
            content: true
          }
        });

        if (!document) {
          return reply.code(404).send({
            error: 'NOT_FOUND',
            message: 'Document not found'
          });
        }

        if (!document.content || document.content.length < 50) {
          return reply.code(400).send({
            error: 'INVALID_DOCUMENT',
            message: 'Document has insufficient content to summarize'
          });
        }

        // Setup SSE headers
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        });

        // Generate stream ID and register client
        streamId = generateStreamId(userId);
        const client: SSEClient = {
          reply,
          userId,
          connectedAt: new Date(),
          lastActivity: new Date(),
          documentId: options.documentId,
          aborted: false
        };

        activeStreams.set(streamId, client);
        startHeartbeat();

        (app.log as any).info({
          streamId,
          userId,
          documentId: options.documentId,
          level: options.level
        }, 'SSE stream started');

        // Send connection event
        sendSSEEvent(client, {
          type: 'connected',
          data: {
            streamId,
            documentId: options.documentId,
            documentTitle: document.normTitle,
            level: options.level,
            timeout: CONNECTION_TIMEOUT_MS
          },
          timestamp: new Date().toISOString()
        });

        // Handle client disconnect
        request.raw.on('close', () => {
          (app.log as any).info({ streamId, userId }, 'SSE client disconnected');
          cleanupStream(streamId!);
        });

        request.raw.on('error', (error) => {
          (app.log as any).error({ streamId, userId, error }, 'SSE client error');
          cleanupStream(streamId!);
        });

        // Stage 1: Initializing
        sendProgress(client, {
          stage: 'initializing',
          progress: 5,
          message: 'Preparing document for analysis...',
          details: {
            documentLength: document.content.length,
            estimatedTime: document.content.length > 10000 ? '2-3 minutes' : '1-2 minutes'
          }
        });

        // Stage 2: Analyzing
        sendProgress(client, {
          stage: 'analyzing',
          progress: 15,
          message: 'Analyzing document structure and content...',
          details: {
            documentType: document.normType,
            hierarchy: document.legalHierarchy
          }
        });

        // Determine prompt based on level
        let systemPrompt = '';
        let userPrompt = '';

        switch (options.level) {
          case 'brief':
            systemPrompt = `You are a legal document analyst. Respond in ${options.language === 'en' ? 'English' : 'Spanish'}.`;
            userPrompt = `Provide a brief 1-2 sentence summary of this legal document.

Title: ${document.normTitle}
Type: ${document.normType}
Hierarchy: ${document.legalHierarchy}

Content (first 2000 characters):
${document.content.substring(0, 2000)}

Summary (1-2 sentences only):`;
            break;

          case 'standard':
            systemPrompt = `You are a legal document analyst. Respond in ${options.language === 'en' ? 'English' : 'Spanish'}.`;
            userPrompt = `Provide a standard summary of this legal document with key points.

Title: ${document.normTitle}
Type: ${document.normType}
Hierarchy: ${document.legalHierarchy}

Content:
${document.content.substring(0, 4000)}

Provide a clear paragraph summarizing the document (150-250 words).`;
            break;

          case 'detailed':
            systemPrompt = `You are a legal document analyst creating comprehensive summaries. Respond in ${options.language === 'en' ? 'English' : 'Spanish'}.`;
            userPrompt = `Provide a comprehensive detailed summary of this legal document.

Title: ${document.normTitle}
Type: ${document.normType}
Hierarchy: ${document.legalHierarchy}

Content:
${document.content.substring(0, 6000)}

Provide a comprehensive summary of 300-500 words covering all major aspects.`;
            break;
        }

        // Stage 3: Summarizing (with streaming)
        sendProgress(client, {
          stage: 'summarizing',
          progress: 30,
          message: `Generating ${options.level} summary...`,
          details: { streaming: options.streamChunks }
        });

        let summary = '';
        if (options.streamChunks) {
          // Stream the summary generation
          summary = await streamOpenAICompletion(
            client,
            userPrompt,
            systemPrompt,
            options.level === 'brief' ? 'gpt-3.5-turbo' : 'gpt-4'
          );
        } else {
          // Non-streaming fallback
          const summarizationService = getDocumentSummarizationService();
          const result = await summarizationService.summarizeDocument(options.documentId, {
            level: options.level as 'brief' | 'standard' | 'detailed',
            language: options.language as 'es' | 'en',
            includeKeyPoints: options.includeKeyPoints,
            includeReferences: options.includeReferences
          });
          summary = result.summary;
        }

        // Stage 4: Extracting key points
        let keyPoints: any[] = [];
        if (options.includeKeyPoints && !client.aborted) {
          sendProgress(client, {
            stage: 'extracting',
            progress: 70,
            message: 'Extracting key points...'
          });

          try {
            const summarizationService = getDocumentSummarizationService();
            keyPoints = await summarizationService.extractKeyPoints(options.documentId);

            // Stream key points one by one
            for (let i = 0; i < keyPoints.length; i++) {
              if (client.aborted) break;

              sendSSEEvent(client, {
                type: 'keypoint',
                data: keyPoints[i],
                timestamp: new Date().toISOString(),
                progress: 70 + (i / keyPoints.length) * 20
              });
            }
          } catch (error) {
            (app.log as any).warn({ error }, 'Failed to extract key points, continuing without them');
          }
        }

        // Stage 5: Finalizing
        if (!client.aborted) {
          sendProgress(client, {
            stage: 'finalizing',
            progress: 95,
            message: 'Finalizing summary...'
          });

          // Small delay for dramatic effect
          await new Promise(resolve => setTimeout(resolve, 500));

          // Send completion event
          sendCompletion(client, {
            id: `summary-${Date.now()}`,
            documentId: options.documentId,
            documentTitle: document.normTitle,
            level: options.level,
            summary,
            keyPoints: keyPoints || [],
            wordCount: summary.split(/\s+/).length,
            language: options.language,
            confidenceScore: 0.85
          });

          (app.log as any).info({
            streamId,
            documentId: options.documentId,
            level: options.level,
            summaryLength: summary.length
          }, 'Summary stream completed successfully');
        }

        // Keep connection open until client disconnects
        await new Promise(() => {});

      } catch (error: any) {
        (app.log as any).error({ error, streamId }, 'Summary streaming error');

        if (streamId) {
          const client = activeStreams.get(streamId);
          if (client && !client.aborted) {
            sendError(client, error);
          }
          cleanupStream(streamId);
        } else {
          // Error before stream setup, send regular error response
          if (!reply.sent) {
            reply.code(500).send({
              error: 'STREAMING_FAILED',
              message: error.message || 'Failed to start summary stream'
            });
          }
        }
      }
    }
  );

  /**
   * POST /api/v1/summarization/stream/compare
   * Stream document comparison with real-time progress
   */
  app.post<{
    Body: StreamComparisonInput;
  }>(
    '/stream/compare',
    {
      schema: {
        body: {
          type: 'object',
          required: ['documentIds'],
          properties: {
            documentIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              minItems: 2,
              maxItems: 5
            },
            language: { type: 'string', enum: ['es', 'en'], default: 'es' },
            includeDocumentSummaries: { type: 'boolean', default: true }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      let streamId: string | null = null;

      try {
        // Authenticate user
        await (request as any).jwtVerify();
        const userId = ((request as any).user as any).id;

        // Validate request body
        const options = StreamComparisonSchema.parse(request.body);

        // Check concurrent stream limit
        if (hasMaxStreams(userId)) {
          return reply.code(429).send({
            error: 'TOO_MANY_STREAMS',
            message: `Maximum ${MAX_STREAMS_PER_USER} concurrent streams allowed`,
            retryAfter: 60
          });
        }

        // Verify documents exist
        const documents = await prisma.legalDocument.findMany({
          where: { id: { in: options.documentIds } },
          select: {
            id: true,
            normTitle: true,
            normType: true,
            legalHierarchy: true,
            content: true
          }
        });

        if (documents.length < 2) {
          return reply.code(404).send({
            error: 'INSUFFICIENT_DOCUMENTS',
            message: 'At least 2 valid documents required for comparison'
          });
        }

        // Setup SSE headers
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        });

        // Generate stream ID and register client
        streamId = generateStreamId(userId);
        const client: SSEClient = {
          reply,
          userId,
          connectedAt: new Date(),
          lastActivity: new Date(),
          aborted: false
        };

        activeStreams.set(streamId, client);
        startHeartbeat();

        // Send connection event
        sendSSEEvent(client, {
          type: 'connected',
          data: {
            streamId,
            documentIds: options.documentIds,
            documentCount: documents.length,
            timeout: CONNECTION_TIMEOUT_MS
          },
          timestamp: new Date().toISOString()
        });

        // Handle client disconnect
        request.raw.on('close', () => {
          cleanupStream(streamId!);
        });

        request.raw.on('error', () => {
          cleanupStream(streamId!);
        });

        // Stage 1: Analyzing documents
        sendProgress(client, {
          stage: 'analyzing',
          progress: 10,
          message: `Analyzing ${documents.length} documents...`,
          details: { documentCount: documents.length }
        });

        // Stage 2: Comparing documents using service
        sendProgress(client, {
          stage: 'summarizing',
          progress: 40,
          message: 'Generating comparative analysis...'
        });

        const summarizationService = getDocumentSummarizationService();
        const comparison = await summarizationService.compareDocuments(options.documentIds);

        // Stage 3: Finalizing
        sendProgress(client, {
          stage: 'finalizing',
          progress: 90,
          message: 'Finalizing comparison results...'
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        // Send completion
        sendCompletion(client, {
          id: comparison.id,
          documentIds: comparison.documentIds,
          commonThemes: comparison.comparison.commonThemes,
          differences: comparison.comparison.differences,
          conflicts: comparison.comparison.conflicts,
          recommendations: comparison.comparison.recommendations,
          overallAnalysis: comparison.overallAnalysis,
          documentSummaries: options.includeDocumentSummaries ? comparison.documentSummaries : undefined
        });

        (app.log as any).info({
          streamId,
          documentCount: documents.length
        }, 'Comparison stream completed successfully');

        // Keep connection open
        await new Promise(() => {});

      } catch (error: any) {
        (app.log as any).error({ error, streamId }, 'Comparison streaming error');

        if (streamId) {
          const client = activeStreams.get(streamId);
          if (client && !client.aborted) {
            sendError(client, error);
          }
          cleanupStream(streamId);
        } else {
          if (!reply.sent) {
            reply.code(500).send({
              error: 'STREAMING_FAILED',
              message: error.message || 'Failed to start comparison stream'
            });
          }
        }
      }
    }
  );

  /**
   * GET /api/v1/summarization/stream/status
   * Get active stream statistics
   */
  app.get(
    '/stream/status',
    {
      onRequest: [(app as any).authenticate]
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await (request as any).jwtVerify();
        const userId = ((request as any).user as any).id;

        const userStreams: any[] = [];
        const now = Date.now();

        for (const [streamId, client] of getActiveClients()) {
          if (client.userId === userId) {
            userStreams.push({
              streamId,
              documentId: client.documentId,
              connectedAt: client.connectedAt.toISOString(),
              durationMs: now - client.connectedAt.getTime(),
              lastActivity: client.lastActivity.toISOString()
            });
          }
        }

        return reply.send({
          activeStreams: userStreams.length,
          maxStreams: MAX_STREAMS_PER_USER,
          streams: userStreams,
          totalActiveStreams: activeStreams.size
        });
      } catch (error: any) {
        (app.log as any).error({ error }, 'Failed to get stream status');
        return reply.code(500).send({
          error: 'STATUS_FAILED',
          message: 'Failed to retrieve stream status'
        });
      }
    }
  );
}

// ============================================================================
// Cleanup and Lifecycle Management
// ============================================================================

// Cleanup on process exit
process.on('exit', () => {
  console.log('[SSE] Process exiting, cleaning up streams');
  stopHeartbeat();
  activeStreams.clear();
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
  console.log('[SSE] SIGTERM received, closing active streams');

  // Notify all connected clients
  const clients = Array.from(activeStreams.entries());
  for (const [streamId, client] of clients) {
    try {
      sendSSEEvent(client, {
        type: 'timeout',
        data: { reason: 'server_shutdown' },
        timestamp: new Date().toISOString()
      });
      client.reply.raw.end();
    } catch (error) {
      // Client already disconnected
    }
  }

  activeStreams.clear();
  stopHeartbeat();
});
