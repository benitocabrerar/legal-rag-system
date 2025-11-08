import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['user', 'lawyer', 'admin']).optional(),
  planTier: z.enum(['free', 'basic', 'professional', 'enterprise']).optional(),
  isActive: z.boolean().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['user', 'lawyer', 'admin']).optional(),
  planTier: z.enum(['free', 'basic', 'professional', 'enterprise']).optional(),
});

const bulkActionSchema = z.object({
  userIds: z.array(z.string()),
  action: z.enum(['activate', 'deactivate', 'delete', 'changeRole', 'changePlan']),
  value: z.any().optional(),
});

// Middleware to check admin role
async function requireAdmin(request: any, reply: any) {
  const user = request.user;
  if (!user || user.role !== 'admin') {
    return reply.code(403).send({ error: 'Admin access required' });
  }
}

export async function adminUserRoutes(fastify: FastifyInstance) {
  // Get all users with pagination and filtering
  fastify.get('/admin/users', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        planTier,
        isActive,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = request.query as any;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (role) where.role = role;
      if (planTier) where.planTier = planTier;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      // Get total count
      const total = await prisma.user.count({ where });

      // Get users
      const users = await prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          planTier: true,
          isActive: true,
          lastLogin: true,
          storageUsedMB: true,
          totalQueries: true,
          phoneNumber: true,
          city: true,
          country: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              cases: true,
              documents: true,
              legalDocuments: true,
            },
          },
        },
      });

      return reply.send({
        users,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get single user details
  fastify.get('/admin/users/:id', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          quota: true,
          storageUsage: true,
          _count: {
            select: {
              cases: true,
              documents: true,
              legalDocuments: true,
              apiKeys: true,
              notifications: true,
              auditLogs: true,
              queryLogs: true,
            },
          },
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Get recent activity
      const recentQueries = await prisma.queryLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          query: true,
          success: true,
          responseTime: true,
          createdAt: true,
        },
      });

      const recentAudit = await prisma.auditLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          entity: true,
          success: true,
          createdAt: true,
        },
      });

      return reply.send({
        user,
        recentActivity: {
          queries: recentQueries,
          audit: recentAudit,
        },
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create new user
  fastify.post('/admin/users', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const body = createUserSchema.parse(request.body);

      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existing) {
        return reply.code(400).send({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(body.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: body.email,
          passwordHash,
          name: body.name,
          role: body.role || 'user',
          planTier: body.planTier || 'free',
        },
      });

      // Create default quota
      await prisma.userQuota.create({
        data: {
          userId: user.id,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: (request.user as any).id,
          action: 'CREATE_USER',
          entity: 'user',
          entityId: user.id,
          changes: { email: body.email, role: body.role },
          ipAddress: request.ip,
        },
      });

      return reply.code(201).send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          planTier: user.planTier,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error creating user:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update user
  fastify.patch('/admin/users/:id', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateUserSchema.parse(request.body);

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Update user
      const updated = await prisma.user.update({
        where: { id },
        data: body,
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: (request.user as any).id,
          action: 'UPDATE_USER',
          entity: 'user',
          entityId: id,
          changes: body,
          ipAddress: request.ip,
        },
      });

      return reply.send({
        user: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          role: updated.role,
          planTier: updated.planTier,
          isActive: updated.isActive,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error updating user:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete user (soft delete)
  fastify.delete('/admin/users/:id', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Soft delete by deactivating
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: (request.user as any).id,
          action: 'DELETE_USER',
          entity: 'user',
          entityId: id,
          ipAddress: request.ip,
        },
      });

      return reply.send({ message: 'User deactivated successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Bulk actions on users
  fastify.post('/admin/users/bulk', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const body = bulkActionSchema.parse(request.body);

      const updateData: any = {};

      switch (body.action) {
        case 'activate':
          updateData.isActive = true;
          break;
        case 'deactivate':
          updateData.isActive = false;
          break;
        case 'changeRole':
          updateData.role = body.value;
          break;
        case 'changePlan':
          updateData.planTier = body.value;
          break;
        case 'delete':
          updateData.isActive = false;
          break;
      }

      // Update users
      const result = await prisma.user.updateMany({
        where: { id: { in: body.userIds } },
        data: updateData,
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: (request.user as any).id,
          action: 'BULK_UPDATE_USERS',
          entity: 'user',
          changes: { action: body.action, userIds: body.userIds, value: body.value },
          ipAddress: request.ip,
        },
      });

      return reply.send({
        message: `Bulk action completed: ${result.count} users updated`,
        count: result.count,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      console.error('Error in bulk action:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user statistics
  fastify.get('/admin/users/stats', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const [
        totalUsers,
        activeUsers,
        totalByRole,
        totalByPlan,
        recentSignups,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.groupBy({
          by: ['role'],
          _count: true,
        }),
        prisma.user.groupBy({
          by: ['planTier'],
          _count: true,
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      return reply.send({
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        byRole: totalByRole,
        byPlan: totalByPlan,
        recentSignups,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
