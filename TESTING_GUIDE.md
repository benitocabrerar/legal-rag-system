# Testing Guide - Automatic Document Analysis

## ✅ System Status

**Backend Deployment:** ✅ LIVE on Render
**URL:** https://legal-rag-api-qnew.onrender.com
**Database:** PostgreSQL on Render
**Redis:** Configured and ready
**Deployment ID:** dep-d496q6er433s73aeem4g
**Last Update:** 2025-11-10T22:55:51Z

## 🎯 Features to Test

### 1. Automatic Document Analysis & Vectorization

When a legal document is uploaded via the API, the system automatically:
- Extracts text from PDF
- Chunks the content intelligently
- Generates embeddings using OpenAI
- Stores vectors in Pinecone for semantic search
- Returns detailed vectorization status

## 📋 Testing Prerequisites

Before testing, ensure:

1. **Admin User Created**
   - Use Render database console to execute:
   ```sql
   INSERT INTO "User" (id, email, name, role, plan, "createdAt", "updatedAt")
   VALUES (
     gen_random_uuid(),
     'benitocabrerar@gmail.com',
     'Benito Cabrera',
     'admin',
     'team',
     NOW(),
     NOW()
   )
   ON CONFLICT (email) DO UPDATE
   SET role = 'admin', plan = 'team';
   ```

2. **Password Reset**
   - Go to frontend: https://legal-rag-frontend.onrender.com
   - Click "Forgot Password"
   - Enter: benitocabrerar@gmail.com
   - Create new password

3. **Get Authentication Token**
   ```bash
   # Login to get JWT token
   curl -X POST https://legal-rag-api-qnew.onrender.com/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "benitocabrerar@gmail.com",
       "password": "your-password"
     }'
   ```

   Save the `access_token` from the response.

## 🧪 Test 1: Upload Legal Document with Automatic Analysis

### API Endpoint
```
POST /api/v1/legal-documents-v2
```

### Request Example (using curl)

```bash
# Set your token
TOKEN="your-jwt-token-here"

# Upload a PDF document
curl -X POST https://legal-rag-api-qnew.onrender.com/api/v1/legal-documents-v2 \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@path/to/document.pdf" \
  -F "norm_type=Constitución" \
  -F "norm_title=Constitución del Ecuador" \
  -F "legal_hierarchy=Norma Suprema" \
  -F "publication_type=Registro Oficial" \
  -F "publication_number=449" \
  -F "publication_date=2008-10-20" \
  -F "document_state=Vigente" \
  -F "jurisdiction=Ecuador"
```

### Expected Response (Success)

```json
{
  "success": true,
  "message": "✅ Documento cargado y vectorizado correctamente. Se generaron 150 embeddings de 150 fragmentos. El documento está listo para búsquedas semánticas con IA.",
  "document": {
    "id": "uuid-here",
    "normType": "Constitución",
    "normTitle": "Constitución del Ecuador",
    "content": "extracted text...",
    "createdAt": "2025-11-10T...",
    // ... more fields
  },
  "vectorization": {
    "totalChunks": 150,
    "embeddingsGenerated": 150,
    "embeddingsFailed": 0,
    "successRate": "100%"
  }
}
```

### Expected Response (Partial Success)

```json
{
  "success": false,
  "message": "⚠️ Documento cargado pero la vectorización fue parcial. Se generaron 120 de 150 embeddings. 30 fragmentos NO tienen embeddings.",
  "warnings": [
    "30 fragmentos no pudieron ser vectorizados y solo estarán disponibles mediante búsqueda de texto.",
    "Para búsquedas óptimas con IA, se recomienda eliminar este documento y volver a subirlo.",
    "Si el problema persiste, verifique su configuración de API de OpenAI o contacte al administrador del sistema."
  ],
  "document": { /* ... */ },
  "vectorization": {
    "totalChunks": 150,
    "embeddingsGenerated": 120,
    "embeddingsFailed": 30,
    "successRate": "80%"
  }
}
```

## 🧪 Test 2: Verify Document Storage

### List All Documents
```bash
curl -X GET "https://legal-rag-api-qnew.onrender.com/api/v1/legal-documents-v2" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Single Document
```bash
curl -X GET "https://legal-rag-api-qnew.onrender.com/api/v1/legal-documents-v2/{document-id}" \
  -H "Authorization: Bearer $TOKEN"
```

## 🧪 Test 3: Query with AI (Semantic Search)

Once documents are uploaded and vectorized, test semantic search:

```bash
curl -X POST "https://legal-rag-api-qnew.onrender.com/api/v1/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "¿Cuáles son los derechos fundamentales en la constitución?",
    "maxResults": 5
  }'
