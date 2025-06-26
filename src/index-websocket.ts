#!/usr/bin/env node

/**
 * ALECS - MCP Server for Akamai (WebSocket Version)
 * WebSocket server implementation for remote access
 */

// Register module aliases before any other imports
import 'module-alias/register';

import { ALECSFullServer } from './index-full';
import { WebSocketServerTransport } from './transport/websocket-transport';
import { logger } from './utils/logger';

/**
 * Start WebSocket server with ALECS
 */
async function startWebSocketServer() {
  try {
    // Create ALECS server instance
    const alecsServer = new ALECSFullServer({
      name: 'alecs-mcp-server-akamai-websocket',
      version: '1.4.0',
    });

    // Create WebSocket transport
    const wsTransport = new WebSocketServerTransport({
      port: parseInt(process.env.ALECS_WS_PORT || '8082', 10),
      host: process.env.ALECS_WS_HOST || '0.0.0.0',
      ssl: process.env.ALECS_SSL_CERT && process.env.ALECS_SSL_KEY ? {
        cert: process.env.ALECS_SSL_CERT,
        key: process.env.ALECS_SSL_KEY,
      } : undefined,
      path: process.env.ALECS_WS_PATH || '/mcp',
    });

    // Set up transport callbacks before connecting
    wsTransport.onerror = (error: Error) => {
      logger.error('WebSocket transport error', { error: error.message });
    };

    wsTransport.onclose = () => {
      logger.info('WebSocket transport closed');
    };

    // Connect transport to server
    await alecsServer.server.connect(wsTransport);

    logger.info('ALECS WebSocket server started', {
      port: process.env.ALECS_WS_PORT || '8082',
      host: process.env.ALECS_WS_HOST || '0.0.0.0',
      ssl: !!(process.env.ALECS_SSL_CERT && process.env.ALECS_SSL_KEY),
      path: process.env.ALECS_WS_PATH || '/mcp',
    });

    // Display startup message
    console.log('\n[DONE] ALECS WebSocket MCP Server is running');
    console.log(`[EMOJI] Listening on ${process.env.ALECS_WS_HOST || '0.0.0.0'}:${process.env.ALECS_WS_PORT || '8082'}`);
    console.log('\n[INFO] To see connection details and generate a token, run:');
    console.log('   npm run start:websocket:summary\n');

    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
      logger.info('Shutting down WebSocket server...');
      await wsTransport.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down WebSocket server...');
      await wsTransport.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start WebSocket server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startWebSocketServer();
}

export { startWebSocketServer };