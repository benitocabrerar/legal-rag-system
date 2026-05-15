/**
 * Asamblea Nacional del Ecuador — Scraper de Leyes Aprobadas
 *
 * Fuentes:
 *   PRIMARY  : CSV export https://www.asambleanacional.gob.ec/es/leyes-aprobadas/export/csv
 *   FALLBACK : Scraping HTML paginado con ?page=N&periodo=YYYY-YYYY
 *
 * Flujo:
 *   1. fetchAsambleaLeyes()     → descarga CSV → parse → array de AsambleaLey
 *   2. downloadAsambleaPdf()    → descarga PDF por URL directa
 *   3. syncAsambleaToCorpus()   → diff vs corpus → descarga → sube → ingesta
 *
 * Rate limiting: 500ms entre requests a sitios externos (2 req/s max).
 */
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { getStorage } from '../lib/storage/storage-adapter.js';
import { serviceRoleClient } from '../lib/supabase.js';

const AN_BASE = 'https://www.asambleanacional.gob.ec';
const AN_LEYES_URL = `${AN_BASE}/es/leyes-aprobadas`;
const AN_CSV_URL = `${AN_LEYES_URL}/export/csv`;
const BUCKET = 'legal-pdfs';
const USER_AGENT = 'Mozilla/5.0 (compatible; PoweriaLegalBot/1.0; +https://poweria.cognitex.app/contact)';
const FETCH_TIMEOUT_MS = 60_000;
const RATE_LIMIT_MS = 500; // 2 req/s
const PERIODOS = ['2025-2029', '2021-2025', '2017-2021', '2013-2017'];

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface AsambleaLey {
  id: string | null;
  titulo: string;
  ro_numero: string | null;
  fecha_ro: Date | null;
  pdf_url: string | null;
  periodo: string | null;
  estado: string | null;
}

export interface AsambleaPdfResult {
  buf: Buffer;
  sizeBytes: number;
  /** pages count — 0 when unknown (pdf-parse not used here; caller determines) */
  pages: number;
}

export interface SyncResult {
  newDetected: number;
  ingestedOk: number;
  ingestedFail: number;
  skipped: number;
  errors: string[];
  durationMs: number;
}

export type AsambleaProgressCallback = (event: string, data: unknown) => void;

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Descarga y parsea el CSV de leyes aprobadas.
 * Si el CSV falla → scraping HTML paginado como fallback.
 */
export async function fetchAsambleaLeyes(periodo?: string): Promise<AsambleaLey[]> {
  // 1. Intentar CSV (más confiable, menos parseable)
  try {
    const csvUrl = periodo
      ? `${AN_CSV_URL}?periodo=${encodeURIComponent(periodo)}`
      : AN_CSV_URL;
    const text = await fetchText(csvUrl);
    if (text && text.length > 200) {
      const parsed = parseCsv(text);
      if (parsed.length > 0) return parsed;
    }
  } catch {
    // fallthrough al HTML
  }

  // 2. Fallback: scraping HTML paginado
  return fetchAsambleaHtml(periodo);
}

/**
 * Descarga un PDF desde la Asamblea Nacional y devuelve el Buffer + tamaño.
 * Lanza error si el PDF no es válido.
 */
