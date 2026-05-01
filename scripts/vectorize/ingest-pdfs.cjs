/**
 * Pipeline de vectorización para PDFs jurídicos.
 *
 * Pasos:
 *   1. Lee PDF con pdf-parse → texto plano
 *      Fallback: si pdf-parse devuelve <500 chars (probablemente escaneado),
 *      usa Claude Vision con la API de Anthropic (CLAUDE_API_KEY).
 *   2. Clasifica por nombre del archivo (Constitución, Código, Ley, Reglamento…)
 *   3. INSERT en legal_documents (idempotente: ON CONFLICT por title hash)
 *   4. Chunkea por ~1000 caracteres con overlap 200
 *   5. Embeddings batch con OpenAI text-embedding-3-small (1536d)
 *   6. INSERT en legal_document_chunks con embedding_v vector(1536)
 *
 * Uso:
 *   node scripts/vectorize/ingest-pdfs.cjs --limit=5
 *   node scripts/vectorize/ingest-pdfs.cjs --files="Const,COIP" --limit=5
 *   node scripts/vectorize/ingest-pdfs.cjs                    # todos
 */
require('dotenv').config();
// Supabase pooler usa cert intermedio que pg no valida; este script no envía
// passwords sensibles más allá del propio DATABASE_URL ya almacenado.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai').default;
const { Client } = require('pg');
const { classify } = require('./classify-document.cjs');
const { buildMetadata } = require('./extract-metadata.cjs');

const SOURCE_DIR = 'C:/Users/benito/Downloads/leyes legal ecuador';
const REPORT_DIR = path.join(__dirname, '../../test-results/vectorize');
const REPORT_FILE = path.join(REPORT_DIR, 'ingestion-report.json');

const ARGS = process.argv.slice(2).reduce((acc, a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) acc[m[1]] = m[2] === undefined ? true : m[2];
  return acc;
}, {});

const LIMIT = ARGS.limit ? parseInt(ARGS.limit, 10) : Infinity;
const FILTER = ARGS.files ? ARGS.files.split(',').map(s => s.trim().toLowerCase()) : null;
const DRY_RUN = !!ARGS.dry;

const CHUNK_SIZE = 1000;          // chars per chunk (~ 250 tokens)
const CHUNK_OVERLAP = 200;
const EMBED_BATCH = 50;            // chunks per OpenAI embedding call
const EMBED_MODEL = 'text-embedding-3-small';
const EMBED_DIM = 1536;

if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  if (!text) return chunks;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= size) return [cleaned];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + size, cleaned.length);
    chunks.push(cleaned.slice(start, end));
    if (end === cleaned.length) break;
    start += size - overlap;
  }
  return chunks;
}

async function extractWithPdfParse(file) {
  const buf = fs.readFileSync(file);
  const data = await pdfParse(buf);
  // Devolver el objeto completo para preservar info/metadata/version
  data._source = 'pdf-parse';
  return data;
}

