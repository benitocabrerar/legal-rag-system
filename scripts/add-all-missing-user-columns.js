/**
 * Migration Script: Add ALL missing columns to users table
 *
 * This script adds all optional columns that are defined in the Prisma schema
 * but missing from the production database.
 *
 * Run with: node scripts/add-all-missing-user-columns.js
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
    console.log('🚀 Starting comprehensive migration: Add ALL missing user columns...');
    console.log('Connected to database:', process.env.DATABASE_URL?.split('@')[1]?.split('?')[0]);

    // Complete list of all optional columns from Prisma schema
    const columnsToAdd = [
      // Professional Details
      { name: 'license_state', definition: 'VARCHAR(100)', comment: 'Professional license state' },
      { name: 'bar_number', definition: 'VARCHAR(100)', comment: 'Bar association number' },
      { name: 'law_firm', definition: 'VARCHAR(200)', comment: 'Law firm name' },
      { name: 'specialization', definition: 'VARCHAR(200)', comment: 'Legal specialization' },
      { name: 'bio', definition: 'TEXT', comment: 'Professional bio' },

      // User Preferences
      { name: 'language', definition: 'VARCHAR(50)', comment: 'Preferred language' },
      { name: 'timezone', definition: 'VARCHAR(100)', comment: 'Preferred timezone' },
      { name: 'theme', definition: 'VARCHAR(50)', comment: 'UI theme preference' },
      { name: 'email_notifications', definition: 'BOOLEAN', comment: 'Email notifications enabled' },
      { name: 'marketing_emails', definition: 'BOOLEAN', comment: 'Marketing emails enabled' }
    ];

    // Check existing columns
    console.log('\n📋 Checking existing columns in users table...');
    const checkColumnsQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users';
    `;

    const existingColumns = await client.query(checkColumnsQuery);
    const existingColumnNames = existingColumns.rows.map(row => row.column_name);

    console.log(`Found ${existingColumnNames.length} existing columns in users table`);

    // Add missing columns one by one
    console.log('\n➕ Adding missing columns...');
    let addedCount = 0;
    let skippedCount = 0;

    for (const column of columnsToAdd) {
      if (!existingColumnNames.includes(column.name)) {
        try {
          const addColumnQuery = `ALTER TABLE "users" ADD COLUMN "${column.name}" ${column.definition};`;
          await client.query(addColumnQuery);
          console.log(`✅ Added column: ${column.name} (${column.comment})`);
          addedCount++;
        } catch (error) {
          console.error(`❌ Failed to add column ${column.name}:`, error.message);
        }
      } else {
        console.log(`⏭️  Column already exists: ${column.name}`);
        skippedCount++;
      }
    }

    // Verify the columns were added
    console.log('\n🔍 Verifying migration...');
    const verifyQuery = await client.query(checkColumnsQuery);
    const finalColumns = verifyQuery.rows.map(row => row.column_name);
    const finalOptionalColumns = columnsToAdd.filter(col => finalColumns.includes(col.name));

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Columns added: ${addedCount}`);
    console.log(`   ⏭️  Columns skipped (already exist): ${skippedCount}`);
    console.log(`   📝 Total optional columns in schema: ${columnsToAdd.length}`);
    console.log(`   ✔️  Optional columns now in database: ${finalOptionalColumns.length}`);

    if (finalOptionalColumns.length === columnsToAdd.length) {
      console.log('\n✅ Migration completed successfully!');
      console.log('All optional user columns from Prisma schema are now present in the database.');
    } else {
      const missingColumns = columnsToAdd.filter(col => !finalColumns.includes(col.name));
      console.log('\n⚠️  Warning: Some columns are still missing:');
      missingColumns.forEach(col => console.log(`   - ${col.name}`));
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
    console.log('\n🎉 Migration script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
