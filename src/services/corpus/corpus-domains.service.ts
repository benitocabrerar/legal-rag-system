/**
 * Dominios de corpus — servicio.
 *
 * Un dominio de corpus es un cuerpo de derecho gestionable de forma
 * aislada (derecho ecuatoriano, inmigración federal de EE.UU., …). Esta
 * capa permite registrar dominios, ver sus estadísticas de ingesta y
 * acotar la recuperación RAG a uno de ellos.
 *
 * Infraestructura de la Fase 3: deja el corpus listo para sumar el
 * derecho migratorio de EE.UU. sin contaminar el corpus ecuatoriano.
 */
import { prisma } from '../../lib/prisma.js';

export interface CorpusDomain {
  code: string;
  name: string;
  countryCode: string;
  language: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
  /** Documentos del corpus etiquetados con este dominio. */
  docCount: number;
  /** Chunks vectorizados pertenecientes al dominio. */
  chunkCount: number;
}

function rowToDomain(r: any): CorpusDomain {
  return {
    code: r.code,
    name: r.name,
    countryCode: r.country_code,
    language: r.language,
    description: r.description,
    isActive: r.is_active,
    isDefault: r.is_default,
    displayOrder: Number(r.display_order ?? 100),
    docCount: Number(r.docs ?? 0),
    chunkCount: Number(r.chunks ?? 0),
  };
}

const STATS_QUERY = `
  SELECT d.code, d.name, d.country_code, d.language, d.description,
         d.is_active, d.is_default, d.display_order,
         COALESCE(dc.docs, 0)   AS docs,
         COALESCE(cc.chunks, 0) AS chunks
    FROM public.corpus_domains d
    LEFT JOIN (
      SELECT corpus_domain, count(*) AS docs
        FROM public.legal_documents
       GROUP BY corpus_domain
    ) dc ON dc.corpus_domain = d.code
    LEFT JOIN (
      SELECT ld.corpus_domain, count(*) AS chunks
        FROM public.legal_document_chunks c
        JOIN public.legal_documents ld ON ld.id = c.legal_document_id
       GROUP BY ld.corpus_domain
    ) cc ON cc.corpus_domain = d.code
`;

export async function listCorpusDomains(): Promise<CorpusDomain[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(`${STATS_QUERY} ORDER BY d.display_order`);
  return rows.map(rowToDomain);
}

export async function getCorpusDomain(code: string): Promise<CorpusDomain | null> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `${STATS_QUERY} WHERE d.code = $1`,
    code,
  );
  return rows.length > 0 ? rowToDomain(rows[0]) : null;
}

interface DomainUpdate {
  isActive?: boolean;
  isDefault?: boolean;
  description?: string;
}

/**
 * Actualiza un dominio (admin). Si se marca como default, desmarca al
 * resto — solo puede haber un dominio por defecto.
 */
export async function updateCorpusDomain(
  code: string,
  update: DomainUpdate,
): Promise<CorpusDomain | null> {
  const existing = await getCorpusDomain(code);
  if (!existing) return null;

  if (update.isDefault === true) {
    await prisma.$executeRawUnsafe(
      `UPDATE public.corpus_domains SET is_default = false WHERE code <> $1`,
      code,
    );
  }

  const sets: string[] = ['updated_at = now()'];
  const params: any[] = [code];
  let i = 2;
  if (typeof update.isActive === 'boolean') { sets.push(`is_active = $${i++}`); params.push(update.isActive); }
  if (typeof update.isDefault === 'boolean') { sets.push(`is_default = $${i++}`); params.push(update.isDefault); }
  if (typeof update.description === 'string') { sets.push(`description = $${i++}`); params.push(update.description.slice(0, 2_000)); }

  await prisma.$executeRawUnsafe(
    `UPDATE public.corpus_domains SET ${sets.join(', ')} WHERE code = $1`,
    ...params,
  );
  invalidateDomainCache();
  return getCorpusDomain(code);
}

// ─── RESOLUCIÓN DE DOMINIO → PAÍS (para la recuperación RAG) ────────────────

interface DomainCacheEntry { countryCode: string; isActive: boolean }
let domainCache: { map: Map<string, DomainCacheEntry>; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60_000;

export function invalidateDomainCache(): void {
  domainCache = null;
}

async function loadDomainCache(): Promise<Map<string, DomainCacheEntry>> {
  if (domainCache && Date.now() - domainCache.fetchedAt < CACHE_TTL_MS) {
    return domainCache.map;
  }
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT code, country_code, is_active FROM public.corpus_domains`,
  );
  const map = new Map<string, DomainCacheEntry>();
  for (const r of rows) map.set(r.code, { countryCode: r.country_code, isActive: r.is_active });
  domainCache = { map, fetchedAt: Date.now() };
  return map;
}

/**
 * Resuelve un dominio de corpus a su código de país. La recuperación RAG
 * acota por país (filtro soportado por el RPC search_legal_chunks); para
 * los dominios actuales (EC vs US) el país discrimina exactamente.
 * Devuelve null si el dominio no existe.
 */
export async function resolveDomainCountry(domainCode: string): Promise<string | null> {
  const map = await loadDomainCache();
  return map.get(domainCode)?.countryCode ?? null;
}
