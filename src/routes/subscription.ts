import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UpgradeRequestBody {
  planCode: string;
  billingCycle?: 'monthly' | 'yearly';
}

interface CancelRequestBody {
  immediately?: boolean;
}

export async function subscriptionRoutes(app: FastifyInstance) {
  // GET /api/v1/user/subscription - Get current user subscription
  app.get('/user/subscription', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;

      // Get active subscription
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: {
            in: ['active', 'pending']
          }
        },
        include: {
          plan: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Get user quota
      const quota = await prisma.userQuota.findUnique({
        where: { userId }
      });

      return {
        subscription,
        quota
      };
    } catch (error) {
      console.error('Get subscription error:', error);
      reply.code(500);
      return { error: 'Failed to fetch subscription' };
    }
  });

  // GET /api/v1/user/subscription/plans - Get available subscription plans
  app.get('/user/subscription/plans', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' }
      });

      return { plans };
    } catch (error) {
      console.error('Get plans error:', error);
      reply.code(500);
      return { error: 'Failed to fetch plans' };
    }
  });

  // POST /api/v1/user/subscription/upgrade - Upgrade/downgrade subscription
  app.post<{ Body: UpgradeRequestBody }>('/user/subscription/upgrade', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const { planCode, billingCycle = 'monthly' } = request.body as UpgradeRequestBody;

      if (!planCode) {
        reply.code(400);
        return { error: 'Plan code is required' };
      }

      // Get the new plan
      const newPlan = await prisma.subscriptionPlan.findUnique({
        where: { code: planCode }
      });

      if (!newPlan) {
        reply.code(404);
        return { error: 'Plan not found' };
      }

      // Check if user has an active subscription
      const currentSubscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'active'
        }
      });

      // Calculate period dates
      const now = new Date();
      const currentPeriodStart = now;
      const currentPeriodEnd = new Date(now);
      if (billingCycle === 'monthly') {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      } else {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      }

      // For MVP, we'll create a new subscription record
      // In production, this would integrate with Stripe/PayPal
      const subscription = await prisma.subscription.create({
        data: {
          userId,
          planId: newPlan.id,
          status: 'pending', // Would be 'active' after payment
          billingCycle,
          currentPeriodStart,
          currentPeriodEnd,
        },
        include: {
          plan: true
        }
      });

      // Cancel previous subscription if exists
      if (currentSubscription) {
        await prisma.subscription.update({
          where: { id: currentSubscription.id },
          data: {
            status: 'cancelled',
            cancelledAt: now,
            cancelAtPeriodEnd: true
          }
        });
      }

      // Update user quota based on new plan
      await prisma.userQuota.upsert({
        where: { userId },
        create: {
          userId,
          storageGB: newPlan.storageGB,
          documentsLimit: newPlan.documentsLimit,
          monthlyQueries: newPlan.monthlyQueries,
          apiCallsLimit: newPlan.apiCallsLimit,
          resetDate: currentPeriodEnd
        },
        update: {
          storageGB: newPlan.storageGB,
          documentsLimit: newPlan.documentsLimit,
          monthlyQueries: newPlan.monthlyQueries,
          apiCallsLimit: newPlan.apiCallsLimit,
          resetDate: currentPeriodEnd
        }
      });

      // Update user's plan tier
      await prisma.user.update({
        where: { id: userId },
        data: { planTier: newPlan.code }
      });

      return {
        subscription,
        message: 'Subscription updated successfully'
      };
    } catch (error) {
      console.error('Upgrade subscription error:', error);
      reply.code(500);
      return { error: 'Failed to upgrade subscription' };
    }
  });

  // POST /api/v1/user/subscription/cancel - Cancel subscription
  app.post<{ Body: CancelRequestBody }>('/user/subscription/cancel', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const { immediately = false } = request.body as CancelRequestBody;

      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'active'
        }
      });

      if (!subscription) {
        reply.code(404);
        return { error: 'No active subscription found' };
      }

      const updateData: any = {
        cancelledAt: new Date(),
        cancelAtPeriodEnd: !immediately
      };

      if (immediately) {
        updateData.status = 'cancelled';
      }

      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: updateData,
        include: { plan: true }
      });

      return {
        subscription: updatedSubscription,
        message: immediately
          ? 'Subscription cancelled immediately'
          : 'Subscription will be cancelled at period end'
      };
    } catch (error) {
      console.error('Cancel subscription error:', error);
      reply.code(500);
      return { error: 'Failed to cancel subscription' };
    }
  });
}
