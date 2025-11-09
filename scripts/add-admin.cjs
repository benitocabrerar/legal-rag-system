const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addAdminUser() {
  try {
    console.log('🔄 Checking for existing user...\n');

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'benitocabrerar@gmail.com' },
    });

    if (existingUser) {
      console.log('👤 User found. Updating to admin role...\n');

      const updatedUser = await prisma.user.update({
        where: { email: 'benitocabrerar@gmail.com' },
        data: {
          role: 'admin',
          planTier: 'team',
        },
      });

      console.log('✅ User updated successfully!\n');
      console.log('📋 User Details:');
      console.log('   ID:', updatedUser.id);
      console.log('   Email:', updatedUser.email);
      console.log('   Name:', updatedUser.name || 'Not set');
      console.log('   Role:', updatedUser.role);
      console.log('   Plan:', updatedUser.planTier);
      console.log('   Created:', updatedUser.createdAt);
      console.log('\n✨ User is now a SYSTEM ADMINISTRATOR with TEAM plan access!');
      return;
    }

    console.log('👤 User not found. Creating new admin user...\n');

    // Create new admin user
    const newUser = await prisma.user.create({
      data: {
        email: 'benitocabrerar@gmail.com',
        name: 'Benito Cabrera',
        passwordHash: '$2b$10$emptypasswordhash', // Temporary hash, must reset password
        role: 'admin',
        planTier: 'team',
      },
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('📋 User Details:');
    console.log('   ID:', newUser.id);
    console.log('   Email:', newUser.email);
    console.log('   Name:', newUser.name);
    console.log('   Role:', newUser.role);
    console.log('   Plan:', newUser.planTier);
    console.log('   Created:', newUser.createdAt);
    console.log('\n✨ User is now a SYSTEM ADMINISTRATOR with TEAM plan access!');
    console.log('\n⚠️  IMPORTANT: Password must be reset via password reset link.');
    console.log('   The user should use "Forgot Password" on the login page.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'P2002') {
      console.error('   User with this email already exists.');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('         LEGAL RAG SYSTEM - ADD ADMIN USER');
console.log('═══════════════════════════════════════════════════════\n');

addAdminUser()
  .then(() => {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                    COMPLETED');
    console.log('═══════════════════════════════════════════════════════\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
