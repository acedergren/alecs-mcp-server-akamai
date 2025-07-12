/**
 * LEGACY LOGGER - REDIRECTS TO PINO
 * 
 * This file maintains backward compatibility with the old logger interface
 * All logging now goes through Pino for better performance and features
 * 
 * MIGRATION NOTES:
 * - Old: logger.info('message', data)
 * - New: logger.info(data, 'message') // Pino style
 * 
 * This compatibility layer handles the conversion automatically
 */

import { loggerCompat } from './pino-logger';
import { z } from 'zod';

// Define schema for log data
const LogDataSchema = z.record(z.string(), z.unknown());
type LogData = z.infer<typeof LogDataSchema>;

// Re-export the compatibility logger as the main logger
export const logger = loggerCompat;

// Keep the interface for type compatibility
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: LogData;
}

// Re-export the getInstance pattern for backward compatibility
export class Logger {
  static getInstance() {
    return loggerCompat;
  }
}

// For any direct imports of the Pino logger
export { createLogger, createRequestLogger } from './pino-logger';
