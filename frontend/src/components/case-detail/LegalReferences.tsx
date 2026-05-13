'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { BookOpen, Scale, FileText, Search, RefreshCw, Sparkles, ExternalLink } from 'lucide-react';
import { LegalType, legalTypeConfig } from '@/lib/design-tokens';
import { getAuthToken } from '@/lib/get-auth-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface LegalReference {
  id: string;
  type: 'constitution' | 'code' | 'law' | 'jurisprudence';
  title: string;
  article?: string;
  description: string;
  url?: string;
  relevance: 'high' | 'medium' | 'low';
}

interface LegalReferencesProps {
  legalType: LegalType;
  references?: LegalReference[];
  /** Si se pasa, el componente intenta cargar referencias REALES desde el
   *  cerebro del caso (applicableLaws sintetizadas por la IA tras cada
   *  upload de documento). Permite refresh manual. */
  caseId?: string;
}

// Mock references by legal type
const mockReferencesByType: Partial<Record<LegalType, LegalReference[]>> = {
  penal: [
    {
      id: '1',
      type: 'constitution',
      title: 'Constitución de la República del Ecuador',
      article: 'Art. 76',
      description: 'Garantías del debido proceso',
      relevance: 'high',
    },
    {
      id: '2',
      type: 'code',
      title: 'Código Orgánico Integral Penal (COIP)',
      article: 'Art. 140-148',
      description: 'Delitos contra la vida',
      relevance: 'high',
    },
    {
      id: '3',
      type: 'jurisprudence',
      title: 'Sentencia 1234-2024-EP',
      description: 'Corte Constitucional sobre presunción de inocencia',
      relevance: 'medium',
    },
  ],
  civil: [
    {
      id: '1',
      type: 'constitution',
      title: 'Constitución de la República del Ecuador',
      article: 'Art. 66',
      description: 'Derechos de libertad y propiedad',
      relevance: 'high',
    },
    {
      id: '2',
      type: 'code',
      title: 'Código Civil',
      article: 'Art. 1561-1572',
      description: 'De las obligaciones civiles y contratos',
      relevance: 'high',
    },
  ],
  laboral: [
    {
      id: '1',
      type: 'constitution',
      title: 'Constitución de la República del Ecuador',
      article: 'Art. 33',
      description: 'Derecho al trabajo',
      relevance: 'high',
    },
    {
      id: '2',
      type: 'code',
      title: 'Código del Trabajo',
      article: 'Art. 172-188',
      description: 'Terminación del contrato de trabajo',
      relevance: 'high',
    },
  ],
};

/** Convierte applicableLaws del cerebro del caso al shape LegalReference. */
function brainLawsToReferences(laws: Array<{ norm: string; reasoning?: string }>): LegalReference[] {
  return laws.map((l, i) => {
    const norm = l.norm || '';
    // Inferir type por keywords del título
    let type: LegalReference['type'] = 'law';
    const lower = norm.toLowerCase();
    if (/constituci[oó]n|carta magna/.test(lower)) type = 'constitution';
    else if (/c[oó]digo/.test(lower)) type = 'code';
    else if (/sentencia|resoluci[oó]n|fallo|providencia/.test(lower)) type = 'jurisprudence';

    // Extraer "Art. X" del título si lo trae
    const artMatch = norm.match(/art(?:[íi]culo)?\.?\s*(\d+[a-z]?)/i);
    return {
      id: `brain-${i}`,
      type,
      title: norm.replace(/^art(?:[íi]culo)?\.?\s*\d+[a-z]?\s*(?:de\s*la?\s*)?/i, '').trim() || norm,
      article: artMatch ? `Art. ${artMatch[1]}` : undefined,
      description: l.reasoning || 'Aplicable según el análisis IA del expediente.',
      relevance: 'high',
    };
  });
}

