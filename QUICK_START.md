# Quick Start Guide - Legal Document Upload Form

## Installation Steps

### 1. Verify Files Are in Place

```bash
# Check that all files exist
ls frontend/src/components/admin/LegalDocumentUploadForm.tsx
ls frontend/src/lib/api-v2-addon.ts
ls frontend/src/app/admin/legal-library/page.tsx
```

### 2. Install Dependencies (if needed)

```bash
cd frontend
npm install lucide-react  # Icon library
```

### 3. Environment Configuration

Create or update `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://legal-rag-api-qnew.onrender.com
```

### 4. Start Development Server

```bash
cd frontend
npm run dev
```

### 5. Access the Upload Form

Navigate to: `http://localhost:3000/admin/legal-library`

## Usage Instructions

### Uploading a Legal Document

1. Click "Subir Documento Legal" button
2. Fill in required fields:
   - **Tipo de Norma**: Select from 14 options
   - **Título de la Norma**: Enter full title (min 5 characters)
   - **Jerarquía Legal**: Select legal hierarchy level
   - **Archivo PDF**: Click to select PDF file (max 50MB)

3. Optional fields:
   - Tipo de Publicación: Defaults to "Ordinario"
   - Número de Publicación: Registry office number
   - Fecha de Publicación: Publication date
   - Estado: Original or Reformado

4. If Estado = "Reformado", you must enter "Fecha de última reforma"

5. Click "Subir Documento Legal"

6. Wait for processing (you'll see a progress bar)

7. Success! Document is now available in the RAG system

## Troubleshooting

### "Error de conexión con el servidor"
**Fix:** Check internet connection and API URL in `.env.local`

### "Only administrators can create legal documents"
**Fix:** Log in with an admin account

### "Debe seleccionar un archivo PDF"
**Fix:** Make sure you've selected a file and it's a PDF

### "El archivo no puede superar los 50MB"
**Fix:** Compress the PDF or split it into smaller files

### Upload gets stuck
**Possible causes:**
1. Large file taking time to process
2. Network timeout
3. Backend not responding

**Fix:**
- Refresh page and try again
- Check browser console for errors
- Verify backend is running

## Backend Requirements

The backend must have these endpoints deployed:

```
POST /api/v2/legal-documents       (Create)
GET  /api/v2/legal-documents       (List)
GET  /api/v2/legal-documents/:id   (Get)
PUT  /api/v2/legal-documents/:id   (Update)
DELETE /api/v2/legal-documents/:id (Delete)
GET  /api/v2/legal-documents/enums (Get options)
POST /api/v2/legal-documents/search (Search)
```

## Testing the Form

### Test Case 1: Basic Upload
1. Fill all required fields
2. Upload a small PDF (< 1MB)
3. Verify success message appears
4. Check document appears in list

### Test Case 2: Validation
1. Try to submit without filling fields
2. Verify error messages appear in Spanish
3. Fill fields one by one
4. Verify errors clear as fields are filled

### Test Case 3: File Validation
1. Try to upload a non-PDF file
2. Verify rejection message
3. Try to upload a file > 50MB
4. Verify size limit message

### Test Case 4: Reformed Document
1. Select Estado = "Reformado"
2. Verify "Fecha de última reforma" field appears
3. Try to submit without filling it
4. Verify validation error

## Common Field Values

### Tipo de Norma Examples:
- ORDINARY_LAW (Ley Ordinaria)
- ORGANIC_CODE (Código Orgánico)
- REGULATION_EXECUTIVE (Decreto Ejecutivo)

### Jerarquía Legal Examples:
- CONSTITUCION
- LEYES_ORGANICAS
- CODIGOS_ORGANICOS

### Tipo de Publicación Examples:
- ORDINARIO
- SUPLEMENTO
- SUPLEMENTO_ESPECIAL

## API Response Format

### Success Response:
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "normTitle": "Document Title",
    "chunksCount": 45
  }
}
```

### Error Response:
```json
{
  "error": "Validation Error",
  "details": [
    {
      "path": ["normTitle"],
      "message": "Title is required"
    }
  ]
}
```

## Next Steps

After successful upload:
1. Document is automatically chunked
2. Embeddings are generated
3. Document becomes searchable in RAG system
4. Available immediately for queries

## Support

If you encounter issues:
1. Check browser console (F12)
2. Check Network tab for API calls
3. Review error messages carefully
4. Check FRONTEND_IMPLEMENTATION.md for detailed troubleshooting

---

**Last Updated:** 2025-11-09
**Status:** Ready for Production ✅
