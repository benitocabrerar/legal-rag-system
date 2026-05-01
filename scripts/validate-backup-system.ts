/**
 * Backup System Validation Script
 *
 * Pre-testing validation to ensure all components are integrated correctly
 * Checks: Files exist, imports work, database schema, Redis connection
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface ValidationResult {
  category: string;
  checks: {
    name: string;
    passed: boolean;
    message: string;
  }[];
}

const results: ValidationResult[] = [];

/**
 * Color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Print formatted output
 */
function print(message: string, color: keyof typeof colors = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

/**
 * Add check result
 */
function addCheck(category: string, name: string, passed: boolean, message: string) {
  let categoryResult = results.find(r => r.category === category);

  if (!categoryResult) {
    categoryResult = { category, checks: [] };
    results.push(categoryResult);
  }

  categoryResult.checks.push({ name, passed, message });

  const icon = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  print(`  ${icon} ${name}: ${message}`, color);
}

/**
 * Validate file existence
 */
async function validateFiles() {
  print('\n📁 Validating Files...', 'blue');

  const filesToCheck = [
    // Backend routes
    { path: 'src/routes/backup.ts', description: 'Backup routes' },
    { path: 'src/routes/backup-sse.ts', description: 'SSE routes' },

    // Frontend hooks
    { path: 'frontend/src/hooks/useBackupSSE.ts', description: 'SSE React hooks' },

    // Frontend pages
    { path: 'frontend/src/app/admin/backups/page.tsx', description: 'Admin backup page' },

    // Tests
    { path: 'tests/backup-system-e2e.test.ts', description: 'E2E test suite' },

    // Documentation
    { path: 'BACKUP_SYSTEM_REAL_TIME_MONITORING_COMPLETE.md', description: 'SSE documentation' },
    { path: 'BACKUP_SYSTEM_TESTING_GUIDE.md', description: 'Testing guide' },
    { path: 'BACKUP_TESTING_CHECKLIST.md', description: 'Testing checklist' }
  ];

  for (const file of filesToCheck) {
    try {
      await fs.access(file.path);
      addCheck('Files', file.description, true, `Found at ${file.path}`);
    } catch (error) {
      addCheck('Files', file.description, false, `Missing: ${file.path}`);
    }
  }
}

/**
 * Validate database schema
 */
async function validateDatabase() {
  print('\n🗄️  Validating Database Schema...', 'blue');

  try {
    // Check if Backup table exists
    const backups = await prisma.backup.findMany({ take: 1 });
    addCheck('Database', 'Backup table', true, 'Table exists and accessible');

    // Check Backup table columns
    const backup = await prisma.backup.findFirst({
      select: {
        id: true,
        type: true,
        status: true,
        s3Key: true,
        size: true,
        compressedSize: true,
        recordCount: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        createdBy: true,
        scheduleId: true,
        name: true,
        storageLocation: true
      }
    });

    addCheck('Database', 'Backup columns', true, 'All required columns present');

    // Check BackupSchedule table
    const schedules = await prisma.backupSchedule.findMany({ take: 1 });
    addCheck('Database', 'BackupSchedule table', true, 'Table exists and accessible');

    // Check User table (for relations)
    const users = await prisma.user.findMany({ take: 1 });
    addCheck('Database', 'User table', true, 'Table exists and accessible');

    // Verify enums
    const enumCheck = await prisma.$queryRaw`
      SELECT enumlabel FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BackupType')
    ` as any[];

    const expectedTypes = ['FULL', 'INCREMENTAL', 'DIFFERENTIAL', 'SCHEMA_ONLY', 'DATA_ONLY'];
    const hasAllTypes = expectedTypes.every(type =>
      enumCheck.some((row: any) => row.enumlabel === type)
    );

    if (hasAllTypes) {
      addCheck('Database', 'BackupType enum', true, `All types present: ${expectedTypes.join(', ')}`);
    } else {
      addCheck('Database', 'BackupType enum', false, 'Missing some backup types');
    }

  } catch (error: any) {
    addCheck('Database', 'Connection', false, error.message);
  }
}

/**
 * Validate Redis connection
 */
async function validateRedis() {
  print('\n🔴 Validating Redis Connection...', 'blue');

  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });

    // Test ping
    const pong = await redis.ping();
    addCheck('Redis', 'Connection', true, `PING returned: ${pong}`);

    // Test set/get
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    await redis.del('test-key');

    if (value === 'test-value') {
      addCheck('Redis', 'Read/Write', true, 'Set and get operations work');
    } else {
      addCheck('Redis', 'Read/Write', false, 'Could not verify read/write');
    }

    // Check BullMQ compatibility
    const queue = new Queue('test-queue', { connection: redis });
    const job = await queue.add('test-job', { test: 'data' });
    await job.remove();
    await queue.close();

    addCheck('Redis', 'BullMQ compatibility', true, 'Queue operations work');

    await redis.quit();

  } catch (error: any) {
    addCheck('Redis', 'Connection', false, error.message);
  }
}

