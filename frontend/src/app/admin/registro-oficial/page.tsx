'use client';

/**
 * Panel Admin · Registro Oficial Ecuador
 *
 * Vista de gestión del scraper diario del Registro Oficial:
 *   - Stats: total detectadas, pendientes de revisión, ya ingestadas, rechazadas
 *   - Lista paginada con filtros (status, tipo, búsqueda)
 *   - Cada item con resumen IA, clasificación, score de relevancia
 *   - Acciones: aprobar (ingesta al corpus), rechazar
 *   - Botón "scan ahora" para disparar manualmente
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Loader2, RefreshCw, ScrollText, CheckCircle2, XCircle, Sparkles,
  FileText, Filter, Search, Calendar, Building2, Tag, Activity, TrendingUp,
  AlertTriangle, ChevronRight, Download, Brain, Database, Layers, Clock,
  Hash, User, Globe, Zap,
} from 'lucide-react';

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  lastScan: {
    id: string;
    started_at: string;
    completed_at: string | null;
    status: string;
    editionsFound: number;
    publicationsFound: number;
  } | null;
  byTypeLast30d: Array<{ type: string; count: number }>;
}

interface Publication {
  id: string;
  edition_number: string | null;
  edition_date: string | null;
  edition_url: string | null;
  edition_pdf_url: string | null;
  publication_type: string | null;
  publication_number: string | null;
  title: string;
  issuing_entity: string | null;
  ai_summary: string | null;
  ai_classification: string | null;
  ai_relevance_score: number | null;
  ai_keywords: string[] | null;
  status: string;
  reviewed_at: string | null;
  ingested_legal_doc_id: string | null;
  chunks_created: number | null;
  created_at: string;
}

const TYPE_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  ley_organica:        { label: 'Ley Orgánica',       color: 'rose',     icon: '📜' },
  ley_ordinaria:       { label: 'Ley Ordinaria',      color: 'red',      icon: '📜' },
  decreto_ejecutivo:   { label: 'Decreto Ejecutivo',  color: 'purple',   icon: '✒️' },
  acuerdo_ministerial: { label: 'Acuerdo Ministerial', color: 'indigo',  icon: '🏛️' },
  resolucion:          { label: 'Resolución',         color: 'cyan',     icon: '📋' },
  reglamento:          { label: 'Reglamento',         color: 'blue',     icon: '⚙️' },
  ordenanza:           { label: 'Ordenanza',          color: 'amber',    icon: '🏘️' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  detected:  { label: 'Detectada',     color: 'text-gray-700',    bg: 'bg-gray-100' },
  analyzed:  { label: 'Por revisar',   color: 'text-amber-800',   bg: 'bg-amber-100' },
  approved:  { label: 'Aprobada',      color: 'text-emerald-800', bg: 'bg-emerald-100' },
  ingested:  { label: 'En el corpus',  color: 'text-violet-800',  bg: 'bg-violet-100' },
  rejected:  { label: 'Rechazada',     color: 'text-rose-800',    bg: 'bg-rose-100' },
};

interface IngestionLogItem {
  publicationId: string;
  legalDocId: string | null;
  legalDocTitle: string | null;
  normType: string | null;
  jurisdiction: string | null;
  publishedAt: string | null;
  editionNumber: string | null;
  editionDate: string | null;
  editionPdfUrl: string | null;
  publicationType: string | null;
  publicationNumber: string | null;
  title: string;
  issuingEntity: string | null;
  aiSummary: string | null;
  aiClassification: string | null;
  aiRelevanceScore: number | null;
  aiKeywords: string[];
  rawTextLength: number | null;
  contentSizeBytes: number | null;
  chunksCount: number;
  reviewedBy: string | null;
  reviewerEmail: string | null;
  reviewedAt: string | null;
  ingestedAt: string | null;
  createdAt: string;
}

interface IngestionLog {
  summary: {
    totalIngested: number;
    totalBytes: number;
    totalChunks: number;
    last24h: number;
    last7d: number;
  };
  items: IngestionLogItem[];
}

function formatBytes(n: number): string {
  if (n === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${(n / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'hace segundos';
  if (ms < 3_600_000) return `hace ${Math.round(ms / 60_000)} min`;
  if (ms < 86_400_000) return `hace ${Math.round(ms / 3_600_000)} h`;
  if (ms < 7 * 86_400_000) return `hace ${Math.round(ms / 86_400_000)} d`;
  return new Date(iso).toLocaleDateString('es-EC');
}

type Tab = 'publications' | 'ingestion-log';

export default function RegistroOficialAdminPage() {
  const [tab, setTab] = useState<Tab>('publications');
  const [stats, setStats] = useState<Stats | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [ingestionLog, setIngestionLog] = useState<IngestionLog | null>(null);
  const [logQuery, setLogQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('analyzed');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const loadIngestionLog = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get('/admin/registro-oficial/ingestion-log', {
        params: { q: logQuery || undefined, limit: 200 },
      });
      setIngestionLog(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al cargar log');
    } finally { setLoading(false); }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, p] = await Promise.all([
        api.get('/admin/registro-oficial/stats'),
        api.get('/admin/registro-oficial/publications', {
          params: { status: statusFilter || undefined, type: typeFilter || undefined, q: q || undefined },
        }),
      ]);
      setStats(s.data);
      setPublications(p.data.publications || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al cargar');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'publications') void load();
    else if (tab === 'ingestion-log') void loadIngestionLog();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [tab, statusFilter, typeFilter]);

  const triggerScan = async () => {
    setScanning(true);
    try {
      await api.post('/admin/registro-oficial/scan-now', {});
      // Poll cada 5s hasta que termine
      let tries = 0;
      const poll = async () => {
        tries++;
        const r = await api.get('/admin/registro-oficial/stats');
        setStats(r.data);
        if (r.data.lastScan?.status === 'running' && tries < 60) {
          setTimeout(poll, 5000);
        } else {
          setScanning(false);
          void load();
        }
      };
      setTimeout(poll, 3000);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo disparar el scan');
      setScanning(false);
    }
  };

  const approve = async (id: string) => {
    if (!confirm('Aprobar e ingestar al corpus legal vectorizado?')) return;
    try {
      await api.post(`/admin/registro-oficial/publications/${id}/approve`);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'No se pudo aprobar');
    }
  };

  const reject = async (id: string) => {
    const reason = prompt('Razón del rechazo (opcional):') || '';
    try {
      await api.post(`/admin/registro-oficial/publications/${id}/reject`, { reason });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'No se pudo rechazar');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ScrollText className="w-7 h-7 text-violet-600" />
            Registro Oficial · Ecuador
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Scraper diario (02:00 hora Ecuador) que detecta nuevas leyes y normas publicadas oficialmente.
            Las publicaciones aprobadas se vectorizan al corpus legal del sistema.
          </p>
        </div>
        <button
          onClick={triggerScan}
          disabled={scanning}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {scanning ? 'Scaneando…' : 'Scaneo manual ahora'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border-2 border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* ─── Tab navigation ─── */}
      <div className="flex items-center border-b-2 border-gray-200 -mb-0.5">
        <button
          onClick={() => setTab('publications')}
          className={`px-4 py-2.5 -mb-0.5 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            tab === 'publications'
              ? 'border-violet-600 text-violet-700'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <ScrollText className="w-4 h-4" />
          Publicaciones detectadas
          {stats && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              tab === 'publications' ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-600'
            }`}>
              {(stats.byStatus.analyzed || 0) + (stats.byStatus.detected || 0)}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('ingestion-log')}
          className={`px-4 py-2.5 -mb-0.5 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            tab === 'ingestion-log'
              ? 'border-violet-600 text-violet-700'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <Database className="w-4 h-4" />
          Registro de ingesta · Corpus vectorizado
          {ingestionLog && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              tab === 'ingestion-log' ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-600'
            }`}>
              {ingestionLog.summary.totalIngested}
            </span>
          )}
        </button>
      </div>

      {/* Stats (solo en tab publications) */}
      {tab === 'publications' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={<Sparkles />} label="Total" value={stats.total} color="violet" />
          <StatCard icon={<Activity />} label="Por revisar" value={stats.byStatus.analyzed || 0} color="amber" />
          <StatCard icon={<CheckCircle2 />} label="Aprobadas" value={stats.byStatus.approved || 0} color="emerald" />
          <StatCard icon={<TrendingUp />} label="En corpus" value={stats.byStatus.ingested || 0} color="indigo" />
          <StatCard icon={<XCircle />} label="Rechazadas" value={stats.byStatus.rejected || 0} color="rose" />
        </div>
      )}

      {/* Last scan info (solo publications) */}
      {tab === 'publications' && stats?.lastScan && (
        <div className="rounded-lg border border-gray-200 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 p-3 flex items-center gap-4 text-sm">
          <Activity className="w-5 h-5 text-violet-600 shrink-0" />
          <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-700">
            <span><strong>Último scan:</strong> {new Date(stats.lastScan.started_at).toLocaleString('es-EC')}</span>
            <span>Estado: <strong className={
              stats.lastScan.status === 'running' ? 'text-amber-700' :
              stats.lastScan.status === 'completed' ? 'text-emerald-700' :
              'text-rose-700'
            }>{stats.lastScan.status}</strong></span>
            <span><strong>{stats.lastScan.editionsFound}</strong> ediciones</span>
            <span><strong>{stats.lastScan.publicationsFound}</strong> publicaciones nuevas</span>
          </div>
        </div>
      )}

      {/* Filters (solo publications) */}
      {tab === 'publications' && <div className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
        <Filter className="w-4 h-4 text-gray-500" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        >
          <option value="">Todos los estados</option>
          <option value="analyzed">Por revisar (analyzed)</option>
          <option value="detected">Detectadas (sin IA)</option>
          <option value="approved">Aprobadas</option>
          <option value="ingested">En el corpus</option>
          <option value="rejected">Rechazadas</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar en título o resumen…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white flex-1"
          />
          <button onClick={load} className="text-xs px-2 py-1 rounded bg-violet-600 text-white font-bold hover:bg-violet-700">Buscar</button>
        </div>
      </div>}

      {/* TAB 1: Publications list */}
      {tab === 'publications' && (
        loading ? (
          <div className="text-center py-12 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-violet-500" />
            Cargando…
          </div>
        ) : publications.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <ScrollText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-semibold">Sin publicaciones en este filtro</p>
            <p className="text-xs mt-1">Disparar un scan manual o cambiar filtros.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {publications.map((p) => (
              <PublicationCard key={p.id} pub={p} onApprove={() => approve(p.id)} onReject={() => reject(p.id)} />
            ))}
          </div>
        )
      )}

      {/* TAB 2: Ingestion Log */}
      {tab === 'ingestion-log' && (
        <IngestionLogView
          data={ingestionLog}
          loading={loading}
          q={logQuery}
          setQ={setLogQuery}
          onRefresh={loadIngestionLog}
        />
      )}

      {/* Panel explicativo del proceso (siempre visible) */}
      <ScraperProcessExplainer />
    </div>
  );
}

