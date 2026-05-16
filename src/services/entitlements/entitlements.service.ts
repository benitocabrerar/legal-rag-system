/**
 * Servicio de Entitlements — resolución y enforcement.
 *
 * Resuelve, para un usuario, el plan efectivo y el conjunto de capacidades
 * y cuotas que le corresponden, y ofrece guards para hacerlas cumplir.
 *
 * Diseño robusto para el futuro:
 *   · Las capacidades viven en `subscription_plans.entitlements` (jsonb).
 *   · "Mover un feature entre planes" o cobrar más por uno = editar ese
 *     jsonb desde el panel super-admin. El código no cambia.
 *   · Agregar un feature avanzado nuevo = sumar una entrada al catálogo.
 *   · Fail-closed: ante un dato faltante se asume el valor más restrictivo.
 */
import { prisma } from '../../lib/prisma.js';
import { ENTITLEMENT_CATALOG, getEntitlementDef, normalizeEntitlements } from './catalog.js';
import type { EntitlementMap } from './catalog.js';

// ─── ERROR TIPADO ──────────────────────────────────────────────────────────

/** Error de entitlement: la ruta lo traduce a un HTTP status legible. */
export class EntitlementError extends Error {
  code: string;
  httpStatus: number;
  constructor(code: string, message: string, httpStatus = 403) {
    super(message);
    this.name = 'EntitlementError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// ─── ENTITLEMENTS DE UN PLAN ───────────────────────────────────────────────

export interface PlanEntitlements {
  planCode: string;
  planName: string;
  entitlements: EntitlementMap;
}

export async function getPlanEntitlements(planCode: string): Promise<PlanEntitlements> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT code, name, entitlements FROM public.subscription_plans WHERE code = $1 LIMIT 1`,
    planCode,
  );
  if (rows.length === 0) {
    return { planCode, planName: planCode, entitlements: normalizeEntitlements({}) };
  }
  return {
    planCode: rows[0].code,
    planName: rows[0].name,
    entitlements: normalizeEntitlements(rows[0].entitlements),
  };
}

/** Matriz completa: el catálogo + los entitlements de cada plan (para el panel). */
export async function getEntitlementsMatrix() {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, code, name, is_active, display_order, entitlements
       FROM public.subscription_plans ORDER BY display_order`,
  );
  return {
    catalog: ENTITLEMENT_CATALOG,
    plans: rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      isActive: r.is_active === true,
      entitlements: normalizeEntitlements(r.entitlements),
    })),
  };
}

// ─── CONTEXTO DEL USUARIO ──────────────────────────────────────────────────

export interface UserEntitlements {
  userId: string;
  planCode: string;
  planName: string;
  isAdmin: boolean;
  /** Capacidades y cuotas efectivas del usuario. */
  entitlements: EntitlementMap;
  trial: {
    /** Días de prueba del plan (0 = el plan no es de prueba). */
    days: number;
    active: boolean;
    expired: boolean;
    /** Días que faltan (negativo si ya venció). */
    daysLeft: number | null;
    endsAt: string | null;
  };
  /** false = la prueba venció y no hay plan pago: acceso restringido. */
  accessOk: boolean;
  usage: { cases: number };
}

const DAY_MS = 86_400_000;

