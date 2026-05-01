/**
 * Trends API Routes
 *
 * Endpoints for query trends, document trends, anomaly detection, and alerts.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getTrendAnalysisService } from '../services/ai/trend-analysis.service.js';
import { PrismaClient } from '@prisma/client';

// Request types
interface QueryTrendsQuerystring {
  timeframeDays?: number;
}

interface AnomaliesQuerystring {
  metric: string;
  threshold?: number;
}

interface AlertsQuerystring {
  acknowledged?: boolean;
  severity?: string;
  limit?: number;
}

interface AcknowledgeAlertParams {
  id: string;
}

/**
 * Register trends routes
 */
export async function trendsRoutes(fastify: FastifyInstance) {
  const prisma = (fastify as any).prisma as PrismaClient;
  const trendService = getTrendAnalysisService(prisma);

  /**
   * Get query trends
   * GET /api/v1/trends/queries
   */
  fastify.get<{ Querystring: QueryTrendsQuerystring }>(
    '/queries',
    {
      preHandler: [(fastify as any).authenticate],
      schema: {
        tags: ['Trends & Analytics'],
        description: 'Analyze query volume trends over a specified timeframe',
        querystring: {
          type: 'object',
          properties: {
            timeframeDays: {
              type: 'number',
              default: 30,
              description: 'Number of days to analyze'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              timeframeDays: { type: 'number' },
              totalQueries: { type: 'number' },
              averageDaily: { type: 'number' },
              trend: { type: 'string', enum: ['increasing', 'decreasing', 'stable'] },
              trendPercentage: { type: 'number' },
              rSquared: { type: 'number', description: 'R-squared value for trend line' },
              slope: { type: 'number' },
              dataPoints: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string' },
                    value: { type: 'number' }
                  }
                }
              },
              peakDay: {
                type: 'object',
                nullable: true,
                properties: {
                  date: { type: 'string' },
                  count: { type: 'number' }
                }
              },
              topQueries: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    query: { type: 'string' },
                    count: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Querystring: QueryTrendsQuerystring }>, reply: FastifyReply) => {
      try {
        const timeframeDays = request.query.timeframeDays || 30;

        const trends = await trendService.analyzeQueryTrends(timeframeDays);
        reply.code(200).send(trends);
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to analyze query trends' });
      }
    }
  );

  /**
   * Get document trends
   * GET /api/v1/trends/documents
   */
  fastify.get(
    '/documents',
    {
      preHandler: [(fastify as any).authenticate],
      schema: {
        tags: ['Trends & Analytics'],
        description: 'Analyze document upload trends',
        response: {
          200: {
            type: 'object',
            properties: {
              totalDocuments: { type: 'number' },
              newDocumentsLast30Days: { type: 'number' },
              trend: { type: 'string', enum: ['increasing', 'decreasing', 'stable'] },
              trendPercentage: { type: 'number' },
              rSquared: { type: 'number' },
              categoryBreakdown: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    category: { type: 'string' },
                    count: { type: 'number' },
                    percentage: { type: 'number' }
                  }
                }
              },
              uploadsByDay: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string' },
                    value: { type: 'number' }
                  }
                }
              },
              mostActiveUploaders: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string' },
                    count: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const trends = await trendService.analyzeDocumentTrends();
        reply.code(200).send(trends);
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to analyze document trends' });
      }
    }
  );

  /**
   * Get detected anomalies
   * GET /api/v1/trends/anomalies
   */
  fastify.get<{ Querystring: AnomaliesQuerystring }>(
    '/anomalies',
    {
      preHandler: [(fastify as any).authenticate],
      schema: {
        tags: ['Trends & Analytics'],
        description: 'Detect anomalies in system metrics using z-score analysis',
        querystring: {
          type: 'object',
          required: ['metric'],
          properties: {
            metric: {
              type: 'string',
              enum: ['query_volume', 'document_uploads', 'response_time', 'error_rate'],
              description: 'Metric to analyze'
            },
            threshold: {
              type: 'number',
              default: 2.0,
              description: 'Z-score threshold for anomaly detection'
            }
          }
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                metric: { type: 'string' },
                isAnomaly: { type: 'boolean' },
                value: { type: 'number' },
                mean: { type: 'number' },
                stdDev: { type: 'number' },
                zScore: { type: 'number' },
                threshold: { type: 'number' },
                severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                timestamp: { type: 'string' },
                description: { type: 'string' }
              }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Querystring: AnomaliesQuerystring }>, reply: FastifyReply) => {
      try {
        const { metric, threshold } = request.query;

        const anomalies = await trendService.detectAnomalies(metric, threshold || 2.0);
        reply.code(200).send(anomalies);
      } catch (error) {
        request.log.error(error);
        const message = error instanceof Error ? error.message : 'Failed to detect anomalies';
        reply.code(500).send({ error: message });
      }
    }
  );

  /**
   * Get active alerts
   * GET /api/v1/trends/alerts
   */
  fastify.get<{ Querystring: AlertsQuerystring }>(
    '/alerts',
    {
      preHandler: [(fastify as any).authenticate],
      schema: {
        tags: ['Trends & Analytics'],
        description: 'Get active trend alerts for significant changes (>20%)',
        querystring: {
          type: 'object',
          properties: {
            acknowledged: {
              type: 'boolean',
              description: 'Filter by acknowledgment status'
            },
            severity: {
              type: 'string',
              enum: ['info', 'warning', 'critical'],
              description: 'Filter by severity level'
            },
            limit: {
              type: 'number',
              default: 50,
              description: 'Maximum number of alerts to return'
            }
          }
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', enum: ['spike', 'drop', 'trend_change', 'anomaly'] },
                metric: { type: 'string' },
                severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
                message: { type: 'string' },
                changePercentage: { type: 'number' },
                currentValue: { type: 'number' },
                previousValue: { type: 'number' },
                createdAt: { type: 'string' },
                acknowledged: { type: 'boolean' }
              }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Querystring: AlertsQuerystring }>, reply: FastifyReply) => {
      try {
        const { acknowledged, severity, limit } = request.query;

        let alerts = await trendService.getActiveAlerts();

        // Apply filters
        if (typeof acknowledged === 'boolean') {
          alerts = alerts.filter(a => a.acknowledged === acknowledged);
        }

        if (severity) {
          alerts = alerts.filter(a => a.severity === severity);
        }

        // Apply limit
        alerts = alerts.slice(0, limit || 50);

        reply.code(200).send(alerts);
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to get alerts' });
      }
    }
  );

  /**
   * Get trend summary dashboard
   * GET /api/v1/trends/summary
   */
  fastify.get(
    '/summary',
    {
      preHandler: [(fastify as any).authenticate],
      schema: {
        tags: ['Trends & Analytics'],
        description: 'Get comprehensive trend summary for dashboard',
        response: {
          200: {
            type: 'object',
            properties: {
              queries: { type: 'object' },
              documents: { type: 'object' },
              anomalies: { type: 'array' },
              alerts: { type: 'array' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const summary = await trendService.getTrendSummary();
        reply.code(200).send(summary);
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to get trend summary' });
      }
    }
  );

  /**
   * Acknowledge an alert
   * POST /api/v1/trends/alerts/:id/acknowledge
   */
  fastify.post<{ Params: AcknowledgeAlertParams }>(
    '/alerts/:id/acknowledge',
    {
      preHandler: [(fastify as any).authenticate],
      schema: {
        tags: ['Trends & Analytics'],
        description: 'Acknowledge a trend alert',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Alert ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Params: AcknowledgeAlertParams }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        // @ts-ignore
        const userId = request.user?.id;

        // Store acknowledgment
        await prisma.systemMetric.create({
          data: {
            metricName: 'alert_acknowledgment',
            metricValue: 1,
            metricUnit: 'acknowledgment',
            category: 'alerts',
            metadata: {
              alertId: id,
              acknowledgedBy: userId,
              acknowledgedAt: new Date().toISOString()
            }
          }
        });

        reply.code(200).send({
          success: true,
          message: 'Alert acknowledged successfully'
        });
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to acknowledge alert' });
      }
    }
  );

  /**
   * Get metric history
   * GET /api/v1/trends/metrics/:metric/history
   */
  fastify.get<{
    Params: { metric: string };
    Querystring: { days?: number }
  }>(
    '/metrics/:metric/history',
    {
      preHandler: [(fastify as any).authenticate],
      schema: {
        tags: ['Trends & Analytics'],
        description: 'Get historical data for a specific metric',
        params: {
          type: 'object',
          required: ['metric'],
          properties: {
            metric: {
              type: 'string',
              description: 'Metric name'
            }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            days: {
              type: 'number',
              default: 30,
              description: 'Number of days of history'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              metric: { type: 'string' },
              timeframe: { type: 'number' },
              dataPoints: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string' },
                    value: { type: 'number' }
                  }
                }
              },
              statistics: {
                type: 'object',
                properties: {
                  min: { type: 'number' },
                  max: { type: 'number' },
                  avg: { type: 'number' },
                  sum: { type: 'number' }
                }
              }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{
      Params: { metric: string };
      Querystring: { days?: number }
    }>, reply: FastifyReply) => {
      try {
        const { metric } = request.params;
        const days = request.query.days || 30;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get metric data
        const metrics = await prisma.systemMetric.findMany({
          where: {
            metricName: metric,
            timestamp: { gte: startDate }
          },
          orderBy: { timestamp: 'asc' }
        });

        const dataPoints = metrics.map(m => ({
          timestamp: m.timestamp.toISOString(),
          value: m.metricValue
        }));

        const values = metrics.map(m => m.metricValue);
        const statistics = values.length > 0 ? {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          sum: values.reduce((a, b) => a + b, 0)
        } : {
          min: 0,
          max: 0,
          avg: 0,
          sum: 0
        };

        reply.code(200).send({
          metric,
          timeframe: days,
          dataPoints,
          statistics
        });
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to get metric history' });
      }
    }
  );

  /**
   * Compare trends across periods
   * GET /api/v1/trends/compare
   */
  fastify.get<{
    Querystring: {
      metric: string;
      currentDays?: number;
      previousDays?: number;
    }
  }>(
    '/compare',
    {
      preHandler: [(fastify as any).authenticate],
      schema: {
        tags: ['Trends & Analytics'],
        description: 'Compare trends between current and previous periods',
        querystring: {
          type: 'object',
          required: ['metric'],
          properties: {
            metric: { type: 'string', description: 'Metric to compare' },
            currentDays: { type: 'number', default: 7, description: 'Current period in days' },
            previousDays: { type: 'number', default: 7, description: 'Previous period in days' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              metric: { type: 'string' },
              currentPeriod: {
                type: 'object',
                properties: {
                  days: { type: 'number' },
                  total: { type: 'number' },
                  average: { type: 'number' }
                }
              },
              previousPeriod: {
                type: 'object',
                properties: {
                  days: { type: 'number' },
                  total: { type: 'number' },
                  average: { type: 'number' }
                }
              },
              change: {
                type: 'object',
                properties: {
                  absolute: { type: 'number' },
                  percentage: { type: 'number' },
                  direction: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{
      Querystring: {
        metric: string;
        currentDays?: number;
        previousDays?: number;
      }
    }>, reply: FastifyReply) => {
      try {
        const { metric, currentDays = 7, previousDays = 7 } = request.query;

        const now = new Date();
        const currentStart = new Date(now);
        currentStart.setDate(currentStart.getDate() - currentDays);

        const previousEnd = new Date(currentStart);
        const previousStart = new Date(previousEnd);
        previousStart.setDate(previousStart.getDate() - previousDays);

        // Get current period data
        const currentMetrics = await prisma.systemMetric.findMany({
          where: {
            metricName: metric,
            timestamp: { gte: currentStart, lte: now }
          }
        });

        // Get previous period data
        const previousMetrics = await prisma.systemMetric.findMany({
          where: {
            metricName: metric,
            timestamp: { gte: previousStart, lt: currentStart }
          }
        });

        const currentTotal = currentMetrics.reduce((sum, m) => sum + m.metricValue, 0);
        const previousTotal = previousMetrics.reduce((sum, m) => sum + m.metricValue, 0);

        const currentAvg = currentMetrics.length > 0 ? currentTotal / currentMetrics.length : 0;
        const previousAvg = previousMetrics.length > 0 ? previousTotal / previousMetrics.length : 0;

        const absoluteChange = currentTotal - previousTotal;
        const percentageChange = previousTotal !== 0
          ? ((currentTotal - previousTotal) / previousTotal) * 100
          : currentTotal > 0 ? 100 : 0;

        reply.code(200).send({
          metric,
          currentPeriod: {
            days: currentDays,
            total: currentTotal,
            average: currentAvg
          },
          previousPeriod: {
            days: previousDays,
            total: previousTotal,
            average: previousAvg
          },
          change: {
            absolute: absoluteChange,
            percentage: percentageChange,
            direction: absoluteChange > 0 ? 'increase' : absoluteChange < 0 ? 'decrease' : 'stable'
          }
        });
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to compare trends' });
      }
    }
  );
}

export default trendsRoutes;
