/**
 * Telegram Bot — servicio base de bajo nivel.
 *
 * Envoltorio sobre la Bot API de Telegram (https://core.telegram.org/bots/api).
 * Solo se ocupa de TRANSPORTE: enviar mensajes, registrar el webhook,
 * responder callbacks. La lógica de comandos / RAG vive en telegram-bot.service.
 *
 * Configuración (env vars):
 *   TELEGRAM_BOT_TOKEN      — token de @BotFather (obligatorio)
 *   TELEGRAM_BOT_USERNAME   — @handle del bot, sin @ (para deep links)
 *   TELEGRAM_WEBHOOK_SECRET — secret que Telegram reenvía en el header
 *                             X-Telegram-Bot-Api-Secret-Token (anti-spoof)
 *   TELEGRAM_ADMIN_CHAT_ID  — chat del operador para alertas de sistema
 *
 * El servicio es tolerante a configuración ausente: si no hay token,
 * `isTelegramConfigured()` devuelve false y los envíos hacen no-op con log,
 * de modo que el resto de la app no se rompe en entornos sin Telegram.
 */
import { prisma } from '../lib/prisma.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || '';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

const API_BASE = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : '';

// ─── CONFIG ───────────────────────────────────────────────────────────────

export function isTelegramConfigured(): boolean {
  return BOT_TOKEN.length > 0;
}

export function getTelegramBotUsername(): string {
  return BOT_USERNAME;
}

export function getTelegramWebhookSecret(): string {
  return WEBHOOK_SECRET;
}

export function getTelegramAdminChatId(): string {
  return ADMIN_CHAT_ID;
}

// ─── TIPOS ────────────────────────────────────────────────────────────────

export interface InlineButton {
  text: string;
  /** URL externa O callback_data — uno de los dos */
  url?: string;
  callbackData?: string;
}

export interface SendMessageOpts {
  /** Botones inline en filas. Cada sub-array es una fila. */
  buttons?: InlineButton[][];
  /** 'HTML' (default) o 'MarkdownV2'. HTML es más simple de escapar. */
  parseMode?: 'HTML' | 'MarkdownV2';
  /** Desactiva el preview de links */
  disablePreview?: boolean;
  /** Para auditoría en telegram_messages_log */
  logKind?: string;
  logUserId?: string | null;
}

interface TelegramApiResult<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

// ─── HELPERS DE FORMATO ───────────────────────────────────────────────────

/**
 * Escapa texto para parse_mode HTML de Telegram.
 * Telegram HTML solo permite < > & como entidades — el resto es literal.
 */
export function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Telegram rechaza mensajes > 4096 chars. Parte el texto en trozos
 * respetando saltos de línea cuando es posible.
 */
export function splitLongMessage(text: string, maxLen = 4000): string[] {
  if (text.length <= maxLen) return [text];
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf('\n', maxLen);
    if (cut < maxLen * 0.5) cut = maxLen; // si no hay salto razonable, corta duro
    parts.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\n+/, '');
  }
  if (remaining) parts.push(remaining);
  return parts;
}

// ─── API CALLS ────────────────────────────────────────────────────────────

async function callTelegram<T = unknown>(
  method: string,
  body: Record<string, unknown>,
): Promise<TelegramApiResult<T>> {
  if (!API_BASE) {
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN no configurado' };
  }
  try {
    const r = await fetch(`${API_BASE}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await r.json()) as TelegramApiResult<T>;
    return data;
  } catch (e: any) {
    return { ok: false, description: e?.message || 'network error' };
  }
}

function buildReplyMarkup(buttons?: InlineButton[][]): Record<string, unknown> | undefined {
  if (!buttons || buttons.length === 0) return undefined;
  return {
    inline_keyboard: buttons.map((row) =>
      row.map((b) => {
        const btn: Record<string, unknown> = { text: b.text };
        if (b.url) btn.url = b.url;
        if (b.callbackData) btn.callback_data = b.callbackData.slice(0, 64); // límite Telegram
        return btn;
      }),
    ),
  };
}

/**
 * Envía un mensaje a un chat. Si el texto excede 4096 chars lo parte.
 * Devuelve true si AL MENOS el primer envío fue exitoso.
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  opts: SendMessageOpts = {},
): Promise<boolean> {
  if (!isTelegramConfigured()) {
    console.warn('[telegram] sendMessage no-op: TELEGRAM_BOT_TOKEN ausente');
    return false;
  }

  const parts = splitLongMessage(text);
  let firstOk = false;

  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: parts[i],
      parse_mode: opts.parseMode ?? 'HTML',
      disable_web_page_preview: opts.disablePreview ?? false,
    };
    // Los botones solo van en el último fragmento
    if (isLast) {
      const markup = buildReplyMarkup(opts.buttons);
      if (markup) body.reply_markup = markup;
    }

    const res = await callTelegram('sendMessage', body);
    if (i === 0) firstOk = res.ok;
    if (!res.ok) {
      console.error(`[telegram] sendMessage falló (chat ${chatId}): ${res.description}`);
    }
  }

  // Auditoría — best-effort, no rompe el envío
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.telegram_messages_log (chat_id, user_id, direction, kind, text_excerpt)
       VALUES ($1::bigint, $2, 'outbound', $3, $4)`,
      String(chatId),
      opts.logUserId ?? null,
      opts.logKind ?? 'system',
      text.slice(0, 500),
    );
  } catch { /* non-critical */ }

  return firstOk;
}

/**
 * Indica al chat "el bot está escribiendo…" — UX mientras se genera la
 * respuesta RAG (que puede tardar varios segundos).
 */
export async function sendChatAction(
  chatId: string | number,
  action: 'typing' | 'upload_document' = 'typing',
): Promise<void> {
  await callTelegram('sendChatAction', { chat_id: chatId, action });
}

/**
 * Responde un callback_query (cuando el usuario toca un botón inline).
 * Telegram exige responder o el botón queda con spinner infinito.
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  await callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text ? text.slice(0, 200) : undefined,
  });
}

// ─── WEBHOOK MANAGEMENT ───────────────────────────────────────────────────

/**
 * Registra el webhook entrante. Se llama una vez al boot del server
 * (o desde un endpoint admin). El secret viaja en cada update que
 * Telegram envía, en el header X-Telegram-Bot-Api-Secret-Token.
 */
export async function setTelegramWebhook(webhookUrl: string): Promise<{ ok: boolean; description?: string }> {
  const res = await callTelegram('setWebhook', {
    url: webhookUrl,
    secret_token: WEBHOOK_SECRET || undefined,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: false,
  });
  return { ok: res.ok, description: res.description };
}

export async function deleteTelegramWebhook(): Promise<boolean> {
  const res = await callTelegram('deleteWebhook', { drop_pending_updates: false });
  return res.ok;
}

export async function getTelegramWebhookInfo(): Promise<TelegramApiResult> {
  return callTelegram('getWebhookInfo', {});
}

/**
 * getMe — útil para health checks: confirma que el token es válido.
 */
export async function getTelegramBotInfo(): Promise<TelegramApiResult<{ username: string; first_name: string }>> {
  return callTelegram('getMe', {});
}
