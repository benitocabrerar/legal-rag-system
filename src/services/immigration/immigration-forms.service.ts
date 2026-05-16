/**
 * Agente de Formularios de Inmigración — servicio.
 *
 * Arma un PAQUETE de preparación para un formulario USCIS a partir de
 * datos estructurados del cliente:
 *   1. Valida los campos obligatorios.
 *   2. (Opcional) recupera contexto del dominio de corpus us-immigration.
 *   3. El LLM devuelve, en un único JSON estricto, tres entregables:
 *      borrador del formulario, lista de documentos y guía de presentación.
 *   4. Persiste el paquete con review_status='borrador'.
 *
 * El paquete SIEMPRE nace como 'borrador'. NO es presentable hasta que
 * un abogado de inmigración con licencia en EE.UU. lo revisa y lo marca
 * 'revisado'. El agente asiste la preparación: no presta asesoría legal
 * (UPL) ni presenta nada ante USCIS.
 */
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { getAiClient } from '../../lib/ai-client.js';
import { retrieveLegalContextForChat } from '../legal-rag-retrieval.service.js';
import { IMMIGRATION_FORM_CATALOG, getImmigrationForm } from './form-catalog.js';
import type { FormPacket, ChecklistItem, ImmigrationForm } from './types.js';

// ─── CATÁLOGO ──────────────────────────────────────────────────────────────

/** Metadata del catálogo para el frontend (sin la mecánica del prompt). */
export function listImmigrationCatalog() {
  return IMMIGRATION_FORM_CATALOG.map((f) => ({
    key: f.key,
    formCode: f.formCode,
    name: f.name,
    nameEn: f.nameEn,
    category: f.category,
    description: f.description,
    feeNote: f.feeNote,
    useRag: f.useRag,
    fields: f.fields,
  }));
}

// ─── GENERACIÓN ────────────────────────────────────────────────────────────

interface GenerateOptions {
  userId: string;
  caseId?: string | null;
  formKey: string;
  clientName?: string | null;
  inputs: Record<string, string>;
}

const SYSTEM_PROMPT = `Sos un asistente paralegal bilingüe especializado en formularios
de inmigración de EE.UU. (USCIS). Tu trabajo es ayudar a un abogado de inmigración con
licencia en EE.UU. a PREPARAR un borrador — nunca asesorar al cliente final ni presentar
nada ante USCIS.

Reglas estrictas:
1. Producís un BORRADOR para revisión del abogado. Siempre lo enmarcás como borrador.
2. Nunca inventás datos. Cualquier dato que no esté en la información de admisión lo
   marcás con [PENDIENTE: ...] explicando qué falta.
3. Nunca inventás A-Numbers, números de recibo, fechas, tasas ni domicilios.
4. Citás la base legal (INA / 8 CFR) solo si tenés certeza, y cada cita la marcás
   "[verificar]" porque el abogado debe confirmarla.
5. Redactás en español para el abogado; cuando el formulario exige un valor en inglés
   (p. ej. Yes/No), indicás el valor en inglés.
6. Respondés ÚNICAMENTE con un objeto JSON válido, sin texto fuera del JSON.`;

/** Extrae el primer objeto JSON del texto, tolerando vallas ```json y ruido. */
function extractJson(raw: string): any {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('La respuesta del modelo no contenía JSON.');
  }
  return JSON.parse(s.slice(start, end + 1));
}

/** Valida los campos obligatorios del formulario. Lanza si falta alguno. */
function validateInputs(form: ImmigrationForm, inputs: Record<string, string>): void {
  const missing = form.fields
    .filter((f) => f.required && !(inputs[f.key] || '').trim())
    .map((f) => f.label);
  if (missing.length > 0) {
    throw new Error(`Faltan campos obligatorios: ${missing.join(', ')}.`);
  }
}

/** Normaliza el checklist devuelto por el modelo a ChecklistItem[]. */
function normalizeChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 40)
    .map((x: any) => ({
      item: String(x?.item ?? '').trim().slice(0, 300),
      detail: String(x?.detail ?? '').trim().slice(0, 600),
      required: x?.required !== false,
    }))
    .filter((x) => x.item.length > 0);
}

