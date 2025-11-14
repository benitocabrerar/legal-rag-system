/**
 * Feedback Service
 * Phase 7: User Feedback Loop
 *
 * Tracks user interactions, click-through rates, relevance feedback, and A/B test assignments.
 * This data is used to improve search ranking and measure search quality.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Interface for search interaction data
 */
export interface SearchInteractionData {
  userId: string;
  query: string;
  resultsCount: number;
  filters?: Record<string, any>;
  sortBy?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Interface for click event data
 */
export interface ClickEventData {
  searchInteractionId: string;
  documentId: string;
  position: number;
  relevanceScore?: number;
  dwellTime?: number; // milliseconds
}

/**
 * Interface for relevance feedback data
 */
export interface RelevanceFeedbackData {
  searchInteractionId: string;
  documentId: string;
  rating: number; // 1-5 stars
  isRelevant?: boolean;
  comment?: string;
}

/**
 * Interface for A/B test configuration
 */
export interface ABTestConfigData {
  name: string;
  description?: string;
  variants: Record<string, any>[]; // Array of scoring weight configurations
  trafficSplit: Record<string, number>; // Percentage allocation per variant
  startDate?: Date;
  endDate?: Date;
}

/**
 * Click-Through Rate (CTR) metrics
 */
export interface CTRMetrics {
  totalSearches: number;
  searchesWithClicks: number;
  totalClicks: number;
  ctr: number; // percentage
  avgClicksPerSearch: number;
  avgPosition: number; // average position of clicked results
}

/**
 * Relevance metrics
 */
export interface RelevanceMetrics {
  totalFeedback: number;
  avgRating: number;
  relevantCount: number;
  irrelevantCount: number;
  relevanceRate: number; // percentage
}

/**
 * FeedbackService - Manages user feedback and interaction tracking
 */
export class FeedbackService {
  /**
   * Track a search interaction
   */
  async trackSearch(data: SearchInteractionData): Promise<{ id: string }> {
    const interaction = await prisma.searchInteraction.create({
      data: {
        userId: data.userId,
        query: data.query,
        resultsCount: data.resultsCount,
        filters: data.filters,
        sortBy: data.sortBy,
        sessionId: data.sessionId,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress
      }
    });

    return { id: interaction.id };
  }

  /**
   * Track a click event
   */
  async trackClick(data: ClickEventData): Promise<{ id: string }> {
    const clickEvent = await prisma.clickEvent.create({
      data: {
        searchInteractionId: data.searchInteractionId,
        documentId: data.documentId,
        position: data.position,
        relevanceScore: data.relevanceScore,
        dwellTime: data.dwellTime
      }
    });

    return { id: clickEvent.id };
  }

  /**
   * Update dwell time for a click event (when user leaves the document)
   */
  async updateDwellTime(clickEventId: string, dwellTime: number): Promise<void> {
    await prisma.clickEvent.update({
      where: { id: clickEventId },
      data: { dwellTime }
    });
  }

