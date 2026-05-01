/**
 * OAuth callback handler para Supabase Auth.
 *
 * Flujo:
 *   1. Frontend llama supabase.auth.signInWithOAuth({ provider: 'google',
 *        options: { redirectTo: `${origin}/auth/callback` }})
 *   2. Google redirige aquí con ?code=...
 *   3. Este handler intercambia el code por una sesión y setea cookies
 *   4. Redirige al usuario a /dashboard
 *
 * Solo se activa cuando el frontend usa Supabase auth (NEXT_PUBLIC_AUTH_BACKEND=supabase).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