export async function generateFormPacket(opts: GenerateOptions): Promise<FormPacket> {
  const form = getImmigrationForm(opts.formKey);
  if (!form) throw new Error('Formulario no encontrado en el catálogo.');

  // Solo conservamos los valores de campos declarados, recortados.
  const inputs: Record<string, string> = {};
  for (const f of form.fields) {
    inputs[f.key] = (opts.inputs?.[f.key] || '').trim().slice(0, 8_000);
  }
  validateInputs(form, inputs);
  const clientName = (opts.clientName || '').trim().slice(0, 300) || null;

  const startedAt = Date.now();

  // 1) Contexto del corpus de inmigración (si el dominio está activo).
  let ragBlock = '';
  let usedRag = false;
  if (form.useRag) {
    const query = [form.name, form.formCode, ...Object.values(inputs)].join(' ').slice(0, 1_000);
    try {
      const r = await retrieveLegalContextForChat(query, {
        limit: 6,
        filterCorpusDomain: 'us-immigration',
      });
      if (r.formattedPrompt) {
        ragBlock = `\nCONTEXTO NORMATIVO (corpus de inmigración):\n${r.formattedPrompt}\n`;
        usedRag = true;
      }
    } catch {
      ragBlock = '';
    }
  }

  // 2) Prompt del usuario — datos de admisión + esquema del formulario.
  const intakeLines = form.fields
    .map((f) => `- ${f.label}: ${inputs[f.key] || '[PENDIENTE: no provisto]'}`)
    .join('\n');

  const userPrompt =
    `Formulario USCIS: ${form.formCode} — ${form.name} (${form.nameEn}).\n` +
    `Para qué sirve: ${form.description}\n` +
    `Cliente del paquete: ${clientName || '[PENDIENTE: nombre del cliente]'}\n\n` +
    `ESQUEMA DEL FORMULARIO:\n${form.formOutline}\n\n` +
    `INFORMACIÓN DE ADMISIÓN (cargada por el abogado):\n${intakeLines}\n` +
    `${ragBlock}\n` +
    `Generá el paquete de preparación. Devolvé EXCLUSIVAMENTE este JSON:\n` +
    `{\n` +
    `  "formDraft": "Borrador del ${form.formCode} parte por parte siguiendo el esquema. ` +
    `Para cada campo relevante indicá el valor a transcribir; lo que falte marcalo con ` +
    `[PENDIENTE: ...]. Texto plano con saltos de línea.",\n` +
    `  "checklist": [ { "item": "documento de respaldo", "detail": "qué es y por qué se ` +
    `necesita", "required": true } ],\n` +
    `  "filingGuide": "Guía de presentación: tasa de referencia y recordatorio de verificarla, ` +
    `dónde se presenta, formularios que suelen acompañar, plazos y motivos típicos de RFE."\n` +
    `}`;

  // 3) Generación con el LLM.
  const ai = await getAiClient();
  const completion = await ai.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 4200,
    temperature: 0.2,
  });
  const rawText = completion.choices[0]?.message?.content?.trim() || '';
  if (rawText.length < 40) {
    throw new Error('El modelo no devolvió un paquete utilizable. Reintentá.');
  }

  let parsed: any;
  try {
    parsed = extractJson(rawText);
  } catch {
    throw new Error('El modelo no devolvió un JSON válido. Reintentá.');
  }

  const formDraft = String(parsed?.formDraft ?? '').trim();
  const filingGuide = String(parsed?.filingGuide ?? '').trim();
  const checklist = normalizeChecklist(parsed?.checklist);
  if (formDraft.length < 40) {
    throw new Error('El borrador generado quedó vacío. Reintentá.');
  }

  const durationMs = Date.now() - startedAt;
  const id = randomUUID();

  // 4) Persistencia — review_status arranca SIEMPRE en 'borrador'.
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.immigration_form_packets
       (id, user_id, case_id, form_key, form_code, form_name, client_name, inputs,
        form_draft, checklist, filing_guide, review_status, used_rag, duration_ms)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb, $11,
             'borrador', $12, $13)`,
    id, opts.userId, opts.caseId ?? null, form.key, form.formCode, form.name,
    clientName, JSON.stringify(inputs), formDraft, JSON.stringify(checklist),
    filingGuide, usedRag, durationMs,
  );

  return {
    id,
    caseId: opts.caseId ?? null,
    formKey: form.key,
    formCode: form.formCode,
    formName: form.name,
    clientName,
    inputs,
    formDraft,
    checklist,
    filingGuide,
    reviewedContent: null,
    reviewStatus: 'borrador',
    usedRag,
    durationMs,
    generatedAt: new Date().toISOString(),
    reviewedAt: null,
  };
}

// ─── CONSULTAS Y REVISIÓN ──────────────────────────────────────────────────

function rowToPacket(r: any): FormPacket {
  return {
    id: r.id,
    caseId: r.case_id,
    formKey: r.form_key,
    formCode: r.form_code,
    formName: r.form_name,
    clientName: r.client_name,
    inputs: r.inputs || {},
    formDraft: r.form_draft,
    checklist: Array.isArray(r.checklist) ? r.checklist : [],
    filingGuide: r.filing_guide,
    reviewedContent: r.reviewed_content,
    reviewStatus: r.review_status,
    usedRag: r.used_rag,
    durationMs: Number(r.duration_ms ?? 0),
    generatedAt: r.generated_at,
    reviewedAt: r.reviewed_at,
  };
}

const SELECT_COLS =
  `id, case_id, form_key, form_code, form_name, client_name, inputs, form_draft,
   checklist, filing_guide, reviewed_content, review_status, used_rag, duration_ms,
   generated_at, reviewed_at`;

export async function listFormPackets(userId: string, limit = 30): Promise<FormPacket[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT ${SELECT_COLS}
       FROM public.immigration_form_packets
      WHERE user_id = $1
      ORDER BY generated_at DESC
      LIMIT $2`,
    userId, Math.min(100, limit),
  );
  return rows.map(rowToPacket);
}

