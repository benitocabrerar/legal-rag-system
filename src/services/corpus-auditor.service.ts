/**
 * Corpus Auditor Service
 *
 * Compara el catálogo curado de leyes nacionales vigentes de Ecuador
 * (NATIONAL_LAWS_CATALOG) contra el corpus actual (`legal_documents`).
 * Para las normas FALTANTES intenta buscarlas en el sitio oficial del
 * Registro Oficial, descargar el PDF y ejecutar el pipeline completo
 * de ingesta (chunks + embeddings + vector + broadcast).
 *
 * Es la auditoría "completa" del corpus jurídico: garantiza que TODA
 * la legislación nacional vigente esté disponible para el RAG.
 *
 * Salida: un `corpus_audit_runs` con todos los `corpus_audit_items`
 * que cuentan por categoría/status y un reporte HTML descargable.
 */
import { prisma } from '../lib/prisma.js';
import { NATIONAL_LAWS_CATALOG, type NationalLaw, CATALOG_VERSION } from '../data/national-laws-catalog.js';
import { ingestPublicationToCorpus } from './corpus-ingestion.service.js';
import { searchRoLive } from './norm-monitor.service.js';
import { downloadAndExtractPdf, downloadAndExtractPdfWithDetails } from './registro-oficial.service.js';
void downloadAndExtractPdf; // mantenido por backward-compat para otros callers
import { randomUUID } from 'crypto';

const RO_BASE = 'https://www.registroficial.gob.ec';
const USER_AGENT = 'Mozilla/5.0 (compatible; PoweriaLegalAuditor/1.0)';
const FETCH_TIMEOUT_MS = 30_000;
const FUZZY_MATCH_THRESHOLD = 0.5;
// Cortesía con el sitio del RO — pausa entre fetches
const RO_FETCH_DELAY_MS = 1200;

export type AuditProgressCallback = (event: string, data: any) => void;

export interface AuditOptions {
  triggeredBy?: string;
  userId?: string;      // user id real para llenar legal_documents.uploaded_by
                        // (FK a users.id). Si no se provee, se busca un admin
                        // activo como fallback.
  dryRun?: boolean;     // si true, no descarga ni ingresa — solo reporta
  onlyMissing?: boolean;// si true, salta items present (más rápido en reruns)
  onProgress?: AuditProgressCallback;
}

