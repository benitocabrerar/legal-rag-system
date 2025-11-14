import { PrismaClient } from '@prisma/client';

interface AnalyticsEventData {
  eventType: string;
  userId?: string;
  sessionId: string;
  metadata?: Record<string, any>;
  durationMs?: number;
  success?: boolean;
}

interface DocumentAnalyticsUpdate {
  documentId: string;
  viewCount?: number;
  searchCount?: number;
  citationCount?: number;
  downloadCount?: number;
  timeSpent?: number;
}

interface MetricData {
  metricName: string;
  metricValue: number;
  dimensions?: Record<string, any>;
  periodStart: Date;
  periodEnd: Date;
}

export class AnalyticsService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Track an analytics event
   */
  async trackEvent(event: AnalyticsEventData): Promise<void> {
    await this.prisma.analyticsEvent.create({
      data: {
        eventType: event.eventType,
        userId: event.userId,
        sessionId: event.sessionId,
        timestamp: new Date(),
        metadata: event.metadata || {},
        durationMs: event.durationMs,
        success: event.success ?? true
      }
    });
  }

  /**
   * Update document analytics
   */
  async updateDocumentAnalytics(update: DocumentAnalyticsUpdate): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of month
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of month

    // Upsert document analytics
    await this.prisma.documentAnalytics.upsert({
      where: {
        documentId_periodStart: {
          documentId: update.documentId,
          periodStart
        }
      },
      create: {
        documentId: update.documentId,
        viewCount: update.viewCount || 0,
        searchCount: update.searchCount || 0,
        citationCount: update.citationCount || 0,
        downloadCount: update.downloadCount || 0,
        avgTimeSpent: update.timeSpent || 0,
        periodStart,
        periodEnd,
        lastViewed: update.viewCount ? now : undefined,
        lastCited: update.citationCount ? now : undefined
      },
      update: {
        viewCount: update.viewCount ? { increment: update.viewCount } : undefined,
        searchCount: update.searchCount ? { increment: update.searchCount } : undefined,
        citationCount: update.citationCount ? { increment: update.citationCount } : undefined,
        downloadCount: update.downloadCount ? { increment: update.downloadCount } : undefined,
        lastViewed: update.viewCount ? now : undefined,
        lastCited: update.citationCount ? now : undefined
      }
    });

    // Update trending score
    await this.updateTrendingScore(update.documentId);
  }

  /**
   * Calculate and update trending score for a document
   */
  private async updateTrendingScore(documentId: string): Promise<void> {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get recent analytics
    const recentAnalytics = await this.prisma.documentAnalytics.findMany({
      where: {
        documentId,
        periodStart: { gte: last7Days }
      }
    });

    if (recentAnalytics.length === 0) return;

    // Calculate trending score based on recent activity
    const totalViews = recentAnalytics.reduce((sum, a) => sum + a.viewCount, 0);
    const totalSearches = recentAnalytics.reduce((sum, a) => sum + a.searchCount, 0);
    const totalCitations = recentAnalytics.reduce((sum, a) => sum + a.citationCount, 0);

    // Weighted formula: citations worth more than views
    const trendingScore = (totalViews * 1) + (totalSearches * 2) + (totalCitations * 5);

    // Update the most recent period
    const latestPeriod = recentAnalytics[recentAnalytics.length - 1];
    await this.prisma.documentAnalytics.update({
      where: {
        id: latestPeriod.id
      },
      data: {
        trendingScore
      }
    });
  }

  /**
   * Track search query analytics
   */
  async trackSearch(query: string, resultCount: number, clickThroughPosition?: number): Promise<void> {
    // Find or create search analytics record
    const existing = await this.prisma.searchAnalytics.findFirst({
      where: { query }
    });

    if (existing) {
      // Calculate new click-through rate and average position
      const newSearchCount = existing.searchCount + 1;
      let newClickThroughRate = existing.clickThroughRate || 0;
      let newAvgPosition = existing.avgPosition || 0;

      if (clickThroughPosition !== undefined) {
        // User clicked on a result
        const oldClicks = (existing.clickThroughRate || 0) * existing.searchCount;
        const newClicks = oldClicks + 1;
        newClickThroughRate = newClicks / newSearchCount;

        // Update average position
        const oldPositionSum = (existing.avgPosition || 0) * (oldClicks || 1);
        newAvgPosition = (oldPositionSum + clickThroughPosition) / newClicks;
      }

      await this.prisma.searchAnalytics.update({
        where: { id: existing.id },
        data: {
          resultCount,
          searchCount: { increment: 1 },
          clickThroughRate: newClickThroughRate,
          avgPosition: newAvgPosition,
          lastSearched: new Date()
        }
      });
    } else {
      // Create new record
      await this.prisma.searchAnalytics.create({
        data: {
          query,
          resultCount,
          searchCount: 1,
          clickThroughRate: clickThroughPosition !== undefined ? 1.0 : 0,
          avgPosition: clickThroughPosition,
          lastSearched: new Date()
        }
      });
    }
  }

  /**
   * Save a metric data point
   */
  async saveMetric(metric: MetricData): Promise<void> {
    await this.prisma.analyticsMetric.create({
      data: {
        metricName: metric.metricName,
        metricValue: metric.metricValue,
        dimensions: metric.dimensions || {},
        timestamp: new Date(),
        periodStart: metric.periodStart,
        periodEnd: metric.periodEnd
      }
    });
  }

  /**
   * Get trending documents
   */
  async getTrendingDocuments(limit: number = 10): Promise<Array<{
    documentId: string;
    trendingScore: number;
    viewCount: number;
    citationCount: number;
  }>> {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const trending = await this.prisma.documentAnalytics.findMany({
      where: {
        periodStart: { gte: last30Days },
        trendingScore: { not: null }
      },
      orderBy: { trendingScore: 'desc' },
      take: limit,
      select: {
        documentId: true,
        trendingScore: true,
        viewCount: true,
        citationCount: true
      }
    });

    return trending.map(t => ({
      documentId: t.documentId,
      trendingScore: t.trendingScore || 0,
      viewCount: t.viewCount,
      citationCount: t.citationCount
    }));
  }

  /**
   * Get most searched queries
   */
  async getTopSearchQueries(limit: number = 20): Promise<Array<{
    query: string;
    searchCount: number;
    clickThroughRate: number;
    avgPosition: number;
  }>> {
    const queries = await this.prisma.searchAnalytics.findMany({
      orderBy: { searchCount: 'desc' },
      take: limit,
      select: {
        query: true,
        searchCount: true,
        clickThroughRate: true,
        avgPosition: true
      }
    });

    return queries.map(q => ({
      query: q.query,
      searchCount: q.searchCount,
      clickThroughRate: q.clickThroughRate || 0,
      avgPosition: q.avgPosition || 0
    }));
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(userId: string, days: number = 30): Promise<{
    totalSessions: number;
    totalSearches: number;
    totalDocumentViews: number;
    avgSessionDuration: number;
    activeConversations: number;
  }> {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get events
    const events = await this.prisma.analyticsEvent.findMany({
      where: {
        userId,
        timestamp: { gte: startDate }
      }
    });

    // Calculate metrics
    const sessions = new Set(events.map(e => e.sessionId)).size;
    const searches = events.filter(e => e.eventType === 'search').length;
    const documentViews = events.filter(e => e.eventType === 'document_view').length;
    const avgDuration = events
      .filter(e => e.durationMs)
      .reduce((sum, e) => sum + (e.durationMs || 0), 0) / (events.length || 1);

    // Get active conversations
    const activeConversations = await this.prisma.aIConversation.count({
      where: {
        userId,
        isActive: true,
        lastMessageAt: { gte: startDate }
      }
    });

    return {
      totalSessions: sessions,
      totalSearches: searches,
      totalDocumentViews: documentViews,
      avgSessionDuration: avgDuration,
      activeConversations
    };
  }

  /**
   * Get system-wide analytics dashboard
   */
  async getDashboard(days: number = 30): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalSearches: number;
    totalDocumentViews: number;
    totalConversations: number;
    avgResponseTime: number;
    topDocuments: Array<{ documentId: string; score: number }>;
    topQueries: Array<{ query: string; count: number }>;
  }> {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get event statistics
    const events = await this.prisma.analyticsEvent.findMany({
      where: { timestamp: { gte: startDate } }
    });

    const activeUsers = new Set(events.filter(e => e.userId).map(e => e.userId)).size;
    const totalSearches = events.filter(e => e.eventType === 'search').length;
    const totalDocumentViews = events.filter(e => e.eventType === 'document_view').length;

    // Get total users
    const totalUsers = await this.prisma.user.count();

    // Get total conversations
    const totalConversations = await this.prisma.aIConversation.count({
      where: { startedAt: { gte: startDate } }
    });

    // Get average AI response time
    const aiMessages = await this.prisma.aIMessage.findMany({
      where: {
        role: 'assistant',
        timestamp: { gte: startDate },
        processingTimeMs: { not: null }
      },
      select: { processingTimeMs: true }
    });

    const avgResponseTime = aiMessages.reduce((sum, m) => sum + (m.processingTimeMs || 0), 0) / (aiMessages.length || 1);

    // Get top documents
    const topDocs = await this.getTrendingDocuments(10);

    // Get top queries
    const topQueries = await this.getTopSearchQueries(10);

    return {
      totalUsers,
      activeUsers,
      totalSearches,
      totalDocumentViews,
      totalConversations,
      avgResponseTime,
      topDocuments: topDocs.map(d => ({ documentId: d.documentId, score: d.trendingScore })),
      topQueries: topQueries.map(q => ({ query: q.query, count: q.searchCount }))
    };
  }
}

export const analyticsService = new AnalyticsService();
