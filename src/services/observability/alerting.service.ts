/**
 * Alerting Service
 *
 * Automated alerts for critical system metrics
 * Week 5-6: Observabilidad - Automated Alerting
 */

import { getMetricsService } from './metrics.service';
import { getHealthService } from './health.service';

export interface Alert {
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AlertChannel {
  send(alert: Alert): Promise<void>;
}

/**
 * Email Alert Channel (SendGrid)
 */
export class EmailAlertChannel implements AlertChannel {
  private enabled: boolean;
  private from: string;
  private to: string;

  constructor() {
    this.enabled = !!process.env.SENDGRID_API_KEY;
    this.from = process.env.ALERT_EMAIL_FROM || 'alerts@example.com';
    this.to = process.env.ALERT_EMAIL_TO || 'team@example.com';
  }

  async send(alert: Alert): Promise<void> {
    if (!this.enabled) {
      console.log('[AlertEmail] Email alerts not configured, skipping');
      return;
    }

    // TODO: Implement SendGrid integration when needed
    console.log('[AlertEmail] Would send email:', {
      from: this.from,
      to: this.to,
      subject: `[${alert.level.toUpperCase()}] ${alert.title}`,
      text: alert.message,
    });
  }
}

/**
 * Slack Alert Channel (Webhook)
 */
export class SlackAlertChannel implements AlertChannel {
  private enabled: boolean;
  private webhookUrl: string;
  private channel: string;

  constructor() {
    this.enabled = !!process.env.SLACK_WEBHOOK_URL;
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
    this.channel = process.env.SLACK_CHANNEL || '#alerts';
  }

  async send(alert: Alert): Promise<void> {
    if (!this.enabled) {
      console.log('[AlertSlack] Slack alerts not configured, skipping');
      return;
    }

    const color = this.getColorForLevel(alert.level);
    const payload = {
      channel: this.channel,
      username: 'Legal RAG Monitor',
      icon_emoji: ':rotating_light:',
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.message,
          fields: alert.metadata
            ? Object.entries(alert.metadata).map(([key, value]) => ({
                title: key,
                value: String(value),
                short: true,
              }))
            : [],
          footer: 'Legal RAG Monitoring',
          ts: Math.floor(new Date(alert.timestamp).getTime() / 1000),
        },
      ],
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('[AlertSlack] Failed to send alert:', response.statusText);
      }
    } catch (error) {
      console.error('[AlertSlack] Error sending alert:', error);
    }
  }

  private getColorForLevel(level: Alert['level']): string {
    switch (level) {
      case 'info':
        return '#36a64f'; // Green
      case 'warning':
        return '#FFA500'; // Orange
      case 'error':
        return '#FF4500'; // Red-Orange
      case 'critical':
        return '#FF0000'; // Red
      default:
        return '#808080'; // Gray
    }
  }
}

/**
 * Console Alert Channel (for development)
 */
export class ConsoleAlertChannel implements AlertChannel {
  async send(alert: Alert): Promise<void> {
    const emoji = this.getEmojiForLevel(alert.level);
    console.log(`\n${emoji} [ALERT - ${alert.level.toUpperCase()}] ${alert.title}`);
    console.log(`   ${alert.message}`);
    if (alert.metadata) {
      console.log('   Metadata:', alert.metadata);
    }
    console.log(`   Time: ${alert.timestamp}\n`);
  }

  private getEmojiForLevel(level: Alert['level']): string {
    switch (level) {
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'critical':
        return '🚨';
      default:
        return '📢';
    }
  }
}

/**
 * Alerting Service
 */
export class AlertingService {
  private channels: AlertChannel[] = [];
  private metricsService = getMetricsService();
  private healthService = getHealthService();
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    // Initialize alert channels
    this.channels.push(new ConsoleAlertChannel());

    if (process.env.SLACK_WEBHOOK_URL) {
      this.channels.push(new SlackAlertChannel());
    }

    if (process.env.SENDGRID_API_KEY) {
      this.channels.push(new EmailAlertChannel());
    }
  }

  /**
   * Send alert to all configured channels
   */
  async sendAlert(alert: Alert): Promise<void> {
    for (const channel of this.channels) {
      try {
        await channel.send(alert);
      } catch (error) {
        console.error('[Alerting] Failed to send alert via channel:', error);
      }
    }
  }

  /**
   * Start monitoring and automated alerting
   */
  startMonitoring(intervalSeconds: number = 60): void {
    console.log(`✅ Starting automated monitoring (interval: ${intervalSeconds}s)`);

    this.monitoringInterval = setInterval(async () => {
      await this.checkHealthAlerts();
    }, intervalSeconds * 1000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log('✅ Stopped automated monitoring');
    }
  }

  /**
   * Check health and send alerts if needed
   */
  private async checkHealthAlerts(): Promise<void> {
    try {
      const health = await this.healthService.healthCheck();

      // Alert on overall unhealthy status
      if (health.status === 'unhealthy') {
        await this.sendAlert({
          level: 'critical',
          title: 'System Unhealthy',
          message: 'One or more critical services are down',
          timestamp: new Date().toISOString(),
          metadata: {
            status: health.status,
            checks: Object.entries(health.checks)
              .filter(([_, check]) => check.status === 'down')
              .map(([name]) => name)
              .join(', '),
          },
        });
      }

      // Alert on degraded status
      if (health.status === 'degraded') {
        await this.sendAlert({
          level: 'warning',
          title: 'System Degraded',
          message: 'One or more services are experiencing issues',
          timestamp: new Date().toISOString(),
          metadata: {
            status: health.status,
            checks: Object.entries(health.checks)
              .filter(([_, check]) => check.status === 'degraded')
              .map(([name]) => name)
              .join(', '),
          },
        });
      }

      // Check individual service health
      for (const [serviceName, check] of Object.entries(health.checks)) {
        // Alert on high database latency
        if (serviceName === 'database' && check.responseTime && check.responseTime > 2000) {
          await this.sendAlert({
            level: 'warning',
            title: 'High Database Latency',
            message: `Database queries taking ${check.responseTime}ms (threshold: 2000ms)`,
            timestamp: new Date().toISOString(),
            metadata: {
              responseTime: `${check.responseTime}ms`,
              status: check.status,
            },
          });
        }

        // Alert on Redis connection issues
        if (serviceName === 'redis' && check.status === 'down') {
          await this.sendAlert({
            level: 'error',
            title: 'Redis Connection Failed',
            message: check.message || 'Unable to connect to Redis',
            timestamp: new Date().toISOString(),
            metadata: {
              status: check.status,
            },
          });
        }
      }
    } catch (error) {
      console.error('[Alerting] Error checking health:', error);
    }
  }
}

// Singleton instance
let alertingServiceInstance: AlertingService | null = null;

export function getAlertingService(): AlertingService {
  if (!alertingServiceInstance) {
    alertingServiceInstance = new AlertingService();
  }
  return alertingServiceInstance;
}
