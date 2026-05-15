/**
 * Traductor Jurídico — servicio.
 *
 * Traduce texto jurídico español ⇄ inglés preservando el sentido legal
 * exacto. No "localiza" el derecho: traduce el texto, no lo adapta a otro
 * ordenamiento. Devuelve además un glosario de los términos jurídicos
 * clave con su equivalencia y una nota.
 *
 * Núcleo de software de la Fase 3 (modo bilingüe real) — pieza para el
 * abogado que sirve clientes hispanos en EE.UU.
 */
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { getAiClient } from '../../lib/ai-client.js';

export type Lang = 'es' | 'en';

/** Tipos de documento — dan contexto al traductor sobre registro y formato. */
export const TRANSLATION_DOC_TYPES: Array<{ key: string; label: string }> = [
  { key: 'general',       label: 'General' },
  { key: 'contrato',      label: 'Contrato' },
  { key: 'escrito',       label: 'Escrito judicial' },
  { key: 'sentencia',     label: 'Sentencia / resolución' },
  { key: 'norma',         label: 'Norma / ley' },
  { key: 'correspondencia', label: 'Correspondencia legal' },
];

export interface GlossaryEntry {
  source: string;
  target: string;
  note: string;
}

export interface LegalTranslation {
  id: string;
  caseId: string | null;
  sourceLang: Lang;
  targetLang: Lang;
  docType: string;
  sourceText: string;
  translatedText: string | null;
  glossary: GlossaryEntry[];
  durationMs: number;
  createdAt: string;
}

const LANG_NAME: Record<Lang, string> = { es: 'español', en: 'inglés' };

const SYSTEM_PROMPT = `Sos un traductor jurídico profesional, experto en la
traducción español ⇄ inglés de textos legales (derecho ecuatoriano y derecho
estadounidense).

Reglas de traducción:
1. Traducís el TEXTO, no el derecho: no adaptás ni "localizás" las instituciones
   a otro ordenamiento. Si el texto cita una norma ecuatoriana, sigue siendo esa
   norma en la traducción.
2. Los nombres de normas, tribunales e instituciones se traducen con su
   equivalente reconocido; si no existe, se deja el nombre original con una
   aclaración entre paréntesis.
3. Los términos jurídicos sin equivalente exacto se traducen con la mejor
   aproximación y se anotan en el glosario.
4. Mantenés el registro formal, la estructura y el formato del original.
5. No agregás contenido ni opinión: solo traducís.

Devolvés siempre un objeto JSON válido.`;

/** Extrae el primer objeto JSON {...} de un texto. */
function extractJson(raw: string): any | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

interface TranslateOptions {
  userId: string;
  caseId?: string | null;
  sourceText: string;
  sourceLang: Lang;
  targetLang: Lang;
  docType: string;
}

export async function translateLegalText(opts: TranslateOptions): Promise<LegalTranslation> {
  const sourceText = (opts.sourceText || '').trim().slice(0, 14_000);
  if (sourceText.length < 3) {
    throw new Error('El texto a traducir es demasiado corto.');
  }
  if (opts.sourceLang === opts.targetLang) {
    throw new Error('El idioma de origen y destino deben ser distintos.');
  }
  const docType = TRANSLATION_DOC_TYPES.some((d) => d.key === opts.docType)
    ? opts.docType
    : 'general';

  const startedAt = Date.now();
  const ai = await getAiClient();

  const userPrompt =
    `Traducí el siguiente texto jurídico de ${LANG_NAME[opts.sourceLang]} a ` +
    `${LANG_NAME[opts.targetLang]}. Tipo de documento: ${docType}.\n\n` +
    `TEXTO A TRADUCIR:\n${sourceText}\n\n` +
    `Devolvé EXCLUSIVAMENTE un objeto JSON válido, sin markdown ni texto adicional, ` +
    `con esta forma exacta:\n` +
    `{"translatedText": "<la traducción completa>", ` +
    `"glossary": [{"source": "<término en el idioma origen>", ` +
    `"target": "<su traducción>", "note": "<aclaración breve>"}]}\n` +
    `El glosario debe incluir entre 3 y 10 términos jurídicos clave del texto. ` +
    `Si no hay términos técnicos relevantes, devolvé un glosario vacío.`;

  const completion = await ai.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 5000,
  });

  const raw = completion.choices[0]?.message?.content || '';
  const parsed = extractJson(raw);
  if (!parsed || typeof parsed.translatedText !== 'string' || !parsed.translatedText.trim()) {
    throw new Error('El traductor no devolvió un resultado válido. Reintentá.');
  }

  const translatedText = String(parsed.translatedText).trim();
  const glossary: GlossaryEntry[] = Array.isArray(parsed.glossary)
    ? parsed.glossary
        .filter((g: any) => g && typeof g.source === 'string' && typeof g.target === 'string')
        .slice(0, 12)
        .map((g: any) => ({
          source: String(g.source).slice(0, 300),
          target: String(g.target).slice(0, 300),
          note: String(g.note || '').slice(0, 500),
        }))
    : [];

  const durationMs = Date.now() - startedAt;
  const id = randomUUID();

  await prisma.$executeRawUnsafe(
    `INSERT INTO public.legal_translations
       (id, user_id, case_id, source_lang, target_lang, doc_type, source_text,
        translated_text, glossary, duration_ms)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
    id, opts.userId, opts.caseId ?? null, opts.sourceLang, opts.targetLang,
    docType, sourceText, translatedText, JSON.stringify(glossary), durationMs,
  );

  return {
    id,
    caseId: opts.caseId ?? null,
    sourceLang: opts.sourceLang,
    targetLang: opts.targetLang,
    docType,
    sourceText,
    translatedText,
    glossary,
    durationMs,
    createdAt: new Date().toISOString(),
  };
}

// ─── CONSULTAS ─────────────────────────────────────────────────────────────

function rowToTranslation(r: any): LegalTranslation {
  return {
    id: r.id,
    caseId: r.case_id,
    sourceLang: r.source_lang,
    targetLang: r.target_lang,
    docType: r.doc_type,
    sourceText: r.source_text,
    translatedText: r.translated_text,
    glossary: Array.isArray(r.glossary) ? r.glossary : [],
    durationMs: Number(r.duration_ms ?? 0),
    createdAt: r.created_at,
  };
}

export async function listTranslations(userId: string, limit = 30): Promise<LegalTranslation[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, case_id, source_lang, target_lang, doc_type, source_text,
            translated_text, glossary, duration_ms, created_at
       FROM public.legal_translations
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    userId, Math.min(100, limit),
  );
  return rows.map(rowToTranslation);
}

export async function getTranslation(userId: string, id: string): Promise<LegalTranslation | null> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, case_id, source_lang, target_lang, doc_type, source_text,
            translated_text, glossary, duration_ms, created_at
       FROM public.legal_translations
      WHERE id = $1::uuid AND user_id = $2`,
    id, userId,
  );
  return rows.length > 0 ? rowToTranslation(rows[0]) : null;
}
