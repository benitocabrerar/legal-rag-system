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

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function logServerEvent(payload: Record<string, unknown>) {
  if (!API_URL) return;
  try {
    await fetch(`${API_URL}/api/v1/auth-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // never block the redirect
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin, href } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const oauthError = searchParams.get('error');
  const oauthErrorDesc = searchParams.get('error_description');

  if (oauthError) {
    await logServerEvent({
      eventType: 'oauth_error',
      provider: 'google',
      success: false,
      errorCode: oauthError,
      errorMessage: oauthErrorDesc || oauthError,
      url: href,
    });
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(oauthErrorDesc || oauthError)}`);
  }

  if (!code) {
    await logServerEvent({
      eventType: 'oauth_error',
      provider: 'google',
      success: false,
      errorCode: 'missing_code',
      errorMessage: 'OAuth callback hit without ?code= param',
      url: href,
    });
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    await logServerEvent({
      eventType: 'oauth_error',
      provider: 'google',
      success: false,
      errorCode: (error as any).code || error.name,
      errorMessage: error.message,
      url: href,
    });
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  await logServerEvent({
    eventType: 'oauth_callback',
    provider: 'google',
    success: true,
    email: data.user?.email ?? null,
    userId: data.user?.id ?? null,
    url: href,
  });

  return NextResponse.redirect(`${origin}${next}`);
}
