'use client';

/**
 * CaseActivityDrawer — Timeline auditable del caso.
 *
 * Lista todos los eventos del audit_log relacionados con el caso, agrupados
 * por día, con icono por tipo, usuario, fecha exacta y metadata expandible.
 * Útil para que el equipo del estudio pueda auditar qué pasó cuándo.
 *
 * Endpoint: GET /cases/:id/activity
 */

import { useEffect, useMemo, useState } from 'react';
import {
  X, History, RefreshCw, FileText, Trash2, Upload, FileSignature, Brain,
  ScanSearch, MessageCircle, Pencil, FilePlus, AlertCircle, ChevronDown,
  Filter,
} from 'lucide-react';
import { getAuthToken } from '@/lib/get-auth-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Action =
  | 'CASE_CREATED' | 'CASE_UPDATED' | 'CASE_DELETED'
  | 'DOCUMENT_UPLOADED' | 'DOCUMENT_DELETED' | 'DOCUMENT_VIEWED' | 'DOCUMENT_DOWNLOADED'
  | 'DOC_GEN_REQUESTED' | 'DOC_GEN_COMPLETED' | 'DOC_GEN_SAVED'
  | 'DEEP_ANALYSIS_REQUESTED' | 'DEEP_ANALYSIS_COMPLETED'
  | 'BRAIN_REFRESHED' | 'CHAT_QUERY';

interface ActivityEvent {
  id: string;
  action: Action;
  entity: string;
  entityId: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  changes: Record<string, any>;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

const ACTION_META: Record<Action, { label: string; Icon: React.ComponentType<{ className?: string }>; color: string; ring: string }> = {
  CASE_CREATED:            { label: 'Caso creado',                   Icon: FilePlus,        color: 'text-emerald-700 bg-emerald-100',  ring: 'ring-emerald-200' },
  CASE_UPDATED:            { label: 'Caso editado',                  Icon: Pencil,          color: 'text-blue-700 bg-blue-100',         ring: 'ring-blue-200' },
  CASE_DELETED:            { label: 'Caso eliminado',                Icon: Trash2,          color: 'text-red-700 bg-red-100',           ring: 'ring-red-200' },
  DOCUMENT_UPLOADED:       { label: 'Documento subido',              Icon: Upload,          color: 'text-indigo-700 bg-indigo-100',     ring: 'ring-indigo-200' },
  DOCUMENT_DELETED:        { label: 'Documento eliminado',           Icon: Trash2,          color: 'text-red-700 bg-red-100',           ring: 'ring-red-200' },
  DOCUMENT_VIEWED:         { label: 'Documento visualizado',         Icon: FileText,        color: 'text-gray-600 bg-gray-100',         ring: 'ring-gray-200' },
  DOCUMENT_DOWNLOADED:     { label: 'Documento descargado',          Icon: FileText,        color: 'text-gray-600 bg-gray-100',         ring: 'ring-gray-200' },
  DOC_GEN_REQUESTED:       { label: 'Documento legal solicitado',    Icon: FileSignature,   color: 'text-purple-700 bg-purple-100',     ring: 'ring-purple-200' },
  DOC_GEN_COMPLETED:       { label: 'Documento legal generado',      Icon: FileSignature,   color: 'text-purple-700 bg-purple-100',     ring: 'ring-purple-200' },
  DOC_GEN_SAVED:           { label: 'Documento legal guardado',      Icon: FileSignature,   color: 'text-purple-700 bg-purple-100',     ring: 'ring-purple-200' },
  DEEP_ANALYSIS_REQUESTED: { label: 'Análisis IA solicitado',        Icon: ScanSearch,      color: 'text-fuchsia-700 bg-fuchsia-100',   ring: 'ring-fuchsia-200' },
  DEEP_ANALYSIS_COMPLETED: { label: 'Análisis IA completado',        Icon: ScanSearch,      color: 'text-fuchsia-700 bg-fuchsia-100',   ring: 'ring-fuchsia-200' },
  BRAIN_REFRESHED:         { label: 'Cerebro del caso refrescado',   Icon: Brain,           color: 'text-amber-700 bg-amber-100',       ring: 'ring-amber-200' },
  CHAT_QUERY:              { label: 'Consulta al asistente',         Icon: MessageCircle,   color: 'text-cyan-700 bg-cyan-100',         ring: 'ring-cyan-200' },
};

interface Props {
  caseId: string;
  open: boolean;
  onClose: () => void;
}

export default function CaseActivityDrawer({ caseId, open, onClose }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<Action | 'ALL'>('ALL');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchActivity = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const r = await fetch(`${API_URL}/api/v1/cases/${caseId}/activity?limit=200`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar la actividad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, caseId]);

