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

      // Search for similar chunks from BOTH sources:
      // 1. Global legal documents (LegalDocument)
      // 2. Case-specific documents (Document)

      // Get case-specific document chunks
      const caseChunks = await prisma.documentChunk.findMany({
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

      // Get global legal document chunks (from legal library)
      const legalChunks = await prisma.legalDocumentChunk.findMany({
        where: {
          legalDocument: {
            isActive: true,
          },
        },
        take: 1000, // Limit to avoid loading too many chunks
        include: {
          legalDocument: {
            select: {
              id: true,
              normTitle: true,
              normType: true,
              legalHierarchy: true,
            },
          },
        },
      });

      // Combine both sources
      const allChunks = [
        ...caseChunks.map(chunk => ({
          id: chunk.id,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          embedding: chunk.embedding,
          document: {
            id: chunk.document.id,
            title: chunk.document.title,
          },
          source: 'case' as const,
        })),
        ...legalChunks.map(chunk => ({
          id: chunk.id,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          embedding: chunk.embedding,
          document: {
            id: chunk.legalDocument.id,
            title: chunk.legalDocument.normTitle,
          },
          source: 'legal' as const,
          normType: chunk.legalDocument.normType,
          legalHierarchy: chunk.legalDocument.legalHierarchy,
        })),
      ];

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

      // Build context from top chunks, indicating source
      const context = topChunks
        .map((chunk, index) => {
          const sourceLabel = chunk.source === 'legal'
            ? `📚 Legal Library: ${chunk.document.title}`
            : `📄 Case Document: ${chunk.document.title}`;
          return `[${sourceLabel}, Section ${chunk.chunkIndex + 1}]\n${chunk.content}`;
        })
        .join('\n\n---\n\n');

      // Generate answer using GPT-4
      // If no documents are available, use general legal assistant mode
      const hasDocuments = allChunks.length > 0;

      const systemPrompt = hasDocuments
        ? `You are a legal assistant for Ecuador helping with case analysis.
You have access to TWO sources of information:
1. 📚 Legal Library: Official legal documents from Ecuador (Constitution, laws, codes, regulations)
2. 📄 Case Documents: Specific documents uploaded by the user for this case

Use the provided context to answer the user's question accurately.
When citing information, always specify which source you're using (Legal Library vs Case Document).
If the context doesn't contain enough information to answer the question, say so clearly.
Always respond in Spanish unless the user asks in English.
Provide specific article numbers and legal references when citing from the Legal Library.`
        : `You are a legal assistant for Ecuador helping with general legal questions.
Answer the user's legal questions to the best of your ability in Spanish.
Provide general legal information, principles, and guidance based on Ecuadorian law.
Note: The user can ask about specific laws and the system will search the legal database.
Always clarify that your answers are general legal information and not specific legal advice.`;

      const userPrompt = hasDocuments
        ? `Context from case documents:\n\n${context}\n\n---\n\nQuestion: ${body.query}\n\nPlease provide a detailed answer based on the context above.`
        : `Question: ${body.query}\n\nPlease provide a helpful answer with general legal information and guidance.`;

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
        source: chunk.source,
        ...(chunk.source === 'legal' && {
          normType: (chunk as any).normType,
          legalHierarchy: (chunk as any).legalHierarchy,
        }),
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
