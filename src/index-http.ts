#!/usr/bin/env node

/**
 * ALECS - MCP Server for Akamai (HTTP Transport)
 * HTTP server implementation with 2025-06-18 specification compliance
 */

import { HttpServerTransport } from './transport/http-transport';
import { logger } from './utils/logger';

import { ALECSServer } from './index';

/**
 * Start HTTP server with MCP
 */
async function startHttpServer() {
  try {
    // Create ALECS server instance
    new ALECSServer({
      name: 'alecs-mcp-server-akamai-http',
      version: '1.3.5.1',
    });

    // Create HTTP transport with configuration
    new HttpServerTransport({
      port: parseInt(process.env.MCP_HTTP_PORT || '3000', 10),
      host: process.env.MCP_HTTP_HOST || 'localhost',
      cors: {
        enabled: true,
        origin: process.env.MCP_CORS_ORIGIN || '*',
        credentials: false,
      },
      timeout: 30000,
    });

    // Note: This would require modification of the ALECSServer class to accept
    // custom transports. For now, this serves as an example implementation.

    logger.info('HTTP server example created');
    logger.info('To use HTTP transport, the ALECSServer class would need to be modified to accept custom transports');

    // In a real implementation, you would do:
    // await alecsServer.startWithTransport(httpTransport);

  } catch (_error) {
    logger._error('Failed to start HTTP server', {
      _error: _error instanceof Error ? _error.message : String(_error),
    });
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  startHttpServer();
}

export { startHttpServer };
