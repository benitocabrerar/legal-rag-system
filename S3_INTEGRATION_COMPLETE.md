# S3 Integration - Implementation Complete

## Overview

The S3 integration has been successfully implemented for the PDF viewer system. This document covers the complete implementation, configuration, and testing procedures.

## Files Modified/Created

### 1. S3 Service - `src/services/s3-service.ts` (NEW)

A comprehensive S3 service class that handles all file operations:

**Features:**
- Upload PDF files to S3 with automatic key generation
- Generate presigned URLs for secure file downloads (1-hour expiration)
- Delete files from S3
- Check file existence
- Retrieve file metadata
- Singleton pattern for service instance

**Key Methods:**
```typescript
uploadFile(documentId, filename, fileBuffer, metadata) -> UploadResult
getDownloadUrl(key, expiresIn, filename) -> DownloadUrlResult
deleteFile(key) -> boolean
fileExists(key) -> boolean
getFileMetadata(key) -> FileMetadata
```

### 2. Legal Documents Routes - `src/routes/legal-documents-v2.ts` (MODIFIED)

**Changes:**

#### Import Added (Line 5):
```typescript
import { getS3Service } from '../services/s3-service';
```

#### POST /legal-documents-v2 (Lines 126-161):
- After creating document in database, upload PDF to S3
- Store S3 key, bucket, file size in document metadata
- Graceful error handling (doesn't fail request if S3 upload fails)
- Logs S3 upload success/failure

#### GET /legal-documents-v2/:id/file (Lines 410-473):
- Retrieve document metadata to get S3 key
- Generate presigned URL from S3 (1-hour expiration)
- Redirect browser to presigned URL
- Comprehensive error handling for missing files

#### DELETE /legal-documents-v2/:id (Lines 362-438):
- Retrieve S3 key before soft-deleting document
- Delete file from S3
- Graceful error handling (doesn't fail if S3 delete fails)
- Creates audit log

### 3. Environment Variables - `.env.example` (MODIFIED)

Added AWS_REGION to the AWS configuration section:
```env
# AWS S3 para documentos
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="legal-rag-documents"
```

## Dependencies Installed

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Packages:**
- `@aws-sdk/client-s3` - AWS SDK v3 S3 client
- `@aws-sdk/s3-request-presigner` - Presigned URL generation

## AWS Configuration Required

### 1. Create S3 Bucket

```bash
Bucket name: legal-rag-documents (or as specified in .env)
Region: us-east-1 (or as specified in .env)
Block all public access: ENABLED
Versioning: OPTIONAL
Encryption: AES-256 (automatic)
```

### 2. Configure CORS Policy

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://your-production-domain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### 3. Create IAM User

1. Create new IAM user: `legal-documents-uploader`
2. Attach inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::legal-rag-documents/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::legal-rag-documents"
    }
  ]
}
```

3. Generate access keys
4. Add to `.env` file

### 4. Environment Variables (.env)

```env
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="legal-rag-documents"
```

## How It Works

### Upload Flow

1. User uploads PDF through frontend
2. Backend receives multipart file upload
3. PDF text is extracted for vectorization
4. Document record created in database
5. **PDF uploaded to S3** with path: `legal-documents/{documentId}/{timestamp}_{filename}`
6. S3 key stored in document metadata:
   ```json
   {
     "s3Key": "legal-documents/abc-123/1699999999_documento.pdf",
     "s3Bucket": "legal-rag-documents",
     "fileSize": 1234567,
     "originalFilename": "documento.pdf"
   }
   ```

### Download Flow

1. Frontend requests PDF via: `GET /legal-documents-v2/{id}/file`
2. Backend retrieves document from database
3. Extracts S3 key from metadata
4. **Generates presigned URL** (valid for 1 hour)
5. **Redirects browser** to presigned URL
6. Browser downloads directly from S3

### Delete Flow

1. Admin deletes document
2. Backend retrieves S3 key from metadata
3. Soft-deletes document in database (sets isActive = false)
4. **Deletes file from S3**
5. Creates audit log

## Presigned URLs

Presigned URLs provide **secure, temporary access** to private S3 objects:

- **Security:** No AWS credentials exposed to frontend
- **Expiration:** URLs expire after 1 hour
- **Performance:** Direct download from S3 (no backend proxy)
- **Bandwidth:** Saves backend bandwidth

Example presigned URL:
```
https://legal-rag-documents.s3.us-east-1.amazonaws.com/legal-documents/abc-123/1699999999_documento.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...&X-Amz-Expires=3600&X-Amz-Signature=...
```

## Testing Procedures

### 1. Local Development Testing

```bash
# 1. Add AWS credentials to .env
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="legal-rag-documents"

