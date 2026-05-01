@echo off
REM Backup System E2E Test Runner (Windows)
REM Comprehensive testing script for the backup management system

echo ========================================
echo Backup System E2E Test Suite
echo ========================================
echo.

REM Check environment variables
echo Checking environment configuration...

if "%DATABASE_URL%"=="" (
    echo ERROR: DATABASE_URL not set
    exit /b 1
)

if "%REDIS_HOST%"=="" (
    echo WARNING: REDIS_HOST not set, using default 'localhost'
    set REDIS_HOST=localhost
)

if "%REDIS_PORT%"=="" (
    echo WARNING: REDIS_PORT not set, using default '6379'
    set REDIS_PORT=6379
)

echo ✓ Environment configured
echo.

REM Check if Redis is running
echo Checking Redis connection...
redis-cli -h %REDIS_HOST% -p %REDIS_PORT% ping >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ Redis is running
) else (
    echo ERROR: Cannot connect to Redis at %REDIS_HOST%:%REDIS_PORT%
    echo Please start Redis before running tests
    exit /b 1
)
echo.

REM Check if PostgreSQL is accessible
echo Checking PostgreSQL connection...
echo SELECT 1; | npx prisma db execute --stdin >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ PostgreSQL is accessible
) else (
    echo ERROR: Cannot connect to PostgreSQL
    echo Please verify DATABASE_URL and that PostgreSQL is running
    exit /b 1
)
echo.

REM Run Prisma migrations
echo Preparing test database...
npx prisma migrate dev --skip-seed >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ Database schema up to date
) else (
    echo ERROR: Failed to apply database migrations
    exit /b 1
)
echo.

REM Build TypeScript
echo Compiling TypeScript...
npx tsc --noEmit
if %ERRORLEVEL% EQU 0 (
    echo ✓ TypeScript compilation successful
) else (
    echo WARNING: TypeScript compilation had errors
)
echo.

REM Start test server in background
echo Starting test server...
set NODE_ENV=test
set PORT=8000
set TEST_BASE_URL=http://localhost:8000

REM Kill any existing process on port 8000
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

REM Start server
start /B npm start > backup-test-server.log 2>&1

REM Wait for server to be ready
echo Waiting for server to start...
set /a attempts=0
:wait_loop
set /a attempts+=1
if %attempts% GTR 30 (
    echo ERROR: Server failed to start after 30 seconds
    echo Server logs:
    type backup-test-server.log
    taskkill /F /IM node.exe >nul 2>&1
    exit /b 1
)

curl -s http://localhost:8000 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ Server is ready
    goto server_ready
)

timeout /t 1 /nobreak >nul
goto wait_loop

:server_ready
echo.

REM Run E2E tests
echo ========================================
echo Running E2E Test Suite
echo ========================================
echo.

npx jest tests/backup-system-e2e.test.ts --verbose --detectOpenHandles

set TEST_RESULT=%ERRORLEVEL%

echo.
echo ========================================

if %TEST_RESULT% EQU 0 (
    echo ✓ All tests passed!
) else (
    echo ✗ Some tests failed
    echo Check logs above for details
)

echo ========================================
echo.

REM Cleanup
echo Cleaning up...
taskkill /F /IM node.exe >nul 2>&1

REM Clean up test data
echo Removing test data...
echo DELETE FROM "Backup" WHERE "createdById" IN (SELECT id FROM "User" WHERE email = 'test-admin@backup-test.com'); | npx prisma db execute --stdin >nul 2>&1
echo DELETE FROM "User" WHERE email = 'test-admin@backup-test.com'; | npx prisma db execute --stdin >nul 2>&1

echo ✓ Cleanup complete
echo.

REM Exit with test result
exit /b %TEST_RESULT%
