import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { getUserCountryContext, jurisdictionPromptFragment } from '../lib/country-context.js';
import { getAiClient } from '../lib/ai-client.js';
import { serviceRoleClient } from '../lib/supabase.js';
import { logActivityAsync } from '../lib/audit.js';

const querySchema = z.object({
  caseId: z.string().uuid(),
  query: z.string().min(1),
  maxResults: z.number().min(1).max(20).default(10),
});

// Helper function to preprocess query and extract article references
function preprocessQuery(query: string): {
  normalizedQuery: string;
  articleNumbers: string[];
  searchTerms: string[]
} {
  const articleNumbers: string[] = [];
  const searchTerms: string[] = [query]; // Always include original query

  // Patterns to detect article mentions in different formats
  const patterns = [
    /art(?:í|i)culo\s*(\d+)/gi,  // "artículo 100" or "articulo 100"
    /art\.\s*(\d+)/gi,            // "art. 100"
    /art\s+(\d+)/gi,              // "art 100"
    /art\.(\d+)/gi,               // "art.100"
  ];

  let normalizedQuery = query;

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(query)) !== null) {
      const articleNum = match[1];
      if (!articleNumbers.includes(articleNum)) {
        articleNumbers.push(articleNum);
        // Add standardized format to search terms
        searchTerms.push(`Art. ${articleNum}`);
        searchTerms.push(`Artículo ${articleNum}`);
      }
    }
  });

  return { normalizedQuery, articleNumbers, searchTerms };
}

