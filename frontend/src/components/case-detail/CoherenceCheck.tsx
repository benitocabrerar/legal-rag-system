'use client';

/**
 * Verificador de coherencia: revisa cada vez que se carga el caso si hay
 * inconsistencias entre los datos declarados (materia, tipo de acción,
 * juzgado, normas) y el contenido real (descripción + documentos).
 *
 * Muestra warnings con score de coherencia y permite reparar:
 *   - "Aplicar sugerencias automáticas" (heurística rápida sin IA)
 *   - "Reparar con IA" (llama extract-case-data y aplica empty-only)
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  ShieldCheck, ShieldAlert, Sparkles, RefreshCw, Check, X, AlertTriangle,
  ChevronDown, ChevronUp,
} from 'lucide-react';

interface Warning {
  field: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggested?: string;
}

interface CoherenceResult {
  coherenceScore: number;
  warnings: Warning[];
  detectedMatter: string | null;
  currentMatter: string | null;
  documentsAnalyzed: number;
}

const FIELD_LABELS: Record<string, string> = {
  legalMatter: 'Materia',
  actionType: 'Tipo de acción',
  courtName: 'Tribunal',
  relatedLaws: 'Normas aplicables',
  title: 'Título',
  clientName: 'Cliente',
  judicialProcessNumber: 'N° de proceso',
  nextHearingAt: 'Próxima audiencia',
};

const SEVERITY_STYLES = {
  high: 'bg-red-50 border-red-300 text-red-900',
  medium: 'bg-amber-50 border-amber-300 text-amber-900',
  low: 'bg-blue-50 border-blue-300 text-blue-900',
};

const SEVERITY_ICONS = {
  high: '🔴',
  medium: '🟡',
  low: '🔵',
};

interface Props {
  caseId: string;
  /** Trigger para re-validar tras un guardado */
  triggerKey?: number;
  onRepaired?: () => void;
}

