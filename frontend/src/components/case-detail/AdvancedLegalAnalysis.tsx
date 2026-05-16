'use client';

/**
 * AdvancedLegalAnalysis — "Fundamentación Jurídica Avanzada".
 *
 * Lista los análisis IA de referencias legales guardados en el caso. Cada
 * análisis es un documento kind='ai_analysis' que ya forma parte del cerebro
 * del expediente: cuanto más analiza el abogado, mejores son los argumentos
 * que la IA tiene para redactar documentos e informes.
 *
 * Se actualiza en vivo: escucha el evento `poweria:legal-analysis-saved` que
 * emite el LegalReferenceDialog al guardar un análisis nuevo.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Brain, Sparkles, RefreshCw, X, Scale, ChevronRight, Loader2, BookOpenCheck,
} from 'lucide-react';

interface Analysis {
  id: string;
  title: string;
  content: string;
  norm: string | null;
  article: string | null;
  model: string | null;
  createdAt: string;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export function AdvancedLegalAnalysis({ caseId }: { caseId: string }) {
  const [items, setItems] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<Analysis | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const r = await api.get<{ analyses: Analysis[] }>(`/cases/${caseId}/legal-analyses`);
      setItems(r.data.analyses ?? []);
    } catch {
      /* el caso puede no tener análisis aún */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [caseId]);

  useEffect(() => { void load(); }, [load]);

  // Se actualiza cuando el diálogo de referencia guarda un análisis nuevo.
  useEffect(() => {
    const handler = () => { void load(); };
    window.addEventListener('poweria:legal-analysis-saved', handler);
    return () => window.removeEventListener('poweria:legal-analysis-saved', handler);
  }, [load]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-violet-50 to-fuchsia-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 grid place-items-center text-white shadow-sm shrink-0">
            <Brain className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-gray-900 flex-1 leading-tight">
            Fundamentación Jurídica Avanzada
          </h3>
          {items.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700">
              {items.length}
            </span>
          )}
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            title="Actualizar"
            aria-label="Actualizar análisis"
            className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/80 transition disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="mt-2 text-[12px] text-violet-900/70 leading-relaxed flex items-start gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
          <span>
            Análisis IA de normas guardados en el caso. Forman parte del{' '}
            <strong>cerebro del expediente</strong> — mientras más investigás, mejores
            argumentos tiene la IA para redactar documentos e informes.
          </span>
        </p>
      </div>

      {/* Lista */}
      <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <BookOpenCheck className="w-11 h-11 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">Aún no hay análisis guardados</p>
            <p className="text-xs text-gray-400 mt-1">
              Analizá una referencia legal del panel de arriba y se guardará acá
              automáticamente, sumándose al cerebro del caso.
            </p>
          </div>
        ) : (
          items.map((a) => (
            <button
              key={a.id}
              onClick={() => setOpen(a)}
              className="w-full text-left p-3.5 hover:bg-violet-50/60 transition-colors group flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-100 grid place-items-center text-violet-700 shrink-0">
                <Scale className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 group-hover:text-violet-700 transition-colors leading-snug">
                  {a.norm || a.title}
                  {a.article && <span className="ml-1.5 text-violet-600">{a.article}</span>}
                </div>
                <div className="mt-0.5 text-[11px] text-gray-400">
                  {fmtDate(a.createdAt)}
                  {a.model && <span className="ml-1.5">· {a.model}</span>}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-500 transition-colors shrink-0 mt-1" />
            </button>
          ))
        )}
      </div>

      {/* Modal de lectura del análisis guardado */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl bg-white sm:rounded-2xl shadow-2xl flex flex-col max-h-screen sm:max-h-[88vh]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
            <div className="shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 grid place-items-center text-white shadow-md shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900 leading-tight">
                  {open.norm || open.title}
                  {open.article && <span className="ml-1.5 text-violet-600">{open.article}</span>}
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Fundamentación jurídica avanzada · {fmtDate(open.createdAt)}
                  {open.model && ` · ${open.model}`}
                </p>
              </div>
              <button
                onClick={() => setOpen(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition shrink-0"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                {open.content}
              </pre>
            </div>
            <div className="shrink-0 px-5 sm:px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
              <span className="text-[11px] text-gray-500">Parte del cerebro del caso</span>
              <button
                onClick={() => setOpen(null)}
                className="inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-sm transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
