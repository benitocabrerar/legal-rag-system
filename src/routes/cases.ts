import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { getAiClient } from '../lib/ai-client.js';

const extraFields = {
  legalMatter: z.string().max(80).optional().nullable(),
  actionType: z.string().max(100).optional().nullable(),
  jurisdiction: z.string().max(120).optional().nullable(),
  judicialProcessNumber: z.string().max(80).optional().nullable(),
  courtName: z.string().max(300).optional().nullable(),
  courtUnit: z.string().max(200).optional().nullable(),
  judgeName: z.string().max(200).optional().nullable(),
  prosecutorName: z.string().max(200).optional().nullable(),
  opposingParty: z.string().max(300).optional().nullable(),
  relatedLaws: z.array(z.string()).optional().nullable(),
  amountClaimed: z.number().nullable().optional(),
  currency: z.string().max(10).optional().nullable(),
  filedAt: z.string().optional().nullable(),
  nextHearingAt: z.string().optional().nullable(),
  proceduralStage: z.string().max(120).optional().nullable(),
  keyDates: z.array(z.object({ label: z.string(), date: z.string(), description: z.string().optional() })).optional().nullable(),
  factsSummary: z.string().optional().nullable(),
};

const createCaseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  clientName: z.string().min(1),
  caseNumber: z.string().optional(),
  status: z.enum(['active', 'pending', 'closed']).default('active'),
  // ISO-3166 alpha-2; si NULL el trigger DB hereda de users.preferred_country_code
  countryCode: z.string().regex(/^[A-Z]{2}$/).optional().nullable(),
  ...extraFields,
});

const updateCaseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  clientName: z.string().min(1).optional(),
  caseNumber: z.string().optional(),
  status: z.enum(['active', 'pending', 'closed']).optional(),
  ...extraFields,
});

const FIELD_DB_MAP: Record<string, string> = {
  title: 'title',
  description: 'description',
  clientName: 'client_name',
  caseNumber: 'case_number',
  status: 'status',
  countryCode: 'country_code',
  legalMatter: 'legal_matter',
  actionType: 'action_type',
  jurisdiction: 'jurisdiction',
  judicialProcessNumber: 'judicial_process_number',
  courtName: 'court_name',
  courtUnit: 'court_unit',
  judgeName: 'judge_name',
  prosecutorName: 'prosecutor_name',
  opposingParty: 'opposing_party',
  relatedLaws: 'related_laws',
  amountClaimed: 'amount_claimed',
  currency: 'currency',
  filedAt: 'filed_at',
  nextHearingAt: 'next_hearing_at',
  proceduralStage: 'procedural_stage',
  keyDates: 'key_dates',
  factsSummary: 'facts_summary',
};

