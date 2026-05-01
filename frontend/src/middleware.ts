/**
 * EJEMPLO de middleware Next.js para refresh de sesión Supabase.
 *
 * Cuando se llegue a Fase 3 del plan, renombrar este archivo a
 * `frontend/middleware.ts` (sin `.example`). NO se aplica todavía
 * para evitar romper el AuthProvider custom existente.
 */
import { type NextRequest } from 'next/server';
import { updateSupabaseSession } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSupabaseSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths excepto:
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - archivos públicos (imágenes, fonts)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
