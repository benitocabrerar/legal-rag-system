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
  Hash, User, Globe, Zap, BookMarked, ExternalLink, Library, Scale, Gavel,
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

type Tab = 'publications' | 'ingestion-log' | 'norm-catalog' | 'alerts';

interface NormAlert {
  id: string;
  alert_type: 'outdated_doc' | 'potential_reform' | 'new_law' | 'new_edition' | 'manual';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  legal_doc_id: string | null;
  publication_id: string | null;
  title: string;
  description: string | null;
  local_publication_date: string | null;
  remote_publication_date: string | null;
  remote_source_url: string | null;
  remote_edition_number: string | null;
  remote_pdf_url: string | null;
  diff_data: any;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  legal_doc_title: string | null;
  legal_doc_hierarchy: string | null;
  publication_title: string | null;
  publication_pdf_url: string | null;
  publication_ai_summary: string | null;
}

interface AlertsResponse {
  items: NormAlert[];
  summary: {
    openTotal: number;
    highOpen: number;
    outdatedOpen: number;
    newLawOpen: number;
    newEditionOpen: number;
    reformOpen: number;
  };
  pagination: { limit: number; offset: number };
}

interface MonitorProgress {
  pct: number;
  label: string;
  phase: string;
  startedAt?: string;
  finished?: boolean;
  error?: string;
  result?: {
    alertsCreated: number;
    feedItemsProcessed: number;
    newEditionsDetected: number;
    potentialReformsDetected: number;
    newLawsDetected: number;
    outdatedDocsDetected: number;
    durationMs: number;
  };
}

const ALERT_TYPE_META: Record<NormAlert['alert_type'], { label: string; icon: string; color: string; bg: string; text: string; border: string }> = {
  outdated_doc:     { label: 'Documento desactualizado', icon: '⚠️', color: 'amber',  bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200' },
  potential_reform: { label: 'Posible reforma',          icon: '🔄', color: 'orange', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  new_law:          { label: 'Ley nueva sin ingestar',   icon: '✨', color: 'violet', bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200' },
  new_edition:      { label: 'Edición no scrapeada',     icon: '📰', color: 'sky',    bg: 'bg-sky-50',    text: 'text-sky-800',    border: 'border-sky-200' },
  manual:           { label: 'Manual',                   icon: '✏️', color: 'gray',   bg: 'bg-gray-50',   text: 'text-gray-800',   border: 'border-gray-200' },
};

const SEVERITY_META: Record<NormAlert['severity'], { label: string; bg: string; text: string }> = {
  critical: { label: 'CRÍTICA', bg: 'bg-rose-600',   text: 'text-white' },
  high:     { label: 'ALTA',    bg: 'bg-rose-500',   text: 'text-white' },
  medium:   { label: 'MEDIA',   bg: 'bg-amber-500',  text: 'text-white' },
  low:      { label: 'BAJA',    bg: 'bg-gray-400',   text: 'text-white' },
};

interface NormCatalogItem {
  id: string;
  title: string;
  norm_title: string | null;
  norm_type: string | null;
  legal_hierarchy: string | null;
  publication_type: string | null;
  publication_number: string | null;
  publication_date: string | null;
  last_reform_date: string | null;
  category: string | null;
  country_code: string | null;
  pdf_url: string | null;
  edition_url: string | null;
  edition_number: string | null;
}

interface NormCatalogResponse {
  items: NormCatalogItem[];
  total: number;
  limit: number;
  offset: number;
}

interface ExternalSource {
  label: string;
  url: string;
}

const NORM_CATALOG_TYPES: Array<{
  key: string;
  label: string;
  icon: string;
  color: string;
  hier: string;
}> = [
  { key: 'constitucion',       label: 'Constitución',       icon: '🏛️', color: 'amber',    hier: 'CONSTITUCION' },
  { key: 'codigos_organicos',  label: 'Códigos Orgánicos',  icon: '⚖️',  color: 'violet',   hier: 'CODIGOS_ORGANICOS' },
  { key: 'leyes_organicas',    label: 'Leyes Orgánicas',    icon: '📜', color: 'rose',     hier: 'LEYES_ORGANICAS' },
  { key: 'leyes_ordinarias',   label: 'Leyes Ordinarias',   icon: '📄', color: 'sky',      hier: 'LEYES_ORDINARIAS' },
];

const HIER_META: Record<string, { label: string; bg: string; text: string; border: string }> = {
  CONSTITUCION:       { label: 'Constitución',        bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200' },
  CODIGOS_ORGANICOS:  { label: 'Código Orgánico',     bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200' },
  LEYES_ORGANICAS:    { label: 'Ley Orgánica',        bg: 'bg-rose-50',   text: 'text-rose-800',   border: 'border-rose-200' },
  CODIGOS_ORDINARIOS: { label: 'Código Ordinario',    bg: 'bg-cyan-50',   text: 'text-cyan-800',   border: 'border-cyan-200' },
  LEYES_ORDINARIAS:   { label: 'Ley Ordinaria',       bg: 'bg-sky-50',    text: 'text-sky-800',    border: 'border-sky-200' },
};

interface ScanProgress {
  pct: number;
  label: string;
  phase: string;
  startedAt?: string;
  publicationsLog: Array<{ type: string; title: string; classification: string; edition: string }>;
  editionsLog: Array<{ number: string; status: string; publicationsCount?: number }>;
  finished?: {
    editionsFound: number;
    publicationsFound: number;
    autoIngested?: number;
    autoIngestNotified?: number;
    errors: string[];
  };
  error?: string;
}

export default function RegistroOficialAdminPage() {
  const [tab, setTab] = useState<Tab>('publications');
  const [stats, setStats] = useState<Stats | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [ingestionLog, setIngestionLog] = useState<IngestionLog | null>(null);
  const [logQuery, setLogQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('analyzed');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  // Catálogo Normativo
  const [normCatalog, setNormCatalog] = useState<NormCatalogResponse | null>(null);
  const [normCatalogQuery, setNormCatalogQuery] = useState('');
  const [normCatalogTypes, setNormCatalogTypes] = useState<string[]>([
    'constitucion', 'codigos_organicos', 'leyes_organicas', 'leyes_ordinarias',
  ]);
  const [externalSources, setExternalSources] = useState<ExternalSource[]>([]);

  // Alertas de monitor
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [alertStatusFilter, setAlertStatusFilter] = useState<string>('open');
  const [alertTypeFilter, setAlertTypeFilter] = useState<string>('');
  const [monitorRunning, setMonitorRunning] = useState(false);
  const [monitorProgress, setMonitorProgress] = useState<MonitorProgress | null>(null);

  const loadAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get<AlertsResponse>('/admin/registro-oficial/alerts', {
        params: {
          status: alertStatusFilter || undefined,
          type:   alertTypeFilter   || undefined,
          limit:  100,
        },
      });
      setAlerts(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al cargar alertas');
    } finally { setLoading(false); }
  };

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'dismiss' | 'resolve') => {
    try {
      await api.post(`/admin/registro-oficial/alerts/${alertId}/${action}`, {});
      await loadAlerts();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || `Error en ${action}`);
    }
  };

  const triggerMonitor = async () => {
    setMonitorRunning(true);
    setMonitorProgress({ pct: 0, label: 'Conectando…', phase: 'connecting' });
    try {
      const { getAuthToken } = await import('@/lib/get-auth-token');
      const token = await getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const r = await fetch(`${API_URL}/api/v1/admin/registro-oficial/alerts/check-now`, {
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
          try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { /* ignore */ }
          if (!payload) continue;

          if (event === 'connected') {
            setMonitorProgress((p) => p ? { ...p, startedAt: payload.startedAt } : p);
          } else if (event === 'phase') {
            setMonitorProgress((p) => p ? { ...p, pct: payload.pct ?? p.pct, label: payload.label, phase: payload.phase } : p);
          } else if (event === 'done') {
            setMonitorProgress((p) => p ? { ...p, pct: 100, label: '✓ Monitor completado', phase: 'done', finished: true, result: payload } : p);
            await loadAlerts();
          } else if (event === 'error') {
            setMonitorProgress((p) => p ? { ...p, error: payload.error, label: payload.error } : p);
          }
        }
      }
    } catch (e: any) {
      setMonitorProgress((p) => p ? { ...p, error: e?.message || 'Error desconocido' } : p);
    } finally {
      setMonitorRunning(false);
    }
  };

  const closeMonitorModal = () => {
    if (!monitorRunning) setMonitorProgress(null);
  };

  const loadNormCatalog = async (overrides?: { q?: string; types?: string[] }) => {
    setLoading(true);
    setError('');
    try {
      const effectiveQ      = overrides?.q     ?? normCatalogQuery;
      const effectiveTypes  = overrides?.types ?? normCatalogTypes;
      const r = await api.get<NormCatalogResponse>('/admin/registro-oficial/norm-catalog', {
        params: {
          q:     effectiveQ || undefined,
          types: effectiveTypes.join(','),
          limit: 100,
        },
      });
      setNormCatalog(r.data);

      // Fallback externo: si q tiene algo, traemos también los enlaces externos
      if (effectiveQ && effectiveQ.trim()) {
        try {
          const ext = await api.get<{ sources: ExternalSource[] }>(
            '/admin/registro-oficial/norm-catalog/external',
            { params: { q: effectiveQ } },
          );
          setExternalSources(ext.data?.sources || []);
        } catch { setExternalSources([]); }
      } else {
        setExternalSources([]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al cargar catálogo');
    } finally { setLoading(false); }
  };

  const toggleNormCatalogType = (key: string) => {
    setNormCatalogTypes((prev) => {
      const next = prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key];
      // Disparar reload con el nuevo set (no esperar al useEffect)
      void loadNormCatalog({ types: next });
      return next;
    });
  };

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
    else if (tab === 'norm-catalog') void loadNormCatalog();
    else if (tab === 'alerts') void loadAlerts();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [tab, statusFilter, typeFilter, alertStatusFilter, alertTypeFilter]);

  const triggerScan = async () => {
    setScanning(true);
    setScanProgress({
      pct: 0,
      label: 'Conectando…',
      phase: 'connecting',
      publicationsLog: [],
      editionsLog: [],
    });
    try {
      const { getAuthToken } = await import('@/lib/get-auth-token');
      const token = await getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const r = await fetch(`${API_URL}/api/v1/admin/registro-oficial/scan-now`, {
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
          try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { /* ignore */ }
          if (!payload) continue;

          if (event === 'connected') {
            setScanProgress((s) => s ? { ...s, startedAt: payload.startedAt } : s);
          } else if (event === 'phase') {
            setScanProgress((s) => s ? {
              ...s,
              pct: payload.pct,
              label: payload.label,
              phase: payload.phase,
            } : s);
          } else if (event === 'edition') {
            setScanProgress((s) => s ? {
              ...s,
              editionsLog: [...s.editionsLog, { number: payload.number, status: payload.status }],
            } : s);
          } else if (event === 'edition-done') {
            setScanProgress((s) => s ? {
              ...s,
              editionsLog: s.editionsLog.map((e) =>
                e.number === payload.number
                  ? { ...e, status: 'done', publicationsCount: payload.publicationsCount }
                  : e
              ),
            } : s);
          } else if (event === 'publication') {
            setScanProgress((s) => s ? {
              ...s,
              publicationsLog: [...s.publicationsLog, {
                type: payload.type,
                title: payload.title,
                classification: payload.classification,
                edition: payload.edition,
              }].slice(-20),  // últimas 20 visibles
            } : s);
          } else if (event === 'done') {
            setScanProgress((s) => s ? {
              ...s,
              pct: 100,
              label: 'Completado',
              phase: 'done',
              finished: {
                editionsFound: payload.editionsFound,
                publicationsFound: payload.publicationsFound,
                autoIngested: payload.autoIngested ?? 0,
                autoIngestNotified: payload.autoIngestNotified ?? 0,
                errors: payload.errors || [],
              },
            } : s);
          } else if (event === 'error') {
            setScanProgress((s) => s ? { ...s, error: payload.error } : s);
          }
        }
      }
      await load();
    } catch (e: any) {
      setScanProgress((s) => s ? { ...s, error: e?.message || 'Error en scan' } : s);
    } finally {
      setScanning(false);
    }
  };

  const closeScanModal = () => {
    setScanProgress(null);
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

  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ ok: number; fail: number; current: string } | null>(null);

  const approveAllAnalyzed = async () => {
    const analyzed = publications.filter((p) => p.status === 'analyzed');
    if (analyzed.length === 0) {
      alert('No hay publicaciones pendientes en este filtro.');
      return;
    }
    if (!confirm(`Aprobar e ingestar ${analyzed.length} publicaciones al corpus? Esto puede tardar ${Math.ceil(analyzed.length * 0.5)}-${analyzed.length} minutos.`)) return;

    setBulkApproving(true);
    setBulkProgress({ ok: 0, fail: 0, current: '' });
    let ok = 0, fail = 0;
    for (const p of analyzed) {
      setBulkProgress({ ok, fail, current: p.title.slice(0, 80) });
      try {
        await api.post(`/admin/registro-oficial/publications/${p.id}/approve`);
        ok++;
      } catch {
        fail++;
      }
      setBulkProgress({ ok, fail, current: p.title.slice(0, 80) });
    }
    setBulkApproving(false);
    await load();
    alert(`Completado: ${ok} ingestadas, ${fail} fallaron.`);
    setBulkProgress(null);
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
        <button
          onClick={() => setTab('norm-catalog')}
          className={`px-4 py-2.5 -mb-0.5 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            tab === 'norm-catalog'
              ? 'border-violet-600 text-violet-700'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <Library className="w-4 h-4" />
          Catálogo Normativo · Constitución, Códigos, Leyes
          {normCatalog && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              tab === 'norm-catalog' ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-600'
            }`}>
              {normCatalog.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('alerts')}
          className={`px-4 py-2.5 -mb-0.5 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            tab === 'alerts'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Alertas de Actualización · Monitor en vivo
          {alerts && alerts.summary.openTotal > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse ${
              alerts.summary.highOpen > 0
                ? 'bg-rose-500 text-white'
                : tab === 'alerts' ? 'bg-rose-100 text-rose-700' : 'bg-gray-200 text-gray-600'
            }`}>
              {alerts.summary.openTotal}
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
          <>
            {publications.filter((p) => p.status === 'analyzed').length > 0 && (
              <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 grid place-items-center text-white shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-black text-amber-900">
                    {publications.filter((p) => p.status === 'analyzed').length} publicaciones pendientes de ingestar al corpus
                  </div>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    Estas publicaciones fueron detectadas y analizadas por IA, pero no calificaron para auto-ingest
                    automático. Si son normas de interés, puedes aprobarlas en bulk para incorporarlas al corpus
                    vectorial (chunks + embeddings + broadcast).
                  </p>
                  {bulkProgress && (
                    <div className="mt-2 text-xs text-amber-900">
                      <strong>Progreso:</strong> {bulkProgress.ok} ingestadas · {bulkProgress.fail} fallaron · procesando: <em>{bulkProgress.current}</em>
                    </div>
                  )}
                </div>
                <button
                  onClick={approveAllAnalyzed}
                  disabled={bulkApproving}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {bulkApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {bulkApproving ? 'Ingestando…' : 'Aprobar todas'}
                </button>
              </div>
            )}
            <div className="space-y-3 mt-3">
              {publications.map((p) => (
                <PublicationCard key={p.id} pub={p} onApprove={() => approve(p.id)} onReject={() => reject(p.id)} />
              ))}
            </div>
          </>
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

      {/* TAB 3: Catálogo Normativo */}
      {tab === 'norm-catalog' && (
        <NormCatalogView
          data={normCatalog}
          loading={loading}
          query={normCatalogQuery}
          setQuery={setNormCatalogQuery}
          types={normCatalogTypes}
          toggleType={toggleNormCatalogType}
          onSearch={() => loadNormCatalog()}
          externalSources={externalSources}
        />
      )}

      {/* TAB 4: Alertas de Actualización */}
      {tab === 'alerts' && (
        <AlertsView
          data={alerts}
          loading={loading}
          statusFilter={alertStatusFilter}
          setStatusFilter={setAlertStatusFilter}
          typeFilter={alertTypeFilter}
          setTypeFilter={setAlertTypeFilter}
          onAction={handleAlertAction}
          onTriggerMonitor={triggerMonitor}
          monitorRunning={monitorRunning}
          onRefresh={loadAlerts}
        />
      )}

      {/* Modal SSE monitor */}
      {monitorProgress && (
        <MonitorProgressModal
          progress={monitorProgress}
          onClose={closeMonitorModal}
          running={monitorRunning}
        />
      )}

      {/* Panel explicativo del proceso (siempre visible) */}
      <ScraperProcessExplainer />

      {/* Modal SSE de progreso del scan manual */}
      {scanProgress && (
        <ScanProgressModal progress={scanProgress} onClose={closeScanModal} scanning={scanning} />
      )}
    </div>
  );
}

// ─── SCAN PROGRESS MODAL ───────────────────────────────────────

function ScanProgressModal({ progress, onClose, scanning }: {
  progress: ScanProgress;
  onClose: () => void;
  scanning: boolean;
}) {
  const elapsed = progress.startedAt
    ? Math.round((Date.now() - new Date(progress.startedAt).getTime()) / 1000)
    : 0;

  const isFinished = progress.finished !== undefined;
  const hasError = progress.error !== undefined;
  const canClose = !scanning || isFinished || hasError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && canClose && onClose()}
    >
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-slate-950 via-violet-950/80 to-slate-950 rounded-2xl shadow-2xl shadow-violet-500/20 border border-violet-500/30 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top gradient accent */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-2xl grid place-items-center text-white shadow-lg shrink-0 ${
              isFinished && !hasError ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30' :
              hasError ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30' :
              'bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-violet-500/30 animate-pulse'
            }`}>
              {isFinished && !hasError ? <CheckCircle2 className="w-6 h-6" /> :
               hasError ? <AlertTriangle className="w-6 h-6" /> :
               <ScrollText className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Scan del Registro Oficial Ecuador
                {!isFinished && !hasError && (
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                )}
              </h2>
              <p className="text-xs text-violet-300/80 mt-0.5">
                {progress.label}
              </p>
            </div>
            {canClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0"
                aria-label="Cerrar"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Big percentage display */}
          <div className="mt-5 flex items-baseline gap-3">
            <span className={`font-mono text-6xl font-black tabular-nums leading-none ${
              isFinished && !hasError ? 'text-emerald-300' :
              hasError ? 'text-rose-300' :
              'text-transparent bg-clip-text bg-gradient-to-br from-violet-300 via-fuchsia-300 to-pink-300'
            }`}>
              {Math.round(progress.pct)}
            </span>
            <span className="text-2xl font-bold text-slate-500">%</span>
            <span className="ml-auto text-xs font-mono text-slate-500 tabular-nums">
              {elapsed}s transcurridos
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative mt-3 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
                isFinished && !hasError ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                hasError ? 'bg-rose-500' :
                'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500'
              }`}
              style={{ width: `${Math.max(2, Math.min(100, progress.pct))}%` }}
            />
            {!isFinished && !hasError && (
              <div
                className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse rounded-full pointer-events-none"
                style={{ left: `${Math.max(0, Math.min(85, progress.pct - 6))}%` }}
              />
            )}
          </div>
        </div>

        {/* Phase checklist */}
        <div className="px-6 pb-3">
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'starting',     label: '🔌 Conectando',           threshold: 5 },
              { id: 'listing-done', label: '🗂️ Listando ediciones',   threshold: 18 },
              { id: 'diff-done',    label: '🔍 Detectando nuevas',    threshold: 28 },
              { id: 'downloading',  label: '⬇️ Descargando PDFs',     threshold: 30 },
              { id: 'analyzing',   label: '🧠 IA analizando',       threshold: 60 },
              { id: 'summary',     label: '✨ Generando resumen',   threshold: 96 },
            ].map((p) => {
              const done = progress.pct >= p.threshold;
              const active = !done && progress.pct >= (p.threshold - 10);
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    done ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30' :
                    active ? 'bg-violet-500/15 text-violet-100 border border-violet-500/30' :
                    'bg-slate-800/40 text-slate-500 border border-slate-700/40'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> :
                   active ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> :
                   <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-600 shrink-0" />}
                  <span className="font-bold truncate">{p.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live feed: publicaciones detectadas */}
        {progress.publicationsLog.length > 0 && (
          <div className="px-6 pb-3">
            <div className="text-[10px] uppercase tracking-wider font-bold text-violet-300/80 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Publicaciones detectadas en vivo ({progress.publicationsLog.length})
            </div>
            <div className="rounded-lg border border-violet-500/20 bg-slate-950/50 max-h-32 overflow-y-auto">
              {progress.publicationsLog.slice().reverse().map((pub, i) => {
                const typeMeta = TYPE_LABEL[pub.type] || { icon: '📄', label: 'Norma', color: 'gray' };
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2.5 py-1.5 border-b border-slate-800/60 last:border-0 hover:bg-violet-500/5"
                  >
                    <span className="text-sm shrink-0">{typeMeta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-violet-100 truncate font-semibold">{pub.title}</div>
                      <div className="text-[9px] text-slate-500">RO {pub.edition}</div>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 bg-${typeMeta.color}-500/20 text-${typeMeta.color}-300`}>
                      {pub.classification}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Final summary */}
        {isFinished && progress.finished && !hasError && (
          <div className="px-6 pb-5">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/40 p-4">
              <div className="text-xs uppercase tracking-wider font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                ✨ Scan completado en {elapsed}s
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-3xl font-black tabular-nums text-emerald-200">
                    {progress.finished.editionsFound}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-300/70 font-bold">
                    Ediciones encontradas en RSS
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black tabular-nums text-emerald-200">
                    {progress.finished.publicationsFound}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-300/70 font-bold">
                    Normas nuevas analizadas con IA
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black tabular-nums text-amber-200">
                    {progress.finished.autoIngested ?? 0}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-amber-300/70 font-bold">
                    Auto-ingestadas al corpus
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black tabular-nums text-violet-200">
                    {progress.finished.autoIngestNotified ?? 0}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-violet-300/70 font-bold">
                    Usuarios notificados
                  </div>
                </div>
              </div>
              {progress.finished.publicationsFound > 0 && (progress.finished.autoIngested ?? 0) < progress.finished.publicationsFound && (
                <div className="mt-3 text-[11px] text-amber-200 leading-relaxed bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                  <strong>{progress.finished.publicationsFound - (progress.finished.autoIngested ?? 0)} publicaciones</strong> quedaron como <code>analyzed</code> sin auto-ingestar.
                  Revísalas en la pestaña <em>Publicaciones detectadas</em> y usa el botón <strong>"Aprobar todas"</strong> si quieres incorporarlas al corpus.
                </div>
              )}
              {progress.finished.errors.length > 0 && (
                <div className="mt-3 text-[11px] text-amber-300 leading-relaxed">
                  ⚠ {progress.finished.errors.length} advertencias durante el scan:
                  <ul className="mt-1 space-y-0.5">
                    {progress.finished.errors.slice(0, 3).map((err, i) => (
                      <li key={i} className="text-amber-200/80 text-[10px]">• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={onClose}
                className="mt-4 w-full px-4 py-2 rounded-lg text-sm font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-lg shadow-emerald-500/30 transition"
              >
                Ver publicaciones detectadas →
              </button>
            </div>
          </div>
        )}

        {/* Error display */}
        {hasError && (
          <div className="px-6 pb-5">
            <div className="rounded-xl bg-rose-500/20 border-2 border-rose-500/40 p-4">
              <div className="text-xs uppercase tracking-wider font-bold text-rose-300 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Error durante el scan
              </div>
              <p className="text-sm text-rose-100">{progress.error}</p>
              <button
                onClick={onClose}
                className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-100 bg-rose-500/30 hover:bg-rose-500/50 transition"
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

// ─── NORM CATALOG VIEW ────────────────────────────────────────────────

function NormCatalogView({
  data, loading, query, setQuery, types, toggleType, onSearch, externalSources,
}: {
  data: NormCatalogResponse | null;
  loading: boolean;
  query: string;
  setQuery: (v: string) => void;
  types: string[];
  toggleType: (key: string) => void;
  onSearch: () => void;
  externalSources: ExternalSource[];
}) {
  // Agrupa items por jerarquía para mostrarlos en secciones
  const grouped = (data?.items || []).reduce<Record<string, NormCatalogItem[]>>((acc, it) => {
    const h = it.legal_hierarchy || 'OTRAS';
    if (!acc[h]) acc[h] = [];
    acc[h].push(it);
    return acc;
  }, {});

  const groupOrder = ['CONSTITUCION', 'CODIGOS_ORGANICOS', 'LEYES_ORGANICAS', 'CODIGOS_ORDINARIOS', 'LEYES_ORDINARIAS'];

  return (
    <div className="space-y-4">
      {/* Header explicativo */}
      <div className="rounded-xl bg-gradient-to-br from-amber-50 via-white to-violet-50 border border-amber-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-violet-600 grid place-items-center shrink-0 shadow-md">
            <Library className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-gray-900">Catálogo de Normas Fundamentales</h3>
            <p className="text-xs text-gray-700 mt-0.5">
              Constitución de la República, Códigos Orgánicos, Leyes Orgánicas y Ordinarias —
              con fecha de publicación en el Registro Oficial.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros + búsqueda */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {NORM_CATALOG_TYPES.map((t) => {
            const active = types.includes(t.key);
            const activeCls: Record<string, string> = {
              amber:  'bg-amber-100 text-amber-800 border-amber-300 shadow-sm',
              violet: 'bg-violet-100 text-violet-800 border-violet-300 shadow-sm',
              rose:   'bg-rose-100 text-rose-800 border-rose-300 shadow-sm',
              sky:    'bg-sky-100 text-sky-800 border-sky-300 shadow-sm',
            };
            return (
              <button
                key={t.key}
                onClick={() => toggleType(t.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition border-2 flex items-center gap-1.5 ${
                  active
                    ? (activeCls[t.color] || activeCls.violet)
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-base">{t.icon}</span>
                {t.label}
                {active && <CheckCircle2 className="w-3 h-3" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nombre — ej: COIP, Código Civil, Constitución, LOSEP…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white flex-1 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
          <button
            onClick={onSearch}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold hover:from-violet-700 hover:to-fuchsia-700 transition flex items-center gap-1.5 shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            Buscar
          </button>
        </div>

        {data && (
          <div className="text-xs text-gray-600 pt-1 border-t border-gray-100">
            <Sparkles className="w-3 h-3 inline mr-1 text-violet-500" />
            <strong>{data.total}</strong> norma(s) encontradas en el corpus interno
            {query && <span> · búsqueda: <span className="font-mono text-violet-700">"{query}"</span></span>}
          </div>
        )}
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-violet-500" />
          Cargando catálogo…
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="space-y-4">
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Library className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-semibold">Sin resultados en el corpus interno</p>
            <p className="text-xs mt-1">
              {query
                ? 'Prueba buscar en las fuentes oficiales del Registro Oficial:'
                : 'Selecciona al menos un tipo normativo o haz una búsqueda.'}
            </p>
          </div>

          {query && externalSources.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ExternalLink className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-bold text-gray-900">Buscar en fuentes externas</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {externalSources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-lg border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition flex items-center justify-between gap-2 group"
                  >
                    <span className="text-xs font-semibold text-gray-700 group-hover:text-violet-800">{s.label}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-violet-600 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {groupOrder.filter((h) => grouped[h]?.length).map((hier) => {
            const meta = HIER_META[hier] || HIER_META.LEYES_ORDINARIAS;
            return (
              <section key={hier}>
                <header className={`flex items-center gap-2 mb-2 pb-2 border-b-2 ${meta.border}`}>
                  <Scale className={`w-4 h-4 ${meta.text}`} />
                  <h3 className={`text-sm font-black ${meta.text}`}>{meta.label}</h3>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
                    {grouped[hier].length}
                  </span>
                </header>
                <div className="space-y-2">
                  {grouped[hier].map((n) => <NormRow key={n.id} norm={n} />)}
                </div>
              </section>
            );
          })}

          {/* Fallback externo siempre visible cuando hay query */}
          {query && externalSources.length > 0 && (
            <div className="bg-amber-50/50 rounded-xl border border-amber-200 p-4 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-bold text-gray-900">¿No encontraste lo que buscabas?</h4>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Verifica en las fuentes oficiales del Registro Oficial Ecuador:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {externalSources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-lg border border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50 transition flex items-center justify-between gap-2 group"
                  >
                    <span className="text-xs font-semibold text-gray-700 group-hover:text-violet-800">{s.label}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-violet-600 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NormRow({ norm }: { norm: NormCatalogItem }) {
  const meta = HIER_META[norm.legal_hierarchy || ''] || HIER_META.LEYES_ORDINARIAS;
  const pubDate = norm.publication_date
    ? new Date(norm.publication_date).toLocaleDateString('es-EC', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : null;
  const reformDate = norm.last_reform_date
    ? new Date(norm.last_reform_date).toLocaleDateString('es-EC', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null;

  return (
    <div className={`rounded-lg border ${meta.border} bg-white p-3 hover:shadow-md transition`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-gray-900 leading-snug">
            {norm.norm_title || norm.title}
          </h4>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px]">
            {pubDate && (
              <span className="inline-flex items-center gap-1 text-gray-700">
                <Calendar className="w-3 h-3" />
                <span><strong>Publicada:</strong> {pubDate}</span>
              </span>
            )}
            {norm.publication_number && (
              <span className="inline-flex items-center gap-1 text-gray-700">
                <Hash className="w-3 h-3" />
                <span><strong>RO Nº</strong> {norm.publication_number}</span>
              </span>
            )}
            {norm.publication_type && norm.publication_type !== 'ORDINARIO' && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${meta.bg} ${meta.text} font-semibold`}>
                {norm.publication_type.replace(/_/g, ' ')}
              </span>
            )}
            {reformDate && (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <Clock className="w-3 h-3" />
                <span>Reforma: {reformDate}</span>
              </span>
            )}
            {norm.category && (
              <span className="inline-flex items-center gap-1 text-gray-500">
                <Tag className="w-3 h-3" />
                {norm.category}
              </span>
            )}
          </div>
        </div>
        {norm.pdf_url && (
          <a
            href={norm.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition"
          >
            <Download className="w-3 h-3" />
            PDF
          </a>
        )}
      </div>
    </div>
  );
}

// ─── ALERTS VIEW ─────────────────────────────────────────────────────

function AlertsView({
  data, loading, statusFilter, setStatusFilter, typeFilter, setTypeFilter,
  onAction, onTriggerMonitor, monitorRunning, onRefresh,
}: {
  data: AlertsResponse | null;
  loading: boolean;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  onAction: (id: string, action: 'acknowledge' | 'dismiss' | 'resolve') => void;
  onTriggerMonitor: () => void;
  monitorRunning: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Header con CTA principal */}
      <div className="rounded-xl bg-gradient-to-br from-rose-50 via-white to-violet-50 border border-rose-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-violet-600 grid place-items-center shrink-0 shadow-md">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-gray-900">Monitor del Registro Oficial Ecuador</h3>
            <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
              Cruza el corpus interno (Constitución, códigos, leyes) contra el RSS oficial
              <code className="px-1 py-0.5 mx-1 bg-gray-100 text-gray-800 rounded text-[10px] font-mono">/feed/</code>
              de registroficial.gob.ec. Detecta nuevas ediciones, posibles reformas,
              leyes nuevas, y documentos desactualizados. Corre automáticamente cada 30 min.
            </p>
          </div>
          <button
            onClick={onTriggerMonitor}
            disabled={monitorRunning}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-violet-600 hover:from-rose-700 hover:to-violet-700 shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {monitorRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {monitorRunning ? 'Chequeando…' : 'Verificar ahora'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Total abiertas"
            value={data.summary.openTotal}
            color="rose"
            highlight={data.summary.openTotal > 0}
          />
          <KpiCard
            icon={<Zap className="w-5 h-5" />}
            label="Alta prioridad"
            value={data.summary.highOpen}
            color="orange"
            highlight={data.summary.highOpen > 0}
          />
          <KpiCard
            icon={<ScrollText className="w-5 h-5" />}
            label="Desactualizados"
            value={data.summary.outdatedOpen}
            color="amber"
          />
          <KpiCard
            icon={<Sparkles className="w-5 h-5" />}
            label="Leyes nuevas"
            value={data.summary.newLawOpen}
            color="violet"
          />
          <KpiCard
            icon={<FileText className="w-5 h-5" />}
            label="Ediciones nuevas"
            value={data.summary.newEditionOpen}
            color="sky"
          />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
        <Filter className="w-4 h-4 text-gray-500" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        >
          <option value="open">Abiertas</option>
          <option value="acknowledged">Reconocidas</option>
          <option value="resolved">Resueltas</option>
          <option value="dismissed">Descartadas</option>
          <option value="">Todas</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        >
          <option value="">Todos los tipos</option>
          <option value="outdated_doc">⚠️ Documento desactualizado</option>
          <option value="potential_reform">🔄 Posible reforma</option>
          <option value="new_law">✨ Ley nueva sin ingestar</option>
          <option value="new_edition">📰 Edición no scrapeada</option>
        </select>
        <button
          onClick={onRefresh}
          className="ml-auto text-xs px-2 py-1 rounded bg-violet-600 text-white font-bold hover:bg-violet-700 inline-flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Refrescar
        </button>
      </div>

      {/* Lista de alertas */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-rose-500" />
          Cargando alertas…
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-emerald-50 rounded-xl border-2 border-dashed border-emerald-200">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-800">Todo en orden — sin alertas pendientes</p>
          <p className="text-xs mt-1 text-emerald-700">
            El monitor no detectó discrepancias entre tu corpus y el sitio oficial del Registro Oficial.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((a) => (
            <AlertCard key={a.id} alert={a} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, color, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'rose' | 'orange' | 'amber' | 'violet' | 'sky';
  highlight?: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
    rose:   { bg: 'bg-rose-50',    text: 'text-rose-900',    border: 'border-rose-200',    iconBg: 'bg-rose-100 text-rose-700' },
    orange: { bg: 'bg-orange-50',  text: 'text-orange-900',  border: 'border-orange-200',  iconBg: 'bg-orange-100 text-orange-700' },
    amber:  { bg: 'bg-amber-50',   text: 'text-amber-900',   border: 'border-amber-200',   iconBg: 'bg-amber-100 text-amber-700' },
    violet: { bg: 'bg-violet-50',  text: 'text-violet-900',  border: 'border-violet-200',  iconBg: 'bg-violet-100 text-violet-700' },
    sky:    { bg: 'bg-sky-50',     text: 'text-sky-900',     border: 'border-sky-200',     iconBg: 'bg-sky-100 text-sky-700' },
  };
  const c = colorMap[color];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-3 ${highlight ? 'ring-2 ring-offset-1 ring-rose-300' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <div className={`w-8 h-8 rounded-lg grid place-items-center ${c.iconBg}`}>{icon}</div>
        <div className={`text-3xl font-black ${c.text}`}>{value}</div>
      </div>
      <div className={`text-xs font-bold ${c.text}`}>{label}</div>
    </div>
  );
}

function AlertCard({ alert, onAction }: {
  alert: NormAlert;
  onAction: (id: string, action: 'acknowledge' | 'dismiss' | 'resolve') => void;
}) {
  const typeMeta = ALERT_TYPE_META[alert.alert_type];
  const sevMeta = SEVERITY_META[alert.severity];

  const localDate = alert.local_publication_date
    ? new Date(alert.local_publication_date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;
  const remoteDate = alert.remote_publication_date
    ? new Date(alert.remote_publication_date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className={`rounded-xl border ${typeMeta.border} ${typeMeta.bg} p-4 hover:shadow-md transition`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl grid place-items-center text-xl shrink-0 bg-white shadow-sm border ${typeMeta.border}`}>
          {typeMeta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h4 className="text-sm font-black text-gray-900 leading-snug">{alert.title}</h4>
            <span className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded ${sevMeta.bg} ${sevMeta.text}`}>
              {sevMeta.label}
            </span>
          </div>

          <p className={`text-xs ${typeMeta.text} leading-relaxed mb-2`}>{alert.description}</p>

          {/* Diff de fechas */}
          {(localDate || remoteDate) && (
            <div className="flex flex-wrap items-center gap-3 mb-2 p-2 bg-white/60 rounded-lg border border-gray-100">
              {localDate && (
                <div className="text-[11px]">
                  <span className="text-gray-500 font-semibold">Local:</span>{' '}
                  <span className="font-mono font-bold text-gray-800">{localDate}</span>
                </div>
              )}
              {remoteDate && (
                <div className="text-[11px]">
                  <ChevronRight className="w-3 h-3 inline text-rose-500" />
                  <span className="text-rose-700 font-semibold">Remoto (RO):</span>{' '}
                  <span className="font-mono font-bold text-rose-800">{remoteDate}</span>
                </div>
              )}
              {alert.remote_edition_number && (
                <div className="text-[11px]">
                  <Hash className="w-3 h-3 inline text-gray-500" />{' '}
                  <span className="font-mono font-bold text-gray-700">RO Nº {alert.remote_edition_number}</span>
                </div>
              )}
              {alert.diff_data?.similarityScore !== undefined && (
                <div className="text-[11px]">
                  <span className="text-gray-500">Similitud:</span>{' '}
                  <span className="font-mono font-bold text-violet-700">
                    {(alert.diff_data.similarityScore * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Doc local enlazado */}
          {alert.legal_doc_title && (
            <div className="text-[11px] text-gray-600 mb-1">
              <Tag className="w-3 h-3 inline mr-1" />
              <strong>Norma local:</strong> {alert.legal_doc_title}
              {alert.legal_doc_hierarchy && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-white border border-gray-200 text-gray-700">
                  {alert.legal_doc_hierarchy.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          )}

          {/* AI summary (cuando viene de registry_publications) */}
          {alert.publication_ai_summary && (
            <div className="mt-2 p-2 bg-violet-50/70 border-l-2 border-violet-400 rounded text-[11px] text-gray-800">
              <Brain className="w-3 h-3 inline mr-1 text-violet-600" />
              <span className="font-semibold">Análisis IA:</span> {alert.publication_ai_summary}
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {alert.remote_source_url && (
              <a
                href={alert.remote_source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              >
                <ExternalLink className="w-3 h-3" />
                Ver en RO
              </a>
            )}
            {(alert.remote_pdf_url || alert.publication_pdf_url) && (
              <a
                href={alert.remote_pdf_url || alert.publication_pdf_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition"
              >
                <Download className="w-3 h-3" />
                PDF
              </a>
            )}
            {alert.status === 'open' && (
              <>
                <button
                  onClick={() => onAction(alert.id, 'acknowledge')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
                >
                  <Activity className="w-3 h-3" />
                  Reconocer
                </button>
                <button
                  onClick={() => onAction(alert.id, 'resolve')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Resolver
                </button>
                <button
                  onClick={() => onAction(alert.id, 'dismiss')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition"
                >
                  <XCircle className="w-3 h-3" />
                  Descartar
                </button>
              </>
            )}
            {alert.status !== 'open' && (
              <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                alert.status === 'resolved' ? 'text-emerald-700' :
                alert.status === 'dismissed' ? 'text-gray-500' : 'text-amber-700'
              }`}>
                <CheckCircle2 className="w-3 h-3" />
                {alert.status === 'resolved' ? 'Resuelta' :
                 alert.status === 'dismissed' ? 'Descartada' : 'Reconocida'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MONITOR PROGRESS MODAL ──────────────────────────────────────────

function MonitorProgressModal({ progress, onClose, running }: {
  progress: MonitorProgress;
  onClose: () => void;
  running: boolean;
}) {
  const isFinished = progress.finished === true;
  const hasError = progress.error !== undefined;
  const canClose = !running || isFinished || hasError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && canClose && onClose()}
    >
      <div className="relative w-full max-w-xl bg-gradient-to-br from-slate-950 via-rose-950/80 to-slate-950 rounded-2xl shadow-2xl shadow-rose-500/20 border border-rose-500/30 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500" />

        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-2xl grid place-items-center text-white shadow-lg shrink-0 ${
              isFinished && !hasError ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30' :
              hasError ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30' :
              'bg-gradient-to-br from-rose-500 to-violet-600 shadow-rose-500/30 animate-pulse'
            }`}>
              {isFinished && !hasError ? <CheckCircle2 className="w-6 h-6" /> :
               hasError ? <AlertTriangle className="w-6 h-6" /> :
               <Zap className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Monitor del Registro Oficial
                {!isFinished && !hasError && <Loader2 className="w-4 h-4 animate-spin text-rose-400" />}
              </h2>
              <p className="text-xs text-rose-300/80 mt-0.5">{progress.label}</p>
            </div>
            {canClose && (
              <button onClick={onClose} className="shrink-0 text-rose-300/60 hover:text-white transition">
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-5xl font-black bg-gradient-to-r from-rose-300 to-violet-300 bg-clip-text text-transparent leading-none">
                {Math.round(progress.pct)}
              </span>
              <span className="text-2xl font-black text-rose-300/60">%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500 transition-all duration-500 ease-out"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>

          {/* Resultado final */}
          {isFinished && progress.result && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-xs font-bold text-emerald-300 mb-2">Resumen del chequeo</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-emerald-100">
                  <span className="opacity-70">RSS procesados:</span>{' '}
                  <strong className="text-white">{progress.result.feedItemsProcessed}</strong>
                </div>
                <div className="text-emerald-100">
                  <span className="opacity-70">Alertas creadas:</span>{' '}
                  <strong className="text-white">{progress.result.alertsCreated}</strong>
                </div>
                <div className="text-emerald-100">
                  <span className="opacity-70">Ediciones nuevas:</span>{' '}
                  <strong className="text-white">{progress.result.newEditionsDetected}</strong>
                </div>
                <div className="text-emerald-100">
                  <span className="opacity-70">Reformas detectadas:</span>{' '}
                  <strong className="text-white">{progress.result.potentialReformsDetected}</strong>
                </div>
                <div className="text-emerald-100">
                  <span className="opacity-70">Leyes nuevas:</span>{' '}
                  <strong className="text-white">{progress.result.newLawsDetected}</strong>
                </div>
                <div className="text-emerald-100">
                  <span className="opacity-70">Docs desactualizados:</span>{' '}
                  <strong className="text-white">{progress.result.outdatedDocsDetected}</strong>
                </div>
                <div className="col-span-2 text-emerald-100/70 text-[10px] mt-1">
                  Duración: {(progress.result.durationMs / 1000).toFixed(1)}s
                </div>
              </div>
            </div>
          )}

          {hasError && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              {progress.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
