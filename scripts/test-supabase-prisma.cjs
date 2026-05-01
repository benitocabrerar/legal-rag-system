// Probar conexión Prisma directa a SUPABASE_DATABASE_URL antes de cambiar DATABASE_URL
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

(async () => {
  const url = process.env.SUPABASE_DATABASE_URL;
  if (!url) { console.error('SUPABASE_DATABASE_URL missing'); process.exit(1); }

  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  });
  try {
    const n = await prisma.user.count();
    console.log('Prisma → Supabase OK · users.count =', n);
    const list = await prisma.user.findMany({
      select: { id: true, email: true, role: true, planTier: true },
      orderBy: { createdAt: 'asc' },
    });
    console.log('users:', list);
  } catch (e) {
    console.error('Prisma error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
