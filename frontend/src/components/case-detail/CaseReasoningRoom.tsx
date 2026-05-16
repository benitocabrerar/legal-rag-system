'use client';

/**
 * Sala de Razonamiento Jurídico.
 *
 * El abogado escribe su propio análisis y lo debate con la IA. La IA pone el
 * planteamiento a prueba con argumentos jurídicos; si el abogado insiste, todo
 * queda registrado. El resultado se incorpora al cerebro del caso como un
 * documento fechado.
 *
 * Flujo: elegir modo → debatir → generar documento (editable) → agregar al
 * cerebro del caso.
 */
import { useState } from 'react';
import { api } from '@/lib/api';
import {
  Brain, X, Gavel, PenLine, Target, Swords, Send, Loader2, ChevronLeft,
  FileText, Check, Sparkles, AlertCircle,
} from 'lucide-react';

interface Props {
  open: boolean;
  caseId: string;
  caseTitle?: string;
  onClose: () => void;
}

interface Msg { role: 'lawyer' | 'ai'; content: string }

const TYPES = [
  { key: 'tesis', label: 'Tesis del Caso', icon: Gavel, color: 'indigo',
    desc: 'Sostené una posición jurídica; la IA la pone a prueba con la objeción más fuerte.' },
  { key: 'razonamiento', label: 'Razonamiento del Abogado', icon: PenLine, color: 'emerald',
    desc: 'Pensá en voz alta; la IA acompaña y afina tu razonamiento.' },
  { key: 'estrategia', label: 'Mesa de Estrategia', icon: Target, color: 'amber',
    desc: 'Evaluá una diligencia o decisión —pericia, investigación— con la IA.' },
  { key: 'deliberacion', label: 'Deliberación Jurídica', icon: Swords, color: 'rose',
    desc: 'Debatí un punto controvertido; la IA hace de abogado del diablo.' },
] as const;

const COLOR: Record<string, { grad: string; soft: string; text: string; ring: string }> = {
  indigo:  { grad: 'from-indigo-600 to-blue-600',   soft: 'bg-indigo-50',  text: 'text-indigo-700',  ring: 'hover:border-indigo-300' },
  emerald: { grad: 'from-emerald-600 to-green-600', soft: 'bg-emerald-50', text: 'text-emerald-700', ring: 'hover:border-emerald-300' },
  amber:   { grad: 'from-amber-500 to-orange-600',  soft: 'bg-amber-50',   text: 'text-amber-700',   ring: 'hover:border-amber-300' },
  rose:    { grad: 'from-rose-600 to-pink-600',     soft: 'bg-rose-50',    text: 'text-rose-700',    ring: 'hover:border-rose-300' },
};

