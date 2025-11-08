'use client';

import { useState, useEffect } from 'react';
import { legalDocumentsAPI, parseApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

// Force dynamic rendering to avoid build-time errors with pdfjs
export const dynamic = 'force-dynamic';

interface LegalDocument {
  id: string;
  title: string;
  category: string;
  metadata?: {
    year?: number;
    number?: string;
    jurisdiction?: string;
  };
  createdAt: string;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [extracting, setExtracting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'law' as 'constitution' | 'law' | 'code' | 'regulation' | 'jurisprudence',
    content: '',
    year: '',
    number: '',
    jurisdiction: '',
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDocuments();
    }
  }, [user, selectedCategory]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await legalDocumentsAPI.list(selectedCategory || undefined);
      setDocuments(data);
    } catch (err) {
      console.error('Error loading legal documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Por favor selecciona un archivo PDF válido');
      return;
    }

    setError('');
    setExtracting(true);

    try {
      // Dynamic import of pdfjs-dist to avoid SSR issues
      const pdfjsLib = await import('pdfjs-dist');

      // Configure worker - use local file instead of CDN to avoid 404 errors
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }

      // Auto-fill title from filename if empty
      if (!formData.title) {
        const fileName = file.name.replace('.pdf', '');
        setFormData({ ...formData, content: fullText.trim(), title: fileName });
      } else {
        setFormData({ ...formData, content: fullText.trim() });
      }

      setSuccess(`PDF procesado exitosamente: ${pdf.numPages} páginas extraídas`);
    } catch (err) {
      console.error('Error extracting PDF:', err);
      setError('Error al procesar el PDF. Por favor intenta con otro archivo.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUploading(true);

    try {
      const metadata: any = {};
      if (formData.year) metadata.year = parseInt(formData.year);
      if (formData.number) metadata.number = formData.number;
      if (formData.jurisdiction) metadata.jurisdiction = formData.jurisdiction;

      await legalDocumentsAPI.upload({
        title: formData.title,
        category: formData.category,
        content: formData.content,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      setSuccess('Documento legal cargado exitosamente');
      setFormData({
        title: '',
        category: 'law',
        content: '',
        year: '',
        number: '',
        jurisdiction: '',
      });
      loadDocuments();
    } catch (err: any) {
      setError(parseApiError(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este documento?')) {
      return;
    }

    try {
      await legalDocumentsAPI.delete(id);
      setSuccess('Documento eliminado exitosamente');
      loadDocuments();
    } catch (err: any) {
      setError(parseApiError(err));
    }
  };

  if (authLoading || (user && user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-700">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="mt-2 text-gray-600">Gestión de documentos legales globales</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Cargar Documento Legal
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="constitution">Constitución</option>
                  <option value="law">Ley</option>
                  <option value="code">Código</option>
                  <option value="regulation">Reglamento</option>
                  <option value="jurisprudence">Jurisprudencia</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Año
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número
                  </label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jurisdicción
                  </label>
                  <input
                    type="text"
                    value={formData.jurisdiction}
                    onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cargar PDF (opcional)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  disabled={extracting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {extracting && (
                  <p className="mt-2 text-sm text-blue-600">Extrayendo texto del PDF...</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contenido
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={12}
                  required
                  placeholder="Selecciona un PDF arriba o pega el contenido aquí directamente..."
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Cargando...' : 'Cargar Documento'}
              </button>
            </form>
          </div>

          {/* Documents List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Documentos Legales
              </h2>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas las categorías</option>
                <option value="constitution">Constitución</option>
                <option value="law">Ley</option>
                <option value="code">Código</option>
                <option value="regulation">Reglamento</option>
                <option value="jurisprudence">Jurisprudencia</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Cargando documentos...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No hay documentos legales cargados</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Categoría:</span>{' '}
                            {doc.category === 'constitution' && 'Constitución'}
                            {doc.category === 'law' && 'Ley'}
                            {doc.category === 'code' && 'Código'}
                            {doc.category === 'regulation' && 'Reglamento'}
                            {doc.category === 'jurisprudence' && 'Jurisprudencia'}
                          </p>
                          {doc.metadata?.year && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Año:</span> {doc.metadata.year}
                            </p>
                          )}
                          {doc.metadata?.number && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Número:</span> {doc.metadata.number}
                            </p>
                          )}
                          {doc.metadata?.jurisdiction && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Jurisdicción:</span> {doc.metadata.jurisdiction}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            Cargado: {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
