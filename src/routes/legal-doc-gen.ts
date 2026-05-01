/**
 * Legal document generation — backend.
 *
 * Three endpoints designed so the lawyer can produce a *truly professional*
 * legal document, country-aware, with real citations and ZERO hallucinated
 * data. The flow is:
 *
 *   POST /cases/:id/generate-document/preflight
 *     → returns { status: 'ok' | 'incomplete', missing: [...], summary }
 *
 *   POST /cases/:id/generate-document  (SSE)
 *     → streams the document. Refuses to start if preflight returned
 *       incomplete unless `acceptIncomplete: true` is sent.
 *
 *   POST /cases/:id/generate-document/save
 *     → persists the generated text as a Document row attached to the case.
 *
 *   GET /documents/:docId/download.docx
 *     → renders the document (markdown-ish) into a real Word file.
 */
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import { prisma } from '../lib/prisma.js';
import { getAiClient } from '../lib/ai-client.js';
import { getUserCountryContext, type CountryContext } from '../lib/country-context.js';

// ─── Document type catalog ──────────────────────────────────

type DocType =
  | 'DEMANDA' | 'CONTESTACION_DEMANDA' | 'RECURSO_APELACION' | 'RECURSO_CASACION'
  | 'CONTRATO' | 'INFORME_LEGAL' | 'CARTA_LEGAL' | 'ESCRITO_GENERAL'
  | 'ALEGATO' | 'ACUERDO_TRANSACCIONAL' | 'PODER' | 'NOTIFICACION';

const DOC_LABELS: Record<DocType, string> = {
  DEMANDA: 'Demanda',
  CONTESTACION_DEMANDA: 'Contestación a la demanda',
  RECURSO_APELACION: 'Recurso de apelación',
  RECURSO_CASACION: 'Recurso de casación',
  CONTRATO: 'Contrato',
  INFORME_LEGAL: 'Informe jurídico',
  CARTA_LEGAL: 'Carta legal',
  ESCRITO_GENERAL: 'Escrito general',
  ALEGATO: 'Alegato',
  ACUERDO_TRANSACCIONAL: 'Acuerdo transaccional',
  PODER: 'Poder especial',
  NOTIFICACION: 'Notificación',
};

interface RequiredField {
  key: string;
  label: string;
  hint?: string;
}

/** Fields the model NEEDS to produce a non-hallucinated document. */
function requiredFieldsFor(docType: DocType): RequiredField[] {
  const common: RequiredField[] = [
    { key: 'case_title', label: 'Título o materia del caso' },
    { key: 'client_name', label: 'Nombre completo del cliente' },
  ];
  switch (docType) {
    case 'DEMANDA':
    case 'CONTESTACION_DEMANDA':
      return [
        ...common,
        { key: 'demandante', label: 'Demandante (nombre completo, cédula/RUC)' },
        { key: 'demandado',  label: 'Demandado (nombre completo, cédula/RUC)' },
        { key: 'tribunal',   label: 'Tribunal o juzgado competente' },
        { key: 'hechos',     label: 'Hechos del caso (descripción)' },
        { key: 'pretension', label: 'Pretensión / petitorio concreto' },
      ];
    case 'RECURSO_APELACION':
    case 'RECURSO_CASACION':
      return [
        ...common,
        { key: 'sentencia_recurrida', label: 'Resolución/sentencia que se recurre (número y fecha)' },
        { key: 'tribunal_origen',     label: 'Tribunal que emitió la resolución' },
        { key: 'agravios',            label: 'Agravios concretos' },
      ];
    case 'CONTRATO':
      return [
        ...common,
        { key: 'parte_a',       label: 'Parte A (datos completos)' },
        { key: 'parte_b',       label: 'Parte B (datos completos)' },
        { key: 'objeto',        label: 'Objeto del contrato' },
        { key: 'monto_o_plazo', label: 'Monto y/o plazo' },
      ];
    case 'PODER':
      return [
        ...common,
        { key: 'poderdante', label: 'Poderdante (datos completos)' },
        { key: 'apoderado',  label: 'Apoderado (datos completos)' },
        { key: 'facultades', label: 'Facultades específicas que se otorgan' },
      ];
    case 'INFORME_LEGAL':
      return [
        ...common,
        { key: 'consulta', label: 'Pregunta o consulta jurídica concreta' },
      ];
    case 'CARTA_LEGAL':
    case 'NOTIFICACION':
      return [
        ...common,
        { key: 'destinatario', label: 'Destinatario (nombre + dirección)' },
        { key: 'asunto',       label: 'Asunto / motivo' },
      ];
    case 'ALEGATO':
      return [
        ...common,
        { key: 'audiencia',  label: 'Audiencia (fecha y tipo)' },
        { key: 'tesis',      label: 'Tesis principal a sostener' },
      ];
    case 'ACUERDO_TRANSACCIONAL':
      return [
        ...common,
        { key: 'parte_a',     label: 'Parte A' },
        { key: 'parte_b',     label: 'Parte B' },
        { key: 'controversia',label: 'Controversia objeto del acuerdo' },
      ];
    case 'ESCRITO_GENERAL':
    default:
      return [
        ...common,
        { key: 'asunto', label: 'Asunto / pretensión' },
      ];
  }
}

