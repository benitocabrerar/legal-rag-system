'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  X, Sparkles, AlertTriangle, ListChecks, Scale, Gauge, Zap,
  Clock, Loader2, RefreshCw, ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

interface AiSummary {
  headline?: string;
  teaser?: string;
  summary?: string;
  keyFacts?: string[];
  legalAreas?: string[];
  risks?: string[];
  nextSteps?: string[];
  estimatedComplexity?: 'baja' | 'media' | 'alta';
  urgency?: 'baja' | 'media' | 'alta' | 'crítica';
  generatedAt?: string;
  model?: string;
  provider?: string;
}

interface Props {
  caseId: string;
  caseTitle: string;
  initialSummary?: AiSummary | null;
  onClose: () => void;
}

const URGENCY_STYLES: Record<string, string> = {
  'baja': 'bg-emerald-100 text-emerald-800',
  'media': 'bg-yellow-100 text-yellow-800',
  'alta': 'bg-orange-100 text-orange-800',
  'crítica': 'bg-red-100 text-red-800',
};

const COMPLEXITY_STYLES: Record<string, string> = {
  'baja': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'media': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'alta': 'bg-orange-50 text-orange-700 border-orange-200',
};

export function CaseAiSummaryModal({ caseId, caseTitle, initialSummary, onClose }: Props) {
  const [summary, setSummary] = useState<AiSummary | null>(initialSummary || null);
  const [loading, setLoading] = useState(!initialSummary);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const generate = async (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const res = await api.post(`/cases/${caseId}/ai-summary${force ? '?force=true' : ''}`);
      setSummary(res.data.summary);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al generar resumen');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!summary && !loading) generate();
    // si initialSummary existía, no hacemos fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cerrar con ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl
                   bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50
                   border-2 border-emerald-300 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        {/* Decorative top accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-green-500 to-lime-400" />

        {/* Header */}
        <div className="px-6 sm:px-8 pt-7 pb-4 border-b border-emerald-200 bg-white/40 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-md">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  Super-resumen IA del caso
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 leading-tight">
                  {caseTitle}
                </h2>
                {summary?.headline && (
                  <p className="text-sm sm:text-base text-emerald-800 mt-1 italic">
                    "{summary.headline}"
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-emerald-100 transition-colors text-gray-500 hover:text-gray-900"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Badges row */}
          {summary && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {summary.urgency && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${URGENCY_STYLES[summary.urgency] || URGENCY_STYLES.media}`}>
                  ⚡ Urgencia {summary.urgency}
                </span>
              )}
              {summary.estimatedComplexity && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${COMPLEXITY_STYLES[summary.estimatedComplexity] || COMPLEXITY_STYLES.media}`}>
                  📊 Complejidad {summary.estimatedComplexity}
                </span>
              )}
              {summary.legalAreas?.slice(0, 3).map((area) => (
                <span key={area} className="px-3 py-1 rounded-full text-xs font-semibold bg-white/70 text-emerald-800 border border-emerald-200">
                  ⚖️ {area}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 sm:px-8 py-6 space-y-6" style={{ maxHeight: 'calc(90vh - 220px)' }}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
              <strong className="block mb-1">No se pudo generar el resumen.</strong>
              {error}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full blur-xl opacity-50 animate-pulse" />
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin relative" />
              </div>
              <p className="text-emerald-800 font-semibold mt-4">Analizando el caso con IA...</p>
              <p className="text-emerald-600 text-sm mt-1">Esto toma unos segundos</p>
            </div>
          )}

          {summary && !loading && (
            <>
              {/* Resumen ejecutivo */}
              {summary.summary && (
                <section className="bg-white/70 backdrop-blur-sm rounded-xl border border-emerald-200 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Resumen ejecutivo
                  </h3>
                  <div className="text-gray-800 leading-relaxed text-sm whitespace-pre-line">
                    {summary.summary}
                  </div>
                </section>
              )}

              {/* Hechos clave */}
              {summary.keyFacts && summary.keyFacts.length > 0 && (
                <section className="bg-white/70 backdrop-blur-sm rounded-xl border border-emerald-200 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />
                    Hechos clave
                  </h3>
                  <ul className="space-y-2">
                    {summary.keyFacts.map((fact, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-800">
                        <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Riesgos */}
              {summary.risks && summary.risks.length > 0 && (
                <section className="bg-amber-50/80 backdrop-blur-sm rounded-xl border border-amber-200 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Riesgos detectados
                  </h3>
                  <ul className="space-y-2">
                    {summary.risks.map((risk, i) => (
                      <li key={i} className="flex gap-2 text-sm text-amber-900">
                        <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Próximos pasos */}
              {summary.nextSteps && summary.nextSteps.length > 0 && (
                <section className="bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl border border-emerald-300 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Próximos pasos sugeridos
                  </h3>
                  <ol className="space-y-2">
                    {summary.nextSteps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-emerald-900">
                        <span className="flex-shrink-0 w-6 h-6 rounded-md bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                          {i + 1}
                        </span>
                        <span className="font-medium">{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Footer meta */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs text-emerald-700">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Generado{' '}
                    {summary.generatedAt
                      ? new Date(summary.generatedAt).toLocaleString('es-EC', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })
                      : 'recién'}
                  </span>
                  {summary.model && (
                    <span className="ml-1 px-2 py-0.5 bg-white/70 rounded-full text-emerald-800 font-mono">
                      {summary.model}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-4 border-t border-emerald-200 bg-white/60 backdrop-blur-sm flex items-center justify-between gap-3">
          <button
            onClick={() => generate(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Regenerando...' : 'Regenerar resumen'}
          </button>
          <Link
            href={`/dashboard/cases/${caseId}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold text-sm shadow-md transition-all"
            onClick={onClose}
          >
            Ver caso completo
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