export function LegalReferences({ legalType, references, caseId }: LegalReferencesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [brainRefs, setBrainRefs] = useState<LegalReference[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [usingBrain, setUsingBrain] = useState(false);
  const config = legalTypeConfig[legalType];

  // Cargar referencias del cerebro del caso (si está disponible)
  const fetchFromBrain = useCallback(async (regenerate = false) => {
    if (!caseId) return;
    setLoading(true);
    try {
      const token = await getAuthToken();
      const url = regenerate
        ? `${API_URL}/api/v1/cases/${caseId}/brain/refresh`
        : `${API_URL}/api/v1/cases/${caseId}/brain`;
      const r = await fetch(url, {
        method: regenerate ? 'POST' : 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const brain = data.full || data.brain;
      const laws = brain?.applicableLaws || [];
      if (Array.isArray(laws) && laws.length > 0) {
        setBrainRefs(brainLawsToReferences(laws));
        setUsingBrain(true);
      } else {
        setBrainRefs([]);
        setUsingBrain(false);
      }
    } catch {
      // Mantener mock si falla el cerebro
      setBrainRefs(null);
      setUsingBrain(false);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  // Carga inicial
  useEffect(() => {
    if (caseId) void fetchFromBrain(false);
  }, [caseId, fetchFromBrain]);

  const sourceRefs = references ?? (brainRefs && brainRefs.length > 0 ? brainRefs : mockReferencesByType[legalType] || []);
  const filteredReferences = sourceRefs.filter(
    (ref) =>
      ref.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.article?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: LegalReference['type']) => {
    switch (type) {
      case 'constitution':
        return <BookOpen className="w-5 h-5" />;
      case 'code':
        return <Scale className="w-5 h-5" />;
      case 'law':
        return <FileText className="w-5 h-5" />;
      case 'jurisprudence':
        return <Scale className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: LegalReference['type']) => {
    switch (type) {
      case 'constitution':
        return 'Constitución';
      case 'code':
        return 'Código';
      case 'law':
        return 'Ley';
      case 'jurisprudence':
        return 'Jurisprudencia';
    }
  };

  const getRelevanceBadge = (relevance: LegalReference['relevance']) => {
    const colors = {
      high: 'bg-red-100 text-red-700 border-red-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-blue-100 text-blue-700 border-blue-200',
    };

    const labels = {
      high: 'Alta',
      medium: 'Media',
      low: 'Baja',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[relevance]}`}>
        {labels[relevance]}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div
        className="p-4 border-b border-gray-200"
        style={{
          background: `linear-gradient(135deg, ${config.color}08 0%, ${config.color}15 100%)`,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5" style={{ color: config.color }} />
          <h3 className="font-bold text-gray-900 flex-1">Referencias Legales</h3>
          {usingBrain && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700"
              title="Estas referencias fueron sintetizadas por la IA a partir de los documentos del caso"
            >
              <Sparkles className="w-2.5 h-2.5" />
              IA
            </span>
          )}
          {caseId && (
            <button
              type="button"
              onClick={() => fetchFromBrain(true)}
              disabled={loading}
              title="Regenerar referencias desde los documentos del caso"
              aria-label="Actualizar referencias legales"
              className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/80 transition disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar artículos, leyes..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* References List */}
      <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
        {filteredReferences.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">
              {searchQuery ? 'No se encontraron referencias' : 'No hay referencias legales disponibles'}
            </p>
          </div>
        ) : (
          filteredReferences.map((ref) => (
            <div key={ref.id} className="p-4 hover:bg-gray-50 transition-colors">
              {/* Type & Relevance */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-gray-600">
                  {getTypeIcon(ref.type)}
                  <span className="text-xs font-medium uppercase tracking-wide">{getTypeLabel(ref.type)}</span>
                </div>
                {getRelevanceBadge(ref.relevance)}
              </div>

              {/* Title & Article */}
              <h4 className="font-semibold text-gray-900 mb-1">
                {ref.title}
                {ref.article && <span className="ml-2 text-indigo-600">{ref.article}</span>}
              </h4>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-2">{ref.description}</p>

              {/* Actions */}
              {ref.url && (
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Ver documento completo
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <button
          className="w-full text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          onClick={() => {
            /* TODO: Open reference search modal */
          }}
        >
          + Agregar nueva referencia legal
        </button>
      </div>
    </div>
  );
}
