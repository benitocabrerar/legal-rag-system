'use client';

/**
 * DocumentUploadProgress — Modal moderno que muestra el progreso real
 * (vía SSE desde /documents/upload-stream) de la pipeline de upload + IA:
 *   1. Recibiendo archivo
 *   2. Leyendo contenido con IA (extract-text)
 *   3. Guardando en el expediente
 *   4. Dividiendo en pasajes
 *   5. Vectorizando con embeddings
 *   6. Sintetizando el "cerebro" del caso (síntesis ejecutiva multi-doc)
 *
 * Al terminar muestra un resumen con: chunks creados, partes detectadas,
 * nivel de riesgo, próximas acciones sugeridas — todo generado por la IA.
 */

import { useEffect, useRef, useState } from 'react';
import {
  X, CheckCircle2, AlertTriangle, Sparkles, FileText, Upload, Brain,
  Scissors, Database, ScanLine, ListChecks, AlertCircle,
} from 'lucide-react';
import { getAuthToken } from '@/lib/get-auth-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type StageKey = 'upload' | 'extract' | 'store' | 'chunk' | 'embed' | 'synthesize' | 'done';

interface StageDef {
  key: StageKey;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const STAGES: StageDef[] = [
  { key: 'upload',     label: 'Recibiendo archivo',         description: 'Transmitiendo y validando el documento', Icon: Upload },
  { key: 'extract',    label: 'Leyendo contenido',           description: 'OCR + extracción inteligente con IA', Icon: ScanLine },
  { key: 'store',      label: 'Guardando en el expediente',  description: 'Persistiendo en almacenamiento seguro', Icon: Database },
  { key: 'chunk',      label: 'Dividiendo en pasajes',       description: 'Segmentación semántica para búsqueda',  Icon: Scissors },
  { key: 'embed',      label: 'Vectorizando con IA',         description: 'Indexando para búsqueda semántica',     Icon: Sparkles },
  { key: 'synthesize', label: 'Sintetizando cerebro',        description: 'Integrando al conocimiento del caso',   Icon: Brain },
];

interface BrainSummary {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  nextActions: Array<{ action: string; deadline?: string; priority: 'low' | 'medium' | 'high' }>;
  keyFactsCount: number;
  keyDatesCount: number;
  partiesCount: number;
  applicableLawsCount: number;
  gapsCount: number;
  documentCount: number;
  generatedAt: string;
  model: string;
}

interface ResultPayload {
  document: {
    id: string;
    title: string;
    mimeType: string;
    size: number;
    chunksCount: number;
    extractMethod: string;
    createdAt: string;
  };
  brain: BrainSummary | null;
}

interface Props {
  caseId: string;
  file: File | null;
  open: boolean;
  onClose: () => void;
  onComplete?: (result: ResultPayload) => void;
}

export default function DocumentUploadProgress({ caseId, file, open, onClose, onComplete }: Props) {
  const [currentStage, setCurrentStage] = useState<StageKey>('upload');
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState('Preparando…');
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const fileStartedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !file) return;
    // Evitar relanzar el mismo upload si el modal se re-renderiza
    const fileKey = `${file.name}:${file.size}:${file.lastModified}`;
    if (fileStartedRef.current === fileKey) return;
    fileStartedRef.current = fileKey;

    setCurrentStage('upload');
    setPercent(0);
    setMessage('Conectando con el servidor…');
    setResult(null);
    setError(null);
    setWarnings([]);

    const ac = new AbortController();
    abortRef.current = ac;

