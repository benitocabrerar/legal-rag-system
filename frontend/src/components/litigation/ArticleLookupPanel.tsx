'use client';

import { useEffect, useState } from 'react';
import { Search, Loader2, BookMarked, Volume2, X, Sparkles, ChevronRight } from 'lucide-react';
import { litigationAPI, type ArticleLookup } from '@/lib/api';
import { cn } from '@/lib/utils';
import { getAuthToken } from '@/lib/get-auth-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ArticleLookupPanelProps {
  /** Si está presente, el panel pre-carga artículos sugeridos del cerebro del caso. */
  caseId?: string;
}

export function ArticleLookupPanel({ caseId }: ArticleLookupPanelProps = {}) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ArticleLookup | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggested, setSuggested] = useState<Array<{ norm: string; reasoning?: string }>>([]);
  const [loadingSuggested, setLoadingSuggested] = useState(false);

  // Cargar artículos sugeridos del cerebro del caso (applicableLaws)
  const fetchSuggested = async () => {
    if (!caseId) return;
    setLoadingSuggested(true);
    try {
      const token = await getAuthToken();
      const r = await fetch(`${API_URL}/api/v1/cases/${caseId}/brain`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) return;
      const data = await r.json();
      const brain = data?.full || data?.brain || data;
      const laws = Array.isArray(brain?.applicableLaws) ? brain.applicableLaws : [];
      setSuggested(laws.slice(0, 8));
    } catch { /* ignore */ }
    finally { setLoadingSuggested(false); }
  };

  useEffect(() => {
    if (caseId) void fetchSuggested();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const search = async (override?: string) => {
    const q = (override ?? query).trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await litigationAPI.article(q);
      setResult(r);
    } catch (e: any) {
      setError(e?.response?.data?.error === 'ARTICLE_NOT_FOUND'
        ? 'No se encontró ese artículo en el corpus indexado.'
        : 'Error al buscar el artículo.');
    } finally {
      setLoading(false);
    }
  };

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'es-EC';
    window.speechSynthesis.speak(utt);
  };

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <BookMarked className="w-3.5 h-3.5 text-cyan-400" />
        <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Buscar artículo</div>
        <span className="ml-auto text-[10px] text-slate-500">
          <kbd className="px-1 py-0.5 bg-slate-800 rounded text-[9px] font-mono">⌘ /</kbd>
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-slate-500" />
          <input
            id="litigation-article-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder='"Art. 76, Constitución" · "234 COIP"'
            className="w-full pl-7 pr-2 py-1.5 text-[12px] bg-slate-800/60 border border-slate-700 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/50"
          />
        </div>
        <button
          onClick={() => search()}
          disabled={loading || !query.trim()}
          className={cn(
            'h-7 px-2.5 rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-all',
            query.trim() && !loading
              ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed',
          )}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
        </button>
      </div>

      {error && <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-md px-2 py-1.5 mb-2">{error}</div>}

      {/* Sugerencias IA del cerebro del caso — artículos aplicables al caso */}
      {caseId && (suggested.length > 0 || loadingSuggested) && !result && (
        <div className="mb-3 rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Sugeridos por la IA para este caso
            </div>
            <button
              onClick={() => void fetchSuggested()}
              disabled={loadingSuggested}
              className="text-[10px] text-cyan-200/70 hover:text-cyan-100 disabled:opacity-50 transition"
              title="Re-cargar sugerencias desde el cerebro del caso"
            >
              {loadingSuggested ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Actualizar'}
            </button>
          </div>
          {loadingSuggested && suggested.length === 0 ? (
            <div className="text-[11px] text-cyan-100/60 italic">Cargando…</div>
          ) : (
            <ul className="space-y-1">
              {suggested.map((law, i) => (
                <li key={i}>
                  <button
                    onClick={() => {
                      setQuery(law.norm);
                      void search(law.norm);
                    }}
                    className="w-full text-left flex items-start gap-1.5 px-2 py-1 rounded-md hover:bg-cyan-700/20 text-[11px] text-cyan-100 group transition"
                  >
                    <ChevronRight className="w-3 h-3 text-cyan-500 mt-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    <span className="flex-1 min-w-0">
                      <span className="font-bold text-cyan-200">{law.norm}</span>
                      {law.reasoning && (
                        <span className="block text-[10px] text-cyan-200/60 mt-0.5 line-clamp-2">{law.reasoning}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result && (
        <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-3 space-y-2 max-h-[40vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{result.source.normType?.replace(/_/g, ' ')}</div>
              <div className="text-[12px] font-bold text-slate-100">{result.source.title}</div>
            </div>
            <button onClick={() => setResult(null)} className="text-slate-500 hover:text-slate-300" title="Cerrar">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="rounded-md bg-cyan-950/40 border border-cyan-700/30 p-2">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-cyan-200 font-bold text-sm">
                Art. {result.article.numberText ?? result.article.number}
              </span>
              <button
                onClick={() => speak(`Artículo ${result.article.number}. ${result.article.content}`)}
                title="Leer en voz alta"
                className="text-cyan-400 hover:text-cyan-200 transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {result.article.title && (
              <div className="text-[11px] font-semibold text-cyan-100 mb-1">{result.article.title}</div>
            )}
            <p className="text-[12px] text-slate-200 leading-relaxed whitespace-pre-wrap">{result.article.content}</p>
          </div>

          {result.alternatives.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1">Otras coincidencias</div>
              <div className="flex flex-wrap gap-1">
                {result.alternatives.map((a) => (
                  <span
                    key={a.articleId}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400"
                  >
                    {a.sourceTitle}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
