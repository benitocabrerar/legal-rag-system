# Guía de Implementación S3 para Visor de PDF

## 📋 Resumen

Esta guía proporciona el código completo y paso a paso para implementar AWS S3 como sistema de almacenamiento para los PDFs de documentos legales.

## 🔧 Paso 1: Instalar Dependencias

```bash
cd C:\Users\benito\poweria\legal
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## 🔐 Paso 2: Configurar Variables de Entorno

**Archivo:** `.env`

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=poweria-legal-documents

# S3 Configuration
S3_UPLOAD_FOLDER=legal-documents/
S3_PRESIGNED_URL_EXPIRY=3600
```

## 📦 Paso 3: Crear Servicio S3

**Archivo nuevo:** `C:\Users\benito\poweria\legal\src\services\s3-service.ts`

```typescript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.bucket = process.env.AWS_S3_BUCKET!;

    if (!this.bucket) {
      throw new Error('AWS_S3_BUCKET environment variable is required');
    }
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string = 'application/pdf'
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Make file private - access via presigned URLs only
      ACL: 'private',
      // Add metadata
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);

    return key;
  }

  /**
   * Get a presigned URL for downloading a file
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn
    });

    return url;
  }

  /**
   * Check if a file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
  }> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
    };
  }

  /**
   * Generate S3 key for legal document
   */
  generateDocumentKey(documentId: string, filename: string): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${process.env.S3_UPLOAD_FOLDER || 'legal-documents/'}${documentId}/${timestamp}-${sanitizedFilename}`;
  }
}
```

## 🔄 Paso 4: Modificar Endpoint de Upload

**Archivo:** `C:\Users\benito\poweria\legal\src\routes\legal-documents-v2.ts`

**Importar el servicio:**
```typescript
import { S3Service } from '../services/s3-service';
```

**Modificar el endpoint POST:**
```typescript
fastify.post('/legal-documents-v2', {
  onRequest: [fastify.authenticate],
}, async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const user = request.user as any;

    // Check admin permission
    if (user.role !== 'admin') {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Only administrators can create legal documents',
      });
    }

    let documentData: any;

    // Handle multipart file upload
    if (request.isMultipart()) {
      const parts = request.parts();
      const formData: any = {};
      let fileBuffer: Buffer | null = null;
      let filename: string | null = null;

      // Process all parts
      for await (const part of parts) {
        if (part.type === 'file') {
          fileBuffer = await part.toBuffer();
          filename = part.filename;
        } else {
          formData[part.fieldname] = (part as any).value;
        }
      }

      if (!fileBuffer || !filename) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No file provided',
        });
      }

      // Extract text from PDF (existing code)
      let extractedText: string;
      try {
        const pdfExtract = new PDFExtract();
        const pdfData = await pdfExtract.extractBuffer(fileBuffer);

        extractedText = pdfData.pages
          .map(page => page.content.map(item => item.str).join(' '))
          .join('\n');

        if (!extractedText || extractedText.trim().length === 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Could not extract text from PDF.',
          });
        }
      } catch (pdfError: any) {
        fastify.log.error('PDF parsing error:', pdfError);
        return reply.code(400).send({
          error: 'Bad Request',
          message: `Failed to parse PDF: ${pdfError.message}`,
        });
      }

      // ====== NUEVA INTEGRACIÓN S3 ======

      // Initialize S3 service
      const s3Service = new S3Service();

      // Create document first to get ID
      const tempDocument = await prisma.legalDocument.create({
        data: {
          normType: formData.norm_type,
          normTitle: formData.norm_title,
          legalHierarchy: formData.legal_hierarchy,
          publicationType: formData.publication_type,
          publicationNumber: formData.publication_number,
          publicationDate: formData.publication_date
            ? new Date(formData.publication_date)
            : undefined,
          lastReformDate: formData.last_reform_date
            ? new Date(formData.last_reform_date)
            : undefined,
          documentState: formData.document_state || 'ORIGINAL',
          jurisdiction: formData.jurisdiction || 'NACIONAL',
          content: extractedText,
          uploadedBy: user.id,
          metadata: {
            totalPages: pdfData.pages.length,
            fileSizeMB: (fileBuffer.length / 1024 / 1024).toFixed(2),
            uploadedBy: user.name || user.email,
            uploadedByEmail: user.email,
            originalFilename: filename,
          },
        },
      });

      // Upload to S3
      let s3Key: string;
      try {
        s3Key = s3Service.generateDocumentKey(tempDocument.id, filename);
        await s3Service.uploadFile(s3Key, fileBuffer, 'application/pdf');

        fastify.log.info(`File uploaded to S3: ${s3Key}`);
      } catch (s3Error: any) {
        // Rollback document creation if S3 upload fails
        await prisma.legalDocument.delete({ where: { id: tempDocument.id } });

        fastify.log.error('S3 upload error:', s3Error);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to upload file to storage',
        });
      }

      // Update document with S3 key
      const document = await prisma.legalDocument.update({
        where: { id: tempDocument.id },
        data: {
          metadata: {
            ...tempDocument.metadata as any,
            s3Key: s3Key,
            s3Bucket: process.env.AWS_S3_BUCKET,
            storageProvider: 's3',
          },
        },
      });

      // Continue with chunking and embedding generation...
      // (existing code for chunking)

      return reply.code(201).send({
        success: true,
        message: 'Legal document uploaded and processed successfully',
        document,
        vectorization: {
          // ... vectorization results
        },
      });
    }

    // Handle non-multipart requests (existing code)
    // ...
  } catch (error: any) {
    fastify.log.error(error);
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});
```

## 📥 Paso 5: Implementar Endpoint de Descarga

**Reemplazar el endpoint GET /legal-documents-v2/:id/file:**

```typescript
fastify.get('/legal-documents-v2/:id/file', {
  onRequest: [fastify.authenticate],
}, async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };

    // Get document metadata
    const document = await prisma.legalDocument.findUnique({
      where: { id },
      select: {
        id: true,
        normTitle: true,
        metadata: true,
      },
    });

    if (!document) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Legal document not found',
      });
    }

    // Extract S3 key from metadata
    const metadata = document.metadata as any;
    const s3Key = metadata?.s3Key;

    if (!s3Key) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Document file not found in storage',
      });
    }

    // Initialize S3 service
    const s3Service = new S3Service();

    // Check if file exists
    const exists = await s3Service.fileExists(s3Key);

    if (!exists) {
      fastify.log.error(`S3 file not found: ${s3Key}`);
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Document file not found in storage',
      });
    }

    // Generate presigned URL (valid for 1 hour)
    const expiresIn = parseInt(process.env.S3_PRESIGNED_URL_EXPIRY || '3600', 10);
    const presignedUrl = await s3Service.getPresignedDownloadUrl(s3Key, expiresIn);

    // Increment view count
    await prisma.legalDocument.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // Redirect to presigned URL
    return reply.redirect(presignedUrl);
  } catch (error: any) {
    fastify.log.error(error);
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});
```

## 🗑️ Paso 6: Modificar Endpoint de Delete

**Actualizar el endpoint DELETE:**

```typescript
fastify.delete('/legal-documents-v2/:id', {
  onRequest: [fastify.authenticate],
}, async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const user = request.user as any;
    const { id } = request.params as { id: string };

    // Check admin permission
    if (user.role !== 'admin') {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Only administrators can delete legal documents',
      });
    }

    // Get document to get S3 key
    const document = await prisma.legalDocument.findUnique({
      where: { id },
      select: { metadata: true },
    });

    if (!document) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Legal document not found',
      });
    }

    // Delete from S3
    const metadata = document.metadata as any;
    const s3Key = metadata?.s3Key;

    if (s3Key) {
      try {
        const s3Service = new S3Service();
        await s3Service.deleteFile(s3Key);
        fastify.log.info(`Deleted S3 file: ${s3Key}`);
      } catch (s3Error: any) {
        // Log error but continue with database deletion
        fastify.log.error('S3 deletion error:', s3Error);
      }
    }

    // Delete from database (soft delete)
    await prisma.legalDocument.update({
      where: { id },
      data: { isActive: false },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE_LEGAL_DOCUMENT',
        entity: 'LegalDocument',
        entityId: id,
        success: true,
      },
    });

    return reply.send({
      success: true,
      message: 'Legal document deleted successfully',
    });
  } catch (error: any) {
    fastify.log.error(error);
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});
```

## 🪣 Paso 7: Configurar Bucket S3 en AWS Console

### 7.1 Crear Bucket

1. Ir a AWS Console > S3
2. Click "Create bucket"
3. Nombre: `poweria-legal-documents`
4. Region: `us-east-1` (o la de tu preferencia)
5. **Block all public access:** ✅ Activado
6. **Versioning:** Opcional (recomendado para producción)
7. **Encryption:** AES-256 (SSE-S3)
8. Click "Create bucket"

### 7.2 Configurar CORS

En el bucket > Permissions > CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://tu-dominio-produccion.com"
    ],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3000
  }
]
```

