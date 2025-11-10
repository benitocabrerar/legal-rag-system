'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Info } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

// Type Definitions
interface FormData {
  normType: string;
  normTitle: string;
  legalHierarchy: string;
  publicationType: string;
  publicationNumber: string;
  publicationDate: string;
  lastReformDate: string;
  documentState: string;
  file: File | null;
}

interface FormErrors {
  [key: string]: string;
}

interface UploadResponse {
  success: boolean;
  document?: {
    id: string;
    normTitle: string;
    chunksCount: number;
  };
  error?: string;
  details?: any;
}

// Enum Options with Spanish Labels
const NORM_TYPES = [
  { value: 'CONSTITUTIONAL_NORM', label: 'Norma Constitucional' },
  { value: 'ORGANIC_LAW', label: 'Ley Orgánica' },
  { value: 'ORDINARY_LAW', label: 'Ley Ordinaria' },
  { value: 'ORGANIC_CODE', label: 'Código Orgánico' },
  { value: 'ORDINARY_CODE', label: 'Código Ordinario' },
  { value: 'REGULATION_GENERAL', label: 'Reglamento General' },
  { value: 'REGULATION_EXECUTIVE', label: 'Decreto Ejecutivo' },
  { value: 'ORDINANCE_MUNICIPAL', label: 'Ordenanza Municipal' },
  { value: 'ORDINANCE_METROPOLITAN', label: 'Ordenanza Metropolitana' },
  { value: 'RESOLUTION_ADMINISTRATIVE', label: 'Resolución Administrativa' },
  { value: 'RESOLUTION_JUDICIAL', label: 'Resolución Judicial' },
  { value: 'ADMINISTRATIVE_AGREEMENT', label: 'Acuerdo Administrativo' },
  { value: 'INTERNATIONAL_TREATY', label: 'Tratado Internacional' },
  { value: 'JUDICIAL_PRECEDENT', label: 'Precedente Judicial' },
];

const LEGAL_HIERARCHY = [
  { value: 'CONSTITUCION', label: 'Constitución' },
  { value: 'TRATADOS_INTERNACIONALES_DDHH', label: 'Tratados Internacionales de DDHH' },
  { value: 'LEYES_ORGANICAS', label: 'Leyes Orgánicas' },
  { value: 'LEYES_ORDINARIAS', label: 'Leyes Ordinarias' },
  { value: 'CODIGOS_ORGANICOS', label: 'Códigos Orgánicos' },
  { value: 'CODIGOS_ORDINARIOS', label: 'Códigos Ordinarios' },
  { value: 'REGLAMENTOS', label: 'Reglamentos' },
  { value: 'ORDENANZAS', label: 'Ordenanzas' },
  { value: 'RESOLUCIONES', label: 'Resoluciones' },
  { value: 'ACUERDOS_ADMINISTRATIVOS', label: 'Acuerdos Administrativos' },
];

const PUBLICATION_TYPES = [
  { value: 'ORDINARIO', label: 'Ordinario' },
  { value: 'SUPLEMENTO', label: 'Suplemento' },
  { value: 'SEGUNDO_SUPLEMENTO', label: 'Segundo Suplemento' },
  { value: 'SUPLEMENTO_ESPECIAL', label: 'Suplemento Especial' },
  { value: 'EDICION_CONSTITUCIONAL', label: 'Edición Constitucional' },
];

const DOCUMENT_STATES = [
  { value: 'ORIGINAL', label: 'Original' },
  { value: 'REFORMADO', label: 'Reformado' },
];

interface LegalDocumentUploadFormProps {
  onSuccess?: (document: any) => void;
  onCancel?: () => void;
}

