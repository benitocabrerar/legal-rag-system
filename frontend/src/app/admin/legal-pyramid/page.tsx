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
  Layers, Globe, Sparkles, ScrollText, Archive, CheckCircle2, UploadCloud,
  HardDrive,
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
  pdf_source: 'archived' | 'registro_oficial' | 'canonical_external' | null;
  stored_pdf_url: string | null;
  stored_pdf_size: number | null;
  pdf_storage_status: string | null;
  edition_url: string | null;
  ai_summary: string | null;
  ai_keywords: string[];
  source: string;
  content_length: number;
  total_chunks: number;
  vectorized_chunks: number;
}

interface ArchiveStats {
  total: number;
  stored: number;
  pending: number;
  failed: number;
  no_source: number;
  total_bytes: number;
  coverage_pct: number;
}

interface ArchiveProgress {
  pct: number;
  total: number;
  done: number;
  currentFile: { title: string; index: number } | null;
  uploaded: number;
  skipped: number;
  failed: number;
  noSource: number;
  bytes: number;
  liveLog: Array<{ ts: number; type: string; text: string; detail?: string }>;
  finished?: boolean;
  error?: string;
  reportUrl?: string;  // URL relativa al endpoint que sirve el HTML report
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
  const [archiveStats, setArchiveStats] = useState<ArchiveStats | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveProgress, setArchiveProgress] = useState<ArchiveProgress | null>(null);

  const loadArchiveStats = async () => {
    try {
      const r = await api.get<{ stats: ArchiveStats }>('/admin/legal-pyramid/pdf-archive-stats');
      setArchiveStats(r.data.stats);
    } catch { /* silent */ }
  };
  useEffect(() => { void loadArchiveStats(); }, []);

  const startArchiveAll = async () => {
    if (!confirm(`¿Descargar y archivar todos los PDFs faltantes al storage? Esto puede tardar 10-30 min según cuántos haya. ${archiveStats?.pending || 0} pendientes.`)) return;
    setArchiving(true);
    setArchiveProgress({
      pct: 0, total: 0, done: 0, currentFile: null,
      uploaded: 0, skipped: 0, failed: 0, noSource: 0, bytes: 0,
      liveLog: [],
    });
    try {
      const { getAuthToken } = await import('@/lib/get-auth-token');
      const token = await getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const r = await fetch(`${API_URL}/api/v1/admin/legal-pyramid/archive-all-pdfs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
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

          setArchiveProgress((p) => p ? updateArchiveProgress(p, event, payload) : p);
        }
      }
    } catch (e: any) {
      setArchiveProgress((p) => p ? { ...p, error: e?.message || 'Error desconocido' } : p);
    } finally {
      setArchiving(false);
      await loadArchiveStats();
    }
  };

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

      {/* ═══ PDF ARCHIVE STATUS ═══ */}
      {archiveStats && (
        <div className={`rounded-xl border-2 p-4 ${
          archiveStats.coverage_pct >= 90 ? 'border-emerald-200 bg-emerald-50' :
          archiveStats.coverage_pct >= 50 ? 'border-amber-200 bg-amber-50' :
          'border-rose-200 bg-rose-50'
        }`}>
          <div className="flex items-start gap-4 flex-wrap">
            <div className={`w-12 h-12 rounded-xl grid place-items-center text-white shadow-md shrink-0 ${
              archiveStats.coverage_pct >= 90 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
              archiveStats.coverage_pct >= 50 ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
              'bg-gradient-to-br from-rose-500 to-red-600'
            }`}>
              <Archive className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm font-black ${
                archiveStats.coverage_pct >= 90 ? 'text-emerald-900' :
                archiveStats.coverage_pct >= 50 ? 'text-amber-900' :
                'text-rose-900'
              }`}>
                📦 Archivo de PDFs · {archiveStats.coverage_pct}% en nuestro Supabase Storage
              </h3>
              <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
                <strong className="text-emerald-700">{archiveStats.stored}</strong> almacenados ·{' '}
                <strong className="text-amber-700">{archiveStats.pending}</strong> pendientes ·{' '}
                <strong className="text-rose-700">{archiveStats.failed}</strong> fallaron ·{' '}
                <strong className="text-slate-600">{archiveStats.no_source}</strong> sin URL fuente ·{' '}
                <strong className="text-violet-700">{formatBytes(archiveStats.total_bytes)}</strong> totales
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Garantizamos disponibilidad de los PDFs independientemente de que los sitios externos sigan vivos.
              </p>
            </div>
            {(archiveStats.pending > 0 || archiveStats.failed > 0) && (
              <button
                onClick={startArchiveAll}
                disabled={archiving}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {archiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {archiving ? 'Archivando…' : `Archivar ${archiveStats.pending} pendientes`}
              </button>
            )}
          </div>
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
                {/* CRÍTICO: usar [...] para NO mutar data.levels. Antes el .sort()
                    in-place reordenaba el array por count desc, lo que invertía
                    la pirámide visual (la jerarquía más poblada terminaba arriba). */}
                {[...data.levels].sort((a, b) => b.count - a.count)[0]?.title.slice(0, 24) || '—'}
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
          onArchiveSuccess={loadArchiveStats}
        />
      )}

      {/* Modal SSE archive masivo */}
      {archiveProgress && (
        <ArchiveProgressModal
          progress={archiveProgress}
          onClose={() => { if (!archiving) setArchiveProgress(null); }}
          running={archiving}
        />
      )}
    </div>
  );
}