// ─── Validation helpers ─────────────────────────────────────

const NN_REGEX = /\b(NN|N\.\s*N\.|N\/N|tbd|to\s+be\s+defined|por\s+definir|no\s+especificado)\b/i;

function isMissing(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value !== 'string') return !value;
  const v = value.trim();
  if (!v) return true;
  if (NN_REGEX.test(v)) return true;
  return false;
}

interface CaseSummary {
  id: string;
  title: string;
  description: string | null;
  clientName: string | null;
  caseNumber: string | null;
  documents: Array<{ id: string; title: string; excerpt: string }>;
  events: Array<{ title: string; type: string; startTime: string; description: string | null }>;
  country: CountryContext;
}

async function loadCaseForGeneration(caseId: string, userId: string): Promise<CaseSummary | null> {
  const c = await prisma.case.findFirst({
    where: { id: caseId, userId },
    include: {
      documents: {
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, title: true, content: true },
      },
      events: {
        orderBy: { startTime: 'desc' },
        take: 12,
        select: { title: true, type: true, startTime: true, description: true },
      },
    },
  });
  if (!c) return null;
  const country = await getUserCountryContext(userId);
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    clientName: c.clientName,
    caseNumber: c.caseNumber,
    documents: c.documents.map((d) => ({
      id: d.id,
      title: d.title,
      excerpt: d.content.replace(/\s+/g, ' ').trim().slice(0, 1500),
    })),
    events: c.events.map((e) => ({
      title: e.title,
      type: e.type,
      startTime: e.startTime.toISOString(),
      description: e.description,
    })),
    country,
  };
}

// ─── Expert system prompt builder ───────────────────────────

