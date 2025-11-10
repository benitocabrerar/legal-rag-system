const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Leer DATABASE_URL del .env
require('dotenv').config();
const DATABASE_URL = process.env.DATABASE_URL;

console.log('🔄 Iniciando proceso de despertar base de datos y migración...\n');

async function wakeDatabase(maxAttempts = 10) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n📡 Intento ${attempt}/${maxAttempts}: Intentando conectar a la base de datos...`);

    const client = new Client({
      connectionString: DATABASE_URL,
      connectionTimeoutMillis: 60000,
      query_timeout: 120000,
      statement_timeout: 120000,
    });

    try {
      console.log('   Conectando...');
      await client.connect();
      console.log('   ✅ Conexión establecida!');

      // Ejecutar query simple para despertar la DB
      console.log('   Ejecutando query de prueba...');
      const result = await client.query('SELECT 1 as wake_up, NOW() as current_time');
      console.log(`   ✅ Base de datos activa! Hora del servidor: ${result.rows[0].current_time}`);

      await client.end();
      return true;

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      await client.end().catch(() => {});

      if (attempt < maxAttempts) {
        const waitTime = 60; // 60 segundos entre intentos
        console.log(`   ⏳ Esperando ${waitTime} segundos antes del próximo intento...`);
        console.log('   (La base de datos puede tardar hasta 60 segundos en despertar)');

        // Esperar con progreso visual
        for (let i = 0; i < waitTime; i++) {
          process.stdout.write(`\r   Esperando: ${i + 1}/${waitTime} segundos...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('\n');
      }
    }
  }

  return false;
}

async function applyMigration() {
  console.log('\n📋 Aplicando migración SQL...');

  const migrationPath = path.join(__dirname, 'prisma', 'migrations', '20241110_document_analysis_system', 'migration.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Error: No se encontró el archivo de migración en ${migrationPath}`);
    return false;
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  console.log(`   Archivo de migración leído: ${migrationSQL.length} caracteres`);

  const client = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 60000,
    query_timeout: 300000, // 5 minutos para la migración
    statement_timeout: 300000,
  });

  try {
    console.log('   Conectando a la base de datos...');
    await client.connect();
    console.log('   ✅ Conectado!');

    console.log('   Ejecutando migración SQL...');
    await client.query(migrationSQL);
    console.log('   ✅ Migración SQL ejecutada exitosamente!');

    // Verificar que las tablas se crearon
    console.log('\n📊 Verificando tablas creadas...');
    const result = await client.query(`
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
    `);

    console.log(`   ✅ ${result.rows.length} nuevas tablas encontradas:`);
    result.rows.forEach(row => {
      console.log(`      - ${row.table_name}`);
    });

    await client.end();
    return true;

  } catch (error) {
    console.error(`\n❌ Error aplicando migración: ${error.message}`);
    await client.end().catch(() => {});
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Script de Despertar Base de Datos y Migración                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Paso 1: Despertar la base de datos
  console.log('📌 Paso 1: Despertar base de datos Render...');
  const dbAwake = await wakeDatabase(10);

  if (!dbAwake) {
    console.error('\n❌ ERROR: No se pudo despertar la base de datos después de 10 intentos.');
    console.error('   Por favor, intenta despertar la base de datos manualmente:');
    console.error('   1. Accede a https://dashboard.render.com/');
    console.error('   2. Ve a tu base de datos: Databases → legal-rag-postgres');
    console.error('   3. Abre la consola SQL y ejecuta: SELECT 1;');
    console.error('   4. Espera 30-60 segundos');
    console.error('   5. Vuelve a ejecutar este script');
    process.exit(1);
  }

  // Paso 2: Aplicar migración
  console.log('\n📌 Paso 2: Aplicar migración SQL...');
  const migrationApplied = await applyMigration();

  if (!migrationApplied) {
    console.error('\n❌ ERROR: No se pudo aplicar la migración.');
    process.exit(1);
  }

  // Éxito
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE!                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log('📋 Próximos pasos:');
  console.log('   1. Ejecutar: npx prisma generate');
  console.log('   2. Configurar Redis (ver ESTADO_IMPLEMENTACION.md)');
  console.log('   3. Configurar variables de entorno');
  console.log('   4. Integrar el sistema en server.ts\n');
}

main().catch(error => {
  console.error('\n💥 Error fatal:', error);
  process.exit(1);
});
