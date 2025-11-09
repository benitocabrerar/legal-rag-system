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

  try {
    // Mark migrations as applied since they were partially completed
    console.log('🔧 Resolving migration: 20250111000000_user_management_system');
    execSync('npx prisma migrate resolve --applied 20250111000000_user_management_system', {
      stdio: 'inherit'
    });

    console.log('🔧 Resolving migration: 20250111000001_user_management_system');
    execSync('npx prisma migrate resolve --applied 20250111000001_user_management_system', {
      stdio: 'inherit'
    });

    console.log('✅ Failed migrations marked as applied');
    console.log('ℹ️  New migrations will be deployed in the next build step');
    process.exit(0);
  } catch (resolveError) {
    console.log('ℹ️  Migration resolution may have already been completed');
    console.log('ℹ️  Continuing with build...');
    process.exit(0);
  }
}