// ─── INGESTION LOG VIEW ────────────────────────────────────────

function IngestionLogView({ data, loading, q, setQ, onRefresh }: {
  data: IngestionLog | null;
  loading: boolean;
  q: string;
  setQ: (v: string) => void;
  onRefresh: () => void;
}) {
  if (loading && !data) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-violet-500" />
        Cargando registro de ingesta…
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* KPIs del corpus */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiBox icon={<Database className="w-4 h-4" />} label="Total ingestado" value={data.summary.totalIngested.toString()} color="violet" />
        <KpiBox icon={<Layers className="w-4 h-4" />} label="Chunks generados" value={data.summary.totalChunks.toLocaleString()} color="indigo" />
        <KpiBox icon={<FileText className="w-4 h-4" />} label="Tamaño total" value={formatBytes(data.summary.totalBytes)} color="cyan" />
        <KpiBox icon={<Clock className="w-4 h-4" />} label="Últimas 24h" value={data.summary.last24h.toString()} color="emerald" />
        <KpiBox icon={<TrendingUp className="w-4 h-4" />} label="Últimos 7 días" value={data.summary.last7d.toString()} color="amber" />
      </div>

      {/* Buscar */}
      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar en título, resumen IA o nombre del documento legal…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onRefresh()}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white flex-1"
        />
        <button onClick={onRefresh} className="text-xs px-3 py-1.5 rounded bg-violet-600 text-white font-bold hover:bg-violet-700">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
        </button>
      </div>

      {/* Tabla de ingestiones */}
      {data.items.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Database className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-semibold">Sin documentos ingestados todavía</p>
          <p className="text-xs mt-1">Las publicaciones aprobadas en la pestaña anterior aparecerán aquí.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-600">Ingestado</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-600">Tipo</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-600">Norma / Ley</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-600">RO</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-600">Tamaño</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-600">Chunks</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-600">Score IA</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-600">Aprobado por</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-600">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((it) => {
                const typeMeta = it.publicationType ? TYPE_LABEL[it.publicationType] : null;
                const sizeBytes = it.contentSizeBytes ?? 0;
                const score = it.aiRelevanceScore ?? 0;
                return (
                  <tr key={it.publicationId} className="hover:bg-violet-50/30 transition">
                    <td className="px-3 py-2.5 align-top">
                      <div className="text-xs font-bold text-gray-900 leading-tight">
                        {it.ingestedAt ? formatRelativeTime(it.ingestedAt) : '—'}
                      </div>
                      <div className="text-[10px] text-gray-500 leading-tight">
                        {it.ingestedAt && new Date(it.ingestedAt).toLocaleString('es-EC', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {typeMeta ? (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-${typeMeta.color}-100 text-${typeMeta.color}-700`}>
                          <span>{typeMeta.icon}</span>
                          <span className="hidden sm:inline">{typeMeta.label}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500">—</span>
                      )}
                      {it.aiClassification && (
                        <div className="text-[9px] mt-1 px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 font-bold uppercase tracking-wider inline-block">
                          {it.aiClassification}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top max-w-[280px]">
                      <div className="text-xs font-bold text-gray-900 leading-tight">
                        {it.legalDocTitle || it.title}
                      </div>
                      {it.publicationNumber && (
                        <div className="text-[10px] text-gray-600">N° {it.publicationNumber}</div>
                      )}
                      {it.issuingEntity && (
                        <div className="text-[10px] text-gray-500 truncate">
                          <Building2 className="w-2.5 h-2.5 inline mr-0.5" />
                          {it.issuingEntity}
                        </div>
                      )}
                      {it.aiKeywords && it.aiKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {it.aiKeywords.slice(0, 3).map((kw, i) => (
                            <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-700">{kw}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {it.editionNumber && (
                        <div className="text-xs font-bold text-gray-900">RO {it.editionNumber}</div>
                      )}
                      {it.editionDate && (
                        <div className="text-[10px] text-gray-500">
                          {new Date(it.editionDate).toLocaleDateString('es-EC')}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top text-right">
                      <div className="text-xs font-bold text-gray-900 tabular-nums">{formatBytes(sizeBytes)}</div>
                      <div className="text-[9px] text-gray-500 tabular-nums">{(it.rawTextLength || 0).toLocaleString()} chars</div>
                    </td>
                    <td className="px-3 py-2.5 align-top text-right">
                      <div className="text-xs font-black text-indigo-700 tabular-nums">{it.chunksCount}</div>
                      <div className="text-[9px] text-gray-500">chunks</div>
                    </td>
                    <td className="px-3 py-2.5 align-top text-center">
                      <div className={`text-xs font-black tabular-nums ${
                        score >= 0.7 ? 'text-emerald-700' :
                        score >= 0.4 ? 'text-amber-700' : 'text-gray-600'
                      }`}>
                        {Math.round(score * 100)}%
                      </div>
                      <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-0.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            score >= 0.7 ? 'bg-emerald-500' :
                            score >= 0.4 ? 'bg-amber-500' : 'bg-gray-400'
                          }`}
                          style={{ width: `${Math.round(score * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="text-[10px] text-gray-700 truncate max-w-[120px]">
                        {it.reviewerEmail || (it.reviewedBy ? '—' : 'sistema')}
                      </div>
                      {it.reviewedAt && (
                        <div className="text-[9px] text-gray-500">
                          {new Date(it.reviewedAt).toLocaleDateString('es-EC')}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {it.editionPdfUrl && (
                        <a
                          href={it.editionPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 transition"
                          title="Descargar PDF original del RO"
                        >
                          <Download className="w-3 h-3" />
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-center text-[10px] text-gray-500 mt-2">
        Mostrando hasta 200 ingestiones más recientes · ordenadas por fecha descendente
      </div>
    </div>
  );
}

function KpiBox({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200' },
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
    cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  };
  const c = colorMap[color] || colorMap.violet;
  return (
    <div className={`rounded-lg border-2 p-3 ${c.bg} ${c.border}`}>
      <div className={`flex items-center gap-1.5 ${c.text} mb-1`}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-bold">{label}</span>
      </div>
      <div className={`text-xl font-black tabular-nums ${c.text}`}>{value}</div>
    </div>
  );
}

// ─── PROCESO SCRAPER EXPLAINER (siempre visible al final) ──────

function ScraperProcessExplainer() {
  return (
    <details className="mt-6 rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/30 via-white to-violet-50/30">
      <summary className="cursor-pointer px-5 py-3 font-bold text-indigo-900 text-sm flex items-center gap-2 hover:bg-indigo-50/50 transition rounded-xl select-none">
        <Brain className="w-5 h-5" />
        ¿Cómo funciona el scraper diario? · Pipeline técnico completo
        <ChevronRight className="w-4 h-4 ml-auto transition-transform group-open:rotate-90" />
      </summary>
      <div className="px-5 pb-5 pt-2 space-y-4">

        {/* Línea de tiempo del proceso */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {[
            { step: '1', time: '02:00 EC', label: 'Cron dispara', icon: <Clock className="w-4 h-4" />, desc: 'node-cron en server.ts activa el job a las 07:00 UTC = 02:00 Ecuador, días hábiles' },
            { step: '2', time: '~2s', label: 'Listing', icon: <Globe className="w-4 h-4" />, desc: 'Fetch al index del año actual en registroficial.gob.ec (HTML/Joomla)' },
            { step: '3', time: '~3s', label: 'Diff', icon: <Hash className="w-4 h-4" />, desc: 'Compara edition_number contra registry_publications. Solo ediciones NUEVAS pasan' },
            { step: '4', time: '~15s c/u', label: 'Descarga PDF', icon: <Download className="w-4 h-4" />, desc: 'Para cada edición nueva (max 5 por corrida): GET al PDF con User-Agent del bot' },
            { step: '5', time: '~5s c/u', label: 'Parse', icon: <FileText className="w-4 h-4" />, desc: 'pdf-parse extrae texto. Heurística sobre headers MAYÚSCULAS detecta instrumentos individuales (Ley/Decreto/Acuerdo/etc)' },
            { step: '6', time: '~3s c/u', label: 'Análisis IA', icon: <Sparkles className="w-4 h-4" />, desc: 'Claude Opus 4.7 clasifica tipo, materia legal (16 categorías), keywords y score de relevancia 0-1' },
            { step: '7', time: '<1s', label: 'Persistir', icon: <Database className="w-4 h-4" />, desc: 'INSERT en registry_publications con status="analyzed" (listos para revisión humana)' },
          ].map((s, i) => (
            <div key={i} className="rounded-lg border border-indigo-200 bg-white p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-black grid place-items-center">{s.step}</span>
                <span className="text-[9px] text-gray-500 font-mono">{s.time}</span>
              </div>
              <div className="flex items-center gap-1.5 text-indigo-700 mb-1">
                {s.icon}
                <span className="text-xs font-bold">{s.label}</span>
              </div>
              <div className="text-[10px] text-gray-600 leading-snug">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Detalles técnicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700 leading-relaxed">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Detección de cambios
            </h4>
            <p className="mb-2">El scraper construye un set de <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">edition_number</code> ya conocidos en la BD y solo procesa los que NO están. Si ya scrapeamos RO 853, no lo volvemos a tocar.</p>
            <p>Cada edición incluye múltiples publicaciones individuales. Una edición = 35-50 páginas PDF promedio = 5-20 instrumentos legales separables.</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-2 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              Workflow de aprobación
            </h4>
            <ol className="space-y-1 list-decimal pl-4">
              <li><strong>detected</strong> → Detectada en PDF, sin análisis IA</li>
              <li><strong>analyzed</strong> → IA clasificó tipo + score + keywords</li>
              <li><strong>approved</strong> → Admin la marcó OK</li>
              <li><strong>ingested</strong> → Vectorizada al corpus legal</li>
              <li><strong>rejected</strong> → Descartada con razón</li>
            </ol>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-2 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Descarga e ingesta automática
            </h4>
            <p className="mb-1.5"><strong>Al hacer click en "Aprobar e ingestar"</strong>:</p>
            <ul className="space-y-1 pl-4 list-disc">
              <li>Se crea entrada en <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">legal_documents</code> con el texto extraído del PDF</li>
              <li>Metadata: edición RO, número, fecha, entidad emisora, keywords IA</li>
              <li>Link al PDF original guardado en <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">source_url</code></li>
              <li>El sistema vectoriza en background (chunks de ~1000 chars + embeddings OpenAI)</li>
              <li>A partir de ahí, las búsquedas RAG del corpus encuentran la norma</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Límites y cortesía
            </h4>
            <ul className="space-y-1 pl-4 list-disc">
              <li><strong>Max 5 ediciones/corrida</strong> — evita saturar IA con backlog</li>
              <li><strong>Max 30 publicaciones/edición</strong> — RO grandes se procesan parcial</li>
              <li><strong>Cortesía 1.5s</strong> entre requests al sitio gubernamental</li>
              <li><strong>Timeout 30s</strong> por descarga PDF</li>
              <li>Disable con env <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">DISABLE_REGISTRO_OFICIAL_CRON=1</code></li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-r from-violet-100 via-fuchsia-50 to-violet-100 rounded-lg border border-violet-200 p-3 text-xs text-violet-900">
          <strong>⚡ Botón "Scaneo manual ahora":</strong> dispara <code className="bg-white px-1 py-0.5 rounded">runScan()</code> sin esperar al cron. Útil tras un deploy nuevo del scraper o para procesar el día actual antes de las 02:00. Se ejecuta en background y la UI hace polling cada 5s hasta que termine.
        </div>
      </div>
    </details>
  );
}

// ─── COMPONENTES ───────────────────────────────────────────────

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number; color: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
  };
  const c = colorMap[color] || colorMap.violet;
  return (
    <div className={`rounded-lg border-2 p-3 ${c.bg} ${c.border}`}>
      <div className={`flex items-center gap-1.5 ${c.text} mb-1`}>
        <div className="w-4 h-4">{icon}</div>
        <span className="text-[10px] uppercase tracking-wider font-bold">{label}</span>
      </div>
      <div className={`text-2xl font-black tabular-nums ${c.text}`}>{value}</div>
    </div>
  );
}

function PublicationCard({ pub, onApprove, onReject }: {
  pub: Publication;
  onApprove: () => void;
  onReject: () => void;
}) {
  const typeMeta = pub.publication_type ? TYPE_LABEL[pub.publication_type] : null;
  const statusMeta = STATUS_META[pub.status] || STATUS_META.detected;
  const relevance = pub.ai_relevance_score ?? 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0">{typeMeta?.icon || '📄'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {typeMeta && (
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-${typeMeta.color}-100 text-${typeMeta.color}-700`}>
                {typeMeta.label}
              </span>
            )}
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusMeta.bg} ${statusMeta.color}`}>
              {statusMeta.label}
            </span>
            {pub.ai_classification && (
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700">
                <Tag className="w-2.5 h-2.5 inline mr-0.5" />
                {pub.ai_classification}
              </span>
            )}
            {pub.ai_relevance_score != null && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600">
                <Sparkles className="w-2.5 h-2.5 text-violet-500" />
                {Math.round(relevance * 100)}% relev.
              </span>
            )}
          </div>

          <h3 className="text-sm font-bold text-gray-900 leading-snug">{pub.title}</h3>

          <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
            {pub.edition_number && (
              <span><strong>RO {pub.edition_number}</strong></span>
            )}
            {pub.edition_date && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(pub.edition_date).toLocaleDateString('es-EC')}
              </span>
            )}
            {pub.issuing_entity && (
              <span className="inline-flex items-center gap-1 truncate max-w-[260px]">
                <Building2 className="w-3 h-3" />
                {pub.issuing_entity}
              </span>
            )}
          </div>

          {pub.ai_summary && (
            <div className="mt-2 p-2 bg-violet-50/50 border-l-2 border-violet-400 rounded text-xs text-gray-800 leading-relaxed">
              <Brain className="w-3 h-3 inline mr-1 text-violet-600" />
              {pub.ai_summary}
            </div>
          )}

          {pub.ai_keywords && pub.ai_keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {pub.ai_keywords.slice(0, 6).map((kw, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {pub.edition_pdf_url && (
              <a
                href={pub.edition_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                <Download className="w-3.5 h-3.5" />
                PDF original
              </a>
            )}
            {pub.status === 'analyzed' || pub.status === 'detected' ? (
              <>
                <button
                  onClick={onApprove}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aprobar e ingestar
                </button>
                <button
                  onClick={onReject}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Rechazar
                </button>
              </>
            ) : pub.status === 'ingested' && pub.ingested_legal_doc_id ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ingestada al corpus · {pub.chunks_created || '?'} chunks
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
