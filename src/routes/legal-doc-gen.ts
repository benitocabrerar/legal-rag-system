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
import { serviceRoleClient } from '../lib/supabase.js';
import { getUserCountryContext, type CountryContext } from '../lib/country-context.js';

// ─── RAG retrieval contra el corpus legal vectorizado ───────────
//
// Inyecta MARCO NORMATIVO real (extractos vectorizados de leyes/códigos/
// reglamentos del país) al prompt de generación. Sin esto, la IA puede
// alucinar artículos. Con esto, la IA solo cita fuentes presentes en el
// bloque retrieved.
interface LegalSource {
  legalDocumentId: string;
  normTitle: string;
  content: string;
  score: number;
}

async function retrieveLegalContext(
  query: string,
  matchCount: number,
  filterCountryCode?: string,
): Promise<LegalSource[]> {
  try {
    const ai = await getAiClient();
    const embedResp = await ai.embeddings.create({ input: query, dimensions: 1536 });
    const embedding = embedResp.data?.[0]?.embedding;
    if (!embedding) return [];

    const sb = serviceRoleClient();
    const { data, error } = await sb.rpc('search_legal_chunks', {
      query_embedding: `[${embedding.join(',')}]`,
      query_text: query.slice(0, 500),
      match_count: matchCount,
      semantic_weight: 1.2,    // privilegia semántica para que captures conceptos
      keyword_weight: 0.8,
      filter_doc_id: null,
      filter_norm_type: null,
      filter_jurisdiction: null,
      filter_country_code: filterCountryCode || null,
    });

    if (error || !data) return [];

    // Dedup: si dos chunks vienen del mismo doc legal, quedarnos con el mejor
    // y mantener variedad de fuentes (mejor para no sesgar al modelo).
    const seen = new Set<string>();
    const out: LegalSource[] = [];
    for (const row of data as any[]) {
      if (seen.has(row.legal_document_id)) continue;
      seen.add(row.legal_document_id);
      out.push({
        legalDocumentId: row.legal_document_id,
        normTitle: (row.norm_title || 'Sin título').trim(),
        content: (row.content || '').trim(),
        score: Number(row.rrf_score ?? 0),
      });
      if (out.length >= matchCount) break;
    }
    return out;
  } catch {
    // RAG es additive: si falla, generamos sin él (no rompemos el documento).
    return [];
  }
}

