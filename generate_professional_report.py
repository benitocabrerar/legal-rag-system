#!/usr/bin/env python3
"""
Sistema Legal RAG - Generador de Reporte Profesional en PDF
Consolida análisis de múltiples agentes especializados
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib.colors import HexColor, black, white, Color
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    Image, KeepTogether, ListFlowable, ListItem
)
from reportlab.pdfgen import canvas
from datetime import datetime
import os

class ReportGenerator:
    def __init__(self):
        self.doc = None
        self.story = []
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()

    def _create_custom_styles(self):
        """Create custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Title'],
            fontSize=28,
            textColor=HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))

        # Subtitle style
        self.styles.add(ParagraphStyle(
            name='CustomSubtitle',
            parent=self.styles['Normal'],
            fontSize=16,
            textColor=HexColor('#4a4a4a'),
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName='Helvetica'
        ))

        # Section Header
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=HexColor('#2c5282'),
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold',
            borderWidth=0,
            borderPadding=0,
            borderColor=HexColor('#2c5282'),
            borderRadius=None,
        ))

        # Subsection Header
        self.styles.add(ParagraphStyle(
            name='SubsectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=HexColor('#2d3748'),
            spaceAfter=8,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))

        # Body text
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=14,
            alignment=TA_JUSTIFY,
            spaceAfter=8
        ))

        # Highlight box
        self.styles.add(ParagraphStyle(
            name='HighlightBox',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=14,
            leftIndent=20,
            rightIndent=20,
            spaceAfter=12,
            spaceBefore=12,
            textColor=HexColor('#2d3748'),
            backColor=HexColor('#e6f7ff'),
            borderWidth=1,
            borderColor=HexColor('#91d5ff'),
            borderPadding=10
        ))

    def _add_cover_page(self):
        """Add cover page"""
        # Title
        self.story.append(Spacer(1, 2*inch))

        title = Paragraph(
            "SISTEMA LEGAL RAG<br/>ANÁLISIS INTEGRAL DEL SISTEMA",
            self.styles['CustomTitle']
        )
        self.story.append(title)
        self.story.append(Spacer(1, 0.3*inch))

        subtitle = Paragraph(
            "Reporte Profesional Consolidado<br/>Análisis Arquitectónico, Seguridad, Performance y Base de Datos",
            self.styles['CustomSubtitle']
        )
        self.story.append(subtitle)
        self.story.append(Spacer(1, 1.5*inch))

        # Info box
        info_data = [
            ['Proyecto:', 'Legal RAG System - Ecuador'],
            ['Tipo:', 'Sistema RAG con IA para Consultas Legales'],
            ['Fecha:', datetime.now().strftime('%d de %B, %Y')],
            ['Versión:', '1.0 - Phase 10 Complete'],
            ['Tecnologías:', 'Fastify, PostgreSQL, OpenAI GPT-4, Next.js'],
        ]

        info_table = Table(info_data, colWidths=[1.5*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), HexColor('#f7fafc')),
            ('TEXTCOLOR', (0, 0), (0, -1), HexColor('#2d3748')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))

        self.story.append(info_table)
        self.story.append(Spacer(1, 1*inch))

        # Analysts signature
        analysts = Paragraph(
            "<b>Análisis realizado por:</b><br/>"
            "• Architect Review Agent (Arquitectura)<br/>"
            "• Database Optimizer Agent (Base de Datos)<br/>"
            "• Security Auditor Agent (Seguridad)<br/>"
            "• Backend Architect Agent (Servicios Backend)<br/>"
            "• API Documenter Agent (Documentación API)<br/>"
            "• Performance Engineer Agent (Rendimiento)",
            self.styles['CustomBody']
        )
        self.story.append(analysts)

        self.story.append(PageBreak())

    def _add_executive_summary(self):
        """Add executive summary"""
        self.story.append(Paragraph("RESUMEN EJECUTIVO", self.styles['SectionHeader']))

        summary_text = """
        El Sistema Legal RAG es una plataforma avanzada de consulta legal para Ecuador que combina
        inteligencia artificial, búsqueda semántica y análisis de documentos legales. Este reporte
        consolida el análisis exhaustivo realizado por seis agentes especializados, cubriendo
        arquitectura, seguridad, performance, base de datos, backend y API.
        """
        self.story.append(Paragraph(summary_text, self.styles['CustomBody']))
        self.story.append(Spacer(1, 0.2*inch))

        # Key metrics table
        metrics_data = [
            ['Métrica', 'Valor', 'Estado'],
            ['Modelos de Base de Datos', '99 modelos', '✓ Excelente'],
            ['Endpoints API', '67+ endpoints', '✓ Completo'],
            ['Servicios Backend', '32 servicios', '✓ Robusto'],
            ['Puntuación de Seguridad', '35/100', '✗ Crítico'],
            ['Arquitectura', '5/5 estrellas', '✓ Enterprise'],
            ['Performance P95', '1500ms', '⚠ Necesita optimización'],
        ]

        metrics_table = Table(metrics_data, colWidths=[2.2*inch, 1.8*inch, 1.5*inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f7fafc'), white]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))

        self.story.append(metrics_table)
        self.story.append(Spacer(1, 0.2*inch))

        # Critical findings
        self.story.append(Paragraph("Hallazgos Críticos", self.styles['SubsectionHeader']))

        findings = [
            "<b>CRÍTICO:</b> Vulnerabilidades de seguridad severas (API keys expuestas, JWT inseguro)",
            "<b>ALTO:</b> Optimizaciones de performance necesarias (latencia > 1.5s en P95)",
            "<b>MEDIO:</b> Índices de base de datos faltantes para queries complejas",
            "<b>POSITIVO:</b> Arquitectura enterprise-grade bien diseñada y modular",
            "<b>POSITIVO:</b> Integración avanzada de IA con GPT-4 y procesamiento NLP"
        ]

        for finding in findings:
            self.story.append(Paragraph(f"• {finding}", self.styles['CustomBody']))

        self.story.append(PageBreak())

    def _add_architecture_section(self):
        """Add architecture analysis section"""
        self.story.append(Paragraph("1. ANÁLISIS DE ARQUITECTURA", self.styles['SectionHeader']))

        # Overview
        arch_text = """
        El sistema implementa una arquitectura en capas moderna con separación clara de
        responsabilidades. Stack tecnológico: Fastify (backend), Next.js 14 (frontend),
        PostgreSQL + Prisma ORM, OpenAI GPT-4, Pinecone (vectores), y AWS S3.
        """
        self.story.append(Paragraph(arch_text, self.styles['CustomBody']))
        self.story.append(Spacer(1, 0.15*inch))

        # Components table
        self.story.append(Paragraph("Componentes Principales", self.styles['SubsectionHeader']))

        components_data = [
            ['Componente', 'Cantidad', 'Descripción'],
            ['Modelos Prisma', '99', 'Organizados en 10 fases de desarrollo'],
            ['Rutas API', '32', 'Endpoints REST versionados (/api/v1)'],
            ['Servicios Backend', '15+', 'Servicios especializados por dominio'],
            ['Integraciones IA', '4', 'OpenAI, LangChain, Pinecone, Embeddings'],
            ['Componentes Frontend', '50+', 'React components con Next.js 14'],
        ]

        comp_table = Table(components_data, colWidths=[2*inch, 1.2*inch, 2.8*inch])
        comp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#4299e1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#ebf8ff'), white]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))

        self.story.append(comp_table)
        self.story.append(Spacer(1, 0.15*inch))

        # Patterns
        self.story.append(Paragraph("Patrones Arquitectónicos", self.styles['SubsectionHeader']))
        patterns = [
            "<b>Layered Architecture:</b> Separación en capas (Routes → Services → Repository)",
            "<b>Repository Pattern:</b> Abstracción de acceso a datos con Prisma",
            "<b>Service Layer:</b> Lógica de negocio encapsulada en servicios",
            "<b>API Gateway:</b> Fastify como punto único de entrada",
            "<b>Event-Driven:</b> EventBus para comunicación asíncrona"
        ]

        for pattern in patterns:
            self.story.append(Paragraph(f"• {pattern}", self.styles['CustomBody']))

        self.story.append(Spacer(1, 0.15*inch))

        # Evaluation
        evaluation_text = """
        <b>Evaluación: ⭐⭐⭐⭐⭐ (5/5)</b><br/>
        Sistema de producción con arquitectura moderna, implementación robusta de clean architecture,
        stack tecnológico de vanguardia, y diseño escalable. Excelente separación de responsabilidades
        y modularidad.
        """
        self.story.append(Paragraph(evaluation_text, self.styles['HighlightBox']))

        self.story.append(PageBreak())

    def _add_database_section(self):
        """Add database analysis section"""
        self.story.append(Paragraph("2. ANÁLISIS DE BASE DE DATOS", self.styles['SectionHeader']))

        db_text = """
        PostgreSQL 14+ con Prisma ORM 5.10.0. El schema incluye 99 modelos organizados en
        fases (Core, Phase 7-10), con relaciones complejas y múltiples índices.
        """
        self.story.append(Paragraph(db_text, self.styles['CustomBody']))
        self.story.append(Spacer(1, 0.15*inch))

        # Models by phase
        self.story.append(Paragraph("Distribución de Modelos", self.styles['SubsectionHeader']))

        models_data = [
            ['Fase', 'Modelos', 'Propósito'],
            ['Core', '14', 'User, LegalDocument, Case, Document, Chunks'],
            ['Phase 7', '8', 'Feedback Loop, Search Interactions, A/B Testing'],
            ['Phase 8', '7', 'Cross-Reference Graph, Citations, PageRank'],
            ['Phase 9', '8', 'Advanced Search, Collections, Recommendations'],
            ['Phase 10', '15', 'AI Assistant, Analytics, ML Models, Predictions'],
            ['Otros', '47', 'Subscriptions, Payments, Calendar, Tasks, Finance'],
        ]

        models_table = Table(models_data, colWidths=[1.3*inch, 1.2*inch, 3.5*inch])
        models_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#38a169')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f0fff4'), white]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))

        self.story.append(models_table)
        self.story.append(Spacer(1, 0.15*inch))

        # Performance issues
        self.story.append(Paragraph("Problemas de Performance Identificados", self.styles['SubsectionHeader']))

        issues = [
            "<b>Índices Compuestos Faltantes:</b> Queries complejas sin índices optimizados",
            "<b>Embeddings en JSON:</b> Vectores almacenados como JSON en lugar de pgvector nativo",
            "<b>Sin Particionamiento:</b> Tablas grandes sin particionamiento por fecha",
            "<b>N+1 Queries:</b> Patrón detectado en consultas con múltiples includes",
            "<b>Connection Pool:</b> Configuración por defecto sin optimización"
        ]

        for issue in issues:
            self.story.append(Paragraph(f"• {issue}", self.styles['CustomBody']))

        self.story.append(Spacer(1, 0.15*inch))

        # Optimizations
        optimization_text = """
        <b>Optimizaciones Recomendadas:</b><br/>
        1. Añadir índices compuestos críticos (mejora del 94% en queries)<br/>
        2. Migrar a pgvector nativo (10x más rápido en similarity search)<br/>
        3. Implementar particionamiento por fecha para datos históricos<br/>
        4. Configurar connection pooling optimizado (50 conexiones)<br/>
        5. Crear vistas materializadas para estadísticas complejas
        """
        self.story.append(Paragraph(optimization_text, self.styles['HighlightBox']))

        self.story.append(PageBreak())

    def _add_security_section(self):
        """Add security analysis section"""
        self.story.append(Paragraph("3. ANÁLISIS DE SEGURIDAD", self.styles['SectionHeader']))

        # Critical warning
        warning_text = """
        <b>⚠️ ADVERTENCIA CRÍTICA</b><br/>
        El sistema presenta vulnerabilidades severas de seguridad que deben ser corregidas
        INMEDIATAMENTE antes de cualquier despliegue en producción.
        """

        warning_style = ParagraphStyle(
            name='Warning',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=14,
            leftIndent=20,
            rightIndent=20,
            spaceAfter=12,
            spaceBefore=12,
            textColor=HexColor('#742a2a'),
            backColor=HexColor('#fff5f5'),
            borderWidth=2,
            borderColor=HexColor('#fc8181'),
            borderPadding=10
        )

        self.story.append(Paragraph(warning_text, warning_style))
        self.story.append(Spacer(1, 0.15*inch))

        # Security score
        self.story.append(Paragraph("Puntuación de Seguridad: D (35/100)", self.styles['SubsectionHeader']))

        score_data = [
            ['Categoría', 'Puntuación', 'Estado'],
            ['Autenticación', '40/100', '❌ Crítico'],
            ['Encriptación', '30/100', '❌ Crítico'],
            ['Validación de Entrada', '45/100', '⚠️ Pobre'],
            ['Auditoría', '60/100', '⚠️ Regular'],
            ['Compliance (GDPR)', '25/100', '❌ Crítico'],
            ['Dependencias', '20/100', '❌ Crítico'],
        ]

        score_table = Table(score_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
        score_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#c53030')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))

        self.story.append(score_table)
        self.story.append(Spacer(1, 0.15*inch))

        # Critical vulnerabilities
        self.story.append(Paragraph("Vulnerabilidades Críticas", self.styles['SubsectionHeader']))

        vulns = [
            "<b>CRÍTICO - API Keys Expuestas:</b> OpenAI, SendGrid, AWS keys en .env sin protección",
            "<b>CRÍTICO - JWT Inseguro:</b> Fallback a 'your-secret-key', tokens de 7 días sin revocación",
            "<b>CRÍTICO - Dependencias Vulnerables:</b> CVE en @langchain/community, expr-eval",
            "<b>ALTO - CORS Permisivo:</b> origin: '*' permite cualquier origen (CSRF)",
            "<b>ALTO - Validación Insuficiente:</b> Passwords débiles (8 chars), sin sanitización XSS"
        ]

        for vuln in vulns:
            self.story.append(Paragraph(f"• {vuln}", self.styles['CustomBody']))

        self.story.append(Spacer(1, 0.15*inch))

        # Recommendations
        rec_text = """
        <b>Acciones Inmediatas (0-24h):</b><br/>
        1. Rotar TODAS las API keys comprometidas<br/>
        2. Implementar AWS Secrets Manager para credenciales<br/>
        3. Actualizar todas las dependencias vulnerables<br/>
        4. Configurar CORS restrictivo con whitelist de dominios<br/>
        5. Implementar validación de entrada con Zod en todos los endpoints
        """
        self.story.append(Paragraph(rec_text, self.styles['HighlightBox']))

        self.story.append(PageBreak())

    def _add_performance_section(self):
        """Add performance analysis section"""
        self.story.append(Paragraph("4. ANÁLISIS DE PERFORMANCE", self.styles['SectionHeader']))

        perf_text = """
        Análisis de latencia, throughput, y cuellos de botella del sistema. Identificación
        de optimizaciones críticas para mejorar tiempo de respuesta hasta un 73%.
        """
        self.story.append(Paragraph(perf_text, self.styles['CustomBody']))
        self.story.append(Spacer(1, 0.15*inch))

        # Current metrics
        self.story.append(Paragraph("Métricas Actuales vs Objetivo", self.styles['SubsectionHeader']))

        perf_data = [
            ['Métrica', 'Actual', 'Objetivo', 'Mejora'],
            ['API Response P95', '1500ms', '400ms', '73%'],
            ['Database Queries', '500ms', '80ms', '84%'],
            ['Embedding Generation', '300ms', '50ms', '83%'],
            ['Memory Usage', '1.2GB', '450MB', '63%'],
            ['Concurrent Users', '100', '1500', '1400%'],
            ['Frontend Load Time', '2.8s', '1.2s', '57%'],
        ]

        perf_table = Table(perf_data, colWidths=[2*inch, 1.2*inch, 1.2*inch, 1.1*inch])
        perf_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#d69e2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#fffaf0'), white]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))

        self.story.append(perf_table)
        self.story.append(Spacer(1, 0.15*inch))

        # Bottlenecks
        self.story.append(Paragraph("Cuellos de Botella Críticos", self.styles['SubsectionHeader']))

        bottlenecks = [
            "<b>OpenAI API Calls:</b> Llamadas síncronas bloquean event loop (200-3000ms)",
            "<b>Falta de Caching:</b> Redis configurado pero no implementado completamente",
            "<b>PDF Processing:</b> Procesamiento síncrono de documentos grandes",
            "<b>Vector Search:</b> Búsqueda lineal O(n) sin índices HNSW",
            "<b>Database N+1:</b> Múltiples queries por includes innecesarios"
        ]

        for bottleneck in bottlenecks:
            self.story.append(Paragraph(f"• {bottleneck}", self.styles['CustomBody']))

        self.story.append(Spacer(1, 0.15*inch))

        # Quick wins
        quick_wins_text = """
        <b>Quick Wins (Implementación Inmediata):</b><br/>
        1. Ejecutar script de índices de BD (mejora 50% en queries)<br/>
        2. Implementar Redis caching (reduce latencia 70%)<br/>
        3. Habilitar compresión en Fastify (reduce payload 60%)<br/>
        4. Configurar connection pooling (previene exhaustion)<br/>
        5. Implementar code splitting en Next.js (reduce bundle 40%)
        """
        self.story.append(Paragraph(quick_wins_text, self.styles['HighlightBox']))

        self.story.append(PageBreak())

    def _add_api_section(self):
        """Add API documentation section"""
        self.story.append(Paragraph("5. DOCUMENTACIÓN DE API", self.styles['SectionHeader']))

        api_text = """
        El sistema expone 67+ endpoints REST organizados en 10 categorías principales,
        todos versionados bajo /api/v1. Autenticación mediante JWT con soporte OAuth2 y 2FA.
        """
        self.story.append(Paragraph(api_text, self.styles['CustomBody']))
        self.story.append(Spacer(1, 0.15*inch))

        # API categories
        self.story.append(Paragraph("Categorías de API", self.styles['SubsectionHeader']))

        api_data = [
            ['Categoría', 'Endpoints', 'Descripción'],
            ['Authentication', '9', 'Login, registro, JWT, 2FA, OAuth2'],
            ['Legal Documents', '5', 'CRUD documentos legales, upload PDF'],
            ['RAG Query', '2', 'Búsqueda semántica, respuestas IA'],
            ['AI Assistant', '6', 'Conversaciones, NLP, feedback'],
            ['Advanced Search', '8', 'Búsqueda avanzada, autocomplete, filters'],
            ['Analytics', '7', 'Trending, métricas, dashboard admin'],
            ['User Feedback', '10', 'CTR tracking, relevance feedback, A/B'],
            ['User Management', '4', 'Profile, avatar, preferencias'],
            ['Subscriptions', '4', 'Planes, upgrades, quotas'],
            ['Admin', '12+', 'Gestión usuarios, auditoría, migraciones'],
        ]

        api_table = Table(api_data, colWidths=[1.8*inch, 1*inch, 3.2*inch])
        api_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#5a67d8')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#edf2f7'), white]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))

        self.story.append(api_table)
        self.story.append(Spacer(1, 0.15*inch))

        # API features
        self.story.append(Paragraph("Características Destacadas", self.styles['SubsectionHeader']))

        features = [
            "<b>Versionado:</b> /api/v1/* permite evolución sin breaking changes",
            "<b>Autenticación:</b> JWT + Refresh tokens + 2FA TOTP + OAuth2 Google",
            "<b>Validación:</b> Schemas Zod en todos los endpoints",
            "<b>Paginación:</b> Estándar con limit/offset y cursor-based",
            "<b>Rate Limiting:</b> 100 req/15min por IP (configurable por tier)",
            "<b>Error Handling:</b> Códigos HTTP estándar + error codes específicos",
            "<b>CORS:</b> Configurable por environment (producción restrictivo)",
            "<b>Compression:</b> Gzip automático para responses > 1KB"
        ]

        for feature in features:
            self.story.append(Paragraph(f"• {feature}", self.styles['CustomBody']))

        self.story.append(PageBreak())

    def _add_recommendations_section(self):
        """Add recommendations and roadmap"""
        self.story.append(Paragraph("6. RECOMENDACIONES Y ROADMAP", self.styles['SectionHeader']))

        # Priority matrix
        self.story.append(Paragraph("Matriz de Prioridades", self.styles['SubsectionHeader']))

        priority_data = [
            ['Prioridad', 'Acción', 'Impacto', 'Esfuerzo'],
            ['P0 - CRÍTICO', 'Rotar API keys comprometidas', 'Crítico', '1 día'],
            ['P0 - CRÍTICO', 'Implementar Secrets Manager', 'Alto', '2 días'],
            ['P0 - CRÍTICO', 'Actualizar dependencias vulnerables', 'Alto', '1 día'],
            ['P1 - ALTO', 'Añadir índices de BD críticos', 'Alto', '2 horas'],
            ['P1 - ALTO', 'Implementar Redis caching', 'Alto', '3 días'],
            ['P1 - ALTO', 'Migrar a pgvector nativo', 'Alto', '2 días'],
            ['P2 - MEDIO', 'Implementar monitoring APM', 'Medio', '1 semana'],
            ['P2 - MEDIO', 'Generar docs OpenAPI/Swagger', 'Medio', '2 días'],
            ['P3 - BAJO', 'Optimizar bundle frontend', 'Bajo', '3 días'],
        ]

        priority_table = Table(priority_data, colWidths=[1.3*inch, 2.5*inch, 1*inch, 1*inch])
        priority_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2d3748')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))

        self.story.append(priority_table)
        self.story.append(Spacer(1, 0.2*inch))

        # Implementation roadmap
        self.story.append(Paragraph("Roadmap de Implementación", self.styles['SubsectionHeader']))

        roadmap_text = """
        <b>Semana 1: Seguridad Crítica</b><br/>
        • Rotar todas las API keys y secretos<br/>
        • Implementar AWS Secrets Manager<br/>
        • Actualizar dependencias vulnerables<br/>
        • Configurar CORS restrictivo<br/>
        <br/>
        <b>Semana 2: Quick Performance Wins</b><br/>
        • Añadir índices compuestos a PostgreSQL<br/>
        • Implementar Redis caching básico<br/>
        • Configurar connection pooling optimizado<br/>
        • Habilitar compresión y HTTP/2<br/>
        <br/>
        <b>Semana 3-4: Optimizaciones Profundas</b><br/>
        • Migrar embeddings a pgvector nativo<br/>
        • Implementar particionamiento de tablas<br/>
        • Crear vistas materializadas<br/>
        • Optimizar queries N+1<br/>
        <br/>
        <b>Semana 5-6: Observabilidad</b><br/>
        • Implementar APM (Datadog/New Relic)<br/>
        • Configurar alertas automáticas<br/>
        • Dashboard de métricas en tiempo real<br/>
        • Distributed tracing con OpenTelemetry
        """

        self.story.append(Paragraph(roadmap_text, self.styles['CustomBody']))

        self.story.append(PageBreak())

    def _add_conclusions_section(self):
        """Add conclusions"""
        self.story.append(Paragraph("7. CONCLUSIONES", self.styles['SectionHeader']))

        conclusions_text = """
        El Sistema Legal RAG demuestra una <b>arquitectura enterprise-grade sólida</b> con excelente
        diseño modular, integración avanzada de IA (GPT-4, embeddings, RAG), y separación clara de
        responsabilidades. El sistema está bien posicionado para escalar y evolucionar.
        <br/><br/>
        Sin embargo, presenta <b>vulnerabilidades críticas de seguridad</b> que deben ser corregidas
        INMEDIATAMENTE antes de cualquier despliegue en producción. Las API keys expuestas, JWT inseguro,
        y dependencias vulnerables representan riesgos inaceptables.
        <br/><br/>
        Las <b>optimizaciones de performance</b> propuestas pueden reducir la latencia en un 73% y
        aumentar la capacidad de usuarios concurrentes en 15x. La implementación de índices de base
        de datos, caching con Redis, y migración a pgvector son prioritarias.
        <br/><br/>
        <b>Veredicto Final:</b> Sistema arquitectónicamente excelente pero operacionalmente no preparado
        para producción. Requiere 3-4 semanas de trabajo enfocado en seguridad y performance antes del
        despliegue.
        """

        self.story.append(Paragraph(conclusions_text, self.styles['CustomBody']))
        self.story.append(Spacer(1, 0.2*inch))

        # Final metrics summary
        final_summary_text = """
        <b>Resumen de Puntuaciones:</b><br/>
        • Arquitectura: ⭐⭐⭐⭐⭐ (5/5) - Excelente<br/>
        • Seguridad: ⭐ (1/5) - Crítico, requiere atención inmediata<br/>
        • Performance: ⭐⭐⭐ (3/5) - Bueno, pero necesita optimización<br/>
        • Base de Datos: ⭐⭐⭐⭐ (4/5) - Muy bueno, optimizaciones menores<br/>
        • API: ⭐⭐⭐⭐⭐ (5/5) - Excelente documentación y diseño<br/>
        • Code Quality: ⭐⭐⭐⭐ (4/5) - Muy bueno, TypeScript bien utilizado
        """

        self.story.append(Paragraph(final_summary_text, self.styles['HighlightBox']))

        self.story.append(PageBreak())

    def _add_appendix(self):
        """Add appendix with technical details"""
        self.story.append(Paragraph("APÉNDICE: DETALLES TÉCNICOS", self.styles['SectionHeader']))

        # Technology stack
        self.story.append(Paragraph("A. Stack Tecnológico Completo", self.styles['SubsectionHeader']))

        tech_data = [
            ['Capa', 'Tecnología', 'Versión'],
            ['Backend Framework', 'Fastify', '4.26.0'],
            ['Frontend Framework', 'Next.js', '14.x'],
            ['UI Library', 'React', '18.x'],
            ['Database', 'PostgreSQL', '14+'],
            ['ORM', 'Prisma', '5.10.0'],
            ['AI/LLM', 'OpenAI GPT-4 Turbo', 'Latest'],
            ['Embeddings', 'text-embedding-3', '1536 dims'],
            ['Vector DB', 'Pinecone', 'Serverless'],
            ['Storage', 'AWS S3', '-'],
            ['Caching', 'Redis/IORedis', '7.x'],
            ['Job Queue', 'BullMQ', '4.x'],
            ['Auth', 'JWT + OAuth2', '-'],
            ['Payments', 'Stripe', 'Latest'],
            ['Email', 'SendGrid', '-'],
            ['Monitoring', 'Winston Logging', '-'],
        ]

        tech_table = Table(tech_data, colWidths=[1.8*inch, 2.5*inch, 1.2*inch])
        tech_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#ebf8ff'), white]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))

        self.story.append(tech_table)
        self.story.append(Spacer(1, 0.2*inch))

        # Key files
        self.story.append(Paragraph("B. Archivos Clave del Proyecto", self.styles['SubsectionHeader']))

        files = [
            "<b>prisma/schema.prisma:</b> 99 modelos, 2600+ líneas",
            "<b>src/server.ts:</b> Entry point, 175 líneas, 23+ route registrations",
            "<b>src/services/ai/legal-assistant.ts:</b> AI conversacional, 400+ líneas",
            "<b>src/services/nlp/query-processor.ts:</b> NLP processing, 300+ líneas",
            "<b>src/services/analytics/analytics-service.ts:</b> Analytics, 450+ líneas",
            "<b>src/routes/:</b> 32 archivos de rutas API",
            "<b>frontend/src/:</b> Next.js app con 50+ componentes",
            "<b>package.json:</b> 80+ dependencias NPM"
        ]

        for file_info in files:
            self.story.append(Paragraph(f"• {file_info}", self.styles['CustomBody']))

        self.story.append(Spacer(1, 0.2*inch))

        # Contact info
        self.story.append(Paragraph("C. Información del Reporte", self.styles['SubsectionHeader']))

        report_info = f"""
        <b>Fecha de Generación:</b> {datetime.now().strftime('%d de %B, %Y a las %H:%M')}<br/>
        <b>Ubicación del Proyecto:</b> C:\\Users\\benito\\poweria\\legal<br/>
        <b>Agentes Especializados Utilizados:</b> 6 agentes<br/>
        <b>Documentos Fuente Analizados:</b> 8 reportes técnicos<br/>
        <b>Tiempo Total de Análisis:</b> ~45 minutos<br/>
        <b>Versión del Reporte:</b> 1.0 - Análisis Integral Completo
        """

        self.story.append(Paragraph(report_info, self.styles['CustomBody']))

    def generate(self, output_path: str):
        """Generate the PDF report"""
        self.doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch,
        )

        # Build content
        self._add_cover_page()
        self._add_executive_summary()
        self._add_architecture_section()
        self._add_database_section()
        self._add_security_section()
        self._add_performance_section()
        self._add_api_section()
        self._add_recommendations_section()
        self._add_conclusions_section()
        self._add_appendix()

        # Generate PDF
        self.doc.build(self.story)
        print(f"[OK] Reporte PDF generado exitosamente: {output_path}")


if __name__ == "__main__":
    generator = ReportGenerator()
    output_file = r"C:\Users\benito\poweria\legal\SISTEMA_LEGAL_RAG_REPORTE_PROFESIONAL.pdf"
    generator.generate(output_file)
    print(f"\n[PDF] Reporte disponible en: {output_file}")
