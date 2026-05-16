'use client';

/**
 * Dashboard · Agente de Trámites
 *
 * Autocompleta escritos / trámites tipo del foro ecuatoriano a partir de
 * campos estructurados. El borrador nace SIEMPRE como 'borrador': la
 * revisión del abogado es obligatoria antes de aprobarlo.
 *
 *  catálogo → formulario → borrador + revisión obligatoria → aprobado
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  AlertTriangle, ArrowLeft, BookCheck, CheckCircle2, ClipboardCheck, Clock,
  Copy, Download, FileSignature, Loader2, Pencil, Sparkles,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────
interface TramiteField {
  key: string; label: string; placeholder: string;
  required: boolean; multiline?: boolean; hint?: string;
}
interface TramiteCatalogItem {
  key: string; name: string; description: string; icon: string;
  category: string; useRag: boolean; fields: TramiteField[];
}
interface TramiteCitation { title: string; hierarchy: string | null; pdfUrl: string | null }
interface TramiteRun {
  id: string; caseId: string | null; tramiteKey: string; tramiteName: string;
  inputs: Record<string, string>; draft: string | null; reviewedContent: string | null;
  reviewStatus: 'borrador' | 'aprobado'; citations: TramiteCitation[];
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
export default function TramitesPage() {
  const [view, setView] = useState<View>('catalog');
  const [catalog, setCatalog] = useState<TramiteCatalogItem[]>([]);
  const [runs, setRuns] = useState<TramiteRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<TramiteCatalogItem | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  const [run, setRun] = useState<TramiteRun | null>(null);
  const [edited, setEdited] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ─── LOAD ─────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setError('');
    try {
      const [catR, runsR] = await Promise.all([
        api.get<{ tramites: TramiteCatalogItem[] }>('/tramites/catalog'),
        api.get<{ runs: TramiteRun[] }>('/tramites/runs', { params: { limit: 30 } }),
      ]);
      setCatalog(catR.data.tramites ?? []);
      setRuns(runsR.data.runs ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al cargar trámites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const categories = useMemo(() => {
    const m = new Map<string, TramiteCatalogItem[]>();
    for (const t of catalog) {
      const arr = m.get(t.category) || [];
      arr.push(t);
      m.set(t.category, arr);
    }
    return [...m.entries()];
  }, [catalog]);

  // ─── ACTIONS ──────────────────────────────────────────────────────────
  const pickTramite = (t: TramiteCatalogItem) => {
    setSelected(t);
    setForm(Object.fromEntries(t.fields.map((f) => [f.key, ''])));
    setError('');
    setView('form');
  };

  const openRun = (r: TramiteRun) => {
    setRun(r);
    setEdited(r.reviewedContent ?? r.draft ?? '');
    setSelected(catalog.find((t) => t.key === r.tramiteKey) ?? null);
    setSaved(false);
    setError('');
    setView('result');
  };

  const generate = async () => {
    if (!selected) return;
    setGenerating(true);
    setError('');
    try {
      const r = await api.post<{ run: TramiteRun }>('/tramites/generate', {
        tramiteKey: selected.key,
        inputs: form,
      });
      const newRun = r.data.run;
      setRun(newRun);
      setEdited(newRun.draft ?? '');
      setRuns((prev) => [newRun, ...prev]);
      setSaved(false);
      setView('result');
    } catch (e: any) {
      // El aviso "función en desarrollo" lo muestra FeatureDevNotice (global).
      if (e?.response?.data?.code !== 'feature_in_development') {
        setError(e?.response?.data?.error || e?.message || 'No se pudo generar el trámite');
      }
    } finally {
      setGenerating(false);
    }
  };

  const saveReview = async (approve: boolean) => {
    if (!run) return;
    if (approve && !confirm('¿Confirmás que revisaste el trámite y lo aprobás como versión final?')) return;
    setSaving(true);
    setError('');
    try {
      const r = await api.patch<{ run: TramiteRun }>(`/tramites/runs/${run.id}`, {
        reviewedContent: edited,
        approve,
      });
      const updated = r.data.run;
      setRun(updated);
      setRuns((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'No se pudo guardar la revisión');
    } finally {
      setSaving(false);
    }
  };

  const copyText = () => {
    navigator.clipboard?.writeText(edited).catch(() => {});
  };
  const downloadText = () => {
    if (!run) return;
    const blob = new Blob([edited], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${run.tramiteKey}-${run.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md">
          <FileSignature className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Agente de Trámites</h1>
          <p className="text-sm text-gray-500">
            Autocompletá escritos tipo del foro ecuatoriano · revisión del abogado obligatoria
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
          {categories.map(([cat, items]) => (
            <div key={cat} className="space-y-3">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{cat}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => pickTramite(t)}
                    className="group flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition text-left"
                  >
                    <div className="text-2xl flex-shrink-0">{t.icon}</div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-sm group-hover:text-indigo-700 transition">
                        {t.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
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
                Trámites recientes
              </h2>
            </div>
            {runs.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Todavía no generaste ningún trámite.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {runs.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => openRun(r)}
                    className="w-full flex items-center gap-3 p-3.5 hover:bg-gray-50 transition text-left"
                  >
                    <FileSignature className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{r.tramiteName}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(r.generatedAt)}</div>
                    </div>
                    <StatusPill status={r.reviewStatus} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ VISTA: FORMULARIO ═════════════════════════════════════ */}
      {view === 'form' && selected && (
        <div className="space-y-5">
          <button
            onClick={() => setView('catalog')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al catálogo
          </button>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-violet-50">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{selected.icon}</div>
                <div>
                  <h2 className="font-bold text-gray-900">{selected.name}</h2>
                  <p className="text-xs text-gray-600">{selected.description}</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
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
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                    />
                  ) : (
                    <input
                      type="text"
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg hover:shadow-lg disabled:opacity-50 transition"
              >
                {generating
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando borrador…</>
                  : <><Sparkles className="h-4 w-4" /> Generar borrador</>}
              </button>
              {generating && (
                <p className="text-xs text-gray-500 mt-2">
                  El agente busca normativa aplicable y redacta el escrito. Puede tardar
                  algunos segundos.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ VISTA: RESULTADO + REVISIÓN ═══════════════════════════ */}
      {view === 'result' && run && (
        <div className="space-y-5">
          <button
            onClick={() => { setView('catalog'); loadAll(); }}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-gray-900">{run.tramiteName}</h2>
              <p className="text-xs text-gray-500">
                Generado {formatDateTime(run.generatedAt)}
                {run.reviewedAt && ` · Aprobado ${formatDateTime(run.reviewedAt)}`}
              </p>
            </div>
            <StatusPill status={run.reviewStatus} large />
          </div>

          {/* Banner de revisión obligatoria */}
          {run.reviewStatus === 'borrador' ? (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-900">
              <Pencil className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong>Revisión obligatoria.</strong> Este es un borrador generado por IA.
                Revisalo, corregí lo que haga falta y recién entonces aprobalo. El borrador
                no debe presentarse sin la revisión de un abogado.
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong>Trámite aprobado.</strong> Fue revisado y marcado como versión final.
                Podés seguir editándolo y volver a guardar.
              </div>
            </div>
          )}

          {/* Editor */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Contenido del trámite
              </span>
              <div className="flex items-center gap-2">
                <button onClick={copyText} title="Copiar"
                  className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition">
                  <Copy className="h-4 w-4" />
                </button>
                <button onClick={downloadText} title="Descargar .txt"
                  className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
            <textarea
              value={edited}
              onChange={(e) => { setEdited(e.target.value); setSaved(false); }}
              rows={20}
              className="w-full px-4 py-3 text-sm text-gray-800 font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Citas verificadas */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
              <BookCheck className="h-4 w-4 text-emerald-600" />
              Normas verificadas contra el corpus
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                {run.citations.length}
              </span>
            </h3>
            {run.citations.length === 0 ? (
              <p className="text-xs text-gray-500">
                No se detectaron normas del corpus citadas en el borrador. Verificá
                manualmente los fundamentos de derecho.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {run.citations.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      {c.pdfUrl
                        ? <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline">{c.title}</a>
                        : c.title}
                      {c.hierarchy && <span className="text-xs text-gray-400"> · {c.hierarchy}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

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
              {run.reviewStatus === 'aprobado' ? 'Re-aprobar' : 'Aprobar trámite'}
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

function StatusPill({ status, large }: { status: 'borrador' | 'aprobado'; large?: boolean }) {
  const isApproved = status === 'aprobado';
  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-full ${
      large ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[10px]'
    } ${isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
      {isApproved
        ? <><CheckCircle2 className={large ? 'h-3.5 w-3.5' : 'h-3 w-3'} /> APROBADO</>
        : <><Pencil className={large ? 'h-3.5 w-3.5' : 'h-3 w-3'} /> BORRADOR</>}
    </span>
  );
}
