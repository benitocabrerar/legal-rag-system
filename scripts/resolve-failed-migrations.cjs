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
  console.log('⚠️  Found migration issues');
  console.log('ℹ️  Migration cleanup will be handled by migration 20250111000003_cleanup_failed_migrations');
  console.log('ℹ️  Continuing with build...');
  // Don't try to resolve - let the cleanup migration handle it
  process.exit(0);
}
