/**
 * Telegram Notify — capa de notificaciones de alto nivel.
 *
 * Traduce eventos del dominio (norma nueva, novedad en caso, alerta de
 * operación) a mensajes de Telegram, resolviendo destinatarios y
 * respetando las preferencias de cada usuario.
 *
 * Es fail-safe por diseño: si Telegram no está configurado o un envío
 * falla, se loguea pero NUNCA se propaga el error — la notificación
 * in-app es la fuente de verdad, Telegram es un canal adicional.
 */
import {
  sendTelegramMessage,
  isTelegramConfigured,
  getTelegramAdminChatId,
  escapeHtml,
} from './telegram.service.js';
import { getActiveChatsForNotifType, getLinkByUserId } from './telegram-link.service.js';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  || process.env.FRONTEND_PUBLIC_URL
  || 'https://poweria-legal.vercel.app';

// ─── NORMA NUEVA DEL CORPUS (broadcast a abogados) ─────────────────────────

export interface NewNormPayload {
  normTitle: string;
  legalHierarchy: string | null;
  publicationDate: string | Date | null;
  category: string | null;
  actionUrl: string | null;
}

const HIERARCHY_LABEL: Record<string, string> = {
  CONSTITUCION: 'Constitución',
  CODIGOS_ORGANICOS: 'Código Orgánico',
  LEYES_ORGANICAS: 'Ley Orgánica',
  CODIGOS_ORDINARIOS: 'Código Ordinario',
  LEYES_ORDINARIAS: 'Ley Ordinaria',
};

/**
 * Envía a Telegram el aviso de una norma nueva incorporada al corpus,
 * a todos los chats vinculados con la preferencia `corpus` activa.
 * Devuelve cuántos mensajes se enviaron.
 */
export async function notifyNewNormViaTelegram(payload: NewNormPayload): Promise<number> {
  if (!isTelegramConfigured()) return 0;

  let chats: Array<{ userId: string; chatId: string }>;
  try {
    chats = await getActiveChatsForNotifType('corpus');
  } catch (e: any) {
    console.error('[telegram-notify] no se pudieron resolver destinatarios:', e?.message);
    return 0;
  }
  if (chats.length === 0) return 0;

  const hier = payload.legalHierarchy ? HIERARCHY_LABEL[payload.legalHierarchy] : null;
  const dateStr = payload.publicationDate
    ? new Date(payload.publicationDate).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const lines = [
    '📚 <b>Nueva normativa en el corpus</b>',
    '',
    `<b>${escapeHtml(payload.normTitle)}</b>`,
  ];
  if (hier) lines.push(`📋 ${escapeHtml(hier)}`);
  if (payload.category) lines.push(`🏷️ ${escapeHtml(payload.category)}`);
  if (dateStr) lines.push(`📅 Publicada: ${escapeHtml(dateStr)}`);
  lines.push('', '<i>Revisá si afecta tus casos en curso.</i>');

  const text = lines.join('\n');
  const url = payload.actionUrl
    ? (payload.actionUrl.startsWith('http') ? payload.actionUrl : `${SITE_URL}${payload.actionUrl}`)
    : `${SITE_URL}/dashboard`;
  const buttons = [[{ text: '📖 Ver en Poweria Legal', url }]];

  let sent = 0;
  for (const chat of chats) {
    const ok = await sendTelegramMessage(chat.chatId, text, {
      buttons,
      logKind: 'notification',
      logUserId: chat.userId,
      disablePreview: true,
    });
    if (ok) sent++;
  }
  return sent;
}

// ─── NOTIFICACIÓN GENÉRICA A UN USUARIO ────────────────────────────────────

/**
 * Envía a un usuario concreto (si tiene Telegram vinculado y la
 * preferencia del tipo activa) una notificación. Usado para novedades
 * de casos, agenda y tareas.
 */
export async function notifyUserViaTelegram(
  userId: string,
  notifType: 'corpus' | 'cases' | 'calendar' | 'tasks',
  payload: { title: string; body: string; actionUrl?: string | null },
): Promise<boolean> {
  if (!isTelegramConfigured()) return false;

  let link;
  try {
    link = await getLinkByUserId(userId);
  } catch {
    return false;
  }
  if (!link || !link.isActive) return false;
  if (!link.prefs[notifType]) return false; // preferencia desactivada

  const icon = notifType === 'cases' ? '⚖️' : notifType === 'calendar' ? '📅' : notifType === 'tasks' ? '✅' : '🔔';
  const text = `${icon} <b>${escapeHtml(payload.title)}</b>\n\n${escapeHtml(payload.body)}`;
  const url = payload.actionUrl
    ? (payload.actionUrl.startsWith('http') ? payload.actionUrl : `${SITE_URL}${payload.actionUrl}`)
    : null;

  return sendTelegramMessage(link.chatId, text, {
    buttons: url ? [[{ text: 'Abrir en Poweria Legal', url }]] : undefined,
    logKind: 'notification',
    logUserId: userId,
    disablePreview: true,
  });
}

// ─── ALERTAS DE OPERACIÓN (al chat del admin/operador) ─────────────────────

export type OperatorAlertLevel = 'info' | 'success' | 'warning' | 'error';

const LEVEL_ICON: Record<OperatorAlertLevel, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '🔴',
};

/**
 * Envía una alerta de operación al chat del operador (COGNITEX).
 * Para eventos de sistema: sync de corpus, pagos pendientes, errores.
 *
 * Requiere TELEGRAM_ADMIN_CHAT_ID. Si no está configurado, no-op.
 */
export async function notifyOperatorViaTelegram(
  title: string,
  body: string,
  opts: { level?: OperatorAlertLevel; actionUrl?: string } = {},
): Promise<boolean> {
  if (!isTelegramConfigured()) return false;
  const adminChatId = getTelegramAdminChatId();
  if (!adminChatId) return false;

  const level = opts.level ?? 'info';
  const text = [
    `${LEVEL_ICON[level]} <b>${escapeHtml(title)}</b>`,
    '',
    escapeHtml(body),
    '',
    `<i>Poweria Legal · ${new Date().toLocaleString('es-EC')}</i>`,
  ].join('\n');

  return sendTelegramMessage(adminChatId, text, {
    buttons: opts.actionUrl ? [[{ text: 'Abrir', url: opts.actionUrl }]] : undefined,
    logKind: 'alert',
    disablePreview: true,
  });
}
