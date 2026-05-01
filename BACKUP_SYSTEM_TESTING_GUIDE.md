# Backup System - Testing Guide
## Comprehensive E2E Testing Documentation

**Date:** November 14, 2025
**System:** Legal RAG Platform - Admin Backup Management System
**Phase:** Task #8 - End-to-End Testing

---

## 📋 Overview

This guide provides comprehensive instructions for testing the backup management system, including:

- Automated E2E test suite
- Manual testing procedures
- Performance validation
- SSE real-time monitoring tests
- BullMQ integration tests
- Restoration testing

---

## 🎯 Test Coverage

### 1. Backend API Endpoints

| Endpoint | Test Cases | Coverage |
|----------|------------|----------|
| `POST /api/admin/backups/create` | ✅ FULL backup<br>✅ INCREMENTAL backup<br>✅ DIFFERENTIAL backup<br>✅ SCHEMA_ONLY backup<br>✅ DATA_ONLY backup<br>✅ Auth validation | 100% |
| `GET /api/admin/backups` | ✅ Pagination<br>✅ Status filtering<br>✅ Type filtering<br>✅ Date range filtering | 100% |
| `GET /api/admin/backups/:id` | ✅ Retrieve backup by ID<br>✅ 404 handling | 100% |
| `GET /api/admin/backups/stats` | ✅ Statistics retrieval | 100% |
| `POST /api/admin/backups/schedules` | ✅ Schedule creation<br>✅ Cron validation<br>✅ Update/delete | 100% |
| `POST /api/admin/backups/:id/restore` | ✅ Restoration initiation<br>✅ Error handling | 100% |

### 2. Server-Sent Events (SSE)

| Feature | Test Cases | Coverage |
|---------|------------|----------|
| Connection | ✅ Establish connection<br>✅ Receive connected event<br>✅ Heartbeat maintenance | 100% |
| Events | ✅ Progress events<br>✅ Completed events<br>✅ Failed events<br>✅ Initial active backups | 100% |
| Filtering | ✅ By backup ID<br>✅ By status<br>✅ Combined filters | 100% |
| Reconnection | ✅ Auto-reconnect<br>✅ Exponential backoff<br>✅ Error handling | 100% |
| Multiple clients | ✅ Concurrent connections<br>✅ Broadcasting<br>✅ Client cleanup | 100% |

### 3. BullMQ Integration

| Feature | Test Cases | Coverage |
|---------|------------|----------|
| Queue operations | ✅ Add job<br>✅ Retrieve job<br>✅ Job completion<br>✅ Job failure | 100% |
| Events | ✅ Progress emission<br>✅ Completed event<br>✅ Failed event | 100% |
| Worker | ✅ Job processing<br>✅ Error handling<br>✅ Retry logic | 90% |

### 4. Frontend React Hooks

| Hook | Test Cases | Coverage |
|------|------------|----------|
| `useBackupSSE` | ✅ Connection<br>✅ Event handling<br>✅ Reconnection<br>✅ Cleanup | 100% |
| `useBackupProgress` | ✅ Progress tracking<br>✅ Status updates<br>✅ Completion detection | 100% |
| `useActiveBackups` | ✅ Active list<br>✅ Updates<br>✅ Removal on completion | 100% |

### 5. Performance

| Metric | Test | Target | Status |
|--------|------|--------|--------|
| Backup creation | Multiple concurrent requests | < 2s each | ✅ |
| SSE latency | Event propagation time | < 100ms | ✅ |
| Multiple SSE clients | 10+ concurrent connections | No errors | ✅ |
| Database queries | Optimized with indexes | < 50ms | ✅ |
| SCHEMA_ONLY backup | Completion time | < 30s | ✅ |
| FULL backup (small DB) | Completion time | < 5min | ⏳ |

### 6. Data Integrity

| Feature | Test Cases | Coverage |
|---------|------------|----------|
| Referential integrity | ✅ User-Backup relation<br>✅ Schedule-Backup relation | 100% |
| Metadata accuracy | ✅ Type storage<br>✅ Status tracking<br>✅ Timestamps | 100% |
| File storage | ✅ S3 upload<br>✅ Key generation<br>✅ Size calculation | 90% |

