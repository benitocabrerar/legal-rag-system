/**
 * Finance augmentation endpoints — dashboard analytics, aging, billing
 * from completed tasks, on-the-fly invoice PDFs, AI commentary, expenses,
 * and CSV export.
 *
 * All endpoints scope by the authenticated user's cases (case.userId).
 * Data is read from the InvoiceFinance / PaymentFinance models — the
 * canonical "matter-level" finance tables (the older `Invoice`/`Payment`
 * tables in this schema are subscription billing for the SaaS itself).
 */
import { FastifyInstance } from 'fastify';
import { InvoiceStatus, PaymentMethodType, PaymentStatus } from '@prisma/client';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma.js';
import { getAiClient } from '../lib/ai-client.js';

interface TaskExpensePayload {
  caseId: string;
  amount: number;
  currency?: string;
  category: string;
  description: string;
  date?: string;
  isReimbursable?: boolean;
}

const fromTasksSchema = z.object({
  caseId: z.string().uuid(),
  taskIds: z.array(z.string().uuid()).min(1),
  hourlyRate: z.number().positive(),
  taxRate: z.number().min(0).max(100).default(12), // IVA Ecuador default
  dueInDays: z.number().int().min(0).max(365).default(15),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  notes: z.string().optional(),
});

export async function financeAugmentRoutes(fastify: FastifyInstance) {
  /**
   * GET /finance/dashboard
   * Aggregated analytics for the authenticated user's cases.
   */
  fastify.get('/finance/dashboard', { onRequest: [fastify.authenticate] }, async (request) => {
    const userId = (request.user as any).id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    // Owned cases for scoping.
    const userCases = await prisma.case.findMany({ where: { userId }, select: { id: true } });
    const caseIds = userCases.map((c) => c.id);

    if (caseIds.length === 0) {
      return emptyDashboard();
    }

    const [invoices, payments] = await Promise.all([
      prisma.invoiceFinance.findMany({
        where: { caseId: { in: caseIds } },
        select: {
          id: true, totalAmount: true, paidAmount: true, balanceDue: true,
          status: true, issueDate: true, dueDate: true, paidDate: true,
          clientName: true, currency: true, caseId: true,
        },
      }),
      prisma.paymentFinance.findMany({
        where: { caseId: { in: caseIds } },
        select: {
          id: true, amount: true, currency: true, method: true, status: true,
          paymentDate: true, caseId: true, invoiceId: true,
        },
      }),
    ]);

    // Headline totals.
    const totalBilled       = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalPaid         = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const totalOutstanding  = invoices.reduce((s, i) => s + i.balanceDue, 0);

    // Month-over-month revenue (sum of payments in PAID status).
    const paidPayments = payments.filter((p) => p.status === PaymentStatus.PAID);
    const revenueThisMonth = sumIn(paidPayments, monthStart, now, (p) => p.paymentDate, (p) => p.amount);
    const revenuePrevMonth = sumIn(paidPayments, prevMonthStart, prevMonthEnd, (p) => p.paymentDate, (p) => p.amount);
    const momChange = revenuePrevMonth === 0
      ? (revenueThisMonth > 0 ? 100 : 0)
      : ((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100;

    // 12-month revenue series — bucketed by month.
    const monthly: Array<{ key: string; label: string; revenue: number; billed: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const revenue = sumIn(paidPayments, start, end, (p) => p.paymentDate, (p) => p.amount);
      const billed = sumIn(invoices, start, end, (i) => i.issueDate, (i) => i.totalAmount);
      monthly.push({
        key: `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}`,
        label: start.toLocaleDateString('es', { month: 'short', year: '2-digit' }),
        revenue, billed,
      });
    }

    // Aging buckets — outstanding (balanceDue > 0) by days past due.
    const buckets = { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 };
    const overdueInvoices: Array<{ id: string; clientName: string; balanceDue: number; daysOverdue: number; dueDate: string; caseId: string }> = [];
    for (const inv of invoices) {
      if (inv.balanceDue <= 0) continue;
      const days = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) buckets.current += inv.balanceDue;
      else if (days <= 30) buckets['1_30'] += inv.balanceDue;
      else if (days <= 60) buckets['31_60'] += inv.balanceDue;
      else if (days <= 90) buckets['61_90'] += inv.balanceDue;
      else buckets['90_plus'] += inv.balanceDue;
      if (days > 0) {
        overdueInvoices.push({
          id: inv.id, clientName: inv.clientName, balanceDue: inv.balanceDue,
          daysOverdue: days, dueDate: inv.dueDate.toISOString(), caseId: inv.caseId,
        });
      }
    }
    overdueInvoices.sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Top clients (by total billed in the last 12 months).
    const clientAgg = new Map<string, { name: string; billed: number; outstanding: number }>();
    for (const inv of invoices) {
      if (new Date(inv.issueDate) < yearAgo) continue;
      const k = inv.clientName || 'Sin nombre';
      const cur = clientAgg.get(k) || { name: k, billed: 0, outstanding: 0 };
      cur.billed += inv.totalAmount;
      cur.outstanding += inv.balanceDue;
      clientAgg.set(k, cur);
    }
    const topClients = Array.from(clientAgg.values()).sort((a, b) => b.billed - a.billed).slice(0, 5);

    // Method mix — share of revenue by payment method.
    const methodAgg = new Map<PaymentMethodType, number>();
    for (const p of paidPayments) {
      methodAgg.set(p.method, (methodAgg.get(p.method) ?? 0) + p.amount);
    }
    const methodMix = Array.from(methodAgg.entries()).map(([method, amount]) => ({ method, amount }));

    // Cash forecast — sum of upcoming invoices not yet paid, grouped by week (next 4 weeks).
    const forecastWeeks: Array<{ weekStart: string; expected: number }> = [];
    for (let w = 0; w < 4; w++) {
      const ws = new Date(now); ws.setDate(ws.getDate() + w * 7); ws.setHours(0, 0, 0, 0);
      const we = new Date(ws); we.setDate(we.getDate() + 6); we.setHours(23, 59, 59, 999);
      const expected = invoices
        .filter((i) => i.status !== InvoiceStatus.PAID && i.status !== InvoiceStatus.CANCELLED && i.status !== InvoiceStatus.REFUNDED)
        .filter((i) => new Date(i.dueDate) >= ws && new Date(i.dueDate) <= we)
        .reduce((s, i) => s + i.balanceDue, 0);
      forecastWeeks.push({ weekStart: ws.toISOString(), expected });
    }

    // Avg days to pay.
    const paidOnes = invoices.filter((i) => i.paidDate);
    const avgDaysToPay = paidOnes.length === 0
      ? null
      : Math.round(paidOnes.reduce((s, i) => s + Math.max(0, (i.paidDate!.getTime() - i.issueDate.getTime()) / (86400000)), 0) / paidOnes.length);

    return {
      currency: 'USD',
      generatedAt: now.toISOString(),
      headline: {
        totalBilled,
        totalPaid,
        totalOutstanding,
        revenueThisMonth,
        revenuePrevMonth,
        momChange,
        invoicesCount: invoices.length,
        overdueCount: overdueInvoices.length,
        avgDaysToPay,
        collectionRatio: totalBilled === 0 ? 0 : (totalPaid / totalBilled) * 100,
      },
      monthly,
      aging: buckets,
      overdueInvoices: overdueInvoices.slice(0, 15),
      topClients,
      methodMix,
      forecastWeeks,
    };
  });

  /**
   * POST /finance/invoices/from-tasks
   * Build a draft invoice from completed tasks for a case using actualHours
   * × hourlyRate. Adds Ecuador-style 12% IVA by default.
   */
  fastify.post('/finance/invoices/from-tasks', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const body = fromTasksSchema.parse(request.body);
    const userId = (request.user as any).id;

    const ownedCase = await prisma.case.findFirst({ where: { id: body.caseId, userId } });
    if (!ownedCase) return reply.code(404).send({ error: 'CASE_NOT_FOUND' });

    const tasks = await prisma.task.findMany({
      where: { id: { in: body.taskIds }, caseId: body.caseId },
    });
    if (tasks.length === 0) return reply.code(400).send({ error: 'NO_TASKS' });

    const items = tasks
      .map((t) => {
        const hours = t.actualHours ?? t.estimatedHours ?? 1;
        return {
          taskId: t.id,
          description: t.title,
          hours,
          rate: body.hourlyRate,
          amount: round2(hours * body.hourlyRate),
        };
      });

    const subtotal  = round2(items.reduce((s, it) => s + it.amount, 0));
    const taxAmount = round2(subtotal * (body.taxRate / 100));
    const total     = round2(subtotal + taxAmount);

    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + body.dueInDays);

    const invoiceNumber = await nextInvoiceNumber();

    const invoice = await prisma.invoiceFinance.create({
      data: {
        caseId: body.caseId,
        invoiceNumber,
        subtotal,
        taxRate: body.taxRate,
        taxAmount,
        discountAmount: 0,
        totalAmount: total,
        paidAmount: 0,
        balanceDue: total,
        currency: 'USD',
        status: InvoiceStatus.DRAFT,
        issueDate,
        dueDate,
        items,
        clientName: body.clientName ?? ownedCase.clientName ?? 'Cliente',
        clientEmail: body.clientEmail ?? null,
        notes: body.notes ?? null,
      },
    });

    return reply.code(201).send({ invoice, items, totals: { subtotal, taxAmount, total } });
  });

  /**
   * GET /finance/invoices/:id/pdf
   * Stream a generated PDF for the invoice.
   */
  fastify.get<{ Params: { id: string } }>(
    '/finance/invoices/:id/pdf',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const invoice = await prisma.invoiceFinance.findUnique({
        where: { id: request.params.id },
        include: { case: { select: { userId: true, clientName: true, title: true } } },
      });
      if (!invoice || invoice.case.userId !== userId) return reply.code(404).send({ error: 'NOT_FOUND' });

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `inline; filename="factura-${invoice.invoiceNumber}.pdf"`);

      const doc = new PDFDocument({ size: 'LETTER', margin: 48 });
      doc.pipe(reply.raw);

      // Header
      doc.fillColor('#0f172a').fontSize(22).font('Helvetica-Bold').text('FACTURA', { align: 'right' });
      doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(`№ ${invoice.invoiceNumber}`, { align: 'right' });
      doc.moveDown(0.4);
      doc.fillColor('#94a3b8').fontSize(8).text(`Estado: ${invoice.status}`, { align: 'right' });

      // Issuer block (top-left)
      doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('Poweria Legal', 48, 48);
      doc.fillColor('#64748b').fontSize(9).font('Helvetica')
        .text('Servicios jurídicos profesionales')
        .text('contacto@poweria.legal');

      // Client + dates
      doc.moveDown(2);
      doc.fillColor('#94a3b8').fontSize(8).text('FACTURAR A', 48);
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(invoice.clientName);
      if (invoice.clientEmail) doc.fillColor('#64748b').font('Helvetica').fontSize(9).text(invoice.clientEmail);

      const yPos = doc.y;
      doc.fillColor('#94a3b8').fontSize(8).text('FECHA DE EMISIÓN', 380, yPos - 30);
      doc.fillColor('#0f172a').fontSize(10).text(fmtDate(invoice.issueDate), 380, yPos - 18);
      doc.fillColor('#94a3b8').fontSize(8).text('FECHA DE VENCIMIENTO', 380, yPos);
      doc.fillColor('#0f172a').fontSize(10).text(fmtDate(invoice.dueDate), 380, yPos + 12);

      doc.moveDown(3);
      // Line items table
      const tableTop = doc.y;
      doc.fillColor('#0f172a').rect(48, tableTop, 516, 22).fill();
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      doc.text('DESCRIPCIÓN', 56, tableTop + 7);
      doc.text('HORAS',  340, tableTop + 7);
      doc.text('TARIFA', 400, tableTop + 7);
      doc.text('IMPORTE',490, tableTop + 7, { width: 70, align: 'right' });

      let rowY = tableTop + 22;
      doc.fillColor('#0f172a').font('Helvetica').fontSize(9);
      const items = (invoice.items as any[]) ?? [];
      for (const it of items) {
        doc.text(String(it.description ?? ''), 56, rowY + 6, { width: 280 });
        doc.text(it.hours ? String(it.hours) : '—', 340, rowY + 6);
        doc.text(it.rate ? `$${Number(it.rate).toFixed(2)}` : '—', 400, rowY + 6);
        doc.text(`$${Number(it.amount ?? 0).toFixed(2)}`, 490, rowY + 6, { width: 70, align: 'right' });
        rowY += 22;
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(48, rowY).lineTo(564, rowY).stroke();
      }

      // Totals
      rowY += 12;
      const labelX = 380, valueX = 490;
      doc.fillColor('#64748b').fontSize(9).text('Subtotal', labelX, rowY);
      doc.fillColor('#0f172a').text(`$${invoice.subtotal.toFixed(2)}`, valueX, rowY, { width: 70, align: 'right' });
      rowY += 16;
      doc.fillColor('#64748b').text(`IVA (${invoice.taxRate}%)`, labelX, rowY);
      doc.fillColor('#0f172a').text(`$${invoice.taxAmount.toFixed(2)}`, valueX, rowY, { width: 70, align: 'right' });
      rowY += 8;
      doc.strokeColor('#0f172a').lineWidth(1).moveTo(labelX, rowY + 8).lineTo(564, rowY + 8).stroke();
      rowY += 14;
      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('TOTAL', labelX, rowY);
      doc.text(`$${invoice.totalAmount.toFixed(2)}`, valueX, rowY, { width: 70, align: 'right' });

      // Footer
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
        .text(invoice.notes ?? 'Gracias por confiar en nosotros.', 48, 720, { width: 516, align: 'center' });

      doc.end();
      // Tell Fastify the body is being streamed manually.
      return reply;
    },
  );

  /**
   * POST /finance/ai/insight
   * Take the dashboard payload and produce a 2-3 sentence executive read.
   */
  fastify.post('/finance/ai/insight', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const body = z.object({
      headline: z.any(),
      monthly: z.array(z.any()),
      aging: z.any(),
      overdueInvoices: z.array(z.any()).optional(),
      topClients: z.array(z.any()).optional(),
    }).parse(request.body);

    const aiClient = await getAiClient();

    const prompt = [
      `Headline: revenue this month = ${body.headline.revenueThisMonth.toFixed(2)} USD,`,
      `prev month = ${body.headline.revenuePrevMonth.toFixed(2)} USD, MoM = ${body.headline.momChange.toFixed(1)}%.`,
      `Total billed: ${body.headline.totalBilled.toFixed(2)}, paid: ${body.headline.totalPaid.toFixed(2)}, outstanding: ${body.headline.totalOutstanding.toFixed(2)}.`,
      `Overdue invoices: ${body.headline.overdueCount}. Avg days to pay: ${body.headline.avgDaysToPay ?? 'n/a'}. Collection ratio: ${body.headline.collectionRatio.toFixed(1)}%.`,
      `Aging: current=${body.aging.current.toFixed(0)}, 1-30=${body.aging['1_30'].toFixed(0)}, 31-60=${body.aging['31_60'].toFixed(0)}, 61-90=${body.aging['61_90'].toFixed(0)}, 90+=${body.aging['90_plus'].toFixed(0)}.`,
      body.overdueInvoices?.[0] ? `Worst overdue: ${body.overdueInvoices[0].clientName} $${body.overdueInvoices[0].balanceDue.toFixed(0)} (${body.overdueInvoices[0].daysOverdue}d).` : '',
    ].filter(Boolean).join(' ');

    try {
      const completion = await aiClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              'Eres un CFO virtual para un despacho de abogados. Lee las métricas y devuelve 2-3 frases: ' +
              '(1) lectura del momentum, (2) la mayor preocupación accionable. ' +
              'Tono profesional, directo, en español. Sin markdown ni listas. Sin pegar números crudos: redondea ' +
              'y usa lenguaje natural. Máximo 60 palabras.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });
      const text = completion.choices?.[0]?.message?.content?.trim() ?? '';
      return { insight: text };
    } catch (err: any) {
      request.log.error({ err }, 'finance ai/insight failed');
      return reply.code(500).send({ error: 'AI_FAILED', message: err?.message });
    }
  });

  /**
   * GET /finance/expenses?caseId=...
   * Expenses live in serviceItems with isBillable=false (operator-supplied).
   * If you've not modeled expenses separately, this returns ServiceItem rows
   * with a marker tag — the simplest pragmatic fit for now.
   */
  fastify.get('/finance/expenses', { onRequest: [fastify.authenticate] }, async (request) => {
    const userId = (request.user as any).id;
    const q = request.query as { caseId?: string };
    const baseWhere = q.caseId
      ? { caseId: q.caseId }
      : { case: { userId } };

    const items = await prisma.serviceItem.findMany({
      where: { ...baseWhere, type: 'OTHER' },
      orderBy: { serviceDate: 'desc' },
      take: 200,
      include: { case: { select: { id: true, title: true, clientName: true } } },
    });
    return { expenses: items };
  });

  fastify.post('/finance/expenses', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const body = z.object({
      caseId: z.string().uuid(),
      amount: z.number().positive(),
      currency: z.string().default('USD'),
      category: z.string().min(1),
      description: z.string().min(1),
      date: z.string().datetime().optional(),
    }).parse(request.body) as TaskExpensePayload;

    const userId = (request.user as any).id;
    const ownedCase = await prisma.case.findFirst({ where: { id: body.caseId, userId } });
    if (!ownedCase) return reply.code(404).send({ error: 'CASE_NOT_FOUND' });

    const expense = await prisma.serviceItem.create({
      data: {
        caseId: body.caseId,
        type: 'OTHER',
        description: `[${body.category}] ${body.description}`,
        quantity: 1,
        rate: body.amount,
        amount: body.amount,
        currency: body.currency ?? 'USD',
        isBillable: false,
        serviceDate: body.date ? new Date(body.date) : new Date(),
      },
    });
    return reply.code(201).send({ expense });
  });

  /**
   * GET /finance/export.csv
   * Stream a one-row-per-invoice CSV.
   */
  fastify.get('/finance/export.csv', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).id;
    const userCases = await prisma.case.findMany({ where: { userId }, select: { id: true } });
    const caseIds = userCases.map((c) => c.id);

    const invoices = await prisma.invoiceFinance.findMany({
      where: { caseId: { in: caseIds } },
      orderBy: { issueDate: 'desc' },
    });

    const header = [
      'invoice_number','client','status','currency','subtotal','tax','total','paid','balance',
      'issue_date','due_date','paid_date',
    ];
    const rows = invoices.map((i) => [
      i.invoiceNumber, csvCell(i.clientName), i.status, i.currency,
      i.subtotal.toFixed(2), i.taxAmount.toFixed(2), i.totalAmount.toFixed(2),
      i.paidAmount.toFixed(2), i.balanceDue.toFixed(2),
      fmtDate(i.issueDate), fmtDate(i.dueDate), i.paidDate ? fmtDate(i.paidDate) : '',
    ].join(','));
    const csv = [header.join(','), ...rows].join('\n');

    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="finanzas-${new Date().toISOString().slice(0,10)}.csv"`)
      .send(csv);
  });
}

// ─── helpers ──────────────────────────────────────────────────────────

function emptyDashboard() {
  return {
    currency: 'USD',
    generatedAt: new Date().toISOString(),
    headline: {
      totalBilled: 0, totalPaid: 0, totalOutstanding: 0,
      revenueThisMonth: 0, revenuePrevMonth: 0, momChange: 0,
      invoicesCount: 0, overdueCount: 0, avgDaysToPay: null,
      collectionRatio: 0,
    },
    monthly: [],
    aging: { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 },
    overdueInvoices: [],
    topClients: [],
    methodMix: [],
    forecastWeeks: [],
  };
}

function sumIn<T>(rows: T[], from: Date, to: Date, dateOf: (r: T) => Date, valueOf: (r: T) => number): number {
  let s = 0;
  for (const r of rows) {
    const d = dateOf(r);
    if (d >= from && d <= to) s += valueOf(r);
  }
  return round2(s);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function csvCell(s: string | null | undefined): string {
  if (!s) return '';
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function nextInvoiceNumber(): Promise<string> {
  // Format: INV-YYYYMM-NNNN, where NNNN is sequential within the current month.
  const d = new Date();
  const prefix = `INV-${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}-`;
  const last = await prisma.invoiceFinance.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });
  const n = last ? parseInt(last.invoiceNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${n.toString().padStart(4, '0')}`;
}