export interface AuditResult {
  runId: string;
  totalExpected: number;
  totalPresent: number;
  totalMissing: number;
  totalIngestedOk: number;
  totalIngestedFail: number;
  totalChunksAdded: number;
  htmlReportPath: string | null;
  durationMs: number;
  errors: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────

export async function runFullAudit(opts: AuditOptions = {}): Promise<AuditResult> {
  const emit = opts.onProgress || (() => {});
  const triggeredBy = opts.triggeredBy ?? 'manual';
  const startedAt = Date.now();
  const errors: string[] = [];

  // Resolver userId para legal_documents.uploaded_by (FK a users.id).
  // Preferencia: el que pasa el endpoint (admin que disparó el audit).
  // Fallback: primer admin activo de la DB. Si no hay ninguno, error
  // explícito antes de iniciar el run.
  let effectiveUserId = opts.userId || null;
  if (!effectiveUserId) {
    const fallback = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM public.users
        WHERE is_active = true AND role IN ('admin','superadmin')
        ORDER BY created_at ASC LIMIT 1`,
    );
    if (fallback.length === 0) {
      throw new Error('No admin user available for legal_documents.uploaded_by FK. Audit aborted.');
    }
    effectiveUserId = fallback[0].id;
  }

  // 1) Crear run header
  const run = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO public.corpus_audit_runs (triggered_by, status, total_expected, catalog_version)
     VALUES ($1, 'running', $2, $3) RETURNING id`,
    triggeredBy, NATIONAL_LAWS_CATALOG.length, CATALOG_VERSION,
  );
  const runId = run[0].id;
  emit('connected', { runId, totalExpected: NATIONAL_LAWS_CATALOG.length, catalogVersion: CATALOG_VERSION });

  // 2) Cargar todo el corpus monitorable en memoria para matching rápido
  emit('phase', { phase: 'loading-corpus', label: 'Cargando corpus actual…', pct: 5 });
  const corpus = await prisma.$queryRawUnsafe<Array<{
    id: string; title: string; norm_title: string | null;
    legal_hierarchy: string | null; publication_date: Date | null;
  }>>(
    `SELECT id, title, norm_title,
            legal_hierarchy::text AS legal_hierarchy,
            publication_date
       FROM public.legal_documents
      WHERE is_active = true`,
  );

  emit('phase', {
    phase: 'corpus-loaded',
    label: `${corpus.length} documentos en corpus · ${NATIONAL_LAWS_CATALOG.length} normas esperadas`,
    pct: 8,
  });

  // 3) Iterar catálogo
  //
  // CADA norma corre dentro de try/catch — un error en una sola norma
  // (PDF caído, conflict en DB, timeout, etc.) NO debe abortar el audit
  // completo. Marcamos como ingested_fail con el error y seguimos.
  //
  // El try/finally exterior garantiza que el run header SIEMPRE se cierre
  // con totales reales y status='completed' o 'failed', evitando registros
  // huérfanos con completed_at=null y total_present=0 (que era lo que
  // estábamos viendo en los 3 últimos runs).
  let present = 0;
  let missing = 0;
  let ingestedOk = 0;
  let ingestedFail = 0;
  let chunksAdded = 0;
  let runStatus: 'completed' | 'failed' = 'completed';
  let fatalError: string | null = null;
  let htmlReportPath: string | null = null;

  try {
    for (let i = 0; i < NATIONAL_LAWS_CATALOG.length; i++) {
      const law = NATIONAL_LAWS_CATALOG[i];
      const pct = 10 + Math.round((i / NATIONAL_LAWS_CATALOG.length) * 80);

      emit('item-start', {
        index: i + 1, total: NATIONAL_LAWS_CATALOG.length, pct,
        canonicalName: law.canonicalName, shortName: law.shortName,
        category: law.category,
      });

      try {
        // Matching contra el corpus
        const match = findBestMatch(law, corpus);
        if (match) {
          present++;
          await persistItem(runId, law, {
            status: 'present',
            matchedLegalDocId: match.id,
            matchSimilarity: match.score,
            matchMethod: match.method,
          });
          emit('item-present', {
            index: i + 1, total: NATIONAL_LAWS_CATALOG.length, pct,
            canonicalName: law.canonicalName,
            matchedLegalDocId: match.id,
            similarity: match.score,
          });
          continue;
        }

        // No está en el corpus — intentar ingestión
        missing++;
        await persistItem(runId, law, { status: 'missing' });

        if (opts.dryRun) {
          emit('item-missing', {
            index: i + 1, total: NATIONAL_LAWS_CATALOG.length, pct,
            canonicalName: law.canonicalName, dryRun: true,
          });
          continue;
        }

        // Intentar buscar en el sitio del RO
        emit('item-searching', {
          index: i + 1, total: NATIONAL_LAWS_CATALOG.length, pct,
          canonicalName: law.canonicalName,
        });

        const ingestion = await tryIngestFromRo(law, runId, effectiveUserId);
        if (ingestion.success) {
          ingestedOk++;
          chunksAdded += ingestion.chunksCreated;
          emit('item-ingested', {
            index: i + 1, total: NATIONAL_LAWS_CATALOG.length, pct,
            canonicalName: law.canonicalName,
            chunksCreated: ingestion.chunksCreated,
            durationMs: ingestion.durationMs,
          });
        } else {
          ingestedFail++;
          emit('item-failed', {
            index: i + 1, total: NATIONAL_LAWS_CATALOG.length, pct,
            canonicalName: law.canonicalName,
            error: ingestion.error,
          });
        }
      } catch (perItemErr: any) {
        // Cualquier excepción no manejada por tryIngestFromRo (p.ej. conflict
        // en INSERT, timeout no esperado, error de Prisma) cae aquí y se
        // contabiliza como fail individual — el audit sigue con la próxima.
        ingestedFail++;
        const errMsg = perItemErr?.message || 'Unknown per-item error';
        errors.push(`${law.canonicalName}: ${errMsg}`);
        try {
          await updateItemStatus(runId, law, {
            status: 'ingested_fail',
            error: errMsg.slice(0, 1000),
          });
        } catch { /* ignore update failure */ }
        // eslint-disable-next-line no-console
        console.error(`[audit] EXCEPTION en ${law.canonicalName}: ${errMsg}`);
        emit('item-failed', {
          index: i + 1, total: NATIONAL_LAWS_CATALOG.length, pct,
          canonicalName: law.canonicalName,
          error: errMsg,
        });
      }
    }

    // 4) Generar reporte HTML (también aislado — no debe matar el run)
    emit('phase', { phase: 'generating-report', label: 'Generando reporte HTML…', pct: 92 });
    try {
      const { generateAuditHtmlReport } = await import('./corpus-audit-report.service.js');
      htmlReportPath = await generateAuditHtmlReport(runId);
    } catch (e: any) {
      errors.push(`Report generation failed: ${e?.message || 'unknown'}`);
    }
  } catch (fatalErr: any) {
    // Error fatal NO esperado del loop (p.ej. error de infra antes del
    // try/catch interno). Marcamos run como failed pero seguimos al finally
    // para cerrar el header de la auditoría.
    runStatus = 'failed';
    fatalError = fatalErr?.message || 'Unknown fatal error';
    errors.push(`Fatal: ${fatalError}`);
    // eslint-disable-next-line no-console
    console.error(`[audit] FATAL: ${fatalError}`);
  } finally {
    // 5) Cerrar run SIEMPRE — incluso si hubo error fatal — para evitar
    // que el run quede en estado 'running' con completed_at=null.
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE public.corpus_audit_runs
            SET completed_at = now(),
                status = $2,
                total_present = $3,
                total_missing = $4,
                total_ingested_ok = $5,
                total_ingested_fail = $6,
                total_chunks_added = $7,
                html_report_path = $8
          WHERE id = $1::uuid`,
        runId, runStatus, present, missing, ingestedOk, ingestedFail, chunksAdded, htmlReportPath,
      );
    } catch (closeErr: any) {
      errors.push(`Run header close failed: ${closeErr?.message || 'unknown'}`);
    }
  }

  const result: AuditResult = {
    runId,
    totalExpected: NATIONAL_LAWS_CATALOG.length,
    totalPresent: present,
    totalMissing: missing,
    totalIngestedOk: ingestedOk,
    totalIngestedFail: ingestedFail,
    totalChunksAdded: chunksAdded,
    htmlReportPath,
    durationMs: Date.now() - startedAt,
    errors,
  };

  emit('done', { ...result, finishedAt: new Date().toISOString(), fatalError });

  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// MATCHING
// ────────────────────────────────────────────────────────────────────────────

interface MatchResult {
  id: string;
  score: number;
  method: 'exact_title' | 'fuzzy_title' | 'shortname' | 'keywords';
}

function findBestMatch(law: NationalLaw, corpus: Array<{
  id: string; title: string; norm_title: string | null;
  legal_hierarchy: string | null;
}>): MatchResult | null {
  // 1. Exact match insensible a mayúsculas y acentos
  const canonNorm = normalize(law.canonicalName);
  for (const doc of corpus) {
    const docNorm = normalize(doc.norm_title || doc.title);
    if (docNorm === canonNorm) {
      return { id: doc.id, score: 1.0, method: 'exact_title' };
    }
  }

  // 2. Match por shortName (ej. "COIP", "LOSEP") en title
  if (law.shortName) {
    const sn = law.shortName.toLowerCase();
    const found = corpus.find((d) => {
      const t = (d.norm_title || d.title || '').toLowerCase();
      return t.includes(sn) && sn.length >= 3;
    });
    if (found) return { id: found.id, score: 0.85, method: 'shortname' };
  }

  // 3. Fuzzy match (jaccard sobre tokens significativos)
  let best: MatchResult | null = null;
  for (const doc of corpus) {
    const sim = jaccardSimilarity(law.canonicalName, doc.norm_title || doc.title);
    if (sim >= FUZZY_MATCH_THRESHOLD && (!best || sim > best.score)) {
      best = { id: doc.id, score: sim, method: 'fuzzy_title' };
    }
  }
  if (best) return best;

  // 4. Match por keywords (al menos 2 de 3+ keywords presentes en title)
  if (law.searchKeywords && law.searchKeywords.length >= 3) {
    const kwLower = law.searchKeywords.map((k) => k.toLowerCase());
    for (const doc of corpus) {
      const t = normalize(doc.norm_title || doc.title);
      const hits = kwLower.filter((kw) => t.includes(kw)).length;
      if (hits >= Math.min(3, Math.ceil(kwLower.length * 0.6))) {
        return { id: doc.id, score: 0.6, method: 'keywords' };
      }
    }
  }

  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// INGESTA REMOTA
// ────────────────────────────────────────────────────────────────────────────

async function tryIngestFromRo(law: NationalLaw, runId: string, userId: string): Promise<{
  success: boolean;
  chunksCreated: number;
  durationMs: number;
  error?: string;
}> {
  const startedAt = Date.now();

  // ═══ ESTRATEGIA 1: canonicalPdfUrl directo ═══════════════════════════
  // Si el catálogo trae URL directa al PDF oficial (mantenido por la
  // institución competente como Defensa, Función Judicial, Cancillería),
  // la usamos preferentemente — saltamos la búsqueda en RO que no
  // encuentra normas consolidadas.
  let canonicalErrorDetail: string | null = null;
  if (law.canonicalPdfUrl) {
    const dl = await downloadAndExtractPdfWithDetails(law.canonicalPdfUrl);
    if (dl.text && dl.text.length >= 500) {
      const pubId = await createPublicationFromCanonical(law, dl.text);
      await sleep(300);
      const ing = await ingestPublicationToCorpus(pubId, userId);

      // matchMethod refleja cómo se obtuvo el texto: directo (pdf-parse)
      // o via Claude Vision OCR para PDFs escaneados.
      const matchMethodLabel =
        dl.method === 'claude-vision'      ? 'canonical_url_vision_ocr' :
        dl.method === 'pdf+vision-rescue'  ? 'canonical_url_vision_rescue' :
                                              'canonical_url';

      await updateItemStatus(runId, law, {
        status: 'ingested_ok',
        remotePdfUrl: law.canonicalPdfUrl,
        chunksCreated: ing.chunksCreated,
        embeddingsGenerated: ing.embeddingsGenerated,
        embeddingsVectorized: ing.embeddingsVectorized,
        matchedLegalDocId: ing.legalDocId,
        matchSimilarity: 1.0,
        matchMethod: matchMethodLabel,
        durationMs: Date.now() - startedAt,
      });

      // eslint-disable-next-line no-console
      console.log(`[audit] ✓ ${law.canonicalName} via ${dl.method} (${dl.size}b, ${dl.fetchMs}ms fetch, ${dl.parseMs}ms parse → ${ing.chunksCreated} chunks)`);

      return {
        success: true,
        chunksCreated: ing.chunksCreated,
        durationMs: Date.now() - startedAt,
      };
    }
    // Diagnóstico detallado de por qué falló incluso después de Vision fallback
    canonicalErrorDetail = `canonicalPdfUrl ${law.canonicalPdfUrl} → método=${dl.method} → ${dl.error || 'sin texto'} (size: ${dl.size}b, fetch: ${dl.fetchMs}ms, parse: ${dl.parseMs}ms)`;
    // eslint-disable-next-line no-console
    console.warn(`[audit] ✗ ${law.canonicalName}: ${canonicalErrorDetail}`);
  }

  // ═══ ESTRATEGIA 2: búsqueda en el buscador del RO ════════════════════
  try {
    const query = buildSearchQuery(law);
    const results = await searchRoLive(query, 5);

    // Esperar entre requests por cortesía
    await sleep(RO_FETCH_DELAY_MS);

    if (results.length === 0) {
      await updateItemStatus(runId, law, {
        status: 'unreachable',
        remoteSearchUrl: `${RO_BASE}/?s=${encodeURIComponent(query)}`,
        error: canonicalErrorDetail
          ? `${canonicalErrorDetail} · Tampoco se encontró en buscador RO.`
          : 'Sin resultados en el buscador del RO',
        durationMs: Date.now() - startedAt,
      });
      return { success: false, chunksCreated: 0, durationMs: Date.now() - startedAt, error: 'No matches' };
    }

    // 2) Elegir el mejor resultado por similitud de título
    const best = results
      .map((r) => ({ ...r, score: jaccardSimilarity(law.canonicalName, r.title) }))
      .sort((a, b) => b.score - a.score)[0];

    if (best.score < 0.3) {
      await updateItemStatus(runId, law, {
        status: 'unreachable',
        remoteSearchUrl: `${RO_BASE}/?s=${encodeURIComponent(query)}`,
        error: `Resultados encontrados pero baja similitud (max ${best.score.toFixed(2)})`,
        durationMs: Date.now() - startedAt,
      });
      return { success: false, chunksCreated: 0, durationMs: Date.now() - startedAt, error: 'Low similarity' };
    }

    if (!best.pdfUrl) {
      await updateItemStatus(runId, law, {
        status: 'found_remote',
        remoteSearchUrl: `${RO_BASE}/?s=${encodeURIComponent(query)}`,
        error: 'Match encontrado pero sin URL de PDF',
        durationMs: Date.now() - startedAt,
      });
      return { success: false, chunksCreated: 0, durationMs: Date.now() - startedAt, error: 'No PDF link' };
    }

    // 3) Crear una registry_publications entry para reusar el pipeline existente
    const pubId = await createSyntheticPublication(law, best);
    await sleep(RO_FETCH_DELAY_MS);

    // 4) Ingestar al corpus (chunks + embeddings + broadcast)
    const ing = await ingestPublicationToCorpus(pubId, userId);

    await updateItemStatus(runId, law, {
      status: 'ingested_ok',
      remoteSearchUrl: `${RO_BASE}/?s=${encodeURIComponent(query)}`,
      remotePdfUrl: best.pdfUrl,
      chunksCreated: ing.chunksCreated,
      embeddingsGenerated: ing.embeddingsGenerated,
      embeddingsVectorized: ing.embeddingsVectorized,
      matchedLegalDocId: ing.legalDocId,
      matchSimilarity: best.score,
      matchMethod: 'fuzzy_title',
      durationMs: Date.now() - startedAt,
    });

    return {
      success: true,
      chunksCreated: ing.chunksCreated,
      durationMs: Date.now() - startedAt,
    };
  } catch (e: any) {
    await updateItemStatus(runId, law, {
      status: 'ingested_fail',
      error: e?.message || 'Unknown error',
      durationMs: Date.now() - startedAt,
    });
    return {
      success: false,
      chunksCreated: 0,
      durationMs: Date.now() - startedAt,
      error: e?.message || 'Unknown error',
    };
  }
}

function buildSearchQuery(law: NationalLaw): string {
  // Estrategia: usar el shortName si existe (más específico),
  // si no usar las 3 primeras keywords distintivas o el canonicalName.
  if (law.shortName && law.shortName.length >= 3 && law.shortName.length <= 12) {
    return law.shortName;
  }
  if (law.searchKeywords && law.searchKeywords.length >= 2) {
    return law.searchKeywords.slice(0, 3).join(' ');
  }
  return law.canonicalName.split(' ').slice(0, 6).join(' ');
}

/**
 * Crea una registry_publications con el TEXTO COMPLETO descargado desde
 * la canonicalPdfUrl curada (que es lo que mantienen las instituciones
 * oficiales como Defensa, Función Judicial, etc.). El pipeline de ingest
 * usa este texto directamente sin necesidad de buscar nada en el RO.
 */
async function createPublicationFromCanonical(law: NationalLaw, fullText: string): Promise<string> {
  // IDEMPOTENTE: si un run anterior creó la registry_publications pero
  // falló al hacer la ingesta (p.ej. por el bug previo del enum), la
  // fila queda huérfana. ON CONFLICT DO UPDATE recicla esa fila con el
  // texto fresco y devuelve su id existente para que ingestPublicationToCorpus
  // termine el trabajo.
  //
  // CRÍTICO: persistimos canonicalNormType y canonicalLegalHierarchy en
  // ai_keywords (array text) para que ingestPublicationToCorpus pueda
  // restaurar los valores correctos en legal_documents en vez de derivarlos
  // por mapper genérico que pierde la info (INTERNATIONAL_TREATY →
  // ley_organica → ORGANIC_LAW → LEYES_ORGANICAS incorrecto).
  //
  // publication_number fallback: para tratados internacionales y normas
  // sin RO number, usamos la fecha de publicación como identificador
  // sintético no-null (ej. 'pub-1969-11-22'), porque legal_documents.
  // publication_number es NOT NULL.
  const id = randomUUID();
  const publicationNumber = law.registroOficialNumber
    || (law.publicationDate ? `pub-${law.publicationDate}` : `canonical-${law.canonicalName.slice(0, 40)}`);

  // Tags semánticos que el ingest leerá: 'canon:normType=...' y
  // 'canon:hierarchy=...'. ai_keywords es text[] y permite múltiples
  // tags sin migración de schema. Convivimos con keywords reales.
  const canonTags = [
    `canon:normType=${law.normType}`,
    `canon:hierarchy=${law.legalHierarchy}`,
  ];
  const allKeywords = [...(law.searchKeywords || []), ...canonTags];

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO public.registry_publications (
        id, country_code, source, edition_number, edition_date,
        edition_url, edition_pdf_url, publication_type, publication_number,
        title, issuing_entity, raw_text_excerpt, raw_text_length,
        ai_summary, ai_classification, ai_relevance_score, ai_keywords,
        status
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::text[], 'analyzed')
      ON CONFLICT (source, edition_number, publication_number, title)
      DO UPDATE SET
        raw_text_excerpt = EXCLUDED.raw_text_excerpt,
        raw_text_length  = EXCLUDED.raw_text_length,
        edition_pdf_url  = COALESCE(EXCLUDED.edition_pdf_url, public.registry_publications.edition_pdf_url),
        edition_url      = COALESCE(EXCLUDED.edition_url,     public.registry_publications.edition_url),
        ai_summary       = EXCLUDED.ai_summary,
        ai_classification= EXCLUDED.ai_classification,
        ai_keywords      = EXCLUDED.ai_keywords,
        status           = 'analyzed',
        updated_at       = now()
      RETURNING id`,
    id,
    'EC',
    'registro_oficial_ec_canonical',           // marca: vino de URL oficial directa
    law.registroOficialNumber || `Canonical-${law.canonicalName.slice(0, 40)}`, // edition_number también NOT NULL en UNIQUE
    law.publicationDate ? new Date(law.publicationDate) : new Date(),
    law.canonicalPdfUrl || null,
    law.canonicalPdfUrl || null,
    mapNormTypeToPublicationType(law.normType),
    publicationNumber,                          // fallback no-null para tratados
    law.canonicalName,
    inferIssuingEntity(law),                    // Asamblea Nacional para EC, organismo internacional para tratados
    fullText.slice(0, 16000),                  // hasta 16k chars (el resto va al content via legal_documents)
    fullText.length,
    `[Audit canonical] ${law.canonicalName} — descargada desde URL oficial. Catálogo curado v${CATALOG_VERSION}. Tipo: ${law.normType}, jerarquía: ${law.legalHierarchy}, categoría: ${law.category}.`,
    law.category?.toLowerCase() || 'general',
    1.0,
    allKeywords,
  );
  return rows[0]?.id || id;
}

function inferIssuingEntity(law: NationalLaw): string {
  if (law.normType === 'INTERNATIONAL_TREATY') {
    const name = law.canonicalName.toLowerCase();
    if (name.includes('oit')) return 'Organización Internacional del Trabajo (OIT)';
    if (name.includes('can') || name.includes('cartagena') || name.includes('andin')) return 'Comunidad Andina (CAN)';
    if (name.includes('omc') || name.includes('marrakech')) return 'Organización Mundial del Comercio (OMC)';
    if (name.includes('americana') || name.includes('belém') || name.includes('interamericana')) return 'Organización de Estados Americanos (OEA)';
    return 'Organización de las Naciones Unidas (ONU)';
  }
  return 'Asamblea Nacional del Ecuador';
}

function mapNormTypeToPublicationType(t: NationalLaw['normType']): string {
  switch (t) {
    case 'ORGANIC_LAW':       return 'ley_organica';
    case 'ORDINARY_LAW':      return 'ley_ordinaria';
    case 'ORGANIC_CODE':      return 'ley_organica';
    case 'ORDINARY_CODE':     return 'ley_ordinaria';
    case 'REGULATION_GENERAL':
    case 'REGULATION_EXECUTIVE': return 'reglamento';
    case 'CONSTITUTIONAL_NORM':  return 'ley_organica';
    case 'INTERNATIONAL_TREATY': return 'ley_organica';
    default: return 'general';
  }
}

async function createSyntheticPublication(
  law: NationalLaw,
  result: { title: string; url: string; excerpt: string | null; pdfUrl: string | null; pubDate: Date | null },
): Promise<string> {
  // Insertar una registry_publications con status='analyzed' para que
  // el pipeline existente la procese normalmente. Es "sintética" porque
  // viene del catálogo, no de un scan diario.
  // Idempotente con ON CONFLICT DO UPDATE para soportar reruns.
  const id = randomUUID();
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO public.registry_publications (
        id, country_code, source, edition_number, edition_date,
        edition_url, edition_pdf_url, publication_type, publication_number,
        title, issuing_entity, raw_text_excerpt, raw_text_length,
        ai_summary, ai_classification, ai_relevance_score, ai_keywords,
        status
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::text[], 'analyzed')
      ON CONFLICT (source, edition_number, publication_number, title)
      DO UPDATE SET
        edition_pdf_url  = COALESCE(EXCLUDED.edition_pdf_url, public.registry_publications.edition_pdf_url),
        edition_url      = COALESCE(EXCLUDED.edition_url,     public.registry_publications.edition_url),
        raw_text_excerpt = EXCLUDED.raw_text_excerpt,
        raw_text_length  = EXCLUDED.raw_text_length,
        ai_summary       = EXCLUDED.ai_summary,
        ai_classification= EXCLUDED.ai_classification,
        ai_keywords      = EXCLUDED.ai_keywords,
        status           = 'analyzed',
        updated_at       = now()
      RETURNING id`,
    id,
    'EC',
    'registro_oficial_ec_audit',
    law.registroOficialNumber || null,
    law.publicationDate ? new Date(law.publicationDate) : (result.pubDate || new Date()),
    result.url,
    result.pdfUrl,
    law.legalHierarchy?.toLowerCase() || 'general',
    law.registroOficialNumber || null,
    law.canonicalName,
    'Asamblea Nacional del Ecuador',
    result.excerpt || `Norma del catálogo: ${law.canonicalName}`,
    (result.excerpt || '').length,
    `[Auditoría de corpus] Norma vigente identificada como faltante en el catálogo de leyes nacionales: ${law.canonicalName}. Categoría: ${law.category}.`,
    law.category?.toLowerCase() || 'general',
    1.0,
    law.searchKeywords || [],
  );
  return rows[0]?.id || id;
}

// ────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ────────────────────────────────────────────────────────────────────────────

interface ItemUpdate {
  status: string;
  matchedLegalDocId?: string | null;
  matchSimilarity?: number;
  matchMethod?: string;
  remoteSearchUrl?: string;
  remotePdfUrl?: string;
  chunksCreated?: number;
  embeddingsGenerated?: number;
  embeddingsVectorized?: number;
  durationMs?: number;
  error?: string;
}

async function persistItem(runId: string, law: NationalLaw, update: ItemUpdate): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.corpus_audit_items (
        run_id, canonical_name, short_name, norm_type, legal_hierarchy,
        category, expected_publication_date, expected_last_reform_date,
        expected_ro_number, search_keywords, status,
        matched_legal_doc_id, match_similarity, match_method,
        remote_search_url, remote_pdf_url,
        chunks_created, embeddings_generated, embeddings_vectorized,
        ingestion_duration_ms, error_message
      ) VALUES (
        $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::text[], $11,
        $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )`,
    runId,
    law.canonicalName, law.shortName, law.normType, law.legalHierarchy, law.category,
    law.publicationDate ? new Date(law.publicationDate) : null,
    law.lastReformDate ? new Date(law.lastReformDate) : null,
    law.registroOficialNumber,
    law.searchKeywords || [],
    update.status,
    update.matchedLegalDocId || null,
    update.matchSimilarity || null,
    update.matchMethod || null,
    update.remoteSearchUrl || null,
    update.remotePdfUrl || null,
    update.chunksCreated || null,
    update.embeddingsGenerated || null,
    update.embeddingsVectorized || null,
    update.durationMs || null,
    update.error || null,
  );
}

