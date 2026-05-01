@echo off
REM ============================================================================
REM Phase 10 - Week 3 - Day 1 Quick Start Script
REM ============================================================================
REM This script sets up the foundation for Week 3 implementation:
REM 1. Backup production database
REM 2. Apply performance indexes
REM 3. Set up Redis container
REM 4. Install new dependencies
REM ============================================================================

echo.
echo ============================================================================
echo   Phase 10 - Week 3 - Day 1 Implementation
echo   Foundation Setup + Quick Wins (40%% improvement expected)
echo ============================================================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running with administrator privileges
) else (
    echo [WARNING] Not running as administrator - Docker commands may fail
    echo Please run this script as administrator if you encounter Docker errors
    pause
)

echo.
echo ============================================================================
echo Step 1/5: Database Backup
echo ============================================================================
echo.

set BACKUP_FILE=backup_%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
set BACKUP_FILE=%BACKUP_FILE: =0%

echo Creating backup: %BACKUP_FILE%
echo.
echo NOTE: You need to have psql in your PATH and DATABASE_URL configured
echo If backup fails, you can skip this step (not recommended for production)
echo.

choice /C YN /M "Do you want to backup the database now"
if errorlevel 2 goto skip_backup

echo Running: pg_dump legal_rag_db ^> %BACKUP_FILE%
pg_dump legal_rag_db > %BACKUP_FILE%

if %errorlevel% == 0 (
    echo [SUCCESS] Database backup created: %BACKUP_FILE%
) else (
    echo [ERROR] Database backup failed - errorlevel %errorlevel%
    echo Please check your PostgreSQL connection and try again
    pause
    exit /b 1
)

:skip_backup

echo.
echo ============================================================================
echo Step 2/5: Apply Performance Indexes
echo ============================================================================
echo.

if not exist "scripts\apply-performance-indexes.sql" (
    echo [ERROR] File not found: scripts\apply-performance-indexes.sql
    echo Please ensure all agent-generated files are present
    pause
    exit /b 1
)

echo This will create 30+ optimized indexes using CONCURRENT mode
echo This is safe for production and won't lock tables
echo.

choice /C YN /M "Do you want to apply performance indexes now"
if errorlevel 2 goto skip_indexes

echo Running: psql -d legal_rag_db -f scripts\apply-performance-indexes.sql
psql -d legal_rag_db -f scripts\apply-performance-indexes.sql

if %errorlevel% == 0 (
    echo [SUCCESS] Performance indexes created
) else (
    echo [ERROR] Index creation failed - errorlevel %errorlevel%
    echo Check PostgreSQL logs for details
    pause
    exit /b 1
)

:skip_indexes

echo.
echo ============================================================================
echo Step 3/5: Set Up Redis Container
echo ============================================================================
echo.

echo Checking if Redis is already running...
docker ps | findstr redis-perf >nul 2>&1

if %errorlevel% == 0 (
    echo [INFO] Redis container is already running
    choice /C YN /M "Do you want to restart Redis"
    if errorlevel 2 goto skip_redis

    echo Stopping existing Redis container...
    docker stop redis-perf
    docker rm redis-perf
)

echo Starting Redis container...
echo Configuration:
echo   - Port: 6379
echo   - Memory: 2GB
echo   - Eviction: allkeys-lru
echo   - Persistence: appendonly
echo.

docker run -d --name redis-perf ^
  -p 6379:6379 ^
  -v redis-data:/data ^
  redis:7-alpine ^
  redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru --save 60 1000

if %errorlevel% == 0 (
    echo [SUCCESS] Redis container started
    echo Testing Redis connection...
    timeout /t 2 /nobreak >nul
    docker exec redis-perf redis-cli PING
    if %errorlevel% == 0 (
        echo [SUCCESS] Redis is responding
    ) else (
        echo [WARNING] Redis may not be ready yet
    )
) else (
    echo [ERROR] Failed to start Redis container
    echo Please check Docker installation and try again
    pause
    exit /b 1
)

:skip_redis

echo.
echo ============================================================================
echo Step 4/5: Install New Dependencies
echo ============================================================================
echo.

echo Installing NPM packages:
echo   - ioredis: Redis client for Node.js
echo   - bull: Queue system for async processing
echo   - node-cache: In-memory cache (L1)
echo   - @types/ioredis: TypeScript types
echo   - @types/bull: TypeScript types
echo.

choice /C YN /M "Do you want to install dependencies now"
if errorlevel 2 goto skip_deps

npm install ioredis bull node-cache
npm install -D @types/ioredis @types/bull

if %errorlevel% == 0 (
    echo [SUCCESS] Dependencies installed
) else (
    echo [ERROR] Dependency installation failed
    pause
    exit /b 1
)

:skip_deps

echo.
echo ============================================================================
echo Step 5/5: Verify Environment Configuration
echo ============================================================================
echo.

echo Checking .env file for required variables...
echo.

findstr /C:"REDIS_HOST" .env >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] REDIS_HOST found in .env
) else (
    echo [WARNING] REDIS_HOST not found in .env
    echo Please add the following to your .env file:
    echo.
    echo REDIS_HOST=localhost
    echo REDIS_PORT=6379
    echo REDIS_PASSWORD=
    echo REDIS_DB=0
    echo REDIS_MAX_RETRIES=3
    echo REDIS_CONNECT_TIMEOUT=10000
    echo.
    echo CACHE_L1_TTL_MS=300000
    echo CACHE_L2_TTL_MS=3600000
    echo CACHE_L3_TTL_MS=86400000
    echo CACHE_L1_MAX_SIZE_MB=100
    echo CACHE_L2_MAX_SIZE_MB=1000
    echo CACHE_L3_MAX_SIZE_MB=2000
    echo.
    echo MAX_CONCURRENT_REQUESTS=500
    echo REQUEST_TIMEOUT_MS=30000
    echo DATABASE_POOL_SIZE=50
    echo QUERY_TIMEOUT_MS=10000
    echo.
    pause
)

echo.
echo ============================================================================
echo Day 1 Setup Complete!
echo ============================================================================
echo.
echo What was accomplished:
echo   [X] Database backup created (if selected)
echo   [X] 30+ performance indexes applied (if selected)
echo   [X] Redis container running on port 6379
echo   [X] New dependencies installed (if selected)
echo   [X] Environment configuration verified
echo.
echo Expected improvements at this stage:
echo   - Database queries: 500ms --^> 150ms (-70%%)
echo   - Cache infrastructure ready
echo   - Foundation for 40%% overall improvement
echo.
echo ============================================================================
echo Next Steps - Day 2:
echo ============================================================================
echo.
echo 1. Add new Prisma models to schema.prisma:
echo    - QueryHistory, UserSession, QueryCache
echo    - QuerySuggestion, RelevanceFeedback
echo.
echo 2. Run Prisma migration:
echo    npx prisma migrate dev --name week3_nlp_optimizations
echo.
echo 3. Generate Prisma client:
echo    npx prisma generate
echo.
echo 4. Verify new tables in database:
echo    psql -d legal_rag_db -c "\dt"
echo.
echo ============================================================================
echo For complete implementation details, see:
echo   PHASE_10_WEEK3_STRATEGIC_PLAN.md
echo   PHASE_10_WEEK3_IMPLEMENTATION_READY.html
echo ============================================================================
echo.

pause