export async function queryRoutes(fastify: FastifyInstance) {
  // RAG Query endpoint - Search documents and generate answer
  fastify.post('/query', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const body = querySchema.parse(request.body);
      const userId = (request.user as any).id;

      // Verify case belongs to user
      const caseDoc = await prisma.case.findFirst({
        where: {
          id: body.caseId,
          userId,
        },
      });

      if (!caseDoc) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      // Preprocess query to detect article references
      const { normalizedQuery, articleNumbers, searchTerms } = preprocessQuery(body.query);

      // Log detected articles for debugging
      if (articleNumbers.length > 0) {
        fastify.log.info(`Detected article references: ${articleNumbers.join(', ')}`);
        fastify.log.info(`Expanded search terms: ${searchTerms.join(', ')}`);
      }

      // Automatically increase maxResults when articles are detected
      // to ensure we find the specific article chunk even if it has lower similarity
      let effectiveMaxResults = body.maxResults;
      if (articleNumbers.length > 0 && body.maxResults < 20) {
        effectiveMaxResults = 20;
        fastify.log.info(`Increased maxResults from ${body.maxResults} to ${effectiveMaxResults} for article search`);
      }

      // === RAG retrieval — vía RPC híbrida (semantic + keyword RRF) ===
      //
      // Antes esta ruta cargaba 1000+ legal_document_chunks en memoria y
      // calculaba cosine en JS, lo que causaba OOM con el corpus actual (36k+
      // chunks). Ahora usamos el RPC `search_legal_chunks` (HNSW + FTS) que
      // ya está optimizado y devuelve solo los top N relevantes.
      const aiClient = await getAiClient();

      // 1) Embedding del query (modelo configurado por admin)
      let queryEmbedding: number[] = [];
      try {
        const expanded = searchTerms.join('\n');
        const eResp: any = await aiClient.embeddings.create({
          input: expanded.slice(0, 2000),
          dimensions: 1536,
        });
        queryEmbedding = eResp.data?.[0]?.embedding ?? [];
      } catch (e: any) {
        fastify.log.warn({ err: e?.message }, 'embedding falló, sigue sin RAG');
      }

      // 2) Legal chunks vía RPC (top 10) — solo si tenemos embedding
      type RetrievedChunk = {
        content: string;
        documentId: string;
        title: string;
        source: 'legal' | 'case';
        similarity: number;
        normType?: string;
        legalHierarchy?: string;
        chunkIndex: number;
      };
      const legalChunks: RetrievedChunk[] = [];
      if (queryEmbedding.length === 1536) {
        try {
          const sb = serviceRoleClient();
          const { data } = await sb.rpc('search_legal_chunks', {
            query_embedding: `[${queryEmbedding.join(',')}]`,
            query_text: body.query.slice(0, 500),
            match_count: Math.min(effectiveMaxResults, 10),
            semantic_weight: 1.0,
            keyword_weight: 1.0,
            filter_doc_id: null,
            filter_norm_type: null,
            filter_jurisdiction: null,
            filter_country_code: null,
          });
          for (const row of (data || []) as any[]) {
            legalChunks.push({
              content: row.content || '',
              documentId: row.legal_document_id,
              title: row.norm_title || 'Sin título',
              source: 'legal',
              similarity: Number(row.rrf_score ?? 0),
              chunkIndex: row.semantic_rank ?? 0,
            });
          }
        } catch (e: any) {
          fastify.log.warn({ err: e?.message }, 'RPC search_legal_chunks falló');
        }
      }

      // 3) Case chunks — cargar SOLO los del caso (mucho menos volumen)
      type CaseChunkRow = { id: string; content: string; chunk_index: number; document_id: string; doc_title: string };
      let caseChunks: RetrievedChunk[] = [];
      try {
        const rows = await prisma.$queryRawUnsafe<CaseChunkRow[]>(
          `SELECT dc.id, dc.content, dc.chunk_index, dc.document_id, d.title AS doc_title
             FROM public.document_chunks dc
             JOIN public.documents d ON d.id = dc.document_id
            WHERE d.case_id = $1
              AND dc.content IS NOT NULL
            ORDER BY dc.chunk_index
            LIMIT 200`,
          body.caseId,
        );
        // Para case chunks usamos similaridad por keyword overlap simple (no hay RPC para case)
        const queryLower = body.query.toLowerCase();
        caseChunks = rows.map((r: CaseChunkRow) => {
          const contentLower = r.content.toLowerCase();
          const overlap = searchTerms.reduce((acc, t) => acc + (contentLower.includes(t.toLowerCase()) ? 1 : 0), 0);
          const sim = overlap / Math.max(searchTerms.length, 1);
          return {
            content: r.content,
            documentId: r.document_id,
            title: r.doc_title,
            source: 'case' as const,
            similarity: sim || (contentLower.includes(queryLower) ? 0.5 : 0),
            chunkIndex: r.chunk_index ?? 0,
          };
        });
      } catch (e: any) {
        fastify.log.warn({ err: e?.message }, 'case chunks load falló');
      }

      // 4) Fusionar y tomar top N global
      const topChunks = [...legalChunks, ...caseChunks]
        .filter((c) => c.similarity > 0 || legalChunks.length === 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, effectiveMaxResults);

      const allChunks = [...legalChunks, ...caseChunks];

      // Build context from top chunks, indicating source
      const context = topChunks
        .map((chunk) => {
          const sourceLabel = chunk.source === 'legal'
            ? `📚 Legal Library: ${chunk.title}`
            : `📄 Case Document: ${chunk.title}`;
          return `[${sourceLabel}, Section ${chunk.chunkIndex + 1}]\n${chunk.content}`;
        })
        .join('\n\n---\n\n');

      // Generate answer using GPT-4
      // If no documents are available, use general legal assistant mode
      const hasDocuments = allChunks.length > 0;

      // Resolver contexto jurisdiccional del usuario
      const countryCtx = await getUserCountryContext(userId);
      const jurisdictionPrefix = jurisdictionPromptFragment(countryCtx, 'es');

      const systemPrompt = hasDocuments
        ? `${jurisdictionPrefix}
You have access to TWO sources of information:
1. 📚 Legal Library: Official legal documents from ${countryCtx.nameEn} (Constitution, laws, codes, regulations)
2. 📄 Case Documents: Specific documents uploaded by the user for this case

Use the provided context to answer the user's question accurately.
When citing information, always specify which source you're using (Legal Library vs Case Document).
If the context doesn't contain enough information to answer the question, say so clearly.
Always respond in Spanish unless the user asks in English.
Provide specific article numbers and legal references when citing from the Legal Library.`
        : `${jurisdictionPrefix}
Answer the user's legal questions to the best of your ability in Spanish.
Provide general legal information, principles, and guidance based on ${countryCtx.nameEn}'s law.
Note: The user can ask about specific laws and the system will search the legal database.
Always clarify that your answers are general legal information and not specific legal advice.`;

      const userPrompt = hasDocuments
        ? `Context from case documents:\n\n${context}\n\n---\n\nQuestion: ${body.query}\n\nPlease provide a detailed answer based on the context above.`
        : `Question: ${body.query}\n\nPlease provide a helpful answer with general legal information and guidance.`;

      // Usamos el aiClient definido antes (Claude Opus 4.7 por default,
      // configurable por admin). max_tokens generoso para respuestas legales
      // sustanciales.
      const completion = await aiClient.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2500,
      });
      const answer = completion.choices?.[0]?.message?.content ?? '';

      // Format source documents
      const sources = topChunks.map((chunk) => ({
        documentId: chunk.documentId,
        documentTitle: chunk.title,
        chunkIndex: chunk.chunkIndex,
        similarity: chunk.similarity,
        content: chunk.content.substring(0, 200) + '...',
        source: chunk.source,
        ...(chunk.source === 'legal' && (chunk as any).normType ? {
          normType: (chunk as any).normType,
          legalHierarchy: (chunk as any).legalHierarchy,
        } : {}),
      }));

      logActivityAsync(userId, 'CHAT_QUERY', 'case', body.caseId, {
        caseId: body.caseId,
        query: body.query.slice(0, 200),
        sourcesUsed: sources.length,
        legalChunks: legalChunks.length,
        caseChunks: caseChunks.length,
      });

      return reply.send({
        answer,
        sources,
        query: body.query,
        caseId: body.caseId,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error({ err: error?.message, stack: error?.stack }, 'query handler crash');
      return reply.code(500).send({ error: 'Internal server error', detail: error?.message });
    }
  });

  // Get query history for a case
  fastify.get('/query/history/:caseId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { caseId } = request.params as { caseId: string };
      const userId = (request.user as any).id;
      const { limit = 20, offset = 0 } = request.query as any;

      // Verify case belongs to user
      const caseDoc = await prisma.case.findFirst({
        where: {
          id: caseId,
          userId,
        },
      });

      if (!caseDoc) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      // Note: This requires a Query model in your Prisma schema
      // For now, return empty array as placeholder
      return reply.send({ queries: [] });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
