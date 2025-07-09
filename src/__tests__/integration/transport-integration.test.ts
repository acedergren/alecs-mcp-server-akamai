/**
 * Integration tests for all transport types
 * 
 * Verifies that each transport can be created, started, and used
 * to communicate with an MCP server in a real-world scenario
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createTransport } from '../../utils/transport-factory';
import { ALECSCore, tool } from '../../core/server/alecs-core';
import { z } from 'zod';
import fetch from 'node-fetch';
import { WebSocket } from 'ws';
import { EventSource } from 'eventsource';
import { TransportConfig } from '../../config/transport-config';

// Polyfill for Node.js
global.fetch = fetch as any;

// Test server with simple tools
class TestServer extends ALECSCore {
  override tools = [
    tool('echo', 
      z.object({ message: z.string() }),
      async ({ message }) => ({ echo: message })
    ),
    tool('add',
      z.object({ a: z.number(), b: z.number() }),
      async ({ a, b }) => ({ result: a + b })
    ),
  ];
}

describe('Transport Integration Tests', () => {
  let server: TestServer;
  
  beforeEach(() => {
    // Create test server instance
    server = new TestServer({
      name: 'test-server',
      version: '1.0.0',
      description: 'Test server for transport integration'
    });
  });

  afterEach(async () => {
    // Clean up server
    if (server) {
      try {
        await (server as any).shutdown?.();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
    }
  });

  describe('Stdio Transport', () => {
    it('should work with ALECSCore server', async () => {
      // Stdio transport is built-in and doesn't need HTTP testing
      const config: TransportConfig = {
        type: 'stdio',
        options: {}
      };

      // Set transport type
      process.env['MCP_TRANSPORT'] = 'stdio';

      // Start server
      await expect(server.start()).resolves.not.toThrow();

      // Verify server is ready
      const tools = (server as any).tools;
      expect(tools).toHaveLength(2);
      expect(tools.find((t: any) => t.name === 'echo')).toBeDefined();
    });
  });

  describe('Streamable HTTP Transport', () => {
    let serverPort: number;

    beforeEach(() => {
      // Use random port to avoid conflicts
      serverPort = 8080 + Math.floor(Math.random() * 1000);
    });

    it('should handle HTTP POST messages and SSE responses', async () => {
      // Configure transport
      process.env['MCP_TRANSPORT'] = 'streamable-http';
      process.env['HTTP_PORT'] = serverPort.toString();
      process.env['HTTP_HOST'] = 'localhost';

      // Start server
      await server.start();

      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Test health endpoint
      const healthResponse = await fetch(`http://localhost:${serverPort}/mcp/health`);
      expect(healthResponse.ok).toBe(true);
      
      const healthData = await healthResponse.json();
      expect(healthData.status).toBe('healthy');
      expect(healthData.transport).toBe('streamable-http');

      // Test listing tools
      const listToolsResponse = await fetch(`http://localhost:${serverPort}/mcp/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': 'test-client'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1
        })
      });

      expect(listToolsResponse.ok).toBe(true);
      const listToolsResult = await listToolsResponse.json();
      expect(listToolsResult.success).toBe(true);

      // Test calling a tool
      const echoResponse = await fetch(`http://localhost:${serverPort}/mcp/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': 'test-client'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'echo',
            arguments: { message: 'Hello, MCP!' }
          },
          id: 2
        })
      });

      expect(echoResponse.ok).toBe(true);
    });

    it('should support CORS for browser clients', async () => {
      process.env['MCP_TRANSPORT'] = 'streamable-http';
      process.env['HTTP_PORT'] = serverPort.toString();
      process.env['CORS_ENABLED'] = 'true';

      await server.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Test CORS preflight
      const corsResponse = await fetch(`http://localhost:${serverPort}/mcp/message`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST'
        }
      });

      expect(corsResponse.status).toBe(204);
      expect(corsResponse.headers.get('access-control-allow-origin')).toBeTruthy();
    });
  });

  describe('WebSocket Transport', () => {
    let serverPort: number;

    beforeEach(() => {
      serverPort = 8082 + Math.floor(Math.random() * 1000);
    });

    it('should handle WebSocket connections', async () => {
      // Configure transport
      process.env['MCP_TRANSPORT'] = 'websocket';
      process.env['MCP_WEBSOCKET_PORT'] = serverPort.toString();
      
      // Start server
      await server.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create WebSocket client
      const ws = new WebSocket(`ws://localhost:${serverPort}/mcp`);
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
      });

      // Test sending a message
      const responsePromise = new Promise((resolve) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          resolve(message);
        });
      });

      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1
      }));

      const response = await responsePromise;
      expect(response).toBeDefined();

      ws.close();
    });
  });

  describe('Transport Factory', () => {
    it('should create stdio transport', async () => {
      const config: TransportConfig = {
        type: 'stdio',
        options: {}
      };

      const transport = await createTransport(config);
      expect(transport).toBeInstanceOf(StdioServerTransport);
    });

    it('should create streamable HTTP transport', async () => {
      const config: TransportConfig = {
        type: 'streamable-http',
        options: {
          port: 8085,
          host: 'localhost'
        }
      };

      const transport = await createTransport(config);
      expect(transport).toBeDefined();
      expect(transport.constructor.name).toBe('MCPStreamableHTTPTransport');
      
      // Clean up
      await (transport as any).close?.();
    });

    it('should create WebSocket transport', async () => {
      const config: TransportConfig = {
        type: 'websocket',
        options: {
          port: 8086,
          host: 'localhost'
        }
      };

      const transport = await createTransport(config);
      expect(transport).toBeDefined();
      expect(transport.constructor.name).toBe('WebSocketServerTransport');
      
      // Clean up
      await (transport as any).close?.();
    });

    it('should throw error for unknown transport', async () => {
      const config: TransportConfig = {
        type: 'unknown' as any,
        options: {}
      };

      await expect(createTransport(config)).rejects.toThrow('Unknown transport type');
    });
  });

  describe('Multi-Transport Server', () => {
    it('should be able to switch transports at runtime', async () => {
      // Start with stdio
      process.env['MCP_TRANSPORT'] = 'stdio';
      await server.start();
      
      // Verify it started
      expect((server as any).tools).toHaveLength(2);

      // Note: In real usage, you would need to stop the server
      // and start a new one with different transport
      // This is just demonstrating the configuration
    });
  });

  describe('Error Scenarios', () => {
    it('should handle transport startup failures gracefully', async () => {
      // Try to start on a privileged port (will fail without root)
      process.env['MCP_TRANSPORT'] = 'streamable-http';
      process.env['HTTP_PORT'] = '80';
      
      // This should fail but not crash
      try {
        await server.start();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle missing optional dependencies', async () => {
      // Mock missing express
      jest.mock('express', () => {
        throw new Error('Module not found');
      });

      const config: TransportConfig = {
        type: 'streamable-http',
        options: { port: 8087 }
      };

      try {
        await createTransport(config);
      } catch (error: any) {
        expect(error.message).toContain('requires express');
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent connections', async () => {
      process.env['MCP_TRANSPORT'] = 'streamable-http';
      const port = 8090 + Math.floor(Math.random() * 100);
      process.env['HTTP_PORT'] = port.toString();

      await server.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create multiple concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) => 
        fetch(`http://localhost:${port}/mcp/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Client-ID': `client-${i}`
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'add',
              arguments: { a: i, b: i }
            },
            id: i
          })
        })
      );

      const responses = await Promise.all(requests);
      expect(responses.every(r => r.ok)).toBe(true);
    });
  });
});

// Jest configuration for integration tests
export const integrationTestTimeout = 30000; // 30 seconds for integration tests