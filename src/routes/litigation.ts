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
import { parseConvocatoria, detectProvider } from '../lib/convocatoria.js';

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
              description: true, notes: true,
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

      // Sort events by startTime asc once for the timeline; enrich with
      // parsed convocatoria so the UI can render a join card.
      const enriched = [...c.events]
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .map((e) => {
          const meta = parseConvocatoria(e.notes ?? '');
          const provider = detectProvider(e.meetingLink, meta.provider);
          return {
            ...e,
            convocatoria: {
              source: meta.source ?? null,
              passcode: meta.passcode ?? null,
              provider,
              freeText: meta.freeText ?? null,
            },
          };
        });
      const timeline = enriched;

      // Next event for the litigation room: prefer an upcoming hearing-like
      // event; otherwise fall back to ANY upcoming event with a meeting link
      // or location; finally fall back to the most recent past event so the
      // user still sees the convocatoria card even mid-hearing or
      // post-mortem.
      const now = new Date();
      const HEARING_TYPES = ['HEARING', 'COURT_DATE', 'DEPOSITION', 'MEDIATION'];
      const upcoming = timeline.filter((e) => new Date(e.endTime) >= now);
      const nextHearing =
        upcoming.find((e) => HEARING_TYPES.includes(e.type as string)) ??
        upcoming.find((e) => !!e.meetingLink || !!e.location) ??
        upcoming[0] ??
        // Past events: show the most recent one if any.
        [...timeline].reverse().find((e) => HEARING_TYPES.includes(e.type as string) || !!e.meetingLink) ??
        null;

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
   * POST /cases/:id/litigation-cards (SSE)
   * Streams a deck of 6-8 argumentation cards generated from the case.
   * Each card emits as a single SSE `card` event so the UI can render
   * them as they arrive. Supports a `slugs` array to regenerate only
   * specific cards.
   */
  fastify.post<{ Params: { id: string }; Body: any }>(
    '/cases/:id/litigation-cards',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const caseId = request.params.id;

      const body = z.object({
        slugs: z.array(z.string()).optional(),
        tone: z.enum(['firme', 'persuasivo', 'tecnico']).default('firme'),
      }).parse(request.body ?? {});

      const c = await prisma.case.findFirst({
        where: { id: caseId, userId },
        include: {
          documents: { orderBy: { createdAt: 'desc' }, take: 6,
            select: { title: true, content: true } },
          events: { orderBy: { startTime: 'asc' }, take: 12,
            select: { title: true, type: true, startTime: true, description: true } },
        },
      });
      if (!c) return reply.code(404).send({ error: 'CASE_NOT_FOUND' });

      const docExcerpts = c.documents
        .map((d, i) => `[Doc ${i + 1}] ${d.title}\n${stripWhitespace(d.content).slice(0, 1200)}`)
        .join('\n\n');
      const timeline = c.events
        .map((e) => `- ${new Date(e.startTime).toISOString().slice(0, 10)} ${e.type}: ${e.title}`)
        .join('\n');

      const cardSlugs = body.slugs && body.slugs.length > 0
        ? body.slugs
        : ['APERTURA','HECHOS','FUNDAMENTO_JURIDICO','PRUEBA','REFUTACION','REPLICA','CIERRE'];

      const systemPrompt = [
        'Eres un litigante experimentado en derecho ecuatoriano que prepara la presentación oral de un caso.',
        `Tono: ${body.tone}. Idioma: español de Ecuador.`,
        '',
        'TAREA: genera UN MAZO de tarjetas argumentativas, una por cada slug que se te pida.',
        'CADA TARJETA debe contener EXACTAMENTE este formato JSON (una sola línea, sin markdown):',
        '{"slug":"APERTURA","title":"Apertura","headline":"…","talking_points":["…","…","…"],"key_articles":["Art. 76, Constitución"],"risk":"…","est_seconds":60}',
        '',
        'Reglas:',
        '- headline: una frase poderosa (máx 16 palabras) que el abogado dirá al iniciar la tarjeta.',
        '- talking_points: 3-5 bullets accionables, en imperativo, máx 22 palabras cada uno.',
        '- key_articles: 0-3 citas exactas con número y norma. NO inventes — si no estás 100% seguro, omite.',
        '- risk: 1 frase con la trampa o objeción más probable que enfrentará la otra parte.',
        '- est_seconds: 30-180, tiempo estimado para exponer la tarjeta.',
        '- title canónico por slug:',
        '    APERTURA "Apertura"',
        '    HECHOS "Relato de los hechos"',
        '    FUNDAMENTO_JURIDICO "Fundamento jurídico"',
        '    PRUEBA "Prueba"',
        '    REFUTACION "Refutación de la contraparte"',
        '    REPLICA "Réplica"',
        '    CIERRE "Cierre"',
        '    ALEGATO_FINAL "Alegato final"',
        '',
        'IMPORTANTE: emite las tarjetas en este orden estricto:',
        cardSlugs.join(' → '),
        'Devuelve UNA tarjeta por línea, sin texto antes ni después de las tarjetas.',
        '',
        '=== CASO ===',
        `Título: ${c.title}`,
        c.caseNumber ? `Número: ${c.caseNumber}` : '',
        c.clientName ? `Cliente: ${c.clientName}` : '',
        c.description ? `Descripción: ${c.description}` : '',
        '',
        '=== CRONOLOGÍA ===',
        timeline || '(sin eventos)',
        '',
        '=== EXTRACTOS DE DOCUMENTOS ===',
        docExcerpts || '(sin documentos)',
      ].filter(Boolean).join('\n');

      const userPrompt = `Genera el mazo de ${cardSlugs.length} tarjetas: ${cardSlugs.join(', ')}.`;

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
          { role: 'user' as const, content: userPrompt },
        ];

        send('start', { total: cardSlugs.length, slugs: cardSlugs });

        // Buffer the stream and ship complete JSON-card lines as they arrive.
        let buffer = '';
        let emitted = 0;

        const flushLines = () => {
          let nl;
          while ((nl = buffer.indexOf('\n')) !== -1) {
            const raw = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!raw) continue;
            const json = tryParseCard(raw);
            if (json) {
              emitted += 1;
              // Inyectar metadata de trazabilidad para que el frontend pueda
              // detectar staleness comparando contra brain.generatedAt,
              // último documento subido y última tarea completada.
              (json as any).generatedAt = new Date().toISOString();
              (json as any).model = aiClient.model;
              send('card', { index: emitted - 1, card: json });
            }
          }
        };

        if (aiClient.provider === 'openai') {
          const stream: any = await aiClient.chat.completions.create({
            messages, temperature: 0.4, max_tokens: 2200, stream: true,
          });
          for await (const chunk of stream) {
            const delta = chunk?.choices?.[0]?.delta?.content;
            if (delta) {
              buffer += delta;
              flushLines();
            }
          }
        } else {
          const completion = await aiClient.chat.completions.create({
            messages, temperature: 0.4, max_tokens: 2200,
          });
          buffer += completion.choices?.[0]?.message?.content ?? '';
          flushLines();
        }

        // Flush any trailing card not terminated by \n.
        if (buffer.trim()) {
          const tail = tryParseCard(buffer.trim());
          if (tail) {
            emitted += 1;
            (tail as any).generatedAt = new Date().toISOString();
            (tail as any).model = aiClient.model;
            send('card', { index: emitted - 1, card: tail });
          }
        }

        send('done', { count: emitted });
      } catch (err: any) {
        request.log.error({ err }, 'litigation-cards failed');
        send('error', { message: err?.message ?? 'AI error' });
      } finally {
        reply.raw.end();
      }

      return reply;
    },
  );

  /**
   * GET /cases/:id/litigation-fingerprint
   *
   * Devuelve los timestamps clave del contexto del caso que la Sala de
   * Litigación usa para detectar si las tarjetas argumentales están
   * "obsoletas" (stale).
   *
   * El frontend lee este endpoint al entrar a la sala y compara cada
   * tarjeta.generatedAt vs:
   *   - brain.generatedAt          (cerebro del caso re-sintetizado)
   *   - lastDocumentAt             (nuevo documento subido)
   *   - lastTaskCompletedAt        (tarea cerrada que puede cambiar estrategia)
   *   - lastAnalysisAt             (nuevo ai_analysis post-upload)
   *
   * Si CUALQUIERA de esos timestamps es posterior a card.generatedAt, la
   * tarjeta se considera stale y se muestra el badge "X cambios desde X".
   */
  fastify.get<{ Params: { id: string } }>(
    '/cases/:id/litigation-fingerprint',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const caseId = request.params.id;

      const ownRows = await prisma.$queryRawUnsafe<Array<{
        id: string; title: string; metadata: any;
      }>>(
        `SELECT id, title, metadata
           FROM public.cases
          WHERE id = $1 AND user_id = $2
          LIMIT 1`,
        caseId, userId,
      );
      const own = ownRows[0];
      if (!own) return reply.code(404).send({ error: 'CASE_NOT_FOUND' });

      // Cerebro del caso (metadata.brain.generatedAt)
      const brain = (own.metadata && typeof own.metadata === 'object' && 'brain' in own.metadata)
        ? (own.metadata as any).brain
        : null;
      const brainGeneratedAt: string | null = brain?.generatedAt ?? null;

      // Último documento subido (no replaced) + último ai_analysis
      const [lastDocRow, lastAnalysisRow, lastCourtFiledRow, lastTaskRow, totalsRow] =
        await Promise.all([
          prisma.$queryRawUnsafe<Array<{ created_at: Date; title: string; kind: string | null }>>(
            `SELECT created_at, title, kind
               FROM public.documents
              WHERE case_id = $1 AND replaced_at IS NULL
              ORDER BY created_at DESC
              LIMIT 1`, caseId
          ),
          prisma.$queryRawUnsafe<Array<{ created_at: Date; title: string }>>(
            `SELECT created_at, title
               FROM public.documents
              WHERE case_id = $1 AND kind = 'ai_analysis' AND replaced_at IS NULL
              ORDER BY created_at DESC
              LIMIT 1`, caseId
          ),
          prisma.$queryRawUnsafe<Array<{ presented_at: Date; title: string }>>(
            `SELECT presented_at, title
               FROM public.documents
              WHERE case_id = $1 AND kind = 'court_filed' AND presented_at IS NOT NULL
              ORDER BY presented_at DESC
              LIMIT 1`, caseId
          ),
          prisma.$queryRawUnsafe<Array<{ completed_at: Date | null; title: string }>>(
            `SELECT completed_at, title
               FROM public.tasks
              WHERE case_id = $1 AND completed_at IS NOT NULL
              ORDER BY completed_at DESC
              LIMIT 1`, caseId
          ).catch(() => []),
          prisma.$queryRawUnsafe<Array<{ docs: bigint; analyses: bigint; court_filed: bigint }>>(
            `SELECT
                COUNT(*) FILTER (WHERE replaced_at IS NULL)::bigint AS docs,
                COUNT(*) FILTER (WHERE kind = 'ai_analysis' AND replaced_at IS NULL)::bigint AS analyses,
                COUNT(*) FILTER (WHERE kind = 'court_filed' AND replaced_at IS NULL)::bigint AS court_filed
              FROM public.documents
              WHERE case_id = $1`, caseId
          ),
        ]);

      const lastDoc = lastDocRow[0];
      const lastAnalysis = lastAnalysisRow[0];
      const lastCourtFiled = lastCourtFiledRow[0];
      const lastTask = lastTaskRow[0];
      const totals = totalsRow[0];

      // Computar el timestamp más reciente entre todos — útil para
      // comparar contra cards.generatedAt en una sola operación.
      const candidates = [
        brainGeneratedAt,
        lastDoc?.created_at?.toISOString() ?? null,
        lastAnalysis?.created_at?.toISOString() ?? null,
        lastCourtFiled?.presented_at?.toISOString() ?? null,
        lastTask?.completed_at?.toISOString() ?? null,
      ].filter(Boolean) as string[];
      const mostRecentChangeAt = candidates.length > 0
        ? candidates.sort().slice(-1)[0]
        : null;

      return reply.send({
        caseId,
        title: own.title,
        mostRecentChangeAt,
        brain: {
          generatedAt: brainGeneratedAt,
          summary: brain?.summary?.slice(0, 200) ?? null,
        },
        lastDocument: lastDoc ? {
          createdAt: lastDoc.created_at.toISOString(),
          title: lastDoc.title,
          kind: lastDoc.kind,
        } : null,
        lastAnalysis: lastAnalysis ? {
          createdAt: lastAnalysis.created_at.toISOString(),
          title: lastAnalysis.title,
        } : null,
        lastCourtFiled: lastCourtFiled ? {
          presentedAt: lastCourtFiled.presented_at.toISOString(),
          title: lastCourtFiled.title,
        } : null,
        lastTaskCompleted: lastTask?.completed_at ? {
          completedAt: lastTask.completed_at.toISOString(),
          title: lastTask.title,
        } : null,
        totals: totals ? {
          documents: Number(totals.docs),
          aiAnalyses: Number(totals.analyses),
          courtFiled: Number(totals.court_filed),
        } : { documents: 0, aiAnalyses: 0, courtFiled: 0 },
      });
    },
  );

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

function tryParseCard(raw: string): any | null {
  // Strip optional code-fence backticks the model might emit.
  let s = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  if (!s.startsWith('{')) {
    // Sometimes the model prefixes "1. " or "- ".
    const m = s.match(/\{.*\}\s*$/s);
    if (!m) return null;
    s = m[0];
  }
  try {
    const obj = JSON.parse(s);
    if (typeof obj?.slug !== 'string' || typeof obj?.title !== 'string') return null;
    if (!Array.isArray(obj?.talking_points)) obj.talking_points = [];
    if (!Array.isArray(obj?.key_articles)) obj.key_articles = [];
    if (typeof obj?.est_seconds !== 'number') obj.est_seconds = 60;
    return obj;
  } catch {
    return null;
  }
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
