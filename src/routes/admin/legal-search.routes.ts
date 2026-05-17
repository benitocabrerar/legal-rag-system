/**
 * Admin · Legal Search Routes
 *
 *   POST /admin/legal-search/query         hybrid search con AI opcional
 *   POST /admin/legal-search/reformulate   solo reformula query
 *   POST /admin/legal-search/summarize     resume resultados con IA
 *   POST /admin/legal-search/download-and-ingest (SSE)
 *       descarga una norma externa y la ingesta al corpus completo
 */
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import {
  search,
  reformulateQuery,
  summarizeResults,
  type SearchOptions,
  type SearchResult,
} from '../../services/legal-search.service.js';
import { ingestPublicationToCorpus } from '../../services/corpus-ingestion.service.js';
import {
  suggestInternationalSources,
  INTERNATIONAL_CATEGORIES,
} from '../../services/international-sources.service.js';
import {
  suggestEcuadorJudicialSources,
  ECUADOR_JUDICIAL_TYPES,
} from '../../services/ecuador-judicial-sources.service.js';
import { setSseHeaders, startSseKeepalive } from '../../lib/sse-cors.js';
import { vectorizeDocument, synthesizeCaseBrain } from '../documents.js';
import { extractText } from '../../lib/extract-text.js';

/** Convierte HTML crudo a texto plano legible (para fuentes que no sirven PDF). */
function stripHtml(html: string): string {
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_m, n) => {
      try { return String.fromCharCode(Number(n)); } catch { return ' '; }
    })
    .replace(/\s+/g, ' ')
    .trim();
}

