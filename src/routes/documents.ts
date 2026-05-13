import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { getAiClient } from '../lib/ai-client.js';
import { extractText } from '../lib/extract-text.js';
import { serviceRoleClient } from '../lib/supabase.js';
import { logActivityAsync, listCaseActivity } from '../lib/audit.js';
import { setSseHeaders } from '../lib/sse-cors.js';

const STORAGE_BUCKET = process.env.STORAGE_BUCKET_DOCUMENTS || 'legal-documents';
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const EMBED_BATCH = 50;

const uploadJsonSchema = z.object({
  title: z.string().min(1),
  caseId: z.string().uuid(),
  content: z.string().min(1),
});

function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  if (cleaned.length <= size) return [cleaned];
  const out: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + size, cleaned.length);
    out.push(cleaned.slice(start, end));
    if (end === cleaned.length) break;
    start += size - overlap;
  }
  return out;
}

async function vectorizeDocument(
  documentId: string,
  text: string,
  log: (msg: string, extra?: any) => void,
  onProgress?: (info: { processed: number; total: number }) => void,
) {
  const chunks = chunkText(text);
  if (chunks.length === 0) return 0;

  const aiClient = await getAiClient();

  // Borrar chunks viejos por idempotencia
  await prisma.documentChunk.deleteMany({ where: { documentId } });

  let inserted = 0;
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const slice = chunks.slice(i, i + EMBED_BATCH);
    let embeddings: number[][];
    try {
      const r: any = await aiClient.embeddings.create({
        model: aiClient.embeddingModel,
        input: slice,
        dimensions: 1536,
      });
      embeddings = r.data.map((d: any) => d.embedding);
    } catch (e: any) {
      log('embedding batch failed', { err: e.message, batch: i });
      throw e;
    }

    // Insert vía raw SQL para incluir embedding_v vector
    for (let j = 0; j < slice.length; j++) {
      const chunkId = randomUUID();
      const vec = `[${embeddings[j].join(',')}]`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO public.document_chunks (id, document_id, content, chunk_index, embedding_v, embedding)
         VALUES ($1, $2, $3, $4, $5::vector, $6::jsonb)`,
        chunkId,
        documentId,
        slice[j],
        i + j,
        vec,
        JSON.stringify(embeddings[j])
      );
      inserted++;
    }
    if (onProgress) onProgress({ processed: inserted, total: chunks.length });
  }
  return inserted;
}

async function uploadToStorage(
  buffer: Buffer,
  mimeType: string,
  storageKey: string
) {
  const supa = serviceRoleClient();
  const { error } = await supa.storage
    .from(STORAGE_BUCKET)
    .upload(storageKey, buffer, { contentType: mimeType, upsert: true });
  if (error) throw new Error(`Storage upload: ${error.message}`);
  return { bucket: STORAGE_BUCKET, key: storageKey };
}

export async function documentRoutes(fastify: FastifyInstance) {
  // Upload document — soporta multipart (PDF) y JSON (texto plano legacy)
  fastify.post('/documents/upload', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as any).id;

    try {
      const isMultipart = request.isMultipart?.();
      let title = '';
      let caseId = '';
      let content = '';
      let fileBuffer: Buffer | null = null;
      let mimeType = 'text/plain';
      let originalFilename = '';

      if (isMultipart) {
        // Iterar partes consumiendo el file con .toBuffer() inline.
        // Importante: NO drop fields entre file streams.
        const parts = (request as any).parts();
        for await (const part of parts) {
          if (part.file) {
            // file part
            const buf = await part.toBuffer();
            fileBuffer = buf;
            originalFilename = part.filename || 'documento.pdf';
            mimeType = part.mimetype || 'application/octet-stream';
            if (!title) title = originalFilename.replace(/\.[^.]+$/, '');
          } else {
            // field part
            const fname = part.fieldname;
            const val = (part as any).value;
            if (typeof val === 'string') {
              if (fname === 'title') title = val;
              else if (fname === 'caseId') caseId = val;
              else if (fname === 'content') content = val;
            }
          }
        }

        if (!caseId) {
          fastify.log.warn({ haveFile: !!fileBuffer, title, originalFilename }, 'multipart sin caseId');
          return reply.code(400).send({ error: 'caseId requerido' });
        }
        if (!fileBuffer && !content) return reply.code(400).send({ error: 'file o content requerido' });

        // Si llegó un archivo binario, usar el extractor universal
        // (PDF, Word, Excel, imágenes, texto, etc.)
        if (fileBuffer && !content) {
          try {
            const extracted = await extractText(fileBuffer, mimeType, originalFilename);
            content = extracted.text;
            fastify.log.info(
              { method: extracted.method, chars: content.length, file: originalFilename, mime: mimeType },
              'extracción de archivo'
            );
            if (content.length < 50) {
              fastify.log.warn(
                `Archivo con poco texto extraído (${content.length} chars) método=${extracted.method}.`
              );
              // Mantener fallback: si no se pudo extraer, guardar stub mínimo
              if (!content) {
                content = `[Archivo: ${originalFilename}, ${mimeType}, ${fileBuffer.length} bytes]`;
              }
            }
          } catch (e: any) {
            fastify.log.error({ err: e.message }, 'extracción falló');
            // No bloqueamos el upload — guardamos el archivo igual
            content = `[Archivo: ${originalFilename}, ${mimeType}, ${fileBuffer.length} bytes]`;
          }
        }
      } else {
        // JSON legacy
        const body = uploadJsonSchema.parse(request.body);
        title = body.title;
        caseId = body.caseId;
        content = body.content;
      }

      if (!title) return reply.code(400).send({ error: 'title requerido' });
      if (!caseId) return reply.code(400).send({ error: 'caseId requerido' });

      // Verify case belongs to user
      const caseDoc = await prisma.case.findFirst({
        where: { id: caseId, userId },
      });
      if (!caseDoc) return reply.code(404).send({ error: 'Case not found' });

      // Crear document base
      const documentId = randomUUID();
      let storageBucket: string | null = null;
      let storageKey: string | null = null;
      let fileSize: number | null = null;

      // Si tenemos PDF binario, subirlo a Supabase Storage
      if (fileBuffer) {
        const ext = (originalFilename.match(/\.[^.]+$/) || ['.pdf'])[0];
        storageKey = `${userId}/${caseId}/${documentId}${ext}`;
        try {
          const up = await uploadToStorage(fileBuffer, mimeType, storageKey);
          storageBucket = up.bucket;
          fileSize = fileBuffer.length;
        } catch (e: any) {
          fastify.log.error(e);
          return reply.code(500).send({ error: 'Storage upload failed: ' + e.message });
        }
      } else {
        fileSize = Buffer.byteLength(content, 'utf8');
      }

      // INSERT con campos extendidos.
      // country_code lo pobla automáticamente trg_documents_set_country_code
      // (heredando del case relacionado o del user).
      await prisma.$executeRawUnsafe(
        `INSERT INTO public.documents
           (id, case_id, user_id, title, content,
            storage_bucket, storage_key, mime_type, file_size_bytes, original_filename, metadata,
            created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, now(), now())`,
        documentId,
        caseId,
        userId,
        title,
        content || '',
        storageBucket,
        storageKey,
        mimeType,
        fileSize,
        originalFilename || null,
        JSON.stringify({
          uploadedAt: new Date().toISOString(),
          hasBinary: !!fileBuffer,
          isPdf: !!fileBuffer && /pdf/i.test(mimeType),
          isImage: !!fileBuffer && /^image\//i.test(mimeType),
          isOffice: !!fileBuffer && /(officedocument|ms-excel|msword|spreadsheet|wordprocessing)/i.test(mimeType),
        })
      );

      // Vectorizar (idempotente)
      let chunksCount = 0;
      if (content && content.length > 50) {
        try {
          chunksCount = await vectorizeDocument(documentId, content, fastify.log.info.bind(fastify.log));
        } catch (e: any) {
          fastify.log.error({ err: e.message }, 'vectorization failed');
          // No bloqueamos el upload por fallo de embeddings
        }
      }

      const isImageFile = !!fileBuffer && /^image\//i.test(mimeType);
      const isPdfFile = !!fileBuffer && /pdf/i.test(mimeType);
      return reply.send({
        document: {
          id: documentId,
          title,
          mimeType,
          size: fileSize,
          hasBinary: !!fileBuffer,
          hasPdf: isPdfFile,
          isImage: isImageFile,
          createdAt: new Date(),
          chunksCount,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Internal server error' });
    }
  });

  // Get documents for a case
  fastify.get('/documents/case/:caseId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { caseId } = request.params as { caseId: string };
      const userId = (request.user as any).id;

      // Verify case belongs to user
      const caseDoc = await prisma.case.findFirst({
        where: {
          id: caseId,
          userId,
        },
      });

      if (!caseDoc) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      // Get documents — incluye length(content) y metadata del archivo binario
      const docsRaw = await prisma.$queryRawUnsafe<any[]>(
        `SELECT
           id, title, original_filename,
           mime_type, file_size_bytes, storage_key,
           created_at AS "createdAt",
           updated_at AS "updatedAt",
           OCTET_LENGTH(content) AS text_bytes
         FROM public.documents
         WHERE case_id = $1 AND user_id = $2
         ORDER BY created_at DESC`,
        caseId,
        userId
      );

      const documents = docsRaw.map((d) => {
        const mime = d.mime_type || 'text/plain';
        const hasBinary = !!d.storage_key;
        return {
          id: d.id,
          title: d.title,
          filename: d.original_filename || d.title,
          mimeType: mime,
          size: Number(d.file_size_bytes || d.text_bytes || 0),
          hasBinary,
          hasPdf: hasBinary && /pdf/i.test(mime),
          isImage: hasBinary && /^image\//i.test(mime),
          isOffice: hasBinary && /(officedocument|ms-excel|msword|spreadsheet|wordprocessing)/i.test(mime),
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
      });

      return reply.send({ documents });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get document by ID
  fastify.get('/documents/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const document = await prisma.document.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          case: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (!document) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      return reply.send({ document });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Serve original file (PDF or any binary in Storage)
  // ?download=1 fuerza Content-Disposition: attachment; sin → inline (viewer iframe)
  fastify.get('/documents/:id/file', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { download } = (request.query as { download?: string }) || {};
      const userId = (request.user as any).id;

      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, title, content, storage_bucket, storage_key, mime_type, original_filename
         FROM public.documents WHERE id = $1 AND user_id = $2`,
        id,
        userId
      );
      const doc = rows[0];
      if (!doc) return reply.code(404).send({ error: 'Document not found' });

      if (!doc.storage_bucket || !doc.storage_key) {
        // No hay binario; devolver el contenido como text/plain
        const safeName = (doc.original_filename || doc.title || 'documento').replace(/[^a-zA-Z0-9_\-. ]/g, '');
        reply.header('Content-Type', 'text/plain; charset=utf-8');
        reply.header(
          'Content-Disposition',
          `${download === '1' ? 'attachment' : 'inline'}; filename="${safeName}.txt"`
        );
        return reply.send(doc.content || '');
      }

      // Descargar de Supabase Storage
      const supa = serviceRoleClient();
      const { data, error } = await supa.storage
        .from(doc.storage_bucket)
        .download(doc.storage_key);
      if (error || !data) {
        fastify.log.error({ error }, 'storage download failed');
        return reply.code(500).send({ error: error?.message || 'Storage error' });
      }
      const arrBuf = await data.arrayBuffer();
      const buf = Buffer.from(arrBuf);
      const mimeType = doc.mime_type || 'application/octet-stream';
      const filename = (doc.original_filename || doc.title || 'documento').replace(/[^a-zA-Z0-9_\-. áéíóúÁÉÍÓÚñÑ]/g, '');

      reply.header('Content-Type', mimeType);
      reply.header(
        'Content-Disposition',
        `${download === '1' ? 'attachment' : 'inline'}; filename="${filename}"`
      );
      reply.header('Cache-Control', 'private, max-age=300');
      return reply.send(buf);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Internal server error' });
    }
  });

  // Download document content as plain text (legacy)
  fastify.get('/documents/:id/download', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const doc = await prisma.document.findFirst({
        where: { id, userId },
        select: { id: true, title: true, content: true, createdAt: true },
      });
      if (!doc) return reply.code(404).send({ error: 'Document not found' });

      const safeName = (doc.title || 'documento')
        .replace(/[^a-zA-Z0-9_\-. áéíóúÁÉÍÓÚñÑ]/g, '')
        .slice(0, 120);

      reply.header('Content-Type', 'text/plain; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${safeName}.txt"`);
      reply.header('Cache-Control', 'no-cache');
      return reply.send(doc.content || '');
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // DELETE /documents/:id  —  borrado completo y reversible (audit)
  //
  // Limpia en este orden:
  //   1. chunks vectorizados (document_chunks)
  //   2. binario en Supabase Storage (si existe)
  //   3. fila documents
  //   4. (best-effort) regenera el cerebro del caso para reflejar la baja
  //   5. registra en audit_logs
  //
  // Devuelve los stats de la operación para que la UI pueda mostrar feedback.
  // ─────────────────────────────────────────────────────────────
  fastify.delete<{ Params: { id: string }; Querystring: { refreshBrain?: string } }>(
    '/documents/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const startedAt = Date.now();
      const { id } = request.params;
      const userId = (request.user as any).id;
      const refreshBrain = request.query.refreshBrain !== 'false';

      try {
        // Cargar con campos extra (storage_key/bucket no están en Prisma schema
        // pero sí en la BD — usamos raw SQL).
        const rows = await prisma.$queryRawUnsafe<Array<{
          id: string; case_id: string | null; title: string;
          storage_bucket: string | null; storage_key: string | null;
          original_filename: string | null;
        }>>(
          `SELECT id, case_id, title, storage_bucket, storage_key, original_filename
             FROM public.documents
            WHERE id = $1 AND user_id = $2 LIMIT 1`,
          id, userId,
        );
        if (rows.length === 0) {
          return reply.code(404).send({ error: 'Document not found' });
        }
        const doc = rows[0];

        // 1) Borrar chunks
        const chunksDel = await prisma.documentChunk.deleteMany({ where: { documentId: id } });

        // 2) Borrar binario en Storage (best-effort)
        let storageDeleted = false;
        if (doc.storage_bucket && doc.storage_key) {
          try {
            const sb = serviceRoleClient();
            const r = await sb.storage.from(doc.storage_bucket).remove([doc.storage_key]);
            storageDeleted = !r.error;
            if (r.error) {
              fastify.log.warn({ err: r.error.message, key: doc.storage_key }, 'storage delete failed');
            }
          } catch (e: any) {
            fastify.log.warn({ err: e?.message }, 'storage delete exception');
          }
        }

        // 3) Borrar fila documents
        await prisma.document.delete({ where: { id } });

        // 4) Refrescar cerebro del caso (no bloqueante — best-effort)
        let brainRefreshed = false;
        if (refreshBrain && doc.case_id) {
          try {
            await synthesizeCaseBrain(doc.case_id);
            brainRefreshed = true;
          } catch (e: any) {
            fastify.log.warn({ err: e?.message }, 'brain refresh tras delete falló');
          }
        }

        // 5) Audit log
        logActivityAsync(userId, 'DOCUMENT_DELETED', 'document', id, {
          caseId: doc.case_id || undefined,
          title: doc.title,
          filename: doc.original_filename || undefined,
          chunksDeleted: chunksDel.count,
          storageDeleted,
          brainRefreshed,
          durationMs: Date.now() - startedAt,
          ip: (request.headers['x-forwarded-for'] as string) || request.ip,
          userAgent: request.headers['user-agent'] || null,
        });

        return reply.send({
          ok: true,
          documentId: id,
          chunksDeleted: chunksDel.count,
          storageDeleted,
          brainRefreshed,
        });
      } catch (error: any) {
        fastify.log.error({ err: error?.message }, 'document delete failed');
        logActivityAsync(userId, 'DOCUMENT_DELETED', 'document', id, {
          ip: (request.headers['x-forwarded-for'] as string) || request.ip,
        }, false, error?.message);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    },
  );

  // =========================================================================
  // POST /documents/upload-stream  —  Upload + vectorize + synthesize brain
  //                                   con eventos SSE de progreso real
  // =========================================================================
  //
  // Pipeline en 6 etapas, cada una con porcentaje y mensaje:
  //   0%  upload    "subiendo archivo"
  //   15% extract   "leyendo el contenido"
  //   30% store     "guardando en el expediente"
  //   45% chunk     "dividiendo en pasajes"
  //   45→85% embed  "generando representación vectorial" (granular por batch)
  //   85% synthesize "sintetizando cerebro del caso con IA"
  //   100% done
  //
  // El "cerebro" del caso es una síntesis ejecutiva del expediente entero
  // (partes, fechas críticas, hechos clave, montos, normas aplicables,
  // vacíos detectados, siguientes acciones) generada con Opus 4.7 y
  // persistida en cases.metadata->>'brain'. Se regenera tras cada upload.
  fastify.post('/documents/upload-stream', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as any).id;

    // Headers SSE + CORS (manuales porque @fastify/cors no intercepta SSE)
    setSseHeaders(request, reply);

    const send = (event: string, data: any) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    const stage = (key: string, percent: number, message: string, extra: any = {}) =>
      send('stage', { stage: key, percent, message, ...extra });

    try {
      if (!request.isMultipart?.()) {
        send('error', { message: 'multipart requerido' });
        reply.raw.end();
        return reply;
      }

      stage('upload', 0, 'Recibiendo archivo…');

      const parts = (request as any).parts();
      let title = '';
      let caseId = '';
      let fileBuffer: Buffer | null = null;
      let mimeType = 'application/octet-stream';
      let originalFilename = '';

      for await (const part of parts) {
        if (part.file) {
          fileBuffer = await part.toBuffer();
          originalFilename = part.filename || 'documento';
          mimeType = part.mimetype || mimeType;
          if (!title) title = originalFilename.replace(/\.[^.]+$/, '');
        } else {
          const fname = part.fieldname;
          const val = (part as any).value;
          if (typeof val === 'string') {
            if (fname === 'title') title = val;
            else if (fname === 'caseId') caseId = val;
          }
        }
      }

      if (!caseId) { send('error', { message: 'caseId requerido' }); reply.raw.end(); return reply; }
      if (!fileBuffer) { send('error', { message: 'archivo requerido' }); reply.raw.end(); return reply; }
      if (!title) title = originalFilename || 'Documento';

      const caseDoc = await prisma.case.findFirst({ where: { id: caseId, userId } });
      if (!caseDoc) { send('error', { message: 'Caso no encontrado' }); reply.raw.end(); return reply; }

      stage('upload', 10, 'Archivo recibido', { filename: originalFilename, size: fileBuffer.length });

      // Etapa: extract
      stage('extract', 15, 'Leyendo el contenido del documento con IA…');
      let content = '';
      let extractMethod = '';
      try {
        const extracted = await extractText(fileBuffer, mimeType, originalFilename);
        content = (extracted.text || '').trim();
        extractMethod = extracted.method;
      } catch (e: any) {
        fastify.log.warn({ err: e.message }, 'extracción falló en upload-stream');
        content = '';
      }
      if (!content || content.length < 50) {
        // No bloqueamos: subimos el binario pero indicamos que IA no pudo leerlo
        content = `[Archivo: ${originalFilename}, ${mimeType}, ${fileBuffer.length} bytes]`;
        stage('extract', 25, 'Texto limitado — se guardará el archivo igualmente', { extractMethod });
      } else {
        stage('extract', 25, `Texto extraído (${content.length.toLocaleString('es')} caracteres)`, { extractMethod });
      }

      // Etapa: store binary + DB row
      stage('store', 30, 'Guardando en el expediente del caso…');
      const documentId = randomUUID();
      const ext = (originalFilename.match(/\.[^.]+$/) || [''])[0];
      const storageKey = `${userId}/${caseId}/${documentId}${ext}`;
      let storageBucket: string | null = null;
      try {
        const up = await uploadToStorage(fileBuffer, mimeType, storageKey);
        storageBucket = up.bucket;
      } catch (e: any) {
        send('error', { message: `Storage upload falló: ${e.message}` });
        reply.raw.end();
        return reply;
      }

      await prisma.$executeRawUnsafe(
        `INSERT INTO public.documents
           (id, case_id, user_id, title, content,
            storage_bucket, storage_key, mime_type, file_size_bytes, original_filename, metadata,
            created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, now(), now())`,
        documentId, caseId, userId, title, content,
        storageBucket, storageKey, mimeType, fileBuffer.length, originalFilename,
        JSON.stringify({
          uploadedAt: new Date().toISOString(),
          hasBinary: true,
          isPdf: /pdf/i.test(mimeType),
          isImage: /^image\//i.test(mimeType),
          isOffice: /(officedocument|ms-excel|msword|spreadsheet|wordprocessing)/i.test(mimeType),
          extractMethod,
        }),
      );
      stage('store', 40, 'Archivo guardado');

      // Etapa: chunk + embed
      stage('chunk', 45, 'Dividiendo en pasajes para indexar…');
      let chunksCount = 0;
      try {
        chunksCount = await vectorizeDocument(
          documentId,
          content,
          (msg, extra) => fastify.log.info(extra ?? {}, msg),
          ({ processed, total }) => {
            // Mapear progreso de embedding al rango 45→85
            const pct = 45 + Math.min(40, Math.round((processed / Math.max(total, 1)) * 40));
            stage('embed', pct, `Vectorizando pasajes (${processed} / ${total})…`, { processed, total });
          },
        );
      } catch (e: any) {
        fastify.log.error({ err: e.message }, 'vectorización falló');
        stage('embed', 85, 'Vectorización con problemas — el documento queda guardado', { warning: e.message });
      }

      // Etapa: synthesize brain
      stage('synthesize', 86, 'Sintetizando el cerebro del caso con IA…');
      let brain: CaseBrain | null = null;
      try {
        brain = await synthesizeCaseBrain(caseId);
      } catch (e: any) {
        fastify.log.error({ err: e.message }, 'brain synthesis falló');
      }

      stage('done', 100, brain
        ? '✨ Documento integrado al cerebro del caso'
        : 'Documento guardado e indexado');

      send('result', {
        document: {
          id: documentId,
          title,
          mimeType,
          size: fileBuffer.length,
          chunksCount,
          extractMethod,
          createdAt: new Date().toISOString(),
        },
        brain: brain ? brainSummary(brain) : null,
      });

      logActivityAsync(userId, 'DOCUMENT_UPLOADED', 'document', documentId, {
        caseId,
        title,
        filename: originalFilename,
        chunks: chunksCount,
        riskLevel: brain?.riskLevel,
        ip: (request.headers['x-forwarded-for'] as string) || request.ip,
        userAgent: request.headers['user-agent'] || null,
      });
    } catch (e: any) {
      fastify.log.error({ err: e.message }, 'upload-stream falló');
      send('error', { message: e.message || 'Error inesperado' });
    } finally {
      reply.raw.end();
    }
    return reply;
  });

  // =========================================================================
  // GET /cases/:id/activity  —  log de auditoría del caso
  // =========================================================================
  fastify.get<{ Params: { id: string }; Querystring: { limit?: string; offset?: string } }>(
    '/cases/:id/activity',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const own = await prisma.case.findFirst({ where: { id: request.params.id, userId }, select: { id: true } });
      if (!own) return reply.code(404).send({ error: 'Case not found' });

      const limit = Math.max(1, Math.min(parseInt(request.query.limit || '100', 10), 500));
      const offset = Math.max(0, parseInt(request.query.offset || '0', 10));
      const events = await listCaseActivity(request.params.id, limit, offset);
      return reply.send({ caseId: request.params.id, events, count: events.length, limit, offset });
    },
  );

  // =========================================================================
  // GET /cases/:id/brain  —  Lee el cerebro persistido del caso
  // =========================================================================
  fastify.get<{ Params: { id: string } }>('/cases/:id/brain', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as any).id;
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; metadata: any; updated_at: Date }>>(
      `SELECT id, metadata, updated_at FROM public.cases WHERE id = $1 AND user_id = $2 LIMIT 1`,
      request.params.id, userId,
    );
    if (rows.length === 0) return reply.code(404).send({ error: 'Case not found' });
    const meta = rows[0].metadata || {};
    const brain = meta.brain ?? null;
    return reply.send({
      caseId: rows[0].id,
      brain,
      generatedAt: meta.brainGeneratedAt ?? null,
      hasContent: !!brain,
    });
  });

  // =========================================================================
  // POST /cases/:id/brain/refresh  —  Regenera el cerebro manualmente
  // =========================================================================
  fastify.post<{ Params: { id: string } }>('/cases/:id/brain/refresh', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as any).id;
    const c = await prisma.case.findFirst({
      where: { id: request.params.id, userId },
      select: { id: true },
    });
    if (!c) return reply.code(404).send({ error: 'Case not found' });

    try {
      const brain = await synthesizeCaseBrain(request.params.id);
      logActivityAsync(userId, 'BRAIN_REFRESHED', 'case', request.params.id, {
        caseId: request.params.id,
        riskLevel: brain.riskLevel,
        documentCount: brain.documentCount,
      });
      return reply.send({ ok: true, brain: brainSummary(brain), full: brain });
    } catch (e: any) {
      fastify.log.error({ err: e.message }, 'brain refresh failed');
      return reply.code(500).send({ error: e.message || 'Brain synthesis failed' });
    }
  });
}

