/**
 * Extractor universal de texto desde cualquier archivo.
 *
 * Detecta el mimetype y aplica el extractor correcto:
 *   - PDF nativo → pdf-parse
 *   - PDF escaneado / con poco texto → Vision IA (modelo configurado en
 *     /admin/ai-settings: por default Claude Opus 4.7 — soporta PDFs nativos —;
 *     si el provider es OpenAI, GPT-4o multimodal vía Files API)
 *   - DOCX → mammoth (preserva headings y tablas como markdown-ish)
 *   - DOC legacy (binary) → texto crudo (lossy) o degradación a Vision
 *   - XLSX / XLS → xlsx → CSV concatenado por sheet
 *   - CSV / TSV → texto literal
 *   - Imágenes (PNG/JPG/WEBP/GIF) → Vision IA OCR
 *   - TXT / MD / JSON / etc → texto plano
 *   - Otros binarios → metadata stub
 */
import OpenAI from 'openai';
import { createRequire } from 'module';
import * as XLSX from 'xlsx';
import { getAiInfo } from './ai-client.js';

const _require = createRequire(import.meta.url);
const pdfParse: (data: Buffer) => Promise<{ text: string; numpages: number }> =
  _require('pdf-parse/lib/pdf-parse.js');

interface ExtractResult {
  text: string;
  method: string;
  metadata?: Record<string, unknown>;
}

function isImage(mime: string): boolean {
  return /^image\/(png|jpe?g|webp|gif|bmp)/i.test(mime);
}

function isPdf(mime: string, filename: string): boolean {
  return /pdf/i.test(mime) || /\.pdf$/i.test(filename);
}

function isDocx(mime: string, filename: string): boolean {
  return /vnd\.openxmlformats-officedocument\.wordprocessingml\.document/i.test(mime) || /\.docx$/i.test(filename);
}

function isDocLegacy(mime: string, filename: string): boolean {
  return /msword/i.test(mime) || /\.doc$/i.test(filename);
}

function isXlsx(mime: string, filename: string): boolean {
  return (
    /spreadsheetml|excel|xlsx?/i.test(mime) ||
    /\.(xlsx|xlsm|xls)$/i.test(filename)
  );
}

function isCsv(mime: string, filename: string): boolean {
  return /csv|tsv|text\/plain/i.test(mime) && /\.(csv|tsv)$/i.test(filename) ||
    /\.(csv|tsv)$/i.test(filename);
}

function isTextLike(mime: string, filename: string): boolean {
  return (
    /^text\//i.test(mime) ||
    /json|xml|yaml|markdown|html/i.test(mime) ||
    /\.(txt|md|json|xml|yaml|yml|html|htm|log)$/i.test(filename)
  );
}

async function extractPdf(buffer: Buffer, filename: string): Promise<ExtractResult> {
  try {
    const parsed = await pdfParse(buffer);
    const text = (parsed.text || '').trim();
    if (text.length < 200) {
      // PDF escaneado o vacío → fallback a Vision
      const vision = await extractWithVision(buffer, 'application/pdf', filename);
      if (vision.text.length > text.length) {
        return {
          text: vision.text,
          method: 'pdf+vision',
          metadata: { pages: parsed.numpages, pdfTextChars: text.length, ...vision.metadata },
        };
      }
    }
    return {
      text,
      method: 'pdf-parse',
      metadata: { pages: parsed.numpages, chars: text.length },
    };
  } catch (e: any) {
    // PDF corrupto o cifrado → vision como último recurso
    const vision = await extractWithVision(buffer, 'application/pdf', filename);
    return { text: vision.text, method: 'pdf-fallback-vision', metadata: { error: e.message } };
  }
}

async function extractDocx(buffer: Buffer): Promise<ExtractResult> {
  // Importación dinámica para evitar carga al boot del server
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: (result.value || '').trim(),
    method: 'mammoth',
    metadata: { messages: result.messages?.length || 0 },
  };
}

async function extractXlsx(buffer: Buffer, filename: string): Promise<ExtractResult> {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheets: string[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(ws);
    if (csv.trim()) {
      sheets.push(`### Hoja: ${name}\n${csv}`);
    }
  }
  return {
    text: sheets.join('\n\n'),
    method: 'xlsx',
    metadata: { sheets: wb.SheetNames.length },
  };
}

function extractPlainText(buffer: Buffer): ExtractResult {
  const text = buffer.toString('utf8').trim();
  return { text, method: 'utf8', metadata: { chars: text.length } };
}

/**
 * Vision IA — extrae texto de imágenes y PDFs escaneados.
 * Respeta el provider configurado en /admin/ai-settings:
 *   - Anthropic → usa el visionModel resuelto (default Opus 4.7) con soporte nativo de PDFs.
 *   - OpenAI    → usa el visionModel resuelto (default gpt-4o) con Files API para PDFs.
 *
 * Si por cualquier razón el cliente no tiene credenciales para el provider
 * activo, intenta el otro provider como fallback (de menor a mayor preferencia).
 */
