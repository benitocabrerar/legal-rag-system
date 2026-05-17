/**
 * Telegram Bot — lógica de aplicación.
 *
 * Procesa los `update` entrantes del webhook y decide qué hacer:
 *   - Comandos: /start, /vincular, /ayuda, /estado, /desvincular
 *   - Texto libre  → consulta RAG sobre el corpus jurídico ecuatoriano
 *   - callback_query (botones inline)
 *
 * Toda respuesta se envía vía telegram.service. Esta capa NO conoce
 * el transporte HTTP — recibe el objeto `update` ya parseado.
 */
import { prisma } from '../lib/prisma.js';
import { getAiClient } from '../lib/ai-client.js';
import { POWERIA_FEATURES_KB, POWERIA_MODULES_SHORT } from '../lib/app-knowledge.js';
import { retrieveLegalContextForChat } from './legal-rag-retrieval.service.js';
import {
  sendTelegramMessage,
  sendChatAction,
  answerCallbackQuery,
  escapeHtml,
  getTelegramBotUsername,
} from './telegram.service.js';
import {
  consumeLinkToken,
  getLinkByChatId,
  unlinkByChatId,
} from './telegram-link.service.js';

// ─── TIPOS (subset de la Telegram Bot API) ─────────────────────────────────

interface TgUser {
  id: number;
  is_bot: boolean;
  first_name?: string;
  username?: string;
}
interface TgChat {
  id: number;
  type: string;
}
interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  text?: string;
}
interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}
export interface TelegramUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

// ─── RAG — RESPUESTA A PREGUNTAS JURÍDICAS ─────────────────────────────────

const BOT_SYSTEM_PROMPT = `Sos el asistente de Poweria Legal. Tenés DOS funciones y elegís según la pregunta:

(A) CONSULTA JURÍDICA — preguntas sobre derecho ecuatoriano (normas, plazos,
    procedimientos, artículos). Respondé con el CONTEXTO NORMATIVO provisto.
(B) AYUDA SOBRE LA APP — preguntas sobre qué hace Poweria Legal o cómo usar un
    módulo ("¿cómo genero una demanda?", "¿qué es la Sala de Litigación?",
    "¿para qué sirve el ROI?"). Respondé con la BASE DE CONOCIMIENTO DEL
    PRODUCTO que tenés abajo.

REGLAS GENERALES:
- Respondé SIEMPRE en español, profesional pero claro.
- Sé conciso: Telegram es un chat. Máximo ~250 palabras salvo que la pregunta
  lo exija. Usá viñetas cuando ayuden.

REGLAS PARA (A) CONSULTA JURÍDICA:
- Basá la respuesta ÚNICAMENTE en la normativa del contexto provisto. Si el
  contexto no alcanza, decílo y sugerí consultar la fuente oficial.
- Citá los artículos y normas concretas (ej. "Art. 76 del COIP").
- NO inventes artículos ni números de ley. Si no estás seguro, aclaralo.
- Ofrecé el marco normativo; la decisión es del abogado.

REGLAS PARA (B) AYUDA SOBRE LA APP:
- Usá SOLO la base de conocimiento del producto de abajo. NO inventes módulos,
  botones ni precios que no figuren ahí.
- Explicá dónde está la función y los pasos para usarla.
- Si preguntan algo de la app que no está en la base, decílo y sugerí el
  Centro de ayuda (/help dentro de la app).

═══════════ BASE DE CONOCIMIENTO DEL PRODUCTO ═══════════
${POWERIA_FEATURES_KB}`;

/**
 * Responde una pregunta jurídica usando el corpus (RAG).
 * Devuelve el texto formateado en HTML de Telegram, listo para enviar.
 */