export default function CaseReasoningRoom({ open, caseId, caseTitle, onClose }: Props) {
  const [step, setStep] = useState<'pick' | 'work' | 'doc'>('pick');
  const [typeKey, setTypeKey] = useState<string>('tesis');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [debating, setDebating] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const type = TYPES.find((t) => t.key === typeKey) || TYPES[0];
  const c = COLOR[type.color];

  const resetAll = () => {
    setStep('pick'); setTypeKey('tesis'); setMessages([]); setInput('');
    setDebating(false); setDocTitle(''); setDocContent(''); setSaving(false); setError('');
  };
  const handleClose = () => { resetAll(); onClose(); };

  const pickType = (k: string) => {
    setTypeKey(k); setMessages([]); setInput(''); setError(''); setStep('work');
  };

  const debate = async () => {
    const text = input.trim();
    if (!text || debating) return;
    const next: Msg[] = [...messages, { role: 'lawyer', content: text }];
    setMessages(next);
    setInput('');
    setDebating(true);
    setError('');
    try {
      const r = await api.post<{ reply: string }>(`/cases/${caseId}/reasoning-debate`, {
        entryType: typeKey,
        messages: next,
      });
      setMessages([...next, { role: 'ai', content: r.data.reply || '(sin respuesta)' }]);
    } catch (e: any) {
      setMessages(next);
      setError(e?.response?.data?.error || e?.message || 'No se pudo debatir con la IA.');
    } finally {
      setDebating(false);
    }
  };

  const buildDocument = () => {
    const fecha = new Date().toLocaleString('es-EC', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const cuerpo = messages.map((m) =>
      m.role === 'lawyer'
        ? `**Abogado:**\n${m.content}`
        : `**IA — contraargumento y consideraciones:**\n${m.content}`,
    ).join('\n\n');
    const doc =
      `# ${type.label}\n\n` +
      `**Caso:** ${caseTitle || '—'}  \n` +
      `**Fecha:** ${fecha}  \n` +
      `**Análisis del abogado asistido por IA · modo ${type.label}**\n\n` +
      `## Desarrollo del razonamiento\n\n${cuerpo}\n\n` +
      `## Decisión / conclusión del abogado\n` +
      `_(Escribí acá tu decisión final. Las objeciones de la IA quedan registradas más ` +
      `arriba — si decidís proceder pese a ellas, también queda constancia.)_\n`;
    setDocContent(doc);
    setDocTitle(type.label);
    setError('');
    setStep('doc');
  };

  const save = async () => {
    if (saving) return;
    if (docContent.trim().length < 20) { setError('El documento está vacío.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post(`/cases/${caseId}/reasoning-save`, {
        entryType: typeKey,
        title: docTitle.trim() || type.label,
        content: docContent,
      });
      window.dispatchEvent(new CustomEvent('poweria:legal-analysis-saved', { detail: { caseId } }));
      handleClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white sm:rounded-2xl shadow-2xl flex flex-col max-h-screen sm:max-h-[92vh] overflow-hidden">
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${c.grad}`} />

        {/* Header */}
        <div className="shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100 flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.grad} grid place-items-center text-white shadow-md shrink-0`}>
            <Brain className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 leading-tight">Sala de Razonamiento Jurídico</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {step === 'pick' ? 'Elegí cómo querés trabajar' : type.label}
              {step !== 'pick' && ' · asistido por IA'}
            </p>
          </div>
          <button onClick={handleClose} aria-label="Cerrar"
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4">
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-900">{error}</div>
            </div>
          )}

          {/* PASO 1 — elegir modo */}
          {step === 'pick' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TYPES.map((t) => {
                const Icon = t.icon;
                const tc = COLOR[t.color];
                return (
                  <button
                    key={t.key}
                    onClick={() => pickType(t.key)}
                    className={`text-left p-4 rounded-xl border-2 border-gray-200 ${tc.ring} hover:shadow-md transition-all`}
                  >
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tc.grad} grid place-items-center text-white shadow-sm mb-2.5`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-gray-900 text-sm">{t.label}</div>
                    <div className="text-xs text-gray-500 mt-1 leading-relaxed">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* PASO 2 — debatir */}
          {step === 'work' && (
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className={`p-4 rounded-xl ${c.soft} border border-gray-100`}>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Escribí tu planteamiento. La IA lo va a <strong>poner a prueba</strong> con
                    argumentos jurídicos — no para frenarte, sino para que tu posición salga
                    más sólida. La decisión siempre es tuya.
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'lawyer' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'lawyer'
                      ? `bg-gradient-to-br ${c.grad} text-white`
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                      m.role === 'lawyer' ? 'text-white/70' : c.text}`}>
                      {m.role === 'lawyer' ? 'Vos' : 'IA'}
                    </div>
                    {m.content}
                  </div>
                </div>
              ))}
              {debating && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-3.5 py-2.5 bg-gray-100 border border-gray-200 inline-flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> La IA está analizando tu planteamiento…
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 3 — documento editable */}
          {step === 'doc' && (
            <div className="space-y-3">
              <div className={`p-3 rounded-lg ${c.soft} text-xs text-gray-600 flex items-start gap-2`}>
                <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${c.text}`} />
                <span>
                  Este es el documento de tu análisis. Editalo libremente — completá tu
                  decisión final. Al agregarlo al cerebro, la IA lo usará para redactar
                  mejores documentos del caso.
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Título</label>
                <input
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Documento (editable)</label>
                <textarea
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  rows={16}
                  className="w-full px-3 py-2.5 text-sm text-gray-800 font-mono leading-relaxed border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 sm:px-6 py-3 bg-gray-50 border-t border-gray-100">
          {step === 'work' && (
            <>
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void debate(); } }}
                  placeholder="Escribí tu planteamiento o tu réplica…"
                  rows={2}
                  disabled={debating}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
                />
                <button
                  onClick={debate}
                  disabled={debating || !input.trim()}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r ${c.grad} disabled:opacity-50 transition`}
                >
                  {debating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Debatir
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button onClick={() => setStep('pick')}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition">
                  <ChevronLeft className="w-3.5 h-3.5" /> Cambiar de modo
                </button>
                <button
                  onClick={buildDocument}
                  disabled={messages.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-40 transition"
                >
                  <FileText className="w-3.5 h-3.5" /> Generar documento
                </button>
              </div>
            </>
          )}
          {step === 'doc' && (
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => setStep('work')}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition">
                <ChevronLeft className="w-3.5 h-3.5" /> Volver al debate
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-sm disabled:opacity-50 transition"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Agregar al cerebro del caso
              </button>
            </div>
          )}
          {step === 'pick' && (
            <p className="text-[11px] text-gray-400 text-center">
              Tu análisis quedará guardado en el caso, con fecha, y formará parte del cerebro del expediente.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
