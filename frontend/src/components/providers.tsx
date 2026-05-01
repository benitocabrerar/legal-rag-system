'use client';

import { AuthProvider } from '@/lib/auth';
import { SupabaseAuthProvider } from '@/lib/auth-supabase';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { initI18n } from '@/lib/i18n';
import { registerServiceWorker } from '@/lib/pwa/register-sw';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ThemeProvider } from '@/components/theme';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

// Feature flag de migración: NEXT_PUBLIC_AUTH_BACKEND='supabase' activa el nuevo provider.
const USE_SUPABASE_AUTH = process.env.NEXT_PUBLIC_AUTH_BACKEND === 'supabase';
const SelectedAuthProvider = USE_SUPABASE_AUTH ? SupabaseAuthProvider : AuthProvider;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  // Initialize i18n and PWA
  useEffect(() => {
    // Initialize internationalization
    initI18n('es').catch(console.error);

    // Register service worker for PWA
    registerServiceWorker();
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to error tracking service (e.g., Sentry)
        console.error('Application Error:', error, errorInfo);
      }}
    >
      <ThemeProvider
        defaultTheme="system"
        storageKey="legal-rag-theme"
        enableSystem
        disableTransitionOnChange={false}
      >
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <SelectedAuthProvider>
              {children}
              <Toaster />
            </SelectedAuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
