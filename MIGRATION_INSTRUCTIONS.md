# Database Migration Instructions

## 🚨 CRITICAL STEP: Update Build Command in Render

The database migrations are ready but have NOT been applied yet. You need to update the Build Command in Render Dashboard to automatically run migrations on each deployment.

### Steps to Update Build Command:

1. **Open Render Dashboard:**
   - Go to: https://dashboard.render.com/web/srv-d46ibnfdiees73crug50/settings

2. **Find Build Command Section:**
   - Scroll down to the "Build & Deploy" section
   - Look for the "Build Command" field

3. **Update the Build Command:**
   - **Current Command:**
     ```
     npm install && npx prisma generate
     ```

   - **New Command (Copy this):**
     ```
     npm install && npx prisma generate && npx prisma migrate deploy
     ```

4. **Save Changes:**
   - Click the "Save Changes" button at the bottom
   - This will trigger a new deployment automatically

5. **Verify Deployment:**
   - Wait for the deployment to complete (usually 2-3 minutes)
   - Check the deployment logs to confirm migrations were applied
   - Look for messages like: "✔ Migrations applied successfully"

## Alternative: Manual Migration via Render Shell

If you prefer to run migrations manually without changing the build command:

1. Go to: https://dashboard.render.com/web/srv-d46ibnfdiees73crug50
2. Click on the "Shell" tab
3. Run:
   ```bash
   npx prisma migrate deploy
   ```
4. Wait for confirmation that migrations were applied

## What These Migrations Do:

The migrations will create the following tables in your PostgreSQL database:

- **users** - User accounts with authentication
- **cases** - Legal cases management
- **documents** - Case documents storage
- **document_chunks** - Document chunks with AI embeddings (stored as JSON)

## After Migrations Are Applied:

Once the migrations complete successfully, you can:
- Test user registration endpoint
- Upload documents with embeddings
- Use the RAG query system
- Access all API endpoints

## Current Status:

✅ Migration files created and committed
✅ Code deployed to production
❌ **Migrations NOT yet applied to database**
⏳ Waiting for buildCommand update

## Next Step:

**Update the buildCommand in Render Dashboard NOW to complete the setup!**

---

Generated with Claude Code on 2025-11-06
