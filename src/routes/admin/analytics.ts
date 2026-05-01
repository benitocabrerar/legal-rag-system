/**
 * Admin Analytics — aggregates real usage from existing tables.
 *
 * GET /api/v1/admin/analytics?period=week|month|year
 *
 * Returns the shape the frontend at /admin/analytics expects.
 * Tables used: ai_messages, ai_conversations, documents, cases, users,
 *              auth_events. Cost/perf metrics fall back to 0 if no data.
 */

import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';

async function requireAdmin(request: any, reply: any) {
  if (!request.user || request.user.role !== 'admin') {
    return reply.code(403).send({ error: 'Forbidden' });
  }
}

function periodToInterval(period: string): { interval: string; days: number } {
  switch (period) {
    case 'week': return { interval: '7 days', days: 7 };
    case 'year': return { interval: '365 days', days: 365 };
    case 'month':
    default:     return { interval: '30 days', days: 30 };
  }
}

export async function adminAnalyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/admin/analytics', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const period = ((request.query as any)?.period || 'month') as string;
      const { interval, days } = periodToInterval(period);

      // ── USAGE ───────────────────────────────────────────────
      const totalQueriesRow = await prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int AS c FROM ai_messages WHERE role = 'user'`
      );
      const queriesPeriodRow = await prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int AS c FROM ai_messages
         WHERE role = 'user' AND timestamp >= now() - interval '${interval}'`
      );
      const totalQueries = totalQueriesRow[0]?.c ?? 0;
      const queriesPeriod = queriesPeriodRow[0]?.c ?? 0;
      const avgPerDay = days > 0 ? Math.round((queriesPeriod / days) * 10) / 10 : 0;

      // Top users by queries (joined via conversations.user_id when available)
      const mostActiveUsers = await prisma.$queryRawUnsafe<any[]>(`
        SELECT u.id, COALESCE(u.name, split_part(u.email,'@',1)) AS name,
               u.email, COUNT(m.id)::int AS query_count
        FROM users u
        LEFT JOIN ai_conversations c ON c.user_id::text = u.id::text
        LEFT JOIN ai_messages m ON m.conversation_id = c.id AND m.role = 'user'
        WHERE m.id IS NULL OR m.timestamp >= now() - interval '${interval}'
        GROUP BY u.id, u.name, u.email
        HAVING COUNT(m.id) > 0
        ORDER BY query_count DESC
        LIMIT 10
      `);

      // ── DOCUMENTS ───────────────────────────────────────────
      const docsTotalRow = await prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int AS c FROM documents`
      );
      const docsPeriodRow = await prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int AS c FROM documents
         WHERE created_at >= now() - interval '${interval}'`
      );
      const totalDocuments = docsTotalRow[0]?.c ?? 0;
      const documentsPeriod = docsPeriodRow[0]?.c ?? 0;

      // Documents by category (case.legal_matter as proxy)
      const docsByCategory = await prisma.$queryRawUnsafe<any[]>(`
        SELECT COALESCE(c.legal_matter, 'sin_categoria') AS category,
               COUNT(d.id)::int AS count
        FROM documents d
        LEFT JOIN cases c ON c.id = d.case_id
        GROUP BY c.legal_matter
        ORDER BY count DESC
        LIMIT 10
      `);

      // Most viewed (use cited_documents from ai_messages as proxy if any)
      const mostViewedDocuments = await prisma.$queryRawUnsafe<any[]>(`
        SELECT d.id, LEFT(COALESCE(d.filename, d.title, '(sin título)'), 60) AS title,
               COUNT(*)::int AS view_count
        FROM ai_messages m
        CROSS JOIN LATERAL jsonb_array_elements_text(m.cited_documents) AS doc_id
        JOIN documents d ON d.id::text = doc_id
        WHERE m.timestamp >= now() - interval '${interval}'
        GROUP BY d.id, d.filename, d.title
        ORDER BY view_count DESC
        LIMIT 10
      `).catch(() => []);

      // ── PERFORMANCE ─────────────────────────────────────────
      const perfRow = await prisma.$queryRawUnsafe<any[]>(`
        SELECT
          COALESCE(AVG(processing_time_ms), 0)::int AS avg_ms,
          COALESCE(
            (COUNT(*) FILTER (WHERE was_helpful IS TRUE OR was_helpful IS NULL))::float
            / NULLIF(COUNT(*),0) * 100,
            0
          )::int AS success_rate
        FROM ai_messages
        WHERE role = 'assistant' AND timestamp >= now() - interval '${interval}'
      `);
      const avgMs = perfRow[0]?.avg_ms ?? 0;
      const successRate = perfRow[0]?.success_rate ?? 0;

      // Top queries by content (assistant ai_messages with their previous user message)
      const mostCommonQueries = await prisma.$queryRawUnsafe<any[]>(`
        SELECT LEFT(content, 80) AS query, COUNT(*)::int AS count
        FROM ai_messages
        WHERE role = 'user' AND timestamp >= now() - interval '${interval}'
        GROUP BY content
        ORDER BY count DESC
        LIMIT 10
      `);

      // ── COSTS ───────────────────────────────────────────────
      // No cost tracking yet → return zeros (the UI handles empty arrays).
      const costs = {
        totalCostsThisMonth: 0,
        openaiCosts: 0,
        averageCostPerQuery: 0,
        costTrend: [],
      };

      return reply.send({
        period,
        usage: {
          totalQueries,
          queriesThisMonth: queriesPeriod,
          averageQueriesPerDay: avgPerDay,
          mostActiveUsers: mostActiveUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            queryCount: u.query_count,
          })),
        },
        documents: {
          totalDocuments,
          documentsThisMonth: documentsPeriod,
          mostViewedDocuments: mostViewedDocuments.map((d) => ({
            id: d.id,
            title: d.title,
            viewCount: d.view_count,
          })),
          documentsByCategory: docsByCategory.map((r) => ({
            category: r.category,
            count: r.count,
          })),
        },
        costs,
        performance: {
          averageResponseTime: Math.round(avgMs / 100) / 10, // seconds with 1 decimal
          successRate,
          mostCommonQueries: mostCommonQueries.map((r) => ({
            query: r.query,
            count: r.count,
          })),
        },
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'admin analytics failed');
      return reply.code(500).send({ error: 'analytics failed' });
    }
  });
}
