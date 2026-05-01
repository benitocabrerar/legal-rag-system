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
 * Uso:
 *   const client = await getAiClient();
 *   const res = await client.chat.completions.create({ messages, model: client.model });
 */
import OpenAI from 'openai';
import { prisma } from './prisma.js';

const ENC_KEY = process.env.AI_SETTINGS_ENCRYPTION_KEY || process.env.JWT_SECRET || 'dev-fallback-key';
const CACHE_TTL_MS = 30_000;

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

export interface AiClient {
  provider: 'openai' | 'anthropic';
  model: string;
  embeddingModel: string;
  /** API compatible con openai.chat.completions.create */
  chat: {
    completions: {
      create: (req: {
        messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
        model?: string;
        temperature?: number;
        max_tokens?: number;
        stream?: boolean;
      }) => Promise<any>;
    };
  };
  embeddings: {
    create: (req: { model?: string; input: string | string[]; dimensions?: number }) => Promise<any>;
  };
}

function buildOpenAiClient(s: AiSettings): AiClient {
  const apiKey = s.api_key || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('No OpenAI API key configured');
  const oa = new OpenAI({ apiKey });
  return {
    provider: 'openai',
    model: s.model,
    embeddingModel: s.embedding_model,
    chat: {
      completions: {
        create: (req) =>
          oa.chat.completions.create({
            model: req.model ?? s.model,
            messages: req.messages,
            temperature: req.temperature ?? s.temperature,
            max_tokens: req.max_tokens ?? s.max_tokens,
            stream: req.stream ?? false,
          } as any),
      },
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

function buildAnthropicClient(s: AiSettings): AiClient {
  const apiKey = s.api_key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('No Anthropic API key configured');

  // Embeddings de Anthropic NO existen; caemos a OpenAI con OPENAI_API_KEY del entorno.
  const fallbackOpenAiKey = process.env.OPENAI_API_KEY;
  const oaForEmbed = fallbackOpenAiKey ? new OpenAI({ apiKey: fallbackOpenAiKey }) : null;

  return {
    provider: 'anthropic',
    model: s.model,
    embeddingModel: s.embedding_model,
    chat: {
      completions: {
        create: async (req) => {
          // Traducir messages OpenAI-shape → Anthropic.
          // Sistema en Anthropic va separado, no como rol.
          const sysMessages = req.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
          const otherMessages = req.messages.filter((m) => m.role !== 'system');

          const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: req.model ?? s.model,
              max_tokens: req.max_tokens ?? s.max_tokens,
              temperature: req.temperature ?? s.temperature,
              system: sysMessages || undefined,
              messages: otherMessages.map((m) => ({ role: m.role, content: m.content })),
              stream: req.stream ?? false,
            }),
          });

          if (!r.ok) {
            const err = await r.text();
            throw new Error(`Anthropic ${r.status}: ${err.slice(0, 300)}`);
          }
          const data = await r.json() as any;
          const text = (data.content || []).map((c: any) => c.text || '').join('');
          // Mimic OpenAI ChatCompletion shape
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
    embeddings: {
      create: async (req) => {
        if (!oaForEmbed) throw new Error('Embeddings con Anthropic requieren OPENAI_API_KEY como fallback');
        return oaForEmbed.embeddings.create({
          model: req.model ?? s.embedding_model,
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
  return { provider: s.provider, model: s.model, embeddingModel: s.embedding_model };
}
