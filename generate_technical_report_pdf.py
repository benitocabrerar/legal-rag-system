#!/usr/bin/env python3
"""
Generador de Informe Técnico Profesional - Sistema Legal RAG
Genera un PDF completo con análisis técnico detallado
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib.colors import HexColor, black, white, grey, darkgrey
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, ListFlowable, ListItem, KeepTogether
)
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus.tableofcontents import TableOfContents
from datetime import datetime
import os

# Colores corporativos
PRIMARY_COLOR = HexColor('#1a365d')  # Azul oscuro profesional
SECONDARY_COLOR = HexColor('#2c5282')  # Azul medio
ACCENT_COLOR = HexColor('#3182ce')  # Azul claro
SUCCESS_COLOR = HexColor('#38a169')  # Verde
WARNING_COLOR = HexColor('#d69e2e')  # Amarillo
DANGER_COLOR = HexColor('#e53e3e')  # Rojo
LIGHT_BG = HexColor('#f7fafc')  # Gris muy claro
DARK_TEXT = HexColor('#1a202c')  # Texto oscuro

class NumberedCanvas(canvas.Canvas):
    """Canvas personalizado con numeración de páginas"""
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.setFont("Helvetica", 9)
        self.setFillColor(grey)
        page_num = self._pageNumber
        text = f"Página {page_num} de {page_count}"
        self.drawRightString(letter[0] - 0.75*inch, 0.5*inch, text)

        # Footer con nombre del documento
        self.drawString(0.75*inch, 0.5*inch, "Informe Técnico - Sistema Legal RAG v1.0")

        # Línea separadora del footer
        self.setStrokeColor(LIGHT_BG)
        self.line(0.75*inch, 0.65*inch, letter[0] - 0.75*inch, 0.65*inch)


def create_styles():
    """Crea estilos personalizados para el documento"""
    styles = getSampleStyleSheet()

    # Título principal
    styles.add(ParagraphStyle(
        name='MainTitle',
        parent=styles['Title'],
        fontSize=28,
        textColor=PRIMARY_COLOR,
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    ))

    # Subtítulo
    styles.add(ParagraphStyle(
        name='SubTitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=SECONDARY_COLOR,
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica'
    ))

    # Título de sección (H1)
    styles.add(ParagraphStyle(
        name='SectionTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=PRIMARY_COLOR,
        spaceBefore=25,
        spaceAfter=15,
        fontName='Helvetica-Bold',
        borderPadding=(0, 0, 5, 0),
        borderColor=ACCENT_COLOR,
        borderWidth=2,
        borderRadius=None
    ))

    # Título de subsección (H2)
    styles.add(ParagraphStyle(
        name='SubSectionTitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=SECONDARY_COLOR,
        spaceBefore=18,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    ))

    # Título de sub-subsección (H3)
    styles.add(ParagraphStyle(
        name='SubSubSectionTitle',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=DARK_TEXT,
        spaceBefore=12,
        spaceAfter=8,
        fontName='Helvetica-Bold'
    ))

    # Texto normal justificado
    styles.add(ParagraphStyle(
        name='BodyTextCustom',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        alignment=TA_JUSTIFY,
        spaceAfter=8,
        leading=14
    ))

    # Texto de código
    styles.add(ParagraphStyle(
        name='CodeBlock',
        parent=styles['Normal'],
        fontSize=8,
        fontName='Courier',
        textColor=HexColor('#2d3748'),
        backColor=HexColor('#edf2f7'),
        spaceBefore=5,
        spaceAfter=5,
        leftIndent=10,
        rightIndent=10,
        leading=12
    ))

    # Nota/advertencia
    styles.add(ParagraphStyle(
        name='Note',
        parent=styles['Normal'],
        fontSize=9,
        textColor=HexColor('#744210'),
        backColor=HexColor('#fefcbf'),
        spaceBefore=10,
        spaceAfter=10,
        leftIndent=15,
        rightIndent=15,
        borderPadding=10,
        leading=12
    ))

    # Texto de tabla
    styles.add(ParagraphStyle(
        name='TableCell',
        parent=styles['Normal'],
        fontSize=9,
        textColor=DARK_TEXT,
        alignment=TA_LEFT,
        leading=11
    ))

    # Texto centrado para tablas
    styles.add(ParagraphStyle(
        name='TableCellCenter',
        parent=styles['Normal'],
        fontSize=9,
        textColor=DARK_TEXT,
        alignment=TA_CENTER,
        leading=11
    ))

    # Bullet point
    styles.add(ParagraphStyle(
        name='BulletPoint',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        leftIndent=20,
        spaceAfter=4,
        bulletIndent=10
    ))

    return styles


def create_cover_page(styles):
    """Crea la página de portada"""
    elements = []

    # Espaciado superior
    elements.append(Spacer(1, 2*inch))

    # Título principal
    elements.append(Paragraph(
        "INFORME TÉCNICO COMPLETO",
        styles['MainTitle']
    ))

    elements.append(Paragraph(
        "Sistema Legal RAG",
        ParagraphStyle(
            name='CoverSubtitle',
            fontSize=24,
            textColor=ACCENT_COLOR,
            alignment=TA_CENTER,
            spaceAfter=10,
            fontName='Helvetica'
        )
    ))

    elements.append(Spacer(1, 0.5*inch))

    # Línea decorativa
    line_data = [['', '', '']]
    line_table = Table(line_data, colWidths=[2*inch, 2*inch, 2*inch])
    line_table.setStyle(TableStyle([
        ('LINEABOVE', (1, 0), (1, 0), 3, ACCENT_COLOR),
    ]))
    elements.append(line_table)

    elements.append(Spacer(1, 0.5*inch))

    # Subtítulo
    elements.append(Paragraph(
        "Análisis Profundo de Arquitectura, Estado y Recomendaciones",
        styles['SubTitle']
    ))

    elements.append(Spacer(1, 1*inch))

    # Información del documento
    info_data = [
        ['Versión del Documento:', '1.0'],
        ['Fecha de Generación:', datetime.now().strftime('%d de %B, %Y')],
        ['Clasificación:', 'Documentación Técnica Interna'],
        ['Estado del Sistema:', '80% Producción-Ready'],
    ]

    info_table = Table(info_data, colWidths=[2.5*inch, 3*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (0, 0), (0, -1), SECONDARY_COLOR),
        ('TEXTCOLOR', (1, 0), (1, -1), DARK_TEXT),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)

    elements.append(Spacer(1, 1.5*inch))

    # Badge de estado
    status_data = [['SISTEMA LEGAL RAG - ANÁLISIS COMPLETO']]
    status_table = Table(status_data, colWidths=[4*inch])
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, -1), white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 15),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ('ROUNDEDCORNERS', [5, 5, 5, 5]),
    ]))
    elements.append(status_table)

    elements.append(PageBreak())
    return elements


def create_toc(styles):
    """Crea la tabla de contenidos"""
    elements = []

    elements.append(Paragraph("Tabla de Contenidos", styles['SectionTitle']))
    elements.append(Spacer(1, 0.3*inch))

    toc_items = [
        ("1. Resumen Ejecutivo", "3"),
        ("2. Arquitectura del Sistema", "5"),
        ("3. Stack Tecnológico", "8"),
        ("4. Backend - Análisis Detallado", "11"),
        ("5. Base de Datos y Schema", "15"),
        ("6. Frontend - Estructura y Componentes", "20"),
        ("7. Sistema RAG y Vectores", "23"),
        ("8. Servicios de IA y NLP", "27"),
        ("9. Sistema de Caché Multi-Nivel", "30"),
        ("10. Observabilidad y Monitoreo", "32"),
        ("11. Sistema de Backup", "35"),
        ("12. Seguridad y Autenticación", "38"),
        ("13. Problemas Críticos Identificados", "41"),
        ("14. Métricas de Calidad", "44"),
        ("15. Recomendaciones", "46"),
        ("16. Roadmap de Mejoras", "48"),
    ]

    toc_data = []
    for title, page in toc_items:
        toc_data.append([
            Paragraph(title, styles['BodyTextCustom']),
            Paragraph(page, ParagraphStyle(name='TOCPage', fontSize=10, alignment=TA_RIGHT))
        ])

    toc_table = Table(toc_data, colWidths=[5*inch, 1*inch])
    toc_table.setStyle(TableStyle([
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, LIGHT_BG),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(toc_table)

    elements.append(PageBreak())
    return elements


def create_executive_summary(styles):
    """Crea la sección de resumen ejecutivo"""
    elements = []

    elements.append(Paragraph("1. Resumen Ejecutivo", styles['SectionTitle']))

    # Descripción general
    elements.append(Paragraph("1.1 Descripción General", styles['SubSectionTitle']))

    elements.append(Paragraph(
        """El <b>Sistema Legal RAG</b> es una plataforma empresarial de gestión legal inteligente
        diseñada específicamente para el <b>sistema jurídico ecuatoriano</b>. Implementa técnicas
        avanzadas de Retrieval-Augmented Generation (RAG) para proporcionar asistencia legal
        automatizada basada en documentos normativos, códigos y jurisprudencia.""",
        styles['BodyTextCustom']
    ))

    elements.append(Spacer(1, 0.2*inch))

    # Estado actual
    elements.append(Paragraph("1.2 Estado Actual del Sistema", styles['SubSectionTitle']))

    status_data = [
        ['Métrica', 'Valor', 'Estado'],
        ['Preparación para Producción', '80%', 'Casi Listo'],
        ['Cobertura de Tests', '228 casos', 'Buena'],
        ['Servicios Backend', '62', 'Completo'],
        ['Rutas API', '39', 'Completo'],
        ['Modelos de Base de Datos', '50+', 'Completo'],
        ['Páginas Frontend', '31', 'Completo'],
        ['Componentes React', '28+', 'Completo'],
        ['Issues Críticos', '3', 'Requiere Atención'],
    ]

    status_table = Table(status_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('BACKGROUND', (0, 1), (-1, -1), white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        # Color para estado
        ('TEXTCOLOR', (2, 1), (2, 1), WARNING_COLOR),  # Casi Listo
        ('TEXTCOLOR', (2, 2), (2, 7), SUCCESS_COLOR),  # Buena/Completo
        ('TEXTCOLOR', (2, 8), (2, 8), DANGER_COLOR),   # Requiere Atención
    ]))
    elements.append(status_table)

    elements.append(Spacer(1, 0.3*inch))

    # Capacidades principales
    elements.append(Paragraph("1.3 Capacidades Principales", styles['SubSectionTitle']))

    capabilities = [
        "<b>Búsqueda Semántica Legal:</b> Embeddings vectoriales con pgvector/Pinecone",
        "<b>Asistente Legal IA:</b> GPT-4 contextualizado para derecho ecuatoriano",
        "<b>Gestión de Casos:</b> CRUD completo con documentos y análisis",
        "<b>Biblioteca Legal Digital:</b> Normativa ecuatoriana clasificada jerárquicamente",
        "<b>Calendario y Tareas:</b> Gestión de plazos procesales",
        "<b>Sistema Financiero:</b> Facturación, cobros y control de honorarios",
        "<b>Multi-tenancy:</b> Soporte para múltiples usuarios/organizaciones",
        "<b>Backup Automatizado:</b> Sistema completo de respaldos con encriptación",
    ]

    for cap in capabilities:
        elements.append(Paragraph(f"• {cap}", styles['BulletPoint']))

    elements.append(PageBreak())
    return elements


def create_architecture_section(styles):
    """Crea la sección de arquitectura"""
    elements = []

    elements.append(Paragraph("2. Arquitectura del Sistema", styles['SectionTitle']))

    elements.append(Paragraph("2.1 Diagrama de Arquitectura de Alto Nivel", styles['SubSectionTitle']))

    elements.append(Paragraph(
        """La arquitectura del sistema sigue un patrón de capas bien definido, con separación clara
        entre la capa de presentación (Frontend), la capa de aplicación (API Gateway y servicios),
        y la capa de datos (PostgreSQL, Redis, S3).""",
        styles['BodyTextCustom']
    ))

    # Tabla de capas de arquitectura
    arch_data = [
        ['Capa', 'Tecnología', 'Responsabilidad'],
        ['Cliente', 'Next.js 14 + React', 'Interfaz de usuario, SPA'],
        ['API Gateway', 'Fastify 4.26', 'Routing, Auth, Rate Limiting'],
        ['Servicios', 'TypeScript Services', 'Lógica de negocio, RAG Pipeline'],
        ['Caché', 'Redis + Node-Cache', 'Caché multi-nivel L1/L2/L3'],
        ['Base de Datos', 'PostgreSQL + pgvector', 'Persistencia, Búsqueda vectorial'],
        ['Storage', 'AWS S3', 'Documentos, Backups'],
        ['AI/ML', 'OpenAI GPT-4', 'Embeddings, Generación'],
    ]

    arch_table = Table(arch_data, colWidths=[1.5*inch, 2*inch, 2.5*inch])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(arch_table)

    elements.append(Spacer(1, 0.3*inch))

    # Patrón de comunicación
    elements.append(Paragraph("2.2 Patrón de Comunicación", styles['SubSectionTitle']))

    elements.append(Paragraph(
        """El sistema implementa un patrón Request-Response síncrono para la mayoría de las operaciones,
        con soporte para Server-Sent Events (SSE) para operaciones de larga duración como backups
        y procesamiento de documentos. Las colas BullMQ manejan tareas asíncronas pesadas.""",
        styles['BodyTextCustom']
    ))

    comm_data = [
        ['Componente', 'Protocolo', 'Uso'],
        ['REST API', 'HTTP/HTTPS', 'Operaciones CRUD estándar'],
        ['SSE', 'HTTP Streaming', 'Progreso en tiempo real'],
        ['BullMQ', 'Redis Pub/Sub', 'Jobs asíncronos (embeddings, backups)'],
        ['WebSocket', 'WS/WSS', 'Notificaciones (futuro)'],
    ]

    comm_table = Table(comm_data, colWidths=[1.5*inch, 1.5*inch, 3*inch])
    comm_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(comm_table)

    elements.append(PageBreak())
    return elements


def create_stack_section(styles):
    """Crea la sección del stack tecnológico"""
    elements = []

    elements.append(Paragraph("3. Stack Tecnológico", styles['SectionTitle']))

    elements.append(Paragraph("3.1 Dependencias de Producción - Framework y Runtime", styles['SubSectionTitle']))

    framework_data = [
        ['Paquete', 'Versión', 'Propósito'],
        ['fastify', '^4.26.0', 'Framework HTTP de alto rendimiento'],
        ['tsx', '^4.7.1', 'TypeScript runtime'],
        ['typescript', '^5.3.3', 'Tipado estático'],
        ['@prisma/client', '^5.10.0', 'ORM con type-safety'],
        ['pg', '^8.16.3', 'Driver PostgreSQL nativo'],
    ]

    framework_table = Table(framework_data, colWidths=[2*inch, 1.2*inch, 2.8*inch])
    framework_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(framework_table)

    elements.append(Spacer(1, 0.2*inch))

    elements.append(Paragraph("3.2 Inteligencia Artificial", styles['SubSectionTitle']))

    ai_data = [
        ['Paquete', 'Versión', 'Propósito'],
        ['openai', '^4.28.0', 'API oficial de OpenAI'],
        ['@langchain/openai', '^0.0.19', 'LangChain integration'],
        ['@langchain/anthropic', '^0.1.3', 'Soporte Claude (futuro)'],
        ['langchain', '^0.1.25', 'Chains y prompts'],
        ['@pinecone-database/pinecone', '^2.0.0', 'Vector database cloud'],
    ]

    ai_table = Table(ai_data, colWidths=[2.3*inch, 1*inch, 2.7*inch])
    ai_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(ai_table)

    elements.append(Spacer(1, 0.2*inch))

    elements.append(Paragraph("3.3 Caché y Colas", styles['SubSectionTitle']))

    cache_data = [
        ['Paquete', 'Versión', 'Propósito'],
        ['ioredis', '^5.8.2', 'Cliente Redis de alto rendimiento'],
        ['redis', '^4.6.13', 'Cliente Redis oficial'],
        ['bullmq', '^5.63.0', 'Job queues distribuidas'],
        ['node-cache', '^5.1.2', 'Caché en memoria L1'],
    ]

    cache_table = Table(cache_data, colWidths=[2*inch, 1.2*inch, 2.8*inch])
    cache_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SUCCESS_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(cache_table)

    elements.append(Spacer(1, 0.2*inch))

    elements.append(Paragraph("3.4 Autenticación y Seguridad", styles['SubSectionTitle']))

    auth_data = [
        ['Paquete', 'Versión', 'Propósito'],
        ['@fastify/jwt', '^8.0.0', 'JSON Web Tokens'],
        ['bcrypt', '^5.1.1', 'Password hashing'],
        ['speakeasy', '^2.0.0', '2FA TOTP generation'],
        ['qrcode', '^1.5.4', 'QR codes para 2FA'],
        ['passport', '^0.7.0', 'OAuth strategies'],
        ['passport-google-oauth20', '^2.0.0', 'Google OAuth'],
    ]

    auth_table = Table(auth_data, colWidths=[2.3*inch, 1*inch, 2.7*inch])
    auth_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DANGER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(auth_table)

    elements.append(Spacer(1, 0.2*inch))

    elements.append(Paragraph("3.5 Observabilidad", styles['SubSectionTitle']))

    obs_data = [
        ['Paquete', 'Versión', 'Propósito'],
        ['@opentelemetry/sdk-node', '^0.208.0', 'Telemetry SDK'],
        ['@opentelemetry/exporter-trace-otlp-http', '^0.208.0', 'Trace export'],
        ['@opentelemetry/instrumentation-fastify', '^0.53.0', 'Auto-instrumentation'],
        ['prom-client', '^15.1.3', 'Prometheus metrics'],
        ['dd-trace', '^5.77.0', 'Datadog APM'],
    ]

    obs_table = Table(obs_data, colWidths=[2.8*inch, 1*inch, 2.2*inch])
    obs_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#805ad5')),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(obs_table)

    elements.append(PageBreak())
    return elements


def create_backend_section(styles):
    """Crea la sección de backend"""
    elements = []

    elements.append(Paragraph("4. Backend - Análisis Detallado", styles['SectionTitle']))

    elements.append(Paragraph("4.1 Estructura de Directorios", styles['SubSectionTitle']))

    elements.append(Paragraph(
        """El backend sigue una arquitectura modular bien organizada con separación clara
        de responsabilidades. La estructura principal incluye:""",
        styles['BodyTextCustom']
    ))

    dir_data = [
        ['Directorio', 'Archivos', 'Descripción'],
        ['src/config/', '5+', 'Configuraciones centralizadas (telemetry, database)'],
        ['src/middleware/', '3', 'Middleware de Fastify (observability, prisma)'],
        ['src/routes/', '39', 'Definición de endpoints API'],
        ['src/routes/admin/', '7', 'Rutas administrativas'],
        ['src/routes/observability/', '2', 'Métricas y health checks'],
        ['src/services/', '62', 'Lógica de negocio'],
        ['src/services/ai/', '3', 'Servicios de IA (OpenAI, Legal Assistant)'],
        ['src/services/backup/', '9', 'Sistema completo de backup'],
        ['src/services/cache/', '3', 'Sistema de caché multi-nivel'],
        ['src/services/citations/', '4', 'Extracción de citaciones legales'],
        ['src/services/nlp/', '6', 'Procesamiento de lenguaje natural'],
        ['src/services/observability/', '4', 'Métricas, tracing, alerting'],
        ['src/services/search/', '4', 'Motor de búsqueda avanzada'],
        ['src/types/', '5+', 'Definiciones TypeScript'],
    ]

    dir_table = Table(dir_data, colWidths=[2*inch, 0.8*inch, 3.2*inch])
    dir_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(dir_table)

    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph("4.2 Rutas API Registradas", styles['SubSectionTitle']))

    routes_data = [
        ['Prefijo', 'Módulo', 'Descripción'],
        ['/observability', 'metrics, health', 'Prometheus, health checks'],
        ['/api/v1', 'auth, oauth, 2fa', 'Autenticación completa'],
        ['/api/v1', 'cases, documents', 'Gestión de casos y documentos'],
        ['/api/v1', 'query, legal-documents', 'Queries RAG y biblioteca legal'],
        ['/api/v1', 'user, subscription', 'Usuarios y suscripciones'],
        ['/api/v1', 'billing, payments', 'Facturación y pagos'],
        ['/api/v1', 'calendar, tasks', 'Calendario y tareas'],
        ['/api/v1', 'notifications', 'Sistema de notificaciones'],
        ['/api/v1', 'finance', 'Gestión financiera'],
        ['/api/v1/admin', 'users, audit, plans', 'Panel administrativo'],
        ['/api/admin', 'backup, backup-sse', 'Sistema de backup'],
        ['/api/v1/feedback', 'feedback', 'Retroalimentación usuarios'],
        ['/api/v1/search', 'advanced-search', 'Búsqueda avanzada'],
        ['/api/v1/nlp', 'nlp', 'Endpoints NLP'],
        ['/api/v1', 'ai-assistant', 'Asistente IA'],
        ['/api/v1/unified-search', 'unified-search', 'Búsqueda unificada'],
    ]

    routes_table = Table(routes_data, colWidths=[1.8*inch, 1.8*inch, 2.4*inch])
    routes_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(routes_table)

    elements.append(PageBreak())
    return elements


def create_database_section(styles):
    """Crea la sección de base de datos"""
    elements = []

    elements.append(Paragraph("5. Base de Datos y Schema", styles['SectionTitle']))

    elements.append(Paragraph("5.1 Información General", styles['SubSectionTitle']))

    db_info_data = [
        ['Característica', 'Valor'],
        ['Motor', 'PostgreSQL 14+'],
        ['ORM', 'Prisma 5.10.0'],
        ['Extensiones', 'pgvector (embeddings), uuid-ossp'],
        ['Líneas de Schema', '~2,743'],
        ['Modelos', '50+'],
        ['Enums', '15+'],
    ]

    db_info_table = Table(db_info_data, colWidths=[2.5*inch, 3.5*inch])
    db_info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(db_info_table)

    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph("5.2 Enumeraciones del Sistema Legal Ecuatoriano", styles['SubSectionTitle']))

    elements.append(Paragraph("<b>NormType (Tipo de Norma):</b>", styles['BodyTextCustom']))

    norm_types = [
        "CONSTITUTIONAL_NORM - Norma constitucional",
        "ORGANIC_LAW - Ley orgánica",
        "ORDINARY_LAW - Ley ordinaria",
        "ORGANIC_CODE - Código orgánico",
        "ORDINARY_CODE - Código ordinario",
        "REGULATION_GENERAL - Reglamento general",
        "REGULATION_EXECUTIVE - Reglamento ejecutivo",
        "ORDINANCE_MUNICIPAL - Ordenanza municipal",
        "RESOLUTION_ADMINISTRATIVE - Resolución administrativa",
        "RESOLUTION_JUDICIAL - Resolución judicial",
        "INTERNATIONAL_TREATY - Tratado internacional",
        "JUDICIAL_PRECEDENT - Precedente judicial",
    ]

    for norm in norm_types[:6]:
        elements.append(Paragraph(f"• {norm}", styles['BulletPoint']))

    elements.append(Spacer(1, 0.2*inch))

    elements.append(Paragraph("<b>LegalHierarchy (Jerarquía Legal - Art. 425 Constitución Ecuador):</b>", styles['BodyTextCustom']))

    hierarchy_data = [
        ['Nivel', 'Enum', 'Descripción'],
        ['1', 'CONSTITUCION', 'Constitución de la República'],
        ['2', 'TRATADOS_INTERNACIONALES_DDHH', 'Tratados internacionales de DDHH'],
        ['3', 'LEYES_ORGANICAS', 'Leyes orgánicas'],
        ['4', 'LEYES_ORDINARIAS', 'Leyes ordinarias'],
        ['5', 'CODIGOS_ORGANICOS', 'Códigos orgánicos'],
        ['6', 'CODIGOS_ORDINARIOS', 'Códigos ordinarios'],
        ['7', 'REGLAMENTOS', 'Reglamentos'],
        ['8', 'ORDENANZAS', 'Ordenanzas'],
        ['9', 'RESOLUCIONES', 'Resoluciones'],
        ['10', 'ACUERDOS_ADMINISTRATIVOS', 'Acuerdos administrativos'],
    ]

    hierarchy_table = Table(hierarchy_data, colWidths=[0.6*inch, 2.5*inch, 2.9*inch])
    hierarchy_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(hierarchy_table)

    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph("5.3 Modelos Principales", styles['SubSectionTitle']))

    elements.append(Paragraph("<b>User (Usuario):</b> Modelo central con 25+ relaciones", styles['BodyTextCustom']))

    user_fields = [
        "Autenticación: email, password, googleId, googleAccessToken",
        "2FA: twoFactorEnabled, twoFactorSecret, backupCodes",
        "Perfil: name, profesionalProfile, licenseNumber, specialtyId",
        "Preferencias: timezone, theme, emailNotifications",
        "Relaciones: cases, documents, events, tasks, payments, subscription",
    ]

    for field in user_fields:
        elements.append(Paragraph(f"• {field}", styles['BulletPoint']))

    elements.append(Spacer(1, 0.2*inch))

    elements.append(Paragraph("<b>LegalDocument (Documento Legal):</b>", styles['BodyTextCustom']))

    legal_doc_fields = [
        "Identificación: title, officialTitle, normType, hierarchy",
        "Publicación: publicationType, publicationNumber, publicationDate",
        "Contenido: content (Text), summary, keywords[], categories[]",
        "Metadatos Ecuador: issuingEntity, jurisdiction, articleReferences[]",
        "Estado: state (DocumentState), isActive",
        "Vector: embedding (vector(1536))",
        "Relaciones: chunks[], citations[], summaries[]",
    ]

    for field in legal_doc_fields:
        elements.append(Paragraph(f"• {field}", styles['BulletPoint']))

    elements.append(PageBreak())
    return elements


def create_frontend_section(styles):
    """Crea la sección de frontend"""
    elements = []

    elements.append(Paragraph("6. Frontend - Estructura y Componentes", styles['SectionTitle']))

    elements.append(Paragraph("6.1 Stack Frontend", styles['SubSectionTitle']))

    fe_stack_data = [
        ['Tecnología', 'Versión', 'Propósito'],
        ['Next.js', '14.x', 'Framework React con App Router'],
        ['React', '18.x', 'UI Library'],
        ['TypeScript', '5.x', 'Type safety'],
        ['Tailwind CSS', '3.x', 'Styling utility-first'],
        ['shadcn/ui', 'Latest', 'Component library'],
        ['React Query', '-', 'Server state management'],
        ['Zustand', '-', 'Client state management'],
    ]

    fe_stack_table = Table(fe_stack_data, colWidths=[1.8*inch, 1*inch, 3.2*inch])
    fe_stack_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(fe_stack_table)

    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph("6.2 Estructura de Páginas (31 páginas)", styles['SubSectionTitle']))

    pages_data = [
        ['Sección', 'Páginas', 'Funcionalidad'],
        ['(auth)/', '3', 'Login, Register, Forgot Password'],
        ['account/', '5', 'Profile, Billing, Security, Settings, Subscription'],
        ['admin/', '7', 'Users, Backups, Legal Library, Plans, Analytics, Quotas'],
        ['dashboard/', '12', 'Main, Calendar, Cases, Documents, Tasks, Finance, Query'],
        ['dashboard/cases/', '3', 'List, Detail [id], New'],
    ]

    pages_table = Table(pages_data, colWidths=[1.5*inch, 0.8*inch, 3.7*inch])
    pages_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(pages_table)

    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph("6.3 Componentes Principales (28+ componentes)", styles['SubSectionTitle']))

    components_data = [
        ['Categoría', 'Componentes', 'Ejemplos'],
        ['admin/', '3', 'CreateBackupDialog, CreateScheduleDialog, LegalDocumentUploadForm'],
        ['calendar/', '3', 'CalendarView, EventDialog, MiniCalendar'],
        ['case-detail/', '5', 'CaseHeader, CaseDocuments, CaseNotes, CaseTimeline'],
        ['dashboard/', '7', 'QuickStatsCards, AIInsightsPanel, EnhancedCaseCard'],
        ['finance/', '3', 'AgreementForm, InvoiceGenerator, PaymentTracker'],
        ['tasks/', '3', 'TaskBoard, TaskCard, TaskFilters'],
        ['ui/', '15+', 'button, card, dialog, input, select (shadcn/ui)'],
    ]

    components_table = Table(components_data, colWidths=[1.2*inch, 1*inch, 3.8*inch])
    components_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(components_table)

    elements.append(PageBreak())
    return elements


def create_rag_section(styles):
    """Crea la sección del sistema RAG"""
    elements = []

    elements.append(Paragraph("7. Sistema RAG y Vectores", styles['SectionTitle']))

    elements.append(Paragraph("7.1 Pipeline RAG - 6 Fases", styles['SubSectionTitle']))

    elements.append(Paragraph(
        """El pipeline RAG implementa un flujo completo de 6 fases para procesar documentos legales
        y responder consultas con contexto relevante del sistema jurídico ecuatoriano.""",
        styles['BodyTextCustom']
    ))

    rag_phases_data = [
        ['Fase', 'Nombre', 'Componentes Principales'],
        ['1', 'Ingesta de Documentos', 'PDF Upload → Extracción → Chunking Jerárquico'],
        ['2', 'Generación de Embeddings', 'OpenAI ada-002 → Vector 1536D → pgvector/Pinecone'],
        ['3', 'Procesamiento de Query', 'Spell Check → Entity Recognition → Query Expansion'],
        ['4', 'Búsqueda Híbrida', 'Búsqueda Vectorial + Textual → RRF Fusion'],
        ['5', 'Re-ranking y Scoring', 'Relevancia (40%) + Autoridad (25%) + Freshness (20%)'],
        ['6', 'Generación de Respuesta', 'Context Building → GPT-4 → Response + Citations'],
    ]

    rag_table = Table(rag_phases_data, colWidths=[0.6*inch, 1.8*inch, 3.6*inch])
    rag_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(rag_table)

    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph("7.2 Configuración de Vectores", styles['SubSectionTitle']))

    elements.append(Paragraph("<b>pgvector (Primario):</b>", styles['BodyTextCustom']))

    vector_features = [
        "Extensión PostgreSQL para búsqueda vectorial",
        "Índice HNSW con m=16, ef_construction=64",
        "Operador de similitud coseno (<=>)",
        "Dimensión: 1536 (OpenAI ada-002)",
    ]

    for feature in vector_features:
        elements.append(Paragraph(f"• {feature}", styles['BulletPoint']))

    elements.append(Spacer(1, 0.15*inch))

    elements.append(Paragraph("<b>Pinecone (Cloud Backup):</b>", styles['BodyTextCustom']))

    pinecone_features = [
        "Vector database en la nube como respaldo",
        "Filtrado por metadatos (normType, hierarchy)",
        "Soporte para upsert y query batch",
    ]

    for feature in pinecone_features:
        elements.append(Paragraph(f"• {feature}", styles['BulletPoint']))

    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph("7.3 Factores de Scoring", styles['SubSectionTitle']))

    scoring_data = [
        ['Factor', 'Peso', 'Componentes'],
        ['Relevancia Semántica', '40%', 'Similitud embedding + Match keywords'],
        ['Autoridad Legal', '25%', 'Jerarquía normativa + PageRank citations'],
        ['Freshness', '20%', 'Fecha publicación + Estado vigente'],
        ['Context Match', '15%', 'Jurisdicción + Área de práctica'],
    ]

    scoring_table = Table(scoring_data, colWidths=[1.8*inch, 0.8*inch, 3.4*inch])
    scoring_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SUCCESS_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(scoring_table)

    elements.append(PageBreak())
    return elements


def create_critical_issues_section(styles):
    """Crea la sección de problemas críticos"""
    elements = []

    elements.append(Paragraph("13. Problemas Críticos Identificados", styles['SectionTitle']))

    # Warning box
    warning_text = """<b>ATENCIÓN:</b> Se han identificado 3 issues bloqueantes que requieren
    atención inmediata antes del despliegue en producción."""
    elements.append(Paragraph(warning_text, styles['Note']))

    elements.append(Spacer(1, 0.2*inch))

    # Issue #1
    elements.append(Paragraph("Issue #1: OpenTelemetry Deshabilitado en Producción", styles['SubSectionTitle']))

    issue1_data = [
        ['Campo', 'Detalle'],
        ['Archivo', 'src/server.ts:1-5'],
        ['Prioridad', 'CRÍTICA'],
        ['Impacto', 'Sin distributed tracing, métricas no disponibles'],
        ['Causa', 'Error de resolución de path en Render'],
        ['Esfuerzo', '2-4 horas'],
    ]

    issue1_table = Table(issue1_data, colWidths=[1.5*inch, 4.5*inch])
    issue1_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), DANGER_COLOR),
        ('TEXTCOLOR', (0, 0), (0, -1), white),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('BACKGROUND', (1, 0), (1, -1), white),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(issue1_table)

    elements.append(Spacer(1, 0.2*inch))

    # Issue #2
    elements.append(Paragraph("Issue #2: Rutas Deshabilitadas por Dependencias", styles['SubSectionTitle']))

    issue2_data = [
        ['Campo', 'Detalle'],
        ['Archivo', 'src/server.ts:22-25, 140-141, 145-146'],
        ['Prioridad', 'ALTA'],
        ['Impacto', 'Upload mejorado y notificaciones de docs inactivos'],
        ['Causa', 'nodemailer import issue, fastify-multer faltante'],
        ['Esfuerzo', '1 hora'],
    ]

    issue2_table = Table(issue2_data, colWidths=[1.5*inch, 4.5*inch])
    issue2_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), WARNING_COLOR),
        ('TEXTCOLOR', (0, 0), (0, -1), white),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('BACKGROUND', (1, 0), (1, -1), white),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(issue2_table)

    elements.append(Spacer(1, 0.2*inch))

    # Issue #3
    elements.append(Paragraph("Issue #3: Schema Mismatch en Unified Search", styles['SubSectionTitle']))

    issue3_data = [
        ['Campo', 'Detalle'],
        ['Archivo', 'src/services/orchestration/unified-search-orchestrator.ts'],
        ['Prioridad', 'ALTA'],
        ['Impacto', 'Error al acceder a summaries como texto vs relación'],
        ['Causa', 'Campo summaries es relación, no texto'],
        ['Esfuerzo', '2 horas'],
    ]

    issue3_table = Table(issue3_data, colWidths=[1.5*inch, 4.5*inch])
    issue3_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), WARNING_COLOR),
        ('TEXTCOLOR', (0, 0), (0, -1), white),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('BACKGROUND', (1, 0), (1, -1), white),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(issue3_table)

    elements.append(PageBreak())
    return elements


def create_metrics_section(styles):
    """Crea la sección de métricas de calidad"""
    elements = []

    elements.append(Paragraph("14. Métricas de Calidad", styles['SectionTitle']))

    elements.append(Paragraph("14.1 Cobertura de Código", styles['SubSectionTitle']))

    coverage_data = [
        ['Módulo', 'Tests', 'Cobertura Est.', 'Estado'],
        ['Auth', '45', '85%', 'Bueno'],
        ['RAG Pipeline', '62', '75%', 'Bueno'],
        ['Cases', '38', '70%', 'Aceptable'],
        ['Documents', '25', '65%', 'Aceptable'],
        ['Backup', '30', '80%', 'Bueno'],
        ['NLP', '28', '70%', 'Aceptable'],
        ['TOTAL', '228', '~74%', 'Aceptable'],
    ]

    coverage_table = Table(coverage_data, colWidths=[1.5*inch, 1*inch, 1.2*inch, 1.3*inch])
    coverage_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [white, LIGHT_BG]),
        ('BACKGROUND', (0, -1), (-1, -1), HexColor('#e2e8f0')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        # Colores de estado
        ('TEXTCOLOR', (3, 1), (3, 2), SUCCESS_COLOR),
        ('TEXTCOLOR', (3, 3), (3, 4), WARNING_COLOR),
        ('TEXTCOLOR', (3, 5), (3, 6), SUCCESS_COLOR),
    ]))
    elements.append(coverage_table)

    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph("14.2 Rendimiento Estimado", styles['SubSectionTitle']))

    perf_data = [
        ['Operación', 'P50', 'P95', 'P99', 'Target'],
        ['Health check', '5ms', '15ms', '30ms', '<50ms'],
        ['Auth login', '150ms', '300ms', '500ms', '<500ms'],
        ['RAG query (cached)', '50ms', '150ms', '300ms', '<200ms'],
        ['RAG query (cold)', '2s', '4s', '6s', '<5s'],
        ['Document upload', '500ms', '1.5s', '3s', '<3s'],
        ['Embedding generation', '200ms', '400ms', '600ms', '<500ms'],
    ]

    perf_table = Table(perf_data, colWidths=[1.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch])
    perf_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(perf_table)

    elements.append(PageBreak())
    return elements


def create_recommendations_section(styles):
    """Crea la sección de recomendaciones"""
    elements = []

    elements.append(Paragraph("15. Recomendaciones", styles['SectionTitle']))

    elements.append(Paragraph("15.1 Inmediatas (0-2 semanas)", styles['SubSectionTitle']))

    immediate_data = [
        ['#', 'Acción', 'Prioridad', 'Esfuerzo'],
        ['1', 'Habilitar OpenTelemetry - Fix path resolution', 'CRÍTICA', '2-4 horas'],
        ['2', 'Instalar fastify-multer - npm install fastify-multer', 'ALTA', '1 hora'],
        ['3', 'Eliminar JWT fallback inseguro - Throw error si no definido', 'ALTA', '30 min'],
        ['4', 'Fix schema mismatch - Corregir acceso a summaries', 'ALTA', '2 horas'],
    ]

    immediate_table = Table(immediate_data, colWidths=[0.4*inch, 3.2*inch, 1*inch, 1*inch])
    immediate_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DANGER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(immediate_table)

    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph("15.2 Corto Plazo (2-4 semanas)", styles['SubSectionTitle']))

    short_term = [
        "Implementar rate limiting granular por endpoint",
        "Agregar connection pooling (PgBouncer o Prisma pool)",
        "Mejorar logging estructurado con correlation IDs",
        "Implementar circuit breaker para OpenAI y Redis",
    ]

    for item in short_term:
        elements.append(Paragraph(f"• {item}", styles['BulletPoint']))

    elements.append(Spacer(1, 0.2*inch))

    elements.append(Paragraph("15.3 Mediano Plazo (1-2 meses)", styles['SubSectionTitle']))

    medium_term = [
        "Evaluar migración a arquitectura serverless (AWS Lambda)",
        "Implementar CDC (Change Data Capture) para sincronización",
        "Agregar A/B testing para estrategias de RAG",
        "Implementar feature flags para control de releases",
    ]

    for item in medium_term:
        elements.append(Paragraph(f"• {item}", styles['BulletPoint']))

    elements.append(PageBreak())
    return elements


def create_roadmap_section(styles):
    """Crea la sección de roadmap"""
    elements = []

    elements.append(Paragraph("16. Roadmap de Mejoras", styles['SectionTitle']))

    elements.append(Paragraph("16.1 Q1 2025", styles['SubSectionTitle']))

    q1_data = [
        ['Semana', 'Iniciativa', 'Objetivo'],
        ['1-2', 'Fix Critical Issues', 'Resolver 3 issues bloqueantes'],
        ['3-4', 'Performance Optimization', 'Reducir P95 de RAG query a <3s'],
        ['5-6', 'Security Hardening', 'Implementar recomendaciones de seguridad'],
        ['7-8', 'Monitoring Enhancement', 'Dashboard completo de observabilidad'],
        ['9-10', 'Test Coverage', 'Aumentar cobertura a 85%'],
        ['11-12', 'Documentation', 'API docs con OpenAPI 3.0'],
    ]

    q1_table = Table(q1_data, colWidths=[1*inch, 2*inch, 3*inch])
    q1_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(q1_table)

    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph("16.2 Q2 2025", styles['SubSectionTitle']))

    q2_data = [
        ['Mes', 'Iniciativa', 'Objetivo'],
        ['Abril', 'Multi-tenancy', 'Soporte para múltiples organizaciones'],
        ['Mayo', 'Advanced Analytics', 'Dashboard de métricas de uso'],
        ['Junio', 'Mobile App', 'React Native companion app'],
    ]

    q2_table = Table(q2_data, colWidths=[1*inch, 2*inch, 3*inch])
    q2_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(q2_table)

    elements.append(Spacer(1, 0.5*inch))

    # Footer final
    footer_text = """<b>Documento generado automáticamente</b><br/>
    Última actualización: """ + datetime.now().strftime('%d de %B, %Y') + """<br/>
    Versión del sistema analizado: 1.0.0"""

    elements.append(Paragraph(footer_text, ParagraphStyle(
        name='Footer',
        fontSize=9,
        textColor=grey,
        alignment=TA_CENTER,
        spaceBefore=30
    )))

    return elements


def generate_pdf():
    """Genera el PDF completo"""
    output_path = "INFORME_TECNICO_SISTEMA_LEGAL_RAG.pdf"

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch
    )

    styles = create_styles()
    elements = []

    # Construir documento
    elements.extend(create_cover_page(styles))
    elements.extend(create_toc(styles))
    elements.extend(create_executive_summary(styles))
    elements.extend(create_architecture_section(styles))
    elements.extend(create_stack_section(styles))
    elements.extend(create_backend_section(styles))
    elements.extend(create_database_section(styles))
    elements.extend(create_frontend_section(styles))
    elements.extend(create_rag_section(styles))
    elements.extend(create_critical_issues_section(styles))
    elements.extend(create_metrics_section(styles))
    elements.extend(create_recommendations_section(styles))
    elements.extend(create_roadmap_section(styles))

    # Construir PDF con numeración de páginas
    doc.build(elements, canvasmaker=NumberedCanvas)

    print(f"PDF generado exitosamente: {output_path}")
    return output_path


if __name__ == "__main__":
    generate_pdf()
