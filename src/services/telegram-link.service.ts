/**
 * Telegram Link — gestión del vínculo entre usuarios de Poweria Legal
 * y sus chats de Telegram.
 *
 * Flujo de vinculación:
 *   1. El usuario, logueado en la app, pide "Conectar Telegram".
 *      → createLinkToken(userId) genera un token corto con TTL de 15 min.
 *   2. La app abre el deep link t.me/<bot>?start=<token>.
 *   3. Telegram envía /start <token> al webhook.
 *   4. consumeLinkToken(token, chatId, userInfo) valida el token y
 *      crea/actualiza la fila en telegram_links.
 *
 * Un usuario tiene como máximo UN chat de Telegram y viceversa
 * (constraints UNIQUE en la tabla).
 */
import { prisma } from '../lib/prisma.js';
import { randomBytes } from 'crypto';

const TOKEN_TTL_MIN = 15;

export interface TelegramLink {
  userId: string;
  chatId: string;
  username: string | null;
  firstName: string | null;
  isActive: boolean;
  prefs: {
    corpus: boolean;
    cases: boolean;
    calendar: boolean;
    tasks: boolean;
  };
  linkedAt: string;
}

// ─── TOKENS DE VINCULACIÓN ─────────────────────────────────────────────────

/**
 * Genera un token de vinculación de un solo uso. Si el usuario ya tenía
 * tokens sin usar, los invalida (limpieza) antes de crear el nuevo.
 */
export async function createLinkToken(userId: string): Promise<{
  token: string;
  expiresAt: string;
}> {
  // Token URL-safe corto (deep link de Telegram acepta hasta 64 chars)
  const token = randomBytes(12).toString('base64url');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60_000);

  // Limpiar tokens viejos no usados de este usuario
  await prisma.$executeRawUnsafe(
    `DELETE FROM public.telegram_link_tokens
      WHERE user_id = $1 AND used_at IS NULL`,
    userId,
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO public.telegram_link_tokens (token, user_id, expires_at)
     VALUES ($1, $2, $3::timestamptz)`,
    token,
    userId,
    expiresAt.toISOString(),
  );

  return { token, expiresAt: expiresAt.toISOString() };
}

/**
 * Valida y consume un token: si es válido y no expiró, crea/actualiza el
 * vínculo en telegram_links. Idempotente para re-/start del mismo usuario.
 *
 * Devuelve el userId vinculado, o null si el token es inválido/expiró.
 */
export async function consumeLinkToken(
  token: string,
  chatId: string | number,
  userInfo: { username?: string; firstName?: string },
): Promise<{ ok: true; userId: string } | { ok: false; reason: string }> {
  const rows = await prisma.$queryRawUnsafe<Array<{
    user_id: string;
    expires_at: Date;
    used_at: Date | null;
  }>>(
    `SELECT user_id, expires_at, used_at
       FROM public.telegram_link_tokens
      WHERE token = $1`,
    token,
  );

  if (rows.length === 0) {
    return { ok: false, reason: 'Token inválido o no encontrado.' };
  }
  const row = rows[0];
  if (row.used_at) {
    return { ok: false, reason: 'Este código ya fue utilizado.' };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'El código expiró. Generá uno nuevo desde la app.' };
  }

  const userId = row.user_id;
  const chatIdStr = String(chatId);

  // Crear / actualizar el vínculo. ON CONFLICT por user_id (un user, un chat).
  // Si el chat ya estaba vinculado a OTRO usuario, el UNIQUE de chat_id
  // lo rechazaría — lo manejamos limpiando primero ese chat.
  await prisma.$executeRawUnsafe(
    `DELETE FROM public.telegram_links WHERE telegram_chat_id = $1::bigint AND user_id <> $2`,
    chatIdStr,
    userId,
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO public.telegram_links
       (user_id, telegram_chat_id, telegram_username, telegram_first_name, is_active, updated_at)
     VALUES ($1, $2::bigint, $3, $4, true, now())
     ON CONFLICT (user_id) DO UPDATE SET
       telegram_chat_id    = EXCLUDED.telegram_chat_id,
       telegram_username   = EXCLUDED.telegram_username,
       telegram_first_name = EXCLUDED.telegram_first_name,
       is_active           = true,
       updated_at          = now()`,
    userId,
    chatIdStr,
    userInfo.username ?? null,
    userInfo.firstName ?? null,
  );

  // Marcar el token como usado
  await prisma.$executeRawUnsafe(
    `UPDATE public.telegram_link_tokens SET used_at = now() WHERE token = $1`,
    token,
  );

  return { ok: true, userId };
}

