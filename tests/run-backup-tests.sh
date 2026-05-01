#!/bin/bash

# Backup System E2E Test Runner
# Comprehensive testing script for the backup management system

echo "========================================"
echo "Backup System E2E Test Suite"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment variables
echo "Checking environment configuration..."

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL not set${NC}"
    exit 1
fi

if [ -z "$REDIS_HOST" ]; then
    echo -e "${YELLOW}WARNING: REDIS_HOST not set, using default 'localhost'${NC}"
    export REDIS_HOST="localhost"
fi

if [ -z "$REDIS_PORT" ]; then
    echo -e "${YELLOW}WARNING: REDIS_PORT not set, using default '6379'${NC}"
    export REDIS_PORT="6379"
fi

echo -e "${GREEN}✓ Environment configured${NC}"
echo ""

# Check if Redis is running
echo "Checking Redis connection..."
if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}ERROR: Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT${NC}"
    echo "Please start Redis before running tests"
    exit 1
fi
echo ""

# Check if PostgreSQL is accessible
echo "Checking PostgreSQL connection..."
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL is accessible${NC}"
else
    echo -e "${RED}ERROR: Cannot connect to PostgreSQL${NC}"
    echo "Please verify DATABASE_URL and that PostgreSQL is running"
    exit 1
fi
echo ""

# Run Prisma migrations (test database)
echo "Preparing test database..."
npx prisma migrate dev --skip-seed > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database schema up to date${NC}"
else
    echo -e "${RED}ERROR: Failed to apply database migrations${NC}"
    exit 1
fi
echo ""

# Build TypeScript (if needed)
echo "Compiling TypeScript..."
npx tsc --noEmit
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ TypeScript compilation successful${NC}"
else
    echo -e "${YELLOW}WARNING: TypeScript compilation had errors${NC}"
fi
echo ""

# Start test server in background
echo "Starting test server..."
export NODE_ENV=test
export PORT=8000
export TEST_BASE_URL="http://localhost:8000"

# Kill any existing process on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null

# Start server
npm start > /tmp/backup-test-server.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to start..."
for i in {1..30}; do
    if curl -s http://localhost:8000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Server is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}ERROR: Server failed to start after 30 seconds${NC}"
        echo "Server logs:"
        cat /tmp/backup-test-server.log
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done
echo ""

# Run E2E tests
echo "========================================"
echo "Running E2E Test Suite"
echo "========================================"
echo ""

npx jest tests/backup-system-e2e.test.ts --verbose --detectOpenHandles

TEST_RESULT=$?

echo ""
echo "========================================"

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo "Check logs above for details"
fi

echo "========================================"
echo ""

# Cleanup
echo "Cleaning up..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

# Clean up test data
echo "Removing test data..."
npx prisma db execute --stdin <<< "DELETE FROM \"Backup\" WHERE \"createdById\" IN (SELECT id FROM \"User\" WHERE email = 'test-admin@backup-test.com');" > /dev/null 2>&1
npx prisma db execute --stdin <<< "DELETE FROM \"User\" WHERE email = 'test-admin@backup-test.com';" > /dev/null 2>&1

echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

# Exit with test result
exit $TEST_RESULT
