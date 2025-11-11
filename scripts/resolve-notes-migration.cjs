const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resolveFailedMigration() {
  try {
    console.log('🔧 Resolving failed migration: 20250111_add_notes_columns');

    // Mark the failed migration as rolled back so Prisma can continue
    await prisma.$executeRawUnsafe(`
      UPDATE "_prisma_migrations"
      SET finished_at = NOW(),
          rolled_back_at = NOW()
      WHERE migration_name = '20250111_add_notes_columns'
        AND finished_at IS NULL;
    `);

    console.log('✅ Migration marked as rolled back');
    console.log('ℹ️  Ready to apply new migrations');

  } catch (error) {
    console.error('❌ Error resolving migration:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resolveFailedMigration()
  .then(() => {
    console.log('\n✅ Resolution complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Resolution failed:', error);
    process.exit(1);
  });
