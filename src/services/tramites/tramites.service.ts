/**
 * Agente de Trámites — servicio.
 *
 * Genera el borrador de un trámite tipo a partir de campos estructurados:
 *   1. Valida los campos obligatorios.
 *   2. (Opcional) recupera normativa del corpus jurídico.
 *   3. Redacta el borrador con el LLM.
 *   4. Verifica las citas del borrador contra el corpus (anti-alucinación).
 *
 * El borrador SIEMPRE se persiste con review_status='borrador'. La
 * revisión humana es obligatoria: el trámite no es utilizable hasta que
 * el abogado lo marca 'aprobado'.
 */
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { getAiClient } from '../../lib/ai-client.js';
import { retrieveLegalContextForChat } from '../legal-rag-retrieval.service.js';
import { verifyCitationsInText } from '../legal/citation-verification.service.js';
import { TRAMITE_CATALOG, getTramiteType } from './catalog.js';
import type { TramiteRun, TramiteCitation, TramiteType } from './types.js';

// ─── CATÁLOGO ──────────────────────────────────────────────────────────────

/** Metadata del catálogo para el frontend (sin la mecánica de prompts). */
export function listTramiteCatalog() {
  return TRAMITE_CATALOG.map((t) => ({
    key: t.key,
    name: t.name,
    description: t.description,
    icon: t.icon,
    category: t.category,
    useRag: t.useRag,
    fields: t.fields,
  }));
}

// ─── GENERACIÓN ────────────────────────────────────────────────────────────

interface GenerateOptions {
  userId: string;
  caseId?: string | null;
  tramiteKey: string;
  inputs: Record<string, string>;
}

function interpolate(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => ctx[key] ?? '');
}

/** Valida los campos obligatorios del trámite. Lanza si falta alguno. */
function validateInputs(type: TramiteType, inputs: Record<string, string>): void {
  const missing = type.fields
    .filter((f) => f.required && !(inputs[f.key] || '').trim())
    .map((f) => f.label);
  if (missing.length > 0) {
    throw new Error(`Faltan campos obligatorios: ${missing.join(', ')}.`);
  }
}

