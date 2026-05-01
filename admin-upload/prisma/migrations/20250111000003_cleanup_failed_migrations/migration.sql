-- Clean up failed migration records from previous deployment attempts
-- This removes the problematic migration entries that are blocking new migrations

-- Delete the failed migration records
DELETE FROM "_prisma_migrations" WHERE "migration_name" IN (
    '20250111000000_user_management_system',
    '20250111000001_user_management_system'
);

-- The actual user management schema changes are already in the database
-- from the partial application of the failed migrations, so we don't need to reapply them
-- Migration 20250111000002_resolve_and_apply_user_management has all the changes with IF NOT EXISTS
