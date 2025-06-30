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

import { bangLogger, createLogger } from './utils/pino-logger';

const mainLogger = createLogger('main');

async function main(): Promise<void> {
  bangLogger.info('MAIN() STARTED!');
  bangLogger.info({ 
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
    };
    
    if (moduleMap[moduleName]) {
      mainLogger.info({ module: moduleMap[moduleName] }, 'Importing module');
      await import(moduleMap[moduleName]);
      return;
    } else {
      const error = new Error(`UNKNOWN MODULE: ${moduleName}`);
      bangLogger.fatal({ moduleName }, error.message);
      throw error;
    }
  }
  
  // Otherwise use unified transport approach
  mainLogger.info('Using unified transport approach');
  
  try {
    mainLogger.debug('Getting transport config...');
    const transportConfig = getTransportFromEnv();
    mainLogger.info({ transportConfig }, 'Transport config received');
    
    // Always use stderr for all output
    bangLogger.info({ transport: transportConfig.type }, 'Starting ALECS MCP Server');
    
    if (transportConfig.type === 'stdio') {
      mainLogger.info('Running in Claude Desktop mode - stdio transport active');
      mainLogger.info('ALL output going to stderr to prevent JSON-RPC corruption');
    }
    
    // Start Akamai MCP server with full tool registry
    mainLogger.debug('Importing akamai-server-factory...');
    const { createAkamaiServer } = await import('./utils/akamai-server-factory');
    mainLogger.debug('akamai-server-factory imported successfully');
    
    mainLogger.info('Creating Akamai server...');
    const server = await createAkamaiServer({
      name: `alecs-mcp-server-akamai`,
      version: '1.6.2',
      // Load all 171 tools by default
      // Can be customized with toolFilter for specific deployments
    });
    mainLogger.info('Akamai server created successfully');
    
    mainLogger.info('Starting server...');
    await server.start();
    bangLogger.info('SERVER IS RUNNING AND READY FOR CONNECTIONS!');
    
  } catch (_error) {
    bangLogger.fatal({ error: _error }, 'FATAL ERROR IN MAIN()!');
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
  mainLogger.info('Script is main module, starting server...');
  main().catch((error) => {
    bangLogger.fatal({ error }, 'UNHANDLED ERROR IN MAIN()!');
    bangLogger.fatal({ 
      stack: error instanceof Error ? error.stack : 'No stack trace' 
    }, 'Stack trace');
    process.exit(1);
  });
} else {
  mainLogger.info('Script imported as module, not starting server');
}

export { main };