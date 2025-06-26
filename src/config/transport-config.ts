/**
 * Transport Configuration for ALECS MCP Server
 * 
 * Configures transport type based on environment variables
 */

export type TransportType = 'stdio' | 'http' | 'websocket' | 'sse';

export interface TransportConfig {
  type: TransportType;
  options: {
    port?: number;
    host?: string;
    path?: string;
    cors?: boolean;
    auth?: 'none' | 'oauth' | 'token';
    ssl?: boolean;
  };
}

export function getTransportFromEnv(): TransportConfig {
  const transportType = (process.env.MCP_TRANSPORT || 'stdio') as TransportType;
  
  switch (transportType) {
    case 'http':
      return {
        type: 'http',
        options: {
          port: parseInt(process.env.HTTP_PORT || '3000'),
          host: process.env.HTTP_HOST || '0.0.0.0',
          path: process.env.HTTP_PATH || '/mcp',
          cors: process.env.CORS_ENABLED === 'true',
          auth: (process.env.AUTH_TYPE as any) || 'none',
          ssl: process.env.SSL_ENABLED === 'true'
        }
      };
      
    case 'websocket':
      return {
        type: 'websocket',
        options: {
          port: parseInt(process.env.WS_PORT || '8080'),
          host: process.env.WS_HOST || '0.0.0.0',
          path: process.env.WS_PATH || '/mcp',
          auth: (process.env.AUTH_TYPE as any) || 'token',
          ssl: process.env.SSL_ENABLED === 'true'
        }
      };
      
    case 'sse':
      return {
        type: 'sse',
        options: {
          port: parseInt(process.env.SSE_PORT || '3001'),
          host: process.env.SSE_HOST || '0.0.0.0',
          path: process.env.SSE_PATH || '/mcp/sse',
          cors: process.env.CORS_ENABLED !== 'false',
          auth: (process.env.AUTH_TYPE as any) || 'none'
        }
      };
      
    case 'stdio':
    default:
      return {
        type: 'stdio',
        options: {}
      };
  }
}

export function getTransportDescription(config: TransportConfig): string {
  switch (config.type) {
    case 'stdio':
      return 'Standard I/O (for Claude Desktop)';
    case 'http':
      return `HTTP server on ${config.options.host}:${config.options.port}`;
    case 'websocket':
      return `WebSocket server on ${config.options.host}:${config.options.port}`;
    case 'sse':
      return `Server-Sent Events on ${config.options.host}:${config.options.port}`;
    default:
      return 'Unknown transport';
  }
}