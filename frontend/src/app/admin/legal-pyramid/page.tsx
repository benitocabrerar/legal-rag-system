'use client';

/**
 * Admin · Pirámide de Kelsen
 *
 * Visualización jerárquica del corpus normativo siguiendo la pirámide de
 * Kelsen (art. 425 de la Constitución Ecuador 2008). Multi-país: cada país
 * puede tener su propia pirámide.
 *
 * Cada nivel es un trapecio CSS clickeable. Al expandir, muestra la lista
 * de normas de ese nivel. Click en una norma → modal con preview del
 * contenido + descarga del PDF.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Loader2, ChevronDown, ChevronRight, Download, ExternalLink, FileText,
  Search, X, BookOpen, Calendar, Hash, Tag, Eye, AlertTriangle,
  Layers, Globe, Sparkles, ScrollText,
} from 'lucide-react';
import { api } from '@/lib/api';

interface SampleDoc {
  id: string;
  title: string;
  normTitle: string | null;
  publicationDate: string | null;
  publicationNumber: string | null;
  category: string | null;
  hasPdf: boolean;
}

interface PyramidLevel {
  id: string;
  tier: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  hierarchies: string[];
  count: number;
  samples: SampleDoc[];
}

interface PyramidResponse {
  country: { code: string; name: string; flag: string };
  total: number;
  levels: PyramidLevel[];
}

interface Country {
  code: string;
  name: string;
  flag: string;
  total: number;
}

interface DocItem {
  id: string;
  title: string;
  norm_title: string | null;
  norm_type: string | null;
  legal_hierarchy: string | null;
  publication_type: string | null;
  publication_date: string | null;
  publication_number: string | null;
  last_reform_date: string | null;
  category: string | null;
  pdf_url: string | null;
  edition_url: string | null;
  ai_summary: string | null;
}

interface DocDetail {
  id: string;
  title: string;
  norm_title: string | null;
  norm_type: string | null;
  legal_hierarchy: string | null;
  publication_type: string | null;
  publication_number: string | null;
  publication_date: string | null;
  last_reform_date: string | null;
  jurisdiction: string | null;
  country_code: string | null;
  category: string | null;
  metadata: any;
  pdf_url: string | null;
  edition_url: string | null;
  ai_summary: string | null;
  ai_keywords: string[];
  source: string;
  content_length: number;
  total_chunks: number;
  vectorized_chunks: number;
}

// Colores por nivel (mapa estático para Tailwind tree-shake)
const COLOR_MAP: Record<string, {
  bg: string; bgLight: string; border: string; text: string; gradient: string;
}> = {
  amber:  { bg: 'bg-amber-500',  bgLight: 'bg-amber-50',  border: 'border-amber-300',  text: 'text-amber-900',  gradient: 'from-amber-400 to-orange-500' },
  rose:   { bg: 'bg-rose-500',   bgLight: 'bg-rose-50',   border: 'border-rose-300',   text: 'text-rose-900',   gradient: 'from-rose-400 to-pink-500' },
  violet: { bg: 'bg-violet-500', bgLight: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-900', gradient: 'from-violet-500 to-fuchsia-500' },
  sky:    { bg: 'bg-sky-500',    bgLight: 'bg-sky-50',    border: 'border-sky-300',    text: 'text-sky-900',    gradient: 'from-sky-400 to-blue-500' },
  indigo: { bg: 'bg-indigo-500', bgLight: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-900', gradient: 'from-indigo-500 to-blue-600' },
  teal:   { bg: 'bg-teal-500',   bgLight: 'bg-teal-50',   border: 'border-teal-300',   text: 'text-teal-900',   gradient: 'from-teal-400 to-emerald-500' },
  slate:  { bg: 'bg-slate-500',  bgLight: 'bg-slate-50',  border: 'border-slate-300', text: 'text-slate-900', gradient: 'from-slate-400 to-gray-500' },
};

export default function LegalPyramidPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState('EC');
  const [data, setData] = useState<PyramidResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [levelDocs, setLevelDocs] = useState<Record<string, DocItem[]>>({});
  const [loadingLevel, setLoadingLevel] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await api.get<{ countries: Country[] }>('/admin/legal-pyramid/countries');
        setCountries(r.data.countries || []);
      } catch { /* silent */ }
    })();
  }, []);

  const loadPyramid = async () => {
    setLoading(true);
    try {
      const r = await api.get<PyramidResponse>(`/admin/legal-pyramid?country=${country}`);
      setData(r.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadPyramid(); }, [country]);

  const toggleLevel = async (level: PyramidLevel) => {
    if (expanded === level.id) {
      setExpanded(null);
      return;
    }
    setExpanded(level.id);
    if (!levelDocs[level.id]) {
      setLoadingLevel(level.id);
      try {
        const r = await api.get<{ items: DocItem[] }>(`/admin/legal-pyramid/level/${level.id}`, {
          params: { country, limit: 200 },
        });
        setLevelDocs((prev) => ({ ...prev, [level.id]: r.data.items || [] }));
      } catch { /* silent */ }
      finally { setLoadingLevel(null); }
    }
  };

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-7 h-7 text-violet-600" />
            Pirámide de Kelsen · Engranaje del Sistema Legal
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Visualización jerárquica del corpus normativo siguiendo la pirámide de Kelsen
            (art. 425 Constitución Ecuador 2008). Cada nivel se puede expandir para
            navegar las normas, ver su contenido y descargar el PDF oficial.
          </p>
        </div>
        <Link href="/admin/registro-oficial" className="text-xs font-bold text-violet-700 hover:underline">
          ← Panel del RO
        </Link>
      </div>

      {/* Country selector */}
      {countries.length > 1 && (
        <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-3 flex flex-wrap items-center gap-2">
          <Globe className="w-4 h-4 text-violet-700" />
          <span className="text-xs font-bold text-violet-900 uppercase tracking-wide mr-2">País:</span>
          {countries.map((c) => (
            <button
              key={c.code}
              onClick={() => setCountry(c.code)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition ${
                country === c.code
                  ? 'bg-violet-600 text-white border-violet-700 shadow'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300'
              }`}
            >
              <span>{c.flag}</span>
              {c.name}
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                country === c.code ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>{c.total}</span>
            </button>
          ))}
        </div>
      )}

      {/* Stats bar */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-600 grid place-items-center text-white text-xl shadow">
              {data.country.flag}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-violet-700">País</div>
              <div className="text-sm font-black text-violet-900">{data.country.name}</div>
            </div>
          </div>
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 grid place-items-center text-white shadow">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Total normas</div>
              <div className="text-xl font-black text-emerald-900">{data.total}</div>
            </div>
          </div>
          <div className="rounded-xl border-2 border-sky-200 bg-sky-50 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-600 grid place-items-center text-white shadow">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Niveles activos</div>
              <div className="text-xl font-black text-sky-900">{data.levels.filter((l) => l.count > 0).length} / {data.levels.length}</div>
            </div>
          </div>
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-600 grid place-items-center text-white shadow">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Nivel principal</div>
              <div className="text-sm font-black text-amber-900">
                {data.levels.sort((a, b) => b.count - a.count)[0]?.title.slice(0, 24) || '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pirámide */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
        </div>
      ) : !data ? (
        <div className="text-center py-12 text-slate-500">No se pudo cargar la pirámide.</div>
      ) : (
        <div className="space-y-2">
          {data.levels.map((level) => (
            <PyramidLevelCard
              key={level.id}
              level={level}
              expanded={expanded === level.id}
              onToggle={() => toggleLevel(level)}
              docs={levelDocs[level.id] || null}
              loadingDocs={loadingLevel === level.id}
              filterQuery={filterQuery}
              setFilterQuery={setFilterQuery}
              onDocClick={(docId) => setSelectedDoc(docId)}
              totalLevels={data.levels.length}
            />
          ))}
        </div>
      )}

      {/* Modal de documento */}
      {selectedDoc && (
        <DocumentModal
          docId={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
}

function PyramidLevelCard({
  level, expanded, onToggle, docs, loadingDocs, filterQuery, setFilterQuery, onDocClick, totalLevels,
}: {
  level: PyramidLevel;
  expanded: boolean;
  onToggle: () => void;
  docs: DocItem[] | null;
  loadingDocs: boolean;
  filterQuery: string;
  setFilterQuery: (v: string) => void;
  onDocClick: (id: string) => void;
  totalLevels: number;
}) {
  const colors = COLOR_MAP[level.color] || COLOR_MAP.slate;
  // Ancho del trapecio: el más estrecho (tier 1) ~38%, el más ancho (tier 7) ~96%
  const widthPct = 38 + ((level.tier - 1) / (totalLevels - 1)) * 58;

  return (
    <div className="relative">
      {/* Trapecio visual */}
      <div
        onClick={onToggle}
        className={`group relative mx-auto cursor-pointer transition-all duration-300`}
        style={{ width: `${widthPct}%`, minWidth: '320px' }}
      >
        <div className={`bg-gradient-to-r ${colors.gradient} text-white rounded-lg shadow-lg ${expanded ? 'ring-4 ring-offset-2 ring-violet-300' : 'hover:shadow-xl hover:scale-[1.01]'} transition-all duration-200`}>
          <div className="flex items-center gap-3 p-3 sm:p-4">
            <div className="w-12 h-12 rounded-xl bg-white/25 backdrop-blur-sm grid place-items-center text-2xl shrink-0 shadow-inner">
              {level.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black bg-white/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Nivel {level.tier}
                </span>
                <h3 className="text-sm sm:text-base font-black leading-tight">{level.title}</h3>
              </div>
              <p className="text-[11px] opacity-90 mt-0.5 line-clamp-1 hidden sm:block">
                {level.description}
              </p>
            </div>
            <div className="text-right shrink-0 flex items-center gap-3">
              <div>
                <div className="text-2xl sm:text-3xl font-black leading-none">{level.count}</div>
                <div className="text-[9px] opacity-80 uppercase tracking-wider mt-0.5">
                  {level.count === 1 ? 'norma' : 'normas'}
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Lista expandida */}
      {expanded && (
        <div className={`mt-2 mx-auto rounded-xl border-2 ${colors.border} ${colors.bgLight} overflow-hidden animate-in slide-in-from-top-2 duration-200`} style={{ width: '95%' }}>
          {/* Header expandido */}
          <div className={`px-4 py-3 ${colors.bgLight} border-b ${colors.border} flex items-start justify-between gap-3 flex-wrap`}>
            <div className="flex-1 min-w-0">
              <div className={`text-[11px] font-bold ${colors.text} mb-0.5`}>
                {level.description}
              </div>
              <div className="text-[10px] text-slate-600">
                Enum DB: {level.hierarchies.map((h) => <code key={h} className="mx-0.5">{h}</code>)}
              </div>
            </div>
            {docs && docs.length > 5 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filtrar…"
                  className="pl-8 pr-2 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 w-48"
                />
              </div>
            )}
          </div>

          {/* Lista de docs */}
          {loadingDocs ? (
            <div className="text-center py-12">
              <Loader2 className={`w-6 h-6 animate-spin mx-auto ${colors.text}`} />
            </div>
          ) : !docs || docs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">Sin normas en este nivel para este país</p>
              <p className="text-[11px] mt-1">El corpus aún no tiene documentos clasificados aquí.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {docs
                .filter((d) => {
                  if (!filterQuery) return true;
                  const q = filterQuery.toLowerCase();
                  return (
                    (d.title || '').toLowerCase().includes(q) ||
                    (d.norm_title || '').toLowerCase().includes(q)
                  );
                })
                .map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onDocClick(d.id)}
                    className="w-full text-left px-4 py-3 hover:bg-white transition flex items-start gap-3"
                  >
                    <div className={`w-9 h-9 rounded-lg ${colors.bg} grid place-items-center text-white shrink-0 shadow text-sm font-bold`}>
                      {level.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                        {d.norm_title || d.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px] text-slate-600">
                        {d.publication_date && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(d.publication_date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        {d.publication_number && (
                          <span className="inline-flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            RO {d.publication_number}
                          </span>
                        )}
                        {d.category && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {d.category}
                          </span>
                        )}
                        {d.pdf_url && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <Download className="w-3 h-3" />
                            PDF disponible
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DocumentModal({ docId, onClose }: { docId: string; onClose: () => void }) {
  const [doc, setDoc] = useState<DocDetail | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'content'>('info');
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await api.get<{ document: DocDetail }>(`/admin/legal-pyramid/document/${docId}`);
        setDoc(r.data.document);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [docId]);

  const loadContent = async () => {
    if (content !== null) return;
    setLoadingContent(true);
    try {
      const r = await api.get<{ content: string }>(`/admin/legal-pyramid/document/${docId}/content`);
      setContent(r.data.content || '');
    } catch {
      setContent('Error al cargar el contenido.');
    } finally {
      setLoadingContent(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
          </div>
        ) : !doc ? (
          <div className="p-12 text-center text-slate-500">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">No se pudo cargar el documento</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 text-xs font-bold bg-slate-200 hover:bg-slate-300 rounded-lg">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-violet-700 to-fuchsia-700 text-white p-5 relative">
              <button onClick={onClose} className="absolute top-3 right-3 text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 grid place-items-center text-2xl shrink-0 backdrop-blur-sm">
                  📜
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black leading-tight">{doc.norm_title || doc.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] opacity-90">
                    {doc.legal_hierarchy && <span className="font-bold">{doc.legal_hierarchy.replace(/_/g, ' ')}</span>}
                    {doc.category && <span>· {doc.category}</span>}
                    {doc.publication_date && (
                      <span><Calendar className="w-3 h-3 inline mr-0.5" />{new Date(doc.publication_date).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    )}
                    {doc.publication_number && (
                      <span><Hash className="w-3 h-3 inline mr-0.5" />RO {doc.publication_number}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setTab('info')}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
                  tab === 'info' ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-1" />
                Información
              </button>
              <button
                onClick={() => { setTab('content'); void loadContent(); }}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
                  tab === 'content' ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Eye className="w-4 h-4 inline mr-1" />
                Contenido
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {tab === 'info' ? (
                <div className="space-y-4">
                  {doc.ai_summary && (
                    <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-3">
                      <div className="text-[10px] font-black text-violet-700 uppercase tracking-wide mb-1">
                        ✨ Resumen IA
                      </div>
                      <p className="text-sm text-violet-950 leading-relaxed">{doc.ai_summary}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <InfoField label="Tipo de norma" value={doc.norm_type?.replace(/_/g, ' ')} />
                    <InfoField label="Jerarquía" value={doc.legal_hierarchy?.replace(/_/g, ' ')} />
                    <InfoField label="Tipo de publicación" value={doc.publication_type?.replace(/_/g, ' ')} />
                    <InfoField label="Categoría" value={doc.category} />
                    <InfoField label="Número de RO" value={doc.publication_number} />
                    <InfoField label="Fecha de publicación" value={doc.publication_date ? new Date(doc.publication_date).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }) : null} />
                    <InfoField label="Última reforma" value={doc.last_reform_date ? new Date(doc.last_reform_date).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }) : null} />
                    <InfoField label="Jurisdicción" value={doc.jurisdiction} />
                    <InfoField label="País" value={doc.country_code} />
                    <InfoField label="Tamaño del contenido" value={`${(doc.content_length / 1024).toFixed(1)} KB`} />
                    <InfoField label="Chunks vectoriales" value={`${doc.vectorized_chunks} / ${doc.total_chunks}`} />
                    <InfoField label="Fuente" value={doc.source} />
                  </div>
                  {doc.ai_keywords && doc.ai_keywords.length > 0 && (
                    <div>
                      <div className="text-[10px] font-black text-slate-700 uppercase tracking-wide mb-2">Keywords IA</div>
                      <div className="flex flex-wrap gap-1.5">
                        {doc.ai_keywords.map((k, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-violet-100 text-violet-800 font-semibold">{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {loadingContent ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto" />
                    </div>
                  ) : content ? (
                    <pre className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans bg-slate-50 p-4 rounded-lg border border-slate-200 max-h-[500px] overflow-y-auto">
                      {content}
                    </pre>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      Click para cargar el contenido…
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer con acciones */}
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2">
              {doc.pdf_url && (
                <a
                  href={doc.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow transition"
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF oficial
                </a>
              )}
              {doc.edition_url && (
                <a
                  href={doc.edition_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-white border-2 border-violet-300 text-violet-700 hover:bg-violet-50 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver en Registro Oficial
                </a>
              )}
              {!doc.pdf_url && !doc.edition_url && (
                <div className="text-xs text-slate-500 italic">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Esta norma no tiene URL PDF registrada. Disponible solo en chunks vectoriales del corpus.
                </div>
              )}
              <button
                onClick={onClose}
                className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
      <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-xs font-bold text-slate-800 capitalize">{value}</div>
    </div>
  );
}
