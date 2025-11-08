import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const createSubscriptionSchema = z.object({
  planId: z.string().uuid(),
  billingCycle: z.enum(['monthly', 'yearly']),
  paymentMethod: z.enum(['stripe', 'paypal', 'bank_transfer', 'cash_deposit']),
});

const createPaymentProofSchema = z.object({
  paymentId: z.string().uuid(),
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  referenceNumber: z.string().optional(),
  depositDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const reviewPaymentProofSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().optional(),
});

// Middleware to check admin role
async function requireAdmin(request: any, reply: any) {
  const user = request.user;
  if (!user || user.role !== 'admin') {
    return reply.code(403).send({ error: 'Admin access required' });
  }
}

export async function paymentRoutes(fastify: FastifyInstance) {
  // Get user's current subscription
  fastify.get('/api/subscription', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;

      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: {
            in: ['active', 'pending'],
          },
        },
        include: {
          plan: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ subscription });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create new subscription
  fastify.post('/api/subscription', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;
      const body = createSubscriptionSchema.parse(request.body);

      // Check if user already has an active subscription
      const existing = await prisma.subscription.findFirst({
        where: {
          userId,
          status: {
            in: ['active', 'pending'],
          },
        },
      });

      if (existing) {
        return reply.code(400).send({ error: 'User already has an active subscription' });
      }

      // Get plan details
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: body.planId },
      });

      if (!plan || !plan.isActive) {
        return reply.code(404).send({ error: 'Plan not found or inactive' });
      }

      // Calculate subscription period
      const now = new Date();
      const periodEnd = new Date(now);
      if (body.billingCycle === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      // Create subscription
      const subscription = await prisma.subscription.create({
        data: {
          userId,
          planId: body.planId,
          status: 'pending',
          billingCycle: body.billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        include: {
          plan: true,
        },
      });

      // Create initial payment record
      const amount = body.billingCycle === 'monthly'
        ? plan.priceMonthlyUSD
        : plan.priceYearlyUSD;

      const payment = await prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          userId,
          amount,
          currency: 'USD',
          method: body.paymentMethod,
          status: 'pending',
          description: `${plan.name} - ${body.billingCycle === 'monthly' ? 'Mensual' : 'Anual'}`,
        },
      });

      // If manual payment, return info for proof upload
      if (body.paymentMethod === 'bank_transfer' || body.paymentMethod === 'cash_deposit') {
        return reply.code(201).send({
          subscription,
          payment,
          requiresProof: true,
          message: 'Subscription created. Please upload payment proof for verification.',
        });
      }

      // For automated payments (Stripe/PayPal), return payment intent
      // This will be implemented when integrating Stripe/PayPal SDKs
      return reply.code(201).send({
        subscription,
        payment,
        requiresProof: false,
        message: 'Subscription created. Proceed with payment.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error creating subscription:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Cancel subscription
  fastify.post('/api/subscription/cancel', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;

      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'active',
        },
      });

      if (!subscription) {
        return reply.code(404).send({ error: 'No active subscription found' });
      }

      // Mark for cancellation at period end
      const updated = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true,
          cancelledAt: new Date(),
        },
      });

      return reply.send({
        subscription: updated,
        message: 'Subscription will be cancelled at the end of the current billing period',
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Upload payment proof (for manual payments)
  fastify.post('/api/payment-proof', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;
      const body = createPaymentProofSchema.parse(request.body);

      // Verify payment belongs to user
      const payment = await prisma.payment.findUnique({
        where: { id: body.paymentId },
      });

      if (!payment || payment.userId !== userId) {
        return reply.code(404).send({ error: 'Payment not found' });
      }

      if (payment.status !== 'pending') {
        return reply.code(400).send({ error: 'Payment is not pending' });
      }

      // Check if proof already exists
      const existing = await prisma.paymentProof.findUnique({
        where: { paymentId: body.paymentId },
      });

      if (existing) {
        return reply.code(400).send({ error: 'Payment proof already exists' });
      }

      // Create payment proof
      const proof = await prisma.paymentProof.create({
        data: {
          paymentId: body.paymentId,
          userId,
          fileUrl: body.fileUrl,
          fileName: body.fileName,
          fileSize: body.fileSize,
          mimeType: body.mimeType,
          bankName: body.bankName,
          accountNumber: body.accountNumber,
          referenceNumber: body.referenceNumber,
          depositDate: body.depositDate ? new Date(body.depositDate) : null,
          notes: body.notes,
          status: 'pending',
        },
      });

      // Update payment status to processing
      await prisma.payment.update({
        where: { id: body.paymentId },
        data: { status: 'processing' },
      });

      return reply.code(201).send({
        proof,
        message: 'Payment proof uploaded successfully. It will be reviewed by our team.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error uploading payment proof:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user's payment history
  fastify.get('/api/payments', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;
      const { limit = 10, offset = 0 } = request.query as any;

      const payments = await prisma.payment.findMany({
        where: { userId },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
          paymentProof: true,
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      });

      const total = await prisma.payment.count({ where: { userId } });

      return reply.send({
        payments,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Admin: Get all pending payment proofs
  fastify.get('/admin/payment-proofs', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const { status = 'pending', limit = 20, offset = 0 } = request.query as any;

      const where: any = {};
      if (status !== 'all') {
        where.status = status;
      }

      const proofs = await prisma.paymentProof.findMany({
        where,
        include: {
          payment: {
            include: {
              subscription: {
                include: {
                  plan: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      });

      const total = await prisma.paymentProof.count({ where });

      return reply.send({
        proofs,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error) {
      console.error('Error fetching payment proofs:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Admin: Review payment proof
  fastify.post('/admin/payment-proofs/:id/review', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const reviewerId = (request.user as any).id;
      const body = reviewPaymentProofSchema.parse(request.body);

      const proof = await prisma.paymentProof.findUnique({
        where: { id },
        include: {
          payment: {
            include: {
              subscription: true,
            },
          },
        },
      });

      if (!proof) {
        return reply.code(404).send({ error: 'Payment proof not found' });
      }

      if (proof.status !== 'pending') {
        return reply.code(400).send({ error: 'Payment proof has already been reviewed' });
      }

      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update payment proof
        const updatedProof = await tx.paymentProof.update({
          where: { id },
          data: {
            status: body.status,
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            reviewNotes: body.reviewNotes,
          },
        });

        if (body.status === 'approved') {
          // Approve payment
          await tx.payment.update({
            where: { id: proof.paymentId },
            data: {
              status: 'completed',
              paidAt: new Date(),
            },
          });

          // Activate subscription
          if (proof.payment.subscription) {
            await tx.subscription.update({
              where: { id: proof.payment.subscriptionId! },
              data: {
                status: 'active',
              },
            });

            // Update user's plan tier
            const subscription = await tx.subscription.findUnique({
              where: { id: proof.payment.subscriptionId! },
              include: { plan: true },
            });

            if (subscription) {
              await tx.user.update({
                where: { id: proof.userId },
                data: {
                  planTier: subscription.plan.code,
                },
              });

              // Update user quota based on plan
              await tx.userQuota.upsert({
                where: { userId: proof.userId },
                update: {
                  storageGB: subscription.plan.storageGB,
                  documentsLimit: subscription.plan.documentsLimit,
                  monthlyQueries: subscription.plan.monthlyQueries,
                  apiCallsLimit: subscription.plan.apiCallsLimit,
                },
                create: {
                  userId: proof.userId,
                  storageGB: subscription.plan.storageGB,
                  documentsLimit: subscription.plan.documentsLimit,
                  monthlyQueries: subscription.plan.monthlyQueries,
                  apiCallsLimit: subscription.plan.apiCallsLimit,
                  resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
              });
            }
          }
        } else {
          // Reject payment
          await tx.payment.update({
            where: { id: proof.paymentId },
            data: {
              status: 'failed',
              failedAt: new Date(),
              errorMessage: body.reviewNotes || 'Payment proof rejected',
            },
          });
        }

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId: reviewerId,
            action: `REVIEW_PAYMENT_PROOF_${body.status.toUpperCase()}`,
            entity: 'payment_proof',
            entityId: id,
            changes: { status: body.status, notes: body.reviewNotes },
            ipAddress: request.ip,
          },
        });

        return updatedProof;
      });

      return reply.send({
        proof: result,
        message: `Payment proof ${body.status === 'approved' ? 'approved' : 'rejected'} successfully`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error reviewing payment proof:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Admin: Get payment statistics
  fastify.get('/admin/payments/stats', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const [
        totalPayments,
        completedPayments,
        pendingPayments,
        failedPayments,
        totalRevenue,
        paymentsByMethod,
        recentPayments,
      ] = await Promise.all([
        prisma.payment.count(),
        prisma.payment.count({ where: { status: 'completed' } }),
        prisma.payment.count({ where: { status: 'pending' } }),
        prisma.payment.count({ where: { status: 'failed' } }),
        prisma.payment.aggregate({
          where: { status: 'completed' },
          _sum: { amount: true },
        }),
        prisma.payment.groupBy({
          by: ['method'],
          _count: true,
          _sum: { amount: true },
        }),
        prisma.payment.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      return reply.send({
        totalPayments,
        completedPayments,
        pendingPayments,
        failedPayments,
        processingPayments: totalPayments - completedPayments - pendingPayments - failedPayments,
        totalRevenue: totalRevenue._sum.amount || 0,
        paymentsByMethod,
        recentPayments,
      });
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
