# Backup System - Testing Checklist
## Quick Reference for E2E Testing

**Date**: November 14, 2025
**Version**: 1.0.0

---

## ✅ Pre-Testing Checklist

- [ ] PostgreSQL is running
- [ ] Redis is running
- [ ] Environment variables configured (.env file)
- [ ] Dependencies installed (`npm install`)
- [ ] Database migrations applied (`npx prisma migrate dev`)
- [ ] Backend server starts without errors
- [ ] Frontend builds successfully
- [ ] Admin user exists in database

---

## 🔧 Automated Tests

### Run All Tests
```bash
# Linux/Mac
./tests/run-backup-tests.sh

# Windows
tests\run-backup-tests.bat

# npm
npm test
```

- [ ] All 71 tests pass
- [ ] No errors in console
- [ ] Test coverage > 80%

---

## 📋 Manual Testing Checklist

### 1. Backend API Endpoints

#### POST /api/admin/backups/create
- [ ] Create FULL backup
- [ ] Create INCREMENTAL backup
- [ ] Create DIFFERENTIAL backup
- [ ] Create SCHEMA_ONLY backup
- [ ] Create DATA_ONLY backup
- [ ] Verify authentication required
- [ ] Verify admin role required

#### GET /api/admin/backups
- [ ] Retrieve all backups
- [ ] Filter by status (PENDING, IN_PROGRESS, COMPLETED, FAILED)
- [ ] Filter by type (FULL, INCREMENTAL, etc.)
- [ ] Pagination works (limit, offset)
- [ ] Date range filtering
- [ ] Sorting works

#### GET /api/admin/backups/:id
- [ ] Retrieve specific backup by ID
- [ ] 404 for non-existent backup
- [ ] Includes all metadata

#### GET /api/admin/backups/stats
- [ ] Returns total count
- [ ] Returns completed count
- [ ] Returns failed count
- [ ] Returns in-progress count
- [ ] Returns total size
- [ ] Returns last backup info

#### POST /api/admin/backups/schedules
- [ ] Create daily schedule
- [ ] Create weekly schedule
- [ ] Create monthly schedule
- [ ] Validate cron expression
- [ ] Invalid cron rejected
- [ ] Enable/disable schedule

#### POST /api/admin/backups/:id/restore
- [ ] Restore completed backup
- [ ] Reject restoration of failed backup
- [ ] Reject restoration of non-existent backup
- [ ] Verify restoration process starts

---

### 2. Server-Sent Events (SSE)

#### Connection
- [ ] SSE connection established
- [ ] "Tiempo Real Activo" badge shows green
- [ ] Connection survives page navigation
- [ ] Multiple tabs can connect simultaneously

#### Events Received
- [ ] `connected` event on connection
- [ ] `initial` event with active backups
- [ ] `progress` events during backup
- [ ] `completed` event on success
- [ ] `failed` event on failure
- [ ] Heartbeat every 30 seconds

#### Filtering
- [ ] Filter by backupId works
- [ ] Filter by status works
- [ ] Combined filters work

#### Reconnection
- [ ] Auto-reconnect after server restart
- [ ] Exponential backoff implemented
- [ ] No duplicate connections
- [ ] Badge updates on disconnect/reconnect

---

### 3. Real-Time UI Updates

#### Active Backups Section
- [ ] Appears when backup starts
- [ ] Shows backup type
- [ ] Shows start time
- [ ] Shows progress bar (if available)
- [ ] Shows pulsing status badge
- [ ] Disappears when backup completes
- [ ] Multiple active backups displayed

#### History Section
- [ ] Updates automatically when backup completes
- [ ] Updates automatically when backup fails
- [ ] No manual refresh required
- [ ] Correct order (newest first)

#### Connection Indicator
- [ ] Green when connected
- [ ] Gray when disconnected
- [ ] Icon changes (Wifi/WifiOff)
- [ ] Text updates

---

### 4. Backup Scheduling

#### Create Schedule
- [ ] Daily schedule (0 2 * * *)
- [ ] Weekly schedule (0 2 * * 0)
- [ ] Monthly schedule (0 2 1 * *)
- [ ] Custom cron expression
- [ ] Retention days setting
- [ ] Enable/disable toggle

#### Schedule Execution
- [ ] Backup created at scheduled time
- [ ] Backup has schedule reference
- [ ] Multiple schedules work
- [ ] Disabled schedules don't run

#### Schedule Management
- [ ] Edit schedule
- [ ] Delete schedule
- [ ] View schedule history
- [ ] Next run time displayed

---

### 5. Backup Types Validation

