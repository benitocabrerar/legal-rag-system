'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  documentId: string;
  documentTitle: string;
  fileSize?: number;
}

export default function PDFViewer({ documentId, documentTitle, fileSize }: PDFViewerProps) {
  // PDF state
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [pdfLoading, setPdfLoading] = useState<boolean>(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // UI state
  const [searchText, setSearchText] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [fitMode, setFitMode] = useState<'width' | 'page' | 'custom'>('width');

  // Zoom presets
  const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  useEffect(() => {
    // Load PDF URL
    const loadPdfUrl = async () => {
      try {
        setPdfLoading(true);
        setPdfError(null);

        // Get the PDF file URL from the backend
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const url = `${apiUrl}/legal-documents-v2/${documentId}/file`;

        setPdfUrl(url);
      } catch (error) {
        console.error('Error loading PDF URL:', error);
        setPdfError('Error al cargar el PDF');
      }
    };

    loadPdfUrl();
  }, [documentId]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfLoading(false);
    setPdfError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setPdfError('Error al cargar el documento PDF');
    setPdfLoading(false);
  };

  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages, prev + 1));
  };

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1 && value <= numPages) {
      setPageNumber(value);
    }
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(3.0, prev + 0.25));
    setFitMode('custom');
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(0.25, prev - 0.25));
    setFitMode('custom');
  };

  const handleZoomChange = (value: number) => {
    setScale(value);
    setFitMode('custom');
  };

  const fitToWidth = () => {
    setFitMode('width');
    setScale(1.0);
  };

  const fitToPage = () => {
    setFitMode('page');
    setScale(0.85);
  };

  const rotateDocument = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const downloadPDF = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${documentTitle}.pdf`;
      link.click();
    }
  };

  const printPDF = () => {
    if (pdfUrl) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
      };
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Navigation
      if (e.key === 'ArrowLeft') {
        goToPreviousPage();
      } else if (e.key === 'ArrowRight') {
        goToNextPage();
      }

      // Zoom
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      }

      // Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages]);

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-300 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between space-x-4">
          {/* Left: Navigation Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousPage}
              disabled={pageNumber <= 1}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-md text-sm font-medium transition-colors"
              title="Página anterior (←)"
            >
              ◀
            </button>

            <div className="flex items-center space-x-1">
              <input
                type="number"
                min={1}
                max={numPages}
                value={pageNumber}
                onChange={handlePageInput}
                className="w-16 px-2 py-1.5 border border-gray-300 rounded-md text-center text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-600">/ {numPages || '...'}</span>
            </div>

            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-md text-sm font-medium transition-colors"
              title="Siguiente página (→)"
            >
              ▶
            </button>
          </div>

          {/* Center: Zoom Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={zoomOut}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
              title="Reducir zoom (-)"
            >
              -
            </button>

            <select
              value={scale}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {ZOOM_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {Math.round(level * 100)}%
                </option>
              ))}
            </select>

            <button
              onClick={zoomIn}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
              title="Ampliar zoom (+)"
            >
              +
            </button>

            <div className="border-l border-gray-300 h-8 mx-1"></div>

            <button
              onClick={fitToWidth}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                fitMode === 'width' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title="Ajustar a ancho"
            >
              Ancho
            </button>

            <button
              onClick={fitToPage}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                fitMode === 'page' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title="Ajustar a página"
            >
              Página
            </button>
          </div>

          {/* Right: Additional Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={rotateDocument}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
              title="Rotar 90°"
            >
              🔄
            </button>

            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                showSearch ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title="Buscar texto (Ctrl+F)"
            >
              🔍
            </button>

            <div className="border-l border-gray-300 h-8 mx-1"></div>

            <button
              onClick={downloadPDF}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
              title="Descargar PDF"
            >
              ⬇
            </button>

            <button
              onClick={printPDF}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
              title="Imprimir"
            >
              🖨
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3 flex items-center space-x-2">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar en el documento..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
            <button
              onClick={() => setShowSearch(false)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* PDF Viewer Area */}
      <div className="flex-1 overflow-auto bg-gray-200 p-4">
        <div className="flex justify-center">
          {pdfLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-600">Cargando documento PDF...</p>
            </div>
          )}

          {pdfError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
              <h3 className="text-red-800 font-semibold mb-2">Error al cargar el PDF</h3>
              <p className="text-red-600 text-sm">{pdfError}</p>
            </div>
          )}

          {pdfUrl && !pdfError && (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                  <p className="text-gray-600">Cargando PDF...</p>
                </div>
              }
              className="shadow-lg"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="bg-white shadow-xl"
              />
            </Document>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-300 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <span>
              <strong>Páginas:</strong> {numPages || '...'}
            </span>
            {fileSize && (
              <span>
                <strong>Tamaño:</strong> {(fileSize / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </div>
          <div>
            <span>
              <strong>Zoom:</strong> {Math.round(scale * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
