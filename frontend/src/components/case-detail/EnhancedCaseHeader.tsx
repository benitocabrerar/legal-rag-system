'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MoreVertical,
  FileText,
  Download,
  Share2,
  Archive,
  Edit,
  Clock,
  User,
  Calendar,
} from 'lucide-react';
import { LegalType, Priority, legalTypeConfig } from '@/lib/design-tokens';
import { LegalTypeBadge } from '@/components/ui/LegalTypeBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';

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
}

export function EnhancedCaseHeader({ caseData }: EnhancedCaseHeaderProps) {
  const legalType = (caseData.legalType as LegalType) || 'civil';
  const priority = (caseData.priority as Priority) || 'medium';
  const config = legalTypeConfig[legalType];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Top Bar with Back Button and Actions */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver al Panel
        </Link>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors group" title="Generar reporte">
            <FileText className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors group" title="Descargar">
            <Download className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors group" title="Compartir">
            <Share2 className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors group" title="Archivar">
            <Archive className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors group">
            <MoreVertical className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
          </button>
        </div>
      </div>

      {/* Main Header Content */}
      <div
        className="p-6 border-l-4"
        style={{
          borderLeftColor: config.color,
          background: `linear-gradient(135deg, ${config.color}05 0%, ${config.color}10 100%)`,
        }}
      >
        <div className="flex items-start justify-between mb-4">
          {/* Left: Icon & Title */}
          <div className="flex items-start gap-4 flex-1">
            <div className="text-5xl">{config.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-gray-900">{caseData.title}</h1>
                <button
                  className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                  title="Editar caso"
                >
                  <Edit className="w-5 h-5 text-gray-500 hover:text-gray-700" />
                </button>
              </div>

              {/* Badges Row */}
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

              {/* Description */}
              {caseData.description && (
                <p className="text-gray-700 leading-relaxed mb-4 max-w-3xl">{caseData.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <User className="w-5 h-5" style={{ color: config.color }} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Cliente</p>
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
    </div>
  );
}