function formatLegalSources(sources: LegalSource[]): string {
  if (sources.length === 0) {
    return '(no se encontraron fuentes en el corpus vectorizado — el abogado debe verificar todas las citas)';
  }
  return sources
    .map((s, i) => {
      const excerpt = s.content.replace(/\s+/g, ' ').trim().slice(0, 900);
      return `[Fuente ${i + 1}] ${s.normTitle}\n${excerpt}`;
    })
    .join('\n\n');
}

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
    `Eres un(a) abogado(a) senior que ejerce en ${country.nameEs} bajo el sistema ${country.legalSystem === 'common_law' ? 'common law' : 'civil law'}.`,
    `Tienes 25+ años de experiencia litigando y redactando documentos forenses; te respetan jueces y pares.`,
    specialtyLine,
    '',
    `TAREA: redactar un(a) "${docLabel}" listo(a) para presentar/firmar, con la calidad de un(a) socio(a) senior de una firma de prestigio mundial. Extensión esperada: documento completo, exhaustivo, profesional — sin atajos.`,
    '',
    'REGLAS DE REDACCIÓN (no negociables):',
    '',
    '1) ESTRUCTURA PROFESIONAL EXTENSA Y NUMERADA. Cada sección lleva título en mayúsculas con romano (## I. SUMILLA / ENCABEZAMIENTO, ## II. IDENTIFICACIÓN DE LAS PARTES, ## III. ANTECEDENTES DE HECHO (cronológicos, numerados 3.1, 3.2…), ## IV. FUNDAMENTOS DE DERECHO (separa por norma invocada y desarrolla su aplicación al caso), ## V. PRUEBAS QUE SE ANUNCIAN / PRACTICAN (numeradas 5.1, 5.2…), ## VI. PETICIÓN / PETITORIO (numerada), ## VII. CUANTÍA / TRÁMITE, ## VIII. NOTIFICACIONES / CASILLERO, ## IX. PROCURACIÓN JUDICIAL / AUTORIZACIÓN, ## X. FIRMA). Adapta los títulos al tipo de documento — pero EXIGE igual nivel de detalle y formalidad. Nunca devuelvas un texto corto o "esquemático"; redacta como abogado(a) cuyo trabajo se va a presentar mañana en un juzgado.',
    '',
    '2) MARCO NORMATIVO (REGLA CRÍTICA — ANTI-ALUCINACIÓN). Junto con el caso te entrego un bloque "=== MARCO NORMATIVO ===" con extractos REALES del ordenamiento jurídico de ' + country.nameEs + ', recuperados por búsqueda vectorial del corpus oficial cargado en este sistema. CUANDO CITES un artículo o pasaje legal:',
    '   a) Si la cita aparece literalmente en MARCO NORMATIVO → cita con precisión (número, norma, párrafo) y, si suma, reproduce un extracto breve entre comillas con atribución a la "Fuente N" del bloque.',
    '   b) Si NO está en MARCO NORMATIVO pero es una norma muy general que conoces con plena certeza (ej. Art. 76 CRE, Art. 1 COIP) → puedes citarla, pero NO pongas extractos textuales que no aparezcan en MARCO.',
    '   c) Si no estás 100% seguro del número, fecha o redacción → escribe "[CITA POR VERIFICAR: <descripción honesta de lo que querías invocar>]". Preferible siempre un placeholder honesto a una fuente fabricada.',
    '   PROHIBIDO inventar números de artículo, fechas de promulgación, registros oficiales, sentencias o doctrina que no aparezcan en MARCO ni sean de conocimiento universal verificable.',
    '',
    '3) JAMÁS uses "NN", "N.N.", "N/N", "Sr. NN", "[NOMBRE]" ni placeholders genéricos para nombres, montos, fechas o tribunales. Usa SIEMPRE los datos reales del caso (sección CONTEXTO y DATOS PARA EL DOCUMENTO). Si un dato falta, marca explícitamente "[DATO REQUERIDO: <descripción exacta del dato faltante>]" para que el abogado humano lo complete antes de firmar.',
    '',
    '4) DESARROLLA cada FUNDAMENTO DE DERECHO con esta estructura: enunciado de la norma → contenido relevante → SUBSUNCIÓN al caso concreto (cómo los hechos encajan en el supuesto) → conclusión jurídica. No basta con citar la norma; debes argumentar.',
    '',
    '5) Lenguaje forense formal y preciso, en español jurídico de ' + country.nameEs + '. Tratamiento protocolar al juzgador ("Señor/a Juez/a", "Honorable Tribunal"). Párrafos numerados donde aplique. Puntuación impecable, sin redundancias ni muletillas.',
    '',
    '6) RECOMENDACIONES y ESTRATEGIA (si aplica al tipo de documento, ej. INFORME_LEGAL, ALEGATO, CARTA_LEGAL): cada recomendación debe estar sustentada en una norma o principio CITADO previamente. No emitas opinión sin respaldo legal.',
    '',
    '7) PRUEBAS: cuando las anuncies, refiérete a documentos REALES del caso (los listados en DOCUMENTOS DEL EXPEDIENTE). No inventes documentos. Si una prueba que el abogado debería tener no está, indícalo: "[PRUEBA POR APORTAR: <qué se necesita>]".',
    '',
    '8) NO comentarios meta-textuales. El primer carácter de tu salida es la primera palabra del documento mismo. Sin "Aquí está…", sin "Espero que…", sin notas al final que rompan formalidad.',
    '',
    'FORMATO DE SALIDA: Markdown profesional — "## TÍTULO DE SECCIÓN" (romanos en mayúsculas), "### Subtítulo" para subsecciones, **negrita** para énfasis sobrio, listas numeradas o con "- " cuando ayuden a la legibilidad. Sin frontmatter, sin code-fences, sin "```markdown".',
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

      // === RAG: recuperar MARCO NORMATIVO real desde el corpus vectorizado ===
      //
      // Construimos un query enriquecido con tipo de documento, materia, partes
      // y hechos del caso. La IA luego DEBE citar SOLO desde estas fuentes
      // (regla 2 del system prompt). Sin esto, los artículos se alucinan.
      const ragQueryParts = [
        DOC_LABELS[body.docType],
        body.specialty || '',
        c.title,
        c.description || '',
        merged.hechos || merged.consulta || merged.asunto || '',
        merged.pretension || merged.tesis || '',
      ].filter((s) => s && String(s).trim().length > 0);
      const ragQuery = ragQueryParts.join(' \n ').slice(0, 1500);
      const legalSources = await retrieveLegalContext(ragQuery, 15, c.country.code);

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
        '',
        `=== MARCO NORMATIVO (extractos REALES del ordenamiento de ${c.country.nameEs}, recuperados del corpus oficial vectorizado de este sistema) ===`,
        formatLegalSources(legalSources),
        '',
        `IMPORTANTE: cuando cites artículos legales en tu documento, prefiere fuentes presentes en MARCO NORMATIVO arriba. Si necesitas una norma que no aparece, no la inventes — usa "[CITA POR VERIFICAR: ...]" según la regla 2 del sistema.`,
        body.customInstructions ? `\n=== INSTRUCCIONES ADICIONALES ===\n${body.customInstructions}` : '',
        '',
        `Genera el documento "${DOC_LABELS[body.docType]}" con el nivel de extensión, profundidad y formalidad descritos en las reglas del sistema. No omitas secciones. Desarrolla cada fundamento de derecho con subsunción al caso.`,
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
          legalSourcesUsed: legalSources.length,
        });

        // Emitir metadata RAG para que el frontend pueda mostrar "X fuentes legales usadas"
        if (legalSources.length > 0) {
          send('legal-sources', {
            count: legalSources.length,
            titles: legalSources.map((s) => s.normTitle).slice(0, 10),
          });
        }

        // Streaming unificado: el wrapper traduce SSE de Anthropic a chunks
        // con shape OpenAI, así que el loop es idéntico para ambos providers.
        const stream = await aiClient.streamChat({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 16000,  // documentos extensos: demanda, recurso, informe legal
        });
        for await (const chunk of stream) {
          const delta = chunk?.choices?.[0]?.delta?.content;
          if (delta) send('chunk', { content: delta });
        }

        send('done', { ok: true, legalSourcesUsed: legalSources.length });
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

  // ───────────────────────────────────────────────────────────────────────
  // POST /cases/:id/deep-analysis  (SSE)
  //
  // Análisis legal profundo del caso completo. NO genera un documento para
  // firmar — produce un dictamen interno estructurado en 8 secciones que un
  // socio senior usaría para evaluar y decidir cómo encarar el caso.
  //
  // Combina:
  //   • Toda la información del caso (título, descripción, cliente, número)
  //   • Hasta 8 documentos del expediente (excerpts de 2500 chars c/u)
  //   • Cronología de eventos
  //   • Cerebro del caso si existe (síntesis multi-doc previa)
  //   • MARCO NORMATIVO con RAG sobre corpus oficial (top 20 fuentes reales)
  //
  // Salida: markdown estructurado streameado por SSE.
  // ───────────────────────────────────────────────────────────────────────
  fastify.post<{ Params: { id: string } }>(
    '/cases/:id/deep-analysis',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const startedAt = Date.now();
      const userId = (request.user as any).id;

      const c = await loadCaseForGeneration(request.params.id, userId);
      if (!c) return reply.code(404).send({ error: 'CASE_NOT_FOUND' });

      // Cargar cerebro previo si existe (síntesis multi-doc anterior)
      const brainRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT metadata->'brain' AS brain FROM public.cases WHERE id = $1 LIMIT 1`,
        request.params.id,
      );
      const priorBrain = brainRows[0]?.brain ?? null;

      const aiClient = await getAiClient();

      // Construir query RAG enriquecido para MARCO NORMATIVO
      const ragQuery = [
        c.title,
        c.description || '',
        ...c.documents.slice(0, 3).map((d) => d.title),
        priorBrain?.summary || '',
      ].filter(Boolean).join(' \n ').slice(0, 2000);
      const legalSources = await retrieveLegalContext(ragQuery, 20, c.country.code);

      // System prompt del especialista legal
      const systemPrompt = [
        `Eres un(a) abogado(a) socio(a) senior de una firma legal de prestigio mundial, especialista en el sistema ${c.country.legalSystem === 'common_law' ? 'common law' : 'civil law'} de ${c.country.nameEs}, con 25+ años de experiencia litigando, asesorando y dictaminando.`,
        '',
        'TAREA: producir un DICTAMEN INTERNO de análisis profundo del caso que se te presenta. Este no es un escrito para el juzgado — es un análisis exhaustivo que el equipo del estudio jurídico usará para evaluar el caso y decidir cómo proceder. La calidad esperada es la de un memorándum que un Senior Partner firmaría.',
        '',
        'ESTRUCTURA OBLIGATORIA — 8 SECCIONES NUMERADAS:',
        '',
        '## I. RESUMEN EJECUTIVO',
        '(2-3 párrafos densos: qué caso es, qué se busca, etapa actual, posición probable, recomendación general. Sin rodeos.)',
        '',
        '## II. HECHOS RELEVANTES',
        '(Cronología numerada de los hechos PROBADOS o ALEGADOS. Cita las fuentes documentales del expediente — "según [Documento N]: …". No inventes hechos.)',
        '',
        '## III. MARCO NORMATIVO APLICABLE',
        '(Lista las normas aplicables al caso, una por bloque. Para cada una: nombre exacto + número de artículo + texto/extracto + por qué aplica. CITA ÚNICAMENTE artículos presentes en el bloque "MARCO NORMATIVO" del usuario, o normas universalmente verificables — si no estás seguro de un número, usa "[CITA POR VERIFICAR]". Cubre Constitución, leyes orgánicas, códigos, reglamentos y jurisprudencia relevante.)',
        '',
        '## IV. ANÁLISIS JURÍDICO',
        '(Subsunción de los hechos a cada norma de la sección III. Una sub-sección por norma: cómo encajan los hechos en el supuesto, qué consecuencia jurídica se sigue, qué doctrina o precedentes apoyan/contradicen. Argumenta — no te limites a citar.)',
        '',
        '## V. FORTALEZAS Y DEBILIDADES (FODA JURÍDICO)',
        '(Cuatro sub-secciones: ### Fortalezas — argumentos sólidos a favor; ### Debilidades — puntos vulnerables propios; ### Oportunidades — palancas tácticas; ### Amenazas — riesgos del proceso o estrategia contraria probable. Lista priorizada con explicación corta.)',
        '',
        '## VI. RIESGOS Y PLAZOS CRÍTICOS',
        '(Plazos procesales vigentes, prescripciones, caducidades, fechas de audiencias programadas o por programar, riesgos de costas, riesgos penales/disciplinarios. Cada riesgo con su mitigación recomendada.)',
        '',
        '## VII. ESTRATEGIA RECOMENDADA',
        '(Tres horizontes: ### Corto plazo (0-30 días) — acciones inmediatas; ### Mediano plazo (1-6 meses) — desarrollo procesal; ### Largo plazo (>6 meses) — escenarios finales y salidas alternativas como mediación o transacción. Decisiones tácticas concretas con su razón legal.)',
        '',
        '## VIII. PLAN DE ACCIÓN INMEDIATO',
        '(5-10 acciones priorizadas para los próximos 7 días, con responsable sugerido y deadline. Tabla o lista numerada con prioridad ALTA/MEDIA/BAJA.)',
        '',
        'REGLAS:',
        '1) NO inventes nombres, fechas, montos ni precedentes. Si un dato no aparece en el expediente, no lo asumas.',
        '2) NO uses placeholders genéricos ("NN", "[NOMBRE]"). Usa los datos reales o marca explícitamente "[DATO REQUERIDO: ...]".',
        '3) CITA con precisión los documentos del expediente cuando los uses como fuente fáctica.',
        '4) CITA con precisión los artículos legales — solo los confirmables — y marca "[CITA POR VERIFICAR]" si dudas.',
        '5) NO comentarios meta-textuales. El primer carácter es la primera palabra del dictamen.',
        '',
        'FORMATO: Markdown profesional. "## Título" para secciones I-VIII, "### Subtítulo" para sub-secciones, **negrita** sobria, listas numeradas/bullets donde mejoren la legibilidad. Extensión esperada: 1500-3500 palabras — exhaustivo, no superficial.',
      ].join('\n');

      const docContext = c.documents
        .map((d, i) => {
          const excerpt = d.excerpt.slice(0, 2500);
          return `[Documento ${i + 1}] ${d.title}\n${excerpt}`;
        })
        .join('\n\n');
      const eventContext = c.events
        .map((e) => `- ${new Date(e.startTime).toISOString().slice(0, 10)} ${e.type}: ${e.title}${e.description ? ' — ' + e.description : ''}`)
        .join('\n');

      const brainContext = priorBrain
        ? [
            `Síntesis previa del cerebro del caso (referencia, no la repitas literal):`,
            `- Resumen: ${(priorBrain.summary || '').slice(0, 800)}`,
            `- Partes: ${(priorBrain.parties || []).map((p: any) => `${p.name} (${p.role})`).slice(0, 8).join(', ')}`,
            `- Riesgo declarado: ${priorBrain.riskLevel}`,
            `- Vacíos identificados: ${(priorBrain.gaps || []).slice(0, 5).join(' | ')}`,
          ].join('\n')
        : '(sin cerebro previo)';

      const userPrompt = [
        '=== CASO ===',
        `Título: ${c.title}`,
        c.caseNumber ? `Número de causa: ${c.caseNumber}` : '',
        c.clientName ? `Cliente: ${c.clientName}` : '',
        c.description ? `Descripción inicial:\n${c.description}` : '',
        '',
        `=== DOCUMENTOS DEL EXPEDIENTE (${c.documents.length}) ===`,
        docContext || '(sin documentos cargados)',
        '',
        `=== CRONOLOGÍA DE EVENTOS ===`,
        eventContext || '(sin eventos)',
        '',
        '=== CEREBRO DEL CASO (referencia) ===',
        brainContext,
        '',
        `=== MARCO NORMATIVO (${legalSources.length} extractos reales del corpus oficial de ${c.country.nameEs}) ===`,
        formatLegalSources(legalSources),
        '',
        'Genera el DICTAMEN INTERNO ahora, con las 8 secciones, extensivo y riguroso. Aplica estrictamente las reglas del sistema.',
      ].filter(Boolean).join('\n');

      // Headers SSE
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

      let chars = 0;
      try {
        send('start', {
          caseId: c.id,
          country: c.country.code,
          model: aiClient.model,
          provider: aiClient.provider,
          documents: c.documents.length,
          events: c.events.length,
          legalSourcesUsed: legalSources.length,
          hasBrain: !!priorBrain,
        });
        if (legalSources.length > 0) {
          send('legal-sources', {
            count: legalSources.length,
            titles: legalSources.map((s) => s.normTitle).slice(0, 15),
          });
        }

        const stream = await aiClient.streamChat({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.25,
          max_tokens: 16000,
        });
        for await (const chunk of stream) {
          const delta = chunk?.choices?.[0]?.delta?.content;
          if (delta) {
            chars += delta.length;
            send('chunk', { content: delta });
          }
        }

        send('done', {
          ok: true,
          chars,
          legalSourcesUsed: legalSources.length,
          durationMs: Date.now() - startedAt,
        });

        // Audit
        const { logActivityAsync } = await import('../lib/audit.js');
        logActivityAsync(userId, 'DEEP_ANALYSIS_COMPLETED', 'case', c.id, {
          caseId: c.id,
          documents: c.documents.length,
          legalSourcesUsed: legalSources.length,
          chars,
          durationMs: Date.now() - startedAt,
          model: aiClient.model,
        });
      } catch (err: any) {
        request.log.error({ err }, 'deep-analysis failed');
        send('error', { message: err?.message ?? 'AI error' });
        const { logActivityAsync } = await import('../lib/audit.js');
        logActivityAsync(userId, 'DEEP_ANALYSIS_COMPLETED', 'case', c.id, {
          caseId: c.id, durationMs: Date.now() - startedAt,
        }, false, err?.message);
      } finally {
        reply.raw.end();
      }
      return reply;
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
