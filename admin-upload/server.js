#!/usr/bin/env node
/**
 * 🚀 POWERIA LEGAL - Admin Upload Server
 * Servidor standalone para carga de documentos sin límites
 * Características: Chunked upload, WebSocket, División automática, Dashboard en tiempo real
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fileUpload from 'express-fileupload';
import { PDFExtract } from 'pdf.js-extract';
import { PDFDocument } from 'pdf-lib';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración
const PORT = process.env.ADMIN_UPLOAD_PORT || 3333;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const MAX_CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB por chunk
const AUTO_SPLIT_THRESHOLD = 100; // Dividir PDFs con más de 100 páginas
const PAGES_PER_PART = 100;

// Inicialización
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pdfExtract = new PDFExtract();

// Almacenamiento temporal de chunks
const uploadSessions = new Map();
const processingQueue = new Map();

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));
app.use(fileUpload({
  limits: { fileSize: 1000 * 1024 * 1024 }, // 1 GB límite temporal
  useTempFiles: false, // Usar memoria para chunks (más rápido y evita problemas)
  debug: false
}));

// ============================================================================
// AUTENTICACIÓN
// ============================================================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, passwordHash: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden acceder' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    broadcast({ type: 'admin_login', data: { email: user.email, timestamp: new Date() } });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Error en autenticación' });
  }
});

// Middleware de autenticación
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ============================================================================
// CHUNKED UPLOAD
// ============================================================================

app.post('/api/upload/start', authenticate, async (req, res) => {
  try {
    const { filename, fileSize, totalChunks, normType, normTitle } = req.body;

    if (!filename || !fileSize || !totalChunks) {
      return res.status(400).json({ error: 'Parámetros incompletos' });
    }

    // Validar extensión PDF
    if (!filename.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'Solo se permiten archivos PDF' });
    }

    const sessionId = crypto.randomUUID();

    // Capturar IP del cliente
    const clientIp = req.headers['x-forwarded-for'] ||
                     req.headers['x-real-ip'] ||
                     req.socket.remoteAddress ||
                     req.connection.remoteAddress ||
                     'No disponible';

    uploadSessions.set(sessionId, {
      filename,
      fileSize,
      totalChunks,
      receivedChunks: 0,
      chunks: new Map(),
      normType,
      normTitle,
      userId: req.user.userId,
      clientIp: clientIp,
      startTime: Date.now(),
      status: 'uploading'
    });

    broadcast({
      type: 'upload_started',
      data: { sessionId, filename, fileSize, totalChunks }
    });

    res.json({ sessionId });
  } catch (error) {
    console.error('❌ Start upload error:', error);
    res.status(500).json({ error: 'Error al iniciar carga' });
  }
});

app.post('/api/upload/chunk', authenticate, async (req, res) => {
  try {
    const { sessionId, chunkIndex } = req.body;

    if (!req.files || !req.files.chunk) {
      console.error(`❌ Chunk ${chunkIndex}: req.files:`, req.files);
      return res.status(400).json({ error: 'Chunk no proporcionado' });
    }

    const session = uploadSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    const chunk = req.files.chunk;
    const chunkSize = chunk.data ? chunk.data.length : 0;

    console.log(`📦 Chunk ${chunkIndex}: ${chunkSize} bytes (${chunk.name || 'sin nombre'})`);

    if (!chunk.data || chunk.data.length === 0) {
      console.error(`❌ Chunk ${chunkIndex} está vacío!`);
      return res.status(400).json({ error: 'Chunk vacío recibido' });
    }

    session.chunks.set(parseInt(chunkIndex), chunk.data);
    session.receivedChunks++;

    const progress = (session.receivedChunks / session.totalChunks) * 100;

    broadcast({
      type: 'upload_progress',
      data: { sessionId, progress: progress.toFixed(1), receivedChunks: session.receivedChunks, totalChunks: session.totalChunks }
    });

    res.json({ received: session.receivedChunks, total: session.totalChunks });
  } catch (error) {
    console.error('❌ Chunk upload error:', error);
    res.status(500).json({ error: 'Error al cargar chunk' });
  }
});

app.post('/api/upload/complete', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = uploadSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    if (session.receivedChunks !== session.totalChunks) {
      return res.status(400).json({ error: 'Faltan chunks por cargar' });
    }

    // Combinar chunks
    const chunks = [];
    for (let i = 0; i < session.totalChunks; i++) {
      const chunk = session.chunks.get(i);
      if (!chunk) {
        console.error(`❌ Chunk ${i} faltante para sesión ${sessionId}`);
        uploadSessions.delete(sessionId);
        return res.status(400).json({ error: `Chunk ${i} no fue recibido correctamente` });
      }
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    console.log(`📦 Archivo combinado: ${fileBuffer.length} bytes`);
    console.log(`🔍 Primeros bytes (hex): ${fileBuffer.slice(0, 8).toString('hex')}`);
    console.log(`🔍 Primeros bytes (ASCII): ${fileBuffer.slice(0, 8).toString('ascii')}`);

    // Validar PDF magic bytes (más permisivo)
    const magicBytes = fileBuffer.slice(0, 4).toString('hex');
    const header = fileBuffer.slice(0, 5).toString('ascii');

    // Verificar %PDF o magic bytes
    if (magicBytes !== '25504446' && !header.startsWith('%PDF')) {
      console.error(`❌ Archivo no es PDF válido. Magic bytes: ${magicBytes}, Header: ${header}`);
      uploadSessions.delete(sessionId);
      return res.status(400).json({
        error: 'Archivo no es un PDF válido',
        details: `Detectado: ${header.substring(0, 10)}...`
      });
    }

    console.log(`✅ PDF válido confirmado`);

    session.status = 'processing';
    session.fileBuffer = fileBuffer;

    broadcast({
      type: 'upload_complete',
      data: { sessionId, filename: session.filename, fileSize: session.fileSize }
    });

    // Iniciar procesamiento en background
    processDocument(sessionId, session);

    res.json({
      sessionId,
      status: 'processing',
      message: 'Archivo cargado exitosamente, iniciando procesamiento...'
    });
  } catch (error) {
    console.error('❌ Complete upload error:', error);
    res.status(500).json({ error: 'Error al completar carga' });
  }
});

// ============================================================================
// EXTRACCIÓN DE METADATOS CON IA
// ============================================================================

async function extractMetadataWithAI(pages, documentTitle) {
  try {
    // Tomar las primeras 5 páginas para análisis
    const firstPages = pages.slice(0, 5);
    const textToAnalyze = firstPages
      .map(page => page.content.map(item => item.str).join(' '))
      .join('\n\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Eres un experto en documentos legales ecuatorianos. Analiza el texto y extrae metadatos precisos.

IMPORTANTE: Retorna SIEMPRE un JSON válido con TODOS los campos, incluso si algunos son null.

Campos a extraer:
- normType: Uno de: CONSTITUTIONAL_NORM, ORGANIC_LAW, ORDINARY_LAW, ORGANIC_CODE, ORDINARY_CODE, REGULATION_GENERAL, REGULATION_EXECUTIVE, ORDINANCE_MUNICIPAL, ORDINANCE_METROPOLITAN, RESOLUTION_ADMINISTRATIVE, RESOLUTION_JUDICIAL, ADMINISTRATIVE_AGREEMENT, INTERNATIONAL_TREATY, JUDICIAL_PRECEDENT
- legalHierarchy: Uno de: CONSTITUCION, TRATADOS_INTERNACIONALES_DDHH, LEYES_ORGANICAS, LEYES_ORDINARIAS, CODIGOS_ORGANICOS, CODIGOS_ORDINARIOS, REGLAMENTOS, ORDENANZAS, RESOLUCIONES, ACUERDOS_ADMINISTRATIVOS
- publicationType: Uno de: ORDINARIO, SUPLEMENTO, SEGUNDO_SUPLEMENTO, SUPLEMENTO_ESPECIAL, EDICION_CONSTITUCIONAL
- publicationNumber: Número del Registro Oficial (ej: "449", "298")
- publicationDate: Fecha en formato ISO 8601 (YYYY-MM-DD) o null
- lastReformDate: Fecha de última reforma en formato ISO 8601 o null
- documentState: ORIGINAL o REFORMADO
- jurisdiction: NACIONAL, PROVINCIAL, MUNICIPAL, o INTERNACIONAL
- year: Año de publicación (número)
- extractionConfidence: número entre 0 y 1 indicando confianza

Formato JSON de respuesta:
{
  "normType": "CONSTITUTIONAL_NORM",
  "legalHierarchy": "CONSTITUCION",
  "publicationType": "ORDINARIO",
  "publicationNumber": "449",
  "publicationDate": "2008-10-20",
  "lastReformDate": null,
  "documentState": "ORIGINAL",
  "jurisdiction": "NACIONAL",
  "year": 2008,
  "extractionConfidence": 0.95
}`
        },
        {
          role: "user",
          content: `Título del documento: "${documentTitle}"

Texto de las primeras páginas:
${textToAnalyze.substring(0, 4000)}

Extrae todos los metadatos en formato JSON.`
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const extracted = JSON.parse(completion.choices[0].message.content);

    // Capturar información de uso de tokens
    const usage = completion.usage;

    // Convertir fechas a objetos Date
    const metadata = {
      normType: extracted.normType || null,
      legalHierarchy: extracted.legalHierarchy || null,
      publicationType: extracted.publicationType || 'ORDINARIO',
      publicationNumber: extracted.publicationNumber || '',
      publicationDate: extracted.publicationDate ? new Date(extracted.publicationDate) : null,
      lastReformDate: extracted.lastReformDate ? new Date(extracted.lastReformDate) : null,
      documentState: extracted.documentState || 'ORIGINAL',
      jurisdiction: extracted.jurisdiction || 'NACIONAL',
      year: extracted.year || null,
      extractionConfidence: extracted.extractionConfidence || 0.5,
      // Información de tokens de la extracción
      tokensUsed: {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0
      }
    };

    console.log('✅ Metadatos extraídos con IA:', metadata);
    return metadata;

  } catch (error) {
    console.error('❌ Error extrayendo metadatos con IA:', error);
    // Retornar valores por defecto si falla
    return {
      normType: null,
      legalHierarchy: null,
      publicationType: 'ORDINARIO',
      publicationNumber: '',
      publicationDate: null,
      lastReformDate: null,
      documentState: 'ORIGINAL',
      jurisdiction: 'NACIONAL',
      year: null,
      extractionConfidence: 0
    };
  }
}

// ============================================================================
// PROCESAMIENTO DE DOCUMENTOS
// ============================================================================

async function processDocument(sessionId, session) {
  try {
    broadcast({ type: 'processing_started', data: { sessionId, filename: session.filename } });

    // Extraer metadatos del PDF
    const pdfDoc = await PDFDocument.load(session.fileBuffer);
    const totalPages = pdfDoc.getPageCount();
    const fileSizeMB = session.fileSize / (1024 * 1024);

    broadcast({
      type: 'pdf_analyzed',
      data: { sessionId, totalPages, fileSizeMB: fileSizeMB.toFixed(2) }
    });

    // Decidir si dividir o procesar completo
    const shouldSplit = totalPages > AUTO_SPLIT_THRESHOLD;

    if (shouldSplit) {
      await processWithSplit(sessionId, session, pdfDoc, totalPages, fileSizeMB);
    } else {
      await processComplete(sessionId, session, totalPages, fileSizeMB);
    }

  } catch (error) {
    console.error('❌ Processing error:', error);
    broadcast({
      type: 'processing_error',
      data: { sessionId, error: error.message }
    });
    uploadSessions.delete(sessionId);
  }
}

async function processComplete(sessionId, session, totalPages, fileSizeMB) {
  try {
    broadcast({ type: 'processing_phase', data: { sessionId, phase: 'Extrayendo texto...' } });

    // Extraer texto completo
    const extractedData = await pdfExtract.extractBuffer(session.fileBuffer);
    const fullText = extractedData.pages
      .map(page => page.content.map(item => item.str).join(' '))
      .join('\n\n');

    broadcast({ type: 'processing_phase', data: { sessionId, phase: 'Extrayendo metadatos automáticamente...' } });

    // Extraer metadatos con IA
    const aiMetadata = await extractMetadataWithAI(extractedData.pages, session.normTitle);

    broadcast({ type: 'processing_phase', data: { sessionId, phase: 'Creando documento en BD...' } });

    // Crear documento con metadatos completos
    const document = await prisma.legalDocument.create({
      data: {
        normType: session.normType || aiMetadata.normType || 'ORDINARY_LAW',
        normTitle: session.normTitle || session.filename,
        legalHierarchy: aiMetadata.legalHierarchy || 'LEYES_ORDINARIAS',
        publicationType: aiMetadata.publicationType || 'ORDINARIO',
        publicationNumber: aiMetadata.publicationNumber || '',
        publicationDate: aiMetadata.publicationDate,
        lastReformDate: aiMetadata.lastReformDate,
        documentState: aiMetadata.documentState || 'ORIGINAL',
        jurisdiction: aiMetadata.jurisdiction || 'NACIONAL',
        content: fullText,
        uploadedBy: session.userId,
        metadata: {
          fileSizeMB,
          totalPages,
          uploadMethod: 'admin_direct',
          uploadSessionId: sessionId,
          uploadedAt: new Date().toISOString(),
          aiExtractedMetadata: aiMetadata
        }
      }
    });

    broadcast({ type: 'processing_phase', data: { sessionId, phase: 'Generando chunks y embeddings...' } });

    // Generar chunks y embeddings
    const embeddingStats = await generateChunksAndEmbeddings(document.id, fullText, sessionId);

    // Calcular tamaño en base de datos (aproximado)
    const dbSizeBytes = Buffer.byteLength(fullText, 'utf8');
    const dbSizeMB = (dbSizeBytes / (1024 * 1024)).toFixed(2);

    // Calcular chunks de embeddings generados
    const totalChunks = await prisma.legalDocumentChunk.count({
      where: { legalDocumentId: document.id }
    });

    // Obtener IP del cliente
    const clientIp = session.clientIp || 'No disponible';

    // Obtener IP de la base de datos (extraer del DATABASE_URL)
    const dbUrl = process.env.DATABASE_URL || '';
    const dbHostMatch = dbUrl.match(/@([^:\/]+)/);
    const dbHost = dbHostMatch ? dbHostMatch[1] : 'dpg-d46iarje5dus73ar46c0-a.oregon-postgres.render.com';

    // Calcular costos de IA
    const metadataTokens = aiMetadata.tokensUsed || { totalTokens: 0 };
    const embeddingTokens = embeddingStats.totalEmbeddingTokens || 0;

    // Precios de OpenAI (al 2024)
    const gpt4InputCost = 0.03 / 1000; // $0.03 por 1K tokens
    const gpt4OutputCost = 0.06 / 1000; // $0.06 por 1K tokens
    const embeddingCost = 0.0001 / 1000; // $0.0001 por 1K tokens

    const metadataCost = (
      (metadataTokens.promptTokens || 0) * gpt4InputCost +
      (metadataTokens.completionTokens || 0) * gpt4OutputCost
    );
    const embeddingCostTotal = embeddingTokens * embeddingCost;
    const totalCost = metadataCost + embeddingCostTotal;

    // Informe completo
    const uploadReport = {
      sessionId,
      documentId: document.id,

      // Información del documento
      documentInfo: {
        title: document.normTitle,
        type: document.normType,
        filename: session.filename,
        totalPages,
        fileSizeMB: fileSizeMB.toFixed(2)
      },

      // Metadatos extraídos
      extractedMetadata: {
        legalHierarchy: aiMetadata.legalHierarchy,
        publicationType: aiMetadata.publicationType,
        publicationNumber: aiMetadata.publicationNumber,
        publicationDate: aiMetadata.publicationDate,
        lastReformDate: aiMetadata.lastReformDate,
        documentState: aiMetadata.documentState,
        jurisdiction: aiMetadata.jurisdiction,
        year: aiMetadata.year,
        confidence: (aiMetadata.extractionConfidence * 100).toFixed(0) + '%'
      },

      // Procesamiento
      processing: {
        chunksGenerated: totalChunks,
        textSize: dbSizeMB + ' MB',
        dbSizeBytes: dbSizeBytes,
        uploadMethod: 'Direct Upload - Sin división'
      },

      // Tiempo
      timing: {
        uploadDuration: ((Date.now() - session.startTime) / 1000).toFixed(1) + 's',
        startTime: new Date(session.startTime).toISOString(),
        endTime: new Date().toISOString()
      },

      // Ubicación
      storage: {
        database: 'PostgreSQL - Render',
        region: 'Oregon, USA',
        host: dbHost,
        table: 'legal_documents'
      },

      // Información Técnica de IA
      aiUsage: {
        // Tokens de extracción de metadatos
        metadataExtraction: {
          model: 'gpt-4',
          promptTokens: metadataTokens.promptTokens || 0,
          completionTokens: metadataTokens.completionTokens || 0,
          totalTokens: metadataTokens.totalTokens || 0,
          estimatedCost: '$' + metadataCost.toFixed(4)
        },
        // Tokens de embeddings
        embeddings: {
          model: 'text-embedding-ada-002',
          totalTokens: embeddingTokens,
          chunksProcessed: totalChunks,
          estimatedCost: '$' + embeddingCostTotal.toFixed(4)
        },
        // Total combinado
        totalCost: '$' + totalCost.toFixed(4),
        totalTokens: (metadataTokens.totalTokens || 0) + embeddingTokens
      },

      // Información de Red
      network: {
        clientIp: clientIp,
        databaseIp: dbHost,
        serverRegion: 'Oregon, USA',
        connectionProtocol: 'PostgreSQL SSL',
        uploadProtocol: 'HTTP/WebSocket'
      },

      // Información del Sistema
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
          total: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB'
        },
        uptime: (process.uptime() / 60).toFixed(1) + ' minutos'
      }
    };

    broadcast({
      type: 'processing_complete',
      data: uploadReport
    });

    uploadSessions.delete(sessionId);

  } catch (error) {
    throw error;
  }
}

async function processWithSplit(sessionId, session, pdfDoc, totalPages, fileSizeMB) {
  try {
    const totalParts = Math.ceil(totalPages / PAGES_PER_PART);
    let totalEmbeddingTokens = 0;

    broadcast({
      type: 'processing_phase',
      data: { sessionId, phase: `Dividiendo en ${totalParts} partes...` }
    });

    broadcast({ type: 'processing_phase', data: { sessionId, phase: 'Extrayendo metadatos automáticamente...' } });

    // Extraer las primeras páginas para metadatos
    const extractedData = await pdfExtract.extractBuffer(session.fileBuffer, { max: 5 });
    const aiMetadata = await extractMetadataWithAI(extractedData.pages, session.normTitle);

    broadcast({ type: 'processing_phase', data: { sessionId, phase: 'Creando documento padre...' } });

    // Crear documento padre con metadatos completos
    const parentDocument = await prisma.legalDocument.create({
      data: {
        normType: session.normType || aiMetadata.normType || 'ORDINARY_LAW',
        normTitle: session.normTitle || session.filename,
        legalHierarchy: aiMetadata.legalHierarchy || 'LEYES_ORDINARIAS',
        publicationType: aiMetadata.publicationType || 'ORDINARIO',
        publicationNumber: aiMetadata.publicationNumber || '',
        publicationDate: aiMetadata.publicationDate,
        lastReformDate: aiMetadata.lastReformDate,
        documentState: aiMetadata.documentState || 'ORIGINAL',
        jurisdiction: aiMetadata.jurisdiction || 'NACIONAL',
        content: `[Documento dividido en ${totalParts} partes]`,
        uploadedBy: session.userId,
        metadata: {
          fileSizeMB,
          totalPages,
          totalParts,
          uploadMethod: 'admin_direct_split',
          uploadSessionId: sessionId,
          aiExtractedMetadata: aiMetadata
        }
      }
    });

    // Procesar cada parte
    for (let i = 0; i < totalParts; i++) {
      const partNumber = i + 1;
      const startPage = i * PAGES_PER_PART;
      const endPage = Math.min((i + 1) * PAGES_PER_PART, totalPages);

      broadcast({
        type: 'processing_part',
        data: { sessionId, partNumber, totalParts, startPage, endPage }
      });

      // Crear PDF de la parte
      const partDoc = await PDFDocument.create();
      const copiedPages = await partDoc.copyPages(
        pdfDoc,
        Array.from({ length: endPage - startPage }, (_, idx) => startPage + idx)
      );
      copiedPages.forEach(page => partDoc.addPage(page));
      const partBytes = await partDoc.save();

      // Extraer texto de la parte
      const partText = await extractTextFromBuffer(Buffer.from(partBytes));

      // Crear parte como documento legal separado vinculado al padre
      const partMetadata = {
        parentDocumentId: parentDocument.id,
        partNumber,
        totalParts,
        startPage: startPage + 1,
        endPage,
        fileSizeMB: (partBytes.length / (1024 * 1024)).toFixed(2),
        isProcessed: true,
        isPart: true
      };

      // Guardar la parte en la tabla legal_documents con metadata especial
      await prisma.legalDocument.create({
        data: {
          normType: parentDocument.normType,
          normTitle: `${parentDocument.normTitle} - Parte ${partNumber}/${totalParts}`,
          legalHierarchy: parentDocument.legalHierarchy,
          publicationType: parentDocument.publicationType,
          publicationNumber: parentDocument.publicationNumber,
          publicationDate: parentDocument.publicationDate,
          jurisdiction: parentDocument.jurisdiction,
          content: partText,
          metadata: partMetadata,
          uploadedBy: parentDocument.uploadedBy,
          isActive: false // Las partes están inactivas para que no aparezcan en búsquedas normales
        }
      });

      // Generar embeddings para esta parte
      const partEmbeddingStats = await generateChunksAndEmbeddings(parentDocument.id, partText, sessionId, partNumber);
      totalEmbeddingTokens += partEmbeddingStats.totalEmbeddingTokens || 0;
    }

    // Calcular chunks totales generados
    const totalChunks = await prisma.legalDocumentChunk.count({
      where: { legalDocumentId: parentDocument.id }
    });

    // Calcular tamaño total de partes usando metadata JSON
    const parts = await prisma.legalDocument.findMany({
      where: {
        metadata: {
          path: ['parentDocumentId'],
          equals: parentDocument.id
        }
      },
      select: { metadata: true }
    });

    const totalPartsSizeMB = parts.reduce((sum, part) => {
      const fileSizeMB = part.metadata?.fileSizeMB || 0;
      return sum + parseFloat(fileSizeMB);
    }, 0);

    // Obtener IP del cliente
    const clientIp = session.clientIp || 'No disponible';

    // Obtener IP de la base de datos (extraer del DATABASE_URL)
    const dbUrl = process.env.DATABASE_URL || '';
    const dbHostMatch = dbUrl.match(/@([^:\/]+)/);
    const dbHost = dbHostMatch ? dbHostMatch[1] : 'dpg-d46iarje5dus73ar46c0-a.oregon-postgres.render.com';

    // Calcular costos de IA
    const metadataTokens = aiMetadata.tokensUsed || { totalTokens: 0 };

    // Precios de OpenAI (al 2024)
    const gpt4InputCost = 0.03 / 1000; // $0.03 por 1K tokens
    const gpt4OutputCost = 0.06 / 1000; // $0.06 por 1K tokens
    const embeddingCost = 0.0001 / 1000; // $0.0001 por 1K tokens

    const metadataCost = (
      (metadataTokens.promptTokens || 0) * gpt4InputCost +
      (metadataTokens.completionTokens || 0) * gpt4OutputCost
    );
    const embeddingCostTotal = totalEmbeddingTokens * embeddingCost;
    const totalCost = metadataCost + embeddingCostTotal;

    // Informe completo para documentos divididos
    const uploadReport = {
      sessionId,
      documentId: parentDocument.id,

      // Información del documento
      documentInfo: {
        title: parentDocument.normTitle,
        type: parentDocument.normType,
        filename: session.filename,
        totalPages,
        fileSizeMB: fileSizeMB.toFixed(2),
        wasSplit: true,
        totalParts
      },

      // Metadatos extraídos
      extractedMetadata: {
        legalHierarchy: aiMetadata.legalHierarchy,
        publicationType: aiMetadata.publicationType,
        publicationNumber: aiMetadata.publicationNumber,
        publicationDate: aiMetadata.publicationDate,
        lastReformDate: aiMetadata.lastReformDate,
        documentState: aiMetadata.documentState,
        jurisdiction: aiMetadata.jurisdiction,
        year: aiMetadata.year,
        confidence: (aiMetadata.extractionConfidence * 100).toFixed(0) + '%'
      },

      // Procesamiento
      processing: {
        chunksGenerated: totalChunks,
        textSize: totalPartsSizeMB.toFixed(2) + ' MB',
        uploadMethod: `Dividido en ${totalParts} partes de ${PAGES_PER_PART} páginas`,
        partsCreated: totalParts
      },

      // Tiempo
      timing: {
        uploadDuration: ((Date.now() - session.startTime) / 1000).toFixed(1) + 's',
        startTime: new Date(session.startTime).toISOString(),
        endTime: new Date().toISOString()
      },

      // Ubicación
      storage: {
        database: 'PostgreSQL - Render',
        region: 'Oregon, USA',
        host: dbHost,
        tables: ['legal_documents', 'legal_document_chunks']
      },

      // Información Técnica de IA
      aiUsage: {
        // Tokens de extracción de metadatos
        metadataExtraction: {
          model: 'gpt-4',
          promptTokens: metadataTokens.promptTokens || 0,
          completionTokens: metadataTokens.completionTokens || 0,
          totalTokens: metadataTokens.totalTokens || 0,
          estimatedCost: '$' + metadataCost.toFixed(4)
        },
        // Tokens de embeddings
        embeddings: {
          model: 'text-embedding-ada-002',
          totalTokens: totalEmbeddingTokens,
          chunksProcessed: totalChunks,
          estimatedCost: '$' + embeddingCostTotal.toFixed(4)
        },
        // Total combinado
        totalCost: '$' + totalCost.toFixed(4),
        totalTokens: (metadataTokens.totalTokens || 0) + totalEmbeddingTokens
      },

      // Información de Red
      network: {
        clientIp: clientIp,
        databaseIp: dbHost,
        serverRegion: 'Oregon, USA',
        connectionProtocol: 'PostgreSQL SSL',
        uploadProtocol: 'HTTP/WebSocket'
      },

      // Información del Sistema
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
          total: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB'
        },
        uptime: (process.uptime() / 60).toFixed(1) + ' minutos'
      }
    };

    broadcast({
      type: 'processing_complete',
      data: uploadReport
    });

    uploadSessions.delete(sessionId);

  } catch (error) {
    throw error;
  }
}

async function extractTextFromBuffer(buffer) {
  const data = await pdfExtract.extractBuffer(buffer);
  return data.pages.map(page => page.content.map(item => item.str).join(' ')).join('\n\n');
}

async function generateChunksAndEmbeddings(documentId, text, sessionId, partNumber = null) {
  const chunkSize = 1000;
  const chunks = [];
  let totalEmbeddingTokens = 0;

  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  for (let i = 0; i < chunks.length; i++) {
    broadcast({
      type: 'generating_embedding',
      data: { sessionId, chunk: i + 1, total: chunks.length, partNumber }
    });

    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: chunks[i],
      });

      // Acumular tokens de embeddings
      if (embeddingResponse.usage) {
        totalEmbeddingTokens += embeddingResponse.usage.total_tokens || 0;
      }

      await prisma.legalDocumentChunk.create({
        data: {
          legalDocumentId: documentId,
          content: chunks[i],
          chunkIndex: i,
          embedding: embeddingResponse.data[0].embedding
        }
      });

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Error generando embedding ${i}:`, error.message);
      // Continuar con el siguiente chunk
    }
  }

  return { totalEmbeddingTokens };
}

// ============================================================================
// ESTADÍSTICAS Y DASHBOARD
// ============================================================================

app.get('/api/stats', authenticate, async (req, res) => {
  try {
    const [totalDocs, recentDocs, totalChunks, adminUploads] = await Promise.all([
      prisma.legalDocument.count(),
      prisma.legalDocument.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24h
          }
        }
      }),
      prisma.legalDocumentChunk.count(),
      prisma.legalDocument.count({
        where: {
          metadata: {
            path: ['uploadMethod'],
            string_contains: 'admin_direct'
          }
        }
      })
    ]);

    const activeSessions = Array.from(uploadSessions.values()).map(s => ({
      sessionId: s.sessionId,
      filename: s.filename,
      progress: (s.receivedChunks / s.totalChunks * 100).toFixed(1),
      status: s.status
    }));

    res.json({
      totalDocs,
      recentDocs,
      totalChunks,
      adminUploads,
      activeSessions,
      queueSize: processingQueue.size
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

app.get('/api/recent', authenticate, async (req, res) => {
  try {
    const recentDocs = await prisma.legalDocument.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        normTitle: true,
        normType: true,
        createdAt: true,
        metadata: true,
        _count: { select: { chunks: true } }
      }
    });

    res.json(recentDocs);
  } catch (error) {
    console.error('❌ Recent docs error:', error);
    res.status(500).json({ error: 'Error obteniendo documentos recientes' });
  }
});

// ============================================================================
// WEBSOCKET
// ============================================================================

function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify(message));
    }
  });
}

wss.on('connection', (ws) => {
  console.log('🔌 Cliente WebSocket conectado');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Cliente WebSocket desconectado');
  });
});

// ============================================================================
// SERVIDOR
// ============================================================================

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚀 POWERIA LEGAL - Admin Upload Server                      ║
╠══════════════════════════════════════════════════════════════╣
║  🌐 URL: http://localhost:${PORT}                            ║
║  📁 Sin límite de tamaño de archivo                          ║
║  ⚡ División automática de PDFs grandes                      ║
║  📡 WebSocket para actualizaciones en tiempo real            ║
║  🔐 Autenticación de administrador                           ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Manejo de errores
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
});

// Cleanup
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});
