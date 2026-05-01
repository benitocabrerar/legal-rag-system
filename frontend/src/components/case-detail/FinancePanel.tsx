'use client';

/**
 * Panel de Finanzas del caso.
 *
 * Bloques:
 *  - Dashboard (estado de cuenta consolidado)
 *  - Acuerdo de honorarios (crear/editar)
 *  - Hitos de pago (calendario)
 *  - Pagos recibidos (historial)
 *  - Modal upload comprobante con extracción IA
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  DollarSign, Sparkles, Plus, Pencil, Trash2, X, Check,
  ChevronDown, ChevronUp, Save, RefreshCw, Upload, FileText,
  Calendar, AlertTriangle, CheckCircle2, Clock, TrendingUp,
} from 'lucide-react';

interface Agreement {
  totalAmount?: number;
  currency?: string;
  paymentType?: string;
  hourlyRate?: number;
  contingencyPct?: number;
  retainerAmount?: number;
  initialPayment?: number;
  paymentTerms?: string;
  includes?: string;
  excludes?: string;
  signedAt?: string;
  status?: string;
  notes?: string;
}

interface Milestone {
  id: string;
  label: string;
  description?: string;
  amount: number;
  currency?: string;
  dueDate?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'WAIVED';
  paidAmount?: number;
  paidAt?: string;
  sortOrder?: number;
  notes?: string;
}

interface Payment {
  id: string;
  milestoneId?: string | null;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  paymentDate: string;
  bankName?: string;
  referenceNumber?: string;
  payerName?: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'REFUNDED';
  proofDocId?: string;
  notes?: string;
}

interface Summary {
  currency: string;
  totalAgreed: number;
  totalPaid: number;
  totalPending: number;
  balance: number;
  progress: number;
  milestonesCount: number;
  paidMilestones: number;
  overdueMilestones: number;
  paymentsCount: number;
  nextDue: { id: string; label: string; amount: number; dueDate: string; status: string } | null;
  agreement: Agreement | null;
  milestones: Milestone[];
  payments: Payment[];
}

interface Props {
  caseId: string;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  FIXED: '💰 Honorarios fijos',
  HOURLY: '⏱️ Por hora',
  MIXED: '🔀 Mixto (fijo + horas)',
  CONTINGENCY: '📈 Contingencia (% en éxito)',
  RETAINER: '🔁 Anticipo mensual',
};

const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  OVERDUE: 'bg-red-100 text-red-800 border-red-300',
  PARTIAL: 'bg-blue-100 text-blue-800 border-blue-300',
  WAIVED: 'bg-gray-100 text-gray-600 border-gray-300',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
  REFUNDED: 'bg-purple-100 text-purple-800 border-purple-300',
};

const STATUS_LABELS: Record<string, string> = {
  PAID: 'Pagado',
  PENDING: 'Pendiente',
  OVERDUE: 'Vencido',
  PARTIAL: 'Parcial',
  WAIVED: 'Condonado',
  CONFIRMED: 'Confirmado',
  REJECTED: 'Rechazado',
  REFUNDED: 'Reembolsado',
};

const fmt = (n: number, curr: string = 'USD') =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: curr, minimumFractionDigits: 2 }).format(Number(n) || 0);

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function FinancePanel({ caseId }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingAgreement, setEditingAgreement] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Partial<Milestone> | null>(null);
  const [editingPayment, setEditingPayment] = useState<Partial<Payment> | null>(null);
  const [showProofUpload, setShowProofUpload] = useState(false);
  const [showAgreementForm, setShowAgreementForm] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/cases/${caseId}/finance/summary`);
      setSummary(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !summary) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 text-sm text-gray-500">
        Cargando finanzas...
      </div>
    );
  }

  const currency = summary.currency || 'USD';

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-gray-200"
      >
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-gray-900">Finanzas del caso</h2>
          {summary.totalAgreed > 0 && (
            <>
              <span className="text-xs text-gray-500">·</span>
              <span className="text-xs font-mono text-gray-700">
                {fmt(summary.totalPaid, currency)} / {fmt(summary.totalAgreed, currency)}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                {summary.progress}%
              </span>
            </>
          )}
          {summary.overdueMilestones > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
              {summary.overdueMilestones} vencido{summary.overdueMilestones !== 1 && 's'}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {!expanded ? null : (
        <div className="p-6 space-y-6">
          {/* DASHBOARD KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Total acordado" value={fmt(summary.totalAgreed, currency)} icon={<TrendingUp className="w-4 h-4 text-emerald-600" />} />
            <Stat label="Pagado" value={fmt(summary.totalPaid, currency)} valueClass="text-emerald-700" icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} />
            <Stat label="Pendiente" value={fmt(summary.totalPending, currency)} valueClass="text-amber-700" icon={<Clock className="w-4 h-4 text-amber-600" />} />
            <Stat label="Saldo" value={fmt(summary.balance, currency)} valueClass={summary.balance > 0 ? 'text-red-700' : 'text-emerald-700'} icon={<DollarSign className="w-4 h-4" />} />
          </div>

          {/* Progress bar */}
          {summary.totalAgreed > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progreso de cobro</span>
                <span className="font-semibold">{summary.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-500"
                  style={{ width: `${summary.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Próximo pago */}
          {summary.nextDue && (
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              summary.nextDue.status === 'OVERDUE'
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              {summary.nextDue.status === 'OVERDUE' ? (
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              ) : (
                <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {summary.nextDue.status === 'OVERDUE' ? 'Pago vencido' : 'Próximo pago'}
                </p>
                <p className="text-sm font-semibold">
                  {summary.nextDue.label} · <span className="font-mono">{fmt(summary.nextDue.amount, currency)}</span>
                  {summary.nextDue.dueDate && <> · vence <strong>{fmtDate(summary.nextDue.dueDate)}</strong></>}
                </p>
              </div>
            </div>
          )}

          {/* ACUERDO DE HONORARIOS */}
          <section className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                💼 Acuerdo de honorarios
              </h3>
              <button
                onClick={() => setShowAgreementForm(true)}
                className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700 inline-flex items-center gap-1"
              >
                {summary.agreement ? <><Pencil className="w-3 h-3" /> Editar</> : <><Plus className="w-3 h-3" /> Crear acuerdo</>}
              </button>
            </div>
            {summary.agreement ? (
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <DataRow label="Tipo" value={PAYMENT_TYPE_LABELS[summary.agreement.paymentType || ''] || summary.agreement.paymentType} />
                <DataRow label="Total acordado" value={summary.agreement.totalAmount ? fmt(summary.agreement.totalAmount, currency) : '—'} />
                {summary.agreement.initialPayment ? <DataRow label="Pago inicial" value={fmt(summary.agreement.initialPayment, currency)} /> : null}
                {summary.agreement.hourlyRate ? <DataRow label="Tarifa por hora" value={fmt(summary.agreement.hourlyRate, currency)} /> : null}
                {summary.agreement.contingencyPct ? <DataRow label="Contingencia" value={`${summary.agreement.contingencyPct}%`} /> : null}
                {summary.agreement.retainerAmount ? <DataRow label="Iguala mensual" value={fmt(summary.agreement.retainerAmount, currency)} /> : null}
                <DataRow label="Firmado" value={fmtDate(summary.agreement.signedAt)} />
                <DataRow label="Estado" value={summary.agreement.status} />
                {summary.agreement.paymentTerms && (
                  <div className="sm:col-span-2 text-xs text-gray-600">
                    <strong className="text-gray-800">Condiciones:</strong> {summary.agreement.paymentTerms}
                  </div>
                )}
                {summary.agreement.includes && (
                  <div className="sm:col-span-2 text-xs text-gray-600">
                    <strong className="text-emerald-700">Incluye:</strong> {summary.agreement.includes}
                  </div>
                )}
                {summary.agreement.excludes && (
                  <div className="sm:col-span-2 text-xs text-gray-600">
                    <strong className="text-red-700">No incluye:</strong> {summary.agreement.excludes}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Sin acuerdo registrado. Define el tipo de honorarios y las condiciones de pago.</p>
            )}
          </section>

          {/* HITOS DE PAGO */}
          <section className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                📅 Hitos de pago ({summary.milestones.length})
              </h3>
              <button
                onClick={() => setEditingMilestone({ amount: 0, currency, status: 'PENDING' })}
                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Agregar hito
              </button>
            </div>
            {summary.milestones.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                Sin hitos. Configura el calendario de pagos esperados (ej: anticipo, audiencia, sentencia).
              </p>
            ) : (
              <div className="space-y-2">
                {summary.milestones.map((m) => (
                  <div key={m.id} className="border border-gray-200 rounded-lg p-3 flex items-start justify-between gap-3 hover:border-blue-300 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-900">{m.label}</p>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[m.status]}`}>
                          {STATUS_LABELS[m.status] || m.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 flex flex-wrap gap-3 mt-0.5">
                        <span className="font-mono font-semibold text-gray-900">{fmt(m.amount, m.currency || currency)}</span>
                        {m.dueDate && <span>📆 vence {fmtDate(m.dueDate)}</span>}
                        {m.paidAmount && Number(m.paidAmount) > 0 && (
                          <span className="text-emerald-700">✓ pagado {fmt(Number(m.paidAmount), m.currency || currency)}</span>
                        )}
                      </div>
                      {m.description && <p className="text-xs text-gray-500 mt-1">{m.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingMilestone(m)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingPayment({ milestoneId: m.id, amount: Number(m.amount) - Number(m.paidAmount || 0), currency: m.currency || currency, paymentDate: new Date().toISOString().slice(0,10), status: 'CONFIRMED' })} className="p-1.5 hover:bg-emerald-50 rounded text-emerald-600" title="Registrar pago">
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('¿Eliminar hito? Los pagos asociados quedarán sin vincular.')) return;
                          await api.delete(`/finance/milestones/${m.id}`);
                          load();
                        }}
                        className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600" title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* PAGOS RECIBIDOS */}
          <section className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                💵 Pagos recibidos ({summary.payments.length})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowProofUpload(true)}
                  className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700 inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Subir comprobante (IA)
                </button>
                <button
                  onClick={() => setEditingPayment({ amount: 0, currency, paymentDate: new Date().toISOString().slice(0,10), status: 'CONFIRMED' })}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Registrar pago
                </button>
              </div>
            </div>
            {summary.payments.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Sin pagos registrados. Sube un comprobante o registra manualmente.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-600 uppercase tracking-wide">
                    <th className="text-left py-2 font-semibold">Fecha</th>
                    <th className="text-left py-2 font-semibold">Monto</th>
                    <th className="text-left py-2 font-semibold">Método</th>
                    <th className="text-left py-2 font-semibold">Referencia</th>
                    <th className="text-left py-2 font-semibold">Estado</th>
                    <th className="text-right py-2 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.payments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2">{fmtDate(p.paymentDate)}</td>
                      <td className="py-2 font-mono font-semibold">{fmt(p.amount, p.currency || currency)}</td>
                      <td className="py-2 text-xs">{p.paymentMethod || '—'}</td>
                      <td className="py-2 text-xs text-gray-600">
                        {p.referenceNumber}
                        {p.bankName && <div className="text-[10px] text-gray-400">{p.bankName}</div>}
                      </td>
                      <td className="py-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[p.status]}`}>
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => setEditingPayment(p)} className="p-1 hover:bg-gray-100 rounded text-gray-500" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('¿Eliminar este pago?')) return;
                            await api.delete(`/finance/payments/${p.id}`);
                            load();
                          }}
                          className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600" title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      {/* MODALES */}
      {showAgreementForm && (
        <AgreementModal
          caseId={caseId}
          initial={summary.agreement}
          onClose={() => setShowAgreementForm(false)}
          onSaved={() => { setShowAgreementForm(false); load(); }}
        />
      )}
      {editingMilestone && (
        <MilestoneModal
          caseId={caseId}
          milestone={editingMilestone}
          onClose={() => setEditingMilestone(null)}
          onSaved={() => { setEditingMilestone(null); load(); }}
        />
      )}
      {editingPayment && (
        <PaymentModal
          caseId={caseId}
          payment={editingPayment}
          milestones={summary.milestones}
          currency={currency}
          onClose={() => setEditingPayment(null)}
          onSaved={() => { setEditingPayment(null); load(); }}
        />
      )}
      {showProofUpload && (
        <ProofUploadModal
          caseId={caseId}
          milestones={summary.milestones}
          onClose={() => setShowProofUpload(false)}
          onSaved={() => { setShowProofUpload(false); load(); }}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

function Stat({ label, value, icon, valueClass = '' }: any) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">
        {icon} {label}
      </div>
      <p className={`text-lg font-bold font-mono ${valueClass}`}>{value}</p>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="text-xs">
      <span className="text-gray-500 font-semibold uppercase">{label}:</span>{' '}
      <span className="text-gray-900">{value || '—'}</span>
    </div>
  );
}

