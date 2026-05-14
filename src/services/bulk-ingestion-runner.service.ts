/**
 * Bulk Ingestion Runner
 *
 * Orquestador de ingestas masivas de publicaciones al corpus. Para cada
 * norma del batch:
 *   1. Crea entry en corpus_ingestion_items (status='processing')
 *   2. Llama ingestPublicationToCorpus() con callback granular
 *   3. Forward eventos al SSE del cliente + persiste cada step en DB
 *   4. Actualiza el item con stats finales
 *   5. Al final: actualiza el run con agregados + genera HTML report
 *
 * Diseño: SSE emite eventos de tres niveles de granularidad:
 *   - run-level:  run-start / run-progress / run-complete
 *   - file-level: file-start / file-complete / file-failed
 *   - step-level: chunking-start / chunking-done / embedding-progress / etc.
 */
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';
import {
  ingestPublicationToCorpus,
  type IngestProgressCallback,
} from './corpus-ingestion.service.js';

export type BulkProgressCallback = (event: string, data: any) => void;

export interface BulkIngestionRunResult {
  runId: string;
  totalRequested: number;
  totalSucceeded: number;
  totalFailed: number;
  totalChunks: number;
  totalEmbeddings: number;
  totalVectorized: number;
  totalNotifiedUsers: number;
  totalDurationMs: number;
  countsByHierarchy: Record<string, number>;
  htmlReportPath: string | null;
}

const HIER_TO_COL: Record<string, string> = {
  CONSTITUCION: 'count_constitucion',
  CODIGOS_ORGANICOS: 'count_codigos_organicos',
  LEYES_ORGANICAS: 'count_leyes_organicas',
  CODIGOS_ORDINARIOS: 'count_codigos_ordinarios',
  LEYES_ORDINARIAS: 'count_leyes_ordinarias',
  REGLAMENTOS: 'count_reglamentos',
};

