# Legal Document Upload Form - Complete Specification

## Visual Form Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                   Subir Documento Legal                         │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Tipo de Norma *                                           │ │
│  │ ▼ Ley Ordinaria                                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Título de la Norma *                                      │ │
│  │ Ej: Código Civil y Comercial de la Nación                │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Jerarquía Legal *                                         │ │
│  │ ▼ Leyes Ordinarias                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────┬──────────────────────────────┐ │
│  │ Tipo de Publicación RO      │ Número de Publicación RO     │ │
│  │ ▼ Ordinario                │ Ej: 490                      │ │
│  └─────────────────────────────┴──────────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────┬──────────────────────────────┐ │
│  │ Fecha de Publicación        │ Estado                       │ │
│  │ 📅 YYYY-MM-DD              │ ▼ Original                  │ │
│  └─────────────────────────────┴──────────────────────────────┘ │
│                                                                 │
│  [Conditional: Only if Estado = "Reformado"]                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Fecha de Última Reforma *                                 │ │
│  │ 📅 YYYY-MM-DD                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Archivo PDF *                                             │ │
│  │ ┌─────────────────────────────────────────────────────┐   │ │
│  │ │          📤 Click para seleccionar archivo PDF      │   │ │
│  │ │                                                     │   │ │
│  │ │          [Selected: documento.pdf (2.5 MB)]        │   │ │
│  │ └─────────────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ℹ️  Procesamiento Automático                              │ │
│  │                                                           │ │
│  │ El documento será procesado automáticamente para         │ │
│  │ generar embeddings vectoriales y estará disponible       │ │
│  │ inmediatamente para consultas en el sistema RAG.         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Upload Progress - Shows when uploading]                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Subiendo y procesando documento...                60%    │ │
│  │ ██████████████████████████░░░░░░░░░░░░░░░░░              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────────────────────┐   │
│  │    Cancelar      │  │  📤 Subir Documento Legal        │   │
│  └──────────────────┘  └──────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Field Specifications

### 1. Tipo de Norma (Required)
**Type:** Dropdown (Select)
**Options:** 14 values
**Default:** ORDINARY_LAW

| Value | Label (Spanish) |
|-------|----------------|
| CONSTITUTIONAL_NORM | Norma Constitucional |
| ORGANIC_LAW | Ley Orgánica |
| ORDINARY_LAW | Ley Ordinaria |
| ORGANIC_CODE | Código Orgánico |
| ORDINARY_CODE | Código Ordinario |
| REGULATION_GENERAL | Reglamento General |
| REGULATION_EXECUTIVE | Decreto Ejecutivo |
| ORDINANCE_MUNICIPAL | Ordenanza Municipal |
| ORDINANCE_METROPOLITAN | Ordenanza Metropolitana |
| RESOLUTION_ADMINISTRATIVE | Resolución Administrativa |
| RESOLUTION_JUDICIAL | Resolución Judicial |
| ADMINISTRATIVE_AGREEMENT | Acuerdo Administrativo |
| INTERNATIONAL_TREATY | Tratado Internacional |
| JUDICIAL_PRECEDENT | Precedente Judicial |

### 2. Título de la Norma (Required)
**Type:** Text Input
**Validation:**
- Required
- Minimum 5 characters
- Maximum 500 characters

**Example:** "Código Civil y Comercial de la Nación"

### 3. Jerarquía Legal (Required)
**Type:** Dropdown (Select)
**Options:** 10 values
**Default:** LEYES_ORDINARIAS

| Value | Label (Spanish) |
|-------|----------------|
| CONSTITUCION | Constitución |
| TRATADOS_INTERNACIONALES_DDHH | Tratados Internacionales de DDHH |
| LEYES_ORGANICAS | Leyes Orgánicas |
| LEYES_ORDINARIAS | Leyes Ordinarias |
| CODIGOS_ORGANICOS | Códigos Orgánicos |
| CODIGOS_ORDINARIOS | Códigos Ordinarios |
| REGLAMENTOS | Reglamentos |
| ORDENANZAS | Ordenanzas |
| RESOLUCIONES | Resoluciones |
| ACUERDOS_ADMINISTRATIVOS | Acuerdos Administrativos |

### 4. Tipo de Publicación Registro Oficial (Optional)
**Type:** Dropdown (Select)
**Options:** 5 values
**Default:** ORDINARIO

| Value | Label (Spanish) |
|-------|----------------|
| ORDINARIO | Ordinario |
| SUPLEMENTO | Suplemento |
| SEGUNDO_SUPLEMENTO | Segundo Suplemento |
| SUPLEMENTO_ESPECIAL | Suplemento Especial |
| EDICION_CONSTITUCIONAL | Edición Constitucional |

### 5. Número de Publicación Registro Oficial (Optional)
**Type:** Text Input
**Validation:**
- Maximum 100 characters
- Alphanumeric

**Example:** "490" or "RO-490-S"

### 6. Fecha de Publicación (Optional)
**Type:** Date Picker
**Format:** YYYY-MM-DD
**Sent as:** ISO 8601 DateTime string

