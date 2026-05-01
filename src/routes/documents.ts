import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { getAiClient } from '../lib/ai-client.js';
import { extractText } from '../lib/extract-text.js';
import { serviceRoleClient } from '../lib/supabase.js';

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
  log: (msg: string, extra?: any) => void
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

  // Delete document
  fastify.delete('/documents/:id', {
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
      });

      if (!document) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      // Delete chunks first
      await prisma.documentChunk.deleteMany({
        where: {
          documentId: id,
        },
      });

      // Delete document
      await prisma.document.delete({
        where: {
          id,
        },
      });

      return reply.send({ message: 'Document deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