function ArchiveProgressModal({ progress, onClose, running }: {
  progress: ArchiveProgress;
  onClose: () => void;
  running: boolean;
}) {
  const isFinished = progress.finished === true;
  const hasError = progress.error !== undefined;
  const canClose = !running || isFinished || hasError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && canClose && onClose()}
    >
      <div className="w-full max-w-3xl bg-gradient-to-br from-slate-950 via-violet-950/80 to-slate-950 rounded-2xl shadow-2xl border border-violet-500/30 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
        <div className="px-6 pt-5 pb-4 border-b border-violet-500/20">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-2xl grid place-items-center text-white shrink-0 ${
              isFinished && !hasError ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
              hasError ? 'bg-gradient-to-br from-rose-500 to-red-600' :
              'bg-gradient-to-br from-violet-500 to-fuchsia-600 animate-pulse'
            }`}>
              {isFinished && !hasError ? <CheckCircle2 className="w-6 h-6" /> :
               hasError ? <AlertTriangle className="w-6 h-6" /> :
               <UploadCloud className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-black text-white">Archivando PDFs al storage</h3>
              <p className="text-xs text-violet-300/80 mt-0.5">
                {progress.done}/{progress.total} · {progress.uploaded} subidos · {progress.failed} fallaron
              </p>
            </div>
            {canClose && <button onClick={onClose} className="text-violet-300/60 hover:text-white"><X className="w-5 h-5" /></button>}
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-4xl font-black bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                {Math.round(progress.pct)}
              </span>
              <span className="text-xl font-black text-violet-300/50">%</span>
              {progress.currentFile && (
                <span className="ml-auto text-xs text-violet-300/70 truncate max-w-[280px]" title={progress.currentFile.title}>
                  {progress.currentFile.title.slice(0, 50)}
                </span>
              )}
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-all duration-500" style={{ width: `${progress.pct}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2 mt-3 text-center">
            <Pill label="Subidos" value={progress.uploaded} color="emerald" />
            <Pill label="Skip" value={progress.skipped} color="slate" />
            <Pill label="Fallos" value={progress.failed} color="rose" />
            <Pill label="Sin src" value={progress.noSource} color="amber" />
            <Pill label="Bytes" value={formatBytes(progress.bytes)} color="violet" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-3 bg-slate-950/60 font-mono">
          <div className="text-[10px] font-bold text-violet-300/60 uppercase mb-2 font-sans">Progreso live</div>
          {progress.liveLog.length === 0 ? (
            <div className="text-xs text-violet-300/40 italic py-3 font-sans">Esperando primeros eventos…</div>
          ) : (
            <ul className="space-y-0.5">
              {progress.liveLog.slice().reverse().map((l, i) => (
                <li key={i} className={`text-[11px] py-0.5 ${
                  l.type === 'start' ? 'text-violet-300 font-bold mt-2' :
                  l.type === 'stored' ? 'text-emerald-300' :
                  l.type === 'skip' ? 'text-slate-400' :
                  l.type === 'fail' ? 'text-rose-300' :
                  l.type === 'no-source' ? 'text-amber-300' :
                  'text-violet-100/60'
                }`}>
                  <span className="whitespace-pre">{l.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {hasError && (
          <div className="p-4 border-t border-rose-500/20 bg-rose-500/10 text-xs text-rose-200">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            {progress.error}
          </div>
        )}
        {isFinished && (
          <div className="px-6 py-4 border-t border-violet-500/30 bg-gradient-to-r from-emerald-500/10 to-violet-500/10 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-violet-100/80">
              <CheckCircle2 className="w-4 h-4 inline mr-1 text-emerald-400" />
              <strong className="text-white">Proceso completado.</strong>
              <span className="ml-2">{progress.uploaded} archivados · {progress.failed} fallaron · {progress.noSource} sin URL · {formatBytes(progress.bytes)}</span>
            </div>
            <div className="flex gap-2">
              {progress.reportUrl && (
                <a
                  href={progress.reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold shadow-lg inline-flex items-center gap-2 transition-all"
                >
                  📄 Descargar reporte HTML
                </a>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({ label, value, color }: { label: string; value: number | string; color: 'emerald' | 'rose' | 'violet' | 'slate' | 'amber' }) {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-300',
    rose: 'bg-rose-500/20 text-rose-300',
    violet: 'bg-violet-500/20 text-violet-300',
    slate: 'bg-slate-500/20 text-slate-300',
    amber: 'bg-amber-500/20 text-amber-300',
  };
  return (
    <div className={`rounded-lg p-2 ${map[color]}`}>
      <div className="text-base font-black tabular-nums">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-wide opacity-70">{label}</div>
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

function DocumentModal({ docId, onClose, onArchiveSuccess }: {
  docId: string;
  onClose: () => void;
  onArchiveSuccess?: () => void;
}) {
  const [doc, setDoc] = useState<DocDetail | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'content' | 'pdf'>('info');
  const [loadingContent, setLoadingContent] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const loadDoc = async () => {
    try {
      const r = await api.get<{ document: DocDetail }>(`/admin/legal-pyramid/document/${docId}`);
      setDoc(r.data.document);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadDoc(); }, [docId]);

  const archiveThis = async () => {
    if (!doc) return;
    setArchiving(true);
    try {
      await api.post(`/admin/legal-pyramid/document/${docId}/archive-pdf`, {});
      await loadDoc();
      onArchiveSuccess?.();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'No se pudo archivar el PDF');
    } finally {
      setArchiving(false);
    }
  };

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
              {doc.pdf_url && (
                <button
                  onClick={() => setTab('pdf')}
                  className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
                    tab === 'pdf' ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-1" />
                  PDF Original
                </button>
              )}
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
                tab === 'content' ? (
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
                ) : (
                  // tab === 'pdf' — visor PDF inline
                  doc.pdf_url ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 rounded-lg px-3 py-2">
                        <FileText className="w-4 h-4 text-violet-600" />
                        <span className="font-semibold">{doc.norm_title || doc.title}</span>
                        <span className="ml-auto flex items-center gap-2">
                          <a
                            href={doc.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-600 hover:text-violet-800 font-bold inline-flex items-center gap-1"
                            title="Abrir en nueva pestaña"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Abrir aparte
                          </a>
                          <a
                            href={doc.pdf_url}
                            download
                            className="text-emerald-600 hover:text-emerald-800 font-bold inline-flex items-center gap-1"
                            title="Descargar"
                          >
                            <Download className="w-3 h-3" />
                            Descargar
                          </a>
                        </span>
                      </div>
                      {/* Visor inline. Para Supabase Storage URLs el browser puede renderizar el PDF
                          nativamente. Si el browser no soporta inline (ej. Safari iOS) muestra el
                          fallback con link. */}
                      <object
                        data={doc.pdf_url}
                        type="application/pdf"
                        className="w-full rounded-lg border border-slate-300 shadow-sm"
                        style={{ height: 'min(75vh, 720px)' }}
                      >
                        <iframe
                          src={doc.pdf_url}
                          title={doc.norm_title || 'PDF'}
                          className="w-full rounded-lg border border-slate-300"
                          style={{ height: 'min(75vh, 720px)' }}
                        >
                          <div className="p-6 text-center text-slate-600">
                            Tu navegador no puede mostrar el PDF inline.{' '}
                            <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer" className="text-violet-700 underline font-bold">
                              Descargar PDF
                            </a>
                          </div>
                        </iframe>
                      </object>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
                      Esta norma no tiene PDF asociado.
                    </div>
                  )
                )
              )}
            </div>

            {/* Footer con acciones */}
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50">
              {/* Badge fuente del PDF */}
              {doc.pdf_url && (
                <div className="mb-2">
                  {doc.pdf_source === 'archived' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <HardDrive className="w-3 h-3" />
                      ARCHIVADO EN NUESTRO STORAGE
                      {doc.stored_pdf_size && <span className="ml-1 font-mono">({formatBytes(doc.stored_pdf_size)})</span>}
                    </span>
                  )}
                  {doc.pdf_source === 'registro_oficial' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      <ExternalLink className="w-3 h-3" />
                      ENLACE EXTERNO · REGISTRO OFICIAL
                    </span>
                  )}
                  {doc.pdf_source === 'canonical_external' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded bg-sky-100 text-sky-800 border border-sky-300">
                      <ExternalLink className="w-3 h-3" />
                      ENLACE EXTERNO · CURADO
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {doc.pdf_url && (
                  <a
                    href={doc.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow transition"
                  >
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </a>
                )}
                {/* Si NO está archivado en nuestro storage, mostrar botón para archivar ahora */}
                {doc.pdf_source !== 'archived' && (doc.metadata?.editionPdfUrl || doc.metadata?.canonicalPdfUrl) && (
                  <button
                    onClick={archiveThis}
                    disabled={archiving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 shadow disabled:opacity-50 transition"
                  >
                    {archiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    {archiving ? 'Archivando…' : 'Archivar en nuestro storage'}
                  </button>
                )}
                {doc.edition_url && (
                  <a
                    href={doc.edition_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-white border-2 border-violet-300 text-violet-700 hover:bg-violet-50 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver en RO
                  </a>
                )}
                {!doc.pdf_url && !doc.edition_url && (
                  <div className="text-xs text-slate-500 italic flex-1">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Sin URL PDF registrada. Disponible solo en chunks vectoriales del corpus.
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition"
                >
                  Cerrar
                </button>
              </div>

              {doc.pdf_storage_status === 'failed' && doc.metadata?.pdfStorageError && (
                <div className="mt-2 text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Intento previo de archivado falló: <code>{doc.metadata.pdfStorageError}</code>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function updateArchiveProgress(p: ArchiveProgress, event: string, payload: any): ArchiveProgress {
  switch (event) {
    case 'run-start':
      return { ...p, total: payload.total };
    case 'file-start':
      return {
        ...p,
        pct: payload.pct ?? p.pct,
        currentFile: { title: payload.title, index: payload.index },
        liveLog: [...p.liveLog.slice(-29), {
          ts: Date.now(), type: 'start',
          text: `[${payload.index}/${payload.total}] ${payload.title}`,
        }],
      };
    case 'file-stored':
      return {
        ...p,
        done: p.done + 1,
        uploaded: p.uploaded + 1,
        bytes: p.bytes + (payload.sizeBytes || 0),
        currentFile: null,
        liveLog: [...p.liveLog.slice(-29), {
          ts: Date.now(), type: 'stored',
          text: `   ✓ subido (${formatBytes(payload.sizeBytes)} · ${formatMs(payload.durationMs)})`,
        }],
      };
    case 'file-skipped':
      return {
        ...p, done: p.done + 1, skipped: p.skipped + 1,
        liveLog: [...p.liveLog.slice(-29), {
          ts: Date.now(), type: 'skip',
          text: `   ↻ ya almacenado`,
        }],
      };
    case 'file-no-source':
      return {
        ...p, done: p.done + 1, noSource: p.noSource + 1,
        liveLog: [...p.liveLog.slice(-29), {
          ts: Date.now(), type: 'no-source',
          text: `   ⊘ sin URL fuente en metadata`,
        }],
      };
    case 'file-failed':
      return {
        ...p, done: p.done + 1, failed: p.failed + 1,
        liveLog: [...p.liveLog.slice(-29), {
          ts: Date.now(), type: 'fail',
          text: `   ✗ ${payload.error?.slice(0, 100)}`,
        }],
      };
    case 'run-complete':
    case 'done':
      return {
        ...p,
        pct: 100,
        finished: true,
        // El backend emite reportUrl en el evento 'done' con el path relativo
        // al endpoint de descarga. El componente muestra el botón cuando existe.
        reportUrl: payload?.reportUrl || p.reportUrl,
      };
    case 'error':
      return { ...p, error: payload.error };
    default:
      return p;
  }
}

function formatBytes(n?: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

function formatMs(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
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
