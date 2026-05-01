/**
 * Trend Analysis Service
 *
 * Analyzes query and document trends, detects anomalies using z-score,
 * and generates alerts for significant changes in the Legal RAG System.
 */

import { PrismaClient } from '@prisma/client';
import { prisma as prismaClient } from '../../lib/prisma.js';

// Types
interface TrendDataPoint {
  date: Date;
  value: number;
}

interface QueryTrendAnalysis {
  timeframeDays: number;
  totalQueries: number;
  averageDaily: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  rSquared: number;
  slope: number;
  dataPoints: TrendDataPoint[];
  peakDay: { date: Date; count: number } | null;
  topQueries: { query: string; count: number }[];
}

interface DocumentTrendAnalysis {
  totalDocuments: number;
  newDocumentsLast30Days: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  rSquared: number;
  categoryBreakdown: { category: string; count: number; percentage: number }[];
  uploadsByDay: TrendDataPoint[];
  mostActiveUploaders: { userId: string; count: number }[];
}

interface AnomalyDetection {
  metric: string;
  isAnomaly: boolean;
  value: number;
  mean: number;
  stdDev: number;
  zScore: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  description: string;
}

interface TrendAlert {
  id: string;
  type: 'spike' | 'drop' | 'trend_change' | 'anomaly';
  metric: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  changePercentage: number;
  currentValue: number;
  previousValue: number;
  createdAt: Date;
  acknowledged: boolean;
}

interface LinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  predictions: number[];
}

