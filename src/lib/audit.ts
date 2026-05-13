/**
 * Audit log helper — insertar entradas en public.audit_logs sin bloquear
 * el flujo del request. Las inserciones son fire-and-forget con catch silencioso
 * (loggea pero no rompe el handler que las invoca).
 *
 * Convención:
 *   - entity = 'case'      → action describe operación sobre el caso
 *   - entity = 'document'  → action describe operación sobre un documento del caso
 *   - changes (jsonb) puede incluir { caseId, ...extra } para que el listado
 *     por caso siempre pueda filtrar por changes->>'caseId' además de entity_id.
 *
 * Vista UI: drawer "Actividad del caso" en la página de detalle.
 */
import { prisma } from './prisma.js';

export type AuditAction =
  | 'CASE_CREATED'
  | 'CASE_UPDATED'
  | 'CASE_DELETED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_DELETED'
  | 'DOCUMENT_VIEWED'
  | 'DOCUMENT_DOWNLOADED'
  | 'DOC_GEN_REQUESTED'
  | 'DOC_GEN_COMPLETED'
  | 'DOC_GEN_SAVED'
  | 'DEEP_ANALYSIS_REQUESTED'
  | 'DEEP_ANALYSIS_COMPLETED'
  | 'BRAIN_REFRESHED'
  | 'CHAT_QUERY';

export interface AuditExtra {
  caseId?: string;
  documentId?: string;
  title?: string;
  filename?: string;
  docType?: string;
  chunks?: number;
  riskLevel?: string;
  legalSourcesUsed?: number;
  durationMs?: number;
  ip?: string | null;
  userAgent?: string | null;
  [k: string]: unknown;
}

export async function logActivity(
  userId: string | null,
  action: AuditAction,
  entity: 'case' | 'document' | 'user',
  entityId: string | null,
  extra: AuditExtra = {},
  success = true,
  errorMessage?: string,
): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.audit_logs
         (id, user_id, action, entity, entity_id, changes, ip_address, user_agent, success, error_message, created_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, now())`,
      userId,
      action,
      entity,
      entityId,
      JSON.stringify(extra),
      extra.ip ?? null,
      extra.userAgent ?? null,
      success,
      errorMessage ?? null,
    );
  } catch (e: any) {
    // Audit no debe nunca romper la operación de negocio.
    // eslint-disable-next-line no-console
    console.warn('[audit] insert failed:', e?.message);
  }
}

/** Versión fire-and-forget — no await, ideal para no añadir latencia. */
export function logActivityAsync(
  userId: string | null,
  action: AuditAction,
  entity: 'case' | 'document' | 'user',
  entityId: string | null,
  extra: AuditExtra = {},
  success = true,
  errorMessage?: string,
): void {
  void logActivity(userId, action, entity, entityId, extra, success, errorMessage);
}

/**
 * Lista actividad asociada a un caso. Une eventos:
 *   - entity='case' && entity_id=caseId
 *   - entity='document' && changes->>'caseId'=caseId
 */
export interface CaseActivity {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  changes: Record<string, unknown>;
  success: boolean;
  errorMessage: string | null;
  createdAt: Date;
}

export async function listCaseActivity(
  caseId: string,
  limit = 100,
  offset = 0,
): Promise<CaseActivity[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT al.id, al.action, al.entity, al.entity_id, al.user_id,
            u.email AS user_email, u.name AS user_name,
            al.changes, al.success, al.error_message, al.created_at
       FROM public.audit_logs al
       LEFT JOIN public.users u ON u.id = al.user_id
      WHERE (al.entity = 'case' AND al.entity_id = $1)
         OR (al.entity = 'document' AND (al.changes->>'caseId') = $1)
      ORDER BY al.created_at DESC
      LIMIT $2 OFFSET $3`,
    caseId, limit, offset,
  );
  return rows.map((r: any) => ({
    id: r.id,
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id,
    userId: r.user_id,
    userEmail: r.user_email,
    userName: r.user_name,
    changes: r.changes || {},
    success: !!r.success,
    errorMessage: r.error_message,
    createdAt: r.created_at,
  }));
}
