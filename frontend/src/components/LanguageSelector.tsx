/**
 * LanguageSelector Component
 * Allows users to switch between languages (i18n)
 */

'use client';

import React from 'react';
import { useTranslation, SUPPORTED_LOCALES, Locale } from '@/lib/i18n';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LanguageSelectorProps {
  /** Display variant */
  variant?: 'dropdown' | 'inline';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Usage:
 * <LanguageSelector variant="dropdown" />
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'dropdown',
  className,
}) => {
  const { locale, setLocale } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleLanguageChange = async (newLocale: Locale) => {
    await setLocale(newLocale);
    setIsOpen(false);
  };

  const currentLanguage = SUPPORTED_LOCALES.find((lang) => lang.value === locale);

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)} role="group" aria-label="Language selection">
        <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
        {SUPPORTED_LOCALES.map((lang) => (
          <button
            key={lang.value}
            onClick={() => handleLanguageChange(lang.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              locale === lang.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
            aria-label={`Switch to ${lang.label}`}
            aria-pressed={locale === lang.value}
          >
            {lang.flag} {lang.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-gray-100 dark:bg-gray-800',
          'text-gray-700 dark:text-gray-300',
          'hover:bg-gray-200 dark:hover:bg-gray-700',
          'transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        )}
        aria-label="Select language"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Globe className="w-4 h-4" aria-hidden="true" />
        <span className="text-sm font-medium">
          {currentLanguage?.flag} {currentLanguage?.label}
        </span>
        <svg
          className={cn(
            'w-4 h-4 transition-transform',
            isOpen && 'transform rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown */}
          <div
            className={cn(
              'absolute right-0 mt-2 w-48 z-20',
              'bg-white dark:bg-gray-800',
              'rounded-lg shadow-lg border border-gray-200 dark:border-gray-700',
              'py-1',
              'animate-scale-in'
            )}
            role="listbox"
            aria-label="Language options"
          >
            {SUPPORTED_LOCALES.map((lang) => (
              <button
                key={lang.value}
                onClick={() => handleLanguageChange(lang.value)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2',
                  'text-sm text-left',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'transition-colors',
                  locale === lang.value &&
                    'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                )}
                role="option"
                aria-selected={locale === lang.value}
              >
                <span className="text-xl" aria-hidden="true">
                  {lang.flag}
                </span>
                <span className="font-medium">{lang.label}</span>
                {locale === lang.value && (
                  <svg
                    className="w-4 h-4 ml-auto text-blue-600 dark:text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;
