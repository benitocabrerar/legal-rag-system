'use client';

/**
 * AuthProvider feature-flagged sobre Supabase Auth.
 * Activado por NEXT_PUBLIC_AUTH_BACKEND='supabase'.
 *
 * Mantiene la MISMA shape de contexto que `auth.tsx` legacy (User + login + register
 * + logout + loading + token) para que páginas que ya usan `useAuth()` no rompan.
 */
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './supabase/client';
import { AuthContext, type User, type AuthContextType } from './auth';

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const sync = (session: Session | null) => {
      if (!mounted) return;
      if (!session?.user) {
        setUser(null);
        setToken(null);
        return;
      }
      const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
      // Custom claims (user_role, plan_tier) viven en el JWT, no en user_metadata.
      // Las inyecta custom_access_token_hook al firmar el access_token.
      let role = 'user';
      try {
        const payload = JSON.parse(
          atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
        );
        if (typeof payload.user_role === 'string') role = payload.user_role;
      } catch {
        // si el decode falla, fallback a app_metadata por compatibilidad
        const claims = (session.user.app_metadata ?? {}) as Record<string, unknown>;
        if (typeof claims.user_role === 'string') role = claims.user_role;
      }
      setUser({
        id: session.user.id,
        email: session.user.email ?? '',
        name:
          typeof meta.name === 'string'
            ? meta.name
            : typeof meta.full_name === 'string'
              ? meta.full_name
              : (session.user.email ?? '').split('@')[0],
        role,
      });
      setToken(session.access_token);
    };

    supabase.auth.getSession().then(({ data }) => {
      sync(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      sync(session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const login: AuthContextType['login'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register: AuthContextType['register'] = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
  };

  const logout: AuthContextType['logout'] = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Helper extra solo para Supabase OAuth (no en el contexto compartido).
export async function loginWithGoogle() {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw error;
}
