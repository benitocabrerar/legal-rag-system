import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { OpenAI } from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const querySchema = z.object({
  caseId: z.string().uuid(),
  query: z.string().min(1),
  maxResults: z.number().min(1).max(20).default(5),
});

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

      // Generate embedding for the query
      const queryEmbeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: body.query,
      });

      const queryEmbedding = queryEmbeddingResponse.data[0].embedding;

      // Search for similar chunks using cosine similarity
      // Note: This is a simplified implementation. For production, use Pinecone or pgvector
      const allChunks = await prisma.documentChunk.findMany({
        where: {
          document: {
            caseId: body.caseId,
          },
        },
        include: {
          document: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      // Calculate cosine similarity for each chunk
      const chunksWithScores = allChunks.map((chunk) => {
        const embedding = chunk.embedding as number[];
        const similarity = cosineSimilarity(queryEmbedding, embedding);
        return {
          ...chunk,
          similarity,
        };
      });

      // Sort by similarity and take top results
      const topChunks = chunksWithScores
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, body.maxResults);

      // Build context from top chunks
      const context = topChunks
        .map((chunk, index) => {
          return `[Document: ${chunk.document.title}, Chunk ${chunk.chunkIndex + 1}]\n${chunk.content}`;
        })
        .join('\n\n---\n\n');

      // Generate answer using GPT-4
      const systemPrompt = `You are a legal assistant helping with case analysis.
You have access to relevant documents from the case files.
Use the provided context to answer the user's question accurately.
If the context doesn't contain enough information to answer the question, say so clearly.
Always cite which documents you're referencing in your answer.`;

      const userPrompt = `Context from case documents:\n\n${context}\n\n---\n\nQuestion: ${body.query}\n\nPlease provide a detailed answer based on the context above.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      });

      const answer = completion.choices[0].message.content;

      // Format source documents
      const sources = topChunks.map((chunk) => ({
        documentId: chunk.document.id,
        documentTitle: chunk.document.title,
        chunkIndex: chunk.chunkIndex,
        similarity: chunk.similarity,
        content: chunk.content.substring(0, 200) + '...',
      }));

      return reply.send({
        answer,
        sources,
        query: body.query,
        caseId: body.caseId,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
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
