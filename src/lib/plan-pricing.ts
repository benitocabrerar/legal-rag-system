/**
 * Resolución de precios de planes — fuente única.
 *
 * `subscription_plans` es la tabla autoritativa de planes y precios. La
 * edita el panel super-admin de Gestión de Precios. Este módulo la lee:
 *   · listPublicPlans()  → catálogo para la página de precios
 *   · resolvePlanPrice() → monto para el cobro (PayPal / transferencia)
 *
 * Como ambos caminos leen la tabla en cada request, un cambio de precio
 * desde el panel se refleja al instante, sin redeploy.
 */
import { prisma } from './prisma.js';

export type BillingCycle = 'monthly' | 'yearly';

/** Forma que consume la página de precios (compatible con su catálogo previo). */
export interface PublicPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  billing_cycle: BillingCycle;
  price_cents: number;
  currency: string;
  trial_days: number;
  features: string[];
  is_popular: boolean;
  display_order: number;
}

function toCents(usd: number): number {
  return Math.round(Number(usd || 0) * 100);
}

/**
 * Catálogo público de planes para la página de precios.
 * Omite los planes inactivos y los de cotización personalizada (precio < 0).
 */
export async function listPublicPlans(cycle?: string | null): Promise<PublicPlan[]> {
  const billing: BillingCycle = cycle === 'yearly' ? 'yearly' : 'monthly';
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, code, name, description, price_monthly_usd, price_yearly_usd,
            features, is_popular, display_order
       FROM public.subscription_plans
      WHERE is_active = true AND price_monthly_usd >= 0
      ORDER BY display_order`,
  );
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    billing_cycle: billing,
    price_cents: toCents(billing === 'yearly' ? r.price_yearly_usd : r.price_monthly_usd),
    currency: 'USD',
    trial_days: 0,
    features: Array.isArray(r.features) ? r.features : [],
    is_popular: r.is_popular === true,
    display_order: Number(r.display_order ?? 0),
  }));
}

export interface ResolvedPlanPrice {
  code: string;
  name: string;
  price_cents: number;
  currency: string;
  billing_cycle: BillingCycle;
}

/**
 * Resuelve el monto a cobrar de un plan, por código y ciclo.
 * Devuelve null si el plan no existe, está inactivo o es de cotización.
 */
export async function resolvePlanPrice(
  code: string,
  cycle?: string | null,
): Promise<ResolvedPlanPrice | null> {
  const billing: BillingCycle = cycle === 'yearly' ? 'yearly' : 'monthly';
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT code, name, price_monthly_usd, price_yearly_usd
       FROM public.subscription_plans
      WHERE code = $1 AND is_active = true
      LIMIT 1`,
    code,
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  const usd = billing === 'yearly' ? r.price_yearly_usd : r.price_monthly_usd;
  if (Number(usd) < 0) return null; // plan de cotización personalizada
  return {
    code: r.code,
    name: r.name,
    price_cents: toCents(usd),
    currency: 'USD',
    billing_cycle: billing,
  };
}
