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

      // Generate embeddings for all search terms
      const embeddingResponses = await Promise.all(
        searchTerms.map(term =>
          openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: term,
          })
        )
      );

      const queryEmbeddings = embeddingResponses.map(resp => resp.data[0].embedding);

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

      // Filter out chunks without embeddings
      const chunksWithEmbeddings = allChunks.filter((chunk) => chunk.embedding !== null);

      // If no chunks have embeddings, fall back to text search
      if (chunksWithEmbeddings.length === 0) {
        // Fallback: Search by text content
        const textResults = allChunks
          .filter((chunk) => {
            const queryLower = body.query.toLowerCase();
            const contentLower = chunk.content.toLowerCase();
            return contentLower.includes(queryLower);
          })
          .slice(0, effectiveMaxResults)
          .map((chunk) => ({
            ...chunk,
            similarity: 1.0, // Placeholder similarity for text matches
          }));

        if (textResults.length > 0) {
          fastify.log.warn('No embeddings found, using text search fallback');
        }

        // Use text results as chunksWithScores
        var chunksWithScores = textResults;
      } else {
        // Calculate cosine similarity for each chunk with embeddings
        var chunksWithScores = chunksWithEmbeddings.map((chunk) => {
          const embedding = chunk.embedding as number[];
          // Calculate similarity for each query embedding and take MAX
          const similarities = queryEmbeddings.map(queryEmb =>
            cosineSimilarity(queryEmb, embedding)
          );
          const similarity = Math.max(...similarities);
          return {
            ...chunk,
            similarity,
          };
        });
      }

      // Sort by similarity and take top results
      const topChunks = chunksWithScores
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, effectiveMaxResults);

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
