# 📋 Migration Deployment Guide
## Legal Documents System Enhancement - v2.0

---

## ⚠️ Important: Database Migration Required

The Prisma automatic migration failed due to connection timeouts with Render PostgreSQL. You need to **manually apply the migration** via Render's dashboard.

---

## 🔧 Manual Migration Steps

### Option 1: Via Render Dashboard (Recommended)

1. **Log into Render Dashboard**
   - Go to: https://dashboard.render.com
   - Navigate to your PostgreSQL database: `legal_rag_postgres`

2. **Open PostgreSQL Console**
   - Click on the database
   - Go to "Shell" tab or "Connect" section
   - Click "Connect" to open the PostgreSQL console

3. **Execute Migration SQL**
   - Copy the migration SQL from:
     `prisma/migrations/20251110_legal_document_enhancements/migration.sql`

   - Paste the entire content into the console
   - Execute the query

4. **Verify Migration**
   ```sql
   -- Check that new enums were created
   SELECT typname FROM pg_type WHERE typname IN ('NormType', 'LegalHierarchy', 'PublicationType', 'DocumentState', 'Jurisdiction');

   -- Check that new columns were added
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'legal_documents'
   AND column_name IN ('norm_type', 'norm_title', 'legal_hierarchy', 'publication_type');
   ```

### Option 2: Via Database Client (DBeaver, pgAdmin, etc.)

1. **Get Connection String**
   - From Render dashboard, copy the External Database URL
   - Format: `postgres://user:password@host:port/database`

2. **Connect with Your Client**
   - Import the connection string
   - Connect to the database

3. **Run Migration SQL**
   - Open the migration file:
     `prisma/migrations/20251110_legal_document_enhancements/migration.sql`
   - Execute it in your database client

### Option 3: Via Command Line (if connection is stable)

```bash
# From project root
cd "C:\Users\benito\poweria\legal"

# Try Prisma migrate deploy (may timeout)
npx prisma migrate deploy

# OR manually execute SQL via psql
# (Replace with your actual connection string)
psql "postgresql://user:pass@host:port/database" < prisma/migrations/20251110_legal_document_enhancements/migration.sql
```

---

## 📝 Migration Summary

### New Database Enums

1. **NormType** (14 values)
   - CONSTITUTIONAL_NORM
   - ORGANIC_LAW
   - ORDINARY_LAW
   - ORGANIC_CODE
   - ORDINARY_CODE
   - REGULATION_GENERAL
   - REGULATION_EXECUTIVE
   - ORDINANCE_MUNICIPAL
   - ORDINANCE_METROPOLITAN
   - RESOLUTION_ADMINISTRATIVE
   - RESOLUTION_JUDICIAL
   - ADMINISTRATIVE_AGREEMENT
   - INTERNATIONAL_TREATY
   - JUDICIAL_PRECEDENT

2. **LegalHierarchy** (10 values)
   - CONSTITUCION
   - TRATADOS_INTERNACIONALES_DDHH
   - LEYES_ORGANICAS
   - LEYES_ORDINARIAS
   - CODIGOS_ORGANICOS
   - CODIGOS_ORDINARIOS
   - REGLAMENTOS
   - ORDENANZAS
   - RESOLUCIONES
   - ACUERDOS_ADMINISTRATIVOS

3. **PublicationType** (5 values)
   - ORDINARIO
   - SUPLEMENTO
   - SEGUNDO_SUPLEMENTO
   - SUPLEMENTO_ESPECIAL
   - EDICION_CONSTITUCIONAL

4. **DocumentState** (2 values)
   - ORIGINAL
   - REFORMADO

5. **Jurisdiction** (4 values)
   - NACIONAL
   - PROVINCIAL
   - MUNICIPAL
   - INTERNACIONAL

### New Table Columns

