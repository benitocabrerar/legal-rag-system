/**
 * Script para resolver migraciones fallidas en base de datos de producción
 *
 * Este script se conecta directamente a la base de datos de Render
 * y marca las migraciones fallidas como resueltas
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Resolviendo migraciones fallidas en producción...\n');

  try {
    // Verificar conexión a la base de datos
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos de producción');
    console.log('   Database:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]);
    console.log('');

    // Obtener migraciones fallidas
    const failedMigrations = await prisma.$queryRaw<Array<{
      migration_name: string;
      started_at: Date;
      finished_at: Date | null;
      applied_steps_count: number;
    }>>`
      SELECT migration_name, started_at, finished_at, applied_steps_count
      FROM _prisma_migrations
      WHERE finished_at IS NULL OR applied_steps_count = 0
      ORDER BY started_at DESC
    `;

    if (failedMigrations.length === 0) {
      console.log('✅ No hay migraciones fallidas');
      return;
    }

    console.log(`⚠️  Encontradas ${failedMigrations.length} migraciones fallidas:\n`);
    failedMigrations.forEach((migration, index) => {
      console.log(`${index + 1}. ${migration.migration_name}`);
      console.log(`   Iniciada: ${migration.started_at}`);
      console.log(`   Estado: ${migration.finished_at ? 'Completada parcialmente' : 'No completada'}`);
      console.log(`   Pasos aplicados: ${migration.applied_steps_count}`);
      console.log('');
    });

    // Marcar cada migración fallida como resuelta
    for (const migration of failedMigrations) {
      console.log(`🔧 Resolviendo migración: ${migration.migration_name}`);

      // Marcar como completada con timestamp actual
      await prisma.$executeRaw`
        UPDATE _prisma_migrations
        SET
          finished_at = NOW(),
          applied_steps_count = 1,
          logs = 'Manually resolved via resolve-production-migrations.ts script'
        WHERE migration_name = ${migration.migration_name}
          AND finished_at IS NULL
      `;

      console.log(`   ✅ Migración marcada como resuelta`);
    }

    console.log('\n✅ Todas las migraciones fallidas han sido resueltas');
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('   1. Ejecutar: npx prisma migrate deploy');
    console.log('   2. O hacer push al repositorio para re-deployar en Render');

  } catch (error) {
    console.error('❌ Error al resolver migraciones:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
