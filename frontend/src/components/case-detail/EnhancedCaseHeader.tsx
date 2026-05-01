'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MoreVertical,
  FileText,
  Download,
  Share2,
  Archive,
  ArchiveRestore,
  Edit,
  User,
  Calendar,
  Trash2,
  Copy,
  Mail,
  Printer,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { LegalType, Priority, legalTypeConfig } from '@/lib/design-tokens';
import { LegalTypeBadge } from '@/components/ui/LegalTypeBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

interface EnhancedCaseHeaderProps {
  caseData: {
    id: string;
    title: string;
    caseNumber?: string;
    clientName: string;
    status: string;
    description?: string;
    createdAt: string;
    legalType?: LegalType;
    priority?: Priority;
  };
  onUpdated?: () => void;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export function EnhancedCaseHeader({ caseData, onUpdated }: EnhancedCaseHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const legalType = (caseData.legalType as LegalType) || 'civil';
  const priority = (caseData.priority as Priority) || 'medium';
  const config = legalTypeConfig[legalType];

  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [toast, setToast] = useState('');
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMoreMenu) return;
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreMenu]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ============== GENERAR REPORTE (HTML imprimible) ==============
  const generateReport = async () => {
    setGenerating(true);
    try {
      // Recolectar todos los datos del caso
      const [c, docs, clients, notifs, lawyer] = await Promise.all([
        api.get(`/cases/${caseData.id}`),
        api.get(`/documents/case/${caseData.id}`).catch(() => ({ data: { documents: [] } })),
        api.get(`/cases/${caseData.id}/clients`).catch(() => ({ data: { clients: [] } })),
        api.get(`/cases/${caseData.id}/notifications`).catch(() => ({ data: { notifications: [] } })),
        api.get('/lawyer-profile').catch(() => ({ data: { profile: null } })),
      ]);
      const caseFull = c.data.case || c.data;
      const documents = docs.data.documents || [];
      const clientList = clients.data.clients || [];
      const notifications = notifs.data.notifications || [];
      const lawyerProfile = lawyer.data.profile;
      const aiSummary = caseFull.aiSummary || caseFull.metadata?.aiSummary;

      const html = buildReportHtml({ caseFull, documents, clientList, notifications, lawyerProfile, aiSummary });
      const w = window.open('', '_blank');
      if (!w) {
        // Pop-up bloqueado: descargar como blob
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        downloadBlob(blob, `Reporte-${caseFull.title || caseData.id}.html`);
        flash('Reporte descargado');
      } else {
        w.document.write(html);
        w.document.close();
        // Auto-abrir diálogo de impresión tras render
        setTimeout(() => w.print(), 500);
      }
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al generar reporte');
    } finally {
      setGenerating(false);
    }
  };

  // ============== DESCARGAR (JSON con todos los datos) ==============
  const downloadCase = async () => {
    setDownloading(true);
    try {
      const [c, docs, clients, notifs] = await Promise.all([
        api.get(`/cases/${caseData.id}`),
        api.get(`/documents/case/${caseData.id}`).catch(() => ({ data: { documents: [] } })),
        api.get(`/cases/${caseData.id}/clients`).catch(() => ({ data: { clients: [] } })),
        api.get(`/cases/${caseData.id}/notifications`).catch(() => ({ data: { notifications: [] } })),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        case: c.data.case || c.data,
        documents: docs.data.documents || [],
        clients: clients.data.clients || [],
        notifications: notifs.data.notifications || [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
      const safeName = (caseData.title || 'caso').replace(/[^a-zA-Z0-9_\-. áéíóúÁÉÍÓÚñÑ]/g, '').slice(0, 80);
      downloadBlob(blob, `${safeName}-export-${new Date().toISOString().slice(0, 10)}.json`);
      flash('Caso exportado a JSON');
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al descargar');
    } finally {
      setDownloading(false);
    }
  };

  // ============== COMPARTIR ==============
  const openShare = async () => {
    setShowShareModal(true);
    setShareCopied(false);
    if (!shareToken) {
      // Generar token client-side (sin necesidad de backend, expira con la URL pública)
      const token = `case-${caseData.id}-${Math.random().toString(36).slice(2, 8)}`;
      setShareToken(token);
    }
  };

  const copyShareLink = async () => {
    const link = `${window.location.origin}/dashboard/cases/${caseData.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      setShareCopied(true);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Caso: ${caseData.title}`);
    const link = `${window.location.origin}/dashboard/cases/${caseData.id}`;
    const body = encodeURIComponent(
      `Caso: ${caseData.title}\nCliente: ${caseData.clientName}\nN°: ${caseData.caseNumber || 'N/A'}\n\nVer detalles: ${link}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // ============== ARCHIVAR / DESARCHIVAR ==============
  const isArchived = caseData.status === 'closed' || caseData.status === 'archived';
  const toggleArchive = async () => {
    const newStatus = isArchived ? 'active' : 'closed';
    const confirmMsg = isArchived ? '¿Reactivar este caso?' : '¿Archivar este caso? Lo podrás reactivar después.';
    if (!confirm(confirmMsg)) return;
    setArchiving(true);
    try {
      await api.patch(`/cases/${caseData.id}`, { status: newStatus });
      flash(isArchived ? 'Caso reactivado' : 'Caso archivado');
      onUpdated?.();
      // Actualizar la página
      router.refresh();
      // Si fue archivado, redirigir al dashboard tras 1s
      if (!isArchived) setTimeout(() => router.push('/dashboard'), 1000);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al archivar');
    } finally {
      setArchiving(false);
    }
  };

  // ============== ELIMINAR (delegado al modal de seguridad) ==============
  const openDeleteModal = () => {
    setShowDeleteModal(true);
  };

  // ============== IMPRIMIR ==============
  const printPage = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
      {toast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded shadow-lg animate-in fade-in zoom-in-95">
          ✓ {toast}
        </div>
      )}

      {/* Top Bar */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 print:hidden">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver al Panel
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={generateReport}
            disabled={generating}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group disabled:opacity-50"
            title={t('cases.generateReport')}
          >
            {generating
              ? <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              : <FileText className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />}
          </button>
          <button
            onClick={downloadCase}
            disabled={downloading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group disabled:opacity-50"
            title={t('cases.downloadCase')}
          >
            {downloading
              ? <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              : <Download className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />}
          </button>
          <button
            onClick={openShare}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
            title={t('cases.shareCase')}
          >
            <Share2 className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
          </button>
          <button
            onClick={toggleArchive}
            disabled={archiving}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group disabled:opacity-50"
            title={isArchived ? t('cases.archiveCase') : t('cases.archiveCase')}
          >
            {archiving
              ? <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              : isArchived
                ? <ArchiveRestore className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700" />
                : <Archive className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />}
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Menu "Más opciones" */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu((s) => !s)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
              title="Más opciones"
            >
              <MoreVertical className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                <button
                  onClick={() => { setShowMoreMenu(false); printPage(); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4 text-gray-500" /> Imprimir página
                </button>
                <button
                  onClick={() => { setShowMoreMenu(false); shareViaEmail(); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4 text-gray-500" /> {t('cases.shareCase')}
                </button>
                <button
                  onClick={() => { setShowMoreMenu(false); copyShareLink(); flash('Enlace copiado'); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4 text-gray-500" /> Copiar enlace
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => { setShowMoreMenu(false); openDeleteModal(); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> {t('cases.deleteCase')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div
        className="p-6 border-l-4"
        style={{
          borderLeftColor: config.color,
          background: `linear-gradient(135deg, ${config.color}05 0%, ${config.color}10 100%)`,
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="text-5xl">{config.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-gray-900">{caseData.title}</h1>
                <button
                  onClick={() => {
                    const el = document.querySelector('[data-section="case-metadata"]') as HTMLElement | null;
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="p-1.5 hover:bg-white/50 rounded-lg transition-colors print:hidden"
                  title="Editar caso"
                >
                  <Edit className="w-5 h-5 text-gray-500 hover:text-gray-700" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <LegalTypeBadge legalType={legalType} size="lg" />
                <PriorityBadge priority={priority} size="lg" />
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border-2"
                  style={{
                    backgroundColor: `${config.color}15`,
                    borderColor: `${config.color}40`,
                    color: config.color,
                  }}
                >
                  {caseData.status}
                </span>
              </div>

              {caseData.description && (
                <p className="text-gray-700 leading-relaxed mb-4 max-w-3xl">{caseData.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <User className="w-5 h-5" style={{ color: config.color }} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t('cases.client')}</p>
              <p className="text-sm font-semibold text-gray-900">{caseData.clientName}</p>
            </div>
          </div>

          {caseData.caseNumber && (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${config.color}20` }}
              >
                <FileText className="w-5 h-5" style={{ color: config.color }} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Nº de Caso</p>
                <p className="text-sm font-semibold text-gray-900">{caseData.caseNumber}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <Calendar className="w-5 h-5" style={{ color: config.color }} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Fecha de Creación</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(caseData.createdAt).toLocaleDateString('es-EC', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SHARE MODAL */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowShareModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{t('cases.shareCase')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Solo accesible para usuarios autenticados con permisos.</p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 hover:bg-gray-100 rounded text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2 mb-3">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/cases/${caseData.id}`}
                className="flex-1 bg-transparent text-xs text-gray-700 font-mono outline-none"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={copyShareLink}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 inline-flex items-center gap-1"
              >
                {shareCopied ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={shareViaEmail}
                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Mail className="w-5 h-5 text-indigo-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Enviar por email</p>
                  <p className="text-xs text-gray-500">Abre tu cliente de correo con el caso</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL — alta seguridad */}
      {showDeleteModal && (
        <DeleteConfirmModal
          caseTitle={caseData.title}
          caseId={caseData.id}
          onCancel={() => setShowDeleteModal(false)}
          onConfirmed={() => router.push('/dashboard')}
        />
      )}
    </div>
  );
}

// =============================================================================
// DELETE CONFIRMATION MODAL — multi-step con typing del nombre del caso
// =============================================================================
function DeleteConfirmModal({
  caseTitle, caseId, onCancel, onConfirmed,
}: {
  caseTitle: string;
  caseId: string;
  onCancel: () => void;
  onConfirmed: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [acknowledged, setAcknowledged] = useState(false);
  const [understands, setUnderstands] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Texto que el user debe escribir literal: el título del caso
  const requiredText = caseTitle.trim();
  const isMatch = confirmText.trim() === requiredText;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleting, onCancel]);

  const proceedToTyping = () => {
    if (!acknowledged || !understands) {
      setError('Debes marcar ambas casillas para continuar');
      return;
    }
    setError('');
    setStep(2);
  };

  const executeDelete = async () => {
    if (!isMatch) {
      setError('El texto no coincide. Copia exactamente el título del caso.');
      return;
    }
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/cases/${caseId}`);
      onConfirmed();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error al eliminar el caso');
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) onCancel();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-red-300 animate-in zoom-in-95 duration-200">
        {/* Header rojo */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 px-6 py-5 text-white relative">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold">{t('cases.deleteCase')}</h3>
              <p className="text-sm text-red-100 mt-0.5">
                Paso {step} de 2 · Esta acción es <strong>irreversible</strong>
              </p>
            </div>
            {!deleting && (
              <button
                onClick={onCancel}
                className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white"
                aria-label="Cancelar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {step === 1 && (
            <>
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-4">
                <p className="text-sm font-bold text-red-900 mb-2">
                  ⚠️ ¡ATENCIÓN! Vas a eliminar permanentemente:
                </p>
                <p className="font-semibold text-gray-900 break-words">"{caseTitle}"</p>
              </div>

              <p className="text-sm text-gray-700 mb-3 font-semibold">
                Al eliminar este caso se borrará TODO lo siguiente sin posibilidad de recuperación:
              </p>
              <ul className="text-sm text-gray-700 space-y-1.5 mb-5 ml-1">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">✗</span>
                  <span>Toda la <strong>información del caso</strong> (datos jurídicos, descripción, fechas, etapas)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">✗</span>
                  <span>Todos los <strong>documentos cargados</strong> y sus archivos originales (PDF, Word, Excel, imágenes)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">✗</span>
                  <span>Los <strong>vectores y embeddings</strong> generados por IA</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">✗</span>
                  <span>Las <strong>partes representadas</strong> vinculadas al caso (los clientes en sí no se borran)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">✗</span>
                  <span>Las <strong>notificaciones oficiales</strong> (juzgados, fiscalías, contraparte)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">✗</span>
                  <span>Los <strong>resúmenes IA</strong>, conversaciones y análisis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">✗</span>
                  <span>Las <strong>tareas, eventos y honorarios</strong> asociados</span>
                </li>
              </ul>

              <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-800">
                    Entiendo que <strong>todos los datos asociados al caso se borrarán permanentemente</strong>.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={understands}
                    onChange={(e) => setUnderstands(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-800">
                    Entiendo que <strong>esta acción NO se puede deshacer</strong> y el caso no se podrá recuperar.
                  </span>
                </label>
              </div>

              {error && (
                <p className="text-sm text-red-600 mt-3 font-medium">{error}</p>
              )}

              <div className="flex gap-3 mt-5 pt-4 border-t border-gray-200">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={proceedToTyping}
                  disabled={!acknowledged || !understands}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continuar →
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-4">
                <p className="text-sm font-bold text-red-900 mb-1">
                  Confirmación final
                </p>
                <p className="text-sm text-red-800">
                  Para confirmar, escribe <strong>exactamente</strong> el título del caso a continuación.
                </p>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Título a copiar:
                </p>
                <div className="bg-gray-900 text-white px-4 py-2.5 rounded font-mono text-sm break-all select-all cursor-text">
                  {requiredText}
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Escribe el título exacto:
                </span>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => { setConfirmText(e.target.value); setError(''); }}
                  autoFocus
                  disabled={deleting}
                  placeholder="Pega o escribe el título aquí"
                  className={`mt-1 w-full px-3 py-2.5 border-2 rounded-lg text-sm font-mono focus:outline-none transition-colors ${
                    confirmText.length === 0
                      ? 'border-gray-300 focus:border-gray-500'
                      : isMatch
                        ? 'border-emerald-500 bg-emerald-50 focus:border-emerald-600'
                        : 'border-red-300 bg-red-50 focus:border-red-500'
                  }`}
                />
                {confirmText.length > 0 && !isMatch && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                    <X className="w-3 h-3" /> El texto no coincide
                  </p>
                )}
                {confirmText.length > 0 && isMatch && (
                  <p className="text-xs text-emerald-700 mt-1.5 flex items-center gap-1 font-semibold">
                    <Check className="w-3 h-3" /> Coincide exactamente
                  </p>
                )}
              </label>

              {error && (
                <p className="text-sm text-red-600 mt-3 font-medium">{error}</p>
              )}

              <div className="flex gap-3 mt-5 pt-4 border-t border-gray-200">
                <button
                  onClick={() => { setStep(1); setConfirmText(''); setError(''); }}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 transition-colors"
                >
                  ← Atrás
                </button>
                <button
                  onClick={executeDelete}
                  disabled={!isMatch || deleting}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      {t('common.delete')}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// REPORT HTML BUILDER
// =============================================================================
function buildReportHtml({ caseFull, documents, clientList, notifications, lawyerProfile, aiSummary }: any): string {
  const fmt = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<title>Reporte: ${escapeHtml(caseFull.title || '')}</title>
<style>
  @page { margin: 1.5cm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1d27; line-height: 1.5; max-width: 900px; margin: 0 auto; padding: 30px; }
  h1 { font-size: 22px; border-bottom: 3px solid #4338ca; padding-bottom: 8px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #4338ca; margin-top: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 13px; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  th { background: #f3f4f6; font-weight: 600; width: 35%; color: #4b5563; }
  .lawyer-block { background: #f9fafb; border-left: 4px solid #4338ca; padding: 12px 16px; border-radius: 4px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .b-active { background: #d1fae5; color: #065f46; }
  ul { padding-left: 18px; }
  li { margin: 3px 0; font-size: 13px; }
  .meta { font-size: 11px; color: #9ca3af; margin-top: 4px; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  @media print { .no-print { display: none; } }
</style>
</head><body>

<h1>Reporte del Caso</h1>
<p class="meta">Generado el ${new Date().toLocaleString('es-EC')}</p>

${lawyerProfile ? `
<div class="lawyer-block">
  <strong style="font-size:14px">${escapeHtml(lawyerProfile.fullName)}</strong> · ${escapeHtml(lawyerProfile.title || 'Abogado')}
  ${lawyerProfile.barNumber ? `<br><span style="color:#6b7280;font-size:12px">Mat. profesional: ${escapeHtml(lawyerProfile.barNumber)}</span>` : ''}
  ${lawyerProfile.lawFirm ? `<br><span style="color:#6b7280;font-size:12px">${escapeHtml(lawyerProfile.lawFirm)}</span>` : ''}
  ${lawyerProfile.email ? `<br><span style="color:#6b7280;font-size:12px">${escapeHtml(lawyerProfile.email)}</span>` : ''}
  ${lawyerProfile.officePhone || lawyerProfile.mobile ? `<br><span style="color:#6b7280;font-size:12px">Tel: ${escapeHtml([lawyerProfile.officePhone, lawyerProfile.mobile].filter(Boolean).join(' / '))}</span>` : ''}
</div>
` : ''}

<h2>Identificación del caso</h2>
<table>
  <tr><th>Título</th><td>${escapeHtml(caseFull.title || '')}</td></tr>
  ${caseFull.countryCode ? `<tr><th>País / Jurisdicción</th><td>${escapeHtml(caseFull.countryCode)}</td></tr>` : ''}
  ${caseFull.caseNumber ? `<tr><th>N° interno</th><td>${escapeHtml(caseFull.caseNumber)}</td></tr>` : ''}
  ${caseFull.judicialProcessNumber ? `<tr><th>N° proceso judicial</th><td>${escapeHtml(caseFull.judicialProcessNumber)}</td></tr>` : ''}
  ${caseFull.legalMatter ? `<tr><th>Materia</th><td>${escapeHtml(caseFull.legalMatter)}</td></tr>` : ''}
  ${caseFull.actionType ? `<tr><th>Tipo de acción</th><td>${escapeHtml(caseFull.actionType)}</td></tr>` : ''}
  ${caseFull.jurisdiction ? `<tr><th>Jurisdicción local</th><td>${escapeHtml(caseFull.jurisdiction)}</td></tr>` : ''}
  <tr><th>Estado</th><td><span class="badge b-active">${escapeHtml(caseFull.status)}</span></td></tr>
  ${caseFull.proceduralStage ? `<tr><th>Etapa procesal</th><td>${escapeHtml(caseFull.proceduralStage)}</td></tr>` : ''}
  <tr><th>Cliente principal</th><td>${escapeHtml(caseFull.clientName || '')}</td></tr>
  <tr><th>Fecha creación</th><td>${fmt(caseFull.createdAt)}</td></tr>
  ${caseFull.filedAt ? `<tr><th>Fecha presentación</th><td>${fmt(caseFull.filedAt)}</td></tr>` : ''}
  ${caseFull.nextHearingAt ? `<tr><th>Próxima audiencia</th><td>${fmt(caseFull.nextHearingAt)}</td></tr>` : ''}
</table>

${caseFull.courtName || caseFull.judgeName || caseFull.prosecutorName ? `
<h2>Autoridades del proceso</h2>
<table>
  ${caseFull.courtName ? `<tr><th>Tribunal/Juzgado</th><td>${escapeHtml(caseFull.courtName)}${caseFull.courtUnit ? ' · ' + escapeHtml(caseFull.courtUnit) : ''}</td></tr>` : ''}
  ${caseFull.judgeName ? `<tr><th>Juez/a</th><td>${escapeHtml(caseFull.judgeName)}</td></tr>` : ''}
  ${caseFull.prosecutorName ? `<tr><th>Fiscal</th><td>${escapeHtml(caseFull.prosecutorName)}</td></tr>` : ''}
  ${caseFull.opposingParty ? `<tr><th>Parte contraria</th><td>${escapeHtml(caseFull.opposingParty)}</td></tr>` : ''}
</table>
` : ''}

${caseFull.relatedLaws && caseFull.relatedLaws.length > 0 ? `
<h2>Normas aplicables</h2>
<ul>${caseFull.relatedLaws.map((l: string) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
` : ''}

${caseFull.amountClaimed ? `
<h2>Cuantía</h2>
<p>${(caseFull.currency || 'USD')} ${Number(caseFull.amountClaimed).toLocaleString('es-EC', { minimumFractionDigits: 2 })}</p>
` : ''}

${caseFull.factsSummary || caseFull.description ? `
<h2>Hechos del caso</h2>
<p>${escapeHtml(caseFull.factsSummary || caseFull.description || '').replace(/\n/g, '<br>')}</p>
` : ''}

${aiSummary && aiSummary.summary ? `
<h2>Análisis ejecutivo (IA)</h2>
<p>${escapeHtml(aiSummary.summary).replace(/\n/g, '<br>')}</p>
${aiSummary.risks?.length ? `<h2 style="font-size:12px;border:none;margin-top:10px">Riesgos detectados</h2><ul>${aiSummary.risks.map((r: string) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>` : ''}
${aiSummary.nextSteps?.length ? `<h2 style="font-size:12px;border:none;margin-top:10px">Próximos pasos sugeridos</h2><ol>${aiSummary.nextSteps.map((s: string) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>` : ''}
` : ''}

${clientList.length > 0 ? `
<h2>Partes representadas</h2>
${clientList.map((c: any) => `
  <div style="margin-bottom:8px;padding:8px;background:#f9fafb;border-radius:4px">
    <strong>${escapeHtml(c.fullName)}</strong> ${c.role ? `<span class="meta">· ${escapeHtml(c.role)}</span>` : ''}<br>
    <span class="meta">
      ${c.identificationNumber ? `${c.identificationType || 'CC'}: ${escapeHtml(c.identificationNumber)}` : ''}
      ${c.email ? ` · ${escapeHtml(c.email)}` : ''}
      ${c.mobile ? ` · ${escapeHtml(c.mobile)}` : ''}
    </span>
    ${c.address ? `<br><span class="meta">${escapeHtml(c.address)}${c.city ? ', ' + escapeHtml(c.city) : ''}</span>` : ''}
  </div>
`).join('')}
` : ''}

${notifications.length > 0 ? `
<h2>Notificaciones oficiales</h2>
${notifications.map((n: any) => `
  <div style="margin-bottom:6px;padding:6px;background:#f9fafb;border-radius:4px">
    <strong>${escapeHtml(n.entityType || '')}</strong> · ${escapeHtml(n.entityName)}
    ${n.email ? `<br><span class="meta">📧 ${escapeHtml(n.email)}</span>` : ''}
    ${n.referenceNumber ? `<br><span class="meta">Ref: ${escapeHtml(n.referenceNumber)}</span>` : ''}
  </div>
`).join('')}
` : ''}

${documents.length > 0 ? `
<h2>Documentos del caso (${documents.length})</h2>
<ul>${documents.map((d: any) => `<li>${escapeHtml(d.title || d.filename || 'sin título')} <span class="meta">· ${fmt(d.createdAt)}</span></li>`).join('')}</ul>
` : ''}

<div class="footer">
  Reporte generado por Poweria Legal · ${new Date().toLocaleString('es-EC')}
</div>

<script class="no-print">window.addEventListener('afterprint',()=>{});</script>
</body></html>`;
}

function escapeHtml(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