function rowToCase(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    description: r.description,
    clientName: r.client_name,
    caseNumber: r.case_number,
    status: r.status,
    countryCode: r.country_code,
    legalMatter: r.legal_matter,
    actionType: r.action_type,
    jurisdiction: r.jurisdiction,
    judicialProcessNumber: r.judicial_process_number,
    courtName: r.court_name,
    courtUnit: r.court_unit,
    judgeName: r.judge_name,
    prosecutorName: r.prosecutor_name,
    opposingParty: r.opposing_party,
    relatedLaws: r.related_laws || [],
    amountClaimed: r.amount_claimed != null ? Number(r.amount_claimed) : null,
    currency: r.currency,
    filedAt: r.filed_at,
    nextHearingAt: r.next_hearing_at,
    proceduralStage: r.procedural_stage,
    keyDates: r.key_dates || [],
    factsSummary: r.facts_summary,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function caseRoutes(fastify: FastifyInstance) {
  // Create new case (con campos extendidos)
  fastify.post('/cases', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const body = createCaseSchema.parse(request.body);
      const userId = (request.user as any).id;

      // Prisma client siempre maneja las columnas core (compatibilidad)
      const baseCase = await prisma.case.create({
        data: {
          title: body.title,
          description: body.description,
          clientName: body.clientName,
          caseNumber: body.caseNumber,
          status: body.status,
          userId,
        },
      });

      // Si hay campos extendidos, hacer UPDATE adicional via raw SQL.
      // El trigger DB ya pobló country_code desde users.preferred_country_code;
      // si el cliente envió countryCode explícito, lo sobreescribe aquí.
      const extras: Array<[string, any]> = [];
      for (const [k, v] of Object.entries(body)) {
        if (['title','description','clientName','caseNumber','status'].includes(k)) continue;
        if (v === undefined) continue;
        const col = FIELD_DB_MAP[k];
        if (!col) continue;
        extras.push([col, v]);
      }
      if (extras.length > 0) {
        const sets: string[] = [];
        const params: any[] = [];
        let i = 1;
        for (const [col, val] of extras) {
          if (col === 'related_laws') {
            sets.push(`${col} = $${i++}::text[]`);
            params.push(val || null);
          } else if (col === 'key_dates') {
            sets.push(`${col} = $${i++}::jsonb`);
            params.push(val ? JSON.stringify(val) : null);
          } else {
            sets.push(`${col} = $${i++}`);
            params.push(val);
          }
        }
        params.push(baseCase.id);
        await prisma.$executeRawUnsafe(
          `UPDATE public.cases SET ${sets.join(', ')}, updated_at = now() WHERE id = $${i}`,
          ...params
        );
      }

      const full = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM public.cases WHERE id = $1`,
        baseCase.id
      );
      return reply.send({ case: rowToCase(full[0]) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get all cases for user
  fastify.get('/cases', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;
      const { status, limit = 50, offset = 0 } = request.query as any;

      const where: any = { userId };
      if (status) {
        where.status = status;
      }

      // Raw query para incluir metadata jsonb + campos extendidos
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT
           c.*,
           (SELECT COUNT(*)::int FROM public.documents d WHERE d.case_id = c.id) AS doc_count
         FROM public.cases c
         WHERE c.user_id = $1
         ${status ? `AND c.status = '${String(status).replace(/'/g, "''")}'` : ''}
         ORDER BY c.created_at DESC
         LIMIT $2 OFFSET $3`,
        userId,
        parseInt(limit),
        parseInt(offset)
      );
      const cases = rows.map((r) => ({
        ...rowToCase(r),
        _count: { documents: r.doc_count },
        aiSummary: r.metadata?.aiSummary || null,
        legalType: r.legal_matter ? r.legal_matter.toLowerCase() : undefined,
      }));

      return reply.send({ cases });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get case by ID — incluye campos extendidos
  fastify.get('/cases/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM public.cases WHERE id = $1 AND user_id = $2`,
        id, userId
      );
      if (rows.length === 0) return reply.code(404).send({ error: 'Case not found' });

      const docs = await prisma.document.findMany({
        where: { caseId: id, userId },
        select: { id: true, title: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: 'desc' },
      });

      const caseObj: any = rowToCase(rows[0]);
      caseObj.documents = docs;
      return reply.send({ case: caseObj });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ============================================================================
  // COHERENCE CHECK: detecta inconsistencias entre los datos del caso
  // ============================================================================
  fastify.post('/cases/:id/validate-coherence', {
    onRequest: [fastify.authenticate],
    schema: { body: { type: 'object', additionalProperties: true } },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const caseRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM public.cases WHERE id = $1 AND user_id = $2`,
        id, userId
      );
      if (caseRows.length === 0) return reply.code(404).send({ error: 'Case not found' });
      const c = caseRows[0];

      const docs = await prisma.$queryRawUnsafe<any[]>(
        `SELECT title, LEFT(content, 4000) AS excerpt
         FROM public.documents WHERE case_id = $1 AND user_id = $2
         ORDER BY created_at DESC LIMIT 4`,
        id, userId
      );

      // Heurísticas locales sin IA (rápidas, deterministas)
      const warnings: Array<{ field: string; severity: 'high' | 'medium' | 'low'; message: string; suggested?: string }> = [];

      const matterLower = (c.legal_matter || '').toLowerCase();
      const titleLower = (c.title || '').toLowerCase();
      const descLower = (c.description || '').toLowerCase();
      const haystack = `${titleLower} ${descLower} ${docs.map(d => (d.excerpt || '').toLowerCase()).join(' ')}`;

      const matterKeywords: Record<string, string[]> = {
        Penal: ['peculado','lavado de activos','coip','delito','imputado','procesado','fiscal','fiscalía','denuncia penal','medidas cautelares','prisión preventiva','art. 278','art. 317','art. 370','asociación ilícita','cohecho','dolo','tipicidad','culpabilidad'],
        Civil: ['demanda civil','contrato','obligación','divorcio','sucesión','inquilinato','arrendamiento','daños y perjuicios','responsabilidad civil','herencia','propiedad','codigo civil','código civil','art. 117'],
        Laboral: ['despido','intempestivo','utilidades','décimos','vacaciones','jornada','salario','sindicato','huelga','iess','código del trabajo','codigo del trabajo','art. 188','art. 172','indemnización laboral','reintegro','liquidación'],
        Tributario: ['sri','impuesto','tributario','iva','renta','contribución','tasa','glosa','reclamo tributario','obligación tributaria','agente de retención'],
        Constitucional: ['acción de protección','hábeas corpus','hábeas data','garantías constitucionales','corte constitucional','vulneración de derechos','sentencia constitucional','dictamen','ratio decidendi'],
        Administrativo: ['acto administrativo','contratación pública','sercop','silencio administrativo','recurso de apelación administrativa','jerárquico','cogep','procedimiento administrativo'],
        Familia: ['alimentos','tenencia','régimen de visitas','divorcio','niñez','adolescencia','filiación','patria potestad'],
        'Niñez y Adolescencia': ['niño','adolescente','interés superior','tenencia','alimentos','adopción'],
        Tránsito: ['tránsito','accidente','contravención','licencia de conducir','colisión','pérdida de puntos'],
        Mercantil: ['compañías','sociedad','quiebra','concordato','letra de cambio','pagaré','factura comercial','propiedad intelectual'],
      };

      // 1) Materia declarada vs contenido
      let bestMatter: string | null = null;
      let bestScore = 0;
      for (const [matter, kws] of Object.entries(matterKeywords)) {
        const hits = kws.reduce((acc, kw) => acc + (haystack.includes(kw) ? 1 : 0), 0);
        if (hits > bestScore) { bestScore = hits; bestMatter = matter; }
      }
      if (c.legal_matter && bestMatter && bestMatter.toLowerCase() !== matterLower && bestScore >= 3) {
        warnings.push({
          field: 'legalMatter',
          severity: 'high',
          message: `La materia declarada es "${c.legal_matter}" pero el contenido del caso indica "${bestMatter}" (${bestScore} keywords detectadas).`,
          suggested: bestMatter,
        });
      }
      if (!c.legal_matter && bestMatter) {
        warnings.push({
          field: 'legalMatter',
          severity: 'medium',
          message: `No se ha establecido la materia. Por el contenido sugerimos "${bestMatter}".`,
          suggested: bestMatter,
        });
      }

      // 2) Tipo de acción vs materia
      if (c.legal_matter === 'Penal' && c.action_type && /demanda|reclamo/i.test(c.action_type)) {
        warnings.push({
          field: 'actionType',
          severity: 'medium',
          message: `En materia penal lo correcto suele ser "Denuncia" o "Querella", no "${c.action_type}".`,
          suggested: 'Denuncia',
        });
      }
      if (c.legal_matter === 'Laboral' && c.action_type && /denuncia|querella/i.test(c.action_type)) {
        warnings.push({
          field: 'actionType',
          severity: 'medium',
          message: `En materia laboral usualmente se presenta "Demanda", no "${c.action_type}".`,
          suggested: 'Demanda',
        });
      }

      // 3) Tribunal coherente con materia
      if (c.court_name && c.legal_matter) {
        const cn = c.court_name.toLowerCase();
        const expected: Record<string, string> = {
          Penal: 'penal',
          Laboral: 'trabajo',
          Civil: 'civil',
          Tributario: 'fiscal',
          Constitucional: 'constitucional',
          Familia: 'familia',
        };
        const exp = expected[c.legal_matter];
        if (exp && !cn.includes(exp) && !cn.includes('garantías')) {
          warnings.push({
            field: 'courtName',
            severity: 'low',
            message: `El tribunal "${c.court_name}" no parece típico de materia ${c.legal_matter}.`,
          });
        }
      }

      // 4) Normas relacionadas vs materia
      const lawsStr = (c.related_laws || []).join(' ').toLowerCase();
      if (lawsStr) {
        if (c.legal_matter === 'Penal' && !/coip|penal/i.test(lawsStr)) {
          warnings.push({
            field: 'relatedLaws',
            severity: 'medium',
            message: `Materia Penal pero las normas no incluyen COIP. Revisar.`,
          });
        }
        if (c.legal_matter === 'Laboral' && !/trabajo|laboral|loct|losep/i.test(lawsStr)) {
          warnings.push({
            field: 'relatedLaws',
            severity: 'medium',
            message: `Materia Laboral pero las normas no incluyen Código del Trabajo o LOSEP.`,
          });
        }
        if (c.legal_matter === 'Civil' && !/civil/i.test(lawsStr)) {
          warnings.push({
            field: 'relatedLaws',
            severity: 'low',
            message: `Materia Civil pero las normas no incluyen el Código Civil.`,
          });
        }
      }

      // 5) Datos mínimos
      if (!c.title) warnings.push({ field: 'title', severity: 'high', message: 'Falta título del caso.' });
      if (!c.client_name) warnings.push({ field: 'clientName', severity: 'high', message: 'Falta nombre del cliente.' });
      if (!c.legal_matter) warnings.push({ field: 'legalMatter', severity: 'high', message: 'Falta materia/área legal.' });
      if (docs.length > 0 && !c.judicial_process_number && c.legal_matter) {
        warnings.push({ field: 'judicialProcessNumber', severity: 'low', message: 'Tienes documentos pero no se ha registrado el N° de proceso.' });
      }

      // 6) Fechas absurdas
      if (c.next_hearing_at) {
        const d = new Date(c.next_hearing_at);
        if (d < new Date()) {
          warnings.push({ field: 'nextHearingAt', severity: 'medium', message: `La próxima audiencia (${d.toLocaleDateString('es-EC')}) ya pasó. Actualizar.` });
        }
      }

      const coherenceScore = Math.max(0, 100 - warnings.reduce((acc, w) =>
        acc + (w.severity === 'high' ? 25 : w.severity === 'medium' ? 12 : 5), 0));

      return reply.send({
        coherenceScore,
        warnings,
        detectedMatter: bestMatter,
        currentMatter: c.legal_matter,
        documentsAnalyzed: docs.length,
      });
    } catch (e: any) {
      fastify.log.error(e);
      return reply.code(500).send({ error: e.message });
    }
  });

  // ============================================================================
  // AI PREVIEW from uploaded file — extrae texto del archivo y dispara preview
  // (no persiste nada; solo devuelve datos al modal de Nuevo Caso)
  // ============================================================================
  fastify.post('/cases/preview-from-file', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      if (!request.isMultipart || !request.isMultipart()) {
        return reply.code(400).send({ error: 'multipart requerido' });
      }
      const { extractText } = await import('../lib/extract-text.js');
      const parts = (request as any).parts();
      let buffer: Buffer | null = null;
      let mimeType = 'application/octet-stream';
      let filename = 'archivo';
      for await (const part of parts) {
        if (part.file) {
          buffer = await part.toBuffer();
          mimeType = part.mimetype || mimeType;
          filename = part.filename || filename;
          break;
        }
      }
      if (!buffer) return reply.code(400).send({ error: 'archivo requerido' });

      const ext = await extractText(buffer, mimeType, filename);
      const text = (ext.text || '').slice(0, 12000);
      if (text.length < 50) {
        return reply.code(400).send({ error: 'No se pudo extraer suficiente texto del archivo' });
      }

      const aiClient = await getAiClient();
      const completion = await aiClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Eres un asistente legal ecuatoriano. Devuelve solo JSON con esta forma:
{
  "title": "título 8-15 palabras",
  "clientName": "cliente o null",
  "legal_matter": "Penal | Civil | Laboral | Tributario | Constitucional | Administrativo | Familia | Niñez | Tránsito | Mercantil | Otro",
  "action_type": "Demanda | Denuncia | Querella | etc o null",
  "jurisdiction": "provincia o null",
  "judicial_process_number": "nº juicio o null",
  "court_name": "tribunal o null",
  "judge_name": "juez o null",
  "prosecutor_name": "fiscal o null",
  "opposing_party": "contraparte o null",
  "related_laws": ["Art. X de la Y", "..."],
  "amount_claimed": numérico o null,
  "filed_at": "YYYY-MM-DD o null",
  "procedural_stage": "etapa o null",
  "facts_summary": "2-3 oraciones",
  "priority": "low | medium | high",
  "description": "descripción larga"
}`,
          },
          { role: 'user', content: `# Documento (${filename})\n\n${text}\n\nGenera el JSON.` },
        ],
        temperature: 0.1,
        max_tokens: 2500,
      });
      const raw = completion.choices?.[0]?.message?.content || '';
      let parsed;
      try {
        const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        return reply.code(500).send({ error: 'IA no devolvió JSON válido', raw: raw.slice(0, 500) });
      }
      return reply.send({
        extracted: parsed,
        extractionMethod: ext.method,
        textChars: text.length,
        filename,
        mimeType,
        model: aiClient.model,
      });
    } catch (e: any) {
      fastify.log.error(e);
      return reply.code(500).send({ error: e.message });
    }
  });

  // ============================================================================
  // AI PREVIEW from raw text — para usar en el modal "Nuevo caso" (sin caseId)
  // ============================================================================
  fastify.post('/cases/preview-from-text', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { text } = (request.body as { text?: string }) || {};
      if (!text || text.length < 50) {
        return reply.code(400).send({ error: 'Texto demasiado corto para análisis' });
      }
      const aiClient = await getAiClient();
      const completion = await aiClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Eres un asistente legal experto en derecho ecuatoriano. Analiza el texto proporcionado y devuelve EXCLUSIVAMENTE un JSON con esta forma exacta. Si un campo no aparece, usa null.

{
  "title": "título sintético del caso (8-15 palabras)",
  "clientName": "nombre del cliente principal o null",
  "legal_matter": "Penal | Civil | Laboral | Tributario | Constitucional | Administrativo | Familia | Niñez | Tránsito | Mercantil | Otro",
  "action_type": "Demanda | Denuncia | Querella | Acción de protección | Hábeas corpus | Recurso | Reclamo | Otro",
  "jurisdiction": "Provincia (ej: Pichincha)",
  "judicial_process_number": "Nº juicio o null",
  "court_name": "Tribunal/Juzgado o null",
  "judge_name": "Juez o null",
  "prosecutor_name": "Fiscal o null",
  "opposing_party": "Parte contraria o null",
  "related_laws": ["Art. 278 COIP", "..."],
  "amount_claimed": "monto numérico o null",
  "filed_at": "YYYY-MM-DD o null",
  "procedural_stage": "Etapa procesal o null",
  "facts_summary": "resumen ejecutivo de hechos en 2-3 oraciones",
  "priority": "low | medium | high",
  "description": "descripción larga estructurada del caso"
}`,
          },
          { role: 'user', content: `# Texto a analizar\n\n${text.slice(0, 12000)}\n\nGenera el JSON.` },
        ],
        temperature: 0.1,
        max_tokens: 2500,
      });
      const raw = completion.choices?.[0]?.message?.content || '';
      let parsed;
      try {
        const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        return reply.code(500).send({ error: 'IA no devolvió JSON válido', raw: raw.slice(0, 500) });
      }
      return reply.send({ extracted: parsed, model: aiClient.model });
    } catch (e: any) {
      fastify.log.error(e);
      return reply.code(500).send({ error: e.message });
    }
  });

  // ============================================================================
  // AI EXTRACT CASE DATA: extrae metadata jurídica del caso desde sus documentos
  // ============================================================================
  fastify.post('/cases/:id/extract-case-data', {
    onRequest: [fastify.authenticate],
    bodyLimit: 10485760,
    schema: { body: { type: 'object', additionalProperties: true } },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const caseRow = await prisma.$queryRawUnsafe<any[]>(
        `SELECT title, description, client_name, status, created_at FROM public.cases WHERE id = $1 AND user_id = $2`,
        id, userId
      );
      if (caseRow.length === 0) return reply.code(404).send({ error: 'Case not found' });

      const docs = await prisma.$queryRawUnsafe<any[]>(
        `SELECT title, LEFT(content, 7000) AS excerpt
         FROM public.documents
         WHERE case_id = $1 AND user_id = $2
         ORDER BY created_at DESC
         LIMIT 6`,
        id, userId
      );
      // Si no hay docs, intentar extraer solo de la descripción
      const sourceText = docs.length > 0
        ? docs.map((d: any, i: number) => `## Documento ${i + 1}: ${d.title}\n${d.excerpt}`).join('\n\n')
        : `## Descripción del caso\n${caseRow[0].description || ''}`;

      const systemPrompt = `Eres un asistente legal experto en derecho ecuatoriano. Vas a extraer la metadata jurídica de un caso desde la información proporcionada. Devuelve EXCLUSIVAMENTE un JSON válido con esta forma exacta:

{
  "title": "título sintético del caso (ej: 'Demanda laboral por despido intempestivo - Caso Pérez')",
  "clientName": "nombre del cliente principal o null",
  "caseNumber": "número interno opcional o null",
  "judicial_process_number": "Nº de proceso/juicio judicial (ej: 17282-2026-0001G) o null",
  "legal_matter": "Materia: Penal | Civil | Laboral | Tributario | Constitucional | Administrativo | Familia | Niñez | Tránsito | Mercantil | Otro",
  "action_type": "Tipo de acción: Demanda | Denuncia | Querella | Acción de protección | Hábeas corpus | Recurso | Reclamo | Otro",
  "jurisdiction": "Provincia/jurisdicción ecuatoriana",
  "court_name": "Tribunal/Juzgado completo (ej: 'Tribunal de Garantías Penales con sede en Quito') o null",
  "court_unit": "Unidad o sala específica o null",
  "judge_name": "Nombre del juez/a o null",
  "prosecutor_name": "Nombre del fiscal asignado o null",
  "opposing_party": "Parte contraria o null",
  "related_laws": ["Art. 278 COIP", "Art. 76.4 CRE"],
  "amount_claimed": "monto cuantificado o null",
  "currency": "USD",
  "filed_at": "YYYY-MM-DD o null",
  "procedural_stage": "Etapa procesal actual (ej: Instrucción Fiscal, Audiencia Preparatoria, Juicio, Apelación) o null",
  "key_dates": [
    { "label": "evento", "date": "YYYY-MM-DD", "description": "qué pasa" }
  ],
  "facts_summary": "resumen ejecutivo de los hechos en 2-4 oraciones",
  "status": "active | pending | closed",
  "priority": "low | medium | high"
}

Si un campo no aparece en la información disponible, usa null. NO inventes. NO incluyas markdown ni texto fuera del JSON.`;

      const userPrompt = `# Información disponible

${caseRow[0].title ? `Título actual: ${caseRow[0].title}` : ''}
${caseRow[0].client_name ? `Cliente preliminar: ${caseRow[0].client_name}` : ''}

${sourceText}

Extrae la metadata jurídica completa del caso en JSON.`;

      const aiClient = await getAiClient();
      const completion = await aiClient.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      });
      const raw = completion.choices?.[0]?.message?.content || '';
      let parsed: any;
      try {
        const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        return reply.code(500).send({ error: 'IA no devolvió JSON válido', raw: raw.slice(0, 500) });
      }
      return reply.send({
        extracted: parsed,
        model: aiClient.model,
        provider: aiClient.provider,
      });
    } catch (e: any) {
      fastify.log.error(e);
      return reply.code(500).send({ error: e.message || 'Internal error' });
    }
  });

  // ============================================================================
  // AI SUMMARY: genera o devuelve cacheado un super-resumen del caso
  // ============================================================================
  fastify.post('/cases/:id/ai-summary', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { force } = (request.query as { force?: string }) || {};
      const userId = (request.user as any).id;

      const caseDoc = await prisma.case.findFirst({
        where: { id, userId },
        include: {
          documents: {
            select: { id: true, title: true, content: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });
      if (!caseDoc) return reply.code(404).send({ error: 'Case not found' });

      const meta = (caseDoc as any).metadata || {};
      const cached = meta.aiSummary;
      if (cached && force !== 'true' && cached.generatedAt) {
        const ageHours = (Date.now() - new Date(cached.generatedAt).getTime()) / (1000 * 60 * 60);
        if (ageHours < 24) {
          return reply.send({ summary: cached, cached: true });
        }
      }

      // Construir contexto compacto
      const docExcerpts = (caseDoc.documents || [])
        .map((d) => `### ${d.title}\n${(d.content || '').slice(0, 1500)}`)
        .join('\n\n');

      const systemPrompt = `Eres un asistente legal experto en derecho ecuatoriano. Vas a generar un super-resumen ejecutivo de un caso para un abogado en su panel de control. Devuelve EXCLUSIVAMENTE un JSON válido con esta forma exacta:

{
  "headline": "frase de 6-12 palabras que capture la esencia del caso",
  "teaser": "una sola línea de máximo 110 caracteres para mostrar en la tarjeta del caso",
  "summary": "resumen ejecutivo del caso de 3-5 párrafos cortos en español, redactado de manera profesional y precisa",
  "keyFacts": ["3-6 hechos clave", "cada uno conciso"],
  "legalAreas": ["áreas del derecho involucradas, ej: civil, penal, laboral"],
  "risks": ["2-4 riesgos legales o procesales detectados"],
  "nextSteps": ["3-5 próximos pasos sugeridos para el abogado"],
  "estimatedComplexity": "baja | media | alta",
  "urgency": "baja | media | alta | crítica"
}

No incluyas markdown ni texto fuera del JSON. Si la información es escasa, infiere conservadoramente y márcalo.`;

      const userPrompt = `# Caso
- Título: ${caseDoc.title}
- Cliente: ${caseDoc.clientName || 'No especificado'}
- Estado: ${caseDoc.status}
- Número de caso: ${caseDoc.caseNumber || 'No asignado'}
- Creado: ${caseDoc.createdAt.toISOString().slice(0, 10)}

# Descripción
${caseDoc.description || '(sin descripción)'}

# Documentos asociados (extractos)
${docExcerpts || '(sin documentos cargados aún)'}

Genera el super-resumen en JSON.`;

      const aiClient = await getAiClient();
      const completion = await aiClient.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const raw = completion.choices?.[0]?.message?.content || '';
      let parsed: any = null;
      try {
        const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        // si el modelo devolvió algo no JSON, hacer un fallback razonable
        parsed = {
          headline: caseDoc.title,
          teaser: (caseDoc.description || 'Sin descripción detallada disponible.').slice(0, 110),
          summary: raw.slice(0, 800) || 'No se pudo generar resumen automático.',
          keyFacts: [],
          legalAreas: [],
          risks: [],
          nextSteps: [],
          estimatedComplexity: 'media',
          urgency: 'media',
        };
      }

      const summary = {
        ...parsed,
        generatedAt: new Date().toISOString(),
        model: aiClient.model,
        provider: aiClient.provider,
      };

      // Persistir en cases.metadata.aiSummary
      const newMeta = { ...meta, aiSummary: summary };
      await prisma.$executeRawUnsafe(
        `UPDATE public.cases SET metadata = $1::jsonb, updated_at = now() WHERE id = $2`,
        JSON.stringify(newMeta),
        id
      );

      return reply.send({ summary, cached: false });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Internal server error' });
    }
  });

  // Update case
  fastify.patch('/cases/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateCaseSchema.parse(request.body);
      const userId = (request.user as any).id;

      // Verify ownership
      const owned = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM public.cases WHERE id = $1 AND user_id = $2`,
        id, userId
      );
      if (owned.length === 0) return reply.code(404).send({ error: 'Case not found' });

      const sets: string[] = [];
      const params: any[] = [];
      let i = 1;
      for (const [k, v] of Object.entries(body)) {
        if (v === undefined) continue;
        const col = FIELD_DB_MAP[k];
        if (!col) continue;
        if (col === 'related_laws') {
          sets.push(`${col} = $${i++}::text[]`);
          params.push(v || null);
        } else if (col === 'key_dates') {
          sets.push(`${col} = $${i++}::jsonb`);
          params.push(v ? JSON.stringify(v) : null);
        } else {
          sets.push(`${col} = $${i++}`);
          params.push(v === '' ? null : v);
        }
      }
      if (sets.length === 0) return reply.code(400).send({ error: 'no fields' });
      sets.push(`updated_at = now()`);
      params.push(id);

      const r = await prisma.$queryRawUnsafe<any[]>(
        `UPDATE public.cases SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
        ...params
      );
      return reply.send({ case: rowToCase(r[0]) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete case
  fastify.delete('/cases/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const caseDoc = await prisma.case.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!caseDoc) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      // Delete all documents and chunks for this case
      const documents = await prisma.document.findMany({
        where: { caseId: id },
        select: { id: true },
      });

      for (const doc of documents) {
        await prisma.documentChunk.deleteMany({
          where: { documentId: doc.id },
        });
      }

      await prisma.document.deleteMany({
        where: { caseId: id },
      });

      // Delete case
      await prisma.case.delete({
        where: { id },
      });

      return reply.send({ message: 'Case deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
