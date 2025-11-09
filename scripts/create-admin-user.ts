import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'benitocabrerar@gmail.com' },
    });

    if (existingUser) {
      console.log('User already exists. Updating to admin role...');

      const updatedUser = await prisma.user.update({
        where: { email: 'benitocabrerar@gmail.com' },
        data: {
          role: 'admin',
          planTier: 'team',
        },
      });

      console.log('✅ User updated successfully:');
      console.log(`   ID: ${updatedUser.id}`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Name: ${updatedUser.name}`);
      console.log(`   Role: ${updatedUser.role}`);
      console.log(`   Plan: ${updatedUser.planTier}`);
      return;
    }

    // Create new admin user without password (for OAuth/SSO)
    const newUser = await prisma.user.create({
      data: {
        email: 'benitocabrerar@gmail.com',
        name: 'Benito Cabrera',
        passwordHash: '', // Empty password - must be set later or use OAuth
        role: 'admin',
        planTier: 'team',
      },
    });

    console.log('✅ Admin user created successfully:');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Name: ${newUser.name}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   Plan: ${newUser.planTier}`);
    console.log('\n⚠️  NOTE: Password is empty. User must set password via reset link or use OAuth.');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
