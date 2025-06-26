/**
 * Transport Factory for ALECS MCP Server
 * 
 * Creates appropriate transport based on configuration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TransportConfig, getTransportFromEnv } from '../config/transport-config';

// Lazy load optional transports to avoid dependency errors
let express: any;
let WebSocketServer: any;
let createHttpServer: any;
let SSEServerTransport: any;
let WebSocketServerTransport: any;
let HttpServerTransport: any;

async function loadOptionalDependencies() {
  try {
    express = (await import('express')).default;
    const ws = await import('ws');
    WebSocketServer = ws.WebSocketServer;
    const http = await import('http');
    createHttpServer = http.createServer;
    
    // Load custom transports
    const sseModule = await import('../transport/sse-transport');
    SSEServerTransport = sseModule.SSEServerTransport;
    
    const wsModule = await import('../transport/websocket-transport');
    WebSocketServerTransport = wsModule.WebSocketServerTransport;
    
    const httpModule = await import('../transport/http-transport');
    HttpServerTransport = httpModule.HttpServerTransport;
  } catch (error) {
    // Optional dependencies not available
  }
}

export async function createTransport(config: TransportConfig): Promise<any> {
  switch (config.type) {
    case 'stdio':
      return new StdioServerTransport();
      
    case 'http':
      await loadOptionalDependencies();
      if (!HttpServerTransport) {
        throw new Error('[ERROR] HTTP transport requires express. Install with: npm install express');
      }
      
      const httpApp = express();
      const httpTransport = new HttpServerTransport(httpApp, {
        path: config.options.path || '/mcp',
        cors: config.options.cors !== false,
        auth: config.options.auth || 'none'
      });
      
      // Start HTTP server
      const httpPort = config.options.port || 3000;
      const httpHost = config.options.host || '0.0.0.0';
      
      httpApp.listen(httpPort, httpHost, () => {
        console.log(`[DONE] HTTP server listening on ${httpHost}:${httpPort}${config.options.path || '/mcp'}`);
        if (config.options.auth === 'oauth') {
          console.log('[INFO] OAuth authentication enabled');
        }
      });
      
      return httpTransport;
      
    case 'websocket':
      await loadOptionalDependencies();
      if (!WebSocketServer || !createHttpServer) {
        throw new Error('[ERROR] WebSocket transport requires ws. Install with: npm install ws');
      }
      
      const wsPort = config.options.port || 8080;
      const wsHost = config.options.host || '0.0.0.0';
      const wsPath = config.options.path || '/mcp';
      
      const wsServer = createHttpServer();
      const wss = new WebSocketServer({ server: wsServer, path: wsPath });
      const wsTransport = new WebSocketServerTransport(wss);
      
      await wsTransport.start();
      
      wsServer.listen(wsPort, wsHost, () => {
        console.log(`[DONE] WebSocket server listening on ws://${wsHost}:${wsPort}${wsPath}`);
        if (config.options.auth === 'token') {
          console.log('[INFO] Token authentication enabled via TOKEN_MASTER_KEY');
        }
      });
      
      return wsTransport;
      
    case 'sse':
      await loadOptionalDependencies();
      if (!express || !SSEServerTransport) {
        throw new Error('[ERROR] SSE transport requires express. Install with: npm install express');
      }
      
      const sseApp = express();
      const sseTransport = new SSEServerTransport();
      const ssePath = config.options.path || '/mcp/sse';
      
      sseApp.use(ssePath, sseTransport.router);
      
      await sseTransport.start();
      
      const ssePort = config.options.port || 3001;
      const sseHost = config.options.host || '0.0.0.0';
      
      sseApp.listen(ssePort, sseHost, () => {
        console.log(`[DONE] SSE server listening on http://${sseHost}:${ssePort}${ssePath}`);
        if (config.options.cors) {
          console.log('[INFO] CORS enabled for SSE transport');
        }
      });
      
      return sseTransport;
      
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
  
  console.log(`[INFO] Starting server with ${config.type} transport...`);
  
  const transport = await createTransport(config);
  await server.connect(transport);
  
  console.log('[DONE] Server started successfully');
}