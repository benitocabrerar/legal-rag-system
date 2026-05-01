/**
 * Middleware helper: refresca la sesión Supabase en cada request.
 * Se invoca desde `frontend/middleware.ts` (root del proyecto Next).
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  // CRÍTICO: getUser() valida el JWT contra el servidor Supabase y refresca si vence.
  // Si se omite, las sesiones expiradas no se renuevan.
  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes: si no hay user, redirect a /login.
  const path = request.nextUrl.pathname;
  const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/ai-assistant', '/analytics',
    '/feedback', '/notifications', '/payment', '/search', '/summarization', '/usage'];
  const PUBLIC_ONLY = ['/login', '/register'];

  const isProtected = PROTECTED_PREFIXES.some(p => path === p || path.startsWith(p + '/'));
  const isPublicOnly = PUBLIC_ONLY.includes(path);

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', path);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicOnly && user) {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = '/dashboard';
    dashUrl.search = '';
    return NextResponse.redirect(dashUrl);
  }

  return response;
}
