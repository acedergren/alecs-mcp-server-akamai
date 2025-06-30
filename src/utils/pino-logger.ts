/**
 * PINO LOGGER CONFIGURATION - HIGH PERFORMANCE STRUCTURED LOGGING
 * 
 * CODE KAI PRINCIPLES:
 * Key: Production-ready logging with MCP protocol safety
 * Approach: Pino for speed, structured JSON, stderr-only output
 * Implementation: Type-safe, configurable, with correlation IDs
 * 
 * CRITICAL MCP REQUIREMENTS:
 * 1. ALL logs MUST go to stderr (stdout is reserved for JSON-RPC)
 * 2. No console.log allowed - it corrupts MCP protocol
 * 3. Structured logging for better debugging
 * 4. Correlation IDs for request tracing
 * 
 * PERFORMANCE:
 * - Pino is 10x faster than Winston
 * - Low overhead even with debug logging
 * - Async logging to prevent blocking
 */

import pino from 'pino';
import type { Logger as PinoLogger } from 'pino';

/**
 * MCP-safe transport configuration
 * Forces ALL output to stderr to prevent JSON-RPC corruption
 */
const transport = pino.transport({
  target: 'pino-pretty',
  options: {
    destination: 2, // 2 = stderr, CRITICAL for MCP
    colorize: true,
    translateTime: 'HH:MM:ss.l',
    ignore: 'pid,hostname', // Reduce noise
    messageFormat: '{levelLabel} [{context}] {msg}',
    errorLikeObjectKeys: ['err', 'error'],
    errorProps: 'message,stack,type,code',
    // Remove customPrettifiers as they can't be serialized to worker threads
  }
});

/**
 * Base logger configuration
 */
export const logger: PinoLogger = pino({
  level: process.env['LOG_LEVEL'] || 'info',
  // Base context for all logs
  base: {
    service: 'alecs-mcp-server',
    version: '1.6.2',
    env: process.env['NODE_ENV'] || 'development'
  },
  // Redact sensitive information
  redact: {
    paths: [
      'password',
      'apiKey',
      'accountSwitchKey',
      'authorization',
      'cookie',
      '*.password',
      '*.apiKey',
      '*.accountSwitchKey',
      '*.authorization',
      '*.cookie'
    ],
    censor: '[REDACTED]'
  },
  // Serializers for common objects
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: (req: any) => ({
      method: req.method,
      url: req.url,
      params: req.params,
      // Redact sensitive headers
      headers: {
        ...req.headers,
        authorization: req.headers?.authorization ? '[REDACTED]' : undefined,
        cookie: req.headers?.cookie ? '[REDACTED]' : undefined
      }
    }),
    res: (res: any) => ({
      statusCode: res.statusCode,
      duration: res.duration
    })
  },
  // Custom error handler
  // Custom error handler
  hooks: {
    logMethod: function (args, method) {
      // Ensure all logs go to stderr
      return method.apply(this, args);
    }
  }
}, transport);

/**
 * Create a child logger with specific context
 * Use this for module-specific logging
 * 
 * @example
 * const moduleLogger = createLogger('property-tools');
 * moduleLogger.info('Loading property tools');
 */
export function createLogger(context: string): PinoLogger {
  return logger.child({ context });
}

/**
 * Create a logger for a specific MCP request with correlation ID
 * 
 * @example
 * const requestLogger = createRequestLogger('list-properties', correlationId);
 * requestLogger.info('Processing request');
 */
export function createRequestLogger(
  tool: string,
  correlationId: string,
  customer?: string
): PinoLogger {
  return logger.child({
    context: 'mcp-request',
    tool,
    correlationId,
    customer: customer || 'default'
  });
}

/**
 * Log levels for reference:
 * - fatal: System is unusable
 * - error: Error conditions
 * - warn: Warning conditions
 * - info: Informational messages
 * - debug: Debug-level messages
 * - trace: Trace-level messages
 */

// Re-export types for convenience
export type { Logger } from 'pino';

// Define the type for legacy compatibility
export interface LoggerCompat {
  getInstance(): LoggerCompat;
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

// Legacy compatibility - redirect old logger to Pino
export const loggerCompat: LoggerCompat = {
  getInstance(): LoggerCompat {
    return loggerCompat;
  },
  
  debug(message: string, data?: any): void {
    if (data) {
      logger.debug(data, message);
    } else {
      logger.debug(message);
    }
  },
  
  info(message: string, data?: any): void {
    if (data) {
      logger.info(data, message);
    } else {
      logger.info(message);
    }
  },
  
  warn(message: string, data?: any): void {
    if (data) {
      logger.warn(data, message);
    } else {
      logger.warn(message);
    }
  },
  
  error(message: string, data?: any): void {
    if (data) {
      logger.error(data, message);
    } else {
      logger.error(message);
    }
  }
};

// Export a BANG logger for our loud error messages
export const bangLogger = logger.child({ 
  context: 'BANG',
  levelLabel: 'BANG' 
});

/**
 * Development helpers
 */
if (process.env['NODE_ENV'] === 'development') {
  // Log all errors globally
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal({ reason, promise }, 'Unhandled rejection');
    process.exit(1);
  });
}

// Performance monitoring helper
export function measurePerformance<T>(
  operation: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = Date.now();
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = Date.now() - start;
      logger.debug({ operation, duration }, 'Operation completed');
    });
  } else {
    const duration = Date.now() - start;
    logger.debug({ operation, duration }, 'Operation completed');
    return result;
  }
}