  const filtered = useMemo(
    () => filterAction === 'ALL' ? events : events.filter((e) => e.action === filterAction),
    [events, filterAction],
  );

  // Agrupar por día
  const grouped = useMemo(() => {
    const m = new Map<string, ActivityEvent[]>();
    for (const ev of filtered) {
      const day = new Date(ev.createdAt).toISOString().slice(0, 10);
      const arr = m.get(day) || [];
      arr.push(ev);
      m.set(day, arr);
    }
    return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full sm:max-w-xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="relative px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-100">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white transition"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 pr-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 grid place-items-center text-white">
              <History className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-gray-900">Actividad del caso</h2>
              <p className="text-xs text-gray-600">Auditoría cronológica · {events.length} eventos</p>
            </div>
            <button
              onClick={fetchActivity}
              disabled={loading}
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-white transition disabled:opacity-50"
              title="Refrescar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="px-5 py-2 border-b border-gray-100 bg-white flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value as Action | 'ALL')}
            className="flex-1 text-xs px-2 py-1.5 rounded-md border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="ALL">Todos los eventos</option>
            {Object.entries(ACTION_META).map(([k, m]) => (
              <option key={k} value={k}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 bg-gray-50/50">
          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-900">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              {error}
            </div>
          )}

          {loading && events.length === 0 && (
            <div className="text-center py-10 text-sm text-gray-500">Cargando actividad…</div>
          )}

          {!loading && filtered.length === 0 && !error && (
            <div className="text-center py-10 text-sm text-gray-500">
              {filterAction === 'ALL' ? 'Sin actividad registrada todavía.' : 'No hay eventos de este tipo.'}
            </div>
          )}

          <div className="space-y-5">
            {grouped.map(([day, list]) => (
              <div key={day}>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  {formatDayHeader(day)}
                </div>
                <div className="space-y-2">
                  {list.map((ev) => {
                    const meta = ACTION_META[ev.action] ?? { label: ev.action, Icon: FileText, color: 'text-gray-600 bg-gray-100', ring: 'ring-gray-200' };
                    const isOpen = !!expanded[ev.id];
                    const hasDetail = Object.keys(ev.changes || {}).filter((k) => k !== 'ip' && k !== 'userAgent').length > 0;
                    return (
                      <div
                        key={ev.id}
                        className={`rounded-xl bg-white border border-gray-100 hover:shadow-sm transition ${!ev.success ? 'border-red-200' : ''}`}
                      >
                        <button
                          onClick={() => hasDetail && setExpanded((prev) => ({ ...prev, [ev.id]: !prev[ev.id] }))}
                          className={`w-full px-3 py-2.5 flex items-start gap-3 text-left ${hasDetail ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
                        >
                          <div className={`w-8 h-8 rounded-lg grid place-items-center ${meta.color} ring-1 ${meta.ring} flex-shrink-0`}>
                            <meta.Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900">{meta.label}</span>
                              {!ev.success && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                  FALLÓ
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{formatTime(ev.createdAt)}</span>
                              {(ev.userName || ev.userEmail) && (
                                <>
                                  <span>·</span>
                                  <span className="font-medium text-gray-700">{ev.userName || ev.userEmail}</span>
                                </>
                              )}
                              {ev.changes?.title && <><span>·</span><span className="font-mono text-[11px] truncate max-w-[180px]">{String(ev.changes.title)}</span></>}
                            </div>
                            {ev.errorMessage && (
                              <div className="text-xs text-red-700 mt-1">{ev.errorMessage}</div>
                            )}
                          </div>
                          {hasDetail && (
                            <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          )}
                        </button>
                        {hasDetail && isOpen && (
                          <div className="px-3 pb-3 pt-1 border-t border-gray-50">
                            <pre className="text-[11px] font-mono bg-gray-50 rounded p-2 overflow-x-auto text-gray-700 max-h-40 overflow-y-auto">{JSON.stringify(stripMeta(ev.changes), null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function stripMeta(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj || {})) {
    if (k === 'ip' || k === 'userAgent') continue;
    out[k] = obj[k];
  }
  return out;
}

function formatDayHeader(day: string): string {
  const today = new Date();
  const date = new Date(day + 'T00:00:00');
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
}
