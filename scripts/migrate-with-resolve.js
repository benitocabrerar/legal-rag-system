#!/usr/bin/env node
/**
 * Custom migration script that resolves failed migrations before deploying new ones
 * This script handles the P3009 error from Prisma when there are failed migrations in the database
 */

const { execSync } = require('child_process');

console.log('🔍 Checking for failed migrations...');

try {
  // Try to deploy migrations normally first
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Migrations deployed successfully!');
  process.exit(0);
} catch (error) {
  console.log('⚠️  Migration deployment failed, checking for failed migrations...');

  try {
    // If deploy failed, try to resolve the known failed migration
    console.log('🔧 Resolving failed migration: 20250111000000_user_management_system');
    execSync('npx prisma migrate resolve --rolled-back 20250111000000_user_management_system', {
      stdio: 'inherit'
    });
    console.log('✅ Failed migration marked as rolled back');

    // Now try to deploy migrations again
    console.log('🚀 Deploying migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Migrations deployed successfully!');
    process.exit(0);
  } catch (resolveError) {
    console.error('❌ Failed to resolve and deploy migrations');
    console.error(resolveError.message);
    process.exit(1);
  }
}
