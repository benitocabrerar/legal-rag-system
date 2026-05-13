'use client';

/**
 * MarkAsPresentedDialog — marca un documento como "presentado oficialmente"
 * en juzgado/fiscalía/tribunal. Cambia su kind a 'court_filed' y registra
 * el destinatario + fecha. Tras esto, los análisis IA futuros lo tratarán
 * como verdad oficial (prioridad máxima sobre borradores).
 */

import { useState } from 'react';
import { X, Gavel, Calendar, FileSignature, Check } from 'lucide-react';
import { getAuthToken } from '@/lib/get-auth-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  open: boolean;
  documentId: string | null;
  documentTitle: string;
  onClose: () => void;
  onMarked?: () => void;
}

const COMMON_VENUES = [
  'Tribunal de Garantías Penales',
  'Fiscalía Provincial',
  'Unidad Judicial Civil',
  'Unidad Judicial Penal',
  'Unidad Judicial de Familia',
  'Unidad Judicial de Trabajo',
  'Corte Provincial de Justicia',
  'Corte Nacional de Justicia',
  'Corte Constitucional',
  'Tribunal Contencioso Administrativo',
];

export default function MarkAsPresentedDialog({ open, documentId, documentTitle, onClose, onMarked }: Props) {
  const [presentedTo, setPresentedTo] = useState('');
  const [presentedAt, setPresentedAt] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !documentId) return null;

  const onConfirm = async () => {
    if (!presentedTo.trim()) {
      setError('Indicá el juzgado, tribunal o fiscalía');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const r = await fetch(`${API_URL}/api/v1/documents/${documentId}/mark-presented`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ presentedTo, presentedAt }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        throw new Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
      }
      onMarked?.();
      setPresentedTo('');
      onClose();
    } catch (e: any) {
      setError(e?.message || 'No se pudo marcar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <button onClick={onClose} disabled={saving} className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
          <X className="w-5 h-5" />
        </button>

        <div className="px-6 pt-6 pb-3">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 grid place-items-center text-white shadow-md">
              <Gavel className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900">Marcar como presentado oficialmente</h2>
              <p className="text-sm text-gray-600 mt-0.5 truncate">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{documentTitle}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Tras esto, los análisis IA futuros tratarán este documento como{' '}
            <span className="font-bold">verdad oficial del caso</span> y darán prioridad a su contenido sobre borradores propios.
          </div>
        </div>

        <div className="px-6 pb-5 space-y-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Presentado ante *</span>
            <input
              type="text"
              value={presentedTo}
              onChange={(e) => setPresentedTo(e.target.value)}
              autoFocus
              placeholder="Ej: Tribunal de Garantías Penales — Quito"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {COMMON_VENUES.slice(0, 6).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPresentedTo(v)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 hover:bg-emerald-100 hover:text-emerald-800 transition"
                >
                  {v}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Fecha de presentación</span>
            <div className="mt-1 relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={presentedAt}
                onChange={(e) => setPresentedAt(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </label>

          {error && (
            <div className="p-2.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-900">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-200 transition">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={saving || !presentedTo.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? (
              <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Marcando…</>
            ) : (
              <><Check className="w-4 h-4" /> Confirmar presentación</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
