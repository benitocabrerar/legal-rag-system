'use client';

import { useTranslation, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n';
import { useEffect, useState } from 'react';

interface LanguageSwitcherProps {
  /** 'fixed' shows the switcher anchored to top-right of viewport.
   *  'inline' renders it in the document flow (use inside headers/menus). */
  variant?: 'fixed' | 'inline';
  className?: string;
}

export default function LanguageSwitcher({
  variant = 'fixed',
  className = '',
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useTranslation();
  const [mounted, setMounted] = useState(false);

  // Prevenir hidration mismatch (locale persistido en localStorage no
  // existe en el render del servidor).
  useEffect(() => {
    setMounted(true);
    // Sincronizar el atributo lang del <html> con la locale persistida
    // (zustand-persist rehidrata de localStorage tras hydrate del cliente).
    if (typeof document !== 'undefined' && document.documentElement.lang !== locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  if (!mounted) return null;

  const handleSwitch = (next: Locale) => {
    if (next !== locale) {
      void setLocale(next);
      // Actualizar el atributo lang del <html> para accesibilidad / SEO
      if (typeof document !== 'undefined') {
        document.documentElement.lang = next;
      }
    }
  };

  const containerClass = variant === 'fixed'
    ? 'fixed top-4 right-4 z-50'
    : 'inline-flex';

  return (
    <div className={`${containerClass} ${className}`}>
      <div
        role="group"
        aria-label="Idioma / Language"
        className="inline-flex items-stretch overflow-hidden rounded-full border border-gray-300 bg-white shadow-md hover:shadow-lg transition-all text-xs font-bold tracking-wider"
      >
        {SUPPORTED_LOCALES.map((opt) => {
          const isActive = opt.value === locale;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSwitch(opt.value)}
              aria-pressed={isActive}
              className={`px-3 py-2 transition-colors ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
              title={opt.label}
            >
              <span className="mr-1">{opt.flag}</span>
              <span>{opt.value.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
