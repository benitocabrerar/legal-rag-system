import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const createPlanSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  nameEnglish: z.string().min(2).max(100),
  description: z.string().optional(),
  priceMonthlyUSD: z.number().min(0),
  priceYearlyUSD: z.number().min(0),
  storageGB: z.number().min(0),
  documentsLimit: z.number().int().min(0),
  monthlyQueries: z.number().int().min(0),
  apiCallsLimit: z.number().int().min(0),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

const updatePlanSchema = createPlanSchema.partial();

// Middleware to check admin role
async function requireAdmin(request: any, reply: any) {
  const user = request.user;
  if (!user || user.role !== 'admin') {
    return reply.code(403).send({ error: 'Admin access required' });
  }
}

export async function adminPlanRoutes(fastify: FastifyInstance) {
  // Get all subscription plans (public - no auth required)
  fastify.get('/api/plans', async (request, reply) => {
    try {
      const { includeInactive = false } = request.query as any;

      const where: any = {};
      if (!includeInactive) {
        where.isActive = true;
      }

      const plans = await prisma.subscriptionPlan.findMany({
        where,
        orderBy: { displayOrder: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          nameEnglish: true,
          description: true,
          priceMonthlyUSD: true,
          priceYearlyUSD: true,
          storageGB: true,
          documentsLimit: true,
          monthlyQueries: true,
          apiCallsLimit: true,
          features: true,
          isActive: true,
          displayOrder: true,
        },
      });

      return reply.send({ plans });
    } catch (error) {
      console.error('Error fetching plans:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get single plan by ID or code (public - no auth required)
  fastify.get('/api/plans/:identifier', async (request, reply) => {
    try {
      const { identifier } = request.params as { identifier: string };

      // Try to find by ID first, then by code
      const plan = await prisma.subscriptionPlan.findFirst({
        where: {
          OR: [
            { id: identifier },
            { code: identifier },
          ],
        },
        select: {
          id: true,
          code: true,
          name: true,
          nameEnglish: true,
          description: true,
          priceMonthlyUSD: true,
          priceYearlyUSD: true,
          storageGB: true,
          documentsLimit: true,
          monthlyQueries: true,
          apiCallsLimit: true,
          features: true,
          isActive: true,
          displayOrder: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              subscriptions: true,
            },
          },
        },
      });

      if (!plan) {
        return reply.code(404).send({ error: 'Plan not found' });
      }

      return reply.send({ plan });
    } catch (error) {
      console.error('Error fetching plan:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create new subscription plan (admin only)
  fastify.post('/admin/plans', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const body = createPlanSchema.parse(request.body);

      // Check if plan code already exists
      const existing = await prisma.subscriptionPlan.findUnique({
        where: { code: body.code },
      });

      if (existing) {
        return reply.code(400).send({ error: 'Plan code already exists' });
      }

      // Create plan
      const plan = await prisma.subscriptionPlan.create({
        data: {
          code: body.code,
          name: body.name,
          nameEnglish: body.nameEnglish,
          description: body.description,
          priceMonthlyUSD: body.priceMonthlyUSD,
          priceYearlyUSD: body.priceYearlyUSD,
          storageGB: body.storageGB,
          documentsLimit: body.documentsLimit,
          monthlyQueries: body.monthlyQueries,
          apiCallsLimit: body.apiCallsLimit,
          features: body.features || [],
          isActive: body.isActive ?? true,
          displayOrder: body.displayOrder ?? 0,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: (request.user as any).id,
          action: 'CREATE_PLAN',
          entity: 'subscription_plan',
          entityId: plan.id,
          changes: { code: body.code, name: body.name },
          ipAddress: request.ip,
        },
      });

      return reply.code(201).send({ plan });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error creating plan:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update subscription plan (admin only)
  fastify.patch('/admin/plans/:id', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updatePlanSchema.parse(request.body);

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
      if (!plan) {
        return reply.code(404).send({ error: 'Plan not found' });
      }

      // If updating code, check for duplicates
      if (body.code && body.code !== plan.code) {
        const existing = await prisma.subscriptionPlan.findUnique({
          where: { code: body.code },
        });
        if (existing) {
          return reply.code(400).send({ error: 'Plan code already exists' });
        }
      }

      // Update plan
      const updated = await prisma.subscriptionPlan.update({
        where: { id },
        data: body,
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: (request.user as any).id,
          action: 'UPDATE_PLAN',
          entity: 'subscription_plan',
          entityId: id,
          changes: body,
          ipAddress: request.ip,
        },
      });

      return reply.send({ plan: updated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error updating plan:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete subscription plan (admin only - soft delete)
  fastify.delete('/admin/plans/:id', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
      if (!plan) {
        return reply.code(404).send({ error: 'Plan not found' });
      }

      // Check if plan has active subscriptions
      const activeSubscriptions = await prisma.subscription.count({
        where: {
          planId: id,
          status: 'active',
        },
      });

      if (activeSubscriptions > 0) {
        return reply.code(400).send({
          error: 'Cannot delete plan with active subscriptions',
          activeSubscriptions,
        });
      }

      // Soft delete by deactivating
      await prisma.subscriptionPlan.update({
        where: { id },
        data: { isActive: false },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: (request.user as any).id,
          action: 'DELETE_PLAN',
          entity: 'subscription_plan',
          entityId: id,
          ipAddress: request.ip,
        },
      });

      return reply.send({ message: 'Plan deactivated successfully' });
    } catch (error) {
      console.error('Error deleting plan:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get plan statistics (admin only)
  fastify.get('/admin/plans/stats', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        include: {
          _count: {
            select: {
              subscriptions: true,
            },
          },
          subscriptions: {
            where: {
              status: 'active',
            },
            select: {
              id: true,
              billingCycle: true,
            },
          },
        },
      });

      const stats = plans.map(plan => {
        const activeSubscriptions = plan.subscriptions.filter(s => s.billingCycle === 'monthly' || s.billingCycle === 'yearly');
        const monthlyCount = plan.subscriptions.filter(s => s.billingCycle === 'monthly').length;
        const yearlyCount = plan.subscriptions.filter(s => s.billingCycle === 'yearly').length;

        const monthlyRevenue = monthlyCount * plan.priceMonthlyUSD;
        const yearlyRevenue = yearlyCount * plan.priceYearlyUSD;
        const totalMRR = monthlyRevenue + (yearlyRevenue / 12);

        return {
          planId: plan.id,
          planCode: plan.code,
          planName: plan.name,
          totalSubscriptions: plan._count.subscriptions,
          activeSubscriptions: activeSubscriptions.length,
          monthlySubscriptions: monthlyCount,
          yearlySubscriptions: yearlyCount,
          monthlyRecurringRevenue: totalMRR,
          annualRecurringRevenue: totalMRR * 12,
        };
      });

      const totals = {
        totalPlans: plans.length,
        activePlans: plans.filter(p => p.isActive).length,
        totalSubscriptions: stats.reduce((sum, s) => sum + s.totalSubscriptions, 0),
        activeSubscriptions: stats.reduce((sum, s) => sum + s.activeSubscriptions, 0),
        totalMRR: stats.reduce((sum, s) => sum + s.monthlyRecurringRevenue, 0),
        totalARR: stats.reduce((sum, s) => sum + s.annualRecurringRevenue, 0),
      };

      return reply.send({
        stats,
        totals,
      });
    } catch (error) {
      console.error('Error fetching plan stats:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