export async function runBulkIngestion(opts: {
  publicationIds: string[];
  userId: string;
  triggeredBy: string;
  source?: 'manual' | 'auto-scan' | 'audit' | 'bulk-approve';
  onProgress?: BulkProgressCallback;
}): Promise<BulkIngestionRunResult> {
  const emit = opts.onProgress || (() => {});
  const source = opts.source || 'bulk-approve';
  const startedAt = Date.now();

  // 1) Crear run header
  const runRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO public.corpus_ingestion_runs
       (triggered_by, source, status, total_requested)
     VALUES ($1, $2, 'running', $3)
     RETURNING id`,
    opts.triggeredBy, source, opts.publicationIds.length,
  );
  const runId = runRows[0].id;

  emit('run-start', {
    runId,
    total: opts.publicationIds.length,
    startedAt: new Date().toISOString(),
    triggeredBy: opts.triggeredBy,
    source,
  });

  // Agregados que iremos acumulando
  let succeeded = 0;
  let failed = 0;
  let totalChunks = 0;
  let totalEmbeddings = 0;
  let totalVectorized = 0;
  let totalNotified = 0;
  const countsByHier: Record<string, number> = {};

  // 2) Procesar cada publicación
  for (let i = 0; i < opts.publicationIds.length; i++) {
    const pubId = opts.publicationIds[i];
    const seqIdx = i + 1;
    const fileStartedAt = Date.now();

    // Pre-cargar publication para tener title/type a mano
    const pubRows = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT id, title, publication_type, edition_number, edition_pdf_url,
              ai_relevance_score, ai_classification
         FROM public.registry_publications WHERE id = $1::uuid`,
      pubId,
    );
    const pub = pubRows[0];
    if (!pub) {
      emit('file-failed', { sequenceIndex: seqIdx, publicationId: pubId, error: 'Publicación no encontrada' });
      failed++;
      continue;
    }

    // Insertar item con status='processing'
    const itemId = randomUUID();
    const stepLog: Array<{ step: string; at: string; data?: any }> = [];

    await prisma.$executeRawUnsafe(
      `INSERT INTO public.corpus_ingestion_items
         (id, run_id, sequence_index, publication_id, canonical_title,
          publication_type, category, edition_number, edition_pdf_url,
          ai_relevance_score, status, current_step, step_started_at, step_log)
       VALUES ($1::uuid, $2::uuid, $3, $4::uuid, $5, $6, $7, $8, $9, $10,
               'processing', 'starting', now(), $11::jsonb)`,
      itemId, runId, seqIdx, pubId, pub.title,
      pub.publication_type, pub.ai_classification, pub.edition_number,
      pub.edition_pdf_url, pub.ai_relevance_score,
      JSON.stringify(stepLog),
    );

    emit('file-start', {
      sequenceIndex: seqIdx,
      total: opts.publicationIds.length,
      itemId,
      publicationId: pubId,
      title: pub.title,
      type: pub.publication_type,
      category: pub.ai_classification,
      editionNumber: pub.edition_number,
      pct: Math.round((i / opts.publicationIds.length) * 100),
    });

    let lastEmbeddingChunk = 0;
    let totalChunksThisFile = 0;
    let docHierarchy: string | null = null;
    let docId: string | null = null;

    // Callback granular del pipeline interno
    const innerCb: IngestProgressCallback = async (event, data) => {
      // Persistir el step en step_log (truncado para no explotar la fila)
      stepLog.push({ step: event, at: new Date().toISOString(), data });
      if (stepLog.length > 80) stepLog.splice(0, stepLog.length - 80);

      // Actualizar campo current_step en DB (no esperamos)
      const statusMap: Record<string, string> = {
        'load-publication': 'processing',
        'insert-legal-doc': 'inserting_legal_doc',
        'chunking-start': 'chunking',
        'chunking-done': 'chunking',
        'embedding-progress': 'embedding',
        'embedding-done': 'embedding',
        'vector-copy-start': 'vectorizing',
        'vector-copy-done': 'vectorizing',
        'mark-ingested': 'marking_ingested',
        'broadcast-start': 'broadcasting',
        'broadcast-done': 'broadcasting',
      };
      const newStatus = statusMap[event] || undefined;

      if (event === 'chunking-done') {
        totalChunksThisFile = data?.totalChunks || 0;
      }
      if (event === 'embedding-progress') {
        lastEmbeddingChunk = data?.chunkIndex || 0;
      }
      if (event === 'insert-legal-doc') {
        docId = data?.docId;
      }

      // Re-emitir al cliente con sequenceIndex para que el frontend
      // sepa a qué archivo corresponden estos eventos
      emit('step', {
        sequenceIndex: seqIdx,
        itemId,
        step: event,
        ...data,
      });

      // Persistencia del step en DB (best effort)
      try {
        if (newStatus) {
          await prisma.$executeRawUnsafe(
            `UPDATE public.corpus_ingestion_items
                SET status = $2,
                    current_step = $3,
                    step_started_at = now(),
                    step_log = $4::jsonb,
                    updated_at = now()
              WHERE id = $1::uuid`,
            itemId, newStatus, event, JSON.stringify(stepLog),
          );
        }
      } catch { /* no crítico */ }
    };

    // 3) Llamar ingest con callback
    try {
      const result = await ingestPublicationToCorpus(pubId, opts.userId, innerCb);

      // Cargar hierarchy del doc para contar por jerarquía
      if (result.legalDocId) {
        const hRows = await prisma.$queryRawUnsafe<Array<{ legal_hierarchy: string | null }>>(
          `SELECT legal_hierarchy::text AS legal_hierarchy
             FROM public.legal_documents WHERE id = $1`,
          result.legalDocId,
        );
        docHierarchy = hRows[0]?.legal_hierarchy || null;
        docId = result.legalDocId;
      }

      const fileDuration = Date.now() - fileStartedAt;
      totalChunks += result.chunksCreated;
      totalEmbeddings += result.embeddingsGenerated;
      totalVectorized += result.embeddingsVectorized;
      totalNotified += result.notifiedUsers;
      succeeded++;

      if (docHierarchy) {
        countsByHier[docHierarchy] = (countsByHier[docHierarchy] || 0) + 1;
      }

      // UPDATE item final
      await prisma.$executeRawUnsafe(
        `UPDATE public.corpus_ingestion_items
            SET status = 'completed',
                current_step = 'completed',
                legal_doc_id = $2,
                legal_hierarchy = $3,
                chunks_created = $4,
                embeddings_generated = $5,
                embeddings_vectorized = $6,
                notified_users = $7,
                duration_ms = $8,
                step_log = $9::jsonb,
                updated_at = now()
          WHERE id = $1::uuid`,
        itemId, docId, docHierarchy,
        result.chunksCreated, result.embeddingsGenerated, result.embeddingsVectorized,
        result.notifiedUsers, fileDuration,
        JSON.stringify(stepLog),
      );

      emit('file-complete', {
        sequenceIndex: seqIdx,
        total: opts.publicationIds.length,
        itemId,
        title: pub.title,
        legalDocId: docId,
        legalHierarchy: docHierarchy,
        chunksCreated: result.chunksCreated,
        embeddingsGenerated: result.embeddingsGenerated,
        embeddingsVectorized: result.embeddingsVectorized,
        notifiedUsers: result.notifiedUsers,
        durationMs: fileDuration,
        pct: Math.round(((i + 1) / opts.publicationIds.length) * 100),
      });
    } catch (e: any) {
      failed++;
      const fileDuration = Date.now() - fileStartedAt;
      const msg = e?.message || 'Error desconocido';

      await prisma.$executeRawUnsafe(
        `UPDATE public.corpus_ingestion_items
            SET status = 'failed',
                current_step = 'failed',
                duration_ms = $2,
                error_message = $3,
                step_log = $4::jsonb,
                updated_at = now()
          WHERE id = $1::uuid`,
        itemId, fileDuration, msg, JSON.stringify(stepLog),
      );

      emit('file-failed', {
        sequenceIndex: seqIdx,
        total: opts.publicationIds.length,
        itemId,
        title: pub.title,
        error: msg,
        durationMs: fileDuration,
      });
    }
  }

  const totalDuration = Date.now() - startedAt;

  // 4) Generar reporte HTML
  emit('generating-report', { runId });
  let htmlReportPath: string | null = null;
  try {
    const { generateIngestionHtmlReport } = await import('./corpus-ingestion-report.service.js');
    htmlReportPath = await generateIngestionHtmlReport(runId);
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('[bulk-runner] HTML report failed', e?.message);
  }

  // 5) UPDATE run final
  const setHierClauses = Object.entries(HIER_TO_COL)
    .map(([hier, col]) => `${col} = ${countsByHier[hier] || 0}`)
    .join(', ');
  const countOtros = Math.max(0, succeeded - Object.entries(HIER_TO_COL)
    .reduce((sum, [hier]) => sum + (countsByHier[hier] || 0), 0));

  await prisma.$executeRawUnsafe(
    `UPDATE public.corpus_ingestion_runs
        SET completed_at = now(),
            status = 'completed',
            total_succeeded = $2,
            total_failed = $3,
            total_chunks = $4,
            total_embeddings = $5,
            total_vectorized = $6,
            total_notified_users = $7,
            total_duration_ms = $8,
            ${setHierClauses},
            count_otros = $9,
            html_report_path = $10
      WHERE id = $1::uuid`,
    runId, succeeded, failed, totalChunks, totalEmbeddings, totalVectorized,
    totalNotified, totalDuration, countOtros, htmlReportPath,
  );

  const result: BulkIngestionRunResult = {
    runId,
    totalRequested: opts.publicationIds.length,
    totalSucceeded: succeeded,
    totalFailed: failed,
    totalChunks,
    totalEmbeddings,
    totalVectorized,
    totalNotifiedUsers: totalNotified,
    totalDurationMs: totalDuration,
    countsByHierarchy: countsByHier,
    htmlReportPath,
  };

  emit('run-complete', { ...result, finishedAt: new Date().toISOString() });

  return result;
}
