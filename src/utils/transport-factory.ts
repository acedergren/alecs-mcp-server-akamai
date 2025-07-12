/**
 * Transport Factory for ALECS MCP Server
 * 
 * Creates appropriate transport based on configuration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TransportConfig, getTransportFromEnv } from '../config/transport-config';
import { createLogger } from './pino-logger';

const logger = createLogger('transport-factory');

// Lazy load optional transports to avoid dependency errors
let express: unknown;
let WebSocketServerTransport: unknown;
let SSEServerTransport: unknown;
let MCPStreamableHTTPTransport: unknown;

async function loadOptionalDependencies() {
  try {
    express = (await import('express')).default;
    
    // Load custom transports
    const sseModule = await import('../transport/sse-transport');
    SSEServerTransport = sseModule.SSEServerTransport;
    
    const wsModule = await import('../transport/websocket-transport');
    WebSocketServerTransport = wsModule.WebSocketServerTransport;
    
    const httpModule = await import('../transport/mcp-streamable-http-transport');
    MCPStreamableHTTPTransport = httpModule.MCPStreamableHTTPTransport;
  } catch (error) {
    // Optional dependencies not available
  }
}

export async function createTransport(config: TransportConfig): Promise<unknown> {
  switch (config.type) {
    case 'stdio':
      return new StdioServerTransport();
      
    case 'websocket':
      await loadOptionalDependencies();
      if (!WebSocketServerTransport) {
        throw new Error('[ERROR] WebSocket transport requires ws. Install with: npm install ws');
      }
      
      const wsPort = config.options.port || 8080;
      const wsHost = config.options.host || '0.0.0.0';
      const wsPath = config.options.path || '/mcp';
      
      const WSTransport = WebSocketServerTransport as any;
      const wsTransport = new WSTransport({
        port: wsPort,
        host: wsHost,
        path: wsPath,
        ssl: config.options.ssl ? {
          cert: process.env['ALECS_SSL_CERT']!,
          key: process.env['ALECS_SSL_KEY']!
        } : undefined,
        auth: {
          required: config.options.auth !== 'none',
          tokenHeader: 'authorization'
        }
      });
      
      await wsTransport.start();
      
      return wsTransport as any;
      
    case 'sse':
      await loadOptionalDependencies();
      if (!express || !SSEServerTransport) {
        throw new Error('[ERROR] SSE transport requires express. Install with: npm install express');
      }
      
      const expressApp = express as any;
      const sseApp = expressApp();
      const SSETransport = SSEServerTransport as any;
      const sseTransport = new SSETransport();
      const ssePath = config.options.path || '/mcp/sse';
      
      sseApp.use(ssePath, sseTransport.router);
      
      await sseTransport.start();
      
      const ssePort = config.options.port || 3001;
      const sseHost = config.options.host || '0.0.0.0';
      
      sseApp.listen(ssePort, sseHost, () => {
        logger.info(`[DONE] SSE server listening on http://${sseHost}:${ssePort}${ssePath}`);
        if (config.options.cors) {
          logger.info('[INFO] CORS enabled for SSE transport');
        }
      });
      
      return sseTransport;
      
    case 'streamable-http':
      await loadOptionalDependencies();
      if (!express || !MCPStreamableHTTPTransport) {
        throw new Error('[ERROR] Streamable HTTP transport requires express. Install with: npm install express');
      }
      
      const httpPort = config.options.port || 8080;
      const httpHost = config.options.host || '0.0.0.0';
      const httpPath = config.options.path || '/mcp';
      
      const HTTPTransport = MCPStreamableHTTPTransport as any;
      const httpTransport = new HTTPTransport({
        port: httpPort,
        host: httpHost,
        path: httpPath,
        corsOrigin: config.options.cors ? '*' : undefined
      });
      
      await httpTransport.start();
      
      logger.info(`[DONE] Streamable HTTP server listening on http://${httpHost}:${httpPort}${httpPath}`);
      if (config.options.cors) {
        logger.info('[INFO] CORS enabled for Streamable HTTP transport');
      }
      
      return httpTransport;
      
    default:
      throw new Error(`[ERROR] Unknown transport type: ${config.type}`);
  }
}

export async function startServerWithTransport(
  server: Server,
  configOverride?: Partial<TransportConfig>
): Promise<void> {
  const baseConfig = getTransportFromEnv();
  const config: TransportConfig = {
    ...baseConfig,
    ...configOverride,
    options: {
      ...baseConfig.options,
      ...(configOverride?.options || {})
    }
  };
  
  logger.info(`[INFO] Starting server with ${config.type} transport...`);
  
  const transport = await createTransport(config);
  await server.connect(transport as any);
  
  logger.info('[DONE] Server started successfully');
}