function expertSystemPrompt(opts: {
  docType: DocType;
  country: CountryContext;
  specialty?: string;
}): string {
  const { docType, country, specialty } = opts;
  const docLabel = DOC_LABELS[docType];
  const specialtyLine = specialty
    ? `Tu especialidad para este caso: ${specialty}.`
    : 'Identifica la rama del derecho aplicable y aplica sus principios con precisión.';

  return [
    `Eres un abogado(a) ecuatoriano LATAM senior que ejerce en ${country.nameEs} bajo el sistema ${country.legalSystem === 'common_law' ? 'common law' : 'civil law'}.`,
    `Tienes 25 años de experiencia litigando y redactando documentos forenses; te respetan jueces y pares.`,
    specialtyLine,
    '',
    `TAREA: redactar un(a) "${docLabel}" listo(a) para presentar / firmar, con calidad de un(a) socio(a) senior.`,
    '',
    'REGLAS DE REDACCIÓN (no negociables):',
    '1) ESTRUCTURA PROFESIONAL clásica del documento, con secciones tituladas y numeradas en mayúsculas (## I. SUMILLA, ## II. ANTECEDENTES, ## III. FUNDAMENTOS DE HECHO, ## IV. FUNDAMENTOS DE DERECHO, ## V. PRUEBAS, ## VI. PETICIÓN, ## VII. NOTIFICACIONES, etc. — adapta a este tipo de doc).',
    `2) CITAS LEGALES EXACTAS al ordenamiento jurídico de ${country.nameEs}: cuando invoques un artículo, escribe número, norma y, si lo recuerdas, fecha de promulgación. Ejemplo: "Art. 76, numeral 7, literal l) de la Constitución de la República del Ecuador" o "Art. 234 del COIP". `,
    '3) JAMÁS inventes leyes, fallos ni doctrina. Si no estás 100% seguro de un número de artículo, jurisprudencia o doctrina, escribe explícitamente "[CITA POR VERIFICAR]" en lugar de inventar. Es preferible un placeholder honesto a una fuente falsa.',
    '4) JAMÁS uses "NN", "N.N.", "N/N", "Sr. NN", "[NOMBRE]" ni placeholders genéricos. Usa los datos reales del caso que se te entregan en el bloque CONTEXTO. Si un dato falta, MARCA "[DATO REQUERIDO: <descripción exacta del dato>]" para que el abogado humano lo complete.',
    '5) Lenguaje forense formal, en español jurídico de la jurisdicción, con párrafos numerados cuando aplique, signos de puntuación correctos y trato protocolar al juzgador (Señor Juez/a, Honorable Tribunal, según corresponda).',
    '6) NO añadas comentarios meta-textuales (no escribas "Aquí está el documento", "Espero que sea útil"). El primer carácter de tu salida es la primera palabra del documento mismo.',
    '7) Cuando cites pruebas, refiérete a documentos reales del caso (los listados en CONTEXTO). No inventes documentos.',
    '',
    'FORMATO DE SALIDA: Markdown ligero — usa "## Título" para secciones principales, "### Sub-título" para sub-secciones, **negrita** para énfasis, listas con "- " cuando ayuden a la legibilidad. Sin frontmatter, sin code-fences.',
  ].join('\n');
}

// ─── Routes ─────────────────────────────────────────────────

