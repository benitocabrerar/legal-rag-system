import { OpenAI } from 'openai';
import { PrismaClient } from '@prisma/client';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AssistantResponse {
  answer: string;
  citedDocuments: Array<{
    id: string;
    title: string;
    relevance: number;
    articleRefs?: string[];
  }>;
  confidence: number;
  processingTimeMs: number;
  conversationId: string;
}

interface ConversationContext {
  id: string;
  messages: ConversationMessage[];
  userId: string;
}

export class LegalAssistant {
  private openai: OpenAI;
  private prisma: PrismaClient;
  private systemPrompt: string;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for Legal Assistant');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.prisma = new PrismaClient();

    this.systemPrompt = `Eres un asistente legal especializado en el sistema jurídico de Ecuador.

Tu rol es:
1. Proporcionar respuestas precisas basadas en documentos legales reales
2. Citar fuentes específicas (leyes, artículos) para cada afirmación
3. Explicar conceptos legales complejos de manera clara
4. Alertar sobre limitaciones y sugerir consulta con abogados cuando sea necesario

Directrices:
- SIEMPRE cita las fuentes específicas (ley, artículo)
- Usa lenguaje claro pero técnicamente preciso
- Indica nivel de confianza en tus respuestas
- Sugiere consulta profesional para casos complejos
- Admite cuando no tienes información suficiente

Formato de respuestas:
- Respuesta clara y estructurada
- Referencias a documentos entre [brackets]
- Indicación de confianza al final`;
  }

  /**
   * Initialize or continue a conversation
   */
  async initConversation(userId: string, title?: string): Promise<string> {
    const conversation = await this.prisma.aIConversation.create({
      data: {
        userId,
        title: title || 'Nueva consulta legal',
        startedAt: new Date(),
        lastMessageAt: new Date(),
        messageCount: 0,
        isActive: true
      }
    });

    return conversation.id;
  }

  /**
   * Get conversation context
   */
  async getConversationContext(conversationId: string): Promise<ConversationContext | null> {
    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 20 // Last 20 messages for context
        }
      }
    });

    if (!conversation) {
      return null;
    }

    return {
      id: conversation.id,
      userId: conversation.userId,
      messages: conversation.messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }))
    };
  }

  /**
   * Process a user query and generate AI response
   */
  async processQuery(
    conversationId: string,
    userQuery: string,
    relevantDocs?: Array<{ id: string; content: string; title: string; articleNumber?: string }>
  ): Promise<AssistantResponse> {
    const startTime = Date.now();

    // Get conversation context
    const context = await this.getConversationContext(conversationId);
    if (!context) {
      throw new Error('Conversation not found');
    }

    // Build context from relevant documents
    let documentContext = '';
    if (relevantDocs && relevantDocs.length > 0) {
      documentContext = '\n\nDOCUMENTOS RELEVANTES:\n' +
        relevantDocs.map((doc, idx) =>
          `[${idx + 1}] ${doc.title}${doc.articleNumber ? ` - ${doc.articleNumber}` : ''}\n${doc.content}`
        ).join('\n\n');
    }

    // Build messages for GPT-4
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.systemPrompt + documentContext },
      ...context.messages.map(m => ({
        role: m.role,
        content: m.content
      } as OpenAI.Chat.ChatCompletionMessageParam)),
      { role: 'user', content: userQuery }
    ];

    // Save user message
    await this.prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: userQuery,
        timestamp: new Date()
      }
    });

    try {
      // Get AI response
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const answer = completion.choices[0]?.message?.content || 'No pude generar una respuesta.';

      // Extract cited documents from response
      const citedDocs = this.extractCitations(answer, relevantDocs || []);

      // Calculate confidence based on citation quality
      const confidence = this.calculateConfidence(answer, citedDocs.length, relevantDocs?.length || 0);

      const processingTimeMs = Date.now() - startTime;

      // Save assistant message
      const assistantMessage = await this.prisma.aIMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: answer,
          timestamp: new Date(),
          processingTimeMs,
          confidence,
          citedDocuments: citedDocs.map(d => d.id),
          citedChunks: citedDocs.map(d => d.articleRefs).filter(Boolean)
        }
      });

      // Save citations
      for (const doc of citedDocs) {
        await this.prisma.aICitation.create({
          data: {
            messageId: assistantMessage.id,
            documentId: doc.id,
            relevance: doc.relevance,
            articleRef: doc.articleRefs?.join(', '),
            timestamp: new Date()
          }
        });
      }

      // Update conversation
      await this.prisma.aIConversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          messageCount: { increment: 2 } // user + assistant
        }
      });

      return {
        answer,
        citedDocuments: citedDocs,
        confidence,
        processingTimeMs,
        conversationId
      };

    } catch (error) {
      console.error('Error generating AI response:', error);

      // Save error message
      await this.prisma.aIMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: 'Lo siento, ocurrió un error al procesar tu consulta. Por favor, intenta nuevamente.',
          timestamp: new Date(),
          confidence: 0,
          processingTimeMs: Date.now() - startTime
        }
      });

      throw error;
    }
  }

  /**
   * Extract citations from AI response
   */
  private extractCitations(
    response: string,
    availableDocs: Array<{ id: string; title: string; articleNumber?: string }>
  ): Array<{ id: string; title: string; relevance: number; articleRefs?: string[] }> {
    const citations: Array<{ id: string; title: string; relevance: number; articleRefs?: string[] }> = [];

    // Extract [number] references
    const refPattern = /\[(\d+)\]/g;
    const matches = [...response.matchAll(refPattern)];

    matches.forEach(match => {
      const idx = parseInt(match[1]) - 1;
      if (idx >= 0 && idx < availableDocs.length) {
        const doc = availableDocs[idx];

        // Check if already cited
        const existing = citations.find(c => c.id === doc.id);
        if (existing) {
          existing.relevance += 0.1; // Increase relevance for multiple citations
        } else {
          citations.push({
            id: doc.id,
            title: doc.title,
            relevance: 1.0,
            articleRefs: doc.articleNumber ? [doc.articleNumber] : undefined
          });
        }
      }
    });

    return citations;
  }

  /**
   * Calculate confidence score based on response quality
   */
  private calculateConfidence(response: string, citationsCount: number, availableDocsCount: number): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence if citations are present
    if (citationsCount > 0) {
      confidence += 0.2;
    }

    // Increase confidence if multiple citations
    if (citationsCount > 2) {
      confidence += 0.1;
    }

    // Increase confidence if good coverage of available docs
    if (availableDocsCount > 0) {
      const coverage = citationsCount / availableDocsCount;
      confidence += Math.min(coverage * 0.2, 0.2);
    }

    // Check for hedging language (reduces confidence)
    const hedgePatterns = [
      /podría ser/i,
      /tal vez/i,
      /posiblemente/i,
      /no estoy seguro/i,
      /depende/i
    ];

    if (hedgePatterns.some(pattern => pattern.test(response))) {
      confidence -= 0.1;
    }

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Save user feedback on assistant response
   */
  async saveFeedback(messageId: string, wasHelpful: boolean, feedbackText?: string): Promise<void> {
    await this.prisma.aIMessage.update({
      where: { id: messageId },
      data: {
        wasHelpful,
        feedbackText
      }
    });
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
    const messages = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' }
    });

    return messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    }));
  }

  /**
   * List user conversations
   */
  async listUserConversations(userId: string, limit: number = 20): Promise<Array<{
    id: string;
    title: string;
    startedAt: Date;
    lastMessageAt: Date;
    messageCount: number;
    isActive: boolean;
  }>> {
    const conversations = await this.prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        startedAt: true,
        lastMessageAt: true,
        messageCount: true,
        isActive: true
      }
    });

    return conversations;
  }

  /**
   * Close conversation
   */
  async closeConversation(conversationId: string): Promise<void> {
    await this.prisma.aIConversation.update({
      where: { id: conversationId },
      data: { isActive: false }
    });
  }
}

export const legalAssistant = new LegalAssistant();
