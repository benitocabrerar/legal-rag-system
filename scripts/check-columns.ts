import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkColumns() {
  const docColumns: any = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'legal_documents'
    ORDER BY ordinal_position
  `;

  console.log('\nColumns in legal_documents:');
  docColumns.forEach((c: any) => console.log('  -', c.column_name, '(' + c.data_type + ')'));

  const chunkColumns: any = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'legal_document_chunks'
    ORDER BY ordinal_position
  `;

  console.log('\nColumns in legal_document_chunks:');
  chunkColumns.forEach((c: any) => console.log('  -', c.column_name, '(' + c.data_type + ')'));

  await prisma.$disconnect();
}

checkColumns();
