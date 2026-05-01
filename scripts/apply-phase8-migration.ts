/**
 * Apply Phase 8 Migration Manually
 * Creates the tables for cross-reference graph and PageRank
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('📦 Applying Phase 8 Migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(
      process.cwd(),
      'prisma',
      'migrations',
      '20250113_phase8_cross_reference_graph',
      'migration.sql'
    );

    console.log('Reading migration file:', migrationPath);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments
      if (statement.startsWith('--')) {
        continue;
      }

      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await prisma.$executeRawUnsafe(statement + ';');
        console.log('✅ Success\n');
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.code === '42P07' || error.message?.includes('already exists')) {
          console.log('⚠️  Table or index already exists, skipping...\n');
        } else {
          console.error('❌ Error:', error.message);
          throw error;
        }
      }
    }

    console.log('✅ Phase 8 migration applied successfully!');

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');

    const tables = [
      'document_citations',
      'document_relationships',
      'document_authority_scores',
      'citation_extraction_jobs',
      'pagerank_calculation_logs'
    ];

    for (const table of tables) {
      try {
        const result = await prisma.$queryRawUnsafe(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = '${table}'
          );`
        );
        console.log(`  ✅ ${table}: exists`);
      } catch (error) {
        console.log(`  ❌ ${table}: NOT FOUND`);
      }
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
