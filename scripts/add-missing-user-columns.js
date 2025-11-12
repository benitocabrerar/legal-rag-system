/**
 * Migration Script: Add missing columns to users table
 *
 * This script adds the Professional Details columns that are missing from the production database
 * but are defined in the Prisma schema.
 *
 * Run with: node scripts/add-missing-user-columns.js
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting migration: Add missing user columns...');
    console.log('Connected to database:', process.env.DATABASE_URL?.split('@')[1]?.split('?')[0]);

    // Check if columns exist before adding them
    console.log('\n📋 Checking existing columns...');
    const checkColumnsQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('license_state', 'bar_number', 'law_firm', 'specialization', 'bio');
    `;

    const existingColumns = await client.query(checkColumnsQuery);
    const existingColumnNames = existingColumns.rows.map(row => row.column_name);

    console.log('Existing professional columns:', existingColumnNames);

    // Add missing columns
    const columnsToAdd = [
      { name: 'license_state', definition: 'VARCHAR(100)' },
      { name: 'bar_number', definition: 'VARCHAR(100)' },
      { name: 'law_firm', definition: 'VARCHAR(200)' },
      { name: 'specialization', definition: 'VARCHAR(200)' },
      { name: 'bio', definition: 'TEXT' }
    ];

    console.log('\n➕ Adding missing columns...');

    for (const column of columnsToAdd) {
      if (!existingColumnNames.includes(column.name)) {
        const addColumnQuery = `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "${column.name}" ${column.definition};`;
        await client.query(addColumnQuery);
        console.log(`✅ Added column: ${column.name}`);
      } else {
        console.log(`⏭️  Column already exists: ${column.name}`);
      }
    }

    // Verify the columns were added
    console.log('\n🔍 Verifying migration...');
    const verifyQuery = await client.query(checkColumnsQuery);
    const finalColumns = verifyQuery.rows.map(row => row.column_name);

    console.log('Final professional columns:', finalColumns);

    if (finalColumns.length === columnsToAdd.length) {
      console.log('\n✅ Migration completed successfully!');
      console.log('All professional detail columns are now present in the users table.');
    } else {
      console.log('\n⚠️  Migration completed with warnings.');
      console.log(`Expected ${columnsToAdd.length} columns, found ${finalColumns.length}`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });
