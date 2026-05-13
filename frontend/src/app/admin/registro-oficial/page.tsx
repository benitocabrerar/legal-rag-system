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
  AlertTriangle, ChevronRight, Download, Brain,
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

export default function RegistroOficialAdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('analyzed');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

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

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter, typeFilter]);

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

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={<Sparkles />} label="Total" value={stats.total} color="violet" />
          <StatCard icon={<Activity />} label="Por revisar" value={stats.byStatus.analyzed || 0} color="amber" />
          <StatCard icon={<CheckCircle2 />} label="Aprobadas" value={stats.byStatus.approved || 0} color="emerald" />
          <StatCard icon={<TrendingUp />} label="En corpus" value={stats.byStatus.ingested || 0} color="indigo" />
          <StatCard icon={<XCircle />} label="Rechazadas" value={stats.byStatus.rejected || 0} color="rose" />
        </div>
      )}

      {/* Last scan info */}
      {stats?.lastScan && (
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
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
      </div>

      {/* Publications list */}
      {loading ? (
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
      )}
    </div>
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