- `norm_type` (required) - Tipo de Norma
- `norm_title` (required) - Título de la Norma
- `legal_hierarchy` (required) - Jerarquía Legal (replaces old category)
- `publication_type` (required) - Tipo de Publicación Registro Oficial
- `publication_number` (required) - Número de Publicación Registro Oficial
- `publication_date` (optional) - Fecha de Publicación
- `last_reform_date` (optional) - Fecha de última reforma
- `document_state` (default: ORIGINAL) - Estado del documento
- `jurisdiction` (default: NACIONAL) - Jurisdicción

### Backward Compatibility

- Old `title` column → kept as nullable
- Old `category` column → kept as nullable
- Existing data automatically migrated to new structure

### Performance Improvements

Six new indexes added:
- `legal_documents_norm_type_idx`
- `legal_documents_legal_hierarchy_idx`
- `legal_documents_jurisdiction_idx`
- `legal_documents_publication_type_idx`
- `legal_documents_document_state_idx`
- `legal_documents_publication_date_idx`

---

## ✅ Post-Migration Steps

1. **Regenerate Prisma Client** (Important!)
   ```bash
   cd "C:\Users\benito\poweria\legal"
   npx prisma generate
   ```

2. **Restart Backend Server**
   ```bash
   # If running locally
   npm run dev

   # If deployed on Render, trigger a redeploy from the dashboard
   ```

3. **Test the System**
   - Try uploading a new legal document via the admin panel
   - Verify all new fields are working
   - Check that vector search still functions

---

## 🐛 Troubleshooting

### Issue: "relation 'legal_documents' does not exist"
**Solution**: The migration hasn't been applied yet. Follow the manual steps above.

### Issue: "type 'NormType' does not exist"
**Solution**: The enum creation failed. Re-run the migration SQL.

### Issue: "column 'norm_type' does not exist"
**Solution**: The table alteration failed. Check migration logs and re-run.

### Issue: Frontend shows "Prisma Client" errors
**Solution**: Regenerate Prisma Client:
```bash
npx prisma generate
```

---

## 🔄 Rollback (If Needed)

If something goes wrong, you can rollback using this SQL:

```sql
-- Drop new indexes
DROP INDEX IF EXISTS "legal_documents_norm_type_idx";
DROP INDEX IF EXISTS "legal_documents_legal_hierarchy_idx";
DROP INDEX IF EXISTS "legal_documents_publication_type_idx";
DROP INDEX IF EXISTS "legal_documents_document_state_idx";
DROP INDEX IF EXISTS "legal_documents_publication_date_idx";
DROP INDEX IF EXISTS "legal_documents_jurisdiction_idx";

-- Drop new columns
ALTER TABLE "legal_documents"
  DROP COLUMN IF EXISTS "norm_type",
  DROP COLUMN IF EXISTS "norm_title",
  DROP COLUMN IF EXISTS "legal_hierarchy",
  DROP COLUMN IF EXISTS "publication_type",
  DROP COLUMN IF EXISTS "publication_number",
  DROP COLUMN IF EXISTS "publication_date",
  DROP COLUMN IF EXISTS "document_state",
  DROP COLUMN IF EXISTS "last_reform_date",
  DROP COLUMN IF EXISTS "jurisdiction";

-- Restore NOT NULL constraints on old fields
ALTER TABLE "legal_documents"
  ALTER COLUMN "title" SET NOT NULL,
  ALTER COLUMN "category" SET NOT NULL;

-- Drop new types
DROP TYPE IF EXISTS "NormType";
DROP TYPE IF EXISTS "LegalHierarchy";
DROP TYPE IF EXISTS "PublicationType";
DROP TYPE IF EXISTS "DocumentState";
DROP TYPE IF EXISTS "Jurisdiction";
```

---

## 📞 Support

If you encounter any issues during migration:
1. Check the Render logs for error messages
2. Verify database connection is stable
3. Ensure you have sufficient database permissions
4. Try the migration during off-peak hours (less connection load)

---

## 📊 Expected Impact

- **Existing Data**: Automatically migrated, no data loss
- **Downtime**: Minimal (< 30 seconds for migration execution)
- **Performance**: Improved due to new indexes
- **Compatibility**: Backward compatible with existing code
