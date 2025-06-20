/**
 * Lightweight structured logging for ALECS
 * Provides correlation tracking and performance metrics without external dependencies
 */

import { createHash } from 'crypto';

export interface LogContext {
  correlationId: string;
  toolName?: string;
  customer?: string;
  duration?: number;
  error?: boolean;
  [key: string]: any;
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  _context: LogContext;
}

class StructuredLogger {
  private static instance: StructuredLogger;
  private logLevel: LogLevel = LogLevel.INFO;
  private correlations = new Map<string, LogEntry[]>();
  private metricsCollector: MetricsCollector;

  private constructor() {
    this.metricsCollector = new MetricsCollector();
    this.logLevel = this.getLogLevelFromEnv();
  }

  static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.ALECS_LOG_LEVEL?.toUpperCase();
    return LogLevel[envLevel as keyof typeof LogLevel] || LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private sanitizeContext(_context: LogContext): LogContext {
    const sanitized = { ...context };

    // Sanitize sensitive fields
    const sensitiveFields = ['client_secret', 'access_token', 'password', 'key'];

    Object.keys(sanitized).forEach((key) => {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = '***REDACTED***';
      }
    });

    return sanitized;
  }

  private formatLogEntry(entry: LogEntry): string {
    if (process.env.ALECS_LOG_FORMAT === 'json') {
      return JSON.stringify({
        ...entry,
        _context: this.sanitizeContext(entry.context),
      });
    }

    // Human-readable format for development
    const { timestamp, level, message, context } = entry;
    const sanitizedContext = this.sanitizeContext(context);
    const contextStr = Object.keys(sanitizedContext)
      .filter((k) => k !== 'correlationId')
      .map((k) => `${k}=${JSON.stringify(sanitizedContext[k])}`)
      .join(' ');

    return `[${timestamp}] ${level} [${context.correlationId}] ${message} ${contextStr}`.trim();
  }

  log(level: LogLevel, message: string, _context: LogContext): void {
    if (!this.shouldLog(level)) {
return;
}

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    // Store for correlation analysis
    const existing = this.correlations.get(context.correlationId) || [];
    this.correlations.set(context.correlationId, [...existing, entry]);

    // Output log
    const formatted = this.formatLogEntry(entry);
    if (level === LogLevel.ERROR) {
      console.error(formatted);
    } else {
      console.log(formatted);
    }

    // Update metrics
    if (context.toolName && context.duration !== undefined) {
      this.metricsCollector.recordToolExecution(
        context.toolName,
        context.duration,
        context.error || false,
      );
    }
  }

  debug(message: string, _context: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, _context: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, _context: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, _context: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  getCorrelationLogs(correlationId: string): LogEntry[] {
    return this.correlations.get(correlationId) || [];
  }

  getMetrics(): any {
    return this.metricsCollector.getSummary();
  }

  clearOldCorrelations(maxAgeMs = 3600000): void {
    const cutoff = Date.now() - maxAgeMs;

    for (const [correlationId, entries] of this.correlations.entries()) {
      const lastEntry = entries[entries.length - 1];
      if (!lastEntry) {
continue;
}
      const lastTimestamp = new Date(lastEntry.timestamp).getTime();

      if (lastTimestamp < cutoff) {
        this.correlations.delete(correlationId);
      }
    }
  }
}

/**
 * Lightweight metrics collection
 */
class MetricsCollector {
  private toolMetrics = new Map<
    string,
    {
      count: number;
      totalDuration: number;
      errors: number;
      minDuration: number;
      maxDuration: number;
    }
  >();

  recordToolExecution(toolName: string, duration: number, _error: boolean): void {
    const existing = this.toolMetrics.get(toolName) || {
      count: 0,
      totalDuration: 0,
      errors: 0,
      minDuration: Infinity,
      maxDuration: 0,
    };

    this.toolMetrics.set(toolName, {
      count: existing.count + 1,
      totalDuration: existing.totalDuration + duration,
      errors: existing.errors + (error ? 1 : 0),
      minDuration: Math.min(existing.minDuration, duration),
      maxDuration: Math.max(existing.maxDuration, duration),
    });
  }

  getSummary(): any {
    const summary: any = {};

    for (const [tool, metrics] of this.toolMetrics.entries()) {
      summary[tool] = {
        count: metrics.count,
        avgDuration: metrics.totalDuration / metrics.count,
        minDuration: metrics.minDuration === Infinity ? 0 : metrics.minDuration,
        maxDuration: metrics.maxDuration,
        errorRate: metrics.errors / metrics.count,
        errors: metrics.errors,
      };
    }

    return summary;
  }
}

/**
 * Create correlation ID
 */
export function createCorrelationId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
}

/**
 * Create child correlation ID
 */
export function createChildCorrelationId(parentId: string): string {
  const hash = createHash('sha256')
    .update(parentId + Date.now())
    .digest('hex')
    .substring(0, 8);
  return `${parentId}-${hash}`;
}

/**
 * Tool execution wrapper with automatic logging
 */
export function withLogging<T extends (...args: any[]) => Promise<any>>(
  toolName: string,
  fn: T,
): T {
  return (async (...args: any[]) => {
    const correlationId = args[args.length - 1]?.correlationId || createCorrelationId();
    const logger = StructuredLogger.getInstance();
    const startTime = Date.now();

    logger.info(`Starting ${toolName}`, {
      correlationId,
      toolName,
      parameters: args[1] || {},
    });

    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;

      logger.info(`Completed ${toolName}`, {
        correlationId,
        toolName,
        duration,
        success: true,
      });

      return result;
    } catch (_error) {
      const duration = Date.now() - startTime;

      logger.error(`Failed ${toolName}`, {
        correlationId,
        toolName,
        duration,
        error: true,
        errorMessage: _error instanceof Error ? _error.message : String(_error),
        errorStack: _error instanceof Error ? _error.stack : undefined,
      });

      throw _error;
    }
  }) as T;
}

/**
 * Performance tracking decorator
 */
export function trackPerformance(
  _target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const logger = StructuredLogger.getInstance();
    const correlationId = createCorrelationId();
    const startTime = Date.now();

    try {
      const result = await originalMethod.apply(this, args);
      const duration = Date.now() - startTime;

      logger.debug(`Performance: ${propertyKey}`, {
        correlationId,
        method: propertyKey,
        duration,
      });

      return result;
    } catch (_error) {
      const duration = Date.now() - startTime;

      logger.debug(`Performance (_error): ${propertyKey}`, {
        correlationId,
        method: propertyKey,
        duration,
        error: true,
      });

      throw _error;
    }
  };

  return descriptor;
}

// Export singleton instance
export const logger = StructuredLogger.getInstance();
