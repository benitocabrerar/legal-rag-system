'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AuthEvent {
  id: string;
  createdAt: string;
  eventType: string;
  provider: string | null;
  success: boolean;
  email: string | null;
  userId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  ip: string | null;
  userAgent: string | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
}

interface SummaryRow {
  event_type: string;
  success: boolean;
  last_24h: number;
  last_7d: number;
  total: number;
}

const EVENT_LABELS: Record<string, string> = {
  signup_attempt: 'Signup intento',
  signup_success: 'Signup OK',
  signup_error: 'Signup ERROR',
  login_attempt: 'Login intento',
  login_success: 'Login OK',
  login_error: 'Login ERROR',
  oauth_init: 'OAuth init',
  oauth_callback: 'OAuth OK',
  oauth_error: 'OAuth ERROR',
  password_reset_request: 'Reset solicitado',
  password_reset_success: 'Reset OK',
  password_reset_error: 'Reset ERROR',
  magic_link_request: 'Magic link solicitado',
  magic_link_success: 'Magic link OK',
  session_start: 'Sesión inicia',
  session_end: 'Sesión termina',
  unknown: 'Otro',
};

function colorFor(eventType: string, success: boolean) {
  if (eventType.endsWith('_error') || !success && eventType.endsWith('_attempt')) return 'bg-red-100 text-red-800 border-red-200';
  if (success) return 'bg-green-100 text-green-800 border-green-200';
  if (eventType.endsWith('_attempt') || eventType === 'oauth_init') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

export default function AuthEventsPage() {
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterSuccess, setFilterSuccess] = useState<'' | 'true' | 'false'>('');
  const [filterEmail, setFilterEmail] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selected, setSelected] = useState<AuthEvent | null>(null);

  const load = async () => {
    try {
      const params: Record<string, string> = { limit: '100' };
      if (filterType) params.eventType = filterType;
      if (filterSuccess) params.success = filterSuccess;
      if (filterEmail) params.email = filterEmail;
      const [eventsRes, summaryRes] = await Promise.all([
        api.get('/admin/auth-events', { params }),
        api.get('/admin/auth-events/summary'),
      ]);
      setEvents(eventsRes.data.events || []);
      setSummary(summaryRes.data.summary || []);
    } catch (err) {
      console.error('load auth-events failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterSuccess, filterEmail]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, filterType, filterSuccess, filterEmail]);

  const totalErrors24h = summary
    .filter((s) => !s.success && s.event_type.endsWith('_error'))
    .reduce((acc, s) => acc + s.last_24h, 0);
  const totalSuccess24h = summary
    .filter((s) => s.success)
    .reduce((acc, s) => acc + s.last_24h, 0);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Auth Events</h1>
        <p className="text-sm text-gray-600 mt-1">
          Registro detallado de signup, login, OAuth y errores. Útil para diagnosticar problemas con nuevos usuarios.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Eventos exitosos · 24h</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{totalSuccess24h}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Errores · 24h</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{totalErrors24h}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Total registrado</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{summary.reduce((a, s) => a + s.total, 0)}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de evento</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {Object.entries(EVENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Éxito</label>
          <select
            value={filterSuccess}
            onChange={(e) => setFilterSuccess(e.target.value as any)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            <option value="true">Solo éxitos</option>
            <option value="false">Solo errores</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Email contiene</label>
          <input
            type="text"
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
            placeholder="ejemplo@gmail.com"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-56"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 ml-auto">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          Auto-refresh (15s)
        </label>
        <button
          onClick={load}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm font-semibold hover:bg-indigo-700"
        >
          Refrescar
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cuándo</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Evento</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Provider</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Error</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500 text-sm">Cargando…</td></tr>
            )}
            {!loading && events.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500 text-sm">Sin eventos para los filtros actuales.</td></tr>
            )}
            {events.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600 font-mono">
                  {new Date(e.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded border ${colorFor(e.eventType, e.success)}`}>
                    {EVENT_LABELS[e.eventType] || e.eventType}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{e.provider || '—'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{e.email || '—'}</td>
                <td className="px-4 py-2 text-xs text-red-700 max-w-md truncate" title={e.errorMessage || ''}>
                  {e.errorCode ? <span className="font-mono">{e.errorCode}</span> : null}
                  {e.errorCode && e.errorMessage ? ' — ' : ''}
                  {e.errorMessage || (e.errorCode ? '' : '—')}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 font-mono">{e.ip || '—'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-right">
                  <button
                    onClick={() => setSelected(e)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg">Detalle del evento</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {[
                ['ID', selected.id],
                ['Cuándo', new Date(selected.createdAt).toLocaleString()],
                ['Tipo', EVENT_LABELS[selected.eventType] || selected.eventType],
                ['Provider', selected.provider],
                ['Éxito', selected.success ? 'Sí' : 'No'],
                ['Email', selected.email],
                ['User ID', selected.userId],
                ['Error code', selected.errorCode],
                ['Error message', selected.errorMessage],
                ['IP', selected.ip],
                ['User agent', selected.userAgent],
                ['URL', selected.url],
              ].map(([k, v]) => (
                <div key={k as string} className="grid grid-cols-3 gap-2">
                  <div className="text-xs text-gray-500 uppercase font-semibold">{k}</div>
                  <div className="col-span-2 text-gray-900 break-all font-mono text-xs">{(v as string) || '—'}</div>
                </div>
              ))}
              {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-xs text-gray-500 uppercase font-semibold">Metadata</div>
                  <pre className="col-span-2 text-xs bg-gray-50 p-2 rounded border border-gray-200 overflow-auto">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
