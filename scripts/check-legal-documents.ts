import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLegalDocuments() {
  console.log('🔍 Verificando documentos en la biblioteca legal...\n');

  // Count total legal documents
  const totalDocs = await prisma.legalDocument.count();
  console.log(`📚 Total documentos legales: ${totalDocs}`);

  // Count active vs inactive
  const activeDocs = await prisma.legalDocument.count({
    where: { isActive: true },
  });
  const inactiveDocs = await prisma.legalDocument.count({
    where: { isActive: false },
  });
  console.log(`   ✅ Activos: ${activeDocs}`);
  console.log(`   ❌ Inactivos: ${inactiveDocs}`);

  // List all documents (basic info)
  const documents = await prisma.legalDocument.findMany({
    select: {
      id: true,
      normTitle: true,
      normType: true,
      legalHierarchy: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          chunks: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`\n📋 Lista de documentos:\n`);
  if (documents.length === 0) {
    console.log('   ⚠️  No hay documentos en la base de datos');
  } else {
    documents.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.normTitle}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Tipo: ${doc.normType}`);
      console.log(`   Jerarquía: ${doc.legalHierarchy}`);
      console.log(`   Activo: ${doc.isActive ? '✅' : '❌'}`);
      console.log(`   Chunks: ${doc._count.chunks}`);
      console.log(`   Creado: ${doc.createdAt.toISOString()}`);
      console.log('');
    });
  }

  // Check chunks and embeddings
  const totalChunks = await prisma.legalDocumentChunk.count();
  const chunksWithEmbeddings = await prisma.legalDocumentChunk.count({
    where: {
      NOT: {
        embedding: null,
      },
    },
  });
  const chunksWithoutEmbeddings = totalChunks - chunksWithEmbeddings;

  console.log(`\n📊 Estadísticas de chunks:`);
  console.log(`   Total chunks: ${totalChunks}`);
  console.log(`   ✅ Con embeddings: ${chunksWithEmbeddings}`);
  console.log(`   ❌ Sin embeddings: ${chunksWithoutEmbeddings}`);

  if (totalChunks > 0) {
    const embeddingRate = Math.round((chunksWithEmbeddings / totalChunks) * 100);
    console.log(`   📈 Tasa de vectorización: ${embeddingRate}%`);
  }

  await prisma.$disconnect();
}

checkLegalDocuments().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
