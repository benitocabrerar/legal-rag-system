/**
 * Helpers para resolver el país preferido del usuario y construir contextos
 * jurisdiccionales para prompts de IA.
 *
 * Usa la tabla legal_jurisdictions y la columna users.preferred_country_code
 * (sembradas en migraciones 0010 y 0011).
 */
import { prisma } from './prisma.js';

export interface CountryContext {
  code: string;          // 'EC'
  nameEs: string;        // 'Ecuador'
  nameEn: string;        // 'Ecuador'
  flagEmoji: string;     // '🇪🇨'
  defaultCurrency: string; // 'USD'
  defaultLanguage: string; // 'es'
  legalSystem: string | null; // 'civil_law'
}

const cache = new Map<string, { ctx: CountryContext; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60_000; // 5 minutos

const FALLBACK: CountryContext = {
  code: 'EC',
  nameEs: 'Ecuador',
  nameEn: 'Ecuador',
  flagEmoji: '🇪🇨',
  defaultCurrency: 'USD',
  defaultLanguage: 'es',
  legalSystem: 'civil_law',
};

/**
 * Resuelve el país preferido del usuario.
 * @param userId — id en public.users
 * @returns CountryContext (siempre devuelve algo, nunca null; fallback a Ecuador)
 */
export async function getUserCountryContext(userId: string | null | undefined): Promise<CountryContext> {
  if (!userId) return FALLBACK;
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.ctx;

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT j.code, j.name_es, j.name_en, j.flag_emoji,
              j.default_currency, j.default_language, j.legal_system
       FROM users u
       JOIN legal_jurisdictions j ON j.code = u.preferred_country_code
       WHERE u.id = $1
       LIMIT 1`,
      userId
    );
    if (!rows || rows.length === 0) {
      cache.set(userId, { ctx: FALLBACK, expiresAt: Date.now() + CACHE_TTL_MS });
      return FALLBACK;
    }
    const r = rows[0];
    const ctx: CountryContext = {
      code: r.code,
      nameEs: r.name_es,
      nameEn: r.name_en,
      flagEmoji: r.flag_emoji,
      defaultCurrency: r.default_currency,
      defaultLanguage: r.default_language,
      legalSystem: r.legal_system,
    };
    cache.set(userId, { ctx, expiresAt: Date.now() + CACHE_TTL_MS });
    return ctx;
  } catch (_err) {
    return FALLBACK;
  }
}

/**
 * Resuelve solo el código de país. Útil cuando solo necesitas pasar a una RPC.
 */
export async function getUserCountryCode(userId: string | null | undefined): Promise<string> {
  const ctx = await getUserCountryContext(userId);
  return ctx.code;
}

/**
 * Construye un fragmento de prompt jurisdiccional para IA legal.
 * Acepta el contexto y devuelve texto en español o inglés.
 */
export function jurisdictionPromptFragment(
  ctx: CountryContext,
  language: 'es' | 'en' = 'es'
): string {
  if (language === 'en') {
    return `You are a legal assistant for ${ctx.nameEn}, working under the ${ctx.legalSystem || 'civil_law'} system. ` +
           `When citing laws, codes or constitutional articles, refer to ${ctx.nameEn}'s legal system. ` +
           `The local currency is ${ctx.defaultCurrency}.`;
  }
  return `Eres un asistente legal especializado en el sistema jurídico de ${ctx.nameEs} ` +
         `(sistema ${ctx.legalSystem === 'common_law' ? 'de common law' : 'de civil law / derecho continental'}). ` +
         `Al citar leyes, códigos o artículos constitucionales, refiérete al ordenamiento jurídico de ${ctx.nameEs}. ` +
         `La moneda local es ${ctx.defaultCurrency}.`;
}

/** Limpia el cache (útil cuando un user cambia su preferencia). */
export function invalidateCountryCache(userId: string) {
  cache.delete(userId);
}
