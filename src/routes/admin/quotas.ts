import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const updateQuotaSchema = z.object({
  storageGB: z.number().positive().optional(),
  documentsLimit: z.number().int().positive().optional(),
  monthlyQueries: z.number().int().positive().optional(),
  apiCallsLimit: z.number().int().positive().optional(),
});

const bulkUpdateQuotaSchema = z.object({
  userIds: z.array(z.string()),
  quotaUpdates: updateQuotaSchema,
});

// Middleware to check admin role
async function requireAdmin(request: any, reply: any) {
  const user = request.user;
  if (!user || user.role !== 'admin') {
    return reply.code(403).send({ error: 'Admin access required' });
  }
}

export async function adminQuotaRoutes(fastify: FastifyInstance) {
  // Get all user quotas with filtering
  fastify.get('/admin/quotas', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const {
        page = 1,
        limit = 50,
        overLimit = false,
        sortBy = 'storageUsedGB',
        sortOrder = 'desc',
      } = request.query as any;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (overLimit === 'true') {
        where.OR = [
          {
            storageUsedGB: {
              gte: prisma.userQuota.fields.storageGB,
            },
          },
          {
            documentsUsed: {
              gte: prisma.userQuota.fields.documentsLimit,
            },
          },
          {
            queriesUsedMonth: {
              gte: prisma.userQuota.fields.monthlyQueries,
            },
          },
        ];
      }

      const [total, quotas] = await Promise.all([
        prisma.userQuota.count({ where }),
        prisma.userQuota.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { [sortBy]: sortOrder },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                planTier: true,
              },
            },
          },
        }),
      ]);

      // Calculate usage percentages
      const quotasWithPercentages = quotas.map((quota) => ({
        ...quota,
        storageUsagePercent: (quota.storageUsedGB / quota.storageGB) * 100,
        documentsUsagePercent: (quota.documentsUsed / quota.documentsLimit) * 100,
        queriesUsagePercent: (quota.queriesUsedMonth / quota.monthlyQueries) * 100,
        apiCallsUsagePercent: (quota.apiCallsUsed / quota.apiCallsLimit) * 100,
      }));

      return reply.send({
        quotas: quotasWithPercentages,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching quotas:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get quota for specific user
  fastify.get('/admin/quotas/:userId', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };

      const quota = await prisma.userQuota.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              planTier: true,
              storageUsedMB: true,
              totalQueries: true,
            },
          },
        },
      });

      if (!quota) {
        return reply.code(404).send({ error: 'Quota not found' });
      }

      // Get storage breakdown
      const storageBreakdown = await prisma.storageUsage.findMany({
        where: { userId },
        orderBy: { sizeMB: 'desc' },
      });

      return reply.send({
        quota: {
          ...quota,
          storageUsagePercent: (quota.storageUsedGB / quota.storageGB) * 100,
          documentsUsagePercent: (quota.documentsUsed / quota.documentsLimit) * 100,
          queriesUsagePercent: (quota.queriesUsedMonth / quota.monthlyQueries) * 100,
          apiCallsUsagePercent: (quota.apiCallsUsed / quota.apiCallsLimit) * 100,
        },
        storageBreakdown,
      });
    } catch (error) {
      console.error('Error fetching quota:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update user quota
  fastify.patch('/admin/quotas/:userId', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };
      const body = updateQuotaSchema.parse(request.body);

      // Check if quota exists
      const existing = await prisma.userQuota.findUnique({
        where: { userId },
      });

      if (!existing) {
        // Create quota if it doesn't exist
        const quota = await prisma.userQuota.create({
          data: {
            userId,
            ...body,
            resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId: (request.user as any).id,
            action: 'CREATE_QUOTA',
            entity: 'user_quota',
            entityId: quota.id,
            changes: body,
            ipAddress: request.ip,
          },
        });

        return reply.code(201).send({ quota });
      }

      // Update existing quota
      const updated = await prisma.userQuota.update({
        where: { userId },
        data: body,
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: (request.user as any).id,
          action: 'UPDATE_QUOTA',
          entity: 'user_quota',
          entityId: updated.id,
          changes: body,
          ipAddress: request.ip,
        },
      });

      return reply.send({ quota: updated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error updating quota:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Bulk update quotas
  fastify.post('/admin/quotas/bulk-update', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const body = bulkUpdateQuotaSchema.parse(request.body);

      // Update quotas
      const results = await Promise.all(
        body.userIds.map(async (userId) => {
          const existing = await prisma.userQuota.findUnique({
            where: { userId },
          });

          if (existing) {
            return prisma.userQuota.update({
              where: { userId },
              data: body.quotaUpdates,
            });
          } else {
            return prisma.userQuota.create({
              data: {
                userId,
                ...body.quotaUpdates,
                resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            });
          }
        })
      );

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: (request.user as any).id,
          action: 'BULK_UPDATE_QUOTAS',
          entity: 'user_quota',
          changes: { userIds: body.userIds, updates: body.quotaUpdates },
          ipAddress: request.ip,
        },
      });

      return reply.send({
        message: `Updated quotas for ${results.length} users`,
        count: results.length,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error in bulk quota update:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Reset monthly usage counters
  fastify.post('/admin/quotas/reset-monthly', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const result = await prisma.userQuota.updateMany({
        data: {
          queriesUsedMonth: 0,
          apiCallsUsed: 0,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: (request.user as any).id,
          action: 'RESET_MONTHLY_QUOTAS',
          entity: 'user_quota',
          changes: { count: result.count },
          ipAddress: request.ip,
        },
      });

      return reply.send({
        message: `Reset monthly quotas for ${result.count} users`,
        count: result.count,
      });
    } catch (error) {
      console.error('Error resetting monthly quotas:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get quota statistics
  fastify.get('/admin/quotas/stats', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const [
        totalQuotas,
        storageStats,
        documentsStats,
        queriesStats,
        overLimitUsers,
      ] = await Promise.all([
        prisma.userQuota.count(),
        prisma.userQuota.aggregate({
          _sum: { storageGB: true, storageUsedGB: true },
          _avg: { storageUsedGB: true },
        }),
        prisma.userQuota.aggregate({
          _sum: { documentsLimit: true, documentsUsed: true },
          _avg: { documentsUsed: true },
        }),
        prisma.userQuota.aggregate({
          _sum: { monthlyQueries: true, queriesUsedMonth: true },
          _avg: { queriesUsedMonth: true },
        }),
        prisma.userQuota.count({
          where: {
            OR: [
              { storageUsedGB: { gte: prisma.userQuota.fields.storageGB } },
              { documentsUsed: { gte: prisma.userQuota.fields.documentsLimit } },
              { queriesUsedMonth: { gte: prisma.userQuota.fields.monthlyQueries } },
            ],
          },
        }),
      ]);

      return reply.send({
        totalQuotas,
        storage: {
          totalAllocated: storageStats._sum.storageGB,
          totalUsed: storageStats._sum.storageUsedGB,
          averageUsed: storageStats._avg.storageUsedGB,
          usagePercent: storageStats._sum.storageGB
            ? (storageStats._sum.storageUsedGB! / storageStats._sum.storageGB) * 100
            : 0,
        },
        documents: {
          totalLimit: documentsStats._sum.documentsLimit,
          totalUsed: documentsStats._sum.documentsUsed,
          averageUsed: documentsStats._avg.documentsUsed,
        },
        queries: {
          monthlyLimit: queriesStats._sum.monthlyQueries,
          monthlyUsed: queriesStats._sum.queriesUsedMonth,
          averageUsed: queriesStats._avg.queriesUsedMonth,
        },
        overLimitUsers,
      });
    } catch (error) {
      console.error('Error fetching quota stats:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Recalculate storage for a user
  fastify.post('/admin/quotas/:userId/recalculate-storage', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };

      // Calculate actual storage used by counting characters
      const [caseDocumentsResult, legalDocumentsResult] = await Promise.all([
        prisma.$queryRaw<[{ total: bigint | null }]>`
          SELECT COALESCE(SUM(LENGTH(content)), 0)::bigint as total
          FROM documents
          WHERE user_id = ${userId}
        `,
        prisma.$queryRaw<[{ total: bigint | null }]>`
          SELECT COALESCE(SUM(LENGTH(content)), 0)::bigint as total
          FROM legal_documents
          WHERE uploaded_by = ${userId}
        `,
      ]);

      // Extract totals and convert to numbers
      const caseDocuments = Number(caseDocumentsResult[0]?.total || 0);
      const legalDocuments = Number(legalDocumentsResult[0]?.total || 0);

      // Rough estimation: text content size in MB
      const totalCharacters = caseDocuments + legalDocuments;
      const estimatedSizeMB = (totalCharacters * 2) / (1024 * 1024);
      const estimatedSizeGB = estimatedSizeMB / 1024;

      // Update quota
      const quota = await prisma.userQuota.update({
        where: { userId },
        data: { storageUsedGB: estimatedSizeGB },
      });

      // Update user storage
      await prisma.user.update({
        where: { id: userId },
        data: { storageUsedMB: estimatedSizeMB },
      });

      // Update storage breakdown
      await prisma.storageUsage.deleteMany({ where: { userId } });
      await prisma.storageUsage.createMany({
        data: [
          {
            userId,
            category: 'case_documents',
            sizeMB: (caseDocuments * 2) / (1024 * 1024),
            fileCount: await prisma.document.count({ where: { userId } }),
          },
          {
            userId,
            category: 'legal_documents',
            sizeMB: (legalDocuments * 2) / (1024 * 1024),
            fileCount: await prisma.legalDocument.count({ where: { uploadedBy: userId } }),
          },
        ],
      });

      return reply.send({
        message: 'Storage recalculated successfully',
        storageUsedGB: estimatedSizeGB,
        storageUsedMB: estimatedSizeMB,
      });
    } catch (error) {
      console.error('Error recalculating storage:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
