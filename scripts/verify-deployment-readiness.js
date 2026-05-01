#!/usr/bin/env node
/**
 * Deployment Readiness Verification Script
 *
 * Checks all critical deployment requirements before pushing to Render
 * Run this locally after applying fixes to ensure deployment will succeed
 *
 * Usage: node scripts/verify-deployment-readiness.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Render Deployment Readiness Check\n');
console.log('=====================================\n');

let errors = 0;
let warnings = 0;
let passed = 0;

/**
 * Test runner helper
 */
function test(name, fn) {
  try {
    const result = fn();
    if (result === true) {
      console.log(`✅ ${name}`);
      passed++;
    } else if (result === 'warning') {
      console.log(`⚠️  ${name}`);
      warnings++;
    } else {
      console.log(`❌ ${name}`);
      errors++;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    errors++;
  }
}

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

/**
 * Check file content for pattern
 */
function fileContains(filePath, pattern) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return false;
  const content = fs.readFileSync(fullPath, 'utf8');
  return pattern.test(content);
}

/**
 * Run shell command and return success
 */
function runCommand(command) {
  try {
    execSync(command, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

console.log('📦 Configuration Files\n');

test('package.json exists', () => fileExists('package.json'));
test('tsconfig.json exists', () => fileExists('tsconfig.json'));
test('render.yaml exists', () => fileExists('render.yaml'));
test('prisma/schema.prisma exists', () => fileExists('prisma/schema.prisma'));

console.log('\n🔧 Package.json Configuration\n');

test('package.json has type: module', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return pkg.type === 'module';
});

test('start script uses node (not tsx)', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return pkg.scripts.start === 'node dist/server.js';
});

test('build script includes TypeScript compilation', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return pkg.scripts.build && pkg.scripts.build.includes('tsc');
});

console.log('\n⚙️  TypeScript Configuration\n');

test('tsconfig.json uses NodeNext module resolution', () => {
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  return tsconfig.compilerOptions.moduleResolution === 'NodeNext' ||
         tsconfig.compilerOptions.moduleResolution === 'node16';
});

test('tsconfig.json excludes lib/api routes', () => {
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  if (!tsconfig.exclude) return 'warning';
  return tsconfig.exclude.some(pattern => pattern.includes('lib/api'));
});

test('tsconfig.json target is ES2022 or higher', () => {
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  return tsconfig.compilerOptions.target === 'ES2022' ||
         tsconfig.compilerOptions.target === 'ES2023';
});

console.log('\n🚀 Render Configuration\n');

test('render.yaml includes npm run build', () => {
  return fileContains('render.yaml', /npm run build/);
});

test('render.yaml start command uses node dist/server.js', () => {
  return fileContains('render.yaml', /node dist\/server\.js/);
});

test('render.yaml has health check path', () => {
  return fileContains('render.yaml', /healthCheckPath/);
});

test('render.yaml uses npm ci (not npm install)', () => {
  return fileContains('render.yaml', /npm ci/);
});

console.log('\n📝 Source Code Checks\n');

test('OpenTelemetry import uses Resource (not OTELResource)', () => {
  return fileContains('src/config/telemetry.ts', /import \{ Resource \} from '@opentelemetry\/resources'/);
});

test('OpenTelemetry config uses Resource.default', () => {
  return fileContains('src/config/telemetry.ts', /Resource\.default\(/);
});

test('server.ts has conditional OpenTelemetry init', () => {
  const serverContent = fs.readFileSync('src/server.ts', 'utf8');
  // Check if telemetry is either disabled or has conditional check
  const hasConditional = /if \(process\.env\.OTEL/.test(serverContent);
  const isCommented = /\/\/ import \{ initializeTelemetry \}/.test(serverContent);
  return hasConditional || isCommented;
});

console.log('\n🔨 Build Verification\n');

test('TypeScript compiles without errors', () => {
  try {
    console.log('   (Running: npm run build...)');
    execSync('npm run build', { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.log('   Error output:', error.stdout?.toString());
    return false;
  }
});

test('dist/ directory created', () => {
  return fileExists('dist/server.js');
});

test('Prisma client generated', () => {
  return fileExists('node_modules/@prisma/client');
});

console.log('\n📂 File Structure\n');

test('dist/server.js exists after build', () => fileExists('dist/server.js'));
test('dist/config/telemetry.js exists', () => fileExists('dist/config/telemetry.js'));
test('dist/routes/ directory exists', () => fileExists('dist/routes'));
test('dist/services/ directory exists', () => fileExists('dist/services'));

console.log('\n🔒 Security Checks\n');

test('.env file exists (local development)', () => {
  const exists = fileExists('.env');
  if (!exists) {
    console.log('   ⚠️  Create .env from .env.example for local testing');
    return 'warning';
  }
  return true;
});

test('.gitignore excludes .env', () => {
  return fileContains('.gitignore', /^\.env$/m);
});

test('No hardcoded secrets in source code', () => {
  // Basic check for common secret patterns
  const hasSecrets = fileContains('src/server.ts', /sk-[a-zA-Z0-9]{32,}/) ||
                     fileContains('src/server.ts', /AKIA[A-Z0-9]{16}/);
  return !hasSecrets;
});

console.log('\n📋 Required Dependencies\n');

test('fastify installed', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return !!pkg.dependencies.fastify;
});

test('prisma installed', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return !!pkg.devDependencies.prisma && !!pkg.dependencies['@prisma/client'];
});

test('TypeScript installed', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return !!pkg.devDependencies.typescript;
});

test('OpenTelemetry packages installed', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return !!pkg.dependencies['@opentelemetry/sdk-node'];
});

console.log('\n🌍 Environment Variables (Render Dashboard)\n');

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'OPENAI_API_KEY',
  'AWS_S3_BUCKET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'SENDGRID_API_KEY',
  'PINECONE_API_KEY',
  'CORS_ORIGIN'
];

console.log('   ⚠️  These must be configured in Render Dashboard:');
requiredEnvVars.forEach(envVar => {
  console.log(`      - ${envVar}`);
});
warnings += requiredEnvVars.length;

console.log('\n📊 Summary\n');
console.log('=====================================\n');

console.log(`✅ Passed:   ${passed}`);
console.log(`⚠️  Warnings: ${warnings}`);
console.log(`❌ Errors:   ${errors}\n`);

if (errors === 0 && warnings <= requiredEnvVars.length) {
  console.log('🎉 Deployment Readiness: READY\n');
  console.log('Next steps:');
  console.log('1. Commit and push your changes');
  console.log('2. Configure environment variables in Render Dashboard');
  console.log('3. Monitor deployment in Render logs');
  console.log('4. Verify endpoints after deployment\n');
  process.exit(0);
} else if (errors === 0) {
  console.log('⚠️  Deployment Readiness: REVIEW WARNINGS\n');
  console.log('You can deploy, but review warnings above.\n');
  process.exit(0);
} else {
  console.log('❌ Deployment Readiness: NOT READY\n');
  console.log('Fix the errors above before deploying.\n');
  console.log('See DEPLOYMENT_QUICK_FIX_GUIDE.md for solutions.\n');
  process.exit(1);
}
