import { PrismaClient } from '@prisma/client';
import { config, isDevelopment } from './config';

// ============================================================================
// Prisma Client Singleton
// ============================================================================

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: isDevelopment ? 'pretty' : 'minimal',
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (isDevelopment) {
  globalThis.prismaGlobal = prisma;
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

export async function disconnectPrisma() {
  await prisma.$disconnect();
  console.info('✅ Prisma client disconnected');
}

process.on('beforeExit', async () => {
  await disconnectPrisma();
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check database connection
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const [users, cases, documents, conversations] = await Promise.all([
      prisma.user.count(),
      prisma.case.count(),
      prisma.legalDocument.count(),
      prisma.conversation.count(),
    ]);

    return {
      users,
      cases,
      legalDocuments: documents,
      conversations,
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return null;
  }
}
