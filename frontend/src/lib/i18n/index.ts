/**
 * Internationalization (i18n) Configuration
 * Supports Spanish and English with local storage persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Type-safe locale keys
export type Locale = 'es' | 'en';

// Translation keys interface
export interface Translations {
  common: {
    search: string;
    loading: string;
    error: string;
    success: string;
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    edit: string;
    close: string;
    back: string;
    next: string;
    previous: string;
    submit: string;
    retry: string;
    loadMore: string;
  };
  navigation: {
    home: string;
    search: string;
    documents: string;
    analytics: string;
    settings: string;
    help: string;
  };
  search: {
    placeholder: string;
    noResults: string;
    resultsCount: string;
    searching: string;
    filters: string;
    sortBy: string;
    relevance: string;
    date: string;
  };
  documents: {
    title: string;
    upload: string;
    download: string;
    preview: string;
    metadata: string;
    citations: string;
    references: string;
    uploadSuccess: string;
    uploadError: string;
  };
  analytics: {
    title: string;
    queryVolume: string;
    topDocuments: string;
    userActivity: string;
    performance: string;
    trend: string;
    thisWeek: string;
    thisMonth: string;
    thisYear: string;
  };
  errors: {
    generic: string;
    network: string;
    notFound: string;
    unauthorized: string;
    serverError: string;
    timeout: string;
    retry: string;
  };
  accessibility: {
    skipToMain: string;
    closeDialog: string;
    openMenu: string;
    closeMenu: string;
    loading: string;
    searchResults: string;
  };
}

// I18n Store
interface I18nStore {
  locale: Locale;
  translations: Translations;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

// Cache de claves ya advertidas para no spamear la consola
const _warnedMissing = new Set<string>();

// Get nested translation by dot notation (e.g., "common.search")
function getNestedTranslation(obj: any, path: string): string {
  // Si las traducciones aún no terminaron de cargar (initI18n async), el
  // store tiene `{}` y CADA componente que llama t() en el primer render
  // dispara warning. Devolvemos el path silenciosamente — al hidratar,
  // los componentes re-renderizan con la traducción real.
  if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) {
    return path;
  }

  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (current == null || current[key] === undefined) {
      // Solo advertir UNA vez por clave faltante (en dev)
      if (process.env.NODE_ENV !== 'production' && !_warnedMissing.has(path)) {
        _warnedMissing.add(path);
        console.warn(`[i18n] Translation missing: ${path}`);
      }
      return path;
    }
    current = current[key];
  }

  return typeof current === 'string' ? current : path;
}

// Create i18n store with persistence
export const useI18n = create<I18nStore>()(
  persist(
    (set, get) => ({
      locale: 'es',
      translations: {} as Translations,

      setLocale: async (locale: Locale) => {
        try {
          // Dynamically import translations
          const translations = await import(`./locales/${locale}.json`);
          set({ locale, translations: translations.default });
        } catch (error) {
          console.error(`Failed to load translations for locale: ${locale}`, error);
        }
      },

      t: (key: string) => {
        const { translations } = get();
        return getNestedTranslation(translations, key);
      },
    }),
    {
      name: 'i18n-storage',
      partialize: (state) => ({ locale: state.locale }),
    }
  )
);

// Initialize with default locale (or load persisted preference from localStorage)
export const initI18n = async (defaultLocale: Locale = 'es') => {
  const { setLocale, locale: persistedLocale } = useI18n.getState();
  // Si zustand-persist ya rehidrató una locale válida, respetarla.
  const localeToUse: Locale =
    persistedLocale === 'es' || persistedLocale === 'en' ? persistedLocale : defaultLocale;
  await setLocale(localeToUse);
};

// Hook for easy translation access
export const useTranslation = () => {
  const { t, locale, setLocale } = useI18n();

  return {
    t,
    locale,
    setLocale,
  };
};

// Supported locales
export const SUPPORTED_LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
];
