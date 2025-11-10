const { PrismaClient } = require('@prisma/client');

async function resolveFailedMigration() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 Resolviendo migración fallida: 20241110_document_analysis_system');

    // Marcar la migración fallida como aplicada
    await prisma.$executeRawUnsafe(`
      UPDATE _prisma_migrations
      SET finished_at = NOW(),
          logs = 'Migration resolved manually - tables already exist and were created via embedded endpoint'
      WHERE migration_name = '20241110_document_analysis_system'
        AND finished_at IS NULL;
    `);

    console.log('✅ Migración marcada como resuelta');

    // Verificar el estado
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at, rolled_back_at
      FROM _prisma_migrations
      WHERE migration_name = '20241110_document_analysis_system';
    `;

    console.log('📊 Estado actual:', migrations);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resolveFailedMigration();
