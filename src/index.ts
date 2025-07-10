#!/usr/bin/env node

/**
 * ALECS MCP Server - Command Line Interface Entry Point
 * 
 * USAGE:
 * - Default: alecs
 * - Customer section: alecs --section customer-prod
 * - Specific module: alecs --module property --section testing
 * - Help: alecs --help
 * - Version: alecs --version
 * 
 * TRANSPORT OPTIONS:
 * - stdio: Claude Desktop integration (default)
 * - websocket: Advanced bidirectional communication
 * - sse: Server-Sent Events for web clients
 * 
 * CUSTOMER SWITCHING:
 * Use --section to specify .edgerc section for multi-customer support
 */

// CRITICAL: Must be first import to prevent stdout pollution
import { setupSafeConsole } from './utils/safe-console';

// Initialize safe console BEFORE any other imports that might use console.log
setupSafeConsole();

import { parseArguments, displayHelp, displayVersion, applyConfiguration, validateConfiguration, displayStartupDashboard } from './utils/cli-parser';
import { getTransportFromEnv } from './config/transport-config';
import { createLogger } from './utils/pino-logger';

const mainLogger = createLogger('main');
let server: any = null;

// Graceful shutdown handler
function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    const isSilent = process.env['LOG_LEVEL'] === 'error';
    
    if (!isSilent) {
      console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
      console.log('║                    🛑 ALECS Server Shutting Down...                          ║');
      console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    }
    
    mainLogger.info(`Received ${signal}, shutting down gracefully...`);
    
    if (server && typeof server.stop === 'function') {
      try {
        await server.stop();
        mainLogger.info('Server stopped successfully');
      } catch (error) {
        mainLogger.error({ error }, 'Error during server shutdown');
      }
    }
    
    if (!isSilent) {
      console.log('✅ Shutdown complete. Thank you for using ALECS!');
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
  // Parse command line arguments first
  try {
    const cliConfig = parseArguments();
    
    // Handle help and version requests immediately
    if (cliConfig.help) {
      displayHelp();
      return;
    }
    
    if (cliConfig.version) {
      displayVersion();
      return;
    }
    
    // Apply CLI configuration to environment
    applyConfiguration(cliConfig);
    validateConfiguration(cliConfig);
    
    // Display rich startup dashboard unless in silent mode
    if (!cliConfig.silent) {
      displayStartupDashboard(cliConfig);
    }
    
    // Set log level to error in silent mode unless explicitly set
    if (cliConfig.silent && !cliConfig.logLevel) {
      process.env['LOG_LEVEL'] = 'error';
    }
    
    if (process.env['DEBUG'] || process.env['LOG_LEVEL'] === 'debug') {
      mainLogger.info('ALECS MCP Server initialized with CLI configuration');
    }
    mainLogger.debug({ 
      argv: process.argv,
      cwd: process.cwd(),
      nodeVersion: process.version,
      pid: process.pid,
      cliConfig
    }, 'Process info');
    
  } catch (error) {
    console.error(`❌ CLI Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error('💡 Use --help for usage information');
    process.exit(1);
  }
  
  // Check if running a specific module via npm script or CLI
  const scriptName = process.env['npm_lifecycle_event'];
  mainLogger.debug({ scriptName }, 'npm_lifecycle_event');
  
  if (scriptName && scriptName.startsWith('start:') && scriptName !== 'start:stdio') {
    // Launch specific module server
    const moduleName = scriptName.replace('start:', '');
    if (process.env['DEBUG'] || process.env['LOG_LEVEL'] === 'debug') {
      mainLogger.info({ moduleName }, 'Launching specific module');
    }
    
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
      if (process.env['DEBUG'] || process.env['LOG_LEVEL'] === 'debug') {
        mainLogger.info({ module: moduleMap[moduleName] }, 'Importing module');
      }
      await import(moduleMap[moduleName]);
      return;
    } else {
      const error = new Error(`Unknown module: ${moduleName}`);
      mainLogger.error({ moduleName }, error.message);
      throw error;
    }
  }
  
  // Otherwise use unified transport approach
  if (process.env['DEBUG'] || process.env['LOG_LEVEL'] === 'debug') {
    mainLogger.info('Using unified transport approach');
  }
  
  try {
    mainLogger.debug('Getting transport config...');
    const transportConfig = getTransportFromEnv();
    if (process.env['DEBUG'] || process.env['LOG_LEVEL'] === 'debug') {
      mainLogger.info({ transportConfig }, 'Transport config received');
    }
    
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

// Start the server when run directly
setupGracefulShutdown();
mainLogger.debug('Starting ALECS MCP Server...');
main().catch((error) => {
  mainLogger.fatal({ error }, 'Unhandled error during startup');
  mainLogger.fatal({ 
    stack: error instanceof Error ? error.stack : 'No stack trace' 
  }, 'Stack trace');
  process.exit(1);
});

export { main };