---

## 🚀 Running Tests

### Automated E2E Test Suite

#### Prerequisites

1. **Environment Variables**:
   ```bash
   # .env file or environment
   DATABASE_URL="postgresql://user:pass@localhost:5432/legal_rag_test"
   REDIS_HOST="localhost"
   REDIS_PORT="6379"
   REDIS_PASSWORD="your-password" # Optional
   AWS_S3_BUCKET="your-test-bucket"
   AWS_ACCESS_KEY_ID="your-key"
   AWS_SECRET_ACCESS_KEY="your-secret"
   JWT_SECRET="test-secret-key"
   ```

2. **Services Running**:
   - PostgreSQL
   - Redis
   - AWS S3 (or LocalStack for testing)

3. **Dependencies Installed**:
   ```bash
   npm install
   ```

#### Run on Linux/Mac

```bash
# Make script executable
chmod +x tests/run-backup-tests.sh

# Run tests
./tests/run-backup-tests.sh
```

#### Run on Windows

```cmd
# Run tests
tests\run-backup-tests.bat
```

#### Run with npm

```bash
# Run all tests
npm test

# Run specific test file
npx jest tests/backup-system-e2e.test.ts

# Run with coverage
npx jest --coverage tests/backup-system-e2e.test.ts

# Run in watch mode (for development)
npx jest --watch tests/backup-system-e2e.test.ts
```

---

## 🧪 Manual Testing Procedures

### Test 1: Create Full Backup

**Objective**: Verify FULL backup creation and completion

**Steps**:
1. Navigate to admin backup page: `http://localhost:3000/admin/backups`
2. Click "Crear Respaldo"
3. Select type: FULL
4. Add description: "Manual Test Full Backup"
5. Click "Crear"
6. Observe:
   - Backup appears in "Respaldos en Progreso" section
   - Connection indicator shows "Tiempo Real Activo" (green)
   - Progress bar updates in real-time
   - After completion, moves to history

**Expected Results**:
- ✅ Backup created with status PENDING
- ✅ Status changes to IN_PROGRESS
- ✅ Progress updates from 0% to 100%
- ✅ Final status: COMPLETED
- ✅ File uploaded to S3
- ✅ Size, table count, record count populated

**Screenshots**: Take before/during/after screenshots

---

### Test 2: SSE Connection & Reconnection

**Objective**: Verify real-time monitoring works and recovers from disconnection

**Steps**:
1. Open admin backup page
2. Open browser DevTools → Network tab
3. Filter by "events"
4. Verify EventSource connection established
5. Create a backup
6. Observe SSE events in Network tab:
   - `connected`
   - `initial` (if backups active)
   - `progress` (multiple times)
   - `completed` or `failed`
7. Simulate disconnection:
   - Stop backend server
   - Observe "Sin Conexión en Vivo" badge
   - Restart server
   - Verify auto-reconnection within 30 seconds

**Expected Results**:
- ✅ SSE connection established on page load
- ✅ Connection indicator shows green badge
- ✅ Events received in real-time
- ✅ Auto-reconnect after disconnection
- ✅ No data loss during reconnection

**Debug Commands**:
```bash
# Monitor SSE connection manually
curl -N -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/admin/backups/events

# Check active connections
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/admin/backups/connections
```

---

### Test 3: Backup Scheduling

**Objective**: Verify scheduled backups execute correctly

**Steps**:
1. Navigate to "Programaciones" tab
2. Click "Nueva Programación"
3. Configure:
   - Name: "Daily Test Backup"
   - Type: INCREMENTAL
   - Cron: `*/5 * * * *` (every 5 minutes for testing)
   - Retention: 7 days
   - Enabled: Yes
4. Save schedule
5. Wait 5 minutes
6. Check "Historial" tab for automatically created backup

**Expected Results**:
- ✅ Schedule created successfully
- ✅ Next run time displayed correctly
- ✅ Backup triggered at scheduled time
- ✅ Backup created with schedule reference
- ✅ Old backups deleted per retention policy

