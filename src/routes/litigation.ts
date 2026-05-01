/**
 * Litigation room — backend.
 *
 * Three endpoints designed for "Sala de Litigación", a fullscreen view a
 * lawyer opens during a hearing:
 *
 *   GET  /cases/:id/litigation-brief    — full packet (case + docs + events
 *                                         + tasks + finance + parties)
 *   GET  /legal/article?ref=...         — fast lookup of a specific
 *                                         article ("Art. 76 Constitución")
 *   POST /cases/:id/litigation-chat     — SSE streaming AI chat with the
 *                                         case auto-injected as context
 */
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getAiClient } from '../lib/ai-client.js';

interface LitigationDocument {
  id: string;
  title: string;
  excerpt: string;
  contentLength: number;
  createdAt: Date;
}

export async function litigationRoutes(fastify: FastifyInstance) {
  /**
   * GET /cases/:id/litigation-brief
   * Single round-trip with everything the litigation room needs.
   * Scoped by case.userId.
   */
  fastify.get<{ Params: { id: string } }>(
    '/cases/:id/litigation-brief',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const caseId = request.params.id;

      const c = await prisma.case.findFirst({
        where: { id: caseId, userId },
        include: {
          documents: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: { id: true, title: true, content: true, createdAt: true },
          },
          events: {
            orderBy: { startTime: 'desc' },
            take: 50,
            select: {
              id: true, title: true, type: true, status: true,
              startTime: true, endTime: true, location: true, meetingLink: true,
              description: true,
            },
          },
          tasks: {
            where: { status: { not: 'CANCELLED' } },
            orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
            take: 30,
            select: {
              id: true, title: true, status: true, priority: true,
              dueDate: true, progress: true, description: true,
            },
          },
          finance: { select: {
            totalBilled: true, totalPaid: true, totalOutstanding: true,
            invoiceCount: true, currency: true,
          } },
          agreements: {
            select: { id: true, title: true, totalAmount: true, currency: true, status: true },
            take: 5,
          },
          invoices: {
            orderBy: { issueDate: 'desc' },
            take: 5,
            select: { id: true, invoiceNumber: true, totalAmount: true, balanceDue: true, status: true, dueDate: true },
          },
        },
      });

      if (!c) return reply.code(404).send({ error: 'CASE_NOT_FOUND' });

      // Document excerpts: first 600 chars per doc, scrubbed.
      const documents: LitigationDocument[] = c.documents.map((d) => ({
        id: d.id,
        title: d.title,
        excerpt: stripWhitespace(d.content).slice(0, 600),
        contentLength: d.content.length,
        createdAt: d.createdAt,
      }));

      // Sort events by startTime asc once for the timeline.
      const timeline = [...c.events].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );

      // Next upcoming hearing.
      const now = new Date();
      const nextHearing = timeline.find(
        (e) =>
          new Date(e.startTime) >= now &&
          ['HEARING', 'COURT_DATE', 'DEPOSITION', 'MEDIATION'].includes(e.type as string),
      );

      return {
        case: {
          id: c.id, title: c.title, description: c.description,
          clientName: c.clientName, caseNumber: c.caseNumber, status: c.status,
          createdAt: c.createdAt, updatedAt: c.updatedAt,
        },
        nextHearing,
        timeline,
        documents,
        tasks: c.tasks,
        finance: c.finance,
        agreements: c.agreements,
        invoices: c.invoices,
        counts: {
          documents: c.documents.length,
          events: c.events.length,
          tasks: c.tasks.length,
          agreements: c.agreements.length,
        },
      };
    },
  );

  /**
   * GET /legal/article?ref=...&jurisdiction=...
   * Parses references like "Art. 76", "Artículo 76, Constitución",
   * "76 COIP" and returns the matching article + parent document.
   */
  fastify.get('/legal/article', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const q = z.object({
      ref: z.string().min(1).max(120),
      jurisdiction: z.string().optional(),
    }).parse(request.query);

    const parsed = parseArticleRef(q.ref);
    if (!parsed) return reply.code(400).send({ error: 'INVALID_REF' });

    // Find articles by number, then prefer ones whose parent doc title contains
    // the source hint (e.g. "constitución", "coip", "código civil"). We pull
    // up to 8 candidates and rank lightly.
    const candidates = await prisma.legalDocumentArticle.findMany({
      where: { articleNumber: parsed.number },
      take: 8,
      include: {
        legalDocument: {
          select: {
            id: true, normType: true, normTitle: true, legalHierarchy: true,
            jurisdiction: true, publicationDate: true, isActive: true,
          },
        },
      },
    });

    const active = candidates.filter((a) => a.legalDocument.isActive);
    const ranked = parsed.sourceHint
      ? active
          .map((a) => ({ a, score: scoreSourceMatch(a.legalDocument.normTitle ?? '', parsed.sourceHint!) }))
          .sort((x, y) => y.score - x.score)
      : active.map((a) => ({ a, score: 0 }));

    if (ranked.length === 0) return reply.code(404).send({ error: 'ARTICLE_NOT_FOUND', parsed });

    const top = ranked[0].a;
    return {
      article: {
        id: top.id,
        number: top.articleNumber,
        numberText: top.articleNumberText,
        title: top.articleTitle,
        content: top.articleContent,
        summary: top.summary,
        wordCount: top.wordCount,
      },
      source: {
        id: top.legalDocument.id,
        normType: top.legalDocument.normType,
        title: top.legalDocument.normTitle,
        hierarchy: top.legalDocument.legalHierarchy,
        jurisdiction: top.legalDocument.jurisdiction,
        publicationDate: top.legalDocument.publicationDate,
      },
      alternatives: ranked.slice(1, 5).map((r) => ({
        articleId: r.a.id,
        sourceTitle: r.a.legalDocument.normTitle,
        normType: r.a.legalDocument.normType,
      })),
      parsed,
    };
  });

  /**
   * POST /cases/:id/litigation-chat (SSE)
   * The system prompt embeds the case context the lawyer is litigating.
   * Body: { message, history?: [{role,content}] }
   */
  fastify.post<{ Params: { id: string }; Body: any }>(
    '/cases/:id/litigation-chat',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const caseId = request.params.id;

      const body = z.object({
        message: z.string().min(1).max(4000),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })).max(20).optional(),
      }).parse(request.body);

      // Pull a compact case packet for the system prompt.
      const c = await prisma.case.findFirst({
        where: { id: caseId, userId },
        include: {
          documents: { orderBy: { createdAt: 'desc' }, take: 5,
            select: { title: true, content: true } },
          events: { orderBy: { startTime: 'asc' }, take: 10,
            select: { title: true, type: true, startTime: true } },
        },
      });
      if (!c) return reply.code(404).send({ error: 'CASE_NOT_FOUND' });

      const docExcerpts = c.documents
        .map((d, i) => `[Doc ${i + 1}] ${d.title}\n${stripWhitespace(d.content).slice(0, 800)}`)
        .join('\n\n');
      const timeline = c.events
        .map((e) => `- ${new Date(e.startTime).toISOString().slice(0, 10)} ${e.type}: ${e.title}`)
        .join('\n');

      const systemPrompt = [
        'Eres un asistente jurídico experto en derecho ecuatoriano que asiste a un abogado DURANTE una audiencia.',
        'Tu rol: dar respuestas BREVES, PRECISAS y ACCIONABLES en tiempo real.',
        '',
        'Reglas clave:',
        '1) Responde en máximo 4-6 frases, salvo que se pida un texto largo.',
        '2) Si citas un artículo, indica número y norma exacta (ej. "Art. 76, Constitución").',
        '3) Si no estás 100% seguro, dilo explícitamente.',
        '4) No inventes jurisprudencia ni citas.',
        '5) Tono profesional, español de Ecuador.',
        '',
        '=== CONTEXTO DEL CASO ===',
        `Título: ${c.title}`,
        c.caseNumber ? `Número: ${c.caseNumber}` : '',
        c.clientName ? `Cliente: ${c.clientName}` : '',
        c.status ? `Estado: ${c.status}` : '',
        c.description ? `Descripción: ${c.description}` : '',
        '',
        '=== CRONOLOGÍA ===',
        timeline || '(sin eventos registrados)',
        '',
        '=== EXTRACTOS DE DOCUMENTOS ===',
        docExcerpts || '(sin documentos)',
      ].filter(Boolean).join('\n');

      // SSE plumbing.
      reply
        .raw.setHeader('Content-Type', 'text/event-stream')
        .setHeader('Cache-Control', 'no-cache, no-transform')
        .setHeader('Connection', 'keep-alive')
        .setHeader('X-Accel-Buffering', 'no');
      reply.raw.flushHeaders?.();

      const send = (event: string, data: any) => {
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      try {
        const aiClient = await getAiClient();
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          ...(body.history ?? []).map((m) => ({
            role: m.role as 'user' | 'assistant', content: m.content,
          })),
          { role: 'user' as const, content: body.message },
        ];

        // OpenAI provider streams natively; Anthropic wrapper currently returns
        // a single chunk — we just yield the whole text in one go.
        if (aiClient.provider === 'openai') {
          const stream: any = await aiClient.chat.completions.create({
            messages, temperature: 0.3, max_tokens: 800, stream: true,
          });
          for await (const chunk of stream) {
            const delta = chunk?.choices?.[0]?.delta?.content;
            if (delta) send('chunk', { content: delta });
          }
        } else {
          const completion = await aiClient.chat.completions.create({
            messages, temperature: 0.3, max_tokens: 800,
          });
          const text = completion.choices?.[0]?.message?.content ?? '';
          if (text) send('chunk', { content: text });
        }

        send('done', { ok: true });
      } catch (err: any) {
        request.log.error({ err }, 'litigation-chat failed');
        send('error', { message: err?.message ?? 'AI error' });
      } finally {
        reply.raw.end();
      }

      return reply;
    },
  );
}

