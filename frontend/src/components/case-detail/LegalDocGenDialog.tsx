'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Loader2, AlertTriangle, Sparkles, FileText, Download, FolderPlus, Copy,
  CheckCircle2, ScrollText, Gavel, FileSpreadsheet, Mail, Bell, BookOpen, Handshake, Scale,
  RotateCcw,
} from 'lucide-react';
import { legalDocGenAPI, type LegalDocPreflight } from '@/lib/api';
import { getAuthToken } from '@/lib/get-auth-token';
import { cn } from '@/lib/utils';

type DocType =
  | 'DEMANDA' | 'CONTESTACION_DEMANDA' | 'RECURSO_APELACION' | 'RECURSO_CASACION'
  | 'CONTRATO' | 'INFORME_LEGAL' | 'CARTA_LEGAL' | 'ESCRITO_GENERAL'
  | 'ALEGATO' | 'ACUERDO_TRANSACCIONAL' | 'PODER' | 'NOTIFICACION';

const DOC_OPTIONS: Array<{ id: DocType; label: string; icon: any; gradient: string }> = [
  { id: 'DEMANDA',              label: 'Demanda',                 icon: Gavel,           gradient: 'from-violet-500 to-fuchsia-500' },
  { id: 'CONTESTACION_DEMANDA', label: 'Contestación a demanda',  icon: Scale,           gradient: 'from-indigo-500 to-violet-500' },
  { id: 'RECURSO_APELACION',    label: 'Recurso de apelación',    icon: ScrollText,      gradient: 'from-amber-500 to-orange-500' },
  { id: 'RECURSO_CASACION',     label: 'Recurso de casación',     icon: ScrollText,      gradient: 'from-rose-500 to-pink-500' },
  { id: 'ALEGATO',              label: 'Alegato',                 icon: BookOpen,        gradient: 'from-emerald-500 to-teal-500' },
  { id: 'CONTRATO',             label: 'Contrato',                icon: FileText,        gradient: 'from-sky-500 to-cyan-500' },
  { id: 'ACUERDO_TRANSACCIONAL',label: 'Acuerdo transaccional',   icon: Handshake,       gradient: 'from-teal-500 to-cyan-500' },
  { id: 'INFORME_LEGAL',        label: 'Informe jurídico',        icon: FileSpreadsheet, gradient: 'from-blue-500 to-indigo-500' },
  { id: 'CARTA_LEGAL',          label: 'Carta legal',             icon: Mail,            gradient: 'from-fuchsia-500 to-pink-500' },
  { id: 'NOTIFICACION',         label: 'Notificación',            icon: Bell,            gradient: 'from-orange-500 to-rose-500' },
  { id: 'PODER',                label: 'Poder especial',          icon: ScrollText,      gradient: 'from-purple-500 to-violet-500' },
  { id: 'ESCRITO_GENERAL',      label: 'Escrito general',         icon: FileText,        gradient: 'from-slate-500 to-slate-700' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  /** Si se entrega, se prerellena en el preflight como client_name. */
  defaultClientName?: string;
}

type Step = 'pick' | 'preflight' | 'generate' | 'review';

export function LegalDocGenDialog({ isOpen, onClose, caseId }: Props) {
  const [step, setStep] = useState<Step>('pick');
  const [docType, setDocType] = useState<DocType>('DEMANDA');
  const [specialty, setSpecialty] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [supplied, setSupplied] = useState<Record<string, string>>({});
  const [preflight, setPreflight] = useState<LegalDocPreflight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [generated, setGenerated] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [aiSuggestingFor, setAiSuggestingFor] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset al cerrar — pero conservamos el doc generado por si lo reabren.
    }
  }, [isOpen]);

  const reset = () => {
    setStep('pick');
    setDocType('DEMANDA');
    setSpecialty('');
    setCustomInstructions('');
    setSupplied({});
    setPreflight(null);
    setGenerated('');
    setStreaming(false);
    setSavedDocId(null);
    setError('');
  };

  const closeAndReset = () => {
    abortRef.current?.abort();
    reset();
    onClose();
  };

  const runPreflight = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await legalDocGenAPI.preflight(caseId, docType, supplied);
      setPreflight(r);
      setStep('preflight');
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'No pude validar los datos del caso.');
    } finally {
      setLoading(false);
    }
  };

  const stream = async (acceptIncomplete = false) => {
    setStep('generate');
    setStreaming(true);
    setGenerated('');
    setSavedDocId(null);
    setError('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await getAuthToken();
      const res = await fetch(legalDocGenAPI.generateUrl(caseId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          docType,
          supplied,
          specialty: specialty.trim() || undefined,
          customInstructions: customInstructions.trim() || undefined,
          acceptIncomplete,
        }),
        signal: controller.signal,
      });
      if (res.status === 409) {
        const j = await res.json().catch(() => null);
        setError(j?.message ?? 'Faltan datos obligatorios.');
        setStep('preflight');
        setStreaming(false);
        return;
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      let evt = 'message';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let i;
        while ((i = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, i);
          buffer = buffer.slice(i + 2);
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) evt = line.slice(6).trim();
            else if (line.startsWith('data:')) {
              try {
                const j = JSON.parse(line.slice(5).trim());
                if (evt === 'chunk' && j.content) {
                  acc += j.content;
                  setGenerated(acc);
                } else if (evt === 'error') {
                  setError(j.message || 'Error de IA');
                }
              } catch { /* */ }
            }
          }
        }
      }
      setStep('review');
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message ?? 'Error en la conexión');
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const suggestField = async (field: { key: string; label: string }) => {
    setAiSuggestingFor(field.key);
    try {
      // Usamos preflight con un docType que extrae datos: si el campo está
      // ausente, el LLM no completa más. Así que mejor: pedimos al chat
      // de litigación una sugerencia tipo "dame el dato X de este caso".
      // Para no añadir un endpoint nuevo, hacemos un POST simple al chat.
      const token = await getAuthToken();
      const res = await fetch(`/api/v1/cases/${caseId}/litigation-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message:
            `Quiero generar una "${preflight?.docLabel ?? docType}". Necesito que me digas el dato siguiente con base SÓLO en el expediente del caso: ${field.label}. ` +
            `Responde con UN SOLO renglón, sin explicación, exactamente lo que va en ese campo. Si no aparece en el caso, responde NO_DISPONIBLE.`,
        }),
      });
      if (!res.ok || !res.body) throw new Error('No fue posible obtener sugerencia.');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      let evt = 'message';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let i;
        while ((i = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, i);
          buffer = buffer.slice(i + 2);
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) evt = line.slice(6).trim();
            else if (line.startsWith('data:')) {
              try {
                const j = JSON.parse(line.slice(5).trim());
                if (evt === 'chunk' && j.content) acc += j.content;
              } catch { /* */ }
            }
          }
        }
      }
      const cleaned = acc.trim().split('\n')[0]?.trim() ?? '';
      if (cleaned && !/NO_DISPONIBLE/i.test(cleaned)) {
        setSupplied((s) => ({ ...s, [field.key]: cleaned }));
      } else {
        setError(`La IA no encontró "${field.label}" en el expediente. Llénalo a mano.`);
      }
    } catch (e: any) {
      setError(e.message ?? 'Error obteniendo sugerencia.');
    } finally {
      setAiSuggestingFor(null);
    }
  };

  const downloadDocx = async () => {
    if (!savedDocId) return;
    const token = await getAuthToken();
    const res = await fetch(legalDocGenAPI.downloadDocxUrl(savedDocId), {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      setError('No pude generar el .docx');
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${preflight?.docLabel ?? 'documento'}.docx`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saveToCase = async () => {
    setError('');
    try {
      const r = await legalDocGenAPI.save(caseId, { docType, content: generated });
      setSavedDocId(r.document.id);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'No pude guardar al expediente.');
    }
  };

  const copyToClipboard = () => {
    if (!generated) return;
    void navigator.clipboard.writeText(generated);
    setCopyOk(true);
    setTimeout(() => setCopyOk(false), 1500);
  };

  const docOption = useMemo(() => DOC_OPTIONS.find((d) => d.id === docType)!, [docType]);
  const Icon = docOption.icon;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm" onClick={closeAndReset}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-fuchsia-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0 bg-gradient-to-br', docOption.gradient)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">Generar documento legal</h2>
              <p className="text-[11px] text-slate-500 truncate">{docOption.label}{preflight?.country?.name ? ` · ${preflight.country.flag ?? ''} ${preflight.country.name}` : ''}</p>
            </div>
          </div>
          <button onClick={closeAndReset} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'pick' && (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Tipo de documento</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DOC_OPTIONS.map((d) => {
                    const I = d.icon;
                    const active = docType === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => setDocType(d.id)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all text-left',
                          active
                            ? 'bg-gradient-to-br ' + d.gradient + ' text-white border-transparent shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300',
                        )}
                      >
                        <I className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Especialidad / rama</label>
                  <input
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder='Ej. "Derecho penal económico", "Laboral colectivo", "Civil contractual"'
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Instrucciones adicionales (opcional)</label>
                  <input
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Ej. enfatizar plazo de caducidad, citar última jurisprudencia..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 space-y-1">
                <p><strong>Garantías:</strong></p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Modelo Claude (último disponible) por defecto.</li>
                  <li>Sistema-prompt nivel abogado(a) senior, especializado por país.</li>
                  <li>Cero alucinaciones: si la IA duda, marca <code className="bg-white px-1 rounded">[CITA POR VERIFICAR]</code>.</li>
                  <li>Sin "NN" ni placeholders: si falta un dato, lo señala como <code className="bg-white px-1 rounded">[DATO REQUERIDO]</code>.</li>
                  <li>Antes de generar te avisamos si faltan campos.</li>
                </ul>
              </div>
            </>
          )}

          {step === 'preflight' && preflight && (
            <>
              {preflight.status === 'incomplete' ? (
                <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold text-amber-900">Faltan datos obligatorios</h3>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Para generar un(a) <strong>{preflight.docLabel}</strong> de calidad profesional necesito estos datos.
                        Llénalos manualmente o pídele a la IA que los extraiga del expediente.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-50 border-2 border-emerald-300 p-4 flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-emerald-900">Todos los datos están listos</h3>
                    <p className="text-xs text-emerald-800 mt-0.5">Puedes generar el documento ahora.</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {preflight.missing.map((f) => (
                  <div key={f.key} className="rounded-xl border border-amber-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="text-[12px] font-bold text-slate-800 inline-flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        {f.label}
                      </label>
                      <button
                        onClick={() => suggestField(f)}
                        disabled={aiSuggestingFor === f.key}
                        className="text-[10px] inline-flex items-center gap-1 font-bold px-2 py-1 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow disabled:opacity-50"
                      >
                        {aiSuggestingFor === f.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Sugerir con IA
                      </button>
                    </div>
                    <input
                      value={supplied[f.key] ?? ''}
                      onChange={(e) => setSupplied((s) => ({ ...s, [f.key]: e.target.value }))}
                      placeholder={`Escribe ${f.label.toLowerCase()}…`}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200"
                    />
                  </div>
                ))}
              </div>

              {preflight.present.length > 0 && (
                <details className="rounded-xl bg-slate-50 border border-slate-200">
                  <summary className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer">
                    {preflight.present.length} datos detectados ✓
                  </summary>
                  <ul className="px-3 pb-3 space-y-1 text-[12px] text-slate-600">
                    {preflight.present.map((f) => (
                      <li key={f.key}><strong>{f.label}:</strong> {f.value}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}

          {step === 'generate' && (
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-violet-700 mb-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Redactando con IA — modelo experto en {preflight?.country?.name ?? 'tu jurisdicción'}…
              </div>
              <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-4 font-sans min-h-[300px]">
                {generated || <span className="text-slate-400 italic">Esperando primer chunk…</span>}
              </pre>
            </div>
          )}

          {step === 'review' && (
            <div>
              <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-4 font-sans min-h-[300px]">
                {generated}
              </pre>
              {savedDocId && (
                <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-2.5 inline-flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Documento agregado al expediente del caso.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer / actions */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2">
          {step === 'pick' && (
            <>
              <button onClick={closeAndReset} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button
                onClick={runPreflight}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-bold text-sm shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02] transition-all disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Verificar datos
              </button>
            </>
          )}

          {step === 'preflight' && preflight && (
            <>
              <button onClick={() => setStep('pick')} className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg inline-flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" />
                Cambiar tipo
              </button>
              <div className="flex items-center gap-2 ml-auto">
                {preflight.status === 'incomplete' && (
                  <button
                    onClick={() => stream(true)}
                    className="px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 rounded-lg"
                    title="La IA marcará los faltantes como [DATO REQUERIDO]"
                  >
                    Generar igual con marcadores
                  </button>
                )}
                <button
                  onClick={() => stream(false)}
                  disabled={preflight.status !== 'ok'}
                  className={cn(
                    'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all',
                    preflight.status === 'ok'
                      ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02]'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  Generar documento
                </button>
              </div>
            </>
          )}

          {step === 'generate' && streaming && (
            <button
              onClick={() => abortRef.current?.abort()}
              className="ml-auto px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 rounded-lg"
            >
              Detener
            </button>
          )}

          {step === 'review' && (
            <>
              <button onClick={() => stream(false)} className="px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg inline-flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" />
                Re-generar
              </button>
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                <button onClick={copyToClipboard} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg">
                  {copyOk ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copyOk ? 'Copiado' : 'Copiar'}
                </button>
                {!savedDocId ? (
                  <button onClick={saveToCase} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow">
                    <FolderPlus className="w-3.5 h-3.5" />
                    Adjuntar al expediente
                  </button>
                ) : (
                  <button onClick={downloadDocx} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-gradient-to-br from-indigo-600 to-violet-600 hover:scale-[1.02] rounded-lg shadow-lg">
                    <Download className="w-3.5 h-3.5" />
                    Descargar .docx
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
