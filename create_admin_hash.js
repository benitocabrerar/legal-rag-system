const bcrypt = require('bcrypt');

const password = 'Admin123!';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('Password hash:', hash);
  console.log('\nSQL to create admin user:');
  console.log(`
INSERT INTO users (
  id,
  email,
  name,
  password_hash,
  role,
  plan_tier,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'benitocabrerar@gmail.com',
  'Benito Cabrera',
  '${hash}',
  'ADMIN',
  'PREMIUM',
  true,
  NOW(),
  NOW()
);
  `);
});
