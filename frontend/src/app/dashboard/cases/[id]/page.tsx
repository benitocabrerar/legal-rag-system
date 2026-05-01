'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { casesAPI, documentsAPI, queryAPI } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { LegalType, Priority } from '@/lib/design-tokens';
import { EnhancedCaseHeader } from '@/components/case-detail/EnhancedCaseHeader';
import { PartiesPanel } from '@/components/case-detail/PartiesPanel';
import { CaseMetadataPanel } from '@/components/case-detail/CaseMetadataPanel';
import { CoherenceCheck } from '@/components/case-detail/CoherenceCheck';
import { FinancePanel } from '@/components/case-detail/FinancePanel';
import { ProcessPipeline } from '@/components/case-detail/ProcessPipeline';
import { SpecializedPrompts } from '@/components/case-detail/SpecializedPrompts';
import { LegalReferences } from '@/components/case-detail/LegalReferences';
import { LegalDocGenDialog } from '@/components/case-detail/LegalDocGenDialog';
import { CaseAIChat } from '@/components/case-detail/CaseAIChat';
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Eye,
  Sparkles,
  Send,
  Paperclip,
  Plus,
  FolderOpen,
} from 'lucide-react';

interface Document {
  id: string;
  filename?: string;
  title?: string;
  mimeType?: string;
  size?: number;
  hasPdf?: boolean;
  hasBinary?: boolean;
  isImage?: boolean;
  isOffice?: boolean;
  createdAt: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: string[];
}

