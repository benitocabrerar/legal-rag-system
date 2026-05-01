/**
 * AI-powered providencia extractor.
 *
 * The lawyer drops a PDF or image of the convocation document
 * (providencia, oficio, citación, correo del juzgado), the server
 * pulls text from it (extractText already supports PDFs, DOCX, images
 * via Anthropic vision) and asks the configured AI client to return a
 * strictly typed event payload that the frontend can merge into the
 * EventDialog.
 */
import { FastifyInstance } from 'fastify';
import { extractText } from '../lib/extract-text.js';
import { getAiClient } from '../lib/ai-client.js';
import { detectProvider } from '../lib/convocatoria.js';

interface ExtractedEvent {
  title: string;
  type: 'HEARING' | 'COURT_DATE' | 'DEPOSITION' | 'MEDIATION' | 'CONSULTATION' |
        'DOCUMENT_FILING' | 'MEETING' | 'DEADLINE' | 'OTHER';
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  meetingLink: string | null;
  meetingProvider: string | null;
  meetingPasscode: string | null;
  source: string;
  description: string | null;
  caseHints: string[];
  confidence: number;
  warnings: string[];
}

export async function eventsExtractRoutes(fastify: FastifyInstance) {
  /**
   * POST /events/extract-from-providencia (multipart)
   * field name: "file"
   */
  fastify.post('/events/extract-from-providencia', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const file = await (request as any).file();
    if (!file) return reply.code(400).send({ error: 'NO_FILE' });

    const buffer: Buffer = await file.toBuffer();
    if (buffer.length === 0) return reply.code(400).send({ error: 'EMPTY_FILE' });
    if (buffer.length > 25 * 1024 * 1024) return reply.code(413).send({ error: 'FILE_TOO_LARGE', maxBytes: 25 * 1024 * 1024 });

    // 1) OCR / text extraction.
    let extracted;
    try {
      extracted = await extractText(buffer, file.mimetype || 'application/octet-stream', file.filename || 'providencia');
    } catch (err: any) {
      request.log.error({ err }, 'extractText failed');
      return reply.code(422).send({ error: 'EXTRACTION_FAILED', message: err?.message ?? 'unknown' });
    }
    const docText = (extracted.text || '').trim();
    if (docText.length < 30) {
      return reply.code(422).send({
        error: 'NO_TEXT',
        message: 'No se pudo extraer texto suficiente del documento.',
        method: extracted.method,
      });
    }

    // 2) Find URLs/passcodes via regex BEFORE asking the model — gives us
    //    a deterministic ground truth even if the LLM hallucinates.
    const urlRegex = /https?:\/\/[^\s<>"'`)\]]+/gi;
    const urls = Array.from(new Set((docText.match(urlRegex) ?? []).map((u) => u.replace(/[.,;:)\]]+$/, ''))));
    const meetingUrl = urls.find((u) => /zoom|teams|meet|webex|jitsi|whereby/i.test(u)) ?? urls[0] ?? null;
    const passMatch = docText.match(/(?:c[oó]digo(?:\s+de\s+(?:acceso|reuni[oó]n))?|passcode|password|contrase[ñn]a|pin)\s*[:\-]?\s*([A-Za-z0-9 \-]{4,32})/i);
    const guessedPasscode = passMatch ? passMatch[1].trim().replace(/\s+/g, ' ') : null;

    // 3) Trim text for the prompt (most providencias are short; cap at 8k).
    const snippet = docText.slice(0, 8000);

    // 4) Ask the LLM for a strict JSON payload.
    const aiClient = await getAiClient();
    const systemPrompt = `Eres un asistente jurídico ecuatoriano experto en analizar providencias, citaciones,
oficios, autos y comunicaciones de juzgados / fiscalías. Tu trabajo es extraer
los datos para crear un evento de calendario.

Responde SIEMPRE con un único objeto JSON minificado, sin markdown, sin texto
adicional. La forma exacta es:

{"title":"…","type":"HEARING","startTime":"YYYY-MM-DDTHH:mm","endTime":"YYYY-MM-DDTHH:mm",
"location":null,"meetingLink":null,"meetingProvider":null,"meetingPasscode":null,
"source":"…","description":null,"caseHints":["…"],"confidence":0.0,"warnings":[]}

Reglas:
- type: usa AUDIENCIA→HEARING, JUICIO/CORTE→COURT_DATE, DEPOSICIÓN/TESTIMONIO→DEPOSITION,
  MEDIACIÓN→MEDIATION, REUNIÓN→MEETING, PLAZO/TÉRMINO→DEADLINE,
  PRESENTACIÓN DE ESCRITO→DOCUMENT_FILING, CONSULTA→CONSULTATION, en duda→OTHER.
- startTime / endTime en formato 'YYYY-MM-DDTHH:mm' SIN zona (zona implícita
  America/Guayaquil). Si no hay hora explícita, usa las 09:00 y 10:00.
  Si la fecha es ambigua, deja el campo null.
- meetingLink: SOLO copia un URL que aparezca literalmente en el documento.
  NO INVENTES links.
- meetingProvider: zoom|teams|meet|webex|jitsi|whereby|in_person|other (deduce
  desde el URL o desde palabras como "presencial", "audiencia virtual", etc.).
- meetingPasscode: solo si aparece literalmente en el documento (código,
  passcode, contraseña, ID de reunión, PIN). Sin inventar.
- location: solo si la audiencia es presencial. Calle, ciudad, sala.
- source: cita textual breve que identifique la fuente — ej.
  "Providencia 0123-2026 del Juzgado de lo Civil — recibida el 28 abr 2026".
- caseHints: 0-3 strings con números de causa o partes que ayuden a vincular
  el evento con un caso existente.
- description: 1-2 frases con la materia/objeto del evento si es claro.
- confidence: 0.0 a 1.0 — qué tan seguro estás del payload completo.
- warnings: array de strings con cualquier ambigüedad relevante (ej. "fecha
  ambigua", "no se encontró enlace", "passcode posiblemente truncado").
- Si un campo no está claro, usa null en lugar de inventar.`;

    const userPrompt = [
      meetingUrl   ? `URL detectado por regex: ${meetingUrl}` : '',
      guessedPasscode ? `Posible passcode detectado por regex: ${guessedPasscode}` : '',
      '',
      'Texto del documento:',
      '"""',
      snippet,
      '"""',
    ].filter(Boolean).join('\n');

    let parsed: ExtractedEvent;
    try {
      const completion = await aiClient.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 800,
      });
      const raw = completion.choices?.[0]?.message?.content?.trim() ?? '';
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (err: any) {
      request.log.error({ err }, 'AI extraction failed');
      return reply.code(502).send({ error: 'AI_FAILED', message: err?.message });
    }

    // 5) Reconcile with regex hits — they win over hallucinations.
    if (!parsed.meetingLink && meetingUrl) parsed.meetingLink = meetingUrl;
    if (parsed.meetingLink && !parsed.meetingProvider) {
      parsed.meetingProvider = detectProvider(parsed.meetingLink, null);
    }
    if (!parsed.meetingPasscode && guessedPasscode) parsed.meetingPasscode = guessedPasscode;

    // 6) Sanity defaults.
    if (!Array.isArray(parsed.warnings)) parsed.warnings = [];
    if (!Array.isArray(parsed.caseHints)) parsed.caseHints = [];
    if (typeof parsed.confidence !== 'number') parsed.confidence = 0.6;
    if (!parsed.type) parsed.type = 'OTHER';

    return {
      ok: true,
      method: extracted.method,
      filename: file.filename,
      mimeType: file.mimetype,
      bytes: buffer.length,
      detectedUrls: urls,
      detectedPasscode: guessedPasscode,
      event: parsed,
      excerpt: snippet.slice(0, 600),
    };
  });
}
