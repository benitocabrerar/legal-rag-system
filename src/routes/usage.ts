import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TrackUsageBody {
  type: 'query' | 'document' | 'case' | 'storage' | 'api';
  metadata?: any;
}

export async function usageRoutes(app: FastifyInstance) {
  // GET /api/v1/user/usage - Get current usage statistics
  app.get('/user/usage', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;

      // Get quota
      const quota = await prisma.userQuota.findUnique({
        where: { userId }
      });

      // Get current month usage history
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const currentMonthUsage = await prisma.usageHistory.findFirst({
        where: {
          userId,
          year: currentYear,
          month: currentMonth
        }
      });

      // Get storage breakdown
      const storageBreakdown = await prisma.storageUsage.findMany({
        where: { userId },
        orderBy: { sizeMB: 'desc' }
      });

      // Calculate totals
      const totalStorage = storageBreakdown.reduce((sum, item) => sum + item.sizeMB, 0);
      const totalFiles = storageBreakdown.reduce((sum, item) => sum + item.fileCount, 0);

      return {
        quota,
        currentMonth: currentMonthUsage || {
          aiQueriesCount: 0,
          documentsUploaded: 0,
          casesCreated: 0,
          storageUsedMB: 0,
          apiCallsCount: 0
        },
        storage: {
          breakdown: storageBreakdown,
          totalMB: totalStorage,
          totalFiles
        }
      };
    } catch (error) {
      console.error('Get usage error:', error);
      reply.code(500);
      return { error: 'Failed to fetch usage statistics' };
    }
  });

  // GET /api/v1/user/usage/history - Get usage history
  app.get('/user/usage/history', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const { months = 6 } = request.query as { months?: number };

      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - Number(months));

      const history = await prisma.usageHistory.findMany({
        where: {
          userId,
          date: {
            gte: monthsAgo
          }
        },
        orderBy: { date: 'desc' },
        take: Number(months) * 31 // Max days
      });

      // Group by month for charts
      const monthlyData: Record<string, any> = {};

      history.forEach(record => {
        const key = `${record.year}-${String(record.month).padStart(2, '0')}`;
        if (!monthlyData[key]) {
          monthlyData[key] = {
            year: record.year,
            month: record.month,
            aiQueriesCount: 0,
            documentsUploaded: 0,
            casesCreated: 0,
            storageUsedMB: 0,
            apiCallsCount: 0,
            totalTokensUsed: 0
          };
        }
        monthlyData[key].aiQueriesCount += record.aiQueriesCount;
        monthlyData[key].documentsUploaded += record.documentsUploaded;
        monthlyData[key].casesCreated += record.casesCreated;
        monthlyData[key].storageUsedMB = Math.max(monthlyData[key].storageUsedMB, record.storageUsedMB);
        monthlyData[key].apiCallsCount += record.apiCallsCount;
        monthlyData[key].totalTokensUsed += record.totalTokensUsed;
      });

      const monthlyHistory = Object.values(monthlyData).sort((a: any, b: any) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      return {
        daily: history,
        monthly: monthlyHistory
      };
    } catch (error) {
      console.error('Get usage history error:', error);
      reply.code(500);
      return { error: 'Failed to fetch usage history' };
    }
  });

  // POST /api/v1/user/usage/track - Track usage (internal endpoint)
  app.post<{ Body: TrackUsageBody }>('/user/usage/track', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const {
        type,
        metadata = {}
      } = request.body as TrackUsageBody;

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const week = Math.ceil(now.getDate() / 7);

      // Get or create today's usage record
      const usageRecord = await prisma.usageHistory.upsert({
        where: {
          userId_date: {
            userId,
            date: new Date(now.setHours(0, 0, 0, 0))
          }
        },
        create: {
          userId,
          date: new Date(now.setHours(0, 0, 0, 0)),
          year,
          month,
          week,
          aiQueriesCount: type === 'query' ? 1 : 0,
          documentsUploaded: type === 'document' ? 1 : 0,
          casesCreated: type === 'case' ? 1 : 0,
          storageUsedMB: type === 'storage' ? metadata.sizeMB || 0 : 0,
          apiCallsCount: type === 'api' ? 1 : 0,
          totalTokensUsed: metadata.tokensUsed || 0
        },
        update: {
          aiQueriesCount: type === 'query' ? { increment: 1 } : undefined,
          documentsUploaded: type === 'document' ? { increment: 1 } : undefined,
          casesCreated: type === 'case' ? { increment: 1 } : undefined,
          storageUsedMB: type === 'storage' ? { increment: metadata.sizeMB || 0 } : undefined,
          apiCallsCount: type === 'api' ? { increment: 1 } : undefined,
          totalTokensUsed: metadata.tokensUsed ? { increment: metadata.tokensUsed } : undefined
        }
      });

      // Update user quota counters
      const updateData: any = {};

      if (type === 'query') {
        updateData.queriesUsedMonth = { increment: 1 };
        await prisma.user.update({
          where: { id: userId },
          data: { totalQueries: { increment: 1 } }
        });
      } else if (type === 'document') {
        updateData.documentsUsed = { increment: 1 };
      } else if (type === 'api') {
        updateData.apiCallsUsed = { increment: 1 };
      } else if (type === 'storage') {
        updateData.storageUsedGB = { increment: (metadata.sizeMB || 0) / 1024 };
        await prisma.user.update({
          where: { id: userId },
          data: { storageUsedMB: { increment: metadata.sizeMB || 0 } }
        });
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.userQuota.update({
          where: { userId },
          data: updateData
        });
      }

      return {
        success: true,
        usage: usageRecord
      };
    } catch (error) {
      console.error('Track usage error:', error);
      reply.code(500);
      return { error: 'Failed to track usage' };
    }
  });
}
