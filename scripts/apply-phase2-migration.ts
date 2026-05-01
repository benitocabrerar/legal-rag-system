/**
 * Apply Phase 2 Database Index Migration
 * Applies the composite indexes SQL migration to the production database
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('\n========================================');
  console.log('PHASE 2: APPLYING DATABASE MIGRATION');
  console.log('========================================\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'prisma', 'migrations', '20250112_add_composite_indexes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log(`📄 Migration file: ${migrationPath}`);
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`);

    // Split SQL file into individual statements
    const statements = migrationSQL
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--') && stmt !== 'DO $$');

    console.log(`🔧 Total SQL statements to execute: ${statements.length}\n`);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue;
      }

      try {
        // Extract statement description from comment if available
        const lines = migrationSQL.split('\n');
        const statementIndex = migrationSQL.indexOf(statement);
        const precedingText = migrationSQL.substring(Math.max(0, statementIndex - 200), statementIndex);
        const commentMatch = precedingText.match(/--\s*(.+)$/m);
        const description = commentMatch ? commentMatch[1] : `Statement ${i + 1}`;

        console.log(`⏳ Executing: ${description}...`);

        await prisma.$executeRawUnsafe(statement + ';');

        console.log(`   ✅ Success\n`);
        successCount++;
      } catch (error: any) {
        // Some errors are acceptable (e.g., index already exists)
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`   ⚠️  Skipped (${error.message.substring(0, 60)}...)\n`);
          successCount++;
        } else {
          console.error(`   ❌ Error: ${error.message}\n`);
          failCount++;
          errors.push(`Statement ${i + 1}: ${error.message}`);
        }
      }
    }

    console.log('\n========================================');
    console.log('MIGRATION SUMMARY');
    console.log('========================================\n');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${statements.length}\n`);

    if (errors.length > 0) {
      console.log('⚠️  ERRORS ENCOUNTERED:\n');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      console.log('\n');
    }

    // Verify indexes were created
    console.log('🔍 VERIFYING INDEXES...\n');

    const indexCount: any = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE tablename IN ('LegalDocument', 'LegalDocumentChunk')
        AND schemaname = 'public'
        AND indexname LIKE 'idx_%'
    `;

    const count = parseInt(indexCount[0].count);
    console.log(`📊 Custom indexes found: ${count}`);

    // Show index sizes
    const indexSizes: any = await prisma.$queryRaw`
      SELECT
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid::regclass)) as index_size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('LegalDocument', 'LegalDocumentChunk')
        AND indexname LIKE 'idx_%'
      ORDER BY pg_relation_size(indexrelid::regclass) DESC
      LIMIT 10
    `;

    console.log('\n📈 TOP 10 INDEXES BY SIZE:\n');
    indexSizes.forEach((idx: any, i: number) => {
      console.log(`${i + 1}. ${idx.indexname} (${idx.tablename}): ${idx.index_size}`);
    });

    console.log('\n========================================');
    console.log('MIGRATION COMPLETE');
    console.log('========================================\n');

    if (failCount === 0) {
      console.log('✅ Phase 2 migration applied successfully!');
      console.log('   Ready to run performance tests.\n');
      process.exit(0);
    } else {
      console.log('⚠️  Phase 2 migration completed with some errors.');
      console.log(`   ${failCount} statement(s) failed.`);
      console.log('   Review errors above and retry if necessary.\n');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ FATAL ERROR during migration:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute migration
applyMigration().catch(console.error);
