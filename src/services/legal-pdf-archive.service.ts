/**
 * Legal PDF Archive Service
 *
 * Garantiza que cada legal_document tenga una copia inmutable de su PDF
 * original en nuestro bucket Supabase Storage `legal-pdfs`. Razones:
 *
 *   1. URLs externas (defensa.gob.ec, funcionjudicial.gob.ec, etc) pueden
 *      caer en cualquier momento. Tener nuestra copia evita link rot.
 *   2. Permite descargas rápidas desde nuestro CDN sin depender de la
 *      disponibilidad/velocidad de servidores externos.
 *   3. Las leyes son de dominio público — no hay problema legal de
 *      redistribuirlas (al contrario: es parte de su naturaleza).
 *
 * Flujo:
 *   ensurePdfStored(docId) →
 *     1. Si stored_pdf_url existe → retorna (idempotente)
 *     2. Sino, busca URL fuente en metadata (editionPdfUrl / canonicalPdfUrl)
 *     3. Descarga el PDF
 *     4. Sube al bucket 'legal-pdfs' con key estructurado
 *     5. Actualiza legal_documents con stored_pdf_url + size + status
 *
 * Endpoint masivo: archiveAllPdfs() corre el proceso para todos los
 * legal_documents activos sin stored_pdf_url.
 */
import { prisma } from '../lib/prisma.js';
import { getStorage } from '../lib/storage/storage-adapter.js';
import { serviceRoleClient } from '../lib/supabase.js';

const BUCKET = 'legal-pdfs';
const USER_AGENT = 'Mozilla/5.0 (compatible; PoweriaLegalArchiver/1.0)';
const FETCH_TIMEOUT_MS = 90_000;

export type ArchiveProgressCallback = (event: string, data: any) => void;

export interface EnsureResult {
  legalDocId: string;
  status: 'already_stored' | 'stored' | 'failed' | 'no_source';
  storedPdfUrl: string | null;
  storedPdfKey: string | null;
  sizeBytes: number;
  sourceUrl: string | null;
  durationMs: number;
  error?: string;
}

/**
 * Asegura que el PDF de un legal_document esté en nuestro bucket.
 * Es idempotente — si ya está, no descarga ni sube nada.
 */
