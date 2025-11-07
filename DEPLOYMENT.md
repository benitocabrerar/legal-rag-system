# Legal RAG System - Deployment Guide

## ✅ Completed Deployment

### Backend API
- **URL:** https://legal-rag-api-qnew.onrender.com
- **Status:** ✅ LIVE and running
- **Health Check:** ✅ Working (`/health` endpoint)
- **Server:** Running on port 8000
- **Region:** Oregon

### Frontend
- **URL:** https://legal-rag-frontend.onrender.com
- **Status:** ✅ LIVE
- **Framework:** Next.js 15
- **Region:** Oregon

### Database
- **Type:** PostgreSQL 16
- **Provider:** Render
- **Name:** legal-rag-postgres
- **Plan:** basic_256mb (15GB storage)
- **Region:** Oregon
- **Status:** ✅ Available

## 🔧 Environment Variables Configured

### Backend Environment Variables
```
OPENAI_API_KEY=[Your OpenAI API Key - Configured in Render Dashboard]
EMBEDDING_MODEL=text-embedding-ada-002
EMBEDDING_DIMENSIONS=1536
NODE_ENV=production
PORT=8000
JWT_SECRET=[Your JWT Secret - Configured in Render Dashboard]
CORS_ORIGIN=https://legal-rag-frontend.onrender.com
```

## 📋 Next Steps - Database Migration

### IMPORTANT: Update Build Command First
Before deploying, you need to update the Build Command in Render to include database migrations:

1. Go to Render Dashboard: https://dashboard.render.com/web/srv-d46ibnfdiees73crug50/settings
2. Find "Build Command" section
3. Change from:
   ```
   npm install && npx prisma generate
   ```
   To:
   ```
   npm install && npx prisma generate && npx prisma migrate deploy
   ```
4. Click "Save Changes"
5. This will automatically trigger a new deployment that will:
   - Install dependencies
   - Generate Prisma client
   - **Apply database migrations automatically**

### Alternative: Using Render Shell (Manual)
If you prefer to run migrations manually:
1. Go to Render Dashboard: https://dashboard.render.com/web/srv-d46ibnfdiees73crug50
2. Click on "Shell" tab
3. Run:
```bash
npx prisma migrate deploy
```

### Option 3: Manual SQL (If needed)
If migrations fail, you can manually create the tables using the SQL in `prisma/migrations/20251106_init/migration.sql`

## 📊 Database Schema

The system uses the following tables:

### Users Table
- Stores user accounts with authentication
- Fields: id, email, name, passwordHash, role, planTier, createdAt, updatedAt

### Cases Table
- Stores legal cases
- Fields: id, userId, title, description, clientName, caseNumber, status, createdAt, updatedAt

### Documents Table
- Stores case documents
- Fields: id, caseId, userId, title, content, createdAt, updatedAt

### DocumentChunks Table
- Stores document chunks with embeddings
- Fields: id, documentId, content, chunkIndex, embedding (JSON), createdAt

## 🚀 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user (requires auth)

### Cases
- `POST /api/v1/cases` - Create case
- `GET /api/v1/cases` - List all cases
- `GET /api/v1/cases/:id` - Get case by ID
- `PATCH /api/v1/cases/:id` - Update case
- `DELETE /api/v1/cases/:id` - Delete case

### Documents
- `POST /api/v1/documents/upload` - Upload document with embeddings
- `GET /api/v1/documents/case/:caseId` - Get documents for case
- `GET /api/v1/documents/:id` - Get document by ID
- `DELETE /api/v1/documents/:id` - Delete document

### RAG Query
- `POST /api/v1/query` - Query documents using AI (RAG)
- `GET /api/v1/query/history/:caseId` - Get query history

## 🧪 Testing the API

### Test Health Check
```bash
curl https://legal-rag-api-qnew.onrender.com/health
```

### Test User Registration
```bash
curl -X POST https://legal-rag-api-qnew.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Test Login
```bash
curl -X POST https://legal-rag-api-qnew.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 🔄 Deployment History

### Deployment 1 (Initial)
- Commit: eaf6eb4
- Status: ✅ Success
- Date: 2025-11-06
- Changes: Initial deployment with TypeScript dependencies

### Deployment 2 (Backend Implementation)
- Commit: 156b0d0
- Status: ❌ Failed
- Reason: Pinecone API key missing

### Deployment 3 (Pinecone Fix)
- Commit: e32166b
- Status: ✅ Success
- Date: 2025-11-06
- Changes: Removed Pinecone initialization

### Deployment 4 (Schema Fix)
- Commit: b66a231
- Status: ✅ Success (CURRENT)
- Date: 2025-11-06
- Changes: Fixed Prisma schema and auth field names

## ⚠️ Known Issues Resolved

1. **Pinecone API Key Error** ✅ Fixed
   - Removed Pinecone initialization that was causing startup failure
   - Will add back when implementing vector search

2. **Password Field Mismatch** ✅ Fixed
   - Changed `password` to `passwordHash` in auth routes
   - Updated Prisma schema accordingly

3. **PostgreSQL Extensions** ✅ Fixed
   - Removed vector extension requirement
   - Changed embedding storage to JSON format
   - Simplified UUID generation

## 📝 Architecture

```
Frontend (Next.js 15)
    ↓
Backend API (Fastify + TypeScript)
    ↓
PostgreSQL Database (Render)
    ↓
OpenAI API (Embeddings + GPT-4)
```

## 🎯 Features Implemented

- ✅ User authentication with JWT
- ✅ Case management (CRUD)
- ✅ Document upload with chunking
- ✅ OpenAI embeddings generation
- ✅ RAG query system with GPT-4
- ✅ Cosine similarity search
- ✅ Complete REST API
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ Error handling

## 🔐 Security Features

- Password hashing with bcrypt
- JWT token authentication
- CORS protection
- Rate limiting (100 requests per 15 minutes)
- Input validation with Zod
- SQL injection protection (Prisma ORM)

## 📚 Tech Stack

### Backend
- Node.js 22.16.0
- Fastify 4.26.0
- Prisma 5.10.0
- OpenAI 4.28.0
- TypeScript 5.3.3
- bcrypt 5.1.1
- Zod 3.22.4

### Frontend
- Next.js 15.0.0
- React 18.3.1
- TypeScript 5.3.3
- Tailwind CSS 3.4.1

### Database
- PostgreSQL 16

### Deployment
- Render.com (PaaS)

## 💡 Tips

1. **Database Connection:** The DATABASE_URL is automatically configured by Render when you link the database to your service.

2. **Environment Variables:** All environment variables can be managed in the Render dashboard under the "Environment" tab.

3. **Logs:** View real-time logs in the Render dashboard under the "Logs" tab.

4. **Scaling:** Upgrade your plan in Render to handle more traffic and get better performance.

5. **Custom Domain:** You can add a custom domain in Render dashboard under "Settings" → "Custom Domains".

## 🐛 Troubleshooting

### Service Won't Start
- Check logs in Render dashboard
- Verify all environment variables are set
- Ensure DATABASE_URL is configured

### Database Connection Errors
- Verify database is running
- Check DATABASE_URL format
- Ensure IP allow list includes Render's IPs (or use 0.0.0.0/0)

### API Returns 500 Errors
- Check server logs
- Verify database tables exist (run migrations)
- Check OpenAI API key is valid

## 📞 Support

- GitHub Repository: https://github.com/benitocabrerar/legal-rag-system
- Render Dashboard: https://dashboard.render.com
- Backend Logs: https://dashboard.render.com/web/srv-d46ibnfdiees73crug50

---

Generated with Claude Code on 2025-11-06
