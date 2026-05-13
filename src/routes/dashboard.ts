/**
 * Dashboard routes — agregados globales para el panel de control.
 *
 * El dashboard antes computaba stats cliente-side iterando `cases[]`. Esta
 * ruta retorna en UN SOLO call todos los agregados que el dashboard necesita:
 *   - KPIs principales (casos, audiencias, tareas, finanzas)
 *   - Próximas audiencias (30 días)
 *   - Tareas urgentes (vencidas + esta semana)
 *   - Casos de alto riesgo (brain.riskLevel = 'high')
 *   - Acciones IA pendientes agregadas (brain.nextActions de todos los casos)
 *   - Distribución de documentos por kind (uploaded/ai_generated/court_filed)
 *   - Actividad reciente (últimos 7 días)
 *   - Cambios desde última visita (si se manda `?since=<iso>`)
 *
 * Diseñado con queries paralelas para responder en <600ms incluso con 100+
 * casos. Los counts se calculan en SQL (no en JS) para evitar memoria.
 */
import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/dashboard/overview', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as any).id;
    const sinceParam = (request.query as any)?.since as string | undefined;
    const since = sinceParam ? new Date(sinceParam) : null;

    try {
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const in7  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const ago7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const ago14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const [
        casesOverview,
        proceduralStageBreakdown,
        upcomingHearings,
        urgentTasks,
        documentCounts,
        recentDocuments,
        recentAnalyses,
        financeSummary,
        agedReceivables,
        casesWithBrain,
        recentBrainRefreshes,
      ] = await Promise.all([
        // 1) Casos: total, activos, nuevos esta semana, sin etapa procesal, por tipo legal
        prisma.$queryRawUnsafe<Array<{
          total: bigint; active: bigint; new_week: bigint; no_stage: bigint;
          legal_matter: string | null; n: bigint;
        }>>(
          `WITH base AS (
             SELECT id, status, created_at, legal_matter, procedural_stage
               FROM public.cases WHERE user_id = $1
           )
           SELECT
             (SELECT COUNT(*)::bigint FROM base) AS total,
             (SELECT COUNT(*)::bigint FROM base WHERE status IN ('active','activo','pending')) AS active,
             (SELECT COUNT(*)::bigint FROM base WHERE created_at >= $2) AS new_week,
             (SELECT COUNT(*)::bigint FROM base WHERE procedural_stage IS NULL OR procedural_stage = '') AS no_stage,
             legal_matter,
             COUNT(*)::bigint AS n
           FROM base
           GROUP BY GROUPING SETS ((legal_matter), ())`,
          userId, ago7,
        ).catch(() => []),

        // 2) Distribución de etapas procesales
        prisma.$queryRawUnsafe<Array<{ procedural_stage: string | null; n: bigint }>>(
          `SELECT procedural_stage, COUNT(*)::bigint AS n
             FROM public.cases
            WHERE user_id = $1 AND status IN ('active','activo','pending')
            GROUP BY procedural_stage
            ORDER BY n DESC
            LIMIT 8`,
          userId,
        ).catch(() => []),

        // 3) Próximas audiencias (30 días) — tabla real es `events`
        prisma.$queryRawUnsafe<Array<{
          id: string; case_id: string; case_title: string;
          title: string; start_time: Date; type: string | null;
        }>>(
          `SELECT e.id, e.case_id, c.title AS case_title, e.title, e.start_time, e.type
             FROM public.events e
             JOIN public.cases c ON c.id = e.case_id
            WHERE c.user_id = $1
              AND e.start_time >= $2
              AND e.start_time <= $3
            ORDER BY e.start_time ASC
            LIMIT 10`,
          userId, now, in30,
        ).catch(() => []),

        // 4) Tareas urgentes — tasks no tiene user_id, joinear vía cases o
        // usar assigned_to/created_by. Mostramos todas las tasks del bufete
        // (cases del usuario) que estén pendientes.
        prisma.$queryRawUnsafe<Array<{
          id: string; case_id: string | null; case_title: string | null;
          title: string; due_date: Date | null; priority: string | null;
          is_overdue: boolean;
        }>>(
          `SELECT t.id, t.case_id, c.title AS case_title, t.title, t.due_date, t.priority::text,
                  (t.due_date IS NOT NULL AND t.due_date < $2) AS is_overdue
             FROM public.tasks t
             LEFT JOIN public.cases c ON c.id = t.case_id
            WHERE (
                c.user_id = $1
                OR t.assigned_to = $1
                OR t.created_by = $1
              )
              AND t.completed_at IS NULL
              AND (
                (t.due_date IS NOT NULL AND t.due_date <= $3)
                OR t.priority::text = 'high'
              )
            ORDER BY
              CASE WHEN t.due_date < $2 THEN 0 ELSE 1 END,
              CASE t.priority::text WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
              t.due_date NULLS LAST
            LIMIT 12`,
          userId, now, in7,
        ).catch(() => []),

        // 5) Documentos por kind (across all cases)
        prisma.$queryRawUnsafe<Array<{ kind: string | null; n: bigint }>>(
          `SELECT COALESCE(d.kind, 'uploaded') AS kind, COUNT(*)::bigint AS n
             FROM public.documents d
             JOIN public.cases c ON c.id = d.case_id
            WHERE c.user_id = $1 AND d.replaced_at IS NULL
            GROUP BY 1`,
          userId,
        ).catch(() => []),

        // 6) Documentos recientes (últimos 7 días)
        prisma.$queryRawUnsafe<Array<{
          id: string; case_id: string; case_title: string;
          title: string; kind: string | null; created_at: Date;
        }>>(
          `SELECT d.id, d.case_id, c.title AS case_title, d.title, d.kind, d.created_at
             FROM public.documents d
             JOIN public.cases c ON c.id = d.case_id
            WHERE c.user_id = $1 AND d.created_at >= $2 AND d.replaced_at IS NULL
            ORDER BY d.created_at DESC
            LIMIT 10`,
          userId, ago7,
        ).catch(() => []),

        // 7) Análisis IA recientes
        prisma.$queryRawUnsafe<Array<{
          id: string; case_id: string; case_title: string;
          title: string; created_at: Date; generator: string | null;
        }>>(
          `SELECT d.id, d.case_id, c.title AS case_title, d.title, d.created_at,
                  d.ai_generation_meta->>'generator' AS generator
             FROM public.documents d
             JOIN public.cases c ON c.id = d.case_id
            WHERE c.user_id = $1
              AND d.kind = 'ai_analysis'
              AND d.created_at >= $2
              AND d.replaced_at IS NULL
            ORDER BY d.created_at DESC
            LIMIT 5`,
          userId, ago14,
        ).catch(() => []),

        // 8) Finanzas globales — usa finance_invoices/payments reales
        prisma.$queryRawUnsafe<Array<{
          total_billed: number; total_paid: number; outstanding: number;
        }>>(
          `SELECT
              COALESCE(SUM(i.total_amount), 0)::float AS total_billed,
              COALESCE(SUM(i.paid_amount), 0)::float AS total_paid,
              COALESCE(SUM(i.balance_due), 0)::float AS outstanding
             FROM public.finance_invoices i
             JOIN public.cases c ON c.id = i.case_id
            WHERE c.user_id = $1`,
          userId,
        ).then(r => r[0] || { total_billed: 0, total_paid: 0, outstanding: 0 }).catch(() => ({ total_billed: 0, total_paid: 0, outstanding: 0 })),

        // 9) Aging de cobranza — buckets 0-30, 31-60, 61-90, 90+
        // basado en issue_date y solo facturas con balance_due > 0
        prisma.$queryRawUnsafe<Array<{
          bucket: string; total: number;
        }>>(
          `SELECT
              CASE
                WHEN (now() - i.issue_date) < interval '30 days' THEN '0-30'
                WHEN (now() - i.issue_date) < interval '60 days' THEN '31-60'
                WHEN (now() - i.issue_date) < interval '90 days' THEN '61-90'
                ELSE '90+'
              END AS bucket,
              COALESCE(SUM(i.balance_due), 0)::float AS total
             FROM public.finance_invoices i
             JOIN public.cases c ON c.id = i.case_id
            WHERE c.user_id = $1
              AND i.balance_due > 0
            GROUP BY 1`,
          userId,
        ).catch(() => []),

        // 10) Casos con cerebro IA — extraer riskLevel + nextActions agregadas
        prisma.$queryRawUnsafe<Array<{
          id: string; title: string; metadata: any;
        }>>(
          `SELECT id, title, metadata
             FROM public.cases
            WHERE user_id = $1
              AND status IN ('active','activo','pending')
              AND metadata->'brain' IS NOT NULL`,
          userId,
        ).catch(() => []),

        // 11) Cerebros refrescados recientemente
        prisma.$queryRawUnsafe<Array<{
          id: string; title: string; generated_at: string;
        }>>(
          `SELECT id, title, metadata->'brain'->>'generatedAt' AS generated_at
             FROM public.cases
            WHERE user_id = $1
              AND metadata->'brain' IS NOT NULL
            ORDER BY (metadata->'brain'->>'generatedAt')::timestamptz DESC NULLS LAST
            LIMIT 5`,
          userId,
        ).catch(() => []),
      ]);

      // ─── Procesar agregados de cerebros ───────────────────────────────
      const highRiskCases: Array<{ id: string; title: string; reasoning: string }> = [];
      const aggregatedActions: Array<{
        action: string; deadline: string | null; priority: string;
        caseId: string; caseTitle: string;
      }> = [];
      const aggregatedGaps: string[] = [];

      for (const c of casesWithBrain) {
        const brain = c.metadata?.brain;
        if (!brain) continue;
        if (brain.riskLevel === 'high') {
          highRiskCases.push({
            id: c.id,
            title: c.title,
            reasoning: String(brain.riskReasoning || '').slice(0, 200),
          });
        }
        if (Array.isArray(brain.nextActions)) {
          for (const a of brain.nextActions.slice(0, 3)) {
            aggregatedActions.push({
              action: String(a.action || '').slice(0, 240),
              deadline: a.deadline || null,
              priority: a.priority || 'medium',
              caseId: c.id,
              caseTitle: c.title,
            });
          }
        }
        if (Array.isArray(brain.gaps)) {
          aggregatedGaps.push(...brain.gaps.slice(0, 2).map((g: any) => String(g)));
        }
      }

      aggregatedActions.sort((a, b) => {
        const pri = { high: 0, medium: 1, low: 2 } as const;
        return (pri[a.priority as keyof typeof pri] ?? 1) - (pri[b.priority as keyof typeof pri] ?? 1);
      });

      // ─── Procesar agregados de casos ──────────────────────────────────
      const grandTotal = casesOverview.find((r) => r.legal_matter === null);
      const byLegalMatter = casesOverview
        .filter((r) => r.legal_matter !== null)
        .map((r) => ({ legalMatter: r.legal_matter, count: Number(r.n) }));

      const docKindMap: Record<string, number> = {};
      for (const row of documentCounts) docKindMap[row.kind || 'uploaded'] = Number(row.n);

      const agingMap: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
      for (const row of agedReceivables) agingMap[row.bucket] = row.total;

      // Cambios desde última visita (si se pasa ?since=)
      let changesSince: { newDocs: number; newAnalyses: number; brainsRefreshed: number } | null = null;
      if (since && !isNaN(since.getTime())) {
        const sinceDocs = await prisma.$queryRawUnsafe<Array<{ docs: bigint; analyses: bigint }>>(
          `SELECT
             COUNT(*) FILTER (WHERE d.created_at >= $2 AND d.kind != 'ai_analysis')::bigint AS docs,
             COUNT(*) FILTER (WHERE d.created_at >= $2 AND d.kind  = 'ai_analysis')::bigint AS analyses
             FROM public.documents d
             JOIN public.cases c ON c.id = d.case_id
            WHERE c.user_id = $1 AND d.replaced_at IS NULL`,
          userId, since,
        ).catch(() => []);
        const brainsRefreshedQ = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
          `SELECT COUNT(*)::bigint AS n
             FROM public.cases
            WHERE user_id = $1
              AND metadata->'brain' IS NOT NULL
              AND (metadata->'brain'->>'generatedAt')::timestamptz >= $2`,
          userId, since,
        ).catch(() => []);
        changesSince = {
          newDocs: Number(sinceDocs[0]?.docs || 0),
          newAnalyses: Number(sinceDocs[0]?.analyses || 0),
          brainsRefreshed: Number(brainsRefreshedQ[0]?.n || 0),
        };
      }

      return reply.send({
        generatedAt: new Date().toISOString(),
        kpis: {
          totalCases: Number(grandTotal?.total ?? 0),
          activeCases: Number(grandTotal?.active ?? 0),
          newThisWeek: Number(grandTotal?.new_week ?? 0),
          casesWithoutStage: Number(grandTotal?.no_stage ?? 0),
          upcomingHearings: upcomingHearings.length,
          urgentTasks: urgentTasks.length,
          overdueTasks: urgentTasks.filter((t) => t.is_overdue).length,
          highRiskCases: highRiskCases.length,
        },
        byLegalMatter,
        proceduralStages: proceduralStageBreakdown.map((s) => ({
          stage: s.procedural_stage || '(sin etapa)',
          count: Number(s.n),
        })),
        upcomingHearings: upcomingHearings.map((h) => ({
          id: h.id,
          caseId: h.case_id,
          caseTitle: h.case_title,
          title: h.title,
          startTime: h.start_time.toISOString(),
          type: h.type,
        })),
        urgentTasks: urgentTasks.map((t) => ({
          id: t.id,
          caseId: t.case_id,
          caseTitle: t.case_title,
          title: t.title,
          dueDate: t.due_date?.toISOString() || null,
          priority: t.priority || 'medium',
          isOverdue: t.is_overdue,
        })),
        highRiskCases,
        aggregatedActions: aggregatedActions.slice(0, 10),
        aggregatedGaps: aggregatedGaps.slice(0, 8),
        documentCounts: {
          total: Object.values(docKindMap).reduce((a, b) => a + b, 0),
          uploaded: docKindMap.uploaded || 0,
          ai_generated: docKindMap.ai_generated || 0,
          ai_analysis: docKindMap.ai_analysis || 0,
          court_filed: docKindMap.court_filed || 0,
        },
        recentDocuments: recentDocuments.map((d) => ({
          id: d.id,
          caseId: d.case_id,
          caseTitle: d.case_title,
          title: d.title,
          kind: d.kind,
          createdAt: d.created_at.toISOString(),
        })),
        recentAnalyses: recentAnalyses.map((a) => ({
          id: a.id,
          caseId: a.case_id,
          caseTitle: a.case_title,
          title: a.title,
          generator: a.generator,
          createdAt: a.created_at.toISOString(),
        })),
        finance: {
          totalBilled: financeSummary.total_billed,
          totalPaid: financeSummary.total_paid,
          outstanding: financeSummary.outstanding,
          aging: agingMap,
        },
        recentBrainRefreshes: recentBrainRefreshes
          .filter((r) => r.generated_at)
          .map((r) => ({
            caseId: r.id,
            caseTitle: r.title,
            generatedAt: r.generated_at,
          })),
        changesSince,
      });
    } catch (error: any) {
      fastify.log.error({ err: error?.message }, 'dashboard/overview failed');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
