#!/usr/bin/env python3
"""
TypeScript Error Resolution Report Generator
Generates a professional PDF report documenting all TypeScript fixes
"""

import os
import sys
from datetime import datetime
from pathlib import Path

# Install required packages if not available
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch, cm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        PageBreak, ListFlowable, ListItem, Image
    )
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
except ImportError:
    print("Installing reportlab...")
    os.system("pip install reportlab")
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch, cm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        PageBreak, ListFlowable, ListItem
    )
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY


def create_styles():
    """Create custom styles for the report"""
    styles = getSampleStyleSheet()

    # Title style
    styles.add(ParagraphStyle(
        name='ReportTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1a365d')
    ))

    # Subtitle style
    styles.add(ParagraphStyle(
        name='ReportSubtitle',
        parent=styles['Normal'],
        fontSize=14,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#4a5568')
    ))

    # Section header
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=16,
        spaceBefore=20,
        spaceAfter=12,
        textColor=colors.HexColor('#2d3748'),
        borderPadding=5,
        borderColor=colors.HexColor('#3182ce'),
        borderWidth=2,
        leftIndent=0
    ))

    # Subsection header
    styles.add(ParagraphStyle(
        name='SubsectionHeader',
        parent=styles['Heading3'],
        fontSize=13,
        spaceBefore=15,
        spaceAfter=8,
        textColor=colors.HexColor('#4a5568')
    ))

    # Body text
    styles.add(ParagraphStyle(
        name='ReportBody',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=8,
        alignment=TA_JUSTIFY,
        leading=14
    ))

    # Code style
    styles.add(ParagraphStyle(
        name='CodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        spaceAfter=8,
        backColor=colors.HexColor('#f7fafc'),
        borderPadding=8,
        leftIndent=10,
        rightIndent=10
    ))

    # Success style
    styles.add(ParagraphStyle(
        name='Success',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#276749'),
        backColor=colors.HexColor('#c6f6d5'),
        borderPadding=10,
        spaceAfter=10
    ))

    return styles


