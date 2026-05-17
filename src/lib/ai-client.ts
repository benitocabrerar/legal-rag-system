/**
 * Factory dinámico de cliente IA. Lee config desde public.ai_settings y
 * cachea por 30 segundos. Cuando un admin actualiza la config en DB,
 * el cambio se propaga automáticamente sin reiniciar el server.
 *
 * Soporta:
 *   - provider='openai'   → instancia OpenAI con baseURL standard
 *   - provider='anthropic' → wrapper que expone .chat.completions.create()
 *     con la misma forma que OpenAI, traduciendo a Anthropic Messages API.
 *
 * Capacidades extendidas (v2):
 *   - Streaming: stream=true devuelve un AsyncIterable<ChunkLikeOpenAI>
 *     en ambos providers. En Anthropic se traduce el SSE nativo a chunks
 *     con shape OpenAI ({ choices:[{ delta:{ content }}] }).
 *   - Vision: messages[].content puede ser string o array con partes
 *     { type:'text', text } y { type:'image_url', image_url:{ url } }.
 *     El wrapper traduce a Anthropic ({ type:'image', source:{...base64} }).
 *
 * Uso:
 *   const client = await getAiClient();
 *   const res = await client.chat.completions.create({ messages, model: client.model });
 */
import OpenAI from 'openai';
import { prisma } from './prisma.js';

const ENC_KEY = process.env.AI_SETTINGS_ENCRYPTION_KEY || process.env.JWT_SECRET || 'dev-fallback-key';
const CACHE_TTL_MS = 30_000;

/** Timeout (ms) de la llamada HTTP a Anthropic. Cubre conexión + tiempo hasta
 *  los headers de respuesta; un stream que ya empezó a fluir NO se aborta. */
const ANTHROPIC_TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS) || 90_000;
/** Reintentos ante sobrecarga del upstream (429/500/502/503/529) o red caída. */
const ANTHROPIC_MAX_RETRIES = Number(process.env.ANTHROPIC_MAX_RETRIES) || 3;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * POST a la API de Anthropic con timeout (AbortController) y reintentos con
 * backoff exponencial. Antes esta llamada era un `fetch` pelado sin timeout:
 * si Anthropic se ponía lento o devolvía 529 (Overloaded), el request del
 * usuario quedaba colgado para siempre (modal "Analizando…" girando sin fin).
 *
 * Reintenta ante 429/500/502/503/529 y errores de red. NO reintenta ante
 * timeout (un timeout = lentitud real; reintentar solo multiplica la espera)
 * ni ante 4xx de cliente (400/401/404 — reintentar no los arregla).
 */