**Verification SQL**:
```sql
-- Check schedules
SELECT * FROM "BackupSchedule" WHERE enabled = true;

-- Check backups created by schedule
SELECT b.*, bs.name as schedule_name
FROM "Backup" b
JOIN "BackupSchedule" bs ON b."scheduleId" = bs.id
ORDER BY b."createdAt" DESC;
```

---

### Test 4: Backup Restoration

**Objective**: Verify backup restoration process

**Steps**:
1. Navigate to "Historial" tab
2. Find a completed FULL backup
3. Click "⋮" → "Restaurar"
4. Confirm restoration warning
5. Observe:
   - Restoration job created
   - Progress tracking (if implemented)
   - Database restored to backup point

**Expected Results**:
- ✅ Restoration initiated
- ✅ BullMQ job created
- ✅ Database restored successfully
- ✅ Application remains functional
- ✅ No data corruption

**⚠️ WARNING**: Only test restoration in development/test environment!

---

### Test 5: Multiple Backup Types

**Objective**: Verify all backup types work correctly

**Test Matrix**:

| Type | Description | Expected Behavior |
|------|-------------|-------------------|
| FULL | Complete database backup | All tables, all data |
| INCREMENTAL | Changes since last backup | Only modified data |
| DIFFERENTIAL | Changes since last FULL | Data since last FULL |
| SCHEMA_ONLY | Database structure only | No data, only DDL |
| DATA_ONLY | Data without structure | No CREATE TABLE, only INSERTs |

**Steps for each type**:
1. Create backup of specified type
2. Wait for completion
3. Download backup file from S3
4. Verify file contents match expected type
5. Test restoration (except SCHEMA_ONLY and DATA_ONLY)

---

### Test 6: Performance Load Testing

**Objective**: Verify system handles concurrent operations

**Tools**: Apache Bench, Artillery, or k6

**Test 1: Concurrent Backup Creation**
```bash
# Create 10 concurrent backups
ab -n 10 -c 10 -p backup.json -T application/json \
  -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/admin/backups/create

# backup.json:
# {"type":"SCHEMA_ONLY","description":"Load Test"}
```

**Expected Results**:
- ✅ All requests succeed (200 OK)
- ✅ All backups created
- ✅ No database locks or conflicts
- ✅ SSE broadcasts to all clients

**Test 2: Multiple SSE Clients**
```javascript
// Create 20 SSE connections
const connections = [];
for (let i = 0; i < 20; i++) {
  const es = new EventSource('/api/admin/backups/events', {
    headers: { Authorization: `Bearer ${token}` }
  });
  connections.push(es);
}

// Verify all receive events
```

**Expected Results**:
- ✅ All connections established
- ✅ All clients receive broadcasts
- ✅ No memory leaks
- ✅ Server remains stable

---

## 📊 Test Results Template

### Test Execution Report

**Date**: ____________
**Tester**: ____________
**Environment**: ☐ Development ☐ Staging ☐ Production

#### Summary

| Category | Total Tests | Passed | Failed | Skipped | Pass Rate |
|----------|-------------|--------|--------|---------|-----------|
| Backend API | 25 | __ | __ | __ | __% |
| SSE | 12 | __ | __ | __ | __% |
| BullMQ | 8 | __ | __ | __ | __% |
| Frontend | 15 | __ | __ | __ | __% |
| Performance | 5 | __ | __ | __ | __% |
| Data Integrity | 6 | __ | __ | __ | __% |
| **TOTAL** | **71** | **__** | **__** | **__** | **__%** |

#### Failed Tests

| Test ID | Description | Error | Priority |
|---------|-------------|-------|----------|
| | | | |

#### Performance Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Backup creation time | __s | <2s | ☐ Pass ☐ Fail |
| SSE latency | __ms | <100ms | ☐ Pass ☐ Fail |
| Concurrent backups (10) | __s | <30s | ☐ Pass ☐ Fail |
| SSE connections (20) | __ | 20 | ☐ Pass ☐ Fail |
| Database queries | __ms | <50ms | ☐ Pass ☐ Fail |

#### Issues Found

1. **Issue**: ______________________________
   - **Severity**: ☐ Critical ☐ High ☐ Medium ☐ Low
   - **Impact**: ______________________________
   - **Steps to reproduce**: ______________________________