export async function legalDocGenRoutes(fastify: FastifyInstance) {
  /**
   * POST /cases/:id/generate-document/recommend
   * Recomienda QUÉ documento generar a continuación según la etapa procesal
   * inferida del caso, los documentos cargados, los eventos próximos y la
   * descripción. Devuelve uno de los 12 docTypes válidos + razón en español.
   */
  fastify.post<{ Params: { id: string } }>(
    '/cases/:id/generate-document/recommend',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const c = await loadCaseForGeneration(request.params.id, userId);
      if (!c) return reply.code(404).send({ error: 'CASE_NOT_FOUND' });

      const VALID_TYPES = Object.keys(DOC_LABELS);
      const docList = c.documents
        .map((d, i) => `[Doc ${i + 1}] ${d.title}: ${d.excerpt.slice(0, 350)}`)
        .join('\n');
      const events = c.events.slice(0, 8)
        .map((e) => `- ${new Date(e.startTime).toISOString().slice(0, 10)} ${e.type}: ${e.title}`)
        .join('\n');
      const labelsList = VALID_TYPES.map((k) => `  · ${k} = ${DOC_LABELS[k as DocType]}`).join('\n');

      const systemPrompt =
        'Eres un(a) abogado(a) senior en ' + c.country.nameEs + '. ' +
        'Te entrego un caso real y debes recomendar QUÉ documento legal el abogado debería generar a continuación, ' +
        'basándote ÚNICAMENTE en la información del caso (etapa procesal inferida, documentos cargados, próximos eventos, descripción). ' +
        'Si la etapa no es clara, recomienda lo más útil dada la información disponible.' +
        '\n\nDevuelve SOLO un JSON minificado, sin markdown:\n' +
        '{"recommendedDocType":"<UNO_DE_LOS_VALIDOS>","confidence":0.0,"reasoning":"<1-2 frases en español, sin tecnicismos innecesarios>","alternatives":[{"docType":"<otro>","reasoning":"<1 frase>"}]}\n\n' +
        'Tipos válidos:\n' + labelsList + '\n\n' +
        'Reglas:\n' +
        '- recommendedDocType debe ser uno de los códigos exactos.\n' +
        '- confidence entre 0 y 1.\n' +
        '- reasoning describe POR QUÉ ese documento ahora — alude a algo concreto del caso.\n' +
        '- alternatives: 1 o 2 opciones plausibles con su justificación corta.\n' +
        '- Si no hay nada de información (caso vacío), recomienda ESCRITO_GENERAL con confidence baja.';

      const userPrompt = [
        '=== CASO ===',
        `Título: ${c.title}`,
        c.caseNumber ? `Número: ${c.caseNumber}` : '',
        c.clientName ? `Cliente: ${c.clientName}` : '',
        c.description ? `Descripción: ${c.description}` : '',
        '',
        '=== DOCUMENTOS DEL EXPEDIENTE ===',
        docList || '(sin documentos)',
        '',
        '=== EVENTOS / CRONOLOGÍA ===',
        events || '(sin eventos)',
      ].filter(Boolean).join('\n');

      try {
        const aiClient = await getAiClient();
        const completion = await aiClient.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 500,
        });
        const raw = completion.choices?.[0]?.message?.content?.trim() ?? '';
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        let parsed: any;
        try { parsed = JSON.parse(cleaned); } catch {
          return reply.code(502).send({ error: 'AI_INVALID_JSON', raw: cleaned.slice(0, 200) });
        }
        const docType = String(parsed.recommendedDocType ?? '').toUpperCase();
        if (!VALID_TYPES.includes(docType)) {
          return {
            recommendedDocType: 'ESCRITO_GENERAL',
            confidence: 0.4,
            reasoning: 'No fue posible inferir la etapa procesal con certeza. Sugiero un escrito general; cámbialo si necesitas otro tipo.',
            alternatives: [],
          };
        }
        return {
          recommendedDocType: docType,
          confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.6,
          reasoning: String(parsed.reasoning ?? '').slice(0, 400),
          alternatives: Array.isArray(parsed.alternatives)
            ? parsed.alternatives
                .filter((a: any) => VALID_TYPES.includes(String(a?.docType ?? '').toUpperCase()))
                .slice(0, 2)
                .map((a: any) => ({
                  docType: String(a.docType).toUpperCase(),
                  reasoning: String(a.reasoning ?? '').slice(0, 240),
                }))
            : [],
        };
      } catch (err: any) {
        request.log.error({ err }, 'recommend doctype failed');
        return reply.code(500).send({ error: 'AI_FAILED', message: err?.message });
      }
    },
  );

  /**
   * POST /cases/:id/generate-document/preflight
   * Body: { docType, supplied?: Record<string,string> }
   */
  fastify.post<{ Params: { id: string }; Body: any }>(
    '/cases/:id/generate-document/preflight',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const body = z.object({
        docType: z.enum(Object.keys(DOC_LABELS) as [DocType, ...DocType[]]),
        supplied: z.record(z.string(), z.string()).optional(),
      }).parse(request.body);

      const c = await loadCaseForGeneration(request.params.id, userId);
      if (!c) return reply.code(404).send({ error: 'CASE_NOT_FOUND' });

      const supplied = body.supplied ?? {};
      const fields = requiredFieldsFor(body.docType);
      const detected: Record<string, string> = {
        case_title:  c.title,
        client_name: c.clientName ?? '',
      };
      // Fold supplied user-provided values; supplied wins over detected.
      for (const [k, v] of Object.entries(supplied)) {
        if (!isMissing(v)) detected[k] = v;
      }

      const missing = fields
        .filter((f) => isMissing(detected[f.key]))
        .map((f) => ({ ...f, autoDetected: false }));

      const present = fields
        .filter((f) => !isMissing(detected[f.key]))
        .map((f) => ({ ...f, value: detected[f.key] }));

      return {
        status: missing.length === 0 ? 'ok' : 'incomplete',
        docType: body.docType,
        docLabel: DOC_LABELS[body.docType],
        missing,
        present,
        country: { code: c.country.code, name: c.country.nameEs, flag: c.country.flagEmoji },
        caseHasDocuments: c.documents.length,
      };
    },
  );

  /**
   * POST /cases/:id/generate-document  (SSE streaming)
   * Body: { docType, supplied, customInstructions?, acceptIncomplete? }
   */
  fastify.post<{ Params: { id: string }; Body: any }>(
    '/cases/:id/generate-document',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const body = z.object({
        docType: z.enum(Object.keys(DOC_LABELS) as [DocType, ...DocType[]]),
        supplied: z.record(z.string(), z.string()).optional(),
        customInstructions: z.string().max(2000).optional(),
        specialty: z.string().max(120).optional(),
        acceptIncomplete: z.boolean().default(false),
      }).parse(request.body);

      const c = await loadCaseForGeneration(request.params.id, userId);
      if (!c) return reply.code(404).send({ error: 'CASE_NOT_FOUND' });

      const supplied = body.supplied ?? {};
      const fields = requiredFieldsFor(body.docType);
      const merged: Record<string, string> = {
        case_title:  c.title,
        client_name: c.clientName ?? '',
        ...supplied,
      };
      const missing = fields.filter((f) => isMissing(merged[f.key]));
      if (missing.length > 0 && !body.acceptIncomplete) {
        return reply.code(409).send({
          error: 'INCOMPLETE_DATA',
          message: 'Faltan datos obligatorios. Reenvía con acceptIncomplete=true o completa los campos.',
          missing,
        });
      }

      const aiClient = await getAiClient();

      const systemPrompt = expertSystemPrompt({
        docType: body.docType,
        country: c.country,
        specialty: body.specialty,
      });

      const docContext = c.documents
        .map((d, i) => `[Documento ${i + 1}] ${d.title}\n${d.excerpt}`)
        .join('\n\n');
      const eventContext = c.events
        .map((e) => `- ${new Date(e.startTime).toISOString().slice(0, 10)} ${e.type}: ${e.title}`)
        .join('\n');
      const fieldsContext = Object.entries(merged)
        .map(([k, v]) => {
          const label = fields.find((f) => f.key === k)?.label ?? k;
          return `- ${label}: ${v || '[DATO REQUERIDO]'}`;
        })
        .join('\n');

      const userPrompt = [
        `=== CONTEXTO DEL CASO ===`,
        `Caso: ${c.title}`,
        c.caseNumber ? `Número de causa: ${c.caseNumber}` : '',
        c.description ? `Descripción: ${c.description}` : '',
        '',
        `=== DATOS PARA EL DOCUMENTO (${DOC_LABELS[body.docType]}) ===`,
        fieldsContext,
        '',
        `=== DOCUMENTOS DEL EXPEDIENTE ===`,
        docContext || '(sin documentos cargados)',
        '',
        `=== CRONOLOGÍA ===`,
        eventContext || '(sin eventos)',
        body.customInstructions ? `\n=== INSTRUCCIONES ADICIONALES ===\n${body.customInstructions}` : '',
        '',
        `Genera el documento "${DOC_LABELS[body.docType]}" siguiendo estrictamente las reglas del sistema.`,
      ].filter(Boolean).join('\n');

      reply
        .raw.setHeader('Content-Type', 'text/event-stream')
        .setHeader('Cache-Control', 'no-cache, no-transform')
        .setHeader('Connection', 'keep-alive')
        .setHeader('X-Accel-Buffering', 'no');
      reply.raw.flushHeaders?.();

      const send = (event: string, data: any) => {
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      try {
        send('start', {
          docType: body.docType,
          docLabel: DOC_LABELS[body.docType],
          country: c.country.code,
          model: aiClient.model,
          provider: aiClient.provider,
        });

        if (aiClient.provider === 'openai') {
          const stream: any = await aiClient.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user',   content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: 6000,
            stream: true,
          });
          for await (const chunk of stream) {
            const delta = chunk?.choices?.[0]?.delta?.content;
            if (delta) send('chunk', { content: delta });
          }
        } else {
          const completion = await aiClient.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user',   content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: 6000,
          });
          const text = completion.choices?.[0]?.message?.content ?? '';
          // Anthropic vía nuestro wrapper devuelve un solo bloque. Lo
          // troceamos en líneas para que la UI lo pinte gradual.
          for (const line of text.split('\n')) {
            send('chunk', { content: line + '\n' });
          }
        }
        send('done', { ok: true });
      } catch (err: any) {
        request.log.error({ err }, 'legal-doc-gen failed');
        send('error', { message: err?.message ?? 'AI error' });
      } finally {
        reply.raw.end();
      }
      return reply;
    },
  );

  /**
   * POST /cases/:id/generate-document/save
   * Body: { docType, content, title? }
   * Persists the generated content as a Document attached to the case.
   */
  fastify.post<{ Params: { id: string }; Body: any }>(
    '/cases/:id/generate-document/save',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const body = z.object({
        docType: z.enum(Object.keys(DOC_LABELS) as [DocType, ...DocType[]]),
        content: z.string().min(20),
        title: z.string().max(200).optional(),
      }).parse(request.body);

      const c = await prisma.case.findFirst({
        where: { id: request.params.id, userId },
        select: { id: true, title: true },
      });
      if (!c) return reply.code(404).send({ error: 'CASE_NOT_FOUND' });

      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const title = body.title?.trim() || `${DOC_LABELS[body.docType]} — ${c.title} (${stamp})`;

      const doc = await prisma.document.create({
        data: {
          caseId: c.id,
          userId,
          title,
          content: body.content,
        },
        select: { id: true, title: true, createdAt: true },
      });
      return reply.code(201).send({ document: doc });
    },
  );

  /**
   * GET /documents/:docId/download.docx
   * Renders the markdown-ish content into a real Word file.
   */
  fastify.get<{ Params: { docId: string } }>(
    '/documents/:docId/download.docx',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const doc = await prisma.document.findFirst({
        where: { id: request.params.docId, userId },
        select: { id: true, title: true, content: true },
      });
      if (!doc) return reply.code(404).send({ error: 'NOT_FOUND' });

      const buffer = await renderDocx(doc.title, doc.content);
      const safeName = doc.title.replace(/[^\w\-. ]+/g, '_').slice(0, 80);
      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        .header('Content-Disposition', `attachment; filename="${safeName}.docx"`)
        .send(buffer);
    },
  );
}

