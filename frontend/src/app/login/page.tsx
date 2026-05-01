'use client';

// Force rebuild with new chunk hashes - v2
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { parseApiError } from '@/lib/api';
import { loginWithGoogle as supabaseGoogleLogin } from '@/lib/auth-supabase';
import { useTranslation } from '@/lib/i18n';

const USE_SUPABASE_AUTH = process.env.NEXT_PUBLIC_AUTH_BACKEND === 'supabase';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Usa el AuthContext (legacy o Supabase según NEXT_PUBLIC_AUTH_BACKEND).
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      // Detect 2FA solo en flow legacy (Supabase no expone esto via signInWithPassword).
      if (err?.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/v1/auth/2fa/verify-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token: twoFactorToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Código de verificación inválido');
      }

      // Store auth data and redirect
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 px-4 py-6 relative">
      {/* Back-to-landing button — top-left on desktop, above card on mobile. */}
      <Link
        href="/"
        className="self-start sm:absolute sm:top-4 sm:left-4 mb-4 sm:mb-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium backdrop-blur transition"
      >
        <span aria-hidden>←</span>
        Volver al inicio
      </Link>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-4 group/logo"
            aria-label="Ir al inicio"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover/logo:shadow-indigo-500/50 transition">
              <span className="text-white font-bold text-sm">⚖️</span>
            </div>
            <span className="font-bold text-gray-900 tracking-tight">Poweria Legal</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('landing.heroTitle')}</h1>
          <p className="text-gray-600">
            {requires2FA ? t('settings.twoFactor') : t('auth.loginSubtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {!requires2FA ? (
          // Normal login form
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('auth.loggingIn') : t('auth.loginButton')}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{t('auth.or')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                setError('');
                if (USE_SUPABASE_AUTH) {
                  try {
                    await supabaseGoogleLogin();
                  } catch (err: any) {
                    setError(err?.message || 'Error iniciando con Google');
                  }
                } else {
                  window.location.href = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/auth/google`;
                }
              }}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t('auth.signInGoogle')}
            </button>
          </form>
        ) : (
          // 2FA verification form
          <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Ingresa el código de verificación de 6 dígitos de tu aplicación de autenticación.
              </p>
              <label htmlFor="twoFactorToken" className="block text-sm font-medium text-gray-700 mb-2">
                Código de verificación
              </label>
              <input
                id="twoFactorToken"
                type="text"
                required
                value={twoFactorToken}
                onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-lg text-center"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || twoFactorToken.length !== 6}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('common.loading') : t('common.confirm')}
            </button>

            <button
              type="button"
              onClick={() => {
                setRequires2FA(false);
                setTwoFactorToken('');
                setError('');
              }}
              className="w-full text-sm text-gray-600 hover:text-gray-800"
            >
              ← {t('common.back')}
            </button>
          </form>
        )}

        {!requires2FA && (
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {t('auth.noAccount')}{' '}
              <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                {t('auth.registerButton')}
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
