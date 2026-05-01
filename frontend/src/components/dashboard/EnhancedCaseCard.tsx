'use client';

import React, { useState } from 'react';
import { Clock, FileText, MessageSquare, MoreVertical, Sparkles } from 'lucide-react';
import { legalTypeConfig, LegalType, Priority } from '@/lib/design-tokens';
import { LegalTypeBadge } from '@/components/ui/LegalTypeBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { CaseAiSummaryModal } from './CaseAiSummaryModal';

interface AiSummary {
  headline?: string;
  teaser?: string;
  summary?: string;
  keyFacts?: string[];
  legalAreas?: string[];
  risks?: string[];
  nextSteps?: string[];
  estimatedComplexity?: 'baja' | 'media' | 'alta';
  urgency?: 'baja' | 'media' | 'alta' | 'crítica';
  generatedAt?: string;
  model?: string;
  provider?: string;
}

interface EnhancedCaseCardProps {
  caseData: {
    id: string;
    title: string;
    legalType?: LegalType;
    priority?: Priority;
    status: string;
    clientName: string;
    caseNumber?: string;
    nextAction?: {
      description: string;
      dueDate: string;
      daysUntilDue: number;
    };
    progress?: number;
    documentCount?: number;
    queryCount?: number;
    createdAt: string;
    aiSummary?: AiSummary | null;
  };
}

export function EnhancedCaseCard({ caseData }: EnhancedCaseCardProps) {
  const legalType: LegalType = (caseData.legalType as LegalType) || 'civil';
  const priority: Priority = (caseData.priority as Priority) || 'medium';
  const config = legalTypeConfig[legalType];

  const progress = caseData.progress || Math.floor(Math.random() * 40 + 30);
  const documentCount = caseData.documentCount || 0;
  const queryCount = caseData.queryCount || 0;

  const [showSummary, setShowSummary] = useState(false);

  const teaser =
    caseData.aiSummary?.teaser ||
    caseData.aiSummary?.headline ||
    'Toca para generar un super-resumen IA del caso';

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSummary(true);
  };

  return (
    <>
      <article
        onClick={handleCardClick}
        className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border-l-4 h-full flex flex-col cursor-pointer group"
        style={{ borderLeftColor: config.color }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="text-3xl">{config.icon}</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                {caseData.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                <LegalTypeBadge legalType={legalType} size="md" showIcon={false} />
                <PriorityBadge priority={priority} size="md" />
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* AI Teaser — el super-resumen breve */}
        <div
          className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-3 mb-4 group-hover:border-emerald-400 group-hover:shadow-sm transition-all"
        >
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                Super-resumen IA
              </p>
              <p className="text-sm text-emerald-900 line-clamp-2 leading-snug">
                {teaser}
              </p>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="space-y-1.5 text-sm text-gray-600 mb-4">
          <div>
            <span className="font-medium">Cliente:</span> {caseData.clientName}
          </div>
          {caseData.caseNumber && (
            <div>
              <span className="font-medium">Caso Nº:</span> {caseData.caseNumber}
            </div>
          )}
          <div>
            <span className="font-medium">Estado:</span> {caseData.status}
          </div>
        </div>

        {/* Next Action (if exists) */}
        {caseData.nextAction && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-900 mb-1">Próxima acción:</p>
                <p className="text-sm text-amber-800 mb-1">{caseData.nextAction.description}</p>
                <p className="text-xs text-amber-600">
                  Vence: {caseData.nextAction.dueDate} ({caseData.nextAction.daysUntilDue} días)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Progreso del caso</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: config.color,
              }}
            />
          </div>
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100 mt-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>{documentCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>{queryCount}</span>
            </div>
          </div>
          <div className="text-gray-400">
            {new Date(caseData.createdAt).toLocaleDateString('es-EC', {
              day: 'numeric',
              month: 'short',
            })}
          </div>
        </div>
      </article>

      {showSummary && (
        <CaseAiSummaryModal
          caseId={caseData.id}
          caseTitle={caseData.title}
          initialSummary={caseData.aiSummary || null}
          onClose={() => setShowSummary(false)}
        />
      )}
    </>
  );
}