export async function getFormPacket(userId: string, id: string): Promise<FormPacket | null> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT ${SELECT_COLS}
       FROM public.immigration_form_packets
      WHERE id = $1::uuid AND user_id = $2`,
    id, userId,
  );
  return rows.length > 0 ? rowToPacket(rows[0]) : null;
}

interface ReviewUpdate {
  /** Contenido revisado por el abogado (reemplaza al borrador como versión final). */
  reviewedContent?: string;
  /** Si true, marca el paquete como revisado. */
  markReviewed?: boolean;
}

/**
 * Guarda la revisión del abogado. Marcar como revisado exige que exista
 * contenido — no se marca revisado un paquete vacío.
 */
export async function updatePacketReview(
  userId: string,
  id: string,
  update: ReviewUpdate,
): Promise<FormPacket | null> {
  const current = await getFormPacket(userId, id);
  if (!current) return null;

  const reviewedContent =
    update.reviewedContent !== undefined
      ? update.reviewedContent.trim().slice(0, 200_000)
      : current.reviewedContent;

  let reviewStatus = current.reviewStatus;
  let reviewedNow = false;
  if (update.markReviewed) {
    const finalText = reviewedContent || current.formDraft || '';
    if (finalText.trim().length < 40) {
      throw new Error('No se puede marcar como revisado un paquete sin contenido.');
    }
    reviewStatus = 'revisado';
    reviewedNow = true;
  }

  await prisma.$executeRawUnsafe(
    `UPDATE public.immigration_form_packets
        SET reviewed_content = $3,
            review_status = $4,
            reviewed_at = CASE WHEN $5 THEN now() ELSE reviewed_at END
      WHERE id = $1::uuid AND user_id = $2`,
    id, userId, reviewedContent, reviewStatus, reviewedNow,
  );

  return getFormPacket(userId, id);
}
