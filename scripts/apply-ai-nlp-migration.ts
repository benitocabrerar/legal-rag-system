/**
 * Migration Script: Apply AI/NLP Tables Migration
 *
 * This script safely applies the AI/NLP migration with:
 * - Pre-migration checks (table existence)
 * - Transaction-based migration
 * - Schema verification
 * - Automatic rollback on failure
 *
 * Usage: npx ts-node scripts/apply-ai-nlp-migration.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

interface MigrationResult {
  success: boolean;
  tablesCreated: string[];
  tablesModified: string[];
  errors: string[];
  warnings: string[];
  duration: number;
}

interface TableInfo {
  table_name: string;
  table_type: string;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

// Tables that should be created by this migration
const EXPECTED_TABLES = [
  'prediction_feedback',
  'trend_data_points',
  'trend_alerts',
  'comparison_changes',
  'pattern_documents',
  'graph_snapshots',
];

// Tables that should be modified by this migration
const MODIFIED_TABLES = [
  'ml_models',
  'predictions',
  'trend_forecasts',
  'legal_patterns',
  'document_comparisons',
];

async function checkTableExists(tableName: string): Promise<boolean> {
  const result = await prisma.$queryRaw<TableInfo[]>`
    SELECT table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
  `;
  return result.length > 0;
}

async function getTableColumns(tableName: string): Promise<ColumnInfo[]> {
  return prisma.$queryRaw<ColumnInfo[]>`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
    ORDER BY ordinal_position
  `;
}

async function checkPreMigrationState(): Promise<{
  existingTables: string[];
  missingTables: string[];
  tablesNeedingModification: string[];
}> {
  console.log('\n[PRE-MIGRATION CHECK] Analyzing current database state...\n');

  const existingTables: string[] = [];
  const missingTables: string[] = [];
  const tablesNeedingModification: string[] = [];

  // Check expected new tables
  for (const table of EXPECTED_TABLES) {
    const exists = await checkTableExists(table);
    if (exists) {
      existingTables.push(table);
      console.log(`  [EXISTS] Table '${table}' already exists`);
    } else {
      missingTables.push(table);
      console.log(`  [MISSING] Table '${table}' will be created`);
    }
  }

  // Check tables that need modification
  for (const table of MODIFIED_TABLES) {
    const exists = await checkTableExists(table);
    if (exists) {
      tablesNeedingModification.push(table);
      console.log(`  [MODIFY] Table '${table}' exists and may need updates`);
    } else {
      console.log(`  [WARNING] Table '${table}' does not exist - may need base migration first`);
    }
  }

  return { existingTables, missingTables, tablesNeedingModification };
}

async function createCheckpoint(): Promise<string> {
  const checkpointId = `checkpoint_${Date.now()}`;
  console.log(`\n[CHECKPOINT] Creating checkpoint: ${checkpointId}\n`);

  // In a real scenario, you might want to create a backup here
  // For this migration, we use PostgreSQL transactions for atomicity

  return checkpointId;
}

async function applyMigration(): Promise<MigrationResult> {
  const startTime = Date.now();
  const result: MigrationResult = {
    success: false,
    tablesCreated: [],
    tablesModified: [],
    errors: [],
    warnings: [],
    duration: 0,
  };

  try {
    // Read migration SQL file
    const migrationPath = path.join(
      __dirname,
      '..',
      'prisma',
      'migrations',
      '20250111_ai_nlp_models',
      'migration.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`\n[MIGRATION] Loaded migration file (${migrationSQL.length} bytes)\n`);

    // Split migration into statements for better error handling
    // Note: This is a simple split - complex SQL might need a proper parser
    const statements = migrationSQL
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');

    console.log(`[MIGRATION] Found ${statements.length} SQL statements to execute\n`);

    // Execute migration within a transaction
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];

        // Skip empty statements or comments only
        if (statement.replace(/--.*$/gm, '').trim() === ';') {
          continue;
        }

        try {
          await tx.$executeRawUnsafe(statement);

          // Track created tables
          const createTableMatch = statement.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?/i);
          if (createTableMatch) {
            result.tablesCreated.push(createTableMatch[1]);
            console.log(`  [OK] Created table: ${createTableMatch[1]}`);
          }

          // Track modified tables
          const alterTableMatch = statement.match(/ALTER TABLE\s+"?(\w+)"?/i);
          if (alterTableMatch && !result.tablesModified.includes(alterTableMatch[1])) {
            result.tablesModified.push(alterTableMatch[1]);
            console.log(`  [OK] Modified table: ${alterTableMatch[1]}`);
          }

          // Track created indexes
          const createIndexMatch = statement.match(/CREATE INDEX(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?\s+ON\s+"?(\w+)"?/i);
          if (createIndexMatch) {
            console.log(`  [OK] Created index: ${createIndexMatch[1]} on ${createIndexMatch[2]}`);
          }

        } catch (stmtError: any) {
          // Handle specific errors that might be acceptable
          if (stmtError.message?.includes('already exists')) {
            result.warnings.push(`Statement ${i + 1}: Object already exists (skipped)`);
            console.log(`  [SKIP] Object already exists`);
          } else if (stmtError.message?.includes('duplicate_object')) {
            result.warnings.push(`Statement ${i + 1}: Duplicate object (skipped)`);
            console.log(`  [SKIP] Duplicate object`);
          } else {
            throw stmtError;
          }
        }
      }
    }, {
      timeout: 120000, // 2 minute timeout for large migrations
    });

    result.success = true;
    console.log('\n[MIGRATION] Migration completed successfully!\n');

  } catch (error: any) {
    result.errors.push(error.message || 'Unknown error');
    console.error('\n[ERROR] Migration failed:', error.message);
    console.error('[ROLLBACK] All changes have been rolled back automatically.\n');
  }

  result.duration = Date.now() - startTime;
  return result;
}

async function verifySchema(): Promise<{
  verified: boolean;
  issues: string[];
}> {
  console.log('\n[VERIFICATION] Verifying schema after migration...\n');

  const issues: string[] = [];

  // Verify expected tables exist
  for (const table of EXPECTED_TABLES) {
    const exists = await checkTableExists(table);
    if (!exists) {
      issues.push(`Table '${table}' was not created`);
      console.log(`  [FAIL] Table '${table}' missing`);
    } else {
      console.log(`  [OK] Table '${table}' exists`);
    }
  }

  // Verify key columns exist in modified tables
  const expectedColumns: Record<string, string[]> = {
    'ml_models': ['status', 'metrics', 'created_at', 'updated_at'],
    'predictions': ['processing_time_ms', 'context_data'],
    'trend_forecasts': ['direction', 'upper_bound', 'lower_bound', 'model_id'],
    'legal_patterns': ['model_id'],
    'document_comparisons': ['comparison_method', 'processing_time_ms'],
  };

  for (const [table, columns] of Object.entries(expectedColumns)) {
    const tableExists = await checkTableExists(table);
    if (!tableExists) {
      console.log(`  [SKIP] Table '${table}' does not exist`);
      continue;
    }

    const existingColumns = await getTableColumns(table);
    const existingColumnNames = existingColumns.map(c => c.column_name);

    for (const column of columns) {
      if (!existingColumnNames.includes(column)) {
        issues.push(`Column '${column}' missing in table '${table}'`);
        console.log(`  [WARN] Column '${column}' missing in '${table}'`);
      } else {
        console.log(`  [OK] Column '${table}.${column}' exists`);
      }
    }
  }

  // Verify foreign keys and indexes (sample check)
  console.log('\n  Checking indexes and constraints...');

  const indexCheck = await prisma.$queryRaw<{ indexname: string; tablename: string }[]>`
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN (${EXPECTED_TABLES.join(',')})
  `;

  console.log(`  [OK] Found ${indexCheck.length} indexes on new tables`);

  return {
    verified: issues.length === 0,
    issues,
  };
}

async function printSummary(
  result: MigrationResult,
  verification: { verified: boolean; issues: string[] }
): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));

  console.log(`\nStatus: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Duration: ${result.duration}ms`);

  if (result.tablesCreated.length > 0) {
    console.log(`\nTables Created (${result.tablesCreated.length}):`);
    result.tablesCreated.forEach(t => console.log(`  - ${t}`));
  }

  if (result.tablesModified.length > 0) {
    console.log(`\nTables Modified (${result.tablesModified.length}):`);
    result.tablesModified.forEach(t => console.log(`  - ${t}`));
  }

  if (result.warnings.length > 0) {
    console.log(`\nWarnings (${result.warnings.length}):`);
    result.warnings.forEach(w => console.log(`  - ${w}`));
  }

  if (result.errors.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`);
    result.errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log(`\nSchema Verification: ${verification.verified ? 'PASSED' : 'FAILED'}`);
  if (verification.issues.length > 0) {
    console.log('Verification Issues:');
    verification.issues.forEach(i => console.log(`  - ${i}`));
  }

  console.log('\n' + '='.repeat(60));
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('AI/NLP Migration Script');
  console.log('Migration: 20250111_ai_nlp_models');
  console.log('='.repeat(60));

  try {
    // Step 1: Pre-migration checks
    const preCheck = await checkPreMigrationState();

    if (preCheck.existingTables.length === EXPECTED_TABLES.length) {
      console.log('\n[INFO] All expected tables already exist. Migration may have been applied previously.');
      const verification = await verifySchema();
      if (verification.verified) {
        console.log('[INFO] Schema verification passed. No migration needed.');
        return;
      }
      console.log('[INFO] Schema verification found issues. Proceeding with migration...');
    }

    // Step 2: Create checkpoint
    await createCheckpoint();

    // Step 3: Apply migration
    const result = await applyMigration();

    // Step 4: Verify schema
    const verification = await verifySchema();

    // Step 5: Print summary
    await printSummary(result, verification);

    // Exit with appropriate code
    if (!result.success || !verification.verified) {
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n[FATAL ERROR]', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
main();
