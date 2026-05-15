/**
 * Citation Verification — verifica las fuentes citadas en un texto de IA
 * CONTRA el corpus jurídico real de Poweria Legal.
 *
 * A diferencia del CitationValidator (que solo valida el FORMATO de una
 * cita), este servicio responde la pregunta que importa al abogado:
 * "¿la norma que la IA citó realmente existe en el corpus?".
 *
 * Es la capa anti-alucinación visible: distingue entre
 *   - normas confirmadas (existen en el corpus, con enlace al PDF oficial)
 *   - referencias a artículos (no verificables en aislamiento — el abogado
 *     debe contrastarlas con la norma)
 *
 * No reemplaza el criterio del abogado; le dice dónde mirar.
 */
import { prisma } from '../../lib/prisma.js';

// ─── TIPOS ─────────────────────────────────────────────────────────────────

export interface VerifiedNorm {
  /** Título de la norma tal como está en el corpus. */
  title: string;
  /** Jerarquía legal (CONSTITUCION, LEYES_ORGANICAS, …). */
  hierarchy: string | null;
  status: 'verified';
  /** Id del documento en legal_documents. */
  docId: string;
  /** Enlace al PDF oficial si está disponible. */
  pdfUrl: string | null;
}

export interface ArticleReference {
  /** Texto tal como apareció: "Art. 76", "Artículo 12". */
  raw: string;
  status: 'needs_context';
}

export interface CitationVerificationResult {
  normsVerified: VerifiedNorm[];
  articleRefs: ArticleReference[];
  summary: {
    normsFound: number;
    articleRefsCount: number;
    /** alta = hay normas confirmadas · media = solo refs de artículo · baja = nada detectado */
    confidence: 'alta' | 'media' | 'baja';
    /** Mensaje legible para mostrar al usuario. */
    message: string;
  };
}

// ─── CACHE DEL CORPUS ──────────────────────────────────────────────────────

interface CorpusNorm {
  docId: string;
  title: string;
  hierarchy: string | null;
  pdfUrl: string | null;
  /** Título normalizado para matching (minúsculas, sin acentos). */
  normalized: string;
}

let corpusCache: { norms: CorpusNorm[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60_000;

/** Quita acentos y normaliza a minúsculas para comparación robusta. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadCorpusNorms(): Promise<CorpusNorm[]> {
  if (corpusCache && Date.now() - corpusCache.fetchedAt < CACHE_TTL_MS) {
    return corpusCache.norms;
  }
  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    title: string;
    norm_title: string | null;
    legal_hierarchy: string | null;
    stored_pdf_url: string | null;
  }>>(
    `SELECT id, title, norm_title, legal_hierarchy::text AS legal_hierarchy, stored_pdf_url
       FROM public.legal_documents
      WHERE is_active = true`,
  );

  const norms: CorpusNorm[] = rows
    .map((r) => {
      const title = (r.norm_title || r.title || '').trim();
      return {
        docId: r.id,
        title,
        hierarchy: r.legal_hierarchy,
        pdfUrl: r.stored_pdf_url,
        normalized: normalize(title),
      };
    })
    // Títulos demasiado cortos generan falsos positivos — descartados.
    .filter((n) => n.normalized.length >= 10);

  corpusCache = { norms, fetchedAt: Date.now() };
  return norms;
}

// ─── VERIFICACIÓN ──────────────────────────────────────────────────────────

const ARTICLE_RE = /\bart[íi]culos?\.?\s*(\d+)/gi;

/**
 * Verifica las fuentes citadas en un texto contra el corpus jurídico.
 * Nunca lanza: ante un error devuelve un resultado vacío con confianza baja.
 */
export async function verifyCitationsInText(text: string): Promise<CitationVerificationResult> {
  const empty: CitationVerificationResult = {
    normsVerified: [],
    articleRefs: [],
    summary: { normsFound: 0, articleRefsCount: 0, confidence: 'baja', message: 'No se detectaron fuentes para verificar.' },
  };
  if (!text || text.trim().length < 10) return empty;

  let norms: CorpusNorm[];
  try {
    norms = await loadCorpusNorms();
  } catch (e: any) {
    console.error('[citation-verification] no se pudo cargar el corpus:', e?.message);
    return empty;
  }

  const haystack = normalize(text);

  // 1) Normas del corpus mencionadas en el texto (match de título completo)
  const seen = new Set<string>();
  const normsVerified: VerifiedNorm[] = [];
  for (const norm of norms) {
    if (seen.has(norm.docId)) continue;
    if (haystack.includes(norm.normalized)) {
      seen.add(norm.docId);
      normsVerified.push({
        title: norm.title,
        hierarchy: norm.hierarchy,
        status: 'verified',
        docId: norm.docId,
        pdfUrl: norm.pdfUrl,
      });
    }
  }

  // 2) Referencias a artículos (no verificables en aislamiento)
  const articleSeen = new Set<string>();
  const articleRefs: ArticleReference[] = [];
  for (const m of text.matchAll(ARTICLE_RE)) {
    const raw = m[0].replace(/\s+/g, ' ').trim();
    const key = raw.toLowerCase();
    if (!articleSeen.has(key)) {
      articleSeen.add(key);
      articleRefs.push({ raw, status: 'needs_context' });
    }
  }

  // 3) Resumen y nivel de confianza
  const normsFound = normsVerified.length;
  const articleRefsCount = articleRefs.length;
  let confidence: 'alta' | 'media' | 'baja';
  let message: string;
  if (normsFound > 0) {
    confidence = 'alta';
    message = `Se confirmaron ${normsFound} norma(s) citada(s) en el corpus jurídico.` +
      (articleRefsCount > 0
        ? ` Hay ${articleRefsCount} referencia(s) a artículos: contrastalas con la norma.`
        : '');
  } else if (articleRefsCount > 0) {
    confidence = 'media';
    message = `Se detectaron ${articleRefsCount} referencia(s) a artículos, pero ninguna ` +
      `norma del texto coincide exactamente con el corpus. Verificá las fuentes manualmente.`;
  } else {
    confidence = 'baja';
    message = 'No se detectaron normas del corpus ni referencias a artículos en este texto.';
  }

  return {
    normsVerified,
    articleRefs,
    summary: { normsFound, articleRefsCount, confidence, message },
  };
}

/** Invalida el cache del corpus (útil tras una sincronización). */
export function invalidateCitationCorpusCache(): void {
  corpusCache = null;
}