async function anthropicFetch(
  body: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<Response> {
  const RETRYABLE = new Set([429, 500, 502, 503, 529]);
  let lastError: unknown;

  for (let attempt = 0; attempt <= ANTHROPIC_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (r.ok) return r;

      if (RETRYABLE.has(r.status) && attempt < ANTHROPIC_MAX_RETRIES) {
        const retryAfter = Number(r.headers.get('retry-after'));
        const backoffMs = retryAfter > 0
          ? retryAfter * 1000
          : Math.min(2 ** attempt * 1000, 8000);
        await r.text().catch(() => {}); // drena el body para liberar la conexión
        await sleep(backoffMs);
        continue;
      }

      const errText = await r.text().catch(() => '');
      throw new Error(`Anthropic ${r.status}: ${errText.slice(0, 300)}`);
    } catch (err: any) {
      lastError = err;
      if (err?.name === 'AbortError') {
        throw new Error(
          `Anthropic: la solicitud superó el tiempo límite de ${ANTHROPIC_TIMEOUT_MS}ms`,
        );
      }
      // Error de red (fetch failed / ECONNRESET / DNS): reintentable.
      const isNetwork =
        err instanceof TypeError ||
        /fetch failed|network|ECONNRESET|ENOTFOUND|EAI_AGAIN/i.test(String(err?.message));
      if (isNetwork && attempt < ANTHROPIC_MAX_RETRIES) {
        await sleep(Math.min(2 ** attempt * 1000, 8000));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Anthropic: fallo tras agotar los reintentos');
}

interface AiSettings {
  provider: 'openai' | 'anthropic';
  model: string;
  embedding_model: string;
  api_key: string | null;
  temperature: number;
  max_tokens: number;
}

let cache: { settings: AiSettings; fetchedAt: number } | null = null;

async function loadSettings(): Promise<AiSettings> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.settings;

  const r = await prisma.$queryRawUnsafe<any[]>(
    `SELECT provider, model, embedding_model, temperature, max_tokens,
            CASE WHEN api_key_encrypted IS NOT NULL
                 THEN pgp_sym_decrypt(api_key_encrypted, $1)::text
                 ELSE NULL END AS api_key
     FROM public.ai_settings WHERE id='default'`,
    ENC_KEY
  );
  const row = r[0];
  const settings: AiSettings = {
    // Default por convención del producto: Claude (Anthropic) en su última
    // versión disponible para el hosting. Si la operadora cambia el plan
    // a OpenAI desde /admin/ai-settings, esto se ignora.
    provider: row?.provider ?? 'anthropic',
    model: row?.model ?? 'claude-opus-4-7',
    embedding_model: row?.embedding_model ?? 'text-embedding-3-small',
    api_key: row?.api_key ?? null,
    temperature: Number(row?.temperature ?? 0.2),
    max_tokens: Number(row?.max_tokens ?? 6000),
  };
  cache = { settings, fetchedAt: Date.now() };
  return settings;
}

export function invalidateAiCache() {
  cache = null;
}

// ============================================================================
// Tipos públicos (shape OpenAI-compatible)
// ============================================================================

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  /** OpenAI-only. Anthropic lo ignora; pedir "responde en JSON" en el prompt. */
  response_format?: { type: 'json_object' | 'text' };
}

export interface ChatCompletionChunk {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    delta: { role?: 'assistant'; content?: string };
    finish_reason: string | null;
  }>;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: { role: 'assistant'; content: string };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export interface AiClient {
  provider: 'openai' | 'anthropic';
  model: string;
  embeddingModel: string;
  /** Modelo a usar para llamadas de visión. Coincide con `model` si éste soporta visión;
   *  si no, se elige un default vision-capable del mismo provider. */
  visionModel: string;
  chat: {
    completions: {
      /** Llamada no-streaming. Para streaming usar `streamChat()` del cliente. */
      create: (req: ChatCompletionRequest) => Promise<ChatCompletionResponse>;
    };
  };
  /** Stream provider-agnóstico. Devuelve chunks en shape OpenAI:
   *  `{ choices: [{ delta: { content }, finish_reason }] }`.
   *  Funciona idénticamente para OpenAI y Anthropic (este último traduce su SSE). */
  streamChat: (req: ChatCompletionRequest) => Promise<AsyncIterable<ChatCompletionChunk>>;
  embeddings: {
    create: (req: { model?: string; input: string | string[]; dimensions?: number }) => Promise<any>;
  };
}

// ============================================================================
// Helpers
// ============================================================================

/** Modelos vision-capable conocidos por provider. Si el modelo activo no está en la lista,
 *  se usa el default para vision. Mantener sincronizado con AVAILABLE_MODELS en admin/ai-settings. */
const VISION_CAPABLE = {
  openai: new Set(['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4-turbo-preview']),
  anthropic: new Set([
    'claude-opus-4-7',
    'claude-sonnet-4-6',
    'claude-haiku-4-5',
    'claude-3-5-sonnet-latest',
    'claude-3-5-haiku-latest',
    'claude-3-opus-latest',
  ]),
};
const VISION_DEFAULT = {
  openai: 'gpt-4o',
  anthropic: 'claude-opus-4-7',
};

function resolveVisionModel(provider: 'openai' | 'anthropic', model: string): string {
  return VISION_CAPABLE[provider].has(model) ? model : VISION_DEFAULT[provider];
}

/**
 * Si el caller pasó un modelo legacy hardcoded que pertenece al OTRO provider
 * (ej. 'gpt-4' cuando el provider activo es Anthropic), lo descartamos y
 * usamos el modelo configurado. Esto vuelve resiliente al wrapper ante
 * código legacy que aún tenga `model: 'gpt-X'` o `model: 'claude-X'`.
 */
function resolveModel(provider: 'openai' | 'anthropic', requested: string | undefined, fallback: string): string {
  if (!requested) return fallback;
  const isOpenAiModel = /^(gpt-|o\d|text-|whisper)/i.test(requested);
  const isAnthropicModel = /^claude-/i.test(requested);
  if (provider === 'openai' && isAnthropicModel) return fallback;
  if (provider === 'anthropic' && isOpenAiModel) return fallback;
  return requested;
}

function normalizeContent(content: string | ContentPart[]): ContentPart[] {
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  return content;
}

/** Convierte un image_url (data URL o https) a bloque Anthropic image. */
function toAnthropicImage(url: string): any {
  const dataMatch = url.match(/^data:([^;]+);base64,(.+)$/);
  if (dataMatch) {
    return {
      type: 'image',
      source: { type: 'base64', media_type: dataMatch[1], data: dataMatch[2] },
    };
  }
  // URL externa: Anthropic acepta {type:'url'} desde 2024.
  return { type: 'image', source: { type: 'url', url } };
}

/** Traduce un mensaje OpenAI-shape a Anthropic content block. */
function toAnthropicContent(content: string | ContentPart[]): any {
  if (typeof content === 'string') return content;
  return content.map((p) => {
    if (p.type === 'text') return { type: 'text', text: p.text };
    if (p.type === 'image_url') return toAnthropicImage(p.image_url.url);
    return p;
  });
}

// ============================================================================
// OpenAI client
// ============================================================================

function buildOpenAiClient(s: AiSettings): AiClient {
  const apiKey = s.api_key || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('No OpenAI API key configured');
  const oa = new OpenAI({ apiKey });
  return {
    provider: 'openai',
    model: s.model,
    embeddingModel: s.embedding_model,
    visionModel: resolveVisionModel('openai', s.model),
    chat: {
      completions: {
        create: async (req) => {
          const { stream: _strip, ...rest } = req;
          const payload: any = {
            ...rest,
            model: resolveModel('openai', req.model, s.model),
            temperature: req.temperature ?? s.temperature,
            max_tokens: req.max_tokens ?? s.max_tokens,
            stream: false,
          };
          return oa.chat.completions.create(payload) as any;
        },
      },
    },
    streamChat: async (req) => {
      const { stream: _strip, ...rest } = req;
      const payload: any = {
        ...rest,
        model: resolveModel('openai', req.model, s.model),
        temperature: req.temperature ?? s.temperature,
        max_tokens: req.max_tokens ?? s.max_tokens,
        stream: true,
      };
      // OpenAI SDK ya devuelve un AsyncIterable<ChatCompletionChunk>-compatible.
      return oa.chat.completions.create(payload) as any;
    },
    embeddings: {
      create: (req) =>
        oa.embeddings.create({
          model: req.model ?? s.embedding_model,
          input: req.input,
          dimensions: req.dimensions,
        } as any),
    },
  };
}

// ============================================================================
// Anthropic client — wrapper que mimetiza OpenAI shape
// ============================================================================

/** Parsea un stream SSE de Anthropic y yield ChatCompletionChunk con shape OpenAI. */
async function* anthropicStreamToOpenAiChunks(
  res: Response,
  model: string
): AsyncGenerator<ChatCompletionChunk, void, unknown> {
  if (!res.body) throw new Error('Anthropic stream sin body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let messageId = `chatcmpl-${Date.now()}`;
  let finishReason: string | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events están separados por línea en blanco
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const ev of events) {
        const dataLine = ev.split('\n').find((l) => l.startsWith('data: '));
        if (!dataLine) continue;
        const payload = dataLine.slice(6).trim();
        if (!payload || payload === '[DONE]') continue;

        let parsed: any;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }

        if (parsed.type === 'message_start' && parsed.message?.id) {
          messageId = parsed.message.id;
        } else if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
          yield {
            id: messageId,
            model,
            choices: [
              {
                index: 0,
                delta: { content: parsed.delta.text || '' },
                finish_reason: null,
              },
            ],
          };
        } else if (parsed.type === 'message_delta' && parsed.delta?.stop_reason) {
          finishReason = parsed.delta.stop_reason;
        } else if (parsed.type === 'message_stop') {
          yield {
            id: messageId,
            model,
            choices: [{ index: 0, delta: {}, finish_reason: finishReason || 'stop' }],
          };
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {}
  }
}