async function extractWithVision(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ExtractResult> {
  let info: { provider: 'openai' | 'anthropic'; visionModel: string } | null = null;
  try {
    info = await getAiInfo();
  } catch {
    info = null;
  }

  const anthKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Orden de preferencia: provider configurado por admin, luego el otro como fallback.
  const tryAnthropicFirst = info?.provider === 'anthropic';
  if (tryAnthropicFirst && anthKey) {
    return extractWithAnthropicVision(
      buffer,
      mimeType,
      filename,
      anthKey,
      info?.visionModel || 'claude-opus-4-7'
    );
  }
  if (openaiKey) {
    return extractWithOpenAiVision(
      buffer,
      mimeType,
      filename,
      openaiKey,
      info?.provider === 'openai' ? info.visionModel : 'gpt-4o'
    );
  }
  if (anthKey) {
    return extractWithAnthropicVision(
      buffer,
      mimeType,
      filename,
      anthKey,
      info?.visionModel || 'claude-opus-4-7'
    );
  }
  return { text: '', method: 'vision-no-key' };
}

async function extractWithOpenAiVision(
  buffer: Buffer,
  mimeType: string,
  filename: string,
  apiKey: string,
  model: string
): Promise<ExtractResult> {
  const oa = new OpenAI({ apiKey });
  // GPT-4o vision soporta imágenes; para PDFs hay que subirlos via Files API
  // o convertir a imagen. Lo más simple: si es PDF, intentamos vía data URL
  // (algunos endpoints aceptan, otros no). Para imágenes funciona directo.

  const isPdfFile = /pdf/i.test(mimeType) || /\.pdf$/i.test(filename);
  if (isPdfFile) {
    // GPT-4o no acepta PDFs directos en chat completions.
    // Estrategia: subir como file y pedir extracción.
    try {
      const fileObj = new File([buffer as any], filename, { type: 'application/pdf' });
      const uploaded = await oa.files.create({
        file: fileObj as any,
        purpose: 'user_data',
      });
      const completion = await oa.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'file', file: { file_id: uploaded.id } } as any,
              {
                type: 'text',
                text:
                  'Extrae TODO el texto literal del documento, manteniendo el orden y la estructura (títulos, párrafos, tablas como CSV). NO resumas. Devuelve solo el texto.',
              },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 32000,
      });
      const text = completion.choices?.[0]?.message?.content || '';
      return {
        text: typeof text === 'string' ? text : JSON.stringify(text),
        method: 'openai-vision-files',
        metadata: { model, openaiFileId: uploaded.id },
      };
    } catch (e: any) {
      return { text: '', method: 'openai-vision-pdf-fail', metadata: { error: e.message } };
    }
  }

  // Imagen
  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
  const completion = await oa.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'Extrae TODO el texto que veas en esta imagen, en su orden natural. Si hay tablas, conviértelas a CSV. Si hay sellos o firmas, descríbelos. Devuelve solo el texto extraído sin comentarios.',
          },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 8000,
  });
  const text = completion.choices?.[0]?.message?.content || '';
  return {
    text: typeof text === 'string' ? text : '',
    method: 'openai-vision-image',
    metadata: { model },
  };
}

/**
 * Divide un PDF en sub-PDFs de N páginas usando pdf-lib.
 * Necesario para procesar códigos legales largos (200+ páginas) con
 * Vision OCR, que tiene un cap efectivo de output (~32K tokens ≈ 100KB
 * texto) por request. Sin esto, códigos enteros se truncan a las
 * primeras ~50 páginas leídas.
 */
async function splitPdfIntoChunks(buffer: Buffer, pagesPerChunk: number): Promise<Buffer[]> {
  const { PDFDocument } = await import('pdf-lib');
  const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = src.getPageCount();
  if (total <= pagesPerChunk) return [buffer];

  const chunks: Buffer[] = [];
  for (let start = 0; start < total; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk, total);
    const dst = await PDFDocument.create();
    const pageIndexes = Array.from({ length: end - start }, (_, i) => start + i);
    const copied = await dst.copyPages(src, pageIndexes);
    copied.forEach((p) => dst.addPage(p));
    const bytes = await dst.save();
    chunks.push(Buffer.from(bytes));
  }
  return chunks;
}

const ANTHROPIC_VISION_PROMPT =
  'Extrae TODO el texto literal del documento o imagen, manteniendo orden y estructura ' +
  '(títulos, artículos, numeración, párrafos). Si hay tablas, devuélvelas como CSV. ' +
  'NO resumas, NO comentes, NO omitas secciones. Solo el texto literal completo.';

const PAGES_PER_VISION_CALL = 5;    // 5 páginas por call → margen seguro vs 32K tokens
const MAX_OUTPUT_TOKENS_VISION = 32000;  // máximo soportado por Claude Opus 4.x

