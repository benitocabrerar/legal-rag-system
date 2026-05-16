'use client';

/**
 * Dashboard · Traductor Jurídico
 *
 * Traduce texto legal español ⇄ inglés preservando el sentido jurídico.
 * Núcleo del modo bilingüe (Fase 3): pieza para el abogado que sirve
 * clientes hispanos en EE.UU.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  AlertTriangle, ArrowLeftRight, BookA, Clock, Copy, Languages, Loader2,
  Sparkles,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────
type Lang = 'es' | 'en';
interface GlossaryEntry { source: string; target: string; note: string }
interface Translation {
  id: string; caseId: string | null;
  sourceLang: Lang; targetLang: Lang; docType: string;
  sourceText: string; translatedText: string | null;
  glossary: GlossaryEntry[]; durationMs: number; createdAt: string;
}
interface DocType { key: string; label: string }

const LANG_LABEL: Record<Lang, string> = { es: 'Español', en: 'Inglés' };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── PAGE ─────────────────────────────────────────────────────────────────
export default function TraductorPage() {
  const [sourceLang, setSourceLang] = useState<Lang>('es');
  const [docType, setDocType] = useState('general');
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [sourceText, setSourceText] = useState('');
  const [result, setResult] = useState<Translation | null>(null);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Translation[]>([]);
  const [copied, setCopied] = useState(false);

  const targetLang: Lang = sourceLang === 'es' ? 'en' : 'es';

  const loadHistory = useCallback(async () => {
    try {
      const r = await api.get<{ translations: Translation[] }>('/legal-translate/history', {
        params: { limit: 20 },
      });
      setHistory(r.data.translations ?? []);
    } catch { /* historial no crítico */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<{ docTypes: DocType[] }>('/legal-translate/doc-types');
        setDocTypes(r.data.docTypes ?? []);
      } catch { /* usa default */ }
    })();
    loadHistory();
  }, [loadHistory]);

  const swapDirection = () => {
    setSourceLang((l) => (l === 'es' ? 'en' : 'es'));
    // Si hay resultado, el texto traducido pasa a ser la nueva fuente.
    if (result?.translatedText) {
      setSourceText(result.translatedText);
      setResult(null);
    }
  };

  const translate = async () => {
    if (sourceText.trim().length < 3) {
      setError('Escribí un texto para traducir.');
      return;
    }
    setTranslating(true);
    setError('');
    try {
      const r = await api.post<{ translation: Translation }>('/legal-translate', {
        sourceText,
        sourceLang,
        targetLang,
        docType,
      });
      setResult(r.data.translation);
      setHistory((prev) => [r.data.translation, ...prev]);
    } catch (e: any) {
      // El aviso "función en desarrollo" lo muestra FeatureDevNotice (global).
      if (e?.response?.data?.code !== 'feature_in_development') {
        setError(e?.response?.data?.error || e?.message || 'No se pudo traducir el texto');
      }
    } finally {
      setTranslating(false);
    }
  };

  const openHistory = (t: Translation) => {
    setSourceLang(t.sourceLang);
    setDocType(t.docType);
    setSourceText(t.sourceText);
    setResult(t);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyResult = () => {
    if (!result?.translatedText) return;
    navigator.clipboard?.writeText(result.translatedText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow-md">
          <Languages className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Traductor Jurídico</h1>
          <p className="text-sm text-gray-500">
            Traducción legal español ⇄ inglés que preserva el sentido jurídico
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{error}</div>
        </div>
      )}

      {/* ─── CONTROLES ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <span className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700">{LANG_LABEL[sourceLang]}</span>
          <button
            onClick={swapDirection}
            title="Invertir dirección"
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
          <span className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700">{LANG_LABEL[targetLang]}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs font-medium text-gray-500">Tipo de documento</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          >
            {(docTypes.length > 0 ? docTypes : [{ key: 'general', label: 'General' }]).map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── PANELES ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Origen */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              {LANG_LABEL[sourceLang]} · original
            </span>
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Pegá acá el texto jurídico a traducir…"
            rows={16}
            className="flex-1 w-full px-4 py-3 text-sm text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
            {sourceText.length.toLocaleString('es-EC')} caracteres
          </div>
        </div>

        {/* Destino */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              {LANG_LABEL[targetLang]} · traducción
            </span>
            {result?.translatedText && (
              <button onClick={copyResult}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition">
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            )}
          </div>
          <div className="flex-1 px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap overflow-y-auto min-h-[20rem]">
            {translating ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Traduciendo…
              </div>
            ) : result?.translatedText ? (
              result.translatedText
            ) : (
              <span className="text-gray-300">La traducción aparecerá acá.</span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={translate}
        disabled={translating}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 rounded-lg hover:shadow-lg disabled:opacity-50 transition"
      >
        {translating
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Traduciendo…</>
          : <><Sparkles className="h-4 w-4" /> Traducir</>}
      </button>

      {/* ─── GLOSARIO ───────────────────────────────────────────── */}
      {result && result.glossary.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <BookA className="h-4 w-4 text-indigo-600" />
              Glosario de términos jurídicos
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Equivalencias usadas en la traducción. Verificá que se ajusten al contexto.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">{LANG_LABEL[result.sourceLang]}</th>
                  <th className="px-4 py-2 text-left font-semibold">{LANG_LABEL[result.targetLang]}</th>
                  <th className="px-4 py-2 text-left font-semibold">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.glossary.map((g, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-medium text-gray-900">{g.source}</td>
                    <td className="px-4 py-2 text-indigo-700">{g.target}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{g.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── DISCLAIMER ─────────────────────────────────────────── */}
      <p className="text-xs text-gray-400 text-center">
        La traducción asistida por IA es un borrador de trabajo. Para presentaciones
        oficiales puede requerirse una traducción certificada.
      </p>

      {/* ─── HISTORIAL ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            Traducciones recientes
          </h2>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Todavía no hiciste ninguna traducción.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((t) => (
              <button
                key={t.id}
                onClick={() => openHistory(t)}
                className="w-full flex items-center gap-3 p-3.5 hover:bg-gray-50 transition text-left"
              >
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 flex-shrink-0">
                  {t.sourceLang.toUpperCase()} → {t.targetLang.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 truncate">{t.sourceText.slice(0, 90)}</div>
                  <div className="text-xs text-gray-400">{formatDateTime(t.createdAt)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
