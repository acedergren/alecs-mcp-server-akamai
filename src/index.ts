#!/usr/bin/env node

/**
 * ALECS MCP Server - Streamlined Entry Point
 * 
 * Usage:
 * - Default (stdio for Claude Desktop): npm start
 * - WebSocket (bidirectional): MCP_TRANSPORT=websocket npm start
 * - SSE (Streamable HTTP): MCP_TRANSPORT=sse npm start
 * - Specific module: npm start:property
 */

import { getTransportFromEnv } from './config/transport-config';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  // Check if running a specific module via npm script
  const scriptName = process.env.npm_lifecycle_event;
  
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
      const module = await import(moduleMap[moduleName]);
      return;
    }
  }
  
  // Otherwise use unified transport approach
  try {
    const transportConfig = getTransportFromEnv();
    
    console.log(`[INFO] Starting ALECS MCP Server`);
    console.log(`[INFO] Transport: ${transportConfig.type}`);
    
    if (transportConfig.type === 'stdio') {
      console.log(`[INFO] Running in Claude Desktop mode`);
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
    
    // Import and start the full server
    const { ALECSFullServer } = await import('./index-full');
    const server = new ALECSFullServer({
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