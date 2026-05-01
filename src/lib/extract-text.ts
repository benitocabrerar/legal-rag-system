/**
 * Extractor universal de texto desde cualquier archivo.
 *
 * Detecta el mimetype y aplica el extractor correcto:
 *   - PDF nativo → pdf-parse
 *   - PDF escaneado / con poco texto → Vision IA (Claude Sonnet 4 si hay
 *     ANTHROPIC_API_KEY, si no GPT-4o multimodal)
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

const _require = createRequire(import.meta.url);
const pdfParse: (data: Buffer) => Promise<{ text: string; numpages: number }> =
  _require('pdf-parse/lib/pdf-parse.js');

interface ExtractResult {
  text: string;
  method: string;
  metadata?: Record<string, unknown>;
}

const VISION_MODEL_OPENAI = 'gpt-4o';
const VISION_MODEL_ANTHROPIC = 'claude-sonnet-4-6';

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
 * Usa Claude Sonnet 4.6 si hay ANTHROPIC_API_KEY, si no GPT-4o.
 */
async function extractWithVision(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ExtractResult> {
  const anthKey = process.env.ANTHROPIC_API_KEY;
  if (anthKey) {
    return extractWithAnthropicVision(buffer, mimeType, filename, anthKey);
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return extractWithOpenAiVision(buffer, mimeType, filename, openaiKey);
  }
  return { text: '', method: 'vision-no-key' };
}

async function extractWithOpenAiVision(
  buffer: Buffer,
  mimeType: string,
  filename: string,
  apiKey: string
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
        model: VISION_MODEL_OPENAI,
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
        max_tokens: 16000,
      });
      const text = completion.choices?.[0]?.message?.content || '';
      return {
        text: typeof text === 'string' ? text : JSON.stringify(text),
        method: 'openai-vision-files',
        metadata: { model: VISION_MODEL_OPENAI, openaiFileId: uploaded.id },
      };
    } catch (e: any) {
      return { text: '', method: 'openai-vision-pdf-fail', metadata: { error: e.message } };
    }
  }

  // Imagen
  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
  const completion = await oa.chat.completions.create({
    model: VISION_MODEL_OPENAI,
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
    metadata: { model: VISION_MODEL_OPENAI },
  };
}

async function extractWithAnthropicVision(
  buffer: Buffer,
  mimeType: string,
  _filename: string,
  apiKey: string
): Promise<ExtractResult> {
  const isPdfFile = /pdf/i.test(mimeType);
  const b64 = buffer.toString('base64');
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
  content.push({
    type: 'text',
    text:
      'Extrae TODO el texto literal del documento o imagen, manteniendo orden y estructura. Si hay tablas, devuélvelas como CSV. No resumas. Solo el texto.',
  });

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: VISION_MODEL_ANTHROPIC,
      max_tokens: 16000,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    return {
      text: '',
      method: 'anthropic-vision-fail',
      metadata: { status: r.status, error: err.slice(0, 300) },
    };
  }
  const data = await r.json() as any;
  const text = (data.content || []).map((c: any) => c.text || '').join('\n');
  return {
    text,
    method: 'anthropic-vision',
    metadata: { model: VISION_MODEL_ANTHROPIC },
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
