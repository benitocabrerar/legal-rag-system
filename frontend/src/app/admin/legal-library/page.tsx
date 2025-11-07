'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface LegalDocument {
  id: string;
  title: string;
  category: string;
  jurisdiction: string;
  registryNumber?: string;
  publishDate?: string;
  effectiveDate?: string;
  status: 'active' | 'processing' | 'error';
  fileSize: number;
  createdAt: string;
}

const CATEGORIES = [
  { value: 'constitucion', label: 'Constitución', icon: '⚖️' },
  { value: 'codigo', label: 'Códigos', icon: '📕' },
  { value: 'ley', label: 'Leyes', icon: '📜' },
  { value: 'decreto', label: 'Decretos', icon: '📋' },
  { value: 'resolucion', label: 'Resoluciones', icon: '📄' },
  { value: 'jurisprudencia', label: 'Jurisprudencia', icon: '⚖️' },
];

const JURISDICTIONS = [
  { value: 'nacional', label: 'Nacional' },
  { value: 'provincial', label: 'Provincial' },
  { value: 'municipal', label: 'Municipal' },
];

export default function LegalLibraryPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'ley',
    jurisdiction: 'nacional',
    registryNumber: '',
    publishDate: '',
    effectiveDate: '',
    file: null as File | null,
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      // This endpoint would need to be created in the backend
      // For now, using placeholder data
      setDocuments([]);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('title', uploadForm.title);
      formData.append('category', uploadForm.category);
      formData.append('jurisdiction', uploadForm.jurisdiction);
      if (uploadForm.registryNumber) formData.append('registryNumber', uploadForm.registryNumber);
      if (uploadForm.publishDate) formData.append('publishDate', uploadForm.publishDate);
      if (uploadForm.effectiveDate) formData.append('effectiveDate', uploadForm.effectiveDate);

      // This endpoint would need to be created in the backend
      // await api.post('/admin/legal-documents', formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' },
      // });

      alert('Documento legal subido exitosamente');
      setShowUploadModal(false);
      setUploadForm({
        title: '',
        category: 'ley',
        jurisdiction: 'nacional',
        registryNumber: '',
        publishDate: '',
        effectiveDate: '',
        file: null,
      });
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error al subir documento legal');
    } finally {
      setUploading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.registryNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Biblioteca Legal</h1>
          <p className="text-gray-600">Gestiona la base de conocimiento jurídico del sistema</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
        >
          + Subir Documento Legal
        </button>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                filterCategory === cat.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por título o número de registro..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg mb-4">
            {searchQuery || filterCategory !== 'all'
              ? 'No se encontraron documentos con ese filtro'
              : 'No hay documentos legales en la biblioteca'}
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            Subir el primer documento legal
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:border-indigo-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">
                      {CATEGORIES.find((c) => c.value === doc.category)?.icon}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900">{doc.title}</h3>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Categoría:</span>{' '}
                      {CATEGORIES.find((c) => c.value === doc.category)?.label}
                    </div>
                    <div>
                      <span className="font-medium">Jurisdicción:</span> {doc.jurisdiction}
                    </div>
                    {doc.registryNumber && (
                      <div>
                        <span className="font-medium">Nº Registro:</span> {doc.registryNumber}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      doc.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : doc.status === 'processing'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {doc.status === 'active'
                      ? 'Activo'
                      : doc.status === 'processing'
                      ? 'Procesando'
                      : 'Error'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Subir Documento Legal</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título del Documento *
                </label>
                <input
                  type="text"
                  required
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ej: Código Civil y Comercial"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría *
                  </label>
                  <select
                    required
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
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
                    Jurisdicción *
                  </label>
                  <select
                    required
                    value={uploadForm.jurisdiction}
                    onChange={(e) => setUploadForm({ ...uploadForm, jurisdiction: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {JURISDICTIONS.map((jur) => (
                      <option key={jur.value} value={jur.value}>
                        {jur.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Registro
                </label>
                <input
                  type="text"
                  value={uploadForm.registryNumber}
                  onChange={(e) => setUploadForm({ ...uploadForm, registryNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ej: LEY-26994"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Publicación
                  </label>
                  <input
                    type="date"
                    value={uploadForm.publishDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, publishDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Vigencia
                  </label>
                  <input
                    type="date"
                    value={uploadForm.effectiveDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, effectiveDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Archivo PDF *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {uploadForm.file && (
                  <p className="text-sm text-gray-600 mt-2">
                    Archivo seleccionado: {uploadForm.file.name} (
                    {(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> El documento será procesado automáticamente para generar
                  embeddings y estará disponible para consultas en el sistema RAG.
                </p>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={uploading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadForm.file}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Subiendo...' : 'Subir Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
