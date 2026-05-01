/**
 * Authentication Middleware
 * Provides authentication and authorization for API routes
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import * as jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';

    const decoded = jwt.verify(token, secret) as JWTPayload;

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'User not found or inactive'
      });
      return;
    }

    // Attach user to request for downstream handlers
    (request as any).user = user;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Token expired'
      });
      return;
    }

    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }
}

/**
 * Middleware to require admin role
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // First require authentication
  await requireAuth(request, reply);

  // Check if response was already sent (auth failed)
  if (reply.sent) return;

  const user = (request as any).user;

  if (!user || user.role !== 'admin') {
    reply.code(403).send({
      error: 'Forbidden',
      message: 'Admin access required'
    });
    return;
  }
}

/**
 * Middleware to require specific role(s)
 */
export function requireRole(...roles: string[]) {
  return async function(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // First require authentication
    await requireAuth(request, reply);

    // Check if response was already sent (auth failed)
    if (reply.sent) return;

    const user = (request as any).user;

    if (!user || !roles.includes(user.role)) {
      reply.code(403).send({
        error: 'Forbidden',
        message: `Required role: ${roles.join(' or ')}`
      });
      return;
    }
  };
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return; // No auth header, continue without user
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';

    const decoded = jwt.verify(token, secret) as JWTPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (user && user.isActive) {
      (request as any).user = user;
    }
  } catch (error) {
    // Silently ignore auth errors for optional auth
  }
}

export default { requireAuth, requireAdmin, requireRole, optionalAuth };
