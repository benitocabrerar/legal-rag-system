'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { BackToDashboard } from '@/components/BackToDashboard';
import { useAIAssistant, useCases, useDocuments } from '@/hooks/useApiQueries';
import { useAIStream } from '@/hooks/useSSEStream';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bot,
  Send,
  Loader2,
  User,
  Briefcase,
  FileText,
  Lightbulb,
  Sparkles,
  StopCircle,
  Zap,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const suggestedQuestions = [
  '¿Cuáles son los precedentes legales relevantes?',
  'Resume los documentos del caso',
  'Identifica los puntos clave del caso',
  'Genera una cronología de eventos',
  'Analiza los riesgos legales',
  'Sugiere estrategias de defensa',
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hola, soy tu asistente legal de IA. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedCase, setSelectedCase] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [useStreaming, setUseStreaming] = useState(true);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: cases, isLoading: casesLoading } = useCases();
  const { data: documents, isLoading: documentsLoading } = useDocuments(selectedCase);

  // Streaming AI hook
  const {
    isStreaming,
    streamedText,
    error: streamError,
    sendMessage: sendStreamMessage,
    abortStream,
    reset: resetStream,
  } = useAIStream({
    endpoint: '/api/ai/stream',
    onStart: () => {
      const messageId = Date.now().toString() + '-assistant-stream';
      setStreamingMessageId(messageId);
      const newMessage: Message = {
        id: messageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    onChunk: (chunk, accumulated) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageId
            ? { ...msg, content: accumulated }
            : msg
        )
      );
    },
    onComplete: (response) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageId
            ? { ...msg, content: response, isStreaming: false }
            : msg
        )
      );
      setStreamingMessageId(null);
    },
    onError: (error) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageId
            ? {
                ...msg,
                content: 'Lo siento, ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente.',
                isStreaming: false,
              }
            : msg
        )
      );
      setStreamingMessageId(null);
    },
  });

  // Non-streaming AI mutation (fallback)
  const aiMutation = useAIAssistant({
    onSuccess: (data) => {
      const newMessage: Message = {
        id: Date.now().toString() + '-assistant',
        role: 'assistant',
        content: data.response || 'Lo siento, no pude generar una respuesta.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    onError: (error) => {
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: 'Lo siento, ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const isProcessing = isStreaming || aiMutation.isPending;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = input;
    setInput('');

    const context = {
      caseId: selectedCase || undefined,
      documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined,
    };

    if (useStreaming) {
      // Use streaming endpoint
      sendStreamMessage({ message: messageToSend, context });
    } else {
      // Fallback to non-streaming mutation
      aiMutation.mutate({ message: messageToSend, context });
    }
  }, [input, isProcessing, selectedCase, selectedDocuments, useStreaming, sendStreamMessage, aiMutation]);

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <BackToDashboard className="mb-3" />
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Asistente Legal IA</h1>
              <p className="text-sm text-gray-600">
                {isProcessing ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {isStreaming ? 'Generando respuesta...' : 'Procesando...'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    En línea
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <Bot className="h-5 w-5 text-blue-600" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse" />
                    )}
                  </div>
                  <div
                    className={`mt-1 flex items-center justify-between text-xs ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.isStreaming && (
                      <span className="flex items-center gap-1 text-blue-500">
                        <Zap className="h-3 w-3" />
                        Streaming
                      </span>
                    )}
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {aiMutation.isPending && !isStreaming && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Bot className="h-5 w-5 text-blue-600" />
                </div>
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Suggested Questions */}
        {messages.length <= 1 && (
          <div className="border-t border-gray-200 bg-white px-6 py-4">
            <div className="mx-auto max-w-4xl">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
                <Lightbulb className="h-4 w-4" />
                Preguntas Sugeridas
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestedQuestion(question)}
                    className="text-xs"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="mx-auto max-w-4xl">
            {/* Streaming Toggle */}
            <div className="mb-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={useStreaming}
                  onChange={(e) => setUseStreaming(e.target.checked)}
                  className="rounded border-gray-300"
                  disabled={isProcessing}
                />
                <Zap className="h-4 w-4" />
                Respuesta en streaming
              </label>
              {isStreaming && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={abortStream}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  Detener
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu pregunta o solicitud..."
                className="flex-1"
                disabled={isProcessing}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className="shrink-0"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Context Panel */}
      <div className="w-80 border-l border-gray-200 bg-white p-6">
        <div className="space-y-6">
          {/* Case Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" />
                Caso Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {casesLoading ? (
                <div className="text-sm text-gray-500">Cargando casos...</div>
              ) : (
                <Select
                  value={selectedCase}
                  onValueChange={(value) => {
                    setSelectedCase(value);
                    setSelectedDocuments([]);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Ninguno seleccionado" />
                  </SelectTrigger>
                  <SelectContent>
                    {(cases || []).map((case_: any) => (
                      <SelectItem key={case_.id} value={case_.id}>
                        {case_.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedCase && (
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Contexto activo
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Selection */}
          {selectedCase && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="text-sm text-gray-500">Cargando documentos...</div>
                ) : (
                  <div className="space-y-2">
                    {(documents || []).map((doc: any) => (
                      <label key={doc.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedDocuments.includes(doc.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDocuments([...selectedDocuments, doc.id]);
                            } else {
                              setSelectedDocuments(selectedDocuments.filter((id) => id !== doc.id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="truncate">{doc.fileName || doc.title}</span>
                      </label>
                    ))}
                    {(!documents || documents.length === 0) && (
                      <p className="text-sm text-gray-500">No hay documentos disponibles</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" />
                Capacidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Análisis de documentos legales</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Búsqueda de precedentes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Generación de resúmenes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Identificación de riesgos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Sugerencias estratégicas</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
