/**
 * SummaryCard Usage Examples
 * Demonstrates various use cases and configurations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { SummaryCard, SummaryCardSkeleton } from './SummaryCard';

// Example 1: Basic usage with standard summary
export function BasicSummaryExample() {
  const summary = {
    id: 'sum-123',
    documentId: 'doc-456',
    level: 'standard' as const,
    summary: 'Este contrato establece los términos y condiciones para la prestación de servicios legales entre las partes mencionadas. Se incluyen cláusulas sobre confidencialidad, pagos, y resolución de disputas.',
    wordCount: 150,
    originalWordCount: 1500,
    compressionRatio: 0.1,
    confidenceScore: 0.92,
    language: 'ES',
    generatedAt: '2025-12-12T10:30:00Z',
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <SummaryCard
        summary={summary}
        documentName="Contrato de Servicios Legales 2025"
        onViewDocument={() => console.log('Navigate to document')}
      />
    </div>
  );
}

// Example 2: Brief summary with high confidence
export function BriefSummaryExample() {
  const summary = {
    id: 'sum-124',
    documentId: 'doc-457',
    level: 'brief' as const,
    summary: 'Legal agreement for consulting services with payment terms and confidentiality clauses.',
    wordCount: 50,
    originalWordCount: 800,
    compressionRatio: 0.0625,
    confidenceScore: 0.95,
    language: 'EN',
    generatedAt: '2025-12-12T11:45:00Z',
  };

  return (
    <SummaryCard
      summary={summary}
      documentName="Consulting Agreement - Tech Corp"
      onViewDocument={() => console.log('Navigate to document')}
    />
  );
}

// Example 3: Detailed summary with medium confidence
export function DetailedSummaryExample() {
  const summary = {
    id: 'sum-125',
    documentId: 'doc-458',
    level: 'detailed' as const,
    summary: `Este documento es un contrato de arrendamiento comercial que regula las siguientes áreas principales:

1. IDENTIFICACIÓN DE PARTES: Define al arrendador (propietario) y arrendatario (inquilino) con sus datos completos de identificación.

2. OBJETO DEL CONTRATO: Especifica el inmueble arrendado, su ubicación exacta, y el uso permitido para actividades comerciales.

3. PLAZO Y VIGENCIA: Establece un período de arrendamiento de 5 años con opción de renovación automática.

4. RENTA Y FORMA DE PAGO: Detalla el monto mensual, forma de pago, y ajustes anuales por inflación.

5. OBLIGACIONES: Lista responsabilidades del arrendador (mantenimiento estructural) y arrendatario (servicios, reparaciones menores).

6. CLÁUSULAS ESPECIALES: Incluye penalidades por incumplimiento, garantías, y procedimientos de resolución de conflictos.`,
    wordCount: 450,
    originalWordCount: 3200,
    compressionRatio: 0.14,
    confidenceScore: 0.78,
    language: 'ES',
    generatedAt: '2025-12-12T09:15:00Z',
  };

  return (
    <SummaryCard
      summary={summary}
      documentName="Contrato de Arrendamiento Comercial - Local 45"
      onViewDocument={() => console.log('Navigate to document')}
    />
  );
}

// Example 4: Loading state
export function LoadingSummaryExample() {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h2 className="text-xl font-bold mb-4">Loading State</h2>
      <SummaryCardSkeleton />
    </div>
  );
}

// Example 5: Without view document button
export function MinimalSummaryExample() {
  const summary = {
    id: 'sum-126',
    documentId: 'doc-459',
    level: 'standard' as const,
    summary: 'Amendment to employment contract modifying work schedule and compensation structure.',
    wordCount: 120,
    originalWordCount: 900,
    compressionRatio: 0.133,
    confidenceScore: 0.88,
    language: 'EN',
    generatedAt: '2025-12-12T14:20:00Z',
  };

  return (
    <SummaryCard
      summary={summary}
      documentName="Employment Contract Amendment"
      // No onViewDocument prop - button won't render
    />
  );
}

// Example 6: Grid layout with multiple summaries
export function SummaryGridExample() {
  const summaries = [
    {
      id: 'sum-201',
      documentId: 'doc-501',
      level: 'brief' as const,
      summary: 'Non-disclosure agreement for software development project.',
      wordCount: 45,
      originalWordCount: 600,
      compressionRatio: 0.075,
      confidenceScore: 0.94,
      language: 'EN',
      generatedAt: '2025-12-11T16:30:00Z',
    },
    {
      id: 'sum-202',
      documentId: 'doc-502',
      level: 'standard' as const,
      summary: 'Acuerdo de confidencialidad y no competencia para ejecutivos de nivel C.',
      wordCount: 180,
      originalWordCount: 1200,
      compressionRatio: 0.15,
      confidenceScore: 0.91,
      language: 'ES',
      generatedAt: '2025-12-11T15:20:00Z',
    },
    {
      id: 'sum-203',
      documentId: 'doc-503',
      level: 'detailed' as const,
      summary: 'Partnership agreement establishing profit distribution, decision-making authority, and exit strategies for a three-party business venture in the technology sector.',
      wordCount: 320,
      originalWordCount: 2400,
      compressionRatio: 0.133,
      confidenceScore: 0.85,
      language: 'EN',
      generatedAt: '2025-12-11T14:10:00Z',
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Document Summaries</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaries.map((summary) => (
          <SummaryCard
            key={summary.id}
            summary={summary}
            documentName={`Document ${summary.documentId}`}
            onViewDocument={() => console.log(`View ${summary.documentId}`)}
          />
        ))}
      </div>
    </div>
  );
}

// Example 7: Dark mode showcase
export function DarkModeSummaryExample() {
  const summary = {
    id: 'sum-301',
    documentId: 'doc-601',
    level: 'standard' as const,
    summary: 'Privacy policy update reflecting GDPR compliance requirements and user data protection measures.',
    wordCount: 165,
    originalWordCount: 1800,
    compressionRatio: 0.092,
    confidenceScore: 0.89,
    language: 'EN',
    generatedAt: '2025-12-12T08:00:00Z',
  };

  return (
    <div className="dark bg-gray-900 min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Dark Mode</h2>
        <SummaryCard
          summary={summary}
          documentName="Privacy Policy - Version 3.0"
          onViewDocument={() => console.log('View document')}
        />
      </div>
    </div>
  );
}

// Example 8: Low confidence warning
export function LowConfidenceSummaryExample() {
  const summary = {
    id: 'sum-401',
    documentId: 'doc-701',
    level: 'standard' as const,
    summary: 'Complex multi-jurisdiction tax compliance document with varied regulatory requirements.',
    wordCount: 200,
    originalWordCount: 4500,
    compressionRatio: 0.044,
    confidenceScore: 0.62,
    language: 'EN',
    generatedAt: '2025-12-12T12:30:00Z',
  };

  return (
    <SummaryCard
      summary={summary}
      documentName="International Tax Compliance Guide"
      onViewDocument={() => console.log('View document')}
    />
  );
}

// Example 9: Streaming mode - Simulated real-time summary generation
export function StreamingSummaryExample() {
  const [isStreaming, setIsStreaming] = useState(true);
  const [streamingContent, setStreamingContent] = useState('');

  const fullSummary = {
    id: 'sum-501',
    documentId: 'doc-801',
    level: 'standard' as const,
    summary: 'Este contrato establece los términos y condiciones para la prestación de servicios de consultoría empresarial. Incluye cláusulas sobre confidencialidad, propiedad intelectual, compensación económica, y resolución de disputas. El acuerdo tiene una vigencia de 12 meses con posibilidad de renovación.',
    wordCount: 150,
    originalWordCount: 1500,
    compressionRatio: 0.1,
    confidenceScore: 0.92,
    language: 'ES',
    generatedAt: new Date().toISOString(),
  };

  const fullText = 'Este contrato establece los términos y condiciones para la prestación de servicios de consultoría empresarial. Incluye cláusulas sobre confidencialidad, propiedad intelectual, compensación económica, y resolución de disputas. El acuerdo tiene una vigencia de 12 meses con posibilidad de renovación.';

  useEffect(() => {
    // Simulate streaming by gradually revealing text
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setStreamingContent(fullText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsStreaming(false);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Streaming Summary (Real-time)</h2>
      <SummaryCard
        summary={fullSummary}
        documentName="Contrato de Consultoría Empresarial 2025"
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        onStreamingComplete={() => console.log('Streaming completed!')}
        onViewDocument={() => console.log('View document')}
      />
    </div>
  );
}

// Example 10: Streaming mode with reset functionality
export function StreamingWithControlsExample() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const fullSummary = {
    id: 'sum-502',
    documentId: 'doc-802',
    level: 'detailed' as const,
    summary: 'This partnership agreement establishes a comprehensive framework for business collaboration between multiple parties. Key sections include profit distribution mechanisms, decision-making authority structures, capital contribution requirements, dispute resolution procedures, and clearly defined exit strategies. The agreement also covers intellectual property rights, non-compete clauses, and confidentiality obligations.',
    wordCount: 320,
    originalWordCount: 2400,
    compressionRatio: 0.133,
    confidenceScore: 0.88,
    language: 'EN',
    generatedAt: new Date().toISOString(),
  };

  const fullText = 'This partnership agreement establishes a comprehensive framework for business collaboration between multiple parties. Key sections include profit distribution mechanisms, decision-making authority structures, capital contribution requirements, dispute resolution procedures, and clearly defined exit strategies. The agreement also covers intellectual property rights, non-compete clauses, and confidentiality obligations.';

  const startStreaming = () => {
    setIsStreaming(true);
    setStreamingContent('');

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setStreamingContent(fullText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsStreaming(false);
        clearInterval(interval);
        setIntervalId(null);
      }
    }, 30);

    setIntervalId(interval);
  };

  const stopStreaming = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsStreaming(false);
  };

  const resetStreaming = () => {
    stopStreaming();
    setStreamingContent('');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Streaming with Controls</h2>
        <div className="flex gap-2">
          <button
            onClick={startStreaming}
            disabled={isStreaming}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Start
          </button>
          <button
            onClick={stopStreaming}
            disabled={!isStreaming}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Stop
          </button>
          <button
            onClick={resetStreaming}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <SummaryCard
        summary={fullSummary}
        documentName="Partnership Agreement - Tech Ventures LLC"
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        onStreamingComplete={() => {
          console.log('Streaming completed!');
          setIntervalId(null);
        }}
        onViewDocument={() => console.log('View document')}
      />
    </div>
  );
}

// Example 11: Comparison of streaming vs completed
export function StreamingComparisonExample() {
  const [showStreaming, setShowStreaming] = useState(true);
  const [streamingContent, setStreamingContent] = useState('');

  const summary = {
    id: 'sum-503',
    documentId: 'doc-803',
    level: 'standard' as const,
    summary: 'Employee handbook outlining company policies, benefits, code of conduct, and workplace procedures. Covers topics including remote work guidelines, performance evaluations, leave policies, and professional development opportunities.',
    wordCount: 180,
    originalWordCount: 2000,
    compressionRatio: 0.09,
    confidenceScore: 0.91,
    language: 'EN',
    generatedAt: new Date().toISOString(),
  };

  useEffect(() => {
    if (showStreaming) {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < summary.summary.length) {
          setStreamingContent(summary.summary.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 40);

      return () => clearInterval(interval);
    }
  }, [showStreaming, summary.summary]);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Streaming vs Completed Comparison</h2>
        <button
          onClick={() => {
            setShowStreaming(!showStreaming);
            setStreamingContent('');
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Toggle Mode
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-700">
            {showStreaming ? 'Streaming Mode' : 'Static Mode'}
          </h3>
          <SummaryCard
            summary={summary}
            documentName="Employee Handbook 2025"
            isStreaming={showStreaming}
            streamingContent={streamingContent}
            onStreamingComplete={() => console.log('Streaming done')}
            onViewDocument={() => console.log('View document')}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-700">
            Completed (Always)
          </h3>
          <SummaryCard
            summary={summary}
            documentName="Employee Handbook 2025"
            isStreaming={false}
            onViewDocument={() => console.log('View document')}
          />
        </div>
      </div>
    </div>
  );
}
