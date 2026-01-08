/**
 * Enhanced Application Logger for Production Release
 *
 * This module provides application-specific logging utilities for tracking
 * installation, startup, runtime events, and errors in production.
 *
 * Logs are written to a file that persists across app restarts.
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  message: string;
  data?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
}

class AppLogger {
  private logFilePath: string;
  private isInitialized = false;

  constructor() {
    this.logFilePath = this.resolveLogFilePath();
    this.initialize();
  }

  private resolveLogFilePath(): string {
    // Use user data directory for logs in production
    const userDataPath = app.getPath('userData');
    const logsDir = path.join(userDataPath, 'logs');

    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    return path.join(logsDir, 'focus-app.log');
  }

  private initialize(): void {
    try {
      // Create log file if it doesn't exist
      if (!fs.existsSync(this.logFilePath)) {
        fs.writeFileSync(this.logFilePath, '', 'utf-8');
      }

      // Rotate log file if it's too large (> 10MB)
      const stats = fs.statSync(this.logFilePath);
      if (stats.size > 10 * 1024 * 1024) {
        this.rotateLogFile();
      }

      this.isInitialized = true;
      this.log(LogLevel.INFO, 'logger_init', 'Logger initialized', {
        logFilePath: this.logFilePath,
      });
    } catch (error) {
      console.error('[Logger] Failed to initialize:', error);
    }
  }

  private rotateLogFile(): void {
    try {
      const backupPath = `${this.logFilePath}.old`;

      // Delete old backup if it exists
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }

      // Rename current log to backup
      fs.renameSync(this.logFilePath, backupPath);

      // Create new log file
      fs.writeFileSync(this.logFilePath, '', 'utf-8');
    } catch (error) {
      console.error('[Logger] Failed to rotate log file:', error);
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const baseLog = `[${entry.timestamp}] [${entry.level}] [${entry.event}] ${entry.message}`;

    if (entry.data || entry.error) {
      const details: any = {};
      if (entry.data) details.data = entry.data;
      if (entry.error) details.error = entry.error;
      return `${baseLog} ${JSON.stringify(details)}`;
    }

    return baseLog;
  }

  private log(
    level: LogLevel,
    event: string,
    message: string,
    data?: Record<string, any>,
    error?: Error
  ): void {
    if (!this.isInitialized) {
      console.warn('[Logger] Not initialized, skipping log');
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      message,
      data,
      error: error ? { message: error.message, stack: error.stack } : undefined,
    };

    const logLine = this.formatLogEntry(entry) + '\n';

    try {
      fs.appendFileSync(this.logFilePath, logLine, 'utf-8');

      // Also log to console for debugging
      const consoleMethod = level === LogLevel.ERROR || level === LogLevel.CRITICAL
        ? console.error
        : level === LogLevel.WARNING
        ? console.warn
        : console.log;

      consoleMethod(`[Logger] ${logLine.trim()}`);
    } catch (error) {
      console.error('[Logger] Failed to write log:', error);
    }
  }

  logStartup(data?: Record<string, any>): void {
    this.log(LogLevel.INFO, 'app_startup', 'Application starting', {
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      platform: process.platform,
      arch: process.arch,
      isPackaged: app.isPackaged,
      ...data,
    });
  }

  logInstallation(status: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, 'installation', `Installation ${status}`, data);
  }

  logBackendStart(status: string, data?: Record<string, any>): void {
    const level = status === 'success' ? LogLevel.INFO : LogLevel.ERROR;
    this.log(level, 'backend_start', `Backend start ${status}`, data);
  }

  logBackendError(message: string, error?: Error, data?: Record<string, any>): void {
    this.log(LogLevel.ERROR, 'backend_error', message, data, error);
  }

  logWindowCreation(status: string, data?: Record<string, any>): void {
    const level = status === 'success' ? LogLevel.INFO : LogLevel.ERROR;
    this.log(level, 'window_creation', `Window creation ${status}`, data);
  }

  logDatabaseOperation(operation: string, status: string, data?: Record<string, any>): void {
    const level = status === 'success' ? LogLevel.INFO : LogLevel.ERROR;
    this.log(level, 'database_operation', `Database ${operation} ${status}`, data);
  }

  logSpaceOperation(operation: string, status: string, data?: Record<string, any>): void {
    const level = status === 'success' ? LogLevel.INFO : LogLevel.ERROR;
    this.log(level, 'space_operation', `Space ${operation} ${status}`, data);
  }

  logObjectOperation(operation: string, status: string, data?: Record<string, any>): void {
    const level = status === 'success' ? LogLevel.INFO : LogLevel.ERROR;
    this.log(level, 'object_operation', `Object ${operation} ${status}`, data);
  }

  logError(errorType: string, message: string, error?: Error, data?: Record<string, any>): void {
    this.log(LogLevel.ERROR, errorType, message, data, error);
  }

  logWarning(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARNING, 'warning', message, data);
  }

  logInfo(event: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, event, message, data);
  }

  logDebug(event: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, event, message, data);
  }

  getLogPath(): string {
    return this.logFilePath;
  }
}

// Global instance
let appLogger: AppLogger | null = null;

export function getAppLogger(): AppLogger {
  if (!appLogger) {
    appLogger = new AppLogger();
  }
  return appLogger;
}

export function logStartup(data?: Record<string, any>): void {
  getAppLogger().logStartup(data);
}

export function logInstallation(status: string, data?: Record<string, any>): void {
  getAppLogger().logInstallation(status, data);
}

export function logBackendStart(status: string, data?: Record<string, any>): void {
  getAppLogger().logBackendStart(status, data);
}

export function logBackendError(message: string, error?: Error, data?: Record<string, any>): void {
  getAppLogger().logBackendError(message, error, data);
}

export function logWindowCreation(status: string, data?: Record<string, any>): void {
  getAppLogger().logWindowCreation(status, data);
}

export function logDatabaseOperation(operation: string, status: string, data?: Record<string, any>): void {
  getAppLogger().logDatabaseOperation(operation, status, data);
}

export function logSpaceOperation(operation: string, status: string, data?: Record<string, any>): void {
  getAppLogger().logSpaceOperation(operation, status, data);
}

export function logObjectOperation(operation: string, status: string, data?: Record<string, any>): void {
  getAppLogger().logObjectOperation(operation, status, data);
}

export function logError(errorType: string, message: string, error?: Error, data?: Record<string, any>): void {
  getAppLogger().logError(errorType, message, error, data);
}

export function logWarning(message: string, data?: Record<string, any>): void {
  getAppLogger().logWarning(message, data);
}

export function logInfo(event: string, message: string, data?: Record<string, any>): void {
  getAppLogger().logInfo(event, message, data);
}

export function logDebug(event: string, message: string, data?: Record<string, any>): void {
  getAppLogger().logDebug(event, message, data);
}