  /**
   * Track relevance feedback
   */
  async trackRelevanceFeedback(data: RelevanceFeedbackData): Promise<{ id: string }> {
    // Validate rating is between 1-5
    if (data.rating < 1 || data.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const feedback = await prisma.relevanceFeedback.create({
      data: {
        searchInteractionId: data.searchInteractionId,
        documentId: data.documentId,
        rating: data.rating,
        isRelevant: data.isRelevant,
        comment: data.comment
      }
    });

    return { id: feedback.id };
  }

  /**
   * Get Click-Through Rate (CTR) metrics for a time period
   */
  async getCTRMetrics(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<CTRMetrics> {
    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = startDate;
      if (endDate) whereClause.timestamp.lte = endDate;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    // Get total searches
    const totalSearches = await prisma.searchInteraction.count({
      where: whereClause
    });

    // Get searches with clicks
    const searchesWithClicks = await prisma.searchInteraction.count({
      where: {
        ...whereClause,
        clickEvents: {
          some: {}
        }
      }
    });

    // Get all click events
    const clickEvents = await prisma.clickEvent.findMany({
      where: {
        searchInteraction: whereClause
      },
      select: {
        position: true
      }
    });

    const totalClicks = clickEvents.length;
    const ctr = totalSearches > 0 ? (searchesWithClicks / totalSearches) * 100 : 0;
    const avgClicksPerSearch = totalSearches > 0 ? totalClicks / totalSearches : 0;
    const avgPosition = totalClicks > 0
      ? clickEvents.reduce((sum, ce) => sum + ce.position, 0) / totalClicks
      : 0;

    return {
      totalSearches,
      searchesWithClicks,
      totalClicks,
      ctr,
      avgClicksPerSearch,
      avgPosition
    };
  }

  /**
   * Get relevance metrics for a time period
   */
  async getRelevanceMetrics(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<RelevanceMetrics> {
    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = startDate;
      if (endDate) whereClause.timestamp.lte = endDate;
    }

    // Get feedback from related search interactions
    if (userId) {
      whereClause.searchInteraction = {
        userId
      };
    }

    const feedbackRecords = await prisma.relevanceFeedback.findMany({
      where: whereClause,
      select: {
        rating: true,
        isRelevant: true
      }
    });

    const totalFeedback = feedbackRecords.length;
    const avgRating = totalFeedback > 0
      ? feedbackRecords.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
      : 0;

    const relevantCount = feedbackRecords.filter(f => f.isRelevant === true).length;
    const irrelevantCount = feedbackRecords.filter(f => f.isRelevant === false).length;
    const relevanceRate = totalFeedback > 0 ? (relevantCount / totalFeedback) * 100 : 0;

    return {
      totalFeedback,
      avgRating,
      relevantCount,
      irrelevantCount,
      relevanceRate
    };
  }

  /**
   * Get top clicked documents for a query
   */
  async getTopClickedDocuments(
    query: string,
    limit: number = 10
  ): Promise<Array<{ documentId: string; clickCount: number; avgPosition: number }>> {
    const clickData = await prisma.clickEvent.groupBy({
      by: ['documentId'],
      where: {
        searchInteraction: {
          query: {
            contains: query,
            mode: 'insensitive'
          }
        }
      },
      _count: {
        id: true
      },
      _avg: {
        position: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: limit
    });

    return clickData.map(d => ({
      documentId: d.documentId,
      clickCount: d._count.id,
      avgPosition: d._avg.position || 0
    }));
  }

  /**
   * Create A/B test configuration
   */
  async createABTest(data: ABTestConfigData): Promise<{ id: string }> {
    const config = await prisma.aBTestConfig.create({
      data: {
        name: data.name,
        description: data.description,
        variants: data.variants,
        trafficSplit: data.trafficSplit,
        isActive: true,
        startDate: data.startDate || new Date(),
        endDate: data.endDate
      }
    });

    return { id: config.id };
  }

  /**
   * Assign user to A/B test variant
   */
  async assignUserToABTest(
    userId: string,
    testConfigId: string
  ): Promise<{ variant: string }> {
    // Check if user already has assignment
    const existing = await prisma.aBTestAssignment.findUnique({
      where: {
        userId_testConfigId: {
          userId,
          testConfigId
        }
      }
    });

    if (existing) {
      return { variant: existing.variant };
    }

    // Get test configuration
    const config = await prisma.aBTestConfig.findUnique({
      where: { id: testConfigId }
    });

    if (!config || !config.isActive) {
      throw new Error('A/B test not found or inactive');
    }

    // Randomly assign variant based on traffic split
    const variant = this.selectVariant(config.trafficSplit as Record<string, number>);

    // Create assignment
    await prisma.aBTestAssignment.create({
      data: {
        userId,
        testConfigId,
        variant
      }
    });

    return { variant };
  }

  /**
   * Get user's A/B test variant
   */
  async getUserABTestVariant(
    userId: string,
    testConfigId: string
  ): Promise<string | null> {
    const assignment = await prisma.aBTestAssignment.findUnique({
      where: {
        userId_testConfigId: {
          userId,
          testConfigId
        }
      }
    });

    return assignment?.variant || null;
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testConfigId: string): Promise<{
    variants: Array<{
      variant: string;
      userCount: number;
      avgCTR: number;
      avgRelevance: number;
    }>;
  }> {
    const assignments = await prisma.aBTestAssignment.findMany({
      where: { testConfigId },
      include: {
        user: {
          include: {
            searchInteractions: {
              include: {
                clickEvents: true,
                relevanceFeedback: true
              }
            }
          }
        }
      }
    });

    // Group by variant
    const variantMap = new Map<string, any[]>();
    assignments.forEach(a => {
      if (!variantMap.has(a.variant)) {
        variantMap.set(a.variant, []);
      }
      variantMap.get(a.variant)!.push(a.user);
    });

    const results = Array.from(variantMap.entries()).map(([variant, users]) => {
      const totalSearches = users.reduce((sum, u) => sum + u.searchInteractions.length, 0);
      const searchesWithClicks = users.reduce(
        (sum, u) => sum + u.searchInteractions.filter((si: any) => si.clickEvents.length > 0).length,
        0
      );
      const totalFeedback = users.reduce(
        (sum, u) => sum + u.searchInteractions.reduce(
          (s: number, si: any) => s + si.relevanceFeedback.length,
          0
        ),
        0
      );
      const avgRating = totalFeedback > 0
        ? users.reduce(
            (sum, u) => sum + u.searchInteractions.reduce(
              (s: number, si: any) => s + si.relevanceFeedback.reduce(
                (r: number, f: any) => r + f.rating,
                0
              ),
              0
            ),
            0
          ) / totalFeedback
        : 0;

      return {
        variant,
        userCount: users.length,
        avgCTR: totalSearches > 0 ? (searchesWithClicks / totalSearches) * 100 : 0,
        avgRelevance: avgRating
      };
    });

    return { variants: results };
  }

  /**
   * Randomly select variant based on traffic split
   * @private
   */
  private selectVariant(trafficSplit: Record<string, number>): string {
    const rand = Math.random() * 100;
    let cumulative = 0;

    for (const [variant, percentage] of Object.entries(trafficSplit)) {
      cumulative += percentage;
      if (rand <= cumulative) {
        return variant;
      }
    }

    // Fallback to first variant
    return Object.keys(trafficSplit)[0];
  }

  /**
   * Close database connection (cleanup)
   */
  async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}

// Export singleton instance
export const feedbackService = new FeedbackService();