```

Expected features:
- AI understands context and meaning
- Returns relevant sections even if exact words don't match
- Ranked by semantic similarity
- Includes source attribution

## 🔍 What to Verify

### ✅ Document Upload
- [ ] PDF is successfully parsed
- [ ] Text is extracted correctly
- [ ] Document metadata is saved
- [ ] No errors in response

### ✅ Automatic Vectorization
- [ ] Chunking happens automatically
- [ ] Embeddings are generated
- [ ] Success rate is reported
- [ ] Pinecone receives vectors

### ✅ Error Handling
- [ ] Invalid PDF format rejected
- [ ] Empty/image-only PDFs rejected
- [ ] Missing required fields reported
- [ ] Partial vectorization handled gracefully

### ✅ Semantic Search
- [ ] Queries work after upload
- [ ] Results are relevant
- [ ] AI understands context
- [ ] Performance is acceptable

## 📊 Monitoring Vectorization

### Check Database
```sql
-- Count documents
SELECT COUNT(*) FROM "LegalDocument";

-- Check chunking
SELECT COUNT(*) FROM "LegalDocumentChunk";

-- Verify embeddings exist
SELECT
  ld.norm_title,
  COUNT(ldc.id) as chunk_count,
  COUNT(ldc.embedding) as embeddings_count
FROM "LegalDocument" ld
LEFT JOIN "LegalDocumentChunk" ldc ON ld.id = ldc."legalDocumentId"
GROUP BY ld.id, ld.norm_title;
```

### Check Pinecone
- Log into Pinecone dashboard
- Verify index has vectors
- Check vector count matches database chunks

### Check Redis (Queue)
- Redis stores background job queue
- DocumentProcessor handles analysis jobs
- Check queue status if delays occur

## 🐛 Troubleshooting

### Issue: "Could not extract text from PDF"
**Cause:** PDF is image-based or corrupted
**Solution:** Use OCR-enabled PDF or convert images to text first

### Issue: "embeddingsFailed > 0"
**Possible Causes:**
1. OpenAI API rate limit hit
2. Invalid API key or insufficient quota
3. Content too long for embedding model
4. Network issues during embedding generation

**Solutions:**
1. Check OpenAI API key in Render environment variables
2. Verify OpenAI account has sufficient quota
3. Check backend logs in Render dashboard
4. Retry upload after some time

### Issue: "Connection to database failed"
**Cause:** Database suspended (free tier)
**Solution:**
1. Open Render dashboard
2. Go to Databases → legal-rag-postgres
3. Run any SQL query to wake it up
4. Wait 30-60 seconds
5. Retry upload

### Issue: "Unauthorized" error
**Cause:** Invalid or expired JWT token
**Solution:** Login again to get new token

## 📝 Sample Test Document

For testing, you can use the sample PDFs in:
```
node_modules/pdf-parse/test/data/01-valid.pdf
```

Or create a simple test PDF with legal content.

## 🎯 Success Criteria

The automatic document analysis feature is working correctly when:

1. ✅ PDF uploads without errors
2. ✅ Text extraction succeeds
3. ✅ Document is saved to database
4. ✅ Chunks are created automatically
5. ✅ Embeddings are generated (100% or acceptable %)
6. ✅ Vectors are stored in Pinecone
7. ✅ Semantic search returns relevant results
8. ✅ Response time is acceptable (< 30 seconds for typical document)

## 🚀 Next Steps

After successful testing:

1. **Upload Legal Library**
   - Constitución del Ecuador
   - Códigos principales (Civil, Penal, Trabajo, etc.)
   - Leyes relevantes
   - Reglamentos y decretos

2. **Test AI Query**
   - Verify semantic search quality
   - Test different query types
   - Validate result relevance

3. **Monitor Performance**
   - Track vectorization success rate
   - Monitor OpenAI API costs
   - Check response times

4. **Enable Enhanced Routes** (Future)
   - Fix nodemailer ES module issue
   - Re-enable legal-documents-enhanced
   - Add notification features

## 🔐 Security Notes

- JWT tokens expire after configured time
- Only admin users can upload documents
- API has rate limiting enabled
- Redis provides job queue resilience
- Database credentials are encrypted

## 📞 Support

If issues persist:
1. Check Render deployment logs
2. Verify environment variables
3. Test database connectivity
4. Check OpenAI API status
5. Review this guide for troubleshooting steps

---

**Last Updated:** November 10, 2025
**System Version:** 1.0
**Deployment:** Production on Render
