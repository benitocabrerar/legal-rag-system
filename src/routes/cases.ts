import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createCaseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  clientName: z.string().min(1),
  caseNumber: z.string().optional(),
  status: z.enum(['active', 'pending', 'closed']).default('active'),
});

const updateCaseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  clientName: z.string().min(1).optional(),
  caseNumber: z.string().optional(),
  status: z.enum(['active', 'pending', 'closed']).optional(),
});

export async function caseRoutes(fastify: FastifyInstance) {
  // Create new case
  fastify.post('/cases', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const body = createCaseSchema.parse(request.body);
      const userId = (request.user as any).id;

      const caseDoc = await prisma.case.create({
        data: {
          ...body,
          userId,
        },
      });

      return reply.send({ case: caseDoc });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get all cases for user
  fastify.get('/cases', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;
      const { status, limit = 50, offset = 0 } = request.query as any;

      const where: any = { userId };
      if (status) {
        where.status = status;
      }

      const cases = await prisma.case.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          clientName: true,
          caseNumber: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              documents: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      return reply.send({ cases });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get case by ID
  fastify.get('/cases/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const caseDoc = await prisma.case.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          documents: {
            select: {
              id: true,
              title: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!caseDoc) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      return reply.send({ case: caseDoc });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update case
  fastify.patch('/cases/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateCaseSchema.parse(request.body);
      const userId = (request.user as any).id;

      // Verify case belongs to user
      const existingCase = await prisma.case.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!existingCase) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      const updatedCase = await prisma.case.update({
        where: { id },
        data: body,
      });

      return reply.send({ case: updatedCase });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete case
  fastify.delete('/cases/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const caseDoc = await prisma.case.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!caseDoc) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      // Delete all documents and chunks for this case
      const documents = await prisma.document.findMany({
        where: { caseId: id },
        select: { id: true },
      });

      for (const doc of documents) {
        await prisma.documentChunk.deleteMany({
          where: { documentId: doc.id },
        });
      }

      await prisma.document.deleteMany({
        where: { caseId: id },
      });

      // Delete case
      await prisma.case.delete({
        where: { id },
      });

      return reply.send({ message: 'Case deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