// ─── DOCX renderer (markdown-ish → Word) ────────────────────

async function renderDocx(title: string, mdContent: string): Promise<Buffer> {
  const paragraphs: Paragraph[] = [];

  // Title
  paragraphs.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: title, bold: true, size: 32 })],
    spacing: { after: 240 },
  }));

  for (const raw of mdContent.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim()) {
      paragraphs.push(new Paragraph({ children: [new TextRun('')] }));
      continue;
    }
    if (/^##\s+/.test(line)) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: line.replace(/^##\s+/, ''), bold: true, size: 28 })],
        spacing: { before: 240, after: 120 },
      }));
      continue;
    }
    if (/^###\s+/.test(line)) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: line.replace(/^###\s+/, ''), bold: true, size: 24 })],
        spacing: { before: 200, after: 100 },
      }));
      continue;
    }
    if (/^\s*-\s+/.test(line)) {
      paragraphs.push(new Paragraph({
        bullet: { level: 0 },
        children: parseInline(line.replace(/^\s*-\s+/, '')),
        spacing: { after: 60 },
      }));
      continue;
    }
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: parseInline(line),
      spacing: { after: 120 },
    }));
  }

  const docx = new DocxDocument({
    creator: 'Poweria Legal',
    title,
    description: 'Documento generado con Poweria Legal por COGNITEX.',
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{ children: paragraphs }],
  });
  return Packer.toBuffer(docx);
}

/** Tokenizes **bold** segments in a line into TextRuns. */
function parseInline(text: string): TextRun[] {
  const out: TextRun[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**')) {
      out.push(new TextRun({ text: part.slice(2, -2), bold: true }));
    } else {
      out.push(new TextRun({ text: part }));
    }
  }
  return out.length ? out : [new TextRun({ text })];
}