export function CoherenceCheck({ caseId, triggerKey, onRepaired }: Props) {
  const [result, setResult] = useState<CoherenceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [applyingSuggestion, setApplyingSuggestion] = useState<string | null>(null);

  useEffect(() => {
    validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, triggerKey]);

  const validate = async () => {
    setLoading(true);
    try {
      const r = await api.post(`/cases/${caseId}/validate-coherence`, {});
      setResult(r.data);
    } catch (e) {
      console.error('Coherence check error:', e);
    } finally {
      setLoading(false);
    }
  };

  const applySuggested = async (w: Warning) => {
    if (!w.suggested) return;
    setApplyingSuggestion(w.field);
    try {
      const payload: any = {};
      if (w.field === 'relatedLaws') {
        payload[w.field] = (w.suggested || '').split(',').map(s => s.trim()).filter(Boolean);
      } else {
        payload[w.field] = w.suggested;
      }
      await api.patch(`/cases/${caseId}`, payload);
      onRepaired?.();
      await validate();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al aplicar sugerencia');
    } finally {
      setApplyingSuggestion(null);
    }
  };

  const repairWithAI = async () => {
    setRepairing(true);
    try {
      // 1) Extract con IA
      const ex = await api.post(`/cases/${caseId}/extract-case-data`, {});
      const e = ex.data.extracted || {};
      // 2) Construir payload solo de los warnings conocidos
      const payload: any = {};
      const map: Record<string, any> = {
        legalMatter: e.legal_matter,
        actionType: e.action_type,
        jurisdiction: e.jurisdiction,
        judicialProcessNumber: e.judicial_process_number,
        courtName: e.court_name,
        courtUnit: e.court_unit,
        judgeName: e.judge_name,
        prosecutorName: e.prosecutor_name,
        opposingParty: e.opposing_party,
        relatedLaws: e.related_laws,
        proceduralStage: e.procedural_stage,
        factsSummary: e.facts_summary,
      };
      // Aplicar solo los campos no vacíos extraídos por IA
      for (const [k, v] of Object.entries(map)) {
        if (v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)) {
          payload[k] = v;
        }
      }
      if (Object.keys(payload).length === 0) {
        alert('La IA no detectó cambios para aplicar.');
        return;
      }
      await api.patch(`/cases/${caseId}`, payload);
      onRepaired?.();
      await validate();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al reparar con IA');
    } finally {
      setRepairing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-xs text-gray-500 flex items-center gap-2">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Validando coherencia del caso...
      </div>
    );
  }

  if (!result) return null;

  const { coherenceScore, warnings } = result;

  // Caso "perfecto"
  if (warnings.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 mb-4 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-900">
            ✓ Datos coherentes ({coherenceScore}/100)
          </p>
          <p className="text-xs text-emerald-700">
            Materia, partes, normas y procesos están alineados con el contenido del caso.
          </p>
        </div>
        <button
          onClick={validate}
          className="text-xs text-emerald-600 hover:text-emerald-800 underline-offset-4 hover:underline"
        >
          Re-validar
        </button>
      </div>
    );
  }

  const highCount = warnings.filter(w => w.severity === 'high').length;
  const mediumCount = warnings.filter(w => w.severity === 'medium').length;
  const scoreColor = coherenceScore >= 75 ? 'text-emerald-700'
    : coherenceScore >= 50 ? 'text-amber-700' : 'text-red-700';
  const ringColor = coherenceScore >= 75 ? 'ring-emerald-300'
    : coherenceScore >= 50 ? 'ring-amber-300' : 'ring-red-300';

  return (
    <div className={`bg-white border-2 rounded-xl mb-4 shadow-sm overflow-hidden ${highCount > 0 ? 'border-red-300' : mediumCount > 0 ? 'border-amber-300' : 'border-blue-300'}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } }}
        className="w-full flex items-center justify-between px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className={`relative w-12 h-12 rounded-full ring-4 ${ringColor} flex items-center justify-center bg-white`}>
            <span className={`text-lg font-bold ${scoreColor}`}>{coherenceScore}</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Verificación de coherencia
            </p>
            <p className="text-xs text-gray-700">
              {highCount > 0 && <span className="text-red-700 font-semibold">{highCount} crítica{highCount !== 1 && 's'}</span>}
              {highCount > 0 && (mediumCount > 0 || warnings.length - highCount - mediumCount > 0) && ' · '}
              {mediumCount > 0 && <span className="text-amber-700 font-semibold">{mediumCount} importante{mediumCount !== 1 && 's'}</span>}
              {mediumCount > 0 && warnings.length - highCount - mediumCount > 0 && ' · '}
              {warnings.length - highCount - mediumCount > 0 && (
                <span className="text-blue-700">{warnings.length - highCount - mediumCount} info</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); repairWithAI(); }}
            disabled={repairing}
            className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1"
          >
            {repairing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {repairing ? 'Reparando...' : 'Reparar con IA'}
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 py-3 space-y-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`border rounded-lg p-3 flex items-start gap-3 ${SEVERITY_STYLES[w.severity]}`}
            >
              <span className="text-base flex-shrink-0">{SEVERITY_ICONS[w.severity]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider opacity-75">
                  {FIELD_LABELS[w.field] || w.field}
                </p>
                <p className="text-sm mt-0.5">{w.message}</p>
                {w.suggested && (
                  <p className="text-xs mt-1 opacity-75">
                    <strong>Sugerencia:</strong> <code className="bg-white/60 px-1.5 py-0.5 rounded">{w.suggested}</code>
                  </p>
                )}
              </div>
              {w.suggested && (
                <button
                  onClick={() => applySuggested(w)}
                  disabled={applyingSuggestion === w.field}
                  className="text-xs px-2.5 py-1 bg-white border border-current rounded font-semibold hover:bg-current hover:text-white transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {applyingSuggestion === w.field ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Aplicar
                </button>
              )}
            </div>
          ))}

          <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <span>
              {result.documentsAnalyzed > 0
                ? `Analizados ${result.documentsAnalyzed} documentos`
                : 'Sin documentos cargados aún'}
              {result.detectedMatter && (
                <> · Materia detectada por contenido: <strong>{result.detectedMatter}</strong></>
              )}
            </span>
            <button
              onClick={validate}
              className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Re-validar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