async function updateItemStatus(runId: string, law: NationalLaw, update: ItemUpdate): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE public.corpus_audit_items
        SET status = $3,
            matched_legal_doc_id = COALESCE($4, matched_legal_doc_id),
            match_similarity = COALESCE($5, match_similarity),
            match_method = COALESCE($6, match_method),
            remote_search_url = COALESCE($7, remote_search_url),
            remote_pdf_url = COALESCE($8, remote_pdf_url),
            chunks_created = COALESCE($9, chunks_created),
            embeddings_generated = COALESCE($10, embeddings_generated),
            embeddings_vectorized = COALESCE($11, embeddings_vectorized),
            ingestion_duration_ms = COALESCE($12, ingestion_duration_ms),
            error_message = COALESCE($13, error_message),
            updated_at = now()
      WHERE run_id = $1::uuid AND canonical_name = $2`,
    runId, law.canonicalName, update.status,
    update.matchedLegalDocId, update.matchSimilarity, update.matchMethod,
    update.remoteSearchUrl, update.remotePdfUrl,
    update.chunksCreated, update.embeddingsGenerated, update.embeddingsVectorized,
    update.durationMs, update.error,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ────────────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'de','la','el','los','las','del','y','a','que','en','para','por','con',
  'al','un','una','no','o','su','sus','se','sobre','ley','codigo','código',
]);

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(' ').filter((t) => t.length >= 3 && !STOPWORDS.has(t)));
}

function jaccardSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((t) => { if (tb.has(t)) inter++; });
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
