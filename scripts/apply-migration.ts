import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  console.log('🔄 Iniciando aplicación de migración...\n');

  const prisma = new PrismaClient();

  try {
    // Leer el archivo SQL de migración
    const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20241110_document_analysis_system', 'migration.sql');

    console.log('📄 Leyendo archivo de migración...');
    console.log(`   Ruta: ${migrationPath}`);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`No se encontró el archivo de migración en: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`   ✅ Archivo leído: ${migrationSQL.length} caracteres\n`);

    // Ejecutar la migración
    console.log('⚙️  Ejecutando migración SQL...');
    await prisma.$executeRawUnsafe(migrationSQL);
    console.log('   ✅ Migración ejecutada exitosamente!\n');

    // Verificar que las tablas se crearon
    console.log('🔍 Verificando tablas creadas...');
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (
        table_name LIKE '%analysis%' OR
        table_name LIKE '%registry%' OR
        table_name LIKE '%notification%' OR
        table_name LIKE '%legal_document_%'
      )
      ORDER BY table_name;
    `;

    console.log(`   ✅ ${tables.length} nuevas tablas encontradas:\n`);
    tables.forEach(row => {
      console.log(`      ✓ ${row.table_name}`);
    });

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE!                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    console.log('📋 Próximos pasos:');
    console.log('   1. Ejecutar: npx prisma generate');
    console.log('   2. Configurar Redis (ver ESTADO_IMPLEMENTACION.md)');
    console.log('   3. Configurar variables de entorno');
    console.log('   4. Integrar el sistema en server.ts\n');

  } catch (error) {
    console.error('\n❌ Error aplicando migración:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
