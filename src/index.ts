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

async function main(): Promise<void> {
  console.error('[BANG] MAIN() STARTED!');
  console.error('[BANG] Process argv:', process.argv);
  console.error('[BANG] Current directory:', process.cwd());
  console.error('[BANG] Node version:', process.version);
  
  // Check if running a specific module via npm script
  const scriptName = process.env['npm_lifecycle_event'];
  console.error('[BANG] npm_lifecycle_event:', scriptName);
  
  if (scriptName && scriptName.startsWith('start:') && scriptName !== 'start:stdio') {
    // Launch specific module server
    const moduleName = scriptName.replace('start:', '');
    console.error('[BANG] Launching specific module:', moduleName);
    
    const moduleMap: Record<string, string> = {
      property: './servers/property-server',
      dns: './servers/dns-server',
      certs: './servers/certs-server',
      reporting: './servers/reporting-server',
      security: './servers/security-server',
    };
    
    if (moduleMap[moduleName]) {
      console.error('[BANG] Importing module:', moduleMap[moduleName]);
      await import(moduleMap[moduleName]);
      return;
    } else {
      const error = new Error(`[BANG] UNKNOWN MODULE: ${moduleName}`);
      console.error(error.message);
      throw error;
    }
  }
  
  // Otherwise use unified transport approach
  console.error('[BANG] Using unified transport approach...');
  
  try {
    console.error('[BANG] Getting transport config...');
    const transportConfig = getTransportFromEnv();
    console.error('[BANG] Transport config received:', transportConfig);
    
    // Always use stderr for all output
    console.error(`[BANG] Starting ALECS MCP Server with transport: ${transportConfig.type}`);
    
    if (transportConfig.type === 'stdio') {
      console.error('[BANG] Running in Claude Desktop mode - stdio transport active');
      console.error('[BANG] ALL output going to stderr to prevent JSON-RPC corruption');
    }
    
    // Start Akamai MCP server with full tool registry
    console.error('[BANG] Importing akamai-server-factory...');
    const { createAkamaiServer } = await import('./utils/akamai-server-factory');
    console.error('[BANG] akamai-server-factory imported successfully');
    
    console.error('[BANG] Creating Akamai server...');
    const server = await createAkamaiServer({
      name: `alecs-mcp-server-akamai`,
      version: '1.6.2',
      // Load all 171 tools by default
      // Can be customized with toolFilter for specific deployments
    });
    console.error('[BANG] Akamai server created successfully');
    
    console.error('[BANG] Starting server...');
    await server.start();
    console.error('[BANG] SERVER IS RUNNING AND READY FOR CONNECTIONS!');
    
  } catch (_error) {
    console.error('[BANG] FATAL ERROR IN MAIN()!', _error);
    console.error('[BANG] Error details:', {
      message: _error instanceof Error ? _error.message : String(_error),
      stack: _error instanceof Error ? _error.stack : undefined,
      type: _error?.constructor?.name || typeof _error
    });
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  console.error('[BANG] Script is main module, starting server...');
  main().catch((error) => {
    console.error('[BANG] UNHANDLED ERROR IN MAIN()!');
    console.error('[BANG] Fatal error:', error);
    console.error('[BANG] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    process.exit(1);
  });
} else {
  console.error('[BANG] Script imported as module, not starting server');
}

export { main };