#!/bin/bash

# Apply Migrations Script for Render Shell
# Run this script in the Render Shell to apply database migrations

echo "=========================================="
echo "Legal RAG System - Database Migrations"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL is not set"
    exit 1
fi

echo "✓ DATABASE_URL is configured"
echo ""

# Apply migrations
echo "📦 Applying Prisma migrations..."
npx prisma migrate deploy

# Check if migrations succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations applied successfully!"
    echo ""
    echo "📊 Checking database tables..."
    npx prisma db execute --stdin <<SQL
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;
SQL
    echo ""
    echo "🎉 Database setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Test user registration: curl -X POST https://legal-rag-api-qnew.onrender.com/api/v1/auth/register"
    echo "2. Check the API documentation in DEPLOYMENT.md"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Check the error messages above for details."
    exit 1
fi
