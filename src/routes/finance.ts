import { FastifyInstance } from 'fastify';
import { PrismaClient, ServiceItemType, InvoiceStatus, PaymentStatus, PaymentMethodType } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Agreement schemas
const createAgreementSchema = z.object({
  caseId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  totalAmount: z.number().min(0),
  currency: z.string().default('USD'),
  paymentTerms: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  signedDate: z.string().datetime().optional(),
  status: z.string().default('draft'),
});

// Service Item schemas
const createServiceItemSchema = z.object({
  agreementId: z.string().uuid().optional(),
  caseId: z.string().uuid(),
  type: z.nativeEnum(ServiceItemType),
  description: z.string().min(1),
  quantity: z.number().min(0).default(1),
  rate: z.number().min(0),
  currency: z.string().default('USD'),
  serviceDate: z.string().datetime(),
  isBillable: z.boolean().default(true),
  notes: z.string().optional(),
});

// Invoice schemas
const createInvoiceSchema = z.object({
  caseId: z.string().uuid(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    rate: z.number(),
    amount: z.number(),
  })),
  subtotal: z.number().min(0),
  taxRate: z.number().min(0).max(1).default(0),
  discountAmount: z.number().min(0).default(0),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional(),
  clientAddress: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

// Payment schemas
const createPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  caseId: z.string().uuid(),
  amount: z.number().min(0),
  currency: z.string().default('USD'),
  method: z.nativeEnum(PaymentMethodType),
  paymentDate: z.string().datetime(),
  transactionId: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function financeRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // AGREEMENTS
  // ============================================================================

  // Create agreement
  fastify.post('/finance/agreements', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const body = createAgreementSchema.parse(request.body);
      const userId = (request.user as any).id;

      // Verify case ownership
      const caseExists = await prisma.case.findFirst({
        where: {
          id: body.caseId,
          userId,
        },
      });

      if (!caseExists) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      const agreement = await prisma.agreement.create({
        data: {
          ...body,
          startDate: new Date(body.startDate),
          endDate: body.endDate ? new Date(body.endDate) : null,
          signedDate: body.signedDate ? new Date(body.signedDate) : null,
        },
        include: {
          case: {
            select: {
              id: true,
              title: true,
              clientName: true,
            },
          },
        },
      });

      return reply.code(201).send(agreement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get agreements for a case
  fastify.get('/finance/cases/:caseId/agreements', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { caseId } = request.params as { caseId: string };
      const userId = (request.user as any).id;

      // Verify case ownership
      const caseExists = await prisma.case.findFirst({
        where: {
          id: caseId,
          userId,
        },
      });

      if (!caseExists) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      const agreements = await prisma.agreement.findMany({
        where: { caseId },
        include: {
          serviceItems: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return reply.send(agreements);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ============================================================================
  // SERVICE ITEMS
  // ============================================================================

  // Create service item
  fastify.post('/finance/service-items', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const body = createServiceItemSchema.parse(request.body);
      const userId = (request.user as any).id;

      // Verify case ownership
      const caseExists = await prisma.case.findFirst({
        where: {
          id: body.caseId,
          userId,
        },
      });

      if (!caseExists) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      const amount = body.quantity * body.rate;

      const serviceItem = await prisma.serviceItem.create({
        data: {
          ...body,
          amount,
          serviceDate: new Date(body.serviceDate),
        },
        include: {
          case: {
            select: {
              id: true,
              title: true,
              clientName: true,
            },
          },
        },
      });

      return reply.code(201).send(serviceItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get service items for a case
  fastify.get('/finance/cases/:caseId/service-items', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { caseId } = request.params as { caseId: string };
      const userId = (request.user as any).id;
      const { unbilled } = request.query as { unbilled?: boolean };

      // Verify case ownership
      const caseExists = await prisma.case.findFirst({
        where: {
          id: caseId,
          userId,
        },
      });

      if (!caseExists) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      const where: any = { caseId };
      if (unbilled) {
        where.isBilled = false;
        where.isBillable = true;
      }

      const items = await prisma.serviceItem.findMany({
        where,
        include: {
          agreement: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          serviceDate: 'desc',
        },
      });

      const total = items.reduce((sum, item) => sum + item.amount, 0);

      return reply.send({
        items,
        summary: {
          count: items.length,
          total,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ============================================================================
  // INVOICES
  // ============================================================================

  // Create invoice
  fastify.post('/finance/invoices', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const body = createInvoiceSchema.parse(request.body);
      const userId = (request.user as any).id;

      // Verify case ownership
      const caseExists = await prisma.case.findFirst({
        where: {
          id: body.caseId,
          userId,
        },
      });

      if (!caseExists) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      // Generate invoice number
      const invoiceCount = await prisma.invoiceFinance.count();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, '0')}`;

      // Calculate amounts
      const taxAmount = body.subtotal * body.taxRate;
      const totalAmount = body.subtotal + taxAmount - body.discountAmount;
      const balanceDue = totalAmount;

      const invoice = await prisma.invoiceFinance.create({
        data: {
          caseId: body.caseId,
          invoiceNumber,
          items: body.items,
          subtotal: body.subtotal,
          taxRate: body.taxRate,
          taxAmount,
          discountAmount: body.discountAmount,
          totalAmount,
          balanceDue,
          paidAmount: 0,
          issueDate: new Date(body.issueDate),
          dueDate: new Date(body.dueDate),
          clientName: body.clientName,
          clientEmail: body.clientEmail,
          clientAddress: body.clientAddress,
          notes: body.notes,
          internalNotes: body.internalNotes,
          status: InvoiceStatus.DRAFT,
        },
        include: {
          case: {
            select: {
              id: true,
              title: true,
              clientName: true,
            },
          },
        },
      });

      // Update case finance summary
      await updateCaseFinanceSummary(body.caseId);

      return reply.code(201).send(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // List all invoices for user
  fastify.get('/finance/invoices', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;

      const invoices = await prisma.invoiceFinance.findMany({
        where: {
          case: {
            userId,
          },
        },
        include: {
          case: {
            select: {
              id: true,
              title: true,
              clientName: true,
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              method: true,
              status: true,
              paymentDate: true,
            },
          },
        },
        orderBy: {
          issueDate: 'desc',
        },
      });

      const summary = {
        total: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
        paid: invoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
        outstanding: invoices.reduce((sum, inv) => sum + inv.balanceDue, 0),
        count: invoices.length,
      };

      return reply.send({
        invoices,
        summary,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get invoices for a case
  fastify.get('/finance/cases/:caseId/invoices', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { caseId } = request.params as { caseId: string };
      const userId = (request.user as any).id;

      // Verify case ownership
      const caseExists = await prisma.case.findFirst({
        where: {
          id: caseId,
          userId,
        },
      });

      if (!caseExists) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      const invoices = await prisma.invoiceFinance.findMany({
        where: { caseId },
        include: {
          payments: {
            select: {
              id: true,
              amount: true,
              method: true,
              status: true,
              paymentDate: true,
            },
          },
        },
        orderBy: {
          issueDate: 'desc',
        },
      });

      const summary = {
        total: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
        paid: invoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
        outstanding: invoices.reduce((sum, inv) => sum + inv.balanceDue, 0),
        count: invoices.length,
      };

      return reply.send({
        invoices,
        summary,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get single invoice
  fastify.get('/finance/invoices/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const invoice = await prisma.invoiceFinance.findFirst({
        where: {
          id,
          case: {
            userId,
          },
        },
        include: {
          case: {
            select: {
              id: true,
              title: true,
              clientName: true,
              status: true,
            },
          },
          payments: {
            orderBy: {
              paymentDate: 'desc',
            },
          },
        },
      });

      if (!invoice) {
        return reply.code(404).send({ error: 'Invoice not found' });
      }

      return reply.send(invoice);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update invoice status
  fastify.patch('/finance/invoices/:id/status', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = z.object({
        status: z.nativeEnum(InvoiceStatus),
      }).parse(request.body);
      const userId = (request.user as any).id;

      const invoice = await prisma.invoiceFinance.findFirst({
        where: {
          id,
          case: {
            userId,
          },
        },
      });

      if (!invoice) {
        return reply.code(404).send({ error: 'Invoice not found' });
      }

      const updateData: any = { status };

      if (status === InvoiceStatus.SENT && !invoice.sentDate) {
        updateData.sentDate = new Date();
      }

      const updated = await prisma.invoiceFinance.update({
        where: { id },
        data: updateData,
      });

      return reply.send(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ============================================================================
  // PAYMENTS
  // ============================================================================

  // Create payment
  fastify.post('/finance/payments', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const body = createPaymentSchema.parse(request.body);
      const userId = (request.user as any).id;

      // Verify invoice ownership
      const invoice = await prisma.invoiceFinance.findFirst({
        where: {
          id: body.invoiceId,
          case: {
            userId,
          },
        },
      });

      if (!invoice) {
        return reply.code(404).send({ error: 'Invoice not found' });
      }

      // Validate payment amount
      if (body.amount > invoice.balanceDue) {
        return reply.code(400).send({ error: 'Payment amount exceeds balance due' });
      }

      // Generate receipt number
      const receiptCount = await prisma.paymentFinance.count();
      const receiptNumber = `REC-${new Date().getFullYear()}-${String(receiptCount + 1).padStart(5, '0')}`;

      const payment = await prisma.paymentFinance.create({
        data: {
          invoiceId: body.invoiceId,
          caseId: body.caseId,
          amount: body.amount,
          currency: body.currency,
          method: body.method,
          status: PaymentStatus.PAID,
          paymentDate: new Date(body.paymentDate),
          receivedDate: new Date(),
          transactionId: body.transactionId,
          referenceNumber: body.referenceNumber,
          receiptNumber,
          notes: body.notes,
        },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
            },
          },
        },
      });

      // Update invoice amounts
      const newPaidAmount = invoice.paidAmount + body.amount;
      const newBalanceDue = invoice.totalAmount - newPaidAmount;
      const newStatus = newBalanceDue === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL;

      await prisma.invoiceFinance.update({
        where: { id: body.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          status: newStatus,
          paidDate: newBalanceDue === 0 ? new Date() : invoice.paidDate,
        },
      });

      // Update case finance summary
      await updateCaseFinanceSummary(body.caseId);

      return reply.code(201).send(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // List all payments for user
  fastify.get('/finance/payments', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;

      const payments = await prisma.paymentFinance.findMany({
        where: {
          case: {
            userId,
          },
        },
        include: {
          case: {
            select: {
              id: true,
              title: true,
              clientName: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              clientName: true,
            },
          },
        },
        orderBy: {
          paymentDate: 'desc',
        },
      });

      const summary = {
        total: payments.reduce((sum, pmt) => sum + pmt.amount, 0),
        count: payments.length,
      };

      return reply.send({
        payments,
        summary,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get payments for a case
  fastify.get('/finance/cases/:caseId/payments', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { caseId } = request.params as { caseId: string };
      const userId = (request.user as any).id;

      // Verify case ownership
      const caseExists = await prisma.case.findFirst({
        where: {
          id: caseId,
          userId,
        },
      });

      if (!caseExists) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      const payments = await prisma.paymentFinance.findMany({
        where: { caseId },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              clientName: true,
            },
          },
        },
        orderBy: {
          paymentDate: 'desc',
        },
      });

      const summary = {
        total: payments.reduce((sum, pmt) => sum + pmt.amount, 0),
        count: payments.length,
      };

      return reply.send({
        payments,
        summary,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ============================================================================
  // CASE FINANCE SUMMARY
  // ============================================================================

  // Get case finance summary
  fastify.get('/finance/cases/:caseId/summary', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { caseId } = request.params as { caseId: string };
      const userId = (request.user as any).id;

      // Verify case ownership
      const caseExists = await prisma.case.findFirst({
        where: {
          id: caseId,
          userId,
        },
      });

      if (!caseExists) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      let summary = await prisma.caseFinance.findUnique({
        where: { caseId },
      });

      if (!summary) {
        // Create summary if it doesn't exist
        summary = await updateCaseFinanceSummary(caseId);
      }

      return reply.send(summary);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get global finance summary (all cases)
  fastify.get('/finance/summary', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;

      // Get all cases for the user
      const cases = await prisma.case.findMany({
        where: { userId },
        include: {
          finance: true,
        },
      });

      const summary = cases.reduce((acc, caseItem) => {
        if (caseItem.finance) {
          acc.totalBilled += caseItem.finance.totalBilled;
          acc.totalPaid += caseItem.finance.totalPaid;
          acc.totalOutstanding += caseItem.finance.totalOutstanding;
          acc.totalExpenses += caseItem.finance.totalExpenses;
          acc.invoiceCount += caseItem.finance.invoiceCount;
          acc.paymentCount += caseItem.finance.paymentCount;
        }
        return acc;
      }, {
        totalBilled: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        totalExpenses: 0,
        invoiceCount: 0,
        paymentCount: 0,
        caseCount: cases.length,
      });

      return reply.send(summary);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

// Helper function to update case finance summary
async function updateCaseFinanceSummary(caseId: string) {
  const [invoices, payments, serviceItems] = await Promise.all([
    prisma.invoiceFinance.findMany({ where: { caseId } }),
    prisma.paymentFinance.findMany({ where: { caseId } }),
    prisma.serviceItem.findMany({ where: { caseId } }),
  ]);

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = payments.reduce((sum, pmt) => sum + pmt.amount, 0);
  const totalOutstanding = totalBilled - totalPaid;
  const totalExpenses = serviceItems
    .filter(item => item.type === ServiceItemType.EXPENSE)
    .reduce((sum, item) => sum + item.amount, 0);

  const lastInvoice = invoices.sort((a, b) => b.issueDate.getTime() - a.issueDate.getTime())[0];
  const lastPayment = payments.sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime())[0];

  return prisma.caseFinance.upsert({
    where: { caseId },
    create: {
      caseId,
      totalBilled,
      totalPaid,
      totalOutstanding,
      totalExpenses,
      invoiceCount: invoices.length,
      paymentCount: payments.length,
      lastInvoiceDate: lastInvoice?.issueDate,
      lastPaymentDate: lastPayment?.paymentDate,
    },
    update: {
      totalBilled,
      totalPaid,
      totalOutstanding,
      totalExpenses,
      invoiceCount: invoices.length,
      paymentCount: payments.length,
      lastInvoiceDate: lastInvoice?.issueDate,
      lastPaymentDate: lastPayment?.paymentDate,
    },
  });
}