// ─── CONSULTA DE VÍNCULOS ──────────────────────────────────────────────────

function mapLinkRow(r: any): TelegramLink {
  return {
    userId: r.user_id,
    chatId: String(r.telegram_chat_id),
    username: r.telegram_username,
    firstName: r.telegram_first_name,
    isActive: r.is_active,
    prefs: {
      corpus: r.notif_corpus,
      cases: r.notif_cases,
      calendar: r.notif_calendar,
      tasks: r.notif_tasks,
    },
    linkedAt: r.linked_at instanceof Date ? r.linked_at.toISOString() : String(r.linked_at),
  };
}

export async function getLinkByUserId(userId: string): Promise<TelegramLink | null> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM public.telegram_links WHERE user_id = $1`,
    userId,
  );
  return rows.length > 0 ? mapLinkRow(rows[0]) : null;
}

export async function getLinkByChatId(chatId: string | number): Promise<TelegramLink | null> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM public.telegram_links WHERE telegram_chat_id = $1::bigint`,
    String(chatId),
  );
  return rows.length > 0 ? mapLinkRow(rows[0]) : null;
}

/**
 * Lista los chats activos que deben recibir una notificación de cierto
 * tipo. Usado por el hook de notificaciones para resolver destinatarios.
 */
export async function getActiveChatsForNotifType(
  notifType: 'corpus' | 'cases' | 'calendar' | 'tasks',
): Promise<Array<{ userId: string; chatId: string }>> {
  const column = `notif_${notifType}`;
  const rows = await prisma.$queryRawUnsafe<Array<{ user_id: string; telegram_chat_id: bigint }>>(
    `SELECT user_id, telegram_chat_id
       FROM public.telegram_links
      WHERE is_active = true AND ${column} = true`,
  );
  return rows.map((r) => ({ userId: r.user_id, chatId: String(r.telegram_chat_id) }));
}

// ─── DESVINCULACIÓN Y PREFERENCIAS ─────────────────────────────────────────

export async function unlinkByUserId(userId: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `DELETE FROM public.telegram_links WHERE user_id = $1 RETURNING id`,
    userId,
  );
  return rows.length > 0;
}

export async function unlinkByChatId(chatId: string | number): Promise<string | null> {
  const rows = await prisma.$queryRawUnsafe<Array<{ user_id: string }>>(
    `DELETE FROM public.telegram_links WHERE telegram_chat_id = $1::bigint RETURNING user_id`,
    String(chatId),
  );
  return rows.length > 0 ? rows[0].user_id : null;
}

export async function updateNotifPrefs(
  userId: string,
  prefs: Partial<{ corpus: boolean; cases: boolean; calendar: boolean; tasks: boolean }>,
): Promise<boolean> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  for (const [key, col] of [
    ['corpus', 'notif_corpus'], ['cases', 'notif_cases'],
    ['calendar', 'notif_calendar'], ['tasks', 'notif_tasks'],
  ] as const) {
    if (prefs[key] !== undefined) {
      sets.push(`${col} = $${i++}`);
      params.push(prefs[key]);
    }
  }
  if (sets.length === 0) return false;
  params.push(userId);
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `UPDATE public.telegram_links SET ${sets.join(', ')}, updated_at = now()
      WHERE user_id = $${i} RETURNING id`,
    ...params,
  );
  return rows.length > 0;
}