/**
 * Validate environment variables
 */
async function validateEnvironment() {
  print('\n🌍 Validating Environment Variables...', 'blue');

  const requiredVars = [
    { name: 'DATABASE_URL', description: 'PostgreSQL connection' },
    { name: 'JWT_SECRET', description: 'JWT authentication' },
    { name: 'AWS_S3_BUCKET', description: 'S3 bucket for backups' },
    { name: 'AWS_ACCESS_KEY_ID', description: 'AWS credentials' },
    { name: 'AWS_SECRET_ACCESS_KEY', description: 'AWS credentials' }
  ];

  const optionalVars = [
    { name: 'REDIS_HOST', description: 'Redis host (default: localhost)', default: 'localhost' },
    { name: 'REDIS_PORT', description: 'Redis port (default: 6379)', default: '6379' },
    { name: 'REDIS_PASSWORD', description: 'Redis password (if required)', default: 'none' }
  ];

  // Check required variables
  for (const varInfo of requiredVars) {
    if (process.env[varInfo.name]) {
      addCheck('Environment', varInfo.name, true, varInfo.description);
    } else {
      addCheck('Environment', varInfo.name, false, `Missing: ${varInfo.description}`);
    }
  }

  // Check optional variables
  for (const varInfo of optionalVars) {
    if (process.env[varInfo.name]) {
      addCheck('Environment', varInfo.name, true, `Set: ${varInfo.description}`);
    } else {
      addCheck('Environment', varInfo.name, true, `Using default: ${varInfo.default}`);
    }
  }
}

/**
 * Validate server routes registration
 */
async function validateServerRoutes() {
  print('\n🚀 Validating Server Routes...', 'blue');

  try {
    const serverFile = await fs.readFile('src/server.ts', 'utf-8');

    // Check backup routes import
    if (serverFile.includes("import backupRoutes from './routes/backup.js'")) {
      addCheck('Server', 'Backup routes import', true, 'Import statement found');
    } else {
      addCheck('Server', 'Backup routes import', false, 'Import statement missing');
    }

    // Check SSE routes import
    if (serverFile.includes("import { backupSSERoutes } from './routes/backup-sse.js'")) {
      addCheck('Server', 'SSE routes import', true, 'Import statement found');
    } else {
      addCheck('Server', 'SSE routes import', false, 'Import statement missing');
    }

    // Check backup routes registration
    if (serverFile.includes("app.register(backupRoutes, { prefix: '/api/admin' })")) {
      addCheck('Server', 'Backup routes registration', true, 'Registration found');
    } else {
      addCheck('Server', 'Backup routes registration', false, 'Registration missing');
    }

    // Check SSE routes registration
    if (serverFile.includes("app.register(backupSSERoutes, { prefix: '/api/admin' })")) {
      addCheck('Server', 'SSE routes registration', true, 'Registration found');
    } else {
      addCheck('Server', 'SSE routes registration', false, 'Registration missing');
    }

  } catch (error: any) {
    addCheck('Server', 'File access', false, error.message);
  }
}