### 7.3 Configurar Lifecycle (Opcional)

Para limpiar uploads incompletos:

```json
{
  "Rules": [
    {
      "Id": "DeleteIncompleteUploads",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
```

## 🔐 Paso 8: Crear Usuario IAM

### 8.1 Crear Usuario

1. AWS Console > IAM > Users
2. Click "Add users"
3. Nombre: `poweria-legal-s3-user`
4. Access type: **Programmatic access** ✅
5. Next

### 8.2 Crear Política Personalizada

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LegalDocumentsS3Access",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::poweria-legal-documents",
        "arn:aws:s3:::poweria-legal-documents/*"
      ]
    }
  ]
}
```

### 8.3 Guardar Credenciales

Copiar:
- Access Key ID
- Secret Access Key

**⚠️ IMPORTANTE:** Guardar en lugar seguro, no se podrán ver de nuevo.

## ✅ Paso 9: Probar Integración

### 9.1 Test de Upload

```bash
cd C:\Users\benito\poweria\legal

# Crear archivo de test
node scripts/test-s3-upload.js
```

**Archivo:** `scripts/test-s3-upload.js`

```javascript
const { S3Service } = require('../dist/services/s3-service');
const fs = require('fs');

async function testUpload() {
  const s3Service = new S3Service();

  // Read a test PDF
  const buffer = fs.readFileSync('./test-document.pdf');

  try {
    const key = s3Service.generateDocumentKey('test-id', 'test-document.pdf');
    await s3Service.uploadFile(key, buffer);

    console.log('✅ Upload successful!');
    console.log('Key:', key);

    // Test download URL
    const url = await s3Service.getPresignedDownloadUrl(key);
    console.log('Download URL:', url);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testUpload();
```

### 9.2 Test de Download

En el frontend, abrir modal de edición y verificar:

1. PDF carga correctamente
2. Controles funcionan
3. URL en Network tab es presigned URL de S3

## 🚨 Troubleshooting

### Error: Access Denied

**Causa:** Permisos IAM incorrectos

**Solución:**
1. Verificar política IAM incluye todas las acciones necesarias
2. Verificar ARN del bucket es correcto
3. Verificar credenciales en `.env`

### Error: CORS

**Causa:** CORS no configurado en bucket

**Solución:**
1. Configurar CORS según Paso 7.2
2. Agregar dominio correcto en `AllowedOrigins`
3. Reiniciar navegador para limpiar cache

### PDF no carga

**Causa:** URL presignada expiró

**Solución:**
1. Aumentar `S3_PRESIGNED_URL_EXPIRY` en `.env`
2. Refrescar página para generar nueva URL

### Error: Network Timeout

**Causa:** Archivos grandes + red lenta

**Solución:**
1. Configurar timeout en S3Service:
```typescript
this.s3Client = new S3Client({
  region: process.env.AWS_REGION,
  requestHandler: {
    requestTimeout: 30000, // 30 segundos
  },
});
```

## 📊 Monitoreo

### CloudWatch Metrics

Monitorear:
- `NumberOfObjects`: Total de archivos
- `BucketSizeBytes`: Tamaño total
- `AllRequests`: Requests por minuto
- `4xxErrors`: Errores de cliente
- `5xxErrors`: Errores de servidor

### Logs

Habilitar S3 Access Logs:
1. Bucket > Properties > Server access logging
2. Target bucket: `poweria-logs`
3. Target prefix: `s3-access/`

## 💰 Optimización de Costos

### Storage Classes

Para documentos de archivo:

```typescript
const command = new PutObjectCommand({
  Bucket: this.bucket,
  Key: key,
  Body: buffer,
  StorageClass: 'INTELLIGENT_TIERING', // Automático
  // O
  StorageClass: 'GLACIER_INSTANT_RETRIEVAL', // Más barato
});
```

### Lifecycle Policies

Mover a Glacier después de 90 días:

```json
{
  "Rules": [
    {
      "Id": "MoveToGlacier",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

## ✅ Checklist Final

- [ ] Instalar @aws-sdk/client-s3 y @aws-sdk/s3-request-presigner
- [ ] Configurar variables de entorno AWS
- [ ] Crear S3Service
- [ ] Modificar endpoint POST para upload a S3
- [ ] Implementar endpoint GET para download desde S3
- [ ] Actualizar endpoint DELETE para eliminar de S3
- [ ] Crear bucket S3 en AWS
- [ ] Configurar CORS en bucket
- [ ] Crear usuario IAM con permisos
- [ ] Probar upload
- [ ] Probar download/visualización
- [ ] Configurar CloudWatch monitoring
- [ ] Documentar para equipo

---

**Última actualización:** 2025-11-11
**Autor:** Claude Code (Anthropic)
