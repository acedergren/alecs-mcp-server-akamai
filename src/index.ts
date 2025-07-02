#!/usr/bin/env node

/**
 * ALECS MCP Server - Streamlined Entry Point
 * 
 * Usage:
 * - Default (stdio for Claude Desktop): npm start
 * - WebSocket (bidirectional): MCP_TRANSPORT=websocket npm start
 * - SSE (Streamable HTTP): MCP_TRANSPORT=sse npm start
 * - Specific module: npm start:property
 * 
 * CRITICAL FIX APPLIED (v1.6.0-rc2):
 * Fixed JSON-RPC protocol corruption in Claude Desktop integration.
 * Issue: console.log statements to stdout interfered with JSON-RPC communication
 * Solution: Conditional logging based on transport type (stdio uses stderr via logger)
 * Impact: Eliminates "Unexpected token" and JSON parsing errors in Claude Desktop
 */

// CRITICAL: Must be first import to prevent stdout pollution
import { setupSafeConsole } from './utils/safe-console';

// Initialize safe console BEFORE any other imports that might use console.log
setupSafeConsole();

import { getTransportFromEnv } from './config/transport-config';

import { createLogger } from './utils/pino-logger';

const mainLogger = createLogger('main');
let server: any = null;

// Graceful shutdown handler
function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    mainLogger.info(`Received ${signal}, shutting down gracefully...`);
    
    if (server && typeof server.stop === 'function') {
      try {
        await server.stop();
        mainLogger.info('Server stopped successfully');
      } catch (error) {
        mainLogger.error({ error }, 'Error during server shutdown');
      }
    }
    
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (error) => {
    mainLogger.fatal({ error }, 'Uncaught exception');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason, promise) => {
    mainLogger.fatal({ reason, promise }, 'Unhandled rejection');
    process.exit(1);
  });
}

async function main(): Promise<void> {
  mainLogger.info('ALECS MCP Server starting...');
  mainLogger.debug({ 
    argv: process.argv,
    cwd: process.cwd(),
    nodeVersion: process.version,
    pid: process.pid
  }, 'Process info');
  
  // Check if running a specific module via npm script
  const scriptName = process.env['npm_lifecycle_event'];
  mainLogger.debug({ scriptName }, 'npm_lifecycle_event');
  
  if (scriptName && scriptName.startsWith('start:') && scriptName !== 'start:stdio') {
    // Launch specific module server
    const moduleName = scriptName.replace('start:', '');
    mainLogger.info({ moduleName }, 'Launching specific module');
    
    const moduleMap: Record<string, string> = {
      property: './servers/property-server',
      dns: './servers/dns-server',
      certs: './servers/certs-server',
      reporting: './servers/reporting-server',
      security: './servers/security-server',
      appsec: './servers/appsec-server',
      fastpurge: './servers/fastpurge-server',
      'network-lists': './servers/network-lists-server',
    };
    
    if (moduleMap[moduleName]) {
      mainLogger.info({ module: moduleMap[moduleName] }, 'Importing module');
      await import(moduleMap[moduleName]);
      return;
    } else {
      const error = new Error(`Unknown module: ${moduleName}`);
      mainLogger.error({ moduleName }, error.message);
      throw error;
    }
  }
  
  // Otherwise use unified transport approach
  mainLogger.info('Using unified transport approach');
  
  try {
    mainLogger.debug('Getting transport config...');
    const transportConfig = getTransportFromEnv();
    mainLogger.info({ transportConfig }, 'Transport config received');
    
    // Log transport type at debug level
    mainLogger.debug({ transport: transportConfig.type }, 'Transport configuration');
    
    if (transportConfig.type === 'stdio') {
      mainLogger.debug('Running in Claude Desktop mode - stdio transport active');
      mainLogger.debug('All output going to stderr to prevent JSON-RPC corruption');
    }
    
    // Start Akamai MCP server with full tool registry
    mainLogger.debug('Importing akamai-server-factory...');
    const { createAkamaiServer } = await import('./utils/akamai-server-factory');
    mainLogger.debug('akamai-server-factory imported successfully');
    
    mainLogger.debug('Creating Akamai server...');
    server = await createAkamaiServer({
      name: `alecs-mcp-server-akamai`,
      version: '1.7.4',
      // Load all 171 tools by default
      // Can be customized with toolFilter for specific deployments
    });
    mainLogger.debug('Akamai server created successfully');
    
    mainLogger.debug('Starting server...');
    await server.start();
    
    // Only show minimal output after startup unless DEBUG is set
    if (process.env['DEBUG'] || process.env['LOG_LEVEL'] === 'debug') {
      mainLogger.info('ALECS MCP Server is running and ready for connections');
    }
    
  } catch (_error) {
    mainLogger.fatal({ error: _error }, 'Failed to start server');
    mainLogger.error({
      message: _error instanceof Error ? _error.message : String(_error),
      stack: _error instanceof Error ? _error.stack : undefined,
      type: _error?.constructor?.name || typeof _error
    }, 'Error details');
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  setupGracefulShutdown();
  mainLogger.debug('Starting ALECS MCP Server...');
  main().catch((error) => {
    mainLogger.fatal({ error }, 'Unhandled error during startup');
    mainLogger.fatal({ 
      stack: error instanceof Error ? error.stack : 'No stack trace' 
    }, 'Stack trace');
    process.exit(1);
  });
} else {
  mainLogger.debug('Script imported as module, not starting server');
}

export { main };