import { isDevelopment } from './config';

// ============================================================================
// Simple Logger Utility
// ============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
}

class Logger {
  private formatMessage(entry: LogEntry): string {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️ ',
      warn: '⚠️ ',
      error: '❌',
    };

    const prefix = `${emoji[entry.level]} [${entry.timestamp}] [${entry.level.toUpperCase()}]`;

    if (entry.data) {
      return `${prefix} ${entry.message}\n${JSON.stringify(entry.data, null, 2)}`;
    }

    return `${prefix} ${entry.message}`;
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };

    const formatted = this.formatMessage(entry);

    switch (level) {
      case 'debug':
        if (isDevelopment) console.log(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data);
  }

  // HTTP request logging
  http(method: string, url: string, status: number, duration: number) {
    const statusEmoji = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
    this.info(`${statusEmoji} ${method} ${url} - ${status} (${duration}ms)`);
  }
}

export const logger = new Logger();
