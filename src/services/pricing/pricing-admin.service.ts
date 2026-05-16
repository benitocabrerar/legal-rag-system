/**
 * Gestión de Precios — servicio (exclusivo super-admin).
 *
 * El precio vigente de cada plan vive en `subscription_plans`
 * (price_monthly_usd / price_yearly_usd). Editarlo desde el panel:
 *   1. recalcula el precio según el método elegido,
 *   2. lo escribe en `subscription_plans`,
 *   3. registra el cambio en `plan_price_history`.
 *
 * La página de precios y el cobro con tarjeta leen `subscription_plans`
 * en cada request — por eso un cambio se refleja al instante, sin deploy.
 *
 * Métodos de cambio de precio:
 *   · absolute   — se fija el precio directamente
 *   · percentage — ajuste porcentual sobre el precio anterior
 *   · bulk       — ajuste porcentual aplicado a todos los planes a la vez
 *   · demand     — se aplica el precio sugerido por señales de demanda
 */
import { prisma } from '../../lib/prisma.js';

// ─── TIPOS ─────────────────────────────────────────────────────────────────

export type BillingCycle = 'monthly' | 'yearly';
export type ChangeMethod = 'absolute' | 'percentage' | 'bulk' | 'demand';
export type RoundMode = 'none' | 'integer' | 'psychological';

export interface PlanRow {
  id: string;
  code: string;
  name: string;
  nameEnglish: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  storageGb: number;
  documentsLimit: number;
  monthlyQueries: number;
  apiCallsLimit: number;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  displayOrder: number;
  /** -1 en mensual y anual = plan de cotización personalizada. */
  isCustom: boolean;
}

export interface PlanWithStats extends PlanRow {
  activeSubsMonthly: number;
  activeSubsYearly: number;
  mrr: number;
  lastPriceChangeAt: string | null;
}

export interface PriceHistoryEntry {
  id: string;
  billingCycle: BillingCycle;
  oldPrice: number;
  newPrice: number;
  changeMethod: string;
  changePct: number | null;
  reason: string | null;
  changedByEmail: string | null;
  createdAt: string;
}

// ─── LECTURA DE PLANES ─────────────────────────────────────────────────────

const PLAN_COLS =
  `id, code, name, name_english, description, price_monthly_usd, price_yearly_usd,
   storage_gb, documents_limit, monthly_queries, api_calls_limit, features,
   is_active, is_popular, display_order`;

function rowToPlan(r: any): PlanRow {
  const priceMonthly = Number(r.price_monthly_usd ?? 0);
  const priceYearly = Number(r.price_yearly_usd ?? 0);
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    nameEnglish: r.name_english,
    description: r.description,
    priceMonthly,
    priceYearly,
    storageGb: Number(r.storage_gb ?? 0),
    documentsLimit: Number(r.documents_limit ?? 0),
    monthlyQueries: Number(r.monthly_queries ?? 0),
    apiCallsLimit: Number(r.api_calls_limit ?? 0),
    features: Array.isArray(r.features) ? r.features : [],
    isActive: r.is_active === true,
    isPopular: r.is_popular === true,
    displayOrder: Number(r.display_order ?? 0),
    isCustom: priceMonthly < 0 || priceYearly < 0,
  };
}

async function getPlanById(id: string): Promise<PlanRow | null> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT ${PLAN_COLS} FROM public.subscription_plans WHERE id = $1`,
    id,
  );
  return rows.length > 0 ? rowToPlan(rows[0]) : null;
}

/** Lista todos los planes con estadísticas de suscripción y MRR. */
export async function listPlansForAdmin(): Promise<PlanWithStats[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT ${PLAN_COLS} FROM public.subscription_plans ORDER BY display_order`,
  );
  const plans = rows.map(rowToPlan);

  // Conteo de suscripciones activas por plan y ciclo.
  const subs = await prisma.subscription.groupBy({
    by: ['planId', 'billingCycle'],
    where: { status: 'active' },
    _count: { _all: true },
  }).catch(() => [] as any[]);

  // Última fecha de cambio de precio por plan.
  const lastChanges = await prisma.$queryRawUnsafe<any[]>(
    `SELECT plan_id, MAX(created_at) AS last_at
       FROM public.plan_price_history GROUP BY plan_id`,
  );
  const lastMap = new Map<string, string>();
  for (const r of lastChanges) lastMap.set(r.plan_id, r.last_at);

  return plans.map((p) => {
    const m = subs.find((s: any) => s.planId === p.id && s.billingCycle === 'monthly');
    const y = subs.find((s: any) => s.planId === p.id && s.billingCycle === 'yearly');
    const activeSubsMonthly = m?._count?._all ?? 0;
    const activeSubsYearly = y?._count?._all ?? 0;
    const mrr =
      activeSubsMonthly * Math.max(0, p.priceMonthly) +
      (activeSubsYearly * Math.max(0, p.priceYearly)) / 12;
    return {
      ...p,
      activeSubsMonthly,
      activeSubsYearly,
      mrr: Math.round(mrr * 100) / 100,
      lastPriceChangeAt: lastMap.get(p.id) ?? null,
    };
  });
}

