import { FastifyRequest, FastifyReply, FastifySchema } from 'fastify';
import { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';

// =============================================================================
// Fastify Module Augmentation
// =============================================================================
declare module 'fastify' {
  // Fastify Schema Augmentation for Swagger/OpenAPI
  interface FastifySchema {
    /** OpenAPI operation description */
    description?: string;
    /** OpenAPI operation tags */
    tags?: string[];
    /** OpenAPI operation summary */
    summary?: string;
    /** OpenAPI security requirements */
    security?: Array<Record<string, string[]>>;
    /** OpenAPI deprecated flag */
    deprecated?: boolean;
    /** OpenAPI operationId */
    operationId?: string;
    /** OpenAPI produces */
    produces?: string[];
    /** OpenAPI consumes */
    consumes?: string[];
  }

  // Fastify Instance Augmentation
  interface FastifyInstance {
    // Authentication decorator
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

    // Database client (Prisma ORM)
    prisma: PrismaClient;

    // Redis client (for BullMQ queues and caching)
    redis: Redis;
  }

  interface FastifyRequest {
    // User object attached after JWT authentication
    user: {
      id: string;
      email: string;
      role: 'USER' | 'ADMIN' | 'LAWYER' | 'PARALEGAL';
      name?: string;
      iat?: number;
      exp?: number;
    };

    // File uploads (from @fastify/multipart)
    file?: () => Promise<MultipartFile>;
    files?: () => AsyncIterableIterator<MultipartFile>;
  }
}

// =============================================================================
// @fastify/jwt Augmentation
// =============================================================================
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: string;
      email: string;
      role: string;
      iat?: number;
      exp?: number;
    };
    user: {
      id: string;
      email: string;
      role: string;
      name?: string;
      iat?: number;
      exp?: number;
    };
  }
}

// =============================================================================
// Multipart File Type (for @fastify/multipart)
// =============================================================================
interface MultipartFile {
  filename: string;
  mimetype: string;
  encoding: string;
  toBuffer: () => Promise<Buffer>;
  file: NodeJS.ReadableStream;
  fieldname: string;
}

export {};
