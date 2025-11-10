const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Read migration SQL
const migrationPath = path.join(__dirname, 'prisma', 'migrations', '20241110_document_analysis_system', 'migration.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Database connection with longer timeout
const connectionString = process.env.DATABASE_URL ||
  'postgresql://legal_rag_postgres_user:r6hVWKRwWpTF3XRtCRCgLqNEVELxeTBN@dpg-d46iarje5dus73ar46c0-a.oregon-postgres.render.com/legal_rag_postgres?sslmode=require';

async function runMigrationWithRetry(maxRetries = 5, delayMs = 10000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n🔄 Attempt ${attempt}/${maxRetries} to connect to database...`);

    const client = new Client({
      connectionString,
      connectionTimeoutMillis: 60000, // 60 seconds
      query_timeout: 120000, // 120 seconds
      statement_timeout: 120000,
    });

    try {
      // Connect
      console.log('⏳ Connecting to database...');
      await client.connect();
      console.log('✅ Connected successfully!');

      // Run migration
      console.log('\n📝 Executing migration SQL...');
      await client.query(migrationSQL);
      console.log('✅ Migration executed successfully!');

      // Verify tables were created
      console.log('\n🔍 Verifying tables...');
      const result = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN (
          'analysis_queue',
          'document_registry',
          'document_references',
          'legal_document_articles',
          'legal_document_sections',
          'legal_document_summaries',
          'query_templates',
          'document_processing_history',
          'notification_subscriptions',
          'notification_queue'
        )
        ORDER BY table_name;
      `);

      console.log(`✅ Verified ${result.rows.length} tables created:`);
      result.rows.forEach(row => console.log(`   - ${row.table_name}`));

      await client.end();
      console.log('\n🎉 Migration completed successfully!');
      return true;

    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);

      try {
        await client.end();
      } catch (e) {
        // Ignore connection closing errors
      }

      if (attempt < maxRetries) {
        console.log(`⏳ Waiting ${delayMs / 1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        // Increase delay for next attempt (exponential backoff)
        delayMs = Math.min(delayMs * 1.5, 60000);
      } else {
        console.error('\n💥 All attempts failed. Migration could not be completed.');
        throw error;
      }
    }
  }
}

// Run migration
runMigrationWithRetry()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
