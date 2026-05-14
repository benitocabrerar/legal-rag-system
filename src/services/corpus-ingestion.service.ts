/**
 * Corpus Ingestion Service
 *
 * Convierte una `registry_publications` (entrada bruta del scraper del
 * Registro Oficial) en un `legal_documents` completamente integrado al
 * RAG: chunks + embeddings vector pgvector + notificación broadcast.
 *
 * Flujo:
 *   1. INSERT legal_documents (igual que approve handler)
 *   2. LegalDocumentService.regenerateEmbeddings(): chunks + embedding JSONB
 *   3. UPDATE legal_document_chunks.embedding_v desde JSONB → vector(1536)
 *      Crítico — el retrieval del chat usa <=> que necesita type vector,
 *      no JSONB. Sin esto, el corpus queda invisible al RAG.
 *   4. UPDATE registry_publications.status = 'ingested' + chunks_created
 *   5. Trigger notificación a todos los usuarios activos
 *
 * Funciones públicas:
 *   - ingestPublicationToCorpus(pubId, userId) — para approve manual
 *   - autoIngestQualified(scanId?) — para correr al final del scan
 */
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { LegalDocumentService } from './legal-document-service.js';
import { notifyAllActiveUsersOfNewNorm } from './corpus-notifications.service.js';

// Umbrales de auto-ingest cuando el scan llama desde el cron
// Threshold permisivo — la IA asigna 0.6+ a normas con impacto legal real
// (ej. nuevas leyes, decretos sustantivos). Por debajo de 0.6 son típicamente
// ordenanzas municipales, resoluciones internas, acuerdos administrativos
// menores que NO deben entrar al corpus nacional.
const AUTO_INGEST_MIN_RELEVANCE = 0.6;
// Tipos que califican para auto-ingest. Incluimos 'general' porque el
// scraper actual (fallback RSS) NO categoriza finamente y termina marcando
// publicaciones legítimas como 'general'. El filtro real ocurre por
// ai_relevance_score (≥0.6) que la IA asigna basándose en el contenido.
const AUTO_INGEST_QUALIFYING_TYPES = new Set([
  'ley_organica',
  'ley_ordinaria',
  'decreto_ejecutivo',
  'acuerdo_ministerial',
  'resolucion',
  'reglamento',
  'general',
]);

export interface IngestionResult {
  legalDocId: string;
  chunksCreated: number;
  embeddingsGenerated: number;
  embeddingsVectorized: number;
  notifiedUsers: number;
  alreadyIngested?: boolean;
}

export interface BatchIngestionResult {
  processed: number;
  succeeded: number;
  failed: number;
  totalChunks: number;
  totalNotified: number;
  ingestedIds: string[];
  errors: Array<{ pubId: string; error: string }>;
}

export type IngestProgressCallback = (event: string, data: any) => void;

/**
 * Ingesta UNA publicación al corpus completo.
 *
 * Es idempotente: si la publicación ya está marcada `ingested`, devuelve
 * el legal_doc_id existente sin reprocesar.
 *
 * onProgress recibe eventos granulares del pipeline:
 *   load-publication / insert-legal-doc / chunking-start /
 *   chunking-done / embedding-progress / embedding-done /
 *   vector-copy / mark-ingested / broadcast / complete
 */
