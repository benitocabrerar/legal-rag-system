'use client';

/**
 * Helper para obtener el access token actual.
 * - En modo Supabase: lee de la sesión activa (cookies via @supabase/ssr).
 * - En modo legacy: lee de localStorage.
 *
 * Usar desde cualquier client component que haga fetch directo al backend.
 * Para axios, el interceptor en `lib/api.ts` ya hace lo mismo.
 */
const USE_SUPABASE_AUTH = process.env.NEXT_PUBLIC_AUTH_BACKEND === 'supabase';

export async function getAuthToken(): Promise<string | null> {
  if (USE_SUPABASE_AUTH) {
    try {
      const { getSupabaseBrowserClient } = await import('./supabase/client');
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      return data.session?.access_token ?? null;
    } catch {
      return null;
    }
  }
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}