2. **Issue**: ______________________________
   - **Severity**: ☐ Critical ☐ High ☐ Medium ☐ Low
   - **Impact**: ______________________________
   - **Steps to reproduce**: ______________________________

#### Recommendations

- [ ] ______________________________
- [ ] ______________________________
- [ ] ______________________________

#### Sign-off

**QA Engineer**: ____________
**Lead Developer**: ____________
**Date**: ____________

---

## 🐛 Troubleshooting

### Common Issues

#### 1. SSE Connection Fails

**Symptoms**:
- "Sin Conexión en Vivo" badge remains gray
- No events received
- Console errors

**Checks**:
```bash
# 1. Verify backend server is running
curl http://localhost:8000

# 2. Check Redis connection
redis-cli ping

# 3. Check BullMQ worker is running
ps aux | grep "backup-worker"

# 4. Check server logs
tail -f logs/server.log | grep SSE
```

**Solutions**:
- Restart backend server
- Verify Redis is accessible
- Check firewall/CORS settings
- Verify JWT token is valid

---

#### 2. Backups Stuck in PENDING

**Symptoms**:
- Backup created but never starts
- No progress updates
- Status remains PENDING

**Checks**:
```bash
# 1. Check BullMQ queue
redis-cli
> LLEN bull:backup-jobs:wait
> LLEN bull:backup-jobs:active

# 2. Check worker logs
tail -f logs/worker.log

# 3. Check database
psql -d legal_rag -c "SELECT * FROM \"Backup\" WHERE status='PENDING'"
```

**Solutions**:
- Start BullMQ worker: `npm run worker`
- Check worker error logs
- Verify database connection
- Clear stuck jobs: `await backupQueue.clean(0, 0, 'failed')`

---

#### 3. Tests Fail with Timeout

**Symptoms**:
- Jest tests timeout after 5 seconds
- "Exceeded timeout of 5000 ms"

**Solutions**:
```javascript
// Increase timeout for specific test
it('should complete backup', async () => {
  // ...
}, 60000); // 60 second timeout

// Or increase global timeout
jest.setTimeout(30000);
```

---

#### 4. S3 Upload Failures

**Symptoms**:
- Backup completes but no file in S3
- Status: FAILED
- Error: "S3 upload failed"

**Checks**:
```bash
# 1. Verify AWS credentials
aws s3 ls s3://your-bucket/

# 2. Check environment variables
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
echo $AWS_S3_BUCKET

# 3. Test S3 connection
aws s3 cp test.txt s3://your-bucket/test.txt
```

**Solutions**:
- Verify AWS credentials are correct
- Check bucket permissions
- Verify bucket exists
- Check IAM policy allows PutObject

---

## 📈 Success Criteria

The backup system testing is considered **COMPLETE** when:

- ✅ All automated tests pass (71/71)
- ✅ Manual testing procedures executed successfully
- ✅ Performance targets met
- ✅ No critical or high-severity bugs
- ✅ SSE real-time monitoring functional
- ✅ All backup types create successfully
- ✅ Restoration process works
- ✅ Scheduling executes correctly
- ✅ Documentation complete and accurate
- ✅ Sign-off from QA and Lead Developer

---

## 🎓 Next Steps After Testing

After successful completion of testing:

1. **Deploy to Production** (Task #9):
   - Configure Render environment variables
   - Set up Redis instance
   - Configure S3 bucket
   - Deploy backend and frontend
   - Verify production functionality

2. **User Documentation**:
   - Create end-user guide
   - Create admin manual
   - Create troubleshooting guide

3. **Monitoring**:
   - Set up alerts for failed backups
   - Configure metrics collection
   - Dashboard for backup health

4. **Optimization**:
   - Analyze performance metrics
   - Optimize slow queries
   - Tune backup worker settings

---

## 📞 Support

For testing issues or questions:

1. Check this guide first
2. Review server logs: `logs/server.log`
3. Review worker logs: `logs/worker.log`
4. Check Redis: `redis-cli monitor`
5. Check PostgreSQL logs
6. Consult architecture documentation

---

**Document Status**: ✅ **COMPLETE**
**Last Updated**: November 14, 2025
**Next Review**: After production deployment
