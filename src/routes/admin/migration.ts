import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrationRoutes(app: FastifyInstance) {

  // Endpoint temporal para aplicar migración (ELIMINAR DESPUÉS DE USO)
  app.post('/migration/apply', async (request, reply) => {
    try {
      // Verificar secret de seguridad
      const { secret } = request.body as { secret?: string };
      const MIGRATION_SECRET = process.env.MIGRATION_SECRET || 'temp-migration-secret-12345';

      if (secret !== MIGRATION_SECRET) {
        return reply.code(403).send({ error: 'Forbidden - Invalid secret' });
      }

      app.log.info('🔄 Iniciando aplicación de migración...');

      // Leer el archivo SQL de migración
      const migrationPath = path.join(__dirname, '..', '..', '..', 'prisma', 'migrations', '20241110_document_analysis_system', 'migration.sql');

      app.log.info(`📄 Leyendo archivo de migración: ${migrationPath}`);

      if (!fs.existsSync(migrationPath)) {
        throw new Error(`No se encontró el archivo de migración en: ${migrationPath}`);
      }

      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      app.log.info(`✅ Archivo leído: ${migrationSQL.length} caracteres`);

      // Ejecutar la migración
      app.log.info('⚙️  Ejecutando migración SQL...');
      await prisma.$executeRawUnsafe(migrationSQL);
      app.log.info('✅ Migración SQL ejecutada exitosamente!');

      // Verificar que las tablas se crearon
      app.log.info('🔍 Verificando tablas creadas...');
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

      app.log.info(`✅ ${tables.length} nuevas tablas encontradas`);

      return reply.code(200).send({
        success: true,
        message: 'Migración completada exitosamente',
        tablesCreated: tables.length,
        tables: tables.map(t => t.table_name),
        nextSteps: [
          'Ejecutar localmente: npx prisma generate',
          'Configurar Redis (ver ESTADO_IMPLEMENTACION.md)',
          'Configurar variables de entorno',
          'Integrar el sistema en server.ts',
          '⚠️ ELIMINAR este endpoint /admin/migration después de uso'
        ]
      });

    } catch (error) {
      app.log.error({ error }, '❌ Error aplicando migración');
      return reply.code(500).send({
        error: 'Error aplicando migración',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint para verificar estado de migración
  app.get('/migration/status', async (request, reply) => {
    try {
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

      const expectedTables = [
        'analysis_queue',
        'document_processing_history',
        'document_references',
        'document_registry',
        'legal_document_articles',
        'legal_document_sections',
        'legal_document_summaries',
        'notification_queue',
        'notification_subscriptions',
        'query_templates'
      ];

      const foundTables = tables.map(t => t.table_name);
      const missingTables = expectedTables.filter(t => !foundTables.includes(t));

      return reply.code(200).send({
        migrationApplied: missingTables.length === 0,
        tablesFound: tables.length,
        tablesExpected: expectedTables.length,
        tables: foundTables,
        missingTables
      });

    } catch (error) {
      return reply.code(500).send({
        error: 'Error checking migration status',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
