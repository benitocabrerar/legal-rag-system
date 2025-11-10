import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConstitutionEmbeddings() {
  console.log('🔍 Verificando embeddings de la Constitución...\n');

  // Find Constitution document
  const constitution = await prisma.legalDocument.findFirst({
    where: {
      normTitle: {
        contains: 'CONSTITUCIÓN',
        mode: 'insensitive',
      },
    },
    include: {
      _count: {
        select: {
          chunks: true,
        },
      },
    },
  });

  if (!constitution) {
    console.log('❌ No se encontró documento de la Constitución');
    return;
  }

  console.log(`✅ Documento encontrado: ${constitution.normTitle}`);
  console.log(`   ID: ${constitution.id}`);
  console.log(`   Total chunks: ${constitution._count.chunks}`);

  // Check chunks with and without embeddings
  const chunks = await prisma.legalDocumentChunk.findMany({
    where: {
      legalDocumentId: constitution.id,
    },
    select: {
      id: true,
      chunkIndex: true,
      embedding: true,
      content: true,
    },
    take: 10, // Just check first 10
  });

  const chunksWithEmbeddings = chunks.filter((c) => c.embedding !== null).length;
  const chunksWithoutEmbeddings = chunks.filter((c) => c.embedding === null).length;

  console.log(`\n📊 Embeddings status (primeros 10 chunks):`);
  console.log(`   ✅ Con embeddings: ${chunksWithEmbeddings}`);
  console.log(`   ❌ Sin embeddings: ${chunksWithoutEmbeddings}`);

  // Show sample content
  if (chunks.length > 0) {
    console.log(`\n📝 Muestra del primer chunk:`);
    console.log(`   Índice: ${chunks[0].chunkIndex}`);
    console.log(`   Contenido (primeros 200 caracteres):`);
    console.log(`   "${chunks[0].content.substring(0, 200)}..."`);
    console.log(`   Embedding: ${chunks[0].embedding ? 'Sí generado' : 'No generado'}`);
  }

  // Search for "artículo 100" specifically
  console.log(`\n🔎 Buscando "artículo 100"...`);
  const article100Chunks = await prisma.legalDocumentChunk.findMany({
    where: {
      legalDocumentId: constitution.id,
      content: {
        contains: 'artículo 100',
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      chunkIndex: true,
      content: true,
      embedding: true,
    },
  });

  if (article100Chunks.length > 0) {
    console.log(`✅ Encontrado ${article100Chunks.length} chunk(s) con "artículo 100"`);
    article100Chunks.forEach((chunk, i) => {
      console.log(`\n   Chunk ${i + 1}:`);
      console.log(`   Índice: ${chunk.chunkIndex}`);
      console.log(`   Contenido (primeros 300 caracteres):`);
      console.log(`   "${chunk.content.substring(0, 300)}..."`);
      console.log(`   Embedding: ${chunk.embedding ? '✅ Generado' : '❌ No generado'}`);
    });
  } else {
    console.log(`❌ No se encontró "artículo 100" en ningún chunk`);
  }

  await prisma.$disconnect();
}

checkConstitutionEmbeddings().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