export async function legalSearchRoutes(fastify: FastifyInstance) {
  const requireAdmin = async (request: any, reply: any) => {
    const user = request.user;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      reply.code(403).send({ error: 'Admin role required' });
      return false;
    }
    return true;
  };

  // ─── POST /admin/legal-search/query ────────────────────────────────
  fastify.post<{
    Body: {
      query: string;
      filters?: SearchOptions['filters'];
      limit?: number;
      useAI?: boolean;
      includeExternal?: boolean;
    };
  }>(
    '/admin/legal-search/query',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const userId = (request.user as any).id;
      const body = request.body || ({} as any);

      if (!body.query || typeof body.query !== 'string' || body.query.trim().length < 2) {
        return reply.code(400).send({ error: 'Query inválida (mínimo 2 caracteres)' });
      }

      try {
        const result = await search({
          query: body.query.trim(),
          filters: body.filters,
          limit: body.limit,
          useAI: body.useAI === true,
          includeExternal: body.includeExternal !== false,
          userId,
        });
        return reply.send(result);
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'legal-search query failed');
        return reply.code(500).send({ error: e?.message || 'Search failed' });
      }
    },
  );

  // ─── POST /admin/legal-search/reformulate ──────────────────────────
  fastify.post<{ Body: { query: string } }>(
    '/admin/legal-search/reformulate',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const body = request.body || ({} as any);
      if (!body.query) return reply.code(400).send({ error: 'Query requerida' });
      try {
        const r = await reformulateQuery(body.query.trim());
        return reply.send(r);
      } catch (e: any) {
        return reply.code(500).send({ error: e?.message || 'Reformulation failed' });
      }
    },
  );

  // ─── POST /admin/legal-search/summarize ────────────────────────────
  fastify.post<{ Body: { results: SearchResult[] } }>(
    '/admin/legal-search/summarize',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const body = request.body || ({} as any);
      if (!body.results || !Array.isArray(body.results)) {
        return reply.code(400).send({ error: 'results[] requerido' });
      }
      try {
        const r = await summarizeResults(body.results);
        return reply.send(r);
      } catch (e: any) {
        return reply.code(500).send({ error: e?.message || 'Summarize failed' });
      }
    },
  );

  // ─── POST /admin/legal-search/download-and-ingest (SSE) ────────────
  // Descarga una norma desde una URL externa (PDF del RO o HTML) y la
  // ingesta al corpus completo via ingestPublicationToCorpus.
  fastify.post<{
    Body: {
      title: string;
      sourceUrl: string;
      pdfUrl?: string;
      publicationType?: string;
      editionNumber?: string;
      excerpt?: string;
    };
  }>(
    '/admin/legal-search/download-and-ingest',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const userId = (request.user as any).id;
      const body = request.body || ({} as any);

      if (!body.title || !body.sourceUrl) {
        return reply.code(400).send({ error: 'title y sourceUrl requeridos' });
      }

      setSseHeaders(request, reply);
      const stopKa = startSseKeepalive(reply);
      const write = (event: string, data: any) => {
        try {
          reply.raw.write(`event: ${event}\n`);
          reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch { /* client gone */ }
      };

      try {
        write('connected', { startedAt: new Date().toISOString() });

        // 1) Crear una registry_publications sintética
        write('phase', { phase: 'creating-publication', label: 'Registrando la norma…', pct: 10 });
        const pubId = randomUUID();
        await prisma.$executeRawUnsafe(
          `INSERT INTO public.registry_publications (
              id, country_code, source, edition_number, edition_date,
              edition_url, edition_pdf_url, publication_type, publication_number,
              title, issuing_entity, raw_text_excerpt, raw_text_length,
              ai_summary, ai_classification, ai_relevance_score, ai_keywords,
              status
            ) VALUES ($1::uuid, 'EC', 'manual_search_ingest', $2, now(),
                      $3, $4, $5, $2, $6, 'Búsqueda manual del admin', $7, $8,
                      $9, 'general', 1.0, $10::text[], 'analyzed')`,
          pubId,
          body.editionNumber || null,
          body.sourceUrl,
          body.pdfUrl || null,
          body.publicationType || 'general',
          body.title.slice(0, 500),
          (body.excerpt || `Norma agregada manualmente por admin desde búsqueda: ${body.title}`).slice(0, 8000),
          (body.excerpt || '').length,
          `[Búsqueda manual] ${body.title}. Descargada de: ${body.sourceUrl}`,
          body.title.toLowerCase().split(/\s+/).filter((w) => w.length >= 4).slice(0, 5),
        );

        write('phase', { phase: 'publication-created', label: 'Publicación creada · iniciando pipeline', pct: 20, publicationId: pubId });

        // 2) Llamar ingest con progress callback
        const result = await ingestPublicationToCorpus(pubId, userId, (event, data) => {
          // Re-emitir cada step
          write('step', { step: event, ...data });
        });

        write('done', {
          legalDocId: result.legalDocId,
          chunksCreated: result.chunksCreated,
          embeddingsGenerated: result.embeddingsGenerated,
          embeddingsVectorized: result.embeddingsVectorized,
          notifiedUsers: result.notifiedUsers,
          finishedAt: new Date().toISOString(),
        });

        // 3) Marcar la query original como triggered_ingest=true
        // (opcional, si querysentid se pasara en el body)
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'download-and-ingest failed');
        write('error', { error: e?.message || 'Ingest failed' });
      } finally {
        stopKa();
        try { reply.raw.end(); } catch { /* ignore */ }
      }
      return reply;
    },
  );

  // ─── POST /admin/legal-search/attach-to-case (SSE) ─────────────────
  // Agrega una norma encontrada en la búsqueda a un CASO del usuario:
  // resuelve su texto (corpus interno o descarga externa), crea un
  // Document en el caso y lo vectoriza con el pipeline de documentos de
  // caso. Distinto de download-and-ingest, que va al corpus global —
  // este endpoint NO toca el corpus ni los endpoints existentes.
  fastify.post<{
    Body: {
      caseId: string;
      kind: 'internal' | 'external';
      title: string;
      legalDocId?: string;
      sourceUrl?: string;
      pdfUrl?: string;
    };
  }>(
    '/admin/legal-search/attach-to-case',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const userId = (request.user as any).id;
      const body = request.body || ({} as any);

      if (!body.caseId || !body.kind || !body.title) {
        return reply.code(400).send({ error: 'caseId, kind y title requeridos' });
      }

      // El caso destino debe pertenecer al usuario que hace la búsqueda.
      const ownedCase = await prisma.case.findFirst({
        where: { id: body.caseId, userId },
        select: { id: true, title: true },
      });
      if (!ownedCase) return reply.code(404).send({ error: 'Caso no encontrado' });

      setSseHeaders(request, reply);
      const stopKa = startSseKeepalive(reply);
      const write = (event: string, data: any) => {
        try {
          reply.raw.write(`event: ${event}\n`);
          reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch { /* client gone */ }
      };

      try {
        write('connected', { startedAt: new Date().toISOString() });

        // 1) Resolver el texto de la norma
        write('phase', { phase: 'resolving', label: 'Obteniendo el texto de la norma…', pct: 12 });
        let text = '';
        let provenance = '';

        if (body.kind === 'internal') {
          if (!body.legalDocId) throw new Error('legalDocId requerido para un resultado del corpus');
          const rows = await prisma.$queryRawUnsafe<Array<{ content: string | null }>>(
            `SELECT content FROM public.legal_documents WHERE id = $1::uuid LIMIT 1`,
            body.legalDocId,
          );
          if (rows.length === 0 || !rows[0].content) {
            throw new Error('La norma no se encontró en el corpus');
          }
          text = rows[0].content;
          provenance = 'Corpus jurídico interno';
        } else {
          const fetchUrl = body.pdfUrl || body.sourceUrl;
          if (!fetchUrl) throw new Error('sourceUrl o pdfUrl requerido para un resultado externo');
          write('phase', { phase: 'downloading', label: 'Descargando el documento…', pct: 28 });
          const resp = await fetch(fetchUrl, { redirect: 'follow' });
          if (!resp.ok) throw new Error(`No se pudo descargar el documento (HTTP ${resp.status})`);
          const ctype = (resp.headers.get('content-type') || '').toLowerCase();
          const buf = Buffer.from(await resp.arrayBuffer());
          const isPdf = ctype.includes('pdf') || buf.subarray(0, 5).toString('latin1') === '%PDF-';
          write('phase', { phase: 'extracting', label: 'Extrayendo el texto…', pct: 42 });
          if (isPdf) {
            const ext = await extractText(buf, 'application/pdf', 'norma.pdf');
            text = ext.text || '';
          } else {
            text = stripHtml(buf.toString('utf8'));
          }
          provenance = fetchUrl;
        }

        text = (text || '').trim();
        if (text.length < 40) throw new Error('El documento no contiene texto legible');

        // 2) Crear el Document en el caso (kind 'uploaded' por defecto del esquema)
        write('phase', { phase: 'saving', label: 'Guardando en el expediente…', pct: 55 });
        const header =
          `Fuente: ${provenance}\n` +
          `Incorporado vía Búsqueda Legal IA — ${new Date().toLocaleDateString('es-EC')}.\n\n`;
        const content = header + text;
        const doc = await prisma.document.create({
          data: {
            caseId: body.caseId,
            userId,
            title: body.title.slice(0, 300),
            content,
          },
          select: { id: true },
        });

        // 3) Vectorizar — reusa el pipeline EXISTENTE de documentos de caso
        write('phase', { phase: 'vectorizing', label: 'Vectorizando para el cerebro del caso…', pct: 65 });
        const chunksCreated = await vectorizeDocument(
          doc.id,
          content,
          (msg, extra) => fastify.log.info({ msg, ...extra }, 'attach-to-case'),
          ({ processed, total }) => write('step', {
            step: 'embedding',
            processed,
            total,
            label: `Generando embeddings · ${processed}/${total}`,
            pct: 65 + Math.round((processed / Math.max(total, 1)) * 30),
          }),
        );

        // 4) Re-sintetizar el cerebro del caso (fire-and-forget, no bloquea)
        synthesizeCaseBrain(body.caseId).catch(() => { /* best-effort */ });

        write('done', {
          documentId: doc.id,
          caseId: body.caseId,
          caseTitle: ownedCase.title,
          chunksCreated,
          finishedAt: new Date().toISOString(),
        });
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'attach-to-case failed');
        write('error', { error: e?.message || 'No se pudo agregar la norma al caso' });
      } finally {
        stopKa();
        try { reply.raw.end(); } catch { /* ignore */ }
      }
      return reply;
    },
  );

  // ─── GET /admin/legal-search/international-sources ─────────────────
  // Devuelve catálogo curado de buscadores internacionales y, si se
  // pasa ?q=, las URLs pre-rellenadas para ese query.
  fastify.get<{ Querystring: { q?: string; category?: string } }>(
    '/admin/legal-search/international-sources',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const q = (request.query.q || '').trim();
      const cat = request.query.category;
      const suggestions = q ? suggestInternationalSources(q, cat) : [];
      return reply.send({
        categories: INTERNATIONAL_CATEGORIES,
        suggestions,
        query: q,
      });
    },
  );

  // ─── GET /admin/legal-search/ecuador-sources ───────────────────────
  fastify.get<{ Querystring: { q?: string; type?: string } }>(
    '/admin/legal-search/ecuador-sources',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const q = (request.query.q || '').trim();
      const t = request.query.type;
      const suggestions = q ? suggestEcuadorJudicialSources(q, t) : [];
      return reply.send({
        types: ECUADOR_JUDICIAL_TYPES,
        suggestions,
        query: q,
      });
    },
  );

  // ─── GET /admin/legal-search/recent-queries ────────────────────────
  // Últimas búsquedas del usuario (para historial / sugerencias)
  fastify.get(
    '/admin/legal-search/recent-queries',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const userId = (request.user as any).id;
      const rows = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT id, query_text, reformulated_text, scope,
                internal_results, external_results, total_results,
                ai_reformulation_used, created_at
           FROM public.legal_search_queries
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 20`,
        userId,
      );
      return reply.send({ queries: rows });
    },
  );
}
