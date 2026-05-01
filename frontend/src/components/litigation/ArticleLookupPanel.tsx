'use client';

import { useState } from 'react';
import { Search, Loader2, BookMarked, Volume2, X } from 'lucide-react';
import { litigationAPI, type ArticleLookup } from '@/lib/api';
import { cn } from '@/lib/utils';

export function ArticleLookupPanel() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ArticleLookup | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