export class TrendAnalysisService {
  private prisma: PrismaClient;
  private significantChangeThreshold = 0.20; // 20% change threshold

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || prismaClient;
  }

  /**
   * Analyze query trends over a specified timeframe
   */
  async analyzeQueryTrends(timeframeDays: number = 30): Promise<QueryTrendAnalysis> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    try {
      // Fetch query logs within timeframe
      const queryLogs = await this.prisma.queryLog.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'asc' }
      });

      // Group by date
      const dailyCounts = this.groupByDate(queryLogs.map(q => q.createdAt));
      const dataPoints = this.fillMissingDates(dailyCounts, startDate, new Date());

      // Calculate linear regression for trend
      const yValues = dataPoints.map(dp => dp.value);
      const regression = this.calculateLinearRegression(yValues);

      // Determine trend direction
      const trendPercentage = regression.slope * timeframeDays / (regression.intercept || 1);
      const trend = this.determineTrend(trendPercentage);

      // Find peak day
      const peakDay = dataPoints.reduce((max, dp) =>
        dp.value > (max?.count || 0) ? { date: dp.date, count: dp.value } : max,
        null as { date: Date; count: number } | null
      );

      // Get top queries
      const queryCounts = new Map<string, number>();
      queryLogs.forEach(q => {
        const query = q.query.toLowerCase().trim();
        queryCounts.set(query, (queryCounts.get(query) || 0) + 1);
      });

      const topQueries = Array.from(queryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }));

      // Calculate statistics
      const totalQueries = queryLogs.length;
      const averageDaily = totalQueries / timeframeDays;

      return {
        timeframeDays,
        totalQueries,
        averageDaily,
        trend,
        trendPercentage: Math.abs(trendPercentage * 100),
        rSquared: regression.rSquared,
        slope: regression.slope,
        dataPoints,
        peakDay,
        topQueries
      };
    } catch (error) {
      console.error('Error analyzing query trends:', error);
      throw error;
    }
  }

  /**
   * Analyze document upload trends
   */
  async analyzeDocumentTrends(): Promise<DocumentTrendAnalysis> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      // Get total documents
      const totalDocuments = await this.prisma.legalDocument.count();

      // Get documents from last 30 days
      const recentDocuments = await this.prisma.legalDocument.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          createdAt: true,
          normType: true,
          legalHierarchy: true,
          uploadedBy: true
        }
      });

      // Group by date for trend
      const dailyCounts = this.groupByDate(recentDocuments.map(d => d.createdAt));
      const uploadsByDay = this.fillMissingDates(dailyCounts, thirtyDaysAgo, new Date());

      // Calculate trend
      const yValues = uploadsByDay.map(dp => dp.value);
      const regression = this.calculateLinearRegression(yValues);
      const trendPercentage = regression.slope * 30 / (regression.intercept || 1);
      const trend = this.determineTrend(trendPercentage);

      // Category breakdown
      const categoryCount = new Map<string, number>();
      recentDocuments.forEach(doc => {
        const category = doc.legalHierarchy;
        categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
      });

      const categoryBreakdown = Array.from(categoryCount.entries())
        .map(([category, count]) => ({
          category,
          count,
          percentage: (count / recentDocuments.length) * 100
        }))
        .sort((a, b) => b.count - a.count);

      // Most active uploaders
      const uploaderCount = new Map<string, number>();
      recentDocuments.forEach(doc => {
        uploaderCount.set(doc.uploadedBy, (uploaderCount.get(doc.uploadedBy) || 0) + 1);
      });

      const mostActiveUploaders = Array.from(uploaderCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId, count]) => ({ userId, count }));

      return {
        totalDocuments,
        newDocumentsLast30Days: recentDocuments.length,
        trend,
        trendPercentage: Math.abs(trendPercentage * 100),
        rSquared: regression.rSquared,
        categoryBreakdown,
        uploadsByDay,
        mostActiveUploaders
      };
    } catch (error) {
      console.error('Error analyzing document trends:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies using z-score method
   */
  async detectAnomalies(
    metric: string,
    threshold: number = 2.0
  ): Promise<AnomalyDetection[]> {
    try {
      const anomalies: AnomalyDetection[] = [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get historical data based on metric type
      let dataPoints: number[] = [];

      switch (metric) {
        case 'query_volume': {
          const queryLogs = await this.prisma.queryLog.groupBy({
            by: ['createdAt'],
            _count: true,
            where: { createdAt: { gte: thirtyDaysAgo } }
          });
          // Group by day
          const dailyCounts = this.groupByDate(queryLogs.map(q => q.createdAt));
          dataPoints = Array.from(dailyCounts.values());
          break;
        }

        case 'document_uploads': {
          const docs = await this.prisma.legalDocument.groupBy({
            by: ['createdAt'],
            _count: true,
            where: { createdAt: { gte: thirtyDaysAgo } }
          });
          const dailyCounts = this.groupByDate(docs.map(d => d.createdAt));
          dataPoints = Array.from(dailyCounts.values());
          break;
        }

        case 'response_time': {
          const logs = await this.prisma.queryLog.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: { responseTime: true }
          });
          dataPoints = logs.map(l => l.responseTime);
          break;
        }

        case 'error_rate': {
          const logs = await this.prisma.queryLog.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: { success: true, createdAt: true }
          });
          // Calculate daily error rate
          const dailyErrors = new Map<string, { errors: number; total: number }>();
          logs.forEach(l => {
            const day = l.createdAt.toISOString().split('T')[0];
            const current = dailyErrors.get(day) || { errors: 0, total: 0 };
            dailyErrors.set(day, {
              errors: current.errors + (l.success ? 0 : 1),
              total: current.total + 1
            });
          });
          dataPoints = Array.from(dailyErrors.values()).map(d =>
            d.total > 0 ? (d.errors / d.total) * 100 : 0
          );
          break;
        }

        default:
          throw new Error(`Unknown metric: ${metric}`);
      }

      if (dataPoints.length < 3) {
        return anomalies;
      }

      // Calculate mean and standard deviation
      const mean = dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length;
      const squaredDiffs = dataPoints.map(v => Math.pow(v - mean, 2));
      const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / dataPoints.length);

      // Check each recent data point for anomalies
      const recentPoints = dataPoints.slice(-7); // Last 7 data points
      const now = new Date();

      recentPoints.forEach((value, index) => {
        const zScore = stdDev > 0 ? (value - mean) / stdDev : 0;
        const isAnomaly = Math.abs(zScore) > threshold;

        if (isAnomaly) {
          const severity = this.determineSeverity(Math.abs(zScore));
          const date = new Date(now);
          date.setDate(date.getDate() - (recentPoints.length - 1 - index));

          anomalies.push({
            metric,
            isAnomaly: true,
            value,
            mean,
            stdDev,
            zScore,
            threshold,
            severity,
            timestamp: date,
            description: this.generateAnomalyDescription(metric, value, mean, zScore)
          });
        }
      });

      return anomalies;
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      throw error;
    }
  }

  /**
   * Get active alerts for significant changes
   */
  async getActiveAlerts(): Promise<TrendAlert[]> {
    const alerts: TrendAlert[] = [];

    try {
      // Check query volume changes
      const queryTrends = await this.analyzeQueryTrends(14);
      const previousQueryTrends = await this.analyzeQueryTrends(28);

      const queryChangePercent = this.calculateChangePercentage(
        queryTrends.averageDaily,
        previousQueryTrends.averageDaily / 2 // Compare to same period
      );

      if (Math.abs(queryChangePercent) > this.significantChangeThreshold * 100) {
        alerts.push(this.createAlert(
          queryChangePercent > 0 ? 'spike' : 'drop',
          'query_volume',
          queryChangePercent,
          queryTrends.averageDaily,
          previousQueryTrends.averageDaily / 2
        ));
      }

      // Check document upload changes
      const docTrends = await this.analyzeDocumentTrends();
      const thirtyDayAvg = docTrends.newDocumentsLast30Days / 30;

      // Compare first half to second half of the period
      const firstHalf = docTrends.uploadsByDay.slice(0, 15).reduce((sum, d) => sum + d.value, 0);
      const secondHalf = docTrends.uploadsByDay.slice(15).reduce((sum, d) => sum + d.value, 0);
      const uploadChangePercent = this.calculateChangePercentage(secondHalf, firstHalf);

      if (Math.abs(uploadChangePercent) > this.significantChangeThreshold * 100) {
        alerts.push(this.createAlert(
          uploadChangePercent > 0 ? 'spike' : 'drop',
          'document_uploads',
          uploadChangePercent,
          secondHalf / 15,
          firstHalf / 15
        ));
      }

      // Check for anomalies
      const queryAnomalies = await this.detectAnomalies('query_volume', 2.5);
      const responseTimeAnomalies = await this.detectAnomalies('response_time', 2.5);

      queryAnomalies.forEach(anomaly => {
        if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
          alerts.push({
            id: `anomaly_${anomaly.metric}_${Date.now()}`,
            type: 'anomaly',
            metric: anomaly.metric,
            severity: anomaly.severity === 'critical' ? 'critical' : 'warning',
            message: anomaly.description,
            changePercentage: ((anomaly.value - anomaly.mean) / anomaly.mean) * 100,
            currentValue: anomaly.value,
            previousValue: anomaly.mean,
            createdAt: anomaly.timestamp,
            acknowledged: false
          });
        }
      });

      responseTimeAnomalies.forEach(anomaly => {
        if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
          alerts.push({
            id: `anomaly_${anomaly.metric}_${Date.now()}`,
            type: 'anomaly',
            metric: anomaly.metric,
            severity: anomaly.severity === 'critical' ? 'critical' : 'warning',
            message: anomaly.description,
            changePercentage: ((anomaly.value - anomaly.mean) / anomaly.mean) * 100,
            currentValue: anomaly.value,
            previousValue: anomaly.mean,
            createdAt: anomaly.timestamp,
            acknowledged: false
          });
        }
      });

      return alerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
    } catch (error) {
      console.error('Error getting active alerts:', error);
      throw error;
    }
  }

  /**
   * Get trend summary for dashboard
   */
  async getTrendSummary(): Promise<{
    queries: QueryTrendAnalysis;
    documents: DocumentTrendAnalysis;
    anomalies: AnomalyDetection[];
    alerts: TrendAlert[];
  }> {
    const [queries, documents, queryAnomalies, responseAnomalies, alerts] = await Promise.all([
      this.analyzeQueryTrends(30),
      this.analyzeDocumentTrends(),
      this.detectAnomalies('query_volume'),
      this.detectAnomalies('response_time'),
      this.getActiveAlerts()
    ]);

    return {
      queries,
      documents,
      anomalies: [...queryAnomalies, ...responseAnomalies],
      alerts
    };
  }

  // Private helper methods

  /**
   * Group dates into daily counts
   */
  private groupByDate(dates: Date[]): Map<string, number> {
    const counts = new Map<string, number>();
    dates.forEach(date => {
      const day = date.toISOString().split('T')[0];
      counts.set(day, (counts.get(day) || 0) + 1);
    });
    return counts;
  }

  /**
   * Fill missing dates with zero values
   */
  private fillMissingDates(
    counts: Map<string, number>,
    startDate: Date,
    endDate: Date
  ): TrendDataPoint[] {
    const result: TrendDataPoint[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const day = current.toISOString().split('T')[0];
      result.push({
        date: new Date(current),
        value: counts.get(day) || 0
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  /**
   * Calculate linear regression with R-squared
   */
  private calculateLinearRegression(yValues: number[]): LinearRegressionResult {
    const n = yValues.length;
    if (n < 2) {
      return { slope: 0, intercept: 0, rSquared: 0, predictions: yValues };
    }

    // x values are just indices 0, 1, 2, ...
    const xMean = (n - 1) / 2;
    const yMean = yValues.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (yValues[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Calculate R-squared
    const predictions = yValues.map((_, i) => slope * i + intercept);
    const ssRes = yValues.reduce((sum, y, i) => sum + Math.pow(y - predictions[i], 2), 0);
    const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, rSquared, predictions };
  }

  /**
   * Determine trend direction based on percentage change
   */
  private determineTrend(percentage: number): 'increasing' | 'decreasing' | 'stable' {
    if (percentage > 0.05) return 'increasing';
    if (percentage < -0.05) return 'decreasing';
    return 'stable';
  }

  /**
   * Determine anomaly severity based on z-score
   */
  private determineSeverity(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (zScore >= 4) return 'critical';
    if (zScore >= 3) return 'high';
    if (zScore >= 2.5) return 'medium';
    return 'low';
  }

  /**
   * Generate human-readable anomaly description
   */
  private generateAnomalyDescription(
    metric: string,
    value: number,
    mean: number,
    zScore: number
  ): string {
    const direction = zScore > 0 ? 'above' : 'below';
    const metricNames: Record<string, string> = {
      query_volume: 'Query volume',
      document_uploads: 'Document uploads',
      response_time: 'Response time',
      error_rate: 'Error rate'
    };

    const metricName = metricNames[metric] || metric;
    const deviation = Math.abs(zScore).toFixed(1);

    return `${metricName} is ${deviation} standard deviations ${direction} the mean. ` +
      `Current: ${value.toFixed(1)}, Average: ${mean.toFixed(1)}`;
  }

  /**
   * Calculate percentage change
   */
  private calculateChangePercentage(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Create a trend alert
   */
  private createAlert(
    type: 'spike' | 'drop' | 'trend_change' | 'anomaly',
    metric: string,
    changePercentage: number,
    currentValue: number,
    previousValue: number
  ): TrendAlert {
    const severity = Math.abs(changePercentage) > 50 ? 'critical' :
      Math.abs(changePercentage) > 30 ? 'warning' : 'info';

    const metricNames: Record<string, string> = {
      query_volume: 'query volume',
      document_uploads: 'document uploads',
      response_time: 'response time',
      error_rate: 'error rate'
    };

    const metricName = metricNames[metric] || metric;
    const direction = changePercentage > 0 ? 'increased' : 'decreased';

    return {
      id: `${type}_${metric}_${Date.now()}`,
      type,
      metric,
      severity,
      message: `${metricName.charAt(0).toUpperCase() + metricName.slice(1)} has ${direction} by ${Math.abs(changePercentage).toFixed(1)}%`,
      changePercentage,
      currentValue,
      previousValue,
      createdAt: new Date(),
      acknowledged: false
    };
  }
}

// Singleton instance
let trendAnalysisInstance: TrendAnalysisService | null = null;

export function getTrendAnalysisService(prisma?: PrismaClient): TrendAnalysisService {
  if (!trendAnalysisInstance) {
    trendAnalysisInstance = new TrendAnalysisService(prisma);
  }
  return trendAnalysisInstance;
}
