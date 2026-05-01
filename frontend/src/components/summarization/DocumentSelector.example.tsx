'use client';

import React, { useState } from 'react';
import { DocumentSelector } from './DocumentSelector';
import { Card } from '@/components/ui/card';

/**
 * DocumentSelector Examples
 * Demonstrates different use cases and configurations
 */

export function DocumentSelectorExamples() {
  const [singleSelection, setSingleSelection] = useState<string>('');
  const [multiSelection, setMultiSelection] = useState<string[]>([]);
  const [limitedSelection, setLimitedSelection] = useState<string[]>([]);

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">DocumentSelector Component</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Searchable document selector with single and multi-select modes
        </p>
      </div>

      {/* Example 1: Single Selection */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Single Selection</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Select a single legal document from the dropdown
        </p>
        <DocumentSelector
          value={singleSelection}
          onChange={(value) => setSingleSelection(value as string)}
          placeholder="Seleccionar un documento..."
        />
        {singleSelection && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
            <p className="text-sm font-medium">Selected Document ID: {singleSelection}</p>
          </div>
        )}
      </Card>

      {/* Example 2: Multiple Selection */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Multiple Selection</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Select multiple documents at once. Selected documents appear as badges below.
        </p>
        <DocumentSelector
          value={multiSelection}
          onChange={(value) => setMultiSelection(value as string[])}
          multiple
          placeholder="Seleccionar documentos..."
        />
        {multiSelection.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-md">
            <p className="text-sm font-medium mb-2">
              Selected {multiSelection.length} document(s):
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {multiSelection.join(', ')}
            </p>
          </div>
        )}
      </Card>

      {/* Example 3: Limited Selection */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Limited Multiple Selection</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Select up to 3 documents maximum. Additional selections are disabled once limit is reached.
        </p>
        <DocumentSelector
          value={limitedSelection}
          onChange={(value) => setLimitedSelection(value as string[])}
          multiple
          maxSelections={3}
          placeholder="Seleccionar hasta 3 documentos..."
        />
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-md">
          <p className="text-sm font-medium">
            {limitedSelection.length} / 3 documents selected
          </p>
        </div>
      </Card>

      {/* Example 4: Disabled State */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Disabled State</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Document selector in disabled state
        </p>
        <DocumentSelector
          value={['1', '2']}
          onChange={() => {}}
          multiple
          disabled
          placeholder="Disabled selector..."
        />
      </Card>

      {/* Example 5: Custom Styling */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Custom Styling</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Document selector with custom className
        </p>
        <DocumentSelector
          value={singleSelection}
          onChange={(value) => setSingleSelection(value as string)}
          placeholder="Custom styled selector..."
          className="max-w-md"
        />
      </Card>

      {/* Usage Code */}
      <Card className="p-6 bg-gray-900 text-gray-100">
        <h2 className="text-xl font-semibold mb-4">Usage Example</h2>
        <pre className="text-sm overflow-x-auto">
          <code>{`import { DocumentSelector } from '@/components/summarization';

// Single Selection
const [document, setDocument] = useState<string>('');

<DocumentSelector
  value={document}
  onChange={setDocument}
  placeholder="Select a document..."
/>

// Multiple Selection
const [documents, setDocuments] = useState<string[]>([]);

<DocumentSelector
  value={documents}
  onChange={setDocuments}
  multiple
  maxSelections={5}
  placeholder="Select documents..."
/>

// With API Integration (future)
const { data: documents } = useQuery({
  queryKey: ['legal-documents'],
  queryFn: fetchLegalDocuments,
});`}</code>
        </pre>
      </Card>
    </div>
  );
}

export default DocumentSelectorExamples;
