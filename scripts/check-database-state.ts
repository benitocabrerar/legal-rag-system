import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseState() {
  console.log('\n========================================');
  console.log('DATABASE STATE CHECK');
  console.log('========================================\n');

  // Check document count
  const documentCount = await prisma.legalDocument.count();
  console.log(`📊 Total documents: ${documentCount}`);

  const activeCount = await prisma.legalDocument.count({
    where: { isActive: true },
  });
  console.log(`📊 Active documents: ${activeCount}\n`);

  // Check indexes
  const indexes: any = await prisma.$queryRaw`
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('legal_documents', 'legal_document_chunks')
      AND indexname LIKE 'idx_%'
    ORDER BY tablename, indexname
  `;

  console.log(`🔍 Custom indexes found: ${indexes.length}\n`);
  indexes.forEach((idx: any, i: number) => {
    console.log(`${i + 1}. ${idx.indexname} (${idx.tablename})`);
  });

  // Test a simple query with EXPLAIN
  console.log('\n🔍 QUERY PLAN ANALYSIS:\n');

  try {
    const explain: any = await prisma.$queryRaw`
      EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS)
      SELECT * FROM "legal_documents"
      WHERE "is_active" = true
      AND "norm_type" = 'ORDINARY_LAW'
      AND "legal_hierarchy" = 'LEYES_ORDINARIAS'
      LIMIT 20
    `;

    console.log(JSON.stringify(explain[0], null, 2));
  } catch (error: any) {
    console.error('Error running EXPLAIN:', error.message);
  }

  await prisma.$disconnect();
}

checkDatabaseState();