function buildAnthropicClient(s: AiSettings): AiClient {
  const apiKey = s.api_key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('No Anthropic API key configured');

  // Embeddings de Anthropic NO existen; caemos a OpenAI con OPENAI_API_KEY del entorno.
  const fallbackOpenAiKey = process.env.OPENAI_API_KEY;
  const oaForEmbed = fallbackOpenAiKey ? new OpenAI({ apiKey: fallbackOpenAiKey }) : null;

  /** Modelos de Anthropic que YA NO aceptan `temperature` ni `top_p`.
   *  Claude Opus 4.7 (y posteriores) deprecaron estos parámetros — pasarlos
   *  devuelve 400 "`temperature` is deprecated for this model".
   *  Mantengo la lista explícita para no asumir; si algún día un modelo
   *  nuevo vuelve a aceptarlos, no caemos mal. */
  const NO_TEMPERATURE_MODELS = new Set([
    'claude-opus-4-7',
    'claude-opus-4-7-1m',
  ]);

  /** Helper interno que arma el body + headers para llamadas a Anthropic. */
  const buildAnthropicCall = (req: ChatCompletionRequest, stream: boolean) => {
    const sysMessages = req.messages
      .filter((m) => m.role === 'system')
      .map((m) =>
        typeof m.content === 'string'
          ? m.content
          : normalizeContent(m.content)
              .filter((p) => p.type === 'text')
              .map((p: any) => p.text)
              .join('\n\n'),
      )
      .join('\n\n');
    const otherMessages = req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: toAnthropicContent(m.content) }));

    const resolvedModel = resolveModel('anthropic', req.model, s.model);
    const body: Record<string, unknown> = {
      model: resolvedModel,
      max_tokens: req.max_tokens ?? s.max_tokens,
      system: sysMessages || undefined,
      messages: otherMessages,
      stream,
    };
    // Solo agregamos temperature si el modelo lo soporta. Opus 4.7 lo rechaza.
    if (!NO_TEMPERATURE_MODELS.has(resolvedModel)) {
      body.temperature = req.temperature ?? s.temperature;
    }

    const headers: Record<string, string> = {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    };
    if (stream) headers.accept = 'text/event-stream';

    return { body, headers };
  };

  return {
    provider: 'anthropic',
    model: s.model,
    embeddingModel: s.embedding_model,
    visionModel: resolveVisionModel('anthropic', s.model),
    chat: {
      completions: {
        create: async (req) => {
          const { body, headers } = buildAnthropicCall(req, false);
          const r = await anthropicFetch(body, headers);
          const data = (await r.json()) as any;
          const text = (data.content || []).map((c: any) => c.text || '').join('');
          return {
            id: data.id,
            model: data.model,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: text },
                finish_reason: data.stop_reason || 'stop',
              },
            ],
            usage: data.usage,
          };
        },
      },
    },
    streamChat: async (req) => {
      const { body, headers } = buildAnthropicCall(req, true);
      const r = await anthropicFetch(body, headers);
      return anthropicStreamToOpenAiChunks(r, String(body.model));
    },
    embeddings: {
      create: async (req) => {
        if (!oaForEmbed) throw new Error('Embeddings con Anthropic requieren OPENAI_API_KEY como fallback');
        // Forzamos modelo de embeddings de OpenAI; descartamos modelos no-OpenAI
        // pasados por callers legacy.
        const reqModel = req.model;
        const embedModel = reqModel && /^text-/i.test(reqModel) ? reqModel : s.embedding_model;
        return oaForEmbed.embeddings.create({
          model: embedModel,
          input: req.input,
          dimensions: req.dimensions,
        } as any);
      },
    },
  };
}

export async function getAiClient(): Promise<AiClient> {
  const s = await loadSettings();
  return s.provider === 'anthropic' ? buildAnthropicClient(s) : buildOpenAiClient(s);
}

export async function getAiInfo() {
  const s = await loadSettings();
  return {
    provider: s.provider,
    model: s.model,
    embeddingModel: s.embedding_model,
    visionModel: resolveVisionModel(s.provider, s.model),
    temperature: s.temperature,
    max_tokens: s.max_tokens,
  };
}
