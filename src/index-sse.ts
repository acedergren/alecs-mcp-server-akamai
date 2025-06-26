#!/usr/bin/env node

/**
 * ALECS - MCP Server for Akamai (SSE/HTTP Version)
 * Server-Sent Events implementation for MCP remote access
 * Implements the Streamable HTTP transport from MCP spec
 */

// Register module aliases before any other imports
import 'module-alias/register';

import { ALECSFullServer } from './index-full';
import { SSEServerTransport } from './transport/sse-transport';
import { logger } from './utils/logger';
import { validateApiToken } from './auth/TokenManager';

/**
 * Start SSE/HTTP server with ALECS
 */
async function startSSEServer() {
  try {
    // Create ALECS server instance
    const alecsServer = new ALECSFullServer({
      name: 'alecs-mcp-server-akamai-sse',
      version: '1.4.0',
    });

    // Create SSE transport with authentication
    const sseTransport = new SSEServerTransport({
      port: parseInt(process.env.ALECS_SSE_PORT || '3000', 10),
      host: process.env.ALECS_SSE_HOST || '0.0.0.0',
      ssl: process.env.ALECS_SSL_CERT && process.env.ALECS_SSL_KEY ? {
        cert: process.env.ALECS_SSL_CERT,
        key: process.env.ALECS_SSL_KEY,
      } : undefined,
      path: process.env.ALECS_SSE_PATH || '/mcp',
      authHandler: async (req) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          return false;
        }
        const token = authHeader.replace('Bearer ', '');
        try {
          const valid = await validateApiToken(token);
          return valid !== null;
        } catch {
          return false;
        }
      }
    });

    // Set up transport callbacks
    sseTransport.onerror = (error: Error) => {
      logger.error('SSE transport error', { error: error.message });
    };

    sseTransport.onclose = () => {
      logger.info('SSE transport closed');
    };

    // Connect transport to server
    await alecsServer.server.connect(sseTransport);

    logger.info('ALECS SSE/HTTP server started', {
      port: process.env.ALECS_SSE_PORT || '3000',
      host: process.env.ALECS_SSE_HOST || '0.0.0.0',
      ssl: !!(process.env.ALECS_SSL_CERT && process.env.ALECS_SSL_KEY),
      path: process.env.ALECS_SSE_PATH || '/mcp',
    });

    // Display startup message
    console.log('\n[DONE] ALECS SSE/HTTP MCP Server is running');
    console.log(`[INFO] Listening on ${process.env.ALECS_SSE_HOST || '0.0.0.0'}:${process.env.ALECS_SSE_PORT || '3000'}`);
    console.log('\n[INFO] Endpoints:');
    console.log(`   POST ${process.env.ALECS_SSE_PATH || '/mcp'}/messages - Send messages to server`);
    console.log(`   GET  ${process.env.ALECS_SSE_PATH || '/mcp'}/sse - Event stream from server`);
    console.log(`   GET  ${process.env.ALECS_SSE_PATH || '/mcp'}/health - Health check`);
    console.log('\n[INFO] To see connection details and generate a token, run:');
    console.log('   npm run start:sse:summary\n');

    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
      logger.info('Shutting down SSE server...');
      await sseTransport.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down SSE server...');
      await sseTransport.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start SSE server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startSSEServer();
}

export { startSSEServer };