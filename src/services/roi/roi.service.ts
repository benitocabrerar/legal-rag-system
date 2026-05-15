/**
 * Analíticas de ROI — servicio.
 *
 * Agrega la actividad asistida por IA de un usuario y la traduce en
 * tiempo ahorrado. La idea: que el abogado vea, en concreto, el retorno
 * de tener Poweria Legal.
 *
 * El modelo de tiempo es una ESTIMACIÓN explícita: cada tipo de actividad
 * tiene un ahorro en minutos (lo que tomaría hacerla manualmente). El
 * costo en dinero lo calcula el frontend con una tarifa que el usuario
 * controla — acá solo devolvemos tiempo.
 */
import { prisma } from '../../lib/prisma.js';

/** Minutos ahorrados por cada actividad — estimación conservadora. */
const ACTIVITY_DEFS: Array<{ key: string; label: string; minutesEach: number; hint: string }> = [
  { key: 'queries',       label: 'Consultas jurídicas IA', minutesEach: 15, hint: 'Investigación normativa que tomaría buscar a mano.' },
  { key: 'conversations', label: 'Conversaciones con IA',  minutesEach: 20, hint: 'Sesiones de chat sobre un caso o tema.' },
  { key: 'workflows',     label: 'Workflows ejecutados',   minutesEach: 35, hint: 'Flujos de varios pasos (búsqueda + redacción).' },
  { key: 'tramites',      label: 'Trámites generados',     minutesEach: 50, hint: 'Escritos tipo redactados desde cero.' },
  { key: 'documents',     label: 'Documentos IA',          minutesEach: 40, hint: 'Análisis y documentos generados por IA.' },
];

export interface RoiActivity {
  key: string;
  label: string;
  hint: string;
  count: number;
  minutesEach: number;
  minutesSaved: number;
}

export interface RoiSummary {
  activities: RoiActivity[];
  totals: {
    activitiesCount: number;
    minutesSaved: number;
    hoursSaved: number;
  };
  monthly: Array<{ month: string; label: string; items: number; minutesSaved: number }>;
}

const MONTH_LABELS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

export async function getRoiSummary(userId: string): Promise<RoiSummary> {
  // ── Conteo por tipo de actividad ───────────────────────────────────────
  // Una sola consulta: UNION de las fuentes etiquetadas, agrupado por fuente.
  const countRows = await prisma.$queryRawUnsafe<Array<{ src: string; n: bigint | number }>>(
    `SELECT src, count(*) AS n FROM (
        SELECT 'queries' AS src       FROM public.query_history   WHERE user_id = $1
        UNION ALL
        SELECT 'conversations'        FROM public.ai_conversations WHERE user_id = $1
        UNION ALL
        SELECT 'workflows'            FROM public.workflow_runs    WHERE user_id = $1 AND status = 'completed'
        UNION ALL
        SELECT 'tramites'             FROM public.tramite_runs     WHERE user_id = $1
        UNION ALL
        SELECT 'documents'            FROM public.documents        WHERE user_id = $1
                                        AND kind IS NOT NULL AND kind <> 'uploaded'
     ) x GROUP BY src`,
    userId,
  );
  const countBySrc = new Map<string, number>();
  for (const r of countRows) countBySrc.set(r.src, Number(r.n));

  const activities: RoiActivity[] = ACTIVITY_DEFS.map((d) => {
    const count = countBySrc.get(d.key) ?? 0;
    return {
      key: d.key,
      label: d.label,
      hint: d.hint,
      count,
      minutesEach: d.minutesEach,
      minutesSaved: count * d.minutesEach,
    };
  });

  const minutesSaved = activities.reduce((s, a) => s + a.minutesSaved, 0);
  const activitiesCount = activities.reduce((s, a) => s + a.count, 0);

  // ── Tendencia mensual (últimos 6 meses) ────────────────────────────────
  const monthlyRows = await prisma.$queryRawUnsafe<Array<{ month: string; items: bigint | number; minutes: bigint | number }>>(
    `WITH ev AS (
        SELECT created_at   AS ts, 15 AS mins FROM public.query_history    WHERE user_id = $1
        UNION ALL
        SELECT started_at,         20         FROM public.ai_conversations  WHERE user_id = $1
        UNION ALL
        SELECT started_at,         35         FROM public.workflow_runs     WHERE user_id = $1 AND status = 'completed'
        UNION ALL
        SELECT generated_at,       50         FROM public.tramite_runs      WHERE user_id = $1
        UNION ALL
        SELECT created_at,         40         FROM public.documents         WHERE user_id = $1
                                                AND kind IS NOT NULL AND kind <> 'uploaded'
      )
      SELECT to_char(date_trunc('month', ts), 'YYYY-MM') AS month,
             count(*) AS items, sum(mins) AS minutes
        FROM ev
       WHERE ts > (now() - interval '6 months')
       GROUP BY 1
       ORDER BY 1`,
    userId,
  );
  const monthlyBy = new Map<string, { items: number; minutes: number }>();
  for (const r of monthlyRows) {
    monthlyBy.set(r.month, { items: Number(r.items), minutes: Number(r.minutes) });
  }

  // Serie completa de los últimos 6 meses (rellena los meses sin actividad).
  const monthly: RoiSummary['monthly'] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const hit = monthlyBy.get(key);
    monthly.push({
      month: key,
      label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      items: hit?.items ?? 0,
      minutesSaved: hit?.minutes ?? 0,
    });
  }

  return {
    activities,
    totals: {
      activitiesCount,
      minutesSaved,
      hoursSaved: Math.round((minutesSaved / 60) * 10) / 10,
    },
    monthly,
  };
}
