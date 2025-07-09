#!/usr/bin/env node
/**
 * Development Server with Hot Reload
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Enhanced development experience with automatic reloading
 * Approach: File watching with TypeScript compilation and server restart
 * Implementation: Production-ready hot reload with proper error handling
 */

import { startHotReload } from './utils/hot-reload';
import { createLogger } from './utils/pino-logger';

const logger = createLogger('dev-server');

async function main() {
  logger.info('🚀 Starting ALECSCore MCP Server in development mode with hot reload...');
  
  try {
    await startHotReload();
    
    logger.info(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║    ALECSCore MCP Server - Development Mode             ║
║                                                        ║
║    🔄 Hot Reload: Enabled                              ║
║    📁 Watching: src/                                   ║
║    🔧 Auto-restart on: .ts, .js, .json changes        ║
║                                                        ║
║    Press Ctrl+C to stop                                ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);
  } catch (error) {
    logger.error({ error }, 'Failed to start development server');
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
});

// Start the development server
main().catch((error) => {
  logger.error({ error }, 'Fatal error in development server');
  process.exit(1);
});