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

// Re-export the compatibility logger as the main logger
export const logger = loggerCompat;

// Keep the interface for type compatibility
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
}

// Re-export the getInstance pattern for backward compatibility
export class Logger {
  static getInstance() {
    return loggerCompat;
  }
}

// For any direct imports of the Pino logger
export { createLogger, createRequestLogger } from './pino-logger';
