import bcrypt from 'bcrypt';

const passwordToTest = 'Admin123!';
const hashFromDB = '$2b$10$P2yoat/6yc/F3NHKOachaOVG6TU6dW9y3WTf8GZbz10W5zkIIkStS';

bcrypt.compare(passwordToTest, hashFromDB, (err, result) => {
  if (err) {
    console.error('Error comparing passwords:', err);
    return;
  }

  if (result) {
    console.log('✅ Password is CORRECT: "Admin123!" matches the hash in the database');
  } else {
    console.log('❌ Password is INCORRECT: "Admin123!" does NOT match the hash');
    console.log('\nGenerating new hash for "Admin123!"...');

    bcrypt.hash(passwordToTest, 10, (err, newHash) => {
      if (err) {
        console.error('Error generating hash:', err);
        return;
      }
      console.log('New hash for "Admin123!":', newHash);
      console.log('\nUse this SQL to update the password:');
      console.log(`UPDATE users SET password_hash = '${newHash}' WHERE email = 'benitocabrerar@gmail.com';`);
    });
  }
});
