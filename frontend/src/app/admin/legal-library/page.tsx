'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

// Types matching backend schema (camelCase from Prisma)
interface LegalDocument {
  id: string;
  normType: string;
  normTitle: string;
  legalHierarchy: string;
  publicationType: string;
  publicationNumber: string;
  publicationDate?: string;
  lastReformDate?: string;
  documentState: string;
  jurisdiction: string;
  status: 'active' | 'processing' | 'error';
  fileSize: number;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
  _count?: {
    chunks: number;
  };
  metadata?: {
    totalPages?: number;
    fileSizeMB?: number | string;
    uploadedBy?: string;
    uploadedByEmail?: string;
  };
}

// AI Extraction Response Types
interface AIFieldSuggestion {
  value: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface AIMetadataExtraction {
  normTitle?: AIFieldSuggestion;
  normType?: AIFieldSuggestion;
  legalHierarchy?: AIFieldSuggestion;
  publicationType?: AIFieldSuggestion;
  publicationNumber?: AIFieldSuggestion;
  publicationDate?: AIFieldSuggestion;
  lastReformDate?: AIFieldSuggestion;
  documentState?: AIFieldSuggestion;
  jurisdiction?: AIFieldSuggestion;
}

// Enums from backend
const NORM_TYPES = [
  { value: 'CONSTITUTIONAL_NORM', label: 'Norma Constitucional', icon: '⚖️' },
  { value: 'ORGANIC_LAW', label: 'Ley Orgánica', icon: '📜' },
  { value: 'ORDINARY_LAW', label: 'Ley Ordinaria', icon: '📋' },
  { value: 'ORGANIC_CODE', label: 'Código Orgánico', icon: '📕' },
  { value: 'ORDINARY_CODE', label: 'Código Ordinario', icon: '📘' },
  { value: 'REGULATION_GENERAL', label: 'Reglamento General', icon: '📄' },
  { value: 'REGULATION_EXECUTIVE', label: 'Reglamento Ejecutivo', icon: '📑' },
  { value: 'ORDINANCE_MUNICIPAL', label: 'Ordenanza Municipal', icon: '🏛️' },
  { value: 'ORDINANCE_METROPOLITAN', label: 'Ordenanza Metropolitana', icon: '🌆' },
  { value: 'RESOLUTION_ADMINISTRATIVE', label: 'Resolución Administrativa', icon: '📃' },
  { value: 'RESOLUTION_JUDICIAL', label: 'Resolución Judicial', icon: '⚖️' },
  { value: 'ADMINISTRATIVE_AGREEMENT', label: 'Acuerdo Administrativo', icon: '🤝' },
  { value: 'INTERNATIONAL_TREATY', label: 'Tratado Internacional', icon: '🌍' },
  { value: 'JUDICIAL_PRECEDENT', label: 'Precedente Judicial', icon: '⚖️' },
];

const LEGAL_HIERARCHY = [
  { value: 'CONSTITUCION', label: 'Constitución', level: 1 },
  { value: 'TRATADOS_INTERNACIONALES_DDHH', label: 'Tratados Internacionales DDHH', level: 2 },
  { value: 'LEYES_ORGANICAS', label: 'Leyes Orgánicas', level: 3 },
  { value: 'LEYES_ORDINARIAS', label: 'Leyes Ordinarias', level: 4 },
  { value: 'CODIGOS_ORGANICOS', label: 'Códigos Orgánicos', level: 5 },
  { value: 'CODIGOS_ORDINARIOS', label: 'Códigos Ordinarios', level: 6 },
  { value: 'REGLAMENTOS', label: 'Reglamentos', level: 7 },
  { value: 'ORDENANZAS', label: 'Ordenanzas', level: 8 },
  { value: 'RESOLUCIONES', label: 'Resoluciones', level: 9 },
  { value: 'ACUERDOS_ADMINISTRATIVOS', label: 'Acuerdos Administrativos', level: 10 },
];

const PUBLICATION_TYPES = [
  { value: 'ORDINARIO', label: 'Registro Oficial Ordinario' },
  { value: 'SUPLEMENTO', label: 'Suplemento' },
  { value: 'SEGUNDO_SUPLEMENTO', label: 'Segundo Suplemento' },
  { value: 'SUPLEMENTO_ESPECIAL', label: 'Suplemento Especial' },
  { value: 'EDICION_CONSTITUCIONAL', label: 'Edición Constitucional' },
];

const DOCUMENT_STATES = [
  { value: 'ORIGINAL', label: 'Original' },
  { value: 'REFORMADO', label: 'Reformado' },
];

const JURISDICTIONS = [
  { value: 'NACIONAL', label: 'Nacional' },
  { value: 'PROVINCIAL', label: 'Provincial' },
  { value: 'MUNICIPAL', label: 'Municipal' },
  { value: 'INTERNACIONAL', label: 'Internacional' },
];

export default function LegalLibraryPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingAfterUpload, setProcessingAfterUpload] = useState(false);
  const [filterHierarchy, setFilterHierarchy] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<LegalDocument | null>(null);
  const [editForm, setEditForm] = useState({
    normTitle: '',
    normType: '',
    legalHierarchy: '',
    publicationType: '',
    publicationNumber: '',
    publicationDate: '',
    lastReformDate: '',
    documentState: '',
    jurisdiction: '',
  });
  const [saving, setSaving] = useState(false);

  // AI Extraction states
  const [extractingMetadata, setExtractingMetadata] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIMetadataExtraction | null>(null);
  const [showAISuggestions, setShowAISuggestions] = useState(false);

  // Regenerate embeddings states
  const [regeneratingEmbeddings, setRegeneratingEmbeddings] = useState(false);
  const [showRegenerateButton, setShowRegenerateButton] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    norm_type: 'ORDINARY_LAW',
    norm_title: '',
    legal_hierarchy: 'LEYES_ORDINARIAS',
    publication_type: 'ORDINARIO',
    publication_number: '',
    publication_date: '',
    last_reform_date: '',
    document_state: 'ORIGINAL',
    jurisdiction: 'NACIONAL',
    file: null as File | null,
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await api.get('/legal-documents-v2');
      const docs = response.data.documents || [];

      // Map documents and add status field based on backend data
      const mappedDocs = docs.map((doc: any) => ({
        ...doc,
        status: doc.isActive ? 'active' : 'inactive',
      }));

      setDocuments(mappedDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Por favor selecciona un archivo PDF');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert('El archivo no debe superar 50MB');
        return;
      }
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || uploading || processingAfterUpload) return;

    setUploading(true);
    setUploadProgress(0);
    setProcessingAfterUpload(false);

    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('norm_type', uploadForm.norm_type);
      formData.append('norm_title', uploadForm.norm_title);
      formData.append('legal_hierarchy', uploadForm.legal_hierarchy);
      formData.append('publication_type', uploadForm.publication_type);
      formData.append('publication_number', uploadForm.publication_number);
      formData.append('document_state', uploadForm.document_state);
      formData.append('jurisdiction', uploadForm.jurisdiction);

      if (uploadForm.publication_date) {
        formData.append('publication_date', uploadForm.publication_date);
      }
      if (uploadForm.last_reform_date) {
        formData.append('last_reform_date', uploadForm.last_reform_date);
      }

      // Show processing state when upload reaches 100%
      const response = await api.post('/legal-documents-v2', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);

          // When upload reaches 100%, show processing message
          if (progress === 100) {
            setUploading(false);
            setProcessingAfterUpload(true);
          }
        },
      });

      // Success - processing complete
      setProcessingAfterUpload(false);

      // Extract vectorization info from response
      const { message, warnings, vectorization } = response.data;

      // Build detailed alert message
      let alertMessage = message || '✅ Documento legal subido y procesado exitosamente';

      if (vectorization) {
        alertMessage += `\n\n📊 Detalles de Vectorización:`;
        alertMessage += `\n• Total de fragmentos: ${vectorization.totalChunks}`;
        alertMessage += `\n• Embeddings generados: ${vectorization.embeddingsGenerated}`;
        alertMessage += `\n• Tasa de éxito: ${vectorization.successRate}`;

        if (vectorization.embeddingsFailed > 0) {
          alertMessage += `\n• ⚠️ Fallos: ${vectorization.embeddingsFailed}`;
        }
      }

      if (warnings && warnings.length > 0) {
        alertMessage += `\n\n⚠️ ADVERTENCIAS:\n`;
        warnings.forEach((warning: string, index: number) => {
          alertMessage += `\n${index + 1}. ${warning}`;
        });
      }

      alert(alertMessage);
      setShowUploadModal(false);
      setUploadForm({
        norm_type: 'ORDINARY_LAW',
        norm_title: '',
        legal_hierarchy: 'LEYES_ORDINARIAS',
        publication_type: 'ORDINARIO',
        publication_number: '',
        publication_date: '',
        last_reform_date: '',
        document_state: 'ORIGINAL',
        jurisdiction: 'NACIONAL',
        file: null,
      });
      setUploadProgress(0);
      loadDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      const errorMessage = error?.response?.data?.message || 'Error al subir documento legal';
      alert(`❌ ${errorMessage}`);
      setProcessingAfterUpload(false);
    } finally {
      setUploading(false);
      setProcessingAfterUpload(false);
    }
  };

  const handleDelete = async (documentId: string, documentTitle: string, doc: LegalDocument) => {
    // Build detailed information message
    const details = [
      `📄 Título: ${documentTitle}`,
      `🏛️ Tipo: ${NORM_TYPES.find((t) => t.value === doc.normType)?.label || doc.normType}`,
      `📊 Jerarquía: ${LEGAL_HIERARCHY.find((h) => h.value === doc.legalHierarchy)?.label || doc.legalHierarchy}`,
      `📝 Páginas: ${doc.metadata?.totalPages || 'N/A'}`,
      `🧩 Chunks: ${doc._count?.chunks || 0}`,
      `💾 Tamaño: ${
        doc.metadata?.fileSizeMB
          ? `${parseFloat(String(doc.metadata.fileSizeMB)).toFixed(2)} MB`
          : doc.fileSize
          ? `${(doc.fileSize / 1024 / 1024).toFixed(2)} MB`
          : 'N/A'
      }`,
      `⬆️ Cargado: ${new Date(doc.createdAt).toLocaleDateString('es-EC', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`,
    ];

    if (doc.metadata?.uploadedBy || doc.metadata?.uploadedByEmail) {
      details.push(`👤 Subido por: ${doc.metadata?.uploadedBy || doc.metadata?.uploadedByEmail}`);
    }

    const confirmMessage = `¿Estás seguro de que deseas eliminar este documento?\n\n${details.join('\n')}\n\n⚠️ Esta acción eliminará el documento y todos sus chunks asociados.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await api.delete(`/legal-documents-v2/${documentId}`);
      alert('✅ Documento eliminado exitosamente');
      loadDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      const errorMessage = error?.response?.data?.message || 'Error al eliminar documento';
      alert(`❌ ${errorMessage}`);
    }
  };

  // Open edit modal and populate form
  const handleEdit = (doc: LegalDocument) => {
    setEditingDocument(doc);
    setEditForm({
      normTitle: doc.normTitle,
      normType: doc.normType,
      legalHierarchy: doc.legalHierarchy,
      publicationType: doc.publicationType,
      publicationNumber: doc.publicationNumber,
      publicationDate: doc.publicationDate ? doc.publicationDate.split('T')[0] : '',
      lastReformDate: doc.lastReformDate ? doc.lastReformDate.split('T')[0] : '',
      documentState: doc.documentState,
      jurisdiction: doc.jurisdiction,
    });
    setAiSuggestions(null);
    setShowAISuggestions(false);
    setShowRegenerateButton((doc._count?.chunks || 0) < 1);
    setShowEditModal(true);
  };

  // Extract metadata with AI
  const handleExtractMetadata = async () => {
    if (!editingDocument) return;

    setExtractingMetadata(true);
    setAiSuggestions(null);
    setShowAISuggestions(false);

    try {
      // Fetch the full document content from the backend
      const docResponse = await api.get(`/legal-documents-v2/${editingDocument.id}`);
      const fullDocument = docResponse.data.document;

      if (!fullDocument.content) {
        throw new Error('Document content not found');
      }

      // Extract metadata using the full document content
      const response = await api.post('/legal-documents-v2/extract-metadata', {
        content: fullDocument.content,
      });

      setAiSuggestions(response.data.suggestions || response.data);
      setShowAISuggestions(true);
    } catch (error: any) {
      console.error('Error extracting metadata:', error);
      const errorMessage = error?.response?.data?.message || 'Error al extraer metadatos con IA';
      alert(`❌ ${errorMessage}`);
    } finally {
      setExtractingMetadata(false);
    }
  };

  // Apply AI suggestion to form
  const applyAISuggestion = (field: keyof typeof editForm, value: string) => {
    setEditForm({
      ...editForm,
      [field]: value,
    });
  };

  // Save changes
  const handleSaveChanges = async () => {
    if (!editingDocument) return;

    setSaving(true);

    try {
      const payload = {
        normTitle: editForm.normTitle,
        normType: editForm.normType,
        legalHierarchy: editForm.legalHierarchy,
        publicationType: editForm.publicationType,
        publicationNumber: editForm.publicationNumber,
        publicationDate: editForm.publicationDate || null,
        lastReformDate: editForm.lastReformDate || null,
        documentState: editForm.documentState,
        jurisdiction: editForm.jurisdiction,
      };

      await api.put(`/legal-documents-v2/${editingDocument.id}`, payload);

      alert('✅ Documento actualizado exitosamente');
      setShowEditModal(false);
      setEditingDocument(null);
      loadDocuments();
    } catch (error: any) {
      console.error('Error updating document:', error);
      const errorMessage = error?.response?.data?.message || 'Error al actualizar documento';
      alert(`❌ ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // Regenerate embeddings
  const handleRegenerateEmbeddings = async () => {
    if (!editingDocument) return;

    const confirmed = confirm(
      '¿Deseas regenerar los embeddings vectoriales de este documento?\n\nEsto puede tomar varios segundos dependiendo del tamaño del documento.'
    );

    if (!confirmed) return;

    setRegeneratingEmbeddings(true);

    try {
      const response = await api.post(`/legal-documents-v2/${editingDocument.id}/regenerate-embeddings`);

      const { message, vectorization } = response.data;

      let alertMessage = message || '✅ Embeddings regenerados exitosamente';

      if (vectorization) {
        alertMessage += `\n\n📊 Resultados:`;
        alertMessage += `\n• Total de fragmentos: ${vectorization.totalChunks}`;
        alertMessage += `\n• Embeddings generados: ${vectorization.embeddingsGenerated}`;
        alertMessage += `\n• Tasa de éxito: ${vectorization.successRate}`;

        if (vectorization.embeddingsFailed > 0) {
          alertMessage += `\n• ⚠️ Fallos: ${vectorization.embeddingsFailed}`;
        }
      }

      alert(alertMessage);
      loadDocuments();
    } catch (error: any) {
      console.error('Error regenerating embeddings:', error);
      const errorMessage = error?.response?.data?.message || 'Error al regenerar embeddings';
      alert(`❌ ${errorMessage}`);
    } finally {
      setRegeneratingEmbeddings(false);
    }
  };

  // Get confidence color
  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesHierarchy = filterHierarchy === 'all' || doc.legalHierarchy === filterHierarchy;
    const matchesSearch =
      doc.normTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.publicationNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesHierarchy && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 Biblioteca Legal Global</h1>
          <p className="text-gray-600">
            Gestiona los documentos legales oficiales del Registro Oficial del Ecuador
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
        >
          + Subir Documento Legal
        </button>
      </div>

      {/* Hierarchy Filter */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtrar por Jerarquía Legal</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilterHierarchy('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterHierarchy === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {LEGAL_HIERARCHY.map((hier) => (
            <button
              key={hier.value}
              onClick={() => setFilterHierarchy(hier.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterHierarchy === hier.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {hier.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Buscar por título o número de publicación del Registro Oficial..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold">{documents.length}</div>
          <div className="text-blue-100">Documentos Totales</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold">
            {documents.filter((d) => d.status === 'active').length}
          </div>
          <div className="text-green-100">Activos</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold">
            {new Set(documents.map((d) => d.legalHierarchy)).size}
          </div>
          <div className="text-purple-100">Jerarquías</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold">
            {documents.filter((d) => d.documentState === 'REFORMADO').length}
          </div>
          <div className="text-orange-100">Reformados</div>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg mb-4">
            {searchQuery || filterHierarchy !== 'all'
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
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:border-indigo-300 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">
                      {NORM_TYPES.find((t) => t.value === doc.normType)?.icon || '📄'}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{doc.normTitle}</h3>
                      <p className="text-sm text-gray-500">
                        {NORM_TYPES.find((t) => t.value === doc.normType)?.label}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <span className="font-semibold text-blue-900">Jerarquía:</span>
                      <p className="text-blue-700">
                        {LEGAL_HIERARCHY.find((h) => h.value === doc.legalHierarchy)?.label}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <span className="font-semibold text-purple-900">Publicación:</span>
                      <p className="text-purple-700">
                        {PUBLICATION_TYPES.find((p) => p.value === doc.publicationType)?.label}
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <span className="font-semibold text-green-900">Nº RO:</span>
                      <p className="text-green-700">{doc.publicationNumber}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <span className="font-semibold text-orange-900">Estado:</span>
                      <p className="text-orange-700">
                        {DOCUMENT_STATES.find((s) => s.value === doc.documentState)?.label}
                      </p>
                    </div>
                  </div>

                  {/* Document Metadata Section */}
                  <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="font-semibold text-gray-700">📄 Páginas:</span>
                      <span className="ml-2 text-gray-600">
                        {doc.metadata?.totalPages || 'N/A'}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="font-semibold text-gray-700">🧩 Chunks:</span>
                      <span className="ml-2 text-gray-600">
                        {doc._count?.chunks || 0}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="font-semibold text-gray-700">💾 Tamaño:</span>
                      <span className="ml-2 text-gray-600">
                        {doc.metadata?.fileSizeMB
                          ? `${parseFloat(String(doc.metadata.fileSizeMB)).toFixed(2)} MB`
                          : doc.fileSize
                          ? `${(doc.fileSize / 1024 / 1024).toFixed(2)} MB`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm text-gray-600">
                    {doc.publicationDate && (
                      <div>
                        📅 <span className="font-semibold">Publicado:</span>{' '}
                        {new Date(doc.publicationDate).toLocaleDateString('es-EC', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    )}
                    <div>
                      ⬆️ <span className="font-semibold">Cargado:</span>{' '}
                      {new Date(doc.createdAt).toLocaleDateString('es-EC', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>

                  {(doc.metadata?.uploadedBy || doc.metadata?.uploadedByEmail) && (
                    <div className="mt-2 text-sm text-gray-600">
                      👤 <span className="font-semibold">Subido por:</span>{' '}
                      {doc.metadata?.uploadedBy || doc.metadata?.uploadedByEmail}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end space-y-2">
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
                      ? '✓ Activo'
                      : doc.status === 'processing'
                      ? '⏳ Procesando'
                      : '✗ Error'}
                  </span>
                  <button
                    onClick={() => handleEdit(doc)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id, doc.normTitle, doc)}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold hover:underline"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">📤 Subir Documento Legal del Registro Oficial</h2>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* Norm Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Título de la Norma *
                </label>
                <input
                  type="text"
                  required
                  value={uploadForm.norm_title}
                  onChange={(e) => setUploadForm({ ...uploadForm, norm_title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ej: Código Orgánico Integral Penal"
                />
              </div>

              {/* Norm Type & Legal Hierarchy */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de Norma *
                  </label>
                  <select
                    required
                    value={uploadForm.norm_type}
                    onChange={(e) => setUploadForm({ ...uploadForm, norm_type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {NORM_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Jerarquía Legal *
                  </label>
                  <select
                    required
                    value={uploadForm.legal_hierarchy}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, legal_hierarchy: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {LEGAL_HIERARCHY.map((hier) => (
                      <option key={hier.value} value={hier.value}>
                        Nivel {hier.level}: {hier.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Publication Type & Number */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de Publicación RO *
                  </label>
                  <select
                    required
                    value={uploadForm.publication_type}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, publication_type: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {PUBLICATION_TYPES.map((pub) => (
                      <option key={pub.value} value={pub.value}>
                        {pub.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Número de Registro Oficial *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadForm.publication_number}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, publication_number: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ej: RO-180"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha de Publicación
                  </label>
                  <input
                    type="date"
                    value={uploadForm.publication_date}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, publication_date: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha de Última Reforma
                  </label>
                  <input
                    type="date"
                    value={uploadForm.last_reform_date}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, last_reform_date: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Document State & Jurisdiction */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Estado del Documento *
                  </label>
                  <select
                    required
                    value={uploadForm.document_state}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, document_state: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {DOCUMENT_STATES.map((state) => (
                      <option key={state.value} value={state.value}>
                        {state.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Jurisdicción *
                  </label>
                  <select
                    required
                    value={uploadForm.jurisdiction}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, jurisdiction: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {JURISDICTIONS.map((jur) => (
                      <option key={jur.value} value={jur.value}>
                        {jur.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Archivo PDF del Registro Oficial *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {uploadForm.file && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ Archivo seleccionado: <strong>{uploadForm.file.name}</strong> (
                      {(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {uploading && uploadProgress > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-blue-800">Subiendo archivo...</span>
                    <span className="text-sm font-semibold text-blue-800">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Processing After Upload */}
              {processingAfterUpload && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-purple-800">
                        Procesando documento...
                      </span>
                      <p className="text-xs text-purple-600 mt-1">
                        Extrayendo texto del PDF y generando embeddings vectoriales. Esto puede tomar unos segundos.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Información Importante:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• El documento se procesará automáticamente con PDF.js</li>
                  <li>• Se generarán embeddings vectoriales para búsqueda semántica</li>
                  <li>• Los documentos se almacenan en AWS S3</li>
                  <li>• Tamaño máximo: 50MB por archivo</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadProgress(0);
                    setProcessingAfterUpload(false);
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  disabled={uploading || processingAfterUpload}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || processingAfterUpload || !uploadForm.file}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {uploading
                    ? `Subiendo... ${uploadProgress}%`
                    : processingAfterUpload
                    ? '⏳ Procesando...'
                    : '📤 Subir Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal - Full Screen with PDF Viewer */}
      {showEditModal && editingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-[95vw] h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <h2 className="text-2xl font-bold text-gray-900">✏️ Editar Documento Legal</h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleExtractMetadata}
                  disabled={extractingMetadata}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm"
                >
                  {extractingMetadata ? (
                    <span className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Extrayendo...</span>
                    </span>
                  ) : (
                    '🤖 Extraer Metadatos con IA'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDocument(null);
                    setAiSuggestions(null);
                    setShowAISuggestions(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Main Content - Full Width Layout */}
            <div className="flex-1 overflow-hidden">
              {/* Edit Form + AI Suggestions */}
              <div className="flex flex-col h-full overflow-hidden">
                {/* Form Section */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Norm Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Título de la Norma *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.normTitle}
                    onChange={(e) => setEditForm({ ...editForm, normTitle: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Norm Type & Legal Hierarchy */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tipo de Norma *
                    </label>
                    <select
                      required
                      value={editForm.normType}
                      onChange={(e) => setEditForm({ ...editForm, normType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {NORM_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Jerarquía Legal *
                    </label>
                    <select
                      required
                      value={editForm.legalHierarchy}
                      onChange={(e) => setEditForm({ ...editForm, legalHierarchy: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {LEGAL_HIERARCHY.map((hier) => (
                        <option key={hier.value} value={hier.value}>
                          Nivel {hier.level}: {hier.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Publication Type & Number */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tipo de Publicación RO *
                    </label>
                    <select
                      required
                      value={editForm.publicationType}
                      onChange={(e) => setEditForm({ ...editForm, publicationType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {PUBLICATION_TYPES.map((pub) => (
                        <option key={pub.value} value={pub.value}>
                          {pub.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Número de Registro Oficial *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.publicationNumber}
                      onChange={(e) => setEditForm({ ...editForm, publicationNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fecha de Publicación
                    </label>
                    <input
                      type="date"
                      value={editForm.publicationDate}
                      onChange={(e) => setEditForm({ ...editForm, publicationDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fecha de Última Reforma
                    </label>
                    <input
                      type="date"
                      value={editForm.lastReformDate}
                      onChange={(e) => setEditForm({ ...editForm, lastReformDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Document State & Jurisdiction */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Estado del Documento *
                    </label>
                    <select
                      required
                      value={editForm.documentState}
                      onChange={(e) => setEditForm({ ...editForm, documentState: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {DOCUMENT_STATES.map((state) => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Jurisdicción *
                    </label>
                    <select
                      required
                      value={editForm.jurisdiction}
                      onChange={(e) => setEditForm({ ...editForm, jurisdiction: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {JURISDICTIONS.map((jur) => (
                        <option key={jur.value} value={jur.value}>
                          {jur.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                </div>

                {/* AI Suggestions Panel - Bottom of Right Column */}
                {showAISuggestions && aiSuggestions && (
                  <div className="border-t border-gray-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4 max-h-[300px] overflow-y-auto">
                  <h3 className="text-lg font-bold text-purple-900 mb-4">🤖 Sugerencias de IA</h3>

                  {Object.entries(aiSuggestions).map(([field, suggestion]) => {
                    if (!suggestion) return null;

                    const fieldLabels: Record<string, string> = {
                      normTitle: 'Título de la Norma',
                      normType: 'Tipo de Norma',
                      legalHierarchy: 'Jerarquía Legal',
                      publicationType: 'Tipo de Publicación',
                      publicationNumber: 'Número RO',
                      publicationDate: 'Fecha de Publicación',
                      lastReformDate: 'Última Reforma',
                      documentState: 'Estado del Documento',
                      jurisdiction: 'Jurisdicción',
                    };

                    return (
                      <div key={field} className="mb-4 bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-700">
                            {fieldLabels[field as keyof typeof fieldLabels]}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${getConfidenceColor(
                              suggestion.confidence
                            )}`}
                          >
                            {suggestion.confidence === 'high'
                              ? 'Alta'
                              : suggestion.confidence === 'medium'
                              ? 'Media'
                              : 'Baja'}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 mb-2">
                          {suggestion.value}
                        </div>
                        {suggestion.reasoning && (
                          <div className="text-xs text-gray-600 mb-2 italic">
                            {suggestion.reasoning}
                          </div>
                        )}
                        <button
                          onClick={() => applyAISuggestion(field as keyof typeof editForm, suggestion.value)}
                          className="w-full px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs font-semibold hover:bg-purple-700 transition-colors"
                        >
                          Aceptar Sugerencia
                        </button>
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer: Action Buttons */}
            <div className="flex items-center justify-between px-8 py-4 border-t border-gray-200 bg-gray-50 space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingDocument(null);
                  setAiSuggestions(null);
                  setShowAISuggestions(false);
                }}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-white transition-colors"
                disabled={saving || regeneratingEmbeddings}
              >
                Cancelar
              </button>

              {showRegenerateButton && (
                <button
                  type="button"
                  onClick={handleRegenerateEmbeddings}
                  disabled={saving || regeneratingEmbeddings}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {regeneratingEmbeddings ? (
                    <span className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Regenerando...</span>
                    </span>
                  ) : (
                    '🔄 Regenerar Embeddings'
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={saving || regeneratingEmbeddings}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {saving ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </span>
                ) : (
                  '💾 Guardar Cambios'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
