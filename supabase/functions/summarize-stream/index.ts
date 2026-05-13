// Edge Function · summarize-stream (Deno)
//
// Endpoint serverless de streaming SSE para resumen de documentos legales.
//
// **Provider-aware:** lee `public.ai_settings` (id='default') en cada cold start
// y enruta al provider configurado por el admin (OpenAI o Anthropic). Emite
// chunks SSE compatibles con OpenAI shape para que el cliente no tenga que
// distinguir el provider.
//
// Por qué corre en edge:
//   - Stream-by-default sin código WebSocket/SSE manual
//   - No bloquea el worker pool de Fastify durante respuestas largas
//   - Edge runtime corre cerca del usuario (latencia menor)
//
// Despliegue:
//   supabase functions deploy summarize-stream
//
// Llamada desde el frontend:
//   const r = await fetch(`${url}/functions/v1/summarize-stream`, {
//     method: 'POST',
//     headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
//     body: JSON.stringify({ documentId })
//   });
//   const reader = r.body.getReader();   // streaming chunks (SSE OpenAI shape)

// @ts-ignore — runtime Deno
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_DOC_CHARS = 60_000; // ~15k tokens
const SYSTEM_PROMPT =
  'Eres un asistente legal experto en Ecuador. Resume documentos legales de forma estructurada: (1) tipo y jerarquía, (2) tema principal, (3) artículos clave, (4) implicaciones prácticas.';

// Defaults usados si ai_settings está vacío. Mantener sincronizado con
// src/lib/ai-client.ts.
const DEFAULT_PROVIDER = 'anthropic' as const;
const DEFAULT_MODEL_OPENAI = 'gpt-4o-mini';
const DEFAULT_MODEL_ANTHROPIC = 'claude-opus-4-7';

interface AiSettings {
  provider: 'openai' | 'anthropic';
  model: string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return json({ error: 'auth required' }, 401);

  let body: { documentId?: string; legalDocumentId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  if (!body.documentId && !body.legalDocumentId) {
    return json({ error: 'documentId o legalDocumentId requerido' }, 400);
  }

  // Cliente con el JWT del usuario → respeta RLS
  const supabase = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL')!,
    // @ts-ignore
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } },
  );

  // 1. Cargar contenido del documento (RLS filtra)
  let title = '';
  let content = '';
  if (body.legalDocumentId) {
    const { data, error } = await supabase
      .from('legal_documents')
      .select('norm_title, content')
      .eq('id', body.legalDocumentId)
      .single();
    if (error || !data) return json({ error: error?.message ?? 'no encontrado' }, 404);
    title = data.norm_title as string;
    content = data.content as string;
  } else {
    const { data, error } = await supabase
      .from('documents')
      .select('title, content')
      .eq('id', body.documentId!)
      .single();
    if (error || !data) return json({ error: error?.message ?? 'no encontrado' }, 404);
    title = data.title as string;
    content = data.content as string;
  }

  if (content.length > MAX_DOC_CHARS) content = content.slice(0, MAX_DOC_CHARS);

  // 2. Resolver provider+model desde ai_settings
  const settings = await loadAiSettings(supabase);

  // 3. Stream del provider configurado
  const stream =
    settings.provider === 'anthropic'
      ? await streamFromAnthropic(settings.model, title, content)
      : await streamFromOpenAi(settings.model, title, content);

  if ('error' in stream) return json({ error: stream.error }, 502);

  return new Response(stream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-AI-Provider': settings.provider,
      'X-AI-Model': settings.model,
    },
  });
});

// ---------------------------------------------------------------------------
// AI settings loader
// ---------------------------------------------------------------------------

async function loadAiSettings(supabase: any): Promise<AiSettings> {
  try {
    const { data } = await supabase
      .from('ai_settings')
      .select('provider, model')
      .eq('id', 'default')
      .single();
    if (data?.provider && data?.model) {
      return { provider: data.provider as 'openai' | 'anthropic', model: data.model as string };
    }
  } catch {
    // Si falla la consulta usamos defaults
  }
  return {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_PROVIDER === 'anthropic' ? DEFAULT_MODEL_ANTHROPIC : DEFAULT_MODEL_OPENAI,
  };
}

// ---------------------------------------------------------------------------
// OpenAI stream → pasa el SSE crudo (shape OpenAI nativo)
// ---------------------------------------------------------------------------

async function streamFromOpenAi(
  model: string,
  title: string,
  content: string,
): Promise<{ body: ReadableStream } | { error: string }> {
  // @ts-ignore
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return { error: 'OPENAI_API_KEY no configurada' };

  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Título: ${title}\n\n${content}` },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    return { error: `openai: ${upstream.status}` };
  }

  const body = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });

  return { body };
}

// ---------------------------------------------------------------------------
// Anthropic stream → traduce SSE Anthropic a shape OpenAI
// ---------------------------------------------------------------------------

async function streamFromAnthropic(
  model: string,
  title: string,
  content: string,
): Promise<{ body: ReadableStream } | { error: string }> {
  // @ts-ignore
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return { error: 'ANTHROPIC_API_KEY no configurada' };

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Título: ${title}\n\n${content}` }],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    return { error: `anthropic: ${upstream.status} ${errText.slice(0, 200)}` };
  }

  const body = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buf = '';
      let messageId = `chatcmpl-${Date.now()}`;
      let finishReason: string | null = null;

      const emit = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const events = buf.split('\n\n');
          buf = events.pop() || '';

          for (const ev of events) {
            const dataLine = ev.split('\n').find((l) => l.startsWith('data: '));
            if (!dataLine) continue;
            const raw = dataLine.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;

            let parsed: any;
            try {
              parsed = JSON.parse(raw);
            } catch {
              continue;
            }

            if (parsed.type === 'message_start' && parsed.message?.id) {
              messageId = parsed.message.id;
            } else if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta'
            ) {
              emit({
                id: messageId,
                model,
                choices: [
                  {
                    index: 0,
                    delta: { content: parsed.delta.text || '' },
                    finish_reason: null,
                  },
                ],
              });
            } else if (parsed.type === 'message_delta' && parsed.delta?.stop_reason) {
              finishReason = parsed.delta.stop_reason;
            } else if (parsed.type === 'message_stop') {
              emit({
                id: messageId,
                model,
                choices: [{ index: 0, delta: {}, finish_reason: finishReason || 'stop' }],
              });
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } finally {
        controller.close();
      }
    },
  });

  return { body };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
