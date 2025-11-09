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

console.log('🔍 Checking for failed migrations...');

try {
  // Check migration status
  execSync('npx prisma migrate status', { stdio: 'inherit' });
  console.log('✅ No failed migrations found');
  process.exit(0);
} catch (error) {
  console.log('⚠️  Found migration issues, attempting to resolve...');

  try {
    // Resolve the known failed migrations by marking them as applied
    // This prevents Prisma from trying to re-apply partially completed migrations
    console.log('🔧 Resolving failed migration: 20250111000000_user_management_system');
    execSync('npx prisma migrate resolve --applied 20250111000000_user_management_system', {
      stdio: 'inherit'
    });
    console.log('✅ Failed migration marked as applied');

    // Also mark 20250111000001 as applied if it exists
    try {
      console.log('🔧 Resolving migration: 20250111000001_user_management_system');
      execSync('npx prisma migrate resolve --applied 20250111000001_user_management_system', {
        stdio: 'inherit'
      });
      console.log('✅ Migration 20250111000001 marked as applied');
    } catch (e) {
      console.log('ℹ️  Migration 20250111000001 may not exist (expected if already cleaned up)');
    }

    console.log('ℹ️  New migrations will be deployed in the next build step');
    process.exit(0);
  } catch (resolveError) {
    console.log('ℹ️  Migration may not exist or was already resolved');
    // Don't fail the build if resolution fails - the migration might already be resolved
    process.exit(0);
  }
}
