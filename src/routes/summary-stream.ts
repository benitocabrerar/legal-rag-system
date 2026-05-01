/**
 * Document Summary Streaming Routes
 *
 * Provides Server-Sent Events (SSE) endpoints for real-time document summarization
 */

import { FastifyPluginAsync } from 'fastify';
import { getDocumentSummarizationService } from '../services/ai/document-summarization.service.js';

/**
 * Request schemas
 */
const streamSummarySchema = {
  params: {
    type: 'object',
    required: ['documentId'],
    properties: {
      documentId: { type: 'string', format: 'uuid' }
    }
  },
  querystring: {
    type: 'object',
    properties: {
      level: { type: 'string', enum: ['brief', 'standard', 'detailed'], default: 'standard' },
      language: { type: 'string', enum: ['es', 'en'], default: 'es' },
      includeKeyPoints: { type: 'boolean', default: true },
      includeReferences: { type: 'boolean', default: false }
    }
  }
};

const streamComparisonSchema = {
  body: {
    type: 'object',
    required: ['documentIds'],
    properties: {
      documentIds: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        minItems: 2,
        maxItems: 10
      }
    }
  }
};

/**
 * Summary Streaming Routes Plugin
 */
const summaryStreamRoutes: FastifyPluginAsync = async (fastify) => {
  const summarizationService = getDocumentSummarizationService();

  /**
   * GET /api/summaries/stream/:documentId
   *
   * Stream document summary generation with Server-Sent Events
   *
   * @example
   * ```javascript
   * const eventSource = new EventSource('/api/summaries/stream/doc-123?level=detailed');
   *
   * eventSource.addEventListener('text', (event) => {
   *   const data = JSON.parse(event.data);
   *   console.log('Text chunk:', data.content);
   * });
   *
   * eventSource.addEventListener('keypoint', (event) => {
   *   const data = JSON.parse(event.data);
   *   console.log('Key point:', data.content);
   * });
   *
   * eventSource.addEventListener('done', (event) => {
   *   const data = JSON.parse(event.data);
   *   console.log('Summary completed:', data);
   *   eventSource.close();
   * });
   *
   * eventSource.addEventListener('error', (event) => {
   *   const data = JSON.parse(event.data);
   *   console.error('Error:', data);
   *   eventSource.close();
   * });
   * ```
   */
  fastify.get(
    '/stream/:documentId',
    { schema: streamSummarySchema },
    async (request, reply) => {
      const { documentId } = request.params as { documentId: string };
      const options = request.query as {
        level?: 'brief' | 'standard' | 'detailed';
        language?: 'es' | 'en';
        includeKeyPoints?: boolean;
        includeReferences?: boolean;
      };

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
      });

      try {
        // Stream summary chunks
        for await (const chunk of summarizationService.streamSummary(documentId, options)) {
          // Format as SSE
          const sseData = `event: ${chunk.type}\ndata: ${JSON.stringify({
            content: chunk.content,
            timestamp: chunk.timestamp,
            metadata: chunk.metadata
          })}\n\n`;

          reply.raw.write(sseData);

          // If done or error, close the stream
          if (chunk.type === 'done' || chunk.type === 'error') {
            reply.raw.end();
            return;
          }
        }
      } catch (error) {
        // Send error event
        const errorData = `event: error\ndata: ${JSON.stringify({
          content: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        })}\n\n`;

        reply.raw.write(errorData);
        reply.raw.end();
      }
    }
  );

  /**
   * POST /api/summaries/stream/compare
   *
   * Stream comparative analysis of multiple documents
   *
   * @example
   * ```javascript
   * fetch('/api/summaries/stream/compare', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     documentIds: ['doc-1', 'doc-2', 'doc-3']
   *   })
   * }).then(response => {
   *   const reader = response.body.getReader();
   *   const decoder = new TextDecoder();
   *
   *   function read() {
   *     reader.read().then(({ done, value }) => {
   *       if (done) return;
   *       const chunk = decoder.decode(value);
   *       // Process SSE chunk
   *       console.log(chunk);
   *       read();
   *     });
   *   }
   *   read();
   * });
   * ```
   */
  fastify.post(
    '/stream/compare',
    { schema: streamComparisonSchema },
    async (request, reply) => {
      const { documentIds } = request.body as { documentIds: string[] };

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no'
      });

      try {
        // Stream comparison chunks
        for await (const chunk of summarizationService.streamComparison(documentIds)) {
          // Format as SSE
          const sseData = `event: ${chunk.type}\ndata: ${JSON.stringify({
            content: chunk.content,
            timestamp: chunk.timestamp,
            metadata: chunk.metadata
          })}\n\n`;

          reply.raw.write(sseData);

          // If done or error, close the stream
          if (chunk.type === 'done' || chunk.type === 'error') {
            reply.raw.end();
            return;
          }
        }
      } catch (error) {
        // Send error event
        const errorData = `event: error\ndata: ${JSON.stringify({
          content: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        })}\n\n`;

        reply.raw.write(errorData);
        reply.raw.end();
      }
    }
  );

  /**
   * GET /api/summaries/stream/health
   *
   * Health check for streaming service
   */
  fastify.get('/stream/health', async (request, reply) => {
    return {
      status: 'ok',
      service: 'document-summary-streaming',
      timestamp: new Date().toISOString(),
      endpoints: [
        'GET /api/summaries/stream/:documentId',
        'POST /api/summaries/stream/compare'
      ]
    };
  });
};

export default summaryStreamRoutes;
