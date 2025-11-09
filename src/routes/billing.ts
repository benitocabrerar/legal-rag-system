import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AddPaymentMethodBody {
  type: 'card' | 'bank_account' | 'paypal';
  isDefault?: boolean;
  cardLast4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  bankName?: string;
  accountLast4?: string;
  paypalEmail?: string;
  stripePaymentMethodId?: string;
  paypalBillingId?: string;
}

export async function billingRoutes(app: FastifyInstance) {
  // GET /api/v1/billing/invoices - Get user invoices
  app.get('/billing/invoices', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const { limit = 10, offset = 0 } = request.query as { limit?: number; offset?: number };

      const invoices = await prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      });

      const total = await prisma.invoice.count({
        where: { userId }
      });

      return {
        invoices,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + invoices.length < total
        }
      };
    } catch (error) {
      console.error('Get invoices error:', error);
      reply.code(500);
      return { error: 'Failed to fetch invoices' };
    }
  });

  // GET /api/v1/billing/invoices/:id - Get specific invoice
  app.get<{ Params: { id: string } }>('/billing/invoices/:id', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const { id } = request.params;

      const invoice = await prisma.invoice.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!invoice) {
        reply.code(404);
        return { error: 'Invoice not found' };
      }

      return { invoice };
    } catch (error) {
      console.error('Get invoice error:', error);
      reply.code(500);
      return { error: 'Failed to fetch invoice' };
    }
  });

  // GET /api/v1/billing/payment-methods - Get payment methods
  app.get('/billing/payment-methods', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;

      const paymentMethods = await prisma.paymentMethod.findMany({
        where: {
          userId,
          isActive: true
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return { paymentMethods };
    } catch (error) {
      console.error('Get payment methods error:', error);
      reply.code(500);
      return { error: 'Failed to fetch payment methods' };
    }
  });

  // POST /api/v1/billing/payment-methods - Add payment method
  app.post<{ Body: AddPaymentMethodBody }>('/billing/payment-methods', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const {
        type,
        isDefault = false,
        cardLast4,
        cardBrand,
        cardExpMonth,
        cardExpYear,
        bankName,
        accountLast4,
        paypalEmail,
        stripePaymentMethodId,
        paypalBillingId
      } = request.body as AddPaymentMethodBody;

      if (!['card', 'bank_account', 'paypal'].includes(type)) {
        reply.code(400);
        return { error: 'Invalid payment method type' };
      }

      // If setting as default, unset other defaults
      if (isDefault) {
        await prisma.paymentMethod.updateMany({
          where: {
            userId,
            isDefault: true
          },
          data: { isDefault: false }
        });
      }

      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          userId,
          type,
          isDefault,
          cardLast4,
          cardBrand,
          cardExpMonth,
          cardExpYear,
          bankName,
          accountLast4,
          paypalEmail,
          stripePaymentMethodId,
          paypalBillingId
        }
      });

      return {
        paymentMethod,
        message: 'Payment method added successfully'
      };
    } catch (error) {
      console.error('Add payment method error:', error);
      reply.code(500);
      return { error: 'Failed to add payment method' };
    }
  });

  // DELETE /api/v1/billing/payment-methods/:id - Delete payment method
  app.delete<{ Params: { id: string } }>('/billing/payment-methods/:id', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const { id } = request.params;

      const paymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!paymentMethod) {
        reply.code(404);
        return { error: 'Payment method not found' };
      }

      await prisma.paymentMethod.update({
        where: { id },
        data: { isActive: false }
      });

      return { message: 'Payment method deleted successfully' };
    } catch (error) {
      console.error('Delete payment method error:', error);
      reply.code(500);
      return { error: 'Failed to delete payment method' };
    }
  });

  // PATCH /api/v1/billing/payment-methods/:id/default - Set default payment method
  app.patch<{ Params: { id: string } }>('/billing/payment-methods/:id/default', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const { id } = request.params;

      const paymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          id,
          userId,
          isActive: true
        }
      });

      if (!paymentMethod) {
        reply.code(404);
        return { error: 'Payment method not found' };
      }

      // Unset other defaults
      await prisma.paymentMethod.updateMany({
        where: {
          userId,
          isDefault: true
        },
        data: { isDefault: false }
      });

      // Set this as default
      const updated = await prisma.paymentMethod.update({
        where: { id },
        data: { isDefault: true }
      });

      return {
        paymentMethod: updated,
        message: 'Default payment method updated'
      };
    } catch (error) {
      console.error('Set default payment method error:', error);
      reply.code(500);
      return { error: 'Failed to set default payment method' };
    }
  });
}
