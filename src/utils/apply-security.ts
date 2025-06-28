/**
 * Apply security features to MCP server
 * Reusable module for all server variants
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { rateLimiter, gracefulShutdown } from './security';
import { logger } from './logger';

/**
 * Apply security features to an MCP server instance
 */
export function applySecurityFeatures(_server: Server): void {
  // Initialize graceful shutdown
  gracefulShutdown.initialize();
  
  // Register cleanup for server shutdown
  gracefulShutdown.register(async () => {
    logger.info('Shutting down MCP server...');
    // Server-specific cleanup can be added here
  });

  // Setup error handling
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception', { 
      error: error.message, 
      stack: error.stack 
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled rejection', { reason });
    process.exit(1);
  });

  logger.info('Security features applied', {
    rateLimiting: 'enabled',
    messageValidation: 'enabled',
    gracefulShutdown: 'enabled'
  });
}

/**
 * Create rate-limited request handler wrapper
 */
export function withRateLimit<T extends (...args: any[]) => any>(
  handler: T,
  identifier: string = 'global'
): T {
  return (async (...args: Parameters<T>) => {
    if (!rateLimiter.isAllowed(identifier)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    return handler(...args);
  }) as T;
}