def create_report():
    """Generate the TypeScript Error Resolution Report"""

    # Output file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = Path("C:/Users/benito/poweria/legal")
    output_file = output_path / f"TYPESCRIPT_ERROR_RESOLUTION_REPORT_{timestamp}.pdf"

    # Create document
    doc = SimpleDocTemplate(
        str(output_file),
        pagesize=letter,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch
    )

    styles = create_styles()
    story = []

    # =====================================================
    # TITLE PAGE
    # =====================================================
    story.append(Spacer(1, 1.5*inch))
    story.append(Paragraph("LEGAL RAG SYSTEM", styles['ReportTitle']))
    story.append(Paragraph("TypeScript Error Resolution Report", styles['ReportSubtitle']))
    story.append(Spacer(1, 0.5*inch))

    # Summary box
    summary_data = [
        ['EXECUTIVE SUMMARY'],
        ['Total Errors Resolved: 182'],
        ['Frontend Errors: 182 -> 0'],
        ['Backend Errors: 0 (Clean)'],
        ['Resolution Status: COMPLETE'],
        ['Date: December 12, 2025']
    ]
    summary_table = Table(summary_data, colWidths=[4*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3182ce')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('FONTSIZE', (0, 1), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#ebf8ff')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#3182ce')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(summary_table)

    story.append(PageBreak())

    # =====================================================
    # TABLE OF CONTENTS
    # =====================================================
    story.append(Paragraph("Table of Contents", styles['SectionHeader']))
    toc_items = [
        "1. Executive Summary",
        "2. Error Classification",
        "3. Phase 1: Dependency Installation",
        "4. Phase 2: Production Code Fixes",
        "5. Phase 3: Test Infrastructure",
        "6. Verification Results",
        "7. Files Modified",
        "8. Recommendations"
    ]
    for item in toc_items:
        story.append(Paragraph(item, styles['ReportBody']))

    story.append(PageBreak())

    # =====================================================
    # 1. EXECUTIVE SUMMARY
    # =====================================================
    story.append(Paragraph("1. Executive Summary", styles['SectionHeader']))
    story.append(Paragraph(
        "This report documents the comprehensive resolution of 182 TypeScript errors "
        "in the Legal RAG System frontend application. The resolution was executed using "
        "a multi-agent orchestration approach with parallel execution for maximum efficiency.",
        styles['ReportBody']
    ))

    # Metrics table
    metrics_data = [
        ['Metric', 'Before', 'After', 'Status'],
        ['Total Errors', '182', '0', 'RESOLVED'],
        ['Production Code Errors', '10', '0', 'RESOLVED'],
        ['Test File Errors', '170', '0', 'RESOLVED'],
        ['Configuration Errors', '2', '0', 'RESOLVED'],
        ['Backend Errors', '0', '0', 'CLEAN'],
    ]
    metrics_table = Table(metrics_data, colWidths=[2*inch, 1.2*inch, 1.2*inch, 1.2*inch])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f7fafc')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e0')),
        ('BACKGROUND', (3, 1), (3, -1), colors.HexColor('#c6f6d5')),
        ('TEXTCOLOR', (3, 1), (3, -1), colors.HexColor('#276749')),
    ]))
    story.append(Spacer(1, 0.2*inch))
    story.append(metrics_table)

    # =====================================================
    # 2. ERROR CLASSIFICATION
    # =====================================================
    story.append(PageBreak())
    story.append(Paragraph("2. Error Classification", styles['SectionHeader']))

    story.append(Paragraph("2.1 Critical Priority - Production Code (10 errors)", styles['SubsectionHeader']))

    critical_data = [
        ['Category', 'Error Type', 'Count', 'Files Affected'],
        ['A', 'Missing NPM Dependencies', '4', 'command.tsx, popover.tsx, scroll-area.tsx'],
        ['B', 'Type Mismatches', '5', 'page.tsx, DocumentSelector.tsx, SummaryCard.tsx'],
        ['C', 'Missing Exports', '1', 'SummaryOptions.example.tsx'],
    ]
    critical_table = Table(critical_data, colWidths=[0.8*inch, 2*inch, 0.8*inch, 2.5*inch])
    critical_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#c53030')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e0')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#fff5f5')),
    ]))
    story.append(critical_table)

    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("2.2 Medium Priority - Test Infrastructure (170 errors)", styles['SubsectionHeader']))

    test_data = [
        ['Category', 'Missing Dependency', 'Errors', 'Impact'],
        ['D', '@testing-library/react', '10', 'render, screen imports'],
        ['D', '@testing-library/user-event', '2', 'userEvent imports'],
        ['D', '@testing-library/jest-dom', '~158', 'expect matchers (toBeInTheDocument, etc)'],
    ]
    test_table = Table(test_data, colWidths=[0.8*inch, 2.2*inch, 0.8*inch, 2.3*inch])
    test_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d69e2e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e0')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#fffff0')),
    ]))
    story.append(test_table)

    # =====================================================
    # 3. PHASE 1: DEPENDENCY INSTALLATION
    # =====================================================
    story.append(PageBreak())
    story.append(Paragraph("3. Phase 1: Dependency Installation", styles['SectionHeader']))

    story.append(Paragraph("3.1 UI Dependencies (Production)", styles['SubsectionHeader']))
    story.append(Paragraph(
        "The following Radix UI and command palette dependencies were installed:",
        styles['ReportBody']
    ))

    ui_deps = [
        "@radix-ui/react-icons",
        "@radix-ui/react-popover",
        "@radix-ui/react-scroll-area",
        "cmdk (Command Palette)"
    ]
    for dep in ui_deps:
        story.append(Paragraph(f"  - {dep}", styles['ReportBody']))

    story.append(Spacer(1, 0.1*inch))
    story.append(Paragraph("3.2 Testing Dependencies (Development)", styles['SubsectionHeader']))

    test_deps = [
        "@testing-library/react",
        "@testing-library/user-event",
        "@testing-library/jest-dom",
        "@vitejs/plugin-react",
        "vitest",
        "jsdom",
        "@types/node"
    ]
    for dep in test_deps:
        story.append(Paragraph(f"  - {dep}", styles['ReportBody']))

    story.append(Spacer(1, 0.1*inch))
    story.append(Paragraph(
        "Command: npm install @radix-ui/react-icons cmdk @radix-ui/react-popover "
        "@radix-ui/react-scroll-area && npm install -D @testing-library/react "
        "@testing-library/user-event @testing-library/jest-dom @vitejs/plugin-react vitest jsdom @types/node",
        styles['CodeBlock']
    ))

    # =====================================================
    # 4. PHASE 2: PRODUCTION CODE FIXES
    # =====================================================
    story.append(PageBreak())
    story.append(Paragraph("4. Phase 2: Production Code Fixes", styles['SectionHeader']))
    story.append(Paragraph(
        "Four parallel agents were deployed to fix production code errors simultaneously:",
        styles['ReportBody']
    ))

    # Fix 1
    story.append(Paragraph("4.1 Fix: SummaryLevel Type Mismatch", styles['SubsectionHeader']))
    fix1_data = [
        ['Property', 'Value'],
        ['File', 'frontend/src/hooks/useSummarization.ts'],
        ['Line', '18'],
        ['Error Code', 'TS2322'],
        ['Problem', "'comprehensive' not in allowed SummaryLevel values"],
        ['Solution', "Removed 'comprehensive' from SummaryLevel type definition"],
    ]
    fix1_table = Table(fix1_data, colWidths=[1.5*inch, 4.5*inch])
    fix1_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#edf2f7')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
    ]))
    story.append(fix1_table)
    story.append(Paragraph(
        "Before: type SummaryLevel = 'brief' | 'standard' | 'detailed' | 'comprehensive';\n"
        "After:  type SummaryLevel = 'brief' | 'standard' | 'detailed';",
        styles['CodeBlock']
    ))

    # Fix 2
    story.append(Paragraph("4.2 Fix: maxSelections Undefined", styles['SubsectionHeader']))
    fix2_data = [
        ['Property', 'Value'],
        ['File', 'frontend/src/components/summarization/DocumentSelector.tsx'],
        ['Line', '376'],
        ['Error Code', 'TS18048'],
        ['Problem', 'maxSelections possibly undefined in template literal'],
        ['Solution', 'Added nullish coalescing with default value: maxSelections ?? 0'],
    ]
    fix2_table = Table(fix2_data, colWidths=[1.5*inch, 4.5*inch])
    fix2_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#edf2f7')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
    ]))
    story.append(fix2_table)

    # Fix 3
    story.append(Paragraph("4.3 Fix: Badge Variant Type", styles['SubsectionHeader']))
    fix3_data = [
        ['Property', 'Value'],
        ['File', 'frontend/src/components/summarization/SummaryCard.tsx'],
        ['Line', '90, 160'],
        ['Error Code', 'TS2322'],
        ['Problem', 'Badge variant string not matching literal union type'],
        ['Solution', 'Added explicit return type annotation to getLanguageBadge function'],
    ]
    fix3_table = Table(fix3_data, colWidths=[1.5*inch, 4.5*inch])
    fix3_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#edf2f7')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
    ]))
    story.append(fix3_table)

    # Fix 4
    story.append(Paragraph("4.4 Fix: Missing Export SummaryOptionsType", styles['SubsectionHeader']))
    fix4_data = [
        ['Property', 'Value'],
        ['File', 'frontend/src/components/summarization/SummaryOptions.example.tsx'],
        ['Line', '4'],
        ['Error Code', 'TS2724'],
        ['Problem', 'SummaryOptionsType export does not exist in SummaryOptions'],
        ['Solution', 'Changed import to use SummaryOptions with alias for component'],
    ]
    fix4_table = Table(fix4_data, colWidths=[1.5*inch, 4.5*inch])
    fix4_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#edf2f7')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
    ]))
    story.append(fix4_table)

    # =====================================================
    # 5. PHASE 3: TEST INFRASTRUCTURE
    # =====================================================
    story.append(PageBreak())
    story.append(Paragraph("5. Phase 3: Test Infrastructure Configuration", styles['SectionHeader']))

    story.append(Paragraph("5.1 tsconfig.json Updates", styles['SubsectionHeader']))
    story.append(Paragraph(
        "Added testing type definitions to TypeScript configuration:",
        styles['ReportBody']
    ))
    story.append(Paragraph(
        '"types": ["vitest/globals", "@testing-library/jest-dom"]',
        styles['CodeBlock']
    ))

    story.append(Paragraph("5.2 vitest.config.ts Fix", styles['SubsectionHeader']))
    story.append(Paragraph(
        "Resolved vite/vitest version mismatch by adding type assertion:",
        styles['ReportBody']
    ))
    story.append(Paragraph(
        "plugins: [react() as any]  // Type assertion for vite version compatibility",
        styles['CodeBlock']
    ))

    story.append(Paragraph("5.3 Test Setup (Existing)", styles['SubsectionHeader']))
    story.append(Paragraph(
        "Verified existing test setup at src/test/setup.ts includes:",
        styles['ReportBody']
    ))
    setup_items = [
        "@testing-library/jest-dom matchers",
        "next/navigation mocks",
        "next-auth/react mocks",
        "matchMedia mock for theme tests",
        "localStorage mock",
        "ResizeObserver mock"
    ]
    for item in setup_items:
        story.append(Paragraph(f"  [OK] {item}", styles['ReportBody']))

    # =====================================================
    # 6. VERIFICATION RESULTS
    # =====================================================
    story.append(PageBreak())
    story.append(Paragraph("6. Verification Results", styles['SectionHeader']))

    story.append(Paragraph("[SUCCESS] TypeScript Compilation - Frontend", styles['Success']))
    story.append(Paragraph(
        "Command: cd frontend && npx tsc --noEmit\n"
        "Result: 0 errors",
        styles['CodeBlock']
    ))

    story.append(Paragraph("[SUCCESS] TypeScript Compilation - Backend", styles['Success']))
    story.append(Paragraph(
        "Command: npx tsc --noEmit\n"
        "Result: 0 errors",
        styles['CodeBlock']
    ))

    # Final status table
    story.append(Paragraph("Final Verification Summary", styles['SubsectionHeader']))
    final_data = [
        ['Check', 'Result', 'Notes'],
        ['Frontend TypeScript', 'PASS', '0 errors'],
        ['Backend TypeScript', 'PASS', '0 errors'],
        ['Dependencies Installed', 'PASS', 'All packages available'],
        ['Type Definitions', 'PASS', 'vitest/globals, jest-dom'],
        ['Test Setup', 'PASS', 'setup.ts configured'],
    ]
    final_table = Table(final_data, colWidths=[2*inch, 1*inch, 3*inch])
    final_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#276749')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#276749')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f0fff4')),
        ('BACKGROUND', (1, 1), (1, -1), colors.HexColor('#c6f6d5')),
    ]))
    story.append(final_table)

    # =====================================================
    # 7. FILES MODIFIED
    # =====================================================
    story.append(PageBreak())
    story.append(Paragraph("7. Files Modified", styles['SectionHeader']))

    files_data = [
        ['File Path', 'Change Type', 'Priority'],
        ['frontend/package.json', 'Dependencies Added', 'CRITICAL'],
        ['frontend/src/hooks/useSummarization.ts', 'Type Fix', 'CRITICAL'],
        ['frontend/src/components/summarization/DocumentSelector.tsx', 'Null Check', 'CRITICAL'],
        ['frontend/src/components/summarization/SummaryCard.tsx', 'Return Type', 'CRITICAL'],
        ['frontend/src/components/summarization/SummaryOptions.example.tsx', 'Import Fix', 'CRITICAL'],
        ['frontend/src/components/summarization/SummaryOptions.test.tsx', 'Import Fix', 'MEDIUM'],
        ['frontend/tsconfig.json', 'Type Definitions', 'MEDIUM'],
        ['frontend/vitest.config.ts', 'Plugin Type', 'MEDIUM'],
    ]
    files_table = Table(files_data, colWidths=[3.5*inch, 1.5*inch, 1*inch])
    files_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e0')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f7fafc')),
    ]))
    story.append(files_table)

    # =====================================================
    # 8. RECOMMENDATIONS
    # =====================================================
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("8. Recommendations", styles['SectionHeader']))

    recommendations = [
        ("Run Tests Regularly", "Execute npm test to ensure all tests pass after code changes"),
        ("Update Dependencies", "Keep @radix-ui packages and testing libraries up to date"),
        ("Strict Mode", "Maintain strict: true in tsconfig.json for type safety"),
        ("CI/CD Integration", "Add TypeScript compilation check to CI/CD pipeline"),
        ("Type Coverage", "Consider adding type coverage reporting with tools like type-coverage"),
    ]

    for i, (title, desc) in enumerate(recommendations, 1):
        story.append(Paragraph(f"{i}. {title}", styles['SubsectionHeader']))
        story.append(Paragraph(desc, styles['ReportBody']))

    # =====================================================
    # FOOTER
    # =====================================================
    story.append(PageBreak())
    story.append(Spacer(1, 2*inch))

    footer_data = [
        ['REPORT GENERATED'],
        [f'Date: {datetime.now().strftime("%B %d, %Y at %H:%M:%S")}'],
        ['Generator: Multi-Agent Orchestration System'],
        ['System: Legal RAG v1.0.0'],
        ['Status: ALL TYPESCRIPT ERRORS RESOLVED'],
    ]
    footer_table = Table(footer_data, colWidths=[4*inch])
    footer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a365d')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#1a365d')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#ebf8ff')),
    ]))
    story.append(footer_table)

    # Build PDF
    doc.build(story)

    print(f"[SUCCESS] Report generated: {output_file}")
    return str(output_file)


if __name__ == "__main__":
    try:
        output = create_report()
        print(f"\n[OUTPUT] PDF Report: {output}")
    except Exception as e:
        print(f"[ERROR] Failed to generate report: {e}")
        sys.exit(1)
