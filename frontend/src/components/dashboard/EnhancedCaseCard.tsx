'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, FileText, MessageSquare, MoreVertical } from 'lucide-react';
import { legalTypeConfig, LegalType, Priority } from '@/lib/design-tokens';
import { LegalTypeBadge } from '@/components/ui/LegalTypeBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';

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
  };
}

export function EnhancedCaseCard({ caseData }: EnhancedCaseCardProps) {
  const legalType: LegalType = (caseData.legalType as LegalType) || 'civil';
  const priority: Priority = (caseData.priority as Priority) || 'medium';
  const config = legalTypeConfig[legalType];

  const progress = caseData.progress || Math.floor(Math.random() * 40 + 30);
  const documentCount = caseData.documentCount || 0;
  const queryCount = caseData.queryCount || 0;

  return (
    <Link href={`/dashboard/cases/${caseData.id}`} className="block group">
      <article
        className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border-l-4 h-full flex flex-col"
        style={{ borderLeftColor: config.color }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="text-3xl">{config.icon}</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
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
              // Handle menu click
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
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
    </Link>
  );
}
