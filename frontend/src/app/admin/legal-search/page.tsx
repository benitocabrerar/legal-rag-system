'use client';

/**
 * Admin · Legal Search
 *
 * Búsqueda avanzada con IA sobre corpus + fuentes externas. Permite
 * encontrar leyes, reglamentos, ordenanzas, resoluciones, y si no
 * están en el corpus, descargarlas e ingestarlas automáticamente.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Search, Loader2, Sparkles, Brain, ChevronDown, ChevronRight,
  Download, ExternalLink, CheckCircle2, AlertTriangle, BookOpen,
  Filter, X, Zap, Lightbulb, FileText, Hash, Calendar,
  Clock, ArrowRight, Star, History, FolderPlus, Briefcase,
} from 'lucide-react';
import { api } from '@/lib/api';

interface InternalResult {
  source: 'internal';
  legalDocId: string;
  title: string;
  normTitle: string | null;
  normType: string | null;
  legalHierarchy: string | null;
  category: string | null;
  publicationDate: string | null;
  publicationNumber: string | null;
  topSnippet: string;
  score: number;
  matchedChunks: number;
  totalChunks: number;
  metadata: any;
}

interface ExternalResult {
  source: 'registro_oficial';
  title: string;
  url: string;
  excerpt: string | null;
  pdfUrl: string | null;
  pubDate: string | null;
  score: number;
  isInCorpus: boolean;
  matchedLegalDocId?: string;
}

type SearchResult = InternalResult | ExternalResult;

interface SearchResponse {
  queryId: string;
  originalQuery: string;
  reformulatedQuery: string | null;
  aiHints: string[] | null;
  results: SearchResult[];
  internalCount: number;
  externalCount: number;
  totalCount: number;
  durationMs: number;
}

const HIERARCHY_OPTIONS = [
  { value: 'CONSTITUCION', label: 'Constitución', icon: '🏛️' },
  { value: 'TRATADOS_INTERNACIONALES_DDHH', label: 'Tratados DDHH', icon: '🌐' },
  { value: 'CODIGOS_ORGANICOS', label: 'Códigos Orgánicos', icon: '⚖️' },
  { value: 'LEYES_ORGANICAS', label: 'Leyes Orgánicas', icon: '📜' },
  { value: 'CODIGOS_ORDINARIOS', label: 'Códigos Ordinarios', icon: '📕' },
  { value: 'LEYES_ORDINARIAS', label: 'Leyes Ordinarias', icon: '📄' },
  { value: 'REGLAMENTOS', label: 'Reglamentos', icon: '⚙️' },
  { value: 'RESOLUCIONES', label: 'Resoluciones', icon: '📋' },
  { value: 'ORDENANZAS', label: 'Ordenanzas', icon: '🏘️' },
];

const SCOPE_OPTIONS = [
  { value: 'all', label: 'Todo', icon: '🌐', desc: 'Cualquier nivel' },
  { value: 'national', label: 'Nacional', icon: '🇪🇨', desc: 'Aplicación nacional' },
  { value: 'intermediate', label: 'Intermedio', icon: '🏛️', desc: 'Provincial / regional' },
  { value: 'local', label: 'Local', icon: '🏘️', desc: 'Cantonal / municipal' },
  { value: 'international', label: 'Internacional', icon: '🌍', desc: 'ONU · OEA · CAN · UE · CIJ' },
];

interface IntlSuggestion {
  source: {
    id: string;
    name: string;
    shortName: string;
    jurisdiction: string;
    icon: string;
    category: string;
    description: string;
  };
  url: string;
}

interface EcSuggestion {
  source: {
    id: string;
    name: string;
    shortName: string;
    type: string;
    icon: string;
    description: string;
    documentTypes: string[];
    isOfficialAuthoritative: boolean;
  };
  url: string;
}

export default function LegalSearchPage() {
  const [query, setQuery] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [includeExternal, setIncludeExternal] = useState(true);
  const [scope, setScope] = useState<'all' | 'national' | 'intermediate' | 'local' | 'international'>('all');
  const [selectedHierarchies, setSelectedHierarchies] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');

  const [aiSummary, setAiSummary] = useState<{ summary: string; keyPoints: string[] } | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [intlSuggestions, setIntlSuggestions] = useState<IntlSuggestion[]>([]);
  const [ecSuggestions, setEcSuggestions] = useState<EcSuggestion[]>([]);
  const [showIntl, setShowIntl] = useState(false);
  const [showEc, setShowEc] = useState(false);

  const [ingesting, setIngesting] = useState<string | null>(null); // url being ingested
  const [ingestProgress, setIngestProgress] = useState<{
    pct: number;
    label: string;
    step?: string;
    result?: any;
    error?: string;
  } | null>(null);

  // Norma seleccionada para agregar a un caso (abre AttachToCaseModal).
  const [attachTarget, setAttachTarget] = useState<{
    kind: 'internal' | 'external';
    title: string;
    legalDocId?: string;
    sourceUrl?: string;
    pdfUrl?: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    setResults(null);
    setAiSummary(null);
    setIntlSuggestions([]);
    setEcSuggestions([]);
    try {
      const [searchRes, intlRes, ecRes] = await Promise.all([
        api.post<SearchResponse>('/admin/legal-search/query', {
          query: query.trim(),
          useAI,
          includeExternal,
          filters: {
            scope,
            hierarchy: selectedHierarchies.length > 0 ? selectedHierarchies : undefined,
          },
          limit: 12,
        }),
        api.get<{ suggestions: IntlSuggestion[] }>(`/admin/legal-search/international-sources`, {
          params: { q: query.trim() },
        }).catch(() => ({ data: { suggestions: [] } })),
        api.get<{ suggestions: EcSuggestion[] }>(`/admin/legal-search/ecuador-sources`, {
          params: { q: query.trim() },
        }).catch(() => ({ data: { suggestions: [] } })),
      ]);
      setResults(searchRes.data);
      setIntlSuggestions(intlRes.data.suggestions || []);
      setEcSuggestions(ecRes.data.suggestions || []);
      // Auto-expandir si el scope incluye internacional
      if (scope === 'international') setShowIntl(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error en búsqueda');
    } finally {
      setSearching(false);
    }
  };

  const generateSummary = async () => {
    if (!results || results.results.length === 0) return;
    setSummarizing(true);
    try {
      const r = await api.post<{ summary: string; keyPoints: string[] }>(
        '/admin/legal-search/summarize',
        { results: results.results.slice(0, 8) },
      );
      setAiSummary(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error generando resumen');
    } finally {
      setSummarizing(false);
    }
  };

  const downloadAndIngest = async (result: ExternalResult) => {
    setIngesting(result.url);
    setIngestProgress({ pct: 0, label: 'Conectando…' });
    try {
      const { getAuthToken } = await import('@/lib/get-auth-token');
      const token = await getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const r = await fetch(`${API_URL}/api/v1/admin/legal-search/download-and-ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: result.title,
          sourceUrl: result.url,
          pdfUrl: result.pdfUrl,
          excerpt: result.excerpt,
        }),
      });
      if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const lines = chunk.split('\n').filter((l) => !l.startsWith(':'));
          const evLine = lines.find((l) => l.startsWith('event:'));
          const dataLine = lines.find((l) => l.startsWith('data:'));
          if (!dataLine) continue;
          const event = evLine ? evLine.slice(6).trim() : 'message';
          let payload: any = null;
          try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }

          if (event === 'phase') {
            setIngestProgress((p) => p ? { ...p, pct: payload.pct ?? p.pct, label: payload.label } : p);
          } else if (event === 'step') {
            setIngestProgress((p) => p ? { ...p, step: stepLabel(payload.step), label: stepLabel(payload.step) } : p);
          } else if (event === 'done') {
            setIngestProgress((p) => p ? { ...p, pct: 100, label: '✓ Ingestada al corpus', result: payload } : p);
          } else if (event === 'error') {
            setIngestProgress((p) => p ? { ...p, error: payload.error } : p);
          }
        }
      }
    } catch (e: any) {
      setIngestProgress((p) => p ? { ...p, error: e?.message || 'Error desconocido' } : p);
    } finally {
      setIngesting(null);
    }
  };

  const toggleHierarchy = (h: string) => {
    setSelectedHierarchies((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h],
    );
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">🔍 Búsqueda Legal Inteligente</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Busca leyes, reglamentos, ordenanzas y resoluciones en el corpus interno y
            fuentes externas (Registro Oficial). Si no está en el sistema, descárgala y
            vectorízala en un click.
          </p>
        </div>
        <Link href="/admin/registro-oficial" className="text-xs font-bold text-violet-700 hover:underline">
          ← Panel del RO
        </Link>
      </div>

      {/* SEARCH BAR */}
      <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 shadow-lg shadow-violet-100/50">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !searching && runSearch()}
              placeholder='Ej: "ley de tránsito", "COIP", "divorcio mutuo consentimiento", "ordenanza ruido nocturno"…'
              className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none text-base font-medium bg-white"
            />
          </div>
          <button
            onClick={runSearch}
            disabled={searching || !query.trim()}
            className="shrink-0 inline-flex items-center gap-2 px-6 py-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {searching ? 'Buscando…' : 'Buscar'}
          </button>
        </div>

        {/* Quick toggles */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-violet-200 cursor-pointer text-xs font-bold text-violet-900 hover:bg-violet-50 transition">
            <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} className="rounded" />
            <Brain className="w-3.5 h-3.5" />
            Asistente IA
          </label>
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-violet-200 cursor-pointer text-xs font-bold text-violet-900 hover:bg-violet-50 transition">
            <input type="checkbox" checked={includeExternal} onChange={(e) => setIncludeExternal(e.target.checked)} className="rounded" />
            <ExternalLink className="w-3.5 h-3.5" />
            Incluir Registro Oficial
          </label>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition ${
              showFilters ? 'bg-violet-100 border-violet-300 text-violet-900' : 'bg-white border-violet-200 text-violet-700 hover:bg-violet-50'
            }"
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros avanzados
            <ChevronDown className={`w-3 h-3 transition ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {(selectedHierarchies.length > 0 || scope !== 'all') && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
              {selectedHierarchies.length + (scope !== 'all' ? 1 : 0)} filtros activos
            </span>
          )}
        </div>

        {/* Filtros expandidos */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-violet-200 space-y-3">
            <div>
              <div className="text-[11px] font-black text-violet-900 uppercase tracking-wide mb-1.5">Nivel de aplicación</div>
              <div className="flex flex-wrap gap-1.5">
                {SCOPE_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setScope(s.value as any)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border-2 transition ${
                      scope === s.value ? 'bg-violet-600 text-white border-violet-700' : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300'
                    }`}
                    title={s.desc}
                  >
                    <span>{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-black text-violet-900 uppercase tracking-wide mb-1.5">Tipo de norma</div>
              <div className="flex flex-wrap gap-1.5">
                {HIERARCHY_OPTIONS.map((h) => {
                  const active = selectedHierarchies.includes(h.value);
                  return (
                    <button
                      key={h.value}
                      onClick={() => toggleHierarchy(h.value)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border-2 transition ${
                        active ? 'bg-violet-600 text-white border-violet-700' : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300'
                      }`}
                    >
                      <span>{h.icon}</span>
                      {h.label}
                      {active && <X className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border-2 border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Sugerencia IA */}
      {results?.reformulatedQuery && results.reformulatedQuery.toLowerCase() !== results.originalQuery.toLowerCase() && (
        <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 grid place-items-center text-white shrink-0">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-black text-amber-900 uppercase tracking-wide mb-1">Sugerencia IA</div>
              <p className="text-sm text-amber-900 leading-relaxed">
                ¿Buscas: <strong>"{results.reformulatedQuery}"</strong>?
              </p>
              {results.aiHints && results.aiHints.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {results.aiHints.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => { setQuery(h); inputRef.current?.focus(); }}
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 transition border border-amber-300"
                    >
                      🔍 {h}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      {results && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm">
              <span className="font-black text-slate-900">{results.totalCount}</span>
              <span className="text-slate-600"> resultado(s) en </span>
              <span className="font-mono text-slate-700">{results.durationMs}ms</span>
              <span className="text-slate-500 mx-1">·</span>
              <span className="text-emerald-700">{results.internalCount} en tu corpus</span>
              {results.externalCount > 0 && (
                <>
                  <span className="text-slate-500 mx-1">·</span>
                  <span className="text-amber-700">{results.externalCount} en RO</span>
                </>
              )}
            </div>
            {results.results.length > 1 && (
              <button
                onClick={generateSummary}
                disabled={summarizing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition shadow-sm disabled:opacity-50"
              >
                {summarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Resumir con IA
              </button>
            )}
          </div>

          {aiSummary && (
            <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-violet-700" />
                <div className="text-xs font-black text-violet-900 uppercase tracking-wide">Análisis IA</div>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed mb-3">{aiSummary.summary}</p>
              {aiSummary.keyPoints.length > 0 && (
                <ul className="space-y-1">
                  {aiSummary.keyPoints.map((p, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                      <Star className="w-3 h-3 text-violet-500 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="space-y-3">
            {results.results.map((r, i) => (
              r.source === 'internal' ? (
                <InternalResultCard
                  key={`int-${i}`}
                  result={r}
                  query={query}
                  onAttach={() => setAttachTarget({
                    kind: 'internal',
                    title: r.normTitle || r.title,
                    legalDocId: r.legalDocId,
                  })}
                />
              ) : (
                <ExternalResultCard
                  key={`ext-${i}`}
                  result={r}
                  onIngest={() => downloadAndIngest(r)}
                  ingesting={ingesting === r.url}
                  onAttach={() => setAttachTarget({
                    kind: 'external',
                    title: r.title,
                    sourceUrl: r.url,
                    pdfUrl: r.pdfUrl || undefined,
                  })}
                />
              )
            ))}
          </div>

          {results.results.length === 0 && (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <Search className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">Sin resultados</p>
              <p className="text-xs mt-1">Prueba con palabras más generales o activa el Asistente IA</p>
            </div>
          )}

          {/* ═══ FUENTES OFICIALES ECUADOR ═══ */}
          {ecSuggestions.length > 0 && (
            <div className="mt-6 rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50/50 to-white">
              <button
                onClick={() => setShowEc((v) => !v)}
                className="w-full flex items-center gap-3 p-4 hover:bg-amber-100/30 transition rounded-xl"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 grid place-items-center text-white shrink-0 shadow">
                  <span className="text-lg">🇪🇨</span>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-black text-amber-900">
                    Buscar también en {ecSuggestions.length} fuentes oficiales de Ecuador
                  </div>
                  <p className="text-[11px] text-amber-800/80 mt-0.5">
                    Asamblea Nacional · Corte Constitucional · Corte Nacional de Justicia · Tribunales · SRI · Contraloría · SERCOP
                  </p>
                </div>
                <ChevronDown className={`w-5 h-5 text-amber-700 transition ${showEc ? 'rotate-180' : ''}`} />
              </button>
              {showEc && (
                <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {ecSuggestions.map((s) => (
                    <a
                      key={s.source.id}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 rounded-lg bg-white border border-amber-200 hover:border-amber-400 hover:shadow-md transition group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-amber-100 grid place-items-center shrink-0">
                        <span className="text-lg">{s.source.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <div className="text-sm font-black text-amber-900 leading-snug">{s.source.shortName}</div>
                          {s.source.isOfficialAuthoritative && (
                            <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                              OFICIAL
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug line-clamp-2 mb-1">
                          {s.source.description}
                        </p>
                        <div className="text-[10px] text-amber-700 inline-flex items-center gap-1 font-bold">
                          Buscar "{query}" aquí
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ FUENTES INTERNACIONALES ═══ */}
          {intlSuggestions.length > 0 && (
            <div className="mt-4 rounded-xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 via-blue-50/50 to-white">
              <button
                onClick={() => setShowIntl((v) => !v)}
                className="w-full flex items-center gap-3 p-4 hover:bg-sky-100/30 transition rounded-xl"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white shrink-0 shadow">
                  <span className="text-lg">🌍</span>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-black text-sky-900">
                    Buscar también en {intlSuggestions.length} fuentes internacionales
                  </div>
                  <p className="text-[11px] text-sky-800/80 mt-0.5">
                    ONU · OEA · CorteIDH · CIDH · CIJ La Haya · CPI · Comunidad Andina · OMC · UE · OIT
                  </p>
                </div>
                <ChevronDown className={`w-5 h-5 text-sky-700 transition ${showIntl ? 'rotate-180' : ''}`} />
              </button>
              {showIntl && (
                <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {intlSuggestions.map((s) => (
                    <a
                      key={s.source.id}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 rounded-lg bg-white border border-sky-200 hover:border-sky-400 hover:shadow-md transition group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-sky-100 grid place-items-center shrink-0">
                        <span className="text-lg">{s.source.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <div className="text-sm font-black text-sky-900 leading-snug">{s.source.shortName}</div>
                          <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                            {s.source.jurisdiction}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug line-clamp-2 mb-1">
                          {s.source.description}
                        </p>
                        <div className="text-[10px] text-sky-700 inline-flex items-center gap-1 font-bold">
                          Buscar "{query}" aquí
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal SSE de ingesta */}
      {ingestProgress && (
        <IngestProgressModal
          progress={ingestProgress}
          onClose={() => setIngestProgress(null)}
          running={!!ingesting}
        />
      )}

      {/* Modal · agregar una norma a un caso */}
      {attachTarget && (
        <AttachToCaseModal target={attachTarget} onClose={() => setAttachTarget(null)} />
      )}
    </div>
  );
}

function stepLabel(step: string): string {
  const map: Record<string, string> = {
    'load-publication': 'Cargando publicación',
    'insert-legal-doc': 'Registrando en legal_documents',
    'chunking-start': 'Iniciando chunking',
    'chunking-done': 'Chunking completado',
    'embedding-progress': 'Generando embeddings',
    'embedding-done': 'Embedding chunk completado',
    'vector-copy-start': 'Copiando vectores pgvector',
    'vector-copy-done': 'Vectores pgvector OK',
    'mark-ingested': 'Marcando como ingestada',
    'broadcast-start': 'Notificando usuarios',
    'broadcast-done': 'Usuarios notificados',
    'complete': '✓ Completado',
  };
  return map[step] || step;
}

function InternalResultCard({ result, query, onAttach }: { result: InternalResult; query: string; onAttach: () => void }) {
  const hierLabel = HIERARCHY_OPTIONS.find((h) => h.value === result.legalHierarchy);
  return (
    <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white p-4 hover:shadow-md hover:border-emerald-300 transition">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center text-white shrink-0 shadow-md">
          {hierLabel?.icon ? <span className="text-lg">{hierLabel.icon}</span> : <BookOpen className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-black text-slate-900 leading-snug">
              {result.normTitle || result.title}
            </h3>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                ✓ EN TU CORPUS
              </span>
              <span className="text-[10px] font-mono text-violet-700 font-bold">
                {Math.round(result.score * 100)}% match
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 mb-2">
            {hierLabel && <span className="font-bold">{hierLabel.label}</span>}
            {result.category && <span>· {result.category}</span>}
            {result.publicationDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {result.publicationDate}
              </span>
            )}
            {result.publicationNumber && (
              <span className="inline-flex items-center gap-1">
                <Hash className="w-3 h-3" />
                RO {result.publicationNumber}
              </span>
            )}
            <span className="text-slate-500">
              · {result.matchedChunks}/{result.totalChunks} chunks coinciden
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed bg-white/60 p-2 rounded border border-emerald-100 italic">
            {highlightTerms(result.topSnippet, query)}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {result.metadata?.editionPdfUrl && (
              <a
                href={result.metadata.editionPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition"
              >
                <Download className="w-3 h-3" />
                PDF
              </a>
            )}
            <button
              onClick={onAttach}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow transition"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Agregar a mi caso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExternalResultCard({ result, onIngest, ingesting, onAttach }: {
  result: ExternalResult;
  onIngest: () => void;
  ingesting: boolean;
  onAttach: () => void;
}) {
  return (
    <div className={`rounded-xl border-2 p-4 hover:shadow-md transition ${
      result.isInCorpus
        ? 'border-violet-200 bg-violet-50/40'
        : 'border-amber-200 bg-amber-50/40'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl grid place-items-center text-white shrink-0 shadow-md ${
          result.isInCorpus
            ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600'
            : 'bg-gradient-to-br from-amber-500 to-orange-600'
        }`}>
          <ExternalLink className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-black text-slate-900 leading-snug">
              {result.title}
            </h3>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {result.isInCorpus ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-800">
                  ✓ EN TU CORPUS
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                  ⚠ NO EN CORPUS
                </span>
              )}
              <span className="text-[10px] font-mono text-violet-700 font-bold">
                {Math.round(result.score * 100)}% match
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 mb-2">
            <span className="font-bold">📰 Registro Oficial</span>
            {result.pubDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {result.pubDate}
              </span>
            )}
          </div>
          {result.excerpt && (
            <p className="text-xs text-slate-700 leading-relaxed bg-white/60 p-2 rounded border border-amber-100 italic">
              {result.excerpt.slice(0, 280)}{result.excerpt.length > 280 ? '…' : ''}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              <ExternalLink className="w-3 h-3" />
              Ver en RO
            </a>
            {result.pdfUrl && (
              <a
                href={result.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              >
                <Download className="w-3 h-3" />
                PDF
              </a>
            )}
            <button
              onClick={onAttach}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow transition"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Agregar a mi caso
            </button>
            {!result.isInCorpus && (
              <button
                onClick={onIngest}
                disabled={ingesting}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow disabled:opacity-50 transition"
              >
                {ingesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {ingesting ? 'Descargando…' : 'Descargar y vectorizar al corpus'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function highlightTerms(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
  if (words.length === 0) return text;
  const regex = new RegExp(`(${words.map(escapeRegex).join('|')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((p, i) =>
    regex.test(p) ? <mark key={i} className="bg-amber-200/60 px-0.5 rounded">{p}</mark> : <span key={i}>{p}</span>
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function IngestProgressModal({ progress, onClose, running }: {
  progress: { pct: number; label: string; step?: string; result?: any; error?: string };
  onClose: () => void;
  running: boolean;
}) {
  const isFinished = !!progress.result;
  const hasError = !!progress.error;
  const canClose = !running || isFinished || hasError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && canClose && onClose()}
    >
      <div className="w-full max-w-xl bg-gradient-to-br from-slate-950 via-violet-950/80 to-slate-950 rounded-2xl shadow-2xl border border-violet-500/30 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
        <div className="px-6 pt-5 pb-5">
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-12 h-12 rounded-2xl grid place-items-center text-white ${
              isFinished && !hasError ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
              hasError ? 'bg-gradient-to-br from-rose-500 to-red-600' :
              'bg-gradient-to-br from-violet-500 to-fuchsia-600 animate-pulse'
            }`}>
              {isFinished && !hasError ? <CheckCircle2 className="w-6 h-6" /> :
               hasError ? <AlertTriangle className="w-6 h-6" /> :
               <Zap className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-black text-white">Descargando e ingestando al corpus</h3>
              <p className="text-xs text-violet-300/80 mt-0.5 truncate">{progress.label}</p>
            </div>
            {canClose && (
              <button onClick={onClose} className="text-violet-300/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="mb-3">
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-4xl font-black bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                {Math.round(progress.pct)}
              </span>
              <span className="text-xl font-black text-violet-300/50">%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-all duration-500" style={{ width: `${progress.pct}%` }} />
            </div>
          </div>

          {progress.step && !isFinished && !hasError && (
            <div className="text-xs text-violet-200 bg-violet-500/10 border border-violet-500/30 rounded-lg px-3 py-2">
              <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
              {progress.step}
            </div>
          )}

          {isFinished && progress.result && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-200">
              <div className="font-bold mb-1">✓ Ingestada al corpus</div>
              <div className="grid grid-cols-2 gap-1">
                <div>Chunks: <strong className="text-white">{progress.result.chunksCreated}</strong></div>
                <div>Vectorizados: <strong className="text-white">{progress.result.embeddingsVectorized}</strong></div>
                <div>Notificados: <strong className="text-white">{progress.result.notifiedUsers}</strong></div>
              </div>
            </div>
          )}

          {hasError && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-200">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              {progress.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Modal · agregar una norma encontrada a un caso del usuario.
 * Elige un caso, descarga/resuelve el texto de la norma, lo vectoriza y lo
 * adjunta al expediente. Consume el endpoint SSE /admin/legal-search/attach-to-case.
 */
function AttachToCaseModal({ target, onClose }: {
  target: { kind: 'internal' | 'external'; title: string; legalDocId?: string; sourceUrl?: string; pdfUrl?: string };
  onClose: () => void;
}) {
  const [cases, setCases] = useState<Array<{ id: string; title: string; clientName?: string | null; caseNumber?: string | null }>>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [selectedCase, setSelectedCase] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ pct: number; label: string; result?: any; error?: string } | null>(null);

  useEffect(() => {
    api.get('/cases')
      .then((r: any) => {
        const list = (r?.data?.cases ?? r?.data ?? []) as any[];
        setCases(Array.isArray(list) ? list : []);
      })
      .catch(() => setCases([]))
      .finally(() => setLoadingCases(false));
  }, []);

  const run = async () => {
    if (!selectedCase || running) return;
    setRunning(true);
    setProgress({ pct: 0, label: 'Conectando…' });
    try {
      const { getAuthToken } = await import('@/lib/get-auth-token');
      const token = await getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const r = await fetch(`${API_URL}/api/v1/admin/legal-search/attach-to-case`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ caseId: selectedCase, ...target }),
      });
      if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const lines = chunk.split('\n').filter((l) => !l.startsWith(':'));
          const evLine = lines.find((l) => l.startsWith('event:'));
          const dataLine = lines.find((l) => l.startsWith('data:'));
          if (!dataLine) continue;
          const event = evLine ? evLine.slice(6).trim() : 'message';
          let payload: any = null;
          try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }

          if (event === 'phase' || event === 'step') {
            setProgress((p) => (p ? { ...p, pct: payload.pct ?? p.pct, label: payload.label ?? p.label } : p));
          } else if (event === 'done') {
            setProgress((p) => (p ? { ...p, pct: 100, label: '✓ Norma agregada al caso', result: payload } : p));
          } else if (event === 'error') {
            setProgress((p) => (p ? { ...p, error: payload.error } : p));
          }
        }
      }
    } catch (e: any) {
      setProgress((p) => (p
        ? { ...p, error: e?.message || 'Error desconocido' }
        : { pct: 0, label: '', error: e?.message || 'Error desconocido' }));
    } finally {
      setRunning(false);
    }
  };

  const finished = !!progress?.result;
  const hasError = !!progress?.error;
  const canClose = !running;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && canClose && onClose()}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-violet-200 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
        <div className="px-6 pt-5 pb-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 grid place-items-center text-white shrink-0">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-black text-slate-900">Agregar norma a un caso</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{target.title}</p>
            </div>
            {canClose && (
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Selección de caso */}
          {!progress && (
            <>
              {loadingCases ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Cargando tus casos…
                </div>
              ) : cases.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  No tenés casos. Creá un caso primero para poder agregarle normas.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {cases.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCase(c.id)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 transition ${
                        selectedCase === c.id
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'
                      }`}
                    >
                      <Briefcase className={`w-4 h-4 shrink-0 ${selectedCase === c.id ? 'text-violet-600' : 'text-slate-400'}`} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-slate-900 truncate">{c.title}</span>
                        {(c.clientName || c.caseNumber) && (
                          <span className="block text-[11px] text-slate-500 truncate">
                            {[c.caseNumber, c.clientName].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                      {selectedCase === c.id && <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={run}
                disabled={!selectedCase}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <FolderPlus className="w-4 h-4" />
                Descargar, vectorizar y agregar
              </button>
              <p className="mt-2 text-[11px] text-slate-400 text-center">
                Se descarga el texto de la norma, se vectoriza y se adjunta al cerebro del caso.
              </p>
            </>
          )}

          {/* Progreso */}
          {progress && (
            <div>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-3xl font-black text-violet-700">{Math.round(progress.pct)}</span>
                <span className="text-lg font-black text-violet-300">%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${hasError ? 'bg-rose-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'}`}
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-2">{progress.label}</p>

              {finished && !hasError && (
                <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Agregada al caso «{progress.result.caseTitle}»
                  </div>
                  <div>
                    {progress.result.chunksCreated} fragmento(s) vectorizado(s) · ya disponible
                    para el chat y la generación de documentos del caso.
                  </div>
                </div>
              )}
              {hasError && (
                <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{progress.error}</span>
                </div>
              )}
              {canClose && (finished || hasError) && (
                <button
                  onClick={onClose}
                  className="mt-3 w-full px-4 py-2 rounded-lg text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cerrar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
