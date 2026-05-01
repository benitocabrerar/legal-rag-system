/**
 * Ruta unificada de búsqueda RAG vía Supabase RPC search_legal_chunks.
 * Feature-flag: SEARCH_BACKEND='rpc' la habilita.
 *
 * Reemplaza los 3 paths de retrieval existentes:
 *   - routes/query.ts                              (cosine en JS)
 *   - services/orchestration/unified-search-...    (ILIKE)
 *   - services/orchestration/queryRouter.ts        (raw SQL roto)
 *
 * Llama a la función SQL `public.search_legal_chunks(...)` definida en
 * supabase/migrations/0005_hybrid_search_rpc.sql, que ejecuta:
 *   semantic (HNSW) ⊕ keyword (FTS spanish) ⊕ Reciprocal Rank Fusion
 *
 * El RLS opera con el JWT del request: `userScopedClient(accessToken)`.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import OpenAI from 'openai';
import { userScopedClient } from '../lib/supabase.js';
import { requireSupabaseAuth } from '../middleware/auth-supabase.js';

const searchSchema = z.object({
  query: z.string().min(2).max(500),
  matchCount: z.number().int().min(1).max(50).default(20),
  semanticWeight: z.number().min(0).max(2).default(1.0),
  keywordWeight: z.number().min(0).max(2).default(1.0),
  filterDocId: z.string().uuid().optional(),
  filterNormType: z.string().optional(),
  filterJurisdiction: z.string().optional(),
  // ISO-3166 alpha-2 (EC, CO, MX...). Si NULL, la RPC usa users.preferred_country_code o 'EC'.
  filterCountryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
});

export async function searchRpcRoutes(fastify: FastifyInstance) {
  if (!process.env.OPENAI_API_KEY) {
    fastify.log.warn('OPENAI_API_KEY ausente — search-rpc deshabilitado');
    return;
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  fastify.post(
    '/search/legal',
    { preHandler: requireSupabaseAuth },
    async (request, reply) => {
      const body = searchSchema.parse(request.body);

      // 1) Embedding del query con el modelo único post-migración
      const embedResp = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: body.query,
        dimensions: 1536,
      });
      const queryEmbedding = embedResp.data[0]?.embedding;
      if (!queryEmbedding) {
        return reply.code(500).send({ error: 'embedding vacío' });
      }

      // 2) RPC bajo el JWT del usuario (RLS aplicada)
      const supabase = userScopedClient(request.supabaseAccessToken!);
      const { data, error } = await supabase.rpc('search_legal_chunks', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        query_text: body.query,
        match_count: body.matchCount,
        semantic_weight: body.semanticWeight,
        keyword_weight: body.keywordWeight,
        filter_doc_id: body.filterDocId ?? null,
        filter_norm_type: body.filterNormType ?? null,
        filter_jurisdiction: body.filterJurisdiction ?? null,
        filter_country_code: body.filterCountryCode ?? null,
      });

      if (error) {
        request.log.error({ error }, 'search_legal_chunks RPC failed');
        return reply.code(500).send({ error: error.message });
      }

      return {
        query: body.query,
        results: data ?? [],
        engine: 'rpc-rrf-hnsw',
        model: 'text-embedding-3-small',
      };
    }
  );
}
