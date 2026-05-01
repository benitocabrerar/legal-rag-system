/**
 * Apply Phase 2 Database Indexes
 * Creates composite indexes for query optimization
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyIndexes() {
  console.log('\n========================================');
  console.log('PHASE 2: CREATING DATABASE INDEXES');
  console.log('========================================\n');

  const indexes = [
    // Drop existing single-column indexes
    {
      name: 'Drop legal_documents_norm_type_idx',
      sql: `DROP INDEX IF EXISTS "legal_documents_norm_type_idx"`,
    },
    {
      name: 'Drop legal_documents_legal_hierarchy_idx',
      sql: `DROP INDEX IF EXISTS "legal_documents_legal_hierarchy_idx"`,
    },
    {
      name: 'Drop legal_documents_jurisdiction_idx',
      sql: `DROP INDEX IF EXISTS "legal_documents_jurisdiction_idx"`,
    },
    {
      name: 'Drop legal_documents_publication_type_idx',
      sql: `DROP INDEX IF EXISTS "legal_documents_publication_type_idx"`,
    },
    {
      name: 'Drop legal_documents_document_state_idx',
      sql: `DROP INDEX IF EXISTS "legal_documents_document_state_idx"`,
    },
    {
      name: 'Drop legal_documents_publication_date_idx',
      sql: `DROP INDEX IF EXISTS "legal_documents_publication_date_idx"`,
    },

    // Composite index: normType + legalHierarchy + isActive
    {
      name: 'idx_documents_type_hierarchy_active',
      sql: `CREATE INDEX IF NOT EXISTS "idx_documents_type_hierarchy_active"
            ON "legal_documents"("norm_type", "legal_hierarchy", "is_active")
            WHERE "is_active" = true`,
    },

    // Date range with filters
    {
      name: 'idx_documents_date_type_active',
      sql: `CREATE INDEX IF NOT EXISTS "idx_documents_date_type_active"
            ON "legal_documents"("publication_date" DESC, "norm_type", "is_active")
            WHERE "is_active" = true`,
    },

    // Jurisdiction-based queries
    {
      name: 'idx_documents_jurisdiction_hierarchy',
      sql: `CREATE INDEX IF NOT EXISTS "idx_documents_jurisdiction_hierarchy"
            ON "legal_documents"("jurisdiction", "legal_hierarchy", "is_active")
            WHERE "is_active" = true`,
    },

    // Document state with hierarchy
    {
      name: 'idx_documents_state_hierarchy_active',
      sql: `CREATE INDEX IF NOT EXISTS "idx_documents_state_hierarchy_active"
            ON "legal_documents"("document_state", "legal_hierarchy", "is_active")
            WHERE "is_active" = true`,
    },

    // Full-text search on normTitle
    {
      name: 'idx_documents_title_fts',
      sql: `CREATE INDEX IF NOT EXISTS "idx_documents_title_fts"
            ON "legal_documents" USING GIN(to_tsvector('spanish', "norm_title"))`,
    },

    // Full-text search on content
    {
      name: 'idx_documents_content_fts',
      sql: `CREATE INDEX IF NOT EXISTS "idx_documents_content_fts"
            ON "legal_documents" USING GIN(to_tsvector('spanish', "content"))`,
    },

    // Keywords array search
    {
      name: 'idx_documents_keywords_gin',
      sql: `CREATE INDEX IF NOT EXISTS "idx_documents_keywords_gin"
            ON "legal_documents" USING GIN("keywords")`,
    },

    // Sorting by createdAt
    {
      name: 'idx_documents_created_active',
      sql: `CREATE INDEX IF NOT EXISTS "idx_documents_created_active"
            ON "legal_documents"("created_at" DESC, "is_active")
            WHERE "is_active" = true`,
    },

    // Sorting by updatedAt
    {
      name: 'idx_documents_updated_active',
      sql: `CREATE INDEX IF NOT EXISTS "idx_documents_updated_active"
            ON "legal_documents"("updated_at" DESC, "is_active")
            WHERE "is_active" = true`,
    },

    // Sorting by viewCount
    {
      name: 'idx_documents_viewcount_active',
      sql: `CREATE INDEX IF NOT EXISTS "idx_documents_viewcount_active"
            ON "legal_documents"("view_count" DESC, "is_active")
            WHERE "is_active" = true`,
    },

    // Sorting by downloadCount
    {
      name: 'idx_documents_downloadcount_active',
      sql: `CREATE INDEX IF NOT EXISTS "idx_documents_downloadcount_active"
            ON "legal_documents"("download_count" DESC, "is_active")
            WHERE "is_active" = true`,
    },

    // Publication date range
    {
      name: 'idx_documents_pubdate_range',
      sql: `CREATE INDEX IF NOT EXISTS "idx_documents_pubdate_range"
            ON "legal_documents"("publication_date")
            WHERE "is_active" = true AND "publication_date" IS NOT NULL`,
    },

    // Uploader foreign key optimization
    {
      name: 'idx_documents_uploader_created',
      sql: `CREATE INDEX IF NOT EXISTS "idx_documents_uploader_created"
            ON "legal_documents"("uploaded_by", "created_at" DESC)`,
    },

    // Active documents only
    {
      name: 'idx_documents_active_only',
      sql: `CREATE INDEX IF NOT EXISTS "idx_documents_active_only"
            ON "legal_documents"("id")
            WHERE "is_active" = true`,
    },

    // Chunk table optimization
    {
      name: 'idx_chunks_document_position',
      sql: `CREATE INDEX IF NOT EXISTS "idx_chunks_document_position"
            ON "legal_document_chunks"("legal_document_id", "position" ASC)`,
    },
  ];

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const index of indexes) {
    try {
      console.log(`⏳ Creating: ${index.name}...`);
      await prisma.$executeRawUnsafe(index.sql);
      console.log(`   ✅ Success\n`);
      successCount++;
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log(`   ⚠️  Already exists (skipped)\n`);
        skipCount++;
      } else {
        console.error(`   ❌ Error: ${error.message}\n`);
        failCount++;
      }
    }
  }

  // Update statistics
  console.log('📊 Updating table statistics...\n');
  try {
    await prisma.$executeRawUnsafe('ANALYZE "legal_documents"');
    await prisma.$executeRawUnsafe('ANALYZE "legal_document_chunks"');
    await prisma.$executeRawUnsafe('ANALYZE "users"');
    console.log('   ✅ Statistics updated\n');
  } catch (error: any) {
    console.warn(`   ⚠️  Warning: ${error.message}\n`);
  }

  // Verify indexes
  console.log('🔍 VERIFYING INDEXES...\n');

  const customIndexes: any = await prisma.$queryRaw`
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('legal_documents', 'legal_document_chunks')
      AND indexname LIKE 'idx_%'
    ORDER BY tablename, indexname
  `;

  console.log(`📊 Custom indexes created: ${customIndexes.length}\n`);
  customIndexes.forEach((idx: any, i: number) => {
    console.log(`${i + 1}. ${idx.indexname} (${idx.tablename})`);
  });

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================\n');
  console.log(`✅ Created: ${successCount}`);
  console.log(`⚠️  Skipped: ${skipCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total verified: ${customIndexes.length}\n`);

  if (failCount === 0) {
    console.log('✅ Phase 2 indexes applied successfully!');
    console.log('   Ready to run performance tests.\n');
    return true;
  } else {
    console.log('⚠️  Some indexes failed to create.');
    console.log(`   ${failCount} error(s) occurred.\n`);
    return false;
  }
}

applyIndexes()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
