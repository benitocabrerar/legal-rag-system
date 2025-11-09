-- Create admin user: benitocabrerar@gmail.com
-- This script can be executed directly on the PostgreSQL database

-- First, check if user exists and delete if present (to allow re-running)
DELETE FROM users WHERE email = 'benitocabrerar@gmail.com';

-- Insert the admin user
INSERT INTO users (
  id,
  email,
  name,
  password_hash,
  role,
  plan_tier,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'benitocabrerar@gmail.com',
  'Benito Cabrera',
  '',  -- Empty password - user must reset or use OAuth
  'admin',
  'team',
  NOW(),
  NOW()
);

-- Verify the user was created
SELECT
  id,
  email,
  name,
  role,
  plan_tier,
  created_at
FROM users
WHERE email = 'benitocabrerar@gmail.com';

-- Output success message
SELECT
  '✅ Admin user created successfully' as message,
  'Email: benitocabrerar@gmail.com' as email,
  'Role: admin' as role,
  'Plan: team' as plan,
  '⚠️ Password is empty - must be set via reset link' as note;