/**
 * Validate frontend integration
 */
async function validateFrontend() {
  print('\n⚛️  Validating Frontend Integration...', 'blue');

  try {
    const pageFile = await fs.readFile('frontend/src/app/admin/backups/page.tsx', 'utf-8');

    // Check hooks import
    if (pageFile.includes("import { useActiveBackups, useBackupSSE } from '@/hooks/useBackupSSE'")) {
      addCheck('Frontend', 'SSE hooks import', true, 'Import statement found');
    } else {
      addCheck('Frontend', 'SSE hooks import', false, 'Import statement missing');
    }

    // Check useActiveBackups usage
    if (pageFile.includes('useActiveBackups(true)')) {
      addCheck('Frontend', 'useActiveBackups hook', true, 'Hook usage found');
    } else {
      addCheck('Frontend', 'useActiveBackups hook', false, 'Hook not used');
    }

    // Check useBackupSSE usage
    if (pageFile.includes('useBackupSSE({')) {
      addCheck('Frontend', 'useBackupSSE hook', true, 'Hook usage found');
    } else {
      addCheck('Frontend', 'useBackupSSE hook', false, 'Hook not used');
    }

    // Check connection indicator
    if (pageFile.includes('Tiempo Real Activo')) {
      addCheck('Frontend', 'Connection indicator', true, 'UI element found');
    } else {
      addCheck('Frontend', 'Connection indicator', false, 'UI element missing');
    }

    // Check active backups section
    if (pageFile.includes('Respaldos en Progreso')) {
      addCheck('Frontend', 'Active backups section', true, 'UI element found');
    } else {
      addCheck('Frontend', 'Active backups section', false, 'UI element missing');
    }

  } catch (error: any) {
    addCheck('Frontend', 'File access', false, error.message);
  }
}

/**
 * Print summary
 */
function printSummary() {
  print('\n' + '='.repeat(60), 'cyan');
  print('📊 VALIDATION SUMMARY', 'cyan');
  print('='.repeat(60), 'cyan');

  let totalChecks = 0;
  let passedChecks = 0;

  for (const result of results) {
    const categoryPassed = result.checks.filter(c => c.passed).length;
    const categoryTotal = result.checks.length;
    const categoryPassRate = ((categoryPassed / categoryTotal) * 100).toFixed(0);

    totalChecks += categoryTotal;
    passedChecks += categoryPassed;

    const color = categoryPassed === categoryTotal ? 'green' :
                  categoryPassed > categoryTotal / 2 ? 'yellow' : 'red';

    print(`\n${result.category}: ${categoryPassed}/${categoryTotal} (${categoryPassRate}%)`, color);
  }

  const overallPassRate = ((passedChecks / totalChecks) * 100).toFixed(0);
  const overallColor = passedChecks === totalChecks ? 'green' :
                       passedChecks > totalChecks / 2 ? 'yellow' : 'red';

  print('\n' + '-'.repeat(60), 'cyan');
  print(`OVERALL: ${passedChecks}/${totalChecks} (${overallPassRate}%)`, overallColor);
  print('='.repeat(60), 'cyan');

  if (passedChecks === totalChecks) {
    print('\n✅ All validation checks passed! System is ready for testing.', 'green');
  } else {
    print('\n⚠️  Some validation checks failed. Please fix issues before testing.', 'yellow');
  }
}

/**
 * Main validation function
 */
async function main() {
  print('╔════════════════════════════════════════════════════════════╗', 'cyan');
  print('║     BACKUP SYSTEM VALIDATION                               ║', 'cyan');
  print('║     Pre-Testing Integration Check                          ║', 'cyan');
  print('╚════════════════════════════════════════════════════════════╝', 'cyan');

  try {
    await validateEnvironment();
    await validateFiles();
    await validateDatabase();
    await validateRedis();
    await validateServerRoutes();
    await validateFrontend();

    printSummary();

  } catch (error: any) {
    print(`\n❌ Validation failed with error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run validation
main();