    const run = async () => {
      try {
        const token = await getAuthToken();
        const fd = new FormData();
        fd.append('caseId', caseId);
        fd.append('title', file.name.replace(/\.[^.]+$/, ''));
        fd.append('file', file);

        const res = await fetch(`${API_URL}/api/v1/documents/upload-stream`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          const txt = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200) || 'sin respuesta'}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const ev of events) {
            const eventLine = ev.split('\n').find((l) => l.startsWith('event: '));
            const dataLine  = ev.split('\n').find((l) => l.startsWith('data: '));
            if (!eventLine || !dataLine) continue;
            const eventName = eventLine.slice(7).trim();
            let payload: any;
            try { payload = JSON.parse(dataLine.slice(6)); } catch { continue; }

            if (eventName === 'stage') {
              if (payload?.stage) setCurrentStage(payload.stage as StageKey);
              if (typeof payload?.percent === 'number') setPercent(payload.percent);
              if (payload?.message) setMessage(payload.message);
              if (payload?.warning) setWarnings((w) => [...w, payload.warning]);
            } else if (eventName === 'result') {
              setResult(payload as ResultPayload);
              setPercent(100);
              setCurrentStage('done');
              setMessage('Documento integrado al cerebro del caso ✨');
              onComplete?.(payload as ResultPayload);
            } else if (eventName === 'error') {
              setError(payload?.message || 'Error desconocido');
            }
          }
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(e?.message || 'Conexión interrumpida');
      }
    };

    run();
    return () => {
      ac.abort();
      abortRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file?.name, file?.size, file?.lastModified, caseId]);

  if (!open) return null;

  const isComplete = !!result && currentStage === 'done';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Top accent + close */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <button
          onClick={onClose}
          aria-label="Cerrar"
          disabled={!isComplete && !error}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-7 pt-7 pb-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur opacity-50 animate-pulse" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 grid place-items-center text-white">
                {isComplete ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : error ? (
                  <AlertCircle className="w-7 h-7" />
                ) : (
                  <Brain className="w-7 h-7 animate-pulse" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {isComplete ? 'Cerebro del caso actualizado' : error ? 'Algo salió mal' : 'Integrando documento con IA'}
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {file?.name ? <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{file.name}</span> : null}
                {file ? ` · ${(file.size / 1024).toFixed(1)} KB` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-7 pb-3">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{message}</span>
            <span className="text-lg font-bold text-indigo-700 tabular-nums">{Math.round(percent)}%</span>
          </div>
          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${error ? 'from-red-400 to-red-600' : 'from-indigo-500 via-purple-500 to-pink-500'} transition-all duration-300 ease-out`}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
        </div>

        {/* Stages */}
        <div className="px-7 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STAGES.map((s, idx) => {
            const stageIdx = STAGES.findIndex((x) => x.key === currentStage);
            const isActive = s.key === currentStage && !isComplete && !error;
            const isDone = isComplete || (stageIdx > idx);
            const StageIcon = s.Icon;
            return (
              <div
                key={s.key}
                className={`
                  relative rounded-xl p-3 transition-all duration-300
                  ${isActive ? 'bg-indigo-50 ring-2 ring-indigo-300 shadow-sm' : ''}
                  ${isDone && !isActive ? 'bg-emerald-50/50' : ''}
                  ${!isActive && !isDone ? 'bg-gray-50' : ''}
                `}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`
                    relative w-8 h-8 rounded-lg grid place-items-center transition-all
                    ${isActive ? 'bg-indigo-600 text-white' : ''}
                    ${isDone && !isActive ? 'bg-emerald-500 text-white' : ''}
                    ${!isActive && !isDone ? 'bg-gray-200 text-gray-500' : ''}
                  `}>
                    {isDone && !isActive ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <StageIcon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                    )}
                    {isActive && (
                      <span className="absolute inset-0 rounded-lg ring-2 ring-indigo-400 animate-ping opacity-40" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-semibold ${isActive ? 'text-indigo-900' : isDone ? 'text-emerald-700' : 'text-gray-500'}`}>
                      {s.label}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Warnings */}
        {warnings.length > 0 && !error && (
          <div className="mx-7 mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-xs uppercase tracking-wider mb-1">Advertencias</div>
              <ul className="list-disc list-inside space-y-0.5">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-7 mb-5 p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-900">
            <div className="font-semibold mb-1">No se pudo procesar el documento</div>
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {/* Result */}
        {isComplete && result && (
          <div className="px-7 pb-6">
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900">Cerebro del caso</h3>
                {result.brain && (
                  <span className={`
                    ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                    ${result.brain.riskLevel === 'high'
                      ? 'bg-red-100 text-red-700'
                      : result.brain.riskLevel === 'medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'}
                  `}>
                    Riesgo {result.brain.riskLevel === 'high' ? 'Alto' : result.brain.riskLevel === 'medium' ? 'Medio' : 'Bajo'}
                  </span>
                )}
              </div>

              {result.brain ? (
                <>
                  <p className="text-sm text-gray-700 leading-relaxed mb-4 line-clamp-4">
                    {result.brain.summary}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    <Stat label="Documentos" value={result.brain.documentCount} icon={FileText} />
                    <Stat label="Partes" value={result.brain.partiesCount} icon={ListChecks} />
                    <Stat label="Fechas clave" value={result.brain.keyDatesCount} icon={ListChecks} />
                    <Stat label="Hechos" value={result.brain.keyFactsCount} icon={ListChecks} />
                    <Stat label="Normas" value={result.brain.applicableLawsCount} icon={ListChecks} />
                    <Stat label="Vacíos" value={result.brain.gapsCount} icon={AlertTriangle} highlight={result.brain.gapsCount > 0} />
                  </div>
                  {result.brain.nextActions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Próximas acciones sugeridas</h4>
                      <ul className="space-y-1.5">
                        {result.brain.nextActions.slice(0, 3).map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className={`
                              mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold flex-shrink-0
                              ${a.priority === 'high'
                                ? 'bg-red-100 text-red-700'
                                : a.priority === 'medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-600'}
                            `}>
                              {i + 1}
                            </span>
                            <span className="text-gray-800">{a.action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center justify-between text-xs text-gray-500">
                    <span>{result.document.chunksCount.toLocaleString()} pasajes indexados · {result.document.extractMethod}</span>
                    <span className="font-mono">{result.brain.model}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  Documento indexado correctamente ({result.document.chunksCount.toLocaleString()} pasajes).
                  El cerebro del caso se sintetizará en segundo plano cuando estén los recursos disponibles.
                </p>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-sm hover:shadow transition-all"
              >
                Continuar trabajando
              </button>
            </div>
          </div>
        )}

        {/* Cancel button when in progress */}
        {!isComplete && !error && (
          <div className="px-7 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              La IA procesa el documento. Esto suele tardar 20-60 segundos.
            </span>
            <button
              onClick={() => { abortRef.current?.abort(); onClose(); }}
              className="text-xs text-gray-600 hover:text-gray-900 font-medium"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, highlight = false }: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg px-3 py-2 ${highlight ? 'bg-amber-50 border border-amber-200' : 'bg-white/70 border border-gray-100'}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-lg font-bold tabular-nums ${highlight ? 'text-amber-700' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