// ============================================================================
// CEREBRO DEL CASO — síntesis ejecutiva multi-documento con IA
// ============================================================================
//
// El "cerebro" es un JSON estructurado que destila el expediente entero del
// caso en un objeto navegable. Se regenera tras cada upload (o a demanda).
// La idea: convertir N documentos legales largos en una vista de alto nivel
// que el abogado pueda leer en 30 segundos y que la IA pueda usar como
// contexto rápido en chats, generación de documentos, etc.
//
// Persistencia: cases.metadata.brain (jsonb).

export interface CaseBrain {
  summary: string;                  // 2-4 párrafos ejecutivos
  parties: Array<{ name: string; role: string; identification?: string | null }>;
  keyFacts: string[];               // 5-12 bullets cronológicos
  keyDates: Array<{ label: string; date: string; description?: string }>;
  amounts: Array<{ concept: string; amount: number | string; currency?: string }>;
  applicableLaws: Array<{ norm: string; reasoning?: string }>;
  proceduralStage: string | null;
  gaps: string[];                   // qué falta para tener el caso "completo"
  nextActions: Array<{ action: string; deadline?: string; priority: 'low' | 'medium' | 'high' }>;
  riskLevel: 'low' | 'medium' | 'high';
  riskReasoning: string;
  documentCount: number;
  generatedAt: string;
  model: string;
}