async function callAnthropicVisionOnce(
  pdfOrImageBuffer: Buffer,
  mimeType: string,
  apiKey: string,
  model: string,
): Promise<{ text: string; status?: number; error?: string }> {
  const isPdfFile = /pdf/i.test(mimeType);
  const b64 = pdfOrImageBuffer.toString('base64');
  const content: any[] = [];
  if (isPdfFile) {
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: b64 },
    });
  } else {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: mimeType, data: b64 },
    });
  }
  content.push({ type: 'text', text: ANTHROPIC_VISION_PROMPT });

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS_VISION,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    return { text: '', status: r.status, error: err.slice(0, 300) };
  }
  const data = await r.json() as any;
  const text = (data.content || []).map((c: any) => c.text || '').join('\n');
  return { text };
}

async function extractWithAnthropicVision(
  buffer: Buffer,
  mimeType: string,
  _filename: string,
  apiKey: string,
  model: string
): Promise<ExtractResult> {
  const isPdfFile = /pdf/i.test(mimeType);

  // ─── Para imágenes individuales, un solo call (no aplica paginación) ──
  if (!isPdfFile) {
    const r = await callAnthropicVisionOnce(buffer, mimeType, apiKey, model);
    if (r.error) {
      return {
        text: '',
        method: 'anthropic-vision-fail',
        metadata: { status: r.status, error: r.error, model },
      };
    }
    return {
      text: r.text,
      method: 'anthropic-vision',
      metadata: { model, mode: 'single' },
    };
  }

  // ─── PDFs: paginar si supera PAGES_PER_VISION_CALL para evitar
  //     truncamiento a max_tokens (que con códigos legales de 200+ pgs
  //     dejaba solo ~50 páginas leídas) ─────────────────────────────────
  let chunks: Buffer[];
  let pagesPerChunk = PAGES_PER_VISION_CALL;
  try {
    chunks = await splitPdfIntoChunks(buffer, pagesPerChunk);
  } catch (e: any) {
    // PDF cifrado o malformado para pdf-lib — intentamos como single blob
    chunks = [buffer];
  }

  if (chunks.length === 1) {
    const r = await callAnthropicVisionOnce(chunks[0], mimeType, apiKey, model);
    if (r.error) {
      return {
        text: '',
        method: 'anthropic-vision-fail',
        metadata: { status: r.status, error: r.error, model },
      };
    }
    return {
      text: r.text,
      method: 'anthropic-vision',
      metadata: { model, mode: 'single', pdfChunks: 1 },
    };
  }

  // PDF largo — procesar en paralelo controlado (de 3 en 3 para no
  // saturar la API ni el rate limit de tokens/min).
  const PARALLEL = 3;
  const parts: string[] = new Array(chunks.length).fill('');
  const errors: string[] = [];
  let totalLen = 0;

  for (let i = 0; i < chunks.length; i += PARALLEL) {
    const batch = chunks.slice(i, i + PARALLEL);
    const results = await Promise.all(
      batch.map((c) => callAnthropicVisionOnce(c, mimeType, apiKey, model)),
    );
    results.forEach((res, k) => {
      const idx = i + k;
      if (res.error) {
        errors.push(`chunk ${idx + 1}/${chunks.length}: ${res.error}`);
      } else {
        parts[idx] = res.text;
        totalLen += res.text.length;
      }
    });
  }

  const combined = parts
    .map((t, i) => t ? `\n\n=== PÁGINAS ${i * pagesPerChunk + 1}–${Math.min((i + 1) * pagesPerChunk, parts.length * pagesPerChunk)} ===\n${t}` : '')
    .join('');

  return {
    text: combined.trim(),
    method: errors.length > 0 ? 'anthropic-vision-paginated-partial' : 'anthropic-vision-paginated',
    metadata: {
      model,
      pdfChunks: chunks.length,
      pagesPerChunk,
      successfulChunks: chunks.length - errors.length,
      failedChunks: errors.length,
      totalChars: totalLen,
      errors: errors.slice(0, 3),
    },
  };
}

/**
 * Punto de entrada: detecta tipo y extrae.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ExtractResult> {
  const mime = (mimeType || '').toLowerCase();
  const fname = (filename || '').toLowerCase();

  if (isPdf(mime, fname)) return extractPdf(buffer, fname);
  if (isDocx(mime, fname)) return extractDocx(buffer);
  if (isDocLegacy(mime, fname)) {
    // .doc legacy: tratar como texto crudo (lossy). Para mejor calidad
    // se requeriría libreoffice/antiword en el server.
    return extractPlainText(buffer);
  }
  if (isXlsx(mime, fname)) return extractXlsx(buffer, fname);
  if (isCsv(mime, fname)) return extractPlainText(buffer);
  if (isImage(mime)) return extractWithVision(buffer, mime, fname);
  if (isTextLike(mime, fname)) return extractPlainText(buffer);

  // Fallback: probar como texto, si no hay caracteres legibles → vision
  const txt = buffer.toString('utf8');
  const printable = txt.replace(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g, '');
  if (printable.length > txt.length * 0.7 && printable.length > 100) {
    return { text: txt.trim(), method: 'utf8-fallback' };
  }
  return {
    text: `[Archivo binario: ${filename} · ${mimeType} · ${buffer.length} bytes]`,
    method: 'binary-stub',
    metadata: { unsupportedMime: mime },
  };
}
