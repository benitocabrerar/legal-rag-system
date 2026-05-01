#!/usr/bin/env tsx
/**
 * Security Verification Script for Legal RAG System
 * Run this script to check for common security vulnerabilities
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';
import path from 'path';

interface SecurityCheck {
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  check: () => Promise<boolean>;
  fix?: string;
}

class SecurityAuditor {
  private checks: SecurityCheck[] = [];
  private results: Map<string, boolean> = new Map();

  constructor() {
    this.initializeChecks();
  }

  private initializeChecks() {
    this.checks = [
      {
        name: 'Check for exposed secrets in .env',
        severity: 'CRITICAL',
        check: async () => {
          if (!existsSync('.env')) return true;
          const env = readFileSync('.env', 'utf-8');
          const patterns = [
            /sk-[a-zA-Z0-9]{48}/,  // OpenAI keys
            /SG\.[a-zA-Z0-9]{22}\.[a-zA-Z0-9]{43}/,  // SendGrid
            /AKIA[0-9A-Z]{16}/,  // AWS Access Key
          ];
          return !patterns.some(pattern => pattern.test(env));
        },
        fix: 'Move secrets to environment variables or secrets manager'
      },
      {
        name: 'Check JWT secret configuration',
        severity: 'CRITICAL',
        check: async () => {
          const envPath = '.env';
          if (!existsSync(envPath)) return false;
          const env = readFileSync(envPath, 'utf-8');
          return env.includes('JWT_SECRET=') &&
                 !env.includes('JWT_SECRET=supersecret') &&
                 !env.includes('JWT_SECRET=your-secret-key');
        },
        fix: 'Set a strong, unique JWT_SECRET in environment variables'
      },
      {
        name: 'Check for vulnerable dependencies',
        severity: 'HIGH',
        check: async () => {
          try {
            const output = execSync('npm audit --json', { encoding: 'utf-8' });
            const audit = JSON.parse(output);
            return audit.metadata.vulnerabilities.critical === 0 &&
                   audit.metadata.vulnerabilities.high === 0;
          } catch (error) {
            return false;
          }
        },
        fix: 'Run npm audit fix --force to update vulnerable packages'
      },
      {
        name: 'Check CORS configuration',
        severity: 'HIGH',
        check: async () => {
          const serverPath = 'src/server.ts';
          if (!existsSync(serverPath)) return false;
          const server = readFileSync(serverPath, 'utf-8');
          return !server.includes("origin: process.env.CORS_ORIGIN || '*'");
        },
        fix: 'Configure specific allowed origins instead of wildcard'
      },
      {
        name: 'Check for SQL injection vulnerabilities',
        severity: 'HIGH',
        check: async () => {
          const files = execSync('find src -name "*.ts" -type f', { encoding: 'utf-8' })
            .split('\n')
            .filter(Boolean);

          for (const file of files) {
            if (!existsSync(file)) continue;
            const content = readFileSync(file, 'utf-8');
            if (content.includes('$queryRaw') && content.includes('${')) {
              return false;  // Potential string interpolation in raw query
            }
          }
          return true;
        },
        fix: 'Use parameterized queries instead of string interpolation'
      },
      {
        name: 'Check password policy',
        severity: 'MEDIUM',
        check: async () => {
          const authPath = 'src/routes/auth.ts';
          if (!existsSync(authPath)) return false;
          const auth = readFileSync(authPath, 'utf-8');
          return auth.includes('.min(8)') &&
                 (auth.includes('.regex') || auth.includes('passwordStrength'));
        },
        fix: 'Implement strong password requirements with complexity rules'
      },
      {
        name: 'Check for rate limiting',
        severity: 'MEDIUM',
        check: async () => {
          const serverPath = 'src/server.ts';
          if (!existsSync(serverPath)) return false;
          const server = readFileSync(serverPath, 'utf-8');
          return server.includes('@fastify/rate-limit') &&
                 server.includes('await app.register(rateLimit');
        },
        fix: 'Implement rate limiting on all API endpoints'
      },
      {
        name: 'Check for HTTPS enforcement',
        severity: 'HIGH',
        check: async () => {
          const envPath = '.env';
          if (!existsSync(envPath)) return false;
          const env = readFileSync(envPath, 'utf-8');
          return !env.includes('http://localhost') ||
                 process.env.NODE_ENV === 'development';
        },
        fix: 'Ensure all production URLs use HTTPS'
      },
      {
        name: 'Check for secure headers',
        severity: 'MEDIUM',
        check: async () => {
          const serverPath = 'src/server.ts';
          if (!existsSync(serverPath)) return false;
          const server = readFileSync(serverPath, 'utf-8');
          return server.includes('helmet') ||
                 server.includes('X-Frame-Options') ||
                 server.includes('Content-Security-Policy');
        },
        fix: 'Implement security headers using helmet or manually'
      },
      {
        name: 'Check for audit logging',
        severity: 'MEDIUM',
        check: async () => {
          return existsSync('src/routes/admin/audit.ts');
        },
        fix: 'Implement comprehensive audit logging for all sensitive operations'
      },
      {
        name: 'Check for input validation',
        severity: 'HIGH',
        check: async () => {
          const routesPath = 'src/routes';
          if (!existsSync(routesPath)) return false;
          const hasZod = readFileSync('package.json', 'utf-8').includes('"zod"');
          return hasZod;
        },
        fix: 'Use Zod or similar library for input validation on all endpoints'
      },
      {
        name: 'Check for sensitive data in logs',
        severity: 'MEDIUM',
        check: async () => {
          const files = execSync('find src -name "*.ts" -type f', { encoding: 'utf-8' })
            .split('\n')
            .filter(Boolean);

          for (const file of files) {
            if (!existsSync(file)) continue;
            const content = readFileSync(file, 'utf-8');
            if (content.includes('console.log(password') ||
                content.includes('console.log(token') ||
                content.includes('console.log(secret')) {
              return false;
            }
          }
          return true;
        },
        fix: 'Remove or mask sensitive data from logs'
      },
      {
        name: 'Check for 2FA implementation',
        severity: 'LOW',
        check: async () => {
          return existsSync('src/routes/two-factor.ts');
        },
        fix: 'Implement two-factor authentication for enhanced security'
      },
      {
        name: 'Check for session management',
        severity: 'MEDIUM',
        check: async () => {
          const serverPath = 'src/server.ts';
          if (!existsSync(serverPath)) return false;
          const server = readFileSync(serverPath, 'utf-8');
          return server.includes('jwt') &&
                 (server.includes('refresh') || server.includes('blacklist'));
        },
        fix: 'Implement proper session management with token refresh and revocation'
      },
      {
        name: 'Check for GDPR compliance endpoints',
        severity: 'LOW',
        check: async () => {
          const files = execSync('find src/routes -name "*.ts" -type f', { encoding: 'utf-8' })
            .split('\n')
            .filter(Boolean);

          for (const file of files) {
            if (!existsSync(file)) continue;
            const content = readFileSync(file, 'utf-8');
            if (content.includes('delete') && content.includes('user')) {
              return true;
            }
          }
          return false;
        },
        fix: 'Implement GDPR-compliant data deletion and export endpoints'
      }
    ];
  }

  async runChecks() {
    console.log(chalk.bold.cyan('\n🔒 Security Audit for Legal RAG System\n'));
    console.log(chalk.gray('=' . repeat(60)));

    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let passedCount = 0;

    for (const check of this.checks) {
      try {
        const passed = await check.check();
        this.results.set(check.name, passed);

        const severityColor = {
          'CRITICAL': chalk.red,
          'HIGH': chalk.yellow,
          'MEDIUM': chalk.blue,
          'LOW': chalk.gray
        }[check.severity];

        const statusIcon = passed ? chalk.green('✓') : chalk.red('✗');
        const status = passed ? chalk.green('PASSED') : chalk.red('FAILED');

        console.log(`${statusIcon} ${check.name}`);
        console.log(`  Severity: ${severityColor(check.severity)} | Status: ${status}`);

        if (!passed && check.fix) {
          console.log(chalk.cyan(`  Fix: ${check.fix}`));
        }
        console.log();

        if (!passed) {
          switch (check.severity) {
            case 'CRITICAL': criticalCount++; break;
            case 'HIGH': highCount++; break;
            case 'MEDIUM': mediumCount++; break;
            case 'LOW': lowCount++; break;
          }
        } else {
          passedCount++;
        }
      } catch (error) {
        console.log(chalk.red(`✗ Error running check: ${check.name}`));
        console.log(chalk.gray(`  ${error}`));
        console.log();
      }
    }

    // Summary
    console.log(chalk.gray('=' . repeat(60)));
    console.log(chalk.bold.cyan('\n📊 Summary\n'));

    const total = this.checks.length;
    const score = Math.round((passedCount / total) * 100);

    let scoreColor = chalk.green;
    if (score < 50) scoreColor = chalk.red;
    else if (score < 70) scoreColor = chalk.yellow;

    console.log(`Security Score: ${scoreColor(score + '/100')}`);
    console.log(`Total Checks: ${total}`);
    console.log(`Passed: ${chalk.green(passedCount)}`);
    console.log(`Failed: ${chalk.red(total - passedCount)}`);
    console.log();

    if (criticalCount > 0) {
      console.log(chalk.red(`⚠️  CRITICAL Issues: ${criticalCount}`));
    }
    if (highCount > 0) {
      console.log(chalk.yellow(`⚠️  HIGH Issues: ${highCount}`));
    }
    if (mediumCount > 0) {
      console.log(chalk.blue(`⚠️  MEDIUM Issues: ${mediumCount}`));
    }
    if (lowCount > 0) {
      console.log(chalk.gray(`ℹ️  LOW Issues: ${lowCount}`));
    }

    // Recommendations
    if (criticalCount > 0 || highCount > 0) {
      console.log(chalk.bold.red('\n🚨 IMMEDIATE ACTION REQUIRED'));
      console.log(chalk.red('Critical and high severity issues must be addressed before deployment!'));
    } else if (mediumCount > 0) {
      console.log(chalk.bold.yellow('\n⚠️  ACTION RECOMMENDED'));
      console.log(chalk.yellow('Medium severity issues should be addressed soon.'));
    } else if (passedCount === total) {
      console.log(chalk.bold.green('\n✅ ALL CHECKS PASSED'));
      console.log(chalk.green('Your application meets basic security requirements!'));
    }

    // Generate report
    await this.generateReport(criticalCount, highCount, mediumCount, lowCount, passedCount);

    process.exit(criticalCount > 0 ? 1 : 0);
  }

  private async generateReport(critical: number, high: number, medium: number, low: number, passed: number) {
    const timestamp = new Date().toISOString();
    const report = {
      timestamp,
      summary: {
        totalChecks: this.checks.length,
        passed,
        failed: {
          critical,
          high,
          medium,
          low
        },
        score: Math.round((passed / this.checks.length) * 100)
      },
      checks: Array.from(this.results.entries()).map(([name, passed]) => {
        const check = this.checks.find(c => c.name === name);
        return {
          name,
          severity: check?.severity,
          passed,
          fix: check?.fix
        };
      })
    };

    const reportPath = path.join(process.cwd(), 'security-audit-report.json');
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(chalk.gray(`\nDetailed report saved to: ${reportPath}`));
  }
}

// Run the audit
const auditor = new SecurityAuditor();
auditor.runChecks().catch(console.error);