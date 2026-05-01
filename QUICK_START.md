# 🚀 Quick Start - PDF Viewer con S3

## Inicio Rápido (5 minutos)

### 1. Configurar AWS (una sola vez)

```bash
# Ver guía completa en: AWS_S3_SETUP_GUIDE.md
# Resumen:
# 1. Crear bucket S3: legal-rag-documents
# 2. Configurar CORS
# 3. Crear IAM user con permisos
# 4. Copiar Access Key ID y Secret Key
```

### 2. Configurar Variables de Entorno

Editar `.env`:

```env
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."  # De Step 1
AWS_SECRET_ACCESS_KEY="..."   # De Step 1
AWS_S3_BUCKET="legal-rag-documents"
```

### 3. Instalar Dependencias (si no están)

```bash
# Backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Frontend
cd frontend
npm install react-pdf
```

### 4. Iniciar Aplicación

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 5. Probar

```
1. Abrir: http://localhost:3000/admin/legal-library
2. Click "Upload Document"
3. Seleccionar PDF
4. Llenar formulario
5. Submit

6. Click "Edit" en documento subido
7. PDF se carga en visor izquierdo
8. Usar controles para navegar
```

---

## 🎯 Controles del Visor

| Acción | Control |
|--------|---------|
| **Página anterior** | Click ◀ o tecla ← |
| **Página siguiente** | Click ▶ o tecla → |
| **Ir a página** | Escribir número + Enter |
| **Zoom in** | Click + o tecla + |
| **Zoom out** | Click - o tecla - |
| **Zoom custom** | Dropdown 50%-200% |
| **Ajustar ancho** | Click "Ancho" |
| **Ajustar página** | Click "Página" |
| **Rotar** | Click 🔄 |
| **Buscar** | Click 🔍 o Ctrl+F |
| **Descargar** | Click ⬇ |
| **Imprimir** | Click 🖨 |

---

## 🐛 Troubleshooting Rápido

### PDF no carga
```bash
# 1. Verificar logs backend
grep "S3" logs/app.log

# 2. Verificar S3
aws s3 ls s3://legal-rag-documents/legal-documents/

# 3. Verificar metadata
psql> SELECT metadata FROM legal_documents WHERE id = '...';
# Debe tener: s3Key, s3Bucket, fileSize
```

### Error de credentials
```bash
# Test credentials
aws s3 ls s3://legal-rag-documents/ --region us-east-1

# Si falla: revisar .env
# AWS_ACCESS_KEY_ID
# AWS_SECRET_ACCESS_KEY
# AWS_REGION
```

### CORS error
```
# Ir a S3 Console
# → Bucket → Permissions → CORS
# Verificar AllowedOrigins incluye tu dominio
```

## 📋 Verificación Rápida

### Backend Endpoints Requeridos
```
GET  /api/v2/legal-documents/:id/file  (Download PDF via presigned URL)
POST /api/v2/legal-documents           (Upload with S3 integration)
DELETE /api/v2/legal-documents/:id     (Delete from DB and S3)
```

### Dependencias Frontend
```json
{
  "dependencies": {
    "react-pdf": "^7.7.0",
    "pdfjs-dist": "^3.11.174"
  }
}
```

### Variables de Entorno Críticas
```env
AWS_REGION="us-east-1"              # Región S3
AWS_ACCESS_KEY_ID="AKIA..."         # Credenciales IAM
AWS_SECRET_ACCESS_KEY="..."         # Credenciales IAM
AWS_S3_BUCKET="legal-rag-documents" # Nombre del bucket
```

---

## 🧪 Testing del PDF Viewer

### Test Case 1: Carga Básica
1. Upload documento PDF
2. Click "Edit" en la lista
3. Verificar PDF carga en panel izquierdo
4. Verificar controles funcionan
5. Verificar navegación entre páginas

### Test Case 2: Zoom y Rotación
1. Click "+" para zoom in
2. Click "-" para zoom out
3. Usar dropdown para zoom custom (75%, 150%)
4. Click "Ancho" para ajustar ancho
5. Click "Página" para ajustar página completa
6. Click 🔄 para rotar

### Test Case 3: Búsqueda en PDF
1. Click icono 🔍 o Ctrl+F
2. Escribir término de búsqueda
3. Verificar highlights en texto
4. Navegar entre resultados
5. Verificar contador "X de Y resultados"

### Test Case 4: Descarga e Impresión
1. Click ⬇ para descargar
2. Verificar archivo descarga con nombre correcto
3. Click 🖨 para imprimir
4. Verificar diálogo de impresión del navegador

### Test Case 5: Navegación por Teclado
1. Presionar → para siguiente página
2. Presionar ← para página anterior
3. Presionar + para zoom in
4. Presionar - para zoom out
5. Verificar todas las teclas funcionan

---

## 📊 Estructura de Datos

### Metadata en Base de Datos
```json
{
  "s3Key": "legal-documents/abc-123/1699999999_documento.pdf",
  "s3Bucket": "legal-rag-documents",
  "fileSize": 1234567,
  "originalFilename": "documento.pdf"
}
```

### Presigned URL Flow
```
1. Frontend: GET /api/v2/legal-documents/:id/file
2. Backend: Genera presigned URL (válida 1 hora)
3. Backend: Redirect 302 a URL de S3
4. Browser: Descarga directamente desde S3
```

---

## 🔍 Logs a Monitorear

### Upload Exitoso
```
PDF uploaded to S3: legal-documents/abc-123/1699999999_documento.pdf (1234567 bytes)
```

### Download Exitoso
```
S3 download url generated for: legal-documents/abc-123/1699999999_documento.pdf
```

### Delete Exitoso
```
Deleted file from S3: legal-documents/abc-123/1699999999_documento.pdf
```

### Errores Comunes
```
S3 upload failed: ...
S3 download error: ...
S3 delete error: ...
```

---

## 📚 Documentación Relacionada

- **S3_INTEGRATION_COMPLETE.md** - Detalles técnicos completos
- **AWS_S3_SETUP_GUIDE.md** - Guía de configuración AWS (5 min)
- **PROYECTO_VISOR_PDF_FINAL.md** - Resumen ejecutivo del proyecto
- **FRONTEND_IMPLEMENTATION.md** - Implementación frontend detallada

---

## ✅ Estado Final

**Implementación:** 100% Completa
**S3 Integration:** ✅ Funcionando
**PDF Viewer:** ✅ Funcionando
**Controles:** ✅ Todos operativos
**Documentación:** ✅ Completa

**Last Updated:** 2025-01-11
**Status:** Production Ready ✅
