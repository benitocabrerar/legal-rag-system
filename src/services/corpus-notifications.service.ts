/**
 * Corpus Notifications Service
 *
 * Notifica a usuarios in-app cuando una nueva norma se incorpora al
 * corpus. Inserta filas en `notifications` (type='corpus_update') que
 * el frontend lee desde GET /notifications.
 *
 * Audiencia: TODOS los usuarios activos (decisión de producto). Para
 * targeting por categoría legal en el futuro, ver `notifyUsersWithMatchingCases()`.
 */
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';

const SYSTEM_USER_PREFIX = 'system:';
const ACTIVE_SESSION_DAYS = 90;

interface LegalDocSnapshot {
  id: string;
  title: string;
  norm_title: string | null;
  norm_type: string | null;
  legal_hierarchy: string | null;
  publication_date: Date | null;
  category: string | null;
  metadata: any;
}

/**
 * Inserta una notificación in-app por cada usuario activo (con sesión
 * en los últimos N días). Devuelve el número de usuarios notificados.
 *
 * Idempotente parcialmente: dedup por (user_id, type, metadata.legalDocId)
 * vía un check previo. Si ya existe una notif para este doc, se omite
 * al usuario.
 */
export async function notifyAllActiveUsersOfNewNorm(legalDocId: string): Promise<number> {
  // 1) Cargar el doc
  const docs = await prisma.$queryRawUnsafe<LegalDocSnapshot[]>(
    `SELECT id, title, norm_title,
            norm_type::text         AS norm_type,
            legal_hierarchy::text   AS legal_hierarchy,
            publication_date, category, metadata
       FROM public.legal_documents
      WHERE id = $1`,
    legalDocId,
  );
  if (docs.length === 0) return 0;
  const doc = docs[0];

  // 2) Severidad según jerarquía
  const isHigh = doc.legal_hierarchy === 'CONSTITUCION'
              || doc.legal_hierarchy === 'CODIGOS_ORGANICOS'
              || doc.legal_hierarchy === 'LEYES_ORGANICAS';
  const priority: 'low' | 'medium' | 'high' = isHigh ? 'high' : 'medium';

  // 3) Texto humano
  const displayTitle = (doc.norm_title || doc.title || '').slice(0, 280);
  const dateLabel = doc.publication_date
    ? new Date(doc.publication_date).toLocaleDateString('es-EC', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : 'recientemente';

  const notifTitle = '📚 Nueva normativa publicada';
  const notifMessage = `${displayTitle} — publicada en el Registro Oficial el ${dateLabel}. Revisa si afecta tus casos en curso.`;

  // 4) Usuarios activos elegibles
  const users = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT DISTINCT u.id
       FROM public.users u
      WHERE u.is_active = true
        AND u.id NOT LIKE $1
        AND (u.last_login IS NULL OR u.last_login > now() - ($2::int || ' days')::interval)`,
    `${SYSTEM_USER_PREFIX}%`,
    ACTIVE_SESSION_DAYS,
  );

  if (users.length === 0) return 0;

  // 5) Filter out users que ya tienen notif para este doc (dedup)
  const existing = await prisma.$queryRawUnsafe<Array<{ user_id: string }>>(
    `SELECT DISTINCT user_id
       FROM public.notifications
      WHERE type = 'corpus_update'
        AND metadata->>'legalDocId' = $1
        AND user_id = ANY($2::text[])`,
    legalDocId,
    users.map((u) => u.id),
  );
  const existingSet = new Set(existing.map((e) => e.user_id));
  const targets = users.filter((u) => !existingSet.has(u.id));

  if (targets.length === 0) return 0;

  // 6) Bulk insert
  const actionUrl = `/admin/registro-oficial?tab=norm-catalog&focus=${encodeURIComponent(legalDocId)}`;
  // Sanea aiSummary: si contiene texto de auditoría interna, NO lo enviamos al usuario.
  // Marcadores que NO deben llegar al abogado: "[Audit canonical]", "Catálogo curado",
  // metadata técnica de jerarquía/tipo (ya se muestra como badge separado).
  const rawSummary = doc.metadata?.aiSummary as string | null | undefined;
  const safeSummary = rawSummary && !/\[Audit canonical\]|Catálogo curado v\d/i.test(rawSummary)
    ? rawSummary
    : null;

  const metadata = {
    legalDocId,
    normTitle: doc.norm_title,
    normType: doc.norm_type,
    legalHierarchy: doc.legal_hierarchy,
    publicationDate: doc.publication_date,
    editionPdfUrl: doc.metadata?.editionPdfUrl || null,
    editionNumber: doc.metadata?.editionNumber || null,
    aiSummary: safeSummary,
  };

  // Construimos VALUES dinámicos para createMany — Prisma no maneja
  // bien la inserción masiva con campos JSON, así que usamos raw SQL.
  const placeholders: string[] = [];
  const params: any[] = [];
  let i = 1;
  for (const u of targets) {
    placeholders.push(
      `($${i++}, $${i++}, 'corpus_update', $${i++}, $${i++}, $${i++}, false, NULL, $${i++}, $${i++}::jsonb, now())`,
    );
    params.push(
      randomUUID(),
      u.id,
      notifTitle,
      notifMessage,
      priority,
      actionUrl,
      JSON.stringify(metadata),
    );
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO public.notifications
       (id, user_id, type, title, message, priority, is_read, read_at, action_url, metadata, created_at)
     VALUES ${placeholders.join(', ')}`,
    ...params,
  );

  return targets.length;
}

/**
 * (Reservado para futuro) Variante segmentada: notifica solo a usuarios
 * con casos activos cuyo `legal_matter` matchea la categoría de la norma.
 *
 * No usada por defecto — el producto pidió broadcast a todos.
 */
export async function notifyUsersWithMatchingCases(
  legalDocId: string,
  legalMatterTokens: string[],
): Promise<number> {
  // Stub para implementación futura
  void legalDocId; void legalMatterTokens;
  return 0;
}
