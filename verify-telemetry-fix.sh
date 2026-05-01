#!/bin/bash
# OpenTelemetry Fix Verification Script
# Run this script to verify the telemetry fix is working correctly

echo "=========================================="
echo "OpenTelemetry Fix Verification"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test 1: Check if @opentelemetry/sdk-metrics is installed
echo "Test 1: Checking @opentelemetry/sdk-metrics dependency..."
if npm list @opentelemetry/sdk-metrics 2>&1 | grep -q "sdk-metrics@"; then
    echo -e "${GREEN}✅ PASS${NC}: @opentelemetry/sdk-metrics is installed"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}: @opentelemetry/sdk-metrics is NOT installed"
    echo "   Run: npm install @opentelemetry/sdk-metrics@^2.2.0"
    ((TESTS_FAILED++))
fi
echo ""

# Test 2: Check if telemetry module can be imported
echo "Test 2: Testing telemetry module import..."
if npx tsx -e "import('./src/config/telemetry.js').then(() => process.exit(0)).catch(() => process.exit(1))" 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}: Telemetry module imports successfully"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}: Telemetry module import FAILED"
    echo "   Check src/config/telemetry.ts for import errors"
    echo "   Expected imports:"
    echo "   - import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';"
    ((TESTS_FAILED++))
fi
echo ""

# Test 3: Check if Resource is imported correctly
echo "Test 3: Checking Resource import pattern..."
if grep -q "import { defaultResource, resourceFromAttributes }" src/config/telemetry.ts; then
    echo -e "${GREEN}✅ PASS${NC}: Resource imports are correct"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}: Resource imports are INCORRECT"
    echo "   Current import:"
    grep "Resource" src/config/telemetry.ts | head -1
    echo "   Expected:"
    echo "   import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';"
    ((TESTS_FAILED++))
fi
echo ""

# Test 4: Check if resource is created correctly
echo "Test 4: Checking resource creation pattern..."
if grep -q "defaultResource().merge" src/config/telemetry.ts; then
    echo -e "${GREEN}✅ PASS${NC}: Resource creation uses correct API"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}: Resource creation uses OLD API"
    echo "   Expected pattern:"
    echo "   const resource = defaultResource().merge(resourceFromAttributes({...}));"
    ((TESTS_FAILED++))
fi
echo ""

# Test 5: Check if telemetry is enabled in server.ts
echo "Test 5: Checking if telemetry is enabled in server.ts..."
if grep -q "^import { initializeTelemetry }" src/server.ts && \
   grep -q "^initializeTelemetry();" src/server.ts; then
    echo -e "${GREEN}✅ PASS${NC}: Telemetry is ENABLED in server.ts"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING${NC}: Telemetry appears to be DISABLED in server.ts"
    echo "   Check lines 1-5 of src/server.ts"
    echo "   Expected:"
    echo "   import { initializeTelemetry } from './config/telemetry.js';"
    echo "   initializeTelemetry();"
    ((TESTS_FAILED++))
fi
echo ""

# Test 6: Check if server can start
echo "Test 6: Testing server startup (this may take a few seconds)..."
timeout 10s npm run dev > /tmp/server-test.log 2>&1 &
SERVER_PID=$!
sleep 5

if grep -q "OpenTelemetry initialized successfully" /tmp/server-test.log; then
    echo -e "${GREEN}✅ PASS${NC}: Server starts with telemetry enabled"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}: Server startup FAILED or telemetry did not initialize"
    echo "   Check logs in /tmp/server-test.log"
    ((TESTS_FAILED++))
fi

# Kill the server process
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    echo ""
    echo "The OpenTelemetry fix is working correctly!"
    echo "You can now deploy to production."
    echo ""
    echo "Next steps:"
    echo "1. git add ."
    echo "2. git commit -m 'fix: Enable OpenTelemetry with correct Resource API'"
    echo "3. git push origin main"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Please fix the issues above before deploying."
    echo ""
    echo "For help, see:"
    echo "- FIX_TELEMETRY_IMPLEMENTATION.md (quick fix guide)"
    echo "- TELEMETRY_FIX_DIFF.md (exact code changes)"
    echo "- CRITICAL_ISSUE_OPENTELEMETRY_ANALYSIS.md (full analysis)"
    exit 1
fi
