#!/usr/bin/env node

/**
 * ALECS - MCP Server for Akamai (Unified Transport)
 * 
 * Single entry point for all transport modes.
 * Configure transport via environment variables:
 * 
 * - MCP_TRANSPORT: stdio (default), http, websocket, sse
 * - HTTP_PORT, HTTP_HOST, HTTP_PATH: For HTTP transport
 * - WS_PORT, WS_HOST, WS_PATH: For WebSocket transport
 * - SSE_PORT, SSE_HOST, SSE_PATH: For SSE transport
 * - AUTH_TYPE: none (default), oauth, token
 * - CORS_ENABLED: true/false for HTTP/SSE
 * - SSL_ENABLED: true/false with SSL_CERT and SSL_KEY
 */

// Register module aliases before any other imports
import 'module-alias/register';

import { getTransportFromEnv } from './config/transport-config';
import { logger } from './utils/logger';

/**
 * Main entry point for unified transport
 */
async function main(): Promise<void> {
  try {
    const transportConfig = getTransportFromEnv();
    logger.info('Starting ALECS MCP Server', {
      transport: transportConfig.type,
      ...transportConfig.options,
    });

    // Import the appropriate server based on transport type
    if (transportConfig.type === 'stdio' || 
        transportConfig.type === 'http' || 
        transportConfig.type === 'websocket' || 
        transportConfig.type === 'sse') {
      // Use the full server with configurable transport
      const { ALECSFullServer } = await import('./index-full');
      const server = new ALECSFullServer({
        name: `alecs-mcp-server-akamai-${transportConfig.type}`,
        version: '1.6.0',
      });
      await server.start();
    } else {
      throw new Error(`Unknown transport type: ${transportConfig.type}`);
    }
  } catch (_error) {
    logger.error('Server initialization failed', {
      error: _error instanceof Error ? _error.message : String(_error),
      stack: _error instanceof Error ? _error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start the server if this is the main module
if (require.main === module) {
  main();
}

export { main };