# 2. Start backend
npm run dev

# 3. Start frontend
cd frontend
npm run dev

# 4. Test upload
# - Navigate to http://localhost:3000/admin/legal-library
# - Click "Upload Document"
# - Select PDF file
# - Fill form and submit
# - Check backend logs for "PDF uploaded to S3: ..."

# 5. Test viewer
# - Click "Edit" on uploaded document
# - PDF should load in left panel
# - Check Network tab for redirect to S3 presigned URL

# 6. Test delete
# - Click "Delete" on document
# - Check backend logs for "Deleted file from S3: ..."
```

### 2. Verify S3 Upload

```bash
# Using AWS CLI
aws s3 ls s3://legal-rag-documents/legal-documents/ --recursive

# Expected output:
# 2025-01-11 10:30:45   1234567 legal-documents/abc-123/1699999999_documento.pdf
```

### 3. Test Presigned URL Generation

```bash
# Manual test with curl
curl -I "http://localhost:3001/legal-documents-v2/{document-id}/file" \
  -H "Authorization: Bearer {your-jwt-token}"

# Expected: 302 redirect to S3 presigned URL
```

### 4. Verify File Download

```bash
# Click "Download" button in PDF viewer
# Or visit presigned URL directly
# File should download with correct filename
```

## Error Handling

### S3 Upload Failures

**Behavior:** Upload errors are logged but don't fail the entire request

**Reasons:**
- Document is already created in database
- Text extraction and vectorization complete
- User can re-upload file later

**Error Messages:**
```typescript
fastify.log.error('S3 upload failed:', s3Error);
// Document still created, but metadata.s3Key will be missing
```

### S3 Download Failures

**Behavior:** Returns appropriate HTTP error codes

**Scenarios:**
- `404` - Document not found in database
- `404` - S3 key not in metadata (file never uploaded)
- `500` - S3 service error (permissions, network, etc.)

### S3 Delete Failures

**Behavior:** Document is soft-deleted even if S3 delete fails

**Reasons:**
- File may have been manually deleted
- Bucket may be inaccessible
- User can manually clean up S3 later

## Security Considerations

### 1. Private Bucket
- All files stored in private bucket (no public access)
- Access only via presigned URLs

### 2. Authentication Required
- All endpoints require JWT authentication
- Only admins can upload/delete files
- All users can view files (if authenticated)

### 3. Presigned URL Expiration
- URLs expire after 1 hour
- No permanent public access
- New URL generated on each request

### 4. Encryption
- Server-side encryption (AES-256) enabled
- Files encrypted at rest in S3

### 5. IAM Least Privilege
- Service account has minimal permissions
- Only GetObject, PutObject, DeleteObject on specific bucket

### 6. Audit Logging
- All delete operations logged to audit_log table
- Includes user ID, timestamp, and document ID

## Cost Considerations

### S3 Storage Costs
- **Storage:** $0.023 per GB/month (standard tier)
- **PUT requests:** $0.005 per 1,000 requests
- **GET requests:** $0.0004 per 1,000 requests
- **Data transfer out:** $0.09 per GB (first 10 TB/month)

### Example Monthly Cost (1000 documents)
```
Storage:     1000 docs × 2 MB/doc = 2 GB × $0.023 = $0.046
PUT:         1000 uploads × $0.005/1000 = $0.005
GET:         10,000 views × $0.0004/1000 = $0.004
Transfer:    10,000 views × 2 MB = 20 GB × $0.09 = $1.80
─────────────────────────────────────────────────────────
TOTAL:                                         ~$1.86/month
```

## Monitoring

### CloudWatch Metrics to Monitor
- **Bucket Size:** Total storage used
- **Request Count:** 4xx/5xx errors
- **Data Transfer:** Outbound bandwidth
- **Cost Explorer:** Daily/monthly costs

### Backend Logs to Monitor
```bash
# Successful uploads
"PDF uploaded to S3: legal-documents/abc-123/... (1234567 bytes)"

# Upload failures
"S3 upload failed: ..."

# Successful downloads
"S3 download url generated for: ..."

# Download failures
"S3 download error: ..."

