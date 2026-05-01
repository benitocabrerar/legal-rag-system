'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const USE_SUPABASE_AUTH = process.env.NEXT_PUBLIC_AUTH_BACKEND === 'supabase';

export default function PasswordSettingsPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmación no coincide con la nueva contraseña');
      return;
    }

    setLoading(true);
    try {
      if (USE_SUPABASE_AUTH) {
        const supabase = getSupabaseBrowserClient();
        // Re-autenticar con la actual para validar el ownership.
        const { data: sess } = await supabase.auth.getSession();
        const email = sess.session?.user.email;
        if (!email) throw new Error('Sesión no encontrada — vuelve a iniciar sesión');

        const { error: signErr } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });
        if (signErr) throw new Error('La contraseña actual es incorrecta');

        const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
        if (updErr) throw updErr;
      } else {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/v1/user/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || data.message || 'Error al cambiar la contraseña');
        }
      }

      setSuccess('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/dashboard/settings" className="text-sm text-indigo-600 hover:underline">
          ← Volver a Configuración
        </Link>
        <h1 className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
          Cambiar contraseña
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Necesitas conocer la contraseña actual para confirmar el cambio.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-5 shadow-sm"
      >
        <div>
          <label
            htmlFor="current"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Contraseña actual
          </label>
          <input
            id="current"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="new"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Nueva contraseña
          </label>
          <input
            id="new"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Mínimo 8 caracteres.
          </p>
        </div>

        <div>
          <label
            htmlFor="confirm"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Confirmar nueva contraseña
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded p-3">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-md font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Actualizando…' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  );
}
