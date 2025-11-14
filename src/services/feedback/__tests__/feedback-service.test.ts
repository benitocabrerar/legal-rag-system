/**
 * Tests for FeedbackService
 * Phase 7: User Feedback Loop
 */

import { FeedbackService } from '../feedback-service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    searchInteraction: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    clickEvent: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    relevanceFeedback: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    aBTestConfig: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    aBTestAssignment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

describe('FeedbackService', () => {
  let service: FeedbackService;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FeedbackService();
    mockPrisma = new PrismaClient();
  });

  describe('trackSearch', () => {
    it('should track a search interaction', async () => {
      const searchData = {
        userId: 'user-123',
        query: 'código civil artículo 1',
        resultsCount: 10,
        filters: { category: 'civil' },
        sortBy: 'relevance',
        sessionId: 'session-456',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      };

      const mockInteraction = {
        id: 'interaction-789',
        ...searchData,
      };

      mockPrisma.searchInteraction.create.mockResolvedValue(mockInteraction);

      const result = await service.trackSearch(searchData);

      expect(result).toEqual({ id: 'interaction-789' });
      expect(mockPrisma.searchInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          query: 'código civil artículo 1',
          resultsCount: 10,
          filters: { category: 'civil' },
          sortBy: 'relevance',
          sessionId: 'session-456',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
        },
      });
    });

    it('should handle optional fields as null', async () => {
      const searchData = {
        userId: 'user-123',
        query: 'test query',
        resultsCount: 5,
      };

      const mockInteraction = { id: 'interaction-123' };
      mockPrisma.searchInteraction.create.mockResolvedValue(mockInteraction);

      await service.trackSearch(searchData);

      expect(mockPrisma.searchInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          query: 'test query',
          resultsCount: 5,
          filters: undefined,
          sortBy: undefined,
          sessionId: undefined,
          userAgent: undefined,
          ipAddress: undefined,
        },
      });
    });
  });

  describe('trackClick', () => {
    it('should track a click event', async () => {
      const clickData = {
        searchInteractionId: 'interaction-123',
        documentId: 'doc-456',
        position: 2,
        relevanceScore: 0.85,
        dwellTime: 45000,
      };

      const mockClickEvent = {
        id: 'click-789',
        ...clickData,
      };

      mockPrisma.clickEvent.create.mockResolvedValue(mockClickEvent);

      const result = await service.trackClick(clickData);

      expect(result).toEqual({ id: 'click-789' });
      expect(mockPrisma.clickEvent.create).toHaveBeenCalledWith({
        data: {
          searchInteractionId: 'interaction-123',
          documentId: 'doc-456',
          position: 2,
          relevanceScore: 0.85,
          dwellTime: 45000,
        },
      });
    });

    it('should handle optional fields', async () => {
      const clickData = {
        searchInteractionId: 'interaction-123',
        documentId: 'doc-456',
        position: 0,
      };

      mockPrisma.clickEvent.create.mockResolvedValue({ id: 'click-123' });

      await service.trackClick(clickData);

      expect(mockPrisma.clickEvent.create).toHaveBeenCalledWith({
        data: {
          searchInteractionId: 'interaction-123',
          documentId: 'doc-456',
          position: 0,
          relevanceScore: undefined,
          dwellTime: undefined,
        },
      });
    });
  });

  describe('updateDwellTime', () => {
    it('should update dwell time for a click event', async () => {
      const clickEventId = 'click-123';
      const dwellTime = 60000; // 60 seconds

      mockPrisma.clickEvent.update.mockResolvedValue({
        id: clickEventId,
        dwellTime,
      });

      await service.updateDwellTime(clickEventId, dwellTime);

      expect(mockPrisma.clickEvent.update).toHaveBeenCalledWith({
        where: { id: 'click-123' },
        data: { dwellTime: 60000 },
      });
    });
  });

  describe('trackRelevanceFeedback', () => {
    it('should track relevance feedback', async () => {
      const feedbackData = {
        searchInteractionId: 'interaction-123',
        documentId: 'doc-456',
        rating: 4,
        isRelevant: true,
        comment: 'Very helpful document',
      };

      const mockFeedback = {
        id: 'feedback-789',
        ...feedbackData,
      };

      mockPrisma.relevanceFeedback.create.mockResolvedValue(mockFeedback);

      const result = await service.trackRelevanceFeedback(feedbackData);

      expect(result).toEqual({ id: 'feedback-789' });
      expect(mockPrisma.relevanceFeedback.create).toHaveBeenCalledWith({
        data: {
          searchInteractionId: 'interaction-123',
          documentId: 'doc-456',
          rating: 4,
          isRelevant: true,
          comment: 'Very helpful document',
        },
      });
    });

    it('should reject rating < 1', async () => {
      const feedbackData = {
        searchInteractionId: 'interaction-123',
        documentId: 'doc-456',
        rating: 0,
      };

      await expect(service.trackRelevanceFeedback(feedbackData)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );
    });

    it('should reject rating > 5', async () => {
      const feedbackData = {
        searchInteractionId: 'interaction-123',
        documentId: 'doc-456',
        rating: 6,
      };

      await expect(service.trackRelevanceFeedback(feedbackData)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );
    });

    it('should handle optional fields as null', async () => {
      const feedbackData = {
        searchInteractionId: 'interaction-123',
        documentId: 'doc-456',
        rating: 3,
      };

      mockPrisma.relevanceFeedback.create.mockResolvedValue({ id: 'feedback-123' });

      await service.trackRelevanceFeedback(feedbackData);

      expect(mockPrisma.relevanceFeedback.create).toHaveBeenCalledWith({
        data: {
          searchInteractionId: 'interaction-123',
          documentId: 'doc-456',
          rating: 3,
          isRelevant: undefined,
          comment: undefined,
        },
      });
    });
  });

  describe('getCTRMetrics', () => {
    it('should calculate CTR metrics', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      // Mock total searches
      mockPrisma.searchInteraction.count.mockResolvedValueOnce(100);

      // Mock searches with clicks
      mockPrisma.searchInteraction.count.mockResolvedValueOnce(60);

      // Mock click events
      mockPrisma.clickEvent.findMany.mockResolvedValue([
        { position: 0 },
        { position: 1 },
        { position: 2 },
        { position: 0 },
        { position: 1 },
      ]);

      const metrics = await service.getCTRMetrics(startDate, endDate);

      expect(metrics).toEqual({
        totalSearches: 100,
        searchesWithClicks: 60,
        totalClicks: 5,
        ctr: 60, // 60/100 * 100
        avgClicksPerSearch: 0.05, // 5/100
        avgPosition: 0.8, // (0+1+2+0+1)/5
      });
    });

    it('should handle zero searches', async () => {
      mockPrisma.searchInteraction.count.mockResolvedValue(0);
      mockPrisma.clickEvent.findMany.mockResolvedValue([]);

      const metrics = await service.getCTRMetrics();

      expect(metrics).toEqual({
        totalSearches: 0,
        searchesWithClicks: 0,
        totalClicks: 0,
        ctr: 0,
        avgClicksPerSearch: 0,
        avgPosition: 0,
      });
    });

    it('should filter by userId', async () => {
      mockPrisma.searchInteraction.count.mockResolvedValue(10);
      mockPrisma.clickEvent.findMany.mockResolvedValue([]);

      await service.getCTRMetrics(undefined, undefined, 'user-123');

      expect(mockPrisma.searchInteraction.count).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });
  });

  describe('getRelevanceMetrics', () => {
    it('should calculate relevance metrics', async () => {
      const feedbackRecords = [
        { rating: 5, isRelevant: true },
        { rating: 4, isRelevant: true },
        { rating: 3, isRelevant: null },
        { rating: 2, isRelevant: false },
        { rating: 1, isRelevant: false },
      ];

      mockPrisma.relevanceFeedback.findMany.mockResolvedValue(feedbackRecords);

      const metrics = await service.getRelevanceMetrics();

      expect(metrics).toEqual({
        totalFeedback: 5,
        avgRating: 3, // (5+4+3+2+1)/5
        relevantCount: 2,
        irrelevantCount: 2,
        relevanceRate: 40, // 2/5 * 100
      });
    });

    it('should handle no feedback', async () => {
      mockPrisma.relevanceFeedback.findMany.mockResolvedValue([]);

      const metrics = await service.getRelevanceMetrics();

      expect(metrics).toEqual({
        totalFeedback: 0,
        avgRating: 0,
        relevantCount: 0,
        irrelevantCount: 0,
        relevanceRate: 0,
      });
    });

    it('should filter by userId through search interaction', async () => {
      mockPrisma.relevanceFeedback.findMany.mockResolvedValue([]);

      await service.getRelevanceMetrics(undefined, undefined, 'user-123');

      expect(mockPrisma.relevanceFeedback.findMany).toHaveBeenCalledWith({
        where: {
          searchInteraction: {
            userId: 'user-123',
          },
        },
        select: {
          rating: true,
          isRelevant: true,
        },
      });
    });
  });

  describe('getTopClickedDocuments', () => {
    it('should return top clicked documents', async () => {
      const mockGroupedData = [
        {
          documentId: 'doc-1',
          _count: { id: 10 },
          _avg: { position: 1.5 },
        },
        {
          documentId: 'doc-2',
          _count: { id: 8 },
          _avg: { position: 2.0 },
        },
        {
          documentId: 'doc-3',
          _count: { id: 5 },
          _avg: { position: 0.5 },
        },
      ];

      mockPrisma.clickEvent.groupBy.mockResolvedValue(mockGroupedData);

      const results = await service.getTopClickedDocuments('código civil', 3);

      expect(results).toEqual([
        { documentId: 'doc-1', clickCount: 10, avgPosition: 1.5 },
        { documentId: 'doc-2', clickCount: 8, avgPosition: 2.0 },
        { documentId: 'doc-3', clickCount: 5, avgPosition: 0.5 },
      ]);

      expect(mockPrisma.clickEvent.groupBy).toHaveBeenCalledWith({
        by: ['documentId'],
        where: {
          searchInteraction: {
            query: {
              contains: 'código civil',
              mode: 'insensitive',
            },
          },
        },
        _count: {
          id: true,
        },
        _avg: {
          position: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 3,
      });
    });

    it('should handle null average position', async () => {
      mockPrisma.clickEvent.groupBy.mockResolvedValue([
        {
          documentId: 'doc-1',
          _count: { id: 5 },
          _avg: { position: null },
        },
      ]);

      const results = await service.getTopClickedDocuments('test', 10);

      expect(results[0].avgPosition).toBe(0);
    });
  });

  describe('A/B Testing', () => {
    describe('createABTest', () => {
      it('should create A/B test configuration', async () => {
        const testData = {
          name: 'Search Ranking Test',
          description: 'Test BM25 vs embedding weights',
          variants: [
            { name: 'control', bm25Weight: 0.7, embeddingWeight: 0.3 },
            { name: 'variant', bm25Weight: 0.5, embeddingWeight: 0.5 },
          ],
          trafficSplit: { control: 50, variant: 50 },
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-02-01'),
        };

        const mockConfig = {
          id: 'test-123',
          ...testData,
          isActive: true,
        };

        mockPrisma.aBTestConfig.create.mockResolvedValue(mockConfig);

        const result = await service.createABTest(testData);

        expect(result).toEqual({ id: 'test-123' });
        expect(mockPrisma.aBTestConfig.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: 'Search Ranking Test',
            isActive: true,
          }),
        });
      });
    });

    describe('assignUserToABTest', () => {
      it('should return existing assignment if user already assigned', async () => {
        const existingAssignment = {
          id: 'assignment-123',
          userId: 'user-123',
          testConfigId: 'test-456',
          variant: 'control',
        };

        mockPrisma.aBTestAssignment.findUnique.mockResolvedValue(existingAssignment);

        const result = await service.assignUserToABTest('user-123', 'test-456');

        expect(result).toEqual({ variant: 'control' });
        expect(mockPrisma.aBTestAssignment.create).not.toHaveBeenCalled();
      });

      it('should create new assignment for new user', async () => {
        const mockConfig = {
          id: 'test-456',
          isActive: true,
          trafficSplit: { control: 50, variant: 50 },
        };

        mockPrisma.aBTestAssignment.findUnique.mockResolvedValue(null);
        mockPrisma.aBTestConfig.findUnique.mockResolvedValue(mockConfig);
        mockPrisma.aBTestAssignment.create.mockResolvedValue({
          id: 'assignment-789',
          variant: 'control',
        });

        const result = await service.assignUserToABTest('user-123', 'test-456');

        expect(result.variant).toMatch(/^(control|variant)$/);
        expect(mockPrisma.aBTestAssignment.create).toHaveBeenCalled();
      });

      it('should throw error for inactive test', async () => {
        const mockConfig = {
          id: 'test-456',
          isActive: false,
        };

        mockPrisma.aBTestAssignment.findUnique.mockResolvedValue(null);
        mockPrisma.aBTestConfig.findUnique.mockResolvedValue(mockConfig);

        await expect(service.assignUserToABTest('user-123', 'test-456')).rejects.toThrow(
          'A/B test not found or inactive'
        );
      });

      it('should throw error for non-existent test', async () => {
        mockPrisma.aBTestAssignment.findUnique.mockResolvedValue(null);
        mockPrisma.aBTestConfig.findUnique.mockResolvedValue(null);

        await expect(service.assignUserToABTest('user-123', 'test-456')).rejects.toThrow(
          'A/B test not found or inactive'
        );
      });
    });

    describe('getUserABTestVariant', () => {
      it('should return user variant', async () => {
        const mockAssignment = {
          variant: 'control',
        };

        mockPrisma.aBTestAssignment.findUnique.mockResolvedValue(mockAssignment);

        const variant = await service.getUserABTestVariant('user-123', 'test-456');

        expect(variant).toBe('control');
      });

      it('should return null if no assignment', async () => {
        mockPrisma.aBTestAssignment.findUnique.mockResolvedValue(null);

        const variant = await service.getUserABTestVariant('user-123', 'test-456');

        expect(variant).toBeNull();
      });
    });

    describe('getABTestResults', () => {
      it('should calculate A/B test results', async () => {
        const mockAssignments = [
          {
            variant: 'control',
            user: {
              searchInteractions: [
                {
                  clickEvents: [{ id: '1' }],
                  relevanceFeedback: [{ rating: 4 }],
                },
                {
                  clickEvents: [],
                  relevanceFeedback: [{ rating: 5 }],
                },
              ],
            },
          },
          {
            variant: 'control',
            user: {
              searchInteractions: [
                {
                  clickEvents: [{ id: '2' }],
                  relevanceFeedback: [{ rating: 3 }],
                },
              ],
            },
          },
          {
            variant: 'variant',
            user: {
              searchInteractions: [
                {
                  clickEvents: [{ id: '3' }],
                  relevanceFeedback: [{ rating: 5 }],
                },
              ],
            },
          },
        ];

        mockPrisma.aBTestAssignment.findMany.mockResolvedValue(mockAssignments);

        const results = await service.getABTestResults('test-123');

        expect(results.variants).toHaveLength(2);

        const controlVariant = results.variants.find((v) => v.variant === 'control');
        expect(controlVariant).toBeDefined();
        expect(controlVariant?.userCount).toBe(2);
        expect(controlVariant?.avgCTR).toBeCloseTo(66.67, 1); // 2/3 * 100
        expect(controlVariant?.avgRelevance).toBe(4); // (4+5+3)/3

        const variantVariant = results.variants.find((v) => v.variant === 'variant');
        expect(variantVariant).toBeDefined();
        expect(variantVariant?.userCount).toBe(1);
        expect(variantVariant?.avgCTR).toBe(100); // 1/1 * 100
        expect(variantVariant?.avgRelevance).toBe(5);
      });
    });
  });

  describe('disconnect', () => {
    it('should disconnect from database', async () => {
      await service.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});