export async function generateTramite(opts: GenerateOptions): Promise<TramiteRun> {
  const type = getTramiteType(opts.tramiteKey);
  if (!type) throw new Error('Trámite no encontrado en el catálogo.');

  // Solo conservamos los valores de campos declarados, recortados.
  const inputs: Record<string, string> = {};
  for (const f of type.fields) {
    inputs[f.key] = (opts.inputs?.[f.key] || '').trim().slice(0, 8_000);
  }
  validateInputs(type, inputs);

  const startedAt = Date.now();

  // 1) Contexto normativo del corpus.
  let ragBlock = '';
  if (type.useRag) {
    const query = [type.name, ...Object.values(inputs)].join(' ').slice(0, 1_000);
    try {
      const r = await retrieveLegalContextForChat(query, { limit: 8, filterCountryCode: 'EC' });
      if (r.formattedPrompt) {
        ragBlock = `\nCONTEXTO NORMATIVO (corpus jurídico de Ecuador):\n${r.formattedPrompt}\n`;
      }
    } catch {
      ragBlock = '';
    }
  }

  // 2) Redacción del borrador.
  const userPrompt = interpolate(type.promptTemplate, { ...inputs, rag: ragBlock });
  const ai = await getAiClient();
  const completion = await ai.chat.completions.create({
    messages: [
      { role: 'system', content: type.systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 2800,
  });
  const draft = completion.choices[0]?.message?.content?.trim() || '';
  if (draft.length < 40) {
    throw new Error('El modelo no devolvió un borrador utilizable. Reintentá.');
  }

  // 3) Verificación de citas contra el corpus.
  let citations: TramiteCitation[] = [];
  try {
    const cv = await verifyCitationsInText(draft);
    citations = cv.normsVerified.map((n) => ({
      title: n.title,
      hierarchy: n.hierarchy,
      pdfUrl: n.pdfUrl,
    }));
  } catch {
    citations = [];
  }

  const durationMs = Date.now() - startedAt;
  const id = randomUUID();

  // 4) Persistencia — review_status arranca SIEMPRE en 'borrador'.
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.tramite_runs
       (id, user_id, case_id, tramite_key, tramite_name, inputs, draft,
        review_status, citations, used_rag, duration_ms)
     VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb, $7, 'borrador', $8::jsonb, $9, $10)`,
    id, opts.userId, opts.caseId ?? null, type.key, type.name,
    JSON.stringify(inputs), draft, JSON.stringify(citations),
    type.useRag, durationMs,
  );

  return {
    id,
    caseId: opts.caseId ?? null,
    tramiteKey: type.key,
    tramiteName: type.name,
    inputs,
    draft,
    reviewedContent: null,
    reviewStatus: 'borrador',
    citations,
    usedRag: type.useRag,
    durationMs,
    generatedAt: new Date().toISOString(),
    reviewedAt: null,
  };
}

// ─── CONSULTAS Y REVISIÓN ──────────────────────────────────────────────────

function rowToRun(r: any): TramiteRun {
  return {
    id: r.id,
    caseId: r.case_id,
    tramiteKey: r.tramite_key,
    tramiteName: r.tramite_name,
    inputs: r.inputs || {},
    draft: r.draft,
    reviewedContent: r.reviewed_content,
    reviewStatus: r.review_status,
    citations: Array.isArray(r.citations) ? r.citations : [],
    usedRag: r.used_rag,
    durationMs: Number(r.duration_ms ?? 0),
    generatedAt: r.generated_at,
    reviewedAt: r.reviewed_at,
  };
}

export async function listTramiteRuns(userId: string, limit = 30): Promise<TramiteRun[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, case_id, tramite_key, tramite_name, inputs, draft, reviewed_content,
            review_status, citations, used_rag, duration_ms, generated_at, reviewed_at
       FROM public.tramite_runs
      WHERE user_id = $1
      ORDER BY generated_at DESC
      LIMIT $2`,
    userId, Math.min(100, limit),
  );
  return rows.map(rowToRun);
}

export async function getTramiteRun(userId: string, id: string): Promise<TramiteRun | null> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, case_id, tramite_key, tramite_name, inputs, draft, reviewed_content,
            review_status, citations, used_rag, duration_ms, generated_at, reviewed_at
       FROM public.tramite_runs
      WHERE id = $1::uuid AND user_id = $2`,
    id, userId,
  );
  return rows.length > 0 ? rowToRun(rows[0]) : null;
}

interface ReviewUpdate {
  /** Contenido revisado por el abogado (reemplaza al borrador como versión final). */
  reviewedContent?: string;
  /** Si true, marca el trámite como aprobado. */
  approve?: boolean;
}

/**
 * Guarda la revisión del abogado. Aprobar exige que exista contenido
 * revisado o borrador — no se aprueba un trámite vacío.
 */
export async function updateTramiteReview(
  userId: string,
  id: string,
  update: ReviewUpdate,
): Promise<TramiteRun | null> {
  const current = await getTramiteRun(userId, id);
  if (!current) return null;

  const reviewedContent =
    update.reviewedContent !== undefined
      ? update.reviewedContent.trim().slice(0, 200_000)
      : current.reviewedContent;

  let reviewStatus = current.reviewStatus;
  let approveNow = false;
  if (update.approve) {
    const finalText = reviewedContent || current.draft || '';
    if (finalText.trim().length < 40) {
      throw new Error('No se puede aprobar un trámite sin contenido revisado.');
    }
    reviewStatus = 'aprobado';
    approveNow = true;
  }

  await prisma.$executeRawUnsafe(
    `UPDATE public.tramite_runs
        SET reviewed_content = $3,
            review_status = $4,
            reviewed_at = CASE WHEN $5 THEN now() ELSE reviewed_at END
      WHERE id = $1::uuid AND user_id = $2`,
    id, userId, reviewedContent, reviewStatus, approveNow,
  );

  return getTramiteRun(userId, id);
}