/** Historial de precios de un plan, más reciente primero. */
export async function getPriceHistory(planId: string, limit = 60): Promise<PriceHistoryEntry[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, billing_cycle, old_price, new_price, change_method, change_pct,
            reason, changed_by_email, created_at
       FROM public.plan_price_history
      WHERE plan_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    planId, Math.min(200, limit),
  );
  return rows.map((r) => ({
    id: r.id,
    billingCycle: r.billing_cycle,
    oldPrice: Number(r.old_price),
    newPrice: Number(r.new_price),
    changeMethod: r.change_method,
    changePct: r.change_pct != null ? Number(r.change_pct) : null,
    reason: r.reason,
    changedByEmail: r.changed_by_email,
    createdAt: r.created_at,
  }));
}

// ─── SEÑALES DE DEMANDA ────────────────────────────────────────────────────

export interface DemandSignals {
  planCode: string;
  activeSubs: number;
  activeSubsAllPlans: number;
  shareOfActive: number;        // 0..1
  signups30d: number;
  demandIndex: number | null;   // 0..100, null si no hay datos
  verdict: 'high' | 'balanced' | 'low' | 'insufficient';
  verdictLabel: string;
  rationale: string;
  suggestedMonthly: number;
  suggestedYearly: number;
  suggestedPct: number;         // % sugerido respecto al precio actual
}

/**
 * Calcula señales de oferta/demanda para sugerir un precio.
 *
 * La idea es simple: si un plan concentra mucha demanda (suscripciones
 * activas) y el embudo crece (registros recientes), hay margen para subir.
 * Si la demanda es baja, conviene mantener o bajar. Con pocos datos, lo
 * honesto es decir "datos insuficientes" y no sugerir un cambio.
 */
export async function getDemandSignals(planId: string): Promise<DemandSignals> {
  const plan = await getPlanById(planId);
  if (!plan) throw new Error('Plan no encontrado.');

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [activeSubs, activeSubsAllPlans, signups30d] = await Promise.all([
    prisma.subscription.count({ where: { planId, status: 'active' } }).catch(() => 0),
    prisma.subscription.count({ where: { status: 'active' } }).catch(() => 0),
    prisma.user.count({ where: { createdAt: { gte: since } } }).catch(() => 0),
  ]);

  const shareOfActive = activeSubsAllPlans > 0 ? activeSubs / activeSubsAllPlans : 0;

  // Umbral de datos: sin una base mínima de suscripciones activas, no se
  // sugiere nada — el panel debe usar el modo directo o porcentual.
  const MIN_DATA = 5;
  if (activeSubsAllPlans < MIN_DATA) {
    return {
      planCode: plan.code,
      activeSubs,
      activeSubsAllPlans,
      shareOfActive,
      signups30d,
      demandIndex: null,
      verdict: 'insufficient',
      verdictLabel: 'Datos insuficientes',
      rationale:
        `Todavía no hay base suficiente de suscripciones activas (${activeSubsAllPlans}) ` +
        `para inferir demanda. Recomendación: usar el modo "precio directo" o "ajuste ` +
        `porcentual". Esta sugerencia se activa cuando haya al menos ${MIN_DATA} ` +
        `suscripciones activas en el producto.`,
      suggestedMonthly: plan.priceMonthly,
      suggestedYearly: plan.priceYearly,
      suggestedPct: 0,
    };
  }

  // Índice de demanda (0..100): mezcla la concentración de suscripciones
  // activas en este plan con el impulso del embudo (registros recientes).
  const shareScore = Math.min(1, shareOfActive / 0.4);            // 40% de share = tope
  const funnelScore = Math.min(1, signups30d / 50);               // 50 registros/mes = tope
  const demandIndex = Math.round((shareScore * 0.65 + funnelScore * 0.35) * 100);

  let verdict: DemandSignals['verdict'];
  let verdictLabel: string;
  let suggestedPct: number;
  let rationale: string;
  if (demandIndex >= 65) {
    verdict = 'high';
    verdictLabel = 'Demanda alta — hay margen para subir';
    suggestedPct = 12;
    rationale =
      `Este plan concentra el ${(shareOfActive * 100).toFixed(0)}% de las suscripciones ` +
      `activas y el embudo registró ${signups30d} altas en 30 días. La demanda sostiene ` +
      `una subida moderada (~+12%).`;
  } else if (demandIndex >= 35) {
    verdict = 'balanced';
    verdictLabel = 'Demanda equilibrada — mantené o ajustá poco';
    suggestedPct = 4;
    rationale =
      `La demanda de este plan es estable. Un ajuste leve (~+4%) acompaña la inflación ` +
      `sin arriesgar conversión.`;
  } else {
    verdict = 'low';
    verdictLabel = 'Demanda baja — no conviene subir';
    suggestedPct = 0;
    rationale =
      `Este plan capta poca demanda relativa. Subir el precio ahora arriesga la ` +
      `conversión; conviene mantenerlo o revisar su propuesta de valor.`;
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    planCode: plan.code,
    activeSubs,
    activeSubsAllPlans,
    shareOfActive,
    signups30d,
    demandIndex,
    verdict,
    verdictLabel,
    rationale,
    suggestedMonthly: round(plan.priceMonthly * (1 + suggestedPct / 100)),
    suggestedYearly: round(plan.priceYearly * (1 + suggestedPct / 100)),
    suggestedPct,
  };
}

