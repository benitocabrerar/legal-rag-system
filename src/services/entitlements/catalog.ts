/**
 * Catálogo de entitlements — la definición maestra de qué puede medirse y
 * activarse por plan.
 *
 * Cada plan guarda en `subscription_plans.entitlements` (jsonb) un objeto
 * con estas claves. Este catálogo describe el universo de claves posibles,
 * su tipo y su etiqueta — es lo que hace fácil "mover features entre planes"
 * y agregar features avanzados nuevos: se suma una entrada acá y aparece en
 * el panel de administración para todos los planes.
 *
 *   kind 'feature' → booleano (el plan incluye o no la capacidad)
 *   kind 'limit'   → numérico  (-1 = ilimitado)
 */

export type EntitlementKind = 'feature' | 'limit';

export interface EntitlementDef {
  key: string;
  kind: EntitlementKind;
  /** Agrupador para el panel: 'Cuotas', 'Litigación', 'Documentos', … */
  category: string;
  labelEs: string;
  labelEn: string;
  /** Valor por defecto si un plan no declara la clave (fail-closed). */
  defaultValue: number | boolean;
}

export const ENTITLEMENT_CATALOG: EntitlementDef[] = [
  // ─── Cuotas (límites numéricos) ──────────────────────────────────────
  { key: 'trial_days', kind: 'limit', category: 'Cuotas',
    labelEs: 'Días de prueba', labelEn: 'Trial days', defaultValue: 0 },
  { key: 'cases', kind: 'limit', category: 'Cuotas',
    labelEs: 'Casos activos', labelEn: 'Active cases', defaultValue: 0 },
  { key: 'ai_credits', kind: 'limit', category: 'Cuotas',
    labelEs: 'Créditos de IA / mes', labelEn: 'AI credits / month', defaultValue: 0 },
  { key: 'ocr_pages', kind: 'limit', category: 'Cuotas',
    labelEs: 'Páginas OCR / mes', labelEn: 'OCR pages / month', defaultValue: 0 },
  { key: 'storage_gb', kind: 'limit', category: 'Cuotas',
    labelEs: 'Almacenamiento (GB)', labelEn: 'Storage (GB)', defaultValue: 0 },
  { key: 'seats', kind: 'limit', category: 'Cuotas',
    labelEs: 'Usuarios incluidos', labelEn: 'Included seats', defaultValue: 1 },

  // ─── Features de litigación ──────────────────────────────────────────
  { key: 'litigation_room', kind: 'feature', category: 'Litigación',
    labelEs: 'Sala de Litigación', labelEn: 'Litigation Room', defaultValue: false },
  { key: 'ai_argument_cards', kind: 'feature', category: 'Litigación',
    labelEs: 'Tarjetas argumentales IA', labelEn: 'AI argument cards', defaultValue: false },
  { key: 'workflow_studio', kind: 'feature', category: 'Litigación',
    labelEs: 'Workflow Studio', labelEn: 'Workflow Studio', defaultValue: false },
  { key: 'citation_verification', kind: 'feature', category: 'Litigación',
    labelEs: 'Verificación de citas', labelEn: 'Citation verification', defaultValue: false },

  // ─── Features de documentos ──────────────────────────────────────────
  { key: 'document_generation', kind: 'feature', category: 'Documentos',
    labelEs: 'Generación de documentos', labelEn: 'Document generation', defaultValue: false },
  { key: 'tramites_agent', kind: 'feature', category: 'Documentos',
    labelEs: 'Agente de Trámites', labelEn: 'Court Filings Agent', defaultValue: false },
  { key: 'immigration_forms', kind: 'feature', category: 'Documentos',
    labelEs: 'Agente de Formularios de Inmigración', labelEn: 'Immigration Forms Agent', defaultValue: false },
  { key: 'legal_translator', kind: 'feature', category: 'Documentos',
    labelEs: 'Traductor jurídico bilingüe', labelEn: 'Bilingual Legal Translator', defaultValue: false },
  { key: 'ocr_vision', kind: 'feature', category: 'Documentos',
    labelEs: 'OCR Vision', labelEn: 'OCR Vision', defaultValue: false },

  // ─── Features avanzados ──────────────────────────────────────────────
  { key: 'finance_module', kind: 'feature', category: 'Avanzado',
    labelEs: 'Módulo Finanzas', labelEn: 'Finance module', defaultValue: false },
  { key: 'api_access', kind: 'feature', category: 'Avanzado',
    labelEs: 'Acceso a la API', labelEn: 'API access', defaultValue: false },
  { key: 'opus_mode', kind: 'feature', category: 'Avanzado',
    labelEs: 'Modo de razonamiento premium', labelEn: 'Premium reasoning mode', defaultValue: false },
  { key: 'priority_queue', kind: 'feature', category: 'Avanzado',
    labelEs: 'Prioridad en cola de IA', labelEn: 'AI queue priority', defaultValue: false },
  { key: 'advanced_reports', kind: 'feature', category: 'Avanzado',
    labelEs: 'Reportes avanzados', labelEn: 'Advanced reports', defaultValue: false },

  // ─── Colaboración ────────────────────────────────────────────────────
  { key: 'team_workspace', kind: 'feature', category: 'Colaboración',
    labelEs: 'Workspace de equipo y roles', labelEn: 'Team workspace & roles', defaultValue: false },
];

const BY_KEY = new Map(ENTITLEMENT_CATALOG.map((e) => [e.key, e]));

export function getEntitlementDef(key: string): EntitlementDef | undefined {
  return BY_KEY.get(key);
}

/** Tipo del mapa de entitlements de un plan (clave → valor). */
export type EntitlementMap = Record<string, number | boolean>;

/**
 * Normaliza el jsonb crudo de un plan contra el catálogo: cada clave del
 * catálogo queda presente, con su valor del plan o el default (fail-closed).
 */
export function normalizeEntitlements(raw: unknown): EntitlementMap {
  const src = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
  const out: EntitlementMap = {};
  for (const def of ENTITLEMENT_CATALOG) {
    const v = src[def.key];
    if (def.kind === 'feature') {
      out[def.key] = typeof v === 'boolean' ? v : Boolean(def.defaultValue);
    } else {
      out[def.key] = typeof v === 'number' && Number.isFinite(v) ? v : Number(def.defaultValue);
    }
  }
  return out;
}
