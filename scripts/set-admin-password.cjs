const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function setAdminPassword() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('         SET ADMIN PASSWORD');
    console.log('═══════════════════════════════════════════════════════\n');

    const email = 'benitocabrerar@gmail.com';
    const tempPassword = 'Admin123!'; // Temporary password

    console.log('🔄 Generating secure password hash...\n');

    // Generate password hash
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    console.log('🔄 Updating user password...\n');

    // Update user password
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
    });

    console.log('✅ Password updated successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('   Email:', email);
    console.log('   Temporary Password:', tempPassword);
    console.log('\n⚠️  IMPORTANT: Change this password after first login!');
    console.log('   This is a temporary password for initial access.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setAdminPassword()
  .then(() => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('                    COMPLETED');
    console.log('═══════════════════════════════════════════════════════\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