// ============================================================================
// MODAL: ACUERDO
// ============================================================================
function AgreementModal({ caseId, initial, onClose, onSaved }: any) {
  const [data, setData] = useState<Agreement>(initial || { paymentType: 'FIXED', currency: 'USD', status: 'ACTIVE' });
  const [saving, setSaving] = useState(false);

  const fld = (k: keyof Agreement, type: 'text' | 'number' = 'text') => ({
    value: (data as any)[k] ?? '',
    onChange: (e: any) => setData({ ...data, [k]: type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : (e.target.value || null) }),
  });

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/cases/${caseId}/finance/agreement`, data);
      onSaved();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Acuerdo de honorarios" onClose={onClose}>
      <div className="space-y-4">
        <Select label="Tipo de honorarios" {...fld('paymentType')} options={Object.entries(PAYMENT_TYPE_LABELS)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Total acordado" type="number" step="0.01" {...fld('totalAmount', 'number')} />
          <Select label="Moneda" {...fld('currency')} options={[['USD','USD'],['EUR','EUR']]} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Pago inicial" type="number" step="0.01" {...fld('initialPayment', 'number')} />
          <Input label="Tarifa por hora" type="number" step="0.01" {...fld('hourlyRate', 'number')} />
          <Input label="Iguala mensual" type="number" step="0.01" {...fld('retainerAmount', 'number')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Contingencia (%)" type="number" step="0.01" {...fld('contingencyPct', 'number')} />
          <Input label="Fecha de firma" type="date" {...fld('signedAt')} />
        </div>
        <Textarea label="Condiciones de pago" placeholder="Ej: 50% al firmar, 25% en audiencia, 25% al obtener sentencia." {...fld('paymentTerms')} />
        <Textarea label="Servicios incluidos" placeholder="Ej: Patrocinio judicial, asistencia a audiencias, redacción de escritos..." {...fld('includes')} />
        <Textarea label="Servicios NO incluidos / gastos extras" placeholder="Ej: tasas judiciales, peritos, copias certificadas, viáticos." {...fld('excludes')} />
        <Textarea label="Notas" {...fld('notes')} />
      </div>
      <ModalFooter onClose={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

// ============================================================================
// MODAL: MILESTONE
// ============================================================================
function MilestoneModal({ caseId, milestone, onClose, onSaved }: any) {
  const [data, setData] = useState<Partial<Milestone>>(milestone);
  const [saving, setSaving] = useState(false);
  const isNew = !data.id;

  const fld = (k: keyof Milestone, type: 'text' | 'number' = 'text') => ({
    value: (data as any)[k] ?? '',
    onChange: (e: any) => setData({ ...data, [k]: type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value)) : (e.target.value || null) }),
  });

  const save = async () => {
    if (!data.label || !data.amount) return alert('Etiqueta y monto son obligatorios');
    setSaving(true);
    try {
      const payload = {
        label: data.label,
        description: data.description,
        amount: Number(data.amount),
        currency: data.currency || 'USD',
        dueDate: data.dueDate || null,
        status: data.status || 'PENDING',
        sortOrder: data.sortOrder || 0,
        notes: data.notes,
      };
      if (isNew) await api.post(`/cases/${caseId}/finance/milestones`, payload);
      else await api.patch(`/finance/milestones/${data.id}`, payload);
      onSaved();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isNew ? 'Nuevo hito de pago' : 'Editar hito'} onClose={onClose}>
      <div className="space-y-4">
        <Input label="Etiqueta *" placeholder="Ej: Anticipo, Audiencia, Sentencia" {...fld('label')} />
        <Textarea label="Descripción" {...fld('description')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Monto *" type="number" step="0.01" {...fld('amount', 'number')} />
          <Input label="Fecha de vencimiento" type="date" {...fld('dueDate')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Estado" {...fld('status')} options={[['PENDING','Pendiente'],['PAID','Pagado'],['OVERDUE','Vencido'],['PARTIAL','Parcial'],['WAIVED','Condonado']]} />
          <Input label="Orden" type="number" {...fld('sortOrder', 'number')} />
        </div>
        <Textarea label="Notas" {...fld('notes')} />
      </div>
      <ModalFooter onClose={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

// ============================================================================
// MODAL: PAYMENT
// ============================================================================
function PaymentModal({ caseId, payment, milestones, currency, onClose, onSaved }: any) {
  const [data, setData] = useState<Partial<Payment>>(payment);
  const [saving, setSaving] = useState(false);
  const isNew = !data.id;

  const fld = (k: keyof Payment, type: 'text' | 'number' = 'text') => ({
    value: (data as any)[k] ?? '',
    onChange: (e: any) => setData({ ...data, [k]: type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value)) : (e.target.value || null) }),
  });

  const save = async () => {
    if (!data.amount) return alert('Monto es obligatorio');
    setSaving(true);
    try {
      const payload = {
        milestoneId: data.milestoneId || null,
        amount: Number(data.amount),
        currency: data.currency || currency,
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate || new Date().toISOString().slice(0, 10),
        bankName: data.bankName,
        referenceNumber: data.referenceNumber,
        payerName: data.payerName,
        status: data.status || 'CONFIRMED',
        proofDocId: data.proofDocId,
        notes: data.notes,
      };
      if (isNew) await api.post(`/cases/${caseId}/finance/payments`, payload);
      else await api.patch(`/finance/payments/${data.id}`, payload);
      onSaved();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isNew ? 'Registrar pago' : 'Editar pago'} onClose={onClose}>
      <div className="space-y-4">
        <Select
          label="Hito vinculado (opcional)"
          {...fld('milestoneId')}
          options={[['','—'], ...milestones.map((m: any) => [m.id, `${m.label} · ${fmt(Number(m.amount), m.currency || currency)}`])]}
        />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Monto *" type="number" step="0.01" {...fld('amount', 'number')} />
          <Input label="Fecha *" type="date" {...fld('paymentDate')} />
          <Select label="Estado" {...fld('status')} options={[['CONFIRMED','Confirmado'],['PENDING','Pendiente'],['REJECTED','Rechazado'],['REFUNDED','Reembolsado']]} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Método" {...fld('paymentMethod')} options={[['','—'],['TRANSFERENCIA','Transferencia'],['DEPOSITO','Depósito'],['EFECTIVO','Efectivo'],['TARJETA','Tarjeta'],['CHEQUE','Cheque'],['OTRO','Otro']]} />
          <Input label="Banco" {...fld('bankName')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="N° de referencia" {...fld('referenceNumber')} />
          <Input label="Ordenante (paga)" {...fld('payerName')} />
        </div>
        <Textarea label="Notas" {...fld('notes')} />
      </div>
      <ModalFooter onClose={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

// ============================================================================
// MODAL: PROOF UPLOAD CON IA
// ============================================================================
function ProofUploadModal({ caseId, milestones, onClose, onSaved }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extraction, setExtraction] = useState<any>(null);
  const [proofDocId, setProofDocId] = useState<string | null>(null);
  const [milestoneId, setMilestoneId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleFile = async (f: File) => {
    setFile(f);
    setExtraction(null);
    setProofDocId(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      if (milestoneId) fd.append('milestoneId', milestoneId);
      const { getAuthToken } = await import('@/lib/get-auth-token');
      const tok = await getAuthToken();
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/cases/${caseId}/finance/payment-proof`,
        { method: 'POST', headers: { Authorization: `Bearer ${tok}` }, body: fd }
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error en subida');
      setProofDocId(data.proofDocId);
      setExtraction(data.extraction);
    } catch (e: any) {
      alert(e.message || 'Error');
    } finally {
      setUploading(false);
    }
  };

  const confirmPayment = async () => {
    if (!extraction || extraction.error) return alert('La IA no extrajo datos. Registra manualmente.');
    setSaving(true);
    try {
      await api.post(`/cases/${caseId}/finance/payments`, {
        milestoneId: milestoneId || null,
        amount: Number(extraction.amount) || 0,
        currency: extraction.currency || 'USD',
        paymentMethod: extraction.paymentMethod || null,
        paymentDate: extraction.paymentDate || new Date().toISOString().slice(0, 10),
        bankName: extraction.bankName || null,
        referenceNumber: extraction.referenceNumber || null,
        payerName: extraction.payerName || null,
        status: 'CONFIRMED',
        proofDocId,
        notes: extraction.concept || null,
      });
      onSaved();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al guardar pago');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Subir comprobante de pago" onClose={onClose}>
      <div className="space-y-4">
        {milestones.length > 0 && (
          <Select
            label="Vincular a hito (opcional)"
            value={milestoneId}
            onChange={(e: any) => setMilestoneId(e.target.value)}
            options={[['', '— sin vincular —'], ...milestones.map((m: any) => [m.id, `${m.label} · ${fmt(Number(m.amount))}`])]}
          />
        )}

        {!file ? (
          <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
            <Upload className="w-8 h-8 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Click para seleccionar comprobante</span>
            <span className="text-xs text-gray-500">PDF o imagen (PNG, JPG). La IA extraerá los datos automáticamente.</span>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
              <FileText className="w-5 h-5 text-emerald-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              {uploading && <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />}
            </div>

            {extraction && !extraction.error && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Datos extraídos por IA
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {extraction.amount && <DataRow label="Monto" value={fmt(extraction.amount, extraction.currency || 'USD')} />}
                  {extraction.paymentDate && <DataRow label="Fecha" value={fmtDate(extraction.paymentDate)} />}
                  {extraction.paymentMethod && <DataRow label="Método" value={extraction.paymentMethod} />}
                  {extraction.bankName && <DataRow label="Banco" value={extraction.bankName} />}
                  {extraction.referenceNumber && <DataRow label="Referencia" value={extraction.referenceNumber} />}
                  {extraction.payerName && <DataRow label="Ordenante" value={extraction.payerName} />}
                  {extraction.payeeName && <DataRow label="Beneficiario" value={extraction.payeeName} />}
                  {extraction.concept && <div className="col-span-2"><DataRow label="Concepto" value={extraction.concept} /></div>}
                </div>
              </div>
            )}

            {extraction?.error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800">
                <strong>La IA no pudo extraer datos automáticamente.</strong> Puedes registrar el pago manualmente.
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 mt-5">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded">Cancelar</button>
        {extraction && !extraction.error && (
          <button
            onClick={confirmPayment}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Confirmar y registrar pago'}
          </button>
        )}
      </div>
    </Modal>
  );
}

// ============================================================================
// PRIMITIVAS UI
// ============================================================================
function Modal({ title, onClose, children }: any) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ onClose, onSave, saving }: any) {
  return (
    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 mt-5">
      <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded">Cancelar</button>
      <button onClick={onSave} disabled={saving} className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-2">
        <Save className="w-4 h-4" />
        {saving ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  );
}

function Input({ label, ...props }: any) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <input {...props} className="mt-1 w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
    </label>
  );
}

function Textarea({ label, ...props }: any) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <textarea {...props} rows={3} className="mt-1 w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none" />
    </label>
  );
}

function Select({ label, options, ...props }: any) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <select {...props} className="mt-1 w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white">
        {options.map(([v, lbl]: [string, string]) => (
          <option key={v} value={v}>{lbl}</option>
        ))}
      </select>
    </label>
  );
}
