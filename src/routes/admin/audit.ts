import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Middleware to check admin role
async function requireAdmin(request: any, reply: any) {
  const user = request.user;
  if (!user || user.role !== 'admin') {
    return reply.code(403).send({ error: 'Admin access required' });
  }
}

export async function adminAuditRoutes(fastify: FastifyInstance) {
  // Get audit logs with filtering
  fastify.get('/admin/audit', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const {
        page = 1,
        limit = 50,
        userId,
        action,
        entity,
        dateFrom,
        dateTo,
        success,
      } = request.query as any;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (entity) where.entity = entity;
      if (success !== undefined) where.success = success === 'true';

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
        }),
      ]);

      return reply.send({
        logs,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get audit log statistics
  fastify.get('/admin/audit/stats', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const [
        totalLogs,
        byAction,
        byEntity,
        recentFailures,
        activityToday,
      ] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.groupBy({
          by: ['action'],
          _count: true,
          orderBy: { _count: { action: 'desc' } },
          take: 10,
        }),
        prisma.auditLog.groupBy({
          by: ['entity'],
          _count: true,
          orderBy: { _count: { entity: 'desc' } },
        }),
        prisma.auditLog.findMany({
          where: {
            success: false,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        }),
        prisma.auditLog.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
      ]);

      return reply.send({
        totalLogs,
        byAction,
        byEntity,
        recentFailures,
        activityToday,
      });
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get query logs with filtering
  fastify.get('/admin/queries', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const {
        page = 1,
        limit = 50,
        userId,
        success,
        dateFrom,
        dateTo,
      } = request.query as any;

      const skip = (page - 1) * limit;

      const where: any = {};
      if (userId) where.userId = userId;
      if (success !== undefined) where.success = success === 'true';

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      const [total, queries] = await Promise.all([
        prisma.queryLog.count({ where }),
        prisma.queryLog.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            query: true,
            documentsFound: true,
            responseTime: true,
            tokensUsed: true,
            model: true,
            success: true,
            errorMessage: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        }),
      ]);

      return reply.send({
        queries,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching query logs:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get query statistics
  fastify.get('/admin/queries/stats', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const [
        totalQueries,
        successRate,
        avgResponseTime,
        totalTokens,
        queriesLast24h,
        topUsers,
      ] = await Promise.all([
        prisma.queryLog.count(),
        prisma.queryLog.aggregate({
          where: { success: true },
          _count: true,
        }).then(async (successful) => {
          const total = await prisma.queryLog.count();
          return total > 0 ? (successful._count / total) * 100 : 0;
        }),
        prisma.queryLog.aggregate({
          _avg: { responseTime: true },
        }).then((result) => result._avg.responseTime || 0),
        prisma.queryLog.aggregate({
          _sum: { tokensUsed: true },
        }).then((result) => result._sum.tokensUsed || 0),
        prisma.queryLog.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.queryLog.groupBy({
          by: ['userId'],
          _count: true,
          orderBy: { _count: { userId: 'desc' } },
          take: 10,
        }).then(async (results) => {
          const userIds = results
            .map((r) => r.userId)
            .filter((id): id is string => id !== null);

          const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, name: true },
          });

          return results.map((r) => ({
            user: users.find((u) => u.id === r.userId),
            count: r._count,
          }));
        }),
      ]);

      return reply.send({
        totalQueries,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        totalTokens,
        queriesLast24h,
        topUsers,
      });
    } catch (error) {
      console.error('Error fetching query stats:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get system metrics
  fastify.get('/admin/metrics', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const {
        category,
        metricName,
        dateFrom,
        dateTo,
        limit = 100,
      } = request.query as any;

      const where: any = {};
      if (category) where.category = category;
      if (metricName) where.metricName = metricName;

      if (dateFrom || dateTo) {
        where.timestamp = {};
        if (dateFrom) where.timestamp.gte = new Date(dateFrom);
        if (dateTo) where.timestamp.lte = new Date(dateTo);
      }

      const metrics = await prisma.systemMetric.findMany({
        where,
        take: Number(limit),
        orderBy: { timestamp: 'desc' },
      });

      return reply.send({ metrics });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Record system metric
  fastify.post('/admin/metrics', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const {
        metricName,
        metricValue,
        metricUnit,
        category,
        metadata,
      } = request.body as any;

      const metric = await prisma.systemMetric.create({
        data: {
          metricName,
          metricValue,
          metricUnit,
          category,
          metadata,
        },
      });

      return reply.code(201).send({ metric });
    } catch (error) {
      console.error('Error recording metric:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get database statistics
  fastify.get('/admin/database/stats', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      // Get table sizes from PostgreSQL
      const tableStatsRaw = await prisma.$queryRaw<any[]>`
        SELECT
          schemaname,
          relname AS tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS size,
          pg_total_relation_size(schemaname||'.'||relname) AS size_bytes,
          n_tup_ins AS inserts,
          n_tup_upd AS updates,
          n_tup_del AS deletes,
          n_live_tup AS live_tuples,
          last_vacuum,
          last_analyze
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC
      `;

      // Convert BigInt values to Number for JSON serialization
      const tableStats = tableStatsRaw.map(row => ({
        ...row,
        size_bytes: Number(row.size_bytes),
        inserts: Number(row.inserts),
        updates: Number(row.updates),
        deletes: Number(row.deletes),
        live_tuples: Number(row.live_tuples),
      }));

      // Get row counts for each table
      const [
        userCount,
        caseCount,
        documentCount,
        legalDocumentCount,
        specialtyCount,
        auditLogCount,
        queryLogCount,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.case.count(),
        prisma.document.count(),
        prisma.legalDocument.count(),
        prisma.legalSpecialty.count(),
        prisma.auditLog.count(),
        prisma.queryLog.count(),
      ]);

      return reply.send({
        tableStats,
        rowCounts: {
          users: userCount,
          cases: caseCount,
          documents: documentCount,
          legalDocuments: legalDocumentCount,
          specialties: specialtyCount,
          auditLogs: auditLogCount,
          queryLogs: queryLogCount,
        },
      });
    } catch (error) {
      console.error('Error fetching database stats:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