export async function ensurePdfStored(legalDocId: string): Promise<EnsureResult> {
  const startedAt = Date.now();

  // 1) Cargar metadata del doc
  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    title: string;
    norm_title: string | null;
    legal_hierarchy: string | null;
    country_code: string | null;
    metadata: any;
    stored_pdf_url: string | null;
    stored_pdf_key: string | null;
    pdf_storage_status: string | null;
  }>>(
    `SELECT id, title, norm_title,
            legal_hierarchy::text AS legal_hierarchy,
            country_code, metadata,
            stored_pdf_url, stored_pdf_key, pdf_storage_status
       FROM public.legal_documents
      WHERE id = $1 AND is_active = true`,
    legalDocId,
  );
  if (rows.length === 0) {
    return {
      legalDocId, status: 'failed',
      storedPdfUrl: null, storedPdfKey: null,
      sizeBytes: 0, sourceUrl: null,
      durationMs: Date.now() - startedAt,
      error: 'Documento no encontrado',
    };
  }
  const doc = rows[0];

  // 2) Si ya está almacenado, retornar
  if (doc.stored_pdf_url && doc.stored_pdf_key) {
    return {
      legalDocId, status: 'already_stored',
      storedPdfUrl: doc.stored_pdf_url,
      storedPdfKey: doc.stored_pdf_key,
      sizeBytes: 0, sourceUrl: null,
      durationMs: Date.now() - startedAt,
    };
  }

  // 3) Buscar URL fuente (en orden de preferencia)
  const sourceUrl: string | null =
    doc.metadata?.editionPdfUrl ||
    doc.metadata?.canonicalPdfUrl ||
    doc.metadata?.editionUrl?.endsWith('.pdf') ? doc.metadata?.editionUrl : null;

  if (!sourceUrl) {
    await markStorageStatus(legalDocId, 'no_source', null, null, 0);
    return {
      legalDocId, status: 'no_source',
      storedPdfUrl: null, storedPdfKey: null,
      sizeBytes: 0, sourceUrl: null,
      durationMs: Date.now() - startedAt,
      error: 'Sin URL fuente en metadata (editionPdfUrl / canonicalPdfUrl)',
    };
  }

  // 4) Descargar el PDF
  let buf: Buffer;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
    const r = await fetch(sourceUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/pdf,*/*;q=0.8' },
      signal: ac.signal,
      redirect: 'follow',
    });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const arr = await r.arrayBuffer();
    buf = Buffer.from(arr);
    if (buf.length < 1000) throw new Error(`PDF muy pequeño (${buf.length} bytes)`);
    const header = buf.slice(0, 8).toString('utf-8');
    if (!header.startsWith('%PDF')) throw new Error(`No es PDF (header: ${header.slice(0, 5)})`);
  } catch (e: any) {
    const errMsg = e?.message || 'fetch failed';
    await markStorageStatus(legalDocId, 'failed', null, null, 0, errMsg);
    return {
      legalDocId, status: 'failed',
      storedPdfUrl: null, storedPdfKey: null,
      sizeBytes: 0, sourceUrl,
      durationMs: Date.now() - startedAt,
      error: `Descarga falló: ${errMsg}`,
    };
  }

  // 5) Construir key estructurado y subir al bucket
  const key = buildStorageKey(doc);
  try {
    const storage = await getStorage();
    await storage.upload({
      bucket: BUCKET,
      key,
      body: buf,
      contentType: 'application/pdf',
      cacheControl: '31536000',  // 1 año
      metadata: {
        legalDocId,
        title: (doc.norm_title || doc.title).slice(0, 200),
        sourceUrl: sourceUrl.slice(0, 500),
        archivedAt: new Date().toISOString(),
      },
    });
  } catch (e: any) {
    // Si el upload falla porque ya existe (raro pero posible), seguimos
    const isAlreadyExists = e?.message?.includes('already exists') || e?.message?.includes('Duplicate');
    if (!isAlreadyExists) {
      const errMsg = e?.message || 'upload failed';
      await markStorageStatus(legalDocId, 'failed', null, null, 0, errMsg);
      return {
        legalDocId, status: 'failed',
        storedPdfUrl: null, storedPdfKey: null,
        sizeBytes: buf.length, sourceUrl,
        durationMs: Date.now() - startedAt,
        error: `Upload falló: ${errMsg}`,
      };
    }
    // si ya existe, seguimos como si hubiera funcionado
  }

  // 6) Obtener URL pública (bucket es público)
  const publicUrl = getPublicUrl(BUCKET, key);

  // 7) Actualizar DB
  await markStorageStatus(legalDocId, 'stored', key, publicUrl, buf.length);

  return {
    legalDocId,
    status: 'stored',
    storedPdfUrl: publicUrl,
    storedPdfKey: key,
    sizeBytes: buf.length,
    sourceUrl,
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Proceso masivo: archiva PDFs para TODOS los legal_documents activos sin
 * stored_pdf_url. Reporta progreso por archivo via callback opcional.
 */
export async function archiveAllPdfs(opts: {
  triggeredBy?: string;
  onProgress?: ArchiveProgressCallback;
  onlyMissingUrl?: boolean;     // si true, solo procesa los sin stored_pdf_url
  retryFailed?: boolean;        // si true, también re-intenta los failed
  limit?: number;
} = {}): Promise<{
  runId: string;
  totalRequested: number;
  totalUploaded: number;
  totalSkipped: number;
  totalFailed: number;
  totalNoSource: number;
  totalBytes: number;
  durationMs: number;
}> {
  const emit = opts.onProgress || (() => {});
  const triggeredBy = opts.triggeredBy ?? 'manual';
  const startedAt = Date.now();

  // 1) Crear run
  const runRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO public.legal_pdf_archive_runs
       (triggered_by, status) VALUES ($1, 'running') RETURNING id`,
    triggeredBy,
  );
  const runId = runRows[0].id;

  // 2) Listar docs candidatos
  const conditions: string[] = ['is_active = true'];
  if (opts.onlyMissingUrl !== false) {
    conditions.push(`stored_pdf_url IS NULL`);
  }
  if (!opts.retryFailed) {
    conditions.push(`(pdf_storage_status IS NULL OR pdf_storage_status NOT IN ('failed','no_source'))`);
  }
  const limit = Math.min(500, Math.max(1, opts.limit ?? 300));

  const docs = await prisma.$queryRawUnsafe<Array<{ id: string; norm_title: string | null; title: string }>>(
    `SELECT id, norm_title, title FROM public.legal_documents
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT ${limit}`,
  );

  emit('run-start', { runId, total: docs.length, startedAt: new Date().toISOString() });

  await prisma.$executeRawUnsafe(
    `UPDATE public.legal_pdf_archive_runs SET total_requested = $2 WHERE id = $1::uuid`,
    runId, docs.length,
  );

  let totalUploaded = 0;
  let totalFailed = 0;
  let totalNoSource = 0;
  let totalSkipped = 0;
  let totalBytes = 0;

  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    emit('file-start', {
      index: i + 1, total: docs.length,
      docId: d.id, title: (d.norm_title || d.title).slice(0, 100),
      pct: Math.round((i / docs.length) * 100),
    });

    try {
      const r = await ensurePdfStored(d.id);
      switch (r.status) {
        case 'stored':
          totalUploaded++;
          totalBytes += r.sizeBytes;
          emit('file-stored', {
            index: i + 1, total: docs.length,
            docId: d.id, title: (d.norm_title || d.title).slice(0, 100),
            sizeBytes: r.sizeBytes, durationMs: r.durationMs,
            storedPdfUrl: r.storedPdfUrl,
          });
          break;
        case 'already_stored':
          totalSkipped++;
          emit('file-skipped', {
            index: i + 1, total: docs.length,
            docId: d.id, reason: 'ya almacenado',
          });
          break;
        case 'no_source':
          totalNoSource++;
          emit('file-no-source', {
            index: i + 1, total: docs.length,
            docId: d.id, title: (d.norm_title || d.title).slice(0, 100),
          });
          break;
        case 'failed':
          totalFailed++;
          emit('file-failed', {
            index: i + 1, total: docs.length,
            docId: d.id, error: r.error,
          });
          break;
      }
    } catch (e: any) {
      totalFailed++;
      emit('file-failed', {
        index: i + 1, total: docs.length,
        docId: d.id, error: e?.message || 'unknown',
      });
    }
  }

  const durationMs = Date.now() - startedAt;

  // 3) Cerrar run
  await prisma.$executeRawUnsafe(
    `UPDATE public.legal_pdf_archive_runs
        SET completed_at = now(), status = 'completed',
            total_uploaded = $2, total_skipped = $3, total_failed = $4,
            total_no_source = $5, total_bytes = $6, total_duration_ms = $7
      WHERE id = $1::uuid`,
    runId, totalUploaded, totalSkipped, totalFailed, totalNoSource, totalBytes, durationMs,
  );

  const result = {
    runId, totalRequested: docs.length,
    totalUploaded, totalSkipped, totalFailed, totalNoSource,
    totalBytes, durationMs,
  };
  emit('run-complete', result);
  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

function buildStorageKey(doc: {
  id: string;
  norm_title: string | null;
  title: string;
  legal_hierarchy: string | null;
  country_code: string | null;
}): string {
  const country = (doc.country_code || 'EC').toLowerCase();
  const hier = (doc.legal_hierarchy || 'OTROS').toLowerCase().replace(/_/g, '-');
  // Slug del título limitado a 80 chars
  const slug = (doc.norm_title || doc.title)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  // Sufijo con primeros 8 chars del docId para evitar colisiones
  const suffix = doc.id.slice(0, 8);
  return `${country}/${hier}/${slug}_${suffix}.pdf`;
}

function getPublicUrl(bucket: string, key: string): string {
  const client = serviceRoleClient();
  const { data } = client.storage.from(bucket).getPublicUrl(key);
  return data.publicUrl;
}

async function markStorageStatus(
  docId: string,
  status: 'stored' | 'failed' | 'no_source' | 'pending',
  key: string | null,
  url: string | null,
  sizeBytes: number,
  errorMessage?: string,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE public.legal_documents
        SET pdf_storage_status = $2,
            stored_pdf_key = $3,
            stored_pdf_url = $4,
            stored_pdf_size_bytes = $5,
            pdf_stored_at = CASE WHEN $2 = 'stored' THEN now() ELSE pdf_stored_at END,
            metadata = COALESCE(metadata, '{}'::jsonb)
                       || jsonb_build_object('pdfStorageError', $6::text)
      WHERE id = $1`,
    docId, status, key, url, sizeBytes || null, errorMessage || null,
  );
}
