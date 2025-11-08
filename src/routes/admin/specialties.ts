import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const createSpecialtySchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2),
  nameEnglish: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  level: z.number().int().min(1).max(5).optional(),
  displayOrder: z.number().int().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

const updateSpecialtySchema = createSpecialtySchema.partial();

const assignSpecialtySchema = z.object({
  documentId: z.string(),
  specialtyIds: z.array(z.string()),
  primarySpecialtyId: z.string().optional(),
});

// Middleware to check admin role
async function requireAdmin(request: any, reply: any) {
  const user = request.user;
  if (!user || user.role !== 'admin') {
    return reply.code(403).send({ error: 'Admin access required' });
  }
}

export async function adminSpecialtyRoutes(fastify: FastifyInstance) {
  // Get all specialties (hierarchical tree)
  fastify.get('/admin/specialties', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const { flat = false, parentId, level } = request.query as any;

      if (flat === 'true') {
        // Return flat list
        const where: any = {};
        if (parentId) where.parentId = parentId;
        if (level) where.level = Number(level);

        const specialties = await prisma.legalSpecialty.findMany({
          where,
          orderBy: [
            { level: 'asc' },
            { displayOrder: 'asc' },
          ],
          include: {
            _count: {
              select: {
                documents: true,
                children: true,
              },
            },
          },
        });

        return reply.send({ specialties });
      } else {
        // Return hierarchical tree
        const topLevel = await prisma.legalSpecialty.findMany({
          where: { parentId: null },
          orderBy: { displayOrder: 'asc' },
          include: {
            children: {
              orderBy: { displayOrder: 'asc' },
              include: {
                children: {
                  orderBy: { displayOrder: 'asc' },
                  include: {
                    children: {
                      orderBy: { displayOrder: 'asc' },
                      include: {
                        _count: {
                          select: { documents: true },
                        },
                      },
                    },
                    _count: {
                      select: { documents: true },
                    },
                  },
                },
                _count: {
                  select: { documents: true },
                },
              },
            },
            _count: {
              select: { documents: true },
            },
          },
        });

        return reply.send({ specialties: topLevel });
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get single specialty with details
  fastify.get('/admin/specialties/:id', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const specialty = await prisma.legalSpecialty.findUnique({
        where: { id },
        include: {
          parent: true,
          children: {
            orderBy: { displayOrder: 'asc' },
          },
          documents: {
            include: {
              document: {
                select: {
                  id: true,
                  title: true,
                  category: true,
                  createdAt: true,
                },
              },
            },
          },
          _count: {
            select: {
              documents: true,
              children: true,
            },
          },
        },
      });

      if (!specialty) {
        return reply.code(404).send({ error: 'Specialty not found' });
      }

      return reply.send({ specialty });
    } catch (error) {
      console.error('Error fetching specialty:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create new specialty
  fastify.post('/admin/specialties', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const body = createSpecialtySchema.parse(request.body);

      // Check if code already exists
      const existing = await prisma.legalSpecialty.findUnique({
        where: { code: body.code },
      });

      if (existing) {
        return reply.code(400).send({ error: 'Specialty code already exists' });
      }

      // If parentId provided, verify it exists
      if (body.parentId) {
        const parent = await prisma.legalSpecialty.findUnique({
          where: { id: body.parentId },
        });

        if (!parent) {
          return reply.code(400).send({ error: 'Parent specialty not found' });
        }

        // Set level based on parent
        if (!body.level) {
          body.level = parent.level + 1;
        }
      }

      const specialty = await prisma.legalSpecialty.create({
        data: body,
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: (request.user as any).id,
          action: 'CREATE_SPECIALTY',
          entity: 'legal_specialty',
          entityId: specialty.id,
          changes: body,
          ipAddress: request.ip,
        },
      });

      return reply.code(201).send({ specialty });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error creating specialty:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update specialty
  fastify.patch('/admin/specialties/:id', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateSpecialtySchema.parse(request.body);

      const specialty = await prisma.legalSpecialty.findUnique({
        where: { id },
      });

      if (!specialty) {
        return reply.code(404).send({ error: 'Specialty not found' });
      }

      // If changing code, check uniqueness
      if (body.code && body.code !== specialty.code) {
        const existing = await prisma.legalSpecialty.findUnique({
          where: { code: body.code },
        });

        if (existing) {
          return reply.code(400).send({ error: 'Specialty code already exists' });
        }
      }

      const updated = await prisma.legalSpecialty.update({
        where: { id },
        data: body,
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: (request.user as any).id,
          action: 'UPDATE_SPECIALTY',
          entity: 'legal_specialty',
          entityId: id,
          changes: body,
          ipAddress: request.ip,
        },
      });

      return reply.send({ specialty: updated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error updating specialty:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete specialty
  fastify.delete('/admin/specialties/:id', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const specialty = await prisma.legalSpecialty.findUnique({
        where: { id },
        include: {
          children: true,
          documents: true,
        },
      });

      if (!specialty) {
        return reply.code(404).send({ error: 'Specialty not found' });
      }

      // Check if has children
      if (specialty.children.length > 0) {
        return reply.code(400).send({
          error: 'Cannot delete specialty with children. Delete children first or reassign them.',
        });
      }

      // Delete document associations first
      await prisma.documentSpecialty.deleteMany({
        where: { specialtyId: id },
      });

      // Delete specialty
      await prisma.legalSpecialty.delete({
        where: { id },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: (request.user as any).id,
          action: 'DELETE_SPECIALTY',
          entity: 'legal_specialty',
          entityId: id,
          ipAddress: request.ip,
        },
      });

      return reply.send({ message: 'Specialty deleted successfully' });
    } catch (error) {
      console.error('Error deleting specialty:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Assign specialties to document
  fastify.post('/admin/specialties/assign', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const body = assignSpecialtySchema.parse(request.body);

      // Verify document exists
      const document = await prisma.legalDocument.findUnique({
        where: { id: body.documentId },
      });

      if (!document) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      // Delete existing associations
      await prisma.documentSpecialty.deleteMany({
        where: { documentId: body.documentId },
      });

      // Create new associations
      const assignments = await Promise.all(
        body.specialtyIds.map((specialtyId) =>
          prisma.documentSpecialty.create({
            data: {
              documentId: body.documentId,
              specialtyId,
              isPrimary: specialtyId === body.primarySpecialtyId,
            },
          })
        )
      );

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: (request.user as any).id,
          action: 'ASSIGN_SPECIALTIES',
          entity: 'legal_document',
          entityId: body.documentId,
          changes: { specialtyIds: body.specialtyIds },
          ipAddress: request.ip,
        },
      });

      return reply.send({
        message: 'Specialties assigned successfully',
        assignments,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error assigning specialties:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get specialty statistics
  fastify.get('/admin/specialties/stats', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const [
        totalSpecialties,
        byLevel,
        topSpecialties,
      ] = await Promise.all([
        prisma.legalSpecialty.count(),
        prisma.legalSpecialty.groupBy({
          by: ['level'],
          _count: true,
        }),
        prisma.legalSpecialty.findMany({
          take: 10,
          orderBy: {
            documents: {
              _count: 'desc',
            },
          },
          include: {
            _count: {
              select: { documents: true },
            },
          },
        }),
      ]);

      return reply.send({
        totalSpecialties,
        byLevel,
        topSpecialties,
      });
    } catch (error) {
      console.error('Error fetching specialty stats:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Search specialties
  fastify.get('/admin/specialties/search', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const { q, limit = 20 } = request.query as any;

      if (!q) {
        return reply.code(400).send({ error: 'Search query required' });
      }

      const specialties = await prisma.legalSpecialty.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: Number(limit),
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          _count: {
            select: { documents: true },
          },
        },
      });

      return reply.send({ specialties });
    } catch (error) {
      console.error('Error searching specialties:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