export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, planTier: true, createdAt: true },
  });
  if (!user) throw new EntitlementError('user_not_found', 'Usuario no encontrado.', 404);

  const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'super_admin';

  // Suscripción paga activa, si existe.
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: 'active' },
    include: { plan: { select: { code: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const planCode = sub?.plan?.code || user.planTier || 'free';
  const plan = await getPlanEntitlements(planCode);
  const ent = plan.entitlements;

  // Estado de prueba: aplica si el plan tiene trial_days > 0 y NO hay
  // suscripción paga activa.
  const trialDays = Number(ent.trial_days || 0);
  const hasPaidSub = !!sub;
  let trialActive = false;
  let trialExpired = false;
  let trialDaysLeft: number | null = null;
  let trialEndsAt: string | null = null;
  if (trialDays > 0 && !hasPaidSub) {
    trialActive = true;
    const endsMs = user.createdAt.getTime() + trialDays * DAY_MS;
    trialEndsAt = new Date(endsMs).toISOString();
    trialDaysLeft = Math.ceil((endsMs - Date.now()) / DAY_MS);
    trialExpired = Date.now() > endsMs;
  }

  // Los administradores nunca quedan con acceso restringido.
  const accessOk = isAdmin || !trialExpired;

  const cases = await prisma.case.count({ where: { userId } }).catch(() => 0);

  return {
    userId,
    planCode: plan.planCode,
    planName: plan.planName,
    isAdmin,
    entitlements: ent,
    trial: { days: trialDays, active: trialActive, expired: trialExpired, daysLeft: trialDaysLeft, endsAt: trialEndsAt },
    accessOk,
    usage: { cases },
  };
}

// ─── GUARDS DE ENFORCEMENT ─────────────────────────────────────────────────

/** Lanza si la prueba gratuita venció y no hay un plan pago activo. */
export async function assertActiveAccess(userId: string): Promise<UserEntitlements> {
  const u = await getUserEntitlements(userId);
  if (!u.accessOk) {
    throw new EntitlementError(
      'trial_expired',
      `Tu prueba gratuita de ${u.trial.days} días finalizó. Activá un plan para seguir usando Poweria Legal.`,
      402,
    );
  }
  return u;
}

/** Lanza si el usuario no puede crear otro caso (prueba vencida o cuota llena). */
export async function assertCanCreateCase(userId: string): Promise<void> {
  const u = await assertActiveAccess(userId);
  const limit = Number(u.entitlements.cases ?? 0);
  if (limit === -1) return; // ilimitado
  if (u.usage.cases >= limit) {
    throw new EntitlementError(
      'case_limit_reached',
      `Alcanzaste el límite de ${limit} ${limit === 1 ? 'caso' : 'casos'} de tu plan ${u.planName}. ` +
      `Subí de plan para gestionar más casos.`,
      403,
    );
  }
}

/** Lanza si el plan del usuario no incluye el feature indicado. */
export async function assertFeature(userId: string, featureKey: string): Promise<void> {
  const def = getEntitlementDef(featureKey);
  if (!def || def.kind !== 'feature') {
    throw new EntitlementError('unknown_feature', `Feature desconocido: ${featureKey}.`, 500);
  }
  const u = await assertActiveAccess(userId);
  if (u.entitlements[featureKey] !== true) {
    throw new EntitlementError(
      'feature_locked',
      `Tu plan ${u.planName} no incluye "${def.labelEs}". Subí de plan para activarlo.`,
      403,
    );
  }
}

// ─── EDICIÓN (PANEL SUPER-ADMIN) ───────────────────────────────────────────

/**
 * Aplica cambios a los entitlements de un plan. `patch` es un mapa parcial
 * clave→valor; solo se aceptan claves del catálogo, con el tipo correcto.
 * Devuelve el mapa de entitlements resultante.
 */
export async function updatePlanEntitlements(
  planId: string,
  patch: Record<string, unknown>,
): Promise<EntitlementMap> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT entitlements FROM public.subscription_plans WHERE id = $1 LIMIT 1`,
    planId,
  );
  if (rows.length === 0) throw new EntitlementError('plan_not_found', 'Plan no encontrado.', 404);

  const current = normalizeEntitlements(rows[0].entitlements);
  const next: EntitlementMap = { ...current };

  for (const [key, raw] of Object.entries(patch)) {
    const def = getEntitlementDef(key);
    if (!def) continue; // se ignoran claves fuera del catálogo
    if (def.kind === 'feature') {
      next[key] = raw === true || raw === 'true';
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n)) continue;
      // -1 = ilimitado; el resto se acota a enteros no negativos.
      next[key] = n < 0 ? -1 : Math.trunc(n);
    }
  }

  await prisma.$executeRawUnsafe(
    `UPDATE public.subscription_plans SET entitlements = $1::jsonb, updated_at = now() WHERE id = $2`,
    JSON.stringify(next), planId,
  );
  return next;
}
