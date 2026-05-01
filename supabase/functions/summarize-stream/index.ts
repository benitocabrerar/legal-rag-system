// Edge Function · summarize-stream (Deno)
//
// Reemplaza routes/summarization-streaming.ts (SSE custom sobre Fastify)
// por un endpoint serverless que hace streaming directo a OpenAI.
//
// Por qué moverlo aquí:
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
//   const reader = r.body.getReader();   // streaming chunks

// @ts-ignore — runtime Deno
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MODEL = 'gpt-4o-mini';     // económico para summarization
const MAX_DOC_CHARS = 60_000;    // ~15k tokens

serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return json({ error: 'auth required' }, 401);

  let body: { documentId?: string; legalDocumentId?: string };
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }

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

  // 2. Stream OpenAI → cliente
  // @ts-ignore
  const apiKey = Deno.env.get('OPENAI_API_KEY')!;
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      messages: [
        { role: 'system', content: 'Eres un asistente legal experto en Ecuador. Resume documentos legales de forma estructurada: (1) tipo y jerarquía, (2) tema principal, (3) artículos clave, (4) implicaciones prácticas.' },
        { role: 'user', content: `Título: ${title}\n\n${content}` },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    return json({ error: `openai: ${upstream.status}` }, 502);
  }

  // Pipe directo del stream OpenAI al response
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Reenviar líneas SSE crudas: "data: {...}\n\n"
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
