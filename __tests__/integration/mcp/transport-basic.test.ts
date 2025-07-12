/**
 * Basic Transport Tests
 * 
 * Simplified tests to verify transport functionality
 */

import { createTransport } from '../../utils/transport-factory';
import { TransportConfig } from '../../config/transport-config';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

describe('Transport Factory', () => {
  describe('createTransport', () => {
    it('should create stdio transport', async () => {
      const config: TransportConfig = {
        type: 'stdio',
        options: {}
      };

      const transport = await createTransport(config);
      expect(transport).toBeInstanceOf(StdioServerTransport);
    });

    it('should throw error for unknown transport type', async () => {
      const config: TransportConfig = {
        type: 'invalid' as any,
        options: {}
      };

      await expect(createTransport(config)).rejects.toThrow('Unknown transport type');
    });
  });
});

describe('Transport Configuration', () => {
  it('should get transport config from environment', () => {
    const { getTransportFromEnv } = require('../../config/transport-config');
    
    // Test default (stdio)
    delete process.env.MCP_TRANSPORT;
    let config = getTransportFromEnv();
    expect(config.type).toBe('stdio');

    // Test streamable-http
    process.env.MCP_TRANSPORT = 'streamable-http';
    config = getTransportFromEnv();
    expect(config.type).toBe('streamable-http');
    expect(config.options.port).toBe(8080);
    
    // Test websocket
    process.env.MCP_TRANSPORT = 'websocket';
    config = getTransportFromEnv();
    expect(config.type).toBe('websocket');
    
    // Clean up
    delete process.env.MCP_TRANSPORT;
  });

  it('should use environment variables for HTTP transport config', () => {
    const { getTransportFromEnv } = require('../../config/transport-config');
    
    process.env.MCP_TRANSPORT = 'streamable-http';
    process.env.HTTP_PORT = '9000';
    process.env.HTTP_HOST = '127.0.0.1';
    process.env.HTTP_PATH = '/api/mcp';
    process.env.CORS_ENABLED = 'false';
    
    const config = getTransportFromEnv();
    
    expect(config.options.port).toBe(9000);
    expect(config.options.host).toBe('127.0.0.1');
    expect(config.options.path).toBe('/api/mcp');
    expect(config.options.cors).toBe(false);
    
    // Clean up
    delete process.env.MCP_TRANSPORT;
    delete process.env.HTTP_PORT;
    delete process.env.HTTP_HOST;
    delete process.env.HTTP_PATH;
    delete process.env.CORS_ENABLED;
  });
});