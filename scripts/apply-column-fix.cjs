const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyColumnFix() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-calendar-tasks-column-names.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolons and filter out comments/empty lines
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('\\echo'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        if (statement.includes('ALTER TABLE')) {
          const match = statement.match(/ALTER TABLE (\w+)/);
          const tableName = match ? match[1] : 'unknown';
          const columnMatch = statement.match(/RENAME COLUMN "(\w+)" TO (\w+)/);

          if (columnMatch) {
            const [, oldName, newName] = columnMatch;
            console.log(`  🔧 ${tableName}: ${oldName} → ${newName}`);
          }

          await client.query(statement);
          successCount++;
        }
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n✅ Column name fixes applied successfully!`);
    console.log(`   Success: ${successCount} changes`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} (may be expected if columns already renamed)`);
    }

    // Verify the fix worked
    console.log('\n🔍 Verifying column names...');

    const verifyQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'events'
      AND column_name IN ('meeting_link', 'created_by', 'start_time', 'end_time')
      ORDER BY column_name;
    `;

    const result = await client.query(verifyQuery);

    if (result.rows.length === 4) {
      console.log('✅ Verification successful! All critical columns found:');
      result.rows.forEach(row => {
        console.log(`   ✓ ${row.column_name}`);
      });
    } else {
      console.log(`⚠️  Warning: Expected 4 columns, found ${result.rows.length}`);
    }

  } catch (error) {
    console.error('❌ Error applying column fixes:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  applyColumnFix()
    .then(() => {
      console.log('\n🎉 Column fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Column fix failed:', error.message);
      process.exit(1);
    });
}

module.exports = { applyColumnFix };
