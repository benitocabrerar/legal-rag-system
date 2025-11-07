'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface UploadItem {
  id: string;
  file: File;
  title: string;
  category: string;
  jurisdiction: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

const CATEGORIES = [
  { value: 'constitucion', label: 'Constitución', icon: '⚖️' },
  { value: 'codigo', label: 'Códigos', icon: '📕' },
  { value: 'ley', label: 'Leyes', icon: '📜' },
  { value: 'decreto', label: 'Decretos', icon: '📋' },
  { value: 'resolucion', label: 'Resoluciones', icon: '📄' },
  { value: 'jurisprudencia', label: 'Jurisprudencia', icon: '⚖️' },
];

export default function BulkUploadPage() {
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [defaultCategory, setDefaultCategory] = useState('ley');
  const [defaultJurisdiction, setDefaultJurisdiction] = useState('nacional');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: UploadItem[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      title: file.name.replace(/\.pdf$/i, ''),
      category: defaultCategory,
      jurisdiction: defaultJurisdiction,
      status: 'pending',
      progress: 0,
    }));
    setUploadQueue([...uploadQueue, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type === 'application/pdf'
    );
    const newItems: UploadItem[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      title: file.name.replace(/\.pdf$/i, ''),
      category: defaultCategory,
      jurisdiction: defaultJurisdiction,
      status: 'pending',
      progress: 0,
    }));
    setUploadQueue([...uploadQueue, ...newItems]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const updateItem = (id: string, updates: Partial<UploadItem>) => {
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeItem = (id: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const processQueue = async () => {
    setIsProcessing(true);
    const pendingItems = uploadQueue.filter((item) => item.status === 'pending');

    for (const item of pendingItems) {
      try {
        updateItem(item.id, { status: 'uploading', progress: 0 });

        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('title', item.title);
        formData.append('category', item.category);
        formData.append('jurisdiction', item.jurisdiction);

        // Simulate upload progress
        updateItem(item.id, { progress: 30 });

        // This endpoint would need to be created in the backend
        // await api.post('/admin/legal-documents', formData, {
        //   headers: { 'Content-Type': 'multipart/form-data' },
        // });

        // Simulate processing
        updateItem(item.id, { status: 'processing', progress: 60 });
        await new Promise((resolve) => setTimeout(resolve, 1000));

        updateItem(item.id, { status: 'completed', progress: 100 });
      } catch (error: any) {
        console.error(`Error uploading ${item.title}:`, error);
        updateItem(item.id, {
          status: 'error',
          error: error.message || 'Error al procesar documento',
        });
      }
    }

    setIsProcessing(false);
  };

  const clearCompleted = () => {
    setUploadQueue((prev) => prev.filter((item) => item.status !== 'completed'));
  };

  const clearAll = () => {
    setUploadQueue([]);
  };

  const stats = {
    total: uploadQueue.length,
    pending: uploadQueue.filter((i) => i.status === 'pending').length,
    processing: uploadQueue.filter(
      (i) => i.status === 'uploading' || i.status === 'processing'
    ).length,
    completed: uploadQueue.filter((i) => i.status === 'completed').length,
    errors: uploadQueue.filter((i) => i.status === 'error').length,
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Carga Masiva de Documentos</h1>
        <p className="text-gray-600">
          Sube múltiples documentos legales simultáneamente con procesamiento automático
        </p>
      </div>

      {/* Default Settings */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Configuración Predeterminada</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría por Defecto
            </label>
            <select
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jurisdicción por Defecto
            </label>
            <select
              value={defaultJurisdiction}
              onChange={(e) => setDefaultJurisdiction(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="nacional">Nacional</option>
              <option value="provincial">Provincial</option>
              <option value="municipal">Municipal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="bg-white rounded-xl shadow-sm p-12 mb-6 border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-colors text-center"
      >
        <div className="text-6xl mb-4">📤</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Arrastra archivos PDF aquí o haz clic para seleccionar
        </h3>
        <p className="text-gray-600 mb-4">Soporta múltiples archivos simultáneos</p>
        <input
          type="file"
          multiple
          accept=".pdf"
          onChange={handleFilesSelected}
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
        />
        <label
          htmlFor="file-upload"
          className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          Seleccionar Archivos PDF
        </label>
      </div>

      {/* Stats */}
      {uploadQueue.length > 0 && (
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Procesando</p>
            <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Completados</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Errores</p>
            <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {uploadQueue.length > 0 && (
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={processQueue}
            disabled={isProcessing || stats.pending === 0}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Procesando...' : `Procesar ${stats.pending} Documentos`}
          </button>
          <button
            onClick={clearCompleted}
            disabled={stats.completed === 0}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Limpiar Completados
          </button>
          <button
            onClick={clearAll}
            disabled={isProcessing}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Limpiar Todo
          </button>
        </div>
      )}

      {/* Upload Queue */}
      {uploadQueue.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Cola de Procesamiento</h2>
          <div className="space-y-3">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      disabled={item.status !== 'pending'}
                      className="w-full font-medium text-gray-900 bg-transparent border-0 focus:ring-0 p-0 mb-2"
                    />
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <select
                        value={item.category}
                        onChange={(e) => updateItem(item.id, { category: e.target.value })}
                        disabled={item.status !== 'pending'}
                        className="text-sm border-gray-200 rounded"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                      <span>•</span>
                      <span>{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : item.status === 'uploading' || item.status === 'processing'
                          ? 'bg-blue-100 text-blue-700'
                          : item.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.status === 'pending'
                        ? 'Pendiente'
                        : item.status === 'uploading'
                        ? 'Subiendo'
                        : item.status === 'processing'
                        ? 'Procesando'
                        : item.status === 'completed'
                        ? 'Completado'
                        : 'Error'}
                    </span>
                    {item.status === 'pending' && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {(item.status === 'uploading' || item.status === 'processing') && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                )}

                {/* Error Message */}
                {item.status === 'error' && item.error && (
                  <p className="text-sm text-red-600 mt-2">Error: {item.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No hay documentos en la cola</p>
          <p className="text-gray-400 text-sm mt-2">
            Arrastra archivos PDF al área de arriba para comenzar
          </p>
        </div>
      )}
    </div>
  );
}
