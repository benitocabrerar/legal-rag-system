#!/usr/bin/env node
/**
 * Resolves failed migrations without deploying new ones
 * This runs during postinstall to prepare the database for migration deployment
 */

const { execSync } = require('child_process');

// Only run in production environments (Render)
if (process.env.NODE_ENV !== 'production' && !process.env.RENDER) {
  console.log('⏭️  Skipping migration resolution (not in production environment)');
  process.exit(0);
}

// Skip if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  console.log('⏭️  Skipping migration resolution (DATABASE_URL not set)');
  process.exit(0);
}

console.log('🔍 Checking for migration issues...');

try {
  // Check migration status
  execSync('npx prisma migrate status', { stdio: 'inherit' });
  console.log('✅ No migration issues found');
  process.exit(0);
} catch (error) {
  console.log('⚠️  Found migration issues, attempting to resolve...');

  const migrationsToResolve = [
    // 20241110_document_analysis_system - Already resolved manually, tables exist
    // 20250111_add_rag_enhancements - Already resolved manually, tables exist from previous migration
    '20250111000000_user_management_system',
    '20250111000001_user_management_system'
  ];

  // Migration that failed and needs to be rolled back before re-applying
  const failedMigrationToRollback = '20251110_legal_document_enhancements';

  let resolvedCount = 0;
  let alreadyAppliedCount = 0;

  // First, try to rollback the failed migration
  try {
    console.log(`🔧 Rolling back failed migration: ${failedMigrationToRollback}`);
    execSync(`npx prisma migrate resolve --rolled-back ${failedMigrationToRollback}`, {
      stdio: 'pipe'
    });
    console.log(`✅ Marked ${failedMigrationToRollback} as rolled-back`);
    resolvedCount++;
  } catch (rollbackError) {
    const errorOutput = rollbackError.stderr?.toString() || rollbackError.stdout?.toString() || '';

    // P3008 or P3009 variations are OK - migration may not exist or already resolved
    if (errorOutput.includes('P3008') ||
        errorOutput.includes('P3009') ||
        errorOutput.includes('not found') ||
        errorOutput.includes('already applied')) {
      console.log(`ℹ️  ${failedMigrationToRollback} already resolved or not found`);
    } else {
      console.log(`⚠️  Could not rollback ${failedMigrationToRollback}: ${errorOutput.substring(0, 200)}`);
    }
  }

  // Then resolve previously failed migrations by marking as applied
  for (const migration of migrationsToResolve) {
    try {
      console.log(`🔧 Resolving migration: ${migration}`);
      execSync(`npx prisma migrate resolve --applied ${migration}`, {
        stdio: 'pipe'
      });
      console.log(`✅ Marked ${migration} as applied`);
      resolvedCount++;
    } catch (resolveError) {
      const errorOutput = resolveError.stderr?.toString() || resolveError.stdout?.toString() || '';

      // P3008 means already applied - this is OK
      if (errorOutput.includes('P3008') || errorOutput.includes('already recorded as applied')) {
        console.log(`ℹ️  ${migration} already marked as applied`);
        alreadyAppliedCount++;
      } else {
        console.log(`⚠️  Could not resolve ${migration}: ${errorOutput.substring(0, 200)}`);
      }
    }
  }

  console.log(`\n✅ Resolution complete: ${resolvedCount} resolved, ${alreadyAppliedCount} already applied`);
  console.log('ℹ️  Continuing with migration deployment...');
  process.exit(0);
}