export default function LegalDocumentUploadForm({
  onSuccess,
  onCancel,
}: LegalDocumentUploadFormProps) {
  const [formData, setFormData] = useState<FormData>({
    normType: 'ORDINARY_LAW',
    normTitle: '',
    legalHierarchy: 'LEYES_ORDINARIAS',
    publicationType: 'ORDINARIO',
    publicationNumber: '',
    publicationDate: '',
    lastReformDate: '',
    documentState: 'ORIGINAL',
    file: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.normType) {
      newErrors.normType = 'El tipo de norma es requerido';
    }

    if (!formData.normTitle.trim()) {
      newErrors.normTitle = 'El título de la norma es requerido';
    } else if (formData.normTitle.length < 5) {
      newErrors.normTitle = 'El título debe tener al menos 5 caracteres';
    }

    if (!formData.legalHierarchy) {
      newErrors.legalHierarchy = 'La jerarquía legal es requerida';
    }

    if (!formData.file) {
      newErrors.file = 'Debe seleccionar un archivo PDF';
    } else if (!formData.file.name.toLowerCase().endsWith('.pdf')) {
      newErrors.file = 'Solo se permiten archivos PDF';
    } else if (formData.file.size > 50 * 1024 * 1024) {
      newErrors.file = 'El archivo no puede superar los 50MB';
    }

    if (formData.documentState === 'REFORMADO' && !formData.lastReformDate) {
      newErrors.lastReformDate = 'La fecha de última reforma es requerida para documentos reformados';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, file }));
      if (errors.file) {
        setErrors((prev) => ({ ...prev, file: '' }));
      }
    }
  };

  // Parse API error
  const parseApiError = (error: any): string => {
    try {
      const errorData = error?.response?.data;

      if (!errorData) {
        return 'Error de conexión con el servidor. Verifique su conexión a internet.';
      }

      if (errorData.error) {
        if (Array.isArray(errorData.error)) {
          return errorData.error.map((e: any) => e.message || String(e)).join(', ');
        }
        return String(errorData.error);
      }

      if (errorData.message) {
        return String(errorData.message);
      }

      if (errorData.details) {
        if (Array.isArray(errorData.details)) {
          return errorData.details.map((d: any) => d.message || String(d)).join(', ');
        }
        return String(errorData.details);
      }

      return 'Error al procesar la solicitud';
    } catch {
      return 'Error desconocido al procesar la solicitud';
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró el token de autenticación. Por favor, inicie sesión nuevamente.');
      }

      // Extract text from PDF
      setUploadProgress(10);
      const fileContent = await extractTextFromPDF(formData.file!);

      setUploadProgress(40);

      // Prepare request body
      const requestBody = {
        normType: formData.normType,
        normTitle: formData.normTitle.trim(),
        legalHierarchy: formData.legalHierarchy,
        content: fileContent,
        publicationType: formData.publicationType || undefined,
        publicationNumber: formData.publicationNumber.trim() || undefined,
        publicationDate: formData.publicationDate ? new Date(formData.publicationDate).toISOString() : undefined,
        documentState: formData.documentState,
        lastReformDate: formData.lastReformDate ? new Date(formData.lastReformDate).toISOString() : undefined,
      };

      setUploadProgress(60);

      // Make API request
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://legal-rag-api-qnew.onrender.com';
      const response = await fetch(`${apiUrl}/api/v2/legal-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      setUploadProgress(90);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          response: {
            status: response.status,
            data: errorData,
          },
        };
      }

      const result: UploadResponse = await response.json();

      setUploadProgress(100);
      setUploadSuccess(true);

      // Call success callback
      if (onSuccess && result.document) {
        setTimeout(() => {
          onSuccess(result.document);
        }, 1500);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = parseApiError(error);
      setUploadError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Extract text from PDF file
  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      // Extract text from all pages
      const numPages = pdf.numPages;
      let fullText = '';

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      if (!fullText.trim()) {
        throw new Error('No se pudo extraer texto del PDF. El archivo puede estar vacío o contener solo imágenes.');
      }

      return fullText.trim();
    } catch (error: any) {
      console.error('PDF parsing error:', error);
      throw new Error(`Error al procesar el PDF: ${error.message || 'Formato de archivo inválido'}`);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      normType: 'ORDINARY_LAW',
      normTitle: '',
      legalHierarchy: 'LEYES_ORDINARIAS',
      publicationType: 'ORDINARIO',
      publicationNumber: '',
      publicationDate: '',
      lastReformDate: '',
      documentState: 'ORIGINAL',
      file: null,
    });
    setErrors({});
    setUploadSuccess(false);
    setUploadError(null);
    setUploadProgress(0);
  };

  if (uploadSuccess) {
    return (
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-auto">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Documento Legal Subido Exitosamente
          </h3>
          <p className="text-gray-600 mb-6">
            El documento ha sido procesado y está disponible en el sistema RAG
          </p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={resetForm}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Subir Otro Documento
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Subir Documento Legal</h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={uploading}
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      {uploadError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Error al subir documento</p>
            <p className="text-sm text-red-700 mt-1">{uploadError}</p>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo de Norma */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tipo de Norma <span className="text-red-500">*</span>
          </label>
          <select
            name="normType"
            value={formData.normType}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
              errors.normType ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            disabled={uploading}
          >
            {NORM_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.normType && (
            <p className="mt-1 text-sm text-red-600">{errors.normType}</p>
          )}
        </div>

        {/* Título de la Norma */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Título de la Norma <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="normTitle"
            value={formData.normTitle}
            onChange={handleInputChange}
            placeholder="Ej: Código Civil y Comercial de la Nación"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
              errors.normTitle ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            disabled={uploading}
          />
          {errors.normTitle && (
            <p className="mt-1 text-sm text-red-600">{errors.normTitle}</p>
          )}
        </div>

        {/* Jerarquía Legal */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Jerarquía Legal <span className="text-red-500">*</span>
          </label>
          <select
            name="legalHierarchy"
            value={formData.legalHierarchy}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
              errors.legalHierarchy ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            disabled={uploading}
          >
            {LEGAL_HIERARCHY.map((hierarchy) => (
              <option key={hierarchy.value} value={hierarchy.value}>
                {hierarchy.label}
              </option>
            ))}
          </select>
          {errors.legalHierarchy && (
            <p className="mt-1 text-sm text-red-600">{errors.legalHierarchy}</p>
          )}
        </div>

        {/* Row: Publication Type & Publication Number */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de Publicación Registro Oficial
            </label>
            <select
              name="publicationType"
              value={formData.publicationType}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              disabled={uploading}
            >
              {PUBLICATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Número de Publicación Registro Oficial
            </label>
            <input
              type="text"
              name="publicationNumber"
              value={formData.publicationNumber}
              onChange={handleInputChange}
              placeholder="Ej: 490"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              disabled={uploading}
            />
          </div>
        </div>

        {/* Row: Publication Date & Estado */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fecha de Publicación
            </label>
            <input
              type="date"
              name="publicationDate"
              value={formData.publicationDate}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Estado
            </label>
            <select
              name="documentState"
              value={formData.documentState}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              disabled={uploading}
            >
              {DOCUMENT_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fecha de última reforma - conditional */}
        {formData.documentState === 'REFORMADO' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fecha de Última Reforma <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="lastReformDate"
              value={formData.lastReformDate}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                errors.lastReformDate ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={uploading}
            />
            {errors.lastReformDate && (
              <p className="mt-1 text-sm text-red-600">{errors.lastReformDate}</p>
            )}
          </div>
        )}

        {/* File Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Archivo PDF <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className={`flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                errors.file
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
              } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  {formData.file ? (
                    <>
                      <FileText className="inline h-4 w-4 mr-1" />
                      {formData.file.name}
                    </>
                  ) : (
                    'Click para seleccionar archivo PDF'
                  )}
                </p>
                {formData.file && (
                  <p className="text-xs text-gray-500 mt-1">
                    {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>
            </label>
          </div>
          {errors.file && (
            <p className="mt-1 text-sm text-red-600">{errors.file}</p>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Procesamiento Automático</p>
            <p>
              El documento será procesado automáticamente para generar embeddings vectoriales y
              estará disponible inmediatamente para consultas en el sistema RAG.
            </p>
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-indigo-900">
                Subiendo y procesando documento...
              </span>
              <span className="text-sm font-semibold text-indigo-600">
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-indigo-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={uploading}
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={uploading || !formData.file}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>Subir Documento Legal</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
