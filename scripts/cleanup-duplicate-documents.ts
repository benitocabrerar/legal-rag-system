import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicateDocuments() {
  console.log('🔍 Searching for duplicate legal documents...\n');

  // Find all documents grouped by normTitle
  const allDocs = await prisma.legalDocument.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      normTitle: true,
      normType: true,
      createdAt: true,
      isActive: true,
    },
  });

  console.log(`📊 Total documents found: ${allDocs.length}\n`);

  // Group by normTitle
  const grouped = new Map<string, typeof allDocs>();
  for (const doc of allDocs) {
    const key = doc.normTitle;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(doc);
  }

  // Find duplicates
  let duplicatesFound = 0;
  let documentsDeleted = 0;

  for (const [title, docs] of grouped) {
    if (docs.length > 1) {
      duplicatesFound++;
      console.log(`\n📄 "${title}"`);
      console.log(`   Found ${docs.length} copies:`);

      // Keep the most recent one, delete the rest
      const [keep, ...toDelete] = docs;
      console.log(`   ✓ Keeping: ${keep.id} (${keep.createdAt.toISOString()})`);

      for (const doc of toDelete) {
        console.log(`   ✗ Deleting: ${doc.id} (${doc.createdAt.toISOString()})`);

        // Hard delete the document and its chunks
        await prisma.legalDocumentChunk.deleteMany({
          where: { legalDocumentId: doc.id },
        });

        await prisma.legalDocument.delete({
          where: { id: doc.id },
        });

        documentsDeleted++;
      }
    }
  }

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Duplicate sets found: ${duplicatesFound}`);
  console.log(`   Documents deleted: ${documentsDeleted}`);
  console.log(`   Documents remaining: ${allDocs.length - documentsDeleted}`);

  await prisma.$disconnect();
}

cleanupDuplicateDocuments().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