export async function downloadAsambleaPdf(pdfUrl: string): Promise<AsambleaPdfResult> {
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  let r: Response;
  try {
    r = await fetch(pdfUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/pdf,*/*;q=0.8' },
      signal: ac.signal,
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!r.ok) throw new Error(`HTTP ${r.status} al descargar ${pdfUrl}`);
  const arr = await r.arrayBuffer();
  const buf = Buffer.from(arr);
  if (buf.length < 1000) throw new Error(`PDF demasiado pequeño (${buf.length} bytes)`);
  const header = buf.slice(0, 5).toString('ascii');
  if (!header.startsWith('%PDF')) throw new Error(`No es PDF — header: "${header}"`);
  return { buf, sizeBytes: buf.length, pages: 0 };
}

/**
 * Sincroniza leyes de la Asamblea Nacional con el corpus de legal_documents.
 *
 * Idempotente: documentos ya existentes (matching por título normalizado
 * + ro_numero) son skipped. Los nuevos pasan por:
 *   1. Descarga PDF
 *   2. Upload a Supabase Storage legal-pdfs/ec/asamblea/<slug>.pdf
 *   3. Inserción directa en legal_documents (status analyzed, sin auto-ingest)
 *      — el admin revisa antes de que los chunks/embeddings se generen.
 *
 * Para mantener separación de concerns, la ingesta de embeddings queda en
 * manos del flujo estándar de aprobación admin (no auto-ingest aquí).
 */
export async function syncAsambleaToCorpus(opts: {
  periodo?: string;
  triggeredBy?: string;
  runId?: string;
  onProgress?: AsambleaProgressCallback;
}): Promise<SyncResult> {
  const emit: AsambleaProgressCallback = opts.onProgress ?? (() => {});
  const triggeredBy = opts.triggeredBy ?? 'system:asamblea-sync';
  const startedAt = Date.now();
  const errors: string[] = [];
  let newDetected = 0;
  let ingestedOk = 0;
  let ingestedFail = 0;
  let skipped = 0;

  emit('phase', { phase: 'fetch-leyes', label: 'Descargando catálogo de leyes aprobadas…', pct: 5 });

  let leyes: AsambleaLey[] = [];
  try {
    leyes = await fetchAsambleaLeyes(opts.periodo);
    emit('phase', { phase: 'fetch-done', label: `${leyes.length} leyes en catálogo AN`, pct: 20 });
  } catch (e: any) {
    errors.push(`fetchAsambleaLeyes: ${e?.message || 'error'}`);
    emit('phase', { phase: 'fetch-error', label: 'Error descargando catálogo AN', pct: 20 });
    return { newDetected: 0, ingestedOk: 0, ingestedFail: 0, skipped: 0, errors, durationMs: Date.now() - startedAt };
  }

  // Cargar títulos + ro_numeros ya en corpus para diff
  const existing = await prisma.$queryRawUnsafe<Array<{ norm_title: string; metadata: any }>>(
    `SELECT norm_title, metadata
       FROM public.legal_documents
      WHERE is_active = true
        AND (metadata->>'source' = 'asamblea_nacional_ec'
          OR metadata->>'sourceAsamblea' = 'true')`,
  );
  const existingTitles = new Set(existing.map((r) => normalizeTitle(r.norm_title || '')));
  const existingRoNums = new Set(
    existing
      .map((r) => r.metadata?.roNumero as string | undefined)
      .filter(Boolean) as string[],
  );

  emit('phase', { phase: 'diff', label: 'Comparando con corpus existente…', pct: 30 });

  const nuevas: AsambleaLey[] = [];
  for (const ley of leyes) {
    const titleNorm = normalizeTitle(ley.titulo);
    const roMatch = ley.ro_numero && existingRoNums.has(ley.ro_numero);
    const titleMatch = existingTitles.has(titleNorm);
    if (roMatch || titleMatch) {
      skipped++;
    } else {
      nuevas.push(ley);
    }
  }
  newDetected = nuevas.length;
  emit('phase', {
    phase: 'diff-done',
    label: `${newDetected} leyes nuevas detectadas, ${skipped} ya en corpus`,
    pct: 40,
    newDetected,
    skipped,
  });

  if (nuevas.length === 0) {
    emit('phase', { phase: 'no-new', label: 'Sin leyes nuevas que procesar', pct: 100 });
    return { newDetected: 0, ingestedOk: 0, ingestedFail: 0, skipped, errors, durationMs: Date.now() - startedAt };
  }

  // Procesar cada ley nueva
  const total = nuevas.length;
  let idx = 0;
  for (const ley of nuevas) {
    idx++;
    const pct = Math.round(40 + (idx / total) * 55);
    emit('ley', { index: idx, total, titulo: ley.titulo.slice(0, 100), pct });

    try {
      // Registrar en corpus_sync_items si hay runId
      if (opts.runId) {
        await upsertSyncItem(opts.runId, ley.titulo, 'asamblea_nacional_ec', 'detect', 'pending');
      }

      // Intentar subir PDF si hay URL
      let storedPdfUrl: string | null = null;
      if (ley.pdf_url) {
        try {
          emit('pdf-download', { titulo: ley.titulo.slice(0, 80), url: ley.pdf_url });
          const { buf, sizeBytes } = await downloadAsambleaPdf(ley.pdf_url);
          const key = buildStorageKey(ley);
          const storage = await getStorage();
          await storage.upload({
            bucket: BUCKET,
            key,
            body: buf,
            contentType: 'application/pdf',
            cacheControl: '31536000',
            metadata: {
              titulo: ley.titulo.slice(0, 200),
              roNumero: ley.ro_numero ?? '',
              sourceUrl: ley.pdf_url.slice(0, 500),
              archivedAt: new Date().toISOString(),
            },
          });
          const client = serviceRoleClient();
          storedPdfUrl = client.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
          emit('pdf-stored', { titulo: ley.titulo.slice(0, 80), sizeBytes, storedPdfUrl });
        } catch (pdfErr: any) {
          // PDF failure is non-fatal — we still insert the doc record
          errors.push(`PDF ${ley.titulo.slice(0, 60)}: ${pdfErr?.message || 'pdf error'}`);
        }
      }

      await sleep(RATE_LIMIT_MS);

      // Insertar en legal_documents con status analyzed para revisión admin
      const docId = randomUUID();
      const normType = 'ORGANIC_LAW'; // default conservador; admin ajusta en revisión
      const legalHierarchy = 'LEYES_ORGANICAS';

      const pubNumSafe = ley.ro_numero
        ?? `an-pub-${new Date().toISOString().slice(0, 10)}-${docId.slice(0, 8)}`;

      const content = `Ley aprobada por la Asamblea Nacional del Ecuador.\nTítulo: ${ley.titulo}\n${ley.ro_numero ? `Registro Oficial No. ${ley.ro_numero}` : ''}\n${ley.fecha_ro ? `Fecha RO: ${ley.fecha_ro.toISOString().slice(0, 10)}` : ''}\n${ley.estado ? `Estado: ${ley.estado}` : ''}`.trim();

      await prisma.$executeRawUnsafe(
        `INSERT INTO public.legal_documents
           (id, title, norm_title, content, norm_type, publication_type, legal_hierarchy,
            publication_number, publication_date, jurisdiction, country_code,
            category, uploaded_by, is_active, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5::"NormType", $6::"PublicationType", $7::"LegalHierarchy",
                 $8, $9, $10::"Jurisdiction", $11, $12, $13, true, $14::jsonb, now(), now())
         ON CONFLICT DO NOTHING`,
        docId,
        ley.titulo.slice(0, 500),
        ley.titulo.slice(0, 500),
        content,
        normType,
        'ORDINARIO',
        legalHierarchy,
        pubNumSafe,
        ley.fecha_ro ?? null,
        'NACIONAL',
        'EC',
        'general',
        triggeredBy,
        JSON.stringify({
          source: 'asamblea_nacional_ec',
          sourceAsamblea: 'true',
          roNumero: ley.ro_numero ?? null,
          fechaRo: ley.fecha_ro?.toISOString() ?? null,
          periodo: ley.periodo ?? null,
          estado: ley.estado ?? null,
          pdfUrl: ley.pdf_url ?? null,
          storedPdfUrl: storedPdfUrl ?? null,
          syncedAt: new Date().toISOString(),
          triggeredBy,
          pendingEmbeddings: true,
        }),
      );

      if (opts.runId) {
        await upsertSyncItem(opts.runId, ley.titulo, 'asamblea_nacional_ec', 'ingest', 'ok', docId);
      }

      ingestedOk++;
      emit('ley-ok', { titulo: ley.titulo.slice(0, 100), docId, pct });
    } catch (e: any) {
      ingestedFail++;
      const errMsg = e?.message || 'unknown error';
      errors.push(`Ley "${ley.titulo.slice(0, 60)}": ${errMsg}`);
      if (opts.runId) {
        await upsertSyncItem(opts.runId, ley.titulo, 'asamblea_nacional_ec', 'ingest', 'fail', undefined, errMsg);
      }
      emit('ley-fail', { titulo: ley.titulo.slice(0, 100), error: errMsg, pct });
    }
  }

  emit('phase', {
    phase: 'done',
    label: `AN sync: ${ingestedOk} ok, ${ingestedFail} fail, ${skipped} skipped`,
    pct: 100,
  });

  return {
    newDetected,
    ingestedOk,
    ingestedFail,
    skipped,
    errors,
    durationMs: Date.now() - startedAt,
  };
}

// ─── CSV PARSER ───────────────────────────────────────────────────────────────

function parseCsv(text: string): AsambleaLey[] {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Detectar separador (coma o punto y coma)
  const firstLine = lines[0];
  const sep = firstLine.includes(';') ? ';' : ',';

  const headers = splitCsvRow(firstLine, sep).map((h) => h.toLowerCase().trim().replace(/\s+/g, '_'));

  const leyes: AsambleaLey[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = splitCsvRow(line, sep);

    const get = (keys: string[]): string | null => {
      for (const k of keys) {
        const idx = headers.indexOf(k);
        if (idx >= 0 && cols[idx]) return cols[idx].trim().replace(/^"|"$/g, '');
      }
      return null;
    };

    const titulo = get(['titulo', 'title', 'nombre', 'ley', 'proyecto']) || '';
    if (!titulo || titulo.length < 5) continue;

    const roNumStr = get(['ro', 'registro_oficial', 'numero_ro', 'ro_numero', 'n_ro']) ?? null;
    const fechaStr = get(['fecha_ro', 'fecha_registro', 'fecha_publicacion', 'fecha']) ?? null;
    const pdfStr = get(['pdf', 'pdf_url', 'url_pdf', 'enlace', 'link']) ?? null;
    const periodo = get(['periodo', 'period', 'asamblea']) ?? null;
    const estado = get(['estado', 'status', 'estado_ley']) ?? null;

    leyes.push({
      id: get(['id', 'codigo', 'code']) ?? null,
      titulo,
      ro_numero: roNumStr,
      fecha_ro: parseDate(fechaStr),
      pdf_url: normalizePdfUrl(pdfStr),
      periodo,
      estado,
    });
  }
  return leyes;
}

function splitCsvRow(line: string, sep: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
    } else if (ch === sep && !inQ) {
      cols.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

// ─── HTML FALLBACK SCRAPER ────────────────────────────────────────────────────

async function fetchAsambleaHtml(periodo?: string): Promise<AsambleaLey[]> {
  const periodosToTry = periodo ? [periodo] : PERIODOS;
  const all: AsambleaLey[] = [];

  for (const p of periodosToTry) {
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const url = `${AN_LEYES_URL}?page=${page}&periodo=${encodeURIComponent(p)}`;
      try {
        const html = await fetchText(url);
        if (!html) { hasMore = false; break; }

        const items = parseHtmlLeyes(html, p);
        all.push(...items);

        // Detectar si hay siguiente página: buscar rel="next" o el link de paginación
        hasMore = items.length >= 10 && /<a[^>]+rel="next"/i.test(html);
        page++;
        await sleep(RATE_LIMIT_MS);
      } catch {
        hasMore = false;
      }
    }
  }

  return all;
}

function parseHtmlLeyes(html: string, periodo: string): AsambleaLey[] {
  const leyes: AsambleaLey[] = [];

  // La AN renderiza tablas HTML con columnas: Título, Estado, Fecha RO, No. RO, PDF
  // Selector: <tr class="..."> con <td> hijos. Usamos regex sobre bloques <tr>
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;

  while ((m = rowRegex.exec(html)) !== null) {
    const row = m[1];
    const cells = extractCells(row);
    if (cells.length < 2) continue;

    const titulo = stripHtml(cells[0] ?? '').trim();
    if (!titulo || titulo.length < 8) continue;

    // Intentar extraer RO number y fecha
    const roNumMatch = row.match(/N[ºo°\.]*\s*(\d{2,4})/i);
    const roNum = roNumMatch ? roNumMatch[1] : null;

    const dateStr = cells.find((c) => /\d{4}/.test(c) && /\d{1,2}[\/\-]\d{1,2}/.test(c)) ?? null;
    const fecha = parseDate(dateStr ? stripHtml(dateStr) : null);

    const pdfMatch = row.match(/href="([^"]+\.pdf[^"]*)"/i)
      ?? row.match(/href="([^"]+\/system\/files\/[^"]+)"/i);
    const pdfUrl = pdfMatch
      ? normalizePdfUrl(pdfMatch[1])
      : buildPdfUrlFromRo(roNum);

    const estado = cells[1] ? stripHtml(cells[1]).trim() : null;

    leyes.push({
      id: null,
      titulo,
      ro_numero: roNum,
      fecha_ro: fecha,
      pdf_url: pdfUrl,
      periodo,
      estado,
    });
  }

  return leyes;
}

function extractCells(row: string): string[] {
  const cells: string[] = [];
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = cellRegex.exec(row)) !== null) {
    cells.push(m[1]);
  }
  return cells;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function upsertSyncItem(
  runId: string,
  canonicalName: string,
  source: string,
  action: string,
  status: string,
  legalDocId?: string,
  errorMessage?: string,
): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.corpus_sync_items
         (run_id, canonical_name, source, action, status, legal_doc_id, error_message, created_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::text, $7, now())`,
      runId,
      canonicalName.slice(0, 500),
      source,
      action,
      status,
      legalDocId ?? null,
      errorMessage?.slice(0, 1000) ?? null,
    );
  } catch { /* non-critical */ }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
    const r = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,text/csv,*/*;q=0.8' },
      signal: ac.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

function buildStorageKey(ley: AsambleaLey): string {
  const slug = ley.titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const suffix = randomUUID().slice(0, 8);
  return `ec/asamblea/${slug}_${suffix}.pdf`;
}

function buildPdfUrlFromRo(roNumero: string | null): string | null {
  if (!roNumero) return null;
  // Pattern conocido: https://www.asambleanacional.gob.ec/es/system/files/ro_NN.pdf
  return `${AN_BASE}/es/system/files/ro_${roNumero}.pdf`;
}

function normalizePdfUrl(url: string | null): string | null {
  if (!url) return null;
  url = url.trim();
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${AN_BASE}${url}`;
  return null;
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const clean = s.trim();
  // dd/mm/yyyy or dd-mm-yyyy
  const slashed = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashed) {
    const d = new Date(`${slashed[3]}-${slashed[2].padStart(2, '0')}-${slashed[1].padStart(2, '0')}T00:00:00Z`);
    if (!isNaN(d.getTime())) return d;
  }
  // yyyy-mm-dd
  const iso = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`);
    if (!isNaN(d.getTime())) return d;
  }
  // Try native parse as last resort
  const native = new Date(clean);
  if (!isNaN(native.getTime())) return native;
  return null;
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
