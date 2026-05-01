#!/usr/bin/env python3
"""
Legal RAG System - Professional Technical Report Generator
Generates a comprehensive PDF report with all technical details
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib.colors import HexColor, black, white, Color
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, ListFlowable, ListItem, Flowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.graphics.shapes import Drawing, Rect, Line
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from datetime import datetime
import os

# Brand Colors
PRIMARY_COLOR = HexColor('#1a365d')      # Dark Blue
SECONDARY_COLOR = HexColor('#2b6cb0')    # Medium Blue
ACCENT_COLOR = HexColor('#4299e1')       # Light Blue
SUCCESS_COLOR = HexColor('#38a169')      # Green
WARNING_COLOR = HexColor('#dd6b20')      # Orange
ERROR_COLOR = HexColor('#e53e3e')        # Red
DARK_GRAY = HexColor('#2d3748')
LIGHT_GRAY = HexColor('#e2e8f0')
WHITE = HexColor('#ffffff')

class HorizontalLine(Flowable):
    """Custom flowable for horizontal lines"""
    def __init__(self, width, height=1, color=PRIMARY_COLOR):
        Flowable.__init__(self)
        self.width = width
        self.height = height
        self.color = color

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.height)
        self.canv.line(0, 0, self.width, 0)

class GradientRect(Flowable):
    """Custom gradient rectangle"""
    def __init__(self, width, height, color1, color2):
        Flowable.__init__(self)
        self.width = width
        self.height = height
        self.color1 = color1
        self.color2 = color2

    def draw(self):
        self.canv.setFillColor(self.color1)
        self.canv.rect(0, 0, self.width, self.height, fill=1, stroke=0)

def create_styles():
    """Create custom styles for the report"""
    styles = getSampleStyleSheet()

    # Title styles
    styles.add(ParagraphStyle(
        name='MainTitle',
        parent=styles['Title'],
        fontSize=32,
        textColor=PRIMARY_COLOR,
        alignment=TA_CENTER,
        spaceAfter=20,
        fontName='Helvetica-Bold',
        leading=40
    ))

    styles.add(ParagraphStyle(
        name='Subtitle',
        parent=styles['Normal'],
        fontSize=16,
        textColor=SECONDARY_COLOR,
        alignment=TA_CENTER,
        spaceAfter=30,
        fontName='Helvetica'
    ))

    styles.add(ParagraphStyle(
        name='SectionTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=PRIMARY_COLOR,
        spaceBefore=25,
        spaceAfter=15,
        fontName='Helvetica-Bold',
        borderWidth=2,
        borderColor=ACCENT_COLOR,
        borderPadding=5
    ))

    styles.add(ParagraphStyle(
        name='SubsectionTitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=SECONDARY_COLOR,
        spaceBefore=15,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    ))

    styles.add(ParagraphStyle(
        name='CustomBody',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_GRAY,
        alignment=TA_JUSTIFY,
        spaceAfter=8,
        leading=14
    ))

    styles.add(ParagraphStyle(
        name='CodeBlock',
        parent=styles['Normal'],
        fontSize=8,
        textColor=HexColor('#1a202c'),
        fontName='Courier',
        backColor=HexColor('#f7fafc'),
        borderWidth=1,
        borderColor=LIGHT_GRAY,
        borderPadding=8,
        leftIndent=10,
        rightIndent=10,
        spaceAfter=10,
        leading=12
    ))

    styles.add(ParagraphStyle(
        name='ListItem',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_GRAY,
        leftIndent=20,
        bulletIndent=10,
        spaceAfter=4
    ))

    styles.add(ParagraphStyle(
        name='TableHeader',
        parent=styles['Normal'],
        fontSize=10,
        textColor=WHITE,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER
    ))

    styles.add(ParagraphStyle(
        name='Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=HexColor('#718096'),
        alignment=TA_CENTER
    ))

    styles.add(ParagraphStyle(
        name='Warning',
        parent=styles['Normal'],
        fontSize=10,
        textColor=WARNING_COLOR,
        backColor=HexColor('#fffaf0'),
        borderWidth=1,
        borderColor=WARNING_COLOR,
        borderPadding=10,
        spaceAfter=10
    ))

    styles.add(ParagraphStyle(
        name='Info',
        parent=styles['Normal'],
        fontSize=10,
        textColor=SECONDARY_COLOR,
        backColor=HexColor('#ebf8ff'),
        borderWidth=1,
        borderColor=ACCENT_COLOR,
        borderPadding=10,
        spaceAfter=10
    ))

    return styles

def add_cover_page(story, styles):
    """Add cover page to the report"""
    story.append(Spacer(1, 2*inch))

    # Main title
    story.append(Paragraph("LEGAL RAG SYSTEM", styles['MainTitle']))
    story.append(Spacer(1, 0.3*inch))

    # Subtitle
    story.append(Paragraph(
        "Reporte Técnico Profesional Completo",
        styles['Subtitle']
    ))

    story.append(Spacer(1, 0.5*inch))
    story.append(HorizontalLine(400, 3, ACCENT_COLOR))
    story.append(Spacer(1, 0.5*inch))

    # System description
    description = """
    <b>Sistema de Recuperación y Generación Aumentada (RAG)</b><br/>
    para Documentos Legales de Ecuador<br/><br/>
    Arquitectura de Microservicios | PostgreSQL + pgvector | Redis Cloud<br/>
    OpenAI GPT-4 | Next.js 15 | Fastify | OpenTelemetry
    """
    story.append(Paragraph(description, styles['Subtitle']))

    story.append(Spacer(1, 1*inch))

    # Metadata table
    metadata = [
        ['Versión', '1.0.0'],
        ['Fecha de Generación', datetime.now().strftime('%d/%m/%Y %H:%M')],
        ['Ambiente', 'Producción (Render.com)'],
        ['Clasificación', 'Confidencial - Uso Interno']
    ]

    metadata_table = Table(metadata, colWidths=[150, 250])
    metadata_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('TEXTCOLOR', (0, 0), (-1, -1), DARK_GRAY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, LIGHT_GRAY),
    ]))
    story.append(metadata_table)

    story.append(PageBreak())

def add_table_of_contents(story, styles):
    """Add table of contents"""
    story.append(Paragraph("TABLA DE CONTENIDOS", styles['SectionTitle']))
    story.append(HorizontalLine(450, 2, ACCENT_COLOR))
    story.append(Spacer(1, 0.3*inch))

    toc_items = [
        ("1. Resumen Ejecutivo", "3"),
        ("2. Arquitectura del Sistema", "4"),
        ("   2.1 Arquitectura General", "4"),
        ("   2.2 Stack Tecnológico", "5"),
        ("   2.3 Diagrama de Componentes", "6"),
        ("3. Base de Datos", "7"),
        ("   3.1 PostgreSQL - Schema Principal", "7"),
        ("   3.2 Modelos de Datos", "8"),
        ("   3.3 Redis Cloud - Caché Multi-Tier", "10"),
        ("4. Backend (API)", "11"),
        ("   4.1 Estructura del Servidor", "11"),
        ("   4.2 Servicios Principales", "12"),
        ("   4.3 Rutas y Endpoints", "14"),
        ("5. Frontend (Next.js)", "16"),
        ("   5.1 Estructura de la Aplicación", "16"),
        ("   5.2 Componentes Principales", "17"),
        ("6. Seguridad", "19"),
        ("   6.1 Autenticación y Autorización", "19"),
        ("   6.2 API Keys y Configuración", "20"),
        ("   6.3 Capas de Seguridad", "21"),
        ("7. Observabilidad", "22"),
        ("   7.1 OpenTelemetry", "22"),
        ("   7.2 Métricas y Alertas", "23"),
        ("8. Deployment", "24"),
        ("   8.1 Render.com", "24"),
        ("   8.2 Variables de Entorno", "25"),
    ]

    for item, page in toc_items:
        dots = '.' * (60 - len(item) - len(page))
        story.append(Paragraph(f"{item} {dots} {page}", styles['CustomBody']))

    story.append(PageBreak())

def add_executive_summary(story, styles):
    """Add executive summary section"""
    story.append(Paragraph("1. RESUMEN EJECUTIVO", styles['SectionTitle']))
    story.append(HorizontalLine(450, 2, ACCENT_COLOR))
    story.append(Spacer(1, 0.2*inch))

    summary = """
    El <b>Legal RAG System</b> es una plataforma de inteligencia artificial especializada en la
    gestión, búsqueda y análisis de documentos legales ecuatorianos. Utiliza tecnología de
    <b>Retrieval Augmented Generation (RAG)</b> para proporcionar respuestas precisas basadas
    en la legislación vigente de Ecuador.
    """
    story.append(Paragraph(summary, styles['CustomBody']))
    story.append(Spacer(1, 0.2*inch))

    # Key features table
    features_data = [
        ['Característica', 'Descripción', 'Tecnología'],
        ['Búsqueda Semántica', 'Búsqueda por significado, no solo palabras clave', 'OpenAI Embeddings'],
        ['NLP Avanzado', 'Procesamiento de lenguaje natural para queries', 'GPT-4 + Custom NLP'],
        ['Caché Multi-Tier', 'L1 (memoria) → L2 (Redis) → L3 (Redis)', 'Redis Cloud'],
        ['Observabilidad', 'Trazas, métricas, alertas automáticas', 'OpenTelemetry'],
        ['Autenticación', 'JWT, OAuth 2.0, 2FA', 'Fastify JWT'],
        ['Backup System', 'Respaldos automáticos con encriptación', 'AWS S3']
    ]

    features_table = Table(features_data, colWidths=[120, 200, 120])
    features_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, LIGHT_GRAY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, HexColor('#f7fafc')]),
    ]))
    story.append(features_table)

    story.append(PageBreak())

def add_architecture_section(story, styles):
    """Add architecture section"""
    story.append(Paragraph("2. ARQUITECTURA DEL SISTEMA", styles['SectionTitle']))
    story.append(HorizontalLine(450, 2, ACCENT_COLOR))
    story.append(Spacer(1, 0.2*inch))

    # 2.1 General Architecture
    story.append(Paragraph("2.1 Arquitectura General", styles['SubsectionTitle']))

    arch_desc = """
    El sistema implementa una arquitectura de <b>microservicios</b> con separación clara entre
    frontend y backend, comunicándose a través de una API RESTful. La arquitectura sigue
    principios de <b>Clean Architecture</b> y <b>Domain-Driven Design (DDD)</b>.
    """
    story.append(Paragraph(arch_desc, styles['CustomBody']))

    # Architecture diagram as ASCII art in code block
    arch_diagram = """
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                           LEGAL RAG SYSTEM ARCHITECTURE                      │
    ├─────────────────────────────────────────────────────────────────────────────┤
    │                                                                              │
    │   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐        │
    │   │   FRONTEND   │         │   BACKEND    │         │   DATABASES  │        │
    │   │   (Next.js)  │ ◄─────► │  (Fastify)   │ ◄─────► │  (PostgreSQL)│        │
    │   │   Port 3333  │         │   Port 8000  │         │   + pgvector │        │
    │   └──────────────┘         └──────┬───────┘         └──────────────┘        │
    │                                   │                                          │
    │                                   ▼                                          │
    │   ┌─────────────────────────────────────────────────────────────────┐       │
    │   │                        SERVICES LAYER                            │       │
    │   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │       │
    │   │  │   AI    │  │  Cache  │  │  NLP    │  │ Search  │            │       │
    │   │  │ Service │  │ Service │  │ Service │  │ Service │            │       │
    │   │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │       │
    │   └───────┼────────────┼────────────┼────────────┼───────────────────┘       │
    │           │            │            │            │                           │
    │           ▼            ▼            ▼            ▼                           │
    │   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
    │   │   OpenAI    │ │ Redis Cloud │ │   Prisma    │ │   pgvector  │           │
    │   │   API       │ │   Cache     │ │    ORM      │ │  Embeddings │           │
    │   └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
    │                                                                              │
    │   ┌─────────────────────────────────────────────────────────────────┐       │
    │   │                     OBSERVABILITY LAYER                          │       │
    │   │   OpenTelemetry │ Prometheus Metrics │ Health Checks │ Alerts   │       │
    │   └─────────────────────────────────────────────────────────────────┘       │
    │                                                                              │
    └─────────────────────────────────────────────────────────────────────────────┘
    """
    story.append(Paragraph(arch_diagram.replace('\n', '<br/>'), styles['CodeBlock']))

    # 2.2 Stack Tecnológico
    story.append(Paragraph("2.2 Stack Tecnológico", styles['SubsectionTitle']))

    stack_data = [
        ['Capa', 'Tecnología', 'Versión', 'Propósito'],
        ['Frontend', 'Next.js', '15.0.0', 'Framework React con SSR'],
        ['Frontend', 'React', '18.3.1', 'Biblioteca UI'],
        ['Frontend', 'TailwindCSS', '3.4.1', 'Framework CSS'],
        ['Frontend', 'Zustand', '4.5.0', 'State Management'],
        ['Frontend', 'React Query', '5.24.1', 'Server State'],
        ['Backend', 'Fastify', '4.26.0', 'Framework HTTP'],
        ['Backend', 'TypeScript', '5.3.3', 'Lenguaje tipado'],
        ['Backend', 'Prisma', '5.10.0', 'ORM'],
        ['Database', 'PostgreSQL', '16', 'Base de datos principal'],
        ['Database', 'pgvector', '0.5+', 'Embeddings vectoriales'],
        ['Cache', 'Redis Cloud', '7.2+', 'Caché distribuido'],
        ['AI', 'OpenAI GPT-4', 'Latest', 'LLM principal'],
        ['AI', 'text-embedding-ada-002', 'Latest', 'Modelo de embeddings'],
        ['Observability', 'OpenTelemetry', '0.208.0', 'Trazas y métricas'],
        ['Auth', 'JWT', '9.0.2', 'Tokens de autenticación'],
    ]

    stack_table = Table(stack_data, colWidths=[80, 120, 70, 170])
    stack_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 1, LIGHT_GRAY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, HexColor('#f7fafc')]),
    ]))
    story.append(stack_table)

    story.append(PageBreak())

def add_database_section(story, styles):
    """Add database section"""
    story.append(Paragraph("3. BASE DE DATOS", styles['SectionTitle']))
    story.append(HorizontalLine(450, 2, ACCENT_COLOR))
    story.append(Spacer(1, 0.2*inch))

    # 3.1 PostgreSQL
    story.append(Paragraph("3.1 PostgreSQL - Schema Principal", styles['SubsectionTitle']))

    db_desc = """
    La base de datos principal utiliza <b>PostgreSQL 16</b> con la extensión <b>pgvector</b>
    para almacenamiento y búsqueda de vectores de embeddings. El schema está diseñado para
    soportar la <b>jerarquía legal ecuatoriana</b> con tipos enumerados específicos.
    """
    story.append(Paragraph(db_desc, styles['CustomBody']))

    # Connection string (masked)
    conn_info = """
    <b>Conexión (Render PostgreSQL):</b><br/>
    postgresql://legal_rag_postgres_user:***@dpg-***-a.oregon-postgres.render.com/legal_rag_postgres<br/>
    <b>SSL Mode:</b> require<br/>
    <b>Pool Size:</b> 50 conexiones<br/>
    <b>Timeout:</b> 10 segundos
    """
    story.append(Paragraph(conn_info, styles['Info']))

    # 3.2 Models
    story.append(Paragraph("3.2 Modelos de Datos Principales", styles['SubsectionTitle']))

    models_data = [
        ['Modelo', 'Descripción', 'Campos Clave', 'Relaciones'],
        ['User', 'Usuarios del sistema', 'id, email, role, planTier, 2FA', 'Cases, Documents, Queries'],
        ['LegalDocument', 'Documentos legales', 'normType, hierarchy, content', 'Chunks, Citations, Feedback'],
        ['LegalDocumentChunk', 'Fragmentos con embeddings', 'content, embedding, chunkIndex', 'LegalDocument'],
        ['Case', 'Casos legales', 'title, clientName, status', 'Documents, Tasks, Events'],
        ['QueryHistory', 'Historial de búsquedas', 'query, results, sessionId', 'User, UserSession'],
        ['DocumentCitation', 'Citas entre documentos', 'sourceId, targetId, type', 'LegalDocument x2'],
        ['UserSession', 'Sesiones de usuario', 'sessionId, preferences', 'User, QueryHistory'],
        ['Backup', 'Respaldos del sistema', 'type, status, encryptionKey', 'User (creator)'],
    ]

    models_table = Table(models_data, colWidths=[90, 120, 130, 100])
    models_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 1, LIGHT_GRAY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, HexColor('#f7fafc')]),
    ]))
    story.append(models_table)
    story.append(Spacer(1, 0.2*inch))

    # Enums
    story.append(Paragraph("Enumeraciones de la Jerarquía Legal Ecuatoriana:", styles['SubsectionTitle']))

    enums_code = """
    enum NormType {
      CONSTITUTIONAL_NORM          // Normas Constitucionales
      ORGANIC_LAW                  // Leyes Orgánicas
      ORDINARY_LAW                 // Leyes Ordinarias
      ORGANIC_CODE                 // Códigos Orgánicos
      REGULATION_GENERAL           // Reglamentos Generales
      RESOLUTION_ADMINISTRATIVE    // Resoluciones Administrativas
      INTERNATIONAL_TREATY         // Tratados Internacionales
      JUDICIAL_PRECEDENT           // Precedentes Judiciales
    }

    enum LegalHierarchy {
      CONSTITUCION                    // Nivel más alto
      TRATADOS_INTERNACIONALES_DDHH   // Tratados DDHH
      LEYES_ORGANICAS                 // Leyes Orgánicas
      LEYES_ORDINARIAS                // Leyes Ordinarias
      CODIGOS_ORGANICOS               // Códigos Orgánicos
      REGLAMENTOS                     // Reglamentos
      ORDENANZAS                      // Ordenanzas
      RESOLUCIONES                    // Resoluciones
      ACUERDOS_ADMINISTRATIVOS        // Acuerdos
    }
    """
    story.append(Paragraph(enums_code.replace('\n', '<br/>'), styles['CodeBlock']))

    # 3.3 Redis
    story.append(Paragraph("3.3 Redis Cloud - Sistema de Caché Multi-Tier", styles['SubsectionTitle']))

    redis_desc = """
    El sistema implementa un <b>caché de tres niveles (L1, L2, L3)</b> para optimizar
    el rendimiento de las consultas. Redis Cloud (AWS us-east-1) proporciona el almacenamiento
    distribuido para L2 y L3.
    """
    story.append(Paragraph(redis_desc, styles['CustomBody']))

    cache_data = [
        ['Tier', 'Almacenamiento', 'TTL', 'Tamaño Máximo', 'Uso'],
        ['L1', 'Node.js Memory', '5 minutos', '100 MB', 'Hot cache - acceso inmediato'],
        ['L2', 'Redis Cloud', '1 hora', '1 GB', 'Warm cache - consultas frecuentes'],
        ['L3', 'Redis Cloud', '24 horas', '2 GB', 'Cold cache - resultados históricos'],
    ]

    cache_table = Table(cache_data, colWidths=[50, 100, 70, 90, 130])
    cache_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SUCCESS_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, LIGHT_GRAY),
    ]))
    story.append(cache_table)

    story.append(PageBreak())

def add_backend_section(story, styles):
    """Add backend section"""
    story.append(Paragraph("4. BACKEND (API)", styles['SectionTitle']))
    story.append(HorizontalLine(450, 2, ACCENT_COLOR))
    story.append(Spacer(1, 0.2*inch))

    # 4.1 Server Structure
    story.append(Paragraph("4.1 Estructura del Servidor", styles['SubsectionTitle']))

    server_code = """
    // src/server.ts - Entry Point Principal
    import { initializeTelemetry } from './config/telemetry.js';
    initializeTelemetry();  // OpenTelemetry ANTES de otros imports

    import Fastify from 'fastify';
    import cors from '@fastify/cors';
    import jwt from '@fastify/jwt';
    import multipart from '@fastify/multipart';
    import rateLimit from '@fastify/rate-limit';

    const app = Fastify({ logger: true });

    // Plugins de seguridad
    await app.register(cors, { origin: process.env.CORS_ORIGIN || '*', credentials: true });
    await app.register(jwt, { secret: process.env.JWT_SECRET });
    await app.register(multipart);
    await app.register(rateLimit, { max: 100, timeWindow: '15 minutes' });

    // Middleware de observabilidad
    app.addHook('onRequest', requestMetricsMiddleware);

    // Start server
    await app.listen({ port: 8000, host: '0.0.0.0' });
    """
    story.append(Paragraph(server_code.replace('\n', '<br/>'), styles['CodeBlock']))

    # 4.2 Services
    story.append(Paragraph("4.2 Servicios Principales", styles['SubsectionTitle']))

    services_data = [
        ['Servicio', 'Archivo', 'Responsabilidad'],
        ['UnifiedSearchOrchestrator', 'orchestration/unified-search-orchestrator.ts', 'Orquestación de búsqueda NLP + RAG'],
        ['MultiTierCacheService', 'cache/multi-tier-cache.service.ts', 'Gestión de caché L1/L2/L3'],
        ['AsyncOpenAIService', 'ai/async-openai.service.ts', 'Cola de peticiones a OpenAI'],
        ['QueryProcessor', 'nlp/query-processor.ts', 'Procesamiento NLP de queries'],
        ['EmbeddingService', 'embeddings/embedding-service.ts', 'Generación de embeddings'],
        ['BackupService', 'backup/backup.service.ts', 'Sistema de respaldos'],
        ['MetricsService', 'observability/metrics.service.ts', 'Métricas Prometheus'],
        ['AlertingService', 'observability/alerting.service.ts', 'Alertas automáticas'],
        ['FeedbackService', 'feedback/feedback-service.ts', 'Retroalimentación de usuarios'],
        ['AnalyticsService', 'analytics/analytics-service.ts', 'Análisis de uso'],
    ]

    services_table = Table(services_data, colWidths=[130, 180, 130])
    services_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 1, LIGHT_GRAY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, HexColor('#f7fafc')]),
    ]))
    story.append(services_table)
    story.append(Spacer(1, 0.2*inch))

    # 4.3 Routes
    story.append(Paragraph("4.3 Rutas y Endpoints API", styles['SubsectionTitle']))

    routes_data = [
        ['Grupo', 'Prefijo', 'Endpoints', 'Auth'],
        ['Auth', '/api/v1', 'login, register, refresh, logout', 'No'],
        ['2FA', '/api/v1', 'enable-2fa, verify-2fa, disable-2fa', 'Sí'],
        ['OAuth', '/api/v1', 'google/callback, google/url', 'No'],
        ['Cases', '/api/v1', 'CRUD casos legales', 'Sí'],
        ['Documents', '/api/v1', 'upload, download, analyze', 'Sí'],
        ['Legal Docs', '/api/v1', 'library, search, metadata', 'Sí'],
        ['Query', '/api/v1', 'rag-query, suggestions', 'Sí'],
        ['NLP', '/api/v1/nlp', 'transform, analyze, entities', 'Sí'],
        ['Unified Search', '/api/v1/unified-search', 'search, analytics', 'Sí'],
        ['AI Assistant', '/api/v1', 'chat, analyze, summarize', 'Sí'],
        ['Analytics', '/api/v1', 'dashboard, reports, trends', 'Sí'],
        ['Admin Users', '/api/v1', 'CRUD usuarios, roles', 'Admin'],
        ['Admin Backup', '/api/admin', 'create, restore, schedule', 'Admin'],
        ['Observability', '/observability', 'metrics, health, ready', 'No'],
    ]

    routes_table = Table(routes_data, colWidths=[80, 100, 180, 50])
    routes_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 1, LIGHT_GRAY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, HexColor('#f7fafc')]),
    ]))
    story.append(routes_table)

    story.append(PageBreak())

def add_frontend_section(story, styles):
    """Add frontend section"""
    story.append(Paragraph("5. FRONTEND (NEXT.JS)", styles['SectionTitle']))
    story.append(HorizontalLine(450, 2, ACCENT_COLOR))
    story.append(Spacer(1, 0.2*inch))

    # 5.1 App Structure
    story.append(Paragraph("5.1 Estructura de la Aplicación", styles['SubsectionTitle']))

    structure_code = """
    frontend/
    ├── src/
    │   ├── app/                          # Next.js App Router
    │   │   ├── page.tsx                  # Landing page
    │   │   ├── layout.tsx                # Root layout
    │   │   ├── globals.css               # Estilos globales
    │   │   ├── login/page.tsx            # Autenticación
    │   │   ├── register/page.tsx         # Registro
    │   │   ├── dashboard/                # Panel principal
    │   │   │   ├── page.tsx              # Dashboard home
    │   │   │   ├── layout.tsx            # Dashboard layout
    │   │   │   ├── cases/[id]/page.tsx   # Detalle de caso
    │   │   │   ├── calendar/page.tsx     # Calendario
    │   │   │   ├── tasks/page.tsx        # Gestión de tareas
    │   │   │   ├── finance/page.tsx      # Finanzas
    │   │   │   └── settings/page.tsx     # Configuración
    │   │   ├── admin/                    # Panel administrador
    │   │   │   ├── page.tsx              # Admin home
    │   │   │   ├── users/page.tsx        # Gestión usuarios
    │   │   │   ├── legal-library/page.tsx # Biblioteca legal
    │   │   │   ├── backups/page.tsx      # Sistema backups
    │   │   │   ├── analytics/page.tsx    # Analytics
    │   │   │   └── audit/page.tsx        # Logs de auditoría
    │   │   ├── account/                  # Cuenta de usuario
    │   │   │   ├── profile/page.tsx      # Perfil
    │   │   │   ├── billing/page.tsx      # Facturación
    │   │   │   └── usage/page.tsx        # Uso
    │   │   └── pricing/page.tsx          # Planes y precios
    │   │
    │   ├── components/                   # Componentes React
    │   │   ├── ui/                       # UI primitivos
    │   │   ├── dashboard/                # Dashboard components
    │   │   ├── calendar/                 # Calendario
    │   │   ├── tasks/                    # Tareas
    │   │   ├── finance/                  # Finanzas
    │   │   ├── admin/                    # Admin components
    │   │   └── providers.tsx             # Context providers
    │   │
    │   └── hooks/                        # Custom React hooks
    │
    ├── package.json
    └── tailwind.config.js
    """
    story.append(Paragraph(structure_code.replace('\n', '<br/>'), styles['CodeBlock']))

    # 5.2 Components
    story.append(Paragraph("5.2 Componentes Principales", styles['SubsectionTitle']))

    components_data = [
        ['Categoría', 'Componente', 'Descripción'],
        ['UI', 'LegalTypeBadge', 'Badge para tipos de normas legales'],
        ['UI', 'PriorityBadge', 'Indicador visual de prioridad'],
        ['Dashboard', 'QuickStatsCards', 'Tarjetas de estadísticas rápidas'],
        ['Dashboard', 'AIInsightsPanel', 'Panel de insights de IA'],
        ['Dashboard', 'EnhancedCaseCard', 'Tarjeta mejorada de caso'],
        ['Calendar', 'CalendarView', 'Vista de calendario completa'],
        ['Calendar', 'EventDialog', 'Modal de creación/edición de eventos'],
        ['Tasks', 'TaskBoard', 'Tablero Kanban de tareas'],
        ['Tasks', 'TaskCard', 'Tarjeta individual de tarea'],
        ['Finance', 'FinancialSummaryCards', 'Resumen financiero'],
        ['Finance', 'InvoiceTable', 'Tabla de facturas'],
        ['Admin', 'LegalDocumentUploadForm', 'Formulario de carga de documentos'],
        ['Admin', 'CreateBackupDialog', 'Modal de creación de backup'],
    ]

    components_table = Table(components_data, colWidths=[80, 150, 210])
    components_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 1, LIGHT_GRAY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, HexColor('#f7fafc')]),
    ]))
    story.append(components_table)

    story.append(PageBreak())

def add_security_section(story, styles):
    """Add security section"""
    story.append(Paragraph("6. SEGURIDAD", styles['SectionTitle']))
    story.append(HorizontalLine(450, 2, ACCENT_COLOR))
    story.append(Spacer(1, 0.2*inch))

    # 6.1 Authentication
    story.append(Paragraph("6.1 Autenticación y Autorización", styles['SubsectionTitle']))

    auth_desc = """
    El sistema implementa múltiples capas de autenticación para garantizar la seguridad:
    """
    story.append(Paragraph(auth_desc, styles['CustomBody']))

    auth_layers = [
        ['Método', 'Implementación', 'Uso'],
        ['JWT', '@fastify/jwt con secret de 256 bits', 'Autenticación principal'],
        ['OAuth 2.0', 'passport-google-oauth20', 'Login con Google'],
        ['2FA', 'speakeasy + QR codes', 'Verificación adicional'],
        ['API Keys', 'Hash bcrypt con permisos granulares', 'Acceso programático'],
        ['Rate Limiting', '@fastify/rate-limit (100 req/15min)', 'Protección DDoS'],
        ['CORS', '@fastify/cors con whitelist', 'Protección cross-origin'],
    ]

    auth_table = Table(auth_layers, colWidths=[80, 200, 160])
    auth_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ERROR_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, LIGHT_GRAY),
    ]))
    story.append(auth_table)
    story.append(Spacer(1, 0.2*inch))

    # 6.2 API Keys
    story.append(Paragraph("6.2 API Keys y Configuración", styles['SubsectionTitle']))

    warning_text = """
    <b>ADVERTENCIA DE SEGURIDAD:</b> Las API keys mostradas a continuación son sensibles y deben
    ser rotadas regularmente. NUNCA compartir estas claves en repositorios públicos o con
    personal no autorizado.
    """
    story.append(Paragraph(warning_text, styles['Warning']))

    api_keys_data = [
        ['Servicio', 'Variable', 'Formato', 'Rotación'],
        ['OpenAI', 'OPENAI_API_KEY', 'sk-proj-***', '90 días'],
        ['SendGrid', 'SENDGRID_API_KEY', 'SG.***', '180 días'],
        ['Redis Cloud', 'REDIS_PASSWORD', '***bee1OAr4', '365 días'],
        ['JWT', 'JWT_SECRET', '32+ chars', '30 días'],
        ['Database', 'DATABASE_URL', 'postgresql://***', 'Manual'],
        ['AWS S3', 'AWS_SECRET_ACCESS_KEY', 'AWS***', '90 días'],
        ['Stripe', 'STRIPE_SECRET_KEY', 'sk_test_***', 'Manual'],
    ]

    keys_table = Table(api_keys_data, colWidths=[80, 150, 100, 80])
    keys_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), WARNING_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, LIGHT_GRAY),
    ]))
    story.append(keys_table)
    story.append(Spacer(1, 0.2*inch))

    # 6.3 Security Layers
    story.append(Paragraph("6.3 Capas de Seguridad", styles['SubsectionTitle']))

    security_diagram = """
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                         SECURITY LAYERS                                      │
    ├─────────────────────────────────────────────────────────────────────────────┤
    │                                                                              │
    │   Layer 1: Network Security                                                  │
    │   ├── HTTPS/TLS 1.3 (Render.com managed)                                    │
    │   ├── CORS Policy (whitelisted origins)                                     │
    │   └── Rate Limiting (100 req/15min per IP)                                  │
    │                                                                              │
    │   Layer 2: Authentication                                                    │
    │   ├── JWT Tokens (RS256, 24h expiry)                                        │
    │   ├── OAuth 2.0 (Google)                                                    │
    │   ├── 2FA/TOTP (Speakeasy)                                                  │
    │   └── Password Hashing (bcrypt, 12 rounds)                                  │
    │                                                                              │
    │   Layer 3: Authorization                                                     │
    │   ├── Role-Based Access Control (RBAC)                                      │
    │   │   ├── user: Basic access                                                │
    │   │   ├── professional: Extended features                                   │
    │   │   └── admin: Full system access                                         │
    │   └── Resource-level permissions                                            │
    │                                                                              │
    │   Layer 4: Data Security                                                     │
    │   ├── Database encryption at rest (Render)                                  │
    │   ├── Backup encryption (AES-256)                                           │
    │   ├── PII masking in logs                                                   │
    │   └── Secure file uploads (signed URLs)                                     │
    │                                                                              │
    │   Layer 5: Audit & Monitoring                                               │
    │   ├── Audit logs for all admin actions                                      │
    │   ├── OpenTelemetry tracing                                                 │
    │   ├── Prometheus metrics                                                    │
    │   └── Automated alerting                                                    │
    │                                                                              │
    └─────────────────────────────────────────────────────────────────────────────┘
    """
    story.append(Paragraph(security_diagram.replace('\n', '<br/>'), styles['CodeBlock']))

    story.append(PageBreak())

def add_observability_section(story, styles):
    """Add observability section"""
    story.append(Paragraph("7. OBSERVABILIDAD", styles['SectionTitle']))
    story.append(HorizontalLine(450, 2, ACCENT_COLOR))
    story.append(Spacer(1, 0.2*inch))

    # 7.1 OpenTelemetry
    story.append(Paragraph("7.1 OpenTelemetry", styles['SubsectionTitle']))

    otel_desc = """
    El sistema utiliza <b>OpenTelemetry</b> para trazas distribuidas y métricas. La configuración
    se inicializa antes de cualquier otro import para capturar todas las operaciones.
    """
    story.append(Paragraph(otel_desc, styles['CustomBody']))

    otel_code = """
    // src/config/telemetry.ts
    import { NodeSDK } from '@opentelemetry/sdk-node';
    import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
    import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
    import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
    import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

    export function initializeTelemetry() {
      const sdk = new NodeSDK({
        serviceName: 'legal-rag-backend',
        traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }),
        metricReader: new OTLPMetricExporter(),
        instrumentations: [
          new FastifyInstrumentation(),
          new HttpInstrumentation(),
        ],
      });
      sdk.start();
    }
    """
    story.append(Paragraph(otel_code.replace('\n', '<br/>'), styles['CodeBlock']))

    # 7.2 Metrics
    story.append(Paragraph("7.2 Métricas y Alertas", styles['SubsectionTitle']))

    metrics_data = [
        ['Métrica', 'Tipo', 'Descripción', 'Alerta'],
        ['http_requests_total', 'Counter', 'Total de peticiones HTTP', '>1000/min'],
        ['http_request_duration_ms', 'Histogram', 'Latencia de peticiones', '>500ms p95'],
        ['search_cache_hits', 'Counter', 'Hits de caché de búsqueda', '<50% rate'],
        ['openai_queue_size', 'Gauge', 'Tamaño de cola OpenAI', '>100 items'],
        ['db_connection_pool', 'Gauge', 'Conexiones activas DB', '>45/50'],
        ['error_rate', 'Counter', 'Tasa de errores', '>1%'],
        ['backup_status', 'Gauge', 'Estado de backups', 'failed'],
    ]

    metrics_table = Table(metrics_data, colWidths=[120, 70, 170, 80])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SUCCESS_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, LIGHT_GRAY),
    ]))
    story.append(metrics_table)

    story.append(PageBreak())

def add_deployment_section(story, styles):
    """Add deployment section"""
    story.append(Paragraph("8. DEPLOYMENT", styles['SectionTitle']))
    story.append(HorizontalLine(450, 2, ACCENT_COLOR))
    story.append(Spacer(1, 0.2*inch))

    # 8.1 Render.com
    story.append(Paragraph("8.1 Render.com", styles['SubsectionTitle']))

    render_desc = """
    El sistema está desplegado en <b>Render.com</b> con la siguiente configuración:
    """
    story.append(Paragraph(render_desc, styles['CustomBody']))

    render_services = [
        ['Servicio', 'Tipo', 'Plan', 'URL'],
        ['legal-rag-backend', 'Web Service', 'Starter', 'api.legal-rag.onrender.com'],
        ['legal-rag-frontend', 'Static Site', 'Free', 'legal-rag.onrender.com'],
        ['legal_rag_postgres', 'PostgreSQL', 'Basic', 'oregon-postgres.render.com'],
    ]

    render_table = Table(render_services, colWidths=[120, 80, 60, 180])
    render_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, LIGHT_GRAY),
    ]))
    story.append(render_table)
    story.append(Spacer(1, 0.2*inch))

    # 8.2 Environment Variables
    story.append(Paragraph("8.2 Variables de Entorno", styles['SubsectionTitle']))

    env_vars = """
    # Database
    DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

    # OpenAI
    OPENAI_API_KEY="sk-proj-***"
    EMBEDDING_MODEL="text-embedding-ada-002"
    EMBEDDING_DIMENSIONS=1536

    # Redis Cloud
    REDIS_URL="redis://default:***@redis-12465.ec2.redns.redis-cloud.com:12465"
    REDIS_TLS=false

    # Cache Configuration
    CACHE_L1_TTL_MS=300000       # 5 minutes
    CACHE_L2_TTL_MS=3600000      # 1 hour
    CACHE_L3_TTL_MS=86400000     # 24 hours

    # Authentication
    JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
    NEXTAUTH_SECRET="tu-secret-aleatorio"

    # Email (SendGrid)
    SENDGRID_API_KEY="SG.***"
    FROM_EMAIL="noreply@poweria-legal.com"

    # AWS S3
    AWS_ACCESS_KEY_ID="***"
    AWS_SECRET_ACCESS_KEY="***"
    AWS_S3_BUCKET="legal-rag-documents"

    # Performance
    MAX_CONCURRENT_REQUESTS=500
    REQUEST_TIMEOUT_MS=30000
    DATABASE_POOL_SIZE=50
    OPENAI_MAX_CONCURRENT=5
    """
    story.append(Paragraph(env_vars.replace('\n', '<br/>'), styles['CodeBlock']))

    story.append(PageBreak())

def add_appendix(story, styles):
    """Add appendix with additional technical details"""
    story.append(Paragraph("APÉNDICE", styles['SectionTitle']))
    story.append(HorizontalLine(450, 2, ACCENT_COLOR))
    story.append(Spacer(1, 0.2*inch))

    # Dependencies list
    story.append(Paragraph("A. Dependencias del Backend", styles['SubsectionTitle']))

    deps_code = """
    {
      "dependencies": {
        "@aws-sdk/client-s3": "^3.931.0",
        "@fastify/cors": "^9.0.1",
        "@fastify/jwt": "^8.0.0",
        "@fastify/multipart": "^8.1.0",
        "@fastify/rate-limit": "^9.1.0",
        "@langchain/anthropic": "^0.1.3",
        "@langchain/openai": "^0.0.19",
        "@opentelemetry/sdk-node": "^0.208.0",
        "@pinecone-database/pinecone": "^2.0.0",
        "@prisma/client": "^5.10.0",
        "@sendgrid/mail": "^8.1.6",
        "bcrypt": "^5.1.1",
        "bullmq": "^5.63.0",
        "fastify": "^4.26.0",
        "ioredis": "^5.8.2",
        "jsonwebtoken": "^9.0.2",
        "langchain": "^0.1.25",
        "openai": "^4.28.0",
        "prom-client": "^15.1.3",
        "speakeasy": "^2.0.0",
        "zod": "^3.22.4"
      }
    }
    """
    story.append(Paragraph(deps_code.replace('\n', '<br/>'), styles['CodeBlock']))

    story.append(Paragraph("B. Dependencias del Frontend", styles['SubsectionTitle']))

    frontend_deps = """
    {
      "dependencies": {
        "@radix-ui/react-dialog": "^1.0.5",
        "@radix-ui/react-toast": "^1.1.5",
        "@tanstack/react-query": "^5.24.1",
        "axios": "^1.6.7",
        "class-variance-authority": "^0.7.0",
        "lucide-react": "^0.330.0",
        "next": "15.0.0",
        "next-auth": "^5.0.0-beta.4",
        "pdfjs-dist": "^5.4.394",
        "react": "^18.3.1",
        "tailwindcss": "^3.4.1",
        "zustand": "^4.5.0"
      }
    }
    """
    story.append(Paragraph(frontend_deps.replace('\n', '<br/>'), styles['CodeBlock']))

    # Contact info
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph("C. Información de Contacto", styles['SubsectionTitle']))

    contact_info = """
    <b>Poweria Legal</b><br/>
    Email: noreply@poweria-legal.com<br/>
    Documentación: https://docs.poweria-legal.com<br/>
    Soporte: support@poweria-legal.com
    """
    story.append(Paragraph(contact_info, styles['Info']))

def generate_pdf():
    """Generate the complete PDF report"""
    output_path = "LEGAL_RAG_TECHNICAL_REPORT_PROFESSIONAL.pdf"

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=50,
        leftMargin=50,
        topMargin=50,
        bottomMargin=50
    )

    styles = create_styles()
    story = []

    # Add all sections
    add_cover_page(story, styles)
    add_table_of_contents(story, styles)
    add_executive_summary(story, styles)
    add_architecture_section(story, styles)
    add_database_section(story, styles)
    add_backend_section(story, styles)
    add_frontend_section(story, styles)
    add_security_section(story, styles)
    add_observability_section(story, styles)
    add_deployment_section(story, styles)
    add_appendix(story, styles)

    # Build PDF
    doc.build(story)
    print(f"[OK] PDF generado exitosamente: {output_path}")
    return output_path

if __name__ == "__main__":
    generate_pdf()
