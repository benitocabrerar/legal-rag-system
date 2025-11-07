'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { casesAPI, documentsAPI, queryAPI } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';

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
}

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<any>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [querying, setQuerying] = useState(false);

  useEffect(() => {
    loadCaseData();
    loadDocuments();
    loadQueryHistory();
  }, [caseId]);

  const loadCaseData = async () => {
    try {
      const data = await casesAPI.get(caseId);
      setCaseData(data);
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
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error querying:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Lo siento, ocurrió un error al procesar tu consulta.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setQuerying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!caseData) {
    return <div className="text-center py-12">Caso no encontrado</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Case Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{caseData.title}</h1>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Cliente:</span> {caseData.clientName}
          </div>
          {caseData.caseNumber && (
            <div>
              <span className="font-medium">Nº Caso:</span> {caseData.caseNumber}
            </div>
          )}
          <div>
            <span className="font-medium">Estado:</span> {caseData.status || 'Activo'}
          </div>
          <div>
            <span className="font-medium">Creado:</span> {formatDate(caseData.createdAt)}
          </div>
        </div>
        {caseData.description && (
          <p className="mt-4 text-gray-700">{caseData.description}</p>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Documents Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Documentos</h2>
              <label className="cursor-pointer">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                  accept=".pdf,.doc,.docx,.txt"
                />
                <span className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors inline-block">
                  {uploading ? 'Subiendo...' : '+ Subir'}
                </span>
              </label>
            </div>

            <div className="space-y-2">
              {documents.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  No hay documentos
                </p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors"
                  >
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {doc.filename}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(doc.size / 1024).toFixed(1)} KB • {formatDate(doc.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RAG Chat Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6 h-[600px] flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Asistente IA</h2>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <p className="text-lg mb-2">¡Hola! Soy tu asistente legal con IA</p>
                  <p className="text-sm">
                    Sube documentos y pregúntame lo que necesites sobre el caso
                  </p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`text-xs mt-2 ${
                          message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'
                        }`}
                      >
                        {formatDateTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {querying && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 p-4 rounded-lg">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleQuery} className="flex space-x-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={querying || documents.length === 0}
                placeholder={
                  documents.length === 0
                    ? 'Sube documentos para empezar'
                    : 'Escribe tu consulta...'
                }
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={querying || !query.trim() || documents.length === 0}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
