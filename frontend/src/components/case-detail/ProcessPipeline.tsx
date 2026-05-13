'use client';

import React, { useState } from 'react';
import { Check, Circle, Clock, RefreshCw, Sparkles } from 'lucide-react';
import { legalTypeConfig, LegalType } from '@/lib/design-tokens';
import { getAuthToken } from '@/lib/get-auth-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PipelineStage {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'pending';
  date?: string;
}

interface ProcessPipelineProps {
  legalType: LegalType;
  currentStage: number;
  stages?: PipelineStage[];
  caseId?: string;
  onStageInferred?: (stageIndex: number, stageLabel: string, rationale: string) => void;
}

const defaultStagesByType: Partial<Record<LegalType, string[]>> = {
  penal: ['Denuncia', 'Instrucción Fiscal', 'Evaluación', 'Juicio', 'Sentencia', 'Ejecución'],
  civil: ['Demanda', 'Contestación', 'Pruebas', 'Audiencia', 'Sentencia', 'Apelación'],
  constitucional: ['Admisión', 'Análisis', 'Audiencia', 'Deliberación', 'Sentencia'],
  transito: ['Citación', 'Revisión', 'Audiencia', 'Resolución', 'Apelación'],
  administrativo: ['Solicitud', 'Evaluación', 'Resolución', 'Recurso', 'Sentencia Final'],
  laboral: ['Demanda', 'Mediación', 'Contestación', 'Audiencia', 'Sentencia', 'Ejecución'],
};

export function ProcessPipeline({ legalType, currentStage, stages, caseId, onStageInferred }: ProcessPipelineProps) {
  const config = legalTypeConfig[legalType];
  // Fallback genérico para tipos legales sin pipeline específico definido
  const stageLabels = defaultStagesByType[legalType] || ['Inicio', 'Trámite', 'Audiencia', 'Resolución', 'Firme'];
  const [inferring, setInferring] = useState(false);
  const [inferError, setInferError] = useState<string | null>(null);
  const [lastRationale, setLastRationale] = useState<string | null>(null);

  const pipelineStages: PipelineStage[] = stages || stageLabels.map((label, index) => ({
    id: `stage-${index}`,
    label,
    status: index < currentStage ? 'completed' : index === currentStage ? 'current' : 'pending',
  }));

  const inferStage = async () => {
    if (!caseId) return;
    setInferring(true);
    setInferError(null);
    try {
      const token = await getAuthToken();
      const r = await fetch(`${API_URL}/api/v1/cases/${caseId}/infer-stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: '{}',
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        throw new Error(`HTTP ${r.status}: ${txt.slice(0, 160)}`);
      }
      const data = await r.json();
      const label = String(data?.stage || data?.stageLabel || '').trim();
      const rationale = String(data?.reasoning || data?.rationale || '').trim();
      if (label) {
        setLastRationale(rationale || null);
        // El padre mantiene el stageMap por tipo legal; le pasamos -1 como hint
        // de "calcula tú el índice a partir del label que te paso".
        onStageInferred?.(-1, label, rationale);
      } else {
        setInferError('La IA no devolvió una etapa válida');
      }
    } catch (e: any) {
      setInferError(e?.message || 'No se pudo inferir la etapa');
    } finally {
      setInferring(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="text-2xl">{config.icon}</div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Proceso {config.label}</h3>
            <p className="text-sm text-gray-500">
              Etapa {currentStage + 1} de {pipelineStages.length}
            </p>
          </div>
        </div>
        {caseId && onStageInferred && (
          <button
            onClick={inferStage}
            disabled={inferring}
            title="Re-evaluar etapa con IA según documentos del caso"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {inferring ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-300 border-t-indigo-700 animate-spin" />
                Analizando…
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <Sparkles className="w-3.5 h-3.5" />
                Re-evaluar IA
              </>
            )}
          </button>
        )}
      </div>

      {(inferError || lastRationale) && (
        <div className="mb-4 p-2.5 rounded-lg border text-xs leading-relaxed"
          style={inferError
            ? { borderColor: '#fecaca', backgroundColor: '#fef2f2', color: '#991b1b' }
            : { borderColor: '#c7d2fe', backgroundColor: '#eef2ff', color: '#3730a3' }}
        >
          {inferError ? inferError : (
            <span><strong>IA:</strong> {lastRationale}</span>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
          <span className="font-medium">Progreso General</span>
          <span className="font-bold">{Math.round(((currentStage + 1) / pipelineStages.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${((currentStage + 1) / pipelineStages.length) * 100}%`,
              backgroundColor: config.color,
            }}
          />
        </div>
      </div>

      {/* Pipeline Stages */}
      <div className="space-y-3">
        {pipelineStages.map((stage, index) => {
          const isCompleted = stage.status === 'completed';
          const isCurrent = stage.status === 'current';
          const isPending = stage.status === 'pending';

          return (
            <div
              key={stage.id}
              className={`relative flex items-start gap-3 p-3 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-gradient-to-r shadow-sm border-2'
                  : isCompleted
                  ? 'bg-gray-50'
                  : 'bg-white border border-gray-200'
              }`}
              style={
                isCurrent
                  ? {
                      backgroundImage: `linear-gradient(135deg, ${config.color}10 0%, ${config.color}20 100%)`,
                      borderColor: config.color,
                    }
                  : {}
              }
            >
              {/* Connector Line */}
              {index < pipelineStages.length - 1 && (
                <div
                  className="absolute left-6 top-12 w-0.5 h-6 -mb-6"
                  style={{
                    backgroundColor: isCompleted ? config.color : '#e5e7eb',
                  }}
                />
              )}

              {/* Status Icon */}
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? 'text-white'
                    : isCurrent
                    ? 'bg-white border-2 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
                style={
                  isCompleted
                    ? { backgroundColor: config.color }
                    : isCurrent
                    ? { borderColor: config.color, color: config.color }
                    : {}
                }
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : isCurrent ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>

              {/* Stage Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4
                    className={`font-semibold ${
                      isCurrent ? 'text-gray-900' : isCompleted ? 'text-gray-700' : 'text-gray-500'
                    }`}
                  >
                    {stage.label}
                  </h4>
                  {isCurrent && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: config.color }}
                    >
                      En Curso
                    </span>
                  )}
                  {isCompleted && <span className="text-xs text-gray-500">✓ Completado</span>}
                </div>
                {stage.date && (
                  <p className="text-xs text-gray-500">
                    {isCompleted ? 'Completado' : 'Iniciado'}: {stage.date}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Next Action */}
      <div
        className="mt-6 p-4 rounded-lg border-2"
        style={{
          backgroundColor: `${config.color}08`,
          borderColor: `${config.color}40`,
        }}
      >
        <div className="flex items-start gap-2">
          <div className="text-xl">💡</div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Próxima Acción Recomendada</h4>
            <p className="text-sm text-gray-700">
              {currentStage === 0
                ? 'Preparar documentación inicial y evidencia para la siguiente etapa'
                : currentStage === pipelineStages.length - 1
                ? 'Revisar cumplimiento de sentencia y documentar resolución final'
                : 'Preparar argumentos y documentación para la próxima etapa del proceso'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