# Successful deletes
"Deleted file from S3: legal-documents/abc-123/..."
```

## Troubleshooting

### Error: "AWS_REGION environment variable is required"
**Solution:** Add `AWS_REGION` to `.env` file

### Error: "AWS_S3_BUCKET environment variable is required"
**Solution:** Add `AWS_S3_BUCKET` to `.env` file

### Error: "The security token included in the request is invalid"
**Solution:** Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

### Error: "Access Denied" during upload
**Solution:** Verify IAM user has `s3:PutObject` permission

### Error: "Access Denied" during download
**Solution:** Verify IAM user has `s3:GetObject` permission

### Error: CORS error in browser
**Solution:** Configure CORS policy in S3 bucket settings

### PDF doesn't load in viewer
**Checklist:**
1. Check document has `s3Key` in metadata
2. Verify file exists in S3 bucket
3. Check presigned URL expiration (regenerate if expired)
4. Verify browser Network tab for 302 redirect
5. Check S3 CORS configuration

## Migration from Existing System

If you have existing PDFs stored elsewhere:

### Option 1: Bulk Upload to S3

```typescript
// migration-script.ts
import { PrismaClient } from '@prisma/client';
import { getS3Service } from './src/services/s3-service';
import * as fs from 'fs';

const prisma = new PrismaClient();
const s3Service = getS3Service();

async function migrateDocuments() {
  const documents = await prisma.legalDocument.findMany({
    where: {
      metadata: {
        path: { not: { equals: undefined } }
      }
    }
  });

  for (const doc of documents) {
    const metadata = doc.metadata as any;
    const oldPath = metadata.path;

    if (!oldPath || !fs.existsSync(oldPath)) {
      console.log(`Skip ${doc.id}: file not found`);
      continue;
    }

    try {
      const fileBuffer = fs.readFileSync(oldPath);
      const filename = oldPath.split('/').pop() || 'document.pdf';

      const uploadResult = await s3Service.uploadFile(
        doc.id,
        filename,
        fileBuffer,
        {
          normTitle: doc.normTitle,
          normType: doc.normType,
          migratedFrom: oldPath,
        }
      );

      await prisma.legalDocument.update({
        where: { id: doc.id },
        data: {
          metadata: {
            ...metadata,
            s3Key: uploadResult.key,
            s3Bucket: uploadResult.bucket,
            fileSize: uploadResult.size,
            originalFilename: filename,
            migratedAt: new Date().toISOString(),
          },
        },
      });

      console.log(`✅ Migrated ${doc.id}: ${uploadResult.key}`);

      // Optional: delete old file
      // fs.unlinkSync(oldPath);
    } catch (error) {
      console.error(`❌ Failed ${doc.id}:`, error);
    }
  }
}

migrateDocuments();
```

### Option 2: Lazy Migration

Documents are migrated to S3 on first access:
- Keep old files in place
- On PDF viewer access, check if S3 key exists
- If not, upload to S3 and update metadata
- Delete old file after successful upload

## Performance Optimization

### 1. CloudFront CDN (Optional)

Add CloudFront distribution in front of S3:
- **Faster downloads** worldwide
- **Lower S3 costs** (CloudFront data transfer cheaper)
- **Caching** at edge locations

### 2. S3 Transfer Acceleration (Optional)

Enable for faster uploads from distant regions:
```typescript
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  useAccelerateEndpoint: true,
});
```

### 3. Multipart Upload (For large files)

For PDFs > 100 MB, use multipart upload:
```typescript
import { Upload } from '@aws-sdk/lib-storage';

const upload = new Upload({
  client: s3Client,
  params: {
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
  },
});

await upload.done();
```

## Backup and Disaster Recovery

### S3 Versioning

Enable versioning on bucket:
- Protects against accidental deletion
- Keeps history of all changes
- Allows rollback to previous versions

### Cross-Region Replication

For production:
- Replicate to secondary region
- Automatic failover capability
- Disaster recovery protection

### Database Backup

Metadata is in PostgreSQL:
- S3 keys stored in `metadata` JSONB column
- Regular database backups include S3 references
- Can rebuild S3 inventory from database

## Next Steps

1. **Configure AWS Credentials** in production `.env`
2. **Create S3 Bucket** with appropriate settings
3. **Set up IAM User** with minimal permissions
4. **Configure CORS** for production domain
5. **Test Upload/Download** in staging environment
6. **Monitor Logs** for errors during initial deployment
7. **Set up CloudWatch Alarms** for S3 errors
8. **Configure Backup** strategy

## Support

For issues or questions:
1. Check backend logs for S3 errors
2. Verify AWS credentials and permissions
3. Test S3 access with AWS CLI
4. Review CORS configuration
5. Check presigned URL expiration

---

**Status:** ✅ Implementation Complete
**Date:** 2025-01-11
**Version:** 1.0.0
**Author:** Claude Code (Anthropic)