// ─── CAMBIOS DE PRECIO ─────────────────────────────────────────────────────

function applyRound(value: number, mode: RoundMode): number {
  if (value <= 0) return value;
  if (mode === 'integer') return Math.round(value);
  if (mode === 'psychological') {
    // Precio "X,99" — termina en .99 para el efecto psicológico.
    const whole = Math.max(1, Math.round(value));
    return whole - 0.01;
  }
  return Math.round(value * 100) / 100;
}

interface PriceChangeInput {
  /** 'monthly' | 'yearly' | 'both' (sólo percentage admite 'both'). */
  cycle: BillingCycle | 'both';
  method: 'absolute' | 'percentage' | 'demand';
  /** absolute/demand: el nuevo precio. percentage: el % a aplicar. */
  value: number;
  reason?: string;
  round?: RoundMode;
}

interface Actor {
  id?: string | null;
  email?: string | null;
}

/** Aplica un cambio de precio a un plan y lo registra en el historial. */
export async function applyPriceChange(
  planId: string,
  input: PriceChangeInput,
  actor: Actor,
): Promise<{ plan: PlanRow; changes: PriceHistoryEntry[] }> {
  const plan = await getPlanById(planId);
  if (!plan) throw new Error('Plan no encontrado.');
  if (plan.isCustom) {
    throw new Error('Este plan es de cotización personalizada; su precio no se edita acá.');
  }

  const round: RoundMode = input.round ?? 'none';
  const reason = (input.reason || '').trim().slice(0, 500) || null;

  if ((input.method === 'absolute' || input.method === 'demand') && input.cycle === 'both') {
    throw new Error('El precio directo se fija por ciclo: elegí mensual o anual.');
  }
  if (!Number.isFinite(input.value)) {
    throw new Error('El valor del cambio no es válido.');
  }

  const cycles: BillingCycle[] = input.cycle === 'both' ? ['monthly', 'yearly'] : [input.cycle];
  const changes: PriceHistoryEntry[] = [];

  for (const cycle of cycles) {
    const oldPrice = cycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;

    let newPrice: number;
    let changePct: number | null;
    if (input.method === 'percentage') {
      newPrice = applyRound(oldPrice * (1 + input.value / 100), round);
      changePct = input.value;
    } else {
      // absolute / demand
      if (input.value < 0) throw new Error('El precio no puede ser negativo.');
      newPrice = applyRound(input.value, round);
      changePct = oldPrice > 0 ? Math.round(((newPrice - oldPrice) / oldPrice) * 10000) / 100 : null;
    }
    if (newPrice === oldPrice) continue;

    const col = cycle === 'monthly' ? 'price_monthly_usd' : 'price_yearly_usd';
    await prisma.$executeRawUnsafe(
      `UPDATE public.subscription_plans SET ${col} = $1, updated_at = now() WHERE id = $2`,
      newPrice, planId,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.plan_price_history
         (plan_id, plan_code, billing_cycle, old_price, new_price, change_method,
          change_pct, reason, changed_by, changed_by_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      planId, plan.code, cycle, oldPrice, newPrice, input.method,
      changePct, reason, actor.id ?? null, actor.email ?? null,
    );
    changes.push({
      id: '', billingCycle: cycle, oldPrice, newPrice,
      changeMethod: input.method, changePct, reason,
      changedByEmail: actor.email ?? null, createdAt: new Date().toISOString(),
    });
  }

  const updated = await getPlanById(planId);
  return { plan: updated!, changes };
}

interface BulkAdjustInput {
  /** % a aplicar a todos los planes de pago. */
  pct: number;
  cycle: BillingCycle | 'both';
  reason?: string;
  round?: RoundMode;
}

/**
 * Ajuste porcentual masivo: aplica el mismo % a todos los planes de pago
 * (omite el plan gratuito y los de cotización personalizada).
 */
export async function bulkAdjustPrices(
  input: BulkAdjustInput,
  actor: Actor,
): Promise<{ adjusted: number; plans: PlanRow[] }> {
  if (!Number.isFinite(input.pct) || input.pct === 0) {
    throw new Error('Indicá un porcentaje de ajuste distinto de cero.');
  }
  const all = await listPlansForAdmin();
  const targets = all.filter((p) => !p.isCustom && (p.priceMonthly > 0 || p.priceYearly > 0));
  const reason = (input.reason || '').trim().slice(0, 500)
    || `Ajuste masivo ${input.pct > 0 ? '+' : ''}${input.pct}%`;

  const updated: PlanRow[] = [];
  for (const p of targets) {
    const { plan } = await applyPriceChange(
      p.id,
      { cycle: input.cycle, method: 'percentage', value: input.pct, reason, round: input.round },
      actor,
    );
    updated.push(plan);
  }
  // El historial de un ajuste masivo se marca 'bulk' para distinguirlo.
  await prisma.$executeRawUnsafe(
    `UPDATE public.plan_price_history SET change_method = 'bulk'
      WHERE change_method = 'percentage' AND reason = $1
        AND created_at > now() - interval '2 minutes'`,
    reason,
  );
  return { adjusted: updated.length, plans: updated };
}

// ─── EDICIÓN DE FEATURES Y METADATOS ───────────────────────────────────────

interface PlanMetaInput {
  name?: string;
  description?: string;
  features?: string[];
  isPopular?: boolean;
  isActive?: boolean;
  storageGb?: number;
  documentsLimit?: number;
  monthlyQueries?: number;
  apiCallsLimit?: number;
}

/** Edita los features y metadatos de un plan (no el precio). */
export async function updatePlanMeta(planId: string, meta: PlanMetaInput): Promise<PlanRow> {
  const plan = await getPlanById(planId);
  if (!plan) throw new Error('Plan no encontrado.');

  // Regla de un solo plan destacado.
  if (meta.isPopular === true) {
    await prisma.$executeRawUnsafe(
      `UPDATE public.subscription_plans SET is_popular = false WHERE id <> $1`,
      planId,
    );
  }

  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;
  const push = (col: string, val: any) => { sets.push(`${col} = $${i++}`); vals.push(val); };

  if (meta.name !== undefined) push('name', String(meta.name).trim().slice(0, 100));
  if (meta.description !== undefined) push('description', String(meta.description).trim().slice(0, 1000));
  if (meta.features !== undefined) {
    const feats = meta.features.map((f) => String(f).trim()).filter(Boolean).slice(0, 30);
    push('features', feats);
  }
  if (meta.isPopular !== undefined) push('is_popular', meta.isPopular === true);
  if (meta.isActive !== undefined) push('is_active', meta.isActive === true);
  if (meta.storageGb !== undefined) push('storage_gb', Number(meta.storageGb));
  if (meta.documentsLimit !== undefined) push('documents_limit', Math.trunc(Number(meta.documentsLimit)));
  if (meta.monthlyQueries !== undefined) push('monthly_queries', Math.trunc(Number(meta.monthlyQueries)));
  if (meta.apiCallsLimit !== undefined) push('api_calls_limit', Math.trunc(Number(meta.apiCallsLimit)));

  if (sets.length === 0) return plan;

  sets.push('updated_at = now()');
  vals.push(planId);
  await prisma.$executeRawUnsafe(
    `UPDATE public.subscription_plans SET ${sets.join(', ')} WHERE id = $${i}`,
    ...vals,
  );

  return (await getPlanById(planId))!;
}