#### FULL Backup
- [ ] All tables included
- [ ] All data included
- [ ] Structure + data
- [ ] File size > 0
- [ ] S3 upload successful

#### INCREMENTAL Backup
- [ ] Only changed data
- [ ] Smaller file size
- [ ] Depends on previous backup
- [ ] S3 upload successful

#### DIFFERENTIAL Backup
- [ ] Changes since last FULL
- [ ] Medium file size
- [ ] S3 upload successful

#### SCHEMA_ONLY Backup
- [ ] Only DDL statements
- [ ] No INSERT statements
- [ ] Fast completion (< 30s)
- [ ] Small file size

#### DATA_ONLY Backup
- [ ] Only INSERT statements
- [ ] No CREATE TABLE statements
- [ ] S3 upload successful

---

### 6. Backup Restoration

- [ ] Restore FULL backup
- [ ] Database state matches backup
- [ ] Application remains functional
- [ ] No data corruption
- [ ] Restoration logged

**⚠️ WARNING: Only test in development!**

---

### 7. Performance

#### Backup Creation
- [ ] FULL backup < 5 minutes (small DB)
- [ ] INCREMENTAL backup < 2 minutes
- [ ] SCHEMA_ONLY backup < 30 seconds
- [ ] No timeout errors

#### SSE
- [ ] Event latency < 100ms
- [ ] Connection stable for 1 hour+
- [ ] Heartbeat received every 30s
- [ ] No memory leaks

#### Concurrent Operations
- [ ] 5 simultaneous backups work
- [ ] 10 SSE clients connect
- [ ] No database locks
- [ ] No queue overflow

---

### 8. Error Handling

#### Backend Errors
- [ ] Database connection error handled
- [ ] S3 upload error handled
- [ ] Invalid backup type rejected
- [ ] Invalid cron expression rejected
- [ ] Authentication error handled

#### Frontend Errors
- [ ] Network error handled
- [ ] SSE disconnect handled
- [ ] Invalid data handled
- [ ] Loading states displayed
- [ ] Error messages shown

---

### 9. Security

- [ ] Authentication required for all endpoints
- [ ] Admin role verified
- [ ] JWT token validated
- [ ] No sensitive data in errors
- [ ] CORS configured correctly
- [ ] Rate limiting works

---

### 10. Data Integrity

#### Database
- [ ] Backup records created correctly
- [ ] Foreign keys maintained
- [ ] Timestamps accurate
- [ ] Status transitions correct

#### S3
- [ ] Files uploaded to correct bucket
- [ ] File naming convention followed
- [ ] Metadata stored correctly
- [ ] File size matches database

#### BullMQ
- [ ] Jobs created correctly
- [ ] Job data accurate
- [ ] Progress tracking works
- [ ] Failed jobs marked correctly

---

## 🚨 Critical Issues (Must Fix Before Production)

Priority issues that MUST be resolved:

- [ ] **No critical security vulnerabilities**
- [ ] **All backups complete successfully**
- [ ] **Restoration works correctly**
- [ ] **SSE connection stable**
- [ ] **No data loss**
- [ ] **Performance within targets**

---

## 📊 Test Results Summary

**Date Tested**: ____________
**Tester**: ____________
**Environment**: ☐ Dev ☐ Staging ☐ Prod

| Category | Tests | Passed | Failed | Notes |
|----------|-------|--------|--------|-------|
| Backend API | 25 | __ | __ | |
| SSE | 12 | __ | __ | |
| UI Updates | 10 | __ | __ | |
| Scheduling | 8 | __ | __ | |
| Backup Types | 10 | __ | __ | |
| Restoration | 5 | __ | __ | |
| Performance | 8 | __ | __ | |
| Error Handling | 10 | __ | __ | |
| Security | 6 | __ | __ | |
| Data Integrity | 6 | __ | __ | |
| **TOTAL** | **100** | **__** | **__** | |

**Pass Rate**: _____%

---

## ✅ Sign-Off

- [ ] All tests passed
- [ ] No critical issues
- [ ] Documentation complete
- [ ] Ready for production deployment

**QA Engineer**: ____________ **Date**: ______
**Lead Developer**: ____________ **Date**: ______
**Product Owner**: ____________ **Date**: ______

---

## 📝 Notes

Additional observations or issues:

1. ____________________________________________
2. ____________________________________________
3. ____________________________________________

---

**Status**: ☐ In Progress ☐ Complete ☐ Blocked

**Next Step**: ☐ Fix Issues ☐ Deploy to Production ☐ User Acceptance Testing