/** Versión recortada para devolver al cliente sin cargar toda la lista de docs */
function brainSummary(b: CaseBrain) {
  return {
    summary: b.summary,
    riskLevel: b.riskLevel,
    nextActions: b.nextActions.slice(0, 5),
    keyFactsCount: b.keyFacts.length,
    keyDatesCount: b.keyDates.length,
    partiesCount: b.parties.length,
    applicableLawsCount: b.applicableLaws.length,
    gapsCount: b.gaps.length,
    documentCount: b.documentCount,
    generatedAt: b.generatedAt,
    model: b.model,
  };
}

async function synthesizeCaseBrain(caseId: string): Promise<CaseBrain> {
  // Cargar caso + documentos (raw SQL para incluir priority/metadata que no
  // están en el schema Prisma pero sí en la BD).
  const caseRows = await prisma.$queryRawUnsafe<Array<{
    id: string; title: string; description: string | null; client_name: string | null;
    case_number: string | null; status: string | null;
  }>>(
    `SELECT id, title, description, client_name, case_number, status
       FROM public.cases WHERE id = $1 LIMIT 1`,
    caseId,
  );
  if (caseRows.length === 0) throw new Error('case not found');
  const c = {
    id: caseRows[0].id,
    title: caseRows[0].title,
    description: caseRows[0].description,
    clientName: caseRows[0].client_name,
    caseNumber: caseRows[0].case_number,
    status: caseRows[0].status,
    priority: null as string | null,
  };

  const docs = await prisma.$queryRawUnsafe<Array<{ title: string; content: string; created_at: Date }>>(
    `SELECT title, COALESCE(content, '') AS content, created_at
       FROM public.documents
      WHERE case_id = $1
      ORDER BY created_at DESC
      LIMIT 20`,
    caseId,
  );

  const docContext = docs.length === 0
    ? '(sin documentos en el expediente)'
    : docs.map((d, i) => {
        const excerpt = (d.content || '').replace(/\s+/g, ' ').trim().slice(0, 3500);
        return `[Documento ${i + 1}] ${d.title}\n${excerpt || '(sin texto extraíble)'}`;
      }).join('\n\n');

  const systemPrompt = `Eres un(a) abogado(a) senior. Te entrego un caso real con sus documentos cargados. Tu trabajo es producir el "cerebro" del caso: una síntesis ejecutiva en JSON que permita al abogado tener una vista de alto nivel del expediente en 30 segundos.

REGLAS:
- Devuelve EXCLUSIVAMENTE un JSON válido (sin markdown, sin code-fences). Primer carácter "{", último "}".
- NO inventes nombres, montos, fechas, normas ni números de juicio. Si un dato no aparece en los documentos, omítelo del array correspondiente o usa null.
- "parties": lista de personas/empresas con su rol (Demandante, Demandado, Co-demandado, Fiscal, Juez, Tercero, Cliente, etc.).
- "keyFacts": 5-12 hechos relevantes, en orden CRONOLÓGICO, redactados como bullets concisos (1-2 oraciones cada uno).
- "keyDates": fechas críticas con label corto (ej. "Audiencia preparatoria", "Notificación demanda"), formato ISO YYYY-MM-DD cuando posible.
- "amounts": montos relevantes (pretensión, indemnización, multa). amount como número si lo identificas, currency ISO (USD, EUR…).
- "applicableLaws": normas o artículos invocados o aplicables, con "reasoning" de 1 oración explicando POR QUÉ aplica.
- "gaps": qué información o documentos faltan para que el caso esté completo (ej. "falta contrato de servicios", "no se identifica al tribunal", "no hay fecha de la audiencia").
- "nextActions": 2-5 acciones concretas que el abogado debería ejecutar. Cada una con priority y, si aplica, deadline (YYYY-MM-DD).
- "riskLevel": "high" si hay plazos vencidos/próximos a vencer, libertad personal, posibilidad real de pérdida sustancial; "medium" estándar; "low" si es trámite ordinario sin presión.
- "summary": 2-4 párrafos en español jurídico profesional (200-400 palabras) que un socio senior podría leer en una junta.

ESQUEMA:
{
  "summary": "string",
  "parties": [{"name":"string","role":"string","identification":"string|null"}],
  "keyFacts": ["string"],
  "keyDates": [{"label":"string","date":"YYYY-MM-DD","description":"string"}],
  "amounts": [{"concept":"string","amount": number, "currency":"USD"}],
  "applicableLaws": [{"norm":"string","reasoning":"string"}],
  "proceduralStage": "string|null",
  "gaps": ["string"],
  "nextActions": [{"action":"string","deadline":"YYYY-MM-DD|null","priority":"low|medium|high"}],
  "riskLevel": "low|medium|high",
  "riskReasoning": "string"
}`;

  const userPrompt = [
    '=== CASO ===',
    `Título: ${c.title}`,
    c.caseNumber ? `Número: ${c.caseNumber}` : '',
    c.clientName ? `Cliente: ${c.clientName}` : '',
    c.status ? `Status interno: ${c.status}` : '',
    c.priority ? `Prioridad interna: ${c.priority}` : '',
    c.description ? `\nDescripción capturada por el abogado:\n${c.description}` : '',
    '',
    `=== DOCUMENTOS DEL EXPEDIENTE (${docs.length}) ===`,
    docContext,
    '',
    'Genera el cerebro del caso (JSON) ahora.',
  ].filter(Boolean).join('\n');

  const aiClient = await getAiClient();
  const completion = await aiClient.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 4500,
  });
  const raw = (completion.choices?.[0]?.message?.content || '').trim();

  // Parse robusto (mismo helper que preview)
  const fenced = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  let parsed: any;
  try { parsed = JSON.parse(fenced); } catch {
    // intentar primer objeto balanceado
    const start = fenced.indexOf('{');
    if (start >= 0) {
      let depth = 0, inString = false, escape = false;
      for (let i = start; i < fenced.length; i++) {
        const ch = fenced[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { try { parsed = JSON.parse(fenced.slice(start, i + 1)); } catch {} break; } }
      }
    }
  }
  if (!parsed) throw new Error('Brain: AI no devolvió JSON válido');

  const brain: CaseBrain = {
    summary: String(parsed.summary || '').slice(0, 4000),
    parties: Array.isArray(parsed.parties) ? parsed.parties.slice(0, 20).map((p: any) => ({
      name: String(p?.name || '').slice(0, 200),
      role: String(p?.role || '').slice(0, 100),
      identification: p?.identification ? String(p.identification).slice(0, 80) : null,
    })) : [],
    keyFacts: Array.isArray(parsed.keyFacts)
      ? parsed.keyFacts.slice(0, 20).map((s: any) => String(s).slice(0, 600)).filter(Boolean)
      : [],
    keyDates: Array.isArray(parsed.keyDates) ? parsed.keyDates.slice(0, 30).map((d: any) => ({
      label: String(d?.label || '').slice(0, 120),
      date: String(d?.date || '').slice(0, 40),
      description: d?.description ? String(d.description).slice(0, 400) : undefined,
    })) : [],
    amounts: Array.isArray(parsed.amounts) ? parsed.amounts.slice(0, 20).map((a: any) => ({
      concept: String(a?.concept || '').slice(0, 200),
      amount: typeof a?.amount === 'number' ? a.amount : String(a?.amount || ''),
      currency: a?.currency ? String(a.currency).slice(0, 10) : undefined,
    })) : [],
    applicableLaws: Array.isArray(parsed.applicableLaws) ? parsed.applicableLaws.slice(0, 30).map((l: any) => ({
      norm: String(l?.norm || '').slice(0, 200),
      reasoning: l?.reasoning ? String(l.reasoning).slice(0, 400) : undefined,
    })) : [],
    proceduralStage: parsed.proceduralStage ? String(parsed.proceduralStage).slice(0, 120) : null,
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 15).map((s: any) => String(s).slice(0, 300)).filter(Boolean) : [],
    nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions.slice(0, 10).map((a: any) => ({
      action: String(a?.action || '').slice(0, 400),
      deadline: a?.deadline ? String(a.deadline).slice(0, 40) : undefined,
      priority: (['low', 'medium', 'high'] as const).includes(a?.priority) ? a.priority : 'medium',
    })) : [],
    riskLevel: (['low', 'medium', 'high'] as const).includes(parsed.riskLevel) ? parsed.riskLevel : 'medium',
    riskReasoning: String(parsed.riskReasoning || '').slice(0, 800),
    documentCount: docs.length,
    generatedAt: new Date().toISOString(),
    model: aiClient.model,
  };

  // Persistir en cases.metadata.brain (jsonb merge)
  await prisma.$executeRawUnsafe(
    `UPDATE public.cases
        SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('brain', $2::jsonb, 'brainGeneratedAt', $3::text),
            updated_at = now()
      WHERE id = $1`,
    caseId,
    JSON.stringify(brain),
    brain.generatedAt,
  );

  return brain;
}
