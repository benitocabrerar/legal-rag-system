import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

describe('Phase 10: AI-Powered Legal Assistant & Advanced Analytics', () => {
  let testUserId: string;
  let testConversationId: string;
  let testDocumentId: string;

  beforeAll(async () => {
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test-phase10@example.com',
        passwordHash: 'hashedpassword',
        name: 'Test User Phase 10',
        role: 'USER'
      }
    });
    testUserId = testUser.id;

    // Create test document
    const testDoc = await prisma.legalDocument.create({
      data: {
        normType: 'law',
        normTitle: 'Test Legal Document',
        legalHierarchy: 'national',
        publicationType: 'official_register',
        publicationNumber: 'TEST-001',
        documentState: 'active',
        jurisdiction: 'national',
        content: 'This is a test legal document content.',
        uploadedBy: testUserId
      }
    });
    testDocumentId = testDoc.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.aIMessage.deleteMany({ where: { conversation: { userId: testUserId } } });
    await prisma.aIConversation.deleteMany({ where: { userId: testUserId } });
    await prisma.analyticsEvent.deleteMany({ where: { userId: testUserId } });
    await prisma.documentAnalytics.deleteMany({ where: { documentId: testDocumentId } });
    await prisma.legalDocument.delete({ where: { id: testDocumentId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('AI Conversation Management', () => {
    it('should create a new AI conversation', async () => {
      const conversation = await prisma.aIConversation.create({
        data: {
          userId: testUserId,
          title: 'Test Conversation',
          isActive: true
        }
      });

      expect(conversation).toBeDefined();
      expect(conversation.userId).toBe(testUserId);
      expect(conversation.title).toBe('Test Conversation');
      expect(conversation.isActive).toBe(true);
      expect(conversation.messageCount).toBe(0);

      testConversationId = conversation.id;
    });

    it('should create AI messages in a conversation', async () => {
      const userMessage = await prisma.aIMessage.create({
        data: {
          conversationId: testConversationId,
          role: 'user',
          content: '¿Qué es el Código Civil?'
        }
      });

      expect(userMessage).toBeDefined();
      expect(userMessage.role).toBe('user');
      expect(userMessage.content).toContain('Código Civil');

      const assistantMessage = await prisma.aIMessage.create({
        data: {
          conversationId: testConversationId,
          role: 'assistant',
          content: 'El Código Civil es...',
          confidence: 0.85,
          processingTimeMs: 1500
        }
      });

      expect(assistantMessage).toBeDefined();
      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.confidence).toBe(0.85);
    });

    it('should track citations in AI messages', async () => {
      const message = await prisma.aIMessage.findFirst({
        where: {
          conversationId: testConversationId,
          role: 'assistant'
        }
      });

      const citation = await prisma.aICitation.create({
        data: {
          messageId: message!.id,
          documentId: testDocumentId,
          relevance: 0.9,
          articleRef: 'Art. 123'
        }
      });

      expect(citation).toBeDefined();
      expect(citation.documentId).toBe(testDocumentId);
      expect(citation.relevance).toBe(0.9);
      expect(citation.articleRef).toBe('Art. 123');
    });

    it('should update conversation message count', async () => {
      await prisma.aIConversation.update({
        where: { id: testConversationId },
        data: {
          messageCount: { increment: 2 },
          lastMessageAt: new Date()
        }
      });

      const updated = await prisma.aIConversation.findUnique({
        where: { id: testConversationId }
      });

      expect(updated?.messageCount).toBe(2);
    });
  });

  describe('Analytics Events', () => {
    it('should track analytics events', async () => {
      const event = await prisma.analyticsEvent.create({
        data: {
          eventType: 'document_view',
          userId: testUserId,
          sessionId: 'test-session-123',
          metadata: {
            documentId: testDocumentId,
            source: 'search'
          },
          durationMs: 5000,
          success: true
        }
      });

      expect(event).toBeDefined();
      expect(event.eventType).toBe('document_view');
      expect(event.userId).toBe(testUserId);
      expect(event.success).toBe(true);
    });

    it('should query events by type', async () => {
      const events = await prisma.analyticsEvent.findMany({
        where: {
          eventType: 'document_view',
          userId: testUserId
        },
        orderBy: { timestamp: 'desc' }
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].eventType).toBe('document_view');
    });
  });

  describe('Document Analytics', () => {
    it('should create and update document analytics', async () => {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const analytics = await prisma.documentAnalytics.create({
        data: {
          documentId: testDocumentId,
          viewCount: 1,
          searchCount: 0,
          citationCount: 0,
          downloadCount: 0,
          periodStart,
          periodEnd,
          lastViewed: now
        }
      });

      expect(analytics).toBeDefined();
      expect(analytics.viewCount).toBe(1);
      expect(analytics.documentId).toBe(testDocumentId);
    });

    it('should increment analytics counters', async () => {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const analytics = await prisma.documentAnalytics.findFirst({
        where: {
          documentId: testDocumentId,
          periodStart
        }
      });

      const updated = await prisma.documentAnalytics.update({
        where: { id: analytics!.id },
        data: {
          viewCount: { increment: 1 },
          citationCount: { increment: 1 }
        }
      });

      expect(updated.viewCount).toBe(2);
      expect(updated.citationCount).toBe(1);
    });

    it('should update trending score', async () => {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const analytics = await prisma.documentAnalytics.findFirst({
        where: {
          documentId: testDocumentId,
          periodStart
        }
      });

      const trendingScore = (analytics!.viewCount * 1) + (analytics!.citationCount * 5);

      const updated = await prisma.documentAnalytics.update({
        where: { id: analytics!.id },
        data: { trendingScore }
      });

      expect(updated.trendingScore).toBeGreaterThan(0);
    });
  });

  describe('Search Analytics', () => {
    it('should track search queries', async () => {
      const search = await prisma.searchAnalytics.create({
        data: {
          query: 'código civil ecuador',
          resultCount: 10,
          searchCount: 1,
          clickThroughRate: 0.8,
          avgPosition: 2
        }
      });

      expect(search).toBeDefined();
      expect(search.query).toBe('código civil ecuador');
      expect(search.resultCount).toBe(10);
    });

    it('should update search statistics', async () => {
      const search = await prisma.searchAnalytics.findFirst({
        where: { query: 'código civil ecuador' }
      });

      const updated = await prisma.searchAnalytics.update({
        where: { id: search!.id },
        data: {
          searchCount: { increment: 1 },
          lastSearched: new Date()
        }
      });

      expect(updated.searchCount).toBe(2);
    });
  });

  describe('ML Models', () => {
    it('should create ML model records', async () => {
      const model = await prisma.mLModel.create({
        data: {
          name: 'Legal Pattern Detector v1',
          type: 'pattern_detector',
          version: '1.0.0',
          trainedAt: new Date(),
          accuracy: 0.87,
          precision: 0.85,
          recall: 0.82,
          config: {
            algorithm: 'random_forest',
            features: ['document_type', 'keywords', 'citations']
          },
          isActive: true
        }
      });

      expect(model).toBeDefined();
      expect(model.type).toBe('pattern_detector');
      expect(model.accuracy).toBe(0.87);
    });

    it('should create predictions', async () => {
      const model = await prisma.mLModel.findFirst({
        where: { type: 'pattern_detector' }
      });

      const prediction = await prisma.prediction.create({
        data: {
          modelId: model!.id,
          predictionType: 'legal_pattern',
          inputData: {
            documentId: testDocumentId,
            features: { keyword_count: 15 }
          },
          prediction: {
            pattern: 'civil_rights',
            probability: 0.78
          },
          confidence: 0.78
        }
      });

      expect(prediction).toBeDefined();
      expect(prediction.confidence).toBe(0.78);
    });
  });

  describe('Analytics Metrics', () => {
    it('should save analytics metrics', async () => {
      const now = new Date();
      const periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const metric = await prisma.analyticsMetric.create({
        data: {
          metricName: 'total_searches',
          metricValue: 150,
          dimensions: {
            source: 'web',
            deviceType: 'desktop'
          },
          periodStart,
          periodEnd: now
        }
      });

      expect(metric).toBeDefined();
      expect(metric.metricName).toBe('total_searches');
      expect(metric.metricValue).toBe(150);
    });
  });

  describe('Performance & Indexes', () => {
    it('should efficiently query trending documents', async () => {
      const startTime = Date.now();

      const trending = await prisma.documentAnalytics.findMany({
        where: {
          trendingScore: { not: null }
        },
        orderBy: { trendingScore: 'desc' },
        take: 10
      });

      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(100); // Should be fast with indexes
      expect(Array.isArray(trending)).toBe(true);
    });

    it('should efficiently query user conversations', async () => {
      const startTime = Date.now();

      const conversations = await prisma.aIConversation.findMany({
        where: {
          userId: testUserId,
          isActive: true
        },
        orderBy: { lastMessageAt: 'desc' },
        take: 20
      });

      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(100);
      expect(Array.isArray(conversations)).toBe(true);
    });
  });
});
