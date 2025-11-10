const { PrismaClient } = require('@prisma/client');

async function resolveRagEnhancementsMigration() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 Resolviendo migración fallida: 20250111_add_rag_enhancements');

    // Primero verificar si la migración existe y su estado
    const existingMigration = await prisma.$queryRaw`
      SELECT migration_name, finished_at, rolled_back_at
      FROM _prisma_migrations
      WHERE migration_name = '20250111_add_rag_enhancements';
    `;

    console.log('📊 Estado actual de la migración:', existingMigration);

    // Si la migración falló, marcarla como aplicada
    const result = await prisma.$executeRawUnsafe(`
      UPDATE _prisma_migrations
      SET finished_at = NOW(),
          applied_steps_count = 1,
          logs = 'Tables already exist from 20241110_document_analysis_system migration. Equivalent functionality present with different column names (parent_section_id instead of chapter_id/section_id).'
      WHERE migration_name = '20250111_add_rag_enhancements'
        AND finished_at IS NULL;
    `);

    console.log('✅ Migración marcada como resuelta');

    // Si no existía, insertarla
    if (existingMigration.length === 0) {
      console.log('➕ Insertando registro de migración...');
      await prisma.$executeRawUnsafe(`
        INSERT INTO _prisma_migrations (
          id,
          checksum,
          finished_at,
          migration_name,
          logs,
          rolled_back_at,
          started_at,
          applied_steps_count
        ) VALUES (
          gen_random_uuid(),
          'bypass',
          NOW(),
          '20250111_add_rag_enhancements',
          'Tables already exist from 20241110_document_analysis_system migration',
          NULL,
          NOW(),
          1
        );
      `);
      console.log('✅ Registro de migración insertado');
    }

    // Verificar el estado final
    const finalState = await prisma.$queryRaw`
      SELECT migration_name, finished_at, rolled_back_at
      FROM _prisma_migrations
      WHERE migration_name = '20250111_add_rag_enhancements';
    `;

    console.log('📊 Estado final:', finalState);

    // Verificar que las tablas existen
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'legal_documents',
        'legal_document_sections',
        'legal_document_articles',
        'legal_document_chunks',
        'legal_document_summaries'
      )
      ORDER BY table_name;
    `;

    console.log(`\n✅ Tablas verificadas (${tables.length}/5):`, tables.map(t => t.table_name));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resolveRagEnhancementsMigration();
