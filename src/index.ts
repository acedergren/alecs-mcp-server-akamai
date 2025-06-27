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
import { logger } from './utils/logger';

async function main(): Promise<void> {
  // Check if running a specific module via npm script
  const scriptName = process.env['npm_lifecycle_event'];
  
  if (scriptName && scriptName.startsWith('start:') && scriptName !== 'start:stdio') {
    // Launch specific module server
    const moduleName = scriptName.replace('start:', '');
    const moduleMap: Record<string, string> = {
      property: './servers/property-server',
      dns: './servers/dns-server',
      certs: './servers/certs-server',
      reporting: './servers/reporting-server',
      security: './servers/security-server',
    };
    
    if (moduleMap[moduleName]) {
      await import(moduleMap[moduleName]);
      return;
    }
  }
  
  // Otherwise use unified transport approach
  try {
    const transportConfig = getTransportFromEnv();
    
    /**
     * CRITICAL: JSON-RPC Protocol Compliance Fix
     * 
     * Problem: Claude Desktop communicates via JSON-RPC over stdio (stdin/stdout)
     * Any non-JSON output to stdout corrupts the protocol and causes parsing errors
     * 
     * Solution: Conditionally output based on transport type
     * - stdio: Use logger (stderr) to avoid corrupting stdout JSON-RPC stream
     * - websocket/sse: Safe to use console.log as they don't use stdout
     * 
     * Impact: Fixes "Unexpected token" and "not valid JSON" errors in Claude Desktop
     */
    if (transportConfig.type !== 'stdio') {
      // Safe to use console.log for non-stdio transports
      console.log(`[INFO] Starting ALECS MCP Server`);
      console.log(`[INFO] Transport: ${transportConfig.type}`);
    } else {
      // stdio transport: Use logger to output to stderr, preserving stdout for JSON-RPC
      logger.info('Starting ALECS MCP Server for Claude Desktop');
    }
    
    if (transportConfig.type === 'stdio') {
      // stdio mode: All logs must go to stderr via logger to avoid JSON-RPC corruption
      logger.info('Running in Claude Desktop mode - stdio transport active');
    } else {
      // Non-stdio modes: Console output is safe and provides user configuration guidance
      console.log(`[INFO] Add to claude_desktop_config.json:`);
      console.log(`
{
  "mcpServers": {
    "alecs": {
      "command": "node",
      "args": ["${process.argv[1]}"]
    }
  }
}
`);
    }
    
    // Start modular server based on transport configuration
    const { createModularServer } = await import('./utils/modular-server-factory');
    
    const server = await createModularServer({
      name: `alecs-mcp-server-akamai`,
      version: '1.6.0',
    });
    
    await server.start();
  } catch (_error) {
    logger.error('Server initialization failed', {
      error: _error instanceof Error ? _error.message : String(_error),
      stack: _error instanceof Error ? _error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  main();
}

export { main };