/**
 * Script para forzar la resolución de TODAS las migraciones
 *
 * Este script marca todas las migraciones pendientes como aplicadas
 * asumiendo que las tablas ya existen en la base de datos
 */

import { PrismaClient } from '@prisma/client';
import { readdir } from 'fs/promises';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Forzando resolución de todas las migraciones...\n');

  try {
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos de producción\n');

    // Obtener todas las migraciones del directorio
    const migrationsDir = join(process.cwd(), 'prisma', 'migrations');
    const migrationFolders = await readdir(migrationsDir);

    // Filtrar solo directorios de migraciones (formato: YYYYMMDD_nombre)
    const validMigrations = migrationFolders.filter(folder =>
      /^\d{8}_/.test(folder) || /^\d{14}_/.test(folder) || /^\d{12}_/.test(folder)
    );

    console.log(`📋 Encontradas ${validMigrations.length} migraciones en el directorio\n`);

    // Obtener migraciones ya aplicadas
    const appliedMigrations = await prisma.$queryRaw<Array<{
      migration_name: string;
      finished_at: Date | null;
    }>>`
      SELECT migration_name, finished_at
      FROM _prisma_migrations
      ORDER BY started_at
    `;

    const appliedNames = new Set(appliedMigrations.map(m => m.migration_name));
    const pendingMigrations = validMigrations.filter(name => !appliedNames.has(name));

    console.log(`✅ Migraciones ya aplicadas: ${appliedMigrations.length}`);
    console.log(`⏳ Migraciones pendientes: ${pendingMigrations.length}\n`);

    if (pendingMigrations.length > 0) {
      console.log('📝 Migraciones pendientes:');
      pendingMigrations.forEach((name, index) => {
        console.log(`   ${index + 1}. ${name}`);
      });
      console.log('');
    }

    // Primero, resolver todas las migraciones fallidas
    const failedMigrations = appliedMigrations.filter(m => m.finished_at === null);

    if (failedMigrations.length > 0) {
      console.log(`🔧 Resolviendo ${failedMigrations.length} migraciones fallidas...\n`);

      for (const migration of failedMigrations) {
        await prisma.$executeRaw`
          UPDATE _prisma_migrations
          SET
            finished_at = NOW(),
            applied_steps_count = 1,
            logs = 'Force resolved via force-resolve-all-migrations.ts'
          WHERE migration_name = ${migration.migration_name}
            AND finished_at IS NULL
        `;
        console.log(`   ✅ Resuelta: ${migration.migration_name}`);
      }
      console.log('');
    }

    // Luego, marcar todas las pendientes como aplicadas
    if (pendingMigrations.length > 0) {
      console.log(`🔧 Marcando ${pendingMigrations.length} migraciones pendientes como aplicadas...\n`);

      for (const migrationName of pendingMigrations) {
        // Verificar si ya existe
        const existing = await prisma.$queryRaw<Array<{ migration_name: string }>>`
          SELECT migration_name
          FROM _prisma_migrations
          WHERE migration_name = ${migrationName}
        `;

        if (existing.length === 0) {
          // Insertar registro de migración como ya aplicada
          await prisma.$executeRaw`
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
              gen_random_uuid()::text,
              '',
              NOW(),
              ${migrationName},
              'Force marked as applied via force-resolve-all-migrations.ts - tables already exist',
              NULL,
              NOW(),
              1
            )
          `;
          console.log(`   ✅ Marcada: ${migrationName}`);
        } else {
          console.log(`   ⏭️  Ya existe: ${migrationName}`);
        }
      }
      console.log('');
    }

    console.log('✅ Todas las migraciones han sido resueltas/marcadas\n');
    console.log('📊 Estado final:');

    const finalCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM _prisma_migrations
      WHERE finished_at IS NOT NULL
    `;

    console.log(`   Total de migraciones aplicadas: ${finalCount[0].count}`);
    console.log('');
    console.log('✅ La base de datos está lista para despliegue');

  } catch (error) {
    console.error('❌ Error:', error);
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
