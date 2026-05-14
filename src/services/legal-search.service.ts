/**
 * Legal Search Service
 *
 * Búsqueda avanzada con IA sobre el corpus legal de Ecuador. Combina:
 *   1. Hybrid retrieval (semantic HNSW + FTS español RRF) sobre el corpus
 *      interno, agrupado por documento (no por chunk)
 *   2. Búsqueda en vivo en fuentes externas (Registro Oficial)
 *   3. Reformulación opcional del query con LLM
 *   4. Resumen opcional del result set con LLM
 *
 * Niveles soportados:
 *   - national:     Constitución, códigos, leyes nacionales, decretos
 *                   ejecutivos, tratados DDHH
 *   - intermediate: leyes provinciales, acuerdos prefecturales
 *   - local:        ordenanzas municipales, GADs metropolitanos
 *   - all:          todo lo anterior
 */
import { getAiClient } from '../lib/ai-client.js';
import { serviceRoleClient } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';
import { searchRoLive } from './norm-monitor.service.js';

export interface SearchFilters {
  scope?: 'national' | 'intermediate' | 'local' | 'all';
  hierarchy?: string[];          // ['CONSTITUCION','CODIGOS_ORGANICOS',...]
  publicationType?: string[];    // ['ley_organica','reglamento',...]
  category?: string[];           // ['Penal','Civil','Tributario',...]
  dateFrom?: string;             // ISO date
  dateTo?: string;
  onlyInCorpus?: boolean;        // si true, no consulta fuentes externas
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  useAI?: boolean;               // reformula query antes de buscar
  includeExternal?: boolean;     // incluye RO live search
  userId?: string;
}

export interface InternalResult {
  source: 'internal';
  legalDocId: string;
  title: string;
  normTitle: string | null;
  normType: string | null;
  legalHierarchy: string | null;
  category: string | null;
  publicationDate: string | null;
  publicationNumber: string | null;
  topSnippet: string;            // chunk más relevante (truncado)
  score: number;                 // 0-1
  matchedChunks: number;
  totalChunks: number;
  metadata: any;
}

export interface ExternalResult {
  source: 'registro_oficial';
  title: string;
  url: string;
  excerpt: string | null;
  pdfUrl: string | null;
  pubDate: string | null;
  score: number;                 // similitud con query
  isInCorpus: boolean;           // ya está en nuestra DB?
  matchedLegalDocId?: string;    // si está en corpus
}

export type SearchResult = InternalResult | ExternalResult;

