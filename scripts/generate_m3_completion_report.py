#!/usr/bin/env python3
"""
M3 Document Summarization - Professional Completion Report Generator
Generates a comprehensive PDF report documenting the M3 implementation.

Author: Claude AI
Date: 2025-12-12
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, ListFlowable, ListItem, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfgen import canvas
from datetime import datetime
import os

# Constants
REPORT_TITLE = "M3 Document Summarization"
REPORT_SUBTITLE = "Implementation Completion Report"
PROJECT_NAME = "Legal RAG System"
VERSION = "1.0.0"
DATE = datetime.now().strftime("%Y-%m-%d %H:%M")

# Colors
PRIMARY_COLOR = colors.HexColor("#1a365d")  # Dark blue
SECONDARY_COLOR = colors.HexColor("#2b6cb0")  # Medium blue
ACCENT_COLOR = colors.HexColor("#48bb78")  # Green for success
WARNING_COLOR = colors.HexColor("#ed8936")  # Orange
HEADER_BG = colors.HexColor("#e2e8f0")  # Light gray
SUCCESS_BG = colors.HexColor("#c6f6d5")  # Light green


def create_styles():
    """Create custom paragraph styles for the report."""
    styles = getSampleStyleSheet()

    # Title style
    styles.add(ParagraphStyle(
        name='ReportTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=PRIMARY_COLOR,
        alignment=TA_CENTER,
        spaceAfter=6,
        fontName='Helvetica-Bold'
    ))

    # Subtitle style
    styles.add(ParagraphStyle(
        name='ReportSubtitle',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=SECONDARY_COLOR,
        alignment=TA_CENTER,
        spaceAfter=30,
        fontName='Helvetica'
    ))

    # Section header
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=PRIMARY_COLOR,
        spaceBefore=20,
        spaceAfter=12,
        fontName='Helvetica-Bold',
        borderPadding=5,
        borderWidth=0,
        borderColor=PRIMARY_COLOR
    ))

    # Subsection header
    styles.add(ParagraphStyle(
        name='SubsectionHeader',
        parent=styles['Heading2'],
        fontSize=13,
        textColor=SECONDARY_COLOR,
        spaceBefore=14,
        spaceAfter=8,
        fontName='Helvetica-Bold'
    ))

    # Body text - modify existing style
    styles['BodyText'].fontSize = 10
    styles['BodyText'].textColor = colors.black
    styles['BodyText'].alignment = TA_JUSTIFY
    styles['BodyText'].spaceAfter = 8
    styles['BodyText'].leading = 14

    # Code style
    styles.add(ParagraphStyle(
        name='CodeBlock',
        parent=styles['Normal'],
        fontSize=8,
        fontName='Courier',
        textColor=colors.HexColor("#2d3748"),
        backColor=colors.HexColor("#f7fafc"),
        borderPadding=8,
        spaceAfter=10,
        leading=12
    ))

    # Success badge
    styles.add(ParagraphStyle(
        name='SuccessBadge',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor("#276749"),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    ))

    return styles


def add_header_footer(canvas, doc):
    """Add header and footer to each page."""
    canvas.saveState()

    # Header
    canvas.setFont('Helvetica-Bold', 9)
    canvas.setFillColor(PRIMARY_COLOR)
    canvas.drawString(inch, letter[1] - 0.5*inch, PROJECT_NAME)
    canvas.setFont('Helvetica', 9)
    canvas.drawRightString(letter[0] - inch, letter[1] - 0.5*inch, REPORT_TITLE)

    # Header line
    canvas.setStrokeColor(SECONDARY_COLOR)
    canvas.setLineWidth(0.5)
    canvas.line(inch, letter[1] - 0.6*inch, letter[0] - inch, letter[1] - 0.6*inch)

    # Footer
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.gray)
    canvas.drawString(inch, 0.5*inch, f"Generated: {DATE}")
    canvas.drawCentredString(letter[0]/2, 0.5*inch, f"Page {doc.page}")
    canvas.drawRightString(letter[0] - inch, 0.5*inch, "Confidential")

    # Footer line
    canvas.line(inch, 0.7*inch, letter[0] - inch, 0.7*inch)

    canvas.restoreState()


def create_cover_page(styles):
    """Create the cover page elements."""
    elements = []

    elements.append(Spacer(1, 2*inch))

    # Main title
    elements.append(Paragraph(REPORT_TITLE, styles['ReportTitle']))
    elements.append(Paragraph(REPORT_SUBTITLE, styles['ReportSubtitle']))

    elements.append(Spacer(1, 0.5*inch))

    # Status badge
    status_table = Table([
        [Paragraph("STATUS: COMPLETED", styles['SuccessBadge'])]
    ], colWidths=[3*inch])
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SUCCESS_BG),
        ('BOX', (0, 0), (-1, -1), 2, ACCENT_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(status_table)

    elements.append(Spacer(1, inch))

    # Project info table
    info_data = [
        ['Project:', PROJECT_NAME],
        ['Version:', VERSION],
        ['Date:', DATE],
        ['Completion:', '100%'],
        ['TypeScript:', 'No Errors'],
    ]

    info_table = Table(info_data, colWidths=[1.5*inch, 3*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (0, 0), (0, -1), PRIMARY_COLOR),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)

    elements.append(PageBreak())
    return elements


def create_executive_summary(styles):
    """Create the executive summary section."""
    elements = []

    elements.append(Paragraph("1. Executive Summary", styles['SectionHeader']))
    elements.append(HRFlowable(width="100%", thickness=1, color=SECONDARY_COLOR))
    elements.append(Spacer(1, 0.2*inch))

    summary_text = """
    The M3 Document Summarization feature has been successfully implemented and integrated into the
    Legal RAG System. This implementation provides AI-powered document summarization capabilities
    including multi-level summaries (brief, standard, detailed), key point extraction, executive
    summaries, batch processing, and comparative document analysis.
    """
    elements.append(Paragraph(summary_text, styles['BodyText']))

    # Key achievements
    elements.append(Paragraph("Key Achievements", styles['SubsectionHeader']))

    achievements = [
        "Complete backend service implementation with OpenAI GPT-4 integration",
        "RESTful API endpoints with Zod schema validation",
        "React frontend components with shadcn/ui design system",
        "Full dark mode support across all components",
        "TypeScript compilation verified with zero errors",
        "Database persistence with Prisma ORM",
        "Caching layer for optimized performance"
    ]

    for achievement in achievements:
        elements.append(Paragraph(f"<bullet>&bull;</bullet> {achievement}", styles['BodyText']))

    elements.append(Spacer(1, 0.3*inch))

    # Completion metrics table
    metrics_data = [
        ['Component', 'Status', 'Completion'],
        ['Backend Service', 'Completed', '100%'],
        ['API Routes', 'Completed', '100%'],
        ['Zod Schemas', 'Completed', '100%'],
        ['Frontend Hooks', 'Completed', '100%'],
        ['UI Components', 'Completed', '100%'],
        ['Page Integration', 'Completed', '100%'],
        ['TypeScript', 'Verified', 'No Errors'],
    ]

    metrics_table = Table(metrics_data, colWidths=[2.5*inch, 1.5*inch, 1.2*inch])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
        ('BACKGROUND', (1, 1), (1, -1), SUCCESS_BG),
        ('BACKGROUND', (2, 1), (2, -1), SUCCESS_BG),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(metrics_table)

    elements.append(PageBreak())
    return elements


def create_backend_section(styles):
    """Create the backend implementation section."""
    elements = []

    elements.append(Paragraph("2. Backend Implementation", styles['SectionHeader']))
    elements.append(HRFlowable(width="100%", thickness=1, color=SECONDARY_COLOR))
    elements.append(Spacer(1, 0.2*inch))

    # Service description
    elements.append(Paragraph("2.1 DocumentSummarizationService", styles['SubsectionHeader']))

    service_desc = """
    The core backend service is implemented in <font face="Courier" size="9">document-summarization.service.ts</font>
    and provides comprehensive document summarization capabilities powered by OpenAI's GPT-4 model.
    """
    elements.append(Paragraph(service_desc, styles['BodyText']))

    # Methods table
    methods_data = [
        ['Method', 'Description', 'Parameters'],
        ['summarizeDocument()', 'Generate document summary', 'documentId, options'],
        ['extractKeyPoints()', 'Extract key points', 'documentId'],
        ['generateExecutiveSummary()', 'Case executive summary', 'caseId'],
        ['batchSummarize()', 'Batch processing', 'documentIds[], options'],
        ['compareDocuments()', 'Comparative analysis', 'documentIds[]'],
        ['getSummary()', 'Retrieve existing', 'summaryId'],
    ]

    methods_table = Table(methods_data, colWidths=[2*inch, 2.3*inch, 1.5*inch])
    methods_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(methods_table)

    elements.append(Spacer(1, 0.3*inch))

    # API Routes section
    elements.append(Paragraph("2.2 API Routes", styles['SubsectionHeader']))

    routes_desc = """
    The API routes are implemented in <font face="Courier" size="9">src/routes/summarization.ts</font>
    with full Zod schema validation and authentication middleware.
    """
    elements.append(Paragraph(routes_desc, styles['BodyText']))

    # Endpoints table
    endpoints_data = [
        ['Method', 'Endpoint', 'Description'],
        ['POST', '/api/v1/summarization/document/:id', 'Generate document summary'],
        ['POST', '/api/v1/summarization/document/:id/key-points', 'Extract key points'],
        ['POST', '/api/v1/summarization/case/:id/executive', 'Executive summary'],
        ['POST', '/api/v1/summarization/batch', 'Batch summarization'],
        ['POST', '/api/v1/summarization/compare', 'Compare documents'],
        ['GET', '/api/v1/summarization/:summaryId', 'Get existing summary'],
        ['GET', '/api/v1/summarization/document/:id/summaries', 'List summaries'],
    ]

    endpoints_table = Table(endpoints_data, colWidths=[0.8*inch, 3.2*inch, 1.8*inch])
    endpoints_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (1, 1), (1, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
        ('BACKGROUND', (0, 1), (0, -1), HEADER_BG),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(endpoints_table)

    elements.append(PageBreak())
    return elements


def create_frontend_section(styles):
    """Create the frontend implementation section."""
    elements = []

    elements.append(Paragraph("3. Frontend Implementation", styles['SectionHeader']))
    elements.append(HRFlowable(width="100%", thickness=1, color=SECONDARY_COLOR))
    elements.append(Spacer(1, 0.2*inch))

    # Components overview
    elements.append(Paragraph("3.1 React Components", styles['SubsectionHeader']))

    components_desc = """
    The frontend implementation uses React with TypeScript, shadcn/ui component library,
    and TanStack Query for server state management. All components support dark mode.
    """
    elements.append(Paragraph(components_desc, styles['BodyText']))

    # Components table
    components_data = [
        ['Component', 'Location', 'Purpose'],
        ['SummaryCard', 'components/summarization/', 'Display summary results'],
        ['KeyPointsList', 'components/summarization/', 'Render key points'],
        ['SummaryOptions', 'components/summarization/', 'Configuration panel'],
        ['DocumentSelector', 'components/summarization/', 'Document selection'],
        ['SummarizationPage', 'app/summarization/', 'Main page layout'],
    ]

    components_table = Table(components_data, colWidths=[1.8*inch, 2.2*inch, 1.8*inch])
    components_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Courier'),
        ('FONTNAME', (1, 1), (1, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(components_table)

    elements.append(Spacer(1, 0.3*inch))

    # Hooks section
    elements.append(Paragraph("3.2 React Query Hooks", styles['SubsectionHeader']))

    hooks_desc = """
    Custom React Query hooks provide data fetching and mutation capabilities with
    automatic caching, error handling, and loading states.
    """
    elements.append(Paragraph(hooks_desc, styles['BodyText']))

    hooks_data = [
        ['Hook', 'Type', 'Description'],
        ['useSummarizeDocument()', 'Mutation', 'Generate document summary'],
        ['useExtractKeyPoints()', 'Mutation', 'Extract key points'],
        ['useCompareDocuments()', 'Mutation', 'Document comparison'],
        ['useDocumentSummaries()', 'Query', 'Fetch existing summaries'],
        ['useBatchSummarize()', 'Mutation', 'Batch processing'],
    ]

    hooks_table = Table(hooks_data, colWidths=[2.2*inch, 1.2*inch, 2.4*inch])
    hooks_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(hooks_table)

    elements.append(Spacer(1, 0.3*inch))

    # UI Features
    elements.append(Paragraph("3.3 UI Features", styles['SubsectionHeader']))

    features = [
        "Three summarization levels: Brief, Standard, Detailed",
        "Language selection: Spanish (ES) and English (EN)",
        "Key points extraction with importance indicators",
        "References display with source attribution",
        "Dark mode support with consistent theming",
        "Loading states with skeleton placeholders",
        "Error handling with user-friendly messages",
        "Responsive design for all screen sizes"
    ]

    for feature in features:
        elements.append(Paragraph(f"<bullet>&bull;</bullet> {feature}", styles['BodyText']))

    elements.append(PageBreak())
    return elements


def create_typescript_section(styles):
    """Create the TypeScript fixes section."""
    elements = []

    elements.append(Paragraph("4. TypeScript Verification", styles['SectionHeader']))
    elements.append(HRFlowable(width="100%", thickness=1, color=SECONDARY_COLOR))
    elements.append(Spacer(1, 0.2*inch))

    # Verification status
    verification_text = """
    The complete codebase has been verified with TypeScript strict mode. All type errors
    have been resolved and the compilation passes successfully with zero errors.
    """
    elements.append(Paragraph(verification_text, styles['BodyText']))

    # Command verification
    elements.append(Paragraph("Verification Command:", styles['SubsectionHeader']))
    elements.append(Paragraph("npx tsc --noEmit", styles['CodeBlock']))
    elements.append(Paragraph("Result: No errors (clean compilation)", styles['BodyText']))

    elements.append(Spacer(1, 0.2*inch))

    # Fixes applied
    elements.append(Paragraph("4.1 Key Type Fixes Applied", styles['SubsectionHeader']))

    fixes_data = [
        ['Issue', 'Resolution'],
        ['Service method signatures', 'Aligned route calls with actual service parameters'],
        ['Prisma field names', 'Used legalDocumentId, summaryText, summaryType'],
        ['Response mapping', 'Proper transformation from Prisma to API response'],
        ['Enum type handling', 'Cast strings to proper enum types (Jurisdiction)'],
        ['Null handling', 'Used Prisma.JsonNull for JSON fields'],
        ['Interface alignment', 'Matched ExecutiveSummary.riskFactors property'],
        ['Batch return type', 'Handle array return instead of object with counts'],
    ]

    fixes_table = Table(fixes_data, colWidths=[2.3*inch, 3.5*inch])
    fixes_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(fixes_table)

    elements.append(PageBreak())
    return elements


def create_files_section(styles):
    """Create the files created/modified section."""
    elements = []

    elements.append(Paragraph("5. Files Created & Modified", styles['SectionHeader']))
    elements.append(HRFlowable(width="100%", thickness=1, color=SECONDARY_COLOR))
    elements.append(Spacer(1, 0.2*inch))

    # New files
    elements.append(Paragraph("5.1 New Files Created", styles['SubsectionHeader']))

    new_files_data = [
        ['File Path', 'Purpose'],
        ['src/routes/summarization.ts', 'API route handlers'],
        ['src/schemas/summarization-schemas.ts', 'Zod validation schemas'],
        ['frontend/src/hooks/useSummarization.ts', 'React Query hooks'],
        ['frontend/src/components/summarization/SummaryCard.tsx', 'Summary display card'],
        ['frontend/src/components/summarization/KeyPointsList.tsx', 'Key points list'],
        ['frontend/src/components/summarization/SummaryOptions.tsx', 'Options panel'],
        ['frontend/src/components/summarization/DocumentSelector.tsx', 'Document picker'],
        ['frontend/src/app/summarization/page.tsx', 'Main page'],
    ]

    new_files_table = Table(new_files_data, colWidths=[3.8*inch, 2*inch])
    new_files_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(new_files_table)

    elements.append(Spacer(1, 0.3*inch))

    # Modified files
    elements.append(Paragraph("5.2 Files Modified", styles['SubsectionHeader']))

    modified_files_data = [
        ['File Path', 'Change'],
        ['src/server.ts', 'Added summarizationRoutes registration'],
        ['src/services/ai/index.ts', 'Exported DocumentSummarizationService'],
    ]

    modified_files_table = Table(modified_files_data, colWidths=[3.8*inch, 2*inch])
    modified_files_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), WARNING_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(modified_files_table)

    elements.append(PageBreak())
    return elements


def create_conclusion(styles):
    """Create the conclusion section."""
    elements = []

    elements.append(Paragraph("6. Conclusion", styles['SectionHeader']))
    elements.append(HRFlowable(width="100%", thickness=1, color=SECONDARY_COLOR))
    elements.append(Spacer(1, 0.2*inch))

    conclusion_text = """
    The M3 Document Summarization feature has been fully implemented and verified. The implementation
    includes a robust backend service with OpenAI integration, comprehensive API endpoints with proper
    validation, and a modern React frontend with full dark mode support.
    """
    elements.append(Paragraph(conclusion_text, styles['BodyText']))

    elements.append(Spacer(1, 0.2*inch))

    # Final status
    elements.append(Paragraph("Implementation Status", styles['SubsectionHeader']))

    final_status = [
        ['Category', 'Status', 'Notes'],
        ['Backend Service', 'COMPLETE', 'Full OpenAI GPT-4 integration'],
        ['API Routes', 'COMPLETE', '7 endpoints with Zod validation'],
        ['Frontend Components', 'COMPLETE', '5 React components with dark mode'],
        ['TypeScript', 'VERIFIED', 'Zero compilation errors'],
        ['Database', 'READY', 'Prisma schema aligned'],
        ['Documentation', 'COMPLETE', 'This report'],
    ]

    final_table = Table(final_status, colWidths=[1.8*inch, 1.2*inch, 2.8*inch])
    final_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
        ('BACKGROUND', (1, 1), (1, -1), SUCCESS_BG),
        ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
    ]))
    elements.append(final_table)

    elements.append(Spacer(1, 0.5*inch))

    # Sign-off
    signoff_text = """
    <b>Report Generated:</b> {}<br/>
    <b>System:</b> Legal RAG System v1.0.0<br/>
    <b>Feature:</b> M3 Document Summarization<br/>
    <b>Status:</b> Production Ready
    """.format(DATE)
    elements.append(Paragraph(signoff_text, styles['BodyText']))

    return elements


def generate_report(output_path):
    """Generate the complete PDF report."""
    print(f"Generating M3 Completion Report...")

    # Create document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=inch,
        bottomMargin=inch
    )

    # Create styles
    styles = create_styles()

    # Build document elements
    elements = []

    # Cover page
    elements.extend(create_cover_page(styles))

    # Executive Summary
    elements.extend(create_executive_summary(styles))

    # Backend Implementation
    elements.extend(create_backend_section(styles))

    # Frontend Implementation
    elements.extend(create_frontend_section(styles))

    # TypeScript Verification
    elements.extend(create_typescript_section(styles))

    # Files Created/Modified
    elements.extend(create_files_section(styles))

    # Conclusion
    elements.extend(create_conclusion(styles))

    # Build PDF
    doc.build(elements, onFirstPage=add_header_footer, onLaterPages=add_header_footer)

    print(f"Report generated successfully: {output_path}")
    return output_path


if __name__ == "__main__":
    output_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "M3_DOCUMENT_SUMMARIZATION_COMPLETION_REPORT.pdf"
    )
    generate_report(output_file)
