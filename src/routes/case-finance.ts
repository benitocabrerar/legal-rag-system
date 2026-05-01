/**
 * Finanzas del caso (acuerdo, hitos, pagos, comprobantes).
 *
 * Endpoints:
 *   GET    /cases/:id/finance/summary       — estado de cuenta consolidado
 *   GET    /cases/:id/finance/agreement     — acuerdo de honorarios
 *   PUT    /cases/:id/finance/agreement     — crear/actualizar acuerdo
 *   GET    /cases/:id/finance/milestones    — hitos de pago
 *   POST   /cases/:id/finance/milestones    — crear hito
 *   PATCH  /finance/milestones/:id          — actualizar
 *   DELETE /finance/milestones/:id
 *   GET    /cases/:id/finance/payments      — lista de pagos
 *   POST   /cases/:id/finance/payments      — registrar pago
 *   PATCH  /finance/payments/:id            — actualizar
 *   DELETE /finance/payments/:id
 *   POST   /cases/:id/finance/payment-proof — sube comprobante (multipart) + extracción IA
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { getAiClient } from '../lib/ai-client.js';
import { extractText } from '../lib/extract-text.js';
import { serviceRoleClient } from '../lib/supabase.js';

const STORAGE_BUCKET = process.env.STORAGE_BUCKET_DOCUMENTS || 'legal-documents';

// ---------------- SCHEMAS ----------------

const AgreementSchema = z.object({
  totalAmount: z.number().nullable().optional(),
  currency: z.string().max(10).optional().nullable(),
  paymentType: z.enum(['FIXED', 'HOURLY', 'MIXED', 'CONTINGENCY', 'RETAINER']).optional(),
  hourlyRate: z.number().nullable().optional(),
  contingencyPct: z.number().nullable().optional(),
  retainerAmount: z.number().nullable().optional(),
  initialPayment: z.number().nullable().optional(),
  paymentTerms: z.string().optional().nullable(),
  includes: z.string().optional().nullable(),
  excludes: z.string().optional().nullable(),
  signedAt: z.string().optional().nullable(),
  contractDocId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'TERMINATED']).optional(),
  notes: z.string().optional().nullable(),
});

const MilestoneSchema = z.object({
  label: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  amount: z.number().min(0),
  currency: z.string().max(10).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'PARTIAL', 'WAIVED']).optional(),
  sortOrder: z.number().int().optional(),
  notes: z.string().optional().nullable(),
});

const PaymentSchema = z.object({
  milestoneId: z.string().uuid().optional().nullable(),
  amount: z.number().min(0),
  currency: z.string().max(10).optional().nullable(),
  paymentMethod: z.string().max(50).optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  bankName: z.string().max(100).optional().nullable(),
  referenceNumber: z.string().max(100).optional().nullable(),
  payerName: z.string().max(200).optional().nullable(),
  status: z.enum(['PENDING', 'CONFIRMED', 'REJECTED', 'REFUNDED']).optional(),
  proofDocId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ---------------- HELPERS ----------------

const FIELD_MAP: Record<string, string> = {
  totalAmount: 'total_amount', currency: 'currency', paymentType: 'payment_type',
  hourlyRate: 'hourly_rate', contingencyPct: 'contingency_pct', retainerAmount: 'retainer_amount',
  initialPayment: 'initial_payment', paymentTerms: 'payment_terms', includes: 'includes',
  excludes: 'excludes', signedAt: 'signed_at', contractDocId: 'contract_doc_id',
  status: 'status', notes: 'notes',
  label: 'label', description: 'description', amount: 'amount', dueDate: 'due_date',
  sortOrder: 'sort_order', paidAmount: 'paid_amount', paidAt: 'paid_at',
  milestoneId: 'milestone_id', paymentMethod: 'payment_method', paymentDate: 'payment_date',
  bankName: 'bank_name', referenceNumber: 'reference_number', payerName: 'payer_name',
  proofDocId: 'proof_doc_id',
};

function rowToCamel(r: any): any {
  if (!r) return null;
  const out: any = {};
  for (const [k, v] of Object.entries(r)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if ((k.endsWith('_amount') || k.endsWith('_pct') || k === 'amount' || k === 'paid_amount' || k === 'hourly_rate') && v != null) {
      out[camel] = Number(v);
    } else {
      out[camel] = v;
    }
  }
  return out;
}

async function ensureCaseOwnership(caseId: string, userId: string) {
  const r = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id FROM public.cases WHERE id = $1 AND user_id = $2`,
    caseId, userId
  );
  return r.length > 0;
}

const DATE_COLUMNS = new Set(['signed_at', 'due_date', 'paid_at', 'payment_date']);

function buildSets(body: Record<string, any>) {
  const sets: string[] = [];
  const params: any[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue;
    const col = FIELD_MAP[k];
    if (!col) continue;
    if (DATE_COLUMNS.has(col)) {
      sets.push(`${col} = $${i++}::date`);
    } else {
      sets.push(`${col} = $${i++}`);
    }
    params.push(v === '' ? null : v);
  }
  return { sets, params, nextI: sets.length + 1 };
}

// Recalcular el estado de un milestone basado en los pagos recibidos
async function recomputeMilestoneStatus(milestoneId: string) {
  const r = await prisma.$queryRawUnsafe<any[]>(
    `SELECT m.amount, m.due_date,
            COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'CONFIRMED'), 0) AS paid
     FROM public.case_payment_milestones m
     LEFT JOIN public.case_payments p ON p.milestone_id = m.id
     WHERE m.id = $1::uuid
     GROUP BY m.id`,
    milestoneId
  );
  if (r.length === 0) return;
  const m = r[0];
  const paid = Number(m.paid);
  const amount = Number(m.amount);
  let status: string;
  let paidAt: string | null = null;
  if (paid >= amount && amount > 0) {
    status = 'PAID';
    const lastPay = await prisma.$queryRawUnsafe<any[]>(
      `SELECT MAX(payment_date) AS d FROM public.case_payments WHERE milestone_id = $1::uuid AND status='CONFIRMED'`,
      milestoneId
    );
    const d = lastPay[0]?.d;
    paidAt = d ? (typeof d === 'string' ? d : new Date(d).toISOString().slice(0, 10)) : null;
  } else if (paid > 0) {
    status = 'PARTIAL';
  } else if (m.due_date && new Date(m.due_date) < new Date()) {
    status = 'OVERDUE';
  } else {
    status = 'PENDING';
  }
  await prisma.$executeRawUnsafe(
    `UPDATE public.case_payment_milestones SET status = $1, paid_amount = $2, paid_at = $3::date, updated_at = now() WHERE id = $4::uuid`,
    status, paid, paidAt, milestoneId
  );
}

// ---------------- ROUTES ----------------

export async function caseFinanceRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', (fastify as any).authenticate);

  // --------------------------------------------------------------------------
  // SUMMARY: estado de cuenta consolidado
  // --------------------------------------------------------------------------
  fastify.get('/cases/:caseId/finance/summary', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { caseId } = request.params as { caseId: string };
    if (!(await ensureCaseOwnership(caseId, userId))) return reply.code(404).send({ error: 'Case not found' });

    const [agreement, milestones, payments] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`SELECT * FROM public.case_fee_agreements WHERE case_id = $1`, caseId),
      prisma.$queryRawUnsafe<any[]>(`SELECT * FROM public.case_payment_milestones WHERE case_id = $1 ORDER BY sort_order, due_date`, caseId),
      prisma.$queryRawUnsafe<any[]>(`SELECT * FROM public.case_payments WHERE case_id = $1 ORDER BY payment_date DESC`, caseId),
    ]);

    const ag = rowToCamel(agreement[0]);
    const ms = milestones.map(rowToCamel);
    const ps = payments.map(rowToCamel);

    const totalAgreed = ag?.totalAmount || ms.reduce((acc: number, m: any) => acc + (Number(m.amount) || 0), 0);
    const totalPaid = ps
      .filter((p: any) => p.status === 'CONFIRMED')
      .reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
    const totalPending = ms
      .filter((m: any) => m.status !== 'PAID' && m.status !== 'WAIVED')
      .reduce((acc: number, m: any) => acc + Math.max(0, Number(m.amount) - Number(m.paidAmount || 0)), 0);
    const overdueMilestones = ms.filter((m: any) => m.status === 'OVERDUE').length;
    const nextDue = ms.find((m: any) => m.status === 'PENDING' || m.status === 'OVERDUE' || m.status === 'PARTIAL');

    return reply.send({
      currency: ag?.currency || 'USD',
      totalAgreed,
      totalPaid,
      totalPending,
      balance: totalAgreed - totalPaid,
      progress: totalAgreed > 0 ? Math.round((totalPaid / totalAgreed) * 100) : 0,
      milestonesCount: ms.length,
      paidMilestones: ms.filter((m: any) => m.status === 'PAID').length,
      overdueMilestones,
      paymentsCount: ps.length,
      nextDue: nextDue
        ? { id: nextDue.id, label: nextDue.label, amount: nextDue.amount, dueDate: nextDue.dueDate, status: nextDue.status }
        : null,
      agreement: ag,
      milestones: ms,
      payments: ps,
    });
  });

  // --------------------------------------------------------------------------
  // AGREEMENT (acuerdo)
  // --------------------------------------------------------------------------
  fastify.get('/cases/:caseId/finance/agreement', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { caseId } = request.params as { caseId: string };
    if (!(await ensureCaseOwnership(caseId, userId))) return reply.code(404).send({ error: 'Case not found' });
    const r = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM public.case_fee_agreements WHERE case_id = $1`, caseId);
    return reply.send({ agreement: rowToCamel(r[0]) });
  });

  fastify.put('/cases/:caseId/finance/agreement', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { caseId } = request.params as { caseId: string };
    if (!(await ensureCaseOwnership(caseId, userId))) return reply.code(404).send({ error: 'Case not found' });

    let body;
    try { body = AgreementSchema.parse(request.body); }
    catch (e: any) { return reply.code(400).send({ error: 'Validation', details: e.errors }); }

    // Construir VALUES con casts explícitos para fechas
    const values = [
      caseId, userId,
      body.totalAmount ?? null, body.currency || 'USD', body.paymentType || 'FIXED',
      body.hourlyRate ?? null, body.contingencyPct ?? null, body.retainerAmount ?? null,
      body.initialPayment ?? null, body.paymentTerms || null, body.includes || null,
      body.excludes || null, body.signedAt || null, body.contractDocId || null,
      body.status || 'ACTIVE', body.notes || null,
    ];

    const r = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.case_fee_agreements
         (case_id, user_id, total_amount, currency, payment_type, hourly_rate, contingency_pct,
          retainer_amount, initial_payment, payment_terms, includes, excludes, signed_at,
          contract_doc_id, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::date,$14,$15,$16)
       ON CONFLICT (case_id) DO UPDATE SET
         total_amount=EXCLUDED.total_amount, currency=EXCLUDED.currency,
         payment_type=EXCLUDED.payment_type, hourly_rate=EXCLUDED.hourly_rate,
         contingency_pct=EXCLUDED.contingency_pct, retainer_amount=EXCLUDED.retainer_amount,
         initial_payment=EXCLUDED.initial_payment, payment_terms=EXCLUDED.payment_terms,
         includes=EXCLUDED.includes, excludes=EXCLUDED.excludes,
         signed_at=EXCLUDED.signed_at, contract_doc_id=EXCLUDED.contract_doc_id,
         status=EXCLUDED.status, notes=EXCLUDED.notes, updated_at = now()
       RETURNING *`,
      ...values
    );
    return reply.send({ agreement: rowToCamel(r[0]) });
  });

  // --------------------------------------------------------------------------
  // MILESTONES
  // --------------------------------------------------------------------------
  fastify.get('/cases/:caseId/finance/milestones', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { caseId } = request.params as { caseId: string };
    if (!(await ensureCaseOwnership(caseId, userId))) return reply.code(404).send({ error: 'Case not found' });
    const r = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM public.case_payment_milestones WHERE case_id = $1 ORDER BY sort_order, due_date NULLS LAST`,
      caseId
    );
    return reply.send({ milestones: r.map(rowToCamel) });
  });

  fastify.post('/cases/:caseId/finance/milestones', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { caseId } = request.params as { caseId: string };
    if (!(await ensureCaseOwnership(caseId, userId))) return reply.code(404).send({ error: 'Case not found' });
    let body;
    try { body = MilestoneSchema.parse(request.body); }
    catch (e: any) { return reply.code(400).send({ error: 'Validation', details: e.errors }); }

    const r = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.case_payment_milestones
         (case_id, user_id, label, description, amount, currency, due_date, status, sort_order, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8,$9,$10) RETURNING *`,
      caseId, userId, body.label, body.description || null, body.amount,
      body.currency || 'USD', body.dueDate || null, body.status || 'PENDING',
      body.sortOrder || 0, body.notes || null
    );
    const id = r[0].id;
    await recomputeMilestoneStatus(id);
    const fresh = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM public.case_payment_milestones WHERE id = $1::uuid`, id);
    return reply.code(201).send({ milestone: rowToCamel(fresh[0]) });
  });

  fastify.patch('/finance/milestones/:id', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { id } = request.params as { id: string };
    let body;
    try { body = MilestoneSchema.partial().parse(request.body); }
    catch (e: any) { return reply.code(400).send({ error: 'Validation', details: e.errors }); }

    const owner = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM public.case_payment_milestones WHERE id = $1::uuid AND user_id = $2`, id, userId
    );
    if (owner.length === 0) return reply.code(404).send({ error: 'not found' });

    const { sets, params, nextI } = buildSets(body);
    if (sets.length === 0) return reply.code(400).send({ error: 'no fields' });
    sets.push(`updated_at = now()`);
    params.push(id);
    await prisma.$executeRawUnsafe(
      `UPDATE public.case_payment_milestones SET ${sets.join(', ')} WHERE id = $${nextI}::uuid`,
      ...params
    );
    await recomputeMilestoneStatus(id);
    const fresh = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM public.case_payment_milestones WHERE id = $1::uuid`, id);
    return reply.send({ milestone: rowToCamel(fresh[0]) });
  });

  fastify.delete('/finance/milestones/:id', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { id } = request.params as { id: string };
    await prisma.$executeRawUnsafe(
      `DELETE FROM public.case_payment_milestones WHERE id = $1::uuid AND user_id = $2`,
      id, userId
    );
    return reply.code(204).send();
  });

  // --------------------------------------------------------------------------
  // PAYMENTS
  // --------------------------------------------------------------------------
  fastify.get('/cases/:caseId/finance/payments', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { caseId } = request.params as { caseId: string };
    if (!(await ensureCaseOwnership(caseId, userId))) return reply.code(404).send({ error: 'Case not found' });
    const r = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM public.case_payments WHERE case_id = $1 ORDER BY payment_date DESC, created_at DESC`,
      caseId
    );
    return reply.send({ payments: r.map(rowToCamel) });
  });

  fastify.post('/cases/:caseId/finance/payments', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { caseId } = request.params as { caseId: string };
    if (!(await ensureCaseOwnership(caseId, userId))) return reply.code(404).send({ error: 'Case not found' });
    let body;
    try { body = PaymentSchema.parse(request.body); }
    catch (e: any) { return reply.code(400).send({ error: 'Validation', details: e.errors }); }

    const r = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.case_payments
         (case_id, user_id, milestone_id, amount, currency, payment_method,
          payment_date, bank_name, reference_number, payer_name, status, proof_doc_id, notes)
       VALUES ($1,$2,$3::uuid,$4,$5,$6,$7::date,$8,$9,$10,$11,$12,$13) RETURNING *`,
      caseId, userId, body.milestoneId || null, body.amount, body.currency || 'USD',
      body.paymentMethod || null, body.paymentDate || new Date().toISOString().slice(0, 10),
      body.bankName || null, body.referenceNumber || null, body.payerName || null,
      body.status || 'CONFIRMED', body.proofDocId || null, body.notes || null
    );
    if (body.milestoneId) await recomputeMilestoneStatus(body.milestoneId);
    return reply.code(201).send({ payment: rowToCamel(r[0]) });
  });

  fastify.patch('/finance/payments/:id', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { id } = request.params as { id: string };
    let body;
    try { body = PaymentSchema.partial().parse(request.body); }
    catch (e: any) { return reply.code(400).send({ error: 'Validation', details: e.errors }); }

    const owner = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, milestone_id FROM public.case_payments WHERE id = $1::uuid AND user_id = $2`, id, userId
    );
    if (owner.length === 0) return reply.code(404).send({ error: 'not found' });
    const oldMilestone = owner[0].milestone_id;

    const { sets, params, nextI } = buildSets(body);
    if (sets.length === 0) return reply.code(400).send({ error: 'no fields' });
    sets.push(`updated_at = now()`);
    params.push(id);
    await prisma.$executeRawUnsafe(
      `UPDATE public.case_payments SET ${sets.join(', ')} WHERE id = $${nextI}::uuid`,
      ...params
    );
    if (oldMilestone) await recomputeMilestoneStatus(oldMilestone);
    if (body.milestoneId && body.milestoneId !== oldMilestone) await recomputeMilestoneStatus(body.milestoneId);

    const fresh = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM public.case_payments WHERE id = $1::uuid`, id);
    return reply.send({ payment: rowToCamel(fresh[0]) });
  });

  fastify.delete('/finance/payments/:id', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { id } = request.params as { id: string };
    const before = await prisma.$queryRawUnsafe<any[]>(
      `SELECT milestone_id FROM public.case_payments WHERE id = $1::uuid AND user_id = $2`,
      id, userId
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM public.case_payments WHERE id = $1::uuid AND user_id = $2`, id, userId
    );
    if (before[0]?.milestone_id) await recomputeMilestoneStatus(before[0].milestone_id);
    return reply.code(204).send();
  });

  // --------------------------------------------------------------------------
  // PAYMENT PROOF UPLOAD + AI EXTRACTION
  // --------------------------------------------------------------------------
  fastify.post('/cases/:caseId/finance/payment-proof', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { caseId } = request.params as { caseId: string };
    if (!(await ensureCaseOwnership(caseId, userId))) return reply.code(404).send({ error: 'Case not found' });

    if (!(request as any).isMultipart || !(request as any).isMultipart()) {
      return reply.code(400).send({ error: 'multipart requerido' });
    }

    const parts = (request as any).parts();
    let buffer: Buffer | null = null;
    let filename = 'comprobante';
    let mimeType = 'application/octet-stream';
    let milestoneId: string | null = null;
    for await (const part of parts) {
      if (part.file) {
        buffer = await part.toBuffer();
        filename = part.filename || filename;
        mimeType = part.mimetype || mimeType;
      } else if (part.fieldname === 'milestoneId' && typeof (part as any).value === 'string') {
        milestoneId = (part as any).value || null;
      }
    }
    if (!buffer) return reply.code(400).send({ error: 'archivo requerido' });

    // 1) Subir a Supabase Storage
    const docId = randomUUID();
    const ext = (filename.match(/\.[^.]+$/) || [''])[0];
    const storageKey = `${userId}/${caseId}/proofs/${docId}${ext}`;
    const supa = serviceRoleClient();
    const { error: upErr } = await supa.storage.from(STORAGE_BUCKET)
      .upload(storageKey, buffer, { contentType: mimeType, upsert: true });
    if (upErr) return reply.code(500).send({ error: 'Storage upload: ' + upErr.message });

    // 2) Crear documento (para que aparezca en la lista de docs del caso)
    let extracted = '';
    try {
      const ex = await extractText(buffer, mimeType, filename);
      extracted = ex.text || '';
    } catch {}
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.documents (id, case_id, user_id, title, content,
        storage_bucket, storage_key, mime_type, file_size_bytes, original_filename, metadata, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,now())`,
      docId, caseId, userId, `Comprobante: ${filename}`, extracted || `[Comprobante: ${filename}]`,
      STORAGE_BUCKET, storageKey, mimeType, buffer.length, filename,
      JSON.stringify({ kind: 'payment_proof', uploadedAt: new Date().toISOString() })
    );

    // 3) Extracción IA: monto, fecha, banco, referencia, ordenante
    let aiExtraction: any = null;
    try {
      const aiClient = await getAiClient();
      const isImage = /^image\//i.test(mimeType);
      const isPdf = /pdf/i.test(mimeType);

      let userContent: any;
      if (isImage) {
        const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
        userContent = [
          {
            type: 'text',
            text: `Eres un asistente que extrae datos de comprobantes de pago bancarios. Devuelve EXCLUSIVAMENTE un JSON con esta forma exacta:

{
  "amount": número o null,
  "currency": "USD" | "EUR" | otra | null,
  "paymentDate": "YYYY-MM-DD o null",
  "bankName": "Banco emisor o null",
  "referenceNumber": "número de transacción/referencia o null",
  "payerName": "nombre del ordenante (quien paga) o null",
  "payeeName": "nombre del beneficiario (quien recibe) o null",
  "paymentMethod": "TRANSFERENCIA | DEPOSITO | EFECTIVO | TARJETA | CHEQUE | OTRO o null",
  "concept": "concepto del pago o null"
}

NO incluyas markdown ni texto fuera del JSON.`,
          },
          { type: 'image_url', image_url: { url: dataUrl } },
        ];
      } else {
        // PDF u otro: usamos el texto extraído
        if (!extracted || extracted.length < 30) {
          throw new Error('No se pudo extraer texto del comprobante');
        }
        userContent = `Extrae datos del siguiente comprobante de pago. Devuelve EXCLUSIVAMENTE un JSON con la forma:
{
  "amount": número o null,
  "currency": "USD" | "EUR" | otra | null,
  "paymentDate": "YYYY-MM-DD o null",
  "bankName": "string o null",
  "referenceNumber": "string o null",
  "payerName": "string o null",
  "payeeName": "string o null",
  "paymentMethod": "TRANSFERENCIA | DEPOSITO | EFECTIVO | TARJETA | CHEQUE | OTRO o null",
  "concept": "string o null"
}

# Comprobante
${extracted.slice(0, 5000)}`;
      }

      const completion = await aiClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente que extrae datos estructurados de comprobantes de pago bancarios y devuelve solo JSON válido sin markdown.',
          },
          { role: 'user', content: userContent },
        ],
        temperature: 0,
        max_tokens: 1500,
      } as any);

      const raw = completion.choices?.[0]?.message?.content || '';
      const cleaned = (typeof raw === 'string' ? raw : '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
      try {
        aiExtraction = JSON.parse(cleaned);
      } catch {
        aiExtraction = { error: 'IA no devolvió JSON', raw: cleaned.slice(0, 300) };
      }
    } catch (e: any) {
      aiExtraction = { error: e.message };
    }

    return reply.send({
      proofDocId: docId,
      filename,
      mimeType,
      size: buffer.length,
      extraction: aiExtraction,
      milestoneId,
    });
  });
}