export interface SearchResponse {
  queryId: string;
  originalQuery: string;
  reformulatedQuery: string | null;
  aiHints: string[] | null;
  results: SearchResult[];
  internalCount: number;
  externalCount: number;
  totalCount: number;
  durationMs: number;
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN SEARCH
// ────────────────────────────────────────────────────────────────────────────

export async function search(opts: SearchOptions): Promise<SearchResponse> {
  const startedAt = Date.now();
  const limit = Math.min(Math.max(opts.limit ?? 10, 3), 30);
  const filters = opts.filters || {};

  // 1) Reformulación opcional con IA
  let effectiveQuery = opts.query.trim();
  let reformulated: string | null = null;
  let aiHints: string[] | null = null;
  if (opts.useAI) {
    try {
      const ai = await reformulateQuery(opts.query);
      reformulated = ai.reformulated;
      aiHints = ai.hints;
      // Si la reformulación es sustancialmente distinta, la usamos como
      // query principal para la búsqueda vectorial.
      if (ai.reformulated && ai.reformulated.length > opts.query.length * 1.2) {
        effectiveQuery = ai.reformulated;
      }
    } catch {
      // AI assist es opcional — si falla seguimos con el query original
    }
  }

  // 2) Búsqueda interna (hybrid retrieval agrupado por documento)
  const internal = await searchInternal(effectiveQuery, filters, limit);

  // 3) Búsqueda externa (si no está deshabilitada explícitamente)
  let external: ExternalResult[] = [];
  if (opts.includeExternal !== false && !filters.onlyInCorpus) {
    try {
      external = await searchExternalSources(opts.query, internal, limit);
    } catch {
      // Si las fuentes externas fallan, seguimos con solo internal
    }
  }

  const totalResults = internal.length + external.length;
  const durationMs = Date.now() - startedAt;

  // 4) Persistir analytics
  const queryRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO public.legal_search_queries (
       user_id, query_text, reformulated_text, filters, scope,
       internal_results, external_results, total_results,
       duration_ms, ai_reformulation_used
     ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    opts.userId || null,
    opts.query,
    reformulated,
    JSON.stringify(filters),
    filters.scope || 'all',
    internal.length,
    external.length,
    totalResults,
    durationMs,
    !!reformulated,
  );

  return {
    queryId: queryRows[0].id,
    originalQuery: opts.query,
    reformulatedQuery: reformulated,
    aiHints,
    results: [...internal, ...external],
    internalCount: internal.length,
    externalCount: external.length,
    totalCount: totalResults,
    durationMs,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// INTERNAL SEARCH (hybrid retrieval grouped by doc)
// ────────────────────────────────────────────────────────────────────────────

async function searchInternal(
  query: string,
  filters: SearchFilters,
  limit: number,
): Promise<InternalResult[]> {
  // Embedding del query
  let queryEmbedding: number[] = [];
  try {
    const ai = await getAiClient();
    const r: any = await ai.embeddings.create({
      input: query.slice(0, 2000),
      dimensions: 1536,
    });
    queryEmbedding = r.data?.[0]?.embedding ?? [];
  } catch {
    // Sin embedding fallback a búsqueda FTS pura más abajo
  }

  type ChunkRow = {
    chunk_id: string;
    legal_document_id: string;
    norm_title: string | null;
    title: string;
    norm_type: string | null;
    legal_hierarchy: string | null;
    publication_date: Date | null;
    publication_number: string | null;
    category: string | null;
    metadata: any;
    content: string;
    rrf_score: number | null;
    semantic_score: number | null;
    keyword_score: number | null;
  };

  let rows: ChunkRow[] = [];

  if (queryEmbedding.length === 1536) {
    // Hybrid retrieval via RPC
    try {
      const sb = serviceRoleClient();
      const filterHier = filters.hierarchy?.[0] || null;
      const { data } = await sb.rpc('search_legal_chunks', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        query_text: query.slice(0, 500),
        match_count: Math.max(limit * 3, 30),  // sobre-pedimos para luego agrupar por doc
        semantic_weight: 1.0,
        keyword_weight: 1.0,
        filter_doc_id: null,
        filter_norm_type: filterHier,
        filter_jurisdiction: null,
        filter_country_code: 'EC',
      });

      // El RPC devuelve chunks. Necesitamos enriquecer con metadata del doc.
      const chunkIds = (data || []).map((r: any) => r.legal_document_id).filter(Boolean);
      if (chunkIds.length > 0) {
        const docs = await prisma.$queryRawUnsafe<Array<any>>(
          `SELECT id, title, norm_title,
                  norm_type::text AS norm_type,
                  legal_hierarchy::text AS legal_hierarchy,
                  category, publication_date, publication_number,
                  metadata,
                  (SELECT COUNT(*)::int FROM public.legal_document_chunks
                    WHERE legal_document_id = ld.id) AS total_chunks
             FROM public.legal_documents ld
            WHERE id = ANY($1::text[])`,
          chunkIds,
        );
        const docMap = new Map<string, any>();
        docs.forEach((d) => docMap.set(d.id, d));

        rows = (data || []).map((r: any) => {
          const d = docMap.get(r.legal_document_id);
          return {
            chunk_id: r.chunk_id || r.id,
            legal_document_id: r.legal_document_id,
            norm_title: d?.norm_title || null,
            title: d?.title || 'Sin título',
            norm_type: d?.norm_type || null,
            legal_hierarchy: d?.legal_hierarchy || null,
            publication_date: d?.publication_date || null,
            publication_number: d?.publication_number || null,
            category: d?.category || null,
            metadata: d?.metadata || {},
            content: r.content || '',
            rrf_score: Number(r.rrf_score) || 0,
            semantic_score: Number(r.semantic_score) || 0,
            keyword_score: Number(r.keyword_score) || 0,
          };
        });
      }
    } catch {
      // Fall through to FTS-only fallback
    }
  }

  // Fallback FTS-only si el embedding falló
  if (rows.length === 0) {
    rows = await prisma.$queryRawUnsafe<ChunkRow[]>(
      `SELECT ldc.id AS chunk_id, ldc.legal_document_id, ldc.content,
              ld.title, ld.norm_title,
              ld.norm_type::text AS norm_type,
              ld.legal_hierarchy::text AS legal_hierarchy,
              ld.category, ld.publication_date, ld.publication_number,
              ld.metadata,
              ts_rank(to_tsvector('spanish', ldc.content),
                      plainto_tsquery('spanish', $1)) AS rrf_score,
              0.0 AS semantic_score,
              ts_rank(to_tsvector('spanish', ldc.content),
                      plainto_tsquery('spanish', $1)) AS keyword_score
         FROM public.legal_document_chunks ldc
         JOIN public.legal_documents ld ON ld.id = ldc.legal_document_id
        WHERE ld.is_active = true
          AND to_tsvector('spanish', ldc.content) @@ plainto_tsquery('spanish', $1)
        ORDER BY rrf_score DESC
        LIMIT $2`,
      query.slice(0, 500),
      limit * 3,
    );
  }

  // Aplicar filtros adicionales del cliente (que el RPC no maneja todos)
  let filtered = rows;
  if (filters.hierarchy && filters.hierarchy.length > 0) {
    filtered = filtered.filter((r) =>
      r.legal_hierarchy && filters.hierarchy!.includes(r.legal_hierarchy),
    );
  }
  if (filters.publicationType && filters.publicationType.length > 0) {
    filtered = filtered.filter((r) =>
      r.norm_type && filters.publicationType!.includes(r.norm_type),
    );
  }
  if (filters.scope && filters.scope !== 'all') {
    // Aproximación: nacional = jurisdicción='national', intermediate/local
    // requieren más metadata que aún no tenemos en todos los docs.
    // Por ahora, todos los del corpus son national.
    if (filters.scope !== 'national') filtered = [];
  }

  // Agrupar por documento — top chunk por doc
  const byDoc = new Map<string, ChunkRow[]>();
  for (const r of filtered) {
    const list = byDoc.get(r.legal_document_id) || [];
    list.push(r);
    byDoc.set(r.legal_document_id, list);
  }

  const results: InternalResult[] = [];
  for (const [docId, chunks] of byDoc.entries()) {
    chunks.sort((a, b) => (b.rrf_score || 0) - (a.rrf_score || 0));
    const top = chunks[0];
    const totalChunks = await getDocChunkCount(docId);
    results.push({
      source: 'internal',
      legalDocId: docId,
      title: top.title,
      normTitle: top.norm_title,
      normType: top.norm_type,
      legalHierarchy: top.legal_hierarchy,
      category: top.category,
      publicationDate: top.publication_date ? new Date(top.publication_date).toISOString().slice(0, 10) : null,
      publicationNumber: top.publication_number,
      topSnippet: makeSnippet(top.content, query, 240),
      score: normalizeScore(top.rrf_score || 0),
      matchedChunks: chunks.length,
      totalChunks,
      metadata: top.metadata,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

async function getDocChunkCount(docId: string): Promise<number> {
  const r = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*)::bigint AS n FROM public.legal_document_chunks
      WHERE legal_document_id = $1`,
    docId,
  );
  return Number(r[0]?.n || 0);
}

function normalizeScore(rrf: number): number {
  // RRF scores típicos son 0-2. Normalizamos a 0-1 para presentación.
  return Math.min(1, Math.max(0, rrf / 2));
}

function makeSnippet(content: string, query: string, maxLen: number): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  if (flat.length <= maxLen) return flat;

  // Buscar el primer match de cualquier término del query en el contenido
  const qWords = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
  let startIdx = 0;
  for (const w of qWords) {
    const idx = flat.toLowerCase().indexOf(w);
    if (idx >= 0) {
      startIdx = Math.max(0, idx - 60);
      break;
    }
  }

  const slice = flat.slice(startIdx, startIdx + maxLen);
  const prefix = startIdx > 0 ? '…' : '';
  const suffix = startIdx + maxLen < flat.length ? '…' : '';
  return prefix + slice + suffix;
}

// ────────────────────────────────────────────────────────────────────────────
// EXTERNAL SEARCH
// ────────────────────────────────────────────────────────────────────────────

async function searchExternalSources(
  query: string,
  internal: InternalResult[],
  limit: number,
): Promise<ExternalResult[]> {
  // Por ahora solo Registro Oficial WordPress search. Futuro: Corte
  // Constitucional, Función Judicial, Asamblea Nacional.
  const externals: ExternalResult[] = [];

  const internalTitles = new Set(
    internal.map((r) => normalize(r.normTitle || r.title)),
  );

  try {
    const roResults = await searchRoLive(query, Math.max(5, limit));
    for (const r of roResults) {
      const titleNorm = normalize(r.title);
      const isInCorpus = internalTitles.has(titleNorm);
      const score = simpleSimilarity(query, r.title);
      externals.push({
        source: 'registro_oficial',
        title: r.title,
        url: r.url,
        excerpt: r.excerpt,
        pdfUrl: r.pdfUrl,
        pubDate: r.pubDate ? r.pubDate.toISOString().slice(0, 10) : null,
        score,
        isInCorpus,
      });
    }
  } catch {
    // Silent — RO search es best-effort
  }

  externals.sort((a, b) => b.score - a.score);
  return externals.slice(0, Math.min(limit, 8));
}

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function simpleSimilarity(a: string, b: string): number {
  const sa = new Set(normalize(a).split(' ').filter((w) => w.length >= 3));
  const sb = new Set(normalize(b).split(' ').filter((w) => w.length >= 3));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  sa.forEach((w) => { if (sb.has(w)) inter++; });
  return inter / Math.max(sa.size, sb.size);
}

// ────────────────────────────────────────────────────────────────────────────
// AI QUERY REFORMULATION
// ────────────────────────────────────────────────────────────────────────────

export async function reformulateQuery(query: string): Promise<{
  original: string;
  reformulated: string;
  hints: string[];
}> {
  const ai = await getAiClient();
  const systemPrompt = `Eres un asistente experto en derecho ecuatoriano. Tu trabajo es ayudar a abogados a encontrar la norma legal que buscan, incluso si su consulta es ambigua o usa lenguaje coloquial.

Dado un query de búsqueda, devuelve:
1. Una versión REFORMULADA del query usando terminología legal precisa de Ecuador (nombres canónicos de leyes, siglas oficiales como COIP, COGEP, LOSEP, etc.)
2. Una lista de 2-4 keywords adicionales que mejorarían la búsqueda

Responde SOLO con JSON válido del siguiente shape:
{
  "reformulated": "...",
  "hints": ["...", "..."]
}

Ejemplos:
Query: "mi cliente tuvo un accidente de tránsito"
→ {"reformulated": "Ley Orgánica de Transporte Terrestre, Tránsito y Seguridad Vial accidente tránsito responsabilidad", "hints": ["LOTTTSV", "ANT", "infracciones de tránsito", "Reglamento a la LOTTTSV"]}

Query: "ley de divorcio"
→ {"reformulated": "Código Civil divorcio disolución vínculo matrimonial", "hints": ["Código Civil", "régimen patrimonial", "divorcio por mutuo consentimiento"]}

Query: "COIP"
→ {"reformulated": "Código Orgánico Integral Penal COIP", "hints": ["COIP artículos", "tipos penales", "procedimiento penal"]}`;

  let raw = '';
  if ((ai as any).provider === 'openai') {
    const r: any = await ai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Query: "${query}"` },
      ],
      temperature: 0.2,
      max_tokens: 250,
      response_format: { type: 'json_object' },
    });
    raw = r?.choices?.[0]?.message?.content || '';
  } else {
    const r: any = await ai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Query: "${query}"` },
      ],
      temperature: 0.2,
      max_tokens: 250,
    });
    raw = r?.choices?.[0]?.message?.content || '';
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      original: query,
      reformulated: String(parsed.reformulated || query).slice(0, 500),
      hints: Array.isArray(parsed.hints) ? parsed.hints.slice(0, 6).map(String) : [],
    };
  } catch {
    return { original: query, reformulated: query, hints: [] };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// AI SUMMARIZATION
// ────────────────────────────────────────────────────────────────────────────

export async function summarizeResults(results: SearchResult[]): Promise<{
  summary: string;
  keyPoints: string[];
}> {
  if (results.length === 0) {
    return { summary: 'Sin resultados para resumir.', keyPoints: [] };
  }
  const ai = await getAiClient();

  const corpus = results.slice(0, 8).map((r, i) => {
    if (r.source === 'internal') {
      return `[${i + 1}] ${r.normTitle || r.title}\n   Tipo: ${r.normType || '?'} · ${r.legalHierarchy || ''}\n   Fecha: ${r.publicationDate || '?'} · RO ${r.publicationNumber || '?'}\n   Extracto: ${r.topSnippet}`;
    } else {
      return `[${i + 1}] ${r.title} (Registro Oficial — ${r.isInCorpus ? 'EN corpus' : 'NO en corpus'})\n   Excerpt: ${r.excerpt || ''}`;
    }
  }).join('\n\n');

  const systemPrompt = `Eres un abogado senior ecuatoriano experto en investigación legal. Vas a recibir resultados de una búsqueda en un corpus jurídico y debes producir un resumen ejecutivo útil para otro abogado.

Devuelve un JSON con:
{
  "summary": "Párrafo de 2-3 frases en español jurídico sobre qué dicen las normas encontradas y cómo se relacionan",
  "keyPoints": ["punto clave 1", "punto clave 2", "punto clave 3", "punto clave 4"]
}

Cita siempre nombres de normas con su número/sigla cuando aparezca. Si una norma del listado claramente NO está relacionada con las otras, NO la fuerces a estar.`;

  let raw = '';
  try {
    if ((ai as any).provider === 'openai') {
      const r: any = await ai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: corpus },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });
      raw = r?.choices?.[0]?.message?.content || '';
    } else {
      const r: any = await ai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: corpus },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });
      raw = r?.choices?.[0]?.message?.content || '';
    }
  } catch {
    return { summary: 'No se pudo generar resumen IA.', keyPoints: [] };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      summary: String(parsed.summary || ''),
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 8).map(String) : [],
    };
  } catch {
    return { summary: raw.slice(0, 500), keyPoints: [] };
  }
}