async function extractWithClaudeVision(file) {
  // Fallback para PDFs escaneados. Requiere CLAUDE_API_KEY o ANTHROPIC_API_KEY.
  // No lo implementamos completo aquí; dejamos hook ready.
  // Anthropic Files API + claude-sonnet-4 puede leer PDFs nativos.
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return { text: '', pages: 0, source: 'vision-no-key' };
  }
  const buf = fs.readFileSync(file);
  const b64 = buf.toString('base64');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
          { type: 'text', text: 'Extrae todo el texto literal del documento sin omitir nada. No agregues comentarios. Solo el texto.' },
        ],
      }],
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Claude Vision ${r.status}: ${err.slice(0, 200)}`);
  }
  const data = await r.json();
  const text = (data.content || []).map(c => c.text || '').join('\n');
  return { text, numpages: 0, info: {}, metadata: null, version: null, _source: 'claude-vision' };
}

async function embedBatch(texts) {
  const r = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: texts,
    dimensions: EMBED_DIM,
  });
  return r.data.map(d => d.embedding);
}

async function getAdminUserId(client) {
  const r = await client.query(`SELECT id FROM public.users WHERE role='admin' ORDER BY created_at LIMIT 1`);
  return r.rows[0]?.id;
}

async function ingestFile(client, filePath, filename, uploadedBy) {
  const startedAt = Date.now();
  const classification = classify(filename);

  // Idempotente: hash del filename como id estable
  const docId = crypto.createHash('md5').update(filename).digest('hex');

  // Skip si ya tiene chunks vectorizados con embedding_v
  const existing = await client.query(
    `SELECT COUNT(*)::int AS n FROM public.legal_document_chunks WHERE legal_document_id=$1 AND embedding_v IS NOT NULL`,
    [docId]
  );
  if (existing.rows[0].n > 0) {
    return { filename, status: 'skipped', reason: 'already vectorized', chunks: existing.rows[0].n, ms: 0 };
  }

  // Extraer texto + objeto completo de pdf-parse
  let extracted;
  try {
    extracted = await extractWithPdfParse(filePath);
    if ((extracted.text || '').trim().length < 500) {
      // Probablemente escaneado: intentar Claude Vision
      const vision = await extractWithClaudeVision(filePath);
      if ((vision.text || '').length > (extracted.text || '').length) {
        extracted = vision;
      }
    }
  } catch (e) {
    return { filename, status: 'fail', stage: 'extract', error: e.message };
  }

  if (!extracted.text || extracted.text.trim().length < 100) {
    return { filename, status: 'fail', stage: 'extract', error: 'texto vacío o demasiado corto', source: extracted._source };
  }

  // Construir metadata completa (nativa PDF + heurística del contenido)
  const built = buildMetadata(filename, filePath, extracted, classification);
  const title = classification.title || built.structured.norm_title || filename.replace(/\.pdf$/i, '');

  // Chunk
  const chunks = chunkText(extracted.text);
  if (chunks.length === 0) {
    return { filename, status: 'fail', stage: 'chunk', error: 'no chunks' };
  }

  if (DRY_RUN) {
    return {
      filename, status: 'dry', meta: classification, chars: extracted.text.length,
      chunks: chunks.length, source: extracted._source,
      structured: built.structured,
      meta_keys: Object.keys(built.metadata),
    };
  }

  // INSERT legal_document con metadata jsonb completa
  await client.query(`
    INSERT INTO public.legal_documents (
      id, norm_type, norm_title, legal_hierarchy,
      publication_type, publication_number, publication_date, last_reform_date,
      document_state, jurisdiction,
      content, title, category, uploaded_by,
      metadata, is_active, created_at, updated_at
    ) VALUES (
      $1, $2::"NormType", $3, $4::"LegalHierarchy",
      $5::"PublicationType", $6, $7, $8,
      $9::"DocumentState", $10::"Jurisdiction",
      $11, $12, $13, $14,
      $15::jsonb, true, now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      norm_type           = EXCLUDED.norm_type,
      norm_title          = EXCLUDED.norm_title,
      legal_hierarchy     = EXCLUDED.legal_hierarchy,
      publication_type    = EXCLUDED.publication_type,
      publication_number  = EXCLUDED.publication_number,
      publication_date    = EXCLUDED.publication_date,
      last_reform_date    = EXCLUDED.last_reform_date,
      document_state      = EXCLUDED.document_state,
      jurisdiction        = EXCLUDED.jurisdiction,
      title               = EXCLUDED.title,
      category            = EXCLUDED.category,
      metadata            = EXCLUDED.metadata,
      updated_at          = now()
  `, [
    docId,
    classification.norm_type,
    built.structured.norm_title.slice(0, 500),
    classification.legal_hierarchy,
    built.structured.publication_type,
    String(built.structured.publication_number).slice(0, 50),
    built.structured.publication_date,
    built.structured.last_reform_date,
    built.structured.document_state,
    classification.jurisdiction,
    extracted.text.slice(0, 100000),
    title,
    classification.category,
    uploadedBy,
    JSON.stringify(built.metadata),
  ]);

  // Borrar chunks viejos (idempotencia)
  await client.query(`DELETE FROM public.legal_document_chunks WHERE legal_document_id=$1`, [docId]);

  // Embeddings + INSERT chunks en batches
  let inserted = 0;
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const slice = chunks.slice(i, i + EMBED_BATCH);
    const embeddings = await embedBatch(slice);

    // Multi-row insert
    const values = [];
    const params = [];
    let idx = 1;
    for (let j = 0; j < slice.length; j++) {
      const chunkId = crypto.createHash('md5').update(`${docId}:${i + j}`).digest('hex');
      const vec = `[${embeddings[j].join(',')}]`;
      values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}::vector)`);
      params.push(chunkId, docId, slice[j], i + j, vec);
    }
    await client.query(
      `INSERT INTO public.legal_document_chunks (id, legal_document_id, content, chunk_index, embedding_v) VALUES ${values.join(',')}`,
      params
    );
    inserted += slice.length;
  }

  return {
    filename,
    status: 'ok',
    docId,
    classification,
    structured: built.structured,
    chars: extracted.text.length,
    pages: extracted.numpages || 0,
    chunks: chunks.length,
    inserted,
    source: extracted._source,
    ms: Date.now() - startedAt,
  };
}

(async () => {
  const all = fs.readdirSync(SOURCE_DIR)
    .filter(f => /\.(pdf|docx)$/i.test(f))
    .sort();

  const list = (FILTER
    ? all.filter(f => FILTER.some(s => f.toLowerCase().includes(s)))
    : all
  ).slice(0, LIMIT);

  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Total available: ${all.length} · selected: ${list.length} · dry=${DRY_RUN}`);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const uploadedBy = await getAdminUserId(client);
  if (!uploadedBy) {
    console.error('No admin user found in public.users');
    process.exit(1);
  }
  console.log(`uploaded_by = ${uploadedBy}\n`);

  const results = [];
  let i = 0;
  for (const f of list) {
    i++;
    const fp = path.join(SOURCE_DIR, f);
    const tag = `[${i}/${list.length}]`;
    process.stdout.write(`${tag} ${f.slice(0, 80)} ... `);
    try {
      const res = await ingestFile(client, fp, f, uploadedBy);
      results.push(res);
      const summary = res.status === 'ok'
        ? `OK chunks=${res.chunks} chars=${res.chars} ${res.ms}ms`
        : res.status === 'skipped' ? `skip (${res.reason})`
        : res.status === 'dry' ? `dry chunks=${res.chunks}`
        : `FAIL ${res.stage || ''}: ${res.error}`;
      console.log(summary);
    } catch (e) {
      console.log(`FATAL: ${e.message}`);
      results.push({ filename: f, status: 'fail', stage: 'unknown', error: e.message });
    }
  }
  await client.end();

  fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2));
  const ok = results.filter(r => r.status === 'ok').length;
  const skip = results.filter(r => r.status === 'skipped').length;
  const fail = results.filter(r => r.status === 'fail').length;
  console.log(`\n=== Summary === ok=${ok} skipped=${skip} fail=${fail} (saved to ${REPORT_FILE})`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
