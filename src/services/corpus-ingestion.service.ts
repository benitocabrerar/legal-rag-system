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
  // Resolución de enums NormType, PublicationType y LegalHierarchy.
  //
  // PREFERENCIA: tags 'canon:normType=X' y 'canon:hierarchy=X' en
  // ai_keywords del registry_publications. El auditor los persiste así
  // para preservar la info del catálogo (p.ej. INTERNATIONAL_TREATY +
  // TRATADOS_INTERNACIONALES_DDHH) que se perdería pasando por mapper
  // genérico publication_type→NormType→LegalHierarchy.
  //
  // FALLBACK: derivación desde publication_type/edition_number del
  // scraper para publicaciones del scan diario que no tienen tags
  // canónicos.
  const aiKeywords: string[] = Array.isArray(pub.ai_keywords) ? pub.ai_keywords : [];
  const canonNormType = extractCanonTag(aiKeywords, 'normType');
  const canonHierarchy = extractCanonTag(aiKeywords, 'hierarchy');

  const normTypeEnum = canonNormType || publicationTypeToNormType(pub.publication_type);
  const publicationTypeEnum = inferPublicationTypeFromEdition(pub.edition_number);
  const legalHierarchyEnum = canonHierarchy || normTypeToLegalHierarchy(normTypeEnum);

  // publication_number es NOT NULL en legal_documents — fallback sintético
  // si la publicación no trae uno (típicamente tratados internacionales
  // sin RO number).
  const publicationNumberSafe = pub.publication_number
    || (pub.publication_date ? `pub-${new Date(pub.publication_date).toISOString().slice(0,10)}` : `canonical-${(pub.title || 'norma').slice(0, 40)}`);

  // 4) INSERT legal_documents
  // legal_hierarchy es NOT NULL (sin default) — se deriva del normType para
  // garantizar el INSERT incluso cuando registry_publications no lo trae.
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.legal_documents
       (id, title, norm_title, content, norm_type, publication_type, legal_hierarchy,
        publication_number, publication_date, jurisdiction, country_code,
        category, uploaded_by, is_active, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5::"NormType", $6::"PublicationType", $7::"LegalHierarchy",
             $8, $9, $10::"Jurisdiction", $11, $12, $13, true, $14::jsonb, now(), now())`,
    docId,
    title,
    (pub.title || '').slice(0, 500),
    fullContent,
    normTypeEnum,
    publicationTypeEnum,
    legalHierarchyEnum,
    publicationNumberSafe,        // NOT NULL — fallback sintético si pub.publication_number es null (tratados internacionales)
    pub.edition_date,
    normTypeEnum === 'INTERNATIONAL_TREATY' ? 'INTERNACIONAL' : 'NACIONAL',  // tratados van como INTERNACIONAL
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
      originalPublicationType: pub.publication_type,  // preservamos el valor original para debug
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

// ────────────────────────────────────────────────────────────────────────────
// ENUM MAPPERS · NormType, PublicationType, Jurisdiction
// ────────────────────────────────────────────────────────────────────────────

/**
 * Mapea el publication_type del scraper/catálogo (formato 'ley_organica') al
 * enum NormType de Postgres (ORGANIC_LAW). Los valores del scraper son
 * heredados del parser de PDFs; los del enum siguen una convención propia.
 */
function publicationTypeToNormType(pt: string | null | undefined): string {
  switch ((pt || '').toLowerCase().trim()) {
    case 'ley_organica':         return 'ORGANIC_LAW';
    case 'codigo_organico':      return 'ORGANIC_CODE';
    case 'ley_ordinaria':        return 'ORDINARY_LAW';
    case 'codigo_ordinario':     return 'ORDINARY_CODE';
    case 'codigo':               return 'ORDINARY_CODE';
    case 'decreto_ejecutivo':    return 'REGULATION_EXECUTIVE';
    case 'decreto':              return 'REGULATION_EXECUTIVE';
    case 'acuerdo_ministerial':  return 'ADMINISTRATIVE_AGREEMENT';
    case 'acuerdo':              return 'ADMINISTRATIVE_AGREEMENT';
    case 'resolucion':           return 'RESOLUTION_ADMINISTRATIVE';
    case 'reglamento':           return 'REGULATION_GENERAL';
    case 'ordenanza':            return 'ORDINANCE_MUNICIPAL';
    case 'constitucion':
    case 'constitucional':       return 'CONSTITUTIONAL_NORM';
    case 'tratado':
    case 'convenio':             return 'INTERNATIONAL_TREATY';
    default:                     return 'ORDINARY_LAW';  // fallback razonable
  }
}

/**
 * Infiere el PublicationType (ORDINARIO / SUPLEMENTO / SEGUNDO_SUPLEMENTO /
 * SUPLEMENTO_ESPECIAL / EDICION_CONSTITUCIONAL) desde el edition_number del
 * RO. Los suplementos suelen venir con prefijo "Suplemento N°", "Segundo
 * Suplemento", etc.
 */
function inferPublicationTypeFromEdition(editionNumber: string | null | undefined): string {
  const e = (editionNumber || '').toLowerCase();
  if (e.includes('segundo suplemento')) return 'SEGUNDO_SUPLEMENTO';
  if (e.includes('edición constitucional') || e.includes('edicion constitucional')) return 'EDICION_CONSTITUCIONAL';
  if (e.includes('edición especial') || e.includes('edicion especial')) return 'SUPLEMENTO_ESPECIAL';
  if (e.includes('suplemento')) return 'SUPLEMENTO';
  return 'ORDINARIO';
}

/**
 * Deriva el LegalHierarchy desde el NormType.
 *   ORGANIC_CODE  → CODIGOS_ORGANICOS
 *   ORGANIC_LAW   → LEYES_ORGANICAS
 *   ORDINARY_CODE → CODIGOS_ORDINARIOS
 *   ORDINARY_LAW  → LEYES_ORDINARIAS
 *   REGULATION_*  → REGLAMENTOS
 *   ORDINANCE_*   → ORDENANZAS
 *   RESOLUTION_*  → RESOLUCIONES
 *   ADMINISTRATIVE_AGREEMENT → ACUERDOS_ADMINISTRATIVOS
 *   CONSTITUTIONAL_NORM      → CONSTITUCION
 *   INTERNATIONAL_TREATY     → TRATADOS_INTERNACIONALES_DDHH
 *
 * legal_hierarchy es NOT NULL en la tabla legal_documents — un valor por
 * defecto razonable evita 23502 cuando el publication_type del scraper no
 * trae jerarquía explícita.
 */
/**
 * Lee tags 'canon:<key>=<value>' de ai_keywords. El auditor persiste los
 * valores canónicos del catálogo (normType, hierarchy) como tags para que
 * el ingest pueda restaurarlos en legal_documents sin pasarlos por mappers
 * que pierden info (ej. INTERNATIONAL_TREATY → ley_organica → ORGANIC_LAW).
 */
function extractCanonTag(keywords: string[], key: string): string | null {
  const prefix = `canon:${key}=`;
  const match = keywords.find((k) => typeof k === 'string' && k.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : null;
}

function normTypeToLegalHierarchy(normType: string): string {
  switch (normType) {
    case 'CONSTITUTIONAL_NORM':       return 'CONSTITUCION';
    case 'INTERNATIONAL_TREATY':      return 'TRATADOS_INTERNACIONALES_DDHH';
    case 'ORGANIC_CODE':              return 'CODIGOS_ORGANICOS';
    case 'ORGANIC_LAW':               return 'LEYES_ORGANICAS';
    case 'ORDINARY_CODE':             return 'CODIGOS_ORDINARIOS';
    case 'ORDINARY_LAW':              return 'LEYES_ORDINARIAS';
    case 'REGULATION_GENERAL':
    case 'REGULATION_EXECUTIVE':      return 'REGLAMENTOS';
    case 'ORDINANCE_MUNICIPAL':       return 'ORDENANZAS';
    case 'RESOLUTION_ADMINISTRATIVE': return 'RESOLUCIONES';
    case 'ADMINISTRATIVE_AGREEMENT':  return 'ACUERDOS_ADMINISTRATIVOS';
    default:                           return 'LEYES_ORDINARIAS';
  }
}
