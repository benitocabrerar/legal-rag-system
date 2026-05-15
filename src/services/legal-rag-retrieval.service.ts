/**
 * Legal RAG Retrieval — wrapper sobre el RPC search_legal_chunks de
 * Supabase. Devuelve los chunks normativos más relevantes para una
 * pregunta dada, listos para inyectar en el system prompt de un chat.
 *
 * Es el complemento natural a `case.documents`: el caso aporta los
 * hechos, este retrieval aporta la normativa aplicable.
 *
 * Uso típico:
 *   const ctx = await retrieveLegalContextForChat(query, { caseId, limit: 8 });
 *   if (ctx.formattedPrompt) systemPrompt += `\n\n${ctx.formattedPrompt}`;
 */
import { getAiClient } from '../lib/ai-client.js';
import { serviceRoleClient } from '../lib/supabase.js';
import { resolveDomainCountry } from './corpus/corpus-domains.service.js';

export interface RetrievedLegalChunk {
  content: string;
  documentId: string;
  normTitle: string;
  normType: string | null;
  legalHierarchy: string | null;
  publicationDate: string | null;
  publicationNumber: string | null;
  similarity: number;
}

export interface LegalRetrievalResult {
  chunks: RetrievedLegalChunk[];
  formattedPrompt: string | null;
  citationsList: string | null;
  totalChunks: number;
  durationMs: number;
}

export interface RetrievalOptions {
  /** Cuántos chunks máximos retornar. Default 8. */
  limit?: number;
  /** Filtrar a un norm_type específico (ej. 'ORGANIC_LAW') */
  filterNormType?: string | null;
  /** Filtrar por país (ej. 'EC') */
  filterCountryCode?: string | null;
  /**
   * Acotar la búsqueda a un dominio de corpus (ej. 'ec-general',
   * 'us-immigration'). Se resuelve a su país y tiene prioridad sobre
   * filterCountryCode. Aísla el corpus EC del corpus US.
   */
  filterCorpusDomain?: string | null;
  /** Para logs */
  caseId?: string;
}

/**
 * Búsqueda híbrida (semantic + FTS RRF) sobre el corpus legal.
 */
export async function retrieveLegalContextForChat(
  query: string,
  opts: RetrievalOptions = {},
): Promise<LegalRetrievalResult> {
  const startedAt = Date.now();
  const limit = Math.min(Math.max(opts.limit ?? 8, 3), 15);

  // 1) Embedding del query
  let queryEmbedding: number[] = [];
  try {
    const ai = await getAiClient();
    const eResp: any = await ai.embeddings.create({
      input: query.slice(0, 2000),
      dimensions: 1536,
    });
    queryEmbedding = eResp.data?.[0]?.embedding ?? [];
  } catch {
    // No-op — si falla embedding, devolvemos vacío (no rompemos el chat)
    return { chunks: [], formattedPrompt: null, citationsList: null, totalChunks: 0, durationMs: Date.now() - startedAt };
  }

  if (queryEmbedding.length !== 1536) {
    return { chunks: [], formattedPrompt: null, citationsList: null, totalChunks: 0, durationMs: Date.now() - startedAt };
  }

  // 2) Dominio de corpus → país. El RPC acota por país; para los dominios
  //    actuales (EC vs US) el país discrimina exactamente el corpus.
  let effectiveCountryCode = opts.filterCountryCode ?? null;
  if (opts.filterCorpusDomain) {
    try {
      const resolved = await resolveDomainCountry(opts.filterCorpusDomain);
      if (resolved) effectiveCountryCode = resolved;
    } catch {
      // Si no se puede resolver, caemos al filtro por país (o sin filtro).
    }
  }

  // 3) RPC híbrido
  let rows: any[] = [];
  try {
    const sb = serviceRoleClient();
    const { data, error } = await sb.rpc('search_legal_chunks', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      query_text: query.slice(0, 500),
      match_count: limit,
      semantic_weight: 1.0,
      keyword_weight: 1.0,
      filter_doc_id: null,
      filter_norm_type: opts.filterNormType ?? null,
      filter_jurisdiction: null,
      filter_country_code: effectiveCountryCode,
    });
    if (error) {
      return { chunks: [], formattedPrompt: null, citationsList: null, totalChunks: 0, durationMs: Date.now() - startedAt };
    }
    rows = (data || []) as any[];
  } catch {
    return { chunks: [], formattedPrompt: null, citationsList: null, totalChunks: 0, durationMs: Date.now() - startedAt };
  }

  const chunks: RetrievedLegalChunk[] = rows.map((r) => ({
    content: r.content || '',
    documentId: r.legal_document_id,
    normTitle: r.norm_title || r.title || 'Norma sin título',
    normType: r.norm_type || null,
    legalHierarchy: r.legal_hierarchy || null,
    publicationDate: r.publication_date ? new Date(r.publication_date).toISOString().slice(0, 10) : null,
    publicationNumber: r.publication_number || null,
    similarity: Number(r.rrf_score ?? r.semantic_score ?? 0),
  }));

  if (chunks.length === 0) {
    return { chunks: [], formattedPrompt: null, citationsList: null, totalChunks: 0, durationMs: Date.now() - startedAt };
  }

  // 4) Formatear para inyección en system prompt
  // Cada chunk: título de norma + identificadores + extracto. Truncamos
  // a 1500 chars por chunk para no explotar el contexto.
  const formatted = chunks.map((c, i) => {
    const hier = c.legalHierarchy ? ` (${c.legalHierarchy.replace(/_/g, ' ').toLowerCase()})` : '';
    const idLine = [
      c.publicationNumber ? `Nº ${c.publicationNumber}` : null,
      c.publicationDate ? `publicada ${c.publicationDate}` : null,
    ].filter(Boolean).join(' · ');
    return `[Norma ${i + 1}]${hier} ${c.normTitle}${idLine ? ` — ${idLine}` : ''}\n${c.content.replace(/\s+/g, ' ').slice(0, 1500)}`;
  }).join('\n\n');

  // 5) Lista compacta para que el LLM tenga referencia explícita de qué citar
  const citationsList = chunks
    .map((c, i) => `[Norma ${i + 1}] ${c.normTitle}${c.publicationNumber ? ` Nº ${c.publicationNumber}` : ''}`)
    .join('\n');

  return {
    chunks,
    formattedPrompt: `=== NORMATIVA APLICABLE (extractos del corpus legal de Ecuador) ===\n${formatted}\n\n=== ÍNDICE DE NORMAS CITABLES ===\n${citationsList}`,
    citationsList,
    totalChunks: chunks.length,
    durationMs: Date.now() - startedAt,
  };
}
