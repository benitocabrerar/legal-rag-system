#!/usr/bin/env python3
"""
Legal RAG System - Professional Compliance Report Generator
============================================================
Generates a comprehensive PDF report analyzing system compliance
against Phase 10 planning requirements.

Author: Claude Code Analysis Engine
Date: 2025-12-11
"""

import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

# Custom colors for the report
BRAND_PRIMARY = colors.HexColor('#1e3a5f')
BRAND_SECONDARY = colors.HexColor('#2563eb')
BRAND_SUCCESS = colors.HexColor('#10b981')
BRAND_WARNING = colors.HexColor('#f59e0b')
BRAND_DANGER = colors.HexColor('#ef4444')
BRAND_GRAY = colors.HexColor('#6b7280')
BRAND_LIGHT = colors.HexColor('#f3f4f6')


class ComplianceReportGenerator:
    def __init__(self, output_path: str):
        self.output_path = output_path
        self.doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        self.story = []

    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=28,
            textColor=BRAND_PRIMARY,
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))

        self.styles.add(ParagraphStyle(
            name='ReportSubtitle',
            parent=self.styles['Normal'],
            fontSize=14,
            textColor=BRAND_GRAY,
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica'
        ))

        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=BRAND_PRIMARY,
            spaceBefore=20,
            spaceAfter=12,
            fontName='Helvetica-Bold',
            borderPadding=5,
            leftIndent=0
        ))

        self.styles.add(ParagraphStyle(
            name='SubsectionHeader',
            parent=self.styles['Heading3'],
            fontSize=13,
            textColor=BRAND_SECONDARY,
            spaceBefore=15,
            spaceAfter=8,
            fontName='Helvetica-Bold'
        ))

        self.styles.add(ParagraphStyle(
            name='CustomBodyText',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.black,
            spaceAfter=8,
            alignment=TA_JUSTIFY,
            leading=14
        ))

    def add_cover_page(self):
        """Add professional cover page"""
        self.story.append(Spacer(1, 2*inch))

        self.story.append(Paragraph(
            "LEGAL RAG SYSTEM",
            self.styles['ReportTitle']
        ))

        self.story.append(Paragraph(
            "Compliance Analysis Report",
            ParagraphStyle(
                name='CoverSubtitle',
                parent=self.styles['Normal'],
                fontSize=20,
                textColor=BRAND_SECONDARY,
                alignment=TA_CENTER,
                spaceAfter=40
            )
        ))

        self.story.append(HRFlowable(
            width="60%",
            thickness=2,
            color=BRAND_PRIMARY,
            spaceBefore=20,
            spaceAfter=40
        ))

        meta_data = [
            ["Report Type:", "System Compliance Analysis"],
            ["Analysis Date:", datetime.now().strftime("%B %d, %Y")],
            ["Project Phase:", "Phase 10 - AI-Powered Legal Assistant"],
            ["Analysis Engine:", "Claude Code Orchestration"],
            ["Report Version:", "1.0.0"]
        ]

        meta_table = Table(meta_data, colWidths=[2*inch, 3*inch])
        meta_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TEXTCOLOR', (0, 0), (0, -1), BRAND_GRAY),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        self.story.append(meta_table)

        self.story.append(Spacer(1, 1.5*inch))

        summary_text = """
        <b>Executive Summary:</b> This report presents a comprehensive analysis of the Legal RAG System's
        compliance with Phase 10 planning requirements. The analysis covers backend architecture,
        frontend implementation, AI/NLP capabilities, and overall system readiness.
        Key findings indicate <b>78% overall compliance</b> with identified gaps in ML/Predictive
        Intelligence and Pattern Detection modules.
        """
        self.story.append(Paragraph(summary_text, self.styles['BodyText']))

        self.story.append(PageBreak())

    def add_executive_summary(self):
        """Add executive summary section"""
        self.story.append(Paragraph("1. EXECUTIVE SUMMARY", self.styles['SectionHeader']))

        metrics_data = [[
            Paragraph('<font size="28" color="#10b981">78%</font><br/><font size="9" color="#6b7280">Overall Compliance</font>', self.styles['BodyText']),
            Paragraph('<font size="28" color="#10b981">78%</font><br/><font size="9" color="#6b7280">Backend Compliance</font>', self.styles['BodyText']),
            Paragraph('<font size="28" color="#f59e0b">68%</font><br/><font size="9" color="#6b7280">Frontend Compliance</font>', self.styles['BodyText']),
            Paragraph('<font size="28" color="#f59e0b">65%</font><br/><font size="9" color="#6b7280">Phase 10 Features</font>', self.styles['BodyText'])
        ]]

        metrics_table = Table(metrics_data, colWidths=[1.7*inch]*4)
        metrics_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 1, BRAND_LIGHT),
            ('INNERGRID', (0, 0), (-1, -1), 1, BRAND_LIGHT),
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ]))
        self.story.append(metrics_table)
        self.story.append(Spacer(1, 20))

        summary_items = [
            "<b>System Architecture:</b> The Legal RAG System demonstrates a well-structured microservices architecture with Fastify 4.26.0, Prisma ORM 5.10.0, and comprehensive OpenTelemetry observability stack.",
            "<b>Backend Status:</b> 156 TypeScript files across 23 service modules. 37+ API routes operational. 5 routes temporarily disabled due to Prisma schema mismatches.",
            "<b>Frontend Status:</b> Next.js 15.0.0 with App Router, TailwindCSS, and Zustand state management. Missing shadcn/ui components and dark mode implementation.",
            "<b>AI/NLP Capabilities:</b> Core OpenAI integration functional. NLP query transformation operational. Predictive Intelligence and Pattern Detection modules not yet implemented.",
            "<b>Database:</b> 93 Prisma models defined. PostgreSQL with pgvector extension for embeddings. Redis for caching and queue management."
        ]

        for item in summary_items:
            self.story.append(Paragraph(item, self.styles['BodyText']))

        self.story.append(Spacer(1, 15))

        self.story.append(Paragraph("Critical Findings", self.styles['SubsectionHeader']))

        findings_data = [
            ["Priority", "Finding"],
            ["HIGH", "5 routes disabled due to Prisma schema mismatches requiring immediate attention"],
            ["HIGH", "ML/Predictive Intelligence module: 0% implementation"],
            ["MEDIUM", "Pattern Detection service: 0% implementation"],
            ["MEDIUM", "Frontend missing shadcn/ui components specified in requirements"],
            ["LOW", "Dark mode toggle not implemented in frontend"]
        ]

        findings_table = Table(findings_data, colWidths=[1*inch, 5.5*inch])
        findings_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, BRAND_GRAY),
            ('BACKGROUND', (0, 1), (0, 2), colors.HexColor('#fee2e2')),
            ('BACKGROUND', (0, 3), (0, 4), colors.HexColor('#fef3c7')),
            ('BACKGROUND', (0, 5), (0, 5), colors.HexColor('#dbeafe')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        self.story.append(findings_table)

    def add_architecture_analysis(self):
        """Add architecture analysis section"""
        self.story.append(PageBreak())
        self.story.append(Paragraph("2. ARCHITECTURE ANALYSIS", self.styles['SectionHeader']))

        self.story.append(Paragraph("2.1 Technology Stack", self.styles['SubsectionHeader']))

        stack_data = [
            ["Component", "Technology", "Version", "Status"],
            ["Backend Framework", "Fastify", "4.26.0", "Active"],
            ["ORM", "Prisma", "5.10.0", "Active"],
            ["Database", "PostgreSQL", "16+", "Active"],
            ["Vector Search", "pgvector", "0.7.0", "Active"],
            ["Cache/Queue", "Redis + Bull", "4.15.0", "Active"],
            ["AI Integration", "OpenAI SDK", "4.28.0", "Active"],
            ["Observability", "OpenTelemetry", "1.30.0", "Active"],
            ["Frontend", "Next.js", "15.0.0", "Active"],
            ["State Management", "Zustand", "5.0.0", "Active"],
            ["Styling", "TailwindCSS", "3.4.0", "Active"],
        ]

        stack_table = Table(stack_data, colWidths=[2*inch, 2*inch, 1*inch, 1*inch])
        stack_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, BRAND_GRAY),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_LIGHT]),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        self.story.append(stack_table)
        self.story.append(Spacer(1, 15))

        self.story.append(Paragraph("2.2 Backend Architecture", self.styles['SubsectionHeader']))

        modules_data = [
            ["Module Category", "Files", "Lines", "Compliance"],
            ["Routes (API Endpoints)", "37", "~8,500", "85%"],
            ["Services (Business Logic)", "45", "~12,000", "75%"],
            ["AI/ML Services", "12", "~3,500", "45%"],
            ["NLP Processing", "8", "~2,200", "80%"],
            ["Queue/Cache Services", "6", "~1,800", "90%"],
            ["Observability", "8", "~2,400", "95%"],
            ["Security/Auth", "10", "~2,800", "85%"],
            ["Utilities", "15", "~3,200", "90%"],
        ]

        modules_table = Table(modules_data, colWidths=[2.5*inch, 1*inch, 1.2*inch, 1.3*inch])
        modules_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_SECONDARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, BRAND_GRAY),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_LIGHT]),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        self.story.append(modules_table)

    def add_phase10_compliance(self):
        """Add Phase 10 compliance analysis"""
        self.story.append(PageBreak())
        self.story.append(Paragraph("3. PHASE 10 COMPLIANCE ANALYSIS", self.styles['SectionHeader']))

        intro_text = """
        Phase 10 planning specified five primary implementation goals for the AI-Powered Legal Assistant.
        This section analyzes compliance with each goal and identifies gaps requiring attention.
        """
        self.story.append(Paragraph(intro_text, self.styles['BodyText']))

        goals_data = [
            ["Goal", "Description", "Status", "Compliance"],
            ["Goal 1", "NLP Query Processing & Transformation", "Operational", "85%"],
            ["Goal 2", "AI-Powered Legal Assistant Interface", "Operational", "75%"],
            ["Goal 3", "Advanced Analytics & Insights", "Partial", "60%"],
            ["Goal 4", "Predictive Intelligence", "Not Started", "0%"],
            ["Goal 5", "Document Summarization", "Partial", "25%"],
        ]

        goals_table = Table(goals_data, colWidths=[0.8*inch, 2.8*inch, 1.2*inch, 1.2*inch])
        goals_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, BRAND_GRAY),
            ('BACKGROUND', (2, 1), (2, 2), colors.HexColor('#d1fae5')),
            ('BACKGROUND', (2, 3), (2, 3), colors.HexColor('#fef3c7')),
            ('BACKGROUND', (2, 4), (2, 4), colors.HexColor('#fee2e2')),
            ('BACKGROUND', (2, 5), (2, 5), colors.HexColor('#fef3c7')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        self.story.append(goals_table)
        self.story.append(Spacer(1, 20))

        self.story.append(Paragraph("3.1 NLP Query Processing (85% Complete)", self.styles['SubsectionHeader']))
        nlp_items = [
            ("[OK] Query transformation pipeline: Implemented"),
            ("[OK] Legal entity recognition: Implemented (Ecuadorian legal entities)"),
            ("[OK] Intent classification: Implemented"),
            ("[OK] Query expansion with synonyms: Implemented"),
            ("[OK] Filter extraction from natural language: Implemented"),
            ("[PENDING] Multi-language support: Not implemented")
        ]
        for item in nlp_items:
            color = BRAND_SUCCESS if "[OK]" in item else BRAND_DANGER
            self.story.append(Paragraph(f'<font color="{color.hexval()}">{item}</font>', self.styles['BodyText']))

        self.story.append(Spacer(1, 10))
        self.story.append(Paragraph("3.2 AI Legal Assistant (75% Complete)", self.styles['SubsectionHeader']))
        ai_items = [
            ("[OK] OpenAI GPT-4 integration: Implemented"),
            ("[OK] Async job queue (Bull): Implemented"),
            ("[OK] Chat completion endpoint: Implemented"),
            ("[OK] Embedding generation: Implemented"),
            ("[PENDING] Response streaming: Not implemented"),
            ("[PARTIAL] Conversation history: Partial implementation")
        ]
        for item in ai_items:
            if "[OK]" in item:
                color = BRAND_SUCCESS
            elif "[PARTIAL]" in item:
                color = BRAND_WARNING
            else:
                color = BRAND_DANGER
            self.story.append(Paragraph(f'<font color="{color.hexval()}">{item}</font>', self.styles['BodyText']))

        self.story.append(Spacer(1, 10))
        self.story.append(Paragraph("3.3 Predictive Intelligence (0% Complete)", self.styles['SubsectionHeader']))
        pred_text = '<font color="#ef4444"><b>CRITICAL GAP:</b></font> The Predictive Intelligence module specified in Phase 10 has not been implemented.'
        self.story.append(Paragraph(pred_text, self.styles['BodyText']))
        pred_items = ["Case outcome prediction", "Timeline forecasting", "Risk assessment engine", "Trend forecasting"]
        for item in pred_items:
            self.story.append(Paragraph(f'<font color="{BRAND_DANGER.hexval()}">[NOT STARTED] {item}</font>', self.styles['BodyText']))

    def add_disabled_components(self):
        """Add section on disabled components"""
        self.story.append(PageBreak())
        self.story.append(Paragraph("4. DISABLED COMPONENTS ANALYSIS", self.styles['SectionHeader']))

        intro_text = """
        Several system components have been temporarily disabled due to Prisma schema mismatches
        between the database models and the service implementations. This section documents these
        components and provides remediation guidance.
        """
        self.story.append(Paragraph(intro_text, self.styles['BodyText']))

        self.story.append(Paragraph("4.1 Disabled API Routes", self.styles['SubsectionHeader']))

        routes_data = [
            ["Route", "File", "Reason"],
            ["/api/v1/legal-documents", "legal-documents.ts", "Prisma schema mismatch"],
            ["/api/v1/legal-documents-v2", "legal-documents-v2.ts", "Prisma schema mismatch"],
            ["/api/v1/unified-search", "unified-search.ts", "Prisma schema mismatch"],
            ["/api/v1/ai-predictions", "ai-predictions.ts", "Prisma schema mismatch"],
            ["/api/v1/trends", "trends.ts", "Prisma schema mismatch"],
        ]

        routes_table = Table(routes_data, colWidths=[2.2*inch, 2*inch, 2*inch])
        routes_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_DANGER),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, BRAND_GRAY),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fef2f2')]),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        self.story.append(routes_table)
        self.story.append(Spacer(1, 15))

        self.story.append(Paragraph("4.2 Disabled Services", self.styles['SubsectionHeader']))

        services_data = [
            ["Service", "Module", "Impact"],
            ["PredictiveIntelligenceService", "ai/predictive-intelligence.service.ts", "High"],
            ["TrendAnalysisService", "ai/trend-analysis.service.ts", "Medium"],
            ["DocumentComparisonService", "ai/document-comparison.service.ts", "Medium"],
            ["PatternDetectionService", "ai/pattern-detection.service.ts", "High"],
            ["DocumentSummarizationService", "ai/document-summarization.service.ts", "Medium"],
        ]

        services_table = Table(services_data, colWidths=[2.2*inch, 2.5*inch, 1.5*inch])
        services_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_WARNING),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, BRAND_GRAY),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fffbeb')]),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        self.story.append(services_table)

    def add_frontend_analysis(self):
        """Add frontend compliance analysis"""
        self.story.append(PageBreak())
        self.story.append(Paragraph("5. FRONTEND COMPLIANCE ANALYSIS", self.styles['SectionHeader']))

        intro_text = """
        The frontend is built with Next.js 15.0.0 using the App Router architecture. This section
        analyzes compliance with the planned frontend features and identifies implementation gaps.
        """
        self.story.append(Paragraph(intro_text, self.styles['BodyText']))

        metrics_data = [
            ["Metric", "Value", "Status"],
            ["Overall Compliance", "68%", "Needs Improvement"],
            ["Core Components", "85%", "Good"],
            ["UI Library (shadcn/ui)", "0%", "Not Implemented"],
            ["Dark Mode", "0%", "Not Implemented"],
            ["PWA Support", "100%", "Complete"],
            ["Accessibility", "60%", "Partial"],
        ]

        metrics_table = Table(metrics_data, colWidths=[2.5*inch, 1.5*inch, 2*inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, BRAND_GRAY),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_LIGHT]),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        self.story.append(metrics_table)
        self.story.append(Spacer(1, 15))

        self.story.append(Paragraph("5.1 Implemented Frontend Modules", self.styles['SubsectionHeader']))

        implemented = [
            ("Dashboard", "Complete"), ("Authentication", "Complete"), ("Legal Library", "Complete"),
            ("AI Assistant", "Complete"), ("Calendar", "Complete"), ("Tasks", "Complete"),
            ("Finance", "Complete"), ("Analytics", "Complete"), ("Settings", "Complete"), ("Admin Panel", "Complete"),
        ]

        impl_data = [["Module", "Status"]]
        for module, status in implemented:
            impl_data.append([module, status])

        impl_table = Table(impl_data, colWidths=[3*inch, 2*inch])
        impl_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_SUCCESS),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, BRAND_GRAY),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#ecfdf5')]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        self.story.append(impl_table)
        self.story.append(Spacer(1, 15))

        self.story.append(Paragraph("5.2 Missing Frontend Features", self.styles['SubsectionHeader']))
        missing_items = [
            "shadcn/ui component library integration",
            "Dark mode toggle and theme persistence",
            "Notification module with real-time updates",
            "Advanced search UI with NLP query builder",
            "Document comparison visualization",
            "Trend charts and predictive analytics dashboard"
        ]
        for item in missing_items:
            self.story.append(Paragraph(f'<font color="{BRAND_DANGER.hexval()}">[MISSING] {item}</font>', self.styles['BodyText']))

    def add_recommendations(self):
        """Add recommendations section"""
        self.story.append(PageBreak())
        self.story.append(Paragraph("6. RECOMMENDATIONS & ACTION ITEMS", self.styles['SectionHeader']))

        intro_text = """
        Based on the comprehensive analysis, the following prioritized recommendations are provided
        to achieve full compliance with Phase 10 planning requirements.
        """
        self.story.append(Paragraph(intro_text, self.styles['BodyText']))

        self.story.append(Paragraph("6.1 High Priority (Immediate Action Required)", self.styles['SubsectionHeader']))
        high_items = [
            ("P1", "Resolve Prisma Schema Mismatches", "Update service implementations to match current Prisma schema. This will re-enable 5 critical routes."),
            ("P2", "Implement Predictive Intelligence Module", "Core Phase 10 feature. Develop case outcome prediction and timeline forecasting services."),
            ("P3", "Complete Pattern Detection Service", "Implement legal Named Entity Recognition for Ecuadorian legal system."),
        ]
        for priority, title, desc in high_items:
            self.story.append(Paragraph(f'<font color="{BRAND_DANGER.hexval()}"><b>[{priority}]</b></font> <b>{title}</b>', self.styles['BodyText']))
            self.story.append(Paragraph(desc, self.styles['BodyText']))

        self.story.append(Paragraph("6.2 Medium Priority (Within 2 Sprints)", self.styles['SubsectionHeader']))
        medium_items = [
            ("M1", "Integrate shadcn/ui Components", "Replace current UI components with shadcn/ui as specified."),
            ("M2", "Implement Dark Mode", "Add theme toggle and persist user preference."),
            ("M3", "Complete Document Summarization", "Finish multi-level summarization service."),
            ("M4", "Add Response Streaming", "Implement streaming for AI assistant responses."),
        ]
        for priority, title, desc in medium_items:
            self.story.append(Paragraph(f'<font color="{BRAND_WARNING.hexval()}"><b>[{priority}]</b></font> <b>{title}</b>', self.styles['BodyText']))
            self.story.append(Paragraph(desc, self.styles['BodyText']))

        self.story.append(Paragraph("6.3 Low Priority (Backlog)", self.styles['SubsectionHeader']))
        low_items = [
            ("L1", "Multi-language NLP Support", "Extend NLP processing to support English queries."),
            ("L2", "Advanced Visualization", "Add trend charts and predictive analytics visualizations."),
            ("L3", "Notification Module", "Implement real-time notifications with WebSocket support."),
        ]
        for priority, title, desc in low_items:
            self.story.append(Paragraph(f'<font color="{BRAND_SECONDARY.hexval()}"><b>[{priority}]</b></font> <b>{title}</b>', self.styles['BodyText']))
            self.story.append(Paragraph(desc, self.styles['BodyText']))

    def add_appendix(self):
        """Add appendix with technical details"""
        self.story.append(PageBreak())
        self.story.append(Paragraph("APPENDIX A: TECHNICAL SPECIFICATIONS", self.styles['SectionHeader']))

        self.story.append(Paragraph("A.1 Database Models (93 Total)", self.styles['SubsectionHeader']))

        models_data = [
            ["Category", "Count", "Key Models"],
            ["User & Auth", "8", "User, Session, Account, TwoFactorSecret"],
            ["Legal Documents", "12", "LegalDocument, DocumentChunk, Citation, DocumentSummary"],
            ["Cases & Tasks", "6", "Case, CaseNote, Task, TaskComment"],
            ["AI/ML", "10", "AIModel, Prediction, TrendDataPoint, QueryHistory"],
            ["Search & Feedback", "8", "SearchQuery, RelevanceFeedback, QuerySuggestion"],
            ["Finance & Billing", "10", "Invoice, Payment, Subscription, UsageRecord"],
            ["Admin & Config", "8", "AuditLog, SystemSetting, Quota, Plan"],
            ["Observability", "6", "MetricSnapshot, AlertRule, HealthCheck"],
            ["Other", "25", "Notification, CalendarEvent, File, Backup, etc."],
        ]

        models_table = Table(models_data, colWidths=[1.5*inch, 0.8*inch, 3.9*inch])
        models_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, BRAND_GRAY),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_LIGHT]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        self.story.append(models_table)
        self.story.append(Spacer(1, 15))

        self.story.append(Paragraph("A.2 API Routes Summary (37+ Endpoints)", self.styles['SubsectionHeader']))

        routes_summary = [
            ["Route Category", "Endpoints", "Status"],
            ["Authentication (/api/v1/auth/*)", "6", "Active"],
            ["Cases (/api/v1/cases/*)", "5", "Active"],
            ["Documents (/api/v1/documents/*)", "4", "Active"],
            ["Query (/api/v1/query/*)", "3", "Active"],
            ["User Management (/api/v1/user/*)", "4", "Active"],
            ["Billing (/api/v1/billing/*)", "3", "Active"],
            ["Admin (/api/v1/admin/*)", "8", "Active"],
            ["NLP (/api/v1/nlp/*)", "4", "Active"],
            ["AI Assistant (/api/v1/ai-assistant/*)", "3", "Active"],
            ["Feedback (/api/v1/feedback/*)", "4", "Active"],
            ["Observability (/observability/*)", "3", "Active"],
            ["Backup (/api/admin/backups/*)", "6", "Active"],
        ]

        routes_table = Table(routes_summary, colWidths=[3*inch, 1.2*inch, 1*inch])
        routes_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_SECONDARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, BRAND_GRAY),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_LIGHT]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        self.story.append(routes_table)

    def add_footer(self, canvas, doc):
        """Add page footer"""
        canvas.saveState()
        canvas.setStrokeColor(BRAND_LIGHT)
        canvas.setLineWidth(1)
        canvas.line(0.75*inch, 0.5*inch, doc.pagesize[0] - 0.75*inch, 0.5*inch)
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(BRAND_GRAY)
        canvas.drawString(0.75*inch, 0.35*inch, "Legal RAG System - Compliance Report")
        canvas.drawRightString(doc.pagesize[0] - 0.75*inch, 0.35*inch, f"Page {doc.page}")
        canvas.restoreState()

    def generate(self):
        """Generate the complete PDF report"""
        print("Generating Legal RAG System Compliance Report...")

        self.add_cover_page()
        self.add_executive_summary()
        self.add_architecture_analysis()
        self.add_phase10_compliance()
        self.add_disabled_components()
        self.add_frontend_analysis()
        self.add_recommendations()
        self.add_appendix()

        self.doc.build(
            self.story,
            onFirstPage=self.add_footer,
            onLaterPages=self.add_footer
        )

        print(f"Report generated successfully: {self.output_path}")
        return self.output_path


def main():
    """Main entry point"""
    output_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(output_dir, "LEGAL_RAG_COMPLIANCE_REPORT_PROFESSIONAL.pdf")

    generator = ComplianceReportGenerator(output_path)
    result = generator.generate()

    print(f"\n{'='*60}")
    print("LEGAL RAG SYSTEM - COMPLIANCE REPORT GENERATED")
    print(f"{'='*60}")
    print(f"Output: {result}")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
