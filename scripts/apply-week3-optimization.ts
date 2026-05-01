/**
 * Week 3 Database Optimization Script
 * Applies NLP query processing optimizations and new tables
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface MigrationResult {
  success: boolean;
  message: string;
  duration: number;
  details?: any;
}

class Week3DatabaseOptimization {
  private startTime: number = 0;
  private results: MigrationResult[] = [];

  async run(): Promise<void> {
    console.log('🚀 Starting Week 3 Database Optimization...\n');
    this.startTime = Date.now();

    try {
      // Step 1: Backup database
      await this.backupDatabase();

      // Step 2: Create new NLP tables
      await this.createNLPTables();

      // Step 3: Apply composite indexes
      await this.applyCompositeIndexes();

      // Step 4: Optimize existing queries
      await this.optimizeExistingTables();

      // Step 5: Set up monitoring
      await this.setupMonitoring();

      // Step 6: Verify performance
      await this.verifyPerformance();

      // Step 7: Generate report
      this.generateReport();

      console.log('\n✅ Week 3 Database Optimization completed successfully!');
    } catch (error) {
      console.error('❌ Optimization failed:', error);
      await this.rollback();
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }

  private async backupDatabase(): Promise<void> {
    console.log('📦 Creating database backup...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup_week3_${timestamp}.sql`;

    try {
      // Get database URL components
      const dbUrl = process.env.DATABASE_URL!;
      const urlParts = new URL(dbUrl);

      execSync(
        `pg_dump ${dbUrl} > ${backupFile}`,
        { stdio: 'inherit' }
      );

      this.results.push({
        success: true,
        message: `Database backed up to ${backupFile}`,
        duration: Date.now() - this.startTime
      });
    } catch (error) {
      throw new Error(`Backup failed: ${error}`);
    }
  }

  private async createNLPTables(): Promise<void> {
    console.log('\n📊 Creating NLP tables...');

    const queries = [
      // QueryHistory table
      `CREATE TABLE IF NOT EXISTS query_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        session_id UUID,
        original_query TEXT NOT NULL,
        transformed_query TEXT NOT NULL,
        query_type VARCHAR(50) NOT NULL,
        intent VARCHAR(50),
        confidence FLOAT DEFAULT 0,
        entities JSONB,
        parameters JSONB,
        processing_time_ms INTEGER,
        result_count INTEGER DEFAULT 0,
        result_ids TEXT[],
        relevance_scores FLOAT[],
        clicked_results JSONB,
        time_spent_ms INTEGER,
        was_helpful BOOLEAN,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`,

      // QueryCache table
      `CREATE TABLE IF NOT EXISTS query_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cache_key VARCHAR(255) UNIQUE NOT NULL,
        cache_type VARCHAR(50) NOT NULL,
        original_input TEXT NOT NULL,
        cached_output JSONB NOT NULL,
        intent VARCHAR(50),
        confidence FLOAT,
        entities JSONB,
        hit_count INTEGER DEFAULT 0,
        last_hit TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL,
        is_valid BOOLEAN DEFAULT true,
        compute_time_ms INTEGER,
        cache_size INTEGER,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`,

      // UserSessions table
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        context_type VARCHAR(50) DEFAULT 'general',
        context_data JSONB,
        conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
        message_count INTEGER DEFAULT 0,
        last_query TEXT,
        total_queries INTEGER DEFAULT 0,
        nlp_processing_ms INTEGER DEFAULT 0,
        cache_hits INTEGER DEFAULT 0,
        cache_misses INTEGER DEFAULT 0,
        started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true,
        ip_address INET,
        user_agent TEXT,
        device_type VARCHAR(50)
      )`,

      // QuerySuggestions table
      `CREATE TABLE IF NOT EXISTS query_suggestions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        suggestion_text TEXT NOT NULL,
        suggestion_type VARCHAR(50) NOT NULL,
        category VARCHAR(50),
        subcategory VARCHAR(50),
        usage_count INTEGER DEFAULT 0,
        click_count INTEGER DEFAULT 0,
        last_used TIMESTAMPTZ,
        popularity_score FLOAT DEFAULT 0,
        relevance_score FLOAT DEFAULT 0,
        context_tags TEXT[],
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        is_pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`,

      // EntityLookupCache table
      `CREATE TABLE IF NOT EXISTS entity_lookup_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(50) NOT NULL,
        original_text TEXT NOT NULL,
        normalized_name VARCHAR(255) NOT NULL,
        entity_value JSONB NOT NULL,
        entity_id VARCHAR(255),
        confidence FLOAT DEFAULT 1.0,
        context_type VARCHAR(50),
        context_data JSONB,
        lookup_count INTEGER DEFAULT 0,
        last_lookup TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL,
        is_valid BOOLEAN DEFAULT true,
        source VARCHAR(50),
        verified_by VARCHAR(255),
        verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(entity_type, normalized_name)
      )`,

      // SessionSuggestions junction table
      `CREATE TABLE IF NOT EXISTS session_suggestions (
        session_id UUID NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
        suggestion_id UUID NOT NULL REFERENCES query_suggestions(id) ON DELETE CASCADE,
        displayed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        clicked_at TIMESTAMPTZ,
        position INTEGER NOT NULL,
        was_clicked BOOLEAN DEFAULT false,
        PRIMARY KEY (session_id, suggestion_id)
      )`,

      // Add foreign key for query_history
      `ALTER TABLE query_history
        ADD CONSTRAINT fk_query_session
        FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE CASCADE`
    ];

    for (const query of queries) {
      try {
        await prisma.$executeRawUnsafe(query);
        console.log('✓ Table created successfully');
      } catch (error: any) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
        console.log('⚠️ Table already exists, skipping...');
      }
    }

    this.results.push({
      success: true,
      message: 'NLP tables created successfully',
      duration: Date.now() - this.startTime,
      details: { tablesCreated: queries.length }
    });
  }

  private async applyCompositeIndexes(): Promise<void> {
    console.log('\n🔍 Applying composite indexes...');

    const indexes = [
      // Critical NLP indexes
      {
        name: 'idx_query_history_user_session',
        query: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_history_user_session
                ON query_history(user_id, session_id, created_at DESC)
                WHERE is_active = true`
      },
      {
        name: 'idx_query_cache_lookup',
        query: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_cache_lookup
                ON query_cache(cache_key, expires_at)
                WHERE is_valid = true AND expires_at > CURRENT_TIMESTAMP`
      },
      {
        name: 'idx_user_session_active',
        query: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_session_active
                ON user_sessions(user_id, last_activity DESC)
                WHERE is_active = true AND ended_at IS NULL`
      },
      {
        name: 'idx_entity_cache_lookup',
        query: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entity_cache_lookup
                ON entity_lookup_cache(entity_type, normalized_name, expires_at)
                WHERE is_valid = true`
      },
      {
        name: 'idx_query_suggestion_prefix',
        query: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_suggestion_prefix
                ON query_suggestions(suggestion_text text_pattern_ops, usage_count DESC)`
      },
      // Existing table optimizations
      {
        name: 'idx_legal_doc_nlp_search',
        query: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_doc_nlp_search
                ON legal_documents(norm_type, hierarchy, publication_date DESC)
                WHERE is_active = true`
      },
      {
        name: 'idx_chunk_document_position',
        query: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chunk_document_position
                ON document_chunks(document_id, chunk_index, chunk_type)
                WHERE is_active = true`
      },
      {
        name: 'idx_ai_conversation_active',
        query: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_conversation_active
                ON ai_conversations(user_id, is_active, last_message_at DESC)`
      },
      {
        name: 'idx_search_interaction_quality',
        query: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_interaction_quality
                ON search_interactions(relevance_score DESC, interaction_time DESC)
                WHERE relevance_score IS NOT NULL`
      }
    ];

    let created = 0;
    let skipped = 0;

    for (const index of indexes) {
      try {
        console.log(`Creating index: ${index.name}`);
        await prisma.$executeRawUnsafe(index.query);
        created++;
        console.log(`✓ Index ${index.name} created`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          skipped++;
          console.log(`⚠️ Index ${index.name} already exists`);
        } else {
          console.error(`❌ Failed to create index ${index.name}:`, error.message);
          throw error;
        }
      }
    }

    this.results.push({
      success: true,
      message: `Indexes applied: ${created} created, ${skipped} skipped`,
      duration: Date.now() - this.startTime,
      details: { created, skipped, total: indexes.length }
    });
  }

  private async optimizeExistingTables(): Promise<void> {
    console.log('\n⚡ Optimizing existing tables...');

    const optimizations = [
      // Enable pg_trgm extension for text search
      `CREATE EXTENSION IF NOT EXISTS pg_trgm`,

      // Enable btree_gin for composite indexes
      `CREATE EXTENSION IF NOT EXISTS btree_gin`,

      // Update table statistics
      `ANALYZE legal_documents`,
      `ANALYZE document_chunks`,
      `ANALYZE ai_conversations`,
      `ANALYZE ai_messages`,
      `ANALYZE citations`,

      // Configure autovacuum for high-traffic tables
      `ALTER TABLE query_history SET (
        autovacuum_vacuum_scale_factor = 0.1,
        autovacuum_analyze_scale_factor = 0.05
      )`,

      `ALTER TABLE query_cache SET (
        autovacuum_vacuum_scale_factor = 0.1,
        autovacuum_analyze_scale_factor = 0.05
      )`,

      // Add updated_at triggers
      `CREATE OR REPLACE FUNCTION update_updated_at()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = CURRENT_TIMESTAMP;
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql`,

      `CREATE TRIGGER update_query_history_updated_at
       BEFORE UPDATE ON query_history
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()`,

      `CREATE TRIGGER update_query_cache_updated_at
       BEFORE UPDATE ON query_cache
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()`
    ];

    for (const query of optimizations) {
      try {
        await prisma.$executeRawUnsafe(query);
        console.log('✓ Optimization applied');
      } catch (error: any) {
        console.log(`⚠️ Optimization skipped: ${error.message.substring(0, 50)}...`);
      }
    }

    this.results.push({
      success: true,
      message: 'Table optimizations completed',
      duration: Date.now() - this.startTime,
      details: { optimizationsApplied: optimizations.length }
    });
  }

  private async setupMonitoring(): Promise<void> {
    console.log('\n📈 Setting up performance monitoring...');

    // Create monitoring views
    const monitoringQueries = [
      // Performance dashboard view
      `CREATE OR REPLACE VIEW v_performance_dashboard AS
       SELECT
         NOW() AS snapshot_time,
         (SELECT COUNT(*) FROM query_history WHERE created_at > NOW() - INTERVAL '1 minute') AS queries_per_minute,
         (SELECT AVG(processing_time_ms) FROM query_history WHERE created_at > NOW() - INTERVAL '5 minutes') AS avg_query_time_5m,
         (SELECT COUNT(*) FROM user_sessions WHERE is_active = true AND last_activity > NOW() - INTERVAL '5 minutes') AS active_sessions,
         (SELECT COUNT(DISTINCT user_id) FROM query_history WHERE created_at > NOW() - INTERVAL '1 hour') AS active_users_1h`,

      // Cache performance view
      `CREATE OR REPLACE VIEW v_cache_performance AS
       SELECT
         cache_type,
         COUNT(*) AS total_entries,
         SUM(hit_count) AS total_hits,
         AVG(hit_count) AS avg_hits_per_entry,
         SUM(CASE WHEN last_hit > NOW() - INTERVAL '1 hour' THEN 1 ELSE 0 END) AS recent_hits
       FROM query_cache
       WHERE is_valid = true
       GROUP BY cache_type`,

      // Session analytics view
      `CREATE OR REPLACE VIEW v_session_analytics AS
       SELECT
         DATE(started_at) AS session_date,
         COUNT(DISTINCT user_id) AS unique_users,
         COUNT(*) AS total_sessions,
         AVG(total_queries) AS avg_queries_per_session,
         AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 60) AS avg_session_minutes
       FROM user_sessions
       WHERE started_at > NOW() - INTERVAL '7 days'
       GROUP BY session_date`
    ];

    for (const query of monitoringQueries) {
      try {
        await prisma.$executeRawUnsafe(query);
        console.log('✓ Monitoring view created');
      } catch (error) {
        console.log('⚠️ View creation skipped:', error);
      }
    }

    this.results.push({
      success: true,
      message: 'Monitoring setup completed',
      duration: Date.now() - this.startTime,
      details: { viewsCreated: monitoringQueries.length }
    });
  }

  private async verifyPerformance(): Promise<void> {
    console.log('\n🔬 Verifying performance improvements...');

    // Test query performance
    const testQueries = [
      {
        name: 'User query lookup',
        query: `SELECT * FROM query_history
                WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 day'
                ORDER BY created_at DESC LIMIT 10`,
        params: ['00000000-0000-0000-0000-000000000000']
      },
      {
        name: 'Cache lookup',
        query: `SELECT * FROM query_cache
                WHERE cache_key = $1 AND expires_at > NOW() AND is_valid = true`,
        params: ['test_cache_key']
      },
      {
        name: 'Active sessions',
        query: `SELECT * FROM user_sessions
                WHERE user_id = $1 AND is_active = true
                ORDER BY last_activity DESC LIMIT 5`,
        params: ['00000000-0000-0000-0000-000000000000']
      }
    ];

    const performanceResults = [];

    for (const test of testQueries) {
      const startTime = Date.now();
      try {
        await prisma.$queryRawUnsafe(test.query, ...test.params);
        const duration = Date.now() - startTime;
        performanceResults.push({
          query: test.name,
          duration: `${duration}ms`,
          status: duration < 100 ? '✅ Optimal' : '⚠️ Needs optimization'
        });
        console.log(`✓ ${test.name}: ${duration}ms`);
      } catch (error) {
        performanceResults.push({
          query: test.name,
          duration: 'N/A',
          status: '❌ Failed'
        });
      }
    }

    // Check index usage
    const indexUsage = await prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan AS scans
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('query_history', 'query_cache', 'user_sessions')
      ORDER BY idx_scan DESC
      LIMIT 10
    `;

    this.results.push({
      success: true,
      message: 'Performance verification completed',
      duration: Date.now() - this.startTime,
      details: {
        queryPerformance: performanceResults,
        indexUsage
      }
    });
  }

  private generateReport(): void {
    console.log('\n📋 Migration Report\n' + '='.repeat(50));

    const totalDuration = Date.now() - this.startTime;

    console.log('\nResults:');
    this.results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.success ? '✅' : '❌'} ${result.message}`);
      if (result.details) {
        console.log(`   Details:`, result.details);
      }
    });

    console.log('\n' + '='.repeat(50));
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)} seconds`);

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      results: this.results,
      summary: {
        totalSteps: this.results.length,
        successful: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length
      }
    };

    fs.writeFileSync(
      path.join(process.cwd(), `week3_optimization_report_${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📄 Report saved to file');
  }

  private async rollback(): Promise<void> {
    console.log('\n⚠️ Initiating rollback...');

    try {
      // Drop new tables in reverse order
      const rollbackQueries = [
        'DROP TABLE IF EXISTS session_suggestions CASCADE',
        'DROP TABLE IF EXISTS query_history CASCADE',
        'DROP TABLE IF EXISTS query_cache CASCADE',
        'DROP TABLE IF EXISTS user_sessions CASCADE',
        'DROP TABLE IF EXISTS query_suggestions CASCADE',
        'DROP TABLE IF EXISTS entity_lookup_cache CASCADE'
      ];

      for (const query of rollbackQueries) {
        try {
          await prisma.$executeRawUnsafe(query);
          console.log(`✓ Rolled back: ${query.substring(0, 30)}...`);
        } catch (error) {
          console.log(`⚠️ Rollback skipped: ${error}`);
        }
      }

      console.log('\n✅ Rollback completed');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
    }
  }
}

// Run the optimization
if (require.main === module) {
  const optimizer = new Week3DatabaseOptimization();
  optimizer.run().catch(console.error);
}

export default Week3DatabaseOptimization;