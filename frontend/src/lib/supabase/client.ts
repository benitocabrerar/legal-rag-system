/**
 * Cliente Supabase para uso en el BROWSER (Client Components).
 *
 * Coexiste con el AuthProvider custom existente (`frontend/src/lib/auth.tsx`)
 * durante la migración. La transición se hace por ruta — cada página puede
 * elegir cuál usar mientras dure la Fase 3.
 */
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridas. ' +
      'Ver .env.supabase.example.'
    );
  }

  _client = createBrowserClient(url, anonKey);
  return _client;
}
