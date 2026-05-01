'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';

interface Jurisdiction {
  code: string;
  name_es: string;
  name_en: string;
  flag_emoji: string;
  default_currency: string;
  is_default: boolean;
  display_order: number;
  is_active?: boolean;
}

interface CountrySelectorProps {
  /** 'compact' = dropdown chico para sidebar; 'card' = tarjeta de settings */
  variant?: 'compact' | 'card';
  className?: string;
  onChange?: (code: string) => void;
}

export default function CountrySelector({ variant = 'card', className = '', onChange }: CountrySelectorProps) {
  const { t, locale } = useTranslation();
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [current, setCurrent] = useState<string>('EC');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const listP = fetch(`${apiBase}/api/v1/jurisdictions`)
      .then((r) => r.ok ? r.json() : { jurisdictions: [] })
      .catch(() => ({ jurisdictions: [] }));

    // Solo intentar /me si hay token — evita 401 ruidoso para anónimos
    const meP = token
      ? fetch(`${apiBase}/api/v1/jurisdictions/me`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.ok ? r.json() : { countryCode: 'EC' })
          .catch(() => ({ countryCode: 'EC' }))
      : Promise.resolve({ countryCode: 'EC' });

    Promise.all([listP, meP])
      .then(([list, me]) => {
        setJurisdictions(list.jurisdictions || []);
        setCurrent(me?.countryCode || 'EC');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleChange(code: string) {
    if (code === current) return;
    setSaving(true);
    setError(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/api/v1/jurisdictions/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`,
        },
        body: JSON.stringify({ countryCode: code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed');
      }
      setCurrent(code);
      onChange?.(code);
    } catch (err: any) {
      setError(err?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        {t('common.loading')}
      </div>
    );
  }

  if (jurisdictions.length === 0) {
    return null;
  }

  const getName = (j: Jurisdiction) => (locale === 'en' ? j.name_en : j.name_es);

  // Variant: compact (dropdown chico para uso en sidebar/header)
  if (variant === 'compact') {
    const cur = jurisdictions.find((j) => j.code === current);
    return (
      <div className={`relative inline-block ${className}`}>
        <select
          value={current}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving}
          aria-label={t('country.selector')}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors disabled:opacity-50"
        >
          {jurisdictions.map((j) => (
            <option key={j.code} value={j.code}>
              {j.flag_emoji} {getName(j)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Variant: card (settings page)
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
        🌎 {t('country.label')}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {t('country.yourJurisdiction')}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {jurisdictions.map((j) => {
          const isSelected = j.code === current;
          return (
            <button
              key={j.code}
              type="button"
              onClick={() => handleChange(j.code)}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              } ${saving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
            >
              <span className="text-2xl">{j.flag_emoji}</span>
              <div className="flex-1 text-left">
                <div className="font-semibold text-sm">{getName(j)}</div>
                {j.is_default && (
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                    {t('country.default')}
                  </div>
                )}
              </div>
              {isSelected && (
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-gray-500 leading-relaxed">
        ℹ️ {t('country.ecuadorOnlyNotice')}
      </p>

      {error && (
        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded text-sm text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}
