# Database Setup Guide

## Local Development Setup

### 1. Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql-14 postgresql-contrib
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Install pgvector Extension

**macOS:**
```bash
brew install pgvector
```

**Ubuntu/Debian:**
```bash
sudo apt install postgresql-14-pgvector
```

**From source:**
```bash
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

### 3. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE legal_rag_dev;

# Connect to the new database
\c legal_rag_dev

# Create extensions
CREATE EXTENSION vector;
CREATE EXTENSION "uuid-ossp";
CREATE EXTENSION pg_trgm;

# Verify extensions
\dx
```

Or use the SQL script:
```bash
psql legal_rag_dev -f database/extensions.sql
```

### 4. Configure Environment

Update `.env` with your database connection string:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/legal_rag_dev"
```

### 5. Run Migrations

```bash
# Generate Prisma client
bun run prisma:generate

# Run migrations
bun run prisma:migrate

# (Optional) Open Prisma Studio to view database
bun run prisma:studio
```

## Render (Production) Setup

### 1. Create PostgreSQL Instance

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "PostgreSQL"
3. Configure:
   - Name: `legal-rag-postgres`
   - Database: `legal_rag_prod`
   - User: (auto-generated)
   - Region: Oregon (US West)
   - PostgreSQL Version: 14+
   - Plan: Starter ($7/mo) or Standard

### 2. Install pgvector Extension

After database is created, connect via `psql`:

```bash
# Get connection string from Render dashboard (External Connection String)
psql <EXTERNAL_CONNECTION_STRING>

# Run extensions script
\i database/extensions.sql
```

Or use Render's Web Shell:
1. Go to your PostgreSQL instance
2. Click "Shell" tab
3. Run:
```sql
CREATE EXTENSION vector;
CREATE EXTENSION "uuid-ossp";
CREATE EXTENSION pg_trgm;
```

### 3. Run Migrations

Set the `DATABASE_URL` environment variable in your backend service:

1. Go to your Web Service
2. Environment → Add `DATABASE_URL`
3. Use the **Internal Connection String** from PostgreSQL instance
4. Deploy to run migrations automatically

## Troubleshooting

### pgvector not found

**Error:** `extension "vector" is not available`

**Solution:**
```bash
# Verify pgvector is installed
pg_config --pkglibdir
ls $(pg_config --pkglibdir) | grep vector

# Reinstall if needed
brew reinstall pgvector  # macOS
sudo apt install postgresql-14-pgvector  # Linux
```

### Connection timeout

**Error:** `Connection timed out`

**Solution:**
- Verify PostgreSQL is running: `brew services list` or `sudo systemctl status postgresql`
- Check firewall settings
- On Render, use **Internal Connection String** for services in the same region

### Migration fails

**Error:** `Migration failed to apply`

**Solution:**
```bash
# Reset database (CAUTION: deletes all data)
bun run prisma migrate reset

# Or manually fix
bun run prisma:studio
# Make changes
bun run prisma migrate dev
```

## Common Commands

```bash
# Generate Prisma client
bun run prisma:generate

# Create a new migration
bun run prisma migrate dev --name migration_name

# Apply migrations in production
bun run prisma migrate deploy

# Reset database (dev only)
bun run prisma migrate reset

# Open Prisma Studio
bun run prisma:studio

# Seed database
bun run prisma:seed
```

## Indexes for Performance

The schema includes indexes on:
- `users.email` (unique)
- `cases.userId + status`
- `legal_document_chunks.documentId`
- Vector indexes using HNSW

To add custom indexes, create a new migration:
```bash
bun run prisma migrate dev --name add_custom_indexes
```