**Example:** "2015-08-01" → "2015-08-01T00:00:00.000Z"

### 7. Estado (Required)
**Type:** Dropdown (Select)
**Options:** 2 values
**Default:** ORIGINAL

| Value | Label (Spanish) |
|-------|----------------|
| ORIGINAL | Original |
| REFORMADO | Reformado |

### 8. Fecha de Última Reforma (Conditional Required)
**Type:** Date Picker
**Format:** YYYY-MM-DD
**Required When:** Estado = "REFORMADO"
**Sent as:** ISO 8601 DateTime string

**Validation:**
- Required if Estado is REFORMADO
- Must be a valid date
- Should be after publication date (if provided)

### 9. Archivo PDF (Required)
**Type:** File Upload
**Accepted:** .pdf only
**Max Size:** 50 MB
**Processing:** File is read as text and sent in `content` field

**Validation:**
- Required
- Must be PDF file
- Size must be ≤ 50MB
- File must be readable

## Form Behavior

### Initial State
```typescript
{
  normType: 'ORDINARY_LAW',
  normTitle: '',
  legalHierarchy: 'LEYES_ORDINARIAS',
  publicationType: 'ORDINARIO',
  publicationNumber: '',
  publicationDate: '',
  lastReformDate: '',
  documentState: 'ORIGINAL',
  file: null
}
```

### Validation Triggers
1. **On Submit:** All validations run
2. **On Field Change:** Clear individual field error
3. **On File Select:** Validate file immediately

### Upload Flow
```
1. User clicks "Subir Documento Legal"
2. Form validation runs
3. If invalid → Show errors, stop
4. If valid → Continue
5. Set uploading = true
6. Progress: 0%
7. Read file as text
8. Progress: 30%
9. Prepare request body
10. Progress: 60%
11. Send POST request
12. Progress: 90%
13. Receive response
14. Progress: 100%
15. Show success message
16. Set uploading = false
17. Reset form or close modal
```

### Error Handling
```
1. Network Error
   → "Error de conexión con el servidor. Verifique su conexión."

2. 401 Unauthorized
   → Redirect to /login
   → Clear localStorage

3. 403 Forbidden
   → "Solo administradores pueden subir documentos legales"

4. 400 Validation Error
   → Parse error details
   → Show specific field errors

5. 500 Server Error
   → "Error al procesar la solicitud"
   → Show generic error message
```

## API Request Format

### Request
```http
POST /api/v2/legal-documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "normType": "ORDINARY_LAW",
  "normTitle": "Código Civil y Comercial",
  "legalHierarchy": "CODIGOS_ORDINARIOS",
  "content": "<entire PDF text content>",
  "publicationType": "ORDINARIO",
  "publicationNumber": "490",
  "publicationDate": "2015-08-01T00:00:00.000Z",
  "documentState": "REFORMADO",
  "lastReformDate": "2020-12-15T00:00:00.000Z"
}
```

### Success Response
```json
{
  "success": true,
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "normTitle": "Código Civil y Comercial",
    "normType": "ORDINARY_LAW",
    "legalHierarchy": "CODIGOS_ORDINARIOS",
    "chunksCount": 234,
    "createdAt": "2025-11-09T23:00:00.000Z"
  }
}
```

### Error Response
```json
{
  "error": "Validation Error",
  "details": [
    {
      "path": ["normTitle"],
      "message": "Título debe tener al menos 5 caracteres"
    }
  ]
}
```

## UI States

### 1. Default State
- All fields editable
- Upload button enabled if file selected
- No errors shown

### 2. Uploading State
- All fields disabled
- Progress bar visible
- Upload button shows "Procesando..."
- Cancel button disabled

### 3. Success State
- Form hidden
- Success icon (checkmark) shown
- Success message displayed
- Options: "Subir Otro Documento" or "Cerrar"

### 4. Error State
- Form still editable
- Error banner at top
- Specific field errors shown
- User can fix and retry

## Responsive Design

### Desktop (≥ 768px)
- Two-column layout for date/state fields
- Full-width other fields
- Modal width: max-w-3xl

### Mobile (< 768px)
- Single column layout
- All fields full width
- Modal takes full screen minus padding
- Scrollable content

## Accessibility

### ARIA Labels
```html
<input
  aria-label="Título de la norma"
  aria-required="true"
  aria-invalid={errors.normTitle ? "true" : "false"}
  aria-describedby={errors.normTitle ? "normTitle-error" : undefined}
/>
```

### Keyboard Navigation
- Tab through all fields
- Enter to submit form
- Escape to close modal
- Space to toggle dropdowns

### Screen Reader Announcements
- Error messages announced when they appear
- Success message announced
- Progress updates announced

## Performance Considerations

### Optimizations
1. File reading is async with progress tracking
2. Validation runs only when needed
3. API calls include proper timeouts
4. Form state managed efficiently with useState

### Bundle Size
- Component: ~23KB
- Dependencies: lucide-react icons
- No heavy external libraries

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-09
**Maintained By:** Development Team
