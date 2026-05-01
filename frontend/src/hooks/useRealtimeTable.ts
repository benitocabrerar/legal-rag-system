'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface UseRealtimeOptions {
  /** Postgres table name (e.g. "tasks", "events"). */
  table: string;
  /** React Query keys to invalidate on any insert / update / delete. */
  invalidateKeys: Array<readonly unknown[]>;
  /** Disable the subscription (e.g. when AUTH_BACKEND !== 'supabase'). */
  enabled?: boolean;
  /** Optional row filter, e.g. `user_id=eq.abc`. */
  filter?: string;
}

/**
 * Subscribe to Postgres changes via Supabase Realtime and invalidate the
 * given React Query caches. Idempotent across re-renders; channels are
 * cleaned up on unmount.
 *
 * Requires `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
 * If those are not set, this hook is a no-op so it can be mounted safely.
 */
export function useRealtimeTable({ table, invalidateKeys, enabled = true, filter }: UseRealtimeOptions) {
  const queryClient = useQueryClient();
  const settledRef = useRef(false);

  useEffect(() => {
    if (!enabled || settledRef.current) return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;

    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      return;
    }
    settledRef.current = true;

    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        () => {
          for (const key of invalidateKeys) {
            queryClient.invalidateQueries({ queryKey: key as any });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      settledRef.current = false;
    };
  }, [enabled, table, filter, queryClient, invalidateKeys]);
}
