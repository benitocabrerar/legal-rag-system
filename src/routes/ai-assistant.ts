import { FastifyInstance } from 'fastify';
import { legalAssistant } from '../services/ai/legal-assistant.js';
import { queryProcessor } from '../services/nlp/query-processor.js';
import { analyticsService } from '../services/analytics/analytics-service.js';

export async function aiAssistantRoutes(fastify: FastifyInstance) {
  // Initialize a new conversation
  fastify.post('/api/ai/conversation', {
    schema: {
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { title } = request.body as { title: string };
    const userId = (request.user as any)?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const conversationId = await legalAssistant.initConversation(userId, title);

      // Track event
      await analyticsService.trackEvent({
        eventType: 'conversation_started',
        userId,
        sessionId: request.id,
        metadata: { conversationId, title }
      });

      return { conversationId, title };
    } catch (error) {
      console.error('Error creating conversation:', error);
      return reply.code(500).send({ error: 'Failed to create conversation' });
    }
  });

  // Process a query in a conversation
  fastify.post('/api/ai/query', {
    schema: {
      body: {
        type: 'object',
        required: ['conversationId', 'query'],
        properties: {
          conversationId: { type: 'string' },
          query: { type: 'string' },
          searchResults: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                content: { type: 'string' },
                articleNumber: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { conversationId, query, searchResults } = request.body as {
      conversationId: string;
      query: string;
      searchResults?: Array<{ id: string; title: string; content: string; articleNumber?: string }>;
    };

    const userId = (request.user as any)?.id;
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const startTime = Date.now();

      // Process query with NLP
      const processedQuery = await queryProcessor.processQuery(query);

      // Get AI response
      const response = await legalAssistant.processQuery(
        conversationId,
        query,
        searchResults
      );

      const duration = Date.now() - startTime;

      // Track analytics
      await analyticsService.trackEvent({
        eventType: 'ai_query_processed',
        userId,
        sessionId: request.id,
        durationMs: duration,
        metadata: {
          conversationId,
          intent: processedQuery.intent.type,
          confidence: response.confidence,
          citationsCount: response.citedDocuments.length
        }
      });

      return {
        answer: response.answer,
        citedDocuments: response.citedDocuments,
        confidence: response.confidence,
        processingTimeMs: response.processingTimeMs,
        intent: processedQuery.intent
      };
    } catch (error) {
      console.error('Error processing AI query:', error);

      await analyticsService.trackEvent({
        eventType: 'ai_query_error',
        userId,
        sessionId: request.id,
        success: false,
        metadata: { conversationId, error: (error as Error).message }
      });

      return reply.code(500).send({ error: 'Failed to process query' });
    }
  });

  // Get conversation history
  fastify.get('/api/ai/conversation/:id/history', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as any)?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const history = await legalAssistant.getConversationHistory(id);
      return { messages: history };
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return reply.code(500).send({ error: 'Failed to fetch conversation history' });
    }
  });

  // List user conversations
  fastify.get('/api/ai/conversations', async (request, reply) => {
    const userId = (request.user as any)?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const conversations = await legalAssistant.listUserConversations(userId);
      return { conversations };
    } catch (error) {
      console.error('Error listing conversations:', error);
      return reply.code(500).send({ error: 'Failed to list conversations' });
    }
  });

  // Submit feedback on AI response
  fastify.post('/api/ai/feedback', {
    schema: {
      body: {
        type: 'object',
        required: ['messageId', 'wasHelpful'],
        properties: {
          messageId: { type: 'string' },
          wasHelpful: { type: 'boolean' },
          feedbackText: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { messageId, wasHelpful, feedbackText } = request.body as {
      messageId: string;
      wasHelpful: boolean;
      feedbackText?: string;
    };

    const userId = (request.user as any)?.id;
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      await legalAssistant.saveFeedback(messageId, wasHelpful, feedbackText);

      // Track analytics
      await analyticsService.trackEvent({
        eventType: 'ai_feedback_submitted',
        userId,
        sessionId: request.id,
        metadata: { messageId, wasHelpful, hasFeedbackText: !!feedbackText }
      });

      return { success: true };
    } catch (error) {
      console.error('Error saving feedback:', error);
      return reply.code(500).send({ error: 'Failed to save feedback' });
    }
  });

  // Close a conversation
  fastify.post('/api/ai/conversation/:id/close', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as any)?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      await legalAssistant.closeConversation(id);

      await analyticsService.trackEvent({
        eventType: 'conversation_closed',
        userId,
        sessionId: request.id,
        metadata: { conversationId: id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error closing conversation:', error);
      return reply.code(500).send({ error: 'Failed to close conversation' });
    }
  });
}