export async function answerLegalQuestion(query: string): Promise<string> {
  const clean = query.trim();
  if (clean.length < 5) {
    return 'Escribime una consulta jurídica un poco más completa y te ayudo. 📚';
  }

  // 1) Recuperar contexto normativo del corpus
  const ctx = await retrieveLegalContextForChat(clean, { limit: 8, filterCountryCode: 'EC' });

  // 2) Construir mensajes para el LLM. Si hay contexto del corpus, es una
  //    consulta jurídica; si no, puede ser una pregunta sobre la app — el
  //    system prompt sabe responder ambos casos.
  const userContent = ctx.formattedPrompt
    ? `CONTEXTO NORMATIVO (corpus jurídico ecuatoriano):\n${ctx.formattedPrompt}\n\nCONSULTA:\n${clean}`
    : `No se recuperó contexto normativo del corpus para esta consulta. Si es una pregunta sobre cómo usar Poweria Legal, respondé con la base de conocimiento del producto; si es jurídica y no tenés base, decílo.\n\nCONSULTA:\n${clean}`;

  // 3) Generar respuesta
  let answer = '';
  try {
    const ai = await getAiClient();
    const completion = await ai.chat.completions.create({
      messages: [
        { role: 'system', content: BOT_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      max_tokens: 1200,
    });
    answer = completion.choices[0]?.message?.content?.trim() || '';
  } catch (e: any) {
    console.error('[telegram-bot] RAG generation failed:', e?.message);
    return '⚠️ Tuve un problema generando la respuesta. Reintentá en unos segundos.';
  }

  if (!answer) {
    return 'No pude generar una respuesta para esa consulta. Reformulala e intentá de nuevo.';
  }

  // 4) Formatear para Telegram (HTML). El LLM responde en texto/markdown
  //    ligero; convertimos lo mínimo y escapamos el resto.
  let html = escapeHtml(answer)
    // **negrita** → <b>
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    // *cursiva* simple → <i>
    .replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g, '<i>$1</i>');

  // 5) Anexar fuentes citadas si las hay
  if (ctx.citationsList) {
    html += `\n\n<b>📎 Fuentes del corpus:</b>\n${escapeHtml(ctx.citationsList)}`;
  }
  // El descargo del corpus solo aplica a consultas jurídicas; las preguntas
  // sobre la app (sin contexto del corpus) no lo necesitan.
  if (ctx.formattedPrompt) {
    html += '\n\n<i>Respuesta orientativa basada en el corpus de Poweria Legal. Verificá siempre la fuente oficial.</i>';
  }

  return html;
}

// ─── COMANDOS ──────────────────────────────────────────────────────────────

function helpText(): string {
  return [
    '<b>🤖 Asistente Poweria Legal</b>',
    '',
    'Soy el asistente de Poweria Legal. Esto es lo que puedo hacer:',
    '',
    '💬 <b>Consultas jurídicas</b> — escribime cualquier pregunta de derecho ecuatoriano en lenguaje natural y te respondo con base en el corpus legal (leyes, códigos, Registro Oficial).',
    '',
    '🧭 <b>Ayuda sobre la app</b> — preguntame qué hace Poweria Legal o cómo usar cualquier módulo (casos, Sala de Litigación, generador de documentos, finanzas, ROI, trámites, etc.) y te explico.',
    '',
    '🔔 <b>Notificaciones</b> — si vinculás tu cuenta, te aviso acá cuando se publican normas nuevas, hay novedades en tus casos, audiencias en agenda o tareas por vencer.',
    '',
    '<b>Comandos:</b>',
    '/funciones — ver todo lo que hace la aplicación',
    '/estado — ver si tu cuenta está vinculada',
    '/vincular — instrucciones para vincular tu cuenta',
    '/desvincular — desconectar este chat',
    '/ayuda — mostrar esta ayuda',
    '',
    '<i>Ejemplos: «¿Cuál es el plazo para apelar en materia penal?» · «¿Cómo genero una demanda en la app?»</i>',
  ].join('\n');
}

/** Lista los módulos de la aplicación — comando /funciones. */
function funcionesText(): string {
  const lines = POWERIA_MODULES_SHORT.map(
    (m) => `${m.emoji} <b>${escapeHtml(m.name)}</b> — ${escapeHtml(m.desc)}`,
  );
  return [
    '<b>🧭 Qué hace Poweria Legal</b>',
    '',
    'La plataforma de IA jurídica de COGNITEX. Sus módulos:',
    '',
    ...lines,
    '',
    'Preguntame por cualquiera de ellos (ej. «¿cómo funciona la Sala de Litigación?») y te explico cómo usarlo. Para la guía completa, abrí el Centro de ayuda dentro de la app.',
  ].join('\n');
}

async function logInbound(chatId: number, userId: string | null, kind: string, text: string): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.telegram_messages_log (chat_id, user_id, direction, kind, text_excerpt)
       VALUES ($1::bigint, $2, 'inbound', $3, $4)`,
      String(chatId), userId, kind, text.slice(0, 500),
    );
  } catch { /* non-critical */ }
}

/**
 * Maneja /start. Puede venir con un token de vinculación:
 * t.me/<bot>?start=<token>  →  el texto es "/start <token>".
 */
async function handleStart(msg: TgMessage, arg: string): Promise<void> {
  const chatId = msg.chat.id;
  const from = msg.from;

  if (arg) {
    // Intento de vinculación
    const result = await consumeLinkToken(arg, chatId, {
      username: from?.username,
      firstName: from?.first_name,
    });
    if (result.ok) {
      await sendTelegramMessage(
        chatId,
        [
          '✅ <b>¡Cuenta vinculada!</b>',
          '',
          'Tu cuenta de Poweria Legal quedó conectada a este chat.',
          'Desde ahora vas a recibir acá tus notificaciones.',
          '',
          'Probá hacerme una consulta jurídica cuando quieras. Escribí /ayuda para ver todo lo que puedo hacer.',
        ].join('\n'),
        { logKind: 'command', logUserId: result.userId },
      );
    } else {
      await sendTelegramMessage(
        chatId,
        `⚠️ No pude vincular tu cuenta: ${escapeHtml(result.reason)}\n\nGenerá un código nuevo desde la app (Configuración → Telegram).`,
        { logKind: 'command' },
      );
    }
    return;
  }

  // /start sin token — bienvenida
  const link = await getLinkByChatId(chatId);
  const intro = link
    ? 'Tu cuenta ya está vinculada. ✅'
    : 'Tu cuenta todavía no está vinculada. Usá /vincular para conectarla.';
  await sendTelegramMessage(
    chatId,
    `${helpText()}\n\n${intro}`,
    { logKind: 'command', logUserId: link?.userId ?? null },
  );
}

async function handleEstado(msg: TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const link = await getLinkByChatId(chatId);
  if (!link) {
    await sendTelegramMessage(
      chatId,
      '🔌 Este chat <b>no está vinculado</b> a ninguna cuenta de Poweria Legal.\n\nUsá /vincular para conectarlo.',
      { logKind: 'command' },
    );
    return;
  }
  const prefs = link.prefs;
  await sendTelegramMessage(
    chatId,
    [
      '✅ <b>Cuenta vinculada</b>',
      '',
      `Vinculada desde: ${new Date(link.linkedAt).toLocaleDateString('es-EC')}`,
      '',
      '<b>Notificaciones activas:</b>',
      `${prefs.corpus ? '🟢' : '⚪'} Normas nuevas del corpus`,
      `${prefs.cases ? '🟢' : '⚪'} Novedades en casos`,
      `${prefs.calendar ? '🟢' : '⚪'} Agenda / audiencias`,
      `${prefs.tasks ? '🟢' : '⚪'} Tareas`,
      '',
      '<i>Ajustá las preferencias desde la app (Configuración → Telegram).</i>',
    ].join('\n'),
    { logKind: 'command', logUserId: link.userId },
  );
}

async function handleVincular(msg: TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const link = await getLinkByChatId(chatId);
  if (link) {
    await sendTelegramMessage(
      chatId,
      'Tu cuenta ya está vinculada. ✅\n\nUsá /estado para ver el detalle o /desvincular para desconectarla.',
      { logKind: 'command', logUserId: link.userId },
    );
    return;
  }
  await sendTelegramMessage(
    chatId,
    [
      '🔗 <b>Vincular tu cuenta</b>',
      '',
      'Para conectar este chat con tu cuenta de Poweria Legal:',
      '',
      '1️⃣ Entrá a la app web de Poweria Legal.',
      '2️⃣ Andá a <b>Configuración → Telegram</b>.',
      '3️⃣ Tocá <b>«Conectar Telegram»</b>.',
      '4️⃣ Se abrirá este chat con un código — confirmá y listo.',
      '',
      'El código vale 15 minutos. Si expira, generá uno nuevo.',
    ].join('\n'),
    { logKind: 'command' },
  );
}

async function handleDesvincular(msg: TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const link = await getLinkByChatId(chatId);
  if (!link) {
    await sendTelegramMessage(chatId, 'Este chat no está vinculado a ninguna cuenta.', { logKind: 'command' });
    return;
  }
  await sendTelegramMessage(
    chatId,
    '¿Seguro que querés desvincular este chat? Dejarás de recibir notificaciones.',
    {
      logKind: 'command',
      logUserId: link.userId,
      buttons: [[
        { text: '✅ Sí, desvincular', callbackData: 'unlink:confirm' },
        { text: '❌ Cancelar', callbackData: 'unlink:cancel' },
      ]],
    },
  );
}

// ─── DESPACHADOR PRINCIPAL ─────────────────────────────────────────────────

async function handleMessage(msg: TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  if (!text) return;

  // ¿Es un comando?
  if (text.startsWith('/')) {
    const [rawCmd, ...rest] = text.split(/\s+/);
    // Telegram manda comandos como /cmd@BotName en grupos
    const cmd = rawCmd.split('@')[0].toLowerCase();
    const arg = rest.join(' ').trim();

    switch (cmd) {
      case '/start':       await handleStart(msg, arg); return;
      case '/ayuda':
      case '/help':        await sendTelegramMessage(chatId, helpText(), { logKind: 'command' }); return;
      case '/funciones':
      case '/features':    await sendTelegramMessage(chatId, funcionesText(), { logKind: 'command', disablePreview: true }); return;
      case '/estado':      await handleEstado(msg); return;
      case '/vincular':    await handleVincular(msg); return;
      case '/desvincular': await handleDesvincular(msg); return;
      default:
        await sendTelegramMessage(
          chatId,
          'No reconozco ese comando. Escribí /ayuda para ver los disponibles.',
          { logKind: 'command' },
        );
        return;
    }
  }

  // Texto libre → consulta RAG
  const link = await getLinkByChatId(chatId);
  await logInbound(chatId, link?.userId ?? null, 'rag_query', text);

  // El bot responde consultas a cualquiera, pero invita a vincular si no lo está.
  await sendChatAction(chatId, 'typing');
  const answer = await answerLegalQuestion(text);
  await sendTelegramMessage(chatId, answer, {
    logKind: 'rag_query',
    logUserId: link?.userId ?? null,
    disablePreview: true,
  });

  if (!link) {
    await sendTelegramMessage(
      chatId,
      '💡 <i>Vinculá tu cuenta con /vincular para recibir además notificaciones de tus casos y de normas nuevas.</i>',
      { logKind: 'system' },
    );
  }
}

async function handleCallbackQuery(cb: TgCallbackQuery): Promise<void> {
  const chatId = cb.message?.chat.id;
  const data = cb.data || '';
  if (!chatId) {
    await answerCallbackQuery(cb.id);
    return;
  }

  if (data === 'unlink:confirm') {
    const userId = await unlinkByChatId(chatId);
    await answerCallbackQuery(cb.id, 'Cuenta desvinculada');
    await sendTelegramMessage(
      chatId,
      '🔌 Listo. Este chat quedó desvinculado. Podés volver a conectarlo cuando quieras con /vincular.',
      { logKind: 'command', logUserId: userId },
    );
    return;
  }
  if (data === 'unlink:cancel') {
    await answerCallbackQuery(cb.id, 'Cancelado');
    await sendTelegramMessage(chatId, 'Operación cancelada. Tu cuenta sigue vinculada. ✅', { logKind: 'command' });
    return;
  }

  // callback desconocido
  await answerCallbackQuery(cb.id);
}

/**
 * Punto de entrada — el webhook llama esto con el update parseado.
 * Es fail-safe: cualquier error se loguea pero no se propaga (el webhook
 * debe responder 200 a Telegram igual, o Telegram reintenta en loop).
 */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }
  } catch (e: any) {
    console.error('[telegram-bot] handleUpdate error:', e?.message || e);
  }
}

/** Para construir el deep link de vinculación en el frontend/rutas. */
export function buildLinkDeepLink(token: string): string {
  const username = getTelegramBotUsername();
  return username ? `https://t.me/${username}?start=${token}` : '';
}
