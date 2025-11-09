'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { casesAPI, documentsAPI, queryAPI } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { LegalType, Priority } from '@/lib/design-tokens';
import { EnhancedCaseHeader } from '@/components/case-detail/EnhancedCaseHeader';
import { ProcessPipeline } from '@/components/case-detail/ProcessPipeline';
import { SpecializedPrompts } from '@/components/case-detail/SpecializedPrompts';
import { LegalReferences } from '@/components/case-detail/LegalReferences';
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
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: string[];
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

  useEffect(() => {
    loadCaseData();
    loadDocuments();
    loadQueryHistory();
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
      // Add mock legal type and priority for enhanced UI
      const enhancedData = {
        ...data,
        legalType: (['civil', 'penal', 'laboral', 'constitucional', 'transito', 'administrativo'] as LegalType[])[
          Math.floor(Math.random() * 6)
        ],
        priority: (['high', 'medium', 'low'] as Priority[])[Math.floor(Math.random() * 3)],
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

    setUploading(true);
    try {
      await documentsAPI.upload(caseId, file);
      loadDocuments();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error al subir archivo');
    } finally {
      setUploading(false);
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

  const filteredDocuments = documents.filter((doc) => {
    if (selectedCategory === 'all') return true;
    // Simple categorization based on filename
    const filename = doc.filename.toLowerCase();
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
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                  accept=".pdf,.doc,.docx,.txt"
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
                        <p className="font-medium text-sm text-gray-900 truncate">{doc.filename}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {(doc.size / 1024).toFixed(1)} KB • {formatDate(doc.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1.5 hover:bg-indigo-100 rounded transition-colors"
                          title="Ver"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-indigo-100 rounded transition-colors"
                          title="Descargar"
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
          <ProcessPipeline legalType={legalType} currentStage={Math.floor(Math.random() * 4)} />
        </div>

        {/* CENTER PANEL: AI Assistant */}
        <div className="lg:col-span-6 space-y-6">
          {/* Specialized Prompts */}
          <SpecializedPrompts legalType={legalType} onPromptSelect={handlePromptSelect} />

          {/* Chat Interface */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[600px]">
            {/* Chat Header */}
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
                        handleQuery(e as any);
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
              <button className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Generar Documento
              </button>
              <button className="w-full px-4 py-2.5 border-2 border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar Caso
              </button>
              <button className="w-full px-4 py-2.5 border-2 border-purple-600 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Solicitar Análisis IA
              </button>
            </div>
          </div>

          {/* Legal References */}
          <LegalReferences legalType={legalType} />
        </div>
      </div>
    </div>
  );
}