// Loader del texto extraído de DOCX/XLSX para mostrar dentro del modal
function OfficeContentViewer({ docId }: { docId: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    documentsAPI
      .get(docId)
      .then((d: any) => {
        if (cancel) return;
        setContent(d.document?.content || d.content || '(sin texto extraído)');
      })
      .catch(() => !cancel && setContent('(no se pudo cargar el texto extraído)'))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [docId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Cargando contenido extraído...
      </div>
    );
  }
  return (
    <div className="overflow-auto flex-1 p-6">
      <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
        {content}
      </pre>
    </div>
  );
}

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [caseData, setCaseData] = useState<any>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'contracts' | 'evidence' | 'reports'>('all');
  const [showGenerateDocModal, setShowGenerateDocModal] = useState(false);
  const [showLegalDocGen, setShowLegalDocGen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [coherenceKey, setCoherenceKey] = useState(0);
  const bumpCoherence = () => setCoherenceKey((k) => k + 1);
  const [viewingDoc, setViewingDoc] = useState<{
    id: string;
    title: string;
    content?: string;
    blobUrl?: string;
    mimeType?: string;
    isPdf?: boolean;
    isImage?: boolean;
    isOffice?: boolean;
    size?: number;
    createdAt: string;
  } | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  const handleViewDocument = async (doc: Document) => {
    setLoadingDoc(true);
    try {
      const mime = doc.mimeType || '';
      const isPdf = !!doc.hasPdf || /pdf/i.test(mime);
      const isImage = !!doc.isImage || /^image\//i.test(mime);
      const isOffice = !!doc.isOffice || /(officedocument|ms-excel|msword|spreadsheet|wordprocessing)/i.test(mime);
      const isBinary = !!doc.hasBinary || isPdf || isImage || isOffice;

      if (isBinary) {
        const res = await documentsAPI.fileBlob(doc.id, { download: false });
        const mimeType = res.headers['content-type'] || mime || 'application/octet-stream';
        const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: mimeType });
        const blobUrl = window.URL.createObjectURL(blob);
        setViewingDoc({
          id: doc.id,
          title: doc.filename || doc.title || 'Documento',
          blobUrl,
          mimeType,
          isPdf: /pdf/i.test(mimeType),
          isImage: /^image\//i.test(mimeType),
          isOffice: /(officedocument|ms-excel|msword|spreadsheet|wordprocessing)/i.test(mimeType),
          size: doc.size,
          createdAt: doc.createdAt,
        });
      } else {
        // Texto plano: traemos el content extraído
        const data = await documentsAPI.get(doc.id);
        const d = data.document || data;
        setViewingDoc({
          id: d.id,
          title: d.title || d.filename || 'Documento',
          content: d.content || '(sin contenido)',
          mimeType: mime || 'text/plain',
          isPdf: false,
          isImage: false,
          size: doc.size,
          createdAt: d.createdAt,
        });
      }
    } catch (e) {
      console.error('Error viewing document:', e);
      alert('No se pudo cargar el documento');
    } finally {
      setLoadingDoc(false);
    }
  };

  const closeViewer = () => {
    if (viewingDoc?.blobUrl) {
      window.URL.revokeObjectURL(viewingDoc.blobUrl);
    }
    setViewingDoc(null);
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      const mime = doc.mimeType || '';
      const isBinary =
        !!doc.hasBinary ||
        !!doc.isImage ||
        !!doc.isOffice ||
        /pdf|image|officedocument|ms-excel|msword|spreadsheet|wordprocessing/i.test(mime);
      let blob: Blob;
      let suggestedName: string;

      if (isBinary) {
        const res = await documentsAPI.fileBlob(doc.id, { download: true });
        const mimeType = res.headers['content-type'] || doc.mimeType || 'application/octet-stream';
        blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: mimeType });
        // Extraer filename del Content-Disposition o usar el del documento
        const cd = res.headers['content-disposition'] || '';
        const match = cd.match(/filename="?([^";]+)"?/);
        suggestedName = match
          ? match[1]
          : doc.filename || `${doc.title || 'documento'}${/pdf/i.test(mimeType) ? '.pdf' : ''}`;
      } else {
        const res = await documentsAPI.download(doc.id);
        blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'text/plain;charset=utf-8' });
        const safeName = (doc.filename || doc.title || 'documento')
          .replace(/[^a-zA-Z0-9_\-. áéíóúÁÉÍÓÚñÑ]/g, '')
          .slice(0, 120);
        suggestedName = `${safeName}.txt`;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading:', e);
      alert('No se pudo descargar el documento');
    }
  };
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadCaseData();
    loadDocuments();
    loadQueryHistory();
    if (typeof window !== 'undefined' && caseId) {
      window.localStorage.setItem('last-case-id', caseId);
    }
  }, [caseId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadCaseData = async () => {
    try {
      const data = await casesAPI.get(caseId);
      // Mapear legalMatter (real) → legalType (UI) para que pipeline/prompts/refs sean coherentes
      const matter = (data.legalMatter || '').toLowerCase();
      let legalType: LegalType = 'civil';
      if (matter.includes('penal')) legalType = 'penal';
      else if (matter.includes('laboral')) legalType = 'laboral';
      else if (matter.includes('constituc')) legalType = 'constitucional';
      else if (matter.includes('tránsi') || matter.includes('transi')) legalType = 'transito';
      else if (matter.includes('administr')) legalType = 'administrativo';
      else if (matter.includes('civil')) legalType = 'civil';

      const enhancedData = {
        ...data,
        legalType,
        priority: (data.priority as Priority) || 'medium',
      };
      setCaseData(enhancedData);
    } catch (error) {
      console.error('Error loading case:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await documentsAPI.listByCase(caseId);
      setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadQueryHistory = async () => {
    try {
      const data = await queryAPI.getHistory(caseId);
      const formattedMessages: Message[] = [];
      data.forEach((item: any) => {
        formattedMessages.push({
          role: 'user',
          content: item.query,
          timestamp: item.createdAt,
        });
        formattedMessages.push({
          role: 'assistant',
          content: item.response,
          timestamp: item.createdAt,
          citations: item.citations || [],
        });
      });
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading query history:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación rápida en cliente
    if (file.size > 50 * 1024 * 1024) {
      alert('El archivo supera el límite de 50 MB');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      // Usar el nombre del archivo (sin extensión) como título
      const title = file.name.replace(/\.[^.]+$/, '');
      const res = await documentsAPI.upload(caseId, file, title);
      loadDocuments();
      const chunks = res?.document?.chunksCount ?? 0;
      if (chunks > 0) {
        console.log(`Documento vectorizado: ${chunks} chunks generados`);
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert(error?.response?.data?.error || 'Error al subir archivo');
    } finally {
      setUploading(false);
      e.target.value = ''; // permitir re-subir mismo archivo
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || querying) return;

    const userMessage: Message = {
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuerying(true);
    setQuery('');

    try {
      const response = await queryAPI.query({ caseId, query });
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString(),
        citations: response.citations || [],
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error querying:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Lo siento, ocurrió un error al procesar tu consulta. Por favor, intenta nuevamente.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setQuerying(false);
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setQuery(prompt);
  };

  const handleGenerateDocument = async (docType: string) => {
    if (!caseData) return;
    setGeneratingDoc(true);
    try {
      // Build context from case data and messages
      const context = `
Caso: ${caseData.title}
Descripción: ${caseData.description || 'Sin descripción'}
Estado: ${caseData.status}
Documentos: ${documents.length}

Conversación reciente:
${messages.slice(-5).map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`).join('\n')}
      `.trim();

      const response = await queryAPI.query({
        caseId,
        query: `Genera un ${docType} profesional basado en este caso. Incluye todos los detalles relevantes, formato legal apropiado y secciones necesarias. Contexto: ${context}`
      });

      // Create a new message with the generated document
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString(),
        citations: response.citations || [],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setShowGenerateDocModal(false);

      // Auto-scroll to see the generated document
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Error al generar el documento. Por favor, intenta nuevamente.');
    } finally {
      setGeneratingDoc(false);
    }
  };

  const handleExportCase = async (format: 'pdf' | 'json') => {
    if (!caseData) return;
    setExporting(true);
    try {
      const exportData = {
        case: caseData,
        documents: documents.map(d => ({
          filename: d.filename,
          size: d.size,
          createdAt: d.createdAt,
          mimeType: d.mimeType
        })),
        messages: messages,
        exportedAt: new Date().toISOString()
      };

      if (format === 'json') {
        // Download as JSON
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `caso-${caseData.title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // For PDF, we'll generate HTML content and use browser print
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>${caseData.title}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              h1 { color: #4F46E5; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
              .section { margin: 20px 0; }
              .label { font-weight: bold; color: #374151; }
              .message { margin: 10px 0; padding: 10px; border-left: 3px solid #E5E7EB; }
              .user { border-left-color: #4F46E5; }
              .assistant { border-left-color: #10B981; }
            </style>
          </head>
          <body>
            <h1>${caseData.title}</h1>
            <div class="section">
              <p><span class="label">Estado:</span> ${caseData.status}</p>
              <p><span class="label">Creado:</span> ${formatDate(caseData.createdAt)}</p>
              <p><span class="label">Descripción:</span> ${caseData.description || 'Sin descripción'}</p>
            </div>
            <div class="section">
              <h2>Documentos (${documents.length})</h2>
              <ul>
                ${documents.map(d => `<li>${d.filename || d.title || 'Sin título'} (${typeof d.size === 'number' && d.size > 0 ? (d.size / 1024).toFixed(2) + ' KB' : '—'})</li>`).join('')}
              </ul>
            </div>
            <div class="section">
              <h2>Conversación</h2>
              ${messages.map(m => `
                <div class="message ${m.role}">
                  <strong>${m.role === 'user' ? 'Usuario' : 'Asistente'}:</strong>
                  <p>${m.content.replace(/\n/g, '<br>')}</p>
                </div>
              `).join('')}
            </div>
          </body>
          </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        }
      }
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting case:', error);
      alert('Error al exportar el caso. Por favor, intenta nuevamente.');
    } finally {
      setExporting(false);
    }
  };

  const handleRequestAnalysis = async () => {
    if (!caseData) return;

    const analysisPrompt = `Por favor, proporciona un análisis completo y detallado de este caso legal:

**Información del Caso:**
- Título: ${caseData.title}
- Estado: ${caseData.status}
- Descripción: ${caseData.description || 'Sin descripción'}
- Documentos disponibles: ${documents.length}

**Análisis solicitado:**
1. Resumen ejecutivo del caso
2. Puntos fuertes y débiles
3. Riesgos legales identificados
4. Recomendaciones estratégicas
5. Próximos pasos sugeridos

Por favor, basa tu análisis en la información disponible y en los documentos del caso.`;

    setQuery(analysisPrompt);
    // Trigger the query automatically
    setTimeout(() => {
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 100);
  };

  const filteredDocuments = documents.filter((doc) => {
    if (selectedCategory === 'all') return true;
    // Simple categorization based on filename (puede no existir en docs viejos).
    const filename = (doc.filename ?? doc.title ?? '').toLowerCase();
    if (selectedCategory === 'contracts') return filename.includes('contrato') || filename.includes('contract');
    if (selectedCategory === 'evidence') return filename.includes('prueba') || filename.includes('evidence');
    if (selectedCategory === 'reports') return filename.includes('informe') || filename.includes('report');
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando caso...</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📁</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Caso no encontrado</h2>
        <p className="text-gray-600">El caso que buscas no existe o fue eliminado.</p>
      </div>
    );
  }

  const legalType = (caseData.legalType as LegalType) || 'civil';

  return (
    <div className="space-y-6">
      {/* Enhanced Case Header */}
      <EnhancedCaseHeader caseData={caseData} />

      {/* Verificador de coherencia: detecta inconsistencias en cada carga */}
      <CoherenceCheck
        caseId={caseId}
        triggerKey={coherenceKey}
        onRepaired={() => {
          loadCaseData();
          bumpCoherence();
        }}
      />

      {/* Metadata jurídica del caso (editable + IA) */}
      <div data-section="case-metadata">
        <CaseMetadataPanel
          caseId={caseId}
          onUpdated={(d) => {
            setCaseData((prev: any) => ({ ...prev, ...d }));
            bumpCoherence();
          }}
        />
      </div>

      {/* Parties & Notifications Panel */}
      <PartiesPanel caseId={caseId} />

      {/* Finanzas del caso */}
      <FinancePanel caseId={caseId} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT SIDEBAR: Documents & Resources */}
        <div className="lg:col-span-3 space-y-6">
          {/* Documents Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-gray-900">Documentos</h2>
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                  {documents.length}
                </span>
              </div>

              {/* Upload Button */}
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.json,.png,.jpg,.jpeg,.webp,.gif,.bmp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/plain,image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md">
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Subir Archivo
                    </>
                  )}
                </div>
              </label>
            </div>

            {/* Category Tabs */}
            <div className="px-4 py-2 border-b border-gray-200 flex gap-2 overflow-x-auto">
              {(['all', 'contracts', 'evidence', 'reports'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {cat === 'all'
                    ? 'Todos'
                    : cat === 'contracts'
                    ? 'Contratos'
                    : cat === 'evidence'
                    ? 'Evidencia'
                    : 'Informes'}
                </button>
              ))}
            </div>

            {/* Documents List */}
            <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
              {filteredDocuments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No hay documentos en esta categoría</p>
                </div>
              ) : (
                filteredDocuments.map((doc) => (
                  <div key={doc.id} className="p-3 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{doc.filename || doc.title || 'Sin título'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {typeof doc.size === 'number' && doc.size > 0
                            ? `${(doc.size / 1024).toFixed(1)} KB`
                            : '—'}
                          {' • '}
                          {formatDate(doc.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleViewDocument(doc)}
                          className="p-1.5 hover:bg-indigo-100 rounded transition-colors"
                          title={doc.hasPdf ? 'Ver PDF' : 'Ver'}
                          aria-label="Ver documento"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadDocument(doc)}
                          className="p-1.5 hover:bg-indigo-100 rounded transition-colors"
                          title={doc.hasPdf ? 'Descargar PDF' : 'Descargar'}
                          aria-label="Descargar documento"
                        >
                          <Download className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Process Pipeline */}
          <ProcessPipeline
            legalType={legalType}
            currentStage={(() => {
              const stage = caseData.proceduralStage || '';
              const stageMap: Record<string, Record<string, number>> = {
                penal: { 'denuncia': 0, 'instrucción': 1, 'instruccion': 1, 'evaluación': 2, 'evaluacion': 2, 'preparatoria': 2, 'juicio': 3, 'sentencia': 4, 'ejecución': 5, 'ejecucion': 5 },
                civil: { 'demanda': 0, 'contestación': 1, 'contestacion': 1, 'pruebas': 2, 'audiencia': 3, 'sentencia': 4, 'apelación': 5, 'apelacion': 5 },
                laboral: { 'demanda': 0, 'mediación': 1, 'mediacion': 1, 'contestación': 2, 'contestacion': 2, 'audiencia': 3, 'sentencia': 4, 'ejecución': 5, 'ejecucion': 5 },
                constitucional: { 'admisión': 0, 'admision': 0, 'análisis': 1, 'analisis': 1, 'audiencia': 2, 'deliberación': 3, 'deliberacion': 3, 'sentencia': 4 },
                transito: { 'citación': 0, 'citacion': 0, 'revisión': 1, 'revision': 1, 'audiencia': 2, 'resolución': 3, 'resolucion': 3, 'apelación': 4, 'apelacion': 4 },
                administrativo: { 'solicitud': 0, 'evaluación': 1, 'evaluacion': 1, 'resolución': 2, 'resolucion': 2, 'recurso': 3, 'sentencia': 4 },
              };
              const map = stageMap[legalType] || {};
              const lower = stage.toLowerCase();
              for (const [k, v] of Object.entries(map)) {
                if (lower.includes(k)) return v;
              }
              return 0;
            })()}
          />
        </div>

        {/* CENTER PANEL: AI Assistant */}
        <div className="lg:col-span-6 space-y-6">
          {/* Specialized Prompts */}
          <SpecializedPrompts legalType={legalType} onPromptSelect={handlePromptSelect} />

          {/* Chat Interface — nuevo componente con streaming Claude, sugerencias
              específicas del caso, copy / regenerate / export, y subida de archivos
              inline. El bloque viejo (synchronous textarea + handleQuery) sigue
              compilando abajo pero ya no se renderiza en producción. */}
          <div className="h-[70vh] min-h-[480px] sm:h-[640px]">
            <CaseAIChat caseId={caseId} onDocumentUploaded={() => loadDocuments()} />
          </div>

          {/* (legacy chat — oculto, conservado para no romper handlers) */}
          <div className="hidden bg-white rounded-xl shadow-sm border border-gray-200 flex-col h-[60vh] min-h-[420px] sm:h-[600px]">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                <h2 className="font-bold text-gray-900">Asistente Legal IA</h2>
                <span className="ml-auto inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
                  En línea
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {documents.length > 0
                  ? `Analizando ${documents.length} documento${documents.length > 1 ? 's' : ''}`
                  : 'Listo para responder tus consultas legales'}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🤖</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">¡Hola! Soy tu Asistente Legal IA</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Pregúntame lo que necesites. Puedo ayudarte con análisis de documentos,
                    referencias legales, redacción y estrategia legal. Sube documentos para análisis específicos.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
                      Analizar contratos
                    </button>
                    <button className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors">
                      Buscar jurisprudencia
                    </button>
                    <button className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                      Redactar documento
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl p-4 ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

                        {/* Citations */}
                        {message.role === 'assistant' && message.citations && message.citations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-300">
                            <p className="text-xs font-semibold text-gray-600 mb-2">📚 Referencias citadas:</p>
                            <div className="space-y-1">
                              {message.citations.map((citation, idx) => (
                                <p key={idx} className="text-xs text-gray-600">
                                  • {citation}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        <p
                          className={`text-xs mt-2 ${
                            message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'
                          }`}
                        >
                          {formatDateTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {querying && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 p-4 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                              style={{ animationDelay: '0.1s' }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                              style={{ animationDelay: '0.2s' }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">Analizando documentos...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleQuery} className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={querying}
                    placeholder="Escribe tu consulta legal..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        // Create a synthetic form event for handleQuery
                        const syntheticEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent;
                        handleQuery(syntheticEvent);
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Presiona Enter para enviar, Shift + Enter para nueva línea
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={querying || !query.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Case Intelligence */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Acciones Rápidas
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowLegalDocGen(true)}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg font-medium hover:scale-[1.01] hover:shadow-lg shadow-violet-500/30 transition-all shadow-sm flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generar Documento Legal
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="w-full px-4 py-2.5 border-2 border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar Caso
              </button>
              <button
                onClick={handleRequestAnalysis}
                className="w-full px-4 py-2.5 border-2 border-purple-600 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Solicitar Análisis IA
              </button>
            </div>
          </div>

          {/* Legal References */}
          <LegalReferences legalType={legalType} />
        </div>
      </div>

      {/* Generate Document Modal */}
      {showGenerateDocModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Generar Documento</h3>
            <p className="text-gray-600 mb-6">
              Selecciona el tipo de documento que deseas generar con IA:
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleGenerateDocument('contrato legal')}
                disabled={generatingDoc}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                📄 Contrato Legal
              </button>
              <button
                onClick={() => handleGenerateDocument('demanda o petición')}
                disabled={generatingDoc}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                ⚖️ Demanda o Petición
              </button>
              <button
                onClick={() => handleGenerateDocument('informe legal')}
                disabled={generatingDoc}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                📊 Informe Legal
              </button>
              <button
                onClick={() => handleGenerateDocument('carta legal')}
                disabled={generatingDoc}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                ✉️ Carta Legal
              </button>
              <button
                onClick={() => handleGenerateDocument('resumen ejecutivo del caso')}
                disabled={generatingDoc}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                📋 Resumen Ejecutivo
              </button>
            </div>
            {generatingDoc && (
              <div className="mt-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Generando documento...</p>
              </div>
            )}
            <button
              onClick={() => setShowGenerateDocModal(false)}
              disabled={generatingDoc}
              className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Export Case Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Exportar Caso</h3>
            <p className="text-gray-600 mb-6">
              Selecciona el formato de exportación:
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleExportCase('pdf')}
                disabled={exporting}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                <FileText className="w-5 h-5" />
                <div className="text-left flex-1">
                  <div className="font-bold">Exportar como PDF</div>
                  <div className="text-sm text-red-100">Documento imprimible con formato profesional</div>
                </div>
              </button>
              <button
                onClick={() => handleExportCase('json')}
                disabled={exporting}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                <Download className="w-5 h-5" />
                <div className="text-left flex-1">
                  <div className="font-bold">Exportar como JSON</div>
                  <div className="text-sm text-blue-100">Datos estructurados para backup o migración</div>
                </div>
              </button>
            </div>
            {exporting && (
              <div className="mt-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Exportando caso...</p>
              </div>
            )}
            <button
              onClick={() => setShowExportModal(false)}
              disabled={exporting}
              className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* View Document Modal */}
      {viewingDoc && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeViewer();
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 truncate">{viewingDoc.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDate(viewingDoc.createdAt)}
                  {viewingDoc.mimeType && (
                    <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-mono text-[10px]">
                      {viewingDoc.mimeType}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (viewingDoc.isPdf && viewingDoc.blobUrl) {
                      // Descarga directa del blob ya cargado
                      const a = document.createElement('a');
                      a.href = viewingDoc.blobUrl;
                      a.download = viewingDoc.title.endsWith('.pdf')
                        ? viewingDoc.title
                        : `${viewingDoc.title}.pdf`;
                      a.click();
                    } else {
                      await handleDownloadDocument({
                        id: viewingDoc.id,
                        title: viewingDoc.title,
                        filename: viewingDoc.title,
                        mimeType: viewingDoc.mimeType,
                        hasPdf: viewingDoc.isPdf,
                        hasBinary: viewingDoc.isPdf,
                        createdAt: viewingDoc.createdAt,
                      });
                    }
                  }}
                  className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </button>
                <button
                  onClick={closeViewer}
                  className="p-2 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>
            </div>

            {viewingDoc.isPdf && viewingDoc.blobUrl ? (
              // Viewer PDF nativo del browser
              <iframe
                src={viewingDoc.blobUrl}
                title={viewingDoc.title}
                className="flex-1 w-full bg-gray-100"
                style={{ border: 0 }}
              />
            ) : viewingDoc.isImage && viewingDoc.blobUrl ? (
              // Viewer de imágenes
              <div className="flex-1 flex items-center justify-center bg-gray-100 overflow-auto p-6">
                <img
                  src={viewingDoc.blobUrl}
                  alt={viewingDoc.title}
                  className="max-w-full max-h-full object-contain shadow-lg rounded"
                />
              </div>
            ) : viewingDoc.isOffice && viewingDoc.blobUrl ? (
              // Word / Excel: vista previa del texto extraído + opción descarga
              <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
                <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3 text-sm text-amber-900">
                  <span className="font-semibold">📎 Documento Office</span>
                  <span>·</span>
                  <span>Para edición usa Word/Excel; aquí ves el texto extraído.</span>
                  <a
                    href={viewingDoc.blobUrl}
                    download={viewingDoc.title}
                    className="ml-auto px-3 py-1 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700"
                  >
                    Descargar original
                  </a>
                </div>
                <OfficeContentViewer docId={viewingDoc.id} />
              </div>
            ) : viewingDoc.blobUrl ? (
              // Otros binarios
              <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-600 gap-3">
                <p className="text-sm">No se puede previsualizar este tipo de archivo</p>
                <p className="text-xs text-gray-400 font-mono">{viewingDoc.mimeType}</p>
                <a
                  href={viewingDoc.blobUrl}
                  download={viewingDoc.title}
                  className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700"
                >
                  Descargar archivo
                </a>
              </div>
            ) : (
              // Texto plano (incluye contenido extraído de DOCX/XLSX cuando no hay binario)
              <div className="overflow-auto flex-1 p-6">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
                  {viewingDoc.content}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {loadingDoc && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg px-6 py-4 shadow-lg flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-gray-700">Cargando documento...</span>
          </div>
        </div>
      )}

      {/* Generador profesional de documentos legales con IA */}
      <LegalDocGenDialog
        isOpen={showLegalDocGen}
        onClose={() => setShowLegalDocGen(false)}
        caseId={caseId}
      />
    </div>
  );
}
