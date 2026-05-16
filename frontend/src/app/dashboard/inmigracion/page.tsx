'use client';

/**
 * Dashboard · Agente de Formularios de Inmigración
 *
 * La "cuña de inmigración" de la Fase 4. Arma un paquete de preparación
 * para un formulario USCIS (I-130, I-485, N-400, …) a partir de los datos
 * del cliente. El paquete reúne tres entregables: borrador del formulario,
 * lista de documentos de respaldo y guía de presentación.
 *
 * El paquete nace SIEMPRE como 'borrador': la revisión de un abogado de
 * inmigración con licencia en EE.UU. es obligatoria. El agente asiste la
 * preparación; no presta asesoría legal ni presenta nada ante USCIS.
 *
 *   catálogo → admisión → paquete + revisión obligatoria → revisado
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  AlertTriangle, ArrowLeft, CheckCircle2, CheckSquare, ClipboardCheck, Clock,
  Copy, Download, FileText, ListChecks, Loader2, Pencil, Scale, Sparkles,
  Square, Stamp,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────
interface ImmigrationField {
  key: string; label: string; placeholder: string;
  required: boolean; multiline?: boolean; hint?: string;
}
interface FormCatalogItem {
  key: string; formCode: string; name: string; nameEn: string;
  category: string; description: string; feeNote: string;
  useRag: boolean; fields: ImmigrationField[];
}
interface ChecklistItem { item: string; detail: string; required: boolean }
interface FormPacket {
  id: string; caseId: string | null; formKey: string; formCode: string;
  formName: string; clientName: string | null; inputs: Record<string, string>;
  formDraft: string | null; checklist: ChecklistItem[]; filingGuide: string | null;
  reviewedContent: string | null; reviewStatus: 'borrador' | 'revisado';
  usedRag: boolean; durationMs: number; generatedAt: string; reviewedAt: string | null;
}

type View = 'catalog' | 'form' | 'result';

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── PAGE ─────────────────────────────────────────────────────────────────
export default function InmigracionPage() {
  const [view, setView] = useState<View>('catalog');
  const [catalog, setCatalog] = useState<FormCatalogItem[]>([]);
  const [packets, setPackets] = useState<FormPacket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<FormCatalogItem | null>(null);
  const [clientName, setClientName] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  const [packet, setPacket] = useState<FormPacket | null>(null);
  const [edited, setEdited] = useState('');
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ─── LOAD ─────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setError('');
    try {
      const [catR, pktR] = await Promise.all([
        api.get<{ forms: FormCatalogItem[] }>('/immigration-forms/catalog'),
        api.get<{ packets: FormPacket[] }>('/immigration-forms/packets', { params: { limit: 30 } }),
      ]);
      setCatalog(catR.data.forms ?? []);
      setPackets(pktR.data.packets ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const categories = useMemo(() => {
    const m = new Map<string, FormCatalogItem[]>();
    for (const f of catalog) {
      const arr = m.get(f.category) || [];
      arr.push(f);
      m.set(f.category, arr);
    }
    return [...m.entries()];
  }, [catalog]);

  // ─── ACTIONS ──────────────────────────────────────────────────────────
  const pickForm = (f: FormCatalogItem) => {
    setSelected(f);
    setClientName('');
    setForm(Object.fromEntries(f.fields.map((x) => [x.key, ''])));
    setError('');
    setView('form');
  };

  const openPacket = (p: FormPacket) => {
    setPacket(p);
    setEdited(p.reviewedContent ?? p.formDraft ?? '');
    setChecked(new Set());
    setSelected(catalog.find((f) => f.key === p.formKey) ?? null);
    setSaved(false);
    setError('');
    setView('result');
  };

  const generate = async () => {
    if (!selected) return;
    setGenerating(true);
    setError('');
    try {
      const r = await api.post<{ packet: FormPacket }>('/immigration-forms/generate', {
        formKey: selected.key,
        clientName,
        inputs: form,
      });
      const newPacket = r.data.packet;
      setPacket(newPacket);
      setEdited(newPacket.formDraft ?? '');
      setChecked(new Set());
      setPackets((prev) => [newPacket, ...prev]);
      setSaved(false);
      setView('result');
    } catch (e: any) {
      // El aviso "función en desarrollo" lo muestra FeatureDevNotice (global).
      if (e?.response?.data?.code !== 'feature_in_development') {
        setError(e?.response?.data?.error || e?.message || 'No se pudo generar el paquete');
      }
    } finally {
      setGenerating(false);
    }
  };

  const saveReview = async (markReviewed: boolean) => {
    if (!packet) return;
    if (markReviewed && !confirm(
      '¿Confirmás que un abogado de inmigración con licencia revisó este paquete y lo marca como versión revisada?',
    )) return;
    setSaving(true);
    setError('');
    try {
      const r = await api.patch<{ packet: FormPacket }>(`/immigration-forms/packets/${packet.id}`, {
        reviewedContent: edited,
        markReviewed,
      });
      const updated = r.data.packet;
      setPacket(updated);
      setPackets((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'No se pudo guardar la revisión');
    } finally {
      setSaving(false);
    }
  };

  const toggleChecked = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const copyText = () => { navigator.clipboard?.writeText(edited).catch(() => {}); };
  const downloadText = () => {
    if (!packet) return;
    const parts = [
      `FORMULARIO ${packet.formCode} — ${packet.formName}`,
      packet.clientName ? `Cliente: ${packet.clientName}` : '',
      '',
      '═══ BORRADOR DEL FORMULARIO ═══',
      edited,
      '',
      '═══ DOCUMENTOS DE RESPALDO ═══',
      ...packet.checklist.map((c) => `[ ] ${c.item}${c.detail ? ` — ${c.detail}` : ''}`),
      '',
      '═══ GUÍA DE PRESENTACIÓN ═══',
      packet.filingGuide ?? '',
    ];
    const blob = new Blob([parts.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${packet.formCode}-${packet.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-sky-600 to-blue-700 text-white shadow-md">
          <Stamp className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Formularios de Inmigración</h1>
          <p className="text-sm text-gray-500">
            Prepará paquetes de formularios USCIS · revisión de abogado con licencia obligatoria
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{error}</div>
        </div>
      )}

      {/* ═══ VISTA: CATÁLOGO ═══════════════════════════════════════ */}
      {view === 'catalog' && (
        <>
          {/* Aviso de alcance */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-sky-50 border border-sky-200 text-sky-900">
            <Scale className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Herramienta de preparación, no asesoría legal.</strong> El agente arma un
              borrador a partir de los datos que cargás. Cada paquete debe ser revisado por un
              abogado de inmigración con licencia en EE.UU. antes de usarse o presentarse.
            </div>
          </div>

          {categories.map(([cat, items]) => (
            <div key={cat} className="space-y-3">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{cat}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => pickForm(f)}
                    className="group flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-sky-300 hover:shadow-md transition text-left"
                  >
                    <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[3.25rem] h-8 px-2 rounded-md bg-sky-100 text-sky-700 text-xs font-bold">
                      {f.formCode}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-sm group-hover:text-sky-700 transition">
                        {f.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{f.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Historial */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-6">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                Paquetes recientes
              </h2>
            </div>
            {packets.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Todavía no generaste ningún paquete.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {packets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => openPacket(p)}
                    className="w-full flex items-center gap-3 p-3.5 hover:bg-gray-50 transition text-left"
                  >
                    <span className="inline-flex items-center justify-center min-w-[3rem] h-6 px-1.5 rounded bg-gray-100 text-gray-600 text-[11px] font-bold flex-shrink-0">
                      {p.formCode}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {p.formName}
                        {p.clientName && <span className="text-gray-400 font-normal"> · {p.clientName}</span>}
                      </div>
                      <div className="text-xs text-gray-500">{formatDateTime(p.generatedAt)}</div>
                    </div>
                    <StatusPill status={p.reviewStatus} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ VISTA: FORMULARIO DE ADMISIÓN ═════════════════════════ */}
      {view === 'form' && selected && (
        <div className="space-y-5">
          <button
            onClick={() => setView('catalog')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al catálogo
          </button>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-sky-50 to-blue-50">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center min-w-[3.5rem] h-9 px-2 rounded-md bg-sky-600 text-white text-sm font-bold">
                  {selected.formCode}
                </span>
                <div>
                  <h2 className="font-bold text-gray-900">{selected.name}</h2>
                  <p className="text-xs text-gray-600">{selected.nameEn}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-3">{selected.description}</p>
              <p className="text-[11px] text-sky-700 mt-2 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
                {selected.feeNote}
              </p>
            </div>
            <div className="p-5 space-y-4">
              {/* Nombre del cliente — siempre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente del paquete <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre completo de la persona para quien se prepara el paquete"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>

              {selected.fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {f.label}
                    {f.required && <span className="text-rose-500"> *</span>}
                  </label>
                  {f.multiline ? (
                    <textarea
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      rows={4}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-y"
                    />
                  ) : (
                    <input
                      type="text"
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  )}
                  {f.hint && <p className="text-xs text-gray-400 mt-1">{f.hint}</p>}
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50">
              <button
                onClick={generate}
                disabled={generating}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-blue-700 rounded-lg hover:shadow-lg disabled:opacity-50 transition"
              >
                {generating
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Armando el paquete…</>
                  : <><Sparkles className="h-4 w-4" /> Generar paquete</>}
              </button>
              {generating && (
                <p className="text-xs text-gray-500 mt-2">
                  El agente arma el borrador del formulario, la lista de documentos y la guía
                  de presentación. Puede tardar algunos segundos.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ VISTA: PAQUETE + REVISIÓN ═════════════════════════════ */}
      {view === 'result' && packet && (
        <div className="space-y-5">
          <button
            onClick={() => { setView('catalog'); loadAll(); }}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center min-w-[3.5rem] h-9 px-2 rounded-md bg-sky-600 text-white text-sm font-bold">
                {packet.formCode}
              </span>
              <div>
                <h2 className="font-bold text-gray-900">{packet.formName}</h2>
                <p className="text-xs text-gray-500">
                  {packet.clientName && <>{packet.clientName} · </>}
                  Generado {formatDateTime(packet.generatedAt)}
                  {packet.reviewedAt && ` · Revisado ${formatDateTime(packet.reviewedAt)}`}
                </p>
              </div>
            </div>
            <StatusPill status={packet.reviewStatus} large />
          </div>

          {/* Banner de revisión obligatoria */}
          {packet.reviewStatus === 'borrador' ? (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-900">
              <Pencil className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong>Revisión obligatoria.</strong> Este es un borrador generado por IA, no
                asesoría legal. Debe revisarlo un abogado de inmigración con licencia en EE.UU.,
                que corregirá lo que haga falta antes de marcarlo como revisado. Nada de esto se
                presenta automáticamente ante USCIS.
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong>Paquete revisado.</strong> Un abogado lo revisó y lo marcó como versión
                final. Podés seguir editándolo y volver a guardar.
              </div>
            </div>
          )}

          {/* Borrador del formulario — editor */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Borrador del formulario
              </span>
              <div className="flex items-center gap-2">
                <button onClick={copyText} title="Copiar borrador"
                  className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition">
                  <Copy className="h-4 w-4" />
                </button>
                <button onClick={downloadText} title="Descargar paquete .txt"
                  className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
            <textarea
              value={edited}
              onChange={(e) => { setEdited(e.target.value); setSaved(false); }}
              rows={20}
              className="w-full px-4 py-3 text-sm text-gray-800 font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* Documentos de respaldo */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
              <ListChecks className="h-4 w-4 text-sky-600" />
              Documentos de respaldo
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 text-sky-700">
                {packet.checklist.length}
              </span>
            </h3>
            {packet.checklist.length === 0 ? (
              <p className="text-xs text-gray-500">
                No se generó una lista de documentos. Verificá manualmente la evidencia requerida.
              </p>
            ) : (
              <ul className="space-y-2">
                {packet.checklist.map((c, i) => {
                  const isChecked = checked.has(i);
                  return (
                    <li key={i}>
                      <button
                        onClick={() => toggleChecked(i)}
                        className="w-full flex items-start gap-2.5 text-left group"
                      >
                        {isChecked
                          ? <CheckSquare className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          : <Square className="h-4 w-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0 mt-0.5" />}
                        <span className="min-w-0">
                          <span className={`text-sm font-medium ${isChecked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {c.item}
                          </span>
                          {!c.required && (
                            <span className="ml-1.5 text-[10px] font-semibold text-gray-400 uppercase">opcional</span>
                          )}
                          {c.detail && <span className="block text-xs text-gray-500 mt-0.5">{c.detail}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Guía de presentación */}
          {packet.filingGuide && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
                <Stamp className="h-4 w-4 text-blue-600" />
                Guía de presentación
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {packet.filingGuide}
              </p>
            </div>
          )}

          {/* Acciones de revisión */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => saveReview(false)}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              Guardar revisión
            </button>
            <button
              onClick={() => saveReview(true)}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              <ClipboardCheck className="h-4 w-4" />
              {packet.reviewStatus === 'revisado' ? 'Re-marcar revisado' : 'Marcar como revisado'}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4" /> Guardado
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────

function StatusPill({ status, large }: { status: 'borrador' | 'revisado'; large?: boolean }) {
  const isReviewed = status === 'revisado';
  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-full ${
      large ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[10px]'
    } ${isReviewed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
      {isReviewed
        ? <><CheckCircle2 className={large ? 'h-3.5 w-3.5' : 'h-3 w-3'} /> REVISADO</>
        : <><Pencil className={large ? 'h-3.5 w-3.5' : 'h-3 w-3'} /> BORRADOR</>}
    </span>
  );
}
