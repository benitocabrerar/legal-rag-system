'use client';

/**
 * DeleteDocumentConfirm — modal de confirmación para borrar un documento
 * del caso. Muestra advertencia clara del impacto:
 *   - Se elimina el archivo binario
 *   - Se eliminan los pasajes vectorizados (indexación semántica)
 *   - El cerebro del caso se regenera reflejando la baja
 *
 * Llama DELETE /documents/:id, refresca la UI vía callback.
 */

import { useState } from 'react';
import { AlertTriangle, Trash2, X, Brain, Database, ScanLine } from 'lucide-react';
import { getAuthToken } from '@/lib/get-auth-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DocSummary {
  id: string;
  title: string;
  filename?: string;
  size?: number;
}

interface Props {
  open: boolean;
  document: DocSummary | null;
  onClose: () => void;
  onDeleted?: (result: { chunksDeleted: number; storageDeleted: boolean; brainRefreshed: boolean }) => void;
}

export default function DeleteDocumentConfirm({ open, document, onClose, onDeleted }: Props) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !document) return null;

  const requiredText = 'BORRAR';
  const isConfirmed = confirmText.trim().toUpperCase() === requiredText;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setDeleting(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const r = await fetch(`${API_URL}/api/v1/documents/${document.id}?refreshBrain=true`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        throw new Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
      }
      const data = await r.json();
      onDeleted?.({
        chunksDeleted: data.chunksDeleted ?? 0,
        storageDeleted: !!data.storageDeleted,
        brainRefreshed: !!data.brainRefreshed,
      });
      setConfirmText('');
      onClose();
    } catch (e: any) {
      setError(e?.message || 'No se pudo borrar el documento');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-600" />
        <button
          onClick={onClose}
          disabled={deleting}
          aria-label="Cerrar"
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-30"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-3">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 grid place-items-center text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900">Eliminar documento del caso</h2>
              <p className="text-sm text-gray-600 mt-0.5 truncate">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{document.title}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Impact */}
        <div className="px-6 pb-2">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2">
              Esta acción es permanente y afectará el análisis del caso
            </div>
            <ul className="space-y-1.5 text-sm text-amber-900">
              <li className="flex items-start gap-2">
                <Database className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>El archivo se elimina del almacenamiento del expediente.</span>
              </li>
              <li className="flex items-start gap-2">
                <ScanLine className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Sus pasajes vectorizados se borran de la búsqueda semántica — el chat de IA dejará de citarlo.</span>
              </li>
              <li className="flex items-start gap-2">
                <Brain className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>El cerebro del caso se regenerará para reflejar la baja (hechos, partes, normas).</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Confirmation */}
        <div className="px-6 py-4">
          <label className="block">
            <span className="text-xs font-semibold text-gray-700 mb-1.5 block">
              Para confirmar, escribe <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-red-700">{requiredText}</span>
            </span>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              disabled={deleting}
              placeholder="Escribe BORRAR"
              className={`w-full px-3 py-2 rounded-lg border text-sm font-mono uppercase
                ${isConfirmed
                  ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-2 focus:ring-gray-400 focus:border-gray-400'}
                outline-none transition`}
            />
          </label>

          {error && (
            <div className="mt-3 p-2.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-900">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={!isConfirmed || deleting}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition
              ${isConfirmed && !deleting
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 shadow-sm hover:shadow'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
          >
            {deleting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Eliminando…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Sí, eliminar permanentemente
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
