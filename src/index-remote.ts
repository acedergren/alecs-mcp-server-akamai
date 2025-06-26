#!/usr/bin/env node

/**
 * ALECS - MCP Server for Akamai (Unified Remote Access)
 * Combines both WebSocket and SSE transports in a single server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// Import both transports
import { WebSocketServerTransport } from './transport/websocket-transport';
import { SSEServerTransport } from './transport/sse-transport';

// Import server creation logic
import { initializeFullServer } from './index-full';

const WEBSOCKET_PORT = parseInt(process.env.ALECS_WS_PORT || '8082');
const SSE_PORT = parseInt(process.env.ALECS_SSE_PORT || '3013');
const USE_UNIFIED_PORT = process.env.ALECS_UNIFIED_REMOTE === 'true';
const UNIFIED_PORT = parseInt(process.env.ALECS_REMOTE_PORT || '8080');

async function startUnifiedRemoteServer() {
  console.log('[DEPLOY] Starting ALECS Unified Remote Access Server...');

  if (USE_UNIFIED_PORT) {
    // Single port mode - both transports on same port
    const app = express();
    const server = createServer(app);
    const wss = new WebSocketServer({ server, path: '/mcp/websocket' });

    // Setup SSE endpoint
    const sseTransport = new SSEServerTransport();
    app.use('/mcp/sse', sseTransport.router);

    // Setup WebSocket
    const wsTransport = new WebSocketServerTransport(wss);

    // Create ALECS servers for each transport
    const alecsServerSSE = new Server({ name: 'alecs-remote-sse', version: '1.5.0' });
    const alecsServerWS = new Server({ name: 'alecs-remote-ws', version: '1.5.0' });

    // Initialize with full tools
    await initializeFullServer(alecsServerSSE);
    await initializeFullServer(alecsServerWS);

    // Start transports
    await sseTransport.start();
    await wsTransport.start();

    // Connect to MCP servers
    await alecsServerSSE.connect(sseTransport);
    await alecsServerWS.connect(wsTransport);

    // Start unified server
    server.listen(UNIFIED_PORT, '0.0.0.0', () => {
      console.log(`[DONE] Unified Remote Server listening on port ${UNIFIED_PORT}`);
      console.log(`   [INFO] WebSocket: ws://localhost:${UNIFIED_PORT}/mcp/websocket`);
      console.log(`   [INFO] SSE: http://localhost:${UNIFIED_PORT}/mcp/sse`);
      console.log('\n[INFO] Authentication: Use TOKEN_MASTER_KEY environment variable');
    });
  } else {
    // Dual port mode - separate ports for each transport
    console.log('Starting in dual-port mode...');

    // Start SSE server
    const sseApp = express();
    const sseTransport = new SSEServerTransport();
    sseApp.use('/mcp', sseTransport.router);

    const alecsServerSSE = new Server({ name: 'alecs-sse', version: '1.5.0' });
    await initializeFullServer(alecsServerSSE);
    await sseTransport.start();
    await alecsServerSSE.connect(sseTransport);

    sseApp.listen(SSE_PORT, '0.0.0.0', () => {
      console.log(`[DONE] SSE Server listening on port ${SSE_PORT}`);
      console.log(`   [INFO] SSE: http://localhost:${SSE_PORT}/mcp`);
    });

    // Start WebSocket server
    const wsServer = createServer();
    const wss = new WebSocketServer({ server: wsServer, path: '/mcp' });
    const wsTransport = new WebSocketServerTransport(wss);

    const alecsServerWS = new Server({ name: 'alecs-websocket', version: '1.5.0' });
    await initializeFullServer(alecsServerWS);
    await wsTransport.start();
    await alecsServerWS.connect(wsTransport);

    wsServer.listen(WEBSOCKET_PORT, '0.0.0.0', () => {
      console.log(`[DONE] WebSocket Server listening on port ${WEBSOCKET_PORT}`);
      console.log(`   [INFO] WebSocket: ws://localhost:${WEBSOCKET_PORT}/mcp`);
    });

    console.log('\n[INFO] Authentication: Use TOKEN_MASTER_KEY environment variable');
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[INFO] Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startUnifiedRemoteServer().catch((error) => {
  console.error('Failed to start unified remote server:', error);
  process.exit(1);
});
