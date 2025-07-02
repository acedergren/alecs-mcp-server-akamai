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
let WebSocketServerTransport: any;
let SSEServerTransport: any;

async function loadOptionalDependencies() {
  try {
    express = (await import('express')).default;
    
    // Load custom transports
    const sseModule = await import('../transport/sse-transport');
    SSEServerTransport = sseModule.SSEServerTransport;
    
    const wsModule = await import('../transport/websocket-transport');
    WebSocketServerTransport = wsModule.WebSocketServerTransport;
  } catch (error) {
    // Optional dependencies not available
  }
}

export async function createTransport(config: TransportConfig): Promise<any> {
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
      
      const wsTransport = new WebSocketServerTransport({
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
        console.error(`[DONE] SSE server listening on http://${sseHost}:${ssePort}${ssePath}`);
        if (config.options.cors) {
          console.error('[INFO] CORS enabled for SSE transport');
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
  
  console.error(`[INFO] Starting server with ${config.type} transport...`);
  
  const transport = await createTransport(config);
  await server.connect(transport);
  
  console.error('[DONE] Server started successfully');
}