# AI Metadata Extraction Test Guide

## Overview
The AI-powered metadata extraction system uses OpenAI GPT-4 Turbo to automatically extract structured metadata from Ecuadorian legal documents.

## Implementation Details

### 1. Service Method Added
**File**: `C:\Users\benito\poweria\legal\src\services\legal-document-service.ts`
**Method**: `extractMetadataWithAI(content: string)`
**Location**: Line 687-835

### 2. API Endpoint Added
**File**: `C:\Users\benito\poweria\legal\src\routes\legal-documents-v2.ts`
**Endpoint**: `POST /legal-documents-v2/extract-metadata`
**Location**: Line 500-544

## Features

### Extracted Metadata Fields
- **normType**: Type of legal norm (e.g., ORGANIC_LAW, ORDINARY_LAW, etc.)
- **normTitle**: Full title of the document
- **legalHierarchy**: Legal hierarchy level (e.g., CONSTITUCION, LEYES_ORGANICAS, etc.)
- **publicationType**: Publication type (ORDINARIO, SUPLEMENTO, etc.)
- **publicationNumber**: Publication number
- **publicationDate**: Date in YYYY-MM-DD format
- **documentState**: ORIGINAL or REFORMADO
- **jurisdiction**: NACIONAL, PROVINCIAL, CANTONAL, etc.
- **lastReformDate**: Date of last reform if applicable
- **keywords**: Array of relevant keywords

### Additional Information
- **confidence**: Extraction confidence level (high/medium/low)
- **reasoning**: Explanation of the extraction process

## API Usage Example

### Request
```bash
POST /api/legal-documents-v2/extract-metadata
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "content": "LEY ORGÁNICA DE EDUCACIÓN SUPERIOR\n\nCapítulo 1\nDel Principio de Autonomía Responsable\n\nArt. 17.- El Estado reconoce a las universidades y escuelas politécnicas autonomía académica..."
}
```

### Response
```json
{
  "success": true,
  "suggestions": {
    "normType": "ORGANIC_LAW",
    "normTitle": "Ley Orgánica de Educación Superior",
    "legalHierarchy": "LEYES_ORGANICAS",
    "publicationType": null,
    "publicationNumber": null,
    "publicationDate": null,
    "documentState": "ORIGINAL",
    "jurisdiction": "NACIONAL",
    "lastReformDate": null,
    "keywords": ["educación", "superior", "universidades", "autonomía"]
  },
  "confidence": "high",
  "reasoning": "Documento claramente identificado como Ley Orgánica por su título. La jerarquía corresponde a leyes orgánicas según el sistema legal ecuatoriano."
}
```

## Key Features

1. **Token Management**: Automatically truncates content to 8,000 characters to stay within GPT-4 token limits
2. **Structured Output**: Uses OpenAI's response_format for consistent JSON responses
3. **Low Temperature**: Set to 0.3 for more deterministic and consistent extractions
4. **Error Handling**: Returns sensible defaults if AI extraction fails
5. **Admin-Only Access**: Protected endpoint requiring admin authentication
6. **Content Validation**: Requires minimum 100 characters for reliable extraction

## Spanish Legal Context

The system is specifically trained to understand Ecuadorian legal terminology and hierarchy:

### Norm Types
- Constitutional norms
- Organic and ordinary laws
- Organic and ordinary codes
- Executive decrees and regulations
- Municipal and metropolitan ordinances
- Administrative and judicial resolutions
- Ministerial agreements
- International treaties
- Judicial precedents

### Legal Hierarchy
Based on Ecuador's constitutional order:
1. Constitution
2. International human rights treaties
3. Organic laws
4. Ordinary laws
5. Organic codes
6. Ordinary codes
7. Regulations and decrees
8. Ordinances
9. Resolutions
10. Administrative agreements

## Integration with Document Upload Workflow

This AI extraction can be integrated into the document upload process:

1. User uploads PDF document
2. System extracts text content
3. **NEW**: System calls `extractMetadataWithAI(content)`
4. UI displays AI suggestions to user
5. User can review, accept, or modify suggestions
6. Final metadata is saved with document

## Error Scenarios

The system handles various error cases:
- OpenAI API failures
- Invalid or malformed responses
- Token limit exceeded
- Network timeouts
- Authentication errors

In all cases, it returns default values with low confidence, allowing users to input metadata manually.

## Cost Considerations

- Uses GPT-4 Turbo Preview model
- Each extraction costs approximately $0.01-0.03 depending on document length
- Content is truncated to 8,000 characters to control costs
- Consider caching results for duplicate documents

## Future Enhancements

Potential improvements for the system:
1. Fine-tune model on Ecuadorian legal corpus
2. Add support for extracting specific articles or sections
3. Implement batch processing for multiple documents
4. Add support for comparing with existing documents
5. Create specialized prompts for different document types
6. Add multi-language support (Quechua, English)