export async function ingestPublicationToCorpus(
  publicationId: string,
  userId: string,
  onProgress?: IngestProgressCallback,
): Promise<IngestionResult> {
  const emit: IngestProgressCallback = onProgress || (() => {});
  emit('load-publication', { publicationId });
  // 1) Cargar publication
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM public.registry_publications WHERE id = $1::uuid`,
    publicationId,
  );
  if (rows.length === 0) throw new Error(`Publication not found: ${publicationId}`);
  const pub = rows[0];

  if (pub.status === 'ingested' && pub.ingested_legal_doc_id) {
    emit('already-ingested', { legalDocId: pub.ingested_legal_doc_id });
    return {
      legalDocId: pub.ingested_legal_doc_id,
      chunksCreated: pub.chunks_created || 0,
      embeddingsGenerated: pub.chunks_created || 0,
      embeddingsVectorized: pub.chunks_created || 0,
      notifiedUsers: 0,
      alreadyIngested: true,
    };
  }

  // 2) Construir título humano-leíble
  const typeLabel =
    pub.publication_type === 'ley_organica' ? 'Ley Orgánica' :
    pub.publication_type === 'ley_ordinaria' ? 'Ley' :
    pub.publication_type === 'decreto_ejecutivo' ? 'Decreto Ejecutivo' :
    pub.publication_type === 'acuerdo_ministerial' ? 'Acuerdo Ministerial' :
    pub.publication_type === 'resolucion' ? 'Resolución' :
    pub.publication_type === 'reglamento' ? 'Reglamento' :
    'Norma';
  const title = `${typeLabel} ${pub.publication_number ? `Nº ${pub.publication_number}` : ''} — ${pub.title}`
    .replace(/\s+/g, ' ').trim().slice(0, 500);

  // 3) Contenido completo = excerpt + AI summary (si hay)
  const fullContent = [
    pub.ai_summary ? `RESUMEN IA:\n${pub.ai_summary}\n\n` : '',
    pub.raw_text_excerpt || '',
  ].join('').trim();

  if (fullContent.length < 50) {
    throw new Error('Publicación sin contenido suficiente para ingesta');
  }

  const docId = randomUUID();

  emit('insert-legal-doc', { docId, title, contentLength: fullContent.length });
  // 4) INSERT legal_documents
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.legal_documents
       (id, title, norm_title, content, norm_type, publication_type,
        publication_number, publication_date, jurisdiction, country_code,
        category, uploaded_by, is_active, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13::jsonb, now(), now())`,
    docId,
    title,
    (pub.title || '').slice(0, 500),
    fullContent,
    pub.publication_type || 'general',
    pub.publication_type,
    pub.publication_number,
    pub.edition_date,
    'national',
    'EC',
    pub.ai_classification || 'general',
    userId,
    JSON.stringify({
      source: 'registro_oficial_ec',
      editionNumber: pub.edition_number,
      editionUrl: pub.edition_url,
      editionPdfUrl: pub.edition_pdf_url,
      issuingEntity: pub.issuing_entity,
      aiClassification: pub.ai_classification,
      aiKeywords: pub.ai_keywords,
      aiSummary: pub.ai_summary,
      aiRelevanceScore: pub.ai_relevance_score,
      registryPublicationId: pub.id,
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
    }),
  );

  // 5) Generar chunks + embeddings — propaga onProgress al chunker
  emit('chunking-start', { docId, chunkSize: 1000, overlap: 150 });
  const svc = new LegalDocumentService(prisma);
  let chunksCreated = 0;
  let embeddingsGenerated = 0;
  try {
    const r = await svc.regenerateEmbeddings(
      docId,
      userId,
      { chunkSize: 1000, overlap: 150 },
      emit,  // forward los eventos chunking-done, embedding-progress, embedding-done
    );
    chunksCreated = r.totalChunks;
    embeddingsGenerated = r.embeddingsGenerated;
  } catch (e: any) {
    emit('chunking-error', { error: e?.message });
    // eslint-disable-next-line no-console
    console.error('[corpus-ingestion] regenerateEmbeddings failed', e?.message);
  }

  // 6) Copiar embedding JSONB → embedding_v (vector pgvector)
  emit('vector-copy-start', { docId });
  let vectorized = 0;
  try {
    const r = await prisma.$executeRawUnsafe(
      `UPDATE public.legal_document_chunks
          SET embedding_v = (embedding::text)::vector
        WHERE legal_document_id = $1
          AND embedding IS NOT NULL
          AND embedding_v IS NULL`,
      docId,
    );
    vectorized = Number(r) || 0;
    emit('vector-copy-done', { docId, vectorizedCount: vectorized });
  } catch (e: any) {
    emit('vector-copy-error', { error: e?.message });
    // eslint-disable-next-line no-console
    console.error('[corpus-ingestion] embedding_v copy failed', e?.message);
  }

  // 7) Marcar publication como ingested
  emit('mark-ingested', { docId, chunksCreated });
  await prisma.$executeRawUnsafe(
    `UPDATE public.registry_publications
        SET status = 'ingested',
            reviewed_by = $2,
            reviewed_at = now(),
            ingested_legal_doc_id = $3,
            ingested_at = now(),
            chunks_created = $4
      WHERE id = $1::uuid`,
    publicationId, userId, docId, chunksCreated,
  );

  // 8) Notificación broadcast a usuarios activos
  emit('broadcast-start', { docId });
  let notifiedUsers = 0;
  try {
    notifiedUsers = await notifyAllActiveUsersOfNewNorm(docId);
    emit('broadcast-done', { notifiedUsers });
  } catch (e: any) {
    emit('broadcast-error', { error: e?.message });
    // eslint-disable-next-line no-console
    console.error('[corpus-ingestion] notify failed', e?.message);
  }

  emit('complete', {
    legalDocId: docId,
    chunksCreated,
    embeddingsGenerated,
    embeddingsVectorized: vectorized,
    notifiedUsers,
  });

  return {
    legalDocId: docId,
    chunksCreated,
    embeddingsGenerated,
    embeddingsVectorized: vectorized,
    notifiedUsers,
  };
}

/**
 * Auto-ingest masivo: corre tras un scan exitoso y procesa todas las
 * publications `analyzed` que cumplen criterios (relevancia ≥ umbral,
 * tipo en la lista de leyes/decretos, sin doc legal ya ingestado).
 *
 * El usuario virtual `system:auto-ingest` queda registrado en `uploaded_by`
 * para distinguir auto-ingest de aprobación manual.
 */
export async function autoIngestQualified(opts: {
  scanId?: string;
  minRelevance?: number;
  triggeredBy?: string;
} = {}): Promise<BatchIngestionResult> {
  const minRelevance = opts.minRelevance ?? AUTO_INGEST_MIN_RELEVANCE;
  const triggeredBy  = opts.triggeredBy  ?? 'system:auto-ingest';

  const conditions = [
    "status = 'analyzed'",
    `publication_type = ANY($1::text[])`,
    'ingested_legal_doc_id IS NULL',
    `COALESCE(ai_relevance_score, 0) >= $2`,
  ];
  const params: any[] = [
    Array.from(AUTO_INGEST_QUALIFYING_TYPES),
    minRelevance,
  ];
  if (opts.scanId) {
    params.push(opts.scanId);
    conditions.push(`scan_id = $${params.length}::uuid`);
  }

  const candidates = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM public.registry_publications
      WHERE ${conditions.join(' AND ')}
      ORDER BY ai_relevance_score DESC NULLS LAST
      LIMIT 20`,
    ...params,
  );

  const result: BatchIngestionResult = {
    processed: candidates.length,
    succeeded: 0,
    failed: 0,
    totalChunks: 0,
    totalNotified: 0,
    ingestedIds: [],
    errors: [],
  };

  for (const c of candidates) {
    try {
      const r = await ingestPublicationToCorpus(c.id, triggeredBy);
      result.succeeded++;
      result.totalChunks += r.chunksCreated;
      result.totalNotified += r.notifiedUsers;
      result.ingestedIds.push(r.legalDocId);
    } catch (e: any) {
      result.failed++;
      result.errors.push({ pubId: c.id, error: e?.message || 'unknown error' });
    }
  }

  return result;
}
