import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTables() {
  const tables: any = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;

  console.log('\nTables in database:');
  tables.forEach((t: any) => console.log('  -', t.tablename));

  await prisma.$disconnect();
}

checkTables();