// ─── helpers ──────────────────────────────────────────────────────────

function stripWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

interface ParsedArticleRef {
  number: number;
  suffix?: string;
  sourceHint?: string;
}

const SOURCE_ALIASES: Array<{ regex: RegExp; norm: string }> = [
  { regex: /\bconstituci[oó]n\b/i,                norm: 'constitución' },
  { regex: /\bcoip\b/i,                            norm: 'orgánico integral penal' },
  { regex: /\bc[oó]digo\s+penal\b/i,               norm: 'penal' },
  { regex: /\bc[oó]digo\s+civil\b/i,               norm: 'civil' },
  { regex: /\bcogep\b/i,                           norm: 'orgánico general de procesos' },
  { regex: /\bc[oó]digo\s+del?\s+trabajo\b/i,      norm: 'trabajo' },
  { regex: /\bc[oó]digo\s+tributario\b/i,          norm: 'tributario' },
  { regex: /\bc[oó]digo\s+org[aá]nico\b/i,         norm: 'orgánico' },
  { regex: /\bley\s+org[aá]nica\b/i,               norm: 'ley orgánica' },
];

export function parseArticleRef(input: string): ParsedArticleRef | null {
  const s = input.trim();
  // Match "Art. 76", "Artículo 76", "Art 76", or just leading number "76 ..."
  const m = s.match(/(?:art(?:[íi]culo)?\.?\s*)?(\d{1,4})([\s-]?[a-zA-Z])?\b/i);
  if (!m) return null;
  const number = parseInt(m[1], 10);
  if (!Number.isFinite(number) || number <= 0 || number > 9999) return null;
  const suffix = m[2]?.replace(/[\s-]/g, '').toUpperCase();

  let sourceHint: string | undefined;
  for (const alias of SOURCE_ALIASES) {
    if (alias.regex.test(s)) { sourceHint = alias.norm; break; }
  }
  if (!sourceHint) {
    // Fallback: anything after a comma or dash
    const after = s.split(/[,\-–]/).slice(1).join(' ').trim();
    if (after.length >= 3) sourceHint = after.toLowerCase();
  }
  return { number, suffix, sourceHint };
}

function scoreSourceMatch(title: string, hint: string): number {
  const t = title.toLowerCase();
  const tokens = hint.split(/\s+/).filter((x) => x.length > 2);
  let score = 0;
  for (const tok of tokens) {
    if (t.includes(tok)) score += 1;
  }
  return score;
}
