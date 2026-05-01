'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface AdminPayment {
  id: string;
  created_at: string;
  paid_at: string | null;
  amount_cents: number;
  amount_usd_cents: number | null;
  currency: string;
  provider: string;
  type: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'disputed';
  proof_url: string | null;
  failure_reason: string | null;
  metadata: { reference_code?: string; plan_code?: string; billing_cycle?: string };
  app_slug: string;
  app_name: string;
  user_email: string;
  user_full_name: string | null;
  plan_name: string | null;
}

interface PayhubStats {
  pending_count: number;
  paid_count: number;
  failed_count: number;
  gross_usd_cents: number;
  pending_usd_cents: number;
  last7d_paid_count: number;
  mrr_usd_cents: number;
  arr_usd_cents: number;
  active_subs: number;
}

const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800 border-yellow-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  paid:       'bg-emerald-100 text-emerald-800 border-emerald-200',
  failed:     'bg-rose-100 text-rose-800 border-rose-200',
  refunded:   'bg-gray-100 text-gray-800 border-gray-200',
  disputed:   'bg-purple-100 text-purple-800 border-purple-200',
};

export default function AdminPayhubPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<PayhubStats | null>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<AdminPayment | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'super_admin'))) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        api.get('/admin/payhub/stats'),
        api.get(`/admin/payhub/payments?status=${statusFilter || ''}&limit=100`),
      ]);
      setStats(statsRes.data?.stats || null);
      setPayments(listRes.data?.payments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function approve(p: AdminPayment) {
    if (!confirm(`Aprobar pago ${p.metadata.reference_code || p.id.slice(0, 8)} por ${formatPrice(p.amount_cents, p.currency)}?`)) return;
    setActioning(p.id);
    try {
      await api.post(`/admin/payhub/payments/${p.id}/approve`, {});
      await refresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error aprobando');
    } finally {
      setActioning(null);
    }
  }

  async function reject() {
    if (!rejectModal) return;
    if (!rejectReason.trim()) { alert('Indicá un motivo'); return; }
    setActioning(rejectModal.id);
    try {
      await api.post(`/admin/payhub/payments/${rejectModal.id}/reject`, { reason: rejectReason });
      setRejectModal(null);
      setRejectReason('');
      await refresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error rechazando');
    } finally {
      setActioning(null);
    }
  }

  function formatPrice(cents: number, currency: string) {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: currency || 'USD' }).format(cents / 100);
  }
  function fmtDate(s: string | null) {
    if (!s) return '—';
    return new Date(s).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
  }

  if (authLoading || (user && user.role !== 'admin' && user.role !== 'super_admin')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">💳 Payments Hub · Admin</h1>
            <p className="text-sm text-gray-500 mt-1">Aprobá o rechazá pagos manuales (transferencia bancaria · efectivo)</p>
          </div>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            🔄 Refrescar
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard label="Pendientes" value={String(stats.pending_count)} color="amber" hint={formatPrice(stats.pending_usd_cents, 'USD')} />
            <StatCard label="Pagados (total)" value={String(stats.paid_count)} color="emerald" hint={formatPrice(stats.gross_usd_cents, 'USD')} />
            <StatCard label="Pagos · 7d" value={String(stats.last7d_paid_count)} color="indigo" />
            <StatCard label="Rechazados" value={String(stats.failed_count)} color="rose" />
            <StatCard
              label="MRR"
              value={formatPrice(stats.mrr_usd_cents || 0, 'USD')}
              color="purple"
              hint={`${stats.active_subs} subs · ARR ${formatPrice(stats.arr_usd_cents || 0, 'USD')}`}
            />
          </div>
        )}

        {/* Filtros */}
        <div className="mb-4 flex gap-2 flex-wrap">
          {['pending', 'processing', 'paid', 'failed', ''].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s ? s : 'Todos'}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Cargando…</div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Sin pagos en este filtro.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                    <th className="px-4 py-3 font-semibold">Ref.</th>
                    <th className="px-4 py-3 font-semibold">Usuario</th>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold text-right">Monto</th>
                    <th className="px-4 py-3 font-semibold">Proveedor</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Comprobante</th>
                    <th className="px-4 py-3 font-semibold">Creado</th>
                    <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{p.metadata.reference_code || p.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{p.user_full_name || '—'}</div>
                        <div className="text-xs text-gray-500">{p.user_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{p.plan_name || p.metadata.plan_code || p.type}</div>
                        <div className="text-xs text-gray-500 capitalize">{p.metadata.billing_cycle || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-gray-900">{formatPrice(p.amount_cents, p.currency)}</div>
                        {p.amount_usd_cents != null && p.currency !== 'USD' && (
                          <div className="text-xs text-gray-500">≈ {formatPrice(p.amount_usd_cents, 'USD')}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize text-xs">{p.provider.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded border ${STATUS_STYLES[p.status]}`}>
                          {p.status}
                        </span>
                        {p.failure_reason && (
                          <div className="text-xs text-rose-600 mt-1 max-w-xs truncate" title={p.failure_reason}>
                            {p.failure_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.proof_url ? (
                          <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs">
                            Ver comprobante ↗
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">Sin subir</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(p.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        {(p.status === 'pending' || p.status === 'processing') && (
                          <div className="flex gap-2 justify-end">
                            <button
                              disabled={actioning === p.id}
                              onClick={() => approve(p)}
                              className="px-3 py-1 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {actioning === p.id ? '…' : '✓ Aprobar'}
                            </button>
                            <button
                              disabled={actioning === p.id}
                              onClick={() => setRejectModal(p)}
                              className="px-3 py-1 text-xs font-medium bg-white border border-rose-300 text-rose-700 rounded hover:bg-rose-50"
                            >
                              ✗ Rechazar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de rechazo */}
      {rejectModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !actioning && setRejectModal(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Rechazar pago</h3>
            <p className="text-sm text-gray-600 mb-4">
              <code className="text-xs bg-gray-100 px-1 rounded">{rejectModal.metadata.reference_code || rejectModal.id.slice(0, 8)}</code>
              {' · '}{rejectModal.user_email}
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (lo verá el usuario)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Ej: El comprobante muestra un monto distinto al esperado…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRejectModal(null)}
                disabled={!!actioning}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={reject}
                disabled={!!actioning || !rejectReason.trim()}
                className="px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
              >
                {actioning ? 'Rechazando…' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, hint, color }: { label: string; value: string; hint?: string; color: 'amber' | 'emerald' | 'indigo' | 'rose' | 'purple' }) {
  const colors: Record<string, string> = {
    amber:   'border-amber-200 bg-amber-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    indigo:  'border-indigo-200 bg-indigo-50',
    rose:    'border-rose-200 bg-rose-50',
    purple:  'border-purple-200 bg-purple-50',
  };
  const text: Record<string, string> = {
    amber: 'text-amber-700', emerald: 'text-emerald-700',
    indigo: 'text-indigo-700', rose: 'text-rose-700', purple: 'text-purple-700',
  };
  return (
    <div className={`border rounded-lg p-4 ${colors[color]}`}>
      <div className={`text-xs uppercase tracking-wider font-bold ${text[color]}`}>{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-0.5">{hint}</div>}
    </div>
  );
}
