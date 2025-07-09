/**
 * Transport Configuration for ALECS MCP Server
 * 
 * Configures transport type based on environment variables
 */

export type TransportType = 'stdio' | 'sse' | 'websocket' | 'streamable-http' | 'http';

export interface TransportConfig {
  type: TransportType;
  options: {
    port?: number;
    host?: string;
    path?: string;
    cors?: boolean;
    auth?: 'none' | 'token';
    ssl?: boolean;
  };
}

export function getTransportFromEnv(): TransportConfig {
  const transportType = (process.env['MCP_TRANSPORT'] || 'stdio') as TransportType;
  
  switch (transportType) {
    case 'websocket':
      return {
        type: 'websocket',
        options: {
          port: parseInt(process.env['WS_PORT'] || '8080'),
          host: process.env['WS_HOST'] || '0.0.0.0',
          path: process.env['WS_PATH'] || '/mcp',
          auth: (process.env['AUTH_TYPE'] as 'none' | 'token') || 'token',
          ssl: process.env['SSL_ENABLED'] === 'true'
        }
      };
      
    case 'sse':
      return {
        type: 'sse',
        options: {
          port: parseInt(process.env['SSE_PORT'] || '3001'),
          host: process.env['SSE_HOST'] || '0.0.0.0',
          path: process.env['SSE_PATH'] || '/mcp/sse',
          cors: process.env['CORS_ENABLED'] !== 'false',
          auth: (process.env['AUTH_TYPE'] as 'none' | 'token') || 'none'
        }
      };
      
    case 'streamable-http':
    case 'http':
      return {
        type: 'streamable-http',
        options: {
          port: parseInt(process.env['HTTP_PORT'] || '8080'),
          host: process.env['HTTP_HOST'] || '0.0.0.0',
          path: process.env['HTTP_PATH'] || '/mcp',
          cors: process.env['CORS_ENABLED'] !== 'false',
          auth: (process.env['AUTH_TYPE'] as 'none' | 'token') || 'none'
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
    case 'websocket':
      return `WebSocket server on ${config.options.host}:${config.options.port}`;
    case 'sse':
      return `Server-Sent Events (Legacy) on ${config.options.host}:${config.options.port}`;
    case 'streamable-http':
      return `MCP Streamable HTTP on ${config.options.host}:${config.options.port}`;
    default:
      return 'Unknown transport';
  }
}