// Edge Function · ingest-document (Deno)
//
// Reemplaza el flujo síncrono de chunking + embedding actual:
//   POST /api/legal-documents { content, normTitle, ... }
// por un endpoint serverless que:
//   1. Recibe contenido (texto plano o key de Supabase Storage)
//   2. Hace chunking jerárquico (respeta artículos legales)
//   3. Genera embeddings text-embedding-3-small en paralelo
//   4. Inserta en legal_documents + legal_document_chunks
//
// Despliegue: `supabase functions deploy ingest-document`
//
// Esta es plantilla de Fase 3 — no reemplaza nada todavía.

// @ts-ignore — runtime Deno
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const EMBED_MODEL = 'text-embedding-3-small';
const EMBED_BATCH = 100;

interface IngestRequest {
  legal_document_id?: string;
  content: string;
  norm_title?: string;
  norm_type?: string;
  legal_hierarchy?: string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'auth required' }, 401);

  // @ts-ignore
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let body: IngestRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  if (!body.content || body.content.length < 50) {
    return json({ error: 'content too short' }, 400);
  }

  // 1. Chunking — implementación naïve por tamaño con overlap.
  // En producción de Fase 3 reutilizar la lógica de hierarchicalChunker.
  const chunks = chunkText(body.content, CHUNK_SIZE, CHUNK_OVERLAP);

  // 2. Crear/actualizar legal_document
  let docId = body.legal_document_id;
  if (!docId) {
    const { data, error } = await supabase
      .from('legal_documents')
      .insert({
        norm_title: body.norm_title ?? 'Sin título',
        norm_type: body.norm_type ?? 'ORDINARY_LAW',
        legal_hierarchy: body.legal_hierarchy ?? 'LEYES_ORDINARIAS',
        content: body.content,
        is_active: true,
      })
      .select('id').single();
    if (error || !data) return json({ error: error?.message ?? 'insert failed' }, 500);
    docId = data.id;
  }

  // 3. Embeddings en batches
  // @ts-ignore
  const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
  const embeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const resp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: batch, dimensions: 1536 }),
    });
    if (!resp.ok) {
      return json({ error: `openai: ${resp.status} ${await resp.text()}` }, 502);
    }
    const data = await resp.json();
    for (const item of data.data) embeddings.push(item.embedding);
  }

  // 4. Insert chunks
  const rows = chunks.map((content, idx) => ({
    legal_document_id: docId,
    content,
    chunk_index: idx,
    embedding_v: `[${embeddings[idx].join(',')}]`,
  }));

  const { error: insErr } = await supabase.from('legal_document_chunks').insert(rows);
  if (insErr) return json({ error: insErr.message }, 500);

  return json({ legal_document_id: docId, chunks: rows.length });
});

function chunkText(text: string, size: number, overlap: number): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return out;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
