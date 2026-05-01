/**
 * PrismaClient Singleton Pattern
 *
 * This module ensures only one PrismaClient instance exists throughout the application,
 * preventing connection pool exhaustion and improving performance.
 *
 * Best Practices:
 * - In development, we store the client in globalThis to survive hot reloads
 * - In production, we create a single instance that's reused
 * - We configure logging based on environment
 */

import { PrismaClient } from '@prisma/client';

// Extend globalThis to include our prisma property
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure Prisma client with appropriate logging
const prismaClientOptions = {
  log: process.env.NODE_ENV === 'development'
    ? (['query', 'error', 'warn'] as ('query' | 'error' | 'warn')[])
    : (['error'] as ('error')[]),
};

// Create singleton instance
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaClientOptions);

// In non-production environments, attach to globalThis to survive hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export both named and default for flexibility
export default prisma;

// Helper function to gracefully disconnect
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

// Helper function to check connection health
export async function checkPrismaConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Prisma connection check failed:', error);
    return false;
  }
}
