"use client";

import * as React from "react";
import { SummaryOptions as SummaryOptionsComponent, type SummaryOptions } from "./SummaryOptions";

/**
 * Example usage of the SummaryOptions component
 *
 * This example demonstrates:
 * - Basic usage with state management
 * - Handling option changes
 * - Integration with a summarization workflow
 */
export function SummaryOptionsExample() {
  const [options, setOptions] = React.useState<SummaryOptions>({
    level: 'standard',
    language: 'es',
    includeKeyPoints: true,
    includeReferences: false,
  });

  const [isLoading, setIsLoading] = React.useState(false);

  const handleGenerateSummary = async () => {
    setIsLoading(true);

    try {
      // Example API call to generate summary
      const response = await fetch('/api/documents/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: 'example-doc-id',
          options,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      console.log('Summary generated:', data);
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 dark:text-gray-100">
          Configurar Resumen de Documento
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Personalice cómo se generará el resumen del documento legal
        </p>
      </div>

      <SummaryOptionsComponent
        options={options}
        onOptionsChange={setOptions}
        disabled={isLoading}
      />

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => {
            setOptions({
              level: 'standard',
              language: 'es',
              includeKeyPoints: true,
              includeReferences: false,
            });
          }}
          disabled={isLoading}
          className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Restablecer
        </button>
        <button
          type="button"
          onClick={handleGenerateSummary}
          disabled={isLoading}
          className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Generando...' : 'Generar Resumen'}
        </button>
      </div>

      {/* Display current options as JSON for debugging */}
      <details className="mt-8">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
          Ver configuración actual (JSON)
        </summary>
        <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-md text-xs overflow-auto">
          {JSON.stringify(options, null, 2)}
        </pre>
      </details>
    </div>
  );
}

/**
 * Example with custom styling
 */
export function SummaryOptionsCustomStyleExample() {
  const [options, setOptions] = React.useState<SummaryOptions>({
    level: 'detailed',
    language: 'en',
    includeKeyPoints: true,
    includeReferences: true,
    maxLength: 2000,
    focusAreas: ['Aspectos Legales', 'Obligaciones'],
  });

  return (
    <div className="p-6">
      <SummaryOptionsComponent
        options={options}
        onOptionsChange={setOptions}
        className="max-w-xl border-2 border-blue-200 dark:border-blue-800"
      />
    </div>
  );
}

/**
 * Example in a modal/dialog context
 */
export function SummaryOptionsModalExample() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [options, setOptions] = React.useState<SummaryOptions>({
    level: 'brief',
    language: 'es',
    includeKeyPoints: false,
    includeReferences: false,
  });

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Configurar Opciones de Resumen
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold dark:text-gray-100">
                  Opciones de Resumen
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <span className="sr-only">Cerrar</span>
                  ×
                </button>
              </div>

              <SummaryOptionsComponent
                options={options}
                onOptionsChange={setOptions}
              />

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    console.log('Options saved:', options);
                    setIsOpen(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
