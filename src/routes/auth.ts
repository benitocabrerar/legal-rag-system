import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const prisma = new PrismaClient();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Register endpoint
  fastify.post('/auth/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        return reply.code(400).send({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(body.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: body.email,
          passwordHash: hashedPassword,
          name: body.name,
        },
      });

      // Generate JWT token
      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          planTier: user.planTier,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Login endpoint
  fastify.post('/auth/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: body.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          planTier: true,
          passwordHash: true,
          twoFactorEnabled: true,
        },
      });

      if (!user || !user.passwordHash) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(body.password, user.passwordHash);

      if (!validPassword) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        // Return a special response indicating 2FA is required
        return reply.send({
          requires2FA: true,
          email: user.email,
        });
      }

      // Generate JWT token
      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          planTier: user.planTier,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user
  fastify.get('/auth/me', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: (request.user as any).id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          planTier: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return reply.send({ user });
    } catch (error) {
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
