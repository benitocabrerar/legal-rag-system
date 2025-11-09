const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function addAdminWithRetry(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 30000,
      query_timeout: 30000,
    });

    try {
      console.log(`\n🔄 Connection attempt ${attempt}/${retries}...`);
      await client.connect();
      console.log('✅ Connected to database!\n');

      // Check if user exists
      const checkResult = await client.query(
        'SELECT id, email, role, plan_tier FROM users WHERE email = $1',
        ['benitocabrerar@gmail.com']
      );

      if (checkResult.rows.length > 0) {
        console.log('👤 User found. Updating to admin role...\n');

        const updateResult = await client.query(
          'UPDATE users SET role = $1, plan_tier = $2, updated_at = NOW() WHERE email = $3 RETURNING *',
          ['admin', 'team', 'benitocabrerar@gmail.com']
        );

        const user = updateResult.rows[0];
        console.log('✅ User updated successfully!\n');
        console.log('📋 User Details:');
        console.log('   ID:', user.id);
        console.log('   Email:', user.email);
        console.log('   Name:', user.name || 'Not set');
        console.log('   Role:', user.role);
        console.log('   Plan:', user.plan_tier);
        console.log('\n✨ User is now a SYSTEM ADMINISTRATOR with TEAM plan access!');
      } else {
        console.log('👤 User not found. Creating new admin user...\n');

        const insertResult = await client.query(
          `INSERT INTO users (id, email, name, password_hash, role, plan_tier, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *`,
          ['benitocabrerar@gmail.com', 'Benito Cabrera', '$2b$10$emptypasswordhash', 'admin', 'team']
        );

        const user = insertResult.rows[0];
        console.log('✅ Admin user created successfully!\n');
        console.log('📋 User Details:');
        console.log('   ID:', user.id);
        console.log('   Email:', user.email);
        console.log('   Name:', user.name);
        console.log('   Role:', user.role);
        console.log('   Plan:', user.plan_tier);
        console.log('\n✨ User is now a SYSTEM ADMINISTRATOR with TEAM plan access!');
        console.log('\n⚠️  IMPORTANT: Password must be reset via password reset link.');
      }

      await client.end();
      return true;

    } catch (error) {
      console.error(`\n❌ Attempt ${attempt} failed:`, error.message);

      try {
        await client.end();
      } catch (e) {
        // Ignore cleanup errors
      }

      if (attempt < retries) {
        console.log(`⏳ Waiting 5 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        throw error;
      }
    }
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('         LEGAL RAG SYSTEM - ADD ADMIN USER');
console.log('         (Direct PostgreSQL Connection)');
console.log('═══════════════════════════════════════════════════════');

addAdminWithRetry()
  .then(() => {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                    COMPLETED');
    console.log('═══════════════════════════════════════════════════════\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed after all retries:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check if database is suspended in Render dashboard');
    console.error('   2. Verify DATABASE_URL in .env is correct');
    console.error('   3. Ensure database is accessible from your network');
    process.exit(1);
  });
